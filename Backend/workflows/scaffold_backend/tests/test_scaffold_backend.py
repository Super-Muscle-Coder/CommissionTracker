"""Tests of scaffold_backend: the db_connection resource on a real SQLite file."""

import sqlite3
import threading

import pytest

from workflows.scaffold_backend import adapters as scaffold

SETTINGS = dict(journal_mode="DELETE", synchronous="FULL", foreign_keys=True, busy_timeout_ms=5000)


def test_first_run_creates_folder_and_empty_database(tmp_path):
    path = tmp_path / "a" / "b" / "data.db"
    scaffold.ensure_database_folder(str(path))
    db = scaffold.open_connection(str(path), **SETTINGS)
    try:
        assert path.is_file()
        with db.read() as conn:
            assert conn.execute("SELECT count(*) FROM sqlite_master").fetchone() == (0,)
            assert conn.execute("PRAGMA foreign_keys").fetchone() == (1,)
            assert conn.execute("PRAGMA journal_mode").fetchone() == ("delete",)
    finally:
        db.close()


def test_not_a_database_is_rejected(tmp_path):
    path = tmp_path / "data.db"
    path.write_bytes(b"this is not sqlite" * 100)
    with pytest.raises(sqlite3.DatabaseError):
        scaffold.open_connection(str(path), **SETTINGS)


def test_transaction_rolls_back_on_error(tmp_path):
    db = scaffold.open_connection(str(tmp_path / "data.db"), **SETTINGS)
    try:
        with db.transaction() as conn:
            conn.execute("CREATE TABLE t (x INTEGER)")
        with pytest.raises(RuntimeError):
            with db.transaction() as conn:
                conn.execute("INSERT INTO t VALUES (1)")
                raise RuntimeError("boom")
        with db.read() as conn:
            assert conn.execute("SELECT count(*) FROM t").fetchone() == (0,)
    finally:
        db.close()


def test_shared_connection_is_safe_across_threads(tmp_path):
    db = scaffold.open_connection(str(tmp_path / "data.db"), **SETTINGS)
    try:
        with db.transaction() as conn:
            conn.execute("CREATE TABLE t (n INTEGER, i INTEGER)")
        errors = []

        def worker(n):
            try:
                for i in range(200):
                    with db.transaction() as conn:
                        conn.execute("INSERT INTO t VALUES (?, ?)", (n, i))
                        conn.execute("INSERT INTO t VALUES (?, ?)", (-n, i))
                    with db.read() as conn:
                        conn.execute("SELECT count(*) FROM t").fetchone()
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=worker, args=(n,)) for n in range(1, 9)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert errors == []
        with db.read() as conn:
            assert conn.execute("SELECT count(*) FROM t").fetchone() == (8 * 200 * 2,)
    finally:
        db.close()


def test_close_is_idempotent(tmp_path):
    db = scaffold.open_connection(str(tmp_path / "data.db"), **SETTINGS)
    db.close()
    db.close()
