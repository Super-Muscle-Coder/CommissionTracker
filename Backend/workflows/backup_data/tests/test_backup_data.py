"""Workflow tests of backup_data, through its Routers, on real SQLite files,
wired exactly as the Main wires it (Backend.wire_workflows). Every file is in
a temporary folder; the user's real data folder is never touched.

Clients and commissions are created through the other workflows' own http
endpoints. The only thing handed over differently is the clock (a fixed
moment, so file names can be predicted and a name collision reached): the
Services, Adapters and storage are the real ones.

The round trip (backup, prepare a restore, run a second backend on the
staging file) and the "made by a newer build" case run real Backend.py
processes, launched the way the desktop Main launches them.
"""

import hashlib
import json
import os
import re
import sqlite3
import threading
import zipfile
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

import Backend
from tests.test_backend_process import BackendProcess, free_port, launch_env
from workflows.backup_data import adapters as backup_adapters
from workflows.backup_data.services import compare_semver, parse_semver
from workflows.scaffold_backend import adapters as scaffold

TZ = timezone(timedelta(hours=7))
NOW = "2026-10-07T10:15:30+07:00"
ARCHIVE_KEYS = {"archive_path", "app_version", "size_bytes", "sha256", "created_at"}
STAGING_KEYS = {
    "archive_path", "is_valid", "is_compatible", "app_version", "created_at", "reason", "staged_db_path",
}
FORMAT = "commission-tracker-backup"


class FakeClock:
    def __init__(self, now: str) -> None:
        self.current = datetime.fromisoformat(now)

    def now(self) -> datetime:
        return self.current


@dataclass
class Env:
    http: TestClient
    db: object
    db_path: str
    dest: Path
    clock: FakeClock
    tmp: Path

    @property
    def staging_dir(self) -> Path:
        return Path(self.db_path).parent / "restore-staging"

    def staging_files(self) -> list[str]:
        return sorted(p.name for p in self.staging_dir.iterdir()) if self.staging_dir.exists() else []


def build(tmp_path: Path, app_version: str | None, name: str = "data"):
    db_path = str(tmp_path / name / "data.db")
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    configs["scaffold_backend"] = {**configs["scaffold_backend"], "busy_timeout_ms": 200}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    clock = FakeClock(NOW)
    app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
    Backend.wire_workflows(app, db, configs, app_version=app_version, backup_clock=clock)
    return app, db, db_path, clock


@pytest.fixture
def env(tmp_path):
    app, db, db_path, clock = build(tmp_path, "1.2.0")
    dest = tmp_path / "backups"
    dest.mkdir()
    with TestClient(app) as http:
        yield Env(http, db, db_path, dest, clock, tmp_path)
    db.close()


# --- helpers ------------------------------------------------------------------

