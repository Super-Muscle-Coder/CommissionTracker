/**
 * Entities of the interface workflow restore_data: types only. Types at the
 * boundary keep the contract's field names (data_schema.yaml 10.0.1,
 * clause_a_common types and clause_d_desktop.restore_data; api_contract.yaml
 * 5.0.0 clause_d_desktop.restore_data and cross_cutting.native_dialogs.open_file).
 */

// Realizes the input of request_restore as sent: the one argument of the ipc
// call is exactly this object (input_expected [archive_path]), nothing more.
export type RestoreRequest = { archive_path: string }

// Realizes clause_a_common.types.pending_restore_record.
export type PendingRestoreRecord = {
  archive_path: string
  archive_app_version: string
  archive_created_at: string
  safety_backup_path: string
  prepared_at: string
}

// Realizes restore_data.output_guaranteed.restore_status: object { pending: pending_restore_record|null }.
export type RestoreStatusRecord = { pending: PendingRestoreRecord | null }

// Realizes restore_data.output_guaranteed.restore_cancellation: object { canceled: boolean }.
export type RestoreCancellation = { canceled: boolean }

// Realizes the 200 output of cross_cutting.native_dialogs.open_file: object
// { canceled: boolean, path: file_path|null }. The two cases the interface
// accepts (a chosen file always carries a path, a cancelled dialog never does);
// any other combination is a contract violation.
export type FileChoice = { canceled: true; path: null } | { canceled: false; path: string }

// --- view models — the interface's own -----------------------------------------

// One line of the frame "Đang chờ khôi phục": what it is, and its value.
export type PendingEntry = { key: string; term: string; value: string }

// What the page knows about the restore waiting for the next start:
//   pending — one is waiting: the lines of its frame and the closing sentence;
//   none    — the desktop said nothing is waiting;
//   unknown — the page has no answer (the status could not be read), so it says nothing.
export type PendingView =
  | { state: 'pending'; entries: PendingEntry[]; note: string }
  | { state: 'none' }
  | { state: 'unknown' }

// What a call that can change what is waiting (read, prepare, cancel) says when
// it went well: the message (null when there is none to say, as for a plain read).
export type RunDone = { message: string | null }

// What one press of "Chọn tệp sao lưu" ended in, when nothing went wrong:
// 'canceled' (the person closed the dialog: nothing is sent, the page keeps what
// it shows) or 'chosen' (the question to put in the page before anything is sent).
export type ChoiceView = { outcome: 'canceled' } | { outcome: 'chosen'; path: string; question: string }
