"""Workflow tests of update_progress, through its Routers, on a real SQLite
file, wired exactly as the Main wires it (Backend.wire_workflows): the call
to manage_commission is the real in_process get_commission_summary."""

import sqlite3
import threading
import time
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import Backend
from workflows.scaffold_backend import adapters as scaffold

UNKNOWN_ID = "0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"
STATE_KEYS = {"commission_id", "current_stage", "stage_kind", "updated_at"}
ENTRY_KEYS = {"commission_id", "current_stage", "stage_kind"}
HISTORY_KEYS = {"from_stage", "to_stage", "note", "changed_at"}
DEFAULT_CATALOG = [
    {"stage": "queued", "kind": "active"},
    {"stage": "sketch", "kind": "active"},
    {"stage": "lineart", "kind": "active"},
    {"stage": "coloring", "kind": "active"},
    {"stage": "rendering", "kind": "active"},
    {"stage": "final_review", "kind": "active"},
    {"stage": "revision", "kind": "active"},
    {"stage": "completed", "kind": "active"},
    {"stage": "on_hold", "kind": "on_hold"},
    {"stage": "delivered", "kind": "finished"},
    {"stage": "cancelled", "kind": "cancelled"},
]


def _configs():
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    # Short busy timeout so a locked database fails fast in these tests.
    configs["scaffold_backend"] = {**configs["scaffold_backend"], "busy_timeout_ms": 200}
    return configs


@pytest.fixture
def wired(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    configs = _configs()
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
    entries = Backend.wire_workflows(app, db, configs)
    with TestClient(app) as http:
        yield http, entries, db, db_path
    db.close()


def new_commission(http):
    r = http.post("/clients", json={"client_input": {"display_name": "Mai", "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    r = http.post("/commissions", json={"commission_input": {
        "client_id": r.json()["client_id"], "title": "Bust", "description": None, "commission_type": None,
        "agreed_price": {"amount_minor": 1_000_000, "currency": "VND"}, "deadline": None, "reference_links": [],
    }})
    assert r.status_code == 201, r.text
    return r.json()["commission_id"]


def change(http, mid, to_stage, note=None):
    return http.put(f"/commissions/{mid}/stage", json={"stage_change": {"to_stage": to_stage, "note": note}})


def moved(http, mid, to_stage, note=None):
    r = change(http, mid, to_stage, note)
    assert r.status_code == 200, r.text
    return r.json()


def assert_error(r, label, code):
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]


def history(http, mid):
    r = http.get(f"/commissions/{mid}/stage/history")
    assert r.status_code == 200, r.text
    return r.json()


def assert_chain(items):
    assert all(set(i) == HISTORY_KEYS for i in items)
    assert items[0]["from_stage"] is None
    for before, after in zip(items, items[1:]):
        assert after["from_stage"] == before["to_stage"]


# --- a commission with no stage set -----------------------------------------------

def test_new_commission_counts_as_the_first_stage_and_writes_nothing(wired):
    http, *_ = wired
    mid = new_commission(http)
    r = http.get(f"/commissions/{mid}/stage")
    assert r.status_code == 200
    assert r.json() == {"commission_id": mid, "current_stage": "queued", "stage_kind": "active", "updated_at": None}
    assert history(http, mid) == []
    assert http.get("/progress/board").json() == []
    # changing to the current stage is refused, also for the implicit first stage
    r = change(http, mid, "queued")
    assert_error(r, 409, "ERR_INVALID_TRANSITION")
    assert r.json()["details"]["current_stage"] == "queued"
    assert history(http, mid) == [] and http.get("/progress/board").json() == []


# --- stage changes ----------------------------------------------------------------

def test_moves_back_and_forth_until_a_finished_stage(wired):
    http, *_ = wired
    mid = new_commission(http)
    states = [moved(http, mid, s, note) for s, note in (
        ("sketch", "bắt đầu phác thảo"), ("on_hold", None), ("sketch", "khách trả lời"), ("delivered", None))]
    assert all(set(s) == STATE_KEYS for s in states)
    assert [(s["current_stage"], s["stage_kind"]) for s in states] == [
        ("sketch", "active"), ("on_hold", "on_hold"), ("sketch", "active"), ("delivered", "finished")]
    for s in states:
        assert datetime.fromisoformat(s["updated_at"]).utcoffset() is not None
    assert http.get(f"/commissions/{mid}/stage").json() == states[-1]
    for target in ("sketch", "queued", "cancelled", "delivered"):
        assert_error(change(http, mid, target), 409, "ERR_INVALID_TRANSITION")

    items = history(http, mid)
    assert_chain(items)
    assert [(i["from_stage"], i["to_stage"], i["note"]) for i in items] == [
        (None, "sketch", "bắt đầu phác thảo"),
        ("sketch", "on_hold", None),
        ("on_hold", "sketch", "khách trả lời"),
        ("sketch", "delivered", None),
    ]
    assert states[-1]["updated_at"] == items[-1]["changed_at"]


