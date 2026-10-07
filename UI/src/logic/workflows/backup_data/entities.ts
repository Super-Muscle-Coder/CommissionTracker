/**
 * Entities of the interface workflow backup_data: types only. Types at the
 * boundary keep the contract's field names (data_schema.yaml 9.0.3,
 * clause_a_common types and clause_b_backend.backup_data; api_contract.yaml
 * 4.0.0 cross_cutting.native_dialogs.pick_folder).
 */

// Realizes backup_request_record.purpose, of which the interface only ever
// sends 'manual' ('pre_restore' is restore_data's).
export type BackupPurpose = 'manual'

// Realizes clause_a_common.types.backup_request_record, as sent by
// create_backup: exactly these fields, nothing more.
export type BackupRequestRecord = {
  destination_dir: string
  purpose: BackupPurpose
}

// Realizes clause_a_common.types.backup_archive_record.
export type BackupArchiveRecord = {
  archive_path: string
  app_version: string
  size_bytes: number
  sha256: string
  created_at: string
}

// Realizes the 200 output of cross_cutting.native_dialogs.pick_folder: object
// { canceled: boolean, path: file_path|null }. The two cases the interface
// accepts (the folder-chosen case always carries a path, the cancelled one
// never does); any other combination is a contract violation.
export type FolderChoice = { canceled: true; path: null } | { canceled: false; path: string }

// --- view models — the interface's own -----------------------------------------

// One line of the result frame: what it is, and its value.
export type BackupResultEntry = { key: string; term: string; value: string }

// What one press of "Tạo bản sao lưu" ended in, when nothing went wrong:
// 'canceled' (the person closed the dialog: nothing was sent, the page keeps
// what it shows) or 'created' (the notice and the result frame).
export type BackupRunView =
  | { outcome: 'canceled' }
  | { outcome: 'created'; message: string; entries: BackupResultEntry[] }
