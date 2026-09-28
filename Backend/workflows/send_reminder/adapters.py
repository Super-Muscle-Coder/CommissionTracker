"""Adapters of send_reminder: storage of the workflow's own tables, the two
calls to other workflows, and the machine clock.

Tables owned by send_reminder (nobody else reads or writes them; no foreign
key to another workflow's table):
- send_reminder_schema_version  one row: version of this workflow's table layout
- reminder_settings             at most one row: the saved settings and the
                                digest cadence state
- reminder_deadline_sent        one row per (commission, deadline, lead
                                duration) a deadline reminder was produced for
- reminder_notification         one row per produced reminder; never deleted
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timezone
from typing import Callable, Iterator

from .entities import (
    CommissionEntry,
    DeadlineItem,
    DeadlineReminderKey,
    DeadlineSettings,
    Digest,
    DigestItem,
    LeadTime,
    Money,
    Notification,
    PeriodicSettings,
    ProgressEntry,
    ReminderSettings,
    SettingsState,
)

# Ordered upgrade steps of this workflow's tables. A step is applied once,
# when the stored version is lower than its number. Append new steps; never
# edit an applied one.
_STORAGE_UPGRADES: list[tuple[int, list[str]]] = [
    (
        1,
        [
            """
            CREATE TABLE reminder_settings (
                id                     INTEGER PRIMARY KEY CHECK (id = 1),
                periodic_enabled       INTEGER NOT NULL,
                periodic_every         INTEGER NOT NULL,
                periodic_unit          TEXT NOT NULL,
                periodic_at_time       TEXT NOT NULL,
                periodic_weekday       INTEGER,
                deadline_enabled       INTEGER NOT NULL,
                lead_times             TEXT NOT NULL,
                updated_at             TEXT NOT NULL,
                digest_handled_through TEXT
            )
            """,
            """
            CREATE TABLE reminder_deadline_sent (
                commission_id   TEXT NOT NULL,
                deadline        TEXT NOT NULL,
                lead_hours      INTEGER NOT NULL,
                notification_id TEXT NOT NULL,
                PRIMARY KEY (commission_id, deadline, lead_hours)
            )
            """,
            """
            CREATE TABLE reminder_notification (
                notification_id TEXT PRIMARY KEY,
                kind            TEXT NOT NULL,
                due_at          TEXT NOT NULL,
                commission_id   TEXT,
                title           TEXT,
                deadline        TEXT,
                lead_amount     INTEGER,
                lead_unit       TEXT,
                open_count      INTEGER,
                upcoming        TEXT,
                created_at      TEXT NOT NULL,
                acknowledged_at TEXT
            )
            """,
            "CREATE INDEX reminder_notification_pending ON reminder_notification (acknowledged_at)",
        ],
    ),
]

_VERSION_TABLE = "send_reminder_schema_version"


class StorageVersionError(RuntimeError):
    """The stored table layout is newer than this build understands."""


class StorageIOError(Exception):
    """Reading or writing storage failed unexpectedly (locked or read-only
    file, disk full, corrupted storage...), here or behind a call to another
    workflow."""


@contextmanager
def _storage_io() -> Iterator[None]:
    # Only failures of the storage itself are translated; any other
    # exception (a programming error) propagates unchanged.
    try:
        yield
    except (sqlite3.Error, OSError) as exc:
        raise StorageIOError(str(exc)) from exc


# --- rows <-> Entities -------------------------------------------------------

_SETTINGS_COLUMNS = (
    "periodic_enabled, periodic_every, periodic_unit, periodic_at_time, periodic_weekday, "
    "deadline_enabled, lead_times, updated_at, digest_handled_through"
)

_NOTIFICATION_COLUMNS = (
    "notification_id, kind, due_at, commission_id, title, deadline, lead_amount, lead_unit, "
    "open_count, upcoming, created_at, acknowledged_at"
)


def _optional_moment(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value is not None else None


def _to_state(row: tuple) -> SettingsState:
    leads = tuple(LeadTime(amount=e["amount"], unit=e["unit"]) for e in json.loads(row[6]))
    return SettingsState(
        settings=ReminderSettings(
            periodic=PeriodicSettings(
                enabled=bool(row[0]), every=row[1], unit=row[2], at_time=row[3], weekday=row[4]
            ),
            deadline=DeadlineSettings(enabled=bool(row[5]), lead_times=leads),
        ),
        updated_at=datetime.fromisoformat(row[7]),
        digest_handled_through=_optional_moment(row[8]),
    )


def _notification_values(n: Notification) -> tuple:
    item, digest = n.deadline_item, n.digest
    upcoming = None
    if digest is not None:
        upcoming = json.dumps(
            [{"commission_id": u.commission_id, "title": u.title, "deadline": u.deadline.isoformat()}
             for u in digest.upcoming],
            ensure_ascii=False,
        )
    return (
        n.notification_id,
        n.kind,
        n.due_at.isoformat(),
        item.commission_id if item else None,
        item.title if item else None,
        item.deadline.isoformat() if item else None,
        item.lead.amount if item else None,
        item.lead.unit if item else None,
        digest.open_count if digest else None,
        upcoming,
        n.created_at.isoformat(),
        n.acknowledged_at.isoformat() if n.acknowledged_at is not None else None,
    )


def _to_notification(row: tuple) -> Notification:
    item = None
    if row[3] is not None:
        item = DeadlineItem(
            commission_id=row[3],
            title=row[4],
            deadline=date.fromisoformat(row[5]),
            lead=LeadTime(amount=row[6], unit=row[7]),
        )
    digest = None
    if row[8] is not None:
        digest = Digest(
            open_count=row[8],
            upcoming=tuple(
                DigestItem(commission_id=u["commission_id"], title=u["title"], deadline=date.fromisoformat(u["deadline"]))
                for u in json.loads(row[9])
            ),
        )
    return Notification(
        notification_id=row[0],
        kind=row[1],
        due_at=datetime.fromisoformat(row[2]),
        deadline_item=item,
        digest=digest,
        created_at=datetime.fromisoformat(row[10]),
        acknowledged_at=_optional_moment(row[11]),
    )


# --- storage -----------------------------------------------------------------

class ReminderWriteScope:
    """Storage actions available inside ReminderRepository.write_scope()."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def fetch_state(self) -> SettingsState | None:
        row = self._conn.execute(f"SELECT {_SETTINGS_COLUMNS} FROM reminder_settings WHERE id = 1").fetchone()
        return _to_state(row) if row is not None else None

    def set_digest_handled_through(self, moment: datetime) -> None:
        self._conn.execute(
            "UPDATE reminder_settings SET digest_handled_through = ? WHERE id = 1", (moment.isoformat(),)
        )

    def fetch_sent_keys(self) -> set[DeadlineReminderKey]:
        rows = self._conn.execute("SELECT commission_id, deadline, lead_hours FROM reminder_deadline_sent").fetchall()
        return {DeadlineReminderKey(commission_id=r[0], deadline=date.fromisoformat(r[1]), lead_hours=r[2]) for r in rows}

    def insert_notification(self, notification: Notification) -> None:
        self._conn.execute(
            f"INSERT INTO reminder_notification ({_NOTIFICATION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            _notification_values(notification),
        )

    def insert_sent_key(self, key: DeadlineReminderKey, notification_id: str) -> None:
        self._conn.execute(
            "INSERT INTO reminder_deadline_sent (commission_id, deadline, lead_hours, notification_id) VALUES (?, ?, ?, ?)",
            (key.commission_id, key.deadline.isoformat(), key.lead_hours, notification_id),
        )


