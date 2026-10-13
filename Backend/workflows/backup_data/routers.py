"""Routers of backup_data: the workflow's only entry points.

Endpoints (api_contract.yaml, clause_b_backend.backup_data):
  create_backup   http  POST /backups                           body {backup_request}
  prepare_restore http  POST /backups/restore-preparations      body {archive_path}

Both answer 500 + ERR_STORAGE_IO when reading or writing a file or the
database fails (StorageIOError from the Adapters); no other exception is
turned into 500.

Only format checks and boundary conversions happen here: required keys,
strict types, no extra keys, an absolute path (formats of file_path), the two
values of purpose. That the folder or the file exists is a decision of the
Services. The body is declared untyped so FastAPI never answers with its own
422. The Pydantic models below exist only for format checks; they are not
Entities.
"""

import os
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints, ValidationError

from .entities import ArchiveRecord, BackupRequest, RestoreStaging
from .services import (
    ArchiveNotFoundError,
    BackupDataService,
    DestinationInvalidError,
    StorageIOError,
)


def _absolute_path(value: str) -> str:
    # clause_a_common.types.file_path: an absolute path on the local machine.
    if "\0" in value or not os.path.isabs(value):
        raise ValueError("must be an absolute path")
    return value


FilePath = Annotated[str, StringConstraints(min_length=1), AfterValidator(_absolute_path)]


# --- format models (input_expected) -----------------------------------------

class _BackupRequestFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    destination_dir: FilePath
    purpose: Literal["manual", "pre_restore"]


class _CreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    backup_request: _BackupRequestFormat


class _PrepareBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    archive_path: FilePath


# --- boundary conversions ---------------------------------------------------

def _error_response(label: int, code: str, message: str, details: dict | None = None) -> JSONResponse:
    # clause_a_common.error_body
    return JSONResponse(status_code=label, content={"code": code, "message": message, "details": details})


def _validation_details(exc: ValidationError) -> dict:
    return {
        "errors": [
            {"loc": [str(p) for p in e["loc"]], "msg": e["msg"]}
            for e in exc.errors(include_url=False, include_context=False, include_input=False)
        ]
    }


def _is_utf8_text(text: str) -> bool:
    try:
        text.encode("utf-8")
    except UnicodeEncodeError:
        return False
    return True


def _utf8_errors(payload: object) -> list[dict]:
    # A JSON text may spell a lone surrogate ("\ud800"): it parses to a str, but
    # no UTF-8 text (a response body, the path echoed in an answer) can hold
    # it. That is a format error of the input, refused at the boundary for
    # every string and every field name of the body, whatever the field.
    # Walked without recursion: the body may be nested as deep as the JSON
    # parser allows.
    errors: list[dict] = []
    pending: list[tuple[object, tuple[str, ...]]] = [(payload, ())]
    while pending:
        value, loc = pending.pop()
        if isinstance(value, str):
            if not _is_utf8_text(value):
                errors.append({"loc": list(loc), "msg": "must be text that UTF-8 can encode"})
        elif isinstance(value, dict):
            children = []
            for key, item in value.items():
                if _is_utf8_text(key):
                    children.append((item, loc + (key,)))
                else:
                    errors.append({"loc": list(loc), "msg": "a field name must be text that UTF-8 can encode"})
            pending.extend(reversed(children))
        elif isinstance(value, list):
            pending.extend(reversed([(item, loc + (str(i),)) for i, item in enumerate(value)]))
    return errors


def _storage_error_response(exc: StorageIOError) -> JSONResponse:
    return _error_response(500, "ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})


def _backup_archive_record(a: ArchiveRecord) -> dict:
    return {
        "archive_path": a.archive_path,
        "app_version": a.app_version,
        "size_bytes": a.size_bytes,
        "sha256": a.sha256,
        "created_at": a.created_at.isoformat(),
    }


def _restore_staging_record(r: RestoreStaging) -> dict:
    return {
        "archive_path": r.archive_path,
        "is_valid": r.is_valid,
        "is_compatible": r.is_compatible,
        "app_version": r.app_version,
        "created_at": r.created_at,
        "reason": r.reason,
        "staged_db_path": r.staged_db_path,
    }


# --- endpoints --------------------------------------------------------------

def create_backup_data_routers(service: BackupDataService) -> APIRouter:
    router = APIRouter()

    # create_backup — POST /backups, JSON body {backup_request}
    @router.post("/backups")
    def create_backup(payload: Any = Body(default=None)) -> JSONResponse:
        problems = _utf8_errors(payload)
        if problems:
            return _error_response(400, "ERR_VALIDATION", "Invalid backup request.", {"errors": problems})
        try:
            body = _CreateBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid backup request.", _validation_details(exc))
        request = BackupRequest(
            destination_dir=body.backup_request.destination_dir, purpose=body.backup_request.purpose
        )
        try:
            archive = service.create_backup(request)
        except DestinationInvalidError as exc:
            return _error_response(
                400,
                "ERR_VALIDATION",
                "destination_dir must be an existing folder.",
                {"errors": [{"loc": ["backup_request", "destination_dir"], "msg": str(exc)}]},
            )
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=201, content=_backup_archive_record(archive))

    # prepare_restore — POST /backups/restore-preparations, JSON body {archive_path}
    @router.post("/backups/restore-preparations")
    def prepare_restore(payload: Any = Body(default=None)) -> JSONResponse:
        problems = _utf8_errors(payload)
        if problems:
            return _error_response(400, "ERR_VALIDATION", "Invalid archive_path.", {"errors": problems})
        try:
            body = _PrepareBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid archive_path.", _validation_details(exc))
        try:
            staging = service.prepare_restore(body.archive_path)
        except ArchiveNotFoundError as exc:
            return _error_response(404, "ERR_NOT_FOUND", "Archive file not found.", {"archive_path": exc.archive_path})
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_restore_staging_record(staging))

    return router
