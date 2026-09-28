"""Layer tests: at most one backend uses a database file at a time
(data_schema.yaml 6.2.0, clause_a_common.mandatory_rules), on real Backend.py
processes and real temporary SQLite files.

Run from Backend/:  python -m pytest -s -v tests/test_database_ownership.py
With -s, exit codes, stderr lines and measured times are printed (EVIDENCE).
"""

import queue
import sqlite3
import sys
import textwrap
import time

import httpx

import Backend
from tests.test_backend_process import EXIT_TIMEOUT_S, LAYER_ROOT, BackendProcess, free_port, launch_env

OWNERSHIP = Backend.load_yaml(Backend.LAYER_CONFIG_FILE)["database_ownership"]
IN_USE_CODE = int(OWNERSHIP["database_in_use_exit_code"])
WINDOW_S = int(OWNERSHIP["retry_window_ms"]) / 1000
# Start-up of a Python process that imports the layer (FastAPI, uvicorn...),
# on top of the retry window.
MARGIN_S = 8.0
IN_USE_MESSAGE = "is in use by another backend process"


def run_to_exit(env: dict) -> tuple[int, bytes, str, float]:
    """Run Backend.py with its stdin kept open, as the desktop Main does, until
    it exits; (code, stdout, stderr, seconds). If it writes anything to stdout
    (READY: it did take the file), its stdin is closed so that it stops."""
    started = time.perf_counter()
    backend = BackendProcess(env)
    try:
        first = backend.lines.get(timeout=WINDOW_S + MARGIN_S)  # None: stdout closed (exited)
    except queue.Empty:
        backend.proc.kill()
        raise AssertionError("the second backend neither exited nor wrote READY in time")
    if first is not None:
        backend.proc.stdin.close()
    code = backend.proc.wait(timeout=EXIT_TIMEOUT_S)
    seconds = time.perf_counter() - started
    while first is not None:  # drain stdout up to its end
        first = backend.lines.get(timeout=EXIT_TIMEOUT_S)
    return code, b"".join(backend.stdout), backend.proc.stderr.read().decode(errors="replace"), seconds


def assert_refused(code: int, stdout: bytes, stderr: str, db_file) -> None:
    errors = [line for line in stderr.splitlines() if " ERROR " in line]
    print(f"  second backend -> exit code {code}, stdout={stdout!r}, stderr ERROR lines: {errors}")
    assert code == IN_USE_CODE
    assert stdout == b""
    assert len(errors) == 1
    assert IN_USE_MESSAGE in errors[0] and str(db_file) in errors[0]


def clients_status(port: int) -> int:
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as http:
        return http.get("/clients").status_code


def stop(backend: BackendProcess) -> None:
    code = backend.close_stdin_and_wait()
    print(f"  stdin closed -> exit code {code}; stdout lines: {backend.stdout}")
    assert code == 0 and backend.stdout == [b"READY\n"]


def test_second_backend_on_same_file_exits_with_own_code(tmp_path):
    # 2e.1: A is READY; B on the same CT_DB_FILE_PATH (another port) exits
    # with database_in_use_exit_code, after the retry window, without READY.
    db_file = tmp_path / "CommissionTracker" / "data.db"
    port_a = free_port()
    a = BackendProcess(launch_env(db_file, port_a))
    assert a.wait_ready(), "A: READY not received"
    print(f"\n[A] READY, db={db_file}, port={port_a}")

    code, stdout, stderr, seconds = run_to_exit(launch_env(db_file, free_port()))
    print(f"  second backend exited after {seconds:.2f} s (retry window {WINDOW_S:.2f} s)")
    assert_refused(code, stdout, stderr, db_file)
    assert WINDOW_S <= seconds < WINDOW_S + MARGIN_S

    assert clients_status(port_a) == 200
    print("  [A] GET /clients -> 200")
    stop(a)


HOLDER = textwrap.dedent(
    """
    # Holds the ownership of a database file exactly as the Main takes it,
    # and never opens nor creates the database file itself.
    import os, sys
    import Backend
    cfg = Backend.load_yaml(Backend.LAYER_CONFIG_FILE)["database_ownership"]
    db_file = sys.argv[1]
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    held = Backend.take_database_ownership(
        db_file, lock_file_suffix=cfg["lock_file_suffix"],
        retry_window_ms=0, retry_interval_ms=cfg["retry_interval_ms"])
    assert held is not None
    sys.stdout.buffer.write(b"HELD\\n"); sys.stdout.buffer.flush()
    while os.read(0, 4096):
        pass
    held.release()
    """
)