def sha256_of(path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def new_client_and_commission(http, title="Bust"):
    r = http.post("/clients", json={"client_input": {"display_name": "Mai", "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    client_id = r.json()["client_id"]
    r = http.post("/commissions", json={"commission_input": {
        "client_id": client_id, "title": title, "description": None, "commission_type": None,
        "agreed_price": {"amount_minor": 100, "currency": "VND"}, "deadline": None, "reference_links": [],
    }})
    assert r.status_code == 201, r.text
    return client_id, r.json()["commission_id"]


def backup(env: Env, purpose="manual", dest=None):
    r = env.http.post("/backups", json={"backup_request": {"destination_dir": str(dest or env.dest), "purpose": purpose}})
    return r


def prepare(env: Env, archive_path):
    return env.http.post("/backups/restore-preparations", json={"archive_path": str(archive_path)})


def assert_error(r, label: int, code: str) -> dict:
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    return body


def small_database_bytes(folder: Path, rows: int = 5) -> bytes:
    path = folder / "small.db"
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)")
    conn.executemany("INSERT INTO t (v) VALUES (?)", [("row %d" % i * 40,) for i in range(rows * 100)])
    conn.commit()
    conn.close()
    data = path.read_bytes()
    path.unlink()
    return data


def manifest_for(db_bytes: bytes, **override) -> dict:
    manifest = {
        "format": FORMAT, "format_version": 1, "app_version": "1.0.0",
        "created_at": "2026-10-01T09:00:00+07:00", "purpose": "manual",
        "db_size_bytes": len(db_bytes), "db_sha256": hashlib.sha256(db_bytes).hexdigest(),
    }
    manifest.update(override)
    return manifest


def write_archive(path: Path, components: dict[str, bytes]) -> Path:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for name, data in components.items():
            z.writestr(name, data)
    return path


def craft(folder: Path, name="crafted.ctbackup", db_bytes=None, **manifest_override) -> Path:
    db_bytes = db_bytes if db_bytes is not None else small_database_bytes(folder)
    manifest = manifest_for(db_bytes, **manifest_override)
    return write_archive(folder / name, {"manifest.json": json.dumps(manifest).encode(), "data.db": db_bytes})


def assert_not_valid(r, reason_part: str):
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == STAGING_KEYS
    assert body["is_valid"] is False and body["is_compatible"] is False, body
    assert body["staged_db_path"] is None
    assert reason_part in body["reason"], body["reason"]
    return body


def assert_valid(r):
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == STAGING_KEYS
    assert body["is_valid"] is True and body["is_compatible"] is True, body
    assert body["reason"] is None
    assert body["staged_db_path"] is not None and os.path.isabs(body["staged_db_path"])
    return body


# --- create_backup -----------------------------------------------------------------

def test_create_backup_writes_a_verifiable_archive_of_the_whole_database(env):
    client_id, commission_id = new_client_and_commission(env.http)
    live_before = sha256_of(env.db_path)

    r = backup(env)

    assert r.status_code == 201, r.text
    record = r.json()
    assert set(record) == ARCHIVE_KEYS
    path = Path(record["archive_path"])
    assert path.is_absolute() and path.is_file() and path.parent == env.dest
    assert re.fullmatch(r"commission-tracker-manual-20261007-101530\.ctbackup", path.name), path.name
    assert record["app_version"] == "1.2.0"
    assert record["created_at"] == NOW
    # size and sha256 describe the archive file, not the database inside it
    assert record["size_bytes"] == path.stat().st_size
    assert record["sha256"] == sha256_of(path) and re.fullmatch(r"[0-9a-f]{64}", record["sha256"])
    assert [p.name for p in env.dest.iterdir()] == [path.name], "no in-progress file may remain"
    assert sha256_of(env.db_path) == live_before, "taking a backup must not change the live database"

    with zipfile.ZipFile(path) as z:
        assert z.namelist() == ["manifest.json", "data.db"]
        manifest = json.loads(z.read("manifest.json"))
        database = z.read("data.db")
    assert manifest == {
        "format": FORMAT, "format_version": 1, "app_version": "1.2.0", "created_at": NOW, "purpose": "manual",
        "db_size_bytes": len(database), "db_sha256": hashlib.sha256(database).hexdigest(),
    }
    restored = env.tmp / "inside.db"
    restored.write_bytes(database)
    conn = sqlite3.connect(restored)
    try:
        assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        # the test (not the workflow) looks at what the snapshot holds
        assert conn.execute("SELECT count(*) FROM client").fetchone()[0] == 1
        assert conn.execute("SELECT count(*) FROM commission").fetchone()[0] == 1
    finally:
        conn.close()
    assert client_id and commission_id


def test_two_backups_in_the_same_second_never_overwrite(env):
    first = backup(env).json()
    first_sha = sha256_of(first["archive_path"])
    second = backup(env).json()
    third = backup(env).json()

    names = [Path(x["archive_path"]).name for x in (first, second, third)]
    assert names == [
        "commission-tracker-manual-20261007-101530.ctbackup",
        "commission-tracker-manual-20261007-101530-2.ctbackup",
        "commission-tracker-manual-20261007-101530-3.ctbackup",
    ]
    assert sha256_of(first["archive_path"]) == first_sha, "the first archive was replaced"
    assert sorted(p.name for p in env.dest.iterdir()) == sorted(names)


def test_an_existing_file_with_the_name_is_never_replaced(env):
    taken = env.dest / "commission-tracker-manual-20261007-101530.ctbackup"
    taken.write_bytes(b"somebody else's file")

    record = backup(env).json()

    assert Path(record["archive_path"]).name == "commission-tracker-manual-20261007-101530-2.ctbackup"
    assert taken.read_bytes() == b"somebody else's file"


def test_pre_restore_purpose_is_in_the_name_and_the_manifest(env):
    record = backup(env, purpose="pre_restore").json()

    path = Path(record["archive_path"])
    assert path.name == "commission-tracker-pre_restore-20261007-101530.ctbackup"
    with zipfile.ZipFile(path) as z:
        assert json.loads(z.read("manifest.json"))["purpose"] == "pre_restore"


@pytest.mark.parametrize("make_body", [
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": "relative/dir", "purpose": "manual"}}, id="relative"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": str(tmp / "nope"), "purpose": "manual"}}, id="missing"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": str(tmp / "a_file.txt"), "purpose": "manual"}}, id="is_a_file"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": str(d), "purpose": "daily"}}, id="unknown_purpose"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": str(d), "purpose": "manual", "extra": 1}}, id="extra_nested"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": str(d), "purpose": "manual"}, "extra": 1}, id="extra_top"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": str(d)}}, id="no_purpose"),
    pytest.param(lambda d, tmp: {"backup_request": {"purpose": "manual"}}, id="no_destination"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": 5, "purpose": "manual"}}, id="destination_not_string"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": "", "purpose": "manual"}}, id="empty_destination"),
    pytest.param(lambda d, tmp: {"backup_request": {"destination_dir": str(d), "purpose": None}}, id="purpose_null"),
    pytest.param(lambda d, tmp: {"backup_request": "x"}, id="request_not_object"),
    pytest.param(lambda d, tmp: {}, id="empty_body"),
    pytest.param(lambda d, tmp: [], id="body_is_list"),
])
def test_invalid_backup_request_is_400_and_creates_no_file(env, make_body):
    (env.tmp / "a_file.txt").write_text("x")
    before = sorted(p.name for p in env.tmp.iterdir()) + sorted(p.name for p in env.dest.iterdir())

    r = env.http.post("/backups", json=make_body(env.dest, env.tmp))

    assert_error(r, 400, "ERR_VALIDATION")
    after = sorted(p.name for p in env.tmp.iterdir()) + sorted(p.name for p in env.dest.iterdir())
    assert after == before, "a rejected request must create nothing"


