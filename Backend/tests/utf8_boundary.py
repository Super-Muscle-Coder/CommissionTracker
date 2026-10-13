"""Mechanics shared by the "a string that UTF-8 cannot encode" tests of the
seven workflows whose http entries take a JSON body (R42-1).

A JSON text may spell a lone surrogate ("\\ud800"): it parses to a Python str
that cannot be written to SQLite, to a file path, or to a response body. Each
workflow's Routers must refuse it as a format error, with the 400 label and
ERR_VALIDATION that entry declares. This module builds one case per string of
a valid body: the string itself, and an unknown field name added next to the
known fields (the name is echoed in the location of a Pydantic error, so it
must not reach it). The assertions and the "nothing was written" snapshot are
written out in each workflow's own test.
"""

import copy
import json

import pytest

LONE_SURROGATE = "\ud800"


def _value_paths(node, path=()):
    if isinstance(node, str):
        yield path
    elif isinstance(node, dict):
        for key, item in node.items():
            yield from _value_paths(item, path + (key,))
    elif isinstance(node, list):
        for index, item in enumerate(node):
            yield from _value_paths(item, path + (index,))


def _object_paths(node, path=()):
    if isinstance(node, dict):
        yield path
        for key, item in node.items():
            yield from _object_paths(item, path + (key,))
    elif isinstance(node, list):
        for index, item in enumerate(node):
            yield from _object_paths(item, path + (index,))


def _locate(root, path):
    node = root
    for step in path:
        node = node[step]
    return node


def _label(path) -> str:
    return ".".join(str(step) for step in path) or "<body>"


def surrogate_cases(payload) -> list:
    """pytest params ``(mutated_payload, expected_loc)`` for ``payload``."""
    cases = []
    for path in _value_paths(payload):
        mutated = copy.deepcopy(payload)
        holder = _locate(mutated, path[:-1])
        # Appended to the valid value, so that the value is otherwise as
        # valid as before (an absolute path stays absolute).
        holder[path[-1]] = holder[path[-1]] + LONE_SURROGATE
        cases.append(pytest.param(mutated, [str(s) for s in path], id=f"value {_label(path)}"))
    for path in _object_paths(payload):
        mutated = copy.deepcopy(payload)
        _locate(mutated, path)[LONE_SURROGATE] = 1
        cases.append(pytest.param(mutated, [str(s) for s in path], id=f"field name in {_label(path)}"))
    return cases


def surrogate_case(payload, case_id: str):
    """``(mutated_payload, expected_loc)`` of the case ``case_id`` of
    ``surrogate_cases(payload)``, for a test whose valid body is only known
    when it runs (a path under a temporary folder)."""
    for case in surrogate_cases(payload):
        if case.id == case_id:
            return case.values
    raise KeyError(case_id)


def send(http, method: str, url: str, payload):
    """Send ``payload`` as JSON with ASCII escapes: the json= argument of httpx
    writes the text in UTF-8 and fails on the client side for a lone surrogate."""
    return http.request(
        method, url, content=json.dumps(payload), headers={"content-type": "application/json"}
    )


def assert_rejected(r, expected_loc) -> None:
    """400 + error_body ERR_VALIDATION, in JSON, naming the field."""
    assert r.status_code == 400, r.text
    assert r.headers["content-type"].startswith("application/json"), r.headers["content-type"]
    body = r.json()
    assert set(body) == {"code", "message", "details"}
    assert body["code"] == "ERR_VALIDATION"
    errors = body["details"]["errors"]
    assert errors and all(isinstance(e["loc"], list) and isinstance(e["msg"], str) for e in errors)
    assert errors[0]["loc"] == expected_loc
