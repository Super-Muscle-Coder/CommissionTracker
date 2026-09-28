"""Workflow tests of send_reminder, through its Routers, on a real SQLite file,
wired exactly as the Main wires it (Backend.wire_workflows): the two
in_process calls (list_commission_index, list_progress_board) are the real
ones, and commissions and stages are created through the other workflows'
own http endpoints.

The only thing handed over differently is the clock: a fake clock with a
fixed +07:00 offset (wire_workflows(..., reminder_clock=...)), so that
weekly cadences, missed occurrences and exact boundaries can be reached.
It is not a Services or Adapters stand-in: the Services, Adapters and
storage are the real ones.
"""

import json
import sqlite3
import threading
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import Backend
from workflows.scaffold_backend import adapters as scaffold
from workflows.send_reminder.adapters import ReminderRepository, StorageVersionError

TZ = timezone(timedelta(hours=7))
MAX_INT = 2**53 - 1
UNKNOWN_ID = "0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b"
NOTIFICATION_KEYS = {"notification_id", "kind", "due_at", "deadline_item", "digest"}


class FakeClock:
    """Same three methods as SystemClock, on a settable 'now', in +07:00."""

    def __init__(self, now: str) -> None:
        self.current = datetime.fromisoformat(now)

    def set(self, now: str) -> None:
        self.current = datetime.fromisoformat(now)

    def now(self) -> datetime:
        return self.current

    def at_local(self, wall: datetime) -> datetime:
        return wall.replace(tzinfo=TZ)

    def to_local(self, when: datetime) -> datetime:
        return when.astimezone(TZ)