def test_second_backend_never_creates_a_database_file_it_does_not_own(tmp_path):
    # 2e.2: the owner holds the lock of a database file that does not exist
    # yet (the real Main is only between steps 2a and 2b for milliseconds, so
    # a holder takes the lock with the Main's own function and stays there).
    # B must not create the database file (nor its journal).
    db_file = tmp_path / "fresh" / "CommissionTracker" / "data.db"
    holder = BackendProcess({**launch_env(db_file, free_port())},
                            argv=[sys.executable, "-c", HOLDER, str(db_file)])
    assert holder.lines.get(timeout=30) == b"HELD\n"
    lock_file = db_file.parent / (db_file.name + OWNERSHIP["lock_file_suffix"])
    print(f"\n[holder] lock held on {lock_file}; database file exists: {db_file.exists()}")
    assert lock_file.exists() and not db_file.exists()

    code, stdout, stderr, seconds = run_to_exit(launch_env(db_file, free_port()))
    assert_refused(code, stdout, stderr, db_file)
    print(f"  after the second backend: folder holds {sorted(p.name for p in db_file.parent.iterdir())}")
    assert sorted(p.name for p in db_file.parent.iterdir()) == [lock_file.name]

    # Once the holder lets go, a backend starts on that very path.
    assert holder.close_stdin_and_wait() == 0
    port_c = free_port()
    c = BackendProcess(launch_env(db_file, port_c))
    assert c.wait_ready(), "C: READY not received"
    assert db_file.exists() and clients_status(port_c) == 200
    print("  [C] READY after the holder released; database file created by C")
    stop(c)


def test_ownership_is_released_on_clean_stop(tmp_path):
    # 2e.3: A stops cleanly (stdin closed, exit 0); C then takes the file.
    db_file = tmp_path / "CommissionTracker" / "data.db"
    a = BackendProcess(launch_env(db_file, free_port()))
    assert a.wait_ready()
    print("\n[A] READY")
    stop(a)
    started = time.perf_counter()
    port_c = free_port()
    c = BackendProcess(launch_env(db_file, port_c))
    assert c.wait_ready(), "C: READY not received"
    print(f"  [C] READY {time.perf_counter() - started:.2f} s after start, right after A exited")
    assert clients_status(port_c) == 200
    stop(c)


def test_ownership_is_released_when_killed(tmp_path):
    # 2e.4: A is killed (TerminateProcess on Windows, SIGKILL on POSIX). The
    # lock becomes free within the retry window; C then starts.
    db_file = tmp_path / "CommissionTracker" / "data.db"
    a = BackendProcess(launch_env(db_file, free_port()))
    assert a.wait_ready()
    print("\n[A] READY")
    killed_at = time.perf_counter()
    a.proc.kill()
    code = a.proc.wait(timeout=EXIT_TIMEOUT_S)
    exited_at = time.perf_counter()
    assert code != 0

    # Measure when the lock is free: try with the Main's own function, polling
    # every millisecond, bounded by the retry window.
    held = Backend.take_database_ownership(
        str(db_file), lock_file_suffix=OWNERSHIP["lock_file_suffix"],
        retry_window_ms=OWNERSHIP["retry_window_ms"], retry_interval_ms=1)
    free_at = time.perf_counter()
    assert held is not None, "lock still held after the retry window"
    held.release()
    print(f"  A killed -> exit code {code}; lock free {1000 * (free_at - exited_at):.2f} ms after the exit "
          f"was seen ({1000 * (free_at - killed_at):.2f} ms after kill())")

    started = time.perf_counter()
    port_c = free_port()
    c = BackendProcess(launch_env(db_file, port_c))
    assert c.wait_ready(), "C: READY not received"
    print(f"  [C] READY {time.perf_counter() - started:.2f} s after start")
    assert clients_status(port_c) == 200
    stop(c)


def test_two_backends_on_two_files_run_side_by_side(tmp_path):
    # 2e.5: different database files do not block each other.
    ports = [free_port(), free_port()]
    backends = [BackendProcess(launch_env(tmp_path / name / "data.db", port))
                for name, port in zip(("one", "two"), ports)]
    for b in backends:
        assert b.wait_ready()
    print("\n[one] and [two] READY together")
    for port in ports:
        assert clients_status(port) == 200
    for b in backends:
        stop(b)


def test_other_sqlite_connections_still_read_the_file(tmp_path):
    # 2e.6: while A runs, another SQLite connection reads the database file,
    # and SQLite's backup API copies it (what backup_data will need).
    db_file = tmp_path / "CommissionTracker" / "data.db"
    port = free_port()
    a = BackendProcess(launch_env(db_file, port))
    assert a.wait_ready()
    with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as http:
        r = http.post("/clients", json={"client_input": {"display_name": "Thu Hà", "contacts": [], "note": None}})
        assert r.status_code == 201

    other = sqlite3.connect(str(db_file))
    copy = sqlite3.connect(str(tmp_path / "copy.db"))
    try:
        count = other.execute("SELECT count(*) FROM client").fetchone()[0]
        other.backup(copy)
        copied = copy.execute("SELECT count(*) FROM client").fetchone()[0]
    finally:
        copy.close()
        other.close()
    print(f"\n  while A runs: other connection reads {count} client(s); backup API copy holds {copied}")
    assert count == 1 and copied == 1
    assert clients_status(port) == 200
    stop(a)
