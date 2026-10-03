# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-03T09:15:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 27 của dự án, phiên giao diện thứ mười một. **Chặng D6, nhắc việc, phần giao diện:**
- workflow giao diện `send_reminder`;
- hai trang mới, `reminder_list` và `reminder_settings`;
- mục điều hướng thứ năm, "Nhắc việc".

Kèm theo hai việc nhỏ:
- **UI-11, bước (3):** harness ghi trạng thái cửa sổ cạnh mỗi lần chụp ảnh;
- **làm mới ảnh bằng chứng có ô ngày**, sau khi phiên 26 đổi ngôn ngữ ứng dụng sang `vi`.

Đặc tả là `.design/ui_decomposition.md`, mục **"Chặng D6 — Nhắc việc"** (làm lại I1 ngày 2026-10-03), cùng §5 và §7. Mọi câu chữ, luật kiểm, luật phủ đã chốt ở đó. Plan này không chép lại.

⚠ **Giao diện không bao giờ gọi `POST /reminders/checks` (`check_due`).** Theo hợp đồng, chỉ `reminder_ticker` của desktop gọi; thành phần đó làm ở một phiên desktop sau. Kịch bản bấm thử và e2e tạo nhắc việc bằng **công cụ kiểm thử** gọi thẳng endpoint đó.