@pytest.fixture
def wired(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    # Short busy timeout so a locked database fails fast in these tests.
    configs["scaffold_backend"] = {**configs["scaffold_backend"], "busy_timeout_ms": 200}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    clock = FakeClock("2026-10-01T08:00:00+07:00")
    app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
    Backend.wire_workflows(app, db, configs, reminder_clock=clock)
    with TestClient(app) as http:
        yield http, clock, db, db_path
    db.close()


# --- helpers ------------------------------------------------------------------

def settings(periodic=None, deadline=None):
    p = {"enabled": False, "every": 1, "unit": "days", "at_time": "09:00", "weekday": None}
    d = {"enabled": False, "lead_times": [{"amount": 1, "unit": "days"}]}
    p.update(periodic or {})
    d.update(deadline or {})
    return {"periodic": p, "deadline": d}


def save(http, s):
    r = http.put("/reminders/settings", json={"reminder_settings_input": s})
    assert r.status_code == 200, r.text
    return r.json()


def check(http):
    r = http.post("/reminders/checks")
    assert r.status_code == 200, r.text
    body = r.json()
    assert all(set(n) == NOTIFICATION_KEYS for n in body)
    return body


def pending(http):
    r = http.get("/reminders/pending")
    assert r.status_code == 200, r.text
    return r.json()


def commission_input(client_id, title, deadline):
    return {"commission_input": {
        "client_id": client_id, "title": title, "description": None, "commission_type": None,
        "agreed_price": {"amount_minor": 100, "currency": "VND"}, "deadline": deadline, "reference_links": [],
    }}


def new_commission(http, title="Bust", deadline=None, stage=None):
    r = http.post("/clients", json={"client_input": {"display_name": "Mai", "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    r = http.post("/commissions", json=commission_input(r.json()["client_id"], title, deadline))
    assert r.status_code == 201, r.text
    mid = r.json()["commission_id"]
    if stage is not None:
        set_stage(http, mid, stage)
    return mid


def edit_commission(http, mid, title, deadline):
    r = http.get(f"/commissions/{mid}")
    body = commission_input(r.json()["client_id"], title, deadline)
    r = http.put(f"/commissions/{mid}", json=body)
    assert r.status_code == 200, r.text


def set_stage(http, mid, stage):
    r = http.put(f"/commissions/{mid}/stage", json={"stage_change": {"to_stage": stage, "note": None}})
    assert r.status_code == 200, r.text


def deadline_items(notifications):
    return [(n["deadline_item"]["commission_id"], n["deadline_item"]["lead"]["amount"],
             n["deadline_item"]["lead"]["unit"], n["due_at"]) for n in notifications]


def assert_error(r, label, code):
    assert r.status_code == label, r.text
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]


# --- settings -----------------------------------------------------------------

def test_defaults_before_any_save(wired):
    http, *_ = wired
    r = http.get("/reminders/settings")
    assert r.status_code == 200
    assert r.json() == {
        "settings": {
            "periodic": {"enabled": False, "every": 1, "unit": "weeks", "at_time": "09:00", "weekday": 1},
            "deadline": {"enabled": False, "lead_times": [{"amount": 1, "unit": "days"}]},
        },
        "updated_at": None,
    }


def _mutations():
    # (name, function turning a valid settings dict into an invalid one);
    # every kind is checked while disabled too.
    def m(path, value):
        def apply(s):
            target = s
            for key in path[:-1]:
                target = target[key]
            target[path[-1]] = value
            return s
        return apply

    def drop(path):
        def apply(s):
            target = s
            for key in path[:-1]:
                target = target[key]
            del target[path[-1]]
            return s
        return apply

    return [
        ("weekday set with days", m(("periodic", "weekday"), 3)),
        ("weekday null with weeks", m(("periodic", "unit"), "weeks")),
        ("weekday 0", lambda s: m(("periodic", "weekday"), 0)(m(("periodic", "unit"), "weeks")(s))),
        ("weekday 8", lambda s: m(("periodic", "weekday"), 8)(m(("periodic", "unit"), "weeks")(s))),
        ("every 0", m(("periodic", "every"), 0)),
        ("every -1", m(("periodic", "every"), -1)),
        ("every 2^53", m(("periodic", "every"), MAX_INT + 1)),
        ("every float", m(("periodic", "every"), 1.0)),
        ("every string", m(("periodic", "every"), "1")),
        ("every bool", m(("periodic", "every"), True)),
        ("unit months", m(("periodic", "unit"), "months")),
        ("at_time 24:00", m(("periodic", "at_time"), "24:00")),
        ("at_time 9:00", m(("periodic", "at_time"), "9:00")),
        ("at_time 09:60", m(("periodic", "at_time"), "09:60")),
        ("at_time seconds", m(("periodic", "at_time"), "09:00:00")),
        ("enabled string", m(("periodic", "enabled"), "true")),
        ("lead_times empty", m(("deadline", "lead_times"), [])),
        ("six lead_times", m(("deadline", "lead_times"), [{"amount": i, "unit": "hours"} for i in range(1, 7)])),
        ("1 day and 24 hours", m(("deadline", "lead_times"), [{"amount": 1, "unit": "days"}, {"amount": 24, "unit": "hours"}])),
        ("same lead twice", m(("deadline", "lead_times"), [{"amount": 2, "unit": "hours"}, {"amount": 2, "unit": "hours"}])),
        ("amount 0", m(("deadline", "lead_times"), [{"amount": 0, "unit": "days"}])),
        ("amount 2^53", m(("deadline", "lead_times"), [{"amount": MAX_INT + 1, "unit": "hours"}])),
        ("lead 366 days", m(("deadline", "lead_times"), [{"amount": 366, "unit": "days"}])),
        ("lead 8761 hours", m(("deadline", "lead_times"), [{"amount": 8761, "unit": "hours"}])),
        ("lead unit weeks", m(("deadline", "lead_times"), [{"amount": 1, "unit": "weeks"}])),
        ("lead extra key", m(("deadline", "lead_times"), [{"amount": 1, "unit": "days", "x": 1}])),
        ("missing weekday", drop(("periodic", "weekday"))),
        ("missing at_time", drop(("periodic", "at_time"))),
        ("missing lead_times", drop(("deadline", "lead_times"))),
        ("missing deadline", drop(("deadline",))),
        ("extra key in periodic", m(("periodic", "extra"), 1)),
        ("extra top key", m(("extra",), {})),
    ]


@pytest.mark.parametrize("name,mutate", _mutations(), ids=[n for n, _ in _mutations()])
def test_invalid_settings_are_400_and_nothing_is_saved(wired, name, mutate):
    http, *_ = wired
    r = http.put("/reminders/settings", json={"reminder_settings_input": mutate(settings())})
    assert_error(r, 400, "ERR_VALIDATION")
    assert http.get("/reminders/settings").json()["updated_at"] is None


@pytest.mark.parametrize("payload", [None, {}, {"reminder_settings_input": None}, [], "x",
                                     {"reminder_settings_input": settings(), "extra": 1}])
def test_malformed_body_is_400(wired, payload):
    http, *_ = wired
    assert_error(http.put("/reminders/settings", json=payload), 400, "ERR_VALIDATION")


def test_valid_save_is_returned_and_kept(wired):
    http, clock, *_ = wired
    s = settings(periodic={"enabled": True, "every": 2, "unit": "weeks", "weekday": 7, "at_time": "23:59"},
                 deadline={"enabled": True, "lead_times": [{"amount": 5, "unit": "days"}, {"amount": 1, "unit": "hours"},
                                                           {"amount": 8760, "unit": "hours"}]})
    body = save(http, s)
    assert body == {"settings": s, "updated_at": "2026-10-01T08:00:00+07:00"}
    assert http.get("/reminders/settings").json() == body
    clock.set("2026-10-02T10:00:00+07:00")
    assert save(http, settings())["updated_at"] == "2026-10-02T10:00:00+07:00"


@pytest.mark.parametrize("lead", [{"amount": 365, "unit": "days"}, {"amount": 8760, "unit": "hours"}],
                         ids=["365 days", "8760 hours"])
def test_lead_time_at_the_upper_bound_is_accepted(wired, lead):
    http, *_ = wired
    s = settings(deadline={"enabled": True, "lead_times": [lead]})
    assert save(http, s)["settings"] == s


@pytest.mark.parametrize("lead", [{"amount": 366, "unit": "days"}, {"amount": 8761, "unit": "hours"}],
                         ids=["366 days", "8761 hours"])
def test_lead_time_above_the_upper_bound_is_400(wired, lead):
    http, *_ = wired
    r = http.put("/reminders/settings",
                 json={"reminder_settings_input": settings(deadline={"enabled": True, "lead_times": [lead]})})
    assert_error(r, 400, "ERR_VALIDATION")
    assert "at most 365 days" in str(r.json()["details"])
    assert http.get("/reminders/settings").json()["updated_at"] is None


def test_nothing_is_produced_while_never_saved_or_disabled(wired):
    http, clock, *_ = wired
    new_commission(http, deadline="2026-10-01")
    assert check(http) == []
    save(http, settings())  # both disabled
    clock.set("2026-10-01T20:00:00+07:00")
    assert check(http) == []


# --- periodic digest ------------------------------------------------------------

def test_weekly_cadence_with_weekday_and_every_2(wired):
    http, clock, *_ = wired
    new_commission(http)
    clock.set("2026-09-30T10:00:00+07:00")  # a Wednesday
    save(http, settings(periodic={"enabled": True, "every": 2, "unit": "weeks", "weekday": 1, "at_time": "09:00"}))
    # First occurrence: Monday 2026-10-05 09:00; then every 14 days.
    for now in ("2026-10-01T09:00:00+07:00", "2026-10-05T08:59:59+07:00"):
        clock.set(now)
        assert check(http) == []
    clock.set("2026-10-05T09:00:00+07:00")
    [digest] = check(http)
    assert digest["kind"] == "periodic_digest" and digest["due_at"] == "2026-10-05T09:00:00+07:00"
    assert digest["deadline_item"] is None and digest["digest"]["open_count"] == 1
    for now in ("2026-10-05T09:00:01+07:00", "2026-10-12T09:00:00+07:00", "2026-10-19T08:59:59+07:00"):
        clock.set(now)
        assert check(http) == []
    clock.set("2026-10-19T09:00:00+07:00")
    assert [n["due_at"] for n in check(http)] == ["2026-10-19T09:00:00+07:00"]


def test_three_missed_occurrences_give_one_digest_with_the_latest_due_at(wired):
    http, clock, *_ = wired
    new_commission(http)
    clock.set("2026-09-20T08:00:00+07:00")
    save(http, settings(periodic={"enabled": True, "at_time": "09:00"}))
    # 09-20, 09-21, 09-22 at 09:00 were missed (app closed); now 09-22 12:00.
    clock.set("2026-09-22T12:00:00+07:00")
    produced = check(http)
    assert [(n["kind"], n["due_at"]) for n in produced] == [("periodic_digest", "2026-09-22T09:00:00+07:00")]
    assert check(http) == []
    clock.set("2026-09-23T08:59:00+07:00")
    assert check(http) == []
    clock.set("2026-09-23T09:00:00+07:00")
    assert [n["due_at"] for n in check(http)] == ["2026-09-23T09:00:00+07:00"]


def test_saving_again_restarts_the_cadence(wired):
    http, clock, *_ = wired
    new_commission(http)
    clock.set("2026-09-20T08:00:00+07:00")
    s = settings(periodic={"enabled": True, "every": 3, "at_time": "09:00"})
    save(http, s)  # occurrences 09-20, 09-23, 09-26...
    clock.set("2026-09-21T10:00:00+07:00")
    save(http, s)  # same settings: restart at 09-22 09:00, then 09-25...
    clock.set("2026-09-21T23:00:00+07:00")
    assert check(http) == []  # 09-20 09:00 belongs to the old cadence
    clock.set("2026-09-23T09:00:00+07:00")
    assert [n["due_at"] for n in check(http)] == ["2026-09-22T09:00:00+07:00"]  # 09-23 is not an occurrence any more
    clock.set("2026-09-25T09:00:00+07:00")
    assert [n["due_at"] for n in check(http)] == ["2026-09-25T09:00:00+07:00"]
    # Saving after an occurrence was produced: it is not produced again.
    clock.set("2026-09-25T09:30:00+07:00")
    save(http, settings(periodic={"enabled": True, "every": 1, "at_time": "09:00"}))
    assert check(http) == []
    clock.set("2026-09-26T09:00:00+07:00")
    assert [n["due_at"] for n in check(http)] == ["2026-09-26T09:00:00+07:00"]


def test_at_time_equal_to_the_save_moment_is_the_first_occurrence(wired):
    http, clock, *_ = wired
    new_commission(http)
    clock.set("2026-09-20T09:00:00+07:00")
    save(http, settings(periodic={"enabled": True, "at_time": "09:00"}))
    assert [n["due_at"] for n in check(http)] == ["2026-09-20T09:00:00+07:00"]
    # One second later: the first occurrence is the next day.
    clock.set("2026-09-21T09:00:01+07:00")
    save(http, settings(periodic={"enabled": True, "at_time": "09:00"}))
    assert check(http) == []
    clock.set("2026-09-22T09:00:00+07:00")
    assert [n["due_at"] for n in check(http)] == ["2026-09-22T09:00:00+07:00"]


def test_weekly_first_occurrence_on_the_save_day(wired):
    http, clock, *_ = wired
    new_commission(http)
    clock.set("2026-09-28T08:00:00+07:00")  # Monday
    save(http, settings(periodic={"enabled": True, "unit": "weeks", "weekday": 1, "at_time": "08:00"}))
    assert [n["due_at"] for n in check(http)] == ["2026-09-28T08:00:00+07:00"]
    clock.set("2026-09-28T08:00:01+07:00")  # Monday, one second too late: next Monday
    save(http, settings(periodic={"enabled": True, "unit": "weeks", "weekday": 1, "at_time": "08:00"}))
    clock.set("2026-10-04T23:59:59+07:00")
    assert check(http) == []
    clock.set("2026-10-05T08:00:00+07:00")
    assert [n["due_at"] for n in check(http)] == ["2026-10-05T08:00:00+07:00"]


def test_no_open_commission_means_no_digest_and_that_occurrence_is_gone(wired):
    http, clock, *_ = wired
    done = new_commission(http, stage="delivered")
    new_commission(http, stage="cancelled")
    clock.set("2026-09-20T08:00:00+07:00")
    save(http, settings(periodic={"enabled": True, "at_time": "09:00"}))
    clock.set("2026-09-20T09:00:00+07:00")
    assert check(http) == []
    new_commission(http, title="New")
    clock.set("2026-09-20T15:00:00+07:00")
    assert check(http) == []  # the 09-20 occurrence was dealt with
    clock.set("2026-09-21T09:00:00+07:00")
    [digest] = check(http)
    assert digest["due_at"] == "2026-09-21T09:00:00+07:00" and digest["digest"]["open_count"] == 1
    assert done not in [u["commission_id"] for u in digest["digest"]["upcoming"]]


def test_digest_content_open_count_and_upcoming_order(wired):
    http, clock, *_ = wired
    overdue = new_commission(http, title="Overdue", deadline="2026-09-01")
    held = new_commission(http, title="Held", deadline="2026-10-20", stage="on_hold")
    fresh_a = new_commission(http, title="Fresh", deadline="2026-10-05")
    fresh_b = new_commission(http, title="Fresh 2", deadline="2026-10-05")
    new_commission(http, title="No deadline")
    new_commission(http, title="Done", deadline="2026-09-30", stage="delivered")
    new_commission(http, title="Dropped", deadline="2026-09-30", stage="cancelled")
    working = new_commission(http, title="Working", deadline="2026-12-01", stage="lineart")
    clock.set("2026-10-01T08:00:00+07:00")
    save(http, settings(periodic={"enabled": True, "at_time": "09:00"}))
    edit_commission(http, working, "Working (renamed)", "2026-12-01")  # title is read at the check
    clock.set("2026-10-01T09:00:00+07:00")
    [digest] = check(http)
    assert digest["digest"]["open_count"] == 6
    same_day = sorted([fresh_a, fresh_b])
    assert digest["digest"]["upcoming"] == [
        {"commission_id": overdue, "title": "Overdue", "deadline": "2026-09-01"},
        {"commission_id": same_day[0], "title": "Fresh" if same_day[0] == fresh_a else "Fresh 2", "deadline": "2026-10-05"},
        {"commission_id": same_day[1], "title": "Fresh" if same_day[1] == fresh_a else "Fresh 2", "deadline": "2026-10-05"},
        {"commission_id": held, "title": "Held", "deadline": "2026-10-20"},
        {"commission_id": working, "title": "Working (renamed)", "deadline": "2026-12-01"},
    ]


# --- deadline reminders -----------------------------------------------------------

def test_exact_boundaries_of_a_deadline_reminder(wired):
    http, clock, *_ = wired
    a = new_commission(http, title="A", deadline="2026-10-10")
    clock.set("2026-10-01T08:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}]}))
    # The deadline ends at 2026-10-11T00:00+07:00; 1 day before is 10-10T00:00.
    clock.set("2026-10-09T23:59:59+07:00")
    assert check(http) == []
    clock.set("2026-10-10T00:00:00+07:00")
    [n] = check(http)
    assert n["kind"] == "deadline" and n["digest"] is None
    assert n["due_at"] == "2026-10-10T00:00:00+07:00"
    assert n["deadline_item"] == {"commission_id": a, "title": "A", "deadline": "2026-10-10",
                                  "lead": {"amount": 1, "unit": "days"}}
    assert check(http) == []
    # Exactly at the end: a commission never reminded is not reminded any more.
    new_commission(http, title="B", deadline="2026-10-10")
    clock.set("2026-10-11T00:00:00+07:00")
    assert check(http) == []
    # One second before the end it still is (lead 2 hours, due 10-12T22:00).
    c = new_commission(http, title="C", deadline="2026-10-12")
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 2, "unit": "hours"}]}))
    clock.set("2026-10-12T21:59:59+07:00")
    assert check(http) == []
    clock.set("2026-10-12T23:59:59+07:00")
    assert deadline_items(check(http)) == [(c, 2, "hours", "2026-10-12T22:00:00+07:00")]


