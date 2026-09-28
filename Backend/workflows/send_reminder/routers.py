"""Routers of send_reminder: the workflow's only entry points.

Endpoints (api_contract.yaml, clause_b_backend.send_reminder):
  get_settings  http  GET  /reminders/settings
  edit_settings http  PUT  /reminders/settings           body {reminder_settings_input}
  check_due     http  POST /reminders/checks             no body; called by reminder_ticker
  list_pending  http  GET  /reminders/pending
  acknowledge   http  PUT  /reminders/{notification_id}/ack   no body

Every endpoint also answers 500 + ERR_STORAGE_IO when the storage fails
(StorageIOError from the Adapters); no other exception is turned into 500.

Only format checks and boundary conversions happen here. Every constraint
written in reminder_settings_record is a format check: required keys,
strict types, ranges, weekday null exactly when unit = 'days', 1..5 lead
times, each at most 365 days / 8760 hours, no two lead times of the same
duration (1 day = 24 hours). The body
is declared untyped so FastAPI never answers with its own 422. The Pydantic
models below exist only for format checks; they are not Entities.
"""

import re
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError, model_validator

from .entities import (
    DeadlineSettings,
    LeadTime,
    Notification,
    NotificationAck,
    PeriodicSettings,
    ReminderSettings,
    StoredSettings,
)
from .services import NotificationNotFoundError, SendReminderService, StorageIOError

# clause_a_common.formats.id: UUID v4, lowercase string.
_ID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
# reminder_settings_record.periodic.at_time: HH:MM, 00:00..23:59.
_AT_TIME_REGEX = r"^([01]\d|2[0-3]):[0-5]\d$"
# clause_a_common.mandatory_rules: every integer at the boundary lies within
# -(2^53-1)..2^53-1 (what a JavaScript number holds exactly).
_MAX_BOUNDARY_INTEGER = 2**53 - 1
# reminder_settings_record.deadline.lead_times: each at most 365 days / 8760
# hours (1 day = 24 hours).
_MAX_LEAD_HOURS = 8760


# --- format models (input_expected.reminder_settings_input) -----------------

class _LeadTimeFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    amount: Annotated[int, Field(ge=1, le=_MAX_BOUNDARY_INTEGER)]
    unit: Literal["hours", "days"]

    @model_validator(mode="after")
    def _at_most_365_days(self) -> "_LeadTimeFormat":
        hours = self.amount * 24 if self.unit == "days" else self.amount
        if hours > _MAX_LEAD_HOURS:
            raise ValueError("a lead time is at most 365 days (8760 hours)")
        return self


class _PeriodicFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    enabled: bool
    every: Annotated[int, Field(ge=1, le=_MAX_BOUNDARY_INTEGER)]
    unit: Literal["days", "weeks"]
    at_time: Annotated[str, StringConstraints(pattern=_AT_TIME_REGEX)]
    weekday: Annotated[int, Field(ge=1, le=7)] | None

    @model_validator(mode="after")
    def _weekday_matches_unit(self) -> "_PeriodicFormat":
        if self.unit == "weeks" and self.weekday is None:
            raise ValueError("weekday is required when unit = 'weeks'")
        if self.unit == "days" and self.weekday is not None:
            raise ValueError("weekday must be null when unit = 'days'")
        return self


class _DeadlineFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    enabled: bool
    lead_times: Annotated[list[_LeadTimeFormat], Field(min_length=1, max_length=5)]

    @model_validator(mode="after")
    def _distinct_durations(self) -> "_DeadlineFormat":
        hours = [lt.amount * 24 if lt.unit == "days" else lt.amount for lt in self.lead_times]
        if len(set(hours)) != len(hours):
            raise ValueError("two lead_times have the same duration (1 day = 24 hours)")
        return self