Cuối phiên, `reminder_list` và `reminder_settings` được đề xuất `hoàn_tất`.

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`;
- mỗi spec mới chạy riêng đạt **10 lần liên tiếp**;
- kịch bản bấm thử chạy lại trên hệ thống thật.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 và mục 5;
   - skill `iwca-implementation` v1.0: `iwca_theory.md` (§5, §6, §7 ma trận R1–R14), `i1-decompose.md` (Bước I1.5), `i3-logic.md`, `i4-kit.md`, `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`:
     - §2 (hàng `send_reminder`), §4 (dòng `check_due`), §5 (vùng điều hướng, bảng trang);
     - mục "Chặng D4 — Thanh toán" (mẫu trang danh sách có nút trên từng mục, form có hàng nút);
     - mục **"Chặng D6 — Nhắc việc"**;
     - §7;
   - `.plan/open_issues.md`: UI-11 (toàn mục, nhất là "Dữ liệu phiên 25" và câu trả lời ngày 2026-10-02), UI-10 (luật `getByRole('status')`), DSK-15 (đã đóng), DSK-16, BE-8;
   - hợp đồng:
     - `data_schema.yaml`: `clause_a_common` (`types.reminder_settings_record`, `types.reminder_notification_record`, `formats.timestamp`, `formats.date`, luật số nguyên ±(2^53−1)); `send_reminder` (toàn mục, nhất là `description`);
     - `api_contract.yaml`: `send_reminder`, `cross_cutting.reminder_ticker`, `error_body`, `endpoint_forms.http`;
   - mọi khối checkpoint của `UI/`. Khối `record_payment` (danh sách có nút trên từng mục, form) và `view_income_report` (khối gần nhất) là mẫu;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`, và `send_reminder` ở `đã_hoàn_thiện`. Sai khác thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **1303**.
   - `npm run build` trong `Desktop/`, rồi `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **59**.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **UI-11, bước (3): ghi trạng thái cửa sổ.** Làm trước, để mọi lần e2e trong phiên có dữ liệu.
   - Ở mọi lệnh chụp ảnh của harness, ghi thêm vào nhật ký thời gian chụp ảnh (`UI/test-results/screenshot-timing.log`), cạnh dòng hiện có: `isMinimized`, `isVisible`, `isFocused` của cửa sổ chính (qua `electronApp.evaluate`), và `document.visibilityState` của trang. Đọc **trước** lệnh chụp.
   - Chỉ ghi. Không đổi cách chụp, không `restore()` cửa sổ, không nới thời gian chờ, không `retries`.
   - Mỗi lần hết giờ: giữ trace trong `UI/test-results/ui11_traces/` như phiên 24.
   - ⚠ Trong lúc e2e chạy, không thu nhỏ cửa sổ Electron.

3. **Logic: workflow giao diện `send_reminder`** (I3), đủ các thành phần.
   - **Configs:** `contract.dataSchema: '9.0.2'`, `apiContract: '4.0.0'`; câu chữ và tên tiếng Việt đúng `ui_decomposition.md`; các ràng buộc của `reminder_settings_record` với nhãn `[CONTRACT]`.
   - **Adapters:** bốn lời gọi của bảng D6, kiểm hình dạng bằng Zod. Là vi phạm hợp đồng khi lệch bất kỳ điều nào dưới đây:
     - `kind` ngoài hai giá trị;
     - `deadline_item` có mặt mà `kind` không phải `'deadline'`, hoặc ngược lại; tương tự với `digest` và `'periodic_digest'`;
     - `due_at`, `updated_at`, `acknowledged_at` không đúng `formats.timestamp`; `deadline` không đúng `formats.date`;
     - `settings` không đúng `reminder_settings_record`;
     - số nguyên không an toàn.

     `edit_settings` gửi thân `{ reminder_settings_input }`; `acknowledge` đặt `notification_id` trong đường dẫn.
   - **Services:**
     - dòng chính và dòng phụ của từng loại nhắc việc;
     - định dạng ngày, giờ, mốc nhắc, thứ;
     - dòng "Chưa lưu lần nào…" / "Lưu lần cuối lúc …";
     - bản nháp form từ `settings`, gồm cả việc đổi đơn vị chu kỳ (`weekday` về `null`, hay mặc định Thứ Hai).
   - **Routers:** mỗi thao tác của hai trang là một lối vào. Kiểm form trước khi gửi, đúng mọi luật ở đặc tả.
   - **Kiểm thử bắt buộc**, ngoài ma trận I3.6:
     - `every`: rỗng, `0`, `-1`, `1.5`, `abc`, `2^53` → lỗi; `1` hợp lệ;
     - `at_time`: `9:00`, `24:00`, `12:60`, rỗng → lỗi; `00:00`, `23:59` hợp lệ;
     - đơn vị "tuần" mà chưa chọn thứ → lỗi; đơn vị "ngày" thì gửi `weekday: null`;
     - mốc: `365 ngày` và `8760 giờ` hợp lệ; `366 ngày`, `8761 giờ` → lỗi;
     - mốc trùng: `1 ngày` cùng `24 giờ` → lỗi ở mốc sau; `2 ngày` cùng `24 giờ` hợp lệ;
     - phần đang tắt vẫn bị kiểm (ví dụ nhắc định kỳ tắt mà `every` rỗng → lỗi);
     - nhắc việc tổng hợp với `upcoming` rỗng và không rỗng;
     - 404 của `acknowledge` cho ra đúng câu.

4. **Kit** (I4).
   - Cần **ô đánh dấu** (`<input type="checkbox">`) và **ô giờ** (`<input type="time">`). Thêm component theo mẫu `DateField` (nhãn, lỗi, vô hiệu, yêu cầu focus), hoặc mở rộng component sẵn có; ghi lý do.
   - Ô số dùng `TextField` sẵn có (Routers đọc chuỗi thành số nguyên).
   - Danh sách mốc nhắc có nút "Bỏ mốc này" trên từng dòng: dựng bằng component sẵn có nếu được; nếu cần component mới, ghi lý do.
   - `check_contrast.mjs` phủ mọi component mới hoặc mở rộng. Mọi component export qua `kit/index.ts` (R9).

5. **Màn hình** (I5).
   - Trang `reminder_list` và `reminder_settings`, cùng hook, theo mẫu của D4:
     - cờ tải khởi tạo `true`;
     - hàng nút dưới tiêu đề;
     - focus tới ô lỗi đầu tiên.
   - Thêm khóa `reminder_list`, `reminder_settings` (không tham số) vào bảng điều hướng; mục "Nhắc việc" đứng sau "Thu nhập". Bốn mục cũ giữ nguyên vị trí.
   - Ráp nối `send_reminder` ở Main và `logic_context`.
   - **Kiểm thử dựng trang:**
     - mọi nhãn của bảng D6, cho từng lời gọi;
     - lần vẽ đầu của hai trang;
     - hai loại nhắc việc; bấm dòng chính điều hướng đúng;
     - "Đã xem" gửi đúng một lần; mọi nút "Đã xem" bị vô hiệu trong lúc gửi;
     - ô "Vào thứ" hiện và ẩn theo đơn vị;
     - "Thêm mốc nhắc" vô hiệu ở 5 dòng; "Bỏ mốc này" vô hiệu ở 1 dòng;
     - "Chưa lưu lần nào" và "Lưu lần cuối lúc …";
     - trạng thái rỗng có nút "Cài đặt nhắc việc";
     - vùng điều hướng có năm mục đúng thứ tự.

   Không đổi hành vi của các trang đã `hoàn_tất`; chỉ thêm mục điều hướng. Sửa các spec và kiểm thử đang đếm đúng bốn mục điều hướng (như phiên 24 đã làm khi thêm "Thu nhập"); chỉ thêm `['Nhắc việc', null]`, không đổi gì khác.

6. **Kịch bản bấm thử và e2e** (I6.3).
   - `walkthrough.yaml` mới cho `reminder_list` và `reminder_settings`, theo luật phủ D6.
   - **Dữ liệu mẫu:** một hàm nạp riêng trong `tests/tools/walkthrough_lib.mjs`, và một cờ cho `npm run walkthrough:app` (ví dụ `--reminders`).
     - Hạn giao là **hôm nay** theo ngày máy; bật nhắc trước hạn giao mốc "1 ngày"; rồi gọi `POST /reminders/checks` từ **công cụ kiểm thử**.
     - Nhắc việc tổng hợp: theo đặc tả (dưới 70 giây thì đưa vào kịch bản, không thì ghi lý do).
     - Theo luật của UI-9: chờ hơn 1 s sau lần ghi cuối.
   - **Ảnh bằng chứng có ngày thay đổi theo ngày chạy.** Chấp nhận; ghi rõ trong `walkthrough.yaml`.
   - Tín hiệu "đã tải xong" là nội dung đã tải. Khẳng định chữ trên `role="status"` phải lọc theo chữ.
   - Chạy mỗi spec mới riêng **10 lần liên tiếp**.
   - Chạy `npm run e2e` **5 lần liên tiếp**, từng lượt một, có `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`. Lần hỏng chỉ vì chụp ảnh hết giờ (UI-11) thì giữ trace, không tính, chạy tiếp cho đủ. Hỏng vì lý do khác thì phải sửa.
   - Một lần không đặt biến: `UI/evidence` nguyên vẹn.

7. **Làm mới ảnh bằng chứng có ô ngày.** Các lượt e2e có runner ở việc 6 tự chụp lại mọi ảnh. Sau đó **mở và xem** các ảnh có ô ngày hoặc ngày giờ, và báo lại từng ảnh có hiện kiểu ngày/tháng/năm hay không:
   - `commission_form` (ô "Hạn giao");
   - `payment_form` (ô "Ngày giờ nhận tiền", `datetime-local`);
   - `income_report` (hai ô ngày).

   Nếu ô `datetime-local` vẫn hiện kiểu tháng/ngày, **không sửa**, chỉ báo lại kèm ảnh.

8. **Tự kiểm I6** cho `reminder_list` và `reminder_settings`, đủ năm góc; đối chiếu bảy nguyên tắc §7.2, đặc biệt nguyên tắc 4 (lỗi cạnh ô, focus) và 5 (lý do "Đã xem" không hỏi xác nhận). Ghi vào checkpoint `screens`.

9. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - khối mới `send_reminder` (logic);
   - `kit`: component mới hoặc mở rộng;
   - `screens`: hai trang mới, mục điều hướng, tự kiểm I6, **đề xuất** trạng thái hai trang;
   - `main`: ráp nối mới, mốc kiểm thử, phần UI-11.
   - **Giờ ghi trong checkpoint:** chép nguyên giá trị `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-11:** việc 2 (chỉ ghi).
