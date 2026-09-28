"""Entities of send_reminder: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.send_reminder):
- LeadTime, PeriodicSettings, DeadlineSettings, ReminderSettings
                        <- clause_a_common.types.reminder_settings_record
                           (input_expected.reminder_settings_input)
- StoredSettings        -> output_guaranteed.reminder_settings
- Notification          -> one element of new_notifications / pending_notifications
                           (clause_a_common.types.reminder_notification_record)
- NotificationAck       -> output_guaranteed.notification_ack
- CommissionEntry       <- one element of input_expected.commissions
                           (commission_summary_record, from manage_commission;
                           described here, never imported from it)
- ProgressEntry         <- one element of input_expected.progress
                           (progress_entry_record, from update_progress)
Internal only:
- SettingsState         stored settings plus the digest cadence state
- DeadlineReminderKey   what "already reminded" is remembered by
"""

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class LeadTime:
    amount: int
    unit: str  # 'hours' | 'days'


@dataclass(frozen=True)
class PeriodicSettings:
    enabled: bool
    every: int
    unit: str  # 'days' | 'weeks'
    at_time: str  # HH:MM, local time
    weekday: int | None  # 1..7, ISO weekday; None when unit = 'days'


@dataclass(frozen=True)
class DeadlineSettings:
    enabled: bool
    lead_times: tuple[LeadTime, ...]


@dataclass(frozen=True)
class ReminderSettings:
    periodic: PeriodicSettings
    deadline: DeadlineSettings


@dataclass(frozen=True)
class StoredSettings:
    settings: ReminderSettings
    updated_at: datetime | None  # None = defaults, never saved


@dataclass(frozen=True)
class SettingsState:
    settings: ReminderSettings
    updated_at: datetime
    # Internal: the latest digest occurrence already dealt with (produced,
    # or skipped because nothing was open); None since the last save.
    digest_handled_through: datetime | None


@dataclass(frozen=True)
class Money:
    amount_minor: int
    currency: str


@dataclass(frozen=True)
class CommissionEntry:
    commission_id: str
    title: str
    agreed_price: Money
    deadline: date | None


@dataclass(frozen=True)
class ProgressEntry:
    commission_id: str
    current_stage: str
    stage_kind: str  # 'active' | 'on_hold' | 'finished' | 'cancelled'


@dataclass(frozen=True)
class DeadlineItem:
    commission_id: str
    title: str
    deadline: date
    lead: LeadTime


@dataclass(frozen=True)
class DigestItem:
    commission_id: str
    title: str
    deadline: date


@dataclass(frozen=True)
class Digest:
    open_count: int
    upcoming: tuple[DigestItem, ...]


@dataclass(frozen=True)
class Notification:
    notification_id: str
    kind: str  # 'periodic_digest' | 'deadline'
    due_at: datetime
    deadline_item: DeadlineItem | None  # set when kind = 'deadline'
    digest: Digest | None  # set when kind = 'periodic_digest'
    # Internal only (not in reminder_notification_record).
    created_at: datetime
    acknowledged_at: datetime | None


@dataclass(frozen=True)
class NotificationAck:
    notification_id: str
    acknowledged_at: datetime


@dataclass(frozen=True)
class DeadlineReminderKey:
    commission_id: str
    deadline: date
    lead_hours: int  # duration of the lead time, 1 day = 24 hours
