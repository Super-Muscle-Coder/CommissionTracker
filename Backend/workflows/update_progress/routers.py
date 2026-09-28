"""Routers of update_progress: the workflow's only entry points.

Endpoints (api_contract.yaml, clause_b_backend.update_progress):
  change_stage         http        PUT  /commissions/{commission_id}/stage
  get_stage            http        GET  /commissions/{commission_id}/stage
  get_stage_history    http        GET  /commissions/{commission_id}/stage/history
  get_board            http        GET  /progress/board
  list_stages          http        GET  /progress/stages
  list_progress_board  in_process  list_progress_board

Every endpoint except list_stages also answers 500 + ERR_STORAGE_IO when the
storage fails (StorageIOError from the Adapters); no other exception is
turned into 500. list_stages only returns Configs.

Only format checks and boundary conversions happen here. Parameters are
declared untyped (str / Any) so FastAPI never answers with its own 422; each
endpoint validates its inputs itself and answers with its declared labels.
The Pydantic models below exist only for format checks; they are not
Entities.
"""

import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, ValidationError, ValidationInfo, field_validator

from .entities import ProgressEntry, ProgressState, StageChange, StageChangeRecord, StageOption
from .services import (
    CommissionNotFoundError,
    InvalidTransitionError,
    StorageIOError,
    UnknownStageError,
    UpdateProgressService,
)

# clause_a_common.formats.id: UUID v4, lowercase string.
_ID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")


# --- format models (input_expected.stage_change) ------------------------------

class _StageChangeFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    to_stage: str
    note: str | None

    @field_validator("to_stage")
    @classmethod
    def _in_catalog(cls, value: str, info: ValidationInfo) -> str:
        # type: "string (a stage of stage_catalog)" — the stage names are
        # given as validation context.
        stages = (info.context or {}).get("stages", [])
        if value not in stages:
            raise ValueError(f"to_stage must be one of {stages}")
        return value


class _StageChangeBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    stage_change: _StageChangeFormat


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


def _timestamp(t: datetime | None) -> str | None:
    return t.isoformat() if t is not None else None


def _progress_state(s: ProgressState) -> dict:
    return {
        "commission_id": s.commission_id,
        "current_stage": s.current_stage,
        "stage_kind": s.stage_kind,
        "updated_at": _timestamp(s.updated_at),
    }


def _progress_entry(e: ProgressEntry) -> dict:
    return {"commission_id": e.commission_id, "current_stage": e.current_stage, "stage_kind": e.stage_kind}


def _history_entry(r: StageChangeRecord) -> dict:
    return {"from_stage": r.from_stage, "to_stage": r.to_stage, "note": r.note, "changed_at": r.changed_at.isoformat()}


def _stage_option(o: StageOption) -> dict:
    return {"stage": o.stage, "kind": o.kind}


def _commission_not_found(commission_id: str) -> JSONResponse:
    return _error_response(404, "ERR_NOT_FOUND", "Commission not found.", {"commission_id": commission_id})


def _storage_error_body(exc: StorageIOError) -> dict:
    return _error_body("ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})


def _storage_error_response(exc: StorageIOError) -> JSONResponse:
    return JSONResponse(status_code=500, content=_storage_error_body(exc))


def _decision_error_response(exc: Exception) -> JSONResponse:
    # Result labels of the decisions taken by Services.
    if isinstance(exc, CommissionNotFoundError):
        return _commission_not_found(exc.commission_id)
    if isinstance(exc, UnknownStageError):
        return _error_response(400, "ERR_VALIDATION", "to_stage is not a stage of the catalog.", {"to_stage": exc.stage})
    if isinstance(exc, InvalidTransitionError):
        return _error_response(
            409,
            "ERR_INVALID_TRANSITION",
            "The requested stage change is not allowed from the current stage.",
            {
                "commission_id": exc.commission_id,
                "current_stage": exc.current_stage,
                "current_kind": exc.current_kind,
                "to_stage": exc.to_stage,
            },
        )
    return _storage_error_response(exc)  # StorageIOError


_DECISION_ERRORS = (CommissionNotFoundError, UnknownStageError, InvalidTransitionError, StorageIOError)


# --- endpoints --------------------------------------------------------------

def create_update_progress_routers(service: UpdateProgressService):
    """Return (http router, list_progress_board)."""
    router = APIRouter()
    stages = [o.stage for o in service.stage_options()]

    # change_stage — PUT /commissions/{commission_id}/stage, JSON body {stage_change}
    @router.put("/commissions/{commission_id}/stage")
    def change_stage(commission_id: str, payload: Any = Body(default=None)) -> JSONResponse:
        if not _is_id(commission_id):
            return _error_response(
                400, "ERR_VALIDATION", "commission_id must be a lowercase UUID v4.", {"commission_id": commission_id}
            )
        try:
            body = _StageChangeBody.model_validate(payload, context={"stages": stages})
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid stage_change.", _validation_details(exc))
        change = StageChange(to_stage=body.stage_change.to_stage, note=body.stage_change.note)
        try:
            state = service.change_stage(commission_id, change)
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=200, content=_progress_state(state))

    # get_stage — GET /commissions/{commission_id}/stage
    # No 400 is declared: a malformed commission_id names no commission, hence 404.
    @router.get("/commissions/{commission_id}/stage")
    def get_stage(commission_id: str) -> JSONResponse:
        if not _is_id(commission_id):
            return _commission_not_found(commission_id)
        try:
            state = service.state(commission_id)
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=200, content=_progress_state(state))

    # get_stage_history — GET /commissions/{commission_id}/stage/history
    # No 400 is declared: a malformed commission_id names no commission, hence 404.
    @router.get("/commissions/{commission_id}/stage/history")
    def get_stage_history(commission_id: str) -> JSONResponse:
        if not _is_id(commission_id):
            return _commission_not_found(commission_id)
        try:
            history = service.history(commission_id)
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=200, content=[_history_entry(r) for r in history])

    # get_board — GET /progress/board
    @router.get("/progress/board")
    def get_board() -> JSONResponse:
        try:
            entries = service.board()
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=[_progress_entry(e) for e in entries])

    # list_stages — GET /progress/stages (Configs only, no storage)
    @router.get("/progress/stages")
    def list_stages() -> JSONResponse:
        return JSONResponse(status_code=200, content=[_stage_option(o) for o in service.stage_options()])

    # list_progress_board — in_process, called by view_income_report, send_reminder.
    def list_progress_board() -> list[dict]:
        try:
            entries = service.board()
        except StorageIOError as exc:
            raise InProcessCallError(500, _storage_error_body(exc)) from exc
        return [_progress_entry(e) for e in entries]

    return router, list_progress_board
