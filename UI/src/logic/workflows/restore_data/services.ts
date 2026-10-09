// ===WCA-CHECKPOINT-START===
// workflow: restore_data
// clause: external
// component: services
// last_updated_by: coding-agent@2026-10-09#1
// last_updated_at: 2026-10-09T15:01:21.2244322+07:00
//
// EXPERIENCES:
//   - id: restore_data-EXP-001
//     content: >
//       Bốn lời gọi, MỘT tài nguyên (ui_decomposition "Chặng F"). Adapters nhận chỉ ipc_bridge: readStatus() = invoke('restore:status', {}),
//       pickArchive() = invoke('dialog:open-file', { filters: [{ name: 'Bản sao lưu Commission Tracker', extensions: ['ctbackup'] }] }),
//       prepare(path) = invoke('restore:prepare', { archive_path }), cancel() = invoke('restore:cancel', {}). Địa chỉ, bảng nhãn và mã lỗi nằm ở
//       Configs ([CONTRACT], Data Schema 10.0.1, API Contract 5.0.0); bộ lọc, câu chữ, định dạng giờ là [UI-ONLY]. apply_pending_restore KHÔNG có
//       (in_process, chỉ restore_trigger gọi); không có prepare_restore, 'pre_restore', dialog:save-file nào trong UI/src (grep: chỉ trong chú thích).
//   - id: restore_data-EXP-002
//     content: >
//       Phân loại câu trả lời ipc (iWCA không có kind riêng cho ipc; không thêm kind thứ năm). Đúng bốn bước, đúng thứ tự: Promise bị từ chối →
//       unreachable; câu trả lời không phải { status, body } (thiếu body cũng vậy), hoặc status không nằm trong bảng nhãn của ĐÚNG lối vào đó →
//       contract_violation; nhãn ref → kiểm thân (pending_restore_record: hai đường dẫn không rỗng, timestamp thật, pending|null; canceled phải là
//       boolean; open_file: canceled true đi với path null, canceled false đi với path không rỗng); nhãn code → kiểm error_body rồi code PHẢI bằng mã
//       khai báo của nhãn đó (409 mang ERR_STORAGE_IO là vi phạm). Trường thừa (kể cả staged_db_path của Desktop) bị z.object bỏ, không truyền tiếp.
//       Câu thông báo khóa theo NHÃN, không theo mã: 424 và 500 của restore:prepare cùng ERR_STORAGE_IO mà nói khác nhau (kiểm thử duyệt bảng nhãn).
//   - id: restore_data-EXP-003
//     content: >
//       Promise bị từ chối KHÔNG thành ViewResult unreachable (tiêu đề "Không kết nối được" và nút thử lại sẽ sai: chính Desktop không trả lời). Với
//       ba lời gọi restore: rejected, origin system, mã IPC_FAILED (mã riêng của giao diện, [UI-ONLY]) câu "Không liên lạc được với ứng dụng. Hãy đóng
//       rồi mở lại ứng dụng."; với hộp thoại: DIALOG_FAILED, "Không mở được hộp thoại chọn tệp. Hãy thử lại." (cùng cách backup_data-EXP-002). Hệ quả: workflow
//       này không bao giờ trả ViewResult unreachable; trang vẫn có nhánh đó (assertNever, R13) và kiểm thử dựng trang phủ nó. "Không kết nối được tới
//       backend" của S7 là 503 của restore:prepare, không phải unreachable.
//   - id: restore_data-EXP-004
//     content: >
//       Trạng thái chờ có BA giá trị (PendingView.state): pending (khung), none (Desktop nói không có gì chờ), unknown (không đọc được). Phân biệt
//       cần thiết: sau một lần hỏng mà lần đọc lại cũng hỏng, trang ẩn khung nhưng KHÔNG được nói "Không có lần khôi phục nào đang chờ" (có thể sai).
//       Mọi thao tác đổi trạng thái chờ (loadStatus, prepare, cancel) trả RunOutcome { result: ViewResult<{message|null}>, pending }; hook chỉ giữ cả hai.
//       Luật đọc lại (Services, readAgain): mọi kết quả không phải 200 của prepare hay cancel (kể cả Promise bị từ chối và vi phạm hợp đồng) gọi
//       restore:status ĐÚNG MỘT lần; 200 thì không gọi (prepare dựng khung từ bản ghi trả về; cancel 200 là none). Câu của lần hỏng đầu giữ nguyên,
//       lần đọc lại chỉ đổi khung. 400 giữ bản ghi cũ: lần đọc lại thấy và khung hiện bản ghi đó.
//   - id: restore_data-EXP-005
//     content: >
//       Chọn tệp KHÔNG gửi gì: chooseArchive(replacesPending) chỉ mở hộp thoại; có path thì trả { outcome: 'chosen', path, question } rồi dừng, hủy trả
//       { outcome: 'canceled' } (trang giữ nguyên). question là các dòng nối bằng '\n': "Khôi phục từ tệp: <path>", câu hậu quả, và (chỉ khi
//       replacesPending) "Lần khôi phục đang chờ sẽ được thay bằng lần này." Quyết định ĐÂY của tôi (không có trong plan): replacesPending là tham số của
//       Routers, hook truyền (pending.state === 'pending', một giá trị nó đang giữ), vì Services không giữ trạng thái giữa các lần gọi. Xuống dòng và
//       đường dẫn dài do kit lo (ConfirmPanel text: white-space pre-line, overflow-wrap anywhere; xem kit). Trường thừa "không hiện": archive_app_version.
//   - id: restore_data-EXP-006
//     content: >
//       Kết quả đo trước khi viết (việc 2 của plan phiên 37; số ở EVIDENCE): hộp thoại thay thế của chặng E dùng nguyên cho dialog:open-file; khứ hồi
//       đóng rồi mở lại với fixture switchable_backend chạy được trên cùng cổng qua backend_controller; tệp điều khiển còn "down" làm fixture tắt backend ngay
//       sau READY của lần mở lại (nên harness và công cụ chạy tay đặt "up" trước); bộ gom log của harness bắt được dòng "restore dialog text" 5/5 lần.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Ma trận I3.6 của restore_data đạt: Adapters (bốn lời gọi, mọi nhãn, hình dạng hợp lệ và vi phạm, mã không khớp nhãn, trường thừa), Services (từng
//       loại CallResult, câu cho từng NHÃN duyệt từ Configs, luồng chọn tệp, đọc lại đúng một lần, khung và giờ), Routers (luồng chọn-hỏi-xác nhận).
//     how: >
//       Trong UI/: npm run check (vitest chạy src/logic/workflows/restore_data/tests/{adapters,services,routers}.test.ts, ipc_bridge giả; không có http_client).
//     result: >
//       npm run check exit 0 (tsc -b, eslint --max-warnings 0, stylelint, check_contrast, check_layer "190 files", check_e2e_status), "Tests 1936 passed
//       (1936)" (mốc 1679); riêng ba tệp của workflow: 208 ca (Adapters, Services, Routers); trang: 48 ca. Chạy lại sau khi viết checkpoint: xem EVIDENCE của main.
//     recorded_at: 2026-10-09T15:01:21.2244322+07:00
//   - claim: >
//       Chạy thật qua Routers của workflow trên hệ thống thật: restore_walkthrough S1 → S8 kích hoạt cả bốn lời gọi (status ở S1, S8; open_file ở S2, S3…;
//       prepare ở S3, S5, S6, S7; cancel ở S4); khứ hồi thật: sau khi mở lại, dữ liệu là dữ liệu của tệp sao lưu.
//     how: >
//       Trong UI/ (Desktop đã build): npx playwright test -c tests/e2e/playwright.config.ts restore_walkthrough (10 lần liên tiếp có
//       CT_WALKTHROUGH_RUNNER=coding-agent@2026-10-09#1), và trong npm run e2e. Dữ liệu và tệp sao lưu do công cụ tạo qua http (tests/tools), thư mục tạm.
//     result: >
//       Spec riêng 10/10 lần "8 passed" (mỗi lần 15,6-16,5 giây). Trong npm run e2e: 5 lượt liên tiếp có runner mỗi lượt "83 passed" (mốc 75), và một lượt
//       không đặt biến cũng "83 passed". S8: GET /clients ra đúng Khách A, Khách B (không có C), không còn restore-pending.json, restore-previous có một tệp.
//     recorded_at: 2026-10-09T15:01:21.2244322+07:00
//   - claim: >
//       Việc 2 (đo trước khi viết): open_file với hộp thoại thay thế; khứ hồi với fixture; số lần bắt được dòng "restore dialog text".
//     how: >
//       Script tạm ngoài dự án (scratchpad, không giữ lại), Node + _electron của Playwright, cùng cách mở với walkthrough_harness.ts (--ct-test-no-dialog,
//       --ct-test-data-dir tạm, fixture): (a) gán dialog.showOpenDialog, gọi invoke('dialog:open-file', { filters }) với chọn, hủy, ném lỗi, rồi chọn lại, rồi filters null;
//       (b) tạo khách A, B qua http, POST /backups, thêm C, invoke('restore:prepare'), đóng ứng dụng, mở lại trên cùng thư mục; (c) lặp (b) 5 lần; (d) (b) một lần với
//       tệp điều khiển còn "down".
//     result: >
//       (a) chọn → {"status":200,"body":{"canceled":false,"path":"C:\\stub\\backup.ctbackup"}}; hủy → {"canceled":true,"path":null}; ném lỗi → Promise bị từ chối,
//       message "Error invoking remote method 'dialog:open-file': Error: folder dialog stub: thrown on purpose"; chọn lại vẫn 200; filters null vẫn 200. Hộp thoại được
//       gọi 5 lần, số cửa sổ trước và sau đều 1 (không hộp thoại thật), tùy chọn { properties: ["openFile"], filters, title: "Chọn tệp" }. (b) lần mở lại 3,8 s:
//       log có "stopping backend", "[switchable_backend] stdin closed: stopping", "backend child … exited with code 0", "backend_controller: starting the backend again on port N",
//       "backend child … READY on port N", "restore_data: apply -> restored"; GET /clients = Khach A, Khach B; không còn restore-pending.json; restore-previous 1 tệp; restore:status
//       trả pending null; hai lần thoát mã 0. (c) 5/5 lần: dialogLineCount 1, cùng kết quả. (d) GET /clients bị ECONNREFUSED: fixture tắt backend ngay sau READY.
//     recorded_at: 2026-10-09T15:01:21.2244322+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow restore_data: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4.
 */
