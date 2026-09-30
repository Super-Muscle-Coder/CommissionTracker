"""Routers of record_payment: the workflow's only entry points.

Endpoints (api_contract.yaml, clause_b_backend.record_payment):
  record               http        POST /payments
  list_for_commission  http        GET  /payments?commission_id=...
  void_payment         http        PUT  /payments/{payment_id}/void
  get_balance          http        GET  /payments/balance/{commission_id}
  list_ledger          in_process  list_payment_ledger

record and get_balance answer 409 + ERR_OUT_OF_RANGE when a computed amount
of the balance would leave the integer range (decided by Services).
Every endpoint also answers 500 + ERR_STORAGE_IO when the storage fails
(StorageIOError from the Adapters); no other exception is turned into 500.

Only format checks and boundary conversions happen here. Parameters are
declared untyped (str / Any) so FastAPI never answers with its own 422; each
endpoint validates its inputs itself and answers with its declared labels.
The Pydantic models below exist only for format checks; they are not
Entities.
"""

import re
from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, ValidationError, field_validator

from .entities import CommissionBalance, LedgerEntry, Money, Payment, PaymentInput
from .services import (
    BalanceOutOfRangeError,
    CommissionNotFoundError,
    CurrencyMismatchError,
    PaymentAlreadyVoidedError,
    PaymentNotFoundError,
    RecordPaymentService,
    StorageIOError,
)

# clause_a_common.formats.id: UUID v4, lowercase string.
_ID_REGEX = r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
_ID_PATTERN = re.compile(_ID_REGEX)
# clause_a_common.types.currency_code: ISO 4217 alphabetic code.
_CURRENCY_REGEX = r"^[A-Z]{3}$"
# clause_a_common.formats.timestamp: ISO 8601 date and time with a UTC offset
# ("Z" or +hh:mm / -hh:mm). The minutes of the offset are 00..59: Python
# would otherwise read +07:60 as +08:00. An hour offset of 24 or more is
# refused by datetime.fromisoformat.
_TIMESTAMP_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:[0-5]\d)$"
)
# clause_a_common.mandatory_rules / types.money: every integer at the boundary
# lies within -(2^53-1)..2^53-1 (what a JavaScript number holds exactly).
_MAX_BOUNDARY_INTEGER = 2**53 - 1


# --- format models (input_expected.payment_input) ---------------------------

def _not_blank(value: str) -> str:
    # clause_a_common.formats.not_blank: at least one character is left once
    # leading and trailing whitespace (str.isspace) is removed. A check only:
    # the value is returned unchanged, never stripped.
    if not value.strip():
        raise ValueError("must not be blank")
    return value


class _MoneyFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    # payment_input: amount_minor > 0
    amount_minor: Annotated[int, Field(gt=0, le=_MAX_BOUNDARY_INTEGER)]
    currency: Annotated[str, StringConstraints(pattern=_CURRENCY_REGEX)]


class _PaymentInputFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    direction: Literal["incoming", "refund"]
    kind: Literal["deposit", "milestone", "final", "tip", "other"]
    amount: _MoneyFormat
    # payment_input: method is 1.. characters and not blank (Data Schema 9.0.0)
    method: Annotated[str, StringConstraints(min_length=1), AfterValidator(_not_blank)]
    paid_at: str
    note: str | None

    @field_validator("paid_at")
    @classmethod
    def _timestamp_with_offset(cls, value: str) -> str:
        if not _TIMESTAMP_PATTERN.fullmatch(value):
            raise ValueError("paid_at must be an ISO 8601 date and time with a UTC offset")
        datetime.fromisoformat(value)  # ValueError for an impossible date or time
        return value


class _RecordBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    commission_id: Annotated[str, StringConstraints(pattern=_ID_REGEX)]
    payment_input: _PaymentInputFormat


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


def _to_payment_input(fmt: _PaymentInputFormat) -> PaymentInput:
    return PaymentInput(
        direction=fmt.direction,
        kind=fmt.kind,
        amount=Money(amount_minor=fmt.amount.amount_minor, currency=fmt.amount.currency),
        method=fmt.method,
        paid_at=datetime.fromisoformat(fmt.paid_at),
        note=fmt.note,
    )


def _money(m: Money) -> dict:
    return {"amount_minor": m.amount_minor, "currency": m.currency}


def _payment_record(p: Payment) -> dict:
    return {
        "payment_id": p.payment_id,
        "commission_id": p.commission_id,
        "direction": p.direction,
        "kind": p.kind,
        "amount": _money(p.amount),
        "method": p.method,
        "paid_at": p.paid_at.isoformat(),
        "note": p.note,
        "is_voided": p.is_voided,
    }


def _balance(b: CommissionBalance) -> dict:
    return {
        "commission_id": b.commission_id,
        "agreed": _money(b.agreed),
        "received_net": _money(b.received_net),
        "outstanding": _money(b.outstanding),
    }


