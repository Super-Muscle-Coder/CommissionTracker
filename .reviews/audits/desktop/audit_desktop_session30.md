# Audit phiên 30 — desktop (DSK-17 `reminder_ticker`, DSK-18 cờ `--ct-test-show-inactive`)

- Orchestrator, 2026-10-05.
- Plan: `.plan/desktop_plan.md` (phiên 30). Hợp đồng: Data Schema 9.0.2, API Contract 4.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-05 13:40 (chưa commit), đặt lên `HEAD = e1b9915`.

## 1. Kết luận

**Đạt.** Cả hai mục làm đúng đặc tả đã chốt. Phần chạy lại được trên Linux khớp báo cáo. Ba phép cắn của agent tái lập được.

Một điểm còn chờ Project Owner trả lời: `main-PROB-001` (§5.1). Thư mục dữ liệu thật không đổi. Thứ đổi là hồ sơ Chromium mang tên `Commission Tracker`, nhiều khả năng do bản đã cài mà Project Owner tự mở. Câu trả lời của Project Owner không đổi kết luận về mã, chỉ quyết định cách ghi mục này.

Ba lỗi nhỏ ở checkpoint và kiểm thử (§5.2 tới §5.4) đưa vào DSK-19, cho phiên desktop sau. Không mục nào chặn commit.

## 2. Tệp thay đổi

| Tệp | Thay đổi |
|---|---|
| `configs/desktop.json` | `app.app_user_model_id`; khối `reminder_ticker` (nhịp 60 000 ms, hạn chờ 10 000 ms, chữ thông báo); hai cờ mới trong `test_flags` và `packaged.ignored_test_flags` |
| `electron-builder.yml` | thêm `dist/cross_cutting/**/*.js` vào `files` (§5.5) |
| `src/main.ts` | ráp ticker; `bringWindowToFront()` dùng chung với second-instance; `showWindowsToast`; AUMID chỉ cho bản đóng gói; cờ DSK-18; checkpoint main-EXP-024 tới 028, main-PROB-001, 7 EVIDENCE |
| `src/cross_cutting/reminder_ticker/reminder_ticker.ts` | mới: ticker, không import Electron; khối checkpoint của thành phần |
| `src/cross_cutting/reminder_ticker/toast_text.ts` | mới: hàm thuần, kiểm hình dạng tối thiểu và dựng chữ |
| `tests/reminder_ticker.spec.ts` | mới: 12 ca (A1–A4, B1–B2, C1–C4, D1–D2) |
| `tests/show_inactive.spec.ts` | mới: ca 15, 16 |
| `tests/helpers.ts` | tham số cho hai cờ mới, `extraEnv` cho `launchMain`, lớp `ForegroundHolder` |
| `tests/packaged/packaged_app.spec.ts` | P7, P8 |
| `tests/fixtures/fake_backend_reminders.py`, `tests/fixtures/foreground_holder.ps1` | mới |
| `tests/tools/toast_probe_main.cjs`, `tests/tools/toast_demo.cjs` | mới: công cụ đo và demo cho Project Owner |

Ngoài ba tệp đổi không có trong bảng (`package.json`, `.gitignore`, `desktop_main.spec.ts`), mọi tệp khác giống hệt `HEAD`. Không đổi preload, bridge, cách dừng backend hay thứ tự khởi động. Không có `eslint-disable` mới; dòng duy nhất trong `helpers.ts` đã có từ trước.

## 3. Những gì đã tự chạy lại

