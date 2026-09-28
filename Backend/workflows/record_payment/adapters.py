"""Adapters of record_payment: storage of the workflow's own tables, and the
call to manage_commission.

Tables owned by record_payment (nobody else reads or writes them; no foreign
key to another workflow's table):
- record_payment_schema_version  one row: version of this workflow's table layout
- payment                        one row per payment entry; never deleted
"""

import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from typing import Callable, Iterator

from .entities import CommissionSummary, Money, Payment

# Ordered upgrade steps of this workflow's tables. A step is applied once,
# when the stored version is lower than its number. Append new steps; never
# edit an applied one.
_STORAGE_UPGRADES: list[tuple[int, list[str]]] = [
    (
        1,
        [
            """
            CREATE TABLE payment (
                payment_id    TEXT PRIMARY KEY,
                commission_id TEXT NOT NULL,
                direction     TEXT NOT NULL,
                kind          TEXT NOT NULL,
                amount_minor  INTEGER NOT NULL,
                currency      TEXT NOT NULL,
                method        TEXT NOT NULL,
                paid_at       TEXT NOT NULL,
                note          TEXT,
                is_voided     INTEGER NOT NULL,
                recorded_at   TEXT NOT NULL,
                voided_at     TEXT
            )
            """,
            "CREATE INDEX payment_by_commission ON payment (commission_id)",
        ],
    ),
]

_VERSION_TABLE = "record_payment_schema_version"


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
    "payment_id, commission_id, direction, kind, amount_minor, currency, method, paid_at, "
    "note, is_voided, recorded_at, voided_at"
)


def _row_values(p: Payment) -> tuple:
    return (
        p.payment_id,
        p.commission_id,
        p.direction,
        p.kind,
        p.amount.amount_minor,
        p.amount.currency,
        p.method,
        p.paid_at.isoformat(),
        p.note,
        int(p.is_voided),
        p.recorded_at.isoformat(),
        p.voided_at.isoformat() if p.voided_at is not None else None,
    )


def _to_payment(row: tuple) -> Payment:
    return Payment(
        payment_id=row[0],
        commission_id=row[1],
        direction=row[2],
        kind=row[3],
        amount=Money(amount_minor=row[4], currency=row[5]),
        method=row[6],
        paid_at=datetime.fromisoformat(row[7]),
        note=row[8],
        is_voided=bool(row[9]),
        recorded_at=datetime.fromisoformat(row[10]),
        voided_at=datetime.fromisoformat(row[11]) if row[11] is not None else None,
    )


class PaymentWriteScope:
    """Storage actions available inside PaymentRepository.write_scope()."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def fetch_for_commission(self, commission_id: str) -> list[Payment]:
        rows = self._conn.execute(
            f"SELECT {_COLUMNS} FROM payment WHERE commission_id = ?", (commission_id,)
        ).fetchall()
        return [_to_payment(r) for r in rows]

    def insert(self, payment: Payment) -> None:
        self._conn.execute(
            f"INSERT INTO payment ({_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            _row_values(payment),
        )


class PaymentRepository:
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
                    f"payment tables are at version {current}; this build knows up to {latest}"
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
    def write_scope(self) -> Iterator["PaymentWriteScope"]:
        """One read-write transaction. Every read and write made through the
        yielded scope is atomic with respect to every other storage call of
        the layer; an exception raised inside the block rolls everything
        back. Nothing else (no call to another workflow) may run inside it.
        """
        with _storage_io(), self._db.transaction() as conn:
            yield PaymentWriteScope(conn)

    def mark_voided(self, payment_id: str, voided_at: datetime) -> bool:
        """Set the voided flag of a payment that is not voided yet.

        Returns False when no row changed (unknown id, or already voided):
        the check and the write are one statement, so two concurrent calls
        never both succeed.
        """
        with _storage_io(), self._db.transaction() as conn:
            cursor = conn.execute(
                "UPDATE payment SET is_voided = 1, voided_at = ? WHERE payment_id = ? AND is_voided = 0",
                (voided_at.isoformat(), payment_id),
            )
            return cursor.rowcount == 1

    def fetch(self, payment_id: str) -> Payment | None:
        with _storage_io(), self._db.read() as conn:
            row = conn.execute(f"SELECT {_COLUMNS} FROM payment WHERE payment_id = ?", (payment_id,)).fetchone()
        return _to_payment(row) if row is not None else None

    def fetch_for_commission(self, commission_id: str) -> list[Payment]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(
                f"SELECT {_COLUMNS} FROM payment WHERE commission_id = ?", (commission_id,)
            ).fetchall()
        return [_to_payment(r) for r in rows]

    def fetch_all(self) -> list[Payment]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(f"SELECT {_COLUMNS} FROM payment").fetchall()
        return [_to_payment(r) for r in rows]


class CommissionDirectory:
    """Reads commission_summary from manage_commission through its in_process
    endpoint get_commission_summary (api_contract.yaml), handed over by the
    Main. Sending commission_id is the payment_commission_lookup output.

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