- **DSK-16:** phiên này không đổi chữ của `client_list` hay khung chính ngoài mục điều hướng mới. `packaged_app.spec.ts` không kiểm danh sách mục điều hướng, nên không cần chạy `test:packaged`. Nếu bạn thấy khác, báo lại.
- **Giới hạn R13 đã khai:** chấp nhận ở V1.
- **Phép kiểm tĩnh `lint:e2e`** không bắt locator gán vào biến trước (Q21-1): đừng viết kiểu đó.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `reminder_settings_record` = `{ periodic: { enabled: boolean, every: integer (>= 1), unit: 'days' | 'weeks', at_time: string (HH:MM, local time), weekday: integer|null (1..7, ISO; required when unit = 'weeks', null when unit = 'days') }, deadline: { enabled: boolean, lead_times: list[{ amount: integer (>= 1), unit: 'hours' | 'days' }] (1..5 entries; 1 day = 24 hours; each at most 365 days / 8760 hours; no two entries of the same duration) } }`.
- `reminder_settings` = `{ settings, updated_at: timestamp|null }`; `null` nghĩa là chưa lưu lần nào, đang dùng mặc định.
- `reminder_notification_record` = `{ notification_id, kind: 'periodic_digest' | 'deadline', due_at, deadline_item: {…}|null, digest: { open_count, upcoming: [{ commission_id, title, deadline }] }|null }`.
- `pending_notifications`: mọi nhắc việc đã trao ra và chưa đánh dấu, cũ nhất trước.
- `acknowledge`: đánh dấu hai lần không phải lỗi; id không có → 404.
- Lưu cài đặt làm chu kỳ nhắc định kỳ bắt đầu lại.
- `check_due` chỉ do `reminder_ticker` gọi (`called_by: [reminder_ticker]`).
- `error_body.details` không có hình dạng trong hợp đồng: không đọc.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`).
- ⚠ **Không gọi `POST /reminders/checks` từ mã trong `UI/src/`.** Chỉ công cụ kiểm thử trong `UI/tests/` được gọi, để tạo dữ liệu mẫu.
- Không làm `reminder_ticker`, thông báo Windows hay bất cứ gì ở Desktop. Không làm sao lưu, khôi phục (chặng E, F).
- Không thêm lời gọi nào ngoài bốn lời gọi của bảng D6.
- Không đổi hành vi của các trang `hoàn_tất`. Chỉ thêm mục "Nhắc việc".
- Không dùng `window.confirm`, `alert` hay hộp thoại gốc nào.
- Không nới thời gian chờ, không thêm `retries`, không đánh dấu `skip`, `fixme` hay `flaky`. Không `restore()` cửa sổ trong harness.
- Không sửa Desktop, không sửa Backend. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không làm các mục V2.
- Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài, không Tailwind.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent. Không chạy song song hai lệnh e2e.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **UI-11:** nhật ký thời gian chụp ảnh có thêm trạng thái cửa sổ; báo cáo có bảng tổng hợp thời gian chụp, và liệt kê mọi lần hết giờ kèm trạng thái cửa sổ và đường dẫn trace (hoặc ghi rõ không có lần nào).
2. Workflow `send_reminder` có đủ thành phần; Configs ghi Data Schema 9.0.2; các ca kiểm thử bắt buộc của việc 3 đều có.
3. Hai trang mới chạy đúng đặc tả D6. Kiểm thử dựng trang phủ mọi nhãn. Các trang `hoàn_tất` không đổi hành vi. Không có lời gọi `check_due` nào trong `UI/src/`.
4. `npm run check` đạt (kể cả `lint:e2e`), số kiểm thử cao hơn mốc 1303.
5. Mỗi spec mới chạy riêng đạt 10/10. `npm run e2e` đạt **5/5 lần liên tiếp**, số e2e cao hơn mốc 59. Một lần không đặt biến để `UI/evidence` nguyên vẹn.
6. Kịch bản bấm thử chạy trên hệ thống thật, có ảnh và đúng tên người chạy.
7. Việc 7: báo cáo kiểu hiển thị của từng ô ngày trong ba trang, kèm đường dẫn ảnh.
8. Tự kiểm I6 đủ năm góc cho hai trang.
9. Checkpoint `send_reminder` (mới), `kit`, `screens`, `main` theo Giao thức 07, giờ lấy bằng lệnh. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
10. Mốc `%APPDATA%` không đổi.
11. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
12. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay** cho hai kịch bản mới;
    - kết quả UI-11;
    - đề xuất trạng thái hai trang;
    - danh sách ngoại lệ lint mới, nếu có.