import { assertNever } from '../../shared/results'
import type { CallResult, ResultMessages, ViewResult } from '../../shared/results'
import type { RestoreDataAdapters } from './adapters'
import type { RestoreDataConfigs } from './configs'
import type { ChoiceView, PendingRestoreRecord, PendingView, RunDone } from './entities'

type ErrorEndpointKey = keyof RestoreDataConfigs['errorMessages']

type Failed = Exclude<CallResult<unknown>, { kind: 'ok' }>

// What a call that can change what is waiting gives back: the result to say, and
// what the page must now show of the waiting restore (see PendingView).
export type RunOutcome = { result: ViewResult<RunDone>; pending: PendingView }

const NONE: PendingView = { state: 'none' }
const UNKNOWN: PendingView = { state: 'unknown' }

export function createRestoreDataServices(adapters: RestoreDataAdapters, cfg: RestoreDataConfigs, messages: ResultMessages) {
  // Presentation decision: the two instants of the frame in the machine's time zone, Vietnamese format.
  const dateTime = new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat)
  const { frame, confirmation, texts } = cfg

  // Presentation decision (ui_decomposition.md, "Luật trình bày của chặng F"): the four
  // lines of the frame in the order the page shows them, and its closing sentence.
  // archive_app_version is not shown (§7.2, principle 2).
  function frameOf(record: PendingRestoreRecord): PendingView {
    return {
      state: 'pending',
      entries: [
        { key: 'archive_path', term: frame.entryArchive, value: record.archive_path },
        { key: 'archive_created_at', term: frame.entryArchiveCreatedAt, value: dateTime.format(new Date(record.archive_created_at)) },
        { key: 'prepared_at', term: frame.entryPreparedAt, value: dateTime.format(new Date(record.prepared_at)) },
        { key: 'safety_backup_path', term: frame.entrySafetyBackup, value: record.safety_backup_path },
      ],
      note: frame.note,
    }
  }

  const pendingOf = (record: PendingRestoreRecord | null): PendingView => (record === null ? NONE : frameOf(record))

  // A CallResult of a restore call that is not ok, to its ViewResult (i3-logic.md
  // Step I3.4). The message of a declared error is the one of that call and that
  // LABEL. A rejected Promise is said in the words of the desktop not answering, as a
  // named reason of the interface's own (cfg.ipcFailure), not as "không kết nối được":
  // retrying cannot help, since the desktop itself does not answer.
  function failure(r: Failed, endpoint: ErrorEndpointKey): ViewResult<never> {
    switch (r.kind) {
      case 'declared_error':
        return { kind: 'rejected', origin: 'system', code: r.error.code, message: cfg.errorMessages[endpoint][String(r.label)], fieldErrors: {} }
      case 'unreachable':
        return { kind: 'rejected', origin: 'system', code: cfg.ipcFailure.code, message: cfg.ipcFailure.message, fieldErrors: {} }
      case 'contract_violation':
        return { kind: 'contract_violation', message: messages.contractViolation }
      default:
        return assertNever(r)
    }
  }

  // A CallResult of open_file that is not ok. The dialog declares no error label, so a
  // declared_error cannot come from it; if it ever did, the call went against the contract.
  function dialogFailure(r: Failed): ViewResult<never> {
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

  // After any call that did not end well, read the status again so the frame shows the
  // truth (ui_decomposition.md, "Luật trình bày của chặng F"): the contract says most
  // failures leave nothing waiting, but 400 keeps the old record, and a rare 500 may too.
  // A read that fails as well hides the frame (state unknown) and says nothing new.
  async function readAgain(): Promise<PendingView> {
    const again = await adapters.readStatus()
    switch (again.kind) {
      case 'ok':
        return pendingOf(again.data.pending)
      case 'declared_error':
      case 'unreachable':
      case 'contract_violation':
        return UNKNOWN
      default:
        return assertNever(again)
    }
  }

  return {
    // restore, on opening: what is waiting. A read that fails leaves the state unknown.
    async loadStatus(): Promise<RunOutcome> {
      const r = await adapters.readStatus()
      switch (r.kind) {
        case 'ok':
          return { result: { kind: 'ok', view: { message: null } }, pending: pendingOf(r.data.pending) }
        case 'declared_error':
        case 'unreachable':
        case 'contract_violation':
          return { result: failure(r, 'getRestoreStatus'), pending: UNKNOWN }
        default:
          return assertNever(r)
      }
    },

    // restore, "Chọn tệp sao lưu": ask the person for a file. Nothing is sent to prepare:
    // a chosen file gives the question to put in the page first (§7.2, principle 5), which
    // says what will happen and, when a restore already waits, that this one replaces it.
    // A cancelled dialog is not a failure: nothing is said and the page keeps what it shows.
    async chooseArchive(replacesPending: boolean): Promise<ViewResult<ChoiceView>> {
      const picked = await adapters.pickArchive()
      switch (picked.kind) {
        case 'ok': {
          const choice = picked.data
          if (choice.canceled) return { kind: 'ok', view: { outcome: 'canceled' } }
          const lines = [`${confirmation.fileLead} ${choice.path}`, confirmation.consequence, ...(replacesPending ? [confirmation.replacesPending] : [])]
          return { kind: 'ok', view: { outcome: 'chosen', path: choice.path, question: lines.join(confirmation.lineBreak) } }
        }
        case 'declared_error':
        case 'unreachable':
        case 'contract_violation':
          return dialogFailure(picked)
        default:
          return assertNever(picked)
      }
    },

    // restore, "Chuẩn bị khôi phục" (after the question was answered yes): 200 gives the
    // frame from the record that came back; every other result reads the status again.
    async prepare(archivePath: string): Promise<RunOutcome> {
      const r = await adapters.prepare(archivePath)
      switch (r.kind) {
        case 'ok':
          return { result: { kind: 'ok', view: { message: texts.prepared } }, pending: frameOf(r.data) }
        case 'declared_error':
        case 'unreachable':
        case 'contract_violation':
          return { result: failure(r, 'requestRestore'), pending: await readAgain() }
        default:
          return assertNever(r)
      }
    },

    // restore, "Hủy lần khôi phục đang chờ": no question (it changes no data and can be
    // prepared again at any time, so §7.2 principle 5 does not ask for one). Nothing waits
    // after a 200, whether or not something did; any other result reads the status again.
    async cancel(): Promise<RunOutcome> {
      const r = await adapters.cancel()
      switch (r.kind) {
        case 'ok':
          return { result: { kind: 'ok', view: { message: r.data.canceled ? texts.canceled : texts.nothingToCancel } }, pending: NONE }
        case 'declared_error':
        case 'unreachable':
        case 'contract_violation':
          return { result: failure(r, 'cancelRestore'), pending: await readAgain() }
        default:
          return assertNever(r)
      }
    },
  }
}

export type RestoreDataServices = ReturnType<typeof createRestoreDataServices>