def test_destination_problem_names_the_field(env):
    r = env.http.post("/backups", json={"backup_request": {"destination_dir": str(env.tmp / "nope"), "purpose": "manual"}})

    body = assert_error(r, 400, "ERR_VALIDATION")
    assert body["details"]["errors"][0]["loc"] == ["backup_request", "destination_dir"]


def test_body_that_is_not_json_is_400(env):
    r = env.http.post("/backups", content=b"{not json", headers={"content-type": "application/json"})
    assert_error(r, 400, "ERR_VALIDATION")
    r = env.http.post("/backups")
    assert_error(r, 400, "ERR_VALIDATION")


def test_failure_while_writing_the_zip_is_500_and_leaves_no_file(env, monkeypatch):
    def broken(self, *args, **kwargs):
        raise OSError(28, "No space left on device")

    monkeypatch.setattr(zipfile.ZipFile, "write", broken)

    r = backup(env)

    body = assert_error(r, 500, "ERR_STORAGE_IO")
    assert "No space left" in body["details"]["reason"]
    assert list(env.dest.iterdir()) == []


def test_failure_while_publishing_is_500_and_leaves_no_file(env, monkeypatch):
    def broken(self, temp_path, directory, file_name):
        raise backup_adapters.StorageIOError("rename failed")

    monkeypatch.setattr(backup_adapters.ArchiveFiles, "publish", broken)

    r = backup(env)

    assert_error(r, 500, "ERR_STORAGE_IO")
    assert list(env.dest.iterdir()) == [], "the in-progress file must be removed"


def test_failure_while_taking_the_snapshot_is_500_and_leaves_no_file(env):
    # A real storage failure (main-EXP-005): another connection holds an
    # exclusive lock on the same file, so the backend runs out of busy_timeout.
    blocker = sqlite3.connect(env.db_path, isolation_level=None)
    blocker.execute("BEGIN EXCLUSIVE")
    try:
        r = backup(env)
    finally:
        blocker.execute("ROLLBACK")
        blocker.close()

    body = assert_error(r, 500, "ERR_STORAGE_IO")
    assert "locked" in body["details"]["reason"]
    assert list(env.dest.iterdir()) == []
    assert backup(env).status_code == 201, "once the lock is gone, backups work again"


