"""Entities of update_progress: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.update_progress):
- StageOption        <- input_expected.stage_catalog (one element), and
                        -> one element of output_guaranteed.stage_options
- StageChange        <- input_expected.stage_change
- Money,
  CommissionSummary  <- input_expected.commission_summary (from
                        manage_commission; described here, never imported
                        from manage_commission)
- ProgressState      -> output_guaranteed.progress_state
- ProgressEntry      -> one element of output_guaranteed.progress_board
- StageChangeRecord  -> one element of output_guaranteed.progress_history
"""

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class StageOption:
    stage: str
    kind: str  # stage_kind: 'active' | 'on_hold' | 'finished' | 'cancelled'


@dataclass(frozen=True)
class StageChange:
    to_stage: str
    note: str | None


@dataclass(frozen=True)
class Money:
    amount_minor: int
    currency: str


@dataclass(frozen=True)
class CommissionSummary:
    commission_id: str
    title: str
    agreed_price: Money
    deadline: date | None


@dataclass(frozen=True)
class ProgressState:
    commission_id: str
    current_stage: str
    stage_kind: str
    updated_at: datetime | None  # None: no stage has been set yet


@dataclass(frozen=True)
class ProgressEntry:
    commission_id: str
    current_stage: str
    stage_kind: str


@dataclass(frozen=True)
class StageChangeRecord:
    commission_id: str
    from_stage: str | None  # None on the first change
    to_stage: str
    note: str | None
    changed_at: datetime
    # Internal only (not in progress_history): 1-based place of the change
    # in the commission's history, and the kind of to_stage when the change
    # was made (so a stored stage keeps its kind if the catalog changes).
    position: int
    to_kind: str
