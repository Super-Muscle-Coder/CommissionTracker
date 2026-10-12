"""Storage upgrade of record_payment (BE-11): a step 2 applied to a database
that already holds records, made by the real code at version 1.

The product list has only step 1. Step 2 exists in this test only: it replaces
``_STORAGE_UPGRADES`` of this workflow through monkeypatch. Unlike the other
workflows, step 2 here adds an index, so that both a new column and a new
index are shown to be applied by the same mechanism. The layer is started
again on the same file by calling Backend.wire_workflows on a fresh
connection (tests/storage_upgrade.py), which is the call that runs
ensure_storage().
"""

import sqlite3

import pytest

from tests.storage_upgrade import BAD_STATEMENT, boot, get_json, has_index, version_rows
from workflows.record_payment import adapters as payment_adapters

VERSION_TABLE = "record_payment_schema_version"
INDEX = "payment_by_paid_at"
GOOD_STATEMENT = f"CREATE INDEX {INDEX} ON payment (paid_at)"


def _seed(http) -> list[str]:
    r = http.post("/clients", json={"client_input": {"display_name": "Mai", "contacts": [], "note": None}})
    assert r.status_code == 201, r.text
    client_id = r.json()["client_id"]
    r = http.post("/commissions", json={"commission_input": {
        "client_id": client_id, "title": "Bust", "description": None, "commission_type": None,
        "agreed_price": {"amount_minor": 1_000_000, "currency": "VND"}, "deadline": None, "reference_links": [],
    }})
    assert r.status_code == 201, r.text
    commission_id = r.json()["commission_id"]
    for kind, amount, paid_at, note in (
        ("deposit", 300_000, "2026-09-20T10:00:00+07:00", "cọc 30%"),
        ("final", 200_000, "2026-09-25T10:00:00+07:00", None),
    ):
        r = http.post("/payments", json={"commission_id": commission_id, "payment_input": {
            "direction": "incoming", "kind": kind, "amount": {"amount_minor": amount, "currency": "VND"},
            "method": "bank_transfer", "paid_at": paid_at, "note": note,
        }})
        assert r.status_code == 201, r.text
    return [commission_id]


def _observe(http, ids: list[str]) -> dict:
    return {
        "payments": [get_json(http, "/payments", commission_id=i) for i in ids],
        "balance": [get_json(http, f"/payments/balance/{i}") for i in ids],
    }


def test_step_2_upgrades_existing_data_once_and_a_failing_step_rolls_back(tmp_path, monkeypatch):
    original = list(payment_adapters._STORAGE_UPGRADES)
    assert [version for version, _ in original] == [1]  # the product list: step 1 only
    db_path = str(tmp_path / "upgrade" / "data.db")

    # A database made by the real code at version 1, holding records.
    with boot(db_path) as http:
        ids = _seed(http)
        before = _observe(http, ids)
    assert len(before["payments"][0]) == 2
    assert version_rows(db_path, VERSION_TABLE) == [1]
    assert not has_index(db_path, INDEX)

    # Start again with a fake step 2 that touches only this workflow's table.
    monkeypatch.setattr(payment_adapters, "_STORAGE_UPGRADES", original + [(2, [GOOD_STATEMENT])])
    with boot(db_path) as http:
        after = _observe(http, ids)
    assert has_index(db_path, INDEX)  # (a) step 2 ran
    assert after == before  # (b) the old records are unchanged
    assert version_rows(db_path, VERSION_TABLE) == [2]  # (c) one row, version 2

    # (d) A third start with the same list does not run step 2 again: it would
    # fail with "index ... already exists".
    with boot(db_path) as http:
        assert _observe(http, ids) == before
    assert version_rows(db_path, VERSION_TABLE) == [2]

    # (e) On a new file at version 1: step 2 = a good statement, then a bad
    # one. Start-up fails and everything is undone.
    monkeypatch.setattr(payment_adapters, "_STORAGE_UPGRADES", original)
    failing_path = str(tmp_path / "failing" / "data.db")
    with boot(failing_path) as http:
        failing_ids = _seed(http)
        failing_before = _observe(http, failing_ids)
    monkeypatch.setattr(
        payment_adapters, "_STORAGE_UPGRADES", original + [(2, [GOOD_STATEMENT, BAD_STATEMENT])]
    )
    with pytest.raises(sqlite3.OperationalError):
        with boot(failing_path):
            pass
    assert version_rows(failing_path, VERSION_TABLE) == [1]
    assert not has_index(failing_path, INDEX)
    monkeypatch.setattr(payment_adapters, "_STORAGE_UPGRADES", original)
    with boot(failing_path) as http:
        assert _observe(http, failing_ids) == failing_before
