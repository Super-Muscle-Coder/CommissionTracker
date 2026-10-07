# Audit phiên 33 — desktop, lối vào `ipc` đầu tiên và `native_dialogs.pick_folder` (chặng E, phiên 2/3)

- Orchestrator, 2026-10-07.
- Plan: `.plan/desktop_plan.md` (phiên 33). Hợp đồng: Data Schema 9.0.3, API Contract 4.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-07 15:35 (chưa commit), đặt lên `HEAD = 44d7be5`.

## 1. Kết luận

**Đạt.** `invoke` trong bridge và `native_dialogs.pick_folder` làm đúng đặc tả đã chốt và đúng hợp đồng. DSK-19 xong đủ bốn mục. Mọi số liệu tôi chạy lại được trên Linux đều khớp báo cáo của agent.

**Phép cắn (b)**, phép mà bộ phân loại quyền chặn agent (`native_dialogs-PROB-001`), đã được **Orchestrator chạy trên bản sao**: bỏ danh sách địa chỉ trong preload thì N2 hỏng đúng như dự đoán (§3). Project Owner không cần cho phép gì thêm. Mục PROB vẫn nằm trong checkpoint, vì Orchestrator không sửa mã dự án. Phiên desktop kế tiếp chuyển nó thành EXPERIENCE (DSK-22).

Không đề xuất sửa hợp đồng. Không có việc nào phải làm trước khi commit.

## 2. Tệp thay đổi

| Tệp | Nội dung |
|---|---|
| `Desktop/src/cross_cutting/native_dialogs/native_dialogs.ts` (mới, 262 dòng) | `registerNativeDialogs`: một `ipcMain.handle`, kiểm khung gửi, kiểm đối số, `dialog.showOpenDialog(win, …)`. Khối checkpoint: 3 EXPERIENCES, 1 PROB, 5 EVIDENCE |
| `Desktop/src/cross_cutting/native_dialogs/request_checks.ts` (mới) | hàm thuần, không import Electron: `senderRefusal`, `argumentRefusal`, `originOfUrl` |
| `Desktop/src/preload.ts` | `invoke`; danh sách địa chỉ đọc từ `--ct-ipc-addresses=` |
| `Desktop/src/main.ts` | gọi `registerNativeDialogs` trước `new BrowserWindow`; đối số preload thứ ba; checkpoint: main-EXP-029 mới, main-EXP-030 (DSK-19), main-PROB-001 bỏ |
| `Desktop/configs/desktop.json` | `preload.arguments.ipc_addresses`; `native_dialogs.pick_folder` (địa chỉ, tiêu đề "Chọn thư mục") |
| `Desktop/src/cross_cutting/reminder_ticker/reminder_ticker.ts` | chỉ checkpoint (DSK-19 mục 3, một EVIDENCE cho mục 4) |
| `Desktop/tests/native_dialogs.spec.ts` (mới) | N1–N9 |
| `Desktop/tests/desktop_main.spec.ts` | ca 1: **đúng một** khẳng định đổi, kèm chú thích |
| `Desktop/tests/reminder_ticker.spec.ts` | ca D2 chờ `reminder check #1:` (DSK-19 mục 4) |
| `Desktop/tests/packaged/packaged_app.spec.ts` | P9 |
| `Desktop/tests/fixtures/probe/{index.html,probe.js}` | nút "Chọn thư mục" |

Không đụng `Backend/`, `UI/`, hay tệp nào ngoài `Desktop/`. Không cờ kiểm thử mới; `packaged.ignored_test_flags` không đổi. Số `eslint-disable` không đổi (1, có từ trước).

**Tệp sẽ vào commit (ENV-9):** `git check-ignore` với `core.ignorecase=true` không bỏ qua tệp mới nào.

## 3. Những gì đã tự chạy lại

**Linux**, Node 24, Xvfb với icewm, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`, `ELECTRON_DISABLE_SANDBOX=1`. Bản sao có ba chỗ sửa, cùng kiểu với audit phiên 30, vì công cụ đọc tiến trình dùng PowerShell và dòng `backend started (pid …)` bị mất trên Linux:
- `processTable()` của `helpers.ts`;
- `closeCleanly()` trong `reminder_ticker.spec.ts`;
- `closeCleanly()` riêng của `native_dialogs.spec.ts`.

Không khẳng định nào của các ca bị nới. Mỗi bản sửa thêm khẳng định cây tiến trình có backend.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint` | sạch | sạch (mã gốc) | khớp |
| `native_dialogs.spec.ts` | 9/9 | bản gốc: 8 đạt, N9 hỏng ở `afterAll` (`closeCleanly`, giới hạn Linux; khẳng định chính của N9 đạt). Bản sao: **9/9, ba lượt liên tiếp** | khớp |
| `reminder_ticker.spec.ts` (D2 mới) | 12/12 | **12/12, ba lượt liên tiếp** | khớp |
| `desktop_main` + `process_tree`, mã mới | 17/17 | 9 đạt, 8 hỏng. Ca 1 hỏng ở `backendTree` (dòng 112), **sau** khẳng định bridge mới | xem dòng dưới |
| Cùng bộ đó trên `HEAD` | — | 9 đạt, **đúng 8 ca đó hỏng** (1, 3, 4, 7, 8, 9, 11, 12), như audit phiên 30 | không hồi quy |
| UI `npm run e2e` với Desktop mới | 70/70 | **70/70 ×2**; `UI/evidence` (120 tệp) giống hệt trước và sau | khớp |
| Checkpoint `native_dialogs` | YAML hợp lệ | 3 EXPERIENCES, 5 EVIDENCE, `UNSOLVED_PROBLEMS: [native_dialogs-PROB-001]`, 1 NOTE | đạt |
| Checkpoint Main | YAML hợp lệ | 30 EXPERIENCES (029, 030 mới), không trùng id, 29 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt |
| Checkpoint `reminder_ticker` | YAML hợp lệ | 3 EXPERIENCES, 4 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt |
| Giờ (BE-8) | `15:33:24.1521449` | `native_dialogs.ts` ghi lúc 15:34:10, `reminder_ticker.ts` 15:34:22, `main.ts` 15:35:51 | đúng quy ước |

