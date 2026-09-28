"""Layer tests: the real backend process (Backend.py), launched the way the
desktop Main launches it (CT_* environment variables, stdin pipe, READY on
stdout), on a real temporary SQLite file.

Run from Backend/:  python -m pytest -s -v tests/test_backend_process.py
With -s, every HTTP exchange is printed raw (EVIDENCE).
"""

import os
import queue
import signal
import socket
import sqlite3
import subprocess
import sys
import textwrap
import threading
from pathlib import Path

import httpx
import pytest

LAYER_ROOT = Path(__file__).resolve().parent.parent
READY_TIMEOUT_S = 30
EXIT_TIMEOUT_S = 15
UNKNOWN_ID = "0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def launch_env(db_file: Path, port: int) -> dict:
    env = dict(os.environ)
    env.update(
        CT_PORT=str(port),
        CT_DB_FILE_PATH=str(db_file),
        CT_AI_SERVICE_BASE_URL=f"http://127.0.0.1:{free_port()}",
        CT_APP_VERSION="1.0.0",
    )
    return env


class BackendProcess:
    def __init__(self, env: dict, argv=None) -> None:
        self.proc = subprocess.Popen(
            argv or [sys.executable, "Backend.py"],
            cwd=LAYER_ROOT,
            env=env,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.lines: "queue.Queue[bytes | None]" = queue.Queue()
        self.stdout: list[bytes] = []
        threading.Thread(target=self._pump, daemon=True).start()
        self.stderr = b""

    def _pump(self) -> None:
        for line in self.proc.stdout:
            self.stdout.append(line)
            self.lines.put(line)
        self.lines.put(None)

    def wait_ready(self) -> bool:
        try:
            line = self.lines.get(timeout=READY_TIMEOUT_S)
        except queue.Empty:
            return False
        return line == b"READY\n"

    def close_stdin_and_wait(self) -> int:
        self.proc.stdin.close()
        code = self.proc.wait(timeout=EXIT_TIMEOUT_S)
        self.stderr = self.proc.stderr.read()
        return code


def out(text: str) -> None:
    # The console code page may not cover Vietnamese: escape what it cannot print.
    enc = sys.stdout.encoding or "utf-8"
    print(text.encode(enc, "backslashreplace").decode(enc))


def call(http: httpx.Client, method: str, url: str, **kw) -> httpx.Response:
    r = http.request(method, url, **kw)
    sent = kw.get("json", kw.get("content", ""))
    out(f"  >> {method} {url} {sent}")
    out(f"  << {r.status_code} {r.text}")
    return r


def assert_error(r: httpx.Response, label: int, code: str) -> None:
    assert r.status_code == label
    body = r.json()
    assert set(body) == {"code", "message", "details"} and body["code"] == code


def test_process_lifecycle_crud_errors_and_restart(tmp_path):
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run 1] python {sys.version.split()[0]}, db={db_file}, port={port}")

    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    print("[run 1] stdout line 1: READY")
    base = f"http://127.0.0.1:{port}"
    with httpx.Client(base_url=base, timeout=10) as http:
        # Create -> view -> edit -> archive -> unarchive -> list
        r = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Nguyễn Thu Hà",
            "contacts": [{"channel": "facebook", "value": "fb.com/thuha.art"}],
            "note": "Khách quen, thích tông pastel",
        }})
        assert r.status_code == 201
        created = r.json()
        cid = created["client_id"]

        r = call(http, "GET", f"/clients/{cid}")
        assert r.status_code == 200 and r.json() == created

        r = call(http, "PUT", f"/clients/{cid}", json={"client_input": {
            "display_name": "Thu Hà",
            "contacts": [{"channel": "facebook", "value": "fb.com/thuha.art"},
                         {"channel": "zalo", "value": "0901234567"}],
            "note": None,
        }})
        assert r.status_code == 200
        edited = r.json()
        assert edited["display_name"] == "Thu Hà" and len(edited["contacts"]) == 2
        assert edited["created_at"] == created["created_at"]

        r = call(http, "PUT", f"/clients/{cid}/archived", json={"is_archived": True})
        assert r.status_code == 200 and r.json()["is_archived"] is True
        r = call(http, "PUT", f"/clients/{cid}/archived", json={"is_archived": False})
        assert r.status_code == 200 and r.json()["is_archived"] is False
        final_detail = r.json()

        r = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Bảo", "contacts": [], "note": None}})
        assert r.status_code == 201
        second_id = r.json()["client_id"]

        r = call(http, "GET", "/clients")
        assert r.status_code == 200
        listed = r.json()
        assert [i["client_id"] for i in listed] == [second_id, cid]
        assert all(set(i) == {"client_id", "display_name", "is_archived", "updated_at"} for i in listed)

        # Error labels with error_body
        assert_error(call(http, "POST", "/clients", json={"client_input": {
            "display_name": "", "contacts": [], "note": None}}), 400, "ERR_VALIDATION")
        assert_error(call(http, "POST", "/clients", content=b"{not json",
                          headers={"content-type": "application/json"}), 400, "ERR_VALIDATION")
        assert_error(call(http, "PUT", f"/clients/{cid}/archived", json={"is_archived": "yes"}),
                     400, "ERR_VALIDATION")
        assert_error(call(http, "PUT", "/clients/not-an-id", json={"client_input": {
            "display_name": "x", "contacts": [], "note": None}}), 400, "ERR_VALIDATION")
        assert_error(call(http, "GET", f"/clients/{UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "GET", "/clients/not-an-id"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "PUT", f"/clients/{UNKNOWN_ID}", json={"client_input": {
            "display_name": "x", "contacts": [], "note": None}}), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "PUT", f"/clients/{UNKNOWN_ID}/archived", json={"is_archived": True}),
                     404, "ERR_NOT_FOUND")

        # No undeclared entries
        for path in ("/docs", "/redoc", "/openapi.json", "/health"):
            assert call(http, "GET", path).status_code == 404

        # Shared connection under concurrent HTTP calls
        def burst(n: int) -> None:
            with httpx.Client(base_url=base, timeout=10) as h:
                for i in range(10):
                    resp = h.post("/clients", json={"client_input": {
                        "display_name": f"burst {n}-{i}", "contacts": [], "note": None}})
                    assert resp.status_code == 201
        threads = [threading.Thread(target=burst, args=(n,)) for n in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        count = len(http.get("/clients").json())
        print(f"  concurrent: 8 threads x 10 POST /clients -> total clients {count}")
        assert count == 82

    code = backend.close_stdin_and_wait()
    print(f"[run 1] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0
    assert backend.stdout == [b"READY\n"]

    # Restart on the same SQLite file: data is still there.
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready()
    print(f"[run 2] same db, port={port2}: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port2}", timeout=10) as http:
        r = call(http, "GET", f"/clients/{cid}")
        assert r.status_code == 200 and r.json() == final_detail
        assert len(http.get("/clients").json()) == 82
    code2 = backend2.close_stdin_and_wait()
    print(f"[run 2] stdin closed -> exit code {code2}")
    assert code2 == 0

    # get_client_summary: in_process entry, called as the Routers function,
    # wired exactly as the Main wires it, on the same database file.
    sys.path.insert(0, str(LAYER_ROOT))
    import Backend
    from workflows.scaffold_backend import adapters as scaffold

    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    db = scaffold.open_connection(str(db_file), **configs["scaffold_backend"])
    try:
        app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
        entries = Backend.wire_workflows(app, db, configs)
        summary = entries["get_client_summary"](client_id=cid)
        print(f"  get_client_summary(client_id={cid!r}) -> {summary}")
        assert summary == {"client_id": cid, "is_archived": False}
        with pytest.raises(Exception) as info:
            entries["get_client_summary"](client_id=UNKNOWN_ID)
        print(f"  get_client_summary(client_id={UNKNOWN_ID!r}) -> raised label={info.value.label} "
              f"error_body={info.value.error_body}")
        assert info.value.label == 404 and info.value.error_body["code"] == "ERR_NOT_FOUND"
    finally:
        db.close()


@pytest.mark.parametrize(
    "broken",
    [
        {"CT_PORT": None},
        {"CT_DB_FILE_PATH": None},
        {"CT_AI_SERVICE_BASE_URL": None},
        {"CT_APP_VERSION": None},
        {"CT_PORT": "abc"},
        {"CT_DB_FILE_PATH": "relative/data.db"},
        {"CT_AI_SERVICE_BASE_URL": "http://localhost:9000"},
        {"CT_APP_VERSION": "v1"},
    ],
    ids=lambda b: ",".join(f"{k}={v}" for k, v in b.items()),
)
def test_missing_or_malformed_launch_value_exits_nonzero_without_ready(tmp_path, broken):
    env = launch_env(tmp_path / "data.db", free_port())
    for key, value in broken.items():
        if value is None:
            env.pop(key)
        else:
            env[key] = value
    proc = subprocess.run(
        [sys.executable, "Backend.py"], cwd=LAYER_ROOT, env=env,
        stdin=subprocess.PIPE, capture_output=True, timeout=EXIT_TIMEOUT_S,
    )
    print(f"\n  {broken} -> exit code {proc.returncode}, stdout={proc.stdout!r}, "
          f"stderr tail={proc.stderr.decode(errors='replace').strip().splitlines()[-1]!r}")
    assert proc.returncode != 0
    assert b"READY" not in proc.stdout
    assert not (tmp_path / "data.db").exists()


def test_ctrl_c_stops_cleanly_with_exit_code_0(tmp_path):
    # Simulates Ctrl+C: SIGINT raised in the process while it serves.
    env = launch_env(tmp_path / "data.db", free_port())
    script = textwrap.dedent(
        """
        import signal, sys, threading
        import Backend
        threading.Timer(2.0, signal.raise_signal, args=(signal.SIGINT,)).start()
        sys.exit(Backend.main())
        """
    )
    backend = BackendProcess(env, argv=[sys.executable, "-c", script])
    assert backend.wait_ready()
    code = backend.proc.wait(timeout=EXIT_TIMEOUT_S)
    print(f"\n  SIGINT -> exit code {code}")
    assert code == 0


def commission_input(client_id, **over):
    data = {
        "client_id": client_id,
        "title": "Chân dung bán thân",
        "description": "Tông pastel, nền trơn",
        "commission_type": "bust",
        "agreed_price": {"amount_minor": 1500000, "currency": "VND"},
        "deadline": "2026-10-15",
        "reference_links": ["https://example.com/ref/1"],
    }
    data.update(over)
    return {"commission_input": data}


def test_process_commissions_restart_in_process_and_storage_failure(tmp_path):
    """manage_commission on the real process (EVIDENCE items 1-8 of the plan)."""
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run 1] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    print("[run 1] stdout line 1: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as http:
        # 1. create a client over HTTP, then a commission for it
        cid = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Nguyễn Thu Hà", "contacts": [], "note": None}}).json()["client_id"]
        r = call(http, "POST", "/commissions", json=commission_input(cid))
        assert r.status_code == 201
        created = r.json()
        mid = created["commission_id"]
        assert set(created) == {"commission_id", "client_id", "title", "description", "commission_type",
                                "agreed_price", "deadline", "reference_links", "created_at", "updated_at"}

        # 2. unknown client (404), archived client (409)
        assert_error(call(http, "POST", "/commissions", json=commission_input(UNKNOWN_ID)), 404, "ERR_NOT_FOUND")
        archived = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Khách cũ", "contacts": [], "note": None}}).json()["client_id"]
        assert call(http, "PUT", f"/clients/{archived}/archived", json={"is_archived": True}).status_code == 200
        assert_error(call(http, "POST", "/commissions", json=commission_input(archived)), 409, "ERR_CONFLICT")

        # 3. unsupported currency (400)
        assert_error(call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price={"amount_minor": 100, "currency": "EUR"})), 400, "ERR_VALIDATION")

        # 3b. integer bound of clause_a_common (Data Schema 2.0.0): 2^53-1 is
        #     accepted, 2^53 is rejected.
        r = call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price={"amount_minor": 2**53 - 1, "currency": "USD"}))
        assert r.status_code == 201 and r.json()["agreed_price"]["amount_minor"] == 9007199254740991
        big_mid = r.json()["commission_id"]
        assert_error(call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price={"amount_minor": 2**53, "currency": "USD"})), 400, "ERR_VALIDATION")

        # 4. edit the amount (200), then try to change the currency (409)
        r = call(http, "PUT", f"/commissions/{mid}", json=commission_input(
            cid, agreed_price={"amount_minor": 1800000, "currency": "VND"}))
        assert r.status_code == 200 and r.json()["agreed_price"] == {"amount_minor": 1800000, "currency": "VND"}
        assert r.json()["created_at"] == created["created_at"]
        edited = r.json()
        assert_error(call(http, "PUT", f"/commissions/{mid}", json=commission_input(
            cid, agreed_price={"amount_minor": 70, "currency": "USD"})), 409, "ERR_CONFLICT")

        # 5. get_commission, list_commissions, list_currencies shapes
        r = call(http, "GET", f"/commissions/{mid}")
        assert r.status_code == 200 and r.json() == edited
        r = call(http, "GET", "/commissions")
        assert r.status_code == 200 and {i["commission_id"] for i in r.json()} == {mid, big_mid}
        assert set(r.json()[0]) == {"commission_id", "client_id", "title", "agreed_price", "deadline", "updated_at"}
        r = call(http, "GET", "/currencies")
        assert r.status_code == 200 and r.json() == ["VND", "USD"]
        assert_error(call(http, "GET", f"/commissions/{UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "GET", "/commissions/not-an-id"), 404, "ERR_NOT_FOUND")

        # 8. a real storage failure: another connection holds an EXCLUSIVE
        #    lock on the same file; the backend's busy timeout expires and
        #    SQLite raises "database is locked".
        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        print("  [lock] another connection holds BEGIN EXCLUSIVE on the database file")
        try:
            for method, url, kw in (
                ("GET", "/clients", {}),
                ("POST", "/clients", {"json": {"client_input": {
                    "display_name": "x", "contacts": [], "note": None}}}),
                ("POST", "/commissions", {"json": commission_input(cid)}),
                ("GET", "/commissions", {}),
                ("GET", f"/commissions/{mid}", {}),
                ("PUT", f"/commissions/{mid}", {"json": commission_input(cid)}),
            ):
                assert_error(call(http, method, url, **kw), 500, "ERR_STORAGE_IO")
            assert call(http, "GET", "/currencies").status_code == 200  # Configs only
        finally:
            locker.execute("ROLLBACK")
            locker.close()
        print("  [lock] released")
        r = call(http, "GET", f"/commissions/{mid}")
        assert r.status_code == 200 and r.json() == edited

    code = backend.close_stdin_and_wait()
    print(f"[run 1] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]

    # 6. data survives a restart
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready()
    print(f"[run 2] same db, port={port2}: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port2}", timeout=10) as http:
        r = call(http, "GET", f"/commissions/{mid}")
        assert r.status_code == 200 and r.json() == edited
        assert len(call(http, "GET", "/commissions").json()) == 2
    code2 = backend2.close_stdin_and_wait()
    print(f"[run 2] stdin closed -> exit code {code2}")
    assert code2 == 0

    # 7. in_process entries, called as Routers functions, wired exactly as
    #    the Main wires them, on the same database file.
    sys.path.insert(0, str(LAYER_ROOT))
    import Backend
    from workflows.scaffold_backend import adapters as scaffold

    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    db = scaffold.open_connection(str(db_file), **configs["scaffold_backend"])
    try:
        entries = Backend.wire_workflows(Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE)), db, configs)
        summary = entries["get_commission_summary"](commission_id=mid)
        out(f"  get_commission_summary(commission_id={mid!r}) -> {summary}")
        assert summary == {"commission_id": mid, "title": edited["title"],
                           "agreed_price": edited["agreed_price"], "deadline": edited["deadline"]}
        index = entries["list_commission_index"]()
        out(f"  list_commission_index() -> {index}")
        assert summary in index and len(index) == 2
        with pytest.raises(Exception) as info:
            entries["get_commission_summary"](commission_id=UNKNOWN_ID)
        print(f"  get_commission_summary(commission_id={UNKNOWN_ID!r}) -> raised label={info.value.label} "
              f"error_body={info.value.error_body}")
        assert info.value.label == 404 and info.value.error_body["code"] == "ERR_NOT_FOUND"

        # 8 (in_process). Same real lock, on the three in_process entries.
        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        try:
            for name, kw in (("get_client_summary", {"client_id": cid}),
                             ("get_commission_summary", {"commission_id": mid}),
                             ("list_commission_index", {})):
                with pytest.raises(Exception) as info:
                    entries[name](**kw)
                print(f"  [lock] {name}({kw}) -> raised label={info.value.label} "
                      f"error_body={info.value.error_body}")
                assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
        finally:
            locker.execute("ROLLBACK")
            locker.close()
    finally:
        db.close()


def payment_body(commission_id, **over):
    data = {
        "direction": "incoming",
        "kind": "deposit",
        "amount": {"amount_minor": 500000, "currency": "VND"},
        "method": "bank_transfer",
        "paid_at": "2026-09-20T10:00:00+07:00",
        "note": "Cọc 50%",
    }
    data.update(over)
    return {"commission_id": commission_id, "payment_input": data}


def test_process_payments_balance_void_restart_ledger_and_storage_failure(tmp_path):
    """record_payment on the real process (EVIDENCE items 1-8 of the plan)."""
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run 1] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    print("[run 1] stdout line 1: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as http:
        # 1. client, commission in VND (agreed 1,000,000), a deposit (201)
        cid = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Nguyễn Thu Hà", "contacts": [], "note": None}}).json()["client_id"]
        mid = call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price={"amount_minor": 1000000, "currency": "VND"})).json()["commission_id"]
        r = call(http, "POST", "/payments", json=payment_body(mid))
        assert r.status_code == 201
        deposit = r.json()
        assert set(deposit) == {"payment_id", "commission_id", "direction", "kind", "amount", "method",
                                "paid_at", "note", "is_voided"}
        assert deposit["is_voided"] is False and deposit["paid_at"] == "2026-09-20T10:00:00+07:00"

        # 2. errors
        assert_error(call(http, "POST", "/payments", json=payment_body(UNKNOWN_ID)), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "POST", "/payments", json=payment_body(
            mid, amount={"amount_minor": 20, "currency": "USD"})), 422, "ERR_CURRENCY_MISMATCH")
        assert_error(call(http, "POST", "/payments", json=payment_body(
            mid, amount={"amount_minor": 0, "currency": "VND"})), 400, "ERR_VALIDATION")
        assert_error(call(http, "POST", "/payments", json=payment_body(
            mid, amount={"amount_minor": 2**53, "currency": "VND"})), 400, "ERR_VALIDATION")
        assert_error(call(http, "POST", "/payments", json=payment_body(
            mid, paid_at="2026-09-20T10:00:00")), 400, "ERR_VALIDATION")

        # 3. more incoming and a refund; balance at each step; overpayment
        #    makes outstanding negative.
        def balance():
            r = call(http, "GET", f"/payments/balance/{mid}")
            assert r.status_code == 200
            b = r.json()
            assert set(b) == {"commission_id", "agreed", "received_net", "outstanding"}
            return b["agreed"]["amount_minor"], b["received_net"]["amount_minor"], b["outstanding"]["amount_minor"]

        assert balance() == (1000000, 500000, 500000)
        milestone = call(http, "POST", "/payments", json=payment_body(
            mid, kind="milestone", amount={"amount_minor": 300000, "currency": "VND"}, method="momo",
            paid_at="2026-09-22T08:30:00Z", note=None)).json()                      # 15:30 +07:00
        assert balance() == (1000000, 800000, 200000)
        refund = call(http, "POST", "/payments", json=payment_body(
            mid, direction="refund", kind="other", amount={"amount_minor": 100000, "currency": "VND"},
            paid_at="2026-09-22T09:00:00-05:00", note="Hoàn phí sửa")).json()     # 21:00 +07:00
        assert balance() == (1000000, 700000, 300000)
        final = call(http, "POST", "/payments", json=payment_body(
            mid, kind="final", amount={"amount_minor": 450000, "currency": "VND"},
            paid_at="2026-09-23T09:00:00+07:00", note="Trả dư 150.000")).json()
        assert balance() == (1000000, 1150000, -150000)

        # 4. void (200), void again (409), unknown (404); balance drops it
        r = call(http, "PUT", f"/payments/{final['payment_id']}/void")
        assert r.status_code == 200 and r.json() == {**final, "is_voided": True}
        assert_error(call(http, "PUT", f"/payments/{final['payment_id']}/void"), 409, "ERR_CONFLICT")
        assert_error(call(http, "PUT", f"/payments/{UNKNOWN_ID}/void"), 404, "ERR_NOT_FOUND")
        assert balance() == (1000000, 700000, 300000)

        # 5. the list keeps the voided entry, newest first by real instant.
        #    As strings, "2026-09-22T09:00:00-05:00" sorts before
        #    "2026-09-22T08:30:00Z" the wrong way round.
        r = call(http, "GET", f"/payments?commission_id={mid}")
        assert r.status_code == 200
        listed = r.json()
        assert [p["payment_id"] for p in listed] == [
            final["payment_id"], refund["payment_id"], milestone["payment_id"], deposit["payment_id"]]
        assert [p["is_voided"] for p in listed] == [True, False, False, False]
        assert_error(call(http, "GET", f"/payments?commission_id={UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")

        # 8. a real storage failure over http
        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        print("  [lock] another connection holds BEGIN EXCLUSIVE on the database file")
        try:
            for method, url, kw in (
                ("POST", "/payments", {"json": payment_body(mid)}),
                ("GET", f"/payments?commission_id={mid}", {}),
                ("PUT", f"/payments/{deposit['payment_id']}/void", {}),
                ("GET", f"/payments/balance/{mid}", {}),
            ):
                assert_error(call(http, method, url, **kw), 500, "ERR_STORAGE_IO")
        finally:
            locker.execute("ROLLBACK")
            locker.close()
        print("  [lock] released")
        assert balance() == (1000000, 700000, 300000)

    code = backend.close_stdin_and_wait()
    print(f"[run 1] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]

    # 6. data survives a restart
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready()
    print(f"[run 2] same db, port={port2}: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port2}", timeout=10) as http:
        r = call(http, "GET", f"/payments?commission_id={mid}")
        assert r.status_code == 200 and r.json() == listed
        r = call(http, "GET", f"/payments/balance/{mid}")
        assert r.status_code == 200 and r.json()["outstanding"] == {"amount_minor": 300000, "currency": "VND"}
    code2 = backend2.close_stdin_and_wait()
    print(f"[run 2] stdin closed -> exit code {code2}")
    assert code2 == 0

    # 7. list_payment_ledger, called as the Routers function, wired exactly
    #    as the Main wires it, on the same database file.
    sys.path.insert(0, str(LAYER_ROOT))
    import Backend
    from workflows.scaffold_backend import adapters as scaffold

    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    db = scaffold.open_connection(str(db_file), **configs["scaffold_backend"])
    try:
        entries = Backend.wire_workflows(Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE)), db, configs)
        ledger = entries["list_payment_ledger"]()
        out(f"  list_payment_ledger() -> {ledger}")
        assert {e["payment_id"] for e in ledger} == {
            deposit["payment_id"], milestone["payment_id"], refund["payment_id"]}
        assert all(set(e) == {"payment_id", "commission_id", "direction", "kind", "amount", "paid_at"}
                   for e in ledger)

        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        try:
            with pytest.raises(Exception) as info:
                entries["list_payment_ledger"]()
            print(f"  [lock] list_payment_ledger() -> raised label={info.value.label} "
                  f"error_body={info.value.error_body}")
            assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
        finally:
            locker.execute("ROLLBACK")
            locker.close()
    finally:
        db.close()


