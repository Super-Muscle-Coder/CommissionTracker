"""Workflow tests of record_payment, through its Routers, on a real SQLite
file, wired exactly as the Main wires it (Backend.wire_workflows): the call
to manage_commission is the real in_process get_commission_summary."""

import sqlite3
import threading
import time

import pytest
from fastapi.testclient import TestClient

import Backend
from workflows.scaffold_backend import adapters as scaffold

UNKNOWN_ID = "0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"
MAX_INT = 2**53 - 1
PAYMENT_KEYS = {"payment_id", "commission_id", "direction", "kind", "amount", "method", "paid_at", "note", "is_voided"}
LEDGER_KEYS = {"payment_id", "commission_id", "direction", "kind", "amount", "paid_at"}
BALANCE_KEYS = {"commission_id", "agreed", "received_net", "outstanding"}


@pytest.fixture
def wired(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    # Short busy timeout so a locked database fails fast in these tests.
    configs["scaffold_backend"] = {**configs["scaffold_backend"], "busy_timeout_ms": 200}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
    entries = Backend.wire_workflows(app, db, configs)
    with TestClient(app) as http:
        yield http, entries, db, db_path
    db.close()


def new_commission(http, amount=1_000_000, currency="VND"):
    r = http.post("/clients", json={"client_input": {"display_name": "Mai", "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    r = http.post("/commissions", json={"commission_input": {
        "client_id": r.json()["client_id"], "title": "Bust", "description": None, "commission_type": None,
        "agreed_price": {"amount_minor": amount, "currency": currency}, "deadline": None, "reference_links": [],
    }})
    assert r.status_code == 201, r.text
    return r.json()["commission_id"]


def payment_input(**over):
    data = {
        "direction": "incoming",
        "kind": "deposit",
        "amount": {"amount_minor": 300_000, "currency": "VND"},
        "method": "bank_transfer",
        "paid_at": "2026-09-20T10:00:00+07:00",
        "note": None,
    }
    data.update(over)
    return data


def record(http, mid, **over):
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(**over)})
    assert r.status_code == 201, r.text
    return r.json()


def assert_error(r, label, code):
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]


def balance(http, mid):
    r = http.get(f"/payments/balance/{mid}")
    assert r.status_code == 200, r.text
    return r.json()


# --- record -------------------------------------------------------------------

def test_record_returns_payment_record(wired):
    http, *_ = wired
    mid = new_commission(http)
    body = record(http, mid, note="cọc 30%")
    assert set(body) == PAYMENT_KEYS
    assert body["commission_id"] == mid
    assert body["amount"] == {"amount_minor": 300_000, "currency": "VND"}
    assert body["paid_at"] == "2026-09-20T10:00:00+07:00"
    assert body["note"] == "cọc 30%" and body["is_voided"] is False


def test_record_accepts_z_offset_and_the_largest_amount(wired):
    http, *_ = wired
    mid = new_commission(http)
    assert record(http, mid, paid_at="2026-09-20T03:00:00Z")["paid_at"] == "2026-09-20T03:00:00+00:00"
    # a fresh commission: on the one above, 300000 + 2^53-1 would leave the range
    mid = new_commission(http)
    assert record(http, mid, amount={"amount_minor": MAX_INT, "currency": "VND"})["amount"]["amount_minor"] == MAX_INT


def _body(**over):
    return {"commission_id": UNKNOWN_ID, "payment_input": payment_input(**over)}


def _without(key):
    data = payment_input()
    del data[key]
    return {"commission_id": UNKNOWN_ID, "payment_input": data}


