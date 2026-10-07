// ===WCA-CHECKPOINT-START===
// workflow: backup_data
// clause: external
// component: services
// last_updated_by: coding-agent@2026-10-07#3
// last_updated_at: 2026-10-07T20:44:38.4471702+07:00
//
// EXPERIENCES:
//   - id: backup_data-EXP-001
//     content: >
//       Hai lời gọi, hai tài nguyên (ui_decomposition "Chặng E"). Adapters nhận http_client VÀ ipc_bridge: pickFolder() gọi
//       ipc_bridge.call('dialog:pick-folder', {}) (địa chỉ ở Configs, nhãn [CONTRACT]; đối số {} vì lối vào không có input);
//       createBackup(dir) gọi POST /backups với thân { backup_request: { destination_dir, purpose: 'manual' } }. prepare_restore KHÔNG
//       có ở đây (chỉ restore_data gọi); công cụ kiểm thử tests/tools/walkthrough_lib.mjs (prepareRestore) gọi nó để chứng minh tiêu chí
//       chặng E, và không có chuỗi "restore-preparations" nào trong UI/src ngoài chú thích (checkpoint này, adapters.ts) và tệp walkthrough.yaml; mã chạy không gọi nó.
//   - id: backup_data-EXP-002
//     content: >
//       Cách ánh xạ kết quả của lời gọi ipc (iWCA không có kind riêng cho ipc, không thêm kind thứ năm). Adapters: câu trả lời
//       { status: 200, body: { canceled, path } } đúng hình dạng (canceled true đi với path null; canceled false đi với path là chuỗi
//       không rỗng) → ok, data là body; mọi lệch khác (thiếu body, status khác 200, canceled không phải boolean, path rỗng hay null khi
//       chọn, giá trị không phải đối tượng, mảng) → contract_violation; Promise bị từ chối (chỉ try bọc đúng ipc.call) → unreachable,
//       reason có message của Electron (nó bọc thêm chữ "Error invoking remote method '…': Error: …", nên không ai được dựa vào chữ đó).
//       Services: unreachable của pickFolder KHÔNG thành ViewResult unreachable (tiêu đề "Không kết nối được" sẽ sai) mà thành rejected,
//       origin 'system', code DIALOG_FAILED (mã riêng của giao diện, [UI-ONLY], Configs.dialogFailure) với câu "Không mở được hộp thoại
//       chọn thư mục. Hãy thử lại."; trang chỉ có một khung rejected cho 400, 500 và lần hộp thoại hỏng ("Chưa tạo được bản sao lưu").
//   - id: backup_data-EXP-003
//     content: >
//       Luồng hai bước nằm ở Services.createBackup(onCreating), MỘT lối vào của Routers. Hủy (canceled true) → ok với view
//       { outcome: 'canceled' }, không gọi createBackup, không gọi onCreating; trang giữ nguyên những gì đang hiện. Có thư mục → gọi
//       onCreating đúng một lần rồi mới gọi createBackup, nên trang hiện "Đang tạo bản sao lưu…" chỉ ở bước 2. Quyết định này của tôi
//       (không có trong plan): hàm gọi lại onCreating là đối số của Routers/Services, vì spec đòi trạng thái chỉ ở bước 2 mà plan đòi một
//       lối vào. Lỗi ở bước 1 dừng cả luồng; mọi kết quả không phải 201 để trang xóa khung kết quả cũ (use_backup.ts).
//   - id: backup_data-EXP-004
//     content: >
//       Dung lượng (quyết định trình bày [UI-ONLY], Configs.size): đơn vị chọn từ số byte TRƯỚC khi làm tròn (dưới 1024 byte; dưới
//       1024×1024 là KB; còn lại MB); thương làm tròn tới một chữ số thập phân gần nhất, hòa thì lên (Number.prototype.toFixed), dấu phẩy
//       thập phân, không dấu nhóm. 0 → "0 byte", 1023 → "1023 byte", 1024 → "1,0 KB", 1048575 → "1024,0 KB" (không đẩy lên MB),
//       1048576 → "1,0 MB", 1280 → "1,3 KB" (hòa đi lên). Không dùng Intl.NumberFormat vì vi-VN nhóm hàng nghìn bằng dấu chấm ("1.024,0"),
//       sai với ví dụ của đặc tả. Lúc tạo dùng Intl.DateTimeFormat vi-VN như các workflow khác (R2: bản riêng).
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Ma trận I3.6 của backup_data đạt: Adapters (hai lời gọi, mọi nhãn, hình dạng pick_folder hợp lệ và vi phạm, 201 sai hình dạng),
//       Services (luồng, câu cho từng kết quả, dung lượng năm ca của plan cùng ranh giới làm tròn), Routers.
//     how: >
//       Trong UI/: npm run check (vitest chạy src/logic/workflows/backup_data/tests/{adapters,services,routers}.test.ts, ipc_bridge giả,
//       http_client giả).
//     result: >
//       npm run check exit 0, "Test Files 39 passed (39)", "Tests 1679 passed (1679)" (mốc 1555). Gồm: pickFolder hợp lệ 2 ca, 20 ca
//       lệch hợp đồng → contract_violation, Promise bị từ chối (Error và không phải Error) → unreachable; createBackup: 201, 400, 500,
//       unreachable, nhãn 200/404/409/503 → contract_violation, thiếu từng trong năm trường, 12 ca sai kiểu (size_bytes âm, 1.5, 2^53,
//       created_at không offset…), 400 mang mã khác → contract_violation, trường thừa bị bỏ; Services: hủy không gửi gì, hộp thoại hỏng
//       không gửi gì và có câu riêng, thư mục chọn được dùng đúng một lần với đúng đường dẫn (kể cả có dấu và dấu gạch ngược cuối),
//       onCreating đúng thứ tự pick → creating → create, mọi mã lỗi khai báo có câu (đi từ bảng nhãn của Configs).
//     recorded_at: 2026-10-07T20:44:38.4471702+07:00
//   - claim: >
//       Chạy thật: tệp tạo từ giao diện qua được prepare_restore (is_valid và is_compatible đều true); bản thứ hai vào cùng thư mục
//       cho tên khác; hủy không tạo tệp; thư mục không tồn tại cho 400 đúng câu; backend tắt cho "không tới được".
//     how: >
//       Trong UI/ (Desktop đã build): npx playwright test -c tests/e2e/playwright.config.ts backup_walkthrough (10 lần liên tiếp), và
//       trong npm run e2e. Hộp thoại được thay bằng tests/tools/folder_dialog_stub.mjs; thư mục chọn là thư mục tạm ct-ui-backup-*.
//     result: >
//       Spec riêng 10/10 lần "5 passed" (mỗi lần dưới 15 giây). Trong npm run e2e: 5 lượt liên tiếp có runner, mỗi lượt "75 passed"
//       (mốc 70), và một lượt không đặt biến cũng "75 passed". Xem EVIDENCE của main và screens.
//     recorded_at: 2026-10-07T20:44:38.4471702+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow backup_data: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4.
 */
