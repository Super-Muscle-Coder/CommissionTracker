"""Fake backend for desktop tests (session 40, DSK-30): listens on CT_PORT
(loopback), writes READY, and exits with code 3 the moment the first http
request arrives, without answering it.

The probe page asks GET /clients when it loads, so by the time this process
dies the window is open and the page is running, however slow the machine is.
That is the difference from fake_backend_ready_then_die.py, which dies a fixed
2 s after READY and so depends on how fast the window opens. Used by cases 6
and 14 of desktop_main.spec.ts; K1 still needs the timed one.

Every connection is watched at the same time (selectors): Chromium may open a
spare socket that sends nothing and never closes it, and such a connection must
not keep the real request waiting (DSK-30 item 6). A connection counts as "a
call" only once its request line is complete; a bare connect is not one.
"""
import os
import selectors
import socket
import sys

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("127.0.0.1", int(os.environ["CT_PORT"])))
server.listen(8)
server.setblocking(False)

selector = selectors.DefaultSelector()
selector.register(server, selectors.EVENT_READ, None)
received = {}  # connection -> bytes received so far

sys.stdout.buffer.write(b"READY\n")
sys.stdout.buffer.flush()

while True:
    for key, _ in selector.select():
        if key.fileobj is server:
            connection, _address = server.accept()
            connection.setblocking(False)
            selector.register(connection, selectors.EVENT_READ, None)
            received[connection] = b""
            continue
        connection = key.fileobj
        try:
            chunk = connection.recv(4096)
        except OSError:
            chunk = b""
        if not chunk:
            # The other side closed it (or it failed): forget it, keep serving the rest.
            selector.unregister(connection)
            received.pop(connection, None)
            connection.close()
            continue
        received[connection] += chunk
        if b"\r\n" in received[connection]:
            request_line = received[connection].split(b"\r\n")[0].decode("latin-1")
            sys.stderr.write("fake backend: first call received (%s); dying with code 3\n" % request_line)
            sys.stderr.flush()
            os._exit(3)