**Môi trường:** Linux, Node 24, Xvfb với icewm, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`.

Trên Linux, hai thứ của bộ kiểm thử không chạy được nguyên dạng:
- các hàm đọc tiến trình trong `helpers.ts` dùng PowerShell;
- dòng log `backend started (pid …)` bị mất, vì Main khởi động nhanh hơn lúc Playwright gắn stderr (main-EXP-014).

Vì vậy Orchestrator chạy trên **một bản sao**, sửa hai chỗ:
- `processTable()` đọc `/proc`;
- `closeCleanly()` lấy PID Main bằng `app.evaluate`, rồi thêm khẳng định cây tiến trình có backend.

Không khẳng định nào của các ca bị nới.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint`, `tsc` | sạch | sạch | khớp |
| `reminder_ticker.spec.ts` | 12/12 | bản gốc: 6 đạt, 6 hỏng, đều ở `closeCleanly` sau khi khẳng định chính đã đạt (giới hạn Linux ở trên). Bản sao: **12/12, ba lượt liên tiếp** | khớp |
| C3, không chồng lời gọi | `[1,1,1]` | `[1,1,1]` cả ba lượt | khớp |
| D2, lần kiểm đầu chạy ngay | toast sau 2056 ms, nhịp 600 000 ms | 575–600 ms | khớp |
| B2, `stop()` khi đang gọi | 1 ms | 0–1 ms, không toast | khớp |
| Phép cắn (a): bỏ `this.tick()` đầu | D2 hỏng | D2 hỏng ("not seen within 20000 ms") | tái lập |
| Phép cắn (b): bỏ chặn chồng lời gọi | C3 hỏng `[1,2,3,4,5,5,5]` | C3 hỏng `[1,2,3,4,5,6,5]` | tái lập |
| Phép cắn (c): bỏ `await reminderTicker?.stop()` | C4 hỏng | C4 hỏng (`findIndex` −1) | tái lập |
| Phép cắn (d) của Orchestrator: bỏ `if (this.stopped) return` sau `response.text()` | — | B2 vẫn đạt, vì `abort()` làm `fetch` ném lỗi và nhánh `catch` cũng có chặn. Hai lớp chặn, không phải lỗi | ghi nhận |
| DSK-18, thăm dò riêng: 3 lượt mỗi phía | ca 15: 5/5 `focused:false` | có cờ: 3/3 `visible:true, focused:false`, có dòng `ready-to-show`. Không cờ: 3/3 `focused:true`, không có dòng đó | khớp phần tất định |
| `show_inactive.spec.ts` | 2/2 | không chạy được trên Linux (cần PowerShell) | dựa vào số đo của agent và thăm dò trên |
| `desktop_main.spec.ts` + `process_tree.spec.ts`, mã mới | 17/17 | 9 đạt, 8 hỏng | xem dòng dưới |
| Cùng bộ đó trên **`HEAD`** (mã trước phiên) | — | 9 đạt, **đúng 8 ca đó hỏng** | không hồi quy |
| UI `npm run e2e` với Main mới | 70/70 ×3 | **70/70 ×2**, `UI/evidence` (120 tệp) giống hệt trước và sau | khớp |
| Checkpoint Main | YAML hợp lệ | parse lại: 28 EXPERIENCES, không trùng id, 29 EVIDENCE, `UNSOLVED_PROBLEMS: [main-PROB-001]` | đạt; xem §5.2 |
| Checkpoint `reminder_ticker` | YAML hợp lệ | 3 EXPERIENCES, 3 EVIDENCE, `UNSOLVED_PROBLEMS: []`; `component: cross_cutting` hợp lệ theo Giao thức 07; đặt ở đầu tệp chính | đạt; xem §5.3 |
| Giờ trong checkpoint (BE-8) | `11:16:31.47` | `main.ts` ghi lúc 11:17:57, `reminder_ticker.ts` lúc 11:18:21 | đúng quy ước |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: `npm run dist`, `test:packaged` (P1–P8), các phép đo thông báo thật, `show_inactive.spec.ts`.

## 4. Đối chiếu với plan và hợp đồng

**Khớp hợp đồng** (`cross_cutting.reminder_ticker`, `send_reminder.check_due`):
- Ticker chỉ gọi `POST /reminders/checks`. Không gọi `GET /reminders/pending`, không gọi `ack`: D1 khẳng định nhắc việc vẫn nằm trong danh sách chờ.
- Không lọc, không sắp lại; mỗi phần tử trả về là một toast, đúng thứ tự.
- Main khởi động ticker sau READY và sau lần nạp đầu, kể cả khi lần nạp đó bị `ERR_ABORTED`; bỏ qua nếu shutdown đã bắt đầu.
- Bấm toast chỉ đưa cửa sổ lên trước.
- Kiểm hình dạng chỉ ở mức cần để dựng chữ, không kiểm lại luật nghiệp vụ.
- Chữ thông báo cùng lời với `UI/src/logic/workflows/send_reminder/configs.ts`: bỏ phần "đến hạn lúc", giữ đúng phần còn lại.