**Phép cắn**, trên bản sao; mỗi phép chỉ chạy `native_dialogs.spec.ts`:

| Phép cắn | Ai chạy | Kết quả |
|---|---|---|
| (a1) bỏ kiểm origin | agent | N1, N7 hỏng |
| (a2) bỏ kiểm cửa sổ gửi | agent | N8 hỏng |
| **(b) bỏ danh sách địa chỉ trong preload** (điều kiện luôn sai) | **Orchestrator** (agent bị chặn) | **N2 hỏng** ở địa chỉ đầu tiên `dialog:open-file`: lời gọi tới được spy trong Main và nhận `{ok: true, value: {status: 200, …}}` thay vì bị từ chối "ipc address not implemented". 1 hỏng, 7 không chạy (chế độ serial), 1 đạt. Đúng dự đoán của agent ở `next_suggested` |
| (c) `argumentRefusal` luôn chấp nhận | Orchestrator | N1, N5 hỏng |
| (d) gọi hộp thoại không có cửa sổ cha | Orchestrator | N3 hỏng |
| (e) bỏ `title` khỏi `options` | Orchestrator | N3 hỏng |
| (g) đăng ký trình xử lý **sau** lần nạp đầu của cửa sổ | Orchestrator | **0 ca hỏng**, xem §5.2 |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: `npm test` 40 ×3, `npm run dist` từ trạng thái sạch, `test:packaged` 9/9 (có P9), mốc `%APPDATA%` 69 dòng và 0 khác biệt, hộp thoại thật do Project Owner xác nhận.

## 4. Đối chiếu với plan và hợp đồng

**Khớp hợp đồng:**
- `endpoint_forms.ipc`: renderer gọi `invoke(address, argument)`; preload chuyển sang `ipcRenderer.invoke`; renderer không có `ipcRenderer` (N9 kiểm cả `ipcRenderer`, `electron`, `require`, `process`).
- Trả `{status, body}`.
- Bridge đóng băng, đúng hai khóa `backendBaseUrl` và `invoke`, không gì khác (ca 1, N9, P9).
- `pick_folder`: địa chỉ `dialog:pick-folder`; không đầu vào; chỉ nhãn 200 `{canceled, path|null}`. Không bịa nhãn 400 hay 500: lỗi thành Promise bị từ chối.
- `native_dialogs` chỉ trình bày: không gọi workflow, không giữ gì, không nhớ thư mục lần trước.

**Khớp plan:**
- việc 2 đo trước khi viết: `dialog.showOpenDialog` gán đè được, nên không cần cờ mới;
- đăng ký trước khi tạo cửa sổ;
- kiểm khung gửi: cửa sổ chính, và origin bằng `ui_origin`;
- đối số `{}` hoặc `undefined`;
- cửa sổ cha là cửa sổ chính, nên hộp thoại là modal;
- tiêu đề lấy từ config;
- mỗi lời gọi một dòng log;
- ca 1 chỉ đổi một khẳng định;
- nút trên trang thử;
- P9 trên bản đóng gói;
- chỉ `pick_folder`.

**DSK-19, đủ bốn mục:**
1. `main-PROB-001` của phiên 30 thành `main-EXP-030`, có nguồn đã được Project Owner xác nhận.
2. Định danh: dùng nhánh thứ hai mà DSK-19 cho phép, tức EXPERIENCE mới với `derived_from: main-PROB-002`. Id `main-PROB-001` của phiên 26 vẫn chỉ được `main-EXP-019` trỏ tới.
3. `reminder_ticker-EXP-003`: "lead không nguyên", kèm lý do.
4. D2 chờ `reminder check #1:`.

**EVIDENCE của phiên 30 bị thay bằng số của phiên 33:** đúng Giao thức 07, mục EVIDENCE ("chỉ giữ bằng chứng mới nhất cho mỗi khẳng định: khi chạy lại, ghi đè mục cũ cùng khẳng định"). Không phải lỗi.

