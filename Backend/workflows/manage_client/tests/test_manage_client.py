"""Workflow tests of manage_client, through its Routers, on a real SQLite file."""

import re
import sqlite3
import threading
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from Backend import LAYER_CONFIG_FILE, create_http_app, load_yaml
from workflows.manage_client.adapters import ClientRepository, StorageVersionError
from workflows.manage_client.routers import create_manage_client_routers
from workflows.manage_client.services import ManageClientService
from workflows.scaffold_backend import adapters as scaffold

SCAFFOLD_SETTINGS = dict(journal_mode="DELETE", synchronous="FULL", foreign_keys=True, busy_timeout_ms=5000)
UUID4 = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
DETAIL_KEYS = {"client_id", "display_name", "contacts", "note", "is_archived", "created_at", "updated_at"}


def client_input(name="Mai", contacts=None, note=None):
    return {
        "display_name": name,
        "contacts": contacts if contacts is not None else [{"channel": "discord", "value": "mai#0001"}],
        "note": note,
    }


@pytest.fixture
def wired(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **SCAFFOLD_SETTINGS)
    repo = ClientRepository(db)
    repo.ensure_storage()
    router, get_client_summary = create_manage_client_routers(ManageClientService(repo))
    app = create_http_app(load_yaml(LAYER_CONFIG_FILE))
    app.include_router(router)
    with TestClient(app) as http:
        yield http, get_client_summary, db, repo
    db.close()


def create(http, **kw):
    r = http.post("/clients", json={"client_input": client_input(**kw)})
    assert r.status_code == 201, r.text
    return r.json()


def assert_error(r, label, code):
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]


# --- create / get ------------------------------------------------------------

def test_create_returns_client_detail(wired):
    http, *_ = wired
    body = create(http, name="Mai", note="prefers pastel")
    assert set(body) == DETAIL_KEYS
    assert UUID4.fullmatch(body["client_id"])
    assert body["contacts"] == [{"channel": "discord", "value": "mai#0001"}]
    assert body["is_archived"] is False
    assert body["note"] == "prefers pastel"
    for key in ("created_at", "updated_at"):
        assert datetime.fromisoformat(body[key]).utcoffset() is not None


def test_get_client(wired):
    http, *_ = wired
    created = create(http)
    r = http.get(f"/clients/{created['client_id']}")
    assert r.status_code == 200
    assert r.json() == created


def test_get_unknown_and_malformed_id_are_404(wired):
    http, *_ = wired
    assert_error(http.get("/clients/0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"), 404, "ERR_NOT_FOUND")
    assert_error(http.get("/clients/not-an-id"), 404, "ERR_NOT_FOUND")
    assert_error(http.get("/clients/0B7F5A3E-1D2C-4E5F-8A9B-0C1D2E3F4A5B"), 404, "ERR_NOT_FOUND")


@pytest.mark.parametrize(
    "payload",
    [
        None,
        [],
        {},
        {"client_input": None},
        {"client_input": client_input(name="")},
        {"client_input": client_input(name="x" * 121)},
        {"client_input": client_input(name=123)},
        {"client_input": {"display_name": "Mai", "contacts": []}},  # note missing
        {"client_input": client_input(contacts="discord")},
        {"client_input": client_input(contacts=[{"channel": "discord"}])},
        {"client_input": client_input(contacts=[{"channel": "a", "value": "b", "x": 1}])},
        {"client_input": client_input(), "extra": 1},
    ],
)
def test_create_rejects_malformed_input_with_400(wired, payload):
    http, *_ = wired
    assert_error(http.post("/clients", json=payload), 400, "ERR_VALIDATION")


def test_create_rejects_non_json_body_with_400(wired):
    http, *_ = wired
    r = http.post("/clients", content=b"{oops", headers={"content-type": "application/json"})
    assert_error(r, 400, "ERR_VALIDATION")


def test_display_name_length_bounds(wired):
    http, *_ = wired
    assert create(http, name="x")["display_name"] == "x"
    assert create(http, name="é" * 120)["display_name"] == "é" * 120


# --- edit ---------------------------------------------------------------------

def test_edit_replaces_fields_keeps_created_at_and_archive_flag(wired):
    http, *_ = wired
    created = create(http)
    cid = created["client_id"]
    http.put(f"/clients/{cid}/archived", json={"is_archived": True})
    new = client_input(name="Mai Anh", contacts=[{"channel": "zalo", "value": "0900"}, {"channel": "email", "value": "m@x.vn"}], note="n")
    r = http.put(f"/clients/{cid}", json={"client_input": new})
    assert r.status_code == 200
    body = r.json()
    assert body["display_name"] == "Mai Anh"
    assert body["contacts"] == new["contacts"]
    assert body["note"] == "n"
    assert body["is_archived"] is True
    assert body["created_at"] == created["created_at"]


def test_edit_errors(wired):
    http, *_ = wired
    cid = create(http)["client_id"]
    assert_error(http.put(f"/clients/{cid}", json={"client_input": client_input(name="")}), 400, "ERR_VALIDATION")
    assert_error(http.put("/clients/bad-id", json={"client_input": client_input()}), 400, "ERR_VALIDATION")
    assert_error(
        http.put("/clients/0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b", json={"client_input": client_input()}),
        404,
        "ERR_NOT_FOUND",
    )


