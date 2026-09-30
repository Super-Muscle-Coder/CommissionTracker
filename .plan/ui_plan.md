# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-29T22:45:00+07:00
# contract: data_schema 9.0.0, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 22 của dự án, phiên giao diện thứ tám. **Chặng D4, thanh toán:**
- workflow giao diện `record_payment`;
- hai trang mới, `payment_list` và `payment_form`;
- phần "Thanh toán" trong trang `commission_detail`.

Kèm theo: **thu dữ liệu cho UI-11** (chụp ảnh e2e hết giờ trên Windows). Việc này chỉ thu dữ liệu, không sửa và không che lỗi.

Đặc tả là `.design/ui_decomposition.md`, mục **"Chặng D4 — Thanh toán"** (làm lại I1 ngày 2026-09-29), cùng §5 và §7. Mọi quyết định trình bày, câu chữ, luật kiểm form, cách ghép `paid_at`, cách xác nhận và luật phủ đều đã chốt ở đó. Plan này không chép lại.

Cuối phiên, `payment_list`, `payment_form` và `commission_detail` (có thêm phần Thanh toán) được đề xuất `hoàn_tất`.

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`;
- mỗi spec mới chạy riêng đạt **10 lần liên tiếp**;
- mọi kịch bản bấm thử chạy lại trên hệ thống thật.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 (luật git) và mục 5 (vận hành layer giao diện);
   - skill `iwca-implementation` v1.0: `iwca_theory.md` (§6, §7 ma trận R1–R14), `i1-decompose.md` (Bước I1.5), `i3-logic.md`, `i4-kit.md`, `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`:
     - §2 (hàng `record_payment`) và §5;
     - mục "Chặng D2 — Đơn hàng", phần "Số tiền" (luật đọc và hiện số tiền mà D4 dùng lại);
     - mục "Chặng D3 — Tiến độ", phần "Sửa trang `commission_detail`" (mẫu cho phần Thanh toán);
     - mục **"Chặng D4 — Thanh toán"**;
     - §7;
   - `.plan/open_issues.md`: UI-11, UI-10 (luật `getByRole('status')` đã có phép kiểm tĩnh), UI-6 (phần V2);
   - hợp đồng:
     - `data_schema.yaml`: changelog `v9.0.0`; `clause_a_common` (`formats.not_blank`, `types.money`, `types.payment_record`, `formats.timestamp`, luật số nguyên ±(2^53−1)); `record_payment` (toàn mục);
     - `api_contract.yaml`: `record_payment`, `error_codes` (`ERR_OUT_OF_RANGE`, `ERR_CURRENCY_MISMATCH`, `ERR_CONFLICT`), `error_body`, `endpoint_forms.http`;
   - mọi khối checkpoint của `UI/`. Khối `manage_commission` (tiền) và `update_progress` (phần của `commission_detail`, khung xác nhận) là mẫu gần nhất;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.0`** và API Contract **`4.0.0`**, cả hai `approved`. Bản 9.0.0 ghi `record_payment` ở `đang_triển_khai`: đó là việc của **backend** (BE-7, một phiên backend riêng), không phải phiên này. Phía giao diện, API Contract không đổi: nhãn và mã lỗi giữ nguyên. Sai khác thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **780**.
   - `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **42**.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **UI-11: thu dữ liệu** (`.plan/open_issues.md` UI-11). Làm trước, để mọi lần e2e của phiên đều có dữ liệu.
   - Bật `trace: 'retain-on-failure'` trong `tests/e2e/playwright.config.ts`. Đây là thay đổi duy nhất được phép trong tệp cấu hình này.
   - Ở mọi lệnh chụp ảnh của harness (`rec.step`, `rec.screenshot`, hoặc hàm tương đương), ghi thời điểm bắt đầu và thời gian chụp ảnh vào một tệp nhật ký trong `UI/test-results/` (đã bị git bỏ qua). Mỗi dòng gồm: spec, bước, thời gian (ms), và bước đó có đang tắt backend hay không.
   - **Không** nới thời gian chờ, không thêm `retries`, không đổi cách chụp ảnh.
   - Mỗi lần chụp ảnh hết giờ trong phiên, giữ lại trace (`test-results/…/trace.zip`) và dòng nhật ký, rồi báo trong báo cáo cuối phiên. Không sửa.
   - Cuối phiên, tổng hợp từ nhật ký: thời gian chụp ảnh lớn nhất, trung bình, và riêng cho các bước backend tắt.

3. **Logic: workflow giao diện `record_payment`** (I3), đủ các thành phần.
   - **Configs:**
     - `contract.dataSchema: '9.0.0'`, `apiContract: '4.0.0'`;
     - bảng chữ số lẻ (bản riêng);
     - tên tiếng Việt của chiều tiền và loại khoản;
     - gợi ý phương thức;
     - câu chữ mọi thông báo, đúng `ui_decomposition.md`.
   - **Adapters:** bốn lời gọi của bảng D4, kiểm hình dạng bằng Zod.
     - `list_for_commission` gửi `commission_id` qua tham số truy vấn; `record` gửi thân `{ commission_id, payment_input }` (`endpoint_forms.http`).
     - `direction`, `kind` phải thuộc tập giá trị của hợp đồng; `paid_at` đúng `formats.timestamp`; mọi `amount_minor` là số nguyên an toàn. Lệch thì là vi phạm hợp đồng.
     - Phân biệt 409 của `record`, `get_balance` (`ERR_OUT_OF_RANGE`) với 409 của `void_payment` (`ERR_CONFLICT`) theo lời gọi, đúng hợp đồng.
   - **Services:** số dư ba dòng (gồm "Đã thu đủ" và "Đã thu dư …"); dòng chính và dòng phụ của mỗi khoản; khoản đã hủy; giá trị mặc định của form; ghép `paid_at`.
   - **Routers:** mỗi thao tác của hai trang mới và của phần Thanh toán là một lối vào. Kiểm form trước khi gửi.
   - **Nguồn "bây giờ":** một hàm do Main trao cho workflow (như cách Main trao Configs cho Routers, R14). Kiểm thử cố định được thời điểm.
   - **Kiểm thử bắt buộc**, ngoài ma trận I3.6:
     - số dư: `outstanding` dương, bằng 0, âm; `agreed` và `received_net` có phần lẻ USD;
     - `paid_at`:
       - ghép đúng độ lệch múi giờ của máy tại **đúng ngày giờ đó**;
       - thử ít nhất một múi giờ có giờ mùa hè (ví dụ `America/New_York`), với một ngày trước và một ngày sau lúc đổi giờ: độ lệch phải khác nhau;
       - thử `Asia/Ho_Chi_Minh`: `+07:00`;
       - ghi lại cách đặt múi giờ trong kiểm thử;
     - số tiền 0 → "Số tiền phải lớn hơn 0"; số tiền vượt 2^53−1; bảng ví dụ đọc số tiền của D2 (ít nhất các dòng USD);
     - phương thức chỉ gồm khoảng trắng (ASCII, `U+00A0`, `U+3000`) → lỗi; ghi chú chỉ khoảng trắng → `null`;
     - khoản đã hủy không có thao tác hủy;
     - 409 của `void_payment` và 409 của `record` cho ra hai câu khác nhau.

4. **Kit** (I4).
   - Cần một ô ngày giờ (`<input type="datetime-local">`): thêm `DateTimeField` theo mẫu `DateField` (nhãn, lỗi, vô hiệu, yêu cầu focus); viền dùng token ô nhập.
   - Cần nút phụ trên từng mục của danh sách khoản ("Hủy khoản này"): mở rộng `ItemList`, hoặc thêm component mới, theo lựa chọn của bạn; ghi lý do. Mục đã hủy không có nút.
   - Dùng lại `ConfirmPanel` cho xác nhận hủy khoản.
   - `check_contrast.mjs` phủ mọi component mới hoặc mở rộng. Mọi component export qua `kit/index.ts` (R9).
   - Ô ngày giờ gốc sẽ hiện theo locale của Electron (en-US), như ô ngày ở D2 (DSK-15). Không sửa ở phiên này; ghi vào NOTE của `kit`.

5. **Màn hình** (I5).
   - Trang `payment_list` và `payment_form`, cùng hook, theo mẫu của D2, D3:
     - cờ tải khởi tạo `true`;
     - hàng nút dưới tiêu đề;
     - focus tới ô lỗi đầu tiên; khi khung xác nhận hiện, focus tới "Xác nhận".
   - `commission_detail` thêm phần Thanh toán với **hook riêng**, tải riêng, lỗi riêng; nút "Thanh toán" trong hàng nút, đúng vị trí đặc tả. Không ghép dữ liệu với phần đơn hay phần Tiến độ.
   - Tham số có kiểu cho `payment_list`, `payment_form`. Ráp nối `record_payment` ở Main và `logic_context`, gồm nguồn "bây giờ".
   - **Kiểm thử dựng trang:**
     - mọi nhãn của bảng D4, cho từng lời gọi;
     - lần vẽ đầu của hai trang và của phần Thanh toán;
     - phần Thanh toán lỗi trong khi hai phần kia vẫn hiện;
     - khung xác nhận hủy: "Quay lại" không gửi gì; "Xác nhận" gửi đúng một lần; nút bị vô hiệu trong lúc gửi;
     - khoản đã hủy: hiện "Đã hủy", không có nút;
     - form: đơn vị tiền không chọn được; mã tiền lạ thì không có form;
     - danh sách rỗng có nút "Ghi khoản thanh toán".

   Không đổi hành vi của các trang đã `hoàn_tất`. Phần đơn và phần Tiến độ của `commission_detail` giữ nguyên; kiểm thử của chúng vẫn đạt.

6. **Kịch bản bấm thử và e2e** (I6.3).
   - `walkthrough.yaml` mới cho `payment_list` và `payment_form`, theo luật phủ D4.
   - Bổ sung các bước của phần Thanh toán vào `commission_detail/walkthrough.yaml`.
   - Dữ liệu mẫu D4 có hàm nạp riêng, theo luật của UI-9: các lần ghi cách nhau hơn 1 s nếu thứ tự quan trọng, và chờ hơn 1 s sau lần ghi cuối. Danh sách khoản sắp theo `paid_at`, nên dữ liệu mẫu tự đặt `paid_at` cách xa nhau.
   - Tín hiệu "đã tải xong" là nội dung đã tải. Khẳng định chữ trên `role="status"` phải lọc theo chữ (phép kiểm tĩnh `lint:e2e` sẽ bắt).
   - Chạy mỗi spec mới riêng **10 lần liên tiếp**, và `commission_detail` cũng vậy.
   - Chạy `npm run e2e` **5 lần liên tiếp** có `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`; ghi dòng tổng kết từng lần.
     - Nếu một lần hỏng **chỉ** vì chụp ảnh hết giờ (UI-11), ghi lại theo việc 2, không tính lần đó, và chạy tiếp cho đủ 5 lần liên tiếp đạt. Báo tổng số lần đã chạy.
     - Hỏng vì lý do khác thì phải sửa.
   - Một lần không đặt biến: `UI/evidence` nguyên vẹn.

7. **Tự kiểm I6** cho `payment_list`, `payment_form`, `commission_detail`, đủ năm góc; đối chiếu bảy nguyên tắc §7.2, đặc biệt nguyên tắc 5 (xác nhận khi hủy khoản). Ghi vào checkpoint `screens`.

8. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - khối mới `record_payment` (logic);
   - `kit`: component mới hoặc mở rộng;
   - `screens`: hai trang mới, phần Thanh toán, tự kiểm I6, **đề xuất** trạng thái ba trang;
   - `main`: ráp nối mới, nguồn "bây giờ", mốc kiểm thử, phần thu dữ liệu UI-11.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-11:** thu dữ liệu (việc 2), không sửa.
- **Ô ngày, ô ngày giờ hiện kiểu Mỹ** (DSK-15): việc của Desktop, không làm.
- **Giới hạn R13 đã khai:** chấp nhận ở V1, không vá.
- **Phép kiểm tĩnh `lint:e2e`** không bắt locator gán vào biến trước (Q21-1): đừng viết kiểu đó.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `payment_input` = `{ direction: 'incoming' | 'refund', kind: 'deposit' | 'milestone' | 'final' | 'tip' | 'other', amount: money (amount_minor > 0), method: string (1.. characters, not blank), paid_at: timestamp, note: string|null }`.
- Mô tả của workflow:
  - đơn vị tiền của khoản phải bằng đơn vị tiền thỏa thuận của đơn (khác thì 422);
  - khoản chỉ bị hủy, không bị xóa hay sửa;
  - khoản làm `received_net` hoặc `outstanding` vượt khoảng số nguyên thì bị từ chối (409 `ERR_OUT_OF_RANGE`).
- `commission_balance`:
  - `received_net` = nhận − hoàn trên mọi khoản chưa hủy, **gồm** tiền tip;
  - `outstanding` = thỏa thuận − (nhận − hoàn) trên các khoản chưa hủy **không phải** tip. Có thể âm.
- `payment_list`: gồm cả khoản đã hủy, mới nhất trước theo `paid_at`.
- `void_payment`: 409 `ERR_CONFLICT` khi khoản đã hủy.
- `error_body.details` không có hình dạng trong hợp đồng: không đọc.
- **Data Schema 9.0.0 (CT-4):** `method` là `string (1.. characters, not blank)`. Luật "phương thức không rỗng" của form là **bản sao của hợp đồng**, không phải `[UI-ONLY]`. Backend chưa áp dụng (BE-7), nên kiểm thử e2e không được dựa vào việc backend từ chối phương thức trống: giao diện phải chặn trước khi gửi.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`): không trang, không workflow giao diện, không lời gọi. Watermark thuộc V4 trở đi.
- Không làm báo cáo thu nhập (D5), nhắc việc (D6). Không thêm lời gọi ngoài bốn lời gọi của bảng D4 và các lời gọi đã có. Không làm sửa hay xóa khoản (hợp đồng không có).
- Không đổi hành vi của các trang `hoàn_tất`. Ở `commission_detail`, chỉ thêm phần Thanh toán và nút "Thanh toán".
- Không dùng `window.confirm`, `alert` hay hộp thoại gốc nào.
- Không nới thời gian chờ, không thêm `retries`, không đánh dấu `skip`, `fixme` hay `flaky`.
- Không sửa Desktop (kể cả DSK-15), không sửa Backend. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không làm các mục V2: Enter để lưu, chặn rời form, lọc hay tìm kiếm.
- Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài (kể cả thư viện chọn ngày giờ), không Tailwind.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent để code song song.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **UI-11:**
   - trace khi hỏng đã bật;
   - nhật ký thời gian chụp ảnh có mặt;
   - báo cáo có bảng tổng hợp thời gian chụp ảnh, và liệt kê mọi lần hết giờ kèm đường dẫn trace (hoặc ghi rõ không có lần nào).
