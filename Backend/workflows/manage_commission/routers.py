"""Routers of manage_commission: the workflow's only entry points.

Endpoints (api_contract.yaml, clause_b_backend.manage_commission):
  create_commission       http        POST /commissions
  list_commissions        http        GET  /commissions
  get_commission          http        GET  /commissions/{commission_id}
  edit_commission         http        PUT  /commissions/{commission_id}
  list_currencies         http        GET  /currencies
  get_commission_summary  in_process  get_commission_summary
  list_commission_index   in_process  list_commission_index

Every endpoint except list_currencies also answers 500 + ERR_STORAGE_IO when
the storage fails (StorageIOError from the Adapters); no other exception is
turned into 500. list_currencies only returns Configs.

Only format checks and boundary conversions happen here. Parameters are
declared untyped (str / Any) so FastAPI never answers with its own 422; each
endpoint validates its inputs itself and answers with its declared labels.
The Pydantic models below exist only for format checks; they are not
Entities.
"""

import re
from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationError,
    ValidationInfo,
    field_validator,
)

from .entities import Commission, CommissionInput, CommissionListItem, CommissionSummary, Money
from .services import (
    ClientArchivedError,
    ClientNotFoundError,
    CommissionNotFoundError,
    CurrencyChangeError,
    ManageCommissionService,
    StorageIOError,
)

# clause_a_common.formats.id: UUID v4, lowercase string.
_ID_REGEX = r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
_ID_PATTERN = re.compile(_ID_REGEX)
# clause_a_common.formats.date: ISO 8601 calendar date, YYYY-MM-DD.
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# clause_a_common.mandatory_rules / types.money: every integer at the boundary
# lies within -(2^53-1)..2^53-1 (what a JavaScript number holds exactly).
_MAX_BOUNDARY_INTEGER = 2**53 - 1


def _not_blank(value: str) -> str:
    # clause_a_common.formats.not_blank: at least one character is left once
    # leading and trailing whitespace (str.isspace) is removed. A check only:
    # the value is returned unchanged, never stripped.
    if not value.strip():
        raise ValueError("must not be blank")
    return value


# --- format models (input_expected.commission_input) ------------------------

class _MoneyFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    amount_minor: Annotated[int, Field(ge=0, le=_MAX_BOUNDARY_INTEGER)]
    currency: str

    @field_validator("currency")
    @classmethod
    def _supported(cls, value: str, info: ValidationInfo) -> str:
        # type: currency in supported_currencies (given as validation context).
        supported = (info.context or {}).get("supported_currencies", [])
        if value not in supported:
            raise ValueError(f"currency must be one of {supported}")
        return value


class _CommissionInputFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    client_id: Annotated[str, StringConstraints(pattern=_ID_REGEX)]
    title: Annotated[str, StringConstraints(min_length=1, max_length=200), AfterValidator(_not_blank)]
    description: str | None
    commission_type: str | None
    agreed_price: _MoneyFormat
    deadline: str | None
    reference_links: list[str]

    @field_validator("deadline")
    @classmethod
    def _iso_date(cls, value: str | None) -> str | None:
        if value is not None:
            if not _DATE_PATTERN.fullmatch(value):
                raise ValueError("deadline must be an ISO 8601 date YYYY-MM-DD")
            date.fromisoformat(value)  # ValueError for an impossible date
        return value


class _CommissionInputBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    commission_input: _CommissionInputFormat


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


def _to_commission_input(fmt: _CommissionInputFormat) -> CommissionInput:
    return CommissionInput(
        client_id=fmt.client_id,
        title=fmt.title,
        description=fmt.description,
        commission_type=fmt.commission_type,
        agreed_price=Money(amount_minor=fmt.agreed_price.amount_minor, currency=fmt.agreed_price.currency),
        deadline=date.fromisoformat(fmt.deadline) if fmt.deadline is not None else None,
        reference_links=list(fmt.reference_links),
    )


def _money(m: Money) -> dict:
    return {"amount_minor": m.amount_minor, "currency": m.currency}


def _date(d: date | None) -> str | None:
    return d.isoformat() if d is not None else None


