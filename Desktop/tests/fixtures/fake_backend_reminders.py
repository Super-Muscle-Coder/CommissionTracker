"""Fake backend for the reminder_ticker tests (DSK-17). Never used by the Main
in normal runs: tests pass it with --ct-test-backend-script.

It listens on CT_PORT (loopback), writes READY, and exits with code 0 when its
stdin is closed (the stop signal of the real backend). It answers:
  GET  /clients            -> 200 []   (the probe page asks for it)
  POST /reminders/checks   -> by CT_FAKE_CHECKS, see below
  anything else            -> 404

CT_FAKE_CHECKS is a comma-separated list of behaviours, one per call of
POST /reminders/checks, in order; the last one repeats:
  ok            200 []
  valid         200 with one valid deadline reminder
  two           200 with two valid reminders (a deadline one, then a digest)
  mixed         200 with a valid deadline reminder, a malformed element, and a
                valid digest
  http500       500 with an error_body (ERR_STORAGE_IO)
  badshape      200 with an object instead of a list
  notjson       200 with text that is not JSON
  slow:<ms>     waits <ms>, then 200 []

Every call writes to stderr (the Main forwards it to its own stderr):
  fake backend: check #<n> start (in flight: <k>)
  fake backend: check #<n> end (<behaviour>)
so a test can see calls that overlap.
"""
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BEHAVIOURS = [b.strip() for b in os.environ.get("CT_FAKE_CHECKS", "ok").split(",") if b.strip()] or ["ok"]
lock = threading.Lock()
state = {"calls": 0, "in_flight": 0}

DEADLINE = {
    "notification_id": "n-deadline-1",
    "kind": "deadline",
    "due_at": "2026-10-04T00:00:00+07:00",
    "deadline_item": {"commission_id": "c-1", "title": "Tranh hạn hôm nay", "deadline": "2026-10-04", "lead": {"amount": 1, "unit": "days"}},
    "digest": None,
}
DIGEST = {
    "notification_id": "n-digest-1",
    "kind": "periodic_digest",
    "due_at": "2026-10-04T09:00:00+07:00",
    "deadline_item": None,
    "digest": {
        "open_count": 3,
        "upcoming": [
            {"commission_id": "c-2", "title": "Minh họa bìa sách", "deadline": "2026-01-01"},
            {"commission_id": "c-1", "title": "Tranh hạn hôm nay", "deadline": "2026-10-04"},
        ],
    },
}
MALFORMED = {"notification_id": "n-bad-1", "kind": "deadline", "due_at": "2026-10-04T00:00:00+07:00", "deadline_item": None, "digest": None}


def log(message):
    sys.stderr.write("fake backend: " + message + "\n")
    sys.stderr.flush()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def send(self, status, payload, raw=False):
        body = payload.encode("utf-8") if raw else json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/clients":
            self.send(200, [])
        else:
            self.send(404, {"code": "ERR_NOT_FOUND", "message": "not found", "details": None})

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(length)
        if self.path != "/reminders/checks":
            self.send(404, {"code": "ERR_NOT_FOUND", "message": "not found", "details": None})
            return
        with lock:
            state["calls"] += 1
            number = state["calls"]
            state["in_flight"] += 1
            in_flight = state["in_flight"]
        behaviour = BEHAVIOURS[min(number - 1, len(BEHAVIOURS) - 1)]
        log("check #%d start (in flight: %d)" % (number, in_flight))
        try:
            if behaviour.startswith("slow:"):
                time.sleep(int(behaviour.split(":", 1)[1]) / 1000)
                self.send(200, [])
            elif behaviour == "valid":
                self.send(200, [DEADLINE])
            elif behaviour == "two":
                self.send(200, [DEADLINE, DIGEST])
            elif behaviour == "mixed":
                self.send(200, [DEADLINE, MALFORMED, DIGEST])
            elif behaviour == "http500":
                self.send(500, {"code": "ERR_STORAGE_IO", "message": "storage failed", "details": None})
            elif behaviour == "badshape":
                self.send(200, {"not": "a list"})
            elif behaviour == "notjson":
                self.send(200, "this is not json", raw=True)
            else:
                self.send(200, [])
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            with lock:
                state["in_flight"] -= 1
            log("check #%d end (%s)" % (number, behaviour))


def wait_for_stdin_close(server):
    sys.stdin.buffer.read()
    log("standard input closed; stopping")
    server.shutdown()


server = ThreadingHTTPServer(("127.0.0.1", int(os.environ["CT_PORT"])), Handler)
server.daemon_threads = True
threading.Thread(target=wait_for_stdin_close, args=(server,), daemon=True).start()
sys.stdout.buffer.write(b"READY\n")
sys.stdout.buffer.flush()
server.serve_forever()
sys.exit(0)