def test_cancelled_is_final_and_backwards_moves_are_allowed(wired):
    http, *_ = wired
    mid = new_commission(http)
    moved(http, mid, "coloring")
    moved(http, mid, "sketch")  # backwards
    assert_error(change(http, mid, "sketch"), 409, "ERR_INVALID_TRANSITION")  # same stage
    moved(http, mid, "cancelled")
    for target in ("queued", "sketch", "delivered", "cancelled"):
        assert_error(change(http, mid, target), 409, "ERR_INVALID_TRANSITION")
    # the first stage may be set explicitly once the commission has moved on
    other = new_commission(http)
    moved(http, other, "on_hold")
    assert moved(http, other, "queued")["current_stage"] == "queued"


def test_board_lists_commissions_that_have_had_a_stage_set(wired):
    http, *_ = wired
    a, b, untouched = new_commission(http), new_commission(http), new_commission(http)
    moved(http, a, "sketch")
    moved(http, a, "delivered")
    moved(http, b, "on_hold")
    r = http.get("/progress/board")
    assert r.status_code == 200
    board = r.json()
    assert all(set(e) == ENTRY_KEYS for e in board)
    assert sorted(board, key=lambda e: e["commission_id"]) == sorted([
        {"commission_id": a, "current_stage": "delivered", "stage_kind": "finished"},
        {"commission_id": b, "current_stage": "on_hold", "stage_kind": "on_hold"},
    ], key=lambda e: e["commission_id"])
    assert untouched not in {e["commission_id"] for e in board}


def test_list_stages_is_the_catalog_in_order(wired):
    http, *_ = wired
    r = http.get("/progress/stages")
    assert r.status_code == 200
    assert r.json() == DEFAULT_CATALOG


# --- errors -------------------------------------------------------------------------

def test_unknown_commission_is_404_on_the_three_endpoints(wired):
    http, *_ = wired
    assert_error(change(http, UNKNOWN_ID, "sketch"), 404, "ERR_NOT_FOUND")
    assert_error(http.get(f"/commissions/{UNKNOWN_ID}/stage"), 404, "ERR_NOT_FOUND")
    assert_error(http.get(f"/commissions/{UNKNOWN_ID}/stage/history"), 404, "ERR_NOT_FOUND")
    assert http.get("/progress/board").json() == []


def test_malformed_id_is_400_on_put_and_404_on_get(wired):
    http, *_ = wired
    for bad in ("not-an-id", UNKNOWN_ID.upper()):
        assert_error(change(http, bad, "sketch"), 400, "ERR_VALIDATION")
        assert_error(http.get(f"/commissions/{bad}/stage"), 404, "ERR_NOT_FOUND")
        assert_error(http.get(f"/commissions/{bad}/stage/history"), 404, "ERR_NOT_FOUND")


@pytest.mark.parametrize(
    "payload",
    [
        None,
        [],
        {},
        {"to_stage": "sketch", "note": None},
        {"stage_change": {"to_stage": "sketch"}},
        {"stage_change": {"note": None}},
        {"stage_change": {"to_stage": "sketch", "note": None, "extra": 1}},
        {"stage_change": {"to_stage": "sketch", "note": None}, "extra": 1},
        {"stage_change": {"to_stage": "painting", "note": None}},
        {"stage_change": {"to_stage": "Sketch", "note": None}},
        {"stage_change": {"to_stage": "", "note": None}},
        {"stage_change": {"to_stage": 3, "note": None}},
        {"stage_change": {"to_stage": None, "note": None}},
        {"stage_change": {"to_stage": "sketch", "note": 5}},
        {"stage_change": "sketch"},
    ],
)
def test_malformed_stage_change_is_400(wired, payload):
    http, *_ = wired
    mid = new_commission(http)
    assert_error(http.put(f"/commissions/{mid}/stage", json=payload), 400, "ERR_VALIDATION")
    assert history(http, mid) == []


