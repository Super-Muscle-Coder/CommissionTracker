# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-07T15:00:00+07:00
# contract: data_schema 9.0.3, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 33 của dự án, phiên desktop thứ sáu, và là phiên 2/3 của **chặng E** (`.plan/v1_roadmap.md`). Hai việc gắn liền nhau:

| Việc | Căn cứ |
|---|---|
| **Lối vào `ipc` đầu tiên:** thêm hàm `invoke` vào đối tượng bridge mà preload phơi cho renderer | Data Schema `clause_a_common.mandatory_rules` (bridge, `invoke` "once at least one ipc entry is implemented"); API Contract 4.0.0 `endpoint_forms.ipc` |
| **Thành phần cắt ngang `native_dialogs`, chỉ lối vào `pick_folder`** (`dialog:pick-folder`) | API Contract `clause_a_common.cross_cutting.native_dialogs` |

**Chỉ làm `pick_folder`.** Trang sao lưu của chặng E chỉ cần chọn thư mục đích. `open_file` (cho khôi phục, chặng F, chưa quyết) và `save_file` (chưa ai cần) để dành tới khi có trang dùng chúng: dạng đơn giản nhất mà chạy đúng (ưu tiên 2 của V1). Hai lối vào đó vẫn nằm trong hợp đồng, chưa hiện thực.

**Điểm dừng:**
- giao diện gọi được `window.commissionTracker.invoke('dialog:pick-folder', {})` và nhận `{ status: 200, body: { canceled, path } }` đúng hợp đồng;
- có kiểm thử tự động, không cần người bấm hộp thoại;
- Project Owner thấy hộp thoại thật, chọn và hủy được;
- Desktop, bản đóng gói và e2e của giao diện vẫn đạt.

Không có trang giao diện ở phiên này; trang sao lưu là phiên 3/3 của chặng E.

## ĐẶC TẢ ĐÃ CHỐT

Căn cứ: API Contract 4.0.0, `endpoint_forms.ipc` (nguyên văn ở mục "Ràng buộc"); `cross_cutting.native_dialogs`; Data Schema 9.0.3 `clause_a_common.mandatory_rules` và `shared_values.renderer_bridge`; lý thuyết WCA §5 (lối vào của hạ tầng cắt ngang chỉ để trình bày).

### Bridge và `invoke` (preload)

- Đối tượng `window.commissionTracker` vẫn **đóng băng**, và có **đúng hai** thuộc tính: `backendBaseUrl` (như cũ) và `invoke`. Không thêm gì khác.
- `invoke(address, argument)` trả về một Promise. Preload chuyển lời gọi sang `ipcRenderer.invoke(address, argument)`. Renderer không bao giờ chạm `ipcRenderer`.
- **Chỉ các địa chỉ đã hiện thực** mới được chuyển. Danh sách địa chỉ do Main trao cho preload qua `webPreferences.additionalArguments`, như hai giá trị đang có, vì preload chạy sandbox không đọc được `desktop.json`. Phiên này danh sách chỉ có `dialog:pick-folder`.
- Địa chỉ lạ: Promise bị từ chối (lỗi lập trình của bên gọi), không gửi gì sang Main. Đây không phải một nhãn kết quả của hợp đồng.
- Tên đối số dòng lệnh mới nằm trong `desktop.json` (`preload.arguments`), như `bridge_name` và `backend_base_url`.

### `native_dialogs`, lối vào `pick_folder`

- **Vị trí:** `Desktop/src/cross_cutting/native_dialogs/` (`CLAUDE.md` mục 4). Không có năm lớp. Không gọi workflow nào, không giữ gì (hợp đồng: "Presentation only: calls no workflow and keeps nothing").
- **Ráp nối:** Main đăng ký trình xử lý `ipc` **trước khi mở cửa sổ** (`.design/03_classification.md`, bảng hạ tầng cắt ngang). Main trao cho `native_dialogs` cửa sổ chính (để hộp thoại là modal của nó) và chữ hiển thị đọc từ config.
- **Chỉ nhận lời gọi từ đúng renderer:** khung gửi phải thuộc cửa sổ chính, và URL của khung có origin bằng `shared_values.ui_origin` (`app://commission-tracker`). Khác thì từ chối (ném lỗi, Promise phía renderer bị từ chối) và ghi log; không mở hộp thoại.
- **Đầu vào:** hợp đồng ghi `input: none`, và `endpoint_forms.ipc` nói đối số là một object có khóa là tên các đầu vào. Vậy đối số hợp lệ là `{}`. Nhận thêm `undefined`, vì lời gọi không đối số là cùng một ý. Mọi giá trị khác thì từ chối như trên: hợp đồng không có nhãn 400 cho lối vào này.
- **Hộp thoại:** `dialog.showOpenDialog(<cửa sổ chính>, { properties: ['openDirectory'], title: <chữ trong config> })`. Tiêu đề tiếng Việt, ví dụ "Chọn thư mục", đặt trong `desktop.json`.
  - Không có thư mục mặc định: hợp đồng không có đầu vào cho việc đó.
  - Không nhớ thư mục lần trước: "keeps nothing".