**Agent tự quyết, chấp nhận:**
1. **Danh sách địa chỉ đi qua đối số dòng lệnh**, như hai giá trị cũ, vì preload chạy sandbox nên không đọc được config. Có hai bản tên đối số (config và hằng số trong preload), cùng kiểu với hai đối số cũ, có chú thích "phải trùng".
2. **Hai khung lạ dựng bằng `app.evaluate`:** trang `data:` trong chính cửa sổ chính, và cửa sổ thứ hai có cùng preload. Mỗi ca chỉ phạm một điều kiện, nên phép cắn (a1) và (a2) phân biệt được.
3. **`closeCleanly` viết lại trong `native_dialogs.spec.ts`**, thay vì dùng bản có sẵn ở `helpers.ts`. Trùng lặp nhỏ ở mã kiểm thử, không ảnh hưởng gì. Không mở mục riêng.

## 5. Phát hiện

### 5.1 Bộ phân loại quyền của Claude Code chặn phép cắn làm yếu một lớp bảo vệ (quy trình)

Đây là lần đầu một phép cắn bị chặn. Agent làm đúng: không tìm đường vòng, khôi phục mã ngay, ghi PROB, và nêu sẵn số liệu mong đợi.

**Từ nay:** plan nào có phép cắn gỡ một lớp bảo vệ (danh sách cho phép, kiểm origin, kiểm quyền) thì ghi rõ hai nhánh. Agent thử chạy; nếu bị chặn thì ghi lại rồi đi tiếp, không coi là hỏng tiêu chí; Orchestrator chạy phép cắn đó trong audit.

Phép cắn (a1) và (a2) cũng gỡ lớp bảo vệ nhưng không bị chặn, nên không đoán trước được bộ phân loại sẽ chặn phép nào.

### 5.2 Thứ tự "đăng ký trước khi mở cửa sổ" không có kiểm thử giữ (thấp)

Phép cắn (g): dời `registerNativeDialogs` xuống sau lần nạp đầu, vậy mà 9/9 vẫn đạt, vì mọi ca đều gọi `invoke` sau khi trang đã nạp xong.

Đọc mã thì thấy thứ tự đúng (`main.ts`: đăng ký, rồi `new BrowserWindow`), và main-EXP-029 có ghi.

Rủi ro thực tế hiện nay là không có: trang sao lưu chỉ gọi `pick_folder` khi người dùng bấm. Dù vậy, plan ghi thứ tự này là yêu cầu, nên ghi vào DSK-22 phần (b): khi có phiên desktop chạm lại, thêm một ca gọi `invoke` ngay lúc trang thử nạp. Không cần làm riêng.

### 5.3 Tiêu đề hộp thoại chưa được nhìn bằng mắt (thấp)

Tiêu chí 4 của plan có "tiêu đề tiếng Việt". Project Owner xác nhận modal, chọn và hủy, nhưng không nhắc tiêu đề. N3 khẳng định Main truyền `title: 'Chọn thư mục'` cho Electron; việc Windows hiển thị chuỗi đó là việc của Electron.

Không chặn audit. Project Owner nhìn tiêu đề trong lần chạy tay kịch bản bấm thử của trang sao lưu (phiên 34); Orchestrator đưa bước này vào plan phiên 34.

### 5.4 `argumentRefusal` chấp nhận mọi đối tượng không có khóa riêng (ghi nhận)

Một `Date` hay `Map` rỗng, đi qua structured clone, có `Object.keys` rỗng nên được chấp nhận như `{}`. Vô hại: lối vào này không đọc đối số. Không mở mục.

### 5.5 `npm run dist` lần đầu hỏng EXDEV trong sandbox của agent (ghi nhận)

Lỗi này đã gặp ở phiên 14, 26 và 30. Theo báo cáo, electron-builder đã dọn hai gói NSIS và 7zip trong `%LOCALAPPDATA%\electron-builder\Cache` trước khi hỏng. Vì vậy lần `npm run dist` kế tiếp của Project Owner sẽ tải lại hai gói đó: chậm hơn một chút, không phải lỗi.

## 6. Đề xuất sửa hợp đồng

Không có. `native_dialogs` là hạ tầng cắt ngang, không có `status` trong hợp đồng. `open_file` và `save_file` vẫn chưa hiện thực, và hợp đồng không đòi phải có ngay.

## 7. Việc tồn đọng

- **Đóng:** DSK-19 (2026-10-07, phiên 33).
- **Mới:** DSK-22 (thấp):
  - (a) chuyển `native_dialogs-PROB-001` thành EXPERIENCE, kèm số của phép cắn (b) mà Orchestrator đã chạy;
  - (b) một ca giữ thứ tự đăng ký (§5.2).

  Làm khi có phiên desktop kế tiếp; không mở phiên riêng.
- **Chặng E:** phiên 2/3 xong. Tiếp theo là phiên giao diện: làm lại I1 cho sao lưu, rồi trang sao lưu gọi `pick_folder` qua `invoke` và `create_backup`.