import { assertNever } from '../../shared/results'
import type { CallResult, ResultMessages, ViewResult } from '../../shared/results'
import type { BackupDataAdapters } from './adapters'
import type { BackupDataConfigs } from './configs'
import type { BackupArchiveRecord, BackupResultEntry, BackupRunView, FolderChoice } from './entities'

type EndpointKey = keyof BackupDataConfigs['endpoints']

type Failed = Exclude<CallResult<unknown>, { kind: 'ok' }>

export function createBackupDataServices(adapters: BackupDataAdapters, cfg: BackupDataConfigs, messages: ResultMessages) {
  // Presentation decision: the time of creation in the machine's time zone, Vietnamese format.
  const dateTime = new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat)
  const { texts, size } = cfg

  // Presentation decision (ui_decomposition.md, "Luật trình bày của chặng E"): the
  // size of the archive file. The unit is chosen from the bytes, then the quotient
  // is rounded to the nearest tenth, a tie going up (toFixed), and written with a
  // decimal comma: 0 → "0 byte", 1023 → "1023 byte", 1024 → "1,0 KB",
  // 1048575 → "1024,0 KB", 1048576 → "1,0 MB".
  function sizeText(bytes: number): string {
    if (bytes < size.base) return `${bytes} ${size.units.byte}`
    const [quotient, unit] = bytes < size.base * size.base ? [bytes / size.base, size.units.kilo] : [bytes / (size.base * size.base), size.units.mega]
    return `${quotient.toFixed(size.decimals).replace('.', size.decimalSeparator)} ${unit}`
  }

  // The three lines of the result frame, in the order the page shows them.
  function resultEntries(record: BackupArchiveRecord): BackupResultEntry[] {
    return [
      { key: 'file', term: texts.entryFile, value: record.archive_path },
      { key: 'size', term: texts.entrySize, value: sizeText(record.size_bytes) },
      { key: 'created_at', term: texts.entryCreatedAt, value: dateTime.format(new Date(record.created_at)) },
    ]
  }

  // A CallResult of create_backup that is not ok, to its ViewResult (i3-logic.md
  // Step I3.4). The message of a declared error is the one of that call.
  function failure(r: Failed, endpoint: EndpointKey): ViewResult<never> {
    switch (r.kind) {
      case 'declared_error':
        // Presentation decision: the message for each declared error code of each call.
        return { kind: 'rejected', origin: 'system', code: r.error.code, message: cfg.errorMessages[endpoint][r.error.code], fieldErrors: {} }
      case 'unreachable':
        return { kind: 'unreachable', message: messages.unreachable }
      case 'contract_violation':
        return { kind: 'contract_violation', message: messages.contractViolation }
      default:
        return assertNever(r)
    }
  }

  // A CallResult of pick_folder that is not ok. The Promise of invoke being
  // rejected arrives as 'unreachable' (Adapters): here it is said in the words of
  // the dialog, not as "không kết nối được", and it is a named reason of the
  // interface's own (cfg.dialogFailure), not a code of the contract. The dialog
  // declares no error label, so a declared_error cannot come from it; if it ever
  // did, the call went against the contract.
  function pickFailure(r: Failed): ViewResult<never> {
    switch (r.kind) {
      case 'unreachable':
        return { kind: 'rejected', origin: 'system', code: cfg.dialogFailure.code, message: cfg.dialogFailure.message, fieldErrors: {} }
      case 'declared_error':
      case 'contract_violation':
        return { kind: 'contract_violation', message: messages.contractViolation }
      default:
        return assertNever(r)
    }
  }

  return {
    // backup, "Tạo bản sao lưu": a flow of two steps. (1) Ask the person for a
    // folder; (2) create the archive in it. The first call that does not give
    // what the flow needs stops it, and its result becomes the ViewResult:
    //   - a cancelled dialog is not a failure: nothing is sent and nothing new is
    //     said, so the page keeps what it shows ({ outcome: 'canceled' });
    //   - a failed dialog, or an answer off the contract: nothing is sent.
    // onCreating is called once, just before step 2, so the page can say "Đang tạo
    // bản sao lưu…" only while the archive is being made, not while the person
    // is still choosing. Not called when step 2 does not happen.
    async createBackup(onCreating: () => void): Promise<ViewResult<BackupRunView>> {
      const picked = await adapters.pickFolder()
      switch (picked.kind) {
        case 'ok': {
          const choice: FolderChoice = picked.data
          if (choice.canceled) return { kind: 'ok', view: { outcome: 'canceled' } }
          onCreating()
          const made = await adapters.createBackup(choice.path)
          switch (made.kind) {
            case 'ok':
              return { kind: 'ok', view: { outcome: 'created', message: texts.created, entries: resultEntries(made.data) } }
            case 'declared_error':
            case 'unreachable':
            case 'contract_violation':
              return failure(made, 'createBackup')
            default:
              return assertNever(made)
          }
        }
        case 'declared_error':
        case 'unreachable':
        case 'contract_violation':
          return pickFailure(picked)
        default:
          return assertNever(picked)
      }
    },
  }
}

export type BackupDataServices = ReturnType<typeof createBackupDataServices>
