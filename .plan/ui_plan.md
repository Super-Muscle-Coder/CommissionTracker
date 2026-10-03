# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-03T12:20:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 28 của dự án, phiên giao diện thứ mười hai. Đây là **phiên vá ngắn**, ba mục, không có trang mới:

| Mục | Việc | Mức |
|---|---|---|
| **UI-11, bước (4)** | Công cụ kiểm thử tự mở lại cửa sổ Electron khi nó bị thu nhỏ, và ghi lại mỗi lần (phương án A, Project Owner chọn ngày 2026-10-03) | trung bình |
| **UI-13** | Lỗi "trùng mốc" của `reminder_settings` nhảy sang dòng khác sau khi bấm "Bỏ mốc này" | thấp |
| **UI-15** | Dữ liệu mẫu D6 phải chịu được `reminder_ticker` của desktop, làm ở phiên sau (DSK-17) | trung bình |

Chi tiết và dữ liệu từng mục ở `.plan/open_issues.md`. Plan này chỉ ghi cách làm và tiêu chí.

**Vì sao làm phiên này trước `reminder_ticker`:** theo hợp đồng, mỗi nhắc việc đến hạn chỉ được trao ra một lần. Khi ticker xuất hiện, nó có thể nhận nhắc việc trước công cụ kiểm thử, và dữ liệu mẫu hiện tại sẽ hỏng (UI-15). Sửa phía công cụ trước thì e2e của giao diện không bao giờ hỏng giữa hai phiên.

**⚠ Khác các phiên trước: trong phiên này, Project Owner dùng máy bình thường, kể cả thu nhỏ cửa sổ ứng dụng khi e2e đang chạy.** Đó chính là điều kiện mà UI-11 phải chịu được. Quy ước "không thu nhỏ cửa sổ khi e2e chạy" bỏ từ phiên này.