def _together(calls):
    # Start every call at the same moment, each on its own thread.
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


def test_process_payments_computed_integer_rule_and_offset_minutes(tmp_path):
    """record_payment on the real process: Data Schema 3.0.0 computed-integer
    rule (409 ERR_OUT_OF_RANGE) and paid_at offset minutes >= 60 (400)."""
    max_int = 2**53 - 1
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    base = f"http://127.0.0.1:{port}"
    with httpx.Client(base_url=base, timeout=30) as http:
        cid = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Nguyễn Thu Hà", "contacts": [], "note": None}}).json()["client_id"]

        def usd(amount):
            return {"amount_minor": amount, "currency": "USD"}

        def new_max_commission():
            return call(http, "POST", "/commissions", json=commission_input(
                cid, agreed_price=usd(max_int))).json()["commission_id"]

        # 1. agreed 2^53-1: first payment 2^53-1 -> 201, second -> 409, list keeps one
        m1 = new_max_commission()
        assert call(http, "POST", "/payments", json=payment_body(m1, amount=usd(max_int))).status_code == 201
        assert_error(call(http, "POST", "/payments", json=payment_body(m1, amount=usd(max_int))),
                     409, "ERR_OUT_OF_RANGE")
        r = call(http, "GET", f"/payments?commission_id={m1}")
        assert r.status_code == 200 and len(r.json()) == 1

        # 2. incoming 10, refund 5, then void the incoming: void 200,
        #    get_balance 409 (outstanding = 2^53-1 + 5)
        m2 = new_max_commission()
        incoming = call(http, "POST", "/payments", json=payment_body(m2, amount=usd(10))).json()
        assert call(http, "POST", "/payments", json=payment_body(
            m2, direction="refund", kind="other", amount=usd(5))).status_code == 201
        r = call(http, "GET", f"/payments/balance/{m2}")
        assert r.status_code == 200 and r.json()["outstanding"]["amount_minor"] == max_int - 5
        r = call(http, "PUT", f"/payments/{incoming['payment_id']}/void")
        assert r.status_code == 200 and r.json()["is_voided"] is True
        assert_error(call(http, "GET", f"/payments/balance/{m2}"), 409, "ERR_OUT_OF_RANGE")

        # 3. a refund that puts outstanding out of range is refused
        m3 = new_max_commission()
        assert_error(call(http, "POST", "/payments", json=payment_body(
            m3, direction="refund", kind="other", amount=usd(1))), 409, "ERR_OUT_OF_RANGE")
        assert call(http, "GET", f"/payments?commission_id={m3}").json() == []

        # 4. paid_at with offset minutes >= 60 -> 400 (was read as +08:00)
        assert_error(call(http, "POST", "/payments", json=payment_body(
            m3, amount=usd(1), paid_at="2026-09-20T10:00:00+07:60")), 400, "ERR_VALIDATION")

        # 5. two concurrent 2^53-1 payments on a fresh 2^53-1 commission
        m4 = new_max_commission()

        def post_max():
            with httpx.Client(base_url=base, timeout=30) as h:
                return h.post("/payments", json=payment_body(m4, amount=usd(max_int))).status_code

        codes = _together([post_max, post_max])
        print(f"  concurrent: 2 x POST /payments 2^53-1 on {m4} -> {sorted(codes)}")
        assert sorted(codes) == [201, 409]
        assert len(call(http, "GET", f"/payments?commission_id={m4}").json()) == 1

    code = backend.close_stdin_and_wait()
    print(f"[run] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]


def stage_change(to_stage, note=None):
    return {"stage_change": {"to_stage": to_stage, "note": note}}


def test_process_progress_stages_history_board_restart_and_storage_failure(tmp_path):
    """update_progress on the real process (EVIDENCE items 1-8 of the plan)."""
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run 1] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    print("[run 1] stdout line 1: READY")
    base = f"http://127.0.0.1:{port}"
    with httpx.Client(base_url=base, timeout=30) as http:
        cid = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Nguyễn Thu Hà", "contacts": [], "note": None}}).json()["client_id"]
        mid = call(http, "POST", "/commissions", json=commission_input(cid)).json()["commission_id"]
        other = call(http, "POST", "/commissions", json=commission_input(cid, title="Toàn thân")).json()["commission_id"]
        untouched = call(http, "POST", "/commissions", json=commission_input(cid, title="Chibi")).json()["commission_id"]

        # 1. a new commission
        r = call(http, "GET", f"/commissions/{mid}/stage")
        assert r.status_code == 200 and r.json() == {
            "commission_id": mid, "current_stage": "queued", "stage_kind": "active", "updated_at": None}
        r = call(http, "GET", f"/commissions/{mid}/stage/history")
        assert r.status_code == 200 and r.json() == []
        r = call(http, "GET", "/progress/board")
        assert r.status_code == 200 and mid not in {e["commission_id"] for e in r.json()}
        assert_error(call(http, "PUT", f"/commissions/{mid}/stage", json=stage_change("queued")),
                     409, "ERR_INVALID_TRANSITION")

        # 2. queued -> sketch -> on_hold -> sketch -> delivered, then nothing more
        for to_stage, note in (("sketch", "Bắt đầu phác thảo"), ("on_hold", "Chờ khách duyệt"),
                               ("sketch", None), ("delivered", "Đã gửi file")):
            r = call(http, "PUT", f"/commissions/{mid}/stage", json=stage_change(to_stage, note))
            assert r.status_code == 200 and r.json()["current_stage"] == to_stage
            assert set(r.json()) == {"commission_id", "current_stage", "stage_kind", "updated_at"}
            assert r.json()["updated_at"] is not None
        delivered_state = r.json()
        assert delivered_state["stage_kind"] == "finished"
        for to_stage in ("sketch", "cancelled"):
            assert_error(call(http, "PUT", f"/commissions/{mid}/stage", json=stage_change(to_stage)),
                         409, "ERR_INVALID_TRANSITION")

        # 3. another commission cancelled, then nothing more
        assert call(http, "PUT", f"/commissions/{other}/stage", json=stage_change("cancelled")).status_code == 200
        assert_error(call(http, "PUT", f"/commissions/{other}/stage", json=stage_change("sketch")),
                     409, "ERR_INVALID_TRANSITION")

        # 4. errors
        assert_error(call(http, "PUT", f"/commissions/{UNKNOWN_ID}/stage", json=stage_change("sketch")),
                     404, "ERR_NOT_FOUND")
        assert_error(call(http, "GET", f"/commissions/{UNKNOWN_ID}/stage"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "GET", f"/commissions/{UNKNOWN_ID}/stage/history"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "PUT", f"/commissions/{untouched}/stage", json=stage_change("painting")),
                     400, "ERR_VALIDATION")
        assert_error(call(http, "PUT", f"/commissions/{untouched}/stage",
                          json={"stage_change": {"to_stage": "sketch"}}), 400, "ERR_VALIDATION")
        assert_error(call(http, "PUT", "/commissions/not-an-id/stage", json=stage_change("sketch")),
                     400, "ERR_VALIDATION")
        assert_error(call(http, "GET", "/commissions/not-an-id/stage"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "GET", "/commissions/not-an-id/stage/history"), 404, "ERR_NOT_FOUND")

        # 5. history, board, stages
        r = call(http, "GET", f"/commissions/{mid}/stage/history")
        assert r.status_code == 200
        history = r.json()
        assert [(h["from_stage"], h["to_stage"], h["note"]) for h in history] == [
            (None, "sketch", "Bắt đầu phác thảo"), ("sketch", "on_hold", "Chờ khách duyệt"),
            ("on_hold", "sketch", None), ("sketch", "delivered", "Đã gửi file")]
        assert all(set(h) == {"from_stage", "to_stage", "note", "changed_at"} for h in history)
        assert history[-1]["changed_at"] == delivered_state["updated_at"]
        r = call(http, "GET", "/progress/board")
        assert r.status_code == 200
        board = sorted(r.json(), key=lambda e: e["commission_id"])
        assert board == sorted([
            {"commission_id": mid, "current_stage": "delivered", "stage_kind": "finished"},
            {"commission_id": other, "current_stage": "cancelled", "stage_kind": "cancelled"},
        ], key=lambda e: e["commission_id"])
        r = call(http, "GET", "/progress/stages")
        assert r.status_code == 200 and [s["stage"] for s in r.json()] == [
            "queued", "sketch", "lineart", "coloring", "rendering", "final_review", "revision", "completed",
            "on_hold", "delivered", "cancelled"]
        assert all(set(s) == {"stage", "kind"} for s in r.json())
        stages = r.json()

        # concurrent changes on one commission: the chain never breaks
        def put(to_stage):
            def go():
                with httpx.Client(base_url=base, timeout=30) as h:
                    return h.put(f"/commissions/{untouched}/stage", json=stage_change(to_stage)).status_code
            return go

        codes = _together([put("sketch"), put("lineart")])
        chain = call(http, "GET", f"/commissions/{untouched}/stage/history").json()
        print(f"  concurrent: PUT sketch + PUT lineart on {untouched} -> {codes}, "
              f"chain {[(h['from_stage'], h['to_stage']) for h in chain]}")
        assert codes == [200, 200] and chain[0]["from_stage"] is None
        assert chain[1]["from_stage"] == chain[0]["to_stage"]

        # 8. a real storage failure over http; list_stages still answers
        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        print("  [lock] another connection holds BEGIN EXCLUSIVE on the database file")
        try:
            for method, url, kw in (
                ("PUT", f"/commissions/{untouched}/stage", {"json": stage_change("coloring")}),
                ("GET", f"/commissions/{mid}/stage", {}),
                ("GET", f"/commissions/{mid}/stage/history", {}),
                ("GET", "/progress/board", {}),
            ):
                assert_error(call(http, method, url, **kw), 500, "ERR_STORAGE_IO")
            r = call(http, "GET", "/progress/stages")
            assert r.status_code == 200 and r.json() == stages
        finally:
            locker.execute("ROLLBACK")
            locker.close()
        print("  [lock] released")
        final_state = call(http, "GET", f"/commissions/{untouched}/stage").json()
        assert len(call(http, "GET", f"/commissions/{untouched}/stage/history").json()) == 2

    code = backend.close_stdin_and_wait()
    print(f"[run 1] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]

    # 6. data survives a restart
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready()
    print(f"[run 2] same db, port={port2}: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port2}", timeout=10) as http:
        r = call(http, "GET", f"/commissions/{mid}/stage")
        assert r.status_code == 200 and r.json() == delivered_state
        r = call(http, "GET", f"/commissions/{mid}/stage/history")
        assert r.status_code == 200 and r.json() == history
        assert call(http, "GET", f"/commissions/{untouched}/stage").json() == final_state
        assert len(call(http, "GET", "/progress/board").json()) == 3
    code2 = backend2.close_stdin_and_wait()
    print(f"[run 2] stdin closed -> exit code {code2}")
    assert code2 == 0

    # 7. list_progress_board, called as the Routers function, wired exactly
    #    as the Main wires it, on the same database file.
    sys.path.insert(0, str(LAYER_ROOT))
    import Backend
    from workflows.scaffold_backend import adapters as scaffold

    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    db = scaffold.open_connection(str(db_file), **configs["scaffold_backend"])
    try:
        entries = Backend.wire_workflows(Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE)), db, configs)
        board = entries["list_progress_board"]()
        out(f"  list_progress_board() -> {board}")
        assert len(board) == 3 and all(set(e) == {"commission_id", "current_stage", "stage_kind"} for e in board)
        assert {"commission_id": mid, "current_stage": "delivered", "stage_kind": "finished"} in board

        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        try:
            with pytest.raises(Exception) as info:
                entries["list_progress_board"]()
            print(f"  [lock] list_progress_board() -> raised label={info.value.label} "
                  f"error_body={info.value.error_body}")
            assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
        finally:
            locker.execute("ROLLBACK")
            locker.close()
    finally:
        db.close()


