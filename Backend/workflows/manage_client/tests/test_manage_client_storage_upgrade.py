"""Storage upgrade of manage_client (BE-11): a step 2 applied to a database that
already holds records, made by the real code at version 1.

The product list has only step 1. Step 2 exists in this test only: it replaces
``_STORAGE_UPGRADES`` of this workflow through monkeypatch. The layer is
started again on the same file by calling Backend.wire_workflows on a fresh
connection (tests/storage_upgrade.py), which is the call that runs
ensure_storage().
"""

import sqlite3

import pytest

from tests.storage_upgrade import BAD_STATEMENT, boot, get_json, has_column, version_rows
from workflows.manage_client import adapters as client_adapters

VERSION_TABLE = "manage_client_schema_version"
GOOD_STATEMENT = "ALTER TABLE client ADD COLUMN upgrade_probe TEXT"


def _seed(http) -> list[str]:
    ids = []
    for name, contacts, note in (
        ("Mai", [{"channel": "discord", "value": "mai#0001"}, {"channel": "email", "value": "mai@example.com"}], None),
        ("Ánh", [], "prefers pastel"),
    ):
        r = http.post("/clients", json={"client_input": {"display_name": name, "contacts": contacts, "note": note}})
        assert r.status_code == 201, r.text
        ids.append(r.json()["client_id"])
    return ids


def _observe(http, ids: list[str]) -> dict:
    return {"list": get_json(http, "/clients"), "details": [get_json(http, f"/clients/{i}") for i in ids]}


def test_step_2_upgrades_existing_data_once_and_a_failing_step_rolls_back(tmp_path, monkeypatch):
    original = list(client_adapters._STORAGE_UPGRADES)
    assert [version for version, _ in original] == [1]  # the product list: step 1 only
    db_path = str(tmp_path / "upgrade" / "data.db")

    # A database made by the real code at version 1, holding records.
    with boot(db_path) as http:
        ids = _seed(http)
        before = _observe(http, ids)
    assert version_rows(db_path, VERSION_TABLE) == [1]
    assert not has_column(db_path, "client", "upgrade_probe")

    # Start again with a fake step 2 that touches only this workflow's table.
    monkeypatch.setattr(client_adapters, "_STORAGE_UPGRADES", original + [(2, [GOOD_STATEMENT])])
    with boot(db_path) as http:
        after = _observe(http, ids)
    assert has_column(db_path, "client", "upgrade_probe")  # (a) step 2 ran
    assert after == before  # (b) the old records are unchanged
    assert version_rows(db_path, VERSION_TABLE) == [2]  # (c) one row, version 2

    # (d) A third start with the same list does not run step 2 again: it would
    # fail with "duplicate column name".
    with boot(db_path) as http:
        assert _observe(http, ids) == before
    assert version_rows(db_path, VERSION_TABLE) == [2]

    # (e) On a new file at version 1: step 2 = a good statement, then a bad
    # one. Start-up fails and everything is undone.
    monkeypatch.setattr(client_adapters, "_STORAGE_UPGRADES", original)
    failing_path = str(tmp_path / "failing" / "data.db")
    with boot(failing_path) as http:
        failing_ids = _seed(http)
        failing_before = _observe(http, failing_ids)
    monkeypatch.setattr(
        client_adapters, "_STORAGE_UPGRADES", original + [(2, [GOOD_STATEMENT, BAD_STATEMENT])]
    )
    with pytest.raises(sqlite3.OperationalError):
        with boot(failing_path):
            pass
    assert version_rows(failing_path, VERSION_TABLE) == [1]
    assert not has_column(failing_path, "client", "upgrade_probe")
    monkeypatch.setattr(client_adapters, "_STORAGE_UPGRADES", original)
    with boot(failing_path) as http:
        assert _observe(http, failing_ids) == failing_before