Không trang nào đổi trạng thái. `reminder_settings` giữ `hoàn_tất`; UI-13 chỉ sửa một lỗi hiển thị và được Project Owner xem lại một bước.

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **10 lần liên tiếp**, trong lúc Project Owner dùng máy bình thường;
- `UI/evidence` không đổi.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 và mục 5;
   - skill `iwca-implementation` v1.0: `iwca_theory.md` (§5, §6, §7 ma trận R1–R14), `i3-logic.md`, `i5-screens.md`;
   - `.design/ui_decomposition.md`: mục **"Chặng D6 — Nhắc việc"** (trang `reminder_settings`, luật phủ D6), §7.2 nguyên tắc 4;
   - `.plan/open_issues.md`:
     - **UI-11**, toàn mục, nhất là "Dữ liệu phiên 25", "Dữ liệu phiên 27" và "Trả lời và quyết định của Project Owner, 2026-10-03";
     - **UI-13**, **UI-15**;
     - DSK-17 (bối cảnh: thành phần nào sẽ gọi `check_due`; không làm ở phiên này);
     - UI-10 (luật `getByRole('status')`), BE-8 (giờ trong checkpoint);
   - hợp đồng:
     - `data_schema.yaml`: `send_reminder` (toàn mục, nhất là câu "Each due reminder is handed out exactly once for display, then stays pending until the artist acknowledges it");
     - `api_contract.yaml`: `send_reminder.check_due`, `send_reminder.list_pending`, `cross_cutting.reminder_ticker`;
   - mọi khối checkpoint của `UI/`, nhất là `send_reminder`, `screens`, `main` (`main-EXP-025`: cách ghi trạng thái cửa sổ của phiên 27);
   - `UI/tests/e2e/walkthrough_harness.ts`, `UI/tests/tools/walkthrough_lib.mjs`, `UI/tests/tools/ui11_probe.mjs`, `UI/src/screens/pages/reminder_settings/`;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`. Sai khác thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **1550**.
   - `npm run build` trong `Desktop/`, rồi `npm run e2e` **không** đặt `CT_WALKTHROUGH_RUNNER`: mốc **69**. Lần hỏng ở mốc thì ghi tên bước và trạng thái cửa sổ trong nhật ký; chưa sửa gì.
   - Băm toàn bộ `UI/evidence` (SHA-256 từng tệp) làm mốc.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **UI-11, bước (4): công cụ kiểm thử tự mở lại cửa sổ bị thu nhỏ.** Làm trước, để mọi lần e2e sau trong phiên đã có nó.
   - **Chỉ ở công cụ kiểm thử** (`UI/tests/`). Không đổi `UI/src`, không đổi `Desktop/`, không thêm cờ `--ct-test-*`.
   - **Phạm vi:** dữ liệu phiên 27 cho thấy cửa sổ thu nhỏ có thể làm treo cả thao tác khác (một lần `locator.click` không thấy nút), không chỉ lệnh chụp. Vì vậy cách làm phải phủ **mọi thao tác** trong lúc cửa sổ bị thu nhỏ, không chỉ trước lệnh chụp.
     - Ứng viên Orchestrator đề nghị: ngay sau mỗi lần mở ứng dụng, harness gắn vào tiến trình chính (qua `electronApp.evaluate`) một trình nghe sự kiện thu nhỏ của cửa sổ chính; mỗi lần cửa sổ bị thu nhỏ thì gọi `restore()` và ghi một dòng nhật ký.
     - Agent được chọn cách khác nếu tốt hơn; ghi lý do. Tra tài liệu Electron 44.4.5 cho sự kiện và hàm dùng tới, ghi nguồn.
     - Chỉ mở lại cửa sổ. Không ép focus, không đưa cửa sổ lên trên cùng, không đổi kích thước.
   - **Nhật ký:** mỗi lần mở lại, một dòng có thời điểm, spec, bước đang chạy (nếu biết). Đặt cạnh nhật ký thời gian chụp ảnh trong `UI/test-results/`. Nhật ký trạng thái cửa sổ trước mỗi lần chụp (phiên 27) giữ nguyên.
   - **Bằng chứng có hiệu lực:**
     - công cụ `tests/tools/ui11_probe.mjs`, điều kiện "thu nhỏ", 20 lần, **có** cơ chế mới: 0 lần treo (phiên 25, không có cơ chế: 11/20 treo);
     - **phép cắn:** tắt tạm cơ chế, chạy lại cùng điều kiện, phải thấy treo trở lại. Khôi phục, ghi số liệu cả hai.
   - Không nới thời gian chờ, không `retries`, không `skip`.
   - Trace của mọi lần hỏng vẫn giữ ở `UI/test-results/ui11_traces/` như các phiên trước.

3. **UI-13: lỗi "trùng mốc" không được nhảy dòng.**
   - **Kiểm thử trước:** viết một kiểm thử dựng trang tái hiện đúng bốn bước ở `open_issues` UI-13: ba dòng [1 ngày, 24 giờ, 5 ngày]; lưu bị từ chối với lỗi trùng ở dòng 2; bỏ dòng 1; câu lỗi không được hiện dưới dòng nào. Chạy, thấy **hỏng** trên mã hiện tại, ghi lại.
   - **Sửa:** khi thêm hay bỏ một dòng mốc, các lỗi đang gắn với dòng mốc không còn hiện. Lỗi của phần "Nhắc định kỳ" và câu tổng của lần lưu trước giữ nguyên.
     - Chọn chỗ sửa theo iWCA (quyết định trình bày thuộc Services; hook chỉ gọi, giữ, chuyển; trang chỉ hiện). Ghi lý do vào checkpoint.
   - Kiểm thử mới **đạt** sau khi sửa; mọi kiểm thử cũ của trang vẫn đạt. Ghi phép cắn: bỏ phần sửa thì kiểm thử mới hỏng.
   - Không đổi hành vi nào khác của trang. Không đổi chữ, không đổi ảnh bằng chứng.

4. **UI-15: dữ liệu mẫu D6 chịu được `reminder_ticker`.**
   - `seedReminderSample` vẫn gọi `POST /reminders/checks` như cũ, sau phút của nhắc việc tổng hợp. Điều nó khẳng định đổi thành: **danh sách đang chờ** (`GET /reminders/pending`) có đúng hai nhắc việc mong đợi (hạn giao rồi tổng hợp, đúng nội dung như hiện nay), dù kết quả của lời gọi `check_due` có đủ hai, có một, hay rỗng.
   - Lý do: hợp đồng chỉ trao mỗi nhắc việc **một lần**. Khi có ticker, ticker có thể đã nhận trước. Danh sách đang chờ thì luôn có đủ, cho tới khi được đánh dấu đã xem.
   - **Kiểm thử tất định:** một ca chứng minh dữ liệu mẫu vẫn đạt khi nhắc việc đã bị một lời gọi `check_due` khác nhận trước. Ví dụ: một lời gọi thêm, đặt ngay trước lời gọi của công cụ, đóng vai ticker. Ca này phải **hỏng** với mã cũ của `seedReminderSample`; ghi bằng chứng cắn.
     - Ca này nằm trong `npm run e2e`, hoặc có lệnh riêng ghi trong checkpoint.
   - Cập nhật chú thích của `seedReminderSample` và `walkthrough.yaml` của `reminder_list` cho khớp ("công cụ gọi `check_due` một lần" không còn là điều kiện để có dữ liệu).
   - Kịch bản bấm thử, các bước và ảnh bằng chứng của `reminder_list` không đổi. Mã trong `UI/src` vẫn không bao giờ gọi `POST /reminders/checks`.

5. **Checkpoint** (Giao thức 07):
   - `main`: EXPERIENCES và EVIDENCE cho UI-11 bước (4) (cách làm, nguồn tài liệu, số liệu probe có và không có cơ chế, số lần mở lại cửa sổ trong 10 lượt e2e);
   - `screens` và `send_reminder` (nếu Services đổi): UI-13;
   - `send_reminder`: UI-15 (sửa `send_reminder-EXP-005` cho khớp cách làm mới);
   - **giờ ghi:** chép **nguyên** giá trị của `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn (BE-8).

