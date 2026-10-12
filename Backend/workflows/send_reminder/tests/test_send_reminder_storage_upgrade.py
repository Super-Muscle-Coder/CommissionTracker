"""Storage upgrade of send_reminder (BE-11): a step 2 applied to a database that
already holds records, made by the real code at version 1.

The product list has only step 1. Step 2 exists in this test only: it replaces
``_STORAGE_UPGRADES`` of this workflow through monkeypatch. The layer is
started again on the same file by calling Backend.wire_workflows on a fresh
connection (tests/storage_upgrade.py), which is the call that runs
ensure_storage(). The only thing handed over differently is the clock (a fixed
+07:00 one, like tests/test_send_reminder.py), so that a deadline reminder can
be produced and stored.
"""

import sqlite3
from datetime import datetime, timedelta, timezone

import pytest

from tests.storage_upgrade import BAD_STATEMENT, boot, get_json, has_column, version_rows
from workflows.send_reminder import adapters as reminder_adapters

TZ = timezone(timedelta(hours=7))
VERSION_TABLE = "send_reminder_schema_version"
GOOD_STATEMENT = "ALTER TABLE reminder_notification ADD COLUMN upgrade_probe TEXT"


class FakeClock:
    """Same three methods as SystemClock, on a settable 'now', in +07:00."""

    def __init__(self, now: str) -> None:
        self.current = datetime.fromisoformat(now)

    def now(self) -> datetime:
        return self.current

    def at_local(self, wall: datetime) -> datetime:
        return wall.replace(tzinfo=TZ)

    def to_local(self, when: datetime) -> datetime:
        return when.astimezone(TZ)


def _seed(http, clock: FakeClock) -> None:
    clock.current = datetime.fromisoformat("2026-10-01T08:00:00+07:00")
    r = http.post("/clients", json={"client_input": {"display_name": "Mai", "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    r = http.post("/commissions", json={"commission_input": {
        "client_id": r.json()["client_id"], "title": "Bust", "description": None, "commission_type": None,
        "agreed_price": {"amount_minor": 100, "currency": "VND"}, "deadline": "2026-10-10", "reference_links": [],
    }})
    assert r.status_code == 201, r.text
    r = http.put("/reminders/settings", json={"reminder_settings_input": {
        "periodic": {"enabled": False, "every": 1, "unit": "days", "at_time": "09:00", "weekday": None},
        "deadline": {"enabled": True, "lead_times": [{"amount": 1, "unit": "days"}]},
    }})
    assert r.status_code == 200, r.text
    clock.current = datetime.fromisoformat("2026-10-10T00:00:00+07:00")
    r = http.post("/reminders/checks")
    assert r.status_code == 200, r.text
    assert len(r.json()) == 1  # one stored notification, not yet acknowledged


def _observe(http) -> dict:
    return {"settings": get_json(http, "/reminders/settings"), "pending": get_json(http, "/reminders/pending")}


def test_step_2_upgrades_existing_data_once_and_a_failing_step_rolls_back(tmp_path, monkeypatch):
    original = list(reminder_adapters._STORAGE_UPGRADES)
    assert [version for version, _ in original] == [1]  # the product list: step 1 only
    clock = FakeClock("2026-10-01T08:00:00+07:00")
    db_path = str(tmp_path / "upgrade" / "data.db")

    # A database made by the real code at version 1, holding records.
    with boot(db_path, reminder_clock=clock) as http:
        _seed(http, clock)
        before = _observe(http)
    assert len(before["pending"]) == 1
    assert version_rows(db_path, VERSION_TABLE) == [1]
    assert not has_column(db_path, "reminder_notification", "upgrade_probe")

    # Start again with a fake step 2 that touches only this workflow's table.
    monkeypatch.setattr(reminder_adapters, "_STORAGE_UPGRADES", original + [(2, [GOOD_STATEMENT])])
    with boot(db_path, reminder_clock=clock) as http:
        after = _observe(http)
    assert has_column(db_path, "reminder_notification", "upgrade_probe")  # (a) step 2 ran
    assert after == before  # (b) the old records are unchanged
    assert version_rows(db_path, VERSION_TABLE) == [2]  # (c) one row, version 2

    # (d) A third start with the same list does not run step 2 again: it would
    # fail with "duplicate column name".
    with boot(db_path, reminder_clock=clock) as http:
        assert _observe(http) == before
    assert version_rows(db_path, VERSION_TABLE) == [2]

    # (e) On a new file at version 1: step 2 = a good statement, then a bad
    # one. Start-up fails and everything is undone.
    monkeypatch.setattr(reminder_adapters, "_STORAGE_UPGRADES", original)
    failing_path = str(tmp_path / "failing" / "data.db")
    with boot(failing_path, reminder_clock=clock) as http:
        _seed(http, clock)
        failing_before = _observe(http)
    monkeypatch.setattr(
        reminder_adapters, "_STORAGE_UPGRADES", original + [(2, [GOOD_STATEMENT, BAD_STATEMENT])]
    )
    with pytest.raises(sqlite3.OperationalError):
        with boot(failing_path, reminder_clock=clock):
            pass
    assert version_rows(failing_path, VERSION_TABLE) == [1]
    assert not has_column(failing_path, "reminder_notification", "upgrade_probe")
    monkeypatch.setattr(reminder_adapters, "_STORAGE_UPGRADES", original)
    with boot(failing_path, reminder_clock=clock) as http:
        assert _observe(http) == failing_before
