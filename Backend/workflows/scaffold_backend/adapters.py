# ===WCA-CHECKPOINT-START===
# workflow: scaffold_backend
# clause: clause_b_backend
# component: adapters
# last_updated_by: coding-agent@2026-09-24#2
# last_updated_at: 2026-09-24T19:00:00+07:00
#
# EXPERIENCES:
#   - id: scaffold_backend-EXP-002
#     content: >
#       journal_mode=DELETE (không dùng WAL): sau khi đóng sạch, DB chỉ là một
#       tệp duy nhất, không có -wal/-shm, nên restore_data (di chuyển nguyên
#       tệp) và backup_data không phải xử lý tệp phụ. Với một kết nối duy nhất
#       trong tiến trình, WAL không mang lại lợi ích về đồng thời.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Lần chạy đầu, Main tạo thư mục và tệp SQLite rỗng; kết nối có
#       foreign_keys=1 và journal_mode=delete; scaffold_backend không tạo bảng
#       nào; tệp không phải SQLite bị từ chối; khi có ngoại lệ, giao dịch được
#       rollback.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -v workflows/scaffold_backend/tests
#       (Python 3.13.12 của Backend/env, Windows 11, tệp SQLite thật trong
#       tmp_path của pytest)
#     result: >
#       5 passed: test_first_run_creates_folder_and_empty_database
#       (sqlite_master count = 0), test_not_a_database_is_rejected (DatabaseError),
#       test_transaction_rolls_back_on_error, test_shared_connection_is_safe_across_threads,
#       test_close_is_idempotent.
#     recorded_at: 2026-09-24T18:54:56+07:00
#   - claim: >
#       Tài nguyên db_connection dùng chung được an toàn giữa nhiều luồng, cả
#       khi gọi trực tiếp lẫn qua HTTP trên tiến trình backend thật; và được
#       ít nhất một workflow (manage_client) dùng thành công.
#     how: >
#       (1) test_shared_connection_is_safe_across_threads: 8 luồng x 200 giao
#       dịch, mỗi giao dịch 2 INSERT. (2) cd Backend; env\Scripts\python.exe
#       -m pytest -s -v tests/test_backend_process.py -k lifecycle: 8 luồng x 10 lần
#       POST /clients đồng thời vào tiến trình Backend.py thật.
#     result: >
#       (1) count(*) = 3200, không có lỗi. (2) In ra "concurrent: 8 threads x 10
#       POST /clients -> total clients 82" (80 bản ghi đồng thời + 2 bản ghi
#       tạo trước), mọi phản hồi đều 201.
#     recorded_at: 2026-09-24T18:54:56+07:00
#
# NOTES: []
# ===WCA-CHECKPOINT-END===
"""Adapters of scaffold_backend: prepare the db_connection foundation resource.

Fixed sequence of technical steps, no decision: create the database folder,
open the SQLite file (created empty on first run), apply connection-level
settings. Creates no tables.
"""

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


class SharedConnection:
    """The db_connection resource: one SQLite connection shared by every
    workflow of the layer, safe to use from the HTTP server's worker threads.

    Every access goes through ``transaction()`` (read-write) or ``read()``
    (read-only); both hold one process-wide lock for the whole block, so
    statements of different requests never interleave. The yielded
    ``sqlite3.Connection`` must not be kept or used after the block ends.
    Blocks must not be nested.
    """

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection
        self._lock = threading.RLock()
        self._closed = False

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            self._connection.execute("BEGIN IMMEDIATE")
            try:
                yield self._connection
            except BaseException:
                self._connection.execute("ROLLBACK")
                raise
            self._connection.execute("COMMIT")

    @contextmanager
    def read(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            self._connection.execute("BEGIN DEFERRED")
            try:
                yield self._connection
            finally:
                self._connection.execute("COMMIT")

    def close(self) -> None:
        with self._lock:
            if not self._closed:
                self._connection.close()
                self._closed = True


def ensure_database_folder(db_file_path: str) -> None:
    Path(db_file_path).parent.mkdir(parents=True, exist_ok=True)


def open_connection(
    db_file_path: str,
    *,
    journal_mode: str,
    synchronous: str,
    foreign_keys: bool,
    busy_timeout_ms: int,
) -> SharedConnection:
    # isolation_level=None: the sqlite3 module never opens transactions on
    # its own; SharedConnection issues BEGIN/COMMIT explicitly.
    connection = sqlite3.connect(
        db_file_path,
        check_same_thread=False,
        isolation_level=None,
    )
    try:
        connection.execute(f"PRAGMA busy_timeout = {int(busy_timeout_ms)}")
        connection.execute(f"PRAGMA journal_mode = {journal_mode}")
        connection.execute(f"PRAGMA synchronous = {synchronous}")
        connection.execute(f"PRAGMA foreign_keys = {'ON' if foreign_keys else 'OFF'}")
        # Fails with sqlite3.DatabaseError if the file is not a database.
        connection.execute("PRAGMA schema_version").fetchone()
    except BaseException:
        connection.close()
        raise
    return SharedConnection(connection)