- **Trả lời:** luôn `{ status: 200, body: { canceled, path } }`.
  - Hủy: `{ canceled: true, path: null }`.
  - Chọn: `{ canceled: false, path: <đường dẫn tuyệt đối> }` (`formats.file_path`).
- **Lỗi bất ngờ của hộp thoại** (Electron ném lỗi): hợp đồng chỉ có nhãn 200, nên không bịa nhãn. Ghi log, rồi để Promise phía renderer bị từ chối. Giao diện xử lý như một lỗi hệ thống.
- **Log**, kiểm được không cần mắt người: mỗi lời gọi một dòng có địa chỉ và kết quả. Kết quả là đã hủy, hoặc đã chọn kèm đường dẫn: đường dẫn là của chính họa sĩ, ghi được vào log cục bộ.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 4 (bố cục `Desktop/`), mục 5 (Desktop, cờ kiểm thử, đóng gói), mục 6;
   - lý thuyết WCA §5 (lối vào của hạ tầng cắt ngang); `05-edge-cases.md`, checklist (dòng về `entries`); `07-checkpoint-protocol.md`;
   - `.design/03_classification.md`: bảng hạ tầng cắt ngang;
   - hợp đồng:
     - `api_contract.yaml`: `endpoint_forms.ipc`, `cross_cutting.native_dialogs` (ba lối vào; phiên này làm một);
     - `data_schema.yaml`: `clause_a_common.mandatory_rules` (câu về renderer và bridge), `shared_values.ui_origin`, `shared_values.renderer_bridge`, `formats.file_path`;
   - code:
     - `Desktop/src/preload.ts`;
     - `Desktop/src/main.ts`: khối checkpoint, phần tạo `BrowserWindow` (`additionalArguments`), `reminder_ticker` làm mẫu ráp một thành phần cắt ngang;
     - `Desktop/configs/desktop.json`;
     - `Desktop/tests/desktop_main.spec.ts` (ca 1 khẳng định bridge), `tests/fixtures/probe/`, `tests/probe.cjs`, `tests/helpers.ts`, `tests/packaged/packaged_app.spec.ts`;
     - khối checkpoint của `src/cross_cutting/reminder_ticker/reminder_ticker.ts`, làm mẫu checkpoint cho thành phần cắt ngang;
   - `.plan/open_issues.md`: DSK-16 (`test:packaged`), BE-8 (giờ trong checkpoint);
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.3`** và API Contract **`4.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron; trạng thái AVG và ReasonLabs theo lời Project Owner.
   - Trong `Desktop/`: `npm ci`; `npm run lint`; `npm test`: mốc **31 đạt**.
   - Trong `UI/`: `npm run build`.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **Đo trước khi viết kiểm thử:** kiểm thử tự động có thay được hộp thoại thật mà không cần cờ mới không.
   - **Orchestrator không nắm chắc** điều này, nên đo. Trong kiểm thử Playwright chế độ Electron, có thể gọi `app.evaluate(({ dialog }) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [...] }) })` để thay hàm hộp thoại trong Main, nếu Main gọi `dialog.showOpenDialog` qua đối tượng module lúc chạy.
   - Nếu được: dùng cách này, không thêm cờ kiểm thử.
   - Nếu không: thêm một cờ chỉ cho bản chạy từ mã nguồn, ví dụ `--ct-test-pick-folder-answer=<đường dẫn|cancel>`, vào `test_flags` **và** `packaged.ignored_test_flags`. Ghi lý do vào checkpoint.