def test_non_json_body_is_400(wired):
    http, *_ = wired
    mid = new_commission(http)
    r = http.put(f"/commissions/{mid}/stage", content=b"{oops", headers={"content-type": "application/json"})
    assert_error(r, 400, "ERR_VALIDATION")


# --- concurrency ----------------------------------------------------------------------

def _slow_latest(monkeypatch):
    # Widen the window between reading the current stage and appending, so
    # that a decision made outside the transaction would let calls overlap.
    from workflows.update_progress import adapters

    original = adapters.ProgressWriteScope.latest

    def slow(self, commission_id):
        found = original(self, commission_id)
        time.sleep(0.2)
        return found

    monkeypatch.setattr(adapters.ProgressWriteScope, "latest", slow)


def _run_together(calls):
    start = threading.Barrier(len(calls))
    results = [None] * len(calls)

    def worker(i, fn):
        start.wait()
        results[i] = fn()

    threads = [threading.Thread(target=worker, args=(i, fn)) for i, fn in enumerate(calls)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


def test_concurrent_changes_keep_the_history_chain_unbroken(wired, monkeypatch):
    http, *_ = wired
    mid = new_commission(http)
    _slow_latest(monkeypatch)
    targets = ["sketch", "lineart", "coloring", "rendering"]
    results = _run_together([lambda t=t: change(http, mid, t) for t in targets])
    assert [r.status_code for r in results] == [200] * 4
    items = history(http, mid)
    assert len(items) == 4 and sorted(i["to_stage"] for i in items) == sorted(targets)
    assert_chain(items)
    assert http.get(f"/commissions/{mid}/stage").json()["current_stage"] == items[-1]["to_stage"]


def test_concurrent_changes_to_the_same_stage_only_one_succeeds(wired, monkeypatch):
    http, *_ = wired
    mid = new_commission(http)
    _slow_latest(monkeypatch)
    results = _run_together([lambda: change(http, mid, "sketch") for _ in range(4)])
    assert sorted(r.status_code for r in results) == [200, 409, 409, 409]
    assert [(i["from_stage"], i["to_stage"]) for i in history(http, mid)] == [(None, "sketch")]


def test_concurrent_change_and_cancel_are_judged_one_after_the_other(wired, monkeypatch):
    http, *_ = wired
    mid = new_commission(http)
    moved(http, mid, "sketch")
    _slow_latest(monkeypatch)
    results = _run_together([lambda: change(http, mid, "cancelled"), lambda: change(http, mid, "lineart")])
    codes = [r.status_code for r in results]
    items = history(http, mid)
    assert_chain(items)
    if codes == [200, 409]:  # cancelled first: nothing may follow it
        assert [i["to_stage"] for i in items] == ["sketch", "cancelled"]
    else:  # lineart first, then cancelled from lineart
        assert codes == [200, 200]
        assert [(i["from_stage"], i["to_stage"]) for i in items[1:]] == [("sketch", "lineart"), ("lineart", "cancelled")]


# --- in_process: list_progress_board ----------------------------------------------------

def test_list_progress_board_returns_plain_entries(wired):
    http, entries, *_ = wired
    mid = new_commission(http)
    new_commission(http)
    moved(http, mid, "rendering")
    board = entries["list_progress_board"]()
    assert board == [{"commission_id": mid, "current_stage": "rendering", "stage_kind": "active"}]


# --- stage_catalog -------------------------------------------------------------------------

def test_stored_kind_decides_when_the_catalog_changes(tmp_path):
    db_path = str(tmp_path / "data.db")
    configs = _configs()
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    try:
        app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
        Backend.wire_workflows(app, db, configs)
        with TestClient(app) as http:
            mid = new_commission(http)
            moved(http, mid, "delivered")
        # A later build without 'delivered' in its catalog.
        configs["update_progress"] = {"stage_catalog": [e for e in DEFAULT_CATALOG if e["stage"] != "delivered"]}
        app2 = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
        Backend.wire_workflows(app2, db, configs)
        with TestClient(app2) as http:
            state = http.get(f"/commissions/{mid}/stage").json()
            assert (state["current_stage"], state["stage_kind"]) == ("delivered", "finished")
            assert_error(change(http, mid, "sketch"), 409, "ERR_INVALID_TRANSITION")
            assert_error(change(http, mid, "delivered"), 400, "ERR_VALIDATION")
    finally:
        db.close()


@pytest.mark.parametrize(
    "catalog",
    [
        [],
        [{"stage": "on_hold", "kind": "on_hold"}, {"stage": "queued", "kind": "active"}],
        [{"stage": "queued", "kind": "active"}, {"stage": "queued", "kind": "finished"}],
        [{"stage": "queued", "kind": "active"}, {"stage": "done", "kind": "complete"}],
        [{"stage": "", "kind": "active"}],
    ],
    ids=["empty", "first-not-active", "duplicate", "unknown-kind", "empty-name"],
)
def test_unusable_catalog_stops_wiring(tmp_path, catalog):
    from workflows.update_progress.services import InvalidStageCatalogError

    configs = _configs()
    configs["update_progress"] = {"stage_catalog": catalog}
    db = scaffold.open_connection(str(tmp_path / "data.db"), **configs["scaffold_backend"])
    try:
        with pytest.raises(InvalidStageCatalogError):
            Backend.wire_workflows(Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE)), db, configs)
    finally:
        db.close()