# --- archive ------------------------------------------------------------------

def test_archive_and_unarchive(wired):
    http, *_ = wired
    cid = create(http)["client_id"]
    r = http.put(f"/clients/{cid}/archived", json={"is_archived": True})
    assert r.status_code == 200 and r.json()["is_archived"] is True
    r = http.put(f"/clients/{cid}/archived", json={"is_archived": False})
    assert r.status_code == 200 and r.json()["is_archived"] is False


def test_setting_same_archive_flag_changes_nothing(wired):
    http, *_ = wired
    created = create(http)
    r = http.put(f"/clients/{created['client_id']}/archived", json={"is_archived": False})
    assert r.status_code == 200
    assert r.json() == created


def test_archive_errors(wired):
    http, *_ = wired
    cid = create(http)["client_id"]
    for payload in (None, {}, {"is_archived": "true"}, {"is_archived": 1}, {"is_archived": True, "x": 1}):
        assert_error(http.put(f"/clients/{cid}/archived", json=payload), 400, "ERR_VALIDATION")
    assert_error(http.put("/clients/bad/archived", json={"is_archived": True}), 400, "ERR_VALIDATION")
    assert_error(
        http.put("/clients/0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b/archived", json={"is_archived": True}),
        404,
        "ERR_NOT_FOUND",
    )


# --- list ---------------------------------------------------------------------

def test_list_is_short_form_sorted_by_name(wired):
    http, *_ = wired
    b = create(http, name="binh")
    a = create(http, name="An")
    r = http.get("/clients")
    assert r.status_code == 200
    items = r.json()
    assert [i["client_id"] for i in items] == [a["client_id"], b["client_id"]]
    for item in items:
        assert set(item) == {"client_id", "display_name", "is_archived", "updated_at"}


# --- in_process: get_client_summary ------------------------------------------

def test_get_client_summary(wired):
    http, get_client_summary, *_ = wired
    cid = create(http)["client_id"]
    assert get_client_summary(client_id=cid) == {"client_id": cid, "is_archived": False}
    http.put(f"/clients/{cid}/archived", json={"is_archived": True})
    assert get_client_summary(client_id=cid) == {"client_id": cid, "is_archived": True}


@pytest.mark.parametrize("client_id", ["0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b", "bad", None])
def test_get_client_summary_not_found(wired, client_id):
    _, get_client_summary, *_ = wired
    with pytest.raises(Exception) as info:
        get_client_summary(client_id=client_id)
    assert info.value.label == 404
    assert info.value.error_body["code"] == "ERR_NOT_FOUND"
    assert set(info.value.error_body) == {"code", "message", "details"}


# --- storage ------------------------------------------------------------------

def test_storage_owns_only_its_tables_and_is_idempotent(wired):
    _, _, db, repo = wired
    repo.ensure_storage()  # second run: no error, no change
    with db.read() as conn:
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        version = conn.execute("SELECT version FROM manage_client_schema_version").fetchall()
    assert tables == {"client", "client_contact", "manage_client_schema_version"}
    assert version == [(1,)]


# A database written by builds before backend session #3: same tables, but
# the version kept in client_schema_version. Written here as literal SQL so
# the test does not depend on the code under test.
_LEGACY_LAYOUT = [
    "CREATE TABLE client_schema_version (version INTEGER NOT NULL)",
    """CREATE TABLE client (
        client_id    TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        note         TEXT,
        is_archived  INTEGER NOT NULL,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
    )""",
    """CREATE TABLE client_contact (
        client_id TEXT NOT NULL REFERENCES client (client_id) ON DELETE CASCADE,
        position  INTEGER NOT NULL,
        channel   TEXT NOT NULL,
        value     TEXT NOT NULL,
        PRIMARY KEY (client_id, position)
    )""",
]
_LEGACY_ID = "5f0c1d2e-3a4b-4c5d-9e6f-7a8b9c0d1e2f"


def _make_legacy_database(db_path: str, version: int) -> None:
    scaffold.ensure_database_folder(db_path)
    conn = sqlite3.connect(db_path)
    with conn:
        for statement in _LEGACY_LAYOUT:
            conn.execute(statement)
        conn.execute("INSERT INTO client_schema_version (version) VALUES (?)", (version,))
        conn.execute(
            "INSERT INTO client VALUES (?, ?, ?, ?, ?, ?)",
            (_LEGACY_ID, "Legacy Mai", "old note", 1, "2026-09-20T10:00:00+07:00", "2026-09-21T11:00:00+07:00"),
        )
        conn.executemany(
            "INSERT INTO client_contact VALUES (?, ?, ?, ?)",
            [(_LEGACY_ID, 0, "email", "mai@example.com"), (_LEGACY_ID, 1, "zalo", "0900000000")],
        )
    conn.close()


