/**
 * Entities of restore_data: data shapes only, no behaviour.
 *
 * The shapes received from backup_data are described here again, from the
 * contract (data_schema.yaml clause_b_backend.backup_data and
 * clause_d_desktop.restore_data); nothing is imported from the Backend.
 */

/** configs/restore_data.json. Labels and error codes realize
 * api_contract.yaml clause_d_desktop.restore_data (API Contract 5.0.0). */
export interface RestoreDataConfig {
  addresses: { request_restore: string; get_restore_status: string; cancel_restore: string }
  labels: {
    ok: number
    validation: number
    not_found: number
    incompatible_backup: number
    safety_backup_failed: number
    storage_io: number
    service_unavailable: number
  }
  error_codes: {
    validation: string
    not_found: string
    incompatible_backup: string
    storage_io: string
    service_unavailable: string
  }
  backend_requests: {
    prepare_restore: { method: string; path: string }
    create_backup: { method: string; path: string }
    safety_backup_purpose: string
    timeout_ms: number
  }
  files: { safety_folder_name: string; pending_file_name: string; temp_suffix: string }
}

/** data_schema.yaml clause_a_common.types.pending_restore_record. */
export interface PendingRestoreRecord {
  archive_path: string
  archive_app_version: string
  archive_created_at: string
  safety_backup_path: string
  prepared_at: string
}

/** What is kept in the pending file: the record, plus the staged database
 * file of backup_data (internal, never returned to the caller). */
export interface StoredPendingRecord extends PendingRestoreRecord {
  staged_db_path: string
}

/** data_schema.yaml clause_b_backend.backup_data.output_guaranteed.restore_staging. */
export interface RestoreStaging {
  archive_path: string
  is_valid: boolean
  is_compatible: boolean
  app_version: string | null
  created_at: string | null
  reason: string | null
  staged_db_path: string | null
}

/** data_schema.yaml clause_a_common.types.backup_archive_record. */
export interface BackupArchive {
  archive_path: string
  app_version: string
  size_bytes: number
  sha256: string
  created_at: string
}

/** api_contract.yaml clause_a_common.error_body. */
export interface ErrorBody {
  code: string
  message: string
  details: Record<string, unknown> | null
}

/** data_schema.yaml restore_status / restore_cancellation. */
export interface RestoreStatus {
  pending: PendingRestoreRecord | null
}
export interface RestoreCancellation {
  canceled: boolean
}

/** The reply of an ipc entry (api_contract.yaml endpoint_forms.ipc). */
export interface RestoreReply {
  status: number
  body: PendingRestoreRecord | RestoreStatus | RestoreCancellation | ErrorBody
}

/** What the Adapters report back to the Services. A failure carries the reason
 * as text; an unexpected exception (a programming error) is never turned into
 * one of these: it is thrown. */
export type PrepareRestoreOutcome =
  | { kind: 'staging'; staging: RestoreStaging }
  | { kind: 'not_found' }
  | { kind: 'failed'; reason: string }

export type CreateBackupOutcome = { kind: 'created'; archive: BackupArchive } | { kind: 'failed'; reason: string }

export type EnsureFolderOutcome = { kind: 'ready' } | { kind: 'failed'; reason: string }

export type ReadPendingOutcome =
  | { kind: 'none' }
  | { kind: 'record'; record: StoredPendingRecord }
  | { kind: 'unreadable'; reason: string }

export type WritePendingOutcome = { kind: 'written' } | { kind: 'failed'; reason: string }

export type DeletePendingOutcome = { kind: 'deleted' } | { kind: 'absent' } | { kind: 'failed'; reason: string }
