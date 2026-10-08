"""Fake backend for the restore_data tests (desktop session 35). Never used by
the Main in normal runs: tests pass it with --ct-test-backend-script.

It listens on CT_PORT (loopback), writes READY, and exits with code 0 when its
stdin is closed (the stop signal of the real backend). It answers:
  GET  /clients                          -> 200 []   (the probe page asks for it)
  POST /backups/restore-preparations     -> by CT_FAKE_RESTORE, see below
  POST /backups                          -> by CT_FAKE_RESTORE, see below
  POST /reminders/checks                 -> 200 []   (the Main's reminder_ticker)
  anything else                          -> 404

CT_FAKE_RESTORE is a comma-separated list of switches (default: none):
  prepare500   restore-preparations answers 500 (ERR_STORAGE_IO)
  preparebad   restore-preparations answers 200 with an object of the wrong shape
  create500    POST /backups answers 500 (ERR_STORAGE_IO)
Without a switch the call answers like a healthy backend would, with made-up
values (no file is written or read). Every call is logged to stderr:
  fake backend: <METHOD> <path> -> <status>
"""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SWITCHES = {s.strip() for s in os.environ.get("CT_FAKE_RESTORE", "").split(",") if s.strip()}


def log(message):
    sys.stderr.write("fake backend: " + message + "\n")
    sys.stderr.flush()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
        log("%s %s -> %d" % (self.command, self.path, status))

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
        raw = self.rfile.read(length) if length else b"{}"
        try:
            request = json.loads(raw.decode("utf-8"))
        except ValueError:
            request = {}
        storage_error = {"code": "ERR_STORAGE_IO", "message": "storage failed", "details": None}
        if self.path == "/reminders/checks":
            self.send(200, [])  # the Main's reminder_ticker asks; nothing is due
        elif self.path == "/backups/restore-preparations":
            if "prepare500" in SWITCHES:
                self.send(500, storage_error)
            elif "preparebad" in SWITCHES:
                self.send(200, {"not": "a restore staging"})
            else:
                self.send(
                    200,
                    {
                        "archive_path": request.get("archive_path"),
                        "is_valid": True,
                        "is_compatible": True,
                        "app_version": "0.1.0",
                        "created_at": "2026-10-08T09:00:00+07:00",
                        "reason": None,
                        "staged_db_path": "C:\\fake\\restore-staging\\data.db",
                    },
                )
        elif self.path == "/backups":
            if "create500" in SWITCHES:
                self.send(500, storage_error)
            else:
                destination = (request.get("backup_request") or {}).get("destination_dir", "")
                self.send(
                    201,
                    {
                        "archive_path": os.path.join(destination, "commission-tracker-pre_restore-fake.ctbackup"),
                        "app_version": "0.1.0",
                        "size_bytes": 1,
                        "sha256": "0" * 64,
                        "created_at": "2026-10-08T09:00:01+07:00",
                    },
                )
        else:
            self.send(404, {"code": "ERR_NOT_FOUND", "message": "not found", "details": None})


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
