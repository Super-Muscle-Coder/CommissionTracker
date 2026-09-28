"""Routers of manage_watermark_profile: the workflow's only entry points.

Endpoints (api_contract.yaml, clause_b_backend.manage_watermark_profile):
  create_profile      http        POST /watermark-profiles
  list_profiles       http        GET  /watermark-profiles
  get_profile         http        GET  /watermark-profiles/{profile_id}
  edit_profile        http        PUT  /watermark-profiles/{profile_id}
  list_strengths      http        GET  /watermark-strengths
  get_profile_record  in_process  get_watermark_profile

Every endpoint that touches storage also answers 500 + ERR_STORAGE_IO when
the storage fails (StorageIOError from the Adapters); list_strengths reads
Configs only. No other exception is turned into 500.

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

from .entities import ProfileInput, WatermarkProfile
from .services import ManageWatermarkProfileService, ProfileNotFoundError, StorageIOError

# clause_a_common.formats.id: UUID v4, lowercase string.
_ID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")


# --- format models (input_expected.profile_input) ---------------------------

class _ProfileInputFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    legal_name: str | None
    contact: str | None
    ownership_statement: str | None
    default_strength: str  # checked against strength_presets below


class _ProfileInputBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    profile_input: _ProfileInputFormat


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


def _profile_record(profile: WatermarkProfile) -> dict:
    # clause_a_common.types.watermark_profile_record: exactly six keys.
    return {
        "profile_id": profile.profile_id,
        "display_name": profile.display_name,
        "legal_name": profile.legal_name,
        "contact": profile.contact,
        "ownership_statement": profile.ownership_statement,
        "default_strength": profile.default_strength,
    }


def _not_found_body(profile_id: str) -> dict:
    return _error_body("ERR_NOT_FOUND", "Watermark profile not found.", {"profile_id": profile_id})


def _storage_error_body(exc: StorageIOError) -> dict:
    return _error_body("ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})


def _storage_error_response(exc: StorageIOError) -> JSONResponse:
    return JSONResponse(status_code=500, content=_storage_error_body(exc))


def _invalid_id_response(profile_id: str) -> JSONResponse:
    return _error_response(
        400, "ERR_VALIDATION", "profile_id must be a lowercase UUID v4.", {"profile_id": profile_id}
    )


# --- endpoints --------------------------------------------------------------

def create_manage_watermark_profile_routers(service: ManageWatermarkProfileService):
    """Return (http router, get_watermark_profile in_process entry)."""
    router = APIRouter()
    strengths = service.strength_options()

    def parse_profile_input(payload: Any) -> ProfileInput | JSONResponse:
        try:
            body = _ProfileInputBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid profile_input.", _validation_details(exc))
        fmt = body.profile_input
        # watermark_strength: one of strength_presets.
        if fmt.default_strength not in strengths:
            return _error_response(400, "ERR_VALIDATION", "Invalid profile_input.", {"errors": [{
                "loc": ["profile_input", "default_strength"],
                "msg": f"must be one of {strengths}",
            }]})
        return ProfileInput(
            display_name=fmt.display_name,
            legal_name=fmt.legal_name,
            contact=fmt.contact,
            ownership_statement=fmt.ownership_statement,
            default_strength=fmt.default_strength,
        )

    # create_profile — POST /watermark-profiles
    @router.post("/watermark-profiles")
    def create_profile(payload: Any = Body(default=None)) -> JSONResponse:
        parsed = parse_profile_input(payload)
        if isinstance(parsed, JSONResponse):
            return parsed
        try:
            profile = service.create(parsed)
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=201, content=_profile_record(profile))

    # list_profiles — GET /watermark-profiles
    @router.get("/watermark-profiles")
    def list_profiles() -> JSONResponse:
        try:
            profiles = service.list_all()
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=[_profile_record(p) for p in profiles])

    # get_profile — GET /watermark-profiles/{profile_id}
    # No 400 is declared: a malformed profile_id names no profile, hence 404.
    @router.get("/watermark-profiles/{profile_id}")
    def get_profile(profile_id: str) -> JSONResponse:
        if not _is_id(profile_id):
            return JSONResponse(status_code=404, content=_not_found_body(profile_id))
        try:
            profile = service.get(profile_id)
        except ProfileNotFoundError:
            return JSONResponse(status_code=404, content=_not_found_body(profile_id))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_profile_record(profile))

    # edit_profile — PUT /watermark-profiles/{profile_id}
    @router.put("/watermark-profiles/{profile_id}")
    def edit_profile(profile_id: str, payload: Any = Body(default=None)) -> JSONResponse:
        if not _is_id(profile_id):
            return _invalid_id_response(profile_id)
        parsed = parse_profile_input(payload)
        if isinstance(parsed, JSONResponse):
            return parsed
        try:
            profile = service.edit(profile_id, parsed)
        except ProfileNotFoundError:
            return JSONResponse(status_code=404, content=_not_found_body(profile_id))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_profile_record(profile))

    # list_strengths — GET /watermark-strengths (Configs only: no 500)
    @router.get("/watermark-strengths")
    def list_strengths() -> JSONResponse:
        return JSONResponse(status_code=200, content=service.strength_options())

    # get_profile_record — in_process get_watermark_profile, called by
    # apply_watermark and verify_watermark.
    # No 400 is declared: a malformed profile_id names no profile, hence 404.
    def get_watermark_profile(*, profile_id: str) -> dict:
        if not _is_id(profile_id):
            raise InProcessCallError(404, _not_found_body(str(profile_id)))
        try:
            profile = service.get(profile_id)
        except ProfileNotFoundError:
            raise InProcessCallError(404, _not_found_body(profile_id)) from None
        except StorageIOError as exc:
            raise InProcessCallError(500, _storage_error_body(exc)) from exc
        return _profile_record(profile)

    return router, get_watermark_profile