def test_moments_passed_before_they_became_possible_are_produced_at_the_next_check(wired):
    http, clock, *_ = wired
    clock.set("2026-10-10T15:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [
        {"amount": 1, "unit": "days"}, {"amount": 3, "unit": "days"}, {"amount": 2, "unit": "hours"}]}))
    a = new_commission(http, title="Today", deadline="2026-10-10")  # created after both day leads passed
    produced = check(http)
    assert deadline_items(produced) == [
        (a, 3, "days", "2026-10-08T00:00:00+07:00"),
        (a, 1, "days", "2026-10-10T00:00:00+07:00"),
    ]
    assert check(http) == []
    clock.set("2026-10-10T22:00:00+07:00")
    assert deadline_items(check(http)) == [(a, 2, "hours", "2026-10-10T22:00:00+07:00")]


def test_changed_deadline_rearms_its_reminders(wired):
    http, clock, *_ = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}, {"amount": 3, "unit": "days"}]}))
    a = new_commission(http, title="A", deadline="2026-10-10")
    assert len(check(http)) == 2
    edit_commission(http, a, "A", "2026-10-11")  # ends 10-12T00:00: 1 day -> 10-11T00:00 (future), 3 days -> 10-09T00:00
    assert deadline_items(check(http)) == [(a, 3, "days", "2026-10-09T00:00:00+07:00")]
    clock.set("2026-10-11T00:00:00+07:00")
    assert deadline_items(check(http)) == [(a, 1, "days", "2026-10-11T00:00:00+07:00")]
    assert check(http) == []