class _SettingsFormat(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    periodic: _PeriodicFormat
    deadline: _DeadlineFormat


class _EditBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    reminder_settings_input: _SettingsFormat


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


def _storage_error_response(exc: StorageIOError) -> JSONResponse:
    return _error_response(500, "ERR_STORAGE_IO", "Storage failed.", {"reason": str(exc)})


def _to_settings(fmt: _SettingsFormat) -> ReminderSettings:
    p, d = fmt.periodic, fmt.deadline
    return ReminderSettings(
        periodic=PeriodicSettings(enabled=p.enabled, every=p.every, unit=p.unit, at_time=p.at_time, weekday=p.weekday),
        deadline=DeadlineSettings(
            enabled=d.enabled, lead_times=tuple(LeadTime(amount=lt.amount, unit=lt.unit) for lt in d.lead_times)
        ),
    )


def _lead(lt: LeadTime) -> dict:
    return {"amount": lt.amount, "unit": lt.unit}


def _settings_record(s: ReminderSettings) -> dict:
    p, d = s.periodic, s.deadline
    return {
        "periodic": {"enabled": p.enabled, "every": p.every, "unit": p.unit, "at_time": p.at_time, "weekday": p.weekday},
        "deadline": {"enabled": d.enabled, "lead_times": [_lead(lt) for lt in d.lead_times]},
    }


def _reminder_settings(stored: StoredSettings) -> dict:
    return {
        "settings": _settings_record(stored.settings),
        "updated_at": stored.updated_at.isoformat() if stored.updated_at is not None else None,
    }


def _notification_record(n: Notification) -> dict:
    item, digest = n.deadline_item, n.digest
    return {
        "notification_id": n.notification_id,
        "kind": n.kind,
        "due_at": n.due_at.isoformat(),
        "deadline_item": None if item is None else {
            "commission_id": item.commission_id,
            "title": item.title,
            "deadline": item.deadline.isoformat(),
            "lead": _lead(item.lead),
        },
        "digest": None if digest is None else {
            "open_count": digest.open_count,
            "upcoming": [
                {"commission_id": u.commission_id, "title": u.title, "deadline": u.deadline.isoformat()}
                for u in digest.upcoming
            ],
        },
    }


def _notification_ack(ack: NotificationAck) -> dict:
    return {"notification_id": ack.notification_id, "acknowledged_at": ack.acknowledged_at.isoformat()}


def _notification_not_found(notification_id: str) -> JSONResponse:
    return _error_response(404, "ERR_NOT_FOUND", "Notification not found.", {"notification_id": notification_id})


# --- endpoints --------------------------------------------------------------

def create_send_reminder_routers(service: SendReminderService) -> APIRouter:
    router = APIRouter()

    # get_settings — GET /reminders/settings
    @router.get("/reminders/settings")
    def get_settings() -> JSONResponse:
        try:
            stored = service.get_settings()
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_reminder_settings(stored))

    # edit_settings — PUT /reminders/settings, JSON body {reminder_settings_input}
    @router.put("/reminders/settings")
    def edit_settings(payload: Any = Body(default=None)) -> JSONResponse:
        try:
            body = _EditBody.model_validate(payload)
        except ValidationError as exc:
            return _error_response(400, "ERR_VALIDATION", "Invalid reminder settings.", _validation_details(exc))
        try:
            stored = service.edit_settings(_to_settings(body.reminder_settings_input))
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_reminder_settings(stored))

    # check_due — POST /reminders/checks, no body. Called by reminder_ticker.
    @router.post("/reminders/checks")
    def check_due() -> JSONResponse:
        try:
            produced = service.check_due()
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=[_notification_record(n) for n in produced])

    # list_pending — GET /reminders/pending
    @router.get("/reminders/pending")
    def list_pending() -> JSONResponse:
        try:
            pending = service.list_pending()
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=[_notification_record(n) for n in pending])

    # acknowledge — PUT /reminders/{notification_id}/ack, no body.
    # No 400 is declared: a malformed notification_id names no notification, hence 404.
    @router.put("/reminders/{notification_id}/ack")
    def acknowledge(notification_id: str) -> JSONResponse:
        if _ID_PATTERN.fullmatch(notification_id) is None:
            return _notification_not_found(notification_id)
        try:
            ack = service.acknowledge(notification_id)
        except NotificationNotFoundError as exc:
            return _notification_not_found(exc.notification_id)
        except StorageIOError as exc:
            return _storage_error_response(exc)
        return JSONResponse(status_code=200, content=_notification_ack(ack))

    return router