6. **Chạy toàn bộ:**
   - `npm run check` đạt, hai lần.
   - `reminder_settings` (kiểm thử dựng trang) chạy riêng 20 lần liên tiếp đạt.
   - `reminder_list_walkthrough.spec.ts` chạy riêng 10 lần liên tiếp đạt.
   - `npm run e2e` **không** đặt `CT_WALKTHROUGH_RUNNER`, **10 lượt liên tiếp đạt**, chạy từng lượt một. Trong lúc đó Project Owner dùng máy bình thường; báo Project Owner trước khi bắt đầu.
     - **Mọi lần hỏng đều tính**, kể cả hết giờ chụp ảnh. Có lần hỏng thì giữ trace, ghi trạng thái cửa sổ và nhật ký mở lại, rồi bắt đầu đếm lại từ đầu.
     - Hỏng ở cửa sổ **không** bị thu nhỏ là dữ liệu mới: dừng và báo, không tự vá thêm.
   - Sau 10 lượt: băm lại `UI/evidence`, phải giống mốc ở việc 1; `git status --short UI/evidence` trống.
   - Chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-6** (phần V2), **UI-7:** không làm.
- **DSK-17:** không làm (desktop, phiên 29).
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `send_reminder.check_due` có `called_by: [reminder_ticker]`. Mã trong `UI/src` không bao giờ gọi nó; chỉ công cụ kiểm thử trong `UI/tests/` được gọi, để tạo dữ liệu mẫu.
- Mỗi nhắc việc đến hạn được trao ra đúng một lần, rồi nằm trong danh sách đang chờ tới khi được đánh dấu đã xem (`send_reminder.description`).
- Luật kiểm form cài đặt nhắc việc là bản sao của `types.reminder_settings_record`; UI-13 không đổi luật nào.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không sửa tệp nào ngoài `UI/`. Được **chạy** các lệnh của `Desktop/` và `Backend/`, không sửa chúng. Không thêm cờ `--ct-test-*`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không nới thời gian chờ, không `retries`, không `skip`, `fixme`, `flaky`. Không viết kiểm thử luôn đạt.
- Không ép focus hay đưa cửa sổ lên trên cùng; chỉ mở lại cửa sổ bị thu nhỏ.
- Không đổi hành vi nào khác của các trang `hoàn_tất`. Không đổi chữ trên giao diện. Không chạy e2e có `CT_WALKTHROUGH_RUNNER`.
- Không có màn hình hồ sơ quyền sở hữu; không lời gọi nào tới `/watermark-profiles` hay `/watermark-strengths`.
- Không tắt luật lint, không thêm `eslint-disable`.
- Không tắt, không đổi cấu hình phần mềm diệt virus.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.
- Không dùng sub-agent. Không chạy song song hai lệnh e2e hay hai bản ứng dụng.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner:

1. **UI-11:**
   - cơ chế mở lại cửa sổ nằm trong `UI/tests/`, có nguồn tài liệu Electron;
   - probe điều kiện "thu nhỏ" 20 lần: 0 lần treo khi có cơ chế; phép cắn cho thấy treo trở lại khi tắt cơ chế;
   - 10 lượt `npm run e2e` liên tiếp đạt trong lúc Project Owner dùng máy bình thường; nhật ký cho biết số lần phải mở lại cửa sổ.
2. **UI-13:** kiểm thử dựng trang mới hỏng trước, đạt sau; phép cắn; mọi kiểm thử cũ đạt.
3. **UI-15:** dữ liệu mẫu khẳng định trên danh sách đang chờ; ca tất định đạt với mã mới và hỏng với mã cũ.
4. `npm run check` đạt; `UI/evidence` giống mốc; mọi lần chụp mốc `%APPDATA%` giống nhau.
5. Checkpoint `main`, `screens`, `send_reminder`: YAML hợp lệ, `UNSOLVED_PROBLEMS: []` hoặc ghi rõ việc còn lại; giờ đúng quy ước BE-8.
6. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
7. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
   - bảng UI-11, UI-13, UI-15: trạng thái và bằng chứng;
   - kết quả 10 lượt e2e và số lần mở lại cửa sổ;
   - các lệnh, và một bước bấm tay để Project Owner xem lại UI-13;
   - danh sách ngoại lệ lint mới, nếu có.
