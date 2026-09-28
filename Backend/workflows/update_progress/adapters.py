"""Adapters of update_progress: storage of the workflow's own tables, and the
call to manage_commission.

Tables owned by update_progress (nobody else reads or writes them; no foreign
key to another workflow's table):
- update_progress_schema_version  one row: version of this workflow's table layout
- stage_change                    one row per stage change; never updated or deleted.
                                  The current stage of a commission is its last row.
"""

import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from typing import Callable, Iterator

from .entities import CommissionSummary, Money, StageChangeRecord

# Ordered upgrade steps of this workflow's tables. A step is applied once,
# when the stored version is lower than its number. Append new steps; never
# edit an applied one.
_STORAGE_UPGRADES: list[tuple[int, list[str]]] = [
    (
        1,
        [
            # (commission_id, position) is the key: a history cannot fork,
            # each change takes the next place after the one it follows.
            """
            CREATE TABLE stage_change (
                commission_id TEXT NOT NULL,
                position      INTEGER NOT NULL,
                from_stage    TEXT,
                to_stage      TEXT NOT NULL,
                to_kind       TEXT NOT NULL,
                note          TEXT,
                changed_at    TEXT NOT NULL,
                PRIMARY KEY (commission_id, position)
            )
            """,
        ],
    ),
]

_VERSION_TABLE = "update_progress_schema_version"


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


_COLUMNS = "commission_id, position, from_stage, to_stage, to_kind, note, changed_at"

# Last change of each commission.
_LATEST_ROWS = (
    f"SELECT {_COLUMNS} FROM stage_change AS s "
    "WHERE position = (SELECT MAX(position) FROM stage_change WHERE commission_id = s.commission_id)"
)


def _row_values(r: StageChangeRecord) -> tuple:
    return (r.commission_id, r.position, r.from_stage, r.to_stage, r.to_kind, r.note, r.changed_at.isoformat())


def _to_record(row: tuple) -> StageChangeRecord:
    return StageChangeRecord(
        commission_id=row[0],
        position=row[1],
        from_stage=row[2],
        to_stage=row[3],
        to_kind=row[4],
        note=row[5],
        changed_at=datetime.fromisoformat(row[6]),
    )


def _latest(conn: sqlite3.Connection, commission_id: str) -> StageChangeRecord | None:
    row = conn.execute(
        f"SELECT {_COLUMNS} FROM stage_change WHERE commission_id = ? ORDER BY position DESC LIMIT 1",
        (commission_id,),
    ).fetchone()
    return _to_record(row) if row is not None else None


class ProgressWriteScope:
    """Storage actions available inside ProgressRepository.write_scope()."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def latest(self, commission_id: str) -> StageChangeRecord | None:
        return _latest(self._conn, commission_id)

    def append(self, record: StageChangeRecord) -> None:
        self._conn.execute(f"INSERT INTO stage_change ({_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)", _row_values(record))


class ProgressRepository:
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
                    f"progress tables are at version {current}; this build knows up to {latest}"
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
    def write_scope(self) -> Iterator[ProgressWriteScope]:
        """One read-write transaction. Every read and write made through the
        yielded scope is atomic with respect to every other storage call of
        the layer; an exception raised inside the block rolls everything
        back. Nothing else (no call to another workflow) may run inside it.
        """
        with _storage_io(), self._db.transaction() as conn:
            yield ProgressWriteScope(conn)

    def fetch_latest(self, commission_id: str) -> StageChangeRecord | None:
        with _storage_io(), self._db.read() as conn:
            return _latest(conn, commission_id)

    def fetch_history(self, commission_id: str) -> list[StageChangeRecord]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(
                f"SELECT {_COLUMNS} FROM stage_change WHERE commission_id = ? ORDER BY position",
                (commission_id,),
            ).fetchall()
        return [_to_record(r) for r in rows]

    def fetch_all_latest(self) -> list[StageChangeRecord]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(_LATEST_ROWS).fetchall()
        return [_to_record(r) for r in rows]


class CommissionDirectory:
    """Reads commission_summary from manage_commission through its in_process
    endpoint get_commission_summary (api_contract.yaml), handed over by the
    Main. Sending commission_id is the progress_commission_lookup output.

    The endpoint returns plain data or raises an error carrying ``label``
    and ``error_body``; nothing of manage_commission is imported here.
    """

    def __init__(self, get_commission_summary: Callable[..., dict]) -> None:
        self._get_commission_summary = get_commission_summary

    def fetch_summary(self, commission_id: str) -> CommissionSummary | None:
        """None when manage_commission answers 404; StorageIOError when it answers 500."""
        try:
            data = self._get_commission_summary(commission_id=commission_id)
        except Exception as exc:
            label = getattr(exc, "label", None)
            if label == 404:
                return None
            if label == 500:
                body = getattr(exc, "error_body", None) or {}
                raise StorageIOError(f"manage_commission: {body.get('message')} {body.get('details')}") from exc
            raise
        price = data["agreed_price"]
        return CommissionSummary(
            commission_id=data["commission_id"],
            title=data["title"],
            agreed_price=Money(amount_minor=price["amount_minor"], currency=price["currency"]),
            deadline=date.fromisoformat(data["deadline"]) if data["deadline"] is not None else None,
        )
