"""Entities of view_income_report: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.view_income_report):
- Money            <- clause_a_common.types.money
- CommissionEntry  <- one element of input_expected.commissions
                      (commission_summary_record, from manage_commission)
- ProgressEntry    <- one element of input_expected.progress
                      (progress_entry_record, from update_progress)
- LedgerEntry      <- one element of input_expected.payments
                      (ledger_entry_record, from record_payment)
- IncomeReport     -> output_guaranteed.income_report
  CurrencyTotals, MonthTotal: its nested objects

The three received shapes are described here, never imported from the
workflows that own them.
"""

from dataclasses import dataclass
from datetime import date, datetime


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
class LedgerEntry:
    payment_id: str
    commission_id: str
    direction: str  # 'incoming' | 'refund'
    kind: str  # 'deposit' | 'milestone' | 'final' | 'tip' | 'other'
    amount: Money
    paid_at: datetime  # always carries its own UTC offset


@dataclass(frozen=True)
class MonthTotal:
    month: str  # YYYY-MM
    received_net_minor: int


@dataclass(frozen=True)
class CurrencyTotals:
    currency: str
    received_net_minor: int
    refunded_minor: int
    outstanding_minor: int
    by_month: list[MonthTotal]


@dataclass(frozen=True)
class IncomeReport:
    period_from: date
    period_to: date
    currencies: list[CurrencyTotals]
    generated_at: datetime