**Khớp plan:**
- nhịp và hạn chờ nằm trong config;
- không chồng lời gọi;
- lỗi chỉ ghi log rồi thử lại, ứng dụng không dừng;
- phần tử sai hình dạng bị bỏ riêng;
- dừng trước backend ở mọi đường thoát, vì mọi đường đều đi qua `shutdown()`, kể cả `fatal()`;
- mỗi toast một dòng log;
- hai cờ chỉ cho bản chạy từ mã nguồn, bản đóng gói bỏ qua (P7);
- Project Owner xác nhận bằng mắt.

**Một quyết định khác plan, chấp nhận được:** AUMID chỉ đặt khi chạy bản đóng gói.
- Plan viết "nếu cần AUMID thì lấy từ config, khớp `appId`, có kiểm thử". Agent đã làm đủ phần đó (A4), nhưng chỉ bật ở bản đóng gói.
- Căn cứ là số đo: từ mã nguồn, AUMID mặc định của Electron cho toast hiện; còn một AUMID không có lối tắt nào đăng ký thì toast **vô hình**, dù sự kiện `show` vẫn bắn.
- Phát hiện "`show` không chứng minh toast hiện" có giá trị: nó cho thấy mọi khẳng định dựa vào `show` (P8) chỉ là số đo, không phải bằng chứng toast hiện thật.

**Plan nói "chụp ảnh thông báo nếu được":** không có ảnh. Việc này không bắt buộc, và Project Owner đã xác nhận bằng mắt.

## 5. Phát hiện

### 5.1 `main-PROB-001`: hồ sơ Chromium `%APPDATA%\Commission Tracker` đổi trong phiên (chờ Project Owner)

Thư mục dữ liệu thật `%APPDATA%\CommissionTracker` (`data.db`, `.lock`) giống hệt mốc đầu phiên: cùng kích thước, thời điểm ghi và SHA-256. Thư mục `Commission Tracker` (có dấu cách, là hồ sơ Chromium mặc định theo `productName`) đổi 49 dòng. Lần ghi mới nhất là 21:05 ngày 4/10 và 10:45 ngày 5/10.

Agent làm ba thí nghiệm có kiểm soát (từ mã nguồn; bản đóng gói qua `_electron.launch`; bản đóng gói qua `spawn`), cả ba đều 0 dòng đổi.

Đánh giá của Orchestrator: nguồn gần như chắc là bản đã cài, mở không kèm `--ct-test-data-dir`.
- Bộ cài build lúc 20:58 ngày 4/10 thiếu `dist/cross_cutting` (§5.5), nên Main ném lỗi ngay khi nạp module.
- Lúc đó chưa có `setPath('userData')`, nên Chromium tạo hồ sơ ở thư mục mặc định.
- Backend chưa chạy, nên `data.db` không đổi. Khớp với số đo.

Cần Project Owner xác nhận hai thời điểm đó. Nếu đúng, đây là dùng thật chứ không phải kiểm thử, và không vi phạm ràng buộc "không kiểm thử nào đụng thư mục dữ liệu thật". Phiên desktop sau chuyển mục này thành EXPERIENCE (DSK-19).

### 5.2 Định danh `main-PROB-001` bị dùng lại (thấp)

`main-EXP-019` có `derived_from: main-PROB-001`, trỏ tới vấn đề cũ về bản sao do antivirus chạy, đã giải quyết ở phiên 26 (DSK-12). Phiên 30 đặt một vấn đề mới cũng tên `main-PROB-001`, nên `derived_from` của EXP-019 giờ trỏ nhầm. Giao thức 07 chỉ cấm dùng lại số EXP, nhưng tham chiếu mơ hồ là lỗi thật. **Sửa:** đổi thành `main-PROB-002`.

### 5.3 `reminder_ticker-EXP-003` nói quá mã (thấp)

Checkpoint ghi "lead không nguyên dương bị coi là sai hình dạng". Mã (`isCount`) chấp nhận mọi số nguyên, kể cả 0 và số âm. Mã đúng với hợp đồng (`amount: integer`), và ticker không được kiểm lại luật nghiệp vụ. Chữ của checkpoint sai, không phải mã. **Sửa:** "lead không nguyên".