def test_writes_during_a_backup_succeed_and_the_backup_is_a_consistent_database(env):
    # Make the snapshot take a measurable time: some megabytes of filler.
    with env.db.transaction() as conn:
        conn.execute("CREATE TABLE filler (id INTEGER PRIMARY KEY, v TEXT)")
        conn.executemany("INSERT INTO filler (v) VALUES (?)", [("x" * 2000,) for _ in range(20000)])
    for _ in range(3):
        new_client_and_commission(env.http)

    results = {}

    def do_backup():
        results["backup"] = backup(env)

    thread = threading.Thread(target=do_backup)
    thread.start()
    statuses = []
    for i in range(15):
        r = env.http.post("/clients", json={"client_input": {"display_name": f"late {i}", "contacts": [], "note": None}})
        statuses.append(r.status_code)
    thread.join()

    assert statuses == [201] * 15
    assert results["backup"].status_code == 201, results["backup"].text
    path = results["backup"].json()["archive_path"]
    with zipfile.ZipFile(path) as z:
        inner = z.read("data.db")
    copy = env.tmp / "inner.db"
    copy.write_bytes(inner)
    conn = sqlite3.connect(copy)
    try:
        assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        clients_in_backup = conn.execute("SELECT count(*) FROM client").fetchone()[0]
        assert conn.execute("SELECT count(*) FROM filler").fetchone()[0] == 20000
    finally:
        conn.close()
    assert 3 <= clients_in_backup <= 18, "the backup holds a state from one moment: every client before it, none half-written"
    assert len(env.http.get("/clients").json()) == 18


def test_backup_is_not_wired_without_app_version(tmp_path):
    app, db, _, _ = build(tmp_path, None)
    try:
        with TestClient(app) as http:
            r = http.post("/backups", json={"backup_request": {"destination_dir": str(tmp_path), "purpose": "manual"}})
        assert r.status_code == 404
    finally:
        db.close()


# --- prepare_restore: validation, not found ----------------------------------------------

@pytest.mark.parametrize("body", [
    {"archive_path": "relative.ctbackup"},
    {"archive_path": ""},
    {"archive_path": 5},
    {"archive_path": None},
    {},
    {"archive_path": "C:\\x.ctbackup", "extra": 1},
    [],
])
def test_prepare_with_a_malformed_body_is_400(env, body):
    assert_error(env.http.post("/backups/restore-preparations", json=body), 400, "ERR_VALIDATION")
    assert env.staging_files() == []


def test_prepare_with_a_body_that_is_not_json_is_400(env):
    r = env.http.post("/backups/restore-preparations", content=b"nope", headers={"content-type": "application/json"})
    assert_error(r, 400, "ERR_VALIDATION")


def test_prepare_on_a_missing_path_or_a_folder_is_404(env):
    body = assert_error(prepare(env, env.tmp / "missing.ctbackup"), 404, "ERR_NOT_FOUND")
    assert body["details"]["archive_path"] == str(env.tmp / "missing.ctbackup")
    assert_error(prepare(env, env.dest), 404, "ERR_NOT_FOUND")


def test_prepare_on_an_unreadable_file_is_500(env, monkeypatch):
    path = craft(env.tmp)

    def broken(*args, **kwargs):
        raise PermissionError(13, "Permission denied")

    monkeypatch.setattr(backup_adapters.zipfile, "ZipFile", broken)

    body = assert_error(prepare(env, path), 500, "ERR_STORAGE_IO")
    assert "Permission denied" in body["details"]["reason"]
    assert env.staging_files() == []


def test_prepare_when_the_staging_folder_cannot_be_made_is_500(env):
    path = craft(env.tmp)
    Path(env.staging_dir).write_text("a file where the staging folder should be")

    assert_error(prepare(env, path), 500, "ERR_STORAGE_IO")


# --- prepare_restore: valid archives ----------------------------------------------------------