3. **Preload và bridge** theo đặc tả.
   - Ca 1 của `desktop_main.spec.ts` đang khẳng định `invoke` là `undefined` và bridge chỉ có khóa `backendBaseUrl`. Hợp đồng nói `invoke` có mặt từ lối vào `ipc` đầu tiên, nên **sửa đúng khẳng định đó**: hai khóa, `invoke` là `function`, vẫn đóng băng, vẫn không có `require` hay `process`. Ghi trong báo cáo: tên ca, dòng cũ, dòng mới, lý do. Đây là khẳng định cũ **duy nhất** được sửa.
   - Kiểm thử mới: địa chỉ lạ thì Promise bị từ chối và Main không nhận lời gọi nào.

4. **`native_dialogs.pick_folder`** theo đặc tả.
   - **Kiểm thử tự động**, chạy ứng dụng thật với `--ct-test-data-dir` và `--ct-test-no-dialog`, gọi từ trang thử qua `invoke`:
     - chọn: `{ status: 200, body: { canceled: false, path } }`, với đường dẫn tuyệt đối do hộp thoại giả trả;
     - hủy: `{ status: 200, body: { canceled: true, path: null } }`;
     - đối số `{}` và không đối số: đều mở hộp thoại; đối số `{ x: 1 }`, `'abc'`, `null`: từ chối, hộp thoại không mở;
     - hộp thoại ném lỗi: Promise bị từ chối, có dòng log, ứng dụng vẫn chạy;
     - hộp thoại được mở với cửa sổ chính làm cha (đọc từ hàm giả: đối số đầu là cửa sổ chính);
     - lời gọi từ một khung không phải `ui_origin` bị từ chối. Agent tìm cách dựng ca này trong Electron và ghi rõ cách dựng. Nếu không dựng được một cách đáng tin, dừng ca đó, ghi lý do trong checkpoint, và chứng minh bằng phép cắn trên hàm kiểm origin (hàm thuần, kiểm riêng).
   - **Phép cắn:** ít nhất hai, ghi số liệu, rồi khôi phục:
     - (a) bỏ kiểm origin hay kiểm cửa sổ gửi: ca tương ứng hỏng;
     - (b) bỏ danh sách địa chỉ được phép trong preload: ca địa chỉ lạ hỏng.
   - **Trang thử cho Project Owner:** thêm vào `tests/fixtures/probe/` một nút "Chọn thư mục" gọi `invoke('dialog:pick-folder', {})` và hiện câu trả lời. Ca 1 phải vẫn đọc được trang này.

5. **Hộp thoại thật**, Project Owner xem bằng mắt: `npm run probe`, bấm "Chọn thư mục".
   - Hộp thoại chọn thư mục của Windows hiện ra, tiêu đề tiếng Việt, gắn với cửa sổ ứng dụng (không bấm được cửa sổ phía sau khi hộp thoại đang mở).
   - Chọn một thư mục: trang hiện đúng đường dẫn. Bấm Hủy: trang hiện `canceled: true`.
   - Ghi câu trả lời của Project Owner vào EVIDENCE. Chụp ảnh hộp thoại nếu được, đặt ở `Desktop/evidence/native_dialogs/`.

6. **Checkpoint** (Giao thức 07):
   - `native_dialogs`: khối riêng ở đầu tệp chính của `src/cross_cutting/native_dialogs/`, giống `reminder_ticker`. Gồm EXPERIENCES (kết quả đo ở việc 2, cách kiểm origin, vì sao chỉ làm `pick_folder`), EVIDENCE, `UNSOLVED_PROBLEMS`.
   - Main (`src/main.ts`): EXPERIENCE về `invoke` trong bridge và về việc ráp `native_dialogs`.
   - **Giờ ghi:** chép **nguyên** giá trị `Get-Date -Format o` lấy ngay trước khi ghi; không làm tròn (BE-8).