# --- storage ------------------------------------------------------------------------------

def test_storage_owns_only_its_tables_and_is_idempotent(wired):
    _, _, db, _ = wired
    from workflows.update_progress.adapters import ProgressRepository

    ProgressRepository(db).ensure_storage()  # second run: no error, no change
    with db.read() as conn:
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        version = conn.execute("SELECT version FROM update_progress_schema_version").fetchall()
        fks = conn.execute("SELECT * FROM pragma_foreign_key_list('stage_change')").fetchall()
        columns = [r[1] for r in conn.execute("PRAGMA table_info('stage_change')")]
    assert {"stage_change", "update_progress_schema_version"} <= tables
    assert version == [(1,)]
    assert fks == []
    # nothing about the commission except its id
    assert columns == ["commission_id", "position", "from_stage", "to_stage", "to_kind", "note", "changed_at"]


def test_newer_storage_version_stops_start_up(wired):
    _, _, db, _ = wired
    from workflows.update_progress.adapters import ProgressRepository, StorageVersionError

    with db.transaction() as conn:
        conn.execute("UPDATE update_progress_schema_version SET version = 99")
    with pytest.raises(StorageVersionError):
        ProgressRepository(db).ensure_storage()


# --- 500 ERR_STORAGE_IO: real SQLite failures, no mock -----------------------------------

def test_locked_database_answers_500_everywhere_but_list_stages(wired):
    http, entries, _, db_path = wired
    mid = new_commission(http)
    moved(http, mid, "sketch")
    locker = sqlite3.connect(db_path, isolation_level=None)
    locker.execute("BEGIN EXCLUSIVE")
    try:
        for method, url, kw in (
            ("PUT", f"/commissions/{mid}/stage", {"json": {"stage_change": {"to_stage": "lineart", "note": None}}}),
            ("GET", f"/commissions/{mid}/stage", {}),
            ("GET", f"/commissions/{mid}/stage/history", {}),
            ("GET", "/progress/board", {}),
        ):
            assert_error(http.request(method, url, **kw), 500, "ERR_STORAGE_IO")
        assert http.get("/progress/stages").status_code == 200
        with pytest.raises(Exception) as info:
            entries["list_progress_board"]()
        assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
    finally:
        locker.execute("ROLLBACK")
        locker.close()
    assert http.get(f"/commissions/{mid}/stage").json()["current_stage"] == "sketch"


def test_write_on_read_only_connection_answers_500_and_writes_nothing(wired):
    http, _, db, _ = wired
    mid = new_commission(http)
    moved(http, mid, "sketch")
    with db.read() as conn:
        conn.execute("PRAGMA query_only = ON")
    try:
        r = change(http, mid, "lineart")
        assert_error(r, 500, "ERR_STORAGE_IO")
        assert "readonly" in r.json()["details"]["reason"]
    finally:
        with db.read() as conn:
            conn.execute("PRAGMA query_only = OFF")
    assert [i["to_stage"] for i in history(http, mid)] == ["sketch"]


def test_programming_error_is_not_reported_as_storage_error(wired, monkeypatch):
    http, *_ = wired
    mid = new_commission(http)
    moved(http, mid, "sketch")
    from workflows.update_progress import adapters

    def broken(row):
        raise KeyError("boom")

    monkeypatch.setattr(adapters, "_to_record", broken)
    with pytest.raises(KeyError):
        http.get(f"/commissions/{mid}/stage/history")
