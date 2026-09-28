"""Workflow tests of manage_watermark_profile, through its Routers, on a real
SQLite file, wired exactly as the Main wires it (Backend.wire_workflows)."""

import sqlite3

import pytest
from fastapi.testclient import TestClient

import Backend
from workflows.manage_watermark_profile import adapters as profile_adapters
from workflows.manage_watermark_profile.adapters import ProfileRepository, StorageVersionError
from workflows.manage_watermark_profile.services import (
    InvalidStrengthPresetsError,
    ManageWatermarkProfileService,
)
from workflows.scaffold_backend import adapters as scaffold

UNKNOWN_ID = "0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"
RECORD_KEYS = {"profile_id", "display_name", "legal_name", "contact", "ownership_statement", "default_strength"}


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


def profile_input(**over):
    data = {
        "display_name": "Mây Vẽ",
        "legal_name": "Nguyễn Thu Hà",
        "contact": "may.ve@example.com",
        "ownership_statement": "Mọi tác phẩm thuộc quyền sở hữu của Mây Vẽ.",
        "default_strength": "balanced",
    }
    data.update(over)
    return {"profile_input": data}


def assert_error(r, label, code):
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]


def create(http, **over):
    r = http.post("/watermark-profiles", json=profile_input(**over))
    assert r.status_code == 201, r.text
    return r.json()


# --- create / get / edit / list ---------------------------------------------------

def test_create_returns_the_six_keys_and_can_be_read_back(wired):
    http, *_ = wired
    created = create(http)
    assert set(created) == RECORD_KEYS
    assert created["display_name"] == "Mây Vẽ" and created["default_strength"] == "balanced"
    r = http.get(f"/watermark-profiles/{created['profile_id']}")
    assert r.status_code == 200 and r.json() == created


def test_free_fields_may_be_null(wired):
    http, *_ = wired
    created = create(http, legal_name=None, contact=None, ownership_statement=None)
    assert created["legal_name"] is None and created["contact"] is None and created["ownership_statement"] is None


def test_display_name_need_not_be_unique(wired):
    http, *_ = wired
    a = create(http)
    b = create(http)
    assert a["profile_id"] != b["profile_id"]


def test_display_name_length_counts_characters(wired):
    http, *_ = wired
    assert create(http, display_name="ệ" * 80)["display_name"] == "ệ" * 80
    assert_error(http.post("/watermark-profiles", json=profile_input(display_name="ệ" * 81)), 400, "ERR_VALIDATION")


def test_edit_replaces_the_five_fields_and_keeps_the_id(wired):
    http, *_ = wired
    created = create(http)
    new = profile_input(display_name="Mây", legal_name=None, contact="fb.com/may", ownership_statement=None,
                        default_strength="robust")
    r = http.put(f"/watermark-profiles/{created['profile_id']}", json=new)
    assert r.status_code == 200
    assert r.json() == {"profile_id": created["profile_id"], **new["profile_input"]}
    assert http.get(f"/watermark-profiles/{created['profile_id']}").json() == r.json()


def test_list_is_ordered_by_display_name_casefold(wired):
    http, *_ = wired
    assert http.get("/watermark-profiles").json() == []
    names = ["bút chì", "Ánh", "An", "ánh"]
    ids = {create(http, display_name=n)["profile_id"]: n for n in names}
    r = http.get("/watermark-profiles")
    assert r.status_code == 200
    listed = r.json()
    assert all(set(p) == RECORD_KEYS for p in listed)
    expected = sorted(ids, key=lambda pid: (ids[pid].casefold(), pid))
    assert [p["profile_id"] for p in listed] == expected


def test_list_strengths(wired):
    http, *_ = wired
    r = http.get("/watermark-strengths")
    assert r.status_code == 200 and r.json() == ["subtle", "balanced", "robust"]


# --- 400 / 404 ----------------------------------------------------------------------

BAD_INPUTS = [
    ("empty-name", profile_input(display_name="")),
    ("81-chars", profile_input(display_name="x" * 81)),
    ("missing-key", {"profile_input": {k: v for k, v in profile_input()["profile_input"].items()
                                       if k != "contact"}}),
    ("extra-key", profile_input(website="x")),
    ("extra-top-key", {**profile_input(), "extra": 1}),
    ("unknown-strength", profile_input(default_strength="strong")),
    ("null-strength", profile_input(default_strength=None)),
    ("legal-name-number", profile_input(legal_name=123)),
    ("name-number", profile_input(display_name=5)),
    ("not-an-object", {"profile_input": "x"}),
    ("no-body", None),
]


@pytest.mark.parametrize("body", [b for _, b in BAD_INPUTS], ids=[i for i, _ in BAD_INPUTS])
def test_malformed_profile_input_is_400_on_create_and_edit(wired, body):
    http, *_ = wired
    pid = create(http)["profile_id"]
    assert_error(http.post("/watermark-profiles", json=body), 400, "ERR_VALIDATION")
    assert_error(http.put(f"/watermark-profiles/{pid}", json=body), 400, "ERR_VALIDATION")
    assert len(http.get("/watermark-profiles").json()) == 1


