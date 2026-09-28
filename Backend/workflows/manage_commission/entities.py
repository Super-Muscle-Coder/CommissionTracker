"""Entities of manage_commission: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.manage_commission):
- Money               <- clause_a_common.types.money
- CommissionInput     <- input_expected.commission_input
- ClientSummary       <- input_expected.client_summary (from manage_client;
                         described here, never imported from manage_client)
- Commission          -> output_guaranteed.commission_detail
- CommissionSummary   -> output_guaranteed.commission_summary, and one element
                         of commission_index
- CommissionListItem  -> one element of output_guaranteed.commission_list
"""

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class Money:
    amount_minor: int
    currency: str


@dataclass(frozen=True)
class CommissionInput:
    client_id: str
    title: str
    description: str | None
    commission_type: str | None
    agreed_price: Money
    deadline: date | None
    reference_links: list[str]


@dataclass(frozen=True)
class ClientSummary:
    client_id: str
    is_archived: bool


@dataclass(frozen=True)
class Commission:
    commission_id: str
    client_id: str
    title: str
    description: str | None
    commission_type: str | None
    agreed_price: Money
    deadline: date | None
    reference_links: list[str]
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class CommissionSummary:
    commission_id: str
    title: str
    agreed_price: Money
    deadline: date | None


@dataclass(frozen=True)
class CommissionListItem:
    commission_id: str
    client_id: str
    title: str
    agreed_price: Money
    deadline: date | None
    updated_at: datetime