class ReminderRepository:
    def __init__(self, db) -> None:
        # db: the db_connection resource of scaffold_backend, handed over by
        # the Main (transaction() / read() context managers).
        self._db = db

    def ensure_storage(self) -> None:
        with self._db.transaction() as conn:
            conn.execute(f"CREATE TABLE IF NOT EXISTS {_VERSION_TABLE} (version INTEGER NOT NULL)")
            row = conn.execute(f"SELECT version FROM {_VERSION_TABLE}").fetchone()
            current = row[0] if row else 0
            latest = _STORAGE_UPGRADES[-1][0]
            if current > latest:
                raise StorageVersionError(
                    f"reminder tables are at version {current}; this build knows up to {latest}"
                )
            for version, statements in _STORAGE_UPGRADES:
                if version > current:
                    for statement in statements:
                        conn.execute(statement)
            if row is None:
                conn.execute(f"INSERT INTO {_VERSION_TABLE} (version) VALUES (?)", (latest,))
            else:
                conn.execute(f"UPDATE {_VERSION_TABLE} SET version = ?", (latest,))

    @contextmanager
    def write_scope(self) -> Iterator[ReminderWriteScope]:
        """One read-write transaction. Every read and write made through the
        yielded scope is atomic with respect to every other storage call of
        the layer; an exception raised inside the block rolls everything
        back. Nothing else (no call to another workflow) may run inside it.
        """
        with _storage_io(), self._db.transaction() as conn:
            yield ReminderWriteScope(conn)

    def fetch_state(self) -> SettingsState | None:
        with _storage_io(), self._db.read() as conn:
            row = conn.execute(f"SELECT {_SETTINGS_COLUMNS} FROM reminder_settings WHERE id = 1").fetchone()
        return _to_state(row) if row is not None else None

    def save_state(self, state: SettingsState) -> None:
        """Replace the whole stored settings row with ``state``."""
        s = state.settings
        leads = json.dumps([{"amount": lt.amount, "unit": lt.unit} for lt in s.deadline.lead_times])
        handled = state.digest_handled_through.isoformat() if state.digest_handled_through is not None else None
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                f"INSERT OR REPLACE INTO reminder_settings (id, {_SETTINGS_COLUMNS}) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    int(s.periodic.enabled),
                    s.periodic.every,
                    s.periodic.unit,
                    s.periodic.at_time,
                    s.periodic.weekday,
                    int(s.deadline.enabled),
                    leads,
                    state.updated_at.isoformat(),
                    handled,
                ),
            )

    def fetch_pending(self) -> list[Notification]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(
                f"SELECT {_NOTIFICATION_COLUMNS} FROM reminder_notification WHERE acknowledged_at IS NULL"
            ).fetchall()
        return [_to_notification(r) for r in rows]

    def acknowledge(self, notification_id: str, acknowledged_at: datetime) -> datetime | None:
        """Set acknowledged_at of a notification that has none yet, then
        return the stored acknowledged_at (the first one when it was already
        set). None when no notification has this id. One transaction."""
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                "UPDATE reminder_notification SET acknowledged_at = ? "
                "WHERE notification_id = ? AND acknowledged_at IS NULL",
                (acknowledged_at.isoformat(), notification_id),
            )
            row = conn.execute(
                "SELECT acknowledged_at FROM reminder_notification WHERE notification_id = ?", (notification_id,)
            ).fetchone()
        return datetime.fromisoformat(row[0]) if row is not None else None


