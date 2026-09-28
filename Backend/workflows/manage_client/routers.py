"""Routers of manage_client: the workflow's only entry points.

Endpoints (api_contract.yaml, clause_b_backend.manage_client):
  create_client        http        POST /clients
  list_clients         http        GET  /clients
  get_client           http        GET  /clients/{client_id}
  edit_client          http        PUT  /clients/{client_id}
  set_client_archived  http        PUT  /clients/{client_id}/archived
  get_client_summary   in_process  get_client_summary

Every endpoint also answers 500 + ERR_STORAGE_IO when the storage fails
(StorageIOError from the Adapters); no other exception is turned into 500.

Only format checks and boundary conversions happen here. Parameters are
declared untyped (str / Any) so FastAPI never answers with its own 422; each
endpoint validates its inputs itself and answers with its declared labels.
The Pydantic models below exist only for format checks; they are not
Entities.
"""

import re
from typing import Annotated, Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, StringConstraints, ValidationError

from .entities import Client, ClientInput, ClientListItem, Contact
from .services import ClientNotFoundError, ManageClientService, StorageIOError

# clause_a_common.formats.id: UUID v4, lowercase string.
_ID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")


# --- format models (input_expected.client_input, is_archived) ---------------

class _ContactFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    channel: str
    value: str


class _ClientInputFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=120)]
    contacts: list[_ContactFormat]
    note: str | None


class _ClientInputBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    client_input: _ClientInputFormat


class _IsArchivedBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    is_archived: bool


# --- in_process error (clause_a_common.endpoint_forms.in_process) ------------

class InProcessCallError(Exception):
    """Raised by an in_process endpoint for a non-2xx result label.

    Callers identify it by its attributes ``label`` (int) and ``error_body``
    (dict), not by its type.
    """

    def __init__(self, label: int, error_body: dict) -> None:
        super().__init__(f"{label} {error_body['code']}: {error_body['message']}")
        self.label = label
        self.error_body = error_body


# --- boundary conversions ---------------------------------------------------

def _error_body(code: str, message: str, details: dict | None = None) -> dict:
    return {"code": code, "message": message, "details": details}


def _error_response(label: int, code: str, message: str, details: dict | None = None) -> JSONResponse:
    return JSONResponse(status_code=label, content=_error_body(code, message, details))


def _validation_details(exc: ValidationError) -> dict:
    return {
        "errors": [
            {"loc": [str(p) for p in e["loc"]], "msg": e["msg"]}
            for e in exc.errors(include_url=False, include_context=False, include_input=False)
        ]
    }


def _is_id(value: object) -> bool:
    return isinstance(value, str) and _ID_PATTERN.fullmatch(value) is not None


def _to_client_input(fmt: _ClientInputFormat) -> ClientInput:
    return ClientInput(
        display_name=fmt.display_name,
        contacts=[Contact(channel=c.channel, value=c.value) for c in fmt.contacts],
        note=fmt.note,
    )


def _client_detail(client: Client) -> dict:
    return {
        "client_id": client.client_id,
        "display_name": client.display_name,
        "contacts": [{"channel": c.channel, "value": c.value} for c in client.contacts],
        "note": client.note,
        "is_archived": client.is_archived,
        "created_at": client.created_at.isoformat(),
        "updated_at": client.updated_at.isoformat(),
    }


def _client_list_entry(item: ClientListItem) -> dict:
    return {
        "client_id": item.client_id,
        "display_name": item.display_name,
        "is_archived": item.is_archived,
        "updated_at": item.updated_at.isoformat(),
    }


def _not_found_body(client_id: str) -> dict:
    return _error_body("ERR_NOT_FOUND", "Client not found.", {"client_id": client_id})


def _storage_error_body(exc: StorageIOError) -> dict:
    return _error_body("ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})


def _storage_error_response(exc: StorageIOError) -> JSONResponse:
    return JSONResponse(status_code=500, content=_storage_error_body(exc))


def _invalid_id_response(client_id: str) -> JSONResponse:
    return _error_response(
        400, "ERR_VALIDATION", "client_id must be a lowercase UUID v4.", {"client_id": client_id}
    )


# --- endpoints --------------------------------------------------------------

def create_manage_client_routers(service: ManageClientService):
    """Return (http router, get_client_summary in_process entry)."""
    router = APIRouter()

    # create_client — POST /clients
    @router.post("/clients")
    def create_client(payload: Any = Body(default=None)) -> JSONResponse:
        try:
            body = _ClientInputBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid client_input.", _validation_details(exc))
        try:
            client = service.create(_to_client_input(body.client_input))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=201, content=_client_detail(client))

    # list_clients — GET /clients
    @router.get("/clients")
    def list_clients() -> JSONResponse:
        try:
            items = service.list_all()
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=[_client_list_entry(i) for i in items])

    # get_client — GET /clients/{client_id}
    # No 400 is declared: a malformed client_id names no client, hence 404.
    @router.get("/clients/{client_id}")
    def get_client(client_id: str) -> JSONResponse:
        if not _is_id(client_id):
            return JSONResponse(status_code=404, content=_not_found_body(client_id))
        try:
            client = service.get(client_id)
        except ClientNotFoundError:
            return JSONResponse(status_code=404, content=_not_found_body(client_id))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_client_detail(client))

    # edit_client — PUT /clients/{client_id}
    @router.put("/clients/{client_id}")
    def edit_client(client_id: str, payload: Any = Body(default=None)) -> JSONResponse:
        if not _is_id(client_id):
            return _invalid_id_response(client_id)
        try:
            body = _ClientInputBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid client_input.", _validation_details(exc))
        try:
            client = service.edit(client_id, _to_client_input(body.client_input))
        except ClientNotFoundError:
            return JSONResponse(status_code=404, content=_not_found_body(client_id))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_client_detail(client))

    # set_client_archived — PUT /clients/{client_id}/archived
    @router.put("/clients/{client_id}/archived")
    def set_client_archived(client_id: str, payload: Any = Body(default=None)) -> JSONResponse:
        if not _is_id(client_id):
            return _invalid_id_response(client_id)
        try:
            body = _IsArchivedBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid is_archived.", _validation_details(exc))
        try:
            client = service.set_archived(client_id, body.is_archived)
        except ClientNotFoundError:
            return JSONResponse(status_code=404, content=_not_found_body(client_id))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_client_detail(client))

    # get_client_summary — in_process, called by manage_commission.
    # No 400 is declared: a malformed client_id names no client, hence 404.
    def get_client_summary(*, client_id: str) -> dict:
        if not _is_id(client_id):
            raise InProcessCallError(404, _not_found_body(str(client_id)))
        try:
            summary = service.get_summary(client_id)
        except ClientNotFoundError:
            raise InProcessCallError(404, _not_found_body(client_id)) from None
        except StorageIOError as exc:
            raise InProcessCallError(500, _storage_error_body(exc)) from exc
        return {"client_id": summary.client_id, "is_archived": summary.is_archived}

    return router, get_client_summary