def test_a_lead_time_added_later_is_the_only_new_reminder(wired):
    http, clock, *_ = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}]}))
    a = new_commission(http, title="A", deadline="2026-10-10")
    assert len(check(http)) == 1
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 24, "unit": "hours"}, {"amount": 2, "unit": "days"}]}))
    # 24 hours has the duration of 1 day: already produced. 2 days is new.
    assert deadline_items(check(http)) == [(a, 2, "days", "2026-10-09T00:00:00+07:00")]
    assert check(http) == []


def test_open_commissions_only_and_no_deadline_no_reminder(wired):
    http, clock, *_ = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}]}))
    held = new_commission(http, title="Held", deadline="2026-10-10", stage="on_hold")
    unset = new_commission(http, title="Unset", deadline="2026-10-10")
    new_commission(http, title="Delivered", deadline="2026-10-10", stage="delivered")
    new_commission(http, title="Cancelled", deadline="2026-10-10", stage="cancelled")
    new_commission(http, title="Yesterday", deadline="2026-10-09")
    new_commission(http, title="None", deadline=None)
    produced = check(http)
    assert sorted(i[0] for i in deadline_items(produced)) == sorted([held, unset])
    assert check(http) == []


def test_digest_and_deadline_reminders_together_are_ordered(wired):
    http, clock, *_ = wired
    clock.set("2026-10-09T08:00:00+07:00")
    save(http, settings(periodic={"enabled": True, "at_time": "00:00"},
                        deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}, {"amount": 2, "unit": "days"}]}))
    a = new_commission(http, title="A", deadline="2026-10-10")
    b = new_commission(http, title="B", deadline="2026-10-10")
    clock.set("2026-10-10T01:00:00+07:00")
    produced = check(http)
    first, second = sorted([a, b])
    assert [(n["kind"], n["due_at"], (n["deadline_item"] or {}).get("commission_id")) for n in produced] == [
        ("deadline", "2026-10-09T00:00:00+07:00", first),
        ("deadline", "2026-10-09T00:00:00+07:00", second),
        ("deadline", "2026-10-10T00:00:00+07:00", first),
        ("deadline", "2026-10-10T00:00:00+07:00", second),
        ("periodic_digest", "2026-10-10T00:00:00+07:00", None),
    ]
    assert pending(http) == produced