@pytest.mark.parametrize(
    "payload",
    [
        None,
        [],
        {},
        {"payment_input": payment_input()},
        {"commission_id": UNKNOWN_ID},
        {"commission_id": "not-an-id", "payment_input": payment_input()},
        {"commission_id": UNKNOWN_ID.upper(), "payment_input": payment_input()},
        {**_body(), "extra": 1},
        *[_without(k) for k in ("direction", "kind", "amount", "method", "paid_at", "note")],
        {"commission_id": UNKNOWN_ID, "payment_input": {**payment_input(), "extra": 1}},
        _body(direction="gift"),
        _body(kind="bonus"),
        _body(amount={"amount_minor": 0, "currency": "VND"}),
        _body(amount={"amount_minor": -5, "currency": "VND"}),
        _body(amount={"amount_minor": 2**53, "currency": "VND"}),
        _body(amount={"amount_minor": 1.5, "currency": "VND"}),
        _body(amount={"amount_minor": "100", "currency": "VND"}),
        _body(amount={"amount_minor": True, "currency": "VND"}),
        _body(amount={"amount_minor": 1, "currency": "vnd"}),
        _body(amount={"amount_minor": 1, "currency": "VNDX"}),
        _body(amount={"amount_minor": 1}),
        _body(amount={"amount_minor": 1, "currency": "VND", "x": 1}),
        _body(method=5),
        _body(method=None),
        _body(paid_at="2026-09-20T10:00:00"),
        _body(paid_at="2026-09-20"),
        _body(paid_at="2026-02-30T10:00:00+07:00"),
        _body(paid_at="2026-09-20 10:00:00+07:00"),
        _body(paid_at="2026-09-20T10:00:00+07:60"),
        _body(paid_at="2026-09-20T10:00:00+07:99"),
        _body(paid_at="2026-09-20T10:00:00+24:00"),
        _body(paid_at=1726800000),
        _body(note=3),
    ],
)
def test_record_rejects_malformed_input_with_400(wired, payload):
    http, *_ = wired
    assert_error(http.post("/payments", json=payload), 400, "ERR_VALIDATION")


def test_record_rejects_non_json_body_with_400(wired):
    http, *_ = wired
    r = http.post("/payments", content=b"{oops", headers={"content-type": "application/json"})
    assert_error(r, 400, "ERR_VALIDATION")


def test_record_unknown_commission_is_404(wired):
    http, *_ = wired
    assert_error(http.post("/payments", json=_body()), 404, "ERR_NOT_FOUND")


def test_record_currency_mismatch_is_422(wired):
    http, *_ = wired
    mid = new_commission(http, currency="VND")
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(
        amount={"amount_minor": 100, "currency": "USD"})})
    assert_error(r, 422, "ERR_CURRENCY_MISMATCH")
    # a currency outside supported_currencies is a mismatch too, not a format error
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(
        amount={"amount_minor": 100, "currency": "EUR"})})
    assert_error(r, 422, "ERR_CURRENCY_MISMATCH")
    assert http.get(f"/payments?commission_id={mid}").json() == []


def test_method_is_free_text(wired):
    # Data Schema 9.0.0: method is free text but not blank; "" moved to the
    # rejected cases below.
    http, *_ = wired
    mid = new_commission(http)
    assert record(http, mid, method="Ví MoMo 🙂")["method"] == "Ví MoMo 🙂"


# --- method not blank (Data Schema 9.0.0, clause_a_common.formats.not_blank) ----
# Empty, or only whitespace in the sense of str.isspace: ASCII (space, tab,
# newline) and Unicode (U+00A0 no-break space, U+3000 ideographic space).

BLANKS = ["", "   ", "\t\n", " ", "　"]
BLANK_IDS = ["empty", "spaces", "tab_newline", "nbsp", "ideographic_space"]
METHOD_LOC = ["payment_input", "method"]


def assert_rejected_at(r, loc):
    assert_error(r, 400, "ERR_VALIDATION")
    assert [e["loc"] for e in r.json()["details"]["errors"]] == [loc]