def _ledger_entry(e: LedgerEntry) -> dict:
    return {
        "payment_id": e.payment_id,
        "commission_id": e.commission_id,
        "direction": e.direction,
        "kind": e.kind,
        "amount": _money(e.amount),
        "paid_at": e.paid_at.isoformat(),
    }


def _commission_not_found(commission_id: str) -> JSONResponse:
    return _error_response(404, "ERR_NOT_FOUND", "Commission not found.", {"commission_id": commission_id})


def _payment_not_found(payment_id: str) -> JSONResponse:
    return _error_response(404, "ERR_NOT_FOUND", "Payment not found.", {"payment_id": payment_id})


def _storage_error_body(exc: StorageIOError) -> dict:
    return _error_body("ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})


def _storage_error_response(exc: StorageIOError) -> JSONResponse:
    return JSONResponse(status_code=500, content=_storage_error_body(exc))


def _decision_error_response(exc: Exception) -> JSONResponse:
    # Result labels of the decisions taken by Services.
    if isinstance(exc, CommissionNotFoundError):
        return _commission_not_found(exc.commission_id)
    if isinstance(exc, PaymentNotFoundError):
        return _payment_not_found(exc.payment_id)
    if isinstance(exc, PaymentAlreadyVoidedError):
        return _error_response(409, "ERR_CONFLICT", "Payment is already voided.", {"payment_id": exc.payment_id})
    if isinstance(exc, CurrencyMismatchError):
        return _error_response(
            422,
            "ERR_CURRENCY_MISMATCH",
            "Payment currency differs from the commission's agreed currency.",
            {"agreed_currency": exc.agreed, "payment_currency": exc.paid},
        )
    if isinstance(exc, BalanceOutOfRangeError):
        return _error_response(
            409,
            "ERR_OUT_OF_RANGE",
            "The commission's balance would fall outside the integer range; nothing was written.",
            {"commission_id": exc.commission_id, "fields": list(exc.fields)},
        )
    return _storage_error_response(exc)  # StorageIOError


_DECISION_ERRORS = (
    CommissionNotFoundError,
    PaymentNotFoundError,
    PaymentAlreadyVoidedError,
    CurrencyMismatchError,
    BalanceOutOfRangeError,
    StorageIOError,
)


# --- endpoints --------------------------------------------------------------

def create_record_payment_routers(service: RecordPaymentService):
    """Return (http router, list_payment_ledger)."""
    router = APIRouter()

    # record — POST /payments, JSON body {commission_id, payment_input}
    @router.post("/payments")
    def record(payload: Any = Body(default=None)) -> JSONResponse:
        try:
            body = _RecordBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid payment request.", _validation_details(exc))
        try:
            payment = service.record(body.commission_id, _to_payment_input(body.payment_input))
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=201, content=_payment_record(payment))

    # list_for_commission — GET /payments?commission_id=...
    # No 400 is declared: a missing or malformed commission_id names no
    # commission, hence 404.
    @router.get("/payments")
    def list_for_commission(commission_id: str | None = None) -> JSONResponse:
        if not _is_id(commission_id):
            return _commission_not_found(str(commission_id))
        try:
            payments = service.list_for_commission(commission_id)
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=200, content=[_payment_record(p) for p in payments])

    # void_payment — PUT /payments/{payment_id}/void, no body.
    # No 400 is declared: a malformed payment_id names no payment, hence 404.
    @router.put("/payments/{payment_id}/void")
    def void_payment(payment_id: str) -> JSONResponse:
        if not _is_id(payment_id):
            return _payment_not_found(payment_id)
        try:
            payment = service.void(payment_id)
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=200, content=_payment_record(payment))

    # get_balance — GET /payments/balance/{commission_id}
    # No 400 is declared: a malformed commission_id names no commission, hence 404.
    @router.get("/payments/balance/{commission_id}")
    def get_balance(commission_id: str) -> JSONResponse:
        if not _is_id(commission_id):
            return _commission_not_found(commission_id)
        try:
            balance = service.balance(commission_id)
        except BalanceOutOfRangeError as exc:
            # A read: there is nothing to write (API Contract 3.0.1).
            return _error_response(
                409,
                "ERR_OUT_OF_RANGE",
                "The commission's balance falls outside the integer range; no balance is returned.",
                {"commission_id": exc.commission_id, "fields": list(exc.fields)},
            )
        except _DECISION_ERRORS as exc:
            return _decision_error_response(exc)
        return JSONResponse(status_code=200, content=_balance(balance))

    # list_ledger — in_process "list_payment_ledger", called by view_income_report.
    def list_payment_ledger() -> list[dict]:
        try:
            entries = service.ledger()
        except StorageIOError as exc:
            raise InProcessCallError(500, _storage_error_body(exc)) from exc
        return [_ledger_entry(e) for e in entries]

    return router, list_payment_ledger
