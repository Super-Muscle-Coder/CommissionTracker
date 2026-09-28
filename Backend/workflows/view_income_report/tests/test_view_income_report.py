"""Workflow tests of view_income_report, through its Routers, on a real SQLite
file, wired exactly as the Main wires it (Backend.wire_workflows): the three
in_process calls (list_commission_index, list_progress_board,
list_payment_ledger) are the real ones. Data is created through the other
workflows' own http endpoints."""

import sqlite3

import pytest
from fastapi.testclient import TestClient

import Backend
from workflows.scaffold_backend import adapters as scaffold

MAX_INT = 2**53 - 1
REPORT_KEYS = {"period_from", "period_to", "currencies", "generated_at"}
CURRENCY_KEYS = {"currency", "received_net_minor", "refunded_minor", "outstanding_minor", "by_month"}


@pytest.fixture
def wired(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    # Short busy timeout so a locked database fails fast in these tests.
    configs["scaffold_backend"] = {**configs["scaffold_backend"], "busy_timeout_ms": 200}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
    Backend.wire_workflows(app, db, configs)
    with TestClient(app) as http:
        yield http, db, db_path
    db.close()


def new_commission(http, amount, currency="VND", stage=None):
    r = http.post("/clients", json={"client_input": {"display_name": "Mai", "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    r = http.post("/commissions", json={"commission_input": {
        "client_id": r.json()["client_id"], "title": "Bust", "description": None, "commission_type": None,
        "agreed_price": {"amount_minor": amount, "currency": currency}, "deadline": None, "reference_links": [],
    }})
    assert r.status_code == 201, r.text
    mid = r.json()["commission_id"]
    if stage is not None:
        r = http.put(f"/commissions/{mid}/stage", json={"stage_change": {"to_stage": stage, "note": None}})
        assert r.status_code == 200, r.text
    return mid


def pay(http, mid, amount, paid_at, currency="VND", direction="incoming", kind="deposit"):
    r = http.post("/payments", json={"commission_id": mid, "payment_input": {
        "direction": direction, "kind": kind, "amount": {"amount_minor": amount, "currency": currency},
        "method": "cash", "paid_at": paid_at, "note": None,
    }})
    assert r.status_code == 201, r.text
    return r.json()


def report(http, period_from, period_to):
    r = http.get(f"/reports/income?period_from={period_from}&period_to={period_to}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == REPORT_KEYS
    assert all(set(c) == CURRENCY_KEYS for c in body["currencies"])
    return body


def by_currency(body):
    return {c["currency"]: c for c in body["currencies"]}


def assert_error(r, label, code):
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]


# --- 400 ------------------------------------------------------------------------

@pytest.mark.parametrize(
    "query",
    [
        "",
        "?period_from=2026-09-01",
        "?period_to=2026-09-30",
        "?period_from=&period_to=2026-09-30",
        "?period_from=2026-9-01&period_to=2026-09-30",
        "?period_from=20260901&period_to=2026-09-30",
        "?period_from=2026-09-01T00:00:00&period_to=2026-09-30",
        "?period_from=2026-09-01&period_to=2026-09-30+07:00",
        "?period_from=2026-02-30&period_to=2026-03-01",
        "?period_from=2026-13-01&period_to=2026-12-31",
        "?period_from=abc&period_to=2026-09-30",
        "?period_from=2026-10-01&period_to=2026-09-30",
    ],
)
def test_malformed_or_inverted_period_is_400(wired, query):
    http, *_ = wired
    assert_error(http.get(f"/reports/income{query}"), 400, "ERR_VALIDATION")


# --- shape and totals ---------------------------------------------------------

def test_empty_report(wired):
    http, *_ = wired
    body = report(http, "2026-09-01", "2026-09-30")
    assert body["period_from"] == "2026-09-01" and body["period_to"] == "2026-09-30"
    assert body["currencies"] == []
    assert body["generated_at"][19] in "+-"  # local time with its offset, to the second


def test_a_commission_without_payment_owes_its_agreed_price(wired):
    http, *_ = wired
    new_commission(http, 700_000)
    assert report(http, "2026-09-01", "2026-09-30")["currencies"] == [{
        "currency": "VND", "received_net_minor": 0, "refunded_minor": 0,
        "outstanding_minor": 700_000, "by_month": [],
    }]


def test_totals_per_currency_and_month(wired):
    http, *_ = wired
    a = new_commission(http, 1_000_000)
    b = new_commission(http, 100, currency="USD", stage="sketch")
    pay(http, a, 400_000, "2026-08-31T23:59:59+07:00")
    pay(http, a, 100_000, "2026-09-01T00:00:00+07:00", kind="milestone")
    pay(http, a, 50_000, "2026-09-10T10:00:00+07:00", direction="refund", kind="other")
    pay(http, b, 30, "2026-09-02T10:00:00Z", currency="USD")
    body = by_currency(report(http, "2026-08-01", "2026-09-30"))
    assert list(body) == ["USD", "VND"]  # ordered by currency code
    assert body["VND"] == {
        "currency": "VND", "received_net_minor": 450_000, "refunded_minor": 50_000,
        "outstanding_minor": 550_000,
        "by_month": [{"month": "2026-08", "received_net_minor": 400_000},
                     {"month": "2026-09", "received_net_minor": 50_000}],
    }
    assert body["USD"]["received_net_minor"] == 30 and body["USD"]["outstanding_minor"] == 70


def test_period_bounds_use_the_date_written_in_paid_at(wired):
    http, *_ = wired
    mid = new_commission(http, 0)
    pay(http, mid, 1, "2026-09-30T23:30:00-05:00")  # 2026-10-01 04:30 UTC, still September
    pay(http, mid, 2, "2026-10-01T00:30:00+07:00")  # 2026-09-30 17:30 UTC, already October
    sept = by_currency(report(http, "2026-09-01", "2026-09-30"))["VND"]
    assert sept["received_net_minor"] == 1
    assert sept["by_month"] == [{"month": "2026-09", "received_net_minor": 1}]
    octo = by_currency(report(http, "2026-10-01", "2026-10-01"))["VND"]
    assert octo["received_net_minor"] == 2
    assert octo["by_month"] == [{"month": "2026-10", "received_net_minor": 2}]


def test_outstanding_ignores_the_period_and_tips_and_follows_stage(wired):
    http, *_ = wired
    delivered = new_commission(http, 1_000, stage="delivered")  # finished but still owing
    tipped = new_commission(http, 1_000)
    cancelled = new_commission(http, 5_000, stage="cancelled")
    overpaid = new_commission(http, 1_000, stage="on_hold")
    pay(http, delivered, 600, "2025-01-01T10:00:00+07:00")  # long before the period
    pay(http, tipped, 1_000, "2026-09-05T10:00:00+07:00", kind="final")
    pay(http, tipped, 300, "2026-09-06T10:00:00+07:00", kind="tip")
    pay(http, cancelled, 2_000, "2026-09-07T10:00:00+07:00")
    pay(http, overpaid, 1_250, "2026-09-08T10:00:00+07:00", kind="final")
    vnd = by_currency(report(http, "2026-09-01", "2026-09-30"))["VND"]
    # outstanding: delivered 400 + tipped 0 + overpaid -250 (cancelled not owing)
    assert vnd["outstanding_minor"] == 150
    # received_net: every payment in the period, tip and cancelled commission included
    assert vnd["received_net_minor"] == 1_000 + 300 + 2_000 + 1_250


def test_voided_payment_counts_nowhere(wired):
    http, *_ = wired
    mid = new_commission(http, 1_000)
    kept = pay(http, mid, 100, "2026-09-05T10:00:00+07:00")
    gone = pay(http, mid, 900, "2026-09-06T10:00:00+07:00", kind="final")
    assert http.put(f"/payments/{gone['payment_id']}/void").status_code == 200
    vnd = by_currency(report(http, "2026-09-01", "2026-09-30"))["VND"]
    assert kept and vnd["received_net_minor"] == 100 and vnd["outstanding_minor"] == 900
    assert vnd["by_month"] == [{"month": "2026-09", "received_net_minor": 100}]


def test_refunded_minor_is_positive_and_net_may_be_negative(wired):
    http, *_ = wired
    mid = new_commission(http, 1_000, stage="cancelled")
    pay(http, mid, 400, "2026-09-05T10:00:00+07:00", direction="refund", kind="other")
    pay(http, mid, 100, "2026-09-06T10:00:00+07:00", direction="refund", kind="tip")
    vnd = by_currency(report(http, "2026-09-01", "2026-09-30"))["VND"]
    assert vnd == {"currency": "VND", "received_net_minor": -500, "refunded_minor": 500,
                   "outstanding_minor": 0, "by_month": [{"month": "2026-09", "received_net_minor": -500}]}


def test_a_currency_with_only_payments_of_cancelled_commissions_is_listed(wired):
    http, *_ = wired
    mid = new_commission(http, 100, currency="USD", stage="cancelled")
    pay(http, mid, 40, "2026-09-05T10:00:00Z", currency="USD")
    assert [c["currency"] for c in report(http, "2026-09-01", "2026-09-30")["currencies"]] == ["USD"]
    assert report(http, "2026-10-01", "2026-10-31")["currencies"] == []


# --- 409: computed-integer rule -----------------------------------------------

def test_out_of_range_outstanding_is_409(wired):
    http, *_ = wired
    new_commission(http, MAX_INT, currency="USD")
    new_commission(http, MAX_INT, currency="USD")
    r = http.get("/reports/income?period_from=2026-09-01&period_to=2026-09-30")
    assert_error(r, 409, "ERR_OUT_OF_RANGE")
    assert r.json()["details"] == {"fields": ["USD.outstanding_minor"]}


def test_out_of_range_received_net_and_month_is_409(wired):
    http, *_ = wired
    for _ in range(2):
        mid = new_commission(http, MAX_INT, currency="USD", stage="cancelled")
        pay(http, mid, MAX_INT, "2026-09-05T10:00:00Z", currency="USD", kind="final")
    r = http.get("/reports/income?period_from=2026-09-01&period_to=2026-09-30")
    assert_error(r, 409, "ERR_OUT_OF_RANGE")
    assert r.json()["details"] == {"fields": [
        "USD.received_net_minor", "USD.by_month[2026-09].received_net_minor"]}
    # a period without those payments (and no owing commission) is fine
    r = http.get("/reports/income?period_from=2026-10-01&period_to=2026-10-31")
    assert r.status_code == 200 and r.json()["currencies"] == []


def test_only_the_output_totals_are_range_checked(wired):
    # A commission whose own balance get_balance cannot return (voided
    # incoming) still counts; only the report's totals must fit.
    http, *_ = wired
    big = new_commission(http, MAX_INT, currency="USD")
    incoming = pay(http, big, 10, "2026-09-05T10:00:00Z", currency="USD")
    pay(http, big, 5, "2026-09-06T10:00:00Z", currency="USD", direction="refund", kind="other")
    assert http.put(f"/payments/{incoming['payment_id']}/void").status_code == 200
    assert http.get(f"/payments/balance/{big}").status_code == 409  # MAX_INT + 5 owed
    other = new_commission(http, 0, currency="USD")
    pay(http, other, 10, "2026-09-07T10:00:00Z", currency="USD", kind="final")  # owes -10
    usd = by_currency(report(http, "2026-09-01", "2026-09-30"))["USD"]
    assert usd["outstanding_minor"] == MAX_INT + 5 - 10


# --- storage ----------------------------------------------------------------------

def test_creates_no_table(wired, tmp_path):
    http, db, _ = wired
    with db.read() as conn:
        before = {r[0] for r in conn.execute("SELECT name FROM sqlite_master")}
    new_commission(http, 1_000)
    report(http, "2026-09-01", "2026-09-30")
    with db.read() as conn:
        after = {r[0] for r in conn.execute("SELECT name FROM sqlite_master")}
    assert before == after
    assert not any("income" in name or "report" in name for name in after)


def test_locked_database_answers_500(wired):
    http, _, db_path = wired
    new_commission(http, 1_000)
    locker = sqlite3.connect(db_path, isolation_level=None)
    locker.execute("BEGIN EXCLUSIVE")
    try:
        r = http.get("/reports/income?period_from=2026-09-01&period_to=2026-09-30")
        assert_error(r, 500, "ERR_STORAGE_IO")
        assert r.json()["details"]["reason"].startswith("manage_commission: ")
    finally:
        locker.execute("ROLLBACK")
        locker.close()
    assert http.get("/reports/income?period_from=2026-09-01&period_to=2026-09-30").status_code == 200


# --- Adapters: label mapping of each in_process call ---------------------------
# The storage failure behind the second and third call cannot be produced on
# a real database without also failing the first one, so the mapping itself
# is checked with endpoint functions that raise like an in_process endpoint.

class _Raised(Exception):
    def __init__(self, label, error_body):
        super().__init__(label)
        self.label = label
        self.error_body = error_body


def _failing(label):
    def endpoint():
        raise _Raised(label, {"code": "ERR_STORAGE_IO", "message": "Storage failed.", "details": {"reason": "x"}})
    return endpoint


@pytest.mark.parametrize(
    "position, workflow, method",
    [(0, "manage_commission", "fetch_commissions"),
     (1, "update_progress", "fetch_progress"),
     (2, "record_payment", "fetch_payments")],
)
def test_adapter_turns_label_500_into_storage_error(position, workflow, method):
    from workflows.view_income_report.adapters import IncomeSources, StorageIOError

    endpoints = [lambda: [], lambda: [], lambda: []]
    endpoints[position] = _failing(500)
    with pytest.raises(StorageIOError) as info:
        getattr(IncomeSources(*endpoints), method)()
    assert str(info.value).startswith(f"{workflow}: Storage failed.")

    endpoints[position] = _failing(418)  # an undeclared label is not a storage failure
    with pytest.raises(_Raised):
        getattr(IncomeSources(*endpoints), method)()


def test_programming_error_is_not_reported_as_storage_error(wired, monkeypatch):
    http, *_ = wired
    from workflows.view_income_report import services

    def broken(payment):
        raise KeyError("boom")

    new_commission(http, 1_000)
    mid = new_commission(http, 1_000)
    pay(http, mid, 1, "2026-09-05T10:00:00+07:00")
    monkeypatch.setattr(services, "_paid_date", broken)
    with pytest.raises(KeyError):
        http.get("/reports/income?period_from=2026-09-01&period_to=2026-09-30")