@pytest.mark.parametrize(
    "catalog",
    [
        [{"stage": "on_hold", "kind": "on_hold"}, {"stage": "queued", "kind": "active"}],
        [{"stage": "queued", "kind": "active"}, {"stage": "queued", "kind": "finished"}],
    ],
    ids=["first-not-active", "duplicate-name"],
)
def test_unusable_stage_catalog_exits_nonzero_without_ready(tmp_path, catalog):
    # 9. The real Main, with update_progress Configs pointing to a broken catalog.
    import yaml

    cfg_file = tmp_path / "update_progress.yaml"
    cfg_file.write_text(yaml.safe_dump({"stage_catalog": catalog}), encoding="utf-8")
    env = launch_env(tmp_path / "data.db", free_port())
    script = textwrap.dedent(
        f"""
        import sys
        from pathlib import Path
        import Backend
        Backend.WORKFLOW_CONFIG_FILES["update_progress"] = Path({str(cfg_file)!r})
        sys.exit(Backend.main())
        """
    )
    proc = subprocess.run(
        [sys.executable, "-c", script], cwd=LAYER_ROOT, env=env,
        stdin=subprocess.PIPE, capture_output=True, timeout=EXIT_TIMEOUT_S,
    )
    err = proc.stderr.decode(errors="replace").strip().splitlines()
    reason = next((line for line in reversed(err) if "InvalidStageCatalogError" in line), err[-1])
    print(f"\n  catalog {catalog} -> exit code {proc.returncode}, stdout={proc.stdout!r}, stderr: {reason!r}")
    assert proc.returncode != 0
    assert b"READY" not in proc.stdout


