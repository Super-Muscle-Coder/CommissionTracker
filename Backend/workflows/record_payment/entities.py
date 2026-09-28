"""Entities of record_payment: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.record_payment):
- Money              <- clause_a_common.types.money
- PaymentInput       <- input_expected.payment_input
- CommissionSummary  <- input_expected.commission_summary (from
                        manage_commission; described here, never imported
                        from manage_commission)
- Payment            -> output_guaranteed.payment, one element of payment_list
- CommissionBalance  -> output_guaranteed.commission_balance
- LedgerEntry        -> one element of output_guaranteed.payment_ledger
                        (ledger_entry_record, with kind since Data Schema 4.0.0)
"""

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class Money:
    amount_minor: int
    currency: str


@dataclass(frozen=True)
class PaymentInput:
    direction: str  # 'incoming' | 'refund'
    kind: str  # 'deposit' | 'milestone' | 'final' | 'tip' | 'other'
    amount: Money
    method: str
    paid_at: datetime  # always carries its UTC offset
    note: str | None


@dataclass(frozen=True)
class CommissionSummary:
    commission_id: str
    title: str
    agreed_price: Money
    deadline: date | None


@dataclass(frozen=True)
class Payment:
    payment_id: str
    commission_id: str
    direction: str
    kind: str
    amount: Money
    method: str
    paid_at: datetime
    note: str | None
    is_voided: bool
    # Internal only (not in payment_record): when the entry was recorded and
    # when it was voided.
    recorded_at: datetime
    voided_at: datetime | None


@dataclass(frozen=True)
class CommissionBalance:
    commission_id: str
    agreed: Money
    received_net: Money
    outstanding: Money


@dataclass(frozen=True)
class LedgerEntry:
    payment_id: str
    commission_id: str
    direction: str
    kind: str
    amount: Money
    paid_at: datetime
