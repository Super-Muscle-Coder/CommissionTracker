"""Adapters of backup_data: the technical actions on the database, on archive
files and on the staging file, plus the machine clock.

backup_data owns no table. It handles the database as one block (05-edge-cases.md,
Step 5.6): a consistent copy of the whole file, and nothing read from inside it
except the integrity verdict of SQLite itself. Every method is one technical
action; which action comes next is decided by the Services.

Failure kinds:
- StorageIOError   reading or writing storage failed unexpectedly (permission,
                   disk full, locked file...): sqlite3.Error and OSError.
- ArchiveReadError the archive file itself is not a usable zip (not a zip,
                   truncated, bad checksum, unsupported compression). An
                   expected outcome of looking at a user-supplied file, not a
                   storage failure.
"""

import hashlib
import json
import os
import sqlite3
import tempfile
import zipfile
import zlib
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterator

from .entities import ArchiveSettings, FileDigest, StagingSettings


class StorageIOError(Exception):
    """Reading or writing storage failed unexpectedly (disk full, permission,
    file locked, corrupted storage...)."""


class ArchiveReadError(Exception):
    """The archive file cannot be read as a zip."""


@contextmanager
def _storage_io() -> Iterator[None]:
    # Only failures of the storage itself are translated; any other
    # exception (a programming error) propagates unchanged.
    try:
        yield
    except (sqlite3.Error, OSError) as exc:
        raise StorageIOError(str(exc)) from exc


@contextmanager
def _archive_errors() -> Iterator[None]:
    # What the zip machinery raises for a file that is not a sound zip. An
    # OSError (permission, disk) is not among them: it stays a storage failure.
    try:
        yield
    except (zipfile.BadZipFile, zlib.error, EOFError, NotImplementedError, RuntimeError) as exc:
        raise ArchiveReadError(f"{type(exc).__name__}: {exc}") from exc


def _digest_file(path: str | Path, chunk_bytes: int) -> FileDigest:
    sha = hashlib.sha256()
    size = 0
    with open(path, "rb") as f:
        while chunk := f.read(chunk_bytes):
            sha.update(chunk)
            size += len(chunk)
    return FileDigest(size_bytes=size, sha256=sha.hexdigest())


def _stop_when_blocked(status: int, remaining: int, total: int) -> None:
    # Connection.backup() retries forever while SQLite answers BUSY or LOCKED
    # (another connection holds the file), and meanwhile the caller keeps
    # db_connection's lock: the whole backend would stand still. The progress
    # callback sees every answer, including those; raising from it abandons the
    # copy. SQLite has already waited for the connection's busy_timeout before
    # it answers BUSY, so this is "gave up after busy_timeout".
    if status in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED):
        raise sqlite3.OperationalError("database is locked")


# --- the machine clock ---------------------------------------------------------

class SystemClock:
    """The machine's clock: the current moment in local time with its UTC
    offset, to the second."""

    def now(self) -> datetime:
        return datetime.now().astimezone().replace(microsecond=0)


# --- the database as one block ---------------------------------------------------

@dataclass(frozen=True)
class SnapshotFile:
    path: str
    digest: FileDigest


class DatabaseSnapshots:
    """A consistent copy of the whole database, taken through db_connection."""

    def __init__(self, db, chunk_bytes: int) -> None:
        self._db = db
        self._chunk_bytes = chunk_bytes

    @contextmanager
    def take(self) -> Iterator[SnapshotFile]:
        """Copy the database into a file in a private temporary folder, which
        is removed when the block ends. The copy is made inside one read
        block of db_connection: it holds the connection's lock, so no write
        of any request falls in the middle of it, and later writes wait for
        it. SQLite's own online backup does the copy (a page-level copy under
        a read transaction): a consistent file, not one that mixes two moments.
        """
        with _storage_io():
            folder = tempfile.TemporaryDirectory(prefix="ct-backup-", ignore_cleanup_errors=True)
        try:
            with _storage_io():
                target = os.path.join(folder.name, "snapshot.db")
                with self._db.read() as source:
                    copy = sqlite3.connect(target)
                    try:
                        source.backup(copy, progress=_stop_when_blocked)
                    finally:
                        copy.close()
                digest = _digest_file(target, self._chunk_bytes)
            yield SnapshotFile(path=target, digest=digest)
        finally:
            folder.cleanup()


# --- archive files ---------------------------------------------------------------