@pytest.mark.parametrize("blank", BLANKS, ids=BLANK_IDS)
def test_record_rejects_blank_method_and_writes_nothing(wired, blank):
    http, *_ = wired
    mid = new_commission(http)
    record(http, mid)
    before_list = http.get(f"/payments?commission_id={mid}").json()
    before_balance = balance(http, mid)
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(method=blank)})
    assert_rejected_at(r, METHOD_LOC)
    assert http.get(f"/payments?commission_id={mid}").json() == before_list
    assert balance(http, mid) == before_balance


@pytest.mark.parametrize("blank", BLANKS, ids=BLANK_IDS)
def test_blank_method_with_unknown_commission_is_still_400(wired, blank):
    # format is checked before the commission is looked up
    http, *_ = wired
    assert_rejected_at(http.post("/payments", json=_body(method=blank)), METHOD_LOC)


@pytest.mark.parametrize("method", [" MoMo ", "　Chuyển khoản\t", "Chuyển khoản"])
def test_valid_method_is_stored_and_returned_verbatim(wired, method):
    http, *_ = wired
    mid = new_commission(http)
    assert record(http, mid, method=method)["method"] == method
    assert [p["method"] for p in http.get(f"/payments?commission_id={mid}").json()] == [method]


@pytest.mark.parametrize("note", ["   ", None])
def test_note_is_not_subject_to_the_not_blank_rule(wired, note):
    http, *_ = wired
    mid = new_commission(http)
    assert record(http, mid, note=note)["note"] == note
    assert http.get(f"/payments?commission_id={mid}").json()[0]["note"] == note


# --- balance --------------------------------------------------------------------

def test_balance_without_payments(wired):
    http, *_ = wired
    mid = new_commission(http, amount=1_000_000)
    b = balance(http, mid)
    assert set(b) == BALANCE_KEYS
    assert b == {
        "commission_id": mid,
        "agreed": {"amount_minor": 1_000_000, "currency": "VND"},
        "received_net": {"amount_minor": 0, "currency": "VND"},
        "outstanding": {"amount_minor": 1_000_000, "currency": "VND"},
    }


def test_balance_nets_refunds_and_may_go_negative(wired):
    http, *_ = wired
    mid = new_commission(http, amount=1_000_000)
    record(http, mid, amount={"amount_minor": 300_000, "currency": "VND"})
    record(http, mid, kind="final", amount={"amount_minor": 700_000, "currency": "VND"})
    record(http, mid, direction="refund", kind="other", amount={"amount_minor": 100_000, "currency": "VND"})
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == 900_000
    assert b["outstanding"]["amount_minor"] == 100_000
    record(http, mid, kind="milestone", amount={"amount_minor": 250_000, "currency": "VND"})
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == 1_150_000
    assert b["outstanding"]["amount_minor"] == -150_000

    other = new_commission(http, amount=500)
    record(http, other, direction="refund", kind="other", amount={"amount_minor": 200, "currency": "VND"})
    b = balance(http, other)
    assert b["received_net"]["amount_minor"] == -200 and b["outstanding"]["amount_minor"] == 700


def test_tip_counts_in_received_net_but_not_in_outstanding(wired):
    # Data Schema 4.0.0: a tip is a gift on top of the agreed price.
    http, *_ = wired
    mid = new_commission(http, amount=1_000_000)
    record(http, mid, kind="final", amount={"amount_minor": 1_000_000, "currency": "VND"})
    tip = record(http, mid, kind="tip", amount={"amount_minor": 100_000, "currency": "VND"})
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == 1_100_000
    assert b["outstanding"]["amount_minor"] == 0
    # refunding the tip changes received_net only
    record(http, mid, direction="refund", kind="tip", amount={"amount_minor": 100_000, "currency": "VND"})
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == 1_000_000
    assert b["outstanding"]["amount_minor"] == 0
    # voiding a tip changes received_net only
    http.put(f"/payments/{tip['payment_id']}/void")
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == 900_000
    assert b["outstanding"]["amount_minor"] == 0


