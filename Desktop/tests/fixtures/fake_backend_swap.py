"""Fake backend for the restore_data apply tests (desktop session 36, case A5).
Never used by the Main in normal runs: tests pass it with --ct-test-backend-script.

It counts its own starts in <folder of CT_DB_FILE_PATH>/fake-start-count.txt.
  start 1:        listens on CT_PORT, writes READY, exits with code 0 when its
                  standard input is closed (the stop signal of the real backend).
  start 2 and on: writes a line to stderr and exits with code 2 before READY,
                  like the real backend does when the database file is not a
                  database.
So the Main's first start works, and every start after that (the one on the
restored database, and the one on the put-back database) fails.
It never reads or writes the database file itself.
"""
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

counter = os.path.join(os.path.dirname(os.environ["CT_DB_FILE_PATH"]), "fake-start-count.txt")
count = 0
if os.path.exists(counter):
    with open(counter, "r", encoding="utf-8") as handle:
        count = int(handle.read().strip() or "0")
count += 1
with open(counter, "w", encoding="utf-8") as handle:
    handle.write(str(count))

if count >= 2:
    sys.stderr.write("fake backend: start %d: refusing to start (exit code 2)\n" % count)
    sys.stderr.flush()
    sys.exit(2)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def do_GET(self):
        body = b"[]"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def wait_for_stdin_close(server):
    sys.stdin.buffer.read()
    sys.stderr.write("fake backend: standard input closed; stopping\n")
    sys.stderr.flush()
    server.shutdown()


server = ThreadingHTTPServer(("127.0.0.1", int(os.environ["CT_PORT"])), Handler)
server.daemon_threads = True
threading.Thread(target=wait_for_stdin_close, args=(server,), daemon=True).start()
sys.stdout.buffer.write(b"READY\n")
sys.stdout.buffer.flush()
server.serve_forever()
sys.exit(0)