class ArchiveFiles:
    """Archive files: the destination folder, the zip itself, the checksum."""

    def __init__(self, settings: ArchiveSettings, chunk_bytes: int) -> None:
        self._s = settings
        self._chunk_bytes = chunk_bytes

    def directory_exists(self, path: str) -> bool:
        with _storage_io():
            return os.path.isdir(path)

    def path_kind(self, path: str) -> str:
        """'missing', 'file' or 'other' (a folder, a device...)."""
        with _storage_io():
            if os.path.isfile(path):
                return "file"
            return "other" if os.path.lexists(path) else "missing"

    def write_temp_archive(self, directory: str, manifest: dict, snapshot_path: str) -> str:
        """Write the zip (manifest, then database) to a new, uniquely named
        in-progress file in `directory`. Nothing is left behind when it
        fails. Returns the in-progress path."""
        with _storage_io():
            fd, temp = tempfile.mkstemp(dir=directory, prefix=".ct-", suffix=self._s.temp_suffix)
            os.close(fd)
            try:
                with zipfile.ZipFile(temp, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                    archive.writestr(self._s.manifest_name, json.dumps(manifest, indent=2).encode("utf-8"))
                    archive.write(snapshot_path, arcname=self._s.database_name)
            except BaseException:
                self.discard(temp)
                raise
        return temp

    def digest_of(self, path: str) -> FileDigest:
        with _storage_io():
            return _digest_file(path, self._chunk_bytes)

    def publish(self, temp_path: str, directory: str, file_name: str) -> str | None:
        """Give the in-progress file its final name, atomically, without ever
        replacing an existing file. Returns the final path, or None when that
        name is already taken (the in-progress file is then untouched)."""
        final = os.path.join(directory, file_name)
        with _storage_io():
            try:
                if os.name == "nt":
                    os.rename(temp_path, final)  # fails when `final` exists
                else:
                    os.link(temp_path, final)  # fails when `final` exists
                    os.unlink(temp_path)
            except FileExistsError:
                return None
        return final

    def discard(self, path: str) -> None:
        """Remove a file that must not stay; a failure to remove is ignored
        (the caller is already handling a failure)."""
        try:
            os.unlink(path)
        except OSError:
            pass

    # --- reading an archive ---

    def list_components(self, path: str) -> tuple[str, ...]:
        with _storage_io(), _archive_errors():
            with zipfile.ZipFile(path) as archive:
                return tuple(archive.namelist())

    def read_component(self, path: str, name: str, max_bytes: int) -> bytes:
        """The component's content, at most max_bytes + 1 bytes of it (so the
        caller can tell "too large" from "exactly the limit")."""
        with _storage_io(), _archive_errors():
            with zipfile.ZipFile(path) as archive, archive.open(name) as member:
                return member.read(max_bytes + 1)

    def extract_component(self, path: str, name: str, target_path: str, max_bytes: int) -> FileDigest:
        """Copy the component to target_path, reading at most max_bytes + 1
        bytes of it (a component that is longer than announced is cut there,
        and its digest tells so). The digest is of what was written."""
        sha = hashlib.sha256()
        written = 0
        with _storage_io(), _archive_errors():
            with zipfile.ZipFile(path) as archive, archive.open(name) as member, open(target_path, "wb") as out:
                while written <= max_bytes:
                    chunk = member.read(min(self._chunk_bytes, max_bytes + 1 - written))
                    if not chunk:
                        break
                    out.write(chunk)
                    sha.update(chunk)
                    written += len(chunk)
        return FileDigest(size_bytes=written, sha256=sha.hexdigest())


# --- the staging file --------------------------------------------------------------

@dataclass(frozen=True)
class StagingPaths:
    in_progress: str
    final: str


class StagingArea:
    """The staging file of a restore: next to the running database file (the
    same volume, so restore_data can later move it with one rename), in a
    folder of its own. The location of the database file is asked of
    db_connection, never guessed or read from the environment again."""

    def __init__(self, db, settings: StagingSettings, temp_suffix: str, chunk_bytes: int) -> None:
        self._db = db
        self._s = settings
        self._temp_suffix = temp_suffix
        self._chunk_bytes = chunk_bytes

    def _folder(self) -> Path:
        with _storage_io():
            with self._db.read() as conn:
                rows = conn.execute("PRAGMA database_list").fetchall()
        main = [row[2] for row in rows if row[1] == "main"]
        if not main or not main[0]:
            raise StorageIOError("the database is not backed by a file")
        return Path(main[0]).parent / self._s.folder_name

    def paths(self) -> StagingPaths:
        final = self._folder() / self._s.file_name
        return StagingPaths(in_progress=str(final) + self._temp_suffix, final=str(final))

    def prepare(self) -> StagingPaths:
        """The paths, with their folder created."""
        paths = self.paths()
        with _storage_io():
            Path(paths.final).parent.mkdir(parents=True, exist_ok=True)
        return paths

    def clear(self) -> None:
        """Remove the staging file and any in-progress one. A folder that is
        not there is nothing to clear."""
        paths = self.paths()
        with _storage_io():
            for path in (paths.final, paths.in_progress):
                try:
                    os.unlink(path)
                except FileNotFoundError:
                    pass

    def promote(self, paths: StagingPaths) -> None:
        """The in-progress file becomes the staging file, replacing any other
        one in a single rename."""
        with _storage_io():
            os.replace(paths.in_progress, paths.final)

    def discard(self, paths: StagingPaths) -> None:
        try:
            os.unlink(paths.in_progress)
        except OSError:
            pass

    def integrity_verdict(self, path: str) -> str:
        """SQLite's own verdict on the file as a database: 'ok', or what is
        wrong. Nothing is read from any table."""
        with _storage_io():
            try:
                connection = sqlite3.connect(Path(path).as_uri() + "?mode=ro", uri=True)
            except sqlite3.Error as exc:
                raise StorageIOError(str(exc)) from exc
            try:
                rows = connection.execute("PRAGMA integrity_check").fetchall()
            except sqlite3.OperationalError as exc:
                if "unable to open" in str(exc):
                    raise
                return f"not usable as a database: {exc}"
            except sqlite3.DatabaseError as exc:
                return f"not usable as a database: {exc}"
            finally:
                connection.close()
        verdict = [str(row[0]) for row in rows]
        return "ok" if verdict == ["ok"] else "; ".join(verdict[:5])
