"""Layer tests: CORS for the renderer (data_schema.yaml 6.0.0,
clause_a_common.mandatory_rules and shared_values.ui_origin).

The application is built exactly as the Main builds it: create_http_app with
configs/backend.yaml, then wire_workflows. The last test runs the real
Backend.py process.

Run from Backend/:  python -m pytest -s -v tests/test_cors.py
"""

import sqlite3
import sys

import httpx
import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

import Backend
from tests.test_backend_process import BackendProcess, call, commission_input, free_port, launch_env
from workflows.scaffold_backend import adapters as scaffold

LAYER_CFG = Backend.load_yaml(Backend.LAYER_CONFIG_FILE)
UI_ORIGIN = LAYER_CFG["ui_origin"]
ALLOWED_METHODS = {str(m) for m in LAYER_CFG["http_server"]["cors_allow_methods"]}
UNKNOWN_ID = "0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"
ACAO = "access-control-allow-origin"

# Origins that must receive no CORS headers: another loopback origin, the
# opaque origin, and one that differs from ui_origin by a single character.
OTHER_ORIGINS = [
    f"http://127.0.0.1:{free_port()}",
    "null",
    UI_ORIGIN[:-1] + ("x" if UI_ORIGIN[-1] != "x" else "y"),
]


def build_app(db_path: str):
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    app = Backend.create_http_app(LAYER_CFG)
    Backend.wire_workflows(app, db, configs)
    return app, db


