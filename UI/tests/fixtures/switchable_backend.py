"""Test fixture of the interface layer: the real backend, switchable off and on.

Used ONLY by the walkthrough of the interface (step `unreachable`, iWCA I6.3)
through the desktop test flags --ct-test-backend-script and
--ct-test-backend-working-dir. Never used by a normal run.

Why: the desktop Main treats a backend that exits as fatal and closes the app,
so the real backend cannot be stopped in the middle of a walkthrough. This
fixture is what the desktop Main starts instead. It starts the real
Backend.py as its child (same CT_* environment, stdin a pipe kept open), and
stays alive the whole time, so the desktop Main never sees its backend die.

Behaviour:
  * waits for the child's READY, then writes exactly one line READY of its own;
    later stdout lines of the child are swallowed; stderr is passed through;
  * control file `switchable_backend.control`, in the folder of CT_DB_FILE_PATH,
    holds `down` or `up`:
      down: closes the child's stdin and waits for it to exit (the port is
            free, the interface gets "unreachable");
      up:   starts Backend.py again on the same port (CT_PORT);
    once a switch is done, `switchable_backend.state` holds the new state;
  * when its own stdin closes (the desktop Main stops it): closes the child's
    stdin, waits for it to exit, exits with code 0;
  * if the child exits while it should be up, exits with the child's code
    (as a real backend dying would).

Run from Backend/ (the desktop Main uses --ct-test-backend-working-dir).
"""
from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
from pathlib import Path

READY_LINE = b"READY"
CONTROL_FILE = "switchable_backend.control"
STATE_FILE = "switchable_backend.state"
POLL_SECONDS = 0.2
READY_TIMEOUT_SECONDS = 30.0
STOP_TIMEOUT_SECONDS = 10.0
# After a stop the port can stay busy for a moment; `up` retries on the same port.
RESTART_ATTEMPTS = 10
RESTART_DELAY_SECONDS = 1.0


def log(message: str) -> None:
    print(f"[switchable_backend] {message}", file=sys.stderr, flush=True)


class Child:
    """One run of the real Backend.py."""

    def __init__(self) -> None:
        self.proc: subprocess.Popen[bytes] | None = None
        self.ready = threading.Event()

    def start(self) -> int | None:
        """Start Backend.py and wait for its READY. None when ready, else its exit code."""
        self.ready.clear()
        proc = subprocess.Popen(
            [sys.executable, "Backend.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=None,  # inherited: reaches the desktop Main's log
            env=os.environ.copy(),
            cwd=os.getcwd(),
        )
        self.proc = proc
        threading.Thread(target=self._read_stdout, args=(proc,), daemon=True).start()
        deadline = time.monotonic() + READY_TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            if self.ready.wait(POLL_SECONDS):
                log(f"backend child (pid {proc.pid}) READY on port {os.environ.get('CT_PORT')}")
                return None
            if proc.poll() is not None:
                log(f"backend child (pid {proc.pid}) exited with code {proc.returncode} before READY")
                return proc.returncode
        log(f"backend child (pid {proc.pid}) did not write READY in time; stopping it")
        self.stop()
        return 1

    def _read_stdout(self, proc: subprocess.Popen[bytes]) -> None:
        assert proc.stdout is not None
        for raw in proc.stdout:
            if raw.rstrip(b"\r\n") == READY_LINE and not self.ready.is_set():
                self.ready.set()
            # Every other line (and any later READY) is swallowed.

    def running(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def stop(self) -> None:
        """Close the child's stdin (its stop signal), wait, terminate after the timeout."""
        proc = self.proc
        if proc is None or proc.poll() is not None:
            return
        try:
            assert proc.stdin is not None
            proc.stdin.close()
        except OSError:
            pass
        try:
            proc.wait(STOP_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            log(f"backend child (pid {proc.pid}) did not exit in time; terminating it")
            proc.kill()
            proc.wait()
        log(f"backend child (pid {proc.pid}) exited with code {proc.returncode}")


def read_control(path: Path) -> str | None:
    try:
        value = path.read_text(encoding="utf-8").strip().lower()
    except OSError:
        return None
    return value if value in ("down", "up") else None


def write_state(path: Path, state: str) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(state, encoding="utf-8")
    os.replace(tmp, path)


def main() -> int:
    db_file = os.environ.get("CT_DB_FILE_PATH")
    if not db_file:
        log("CT_DB_FILE_PATH is missing")
        return 2
    folder = Path(db_file).parent
    control, state_file = folder / CONTROL_FILE, folder / STATE_FILE

    stdin_closed = threading.Event()

    def watch_stdin() -> None:
        while sys.stdin.buffer.read(1024):
            pass
        stdin_closed.set()

    threading.Thread(target=watch_stdin, daemon=True).start()

    child = Child()
    code = child.start()
    if code is not None:
        # First start failed (e.g. port taken): exit like the backend would, so
        # the desktop Main retries on another port.
        return code
    state = "up"
    write_state(state_file, state)
    sys.stdout.buffer.write(READY_LINE + b"\n")
    sys.stdout.buffer.flush()

    while not stdin_closed.wait(POLL_SECONDS):
        wanted = read_control(control) or state
        if state == "up" and not child.running():
            code = child.proc.returncode if child.proc is not None else 1
            log(f"backend child exited unexpectedly (code {code})")
            return code if code else 1
        if wanted == "down" and state == "up":
            log("switching the backend off")
            child.stop()
            state = "down"
            write_state(state_file, state)
        elif wanted == "up" and state == "down":
            log("switching the backend on, same port")
            for attempt in range(1, RESTART_ATTEMPTS + 1):
                if child.start() is None:
                    break
                log(f"restart attempt {attempt} failed")
                time.sleep(RESTART_DELAY_SECONDS)
            else:
                log("the backend could not be started again")
                return 1
            state = "up"
            write_state(state_file, state)

    log("stdin closed: stopping")
    child.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
