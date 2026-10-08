// ===WCA-CHECKPOINT-START===
// workflow: native_dialogs
// clause: clause_d_desktop
// component: cross_cutting
// last_updated_by: coding-agent@2026-10-08#1
// last_updated_at: 2026-10-08T14:59:36.1924815+07:00
//
// EXPERIENCES:
//   - id: native_dialogs-EXP-001
//     content: >
//       Vị trí và chia tệp. Khối checkpoint ở đầu tệp chính
//       src/cross_cutting/native_dialogs/native_dialogs.ts, vì hạ tầng cắt ngang
//       không có Services (Giao thức 07). request_checks.ts là các hàm thuần,
//       không import Electron: senderRefusal (khung gửi có thuộc cửa sổ chính và có
//       origin bằng ui_origin không), argumentRefusal (đối số hợp lệ của pick_folder là
//       {} hoặc undefined), openFileArgument (đối số của open_file, từ phiên 35),
//       originOfUrl. native_dialogs.ts import dialog và ipcMain của Electron; Main
//       tiêm ui_origin, địa chỉ và tiêu đề (đọc từ desktop.json, mục
//       native_dialogs.pick_folder và native_dialogs.open_file), hàm lấy cửa sổ chính
//       và hàm log. Hai lối vào hiện thực: pick_folder (dialog:pick-folder, phiên 33) và
//       open_file (dialog:open-file, phiên 35, cho khôi phục ở chặng F). save_file
//       (dialog:save-file, chưa ai cần) vẫn nằm trong hợp đồng, chưa hiện thực: ca N2
//       khẳng định preload từ chối dialog:save-file (từ phiên 35; trước đó danh sách
//       gồm cả dialog:open-file) cùng các địa chỉ lạ khác.
//   - id: native_dialogs-EXP-002
//     content: >
//       Hành vi (đặc tả đã chốt của plan phiên 33; API Contract 4.0.0
//       cross_cutting.native_dialogs.pick_folder, input none, output 200
//       { canceled, path }). ipcMain.handle(address) được Main đăng ký TRƯỚC khi
//       tạo BrowserWindow. Mỗi lời gọi qua ba bước. (1) Khung gửi: event.sender phải
//       là webContents của cửa sổ chính, và origin dựng từ event.senderFrame.url
//       phải bằng ui_origin; origin được dựng lại từ protocol + '//' + host, vì
//       new URL('app://...').origin là "null" trong Node (như main-EXP-003).
//       Khác thì log "native_dialogs: dialog:pick-folder refused: <lý do>" và ném
//       lỗi, nên Promise phía renderer bị từ chối; hộp thoại không mở. (2) Đối số:
//       {} hoặc undefined; mọi giá trị khác ({x:1}, "abc", null, mảng) bị từ chối
//       như trên. Hợp đồng không có nhãn 400 cho lối vào này, nên không bịa nhãn.
//       (3) dialog.showOpenDialog(<cửa sổ chính>, { properties: ['openDirectory'],
//       title: 'Chọn thư mục' }): không thư mục mặc định, không nhớ lần trước ("keeps
//       nothing"). Trả luôn { status: 200, body: { canceled, path } }: hủy hoặc
//       filePaths rỗng thì { canceled: true, path: null }, chọn thì
//       { canceled: false, path: filePaths[0] }. Hộp thoại ném lỗi: log
//       "native_dialogs: dialog:pick-folder failed: <lý do>", ném lại, Promise bị
//       từ chối, ứng dụng chạy tiếp (ca N6). Log mỗi lời gọi một dòng: "-> canceled"
//       hoặc "-> chosen <đường dẫn>". Điều Electron tự làm: với mỗi lỗi ném từ
//       trình xử lý, Electron tự in thêm ra stderr "Error occurred in handler for
//       'dialog:pick-folder': ..." cùng stack; đó không phải dòng của Main.
//   - id: native_dialogs-EXP-003
//     content: >
//       Kết quả đo việc 2 của plan: kiểm thử thay được hộp thoại thật mà không cần
//       cờ mới. dialog.showOpenDialog là thuộc tính của chính (writable true,
//       configurable true, không phải getter, dialog không bị đóng băng); mã đã dịch
//       của Main đọc electron_1.dialog.showOpenDialog lúc gọi, nên app.evaluate(({
//       dialog }) => { dialog.showOpenDialog = async (...args) => ... }) làm lời gọi
//       sau đó tới hàm giả, đối số đầu là chính đối tượng BrowserWindow, và không
//       hộp thoại thật nào mở. Hàm giả ghi id cửa sổ và options nhận được (ca N3
//       khẳng định cửa sổ cha là cửa sổ chính và options đúng). Trong app.evaluate
//       không có require; chỉ dùng tham số { dialog } mà Playwright trao.
//       Hai ca "khung lạ" dựng được và mỗi ca chỉ phạm đúng một điều kiện. (a) Ca
//       origin (N7): Main gọi win.loadURL('data:text/html,...') vào chính cửa sổ
//       chính (will-navigate không bắn với loadURL gọi từ Main); preload vẫn chạy,
//       bridge vẫn có đủ hai khóa, location.origin là "null" và originOfUrl cho
//       "data://"; khung vẫn thuộc cửa sổ chính, nên chỉ kiểm origin chặn được.
//       (b) Ca cửa sổ (N8): Main tạo BrowserWindow thứ hai với cùng preload và cùng
//       additionalArguments, nạp app://commission-tracker/index.html; origin đúng,
//       nhưng event.sender không phải cửa sổ chính, nên chỉ kiểm cửa sổ chặn được.
//       Hệ quả đáng biết: bridge có mặt ở mọi trang mà cửa sổ này nạp; Main chỉ nạp
//       ui_origin và chặn điều hướng, nên kiểm khung gửi là lớp phòng thủ thứ hai,
//       không phải lớp duy nhất.
//   - id: native_dialogs-EXP-004
//     derived_from: native_dialogs-PROB-001
//     content: >
//       Phép cắn (b) của plan phiên 33 ("bỏ danh sách địa chỉ được phép trong
//       preload thì N2 hỏng"; chuyển từ vấn đề theo DSK-22). Bộ phân loại quyền đã
//       chặn lần sửa preload ở phiên 33 ("Security Weaken"), nên không có số liệu
//       từ máy này. Số liệu thay thế: Orchestrator chạy phép cắn trong audit phiên
//       33 trên bản sao Linux (không phải máy Windows này): bỏ danh sách địa chỉ
//       trong preload thì N2 hỏng ở dialog:open-file, vì spy trong Main nhận lời gọi
//       và trả { ok: true, value: { status: 200, ... } } thay vì bị từ chối "ipc
//       address not implemented". Từ phiên 35 spy của N2 đặt trên dialog:save-file
//       (open_file đã có trình xử lý thật), cùng cách khẳng định.
//   - id: native_dialogs-EXP-005
//     content: >
//       open_file (phiên 35; API Contract 5.0.0 cross_cutting.native_dialogs.open_file,
//       input { filters }, output 200 { canceled, path }). Cùng đường đi với
//       pick_folder (hàm register trong native_dialogs.ts: kiểm khung gửi, kiểm đối
//       số, hộp thoại, trả lời), chỉ khác đối số và options của hộp thoại:
//       dialog.showOpenDialog(<cửa sổ chính>, { properties: ['openFile'], title:
//       'Chọn tệp' (desktop.json), filters }). Đối số: undefined, {} hay { filters:
//       null } nghĩa là không lọc (options không có khóa filters); { filters: [ { name:
//       string, extensions: list[string] } ] } được chuyển nguyên; mọi hình dạng khác
//       (không phải object, khóa thừa, filters không phải null hay list, phần tử thiếu name,
//       extensions không phải list chuỗi, khóa thừa trong phần tử) bị TỪ CHỐI
//       (Promise bị từ chối "call refused (...)", hộp thoại không mở), vì hợp đồng
//       không có nhãn 400 cho lối vào này. Không kiểm nội dung extensions (dấu chấm,
//       dấu sao): đó là việc của Electron. Trang thử gọi với { name: 'Tệp sao lưu
//       Commission Tracker', extensions: ['ctbackup'] }. Project Owner xác nhận trên
//       máy thật: tiêu đề "Chọn tệp" kèm icon ứng dụng, có bộ lọc loại tệp, chọn trả
//       { status: 200, body: { canceled: false, path } }.
//   - id: native_dialogs-EXP-006
//     content: >
//       Thứ tự đăng ký (DSK-22, phép cắn (g) của audit phiên 33). Ca N14: trang
//       tests/fixtures/invoke_on_load gọi invoke('dialog:pick-folder', {}) và
//       invoke('restore:status', {}) ngay khi trang nạp (script chạy lúc phân tích
//       trang, không chờ bấm hay hẹn giờ), ghi từng câu trả lời lên trang. Hộp thoại
//       thật được thay bằng hàm giả NGAY SAU launch (app.evaluate trước khi cửa sổ
//       tồn tại): Main phải chờ backend (khoảng một giây) mới tạo cửa sổ nên hàm giả
//       có trước dòng đầu của trang; không có cờ kiểm thử mới và không đổi mã Main.
//       Nếu trình xử lý ipc chưa đăng ký lúc đó, Electron từ chối "No handler
//       registered for 'dialog:pick-folder'".
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Plan phiên 33, việc 2: dialog.showOpenDialog thay được từ kiểm thử, không cần
//       cờ mới; hai khung lạ dựng được.
//     how: >
//       cd Desktop; npm run build; một script đo tạm (không nằm trong dự án) dùng
//       _electron.launch với cờ --ct-test-data-dir, --ct-test-no-dialog,
//       --ct-test-renderer-root=tests/fixtures/probe, rồi app.evaluate(({ dialog }) =>
//       Object.getOwnPropertyDescriptor(dialog, 'showOpenDialog')), gán đè hàm và gọi
//       dialog.showOpenDialog(cửa sổ, {...}); rồi mainWindow.loadURL('data:text/html,...')
//       và đọc window.commissionTracker, location.origin trong trang đó.
//     result: >
//       descriptor {"writable":true,"configurable":true,"get":undefined}, dialog
//       không frozen, không sealed. Lời gọi sau khi gán đè trả về giá trị của hàm giả
//       ({"canceled":false,"filePaths":["C:\\stub\\folder"]}), đối số đầu là
//       BrowserWindow, options đúng. Trang data: trong cửa sổ chính: origin "null",
//       bridge có khóa ["backendBaseUrl"] (đo trước khi thêm invoke).
//     recorded_at: 2026-10-07T15:33:24.1521449+07:00
//   - claim: >
//       Chín ca native_dialogs (N1 hàm thuần; N2-N9 Main thật) đạt: chọn, hủy, đối
//       số, hộp thoại ném lỗi, khung origin lạ, cửa sổ lạ, địa chỉ lạ, hình dạng bridge.
//     how: >
//       cd Desktop; npm test (build rồi playwright test; chạy ba lần liên tiếp), hoặc
//       riêng npx playwright test tests/native_dialogs.spec.ts. Hộp thoại thật được thay
//       bằng hàm giả gán trong Main (native_dialogs-EXP-003).
//     result: >
//       npm test: 40 passed ở cả ba lượt (4,1; 4,1; 4,2 phút), sau bộ không còn
//       python.exe của dự án; 31 ca cũ cộng 9 ca mới. N3: trả
//       { status: 200, body: { canceled: false, path } } với path là thư mục tạm tuyệt
//       đối, hộp thoại nhận đối số đầu là cửa sổ chính (id khớp) và options
//       { properties: ['openDirectory'], title: 'Chọn thư mục' }. N4: { canceled: true,
//       path: null }. N5: {} và không đối số mở hộp thoại (số lời gọi hàm giả tăng 2);
//       { x: 1 }, 'abc', null, [] đều bị từ chối "call refused (the argument is not an
//       empty object)", số lời gọi không tăng, bốn dòng log refused. N6: "boom from the
//       dialog" làm Promise bị từ chối, có dòng log failed, lời gọi kế tiếp vẫn trả
//       200, không FATAL. N7: trang data: nhận "call refused (the sending frame's
//       origin is data://, not app://commission-tracker)", hộp thoại không mở. N8:
//       cửa sổ thứ hai (origin đúng) nhận "call refused (the sender is not the main
//       window)", hộp thoại không mở, cửa sổ chính vẫn gọi được. N2 (phiên 35: bỏ
//       dialog:open-file khỏi danh sách, spy chuyển sang dialog:save-file): năm
//       địa chỉ/giá trị lạ (dialog:save-file, no:such:channel, '', 123, undefined) đều
//       bị từ chối "ipc address not implemented", spy gắn trong Main không nhận lời
//       gọi nào. N9: bridge có đúng ['backendBaseUrl','invoke'], frozen, invoke là
//       function, ipcRenderer, electron, require, process đều undefined.
//     recorded_at: 2026-10-07T15:33:24.1521449+07:00
//   - claim: >
//       Phép cắn (a): bỏ kiểm origin hoặc bỏ kiểm cửa sổ gửi thì ca tương ứng hỏng.
//     how: >
//       Tạm sửa mã, npm run build, npx playwright test tests/native_dialogs.spec.ts,
//       khôi phục. (a1) xóa dòng "if (origin !== uiOrigin) return ..." trong
//       senderRefusal (request_checks.ts). (a2) thay "win !== null && event.sender ===
//       win.webContents" bằng true trong native_dialogs.ts.
//     result: >
//       (a1) hỏng N1 (senderRefusal của data:text/html trả null) và N7 (hộp thoại hàm
//       giả được mở, lời gọi trả ok thay vì bị từ chối); N8 và N9 "did not run" vì
//       chế độ serial; 2 failed, 2 did not run, 5 passed. (a2) hỏng N8 (lời gọi từ
//       cửa sổ thứ hai được trả lời, hộp thoại giả được mở); N9 did not run; 1 failed,
//       1 did not run, 7 passed. Sau khi khôi phục cả hai, npm test 40 passed.
//     recorded_at: 2026-10-07T15:33:24.1521449+07:00
//   - claim: >
//       Hộp thoại thật của Windows, do Project Owner xác nhận bằng mắt (việc 5).
//     how: >
//       cd Desktop; npm run probe; bấm "Chọn thư mục" ở trang thử; chọn một thư mục,
//       rồi bấm lại và Hủy. Log của lần chạy ghi ở đầu ra của npm run probe.
//     result: >
//       Project Owner (2026-10-07): hộp thoại chọn thư mục của Windows hiện ra khi bấm
//       nút; trong lúc nó mở, không bấm được cửa sổ Desktop Probe cho tới khi chọn một
//       thư mục hoặc tắt hộp thoại (modal, "đây là hành vi đúng"). Chọn thư mục: ô trả
//       lời hiện {"status":200,"body":{"canceled":false,"path":"C:\\Users\\A\\Downloads\\
//       Biểu mẫu Thực tập CN\\Biểu mẫu Thực tập CN"}}. Hủy: {"status":200,"body":
//       {"canceled":true,"path":null}}. Bridge trong trang: keys ["backendBaseUrl","invoke"],
//       frozen true, invoke function, nodeRequire và nodeProcess undefined. Log:
//       "native_dialogs: dialog:pick-folder -> chosen C:\\Users\\A\\Downloads\\..." và
//       nhiều dòng "-> canceled". Câu trả lời của Project Owner không nhắc nguyên văn
//       chữ tiêu đề cửa sổ hộp thoại; chữ đó là "Chọn thư mục" theo desktop.json và
//       ca N3 kiểm options.title. Chưa chụp ảnh hộp thoại.
//     recorded_at: 2026-10-07T15:33:24.1521449+07:00
//   - claim: >
//       Ca P9 của bản đóng gói: bridge có invoke, dialog:pick-folder trả lời đúng với
//       hộp thoại thay thế, địa chỉ lạ bị từ chối.
//     how: >
//       cd Desktop; xóa packaging\stage và release; ELECTRON_BUILDER_CACHE trỏ vào thư
//       mục tạm; npm run dist; npm run test:packaged.
//     result: >
//       app.asar có dist\cross_cutting\native_dialogs\native_dialogs.js và
//       request_checks.js (electron-builder.yml đã có dist/cross_cutting/**/*.js từ
//       main-EXP-027). test:packaged: 9 passed (1,1 phút): P1-P8 như cũ và P9 (keys
//       ['backendBaseUrl','invoke'], frozen, invoke function; chọn trả
//       { status: 200, body: { canceled: false, path } }; hủy trả { canceled: true,
//       path: null }; dialog:save-file (phiên 35; trước đó dialog:open-file) bị từ chối
//       "ipc address not implemented"; không FATAL; đóng cửa sổ thoát mã 0).
//     recorded_at: 2026-10-07T15:33:24.1521449+07:00
//   - claim: >
//       Phiên 35: open_file (N1b, N10-N13) và thứ tự đăng ký (N14, DSK-22) đạt; N2 chỉ
//       đổi danh sách địa chỉ lạ; phép cắn DSK-22 làm N14 hỏng.
//     how: >
//       cd Desktop; npm test (chạy ba lần liên tiếp), hoặc riêng npx playwright test
//       tests/native_dialogs.spec.ts. Phép cắn: tạm bọc registerNativeDialogs trong một
//       hàm và gọi nó SAU lần nạp đầu (sau khối try/catch của win.loadURL) trong main.ts,
//       npm run build, npx playwright test tests/native_dialogs.spec.ts -g N14, khôi phục
//       (grep BITE không còn kết quả).
//     result: >
//       native_dialogs.spec.ts lúc viết: 15 passed (16 s). npm test: 62 passed ở cả ba
//       lượt (4,6; 4,5; 4,6 phút). N10: chọn trả 200 { canceled: false, path }, hộp thoại
//       nhận cửa sổ chính (id khớp) và options { properties: ['openFile'], title: 'Chọn
//       tệp' }; hủy và không đối số trả { canceled: true, path: null }. N11: filters hợp lệ
//       tới hộp thoại nguyên vẹn; { filters: null } cho options không có khóa filters.
//       N12: bảy hình dạng sai bị từ chối "call refused", số lời gọi hộp thoại không tăng,
//       bảy dòng log refused. N13: "boom from the file dialog" làm Promise bị từ chối, có
//       dòng log failed, lời gọi kế tiếp vẫn 200. N14: cả hai lời gọi lúc nạp có câu trả lời
//       ({ status: 200, body: { canceled: false, path } } và { status: 200, body: { pending:
//       null } }), hộp thoại giả nhận đúng một lời gọi. Phép cắn: N14 hỏng với
//       "Error invoking remote method 'dialog:pick-folder': Error: No handler registered
//       for 'dialog:pick-folder'" (Expected ok true, Received ok false), 1 failed; bộ phân
//       loại quyền không chặn. Khôi phục thì 15 passed.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//
// NOTES:
//   - content: >
//       Cho phiên giao diện của chặng F: window.commissionTracker.invoke('dialog:open-file',
//       { filters: [ { name, extensions } ] | null }) trả { status: 200, body: { canceled,
//       path } } (đối số { } cũng được); Promise bị từ chối khi đối số sai hình dạng, khung
//       gửi sai hay hộp thoại lỗi. extensions viết không có dấu chấm ('ctbackup').
//     written_at: 2026-10-08
//   - content: >
//       Cho phiên giao diện của chặng E (trang sao lưu): gọi
//       window.commissionTracker.invoke('dialog:pick-folder', {}) và nhận
//       { status: 200, body: { canceled, path } }; Promise bị từ chối (không phải một
//       nhãn kết quả) khi địa chỉ sai, đối số sai, hộp thoại lỗi, hay khung gửi bị từ
//       chối: giao diện xử lý như lỗi hệ thống. Đường dẫn chọn được là đầu vào end_user,
//       đi vào workflow qua điểm giao tiếp của chính workflow (POST /backups).
//     written_at: 2026-10-07
// ===WCA-CHECKPOINT-END===
/**
 * native_dialogs (api_contract.yaml, clause_a_common.cross_cutting): shows the
 * operating system's file dialogs for the renderer, over ipc. Presentation
 * only: it calls no workflow and keeps nothing. A path it hands back reaches a
 * workflow later as end_user input, through that workflow's own endpoint.
 *
 * Two entries are implemented: pick_folder (dialog:pick-folder) and open_file
 * (dialog:open-file); save_file stays in the contract until a page needs it.
 *
 * The Main registers it before the window opens and passes in the window
 * (so the dialog is modal to it), the interface origin, the addresses and the
 * dialog titles, and the log function.
 */

import { dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { argumentRefusal, openFileArgument, senderRefusal, type FileFilter } from './request_checks'

export interface NativeDialogsOptions {
  /** shared_values.ui_origin: the only origin whose frame may call. */
  uiOrigin: string
  pickFolder: { address: string; title: string }
  openFile: { address: string; title: string }
  /** The Main's window; null once it is closed. */
  getMainWindow: () => BrowserWindow | null
  log: (message: string) => void
}

/** api_contract.yaml pick_folder and open_file, label 200. */
export interface DialogReply {
  status: 200
  body: { canceled: boolean; path: string | null }
}

export function registerNativeDialogs(options: NativeDialogsOptions): void {
  /** One ipc entry: the sender check, the argument check (which gives the
   * dialog's extra options), the dialog, then the reply. */
  const register = (
    entry: { address: string; title: string },
    check: (argument: unknown) => { ok: true; dialogOptions: Electron.OpenDialogOptions } | { ok: false; reason: string },
  ): void => {
    const { address } = entry
    const refuse = (reason: string): never => {
      options.log(`native_dialogs: ${address} refused: ${reason}`)
      throw new Error(`${address}: call refused (${reason})`)
    }

    ipcMain.handle(address, async (event: IpcMainInvokeEvent, argument: unknown): Promise<DialogReply> => {
      const win = options.getMainWindow()
      const senderProblem = senderRefusal(
        { senderIsMainWindow: win !== null && event.sender === win.webContents, frameUrl: event.senderFrame?.url ?? null },
        options.uiOrigin,
      )
      if (senderProblem !== null || win === null) return refuse(senderProblem ?? 'there is no main window')
      const checked = check(argument)
      if (!checked.ok) return refuse(checked.reason)

      let result: Electron.OpenDialogReturnValue
      try {
        result = await dialog.showOpenDialog(win, { ...checked.dialogOptions, title: entry.title })
      } catch (err) {
        // The contract has only label 200 for these entries: no label is invented.
        // The promise on the renderer side is rejected.
        options.log(`native_dialogs: ${address} failed: ${err instanceof Error ? err.message : String(err)}`)
        throw err
      }
      if (result.canceled || result.filePaths.length === 0) {
        options.log(`native_dialogs: ${address} -> canceled`)
        return { status: 200, body: { canceled: true, path: null } }
      }
      options.log(`native_dialogs: ${address} -> chosen ${result.filePaths[0]}`)
      return { status: 200, body: { canceled: false, path: result.filePaths[0] } }
    })
  }

  register(options.pickFolder, (argument) => {
    const problem = argumentRefusal(argument)
    return problem === null ? { ok: true, dialogOptions: { properties: ['openDirectory'] } } : { ok: false, reason: problem }
  })

  register(options.openFile, (argument) => {
    const parsed = openFileArgument(argument)
    if (!parsed.ok) return parsed
    const filters: FileFilter[] | null = parsed.filters
    return { ok: true, dialogOptions: filters === null ? { properties: ['openFile'] } : { properties: ['openFile'], filters } }
  })
}