def test_extreme_moments_within_the_bound(wired):
    # The longest lead the contract allows, on a near deadline and on the last
    # representable date (whose end, 10000-01-01, cannot be dated).
    http, clock, *_ = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [
        {"amount": 8760, "unit": "hours"}, {"amount": 1, "unit": "days"}]}))
    a = new_commission(http, title="A", deadline="2026-10-10")
    new_commission(http, title="Far", deadline="9999-12-31")
    assert deadline_items(check(http)) == [
        (a, 8760, "hours", "2025-10-11T00:00:00+07:00"),
        (a, 1, "days", "2026-10-10T00:00:00+07:00"),
    ]
    assert check(http) == []


def test_unrepresentable_moments_do_not_fail(wired):
    # Routers refuse any lead above 365 days, so such leads can only be in
    # storage if written there directly; the Services still skip what cannot
    # be dated instead of failing. The test writes the workflow's own row.
    http, clock, db, _ = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}]}))
    leads = [{"amount": MAX_INT, "unit": "hours"}, {"amount": MAX_INT, "unit": "days"},
             {"amount": 17_000_000, "unit": "hours"}, {"amount": 1, "unit": "days"}]
    with db.transaction() as conn:
        conn.execute("UPDATE reminder_settings SET lead_times = ? WHERE id = 1", (json.dumps(leads),))
    a = new_commission(http, title="A", deadline="2026-10-10")
    new_commission(http, title="Far", deadline="9999-12-31")
    produced = deadline_items(check(http))
    # 17,000,000 hours before 2026-10-11 is in year 0087: produced; the two
    # leads that reach before year 1 cannot be dated and are skipped.
    assert [(p[0], p[1], p[2]) for p in produced] == [(a, 17_000_000, "hours"), (a, 1, "days")]
    assert produced[0][3].startswith("0087-")
    assert check(http) == []


