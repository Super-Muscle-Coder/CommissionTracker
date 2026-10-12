"""Mechanics shared by the storage-upgrade tests of the six workflows that own
tables (BE-11).

Every one of those workflows has its own ``_STORAGE_UPGRADES`` and its own
``ensure_storage()``. Each workflow test (workflows/<name>/tests/
test_<name>_storage_upgrade.py) swaps its own workflow's list, in the test
only, for the real list plus a fake step 2, and starts the layer again on the
same file. This module holds only the mechanics: start the layer, read the
file the way a person with a SQLite shell would. The five assertions are
written out in each workflow's test.

"Start the layer" is ``Backend.wire_workflows`` on a fresh connection to the
same file: it is the very call that runs every ``ensure_storage()``. The
real-process start-up has its own tests (tests/test_backend_process.py).
"""

import sqlite3
from contextlib import closing, contextmanager

from fastapi.testclient import TestClient

import Backend
from workflows.scaffold_backend import adapters as scaffold

APP_VERSION = "1.0.0"

# A statement that fails in SQLite: step 2 of the rollback case is
# "a good statement, then this one".
BAD_STATEMENT = "ALTER TABLE upgrade_no_such_table ADD COLUMN upgrade_probe TEXT"


@contextmanager
def boot(db_path: str, **wire_kwargs):
    """Start the layer on ``db_path`` (the folder is created, like the Main
    does) and yield the HTTP client. The connection is closed on exit, also
    when wiring raises (e.g. a failing upgrade step)."""
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    try:
        app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
        Backend.wire_workflows(app, db, configs, app_version=APP_VERSION, **wire_kwargs)
        with TestClient(app) as http:
            yield http
    finally:
        db.close()


def version_rows(db_path: str, version_table: str) -> list[int]:
    """The values of the workflow's ``<name>_schema_version`` table."""
    with closing(sqlite3.connect(db_path)) as conn:
        return [row[0] for row in conn.execute(f"SELECT version FROM {version_table}")]


def has_column(db_path: str, table: str, column: str) -> bool:
    with closing(sqlite3.connect(db_path)) as conn:
        return column in [row[1] for row in conn.execute(f"PRAGMA table_info({table})")]


def has_index(db_path: str, index: str) -> bool:
    with closing(sqlite3.connect(db_path)) as conn:
        row = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?", (index,)
        ).fetchone()
    return row is not None


def get_json(http, path: str, **params):
    r = http.get(path, params=params or None)
    assert r.status_code == 200, r.text
    return r.json()
