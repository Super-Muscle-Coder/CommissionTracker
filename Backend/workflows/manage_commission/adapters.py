"""Adapters of manage_commission: storage of the workflow's own tables, and
the call to manage_client.

Tables owned by manage_commission (nobody else reads or writes them; no
foreign key to another workflow's table):
- manage_commission_schema_version  one row: version of this workflow's table layout
- commission                        one row per commission
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from typing import Callable, Iterator

from .entities import ClientSummary, Commission, CommissionListItem, CommissionSummary, Money

# Ordered upgrade steps of this workflow's tables. A step is applied once,
# when the stored version is lower than its number. Append new steps; never
# edit an applied one.
_STORAGE_UPGRADES: list[tuple[int, list[str]]] = [
    (
        1,
        [
            """
            CREATE TABLE commission (
                commission_id        TEXT PRIMARY KEY,
                client_id            TEXT NOT NULL,
                title                TEXT NOT NULL,
                description          TEXT,
                commission_type      TEXT,
                price_amount_minor   INTEGER NOT NULL,
                price_currency       TEXT NOT NULL,
                deadline             TEXT,
                reference_links_json TEXT NOT NULL,
                created_at           TEXT NOT NULL,
                updated_at           TEXT NOT NULL
            )
            """,
        ],
    ),
]


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


_COLUMNS = (
    "commission_id, client_id, title, description, commission_type, price_amount_minor, "
    "price_currency, deadline, reference_links_json, created_at, updated_at"
)


def _row_values(c: Commission) -> tuple:
    return (
        c.commission_id,
        c.client_id,
        c.title,
        c.description,
        c.commission_type,
        c.agreed_price.amount_minor,
        c.agreed_price.currency,
        c.deadline.isoformat() if c.deadline else None,
        json.dumps(c.reference_links, ensure_ascii=False),
        c.created_at.isoformat(),
        c.updated_at.isoformat(),
    )


def _to_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value is not None else None


def _to_commission(row: tuple) -> Commission:
    return Commission(
        commission_id=row[0],
        client_id=row[1],
        title=row[2],
        description=row[3],
        commission_type=row[4],
        agreed_price=Money(amount_minor=row[5], currency=row[6]),
        deadline=_to_date(row[7]),
        reference_links=json.loads(row[8]),
        created_at=datetime.fromisoformat(row[9]),
        updated_at=datetime.fromisoformat(row[10]),
    )


class CommissionRepository:
    def __init__(self, db) -> None:
        # db: the db_connection resource of scaffold_backend, handed over by
        # the Main (transaction() / read() context managers).
        self._db = db

    def ensure_storage(self) -> None:
        with self._db.transaction() as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS manage_commission_schema_version (version INTEGER NOT NULL)"
            )
            row = conn.execute("SELECT version FROM manage_commission_schema_version").fetchone()
            current = row[0] if row else 0
            latest = _STORAGE_UPGRADES[-1][0]
            if current > latest:
                raise StorageVersionError(
                    f"commission tables are at version {current}; this build knows up to {latest}"
                )
            for version, statements in _STORAGE_UPGRADES:
                if version > current:
                    for statement in statements:
                        conn.execute(statement)
            if row is None:
                conn.execute("INSERT INTO manage_commission_schema_version (version) VALUES (?)", (latest,))
            else:
                conn.execute("UPDATE manage_commission_schema_version SET version = ?", (latest,))

    def insert(self, commission: Commission) -> None:
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                f"INSERT INTO commission ({_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                _row_values(commission),
            )

    def replace(self, commission: Commission) -> None:
        values = _row_values(commission)
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                "UPDATE commission SET client_id = ?, title = ?, description = ?, commission_type = ?, "
                "price_amount_minor = ?, price_currency = ?, deadline = ?, reference_links_json = ?, "
                "created_at = ?, updated_at = ? WHERE commission_id = ?",
                values[1:] + values[:1],
            )

    def fetch(self, commission_id: str) -> Commission | None:
        with _storage_io(), self._db.read() as conn:
            row = conn.execute(
                f"SELECT {_COLUMNS} FROM commission WHERE commission_id = ?", (commission_id,)
            ).fetchone()
        return _to_commission(row) if row is not None else None

    def fetch_summary(self, commission_id: str) -> CommissionSummary | None:
        with _storage_io(), self._db.read() as conn:
            row = conn.execute(
                "SELECT commission_id, title, price_amount_minor, price_currency, deadline "
                "FROM commission WHERE commission_id = ?",
                (commission_id,),
            ).fetchone()
        return _to_summary(row) if row is not None else None

    def fetch_all_summaries(self) -> list[CommissionSummary]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(
                "SELECT commission_id, title, price_amount_minor, price_currency, deadline FROM commission"
            ).fetchall()
        return [_to_summary(r) for r in rows]

    def fetch_all_list_items(self) -> list[CommissionListItem]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(
                "SELECT commission_id, client_id, title, price_amount_minor, price_currency, deadline, "
                "updated_at FROM commission"
            ).fetchall()
        return [
            CommissionListItem(
                commission_id=r[0],
                client_id=r[1],
                title=r[2],
                agreed_price=Money(amount_minor=r[3], currency=r[4]),
                deadline=_to_date(r[5]),
                updated_at=datetime.fromisoformat(r[6]),
            )
            for r in rows
        ]


def _to_summary(row: tuple) -> CommissionSummary:
    return CommissionSummary(
        commission_id=row[0],
        title=row[1],
        agreed_price=Money(amount_minor=row[2], currency=row[3]),
        deadline=_to_date(row[4]),
    )


class ClientDirectory:
    """Reads client_summary from manage_client through its in_process
    endpoint get_client_summary (api_contract.yaml), handed over by the Main.

    The endpoint returns plain data or raises an error carrying ``label``
    and ``error_body``; nothing of manage_client is imported here.
    """

    def __init__(self, get_client_summary: Callable[..., dict]) -> None:
        self._get_client_summary = get_client_summary

    def fetch_summary(self, client_id: str) -> ClientSummary | None:
        """None when manage_client answers 404; StorageIOError when it answers 500."""
        try:
            data = self._get_client_summary(client_id=client_id)
        except Exception as exc:
            label = getattr(exc, "label", None)
            if label == 404:
                return None
            if label == 500:
                body = getattr(exc, "error_body", None) or {}
                raise StorageIOError(f"manage_client: {body.get('message')} {body.get('details')}") from exc
            raise
        return ClientSummary(client_id=data["client_id"], is_archived=data["is_archived"])
