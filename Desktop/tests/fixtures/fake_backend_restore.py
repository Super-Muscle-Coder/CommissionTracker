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
  prepare400   restore-preparations answers 400 (ERR_VALIDATION)
  preparebad   restore-preparations answers 200 with an object of the wrong shape
  create500    POST /backups answers 500 (ERR_STORAGE_IO)
  create400    POST /backups answers 400 (ERR_VALIDATION)
  createbad    POST /backups answers 201 with an object of the wrong shape
  stageslow    like a healthy backup_data that really stages a file (R43-21): every
               restore-preparations call writes <folder of CT_DB_FILE_PATH>/
               restore-staging/data.db with the text "staged-for:<archive_path>"
               (one file, replaced by each call, as backup_data's staging file is) and
               answers with that path; the FIRST call waits 1 s after writing the file
               and before answering, so a second call started meanwhile finishes first
               unless the desktop serializes them. The start of each call is logged:
                 fake backend: preparation #<n> started for <archive_path>
Without a switch the call answers like a healthy backend would, with made-up
values (no file is written or read). Every call is logged to stderr:
  fake backend: <METHOD> <path> -> <status>
"""
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SWITCHES = {s.strip() for s in os.environ.get("CT_FAKE_RESTORE", "").split(",") if s.strip()}
PREPARATIONS = 0  # restore-preparations calls received so far (stageslow)
COUNTER_LOCK = threading.Lock()
FIRST_PREPARATION_DELAY_SECONDS = 1.0


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

    def stage_and_answer(self, request):
        """stageslow: really write the staging file, then answer (the first call late)."""
        global PREPARATIONS
        with COUNTER_LOCK:
            PREPARATIONS += 1
            number = PREPARATIONS
        archive_path = request.get("archive_path")
        log("preparation #%d started for %s" % (number, archive_path))
        staging_dir = os.path.join(os.path.dirname(os.environ["CT_DB_FILE_PATH"]), "restore-staging")
        os.makedirs(staging_dir, exist_ok=True)
        staged = os.path.join(staging_dir, "data.db")
        with open(staged, "w", encoding="utf-8") as handle:
            handle.write("staged-for:%s" % archive_path)
        if number == 1:
            time.sleep(FIRST_PREPARATION_DELAY_SECONDS)
        log("preparation #%d answering for %s" % (number, archive_path))
        self.send(
            200,
            {
                "archive_path": archive_path,
                "is_valid": True,
                "is_compatible": True,
                "app_version": "0.1.0",
                "created_at": "2026-10-08T09:00:00+07:00",
                "reason": None,
                "staged_db_path": staged,
            },
        )

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
            elif "prepare400" in SWITCHES:
                self.send(400, {"code": "ERR_VALIDATION", "message": "invalid input", "details": None})
            elif "stageslow" in SWITCHES:
                self.stage_and_answer(request)
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
            elif "create400" in SWITCHES:
                self.send(400, {"code": "ERR_VALIDATION", "message": "invalid input", "details": None})
            elif "createbad" in SWITCHES:
                self.send(201, {"not": "a backup archive"})
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