2. Workflow `record_payment` có đủ thành phần; Configs ghi Data Schema 9.0.0; các ca kiểm thử bắt buộc của việc 3 đều có, gồm ca giờ mùa hè.
3. Hai trang mới và phần Thanh toán chạy đúng đặc tả D4. Khung xác nhận nằm trong trang. Kiểm thử dựng trang phủ mọi nhãn. Các trang `hoàn_tất` không đổi hành vi.
4. `npm run check` đạt (kể cả `lint:e2e`), số kiểm thử cao hơn mốc 780.
5. Mỗi spec mới và `commission_detail` chạy riêng đạt 10/10. `npm run e2e` đạt **5/5 lần liên tiếp**, số e2e cao hơn mốc 42. Một lần không đặt biến để `UI/evidence` nguyên vẹn.
6. Mọi kịch bản bấm thử chạy trên hệ thống thật, có ảnh chụp và đúng tên người chạy.
7. Tự kiểm I6 đủ năm góc cho ba trang.
8. Checkpoint `record_payment` (mới), `kit`, `screens`, `main` theo Giao thức 07. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
9. Mốc `%APPDATA%` không đổi.
10. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
11. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay** cho hai kịch bản mới và các bước mới của `commission_detail`;
    - kết quả thu dữ liệu UI-11;
    - đề xuất trạng thái ba trang;
    - danh sách ngoại lệ lint mới, nếu có.
