"""Entities of manage_watermark_profile: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.manage_watermark_profile):
- ProfileInput      <- input_expected.profile_input
- WatermarkProfile  -> output_guaranteed.watermark_profile (consumed by
                       apply_watermark, verify_watermark), and one element of
                       output_guaranteed.profile_list
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ProfileInput:
    display_name: str
    legal_name: str | None
    contact: str | None
    ownership_statement: str | None
    default_strength: str  # watermark_strength: one of strength_presets


@dataclass(frozen=True)
class WatermarkProfile:
    profile_id: str
    display_name: str
    legal_name: str | None
    contact: str | None
    ownership_statement: str | None
    default_strength: str
    # Internal only (not in watermark_profile_record): when the profile was
    # created and last edited.
    created_at: datetime
    updated_at: datetime
