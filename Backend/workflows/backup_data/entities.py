"""Entities of backup_data: pure data shapes, no logic, no I/O.

Boundary shapes (data_schema.yaml, clause_b_backend.backup_data):
- BackupRequest   <- clause_a_common.types.backup_request_record
                     (input_expected.backup_request)
- ArchiveRecord   -> clause_a_common.types.backup_archive_record
                     (output_guaranteed.backup_archive)
- RestoreStaging  -> output_guaranteed.restore_staging
Internal only:
- ArchiveSettings, StagingSettings   the values of configs.yaml
- Manifest        the first component of an archive
- SnapshotFile    the consistent copy of the database, as a file
- FileDigest      size and SHA-256 of a file
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class BackupRequest:
    destination_dir: str
    purpose: str  # 'manual' | 'pre_restore'


@dataclass(frozen=True)
class ArchiveRecord:
    archive_path: str
    app_version: str
    size_bytes: int
    sha256: str  # lowercase hex, of the archive file
    created_at: datetime


@dataclass(frozen=True)
class RestoreStaging:
    archive_path: str
    is_valid: bool
    is_compatible: bool
    app_version: str | None
    created_at: str | None  # timestamp as written in the manifest
    reason: str | None
    staged_db_path: str | None  # set only when is_valid and is_compatible


@dataclass(frozen=True)
class ArchiveSettings:
    extension: str
    file_name_prefix: str
    file_name_time_format: str
    temp_suffix: str
    manifest_name: str
    database_name: str
    format: str
    format_version: int
    manifest_max_bytes: int
    max_name_attempts: int


@dataclass(frozen=True)
class StagingSettings:
    folder_name: str
    file_name: str


@dataclass(frozen=True)
class FileDigest:
    size_bytes: int
    sha256: str  # lowercase hex


@dataclass(frozen=True)
class Manifest:
    format: str
    format_version: int
    app_version: str
    created_at: str
    purpose: str
    db_size_bytes: int
    db_sha256: str