def test_prepare_a_real_backup_stages_the_database_next_to_the_live_one(env):
    new_client_and_commission(env.http)
    record = backup(env).json()
    live_before = sha256_of(env.db_path)

    body = assert_valid(prepare(env, record["archive_path"]))

    staged = Path(body["staged_db_path"])
    assert body["archive_path"] == record["archive_path"]
    assert body["app_version"] == "1.2.0" and body["created_at"] == NOW
    assert staged == env.staging_dir / "data.db" and staged.is_file()
    assert staged.parent.parent == Path(env.db_path).parent, "same folder tree, hence same volume"
    assert env.staging_files() == ["data.db"]
    with zipfile.ZipFile(record["archive_path"]) as z:
        assert staged.read_bytes() == z.read("data.db")
    assert sha256_of(env.db_path) == live_before, "prepare_restore must not touch the live database"
    # the archive is not kept open
    os.replace(record["archive_path"], env.dest / "renamed.ctbackup")


def test_prepare_twice_leaves_one_staging_file(env):
    first = backup(env).json()
    new_client_and_commission(env.http)
    clock_moved = backup(env).json()

    one = assert_valid(prepare(env, first["archive_path"]))
    two = assert_valid(prepare(env, clock_moved["archive_path"]))

    assert one["staged_db_path"] == two["staged_db_path"]
    assert env.staging_files() == ["data.db"]
    with zipfile.ZipFile(clock_moved["archive_path"]) as z:
        assert Path(two["staged_db_path"]).read_bytes() == z.read("data.db"), "the second preparation replaced the first"


@pytest.mark.parametrize("made_by, running, compatible", [
    ("1.0.0", "1.0.0", True),
    ("0.9.0", "1.0.0", True),
    ("1.0.1", "1.0.0", False),
    ("1.1.0", "1.0.9", False),
    ("2.0.0", "10.0.0", True),
    ("10.0.0", "2.0.0", False),
    ("1.0.0-rc.1", "1.0.0", True),
    ("1.0.0", "1.0.0-rc.1", False),
    ("1.0.0-rc.2", "1.0.0-rc.10", True),
    ("1.0.0-rc.10", "1.0.0-rc.2", False),
    ("1.0.0-alpha", "1.0.0-alpha.1", True),
    ("1.0.0-alpha.1", "1.0.0-alpha", False),
    ("1.0.0-alpha.1", "1.0.0-alpha.beta", True),
    ("1.0.0-beta", "1.0.0-alpha", False),
    ("1.0.0+build.5", "1.0.0+build.1", True),
    ("1.0.0+build.5", "1.0.0", True),
])
def test_compatible_means_not_newer_by_semver_precedence(tmp_path, made_by, running, compatible):
    app, db, db_path, _ = build(tmp_path, running)
    try:
        with TestClient(app) as http:
            archive = craft(tmp_path, app_version=made_by)
            r = http.post("/backups/restore-preparations", json={"archive_path": str(archive)})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["is_valid"] is True
        assert body["app_version"] == made_by
        assert body["is_compatible"] is compatible, body
        staging = Path(db_path).parent / "restore-staging"
        if compatible:
            assert body["reason"] is None and body["staged_db_path"] == str(staging / "data.db")
            assert sorted(p.name for p in staging.iterdir()) == ["data.db"]
        else:
            assert body["staged_db_path"] is None and made_by in body["reason"] and running in body["reason"]
            assert not staging.exists() or list(staging.iterdir()) == [], "an incompatible archive stages nothing"
    finally:
        db.close()


def test_semver_helpers_directly():
    assert parse_semver("1.2.3") == ((1, 2, 3), ())
    assert parse_semver("1.2.3-rc.1+b") == ((1, 2, 3), ("rc", "1"))
    for bad in ["1.2", "v1.2.3", "01.2.3", "1.2.3-", "", "1.2.3+", "1.2.3.4", "latest"]:
        assert parse_semver(bad) is None, bad
    assert compare_semver("1.0.0", "1.0.0") == 0
    assert compare_semver("1.0.0-1", "1.0.0-alpha") == -1, "numeric identifiers rank below alphanumeric ones"
    assert compare_semver("1.0.0-alpha", "1.0.0-alpha.1") == -1
    assert compare_semver("1.0.0+a", "1.0.0+b") == 0


# --- prepare_restore: invalid archives ---------------------------------------------------------

