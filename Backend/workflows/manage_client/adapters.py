"""Adapters of manage_client: storage of the workflow's own tables.

Tables owned by manage_client (nobody else reads or writes them):
- manage_client_schema_version  one row: version of this workflow's table layout
- client                        one row per client
- client_contact                the ordered contacts of a client
"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Iterator

from .entities import Client, ClientListItem, ClientSummary, Contact

# Ordered upgrade steps of this workflow's tables. A step is applied once,
# when the stored version is lower than its number. Append new steps; never
# edit an applied one.
_STORAGE_UPGRADES: list[tuple[int, list[str]]] = [
    (
        1,
        [
            """
            CREATE TABLE client (
                client_id    TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                note         TEXT,
                is_archived  INTEGER NOT NULL,
                created_at   TEXT NOT NULL,
                updated_at   TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE client_contact (
                client_id TEXT NOT NULL REFERENCES client (client_id) ON DELETE CASCADE,
                position  INTEGER NOT NULL,
                channel   TEXT NOT NULL,
                value     TEXT NOT NULL,
                PRIMARY KEY (client_id, position)
            )
            """,
        ],
    ),
]


# Version table of this workflow (CLAUDE.md, section 5:
# <workflow name>_schema_version). Builds before backend session #3 named it
# client_schema_version; see _rename_legacy_version_table.
_VERSION_TABLE = "manage_client_schema_version"
_LEGACY_VERSION_TABLE = "client_schema_version"


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (name,)
    ).fetchone() is not None


def _rename_legacy_version_table(conn: sqlite3.Connection) -> None:
    # Runs inside ensure_storage's transaction, before the version is read:
    # a database made by an older build keeps its version under the old
    # table name. Move the value to the new table, then drop the old one.
    # Not a layout upgrade step: it touches only the version bookkeeping.
    if not _table_exists(conn, _LEGACY_VERSION_TABLE):
        return
    conn.execute(f"CREATE TABLE IF NOT EXISTS {_VERSION_TABLE} (version INTEGER NOT NULL)")
    if conn.execute(f"SELECT 1 FROM {_VERSION_TABLE}").fetchone() is None:
        conn.execute(
            f"INSERT INTO {_VERSION_TABLE} (version) SELECT version FROM {_LEGACY_VERSION_TABLE}"
        )
    conn.execute(f"DROP TABLE {_LEGACY_VERSION_TABLE}")


class StorageVersionError(RuntimeError):
    """The stored table layout is newer than this build understands."""


class StorageIOError(Exception):
    """Reading or writing the database failed unexpectedly (locked or
    read-only file, disk full, corrupted storage...)."""


@contextmanager
def _storage_io() -> Iterator[None]:
    # Only failures of the storage itself are translated; any other
    # exception (a programming error) propagates unchanged.
    try:
        yield
    except (sqlite3.Error, OSError) as exc:
        raise StorageIOError(str(exc)) from exc


class ClientRepository:
    def __init__(self, db) -> None:
        # db: the db_connection resource of scaffold_backend, handed over by
        # the Main (transaction() / read() context managers).
        self._db = db

    def ensure_storage(self) -> None:
        with self._db.transaction() as conn:
            _rename_legacy_version_table(conn)
            conn.execute(
                f"CREATE TABLE IF NOT EXISTS {_VERSION_TABLE} (version INTEGER NOT NULL)"
            )
            row = conn.execute(f"SELECT version FROM {_VERSION_TABLE}").fetchone()
            current = row[0] if row else 0
            latest = _STORAGE_UPGRADES[-1][0]
            if current > latest:
                raise StorageVersionError(
                    f"client tables are at version {current}; this build knows up to {latest}"
                )
            for version, statements in _STORAGE_UPGRADES:
                if version > current:
                    for statement in statements:
                        conn.execute(statement)
            if row is None:
                conn.execute(f"INSERT INTO {_VERSION_TABLE} (version) VALUES (?)", (latest,))
            else:
                conn.execute(f"UPDATE {_VERSION_TABLE} SET version = ?", (latest,))

    def insert(self, client: Client) -> None:
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                "INSERT INTO client (client_id, display_name, note, is_archived, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    client.client_id,
                    client.display_name,
                    client.note,
                    int(client.is_archived),
                    client.created_at.isoformat(),
                    client.updated_at.isoformat(),
                ),
            )
            _write_contacts(conn, client.client_id, client.contacts)

    def replace(self, client: Client) -> None:
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                "UPDATE client SET display_name = ?, note = ?, is_archived = ?, updated_at = ? "
                "WHERE client_id = ?",
                (
                    client.display_name,
                    client.note,
                    int(client.is_archived),
                    client.updated_at.isoformat(),
                    client.client_id,
                ),
            )
            conn.execute("DELETE FROM client_contact WHERE client_id = ?", (client.client_id,))
            _write_contacts(conn, client.client_id, client.contacts)

    def fetch(self, client_id: str) -> Client | None:
        with _storage_io(), self._db.read() as conn:
            row = conn.execute(
                "SELECT client_id, display_name, note, is_archived, created_at, updated_at "
                "FROM client WHERE client_id = ?",
                (client_id,),
            ).fetchone()
            if row is None:
                return None
            contact_rows = conn.execute(
                "SELECT channel, value FROM client_contact WHERE client_id = ? ORDER BY position",
                (client_id,),
            ).fetchall()
        return Client(
            client_id=row[0],
            display_name=row[1],
            contacts=[Contact(channel=c, value=v) for c, v in contact_rows],
            note=row[2],
            is_archived=bool(row[3]),
            created_at=datetime.fromisoformat(row[4]),
            updated_at=datetime.fromisoformat(row[5]),
        )

    def fetch_summary(self, client_id: str) -> ClientSummary | None:
        with _storage_io(), self._db.read() as conn:
            row = conn.execute(
                "SELECT client_id, is_archived FROM client WHERE client_id = ?",
                (client_id,),
            ).fetchone()
        if row is None:
            return None
        return ClientSummary(client_id=row[0], is_archived=bool(row[1]))

    def fetch_all_list_items(self) -> list[ClientListItem]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(
                "SELECT client_id, display_name, is_archived, updated_at FROM client"
            ).fetchall()
        return [
            ClientListItem(
                client_id=r[0],
                display_name=r[1],
                is_archived=bool(r[2]),
                updated_at=datetime.fromisoformat(r[3]),
            )
            for r in rows
        ]


def _write_contacts(conn: sqlite3.Connection, client_id: str, contacts: list[Contact]) -> None:
    conn.executemany(
        "INSERT INTO client_contact (client_id, position, channel, value) VALUES (?, ?, ?, ?)",
        [(client_id, i, c.channel, c.value) for i, c in enumerate(contacts)],
    )