def test_only_tips_leave_outstanding_at_the_agreed_price(wired):
    http, *_ = wired
    mid = new_commission(http, amount=500)
    record(http, mid, kind="tip", amount={"amount_minor": 800, "currency": "VND"})
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == 800 and b["outstanding"]["amount_minor"] == 500


def test_balance_follows_an_edited_agreed_price(wired):
    http, *_ = wired
    mid = new_commission(http, amount=1_000)
    record(http, mid, amount={"amount_minor": 400, "currency": "VND"})
    detail = http.get(f"/commissions/{mid}").json()
    edited = {k: detail[k] for k in ("client_id", "title", "description", "commission_type", "deadline",
                                     "reference_links")}
    edited["agreed_price"] = {"amount_minor": 1_500, "currency": "VND"}
    assert http.put(f"/commissions/{mid}", json={"commission_input": edited}).status_code == 200
    assert balance(http, mid)["outstanding"]["amount_minor"] == 1_100


def test_balance_unknown_and_malformed_id_are_404(wired):
    http, *_ = wired
    assert_error(http.get(f"/payments/balance/{UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")
    assert_error(http.get("/payments/balance/not-an-id"), 404, "ERR_NOT_FOUND")


# --- computed-integer rule (Data Schema 3.0.0, clause_a_common) ------------------

def test_record_refuses_a_payment_that_puts_received_net_out_of_range(wired):
    http, *_ = wired
    mid = new_commission(http, amount=MAX_INT, currency="USD")
    record(http, mid, amount={"amount_minor": MAX_INT, "currency": "USD"})
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(
        amount={"amount_minor": MAX_INT, "currency": "USD"})})
    assert_error(r, 409, "ERR_OUT_OF_RANGE")
    # outstanding = (2^53-1) - 2(2^53-1) = -(2^53-1) is still representable
    assert r.json()["details"] == {"commission_id": mid, "fields": ["received_net"]}
    assert len(http.get(f"/payments?commission_id={mid}").json()) == 1
    # the limit itself is accepted: received_net = 2^53-1 exactly
    assert balance(http, mid)["received_net"]["amount_minor"] == MAX_INT


def test_record_refuses_a_refund_that_puts_outstanding_out_of_range(wired):
    http, *_ = wired
    mid = new_commission(http, amount=MAX_INT, currency="USD")
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(
        direction="refund", kind="other", amount={"amount_minor": 1, "currency": "USD"})})
    assert_error(r, 409, "ERR_OUT_OF_RANGE")
    assert r.json()["details"]["fields"] == ["outstanding"]
    assert http.get(f"/payments?commission_id={mid}").json() == []
    # an incoming payment first makes room for the same refund
    record(http, mid, amount={"amount_minor": 10, "currency": "USD"})
    record(http, mid, direction="refund", kind="other", amount={"amount_minor": 10, "currency": "USD"})
    assert balance(http, mid)["outstanding"]["amount_minor"] == MAX_INT


def test_record_refuses_a_tip_that_puts_received_net_out_of_range(wired):
    # New case of Data Schema 4.0.0: the tip leaves outstanding unchanged,
    # yet received_net would leave the range.
    http, *_ = wired
    mid = new_commission(http, amount=MAX_INT, currency="USD")
    record(http, mid, kind="final", amount={"amount_minor": MAX_INT, "currency": "USD"})
    assert balance(http, mid)["outstanding"]["amount_minor"] == 0
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(
        kind="tip", amount={"amount_minor": 1, "currency": "USD"})})
    assert_error(r, 409, "ERR_OUT_OF_RANGE")
    assert r.json()["details"] == {"commission_id": mid, "fields": ["received_net"]}
    assert "nothing was written" in r.json()["message"]
    assert len(http.get(f"/payments?commission_id={mid}").json()) == 1


