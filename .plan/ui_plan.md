# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-30T23:45:00+07:00
# contract: data_schema 9.0.1, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 24 của dự án, phiên giao diện thứ chín. **Chặng D5, thu nhập:**
- workflow giao diện `view_income_report`;
- một trang mới, `income_report`;
- mục điều hướng thứ tư, "Thu nhập".

Kèm theo: **tiếp tục thu dữ liệu UI-11**. Trace và nhật ký thời gian chụp ảnh đã có từ phiên 22; phiên này chỉ giữ chúng chạy và báo lại.

Đặc tả là `.design/ui_decomposition.md`, mục **"Chặng D5 — Thu nhập"** (làm lại I1 ngày 2026-09-30), cùng §5 và §7. Mọi quyết định trình bày, câu chữ, khoảng thời gian mặc định, luật kiểm và luật phủ đều đã chốt ở đó. Plan này không chép lại.

Đây là chặng **nhỏ hơn D4**: một lời gọi, một trang, không thao tác ghi. Đừng làm thêm cho "đầy".

Cuối phiên, `income_report` được đề xuất `hoàn_tất`.

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`;
- spec mới chạy riêng đạt **10 lần liên tiếp**;
- kịch bản bấm thử chạy lại trên hệ thống thật.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 (luật git) và mục 5 (vận hành layer giao diện);
   - skill `iwca-implementation` v1.0: `iwca_theory.md` (§6, §7 ma trận R1–R14), `i1-decompose.md` (Bước I1.5), `i3-logic.md`, `i4-kit.md`, `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`:
     - §2 (hàng `view_income_report`) và §5 (đoạn vùng điều hướng, bảng trang);
     - mục "Chặng D2 — Đơn hàng", phần "Số tiền" (luật hiện số tiền mà D5 dùng lại) và phần "Ngày hạn giao";
     - mục "Chặng D4 — Thanh toán", phần `payment_form` (mẫu nguồn "bây giờ" do Main trao);
     - mục **"Chặng D5 — Thu nhập"**;
     - §7;
   - `.plan/open_issues.md`: UI-11, UI-10 (luật `getByRole('status')`), DSK-15;
   - hợp đồng:
     - `data_schema.yaml`: `clause_a_common` (`formats.date`, `formats.timestamp`, `types.money`, `types.currency_code`, luật số nguyên ±(2^53−1)); `view_income_report` (toàn mục, đặc biệt đoạn `description` và kiểu `income_report`);
     - `api_contract.yaml`: `view_income_report`, `error_codes` (`ERR_VALIDATION`, `ERR_OUT_OF_RANGE`), `error_body`, `endpoint_forms.http`;
   - mọi khối checkpoint của `UI/`. Khối `record_payment` (tiền, nguồn "bây giờ") và `progress_board` trong `screens` (trang mở từ vùng điều hướng) là mẫu gần nhất;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.1`** và API Contract **`4.0.0`**, cả hai `approved`, và `view_income_report` ở `đã_hoàn_thiện`. Sai khác thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **1100**.
   - `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **54**.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **UI-11: tiếp tục thu dữ liệu** (`.plan/open_issues.md` UI-11, phần "Dữ liệu phiên 22").
   - Giữ nguyên trace khi hỏng và nhật ký `UI/test-results/screenshot-timing.log`. Không đổi cách ghi.
   - Mỗi lần chụp ảnh hết giờ trong phiên: **giữ trace ngay trong `UI/test-results/ui11_traces/`**, đặt tên theo spec, bước và thời điểm; không để nó trong thư mục tạm của phiên; không xóa khi dọn dẹp. Ghi đường dẫn vào báo cáo.
   - **Không** nới thời gian chờ, không `retries`, không đổi cách chụp ảnh. Không sửa gì vì UI-11.
   - Cuối phiên, tổng hợp từ nhật ký như phiên 22: thời gian chụp lớn nhất, trung bình, và riêng các bước backend tắt.

3. **Logic: workflow giao diện `view_income_report`** (I3), đủ các thành phần.
   - **Configs:**
     - `contract.dataSchema: '9.0.1'`, `apiContract: '4.0.0'`;
     - bảng chữ số lẻ (bản riêng, R2);
     - câu chữ mọi nhãn, dòng giải thích và thông báo, đúng `ui_decomposition.md`.
   - **Adapters:** lời gọi `get_income_report`, gửi `period_from`, `period_to` qua tham số truy vấn; kiểm hình dạng `income_report` bằng Zod. Là vi phạm hợp đồng khi lệch bất kỳ điều nào dưới đây:
     - `period_from`, `period_to` không đúng `formats.date`; `generated_at` không đúng `formats.timestamp`;
     - `currency` không đúng `types.currency_code`; `month` không đúng dạng `YYYY-MM`;
     - mọi số `*_minor` không phải số nguyên an toàn;
     - `refunded_minor` âm.

     Thứ tự của `currencies` và `by_month` **không** kiểm ở Adapters (giữ nguyên như nhận, đặc tả không sắp lại).
   - **Services:**
     - khoảng thời gian mặc định (đầu năm tới hôm nay) từ nguồn "bây giờ";
     - kiểm khoảng thời gian;
     - hiện số tiền (gồm số âm và mã tiền lạ), tháng, ngày, thời điểm lập;
     - dựng từng phần đơn vị tiền, gồm trường hợp `by_month` rỗng và `currencies` rỗng.
   - **Routers:** hai lối vào: mở trang (khoảng mặc định và tải) và xem báo cáo với khoảng đã nhập. Kiểm trước khi gửi.
   - **Nguồn "bây giờ":** Main trao cho workflow này một hàm, như với `record_payment`. Không import từ `record_payment` (R2). Kiểm thử cố định được ngày.
   - **Kiểm thử bắt buộc**, ngoài ma trận I3.6:
     - khoảng mặc định: ngày 1 tháng 1 và ngày 31 tháng 12, với "bây giờ" ở `Asia/Ho_Chi_Minh`; và một thời điểm sát nửa đêm mà ngày UTC khác ngày giờ máy (ví dụ 00:30 ngày 1/1 giờ Việt Nam, tức 17:30 ngày 31/12 UTC): ngày mặc định phải theo **giờ máy**;
     - kiểm khoảng: ô rỗng; năm năm chữ số (`20260-01-01`); ngày không có thật (`2026-02-30`); ngày bắt đầu sau ngày kết thúc (lỗi ở ô "Đến ngày"); hai ngày bằng nhau hợp lệ;
     - số tiền: `received_net_minor` âm; `outstanding_minor` âm; USD có phần lẻ; mã tiền không có trong bảng; giá trị `±(2^53−1)`;
     - tháng: `2026-09` → "Tháng 9/2026", `2026-12` → "Tháng 12/2026";
     - `by_month` rỗng → câu "Không có khoản thanh toán nào trong kỳ."; `currencies` rỗng → trạng thái rỗng;
     - 400 và 409 cho ra hai câu khác nhau;
     - kết quả hỏng (500, không tới được, vi phạm hợp đồng) thì không còn báo cáo cũ trong kết quả.

4. **Kit** (I4).
   - Dự kiến đủ bằng component sẵn có: `DateField` (hai ô ngày), `DescriptionList` (ba dòng số, danh sách theo tháng), `Section` (mỗi đơn vị tiền), `EmptyState`, `InlineAlert`.
   - Nếu thật sự cần mở rộng hay thêm component, ghi lý do; component mới hoặc mở rộng phải được `check_contrast.mjs` phủ và export qua `kit/index.ts` (R9).

5. **Màn hình** (I5).
   - Trang `income_report` cùng hook, theo mẫu của `progress_board`:
     - cờ tải khởi tạo `true`;
     - hàng nút dưới tiêu đề chỉ có "Xem báo cáo" (hành động chính);
     - lỗi nhập thì focus tới ô lỗi đầu tiên;
     - trong lúc tải, "Xem báo cáo" bị vô hiệu và báo cáo cũ giữ nguyên.
   - Thêm khóa `income_report` (không tham số) vào bảng điều hướng; mục "Thu nhập" đứng sau "Tiến độ". Ba mục cũ giữ nguyên vị trí.
   - Ráp nối `view_income_report` ở Main và `logic_context`, gồm nguồn "bây giờ".
   - **Kiểm thử dựng trang:**
     - mọi nhãn của bảng D5;
     - lần vẽ đầu (đang tải) và việc tự tải khi mở;
     - dòng phụ lấy khoảng thời gian từ **kết quả**, không từ ô nhập (sửa ô sau khi có kết quả thì dòng phụ không đổi);
     - lỗi nhập: không gửi, báo cáo cũ còn nguyên;
     - lỗi tải: báo cáo cũ bị bỏ;
     - hai đơn vị tiền theo đúng thứ tự nhận; `by_month` rỗng; `currencies` rỗng;
     - vùng điều hướng có bốn mục đúng thứ tự, và "Thu nhập" được đánh dấu khi đang mở trang.

   Không đổi hành vi của các trang đã `hoàn_tất`. Chỉ thêm mục điều hướng.

6. **Kịch bản bấm thử và e2e** (I6.3).
   - `walkthrough.yaml` mới cho `income_report`, theo luật phủ D5.
   - **Dữ liệu mẫu** đủ theo luật phủ D5. Dùng hoặc mở rộng dữ liệu mẫu hiện có (ví dụ thêm một cờ cho `walkthrough:app`); ghi rõ lựa chọn và lý do.
     - `paid_at` của dữ liệu mẫu là ngày cố định, không phụ thuộc ngày chạy.
     - Đơn đã hủy: đổi giai đoạn qua API thật (`change_stage` sang `cancelled`).
     - Theo luật của UI-9: chờ hơn 1 s sau lần ghi cuối.
   - **Ảnh bằng chứng** chỉ chụp sau khi đã nhập khoảng thời gian cố định. Không chụp báo cáo của khoảng mặc định, vì nó đổi theo ngày chạy.
   - Tín hiệu "đã tải xong" là nội dung đã tải. Khẳng định chữ trên `role="status"` phải lọc theo chữ (`lint:e2e` sẽ bắt).
   - Chạy spec mới riêng **10 lần liên tiếp**.
   - Chạy `npm run e2e` **5 lần liên tiếp** có `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`; ghi dòng tổng kết từng lần.
     - Nếu một lần hỏng **chỉ** vì chụp ảnh hết giờ (UI-11), làm theo việc 2, không tính lần đó, và chạy tiếp cho đủ 5 lần liên tiếp đạt. Báo tổng số lần đã chạy.
     - Hỏng vì lý do khác thì phải sửa.
     - **Chạy từng lượt một**, không chạy song song hai lệnh e2e (sự cố của phiên 22).
   - Một lần không đặt biến: `UI/evidence` nguyên vẹn.

7. **Tự kiểm I6** cho `income_report`, đủ năm góc; đối chiếu bảy nguyên tắc §7.2, đặc biệt nguyên tắc 2 (không dày thông tin) và 3 (nhãn rõ nghĩa: "Còn phải thu" phải nói rõ là không theo khoảng thời gian). Ghi vào checkpoint `screens`.

8. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - khối mới `view_income_report` (logic);
   - `kit`: chỉ khi có thay đổi;
   - `screens`: trang mới, mục điều hướng, tự kiểm I6, **đề xuất** trạng thái `income_report`;
   - `main`: ráp nối mới, mốc kiểm thử, phần thu dữ liệu UI-11.
   - Thời điểm ghi trong checkpoint phải là thời điểm thật lúc ghi (xem BE-8 ở `open_issues`).

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-11:** tiếp tục thu dữ liệu (việc 2), không sửa.
- **Ô ngày hiện kiểu Mỹ** (DSK-15): việc của Desktop, không làm. Ghi vào NOTE nếu cần.
- **Giới hạn R13 đã khai:** chấp nhận ở V1, không vá.
- **Phép kiểm tĩnh `lint:e2e`** không bắt locator gán vào biến trước (Q21-1): đừng viết kiểu đó.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `GET /reports/income`, tham số `period_from`, `period_to`, kiểu `date` (`YYYY-MM-DD`). Khoảng tính cả hai đầu. `period_from` sau `period_to` → 400.
- `income_report` = `{ period_from, period_to, currencies: [{ currency, received_net_minor, refunded_minor, outstanding_minor, by_month: [{ month: 'YYYY-MM', received_net_minor }] }], generated_at }`.
  - `received_net_minor`: nhận − hoàn trong kỳ, **gồm** tiền tip và tiền của đơn đã hủy.
  - `refunded_minor`: tổng hoàn trong kỳ, `>= 0`.
  - `outstanding_minor`: tổng "còn phải thu" của mọi đơn không ở giai đoạn loại `cancelled`, **tính tới `generated_at`, không phụ thuộc kỳ**, giữ dấu.
  - `currencies`: mọi đơn vị tiền có khoản trong kỳ hoặc có đơn còn phải thu, theo thứ tự mã. `by_month`: chỉ tháng có khoản, cũ nhất trước.
- Một khoản thuộc ngày ghi trong `paid_at` của nó, theo độ lệch của chính nó. Không quy đổi tiền tệ.
- 409 `ERR_OUT_OF_RANGE`: một tổng vượt khoảng số nguyên; không có kết quả từng phần.
- `error_body.details` không có hình dạng trong hợp đồng: không đọc.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`): không trang, không workflow giao diện, không lời gọi. Watermark thuộc V4 trở đi.
- Không làm nhắc việc (D6). Không thêm lời gọi nào ngoài `get_income_report`.
- Không quy đổi tiền tệ, không cộng các đơn vị tiền với nhau, không lấp tháng trống, không biểu đồ, không xuất tệp, không lựa chọn khoảng nhanh ("tháng này", "năm ngoái"…). Đó là việc của phiên bản sau.
- Không đổi hành vi của các trang `hoàn_tất`. Chỉ thêm mục "Thu nhập" vào vùng điều hướng.
- Không dùng `window.confirm`, `alert` hay hộp thoại gốc nào.
- Không nới thời gian chờ, không thêm `retries`, không đánh dấu `skip`, `fixme` hay `flaky`.
- Không sửa Desktop (kể cả DSK-15), không sửa Backend. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không làm các mục V2.
- Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài (kể cả thư viện biểu đồ hay chọn ngày), không Tailwind.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent để code song song.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **UI-11:** báo cáo có bảng tổng hợp thời gian chụp ảnh, và liệt kê mọi lần hết giờ kèm đường dẫn trace trong `UI/test-results/ui11_traces/` (hoặc ghi rõ không có lần nào).
2. Workflow `view_income_report` có đủ thành phần; Configs ghi Data Schema 9.0.1; các ca kiểm thử bắt buộc của việc 3 đều có, gồm ca sát nửa đêm.
3. Trang `income_report` chạy đúng đặc tả D5. Kiểm thử dựng trang phủ mọi nhãn. Các trang `hoàn_tất` không đổi hành vi.
4. `npm run check` đạt (kể cả `lint:e2e`), số kiểm thử cao hơn mốc 1100.
5. Spec mới chạy riêng đạt 10/10. `npm run e2e` đạt **5/5 lần liên tiếp**, số e2e cao hơn mốc 54. Một lần không đặt biến để `UI/evidence` nguyên vẹn.
6. Kịch bản bấm thử chạy trên hệ thống thật, có ảnh chụp và đúng tên người chạy.
7. Tự kiểm I6 đủ năm góc cho `income_report`.
8. Checkpoint `view_income_report` (mới), `screens`, `main` (và `kit` nếu có đổi) theo Giao thức 07, thời điểm đúng. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
9. Mốc `%APPDATA%` không đổi.
10. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
11. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay** cho kịch bản `income_report`;
    - kết quả thu dữ liệu UI-11;
    - đề xuất trạng thái `income_report`;
    - danh sách ngoại lệ lint mới, nếu có.