@pytest.fixture
def wired(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    app, db = build_app(db_path)
    with TestClient(app) as http:
        yield http, app, db_path
    db.close()


def preflight(http, path: str, method: str, origin: str = UI_ORIGIN, headers: str = "content-type"):
    return http.options(path, headers={
        "Origin": origin,
        "Access-Control-Request-Method": method,
        "Access-Control-Request-Headers": headers,
    })


def assert_error_body(r, label: int, code: str) -> None:
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"} and body["code"] == code


def test_ui_origin_matches_nothing_else_in_config():
    # One origin, written once; no wildcard in any CORS setting.
    assert isinstance(UI_ORIGIN, str) and UI_ORIGIN and "*" not in UI_ORIGIN
    assert "*" not in ALLOWED_METHODS
    assert "*" not in LAYER_CFG["http_server"]["cors_allow_headers"]


def test_allowed_methods_are_exactly_those_of_the_registered_routes(wired):
    _, app, _ = wired
    used = set()
    for route in app.routes:
        if isinstance(route, APIRoute):
            used |= set(route.methods)
    print(f"\n  methods of registered routes: {sorted(used)}; configured: {sorted(ALLOWED_METHODS)}")
    assert used == ALLOWED_METHODS


def test_get_from_ui_origin_carries_allow_origin(wired):
    http, _, _ = wired
    r = http.get("/clients", headers={"Origin": UI_ORIGIN})
    print(f"\n  GET /clients Origin={UI_ORIGIN} -> {r.status_code} {dict(r.headers)}")
    assert r.status_code == 200 and r.json() == []
    assert r.headers[ACAO] == UI_ORIGIN
    assert "access-control-allow-credentials" not in r.headers


@pytest.mark.parametrize(
    "method,path",
    [("POST", "/clients"), ("PUT", f"/clients/{UNKNOWN_ID}"), ("PUT", f"/commissions/{UNKNOWN_ID}/stage")],
)
def test_preflight_from_ui_origin_allows_declared_method(wired, method, path):
    http, _, _ = wired
    r = preflight(http, path, method)
    print(f"\n  OPTIONS {path} ({method}) -> {r.status_code} {dict(r.headers)}")
    assert r.status_code == 200
    assert r.headers[ACAO] == UI_ORIGIN
    allowed = {m.strip() for m in r.headers["access-control-allow-methods"].split(",")}
    assert method in allowed and allowed == ALLOWED_METHODS
    assert "content-type" in r.headers["access-control-allow-headers"].lower()
    assert "access-control-allow-credentials" not in r.headers


def test_preflight_refuses_undeclared_method_and_header(wired):
    http, _, _ = wired
    r = preflight(http, f"/clients/{UNKNOWN_ID}", "DELETE")
    print(f"\n  OPTIONS DELETE -> {r.status_code} {r.text!r}")
    assert r.status_code == 400
    r = preflight(http, "/clients", "POST", headers="content-type, x-custom")
    print(f"  OPTIONS POST + x-custom -> {r.status_code} {r.text!r}")
    assert r.status_code == 400


def test_declared_errors_from_ui_origin_keep_error_body_and_carry_allow_origin(wired):
    http, _, db_path = wired
    h = {"Origin": UI_ORIGIN}

    # 404 from the workflow's Routers
    r = http.get(f"/clients/{UNKNOWN_ID}", headers=h)
    print(f"\n  GET unknown client -> {r.status_code} {r.text} {ACAO}={r.headers.get(ACAO)}")
    assert_error_body(r, 404, "ERR_NOT_FOUND")
    assert r.headers[ACAO] == UI_ORIGIN

    # 400 from the Main's safety net (body that is not JSON)
    r = http.post("/clients", content=b"{not json", headers={**h, "content-type": "application/json"})
    print(f"  POST malformed body -> {r.status_code} {ACAO}={r.headers.get(ACAO)}")
    assert_error_body(r, 400, "ERR_VALIDATION")
    assert r.headers[ACAO] == UI_ORIGIN

    # 404 from the Main's safety net (undeclared path)
    r = http.get("/health", headers=h)
    print(f"  GET /health -> {r.status_code} {ACAO}={r.headers.get(ACAO)}")
    assert_error_body(r, 404, "ERR_NOT_FOUND")
    assert r.headers[ACAO] == UI_ORIGIN

    # 409 from the workflow's Services (commission for an archived client)
    cid = http.post("/clients", json={"client_input": {"display_name": "A", "contacts": [], "note": None}}).json()[
        "client_id"]
    assert http.put(f"/clients/{cid}/archived", json={"is_archived": True}).status_code == 200
    r = http.post("/commissions", headers=h, json=commission_input(cid))
    print(f"  POST commission for archived client -> {r.status_code} {ACAO}={r.headers.get(ACAO)}")
    assert_error_body(r, 409, "ERR_CONFLICT")
    assert r.headers[ACAO] == UI_ORIGIN

    # 500 ERR_STORAGE_IO: the test (never workflow code) renames the
    # workflow's table on a separate connection (main-EXP-008).
    other = sqlite3.connect(db_path)
    try:
        other.execute("ALTER TABLE client RENAME TO client_moved")
        other.commit()
        r = http.get("/clients", headers=h)
        print(f"  GET /clients, table renamed -> {r.status_code} {r.text} {ACAO}={r.headers.get(ACAO)}")
        assert_error_body(r, 500, "ERR_STORAGE_IO")
        assert r.headers[ACAO] == UI_ORIGIN
    finally:
        other.execute("ALTER TABLE client_moved RENAME TO client")
        other.commit()
        other.close()


@pytest.mark.parametrize("origin", OTHER_ORIGINS)
def test_other_origins_receive_no_cors_headers(wired, origin):
    http, _, _ = wired
    r = http.get("/clients", headers={"Origin": origin})
    print(f"\n  GET /clients Origin={origin} -> {r.status_code} {dict(r.headers)}")
    assert r.status_code == 200
    assert not any(k.startswith("access-control-") for k in r.headers)

    r = http.get(f"/clients/{UNKNOWN_ID}", headers={"Origin": origin})
    assert_error_body(r, 404, "ERR_NOT_FOUND")
    assert ACAO not in r.headers

    r = preflight(http, "/clients", "POST", origin=origin)
    print(f"  OPTIONS /clients Origin={origin} -> {r.status_code} {dict(r.headers)}")
    assert r.status_code != 200
    assert ACAO not in r.headers


def test_request_without_origin_is_unchanged(wired):
    http, _, _ = wired
    r = http.get("/clients")
    assert r.status_code == 200 and r.json() == []
    assert not any(k.startswith("access-control-") for k in r.headers)
    assert "vary" not in r.headers
    r = http.get(f"/clients/{UNKNOWN_ID}")
    assert_error_body(r, 404, "ERR_NOT_FOUND")
    assert not any(k.startswith("access-control-") for k in r.headers)
    # OPTIONS without Origin is not a preflight: no route answers it.
    r = http.options("/clients")
    assert_error_body(r, 405, "ERR_VALIDATION")


def test_known_limit_uncaught_exception_raw_500_has_no_cors_headers(tmp_path):
    # A programming error is not turned into error_body (main-EXP-005): it
    # reaches Starlette's outermost ServerErrorMiddleware, which sits outside
    # the CORS middleware. The route below exists only in this test.
    app, db = build_app(str(tmp_path / "data.db"))
    try:
        @app.get("/__test_only_programming_error")
        def _boom():
            raise KeyError("programming error")

        with TestClient(app, raise_server_exceptions=False) as http:
            r = http.get("/__test_only_programming_error", headers={"Origin": UI_ORIGIN})
        print(f"\n  uncaught exception -> {r.status_code} {r.headers.get('content-type')} {r.text!r} "
              f"{ACAO}={r.headers.get(ACAO)}")
        assert r.status_code == 500
        assert r.headers["content-type"].startswith("text/plain")
        assert ACAO not in r.headers
    finally:
        db.close()


def test_real_process_answers_cors_for_ui_origin_only(tmp_path):
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[process] python {sys.version.split()[0]}, db={db_file}, port={port}, ui_origin={UI_ORIGIN}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    try:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as http:
            r = call(http, "GET", "/clients", headers={"Origin": UI_ORIGIN})
            print(f"  {ACAO}: {r.headers.get(ACAO)!r}, vary: {r.headers.get('vary')!r}")
            assert r.status_code == 200 and r.headers[ACAO] == UI_ORIGIN

            r = call(http, "OPTIONS", f"/clients/{UNKNOWN_ID}", headers={
                "Origin": UI_ORIGIN, "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "content-type"})
            print(f"  preflight headers: {ACAO}={r.headers.get(ACAO)!r}, "
                  f"methods={r.headers.get('access-control-allow-methods')!r}, "
                  f"headers={r.headers.get('access-control-allow-headers')!r}")
            assert r.status_code == 200 and r.headers[ACAO] == UI_ORIGIN

            r = call(http, "PUT", f"/clients/{UNKNOWN_ID}", headers={"Origin": UI_ORIGIN},
                     json={"client_input": {"display_name": "x", "contacts": [], "note": None}})
            print(f"  {ACAO}: {r.headers.get(ACAO)!r}")
            assert_error_body(r, 404, "ERR_NOT_FOUND")
            assert r.headers[ACAO] == UI_ORIGIN

            other = OTHER_ORIGINS[0]
            r = call(http, "GET", "/clients", headers={"Origin": other})
            print(f"  Origin={other}: {ACAO}={r.headers.get(ACAO)!r}")
            assert r.status_code == 200 and ACAO not in r.headers
    finally:
        code = backend.close_stdin_and_wait()
    print(f"[process] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0
    assert backend.stdout == [b"READY\n"]
