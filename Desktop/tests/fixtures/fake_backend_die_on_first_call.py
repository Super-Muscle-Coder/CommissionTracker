"""Fake backend for desktop tests (session 40, DSK-30): listens on CT_PORT
(loopback), writes READY, and exits with code 3 the moment the first http
request arrives, without answering it.

The probe page asks GET /clients when it loads, so by the time this process
dies the window is open and the page is running, however slow the machine is.
That is the difference from fake_backend_ready_then_die.py, which dies a fixed
2 s after READY and so depends on how fast the window opens. Used by cases 6
and 14 of desktop_main.spec.ts; K1 still needs the timed one.
"""
import os
import socket
import sys

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("127.0.0.1", int(os.environ["CT_PORT"])))
server.listen(8)
sys.stdout.buffer.write(b"READY\n")
sys.stdout.buffer.flush()

connection, _ = server.accept()
# Wait for the request line itself: a bare connect (Chromium may open spare
# sockets) is not "a call".
data = b""
while b"\r\n" not in data:
    chunk = connection.recv(4096)
    if not chunk:
        connection, _ = server.accept()
        data = b""
        continue
    data += chunk
sys.stderr.write("fake backend: first call received (%s); dying with code 3\n" % data.split(b"\r\n")[0].decode("latin-1"))
sys.stderr.flush()
os._exit(3)
