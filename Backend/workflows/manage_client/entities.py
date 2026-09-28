"""Entities of manage_client: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.manage_client):
- ClientInput      <- input_expected.client_input
- Client           -> output_guaranteed.client_detail
- ClientSummary    -> output_guaranteed.client_summary (consumed by manage_commission)
- ClientListItem   -> one element of output_guaranteed.client_list
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Contact:
    channel: str
    value: str


@dataclass(frozen=True)
class ClientInput:
    display_name: str
    contacts: list[Contact]
    note: str | None


@dataclass(frozen=True)
class Client:
    client_id: str
    display_name: str
    contacts: list[Contact]
    note: str | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class ClientSummary:
    client_id: str
    is_archived: bool


@dataclass(frozen=True)
class ClientListItem:
    client_id: str
    display_name: str
    is_archived: bool
    updated_at: datetime
