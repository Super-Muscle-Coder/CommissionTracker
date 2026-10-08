// ===WCA-CHECKPOINT-START===
// workflow: restore_trigger
// clause: clause_d_desktop
// component: cross_cutting
// last_updated_by: coding-agent@2026-10-08#2
// last_updated_at: 2026-10-08T19:09:25.3415976+07:00
//
// EXPERIENCES:
//   - id: restore_trigger-EXP-001
//     content: >
//       Vị trí khối checkpoint: đầu tệp chính của thành phần (hạ tầng cắt ngang
//       không có Services, Giao thức 07). Thành phần không import Electron: Main tiêm
//       hàm applyPendingRestore (lối vào in_process của Routers của restore_data),
//       chữ hiển thị, cờ "có hiện hộp thoại không", hàm hiện hộp thoại và hàm log.
//       Chạy MỘT lần mỗi lần Main khởi động, sau backend READY và sau khi ráp
//       restore_data, trước khi tạo cửa sổ; Main chờ nó xong (API Contract 5.0.0
//       cross_cutting.restore_trigger). Nó không quyết định gì: outcome 'none' chỉ
//       ghi một dòng log; khác 'none' thì dựng chữ từ các trường của restore_outcome
//       và hiện một hộp thoại thông báo. Lỗi (500 ERR_RESTORE_FAILED) không bị bắt ở
//       đây: ghi một dòng log rồi để đi lên Main.
//   - id: restore_trigger-EXP-002
//     content: >
//       Chữ trong configs/desktop.json, mục restore_trigger: tiêu đề, nút, dấu cách
//       đoạn, và với mỗi outcome một danh sách đoạn {text, field, layout}. field là
//       tên trường của restore_outcome (hoặc null cho đoạn cố định); trường null thì
//       bỏ cả đoạn; layout "newline" đặt giá trị ở dòng dưới câu dẫn, "space" đặt
//       cùng dòng. Có --ct-test-no-dialog: không hiện hộp thoại, ghi dòng "restore
//       dialog text: <JSON {title, content}>" (cùng cách với "error dialog text").
//   - id: restore_trigger-EXP-003
//     content: >
//       Thứ tự trong Main.startLayer (phiên 36): backend READY, thư mục giao diện và protocol.handle,
//       native_dialogs, ráp restore_data (có backend_controller), RESTORE_TRIGGER (Main chờ, kể cả
//       hộp thoại), rồi danh sách địa chỉ ipc, cửa sổ, và sau lần nạp đầu mới tới reminder_ticker.
//       Hộp thoại là dialog.showMessageBox không cửa sổ cha, một nút ("Đóng"), type info. Đã đo: nó
//       không tự lên trên cùng (chỉ thấy trên thanh tác vụ), và Windows rút gọn đường dẫn dài giữa
//       chừng bằng "..." (restore_data-EXP-009 và NOTES của restore_data). Lỗi ERR_RESTORE_FAILED
//       (InProcessCallError) do Main bắt, gọi fatal với phase restore_failed: câu tiếng Việt
//       main.error_dialog.restore_failed_summary nói dữ liệu cũ đã được đưa về chỗ cũ.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       restore_trigger gọi apply_pending_restore đúng một lần, trước cửa sổ; chữ hộp thoại dựng từ
//       các trường của restore_outcome; khi lỗi thì để đi lên Main.
//     how: >
//       Xem EVIDENCE của restore_data (ca A1-A6 của tests/restore_apply.spec.ts, bốn phép cắn, P11) và
//       main (npm test, test:packaged). Chữ: dòng "restore dialog text: <JSON>" của --ct-test-no-dialog
//       trong A2 (restored, hai đường dẫn), A3a, A3b (discarded, "Chi tiết: ..."), A4 (rolled_back);
//       A5: dòng "restore_trigger: apply_pending_restore failed: ERR_RESTORE_FAILED (500) ..." rồi FATAL.
//     result: >
//       Mọi ca đạt (69 passed ba lượt; P11 đạt). Phép cắn (c) (chạy sau khi tạo cửa sổ) làm A1 hỏng:
//       "Expected: > 927, Received: 572". Hộp thoại thật: Project Owner thấy đúng chữ, một nút "Đóng"
//       (restore_data-EVIDENCE, khối Project Owner).
//     recorded_at: 2026-10-08T19:09:25.3415976+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * restore_trigger: cross-cutting infrastructure of the desktop layer. It calls
 * restore_data.apply_pending_restore once, and shows the outcome in one message
 * box. It decides nothing (WCA theory, section 5).
 */

export interface RestoreOutcomeView {
  outcome: 'none' | 'restored' | 'rolled_back' | 'discarded'
  archive_path: string | null
  safety_backup_path: string | null
  reason: string | null
}

type Field = 'archive_path' | 'safety_backup_path' | 'reason'
type ShownOutcome = Exclude<RestoreOutcomeView['outcome'], 'none'>

export interface RestoreTriggerText {
  title: string
  close_button: string
  paragraph_separator: string
  restored: Paragraph[]
  rolled_back: Paragraph[]
  discarded: Paragraph[]
}

interface Paragraph {
  text: string
  field: Field | null
  layout: 'newline' | 'space'
}

export interface RestoreDialogBox {
  title: string
  content: string
  closeButton: string
}

/** The text of the message box, from the fields of the outcome. A paragraph
 * whose field is null is left out. */
export function buildRestoreDialog(text: RestoreTriggerText, outcome: RestoreOutcomeView & { outcome: ShownOutcome }): RestoreDialogBox {
  const parts: string[] = []
  for (const paragraph of text[outcome.outcome]) {
    if (paragraph.field === null) {
      parts.push(paragraph.text)
      continue
    }
    const value = outcome[paragraph.field]
    if (value === null) continue
    parts.push(`${paragraph.text}${paragraph.layout === 'newline' ? '\n' : ' '}${value}`)
  }
  return { title: text.title, content: parts.join(text.paragraph_separator), closeButton: text.close_button }
}

export interface RestoreTriggerOptions {
  /** restore_data.apply_pending_restore (in_process). Raises on a non-2xx label. */
  applyPendingRestore: () => Promise<RestoreOutcomeView>
  text: RestoreTriggerText
  /** False under --ct-test-no-dialog: the text goes to the log instead. */
  showDialog: boolean
  /** Shows the message box and resolves when the person has closed it. */
  showMessageBox: (box: RestoreDialogBox) => Promise<void>
  log: (message: string) => void
}

/** Runs once. Resolves with the outcome after the message box (if any) is closed. */
export async function runRestoreTrigger(options: RestoreTriggerOptions): Promise<RestoreOutcomeView> {
  const { log } = options
  let outcome: RestoreOutcomeView
  try {
    outcome = await options.applyPendingRestore()
  } catch (err) {
    log(`restore_trigger: apply_pending_restore failed: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  }
  log(`restore_trigger: apply_pending_restore -> ${outcome.outcome}`)
  if (outcome.outcome === 'none') return outcome

  const box = buildRestoreDialog(options.text, { ...outcome, outcome: outcome.outcome })
  if (options.showDialog) {
    await options.showMessageBox(box)
    log('restore_trigger: the message box was closed')
  } else {
    log(`restore dialog text: ${JSON.stringify({ title: box.title, content: box.content })}`)
  }
  return outcome
}
