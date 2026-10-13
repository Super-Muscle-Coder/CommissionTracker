"""Layer test: a query parameter that is not an input of an http entry is
ignored (API Contract 6.1.0, clause_a_common.endpoint_forms.http; R42-9).

Every `GET` entry of the backend is called twice on the same wired layer,
once as declared and once with extra parameters added (`foo=1`, a repeated
one, and one with a value that is not UTF-8). The answer must be the same:
same label, same body. The table below lists the 17 entries by hand and a
check ties it to the routes the layer registers, so a new `GET` entry cannot
be added without a row here.
"""

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

import Backend
from workflows.scaffold_backend import adapters as scaffold

APP_VERSION = "1.0.0"

# (route path as registered, URL template). {c}, {m}, {p} are a client, a
# commission and a watermark profile created by the fixture.
GET_ENTRIES = [
    ("/clients", "/clients"),
    ("/clients/{client_id}", "/clients/{c}"),
    ("/commissions", "/commissions"),
    ("/commissions/{commission_id}", "/commissions/{m}"),
    ("/currencies", "/currencies"),
    ("/commissions/{commission_id}/stage", "/commissions/{m}/stage"),
    ("/commissions/{commission_id}/stage/history", "/commissions/{m}/stage/history"),
    ("/progress/board", "/progress/board"),
    ("/progress/stages", "/progress/stages"),
    ("/payments", "/payments?commission_id={m}"),
    ("/payments/balance/{commission_id}", "/payments/balance/{m}"),
    ("/reports/income", "/reports/income?period_from=2026-09-01&period_to=2026-09-30"),
    ("/watermark-profiles", "/watermark-profiles"),
    ("/watermark-profiles/{profile_id}", "/watermark-profiles/{p}"),
    ("/watermark-strengths", "/watermark-strengths"),
    ("/reminders/settings", "/reminders/settings"),
    ("/reminders/pending", "/reminders/pending"),
]

EXTRAS = [
    "foo=1",
    "foo=1&foo=2&bar=",
    "client_id=0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b&limit=10",
    "x=%ED%A0%80",
]


@pytest.fixture
def layer(tmp_path):
    db_path = str(tmp_path / "data" / "data.db")
    configs = {n: Backend.load_yaml(p) for n, p in Backend.WORKFLOW_CONFIG_FILES.items()}
    scaffold.ensure_database_folder(db_path)
    db = scaffold.open_connection(db_path, **configs["scaffold_backend"])
    app = Backend.create_http_app(Backend.load_yaml(Backend.LAYER_CONFIG_FILE))
    Backend.wire_workflows(app, db, configs, app_version=APP_VERSION)
    with TestClient(app) as http:
        client_id = http.post("/clients", json={"client_input": {
            "display_name": "Mai", "contacts": [], "note": None}}).json()["client_id"]
        commission_id = http.post("/commissions", json={"commission_input": {
            "client_id": client_id, "title": "Bust", "description": None, "commission_type": None,
            "agreed_price": {"amount_minor": 1000, "currency": "VND"}, "deadline": None,
            "reference_links": []}}).json()["commission_id"]
        assert http.put(f"/commissions/{commission_id}/stage",
                        json={"stage_change": {"to_stage": "sketch", "note": None}}).status_code == 200
        assert http.post("/payments", json={"commission_id": commission_id, "payment_input": {
            "direction": "incoming", "kind": "deposit", "amount": {"amount_minor": 100, "currency": "VND"},
            "method": "cash", "paid_at": "2026-09-20T10:00:00+07:00", "note": None}}).status_code == 201
        profile_id = http.post("/watermark-profiles", json={"profile_input": {
            "display_name": "Mây", "legal_name": None, "contact": None, "ownership_statement": None,
            "default_strength": "balanced"}}).json()["profile_id"]
        ids = {"c": client_id, "m": commission_id, "p": profile_id}
        yield http, app, ids
    db.close()


def test_the_table_lists_every_get_entry_the_layer_registers(layer):
    _, app, _ = layer
    registered = {r.path for r in app.routes if isinstance(r, APIRoute) and "GET" in r.methods}
    assert registered == {path for path, _ in GET_ENTRIES}
    assert len(GET_ENTRIES) == 17


def _comparable(response):
    body = response.json()
    if isinstance(body, dict):
        # The only value that changes between two calls of the same entry.
        body.pop("generated_at", None)
    return response.status_code, body


@pytest.mark.parametrize("extra", EXTRAS, ids=["one", "repeated-and-empty", "named-like-an-id", "not-utf8"])
@pytest.mark.parametrize("path,template", GET_ENTRIES, ids=[p for p, _ in GET_ENTRIES])
def test_an_extra_query_parameter_changes_nothing(layer, path, template, extra):
    http, _, ids = layer
    url = template.format(**ids)
    plain = http.get(url)
    assert plain.status_code == 200, plain.text
    joiner = "&" if "?" in url else "?"
    with_extra = http.get(f"{url}{joiner}{extra}")
    assert _comparable(with_extra) == _comparable(plain)
