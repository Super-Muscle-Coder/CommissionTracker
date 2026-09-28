"""Workflow tests of manage_commission, through its Routers, on a real SQLite
file, wired exactly as the Main wires it (Backend.wire_workflows): the call
to manage_client is the real in_process get_client_summary."""

import sqlite3
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import Backend
from workflows.scaffold_backend import adapters as scaffold

UNKNOWN_ID = "0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"
DETAIL_KEYS = {
    "commission_id", "client_id", "title", "description", "commission_type",
    "agreed_price", "deadline", "reference_links", "created_at", "updated_at",
}
LIST_KEYS = {"commission_id", "client_id", "title", "agreed_price", "deadline", "updated_at"}
SUMMARY_KEYS = {"commission_id", "title", "agreed_price", "deadline"}


@pytest.fixture
def wired(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    # Short busy timeout so a locked database fails fast in these tests.
    configs["scaffold_backend"] = {**configs["scaffold_backend"], "busy_timeout_ms": 200}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
    entries = Backend.wire_workflows(app, db, configs)
    with TestClient(app) as http:
        yield http, entries, db, db_path
    db.close()


def new_client(http, name="Mai"):
    r = http.post("/clients", json={"client_input": {"display_name": name, "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    return r.json()["client_id"]


def commission_input(client_id, **over):
    data = {
        "client_id": client_id,
        "title": "Bust portrait",
        "description": "Pastel palette",
        "commission_type": "bust",
        "agreed_price": {"amount_minor": 1500000, "currency": "VND"},
        "deadline": "2026-10-15",
        "reference_links": ["https://example.com/ref1"],
    }
    data.update(over)
    return data


def create(http, client_id, **over):
    r = http.post("/commissions", json={"commission_input": commission_input(client_id, **over)})
    assert r.status_code == 201, r.text
    return r.json()


def assert_error(r, label, code):
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]


# --- create -------------------------------------------------------------------

def test_create_returns_commission_detail(wired):
    http, *_ = wired
    cid = new_client(http)
    body = create(http, cid)
    assert set(body) == DETAIL_KEYS
    assert body["client_id"] == cid
    assert body["agreed_price"] == {"amount_minor": 1500000, "currency": "VND"}
    assert body["deadline"] == "2026-10-15"
    assert body["reference_links"] == ["https://example.com/ref1"]
    for key in ("created_at", "updated_at"):
        assert datetime.fromisoformat(body[key]).utcoffset() is not None


def test_create_with_nulls_and_zero_price(wired):
    http, *_ = wired
    cid = new_client(http)
    body = create(http, cid, description=None, commission_type=None, deadline=None, reference_links=[],
                  agreed_price={"amount_minor": 0, "currency": "USD"})
    assert body["description"] is None and body["commission_type"] is None
    assert body["deadline"] is None and body["reference_links"] == []
    assert body["agreed_price"] == {"amount_minor": 0, "currency": "USD"}


def test_create_for_unknown_client_is_404(wired):
    http, *_ = wired
    r = http.post("/commissions", json={"commission_input": commission_input(UNKNOWN_ID)})
    assert_error(r, 404, "ERR_NOT_FOUND")
    assert http.get("/commissions").json() == []


def test_create_for_archived_client_is_409(wired):
    http, *_ = wired
    cid = new_client(http)
    http.put(f"/clients/{cid}/archived", json={"is_archived": True})
    r = http.post("/commissions", json={"commission_input": commission_input(cid)})
    assert_error(r, 409, "ERR_CONFLICT")
    assert http.get("/commissions").json() == []


_SEVEN_KEYS = ["client_id", "title", "description", "commission_type", "agreed_price", "deadline", "reference_links"]


def _without(key):
    data = commission_input(UNKNOWN_ID)
    del data[key]
    return {"commission_input": data}


@pytest.mark.parametrize(
    "payload",
    [
        None,
        [],
        {},
        {"commission_input": None},
        *[_without(k) for k in _SEVEN_KEYS],
        {"commission_input": commission_input(UNKNOWN_ID), "extra": 1},
        {"commission_input": {**commission_input(UNKNOWN_ID), "extra": 1}},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": 1, "currency": "VND", "x": 1})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": 1})},
        {"commission_input": commission_input("not-an-id")},
        {"commission_input": commission_input(UNKNOWN_ID.upper())},
        {"commission_input": commission_input(UNKNOWN_ID, title="")},
        {"commission_input": commission_input(UNKNOWN_ID, title="x" * 201)},
        {"commission_input": commission_input(UNKNOWN_ID, title=5)},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": -1, "currency": "VND"})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": 1.5, "currency": "VND"})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": "100", "currency": "VND"})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": True, "currency": "VND"})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": 2**53, "currency": "VND"})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": 2**63, "currency": "VND"})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": 1, "currency": "EUR"})},
        {"commission_input": commission_input(UNKNOWN_ID, agreed_price={"amount_minor": 1, "currency": "vnd"})},
        {"commission_input": commission_input(UNKNOWN_ID, deadline="2026-02-30")},
        {"commission_input": commission_input(UNKNOWN_ID, deadline="20261015")},
        {"commission_input": commission_input(UNKNOWN_ID, deadline="2026-10-15T00:00:00")},
        {"commission_input": commission_input(UNKNOWN_ID, reference_links="https://x")},
        {"commission_input": commission_input(UNKNOWN_ID, reference_links=[1])},
        {"commission_input": commission_input(UNKNOWN_ID, description=3)},
    ],
)
def test_create_rejects_malformed_input_with_400(wired, payload):
    http, *_ = wired
    assert_error(http.post("/commissions", json=payload), 400, "ERR_VALIDATION")