def _commission_detail(c: Commission) -> dict:
    return {
        "commission_id": c.commission_id,
        "client_id": c.client_id,
        "title": c.title,
        "description": c.description,
        "commission_type": c.commission_type,
        "agreed_price": _money(c.agreed_price),
        "deadline": _date(c.deadline),
        "reference_links": list(c.reference_links),
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


def _commission_list_entry(i: CommissionListItem) -> dict:
    return {
        "commission_id": i.commission_id,
        "client_id": i.client_id,
        "title": i.title,
        "agreed_price": _money(i.agreed_price),
        "deadline": _date(i.deadline),
        "updated_at": i.updated_at.isoformat(),
    }


def _commission_summary(s: CommissionSummary) -> dict:
    return {
        "commission_id": s.commission_id,
        "title": s.title,
        "agreed_price": _money(s.agreed_price),
        "deadline": _date(s.deadline),
    }


def _commission_not_found_body(commission_id: str) -> dict:
    return _error_body("ERR_NOT_FOUND", "Commission not found.", {"commission_id": commission_id})


def _storage_error_body(exc: StorageIOError) -> dict:
    return _error_body("ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})


def _storage_error_response(exc: StorageIOError) -> JSONResponse:
    return JSONResponse(status_code=500, content=_storage_error_body(exc))


def _decision_error_response(exc: Exception) -> JSONResponse:
    # Result labels of the decisions taken by Services (create / edit).
    if isinstance(exc, CommissionNotFoundError):
        return JSONResponse(status_code=404, content=_commission_not_found_body(exc.commission_id))
    if isinstance(exc, ClientNotFoundError):
        return _error_response(404, "ERR_NOT_FOUND", "Client not found.", {"client_id": exc.client_id})
    if isinstance(exc, ClientArchivedError):
        return _error_response(409, "ERR_CONFLICT", "Client is archived.", {"client_id": exc.client_id})
    if isinstance(exc, CurrencyChangeError):
        return _error_response(
            409,
            "ERR_CONFLICT",
            "The currency of agreed_price is fixed at creation.",
            {"agreed_currency": exc.agreed, "requested_currency": exc.requested},
        )
    return _storage_error_response(exc)  # StorageIOError


_DECISION_ERRORS = (
    CommissionNotFoundError,
    ClientNotFoundError,
    ClientArchivedError,
    CurrencyChangeError,
    StorageIOError,
)


# --- endpoints --------------------------------------------------------------

def create_manage_commission_routers(service: ManageCommissionService):
    """Return (http router, get_commission_summary, list_commission_index)."""
    router = APIRouter()

    def parse_body(payload: Any) -> _CommissionInputBody:
        return _CommissionInputBody.model_validate(
            payload, context={"supported_currencies": service.currency_options()}
        )

    # create_commission — POST /commissions
    @router.post("/commissions")
    def create_commission(payload: Any = Body(default=None)) -> JSONResponse:
        try:
            body = parse_body(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid commission_input.", _validation_details(exc))
        try:
            commission = service.create(_to_commission_input(body.commission_input))
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=201, content=_commission_detail(commission))

    # list_commissions — GET /commissions
    @router.get("/commissions")
    def list_commissions() -> JSONResponse:
        try:
            items = service.list_all()
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=[_commission_list_entry(i) for i in items])

    # get_commission — GET /commissions/{commission_id}
    # No 400 is declared: a malformed commission_id names no commission, hence 404.
    @router.get("/commissions/{commission_id}")
    def get_commission(commission_id: str) -> JSONResponse:
        if not _is_id(commission_id):
            return JSONResponse(status_code=404, content=_commission_not_found_body(commission_id))
        try:
            commission = service.get(commission_id)
        except CommissionNotFoundError:
            return JSONResponse(status_code=404, content=_commission_not_found_body(commission_id))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_commission_detail(commission))

    # edit_commission — PUT /commissions/{commission_id}
    @router.put("/commissions/{commission_id}")
    def edit_commission(commission_id: str, payload: Any = Body(default=None)) -> JSONResponse:
        if not _is_id(commission_id):
            return _error_response(
                400, "ERR_VALIDATION", "commission_id must be a lowercase UUID v4.",
                {"commission_id": commission_id},
            )
        try:
            body = parse_body(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid commission_input.", _validation_details(exc))
        try:
            commission = service.edit(commission_id, _to_commission_input(body.commission_input))
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=200, content=_commission_detail(commission))

    # list_currencies — GET /currencies (Configs only, no storage)
    @router.get("/currencies")
    def list_currencies() -> JSONResponse:
        return JSONResponse(status_code=200, content=service.currency_options())

    # get_commission_summary — in_process, called by update_progress,
    # record_payment, apply_watermark.
    # No 400 is declared: a malformed commission_id names no commission, hence 404.
    def get_commission_summary(*, commission_id: str) -> dict:
        if not _is_id(commission_id):
            raise InProcessCallError(404, _commission_not_found_body(str(commission_id)))
        try:
            summary = service.get_summary(commission_id)
        except CommissionNotFoundError:
            raise InProcessCallError(404, _commission_not_found_body(commission_id)) from None
        except StorageIOError as exc:
            raise InProcessCallError(500, _storage_error_body(exc)) from exc
        return _commission_summary(summary)

    # list_commission_index — in_process, called by view_income_report,
    # send_reminder.
    def list_commission_index() -> list[dict]:
        try:
            summaries = service.list_index()
        except StorageIOError as exc:
            raise InProcessCallError(500, _storage_error_body(exc)) from exc
        return [_commission_summary(s) for s in summaries]

    return router, get_commission_summary, list_commission_index