def test_an_invalid_preparation_leaves_no_staging_file_even_after_a_valid_one(env):
    good = assert_valid(prepare(env, craft(env.tmp, "good.ctbackup")))
    assert Path(good["staged_db_path"]).is_file()
    broken = env.tmp / "broken.ctbackup"
    broken.write_bytes(b"this is not a zip")

    assert_not_valid(prepare(env, broken), "zip")

    assert env.staging_files() == [], "the latest answer defines the staging file: none"


def test_not_a_zip(env):
    path = env.tmp / "x.ctbackup"
    path.write_bytes(os.urandom(2048))
    assert_not_valid(prepare(env, path), "zip")
    path.write_bytes(b"")
    assert_not_valid(prepare(env, path), "zip")
    assert env.staging_files() == []


def test_truncated_zip(env):
    good = craft(env.tmp, "good.ctbackup")
    cut = env.tmp / "cut.ctbackup"
    cut.write_bytes(good.read_bytes()[: good.stat().st_size // 2])
    assert_not_valid(prepare(env, cut), "zip")
    assert env.staging_files() == []


def test_zip_without_manifest(env):
    db = small_database_bytes(env.tmp)
    path = write_archive(env.tmp / "a.ctbackup", {"data.db": db})
    assert_not_valid(prepare(env, path), "exactly manifest.json and data.db")
    assert env.staging_files() == []


def test_zip_without_database(env):
    db = small_database_bytes(env.tmp)
    path = write_archive(env.tmp / "a.ctbackup", {"manifest.json": json.dumps(manifest_for(db)).encode()})
    assert_not_valid(prepare(env, path), "exactly manifest.json and data.db")


def test_zip_with_an_extra_component(env):
    db = small_database_bytes(env.tmp)
    path = write_archive(env.tmp / "a.ctbackup", {
        "manifest.json": json.dumps(manifest_for(db)).encode(), "data.db": db, "notes.txt": b"extra",
    })
    assert_not_valid(prepare(env, path), "exactly manifest.json and data.db")
    assert env.staging_files() == []


@pytest.mark.parametrize("database_name", ["../data.db", "sub/data.db", "..\\data.db", "/data.db", "C:data.db"])
def test_zip_with_a_component_name_that_is_a_path(env, database_name):
    db = small_database_bytes(env.tmp)
    path = write_archive(env.tmp / "a.ctbackup", {
        "manifest.json": json.dumps(manifest_for(db)).encode(), database_name: db,
    })
    assert_not_valid(prepare(env, path), "path")
    assert env.staging_files() == []
    assert not (env.tmp / "data.db").exists() and not (env.tmp.parent / "data.db").exists(), "nothing was extracted outside"


def test_zip_with_a_directory_entry(env):
    db = small_database_bytes(env.tmp)
    path = write_archive(env.tmp / "a.ctbackup", {
        "manifest.json": json.dumps(manifest_for(db)).encode(), "data.db/": b"",
    })
    assert_not_valid(prepare(env, path), "path")


@pytest.mark.parametrize("raw, part", [
    pytest.param(b"{ not json", "not valid JSON", id="broken_json"),
    pytest.param(b"\xff\xfe\x00 not utf8", "not valid JSON", id="not_utf8"),
    pytest.param(b"[1, 2]", "not a JSON object", id="array"),
    pytest.param(b'"text"', "not a JSON object", id="string"),
    pytest.param(b"[" * 70000, "larger than", id="over_the_size_limit"),
    pytest.param(b"[" * 30000 + b"]" * 30000, "not valid JSON", id="nested_too_deep"),
])
def test_unreadable_manifest(env, raw, part):
    db = small_database_bytes(env.tmp)
    path = write_archive(env.tmp / "a.ctbackup", {"manifest.json": raw, "data.db": db})
    body = assert_not_valid(prepare(env, path), part)
    assert body["app_version"] is None and body["created_at"] is None
    assert env.staging_files() == []


@pytest.mark.parametrize("override, part", [
    ({"format": "something-else"}, "unknown archive format"),
    ({"format": None}, "unknown archive format"),
    ({"format_version": 2}, "unknown archive format"),
    ({"format_version": "1"}, "unknown archive format"),
    ({"format_version": True}, "unknown archive format"),
    ({"app_version": "latest"}, "app_version"),
    ({"app_version": "1.0"}, "app_version"),
    ({"app_version": 3}, "app_version"),
    ({"app_version": None}, "app_version"),
    ({"created_at": "yesterday"}, "created_at"),
    ({"created_at": "2026-10-01T09:00:00"}, "created_at"),
    ({"created_at": 5}, "created_at"),
    ({"purpose": "weekly"}, "purpose"),
    ({"db_size_bytes": "12"}, "db_size_bytes"),
    ({"db_size_bytes": -1}, "db_size_bytes"),
    ({"db_size_bytes": True}, "db_size_bytes"),
    ({"db_sha256": "ABC"}, "db_sha256"),
    ({"db_sha256": "A" * 64}, "db_sha256"),
    ({"db_sha256": None}, "db_sha256"),
])
def test_manifest_with_a_wrong_field(env, override, part):
    path = craft(env.tmp, **override)
    assert_not_valid(prepare(env, path), part)
    assert env.staging_files() == []


def test_manifest_missing_a_field(env):
    db = small_database_bytes(env.tmp)
    manifest = manifest_for(db)
    del manifest["db_sha256"]
    path = write_archive(env.tmp / "a.ctbackup", {"manifest.json": json.dumps(manifest).encode(), "data.db": db})
    assert_not_valid(prepare(env, path), "db_sha256")


def test_readable_manifest_still_reports_version_and_date_when_the_archive_is_invalid(env):
    path = craft(env.tmp, app_version="3.1.4", created_at="2026-09-01T08:00:00+07:00", db_sha256="0" * 64)
    body = assert_not_valid(prepare(env, path), "SHA-256")
    assert body["app_version"] == "3.1.4" and body["created_at"] == "2026-09-01T08:00:00+07:00"


def test_database_whose_sha256_differs_from_the_manifest(env):
    db = small_database_bytes(env.tmp)
    other = bytearray(db)
    other[-10] ^= 0xFF  # same size, one byte different
    path = write_archive(env.tmp / "a.ctbackup", {
        "manifest.json": json.dumps(manifest_for(db)).encode(), "data.db": bytes(other),
    })
    assert_not_valid(prepare(env, path), "SHA-256")
    assert env.staging_files() == []


@pytest.mark.parametrize("delta", [-100, 100])
def test_database_whose_size_differs_from_the_manifest(env, delta):
    db = small_database_bytes(env.tmp)
    path = write_archive(env.tmp / "a.ctbackup", {
        "manifest.json": json.dumps(manifest_for(db, db_size_bytes=len(db) + delta)).encode(), "data.db": db,
    })
    assert_not_valid(prepare(env, path), "bytes")
    assert env.staging_files() == []


def test_database_that_is_not_a_database_but_matches_the_checksum(env):
    garbage = os.urandom(8192)
    path = craft(env.tmp, db_bytes=garbage)
    assert_not_valid(prepare(env, path), "integrity check")
    assert env.staging_files() == []


def test_database_that_opens_but_is_damaged_and_matches_the_checksum(env):
    db = bytearray(small_database_bytes(env.tmp, rows=30))
    page_size = int.from_bytes(db[16:18], "big")
    assert len(db) > 3 * page_size
    db[page_size * 2: page_size * 2 + page_size] = b"\xff" * page_size  # a whole page of garbage, page 1 intact
    path = craft(env.tmp, db_bytes=bytes(db))
    assert_not_valid(prepare(env, path), "integrity check")
    assert env.staging_files() == []


def test_truncated_database_that_matches_the_checksum(env):
    db = small_database_bytes(env.tmp, rows=30)
    path = craft(env.tmp, db_bytes=db[: len(db) // 2])
    assert_not_valid(prepare(env, path), "integrity check")
    assert env.staging_files() == []


def test_database_longer_than_announced_is_cut_not_extracted_whole(env):
    db = small_database_bytes(env.tmp, rows=30)
    path = craft(env.tmp, db_bytes=db, db_size_bytes=100)
    body = assert_not_valid(prepare(env, path), "bytes")
    assert env.staging_files() == []
    assert body["is_valid"] is False


def test_prepare_never_modifies_the_live_database_or_the_archive(env):
    new_client_and_commission(env.http)
    path = craft(env.tmp)
    live, archive = sha256_of(env.db_path), sha256_of(path)
    for archive_path in (path, env.tmp / "missing"):
        prepare(env, archive_path)
    prepare(env, craft(env.tmp, "bad.ctbackup", db_sha256="1" * 64))
    assert sha256_of(env.db_path) == live and sha256_of(path) == archive


# --- real processes: round trip and a newer build ------------------------------------------------

def start_backend(db_file: Path, version: str) -> tuple[BackendProcess, httpx.Client]:
    port = free_port()
    env_vars = launch_env(db_file, port)
    env_vars["CT_APP_VERSION"] = version
    process = BackendProcess(env_vars)
    assert process.wait_ready(), "READY not received"
    return process, httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30)


def stop_backend(process: BackendProcess, http: httpx.Client) -> None:
    http.close()
    assert process.close_stdin_and_wait() == 0


def test_round_trip_a_second_backend_on_the_staging_file_serves_the_same_data(tmp_path):
    db_a = tmp_path / "live" / "data.db"
    db_b_dest = tmp_path / "backups"
    db_b_dest.mkdir()
    process_a, http_a = start_backend(db_a, "1.0.0")
    process_b = http_b = None
    try:
        for i in range(3):
            r = http_a.post("/clients", json={"client_input": {
                "display_name": f"Khách {i}", "contacts": [{"channel": "email", "value": f"k{i}@x.vn"}], "note": f"ghi chú {i}",
            }})
            assert r.status_code == 201, r.text
            r = http_a.post("/commissions", json={"commission_input": {
                "client_id": r.json()["client_id"], "title": f"Tranh {i}", "description": None, "commission_type": None,
                "agreed_price": {"amount_minor": 1000 * (i + 1), "currency": "VND"}, "deadline": "2026-12-01",
                "reference_links": [],
            }})
            assert r.status_code == 201, r.text
        clients = http_a.get("/clients").json()
        commissions = http_a.get("/commissions").json()
        assert len(clients) == 3 and len(commissions) == 3

        created = http_a.post("/backups", json={"backup_request": {"destination_dir": str(db_b_dest), "purpose": "manual"}})
        assert created.status_code == 201, created.text
        assert created.json()["app_version"] == "1.0.0"
        # data written after the backup is not in it
        http_a.post("/clients", json={"client_input": {"display_name": "Sau sao lưu", "contacts": [], "note": None}})

        prepared = http_a.post("/backups/restore-preparations", json={"archive_path": created.json()["archive_path"]})
        staged = assert_valid(prepared)["staged_db_path"]
        assert Path(staged) == db_a.parent / "restore-staging" / "data.db"

        process_b, http_b = start_backend(Path(staged), "1.0.0")
        assert http_b.get("/clients").json() == clients
        assert http_b.get("/commissions").json() == commissions
        # the restored backend is a normal backend: it accepts new work
        r = http_b.post("/clients", json={"client_input": {"display_name": "Mới", "contacts": [], "note": None}})
        assert r.status_code == 201
        # the first backend kept its own data (it has the late client)
        assert len(http_a.get("/clients").json()) == 4
    finally:
        if process_b is not None:
            stop_backend(process_b, http_b)
        stop_backend(process_a, http_a)


def test_an_archive_made_by_a_newer_build_is_valid_but_not_compatible(tmp_path):
    dest = tmp_path / "backups"
    dest.mkdir()
    newer, http_newer = start_backend(tmp_path / "newer" / "data.db", "9.9.9")
    try:
        created = http_newer.post("/backups", json={"backup_request": {"destination_dir": str(dest), "purpose": "manual"}})
        assert created.status_code == 201, created.text
        assert created.json()["app_version"] == "9.9.9"
    finally:
        stop_backend(newer, http_newer)

    older, http_older = start_backend(tmp_path / "older" / "data.db", "0.1.0")
    try:
        r = http_older.post("/backups/restore-preparations", json={"archive_path": created.json()["archive_path"]})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["is_valid"] is True and body["is_compatible"] is False
        assert body["app_version"] == "9.9.9" and body["staged_db_path"] is None
        assert "9.9.9" in body["reason"] and "0.1.0" in body["reason"]
        assert not (tmp_path / "older" / "restore-staging").exists() or not list((tmp_path / "older" / "restore-staging").iterdir())
    finally:
        stop_backend(older, http_older)