def test_record_refuses_a_tip_refund_that_puts_received_net_out_of_range(wired):
    http, *_ = wired
    mid = new_commission(http, amount=0, currency="USD")
    record(http, mid, direction="refund", kind="other", amount={"amount_minor": MAX_INT, "currency": "USD"})
    r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(
        direction="refund", kind="tip", amount={"amount_minor": 1, "currency": "USD"})})
    assert_error(r, 409, "ERR_OUT_OF_RANGE")
    assert r.json()["details"]["fields"] == ["received_net"]
    assert len(http.get(f"/payments?commission_id={mid}").json()) == 1


def test_a_tip_never_trips_the_outstanding_check(wired):
    # outstanding ignores tips: with agreed 2^53-1 and no payment, a refund
    # of a non-tip leaves the range, a refund of a tip does not.
    http, *_ = wired
    mid = new_commission(http, amount=MAX_INT, currency="USD")
    record(http, mid, direction="refund", kind="tip", amount={"amount_minor": 1, "currency": "USD"})
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == -1 and b["outstanding"]["amount_minor"] == MAX_INT


def test_void_is_never_refused_and_get_balance_reports_out_of_range(wired):
    http, *_ = wired
    mid = new_commission(http, amount=MAX_INT, currency="USD")
    incoming = record(http, mid, amount={"amount_minor": 10, "currency": "USD"})
    record(http, mid, direction="refund", kind="other", amount={"amount_minor": 5, "currency": "USD"})
    assert balance(http, mid)["outstanding"]["amount_minor"] == MAX_INT - 5
    r = http.put(f"/payments/{incoming['payment_id']}/void")
    assert r.status_code == 200 and r.json()["is_voided"] is True
    r = http.get(f"/payments/balance/{mid}")
    assert_error(r, 409, "ERR_OUT_OF_RANGE")
    assert r.json()["details"] == {"commission_id": mid, "fields": ["outstanding"]}
    # a read: the message does not claim that nothing was written
    assert "written" not in r.json()["message"]
    # the list still answers (it carries no computed amount)
    assert len(http.get(f"/payments?commission_id={mid}").json()) == 2


def test_get_balance_reports_out_of_range_after_the_price_is_edited(wired):
    http, *_ = wired
    mid = new_commission(http, amount=0, currency="USD")
    record(http, mid, direction="refund", kind="other", amount={"amount_minor": 5, "currency": "USD"})
    detail = http.get(f"/commissions/{mid}").json()
    edited = {k: detail[k] for k in ("client_id", "title", "description", "commission_type", "deadline",
                                     "reference_links")}
    edited["agreed_price"] = {"amount_minor": MAX_INT, "currency": "USD"}
    assert http.put(f"/commissions/{mid}", json={"commission_input": edited}).status_code == 200
    assert_error(http.get(f"/payments/balance/{mid}"), 409, "ERR_OUT_OF_RANGE")