# --- pending and acknowledgement -----------------------------------------------------

def test_pending_acknowledge_twice_and_not_found(wired):
    http, clock, *_ = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}, {"amount": 3, "unit": "days"}]}))
    a = new_commission(http, title="A", deadline="2026-10-10")
    produced = check(http)
    assert pending(http) == produced
    first = produced[0]["notification_id"]
    clock.set("2026-10-10T11:00:00+07:00")
    r = http.put(f"/reminders/{first}/ack")
    assert r.status_code == 200 and r.json() == {"notification_id": first, "acknowledged_at": "2026-10-10T11:00:00+07:00"}
    clock.set("2026-10-10T12:00:00+07:00")
    r = http.put(f"/reminders/{first}/ack")
    assert r.status_code == 200 and r.json()["acknowledged_at"] == "2026-10-10T11:00:00+07:00"
    assert pending(http) == produced[1:]
    assert_error(http.put(f"/reminders/{UNKNOWN_ID}/ack"), 404, "ERR_NOT_FOUND")
    assert_error(http.put("/reminders/not-an-id/ack"), 404, "ERR_NOT_FOUND")
    assert_error(http.put(f"/reminders/{UNKNOWN_ID.upper()}/ack"), 404, "ERR_NOT_FOUND")
    # Pending ones never expire: not when the kind is disabled, nor when the
    # commission is cancelled, nor after its deadline.
    save(http, settings())
    set_stage(http, a, "cancelled")
    clock.set("2026-11-30T00:00:00+07:00")
    assert pending(http) == produced[1:]
    assert check(http) == []


