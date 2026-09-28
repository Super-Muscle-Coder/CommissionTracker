"""Adapters of manage_watermark_profile: storage of the workflow's own tables.

Tables owned by manage_watermark_profile (nobody else reads or writes them):
- manage_watermark_profile_schema_version  one row: version of this workflow's table layout
- watermark_profile                        one row per ownership profile

manage_watermark_profile calls no other workflow.
"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Iterator

from .entities import WatermarkProfile

# Ordered upgrade steps of this workflow's tables. A step is applied once,
# when the stored version is lower than its number. Append new steps; never
# edit an applied one.
_STORAGE_UPGRADES: list[tuple[int, list[str]]] = [
    (
        1,
        [
            """
            CREATE TABLE watermark_profile (
                profile_id          TEXT PRIMARY KEY,
                display_name        TEXT NOT NULL,
                legal_name          TEXT,
                contact             TEXT,
                ownership_statement TEXT,
                default_strength    TEXT NOT NULL,
                created_at          TEXT NOT NULL,
                updated_at          TEXT NOT NULL
            )
            """,
        ],
    ),
]

# Version table of this workflow (CLAUDE.md, section 5).
_VERSION_TABLE = "manage_watermark_profile_schema_version"

_COLUMNS = (
    "profile_id, display_name, legal_name, contact, ownership_statement, default_strength, "
    "created_at, updated_at"
)


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


def _row_values(profile: WatermarkProfile) -> tuple:
    return (
        profile.profile_id,
        profile.display_name,
        profile.legal_name,
        profile.contact,
        profile.ownership_statement,
        profile.default_strength,
        profile.created_at.isoformat(),
        profile.updated_at.isoformat(),
    )


def _from_row(row) -> WatermarkProfile:
    return WatermarkProfile(
        profile_id=row[0],
        display_name=row[1],
        legal_name=row[2],
        contact=row[3],
        ownership_statement=row[4],
        default_strength=row[5],
        created_at=datetime.fromisoformat(row[6]),
        updated_at=datetime.fromisoformat(row[7]),
    )


class ProfileRepository:
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
                    f"watermark profile tables are at version {current}; this build knows up to {latest}"
                )
            for version, statements in _STORAGE_UPGRADES:
                if version > current:
                    for statement in statements:
                        conn.execute(statement)
            if row is None:
                conn.execute(f"INSERT INTO {_VERSION_TABLE} (version) VALUES (?)", (latest,))
            else:
                conn.execute(f"UPDATE {_VERSION_TABLE} SET version = ?", (latest,))

    def insert(self, profile: WatermarkProfile) -> None:
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                f"INSERT INTO watermark_profile ({_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                _row_values(profile),
            )

    def replace(self, profile: WatermarkProfile) -> None:
        with _storage_io(), self._db.transaction() as conn:
            conn.execute(
                "UPDATE watermark_profile SET display_name = ?, legal_name = ?, contact = ?, "
                "ownership_statement = ?, default_strength = ?, created_at = ?, updated_at = ? "
                "WHERE profile_id = ?",
                (*_row_values(profile)[1:], profile.profile_id),
            )

    def fetch(self, profile_id: str) -> WatermarkProfile | None:
        with _storage_io(), self._db.read() as conn:
            row = conn.execute(
                f"SELECT {_COLUMNS} FROM watermark_profile WHERE profile_id = ?", (profile_id,)
            ).fetchone()
        return _from_row(row) if row is not None else None

    def fetch_all(self) -> list[WatermarkProfile]:
        with _storage_io(), self._db.read() as conn:
            rows = conn.execute(f"SELECT {_COLUMNS} FROM watermark_profile").fetchall()
        return [_from_row(r) for r in rows]
