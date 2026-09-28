"""Adapters of view_income_report: the three calls to other workflows.

view_income_report stores nothing: it owns no table and receives no
db_connection. Its only contact with the outside is the three in_process
endpoints handed over by the Main (api_contract.yaml):
- list_commission_index  (manage_commission)  -> commissions
- list_progress_board    (update_progress)    -> progress
- list_payment_ledger    (record_payment)     -> payments

Each endpoint returns plain data or raises an error carrying ``label`` and
``error_body``; nothing of those workflows is imported here.
"""

from datetime import date, datetime
from typing import Callable

from .entities import CommissionEntry, LedgerEntry, Money, ProgressEntry


class StorageIOError(Exception):
    """Storage failed behind one of the calls (the called workflow answered
    500 + ERR_STORAGE_IO)."""


def _call(workflow: str, endpoint: Callable[..., list]) -> list:
    # Label 500 becomes this workflow's StorageIOError; any other failure
    # (a programming error) propagates unchanged.
    try:
        return endpoint()
    except Exception as exc:
        if getattr(exc, "label", None) == 500:
            body = getattr(exc, "error_body", None) or {}
            raise StorageIOError(f"{workflow}: {body.get('message')} {body.get('details')}") from exc
        raise


def _money(data: dict) -> Money:
    return Money(amount_minor=data["amount_minor"], currency=data["currency"])


class IncomeSources:
    def __init__(
        self,
        list_commission_index: Callable[..., list],
        list_progress_board: Callable[..., list],
        list_payment_ledger: Callable[..., list],
    ) -> None:
        self._list_commission_index = list_commission_index
        self._list_progress_board = list_progress_board
        self._list_payment_ledger = list_payment_ledger

    def fetch_commissions(self) -> list[CommissionEntry]:
        return [
            CommissionEntry(
                commission_id=c["commission_id"],
                title=c["title"],
                agreed_price=_money(c["agreed_price"]),
                deadline=date.fromisoformat(c["deadline"]) if c["deadline"] is not None else None,
            )
            for c in _call("manage_commission", self._list_commission_index)
        ]

    def fetch_progress(self) -> list[ProgressEntry]:
        return [
            ProgressEntry(commission_id=e["commission_id"], current_stage=e["current_stage"], stage_kind=e["stage_kind"])
            for e in _call("update_progress", self._list_progress_board)
        ]

    def fetch_payments(self) -> list[LedgerEntry]:
        return [
            LedgerEntry(
                payment_id=p["payment_id"],
                commission_id=p["commission_id"],
                direction=p["direction"],
                kind=p["kind"],
                amount=_money(p["amount"]),
                paid_at=datetime.fromisoformat(p["paid_at"]),
            )
            for p in _call("record_payment", self._list_payment_ledger)
        ]