# --- calls to other workflows --------------------------------------------------

def _call(workflow: str, endpoint: Callable[..., list]) -> list:
    # Label 500 becomes this workflow's StorageIOError; any other failure
    # (a programming error) propagates unchanged.
    try:
        return endpoint()
    except Exception as exc:
        if getattr(exc, "label", None) == 500:
            body = getattr(exc, "error_body", None) or {}
            raise StorageIOError(f"{workflow}: {body.get('message')} {body.get('details')}") from exc
        raise


class ReminderSources:
    """Reads the two lists send_reminder needs through the in_process
    endpoints handed over by the Main (api_contract.yaml):
    - list_commission_index  (manage_commission)  -> commissions
    - list_progress_board    (update_progress)    -> progress

    Each endpoint returns plain data or raises an error carrying ``label``
    and ``error_body``; nothing of those workflows is imported here.
    """

    def __init__(self, list_commission_index: Callable[..., list], list_progress_board: Callable[..., list]) -> None:
        self._list_commission_index = list_commission_index
        self._list_progress_board = list_progress_board

    def fetch_commissions(self) -> list[CommissionEntry]:
        return [
            CommissionEntry(
                commission_id=c["commission_id"],
                title=c["title"],
                agreed_price=Money(amount_minor=c["agreed_price"]["amount_minor"], currency=c["agreed_price"]["currency"]),
                deadline=date.fromisoformat(c["deadline"]) if c["deadline"] is not None else None,
            )
            for c in _call("manage_commission", self._list_commission_index)
        ]

    def fetch_progress(self) -> list[ProgressEntry]:
        return [
            ProgressEntry(commission_id=e["commission_id"], current_stage=e["current_stage"], stage_kind=e["stage_kind"])
            for e in _call("update_progress", self._list_progress_board)
        ]


# --- the machine clock ---------------------------------------------------------

class SystemClock:
    """The machine's clock and time zone (send_reminder's "local time").

    now()            the current moment, local time with its UTC offset, to the second
    at_local(wall)   the moment a naive local wall-clock time denotes
    to_local(when)   the same moment, expressed with the local offset in effect then

    The operating system may not know the offset of a far-away moment (on
    Windows, before 1970 or after year 3000): the offset in effect now is
    used for such a moment.
    """

    def now(self) -> datetime:
        return datetime.now().astimezone().replace(microsecond=0)

    def _current_offset(self) -> timezone:
        return timezone(datetime.now().astimezone().utcoffset())

    def at_local(self, wall: datetime) -> datetime:
        try:
            return wall.astimezone()
        except (OSError, OverflowError, ValueError):
            return wall.replace(tzinfo=self._current_offset())

    def to_local(self, when: datetime) -> datetime:
        try:
            return when.astimezone()
        except (OSError, OverflowError, ValueError):
            try:
                return when.astimezone(self._current_offset())
            except OverflowError:
                return when