def test_largest_amount_is_accepted(wired):
    # clause_a_common: integers at the boundary stop at 2^53-1.
    http, *_ = wired
    cid = new_client(http)
    body = create(http, cid, agreed_price={"amount_minor": 2**53 - 1, "currency": "USD"})
    assert http.get(f"/commissions/{body['commission_id']}").json()["agreed_price"]["amount_minor"] == 2**53 - 1
    r = http.put(f"/commissions/{body['commission_id']}",
                 json={"commission_input": commission_input(cid, agreed_price={"amount_minor": 2**53, "currency": "USD"})})
    assert_error(r, 400, "ERR_VALIDATION")


# --- get / list / currencies ---------------------------------------------------

def test_get_commission(wired):
    http, *_ = wired
    created = create(http, new_client(http))
    r = http.get(f"/commissions/{created['commission_id']}")
    assert r.status_code == 200 and r.json() == created


def test_get_unknown_and_malformed_id_are_404(wired):
    http, *_ = wired
    assert_error(http.get(f"/commissions/{UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")
    assert_error(http.get("/commissions/not-an-id"), 404, "ERR_NOT_FOUND")


def test_list_commissions_short_form_most_recent_first(wired):
    http, *_ = wired
    cid = new_client(http)
    a = create(http, cid, title="A")
    b = create(http, cid, title="B")
    # Editing A makes it the most recently changed (updated_at has 1 s resolution).
    import time
    time.sleep(1.1)
    http.put(f"/commissions/{a['commission_id']}", json={"commission_input": commission_input(cid, title="A2")})
    items = http.get("/commissions").json()
    assert [i["commission_id"] for i in items] == [a["commission_id"], b["commission_id"]]
    assert all(set(i) == LIST_KEYS for i in items)


def test_list_currencies(wired):
    http, *_ = wired
    r = http.get("/currencies")
    assert r.status_code == 200 and r.json() == ["VND", "USD"]


# --- edit -----------------------------------------------------------------------

def test_edit_amount_keeps_created_at(wired):
    http, *_ = wired
    cid = new_client(http)
    created = create(http, cid)
    r = http.put(f"/commissions/{created['commission_id']}", json={"commission_input": commission_input(
        cid, agreed_price={"amount_minor": 1800000, "currency": "VND"}, deadline=None, reference_links=[])})
    assert r.status_code == 200
    body = r.json()
    assert body["agreed_price"] == {"amount_minor": 1800000, "currency": "VND"}
    assert body["deadline"] is None and body["reference_links"] == []
    assert body["created_at"] == created["created_at"]


def test_edit_currency_change_is_409(wired):
    http, *_ = wired
    cid = new_client(http)
    created = create(http, cid)
    r = http.put(f"/commissions/{created['commission_id']}", json={"commission_input": commission_input(
        cid, agreed_price={"amount_minor": 60, "currency": "USD"})})
    assert_error(r, 409, "ERR_CONFLICT")
    assert http.get(f"/commissions/{created['commission_id']}").json() == created


def test_edit_moving_to_unknown_or_archived_client(wired):
    http, *_ = wired
    cid = new_client(http, "A")
    other = new_client(http, "B")
    http.put(f"/clients/{other}/archived", json={"is_archived": True})
    created = create(http, cid)
    mid = created["commission_id"]
    assert_error(http.put(f"/commissions/{mid}", json={"commission_input": commission_input(UNKNOWN_ID)}),
                 404, "ERR_NOT_FOUND")
    assert_error(http.put(f"/commissions/{mid}", json={"commission_input": commission_input(other)}),
                 409, "ERR_CONFLICT")
    assert http.get(f"/commissions/{mid}").json() == created


def test_edit_moving_to_active_client(wired):
    http, *_ = wired
    cid = new_client(http, "A")
    other = new_client(http, "B")
    mid = create(http, cid)["commission_id"]
    r = http.put(f"/commissions/{mid}", json={"commission_input": commission_input(other)})
    assert r.status_code == 200 and r.json()["client_id"] == other


def test_edit_commission_of_client_archived_later_is_allowed(wired):
    http, *_ = wired
    cid = new_client(http)
    mid = create(http, cid)["commission_id"]
    http.put(f"/clients/{cid}/archived", json={"is_archived": True})
    r = http.put(f"/commissions/{mid}", json={"commission_input": commission_input(cid, title="Renamed")})
    assert r.status_code == 200 and r.json()["title"] == "Renamed"


def test_edit_errors(wired):
    http, *_ = wired
    cid = new_client(http)
    mid = create(http, cid)["commission_id"]
    assert_error(http.put("/commissions/bad", json={"commission_input": commission_input(cid)}),
                 400, "ERR_VALIDATION")
    assert_error(http.put(f"/commissions/{mid}", json={"commission_input": commission_input(cid, title="")}),
                 400, "ERR_VALIDATION")
    assert_error(http.put(f"/commissions/{UNKNOWN_ID}", json={"commission_input": commission_input(cid)}),
                 404, "ERR_NOT_FOUND")


# --- in_process -------------------------------------------------------------------

def test_get_commission_summary(wired):
    http, entries, *_ = wired
    created = create(http, new_client(http))
    summary = entries["get_commission_summary"](commission_id=created["commission_id"])
    assert summary == {
        "commission_id": created["commission_id"],
        "title": created["title"],
        "agreed_price": created["agreed_price"],
        "deadline": created["deadline"],
    }


@pytest.mark.parametrize("commission_id", [UNKNOWN_ID, "bad", None])
def test_get_commission_summary_not_found(wired, commission_id):
    _, entries, *_ = wired
    with pytest.raises(Exception) as info:
        entries["get_commission_summary"](commission_id=commission_id)
    assert info.value.label == 404
    assert info.value.error_body["code"] == "ERR_NOT_FOUND"
    assert set(info.value.error_body) == {"code", "message", "details"}


def test_list_commission_index_includes_archived_clients(wired):
    http, entries, *_ = wired
    cid = new_client(http)
    a = create(http, cid)
    b = create(http, new_client(http, "B"), deadline=None)
    http.put(f"/clients/{cid}/archived", json={"is_archived": True})
    index = entries["list_commission_index"]()
    assert {i["commission_id"] for i in index} == {a["commission_id"], b["commission_id"]}
    assert all(set(i) == SUMMARY_KEYS for i in index)


# --- storage ----------------------------------------------------------------------

def test_storage_owns_its_tables_without_foreign_keys(wired):
    _, _, db, _ = wired
    with db.read() as conn:
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        fks = conn.execute("PRAGMA foreign_key_list(commission)").fetchall()
        version = conn.execute("SELECT version FROM manage_commission_schema_version").fetchall()
    assert {"commission", "manage_commission_schema_version"} <= tables
    assert fks == []
    assert version == [(1,)]


def test_newer_storage_version_stops_wiring(wired):
    from workflows.manage_commission.adapters import CommissionRepository, StorageVersionError

    _, _, db, _ = wired
    with db.transaction() as conn:
        conn.execute("UPDATE manage_commission_schema_version SET version = 99")
    with pytest.raises(StorageVersionError):
        CommissionRepository(db).ensure_storage()


# --- 500 ERR_STORAGE_IO: real SQLite failures, no mock ----------------------------

def test_writes_on_read_only_connection_answer_500(wired):
    http, _, db, _ = wired
    cid = new_client(http)
    created = create(http, cid)
    with db.read() as conn:
        conn.execute("PRAGMA query_only = ON")
    try:
        for r in (
            http.post("/commissions", json={"commission_input": commission_input(cid)}),
            http.put(f"/commissions/{created['commission_id']}",
                     json={"commission_input": commission_input(cid, title="New")}),
        ):
            assert_error(r, 500, "ERR_STORAGE_IO")
            assert "readonly" in r.json()["details"]["reason"]
    finally:
        with db.read() as conn:
            conn.execute("PRAGMA query_only = OFF")
    assert http.get(f"/commissions/{created['commission_id']}").json() == created


def test_locked_database_answers_500_everywhere_except_currencies(wired):
    http, entries, _, db_path = wired
    cid = new_client(http)
    mid = create(http, cid)["commission_id"]
    locker = sqlite3.connect(db_path, isolation_level=None)
    locker.execute("BEGIN EXCLUSIVE")
    try:
        # create: manage_client's get_client_summary answers 500 first.
        for r in (
            http.post("/commissions", json={"commission_input": commission_input(cid)}),
            http.get("/commissions"),
            http.get(f"/commissions/{mid}"),
            http.put(f"/commissions/{mid}", json={"commission_input": commission_input(cid)}),
        ):
            assert_error(r, 500, "ERR_STORAGE_IO")
        for call in (lambda: entries["get_commission_summary"](commission_id=mid),
                     lambda: entries["list_commission_index"]()):
            with pytest.raises(Exception) as info:
                call()
            assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
        assert http.get("/currencies").status_code == 200
    finally:
        locker.execute("ROLLBACK")
        locker.close()
    assert http.get(f"/commissions/{mid}").status_code == 200


def test_programming_error_is_not_reported_as_storage_error(wired, monkeypatch):
    from workflows.manage_commission.adapters import CommissionRepository

    http, *_ = wired

    def broken(*_a, **_k):
        raise KeyError("bug")

    monkeypatch.setattr(CommissionRepository, "fetch_all_list_items", broken)
    with pytest.raises(KeyError):
        http.get("/commissions")