7. **Chạy toàn bộ**, với AVG và ReasonLabs bật:
   - `Desktop`:
     - `npm run lint`;
     - `npm test` đạt đủ, **3 lần liên tiếp**;
     - xóa `packaging\stage` và `release`, rồi `npm run dist` (đặt `ELECTRON_BUILDER_CACHE` vào thư mục tạm như các phiên trước nếu gặp `EXDEV`);
     - `npm run test:packaged` đạt (8), cộng một ca mới trên bản đóng gói: bridge có `invoke`, và `dialog:pick-folder` trả lời đúng với hộp thoại giả. Preload đổi, nên đây là bắt buộc theo DSK-16.
   - `UI`: `npm run e2e`, không đặt `CT_WALKTHROUGH_RUNNER`, **1 lượt**, 70/70. Giao diện chưa dùng `invoke`, nhưng bridge đã đổi hình dạng. Sau đó `git status --short UI/evidence` trống.
   - Chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-19** (dọn checkpoint phiên 30: `main-PROB-001` thành EXPERIENCE và đổi định danh, câu `lead` của `reminder_ticker-EXP-003`, ca D2 chờ `reminder check #1:`): **làm luôn trong phiên này**, vì phiên chạm khối checkpoint Main. Project Owner đã xác nhận nguồn của `main-PROB-001` là bản cài lỗi. Chi tiết ở `.plan/open_issues.md`, DSK-19.
- **DSK-9, DSK-11, DSK-20, DSK-21:** không làm.
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `endpoint_forms.ipc`, nguyên văn: *"An Electron IPC channel handled in the desktop main process. The renderer invokes it as invoke(address, argument) on the renderer bridge (data_schema.yaml shared_values.renderer_bridge); the desktop preload script relays the call to ipcRenderer.invoke, and the renderer has no direct access to ipcRenderer. address is the channel name. The single argument is an object whose keys are the input names. The reply is object { status: integer (the result label), body: the referenced output or error_body }."*
- `pick_folder`: `form: ipc`, `address: "dialog:pick-folder"`, `called_by: [external]`, `input: none`, output `200: { type: "object { canceled: boolean, path: file_path|null }" }`.
- Bridge: một đối tượng đóng băng, `backendBaseUrl` và, khi có lối vào `ipc` đầu tiên, `invoke`, **và không gì khác**. Không đưa cho renderer giá trị nào khác.
- `native_dialogs` chỉ để trình bày: không gọi workflow nào, không giữ gì. Đường dẫn chọn được sau đó đi vào workflow như đầu vào `end_user`, qua điểm giao tiếp của chính workflow đó (phiên giao diện sau). Phiên này không gọi `POST /backups`.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Không làm `open_file`, `save_file`. Không thêm địa chỉ `ipc` nào ngoài `dialog:pick-folder`.
- Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus. Không thêm ngoại lệ cho `powershell.exe`. Không sửa registry, không cài bộ cài.
- Không đổi chữ dòng log `FATAL:`, cách dừng hay thứ tự khởi động backend, hay hành vi của `reminder_ticker`.
- Không tăng thời gian chờ sẵn có. Không `retries`, không `skip`. Không tắt luật lint, không thêm `eslint-disable`, không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- ⚠ Ràng buộc V1: không màn hình hồ sơ quyền sở hữu. Phiên này không làm giao diện.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. Kết quả đo ở việc 2 và cách thay hộp thoại đã chọn, có ghi trong checkpoint.
2. Bridge đóng băng có đúng `backendBaseUrl` và `invoke`; địa chỉ lạ bị từ chối; ca 1 sửa đúng một khẳng định.
3. `pick_folder` đúng đặc tả: các ca ở việc 4, hai phép cắn, nút trên trang thử.
4. Project Owner xác nhận hộp thoại thật: modal, tiêu đề tiếng Việt, chọn và hủy đúng.
5. `npm run lint`; `npm test` 3 lần liên tiếp đạt; `npm run dist` từ trạng thái sạch; `npm run test:packaged` đạt, có ca mới; UI e2e 70/70, `UI/evidence` không đổi.
6. DSK-19 xong.
7. Mọi lần chụp mốc `%APPDATA%` giống nhau.
8. Checkpoint `native_dialogs`, Main và `reminder_ticker` (nếu chạm vì DSK-19): YAML hợp lệ; giờ đúng BE-8.
9. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo.
10. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - kết quả đo ở việc 2;
    - bảng ca kiểm thử;
    - hai phép cắn;
    - câu trả lời của Project Owner về hộp thoại thật;
    - các lệnh để chạy lại;
    - danh sách ngoại lệ lint mới, nếu có.
