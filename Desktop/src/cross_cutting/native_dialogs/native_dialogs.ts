// ===WCA-CHECKPOINT-START===
// workflow: native_dialogs
// clause: clause_d_desktop
// component: cross_cutting
// last_updated_by: coding-agent@2026-10-07#2
// last_updated_at: 2026-10-07T15:33:24.1521449+07:00
//
// EXPERIENCES:
//   - id: native_dialogs-EXP-001
//     content: >
//       Vị trí và chia tệp. Khối checkpoint ở đầu tệp chính
//       src/cross_cutting/native_dialogs/native_dialogs.ts, vì hạ tầng cắt ngang
//       không có Services (Giao thức 07). request_checks.ts là các hàm thuần,
//       không import Electron: senderRefusal (khung gửi có thuộc cửa sổ chính và có
//       origin bằng ui_origin không), argumentRefusal (đối số hợp lệ là {} hoặc
//       undefined), originOfUrl. native_dialogs.ts import dialog và ipcMain của
//       Electron; Main tiêm ui_origin, địa chỉ và tiêu đề (đọc từ desktop.json,
//       mục native_dialogs.pick_folder), hàm lấy cửa sổ chính và hàm log. Chỉ làm
//       lối vào pick_folder (dialog:pick-folder): trang sao lưu của chặng E chỉ cần
//       chọn thư mục đích; open_file (khôi phục, chặng F, chưa quyết) và save_file
//       (chưa ai cần) vẫn nằm trong hợp đồng, chưa hiện thực, và không có địa chỉ
//       ipc nào khác ngoài dialog:pick-folder (ca N2 khẳng định preload từ chối
//       dialog:open-file và dialog:save-file).
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
//
// UNSOLVED_PROBLEMS:
//   - id: native_dialogs-PROB-001
//     description: >
//       Phép cắn (b) của plan phiên 33 chưa chạy được: "bỏ danh sách địa chỉ được
//       phép trong preload thì ca địa chỉ lạ (N2) hỏng". Không phải lỗi mã: chưa
//       có số liệu cho phép cắn này.
//     attempts:
//       - attempt: 1
//         agent: coding-agent@2026-10-07#2
//         tried: >
//           Sửa tạm src/preload.ts để điều kiện kiểm danh sách địa chỉ luôn sai, rồi
//           chạy npm run build và npx playwright test tests/native_dialogs.spec.ts.
//         result: >
//           Lệnh chạy bị bộ phân loại quyền của Claude Code từ chối (lý do ghi
//           "Security Weaken": làm yếu danh sách địa chỉ của preload). Lệnh không chạy;
//           preload được khôi phục ngay về mã đúng (kiểm bằng Grep thấy lại điều kiện
//           !allowedAddresses.has(address)), và npm test cùng test:packaged sau đó
//           chạy trên mã đúng. Phép cắn (a) (bỏ kiểm origin, bỏ kiểm cửa sổ) đã chạy
//           được, xem EVIDENCE.
//     next_suggested: >
//       Project Owner quyết: cho phép chạy phép cắn (b) (sửa tạm preload, chạy ca N2
//       và P9, khôi phục) hoặc chạy tay. Số liệu mong đợi: ca N2 hỏng ở phần "spy
//       trong Main không nhận lời gọi nào" (spy nhận ["{}"]) và message không còn là
//       "ipc address not implemented". Sau đó xóa mục này, chuyển thành EXPERIENCE.
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
//       window)", hộp thoại không mở, cửa sổ chính vẫn gọi được. N2: sáu địa chỉ/giá trị
//       lạ (dialog:open-file, dialog:save-file, no:such:channel, '', 123, undefined) đều
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
//       path: null }; dialog:open-file bị từ chối "ipc address not implemented"; không
//       FATAL; đóng cửa sổ thoát mã 0).
//     recorded_at: 2026-10-07T15:33:24.1521449+07:00
//
// NOTES:
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
 * Only the entry pick_folder (dialog:pick-folder) is implemented; open_file
 * and save_file stay in the contract until a page needs them.
 *
 * The Main registers it before the window opens and passes in the window
 * (so the dialog is modal to it), the interface origin, the address and the
 * dialog title, and the log function.
 */

import { dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { argumentRefusal, senderRefusal } from './request_checks'

export interface NativeDialogsOptions {
  /** shared_values.ui_origin: the only origin whose frame may call. */
  uiOrigin: string
  pickFolder: { address: string; title: string }
  /** The Main's window; null once it is closed. */
  getMainWindow: () => BrowserWindow | null
  log: (message: string) => void
}

/** api_contract.yaml pick_folder, label 200. */
export interface PickFolderReply {
  status: 200
  body: { canceled: boolean; path: string | null }
}

export function registerNativeDialogs(options: NativeDialogsOptions): void {
  const { address, title } = options.pickFolder
  const refuse = (reason: string): never => {
    options.log(`native_dialogs: ${address} refused: ${reason}`)
    throw new Error(`${address}: call refused (${reason})`)
  }

  ipcMain.handle(address, async (event: IpcMainInvokeEvent, argument: unknown): Promise<PickFolderReply> => {
    const win = options.getMainWindow()
    const senderProblem = senderRefusal(
      { senderIsMainWindow: win !== null && event.sender === win.webContents, frameUrl: event.senderFrame?.url ?? null },
      options.uiOrigin,
    )
    if (senderProblem !== null || win === null) return refuse(senderProblem ?? 'there is no main window')
    const argumentProblem = argumentRefusal(argument)
    if (argumentProblem !== null) return refuse(argumentProblem)

    let result: Electron.OpenDialogReturnValue
    try {
      result = await dialog.showOpenDialog(win, { properties: ['openDirectory'], title })
    } catch (err) {
      // The contract has only label 200 for this entry: no label is invented.
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