def test_process_payments_tip_rule_and_ledger_kind(tmp_path):
    """record_payment on the real process, Data Schema 4.0.0: a tip counts in
    received_net, never in outstanding; payment_ledger carries kind."""
    max_int = 2**53 - 1
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as http:
        cid = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Nguyễn Thu Hà", "contacts": [], "note": None}}).json()["client_id"]

        def vnd(amount):
            return {"amount_minor": amount, "currency": "VND"}

        # 1. commission 1,000,000 VND paid in full, then a tip of 100,000
        mid = call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price=vnd(1000000))).json()["commission_id"]
        assert call(http, "POST", "/payments", json=payment_body(
            mid, kind="final", amount=vnd(1000000), note=None)).status_code == 201
        tip = call(http, "POST", "/payments", json=payment_body(
            mid, kind="tip", amount=vnd(100000), paid_at="2026-09-21T10:00:00+07:00", note="Tip")).json()
        r = call(http, "GET", f"/payments/balance/{mid}")
        assert r.status_code == 200
        assert r.json()["received_net"] == vnd(1100000) and r.json()["outstanding"] == vnd(0)

        # 2. refund of the tip: outstanding stays 0
        refund = call(http, "POST", "/payments", json=payment_body(
            mid, direction="refund", kind="tip", amount=vnd(100000),
            paid_at="2026-09-22T10:00:00+07:00", note=None)).json()
        r = call(http, "GET", f"/payments/balance/{mid}")
        assert r.status_code == 200
        assert r.json()["received_net"] == vnd(1000000) and r.json()["outstanding"] == vnd(0)

        # 3. a tip that puts received_net out of range -> 409, nothing written
        usd_mid = call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price={"amount_minor": max_int, "currency": "USD"})).json()["commission_id"]
        assert call(http, "POST", "/payments", json=payment_body(
            usd_mid, kind="final", amount={"amount_minor": max_int, "currency": "USD"})).status_code == 201
        r = call(http, "GET", f"/payments/balance/{usd_mid}")
        assert r.json()["outstanding"]["amount_minor"] == 0
        r = call(http, "POST", "/payments", json=payment_body(
            usd_mid, kind="tip", amount={"amount_minor": 1, "currency": "USD"}))
        assert_error(r, 409, "ERR_OUT_OF_RANGE")
        assert r.json()["details"]["fields"] == ["received_net"]
        assert len(call(http, "GET", f"/payments?commission_id={usd_mid}").json()) == 1
    code = backend.close_stdin_and_wait()
    print(f"[run] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]

    # 4. list_payment_ledger (Routers function, wired as the Main wires it)
    sys.path.insert(0, str(LAYER_ROOT))
    import Backend
    from workflows.scaffold_backend import adapters as scaffold

    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    db = scaffold.open_connection(str(db_file), **configs["scaffold_backend"])
    try:
        ledger = Backend.wire_workflows(Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE)), db, configs)["list_payment_ledger"]()
        out(f"  list_payment_ledger() -> {ledger}")
        assert len(ledger) == 4
        assert all(set(e) == {"payment_id", "commission_id", "direction", "kind", "amount", "paid_at"}
                   for e in ledger)
        by_id = {e["payment_id"]: e for e in ledger}
        assert by_id[tip["payment_id"]]["kind"] == "tip" and by_id[refund["payment_id"]]["kind"] == "tip"
    finally:
        db.close()