def _tables(db_path: str) -> set[str]:
    conn = sqlite3.connect(db_path)
    try:
        return {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    finally:
        conn.close()


def test_legacy_version_table_is_renamed_and_data_kept(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    _make_legacy_database(db_path, version=1)

    db = scaffold.open_connection(db_path, **SCAFFOLD_SETTINGS)
    try:
        repo = ClientRepository(db)
        repo.ensure_storage()
        repo.ensure_storage()  # a second start-up changes nothing
        router, get_client_summary = create_manage_client_routers(ManageClientService(repo))
        app = create_http_app(load_yaml(LAYER_CONFIG_FILE))
        app.include_router(router)
        with TestClient(app) as http:
            r = http.get(f"/clients/{_LEGACY_ID}")
            assert r.status_code == 200, r.text
            assert r.json() == {
                "client_id": _LEGACY_ID,
                "display_name": "Legacy Mai",
                "contacts": [{"channel": "email", "value": "mai@example.com"},
                             {"channel": "zalo", "value": "0900000000"}],
                "note": "old note",
                "is_archived": True,
                "created_at": "2026-09-20T10:00:00+07:00",
                "updated_at": "2026-09-21T11:00:00+07:00",
            }
            assert create(http, name="New")["display_name"] == "New"
        with db.read() as conn:
            version = conn.execute("SELECT version FROM manage_client_schema_version").fetchall()
    finally:
        db.close()
    assert version == [(1,)]
    assert _tables(db_path) == {"client", "client_contact", "manage_client_schema_version"}


def test_legacy_rename_is_rolled_back_when_start_up_fails(tmp_path):
    # Old table name holding a version newer than this build: start-up stops,
    # and the rename is undone with the rest of the transaction.
    db_path = str(tmp_path / "data" / "data.db")
    _make_legacy_database(db_path, version=99)
    db = scaffold.open_connection(db_path, **SCAFFOLD_SETTINGS)
    try:
        with pytest.raises(StorageVersionError):
            ClientRepository(db).ensure_storage()
    finally:
        db.close()
    assert _tables(db_path) == {"client", "client_contact", "client_schema_version"}


def test_concurrent_creates_through_shared_connection(wired):
    http, *_ = wired
    errors = []

    def worker(n):
        try:
            for i in range(10):
                r = http.post("/clients", json={"client_input": client_input(name=f"c{n}-{i}")})
                assert r.status_code == 201
        except Exception as exc:  # pragma: no cover - reported below
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(n,)) for n in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
    assert len(http.get("/clients").json()) == 80


# --- 500 ERR_STORAGE_IO: real SQLite failures, no mock -----------------------

@pytest.fixture
def wired_fast_busy(tmp_path):
    # Same wiring as `wired`, with a short busy timeout so a locked database
    # fails fast.
    db_path = str(tmp_path / "data" / "data.db")
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **{**SCAFFOLD_SETTINGS, "busy_timeout_ms": 200})
    repo = ClientRepository(db)
    repo.ensure_storage()
    router, get_client_summary = create_manage_client_routers(ManageClientService(repo))
    app = create_http_app(load_yaml(LAYER_CONFIG_FILE))
    app.include_router(router)
    with TestClient(app) as http:
        yield http, get_client_summary, db, db_path
    db.close()


def test_writes_on_read_only_connection_answer_500(wired_fast_busy):
    http, _, db, _ = wired_fast_busy
    cid = create(http)["client_id"]
    with db.read() as conn:
        conn.execute("PRAGMA query_only = ON")
    try:
        for r in (
            http.post("/clients", json={"client_input": client_input()}),
            http.put(f"/clients/{cid}", json={"client_input": client_input(name="New")}),
            http.put(f"/clients/{cid}/archived", json={"is_archived": True}),
        ):
            assert_error(r, 500, "ERR_STORAGE_IO")
            assert "readonly" in r.json()["details"]["reason"]
    finally:
        with db.read() as conn:
            conn.execute("PRAGMA query_only = OFF")
    # Nothing was written.
    assert http.get(f"/clients/{cid}").json()["display_name"] == "Mai"


def test_reads_on_locked_database_answer_500(wired_fast_busy):
    import sqlite3

    http, get_client_summary, _, db_path = wired_fast_busy
    cid = create(http)["client_id"]
    locker = sqlite3.connect(db_path, isolation_level=None)
    locker.execute("BEGIN EXCLUSIVE")
    try:
        for r in (http.get("/clients"), http.get(f"/clients/{cid}")):
            assert_error(r, 500, "ERR_STORAGE_IO")
            assert r.json()["details"]["reason"] == "database is locked"
        with pytest.raises(Exception) as info:
            get_client_summary(client_id=cid)
        assert info.value.label == 500
        assert info.value.error_body["code"] == "ERR_STORAGE_IO"
        assert set(info.value.error_body) == {"code", "message", "details"}
    finally:
        locker.execute("ROLLBACK")
        locker.close()
    assert http.get(f"/clients/{cid}").status_code == 200


def test_programming_error_is_not_reported_as_storage_error(wired, monkeypatch):
    http, _, _, repo = wired

    def broken(*_a, **_k):
        raise KeyError("bug")

    monkeypatch.setattr(repo, "fetch_all_list_items", broken)
    with pytest.raises(KeyError):
        http.get("/clients")