def test_malformed_profile_id(wired):
    http, entries, *_ = wired
    assert_error(http.put("/watermark-profiles/not-an-id", json=profile_input()), 400, "ERR_VALIDATION")
    assert_error(http.put(f"/watermark-profiles/{UNKNOWN_ID.upper()}", json=profile_input()), 400, "ERR_VALIDATION")
    assert_error(http.get("/watermark-profiles/not-an-id"), 404, "ERR_NOT_FOUND")
    with pytest.raises(Exception) as info:
        entries["get_watermark_profile"](profile_id="not-an-id")
    assert info.value.label == 404 and info.value.error_body["code"] == "ERR_NOT_FOUND"


def test_unknown_profile_is_404(wired):
    http, *_ = wired
    assert_error(http.get(f"/watermark-profiles/{UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")
    assert_error(http.put(f"/watermark-profiles/{UNKNOWN_ID}", json=profile_input()), 404, "ERR_NOT_FOUND")
    assert http.get("/watermark-profiles").json() == []


# --- in_process ---------------------------------------------------------------------

def test_get_watermark_profile_in_process(wired):
    http, entries, *_ = wired
    created = create(http)
    assert entries["get_watermark_profile"](profile_id=created["profile_id"]) == created
    with pytest.raises(Exception) as info:
        entries["get_watermark_profile"](profile_id=UNKNOWN_ID)
    assert info.value.label == 404
    assert info.value.error_body == {"code": "ERR_NOT_FOUND", "message": "Watermark profile not found.",
                                     "details": {"profile_id": UNKNOWN_ID}}


# --- strength_presets ----------------------------------------------------------------

@pytest.mark.parametrize(
    "presets",
    [[], ["subtle", "robust"], ["subtle", "balanced", "robust", "robust"], ["robust", "balanced", "subtle"],
     ["subtle", "balanced", "robust", "strong"], ["subtle", "balanced", "strong"]],
    ids=["empty", "missing", "duplicate", "order", "extra", "unknown"],
)
def test_strength_presets_must_equal_the_shared_value(wired, presets):
    _, _, db, _ = wired
    with pytest.raises(InvalidStrengthPresetsError):
        ManageWatermarkProfileService(ProfileRepository(db), presets)


def test_wire_workflows_fails_on_wrong_presets(tmp_path):
    db_path = str(tmp_path / "data.db")
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    configs["manage_watermark_profile"] = {"strength_presets": ["subtle", "robust"]}
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    try:
        with pytest.raises(InvalidStrengthPresetsError):
            Backend.wire_workflows(Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE)), db, configs)
    finally:
        db.close()


# --- storage ----------------------------------------------------------------------

def tables(db):
    with db.read() as conn:
        return {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}


def test_owns_its_tables_and_version(wired):
    _, _, db, _ = wired
    assert {"watermark_profile", "manage_watermark_profile_schema_version"} <= tables(db)
    with db.read() as conn:
        assert conn.execute("SELECT version FROM manage_watermark_profile_schema_version").fetchall() == [(1,)]
    ProfileRepository(db).ensure_storage()  # a second start-up changes nothing
    with db.read() as conn:
        assert conn.execute("SELECT version FROM manage_watermark_profile_schema_version").fetchall() == [(1,)]


def test_newer_storage_version_stops_start_up(wired):
    _, _, db, _ = wired
    with db.transaction() as conn:
        conn.execute("UPDATE manage_watermark_profile_schema_version SET version = 99")
    with pytest.raises(StorageVersionError):
        ProfileRepository(db).ensure_storage()


def test_locked_database_answers_500_except_list_strengths(wired):
    http, entries, _, db_path = wired
    pid = create(http)["profile_id"]
    locker = sqlite3.connect(db_path, isolation_level=None)
    locker.execute("BEGIN EXCLUSIVE")
    try:
        for r in (http.post("/watermark-profiles", json=profile_input()),
                  http.get("/watermark-profiles"),
                  http.get(f"/watermark-profiles/{pid}"),
                  http.put(f"/watermark-profiles/{pid}", json=profile_input())):
            assert_error(r, 500, "ERR_STORAGE_IO")
            assert "locked" in r.json()["details"]["reason"]
        with pytest.raises(Exception) as info:
            entries["get_watermark_profile"](profile_id=pid)
        assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
        assert http.get("/watermark-strengths").status_code == 200
    finally:
        locker.execute("ROLLBACK")
        locker.close()
    assert http.get(f"/watermark-profiles/{pid}").status_code == 200


def test_read_only_database_answers_500_on_write_and_writes_nothing(wired):
    http, _, db, _ = wired
    pid = create(http)["profile_id"]
    before = http.get("/watermark-profiles").json()
    with db.read() as conn:
        conn.execute("PRAGMA query_only = ON")
    try:
        for r in (http.post("/watermark-profiles", json=profile_input()),
                  http.put(f"/watermark-profiles/{pid}", json=profile_input(display_name="Khác"))):
            assert_error(r, 500, "ERR_STORAGE_IO")
            assert "readonly" in r.json()["details"]["reason"]
    finally:
        with db.read() as conn:
            conn.execute("PRAGMA query_only = OFF")
    assert http.get("/watermark-profiles").json() == before


def test_programming_error_is_not_reported_as_storage_error(wired, monkeypatch):
    http, *_ = wired

    def broken(*_a, **_k):
        raise KeyError("boom")

    monkeypatch.setattr(profile_adapters.ProfileRepository, "fetch_all", broken)
    with pytest.raises(KeyError):
        http.get("/watermark-profiles")