### 5.4 Ca D2, lượt 1, có thể hỏng giả (thấp)

D2 chờ dòng `reminder ticker started` rồi tạo dữ liệu. Lần kiểm đầu được bắn ngay lúc đó, nên nếu máy chậm và lời gọi tới backend sau khi dữ liệu đã có, lượt 1 sẽ có toast và `expect([])` hỏng. Đây là hỏng theo chiều an toàn, không phải đạt giả. **Sửa:** chờ dòng `reminder check #1:` như P8 đã làm.

### 5.5 Bản đóng gói từng thiếu module ticker (đã sửa trong phiên)

`electron-builder.yml` liệt kê từng tệp của `app.asar`. Module mới không có trong danh sách, nên bản đóng gói báo `Cannot find module`. Project Owner phát hiện khi mở bản cài; agent sửa trong phiên, và P7 chạy ticker trong gói xác nhận.

Đây đúng loại lỗi mà DSK-16 nhắm tới: `test:packaged` phải chạy mỗi khi cấu trúc `dist` đổi. Agent đã ghi bài học ở main-EXP-027.

**Hệ quả cho Project Owner:** bộ cài đã cài lúc 20:57 ngày 4/10 vẫn mang lỗi này. Máy cũng còn bản cài cũ ngày 28/9 với lối tắt Start Menu cùng AUMID, nên phép đo thông báo của bản đóng gói trên máy này bị nhiễu (ENV-8).

### 5.6 Nới khẳng định ở ca 16 (ghi nhận)

Ca 16 (không cờ) chỉ đòi `isFocused()` true ở ít nhất 3/5 lượt, vì người dùng đổi cửa sổ giữa chừng làm một lượt false. Đây không phải `retries` hay tăng thời gian chờ. Hành vi được bảo vệ ("không cờ thì như cũ") còn được giữ bởi `show: !settings.showInactive` và khẳng định không có dòng `ready-to-show`. Chấp nhận.

### 5.7 Bấm toast trong Action Center: chưa đo (thấp, V2)

Main bỏ tham chiếu tới `Notification` khi nhận `close`. Agent đo được `close` sau khoảng 9,5 s, lúc toast lui vào Action Center. Bấm toast ở Action Center sau thời điểm đó có tới tiến trình hay không thì chưa đo. Đặc tả V1 không đòi điều này. Ghi DSK-20 cho V2.

## 6. Việc tồn đọng

- **DSK-17:** đóng, phiên 30.
- **DSK-18:** đóng, phiên 30. Bước giao diện vẫn thuộc UI-18, nay đã có cờ để dùng.
- **D6** xong hẳn: ticker đã có.
- **Mới:**
  - DSK-19 (thấp): §5.1 tới §5.4, cho phiên desktop sau;
  - DSK-20 (thấp, V2): §5.7;
  - ENV-8 (Project Owner): bản cài trên máy.

## 7. Câu hỏi cho Project Owner

1. Anh có mở bản Commission Tracker đã cài vào khoảng 21:05 ngày 4/10 và 10:45 ngày 5/10 không? Có kèm `--ct-test-data-dir` không?
2. Bản đã cài lúc 20:57 ngày 4/10 bị lỗi `Cannot find module`. Anh chọn gỡ hẳn, hay cài lại từ bộ cài mới trong `Desktop\release`? Lưu ý: bản cài dùng thư mục dữ liệu thật `%APPDATA%\CommissionTracker`, đó là dùng thật, không phải kiểm thử.

## 8. Trả lời của Project Owner (2026-10-05 14:50)

1. Đúng: Project Owner đã cài bản mới đè lên bản cũ rồi mở thử, vào các thời điểm đó. `main-PROB-001` có nguồn là bản cài lỗi, không phải kiểm thử. Tiêu chí 5 coi là đạt về thực chất. Chuyển mục này thành EXPERIENCE ở DSK-19.
2. Project Owner chọn gỡ hẳn rồi cài lại (ENV-8). Project Owner cũng nêu việc cài đè bản mới lên bản cũ phải được nghiêm túc xử lý cho người dùng thật. Ghi thành DSK-21, chờ duyệt hướng. Lưu ý: lỗi `Cannot find module` không do cài đè gây ra; bộ cài đó thiếu tệp (§5.5).
