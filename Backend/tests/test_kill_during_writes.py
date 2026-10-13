"""Layer test: the real backend process killed while it is writing (H-10).

Several threads write clients over http without a pause; the process is
killed (kill, stdin not closed, so no clean stop of any kind) after dozens of
answers; a new backend is started on the same file. Then:

- PRAGMA integrity_check says "ok";
- every client that was answered 201 is still there, whole;
- no client is half written (a client with fewer contacts than it was
  created with, or a contact without its client);
- the new backend says READY and answers.

Each client is created with two contacts, so a write that were not one
transaction would have a window in which a client has one contact or none.
"""

import sqlite3
import threading
import time

import httpx

from tests.test_backend_process import BackendProcess, free_port, launch_env

CONTACTS_PER_CLIENT = 2
WRITERS = 4
ANSWERS_BEFORE_THE_KILL = 40
JOURNAL_MAGIC = bytes([0xD9, 0xD5, 0x05, 0xF9, 0x20, 0xA1, 0x63, 0xD7])


def _client_body(writer: int, n: int) -> dict:
    return {"client_input": {
        "display_name": f"writer {writer} client {n}",
        "contacts": [{"channel": f"channel {k}", "value": f"{writer}-{n}-{k}"} for k in range(CONTACTS_PER_CLIENT)],
        "note": None,
    }}


def test_a_backend_killed_while_writing_keeps_every_answered_record_whole(tmp_path):
    db_file = tmp_path / "appdata" / "CommissionTracker" / "data.db"
    port = free_port()
    backend = BackendProcess(launch_env(db_file, port))
    assert backend.wait_ready(), "READY not received"

    answered: list[str] = []
    answered_lock = threading.Lock()
    stop = threading.Event()

    def writer(index: int) -> None:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as http:
            n = 0
            while not stop.is_set():
                try:
                    r = http.post("/clients", json=_client_body(index, n))
                except httpx.HTTPError:
                    return  # the process is gone
                if r.status_code == 201:
                    with answered_lock:
                        answered.append(r.json()["client_id"])
                n += 1

    threads = [threading.Thread(target=writer, args=(i,)) for i in range(WRITERS)]
    for t in threads:
        t.start()
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        with answered_lock:
            if len(answered) >= ANSWERS_BEFORE_THE_KILL:
                break
        time.sleep(0.01)
    backend.proc.kill()  # no stdin close, no signal handler: the process is simply gone
    backend.proc.wait(timeout=15)
    stop.set()
    for t in threads:
        t.join(timeout=30)
    assert not any(t.is_alive() for t in threads)
    with answered_lock:
        answered_ids = list(answered)
    print(f"\n  killed after {len(answered_ids)} answered writes")
    assert len(answered_ids) >= ANSWERS_BEFORE_THE_KILL

    # A new backend on the same file.
    port2 = free_port()
    backend2 = BackendProcess(launch_env(db_file, port2))
    assert backend2.wait_ready(), "the backend did not come back with READY"
    with httpx.Client(base_url=f"http://127.0.0.1:{port2}", timeout=30) as http:
        listed = http.get("/clients")
        assert listed.status_code == 200
        stored_ids = {i["client_id"] for i in listed.json()}
        missing = [i for i in answered_ids if i not in stored_ids]
        assert missing == [], f"{len(missing)} answered clients are gone"
        # Not answered, but written before the kill: at most one in flight per writer.
        assert len(stored_ids) - len(answered_ids) <= WRITERS
        for client_id in stored_ids:
            detail = http.get(f"/clients/{client_id}")
            assert detail.status_code == 200
            assert len(detail.json()["contacts"]) == CONTACTS_PER_CLIENT, detail.json()
    assert backend2.close_stdin_and_wait() == 0
    assert backend2.stdout == [b"READY\n"]

    # The file itself, read the way a person with a SQLite shell would.
    conn = sqlite3.connect(str(db_file))
    try:
        assert conn.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
        short = conn.execute(
            "SELECT c.client_id FROM client c LEFT JOIN client_contact k ON k.client_id = c.client_id "
            "GROUP BY c.client_id HAVING COUNT(k.client_id) != ?",
            (CONTACTS_PER_CLIENT,),
        ).fetchall()
        assert short == []
        orphans = conn.execute(
            "SELECT DISTINCT k.client_id FROM client_contact k "
            "WHERE k.client_id NOT IN (SELECT client_id FROM client)"
        ).fetchall()
        assert orphans == []
    finally:
        conn.close()
    # A journal file may stay after the kill. It is hot (needs a rollback) only
    # when it begins with the SQLite journal magic; a header of zeros is a journal
    # that was already invalidated, and it is harmless.
    journal = db_file.with_name(db_file.name + "-journal")
    if journal.exists():
        with open(journal, "rb") as handle:
            assert handle.read(8) != JOURNAL_MAGIC, "a hot journal was left behind"