def report_scenario(http):
    """Data for the income report EVIDENCE. Returns {name: commission_id}.

    A  VND 1,000,000  delivered (finished)  07-25 other 100,000 (outside the
       period); 08-10 deposit 500,000; 09-30T23:30-05:00 milestone 300,000
    B  VND 2,000,000  no stage set          10-01T00:30+07:00 deposit 1,000,000;
       10-15 final 1,200,000 (overpaid); 10-16 tip 150,000
    C  VND   800,000  cancelled             08-20 deposit 300,000; 09-05 refund 100,000
    D  USD    50,000  sketch (active)       09-12 deposit 20,000; 09-13 milestone
       10,000, voided
    E  USD    30,000  on_hold               no payment
    """
    cid = call(http, "POST", "/clients", json={"client_input": {
        "display_name": "Nguyễn Thu Hà", "contacts": [], "note": None}}).json()["client_id"]
    agreed = {"A": (1000000, "VND"), "B": (2000000, "VND"), "C": (800000, "VND"),
              "D": (50000, "USD"), "E": (30000, "USD")}
    ids = {}
    for name, (amount, currency) in agreed.items():
        r = call(http, "POST", "/commissions", json=commission_input(
            cid, title=f"Đơn {name}", agreed_price={"amount_minor": amount, "currency": currency}))
        assert r.status_code == 201
        ids[name] = r.json()["commission_id"]
    for name, stage in (("A", "delivered"), ("C", "cancelled"), ("D", "sketch"), ("E", "on_hold")):
        assert call(http, "PUT", f"/commissions/{ids[name]}/stage", json=stage_change(stage)).status_code == 200

    def pay(name, direction, kind, amount, paid_at):
        currency = agreed[name][1]
        r = call(http, "POST", "/payments", json=payment_body(
            ids[name], direction=direction, kind=kind,
            amount={"amount_minor": amount, "currency": currency}, paid_at=paid_at, note=None))
        assert r.status_code == 201
        return r.json()

    pay("A", "incoming", "other", 100000, "2026-07-25T09:00:00+07:00")
    pay("A", "incoming", "deposit", 500000, "2026-08-10T10:00:00+07:00")
    pay("A", "incoming", "milestone", 300000, "2026-09-30T23:30:00-05:00")
    pay("B", "incoming", "deposit", 1000000, "2026-10-01T00:30:00+07:00")
    pay("B", "incoming", "final", 1200000, "2026-10-15T09:00:00+07:00")
    pay("B", "incoming", "tip", 150000, "2026-10-16T09:00:00+07:00")
    pay("C", "incoming", "deposit", 300000, "2026-08-20T10:00:00+07:00")
    pay("C", "refund", "other", 100000, "2026-09-05T10:00:00+07:00")
    pay("D", "incoming", "deposit", 20000, "2026-09-12T08:00:00Z")
    voided = pay("D", "incoming", "milestone", 10000, "2026-09-13T08:00:00Z")
    assert call(http, "PUT", f"/payments/{voided['payment_id']}/void").status_code == 200
    return ids


REPORT_KEYS = {"period_from", "period_to", "currencies", "generated_at"}
CURRENCY_KEYS = {"currency", "received_net_minor", "refunded_minor", "outstanding_minor", "by_month"}