def test_concurrent_checks_hand_out_each_reminder_once(wired):
    http, clock, *_ = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(periodic={"enabled": True, "at_time": "09:00"},
                        deadline={"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}, {"amount": 3, "unit": "days"}]}))
    clock.set("2026-10-11T09:30:00+07:00")
    for i in range(4):
        new_commission(http, title=f"C{i}", deadline="2026-10-11")
    start = threading.Barrier(4)
    results = [None] * 4

    def worker(i):
        start.wait()
        results[i] = check(http)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    ids = [n["notification_id"] for r in results for n in r]
    assert len(ids) == 9 == len(set(ids))  # 4 x 2 deadline reminders + 1 digest
    assert sorted(ids) == sorted(n["notification_id"] for n in pending(http))


# --- storage -----------------------------------------------------------------------

def test_storage_failure_is_500_on_every_endpoint(wired):
    http, clock, db, db_path = wired
    save(http, settings(deadline={"enabled": True}))
    blocker = sqlite3.connect(db_path, isolation_level=None)
    blocker.execute("BEGIN EXCLUSIVE")
    try:
        for r in (http.get("/reminders/settings"),
                  http.put("/reminders/settings", json={"reminder_settings_input": settings()}),
                  http.post("/reminders/checks"),
                  http.get("/reminders/pending"),
                  http.put(f"/reminders/{UNKNOWN_ID}/ack")):
            assert_error(r, 500, "ERR_STORAGE_IO")
            assert "locked" in r.json()["details"]["reason"]
    finally:
        blocker.execute("ROLLBACK")
        blocker.close()
    assert http.get("/reminders/settings").status_code == 200


def test_storage_failure_behind_update_progress_and_own_table(wired):
    http, clock, db, db_path = wired
    clock.set("2026-10-10T10:00:00+07:00")
    save(http, settings(deadline={"enabled": True}))
    new_commission(http, deadline="2026-10-10")
    other = sqlite3.connect(db_path, isolation_level=None)
    try:
        other.execute("ALTER TABLE stage_change RENAME TO stage_change_hidden")
        r = http.post("/reminders/checks")
        assert_error(r, 500, "ERR_STORAGE_IO")
        assert r.json()["details"]["reason"].startswith("update_progress: ")
        other.execute("ALTER TABLE stage_change_hidden RENAME TO stage_change")
        other.execute("ALTER TABLE reminder_notification RENAME TO reminder_notification_hidden")
        r = http.post("/reminders/checks")
        assert_error(r, 500, "ERR_STORAGE_IO")
        assert "no such table" in r.json()["details"]["reason"]
        other.execute("ALTER TABLE reminder_notification_hidden RENAME TO reminder_notification")
    finally:
        other.close()
    # Nothing was written by the failed check: the reminder is produced now.
    assert len(check(http)) == 1


def test_programming_error_is_not_turned_into_500(wired, monkeypatch):
    http, *_ = wired
    from workflows.send_reminder import adapters

    def broken(self):
        raise KeyError("bug")

    monkeypatch.setattr(adapters.ReminderRepository, "fetch_pending", broken)
    with pytest.raises(KeyError):
        http.get("/reminders/pending")


def test_tables_are_own_and_have_no_foreign_key(wired):
    http, clock, db, db_path = wired
    conn = sqlite3.connect(db_path)
    try:
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        own = {"send_reminder_schema_version", "reminder_settings", "reminder_deadline_sent", "reminder_notification"}
        assert own <= tables
        for t in own:
            assert conn.execute(f"PRAGMA foreign_key_list({t})").fetchall() == []
        assert conn.execute("SELECT version FROM send_reminder_schema_version").fetchall() == [(1,)]
    finally:
        conn.close()


def test_newer_table_version_is_refused(wired):
    http, clock, db, db_path = wired
    with db.transaction() as conn:
        conn.execute("UPDATE send_reminder_schema_version SET version = 99")
    with pytest.raises(StorageVersionError):
        ReminderRepository(db).ensure_storage()
