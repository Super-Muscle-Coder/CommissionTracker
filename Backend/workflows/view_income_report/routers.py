"""Routers of view_income_report: the workflow's only entry point.

Endpoint (api_contract.yaml, clause_b_backend.view_income_report):
  get_income_report  http  GET /reports/income?period_from=...&period_to=...

Labels: 200 income_report; 400 ERR_VALIDATION (a period bound missing or not
a real YYYY-MM-DD date — checked here — or period_from after period_to —
decided by Services); 409 ERR_OUT_OF_RANGE (a total cannot be represented,
decided by Services); 500 ERR_STORAGE_IO (StorageIOError from the Adapters).
No other exception is turned into 500.

Only format checks and boundary conversions happen here. Query parameters
are declared as plain optional strings so FastAPI never answers with its own
422. The Pydantic model below exists only for format checks; it is not an
Entity.
"""

import re
from datetime import date

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

from .entities import CurrencyTotals, IncomeReport
from .services import InvalidPeriodError, ReportOutOfRangeError, StorageIOError, ViewIncomeReportService

# clause_a_common.formats.date: ISO 8601 calendar date.
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# --- format model (input_expected.period_from, period_to) --------------------

class _PeriodFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    period_from: str
    period_to: str

    @field_validator("period_from", "period_to")
    @classmethod
    def _calendar_date(cls, value: str) -> str:
        if not _DATE_PATTERN.fullmatch(value):
            raise ValueError("must be an ISO 8601 calendar date YYYY-MM-DD")
        date.fromisoformat(value)  # ValueError for a day that does not exist
        return value


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


def _currency_totals(t: CurrencyTotals) -> dict:
    return {
        "currency": t.currency,
        "received_net_minor": t.received_net_minor,
        "refunded_minor": t.refunded_minor,
        "outstanding_minor": t.outstanding_minor,
        "by_month": [{"month": m.month, "received_net_minor": m.received_net_minor} for m in t.by_month],
    }


def _income_report(r: IncomeReport) -> dict:
    return {
        "period_from": r.period_from.isoformat(),
        "period_to": r.period_to.isoformat(),
        "currencies": [_currency_totals(t) for t in r.currencies],
        "generated_at": r.generated_at.isoformat(),
    }


# --- endpoint ---------------------------------------------------------------

def create_view_income_report_routers(service: ViewIncomeReportService) -> APIRouter:
    router = APIRouter()

    # get_income_report — GET /reports/income?period_from=YYYY-MM-DD&period_to=YYYY-MM-DD
    @router.get("/reports/income")
    def get_income_report(period_from: str | None = None, period_to: str | None = None) -> JSONResponse:
        given = {k: v for k, v in (("period_from", period_from), ("period_to", period_to)) if v is not None}
        try:
            period = _PeriodFormat.model_validate(given)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid report period.", _validation_details(exc))
        try:
            report = service.report(date.fromisoformat(period.period_from), date.fromisoformat(period.period_to))
        except InvalidPeriodError as exc:
            return _error_response(
                400,
                "ERR_VALIDATION",
                "period_from must not be after period_to.",
                {"period_from": exc.period_from.isoformat(), "period_to": exc.period_to.isoformat()},
            )
        except ReportOutOfRangeError as exc:
            return _error_response(
                409,
                "ERR_OUT_OF_RANGE",
                "A total of the report falls outside the integer range; no report is returned.",
                {"fields": list(exc.fields)},
            )
        except StorageIOError as exc:
            return _error_response(500, "ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})
        return JSONResponse(status_code=200, content=_income_report(report))

    return router