def test_concurrent_records_never_both_pass_the_range_check(wired, monkeypatch):
    http, *_ = wired
    from workflows.record_payment import adapters

    mid = new_commission(http, amount=MAX_INT, currency="USD")
    # Widen the window between the read and the write inside the scope, so
    # that a check made outside the transaction would let both calls pass.
    original = adapters.PaymentWriteScope.fetch_for_commission

    def slow_fetch(self, commission_id):
        rows = original(self, commission_id)
        time.sleep(0.2)
        return rows

    monkeypatch.setattr(adapters.PaymentWriteScope, "fetch_for_commission", slow_fetch)
    start = threading.Barrier(4)
    statuses = []

    def worker():
        start.wait()
        statuses.append(http.post("/payments", json={"commission_id": mid, "payment_input": payment_input(
            amount={"amount_minor": MAX_INT, "currency": "USD"})}).status_code)

    threads = [threading.Thread(target=worker) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(statuses) == [201, 409, 409, 409]
    assert len(http.get(f"/payments?commission_id={mid}").json()) == 1
    assert balance(http, mid)["received_net"]["amount_minor"] == MAX_INT


# --- void -------------------------------------------------------------------------

def test_void_then_void_again_and_unknown(wired):
    http, *_ = wired
    mid = new_commission(http, amount=1_000)
    kept = record(http, mid, amount={"amount_minor": 300, "currency": "VND"})
    gone = record(http, mid, amount={"amount_minor": 200, "currency": "VND"})
    r = http.put(f"/payments/{gone['payment_id']}/void")
    assert r.status_code == 200
    assert r.json() == {**gone, "is_voided": True}
    assert_error(http.put(f"/payments/{gone['payment_id']}/void"), 409, "ERR_CONFLICT")
    assert_error(http.put(f"/payments/{UNKNOWN_ID}/void"), 404, "ERR_NOT_FOUND")
    assert_error(http.put("/payments/not-an-id/void"), 404, "ERR_NOT_FOUND")
    b = balance(http, mid)
    assert b["received_net"]["amount_minor"] == 300 and b["outstanding"]["amount_minor"] == 700
    # voided entries stay in the list, unchanged except for the flag
    listed = {p["payment_id"]: p for p in http.get(f"/payments?commission_id={mid}").json()}
    assert listed[gone["payment_id"]] == {**gone, "is_voided": True}
    assert listed[kept["payment_id"]] == kept


def test_concurrent_voids_only_one_succeeds(wired):
    http, *_ = wired
    mid = new_commission(http)
    pid = record(http, mid)["payment_id"]
    statuses = []

    def worker():
        statuses.append(http.put(f"/payments/{pid}/void").status_code)

    threads = [threading.Thread(target=worker) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(statuses) == [200] + [409] * 7


# --- list_for_commission --------------------------------------------------------

def test_list_newest_first_by_real_instant(wired):
    http, *_ = wired
    mid = new_commission(http)
    # Real instants: a = 03:00Z, b = 04:00Z, c = 05:00Z. As strings, the
    # order would be different.
    a = record(http, mid, paid_at="2026-09-20T10:00:00+07:00")
    c = record(http, mid, paid_at="2026-09-20T00:00:00-05:00")
    b = record(http, mid, paid_at="2026-09-20T04:00:00Z")
    http.put(f"/payments/{b['payment_id']}/void")
    r = http.get(f"/payments?commission_id={mid}")
    assert r.status_code == 200
    items = r.json()
    assert [p["payment_id"] for p in items] == [c["payment_id"], b["payment_id"], a["payment_id"]]
    assert all(set(p) == PAYMENT_KEYS for p in items)
    assert [p["is_voided"] for p in items] == [False, True, False]


def test_list_only_this_commission(wired):
    http, *_ = wired
    mid, other = new_commission(http), new_commission(http)
    record(http, mid)
    record(http, other)
    assert [p["commission_id"] for p in http.get(f"/payments?commission_id={mid}").json()] == [mid]
    assert http.get(f"/payments?commission_id={new_commission(http)}").json() == []


def test_list_unknown_missing_and_malformed_id_are_404(wired):
    http, *_ = wired
    assert_error(http.get(f"/payments?commission_id={UNKNOWN_ID}"), 404, "ERR_NOT_FOUND")
    assert_error(http.get("/payments?commission_id=not-an-id"), 404, "ERR_NOT_FOUND")
    assert_error(http.get("/payments"), 404, "ERR_NOT_FOUND")


# --- in_process: list_payment_ledger --------------------------------------------

def test_ledger_has_every_non_voided_payment(wired):
    http, entries, *_ = wired
    m1, m2 = new_commission(http), new_commission(http)
    p1 = record(http, m1, kind="tip", paid_at="2026-09-21T09:00:00+07:00")
    p2 = record(http, m2, direction="refund", kind="other", paid_at="2026-09-20T09:00:00+07:00")
    p3 = record(http, m1, paid_at="2026-09-22T09:00:00+07:00")
    http.put(f"/payments/{p3['payment_id']}/void")
    ledger = entries["list_payment_ledger"]()
    assert all(set(e) == LEDGER_KEYS for e in ledger)
    assert [e["kind"] for e in ledger] == ["other", "tip"]
    assert ledger == [
        {k: p2[k] for k in LEDGER_KEYS},
        {k: p1[k] for k in LEDGER_KEYS},
    ]


# --- storage ------------------------------------------------------------------------

def test_storage_owns_only_its_tables_and_is_idempotent(wired):
    _, _, db, _ = wired
    from workflows.record_payment.adapters import PaymentRepository

    PaymentRepository(db).ensure_storage()  # second run: no error, no change
    with db.read() as conn:
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        version = conn.execute("SELECT version FROM record_payment_schema_version").fetchall()
        fks = conn.execute("SELECT * FROM pragma_foreign_key_list('payment')").fetchall()
    assert {"payment", "record_payment_schema_version"} <= tables
    assert version == [(1,)]
    assert fks == []


def test_newer_storage_version_stops_start_up(wired):
    _, _, db, _ = wired
    from workflows.record_payment.adapters import PaymentRepository, StorageVersionError

    with db.transaction() as conn:
        conn.execute("UPDATE record_payment_schema_version SET version = 99")
    with pytest.raises(StorageVersionError):
        PaymentRepository(db).ensure_storage()


# --- 500 ERR_STORAGE_IO: real SQLite failures, no mock -----------------------------

def test_locked_database_answers_500_everywhere(wired):
    http, entries, _, db_path = wired
    mid = new_commission(http)
    pid = record(http, mid)["payment_id"]
    locker = sqlite3.connect(db_path, isolation_level=None)
    locker.execute("BEGIN EXCLUSIVE")
    try:
        for method, url, kw in (
            ("POST", "/payments", {"json": {"commission_id": mid, "payment_input": payment_input()}}),
            ("GET", f"/payments?commission_id={mid}", {}),
            ("PUT", f"/payments/{pid}/void", {}),
            ("GET", f"/payments/balance/{mid}", {}),
        ):
            assert_error(http.request(method, url, **kw), 500, "ERR_STORAGE_IO")
        with pytest.raises(Exception) as info:
            entries["list_payment_ledger"]()
        assert info.value.label == 500 and info.value.error_body["code"] == "ERR_STORAGE_IO"
    finally:
        locker.execute("ROLLBACK")
        locker.close()
    assert http.get(f"/payments/balance/{mid}").status_code == 200
    assert http.get(f"/payments?commission_id={mid}").json()[0]["is_voided"] is False


def test_write_on_read_only_connection_answers_500_and_writes_nothing(wired):
    http, _, db, _ = wired
    mid = new_commission(http)
    pid = record(http, mid)["payment_id"]
    with db.read() as conn:
        conn.execute("PRAGMA query_only = ON")
    try:
        r = http.post("/payments", json={"commission_id": mid, "payment_input": payment_input()})
        assert_error(r, 500, "ERR_STORAGE_IO")
        assert "readonly" in r.json()["details"]["reason"]
        assert_error(http.put(f"/payments/{pid}/void"), 500, "ERR_STORAGE_IO")
    finally:
        with db.read() as conn:
            conn.execute("PRAGMA query_only = OFF")
    items = http.get(f"/payments?commission_id={mid}").json()
    assert len(items) == 1 and items[0]["is_voided"] is False


def test_programming_error_is_not_reported_as_storage_error(wired, monkeypatch):
    http, *_ = wired
    mid = new_commission(http)
    from workflows.record_payment import adapters

    def broken(row):
        raise KeyError("boom")

    monkeypatch.setattr(adapters, "_to_payment", broken)
    record(http, mid)
    with pytest.raises(KeyError):
        http.get(f"/payments?commission_id={mid}")