def get_report(http, period_from, period_to):
    r = call(http, "GET", f"/reports/income?period_from={period_from}&period_to={period_to}")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == REPORT_KEYS
    assert body["period_from"] == period_from and body["period_to"] == period_to
    assert all(set(c) == CURRENCY_KEYS for c in body["currencies"])
    return body


def totals(currency, received_net, refunded, outstanding, by_month):
    return {"currency": currency, "received_net_minor": received_net, "refunded_minor": refunded,
            "outstanding_minor": outstanding,
            "by_month": [{"month": m, "received_net_minor": v} for m, v in by_month]}


def test_process_income_report_totals_boundaries_restart_and_storage_failure(tmp_path):
    """view_income_report on the real process (plan: EVIDENCE items 1-6, 8, 9).

    Hand computation, period 2026-08-01..2026-10-31:
      VND received_net = A 500,000 + A 300,000 + B 1,000,000 + B 1,200,000
                         + B tip 150,000 + C 300,000 - C refund 100,000 = 3,350,000
          refunded     = 100,000 (C)
          by_month     = 08: 500,000 + 300,000 = 800,000
                         09: 300,000 (A, 09-30 at -05:00) - 100,000 = 200,000
                         10: 1,000,000 + 1,200,000 + 150,000 = 2,350,000
          outstanding  = A 1,000,000 - (100,000 + 500,000 + 300,000) = 100,000
                         + B 2,000,000 - (1,000,000 + 1,200,000) = -200,000 (tip ignored)
                         (C cancelled: not owing)            = -100,000
      USD received_net = D 20,000 (voided 10,000 ignored); refunded 0;
          by_month 09: 20,000; outstanding = D 50,000 - 20,000 + E 30,000 = 60,000
    """
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run 1] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as http:
        # 5b. nothing at all -> currencies []
        assert get_report(http, "2026-01-01", "2026-12-31")["currencies"] == []

        ids = report_scenario(http)
        out(f"  commissions: {ids}")

        # 1. every number of every currency, three months
        full = get_report(http, "2026-08-01", "2026-10-31")
        assert full["currencies"] == [
            totals("USD", 20000, 0, 60000, [("2026-09", 20000)]),
            totals("VND", 3350000, 100000, -100000,
                   [("2026-08", 800000), ("2026-09", 200000), ("2026-10", 2350000)]),
        ]

        # 2. dates in their own offset: 09-30T23:30-05:00 is in September,
        #    10-01T00:30+07:00 is not
        sept = get_report(http, "2026-09-01", "2026-09-30")
        assert sept["currencies"] == [
            totals("USD", 20000, 0, 60000, [("2026-09", 20000)]),
            totals("VND", 200000, 100000, -100000, [("2026-09", 200000)]),
        ]
        oct1 = get_report(http, "2026-10-01", "2026-10-01")
        assert oct1["currencies"][1] == totals("VND", 1000000, 0, -100000, [("2026-10", 1000000)])

        # 3. + 5a. a one-day period: only A's 09-30 payment; USD is owing
        #    without any payment that day -> present, by_month []
        day = get_report(http, "2026-09-30", "2026-09-30")
        assert day["currencies"] == [
            totals("USD", 0, 0, 60000, []),
            totals("VND", 300000, 0, -100000, [("2026-09", 300000)]),
        ]

        # 4. the voided payment (09-13) counts nowhere; C's money counts in
        #    received_net but C is not in outstanding (shown by 1. above)
        voided_day = get_report(http, "2026-09-13", "2026-09-13")
        assert voided_day["currencies"][0] == totals("USD", 0, 0, 60000, [])

        # 6. 400
        for query in ("", "?period_from=2026-09-01", "?period_to=2026-09-30",
                      "?period_from=2026-9-01&period_to=2026-09-30",
                      "?period_from=2026-02-30&period_to=2026-03-01",
                      "?period_from=2026-10-01&period_to=2026-09-30"):
            assert_error(call(http, "GET", f"/reports/income{query}"), 400, "ERR_VALIDATION")

        # 8. a real storage failure -> 500 + error_body
        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        try:
            assert_error(call(http, "GET", "/reports/income?period_from=2026-08-01&period_to=2026-10-31"),
                         500, "ERR_STORAGE_IO")
        finally:
            locker.execute("ROLLBACK")
            locker.close()
        assert get_report(http, "2026-08-01", "2026-10-31")["currencies"] == full["currencies"]
    code = backend.close_stdin_and_wait()
    print(f"[run 1] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]

    # 9. same result after a restart (except generated_at)
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready()
    print(f"[run 2] same db, port={port2}: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port2}", timeout=30) as http:
        again = get_report(http, "2026-08-01", "2026-10-31")
        assert {k: v for k, v in again.items() if k != "generated_at"} == {
            k: v for k, v in full.items() if k != "generated_at"}
    code2 = backend2.close_stdin_and_wait()
    print(f"[run 2] stdin closed -> exit code {code2}")
    assert code2 == 0


def test_process_income_report_out_of_range(tmp_path):
    """view_income_report on the real process (plan: EVIDENCE item 7): two
    owing USD commissions of 2^53-1 each -> outstanding_minor 2^54-2 -> 409."""
    max_int = 2**53 - 1
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as http:
        cid = call(http, "POST", "/clients", json={"client_input": {
            "display_name": "Nguyễn Thu Hà", "contacts": [], "note": None}}).json()["client_id"]
        call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price={"amount_minor": max_int, "currency": "USD"}))
        one = get_report(http, "2026-09-01", "2026-09-30")
        assert one["currencies"] == [totals("USD", 0, 0, max_int, [])]
        call(http, "POST", "/commissions", json=commission_input(
            cid, agreed_price={"amount_minor": max_int, "currency": "USD"}))
        r = call(http, "GET", "/reports/income?period_from=2026-09-01&period_to=2026-09-30")
        assert_error(r, 409, "ERR_OUT_OF_RANGE")
        assert r.json()["details"] == {"fields": ["USD.outstanding_minor"]}
    code = backend.close_stdin_and_wait()
    print(f"[run] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]


def test_process_income_report_storage_failure_on_second_and_third_call(tmp_path):
    """view_income_report on the real process: a real storage failure behind
    its second call (list_progress_board of update_progress) and its third
    call (list_payment_ledger of record_payment).

    The test (never workflow code) renames the called workflow's table from a
    separate sqlite3 connection: the first call(s) still succeed, the failing
    one answers 500, and view_income_report answers 500 + ERR_STORAGE_IO with
    the called workflow's name as prefix of details.reason. Renaming back
    restores an identical report.
    """
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    url = "/reports/income?period_from=2026-08-01&period_to=2026-10-31"
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as http:
        report_scenario(http)
        before = get_report(http, "2026-08-01", "2026-10-31")

        for table, workflow in (("stage_change", "update_progress"), ("payment", "record_payment")):
            other = sqlite3.connect(str(db_file), isolation_level=None)
            try:
                other.execute(f"ALTER TABLE {table} RENAME TO {table}_hidden")
                print(f"  [rename] {table} -> {table}_hidden (separate sqlite3 connection)")
                r = call(http, "GET", url)
                assert_error(r, 500, "ERR_STORAGE_IO")
                assert r.json()["details"]["reason"].startswith(f"{workflow}: ")
            finally:
                other.execute(f"ALTER TABLE {table}_hidden RENAME TO {table}")
                other.close()
            print(f"  [rename] {table}_hidden -> {table}")
            after = get_report(http, "2026-08-01", "2026-10-31")
            assert {k: v for k, v in after.items() if k != "generated_at"} == {
                k: v for k, v in before.items() if k != "generated_at"}
    code = backend.close_stdin_and_wait()
    print(f"[run] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]


PROFILE_KEYS = {"profile_id", "display_name", "legal_name", "contact", "ownership_statement", "default_strength"}


def profile_body(**over):
    data = {
        "display_name": "Mây Vẽ",
        "legal_name": "Nguyễn Thu Hà",
        "contact": "may.ve@example.com",
        "ownership_statement": "Mọi tác phẩm thuộc quyền sở hữu của Mây Vẽ.",
        "default_strength": "balanced",
    }
    data.update(over)
    return {"profile_input": data}


def test_process_watermark_profiles_crud_errors_restart_in_process_and_storage_failure(tmp_path):
    """manage_watermark_profile on the real process (plan: EVIDENCE items 1-8)."""
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run 1] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    print("[run 1] stdout line 1: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=30) as http:
        # 1. a full profile, one whose three free fields are null, and an
        #    80-character display_name
        r = call(http, "POST", "/watermark-profiles", json=profile_body())
        assert r.status_code == 201 and set(r.json()) == PROFILE_KEYS
        pid = r.json()["profile_id"]
        r = call(http, "POST", "/watermark-profiles", json=profile_body(
            display_name="bút chì", legal_name=None, contact=None, ownership_statement=None,
            default_strength="subtle"))
        assert r.status_code == 201 and set(r.json()) == PROFILE_KEYS
        bare = r.json()
        assert (bare["legal_name"], bare["contact"], bare["ownership_statement"]) == (None, None, None)
        r = call(http, "POST", "/watermark-profiles", json=profile_body(display_name="Á" * 80))
        assert r.status_code == 201 and r.json()["display_name"] == "Á" * 80
        eighty = r.json()

        # 2. 400 on POST and PUT
        missing = {"profile_input": {k: v for k, v in profile_body()["profile_input"].items() if k != "contact"}}
        for body in (profile_body(display_name=""), profile_body(display_name="Á" * 81), missing,
                     profile_body(website="https://may.ve"), profile_body(default_strength="strong"),
                     profile_body(legal_name=123)):
            assert_error(call(http, "POST", "/watermark-profiles", json=body), 400, "ERR_VALIDATION")
            assert_error(call(http, "PUT", f"/watermark-profiles/{pid}", json=body), 400, "ERR_VALIDATION")
        assert_error(call(http, "PUT", "/watermark-profiles/not-an-id", json=profile_body()),
                     400, "ERR_VALIDATION")

        # 3. edit replaces the five fields, keeps the id; unknown -> 404
        new = profile_body(display_name="Mây", legal_name=None, contact="fb.com/may.ve",
                           ownership_statement="(c) Mây", default_strength="robust")
        r = call(http, "PUT", f"/watermark-profiles/{pid}", json=new)
        assert r.status_code == 200 and r.json() == {"profile_id": pid, **new["profile_input"]}
        edited = r.json()
        assert_error(call(http, "PUT", f"/watermark-profiles/{UNKNOWN_ID}", json=profile_body()),
                     404, "ERR_NOT_FOUND")

        # 4. get_profile
        r = call(http, "GET", f"/watermark-profiles/{pid}")
        assert r.status_code == 200 and r.json() == edited
        assert_error(call(http, "GET", f"/watermark-profiles/{UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "GET", "/watermark-profiles/not-an-id"), 404, "ERR_NOT_FOUND")

        # 5. list order: display_name casefold, compared by code point like
        #    client_list ("bút chì" < "mây" < "áá…", since "á" is U+00E1)
        r = call(http, "GET", "/watermark-profiles")
        assert r.status_code == 200
        listed = r.json()
        assert [p["profile_id"] for p in listed] == [bare["profile_id"], pid, eighty["profile_id"]]
        assert all(set(p) == PROFILE_KEYS for p in listed)
        r = call(http, "GET", "/watermark-strengths")
        assert r.status_code == 200 and r.json() == ["subtle", "balanced", "robust"]

        # 8. a real storage failure over http; list_strengths still answers
        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        print("  [lock] another connection holds BEGIN EXCLUSIVE on the database file")
        try:
            for method, url, kw in (
                ("POST", "/watermark-profiles", {"json": profile_body()}),
                ("GET", "/watermark-profiles", {}),
                ("GET", f"/watermark-profiles/{pid}", {}),
                ("PUT", f"/watermark-profiles/{pid}", {"json": profile_body()}),
            ):
                assert_error(call(http, method, url, **kw), 500, "ERR_STORAGE_IO")
            r = call(http, "GET", "/watermark-strengths")
            assert r.status_code == 200 and r.json() == ["subtle", "balanced", "robust"]
        finally:
            locker.execute("ROLLBACK")
            locker.close()
        print("  [lock] released")
        assert call(http, "GET", "/watermark-profiles").json() == listed

    code = backend.close_stdin_and_wait()
    print(f"[run 1] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]

    # 6. data survives a restart
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready()
    print(f"[run 2] same db, port={port2}: READY")
    with httpx.Client(base_url=f"http://127.0.0.1:{port2}", timeout=10) as http:
        r = call(http, "GET", f"/watermark-profiles/{pid}")
        assert r.status_code == 200 and r.json() == edited
        assert call(http, "GET", "/watermark-profiles").json() == listed
    code2 = backend2.close_stdin_and_wait()
    print(f"[run 2] stdin closed -> exit code {code2}")
    assert code2 == 0

    # 7. get_watermark_profile, called as the Routers function, wired exactly
    #    as the Main wires it, on the same database file.
    sys.path.insert(0, str(LAYER_ROOT))
    import Backend
    from workflows.scaffold_backend import adapters as scaffold

    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    db = scaffold.open_connection(str(db_file), **configs["scaffold_backend"])
    try:
        entries = Backend.wire_workflows(Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE)), db, configs)
        record = entries["get_watermark_profile"](profile_id=pid)
        out(f"  get_watermark_profile(profile_id={pid!r}) -> {record}")
        assert record == edited
        with pytest.raises(Exception) as info:
            entries["get_watermark_profile"](profile_id=UNKNOWN_ID)
        print(f"  get_watermark_profile(profile_id={UNKNOWN_ID!r}) -> raised label={info.value.label} "
              f"error_body={info.value.error_body}")
        assert info.value.label == 404 and info.value.error_body["code"] == "ERR_NOT_FOUND"

        locker = sqlite3.connect(str(db_file), isolation_level=None)
        locker.execute("BEGIN EXCLUSIVE")
        try:
            with pytest.raises(Exception) as info:
                entries["get_watermark_profile"](profile_id=pid)
            print(f"  [lock] get_watermark_profile(profile_id={pid!r}) -> raised label={info.value.label} "
                  f"error_body={info.value.error_body}")
            assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
        finally:
            locker.execute("ROLLBACK")
            locker.close()
    finally:
        db.close()


@pytest.mark.parametrize(
    "presets",
    [["subtle", "robust"], ["robust", "balanced", "subtle"], [], ["subtle", "balanced", "robust", "robust"],
     ["subtle", "balanced", "robust", "strong"]],
    ids=["missing", "order", "empty", "duplicate", "extra"],
)
def test_wrong_strength_presets_exit_nonzero_without_ready(tmp_path, presets):
    # 9. The real Main, with manage_watermark_profile Configs pointing to
    #    strength_presets that differ from shared_values.
    import yaml

    cfg_file = tmp_path / "manage_watermark_profile.yaml"
    cfg_file.write_text(yaml.safe_dump({"strength_presets": presets}), encoding="utf-8")
    env = launch_env(tmp_path / "data.db", free_port())
    script = textwrap.dedent(
        f"""
        import sys
        from pathlib import Path
        import Backend
        Backend.WORKFLOW_CONFIG_FILES["manage_watermark_profile"] = Path({str(cfg_file)!r})
        sys.exit(Backend.main())
        """
    )
    proc = subprocess.run(
        [sys.executable, "-c", script], cwd=LAYER_ROOT, env=env,
        stdin=subprocess.PIPE, capture_output=True, timeout=EXIT_TIMEOUT_S,
    )
    err = proc.stderr.decode(errors="replace").strip().splitlines()
    reason = next((line for line in reversed(err) if "InvalidStrengthPresetsError" in line), err[-1])
    print(f"\n  strength_presets {presets} -> exit code {proc.returncode}, stdout={proc.stdout!r}, "
          f"stderr: {reason!r}")
    assert proc.returncode != 0
    assert b"READY" not in proc.stdout


# --- send_reminder ------------------------------------------------------------

def reminder_settings(periodic=None, deadline=None):
    p = {"enabled": False, "every": 1, "unit": "days", "at_time": "09:00", "weekday": None}
    d = {"enabled": False, "lead_times": [{"amount": 1, "unit": "days"}]}
    p.update(periodic or {})
    d.update(deadline or {})
    return {"reminder_settings_input": {"periodic": p, "deadline": d}}


def test_process_reminders_settings_deadline_digest_restart_concurrency_and_storage_failure(tmp_path):
    """send_reminder on the real process, real clock (EVIDENCE items 1-10 of
    the plan of backend session #7)."""
    import time as clock_time
    from datetime import datetime, time, timedelta

    # Keep the whole scenario within one local calendar day.
    now = datetime.now()
    to_midnight = (datetime.combine(now.date() + timedelta(days=1), time()) - now).total_seconds()
    if to_midnight < 300:
        clock_time.sleep(to_midnight + 2)
    today = datetime.now().date()
    yesterday, tomorrow = today - timedelta(days=1), today + timedelta(days=1)

    def local_midnight(day):
        return datetime.combine(day, time()).astimezone().isoformat()

    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    print(f"\n[run 1] python {sys.version.split()[0]} ({sys.executable}), db={db_file}, port={port}, "
          f"local now {datetime.now().astimezone().isoformat(timespec='seconds')}")
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"
    print("[run 1] stdout line 1: READY")
    base = f"http://127.0.0.1:{port}"
    with httpx.Client(base_url=base, timeout=30) as http:
        # 1. Defaults, never saved.
        r = call(http, "GET", "/reminders/settings")
        assert r.status_code == 200 and r.json() == {"settings": {
            "periodic": {"enabled": False, "every": 1, "unit": "weeks", "at_time": "09:00", "weekday": 1},
            "deadline": {"enabled": False, "lead_times": [{"amount": 1, "unit": "days"}]},
        }, "updated_at": None}

        # 2. 400 cases.
        bad = [
            reminder_settings(periodic={"weekday": 1}),
            reminder_settings(periodic={"unit": "weeks", "weekday": None}),
            reminder_settings(deadline={"lead_times": [{"amount": 1, "unit": "days"}, {"amount": 24, "unit": "hours"}]}),
            reminder_settings(deadline={"lead_times": []}),
            reminder_settings(deadline={"lead_times": [{"amount": i, "unit": "hours"} for i in range(1, 7)]}),
            reminder_settings(periodic={"at_time": "24:00"}),
            reminder_settings(periodic={"every": 0}),
        ]
        missing = reminder_settings()
        del missing["reminder_settings_input"]["periodic"]["at_time"]
        bad.append(missing)
        for body in bad:
            assert_error(call(http, "PUT", "/reminders/settings", json=body), 400, "ERR_VALIDATION")

        # 3. Valid save: deadline reminders 1 day and 3 days before.
        deadline_on = reminder_settings(deadline={"enabled": True, "lead_times": [
            {"amount": 1, "unit": "days"}, {"amount": 3, "unit": "days"}]})
        r = call(http, "PUT", "/reminders/settings", json=deadline_on)
        assert r.status_code == 200 and r.json()["updated_at"] is not None
        assert r.json()["settings"] == deadline_on["reminder_settings_input"]

        # 4. Commissions.
        r = call(http, "POST", "/clients", json={"client_input": {"display_name": "Linh", "contacts": [], "note": None}})
        client_id = r.json()["client_id"]

        def commission(title, deadline, stage=None):
            resp = call(http, "POST", "/commissions", json=commission_input(
                client_id, title=title, deadline=deadline.isoformat() if deadline else None))
            assert resp.status_code == 201
            mid = resp.json()["commission_id"]
            if stage:
                assert call(http, "PUT", f"/commissions/{mid}/stage", json=stage_change(stage)).status_code == 200
            return mid

        a = commission("A hạn hôm nay", today)
        b = commission("B hạn hôm nay, tạm dừng", today, "on_hold")
        commission("C hạn hôm nay, đã hủy", today, "cancelled")
        d = commission("D hạn hôm qua", yesterday)
        e = commission("E không hạn", None)

        r = call(http, "POST", "/reminders/checks")
        assert r.status_code == 200
        first = r.json()
        got = sorted((n["deadline_item"]["commission_id"], n["deadline_item"]["lead"]["amount"], n["due_at"]) for n in first)
        assert got == sorted([
            (a, 1, local_midnight(today)), (a, 3, local_midnight(today - timedelta(days=2))),
            (b, 1, local_midnight(today)), (b, 3, local_midnight(today - timedelta(days=2))),
        ])
        assert all(n["kind"] == "deadline" and n["digest"] is None for n in first)
        r = call(http, "POST", "/reminders/checks")
        assert r.status_code == 200 and r.json() == []

        # 5. A's deadline moves to tomorrow: the lead already passed is re-armed.
        r = call(http, "PUT", f"/commissions/{a}", json=commission_input(
            client_id, title="A hạn hôm nay", deadline=tomorrow.isoformat()))
        assert r.status_code == 200
        r = call(http, "POST", "/reminders/checks")
        rearmed = r.json()
        assert [(n["deadline_item"]["commission_id"], n["deadline_item"]["lead"], n["deadline_item"]["deadline"],
                 n["due_at"]) for n in rearmed] == [
            (a, {"amount": 3, "unit": "days"}, tomorrow.isoformat(), local_midnight(yesterday))]

        # 6. Pending, in order; acknowledge twice; 404.
        r = call(http, "GET", "/reminders/pending")
        listed = r.json()
        assert r.status_code == 200 and sorted(n["notification_id"] for n in listed) == sorted(
            n["notification_id"] for n in first + rearmed)
        dues = [datetime.fromisoformat(n["due_at"]) for n in listed]
        assert dues == sorted(dues)
        acked = listed[0]["notification_id"]
        r1 = call(http, "PUT", f"/reminders/{acked}/ack")
        assert r1.status_code == 200 and r1.json()["notification_id"] == acked
        clock_time.sleep(1.1)
        r2 = call(http, "PUT", f"/reminders/{acked}/ack")
        assert r2.status_code == 200 and r2.json() == r1.json()
        r = call(http, "GET", "/reminders/pending")
        assert [n["notification_id"] for n in r.json()] == [n["notification_id"] for n in listed[1:]]
        assert_error(call(http, "PUT", f"/reminders/{UNKNOWN_ID}/ack"), 404, "ERR_NOT_FOUND")
        assert_error(call(http, "PUT", "/reminders/not-an-id/ack"), 404, "ERR_NOT_FOUND")

        # 7. Daily digest at the next minute.
        at = (datetime.now() + timedelta(minutes=1)).replace(second=0, microsecond=0)
        digest_on = reminder_settings(
            periodic={"enabled": True, "every": 1, "unit": "days", "at_time": at.strftime("%H:%M"), "weekday": None},
            deadline=deadline_on["reminder_settings_input"]["deadline"])
        assert call(http, "PUT", "/reminders/settings", json=digest_on).status_code == 200
        r = call(http, "POST", "/reminders/checks")
        assert r.json() == []  # before the occurrence
        clock_time.sleep(max(0.0, (at - datetime.now()).total_seconds()) + 1.5)
        r = call(http, "POST", "/reminders/checks")
        [digest] = r.json()
        assert digest["kind"] == "periodic_digest" and digest["deadline_item"] is None
        assert digest["due_at"] == at.astimezone().isoformat()
        assert digest["digest"] == {"open_count": 4, "upcoming": [
            {"commission_id": d, "title": "D hạn hôm qua", "deadline": yesterday.isoformat()},
            {"commission_id": b, "title": "B hạn hôm nay, tạm dừng", "deadline": today.isoformat()},
            {"commission_id": a, "title": "A hạn hôm nay", "deadline": tomorrow.isoformat()},
        ]}
        assert e not in [u["commission_id"] for u in digest["digest"]["upcoming"]]
        r = call(http, "POST", "/reminders/checks")
        assert r.json() == []
        pending_before = call(http, "GET", "/reminders/pending").json()
        assert len(pending_before) == 5
        settings_before = call(http, "GET", "/reminders/settings").json()

    code = backend.close_stdin_and_wait()
    print(f"[run 1] stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]

    # 8. Restart on the same file.
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready()
    print(f"[run 2] same db, port={port2}: READY")
    base2 = f"http://127.0.0.1:{port2}"
    with httpx.Client(base_url=base2, timeout=30) as http:
        r = call(http, "GET", "/reminders/settings")
        assert r.json() == settings_before
        r = call(http, "GET", "/reminders/pending")
        assert r.json() == pending_before
        r = call(http, "POST", "/reminders/checks")
        assert r.json() == []

        # 10. Two concurrent checks.
        r = call(http, "POST", "/clients", json={"client_input": {"display_name": "Quân", "contacts": [], "note": None}})
        r = call(http, "POST", "/commissions", json=commission_input(
            r.json()["client_id"], title="F hạn hôm nay", deadline=today.isoformat()))
        f = r.json()["commission_id"]

        def one_check():
            with httpx.Client(base_url=base2, timeout=30) as h:
                return h.post("/reminders/checks")

        results = _together([one_check, one_check])
        for resp in results:
            out(f"  >> POST /reminders/checks (concurrent)\n  << {resp.status_code} {resp.text}")
            assert resp.status_code == 200
        handed = [n for resp in results for n in resp.json()]
        assert len(handed) == 2 == len({n["notification_id"] for n in handed})
        assert sorted(n["deadline_item"]["lead"]["amount"] for n in handed) == [1, 3]
        assert all(n["deadline_item"]["commission_id"] == f for n in handed)

        # 9. Real storage failure: another connection holds an exclusive lock.
        blocker = sqlite3.connect(db_file, isolation_level=None)
        blocker.execute("BEGIN EXCLUSIVE")
        try:
            for method, url in (("POST", "/reminders/checks"), ("GET", "/reminders/pending"),
                                ("GET", "/reminders/settings")):
                assert_error(call(http, method, url), 500, "ERR_STORAGE_IO")
        finally:
            blocker.execute("ROLLBACK")
            blocker.close()
        r = call(http, "GET", "/reminders/pending")
        assert r.status_code == 200 and len(r.json()) == 7

    code = backend2.close_stdin_and_wait()
    print(f"[run 2] stdin closed -> exit code {code}; stdout lines: {backend2.stdout}")
    assert code == 0 and backend2.stdout == [b"READY\n"]
