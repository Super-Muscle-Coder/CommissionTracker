# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-28T12:00:00+07:00
# contract: data_schema 7.0.0, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 17 của dự án, phiên giao diện thứ tư. Đây là **phiên vá của chặng D1**: sửa mọi chỗ chưa đạt mà audit phiên 16 tìm ra, để ba trang `client_list`, `client_detail`, `client_form` đủ điều kiện `hoàn_tất`. Phiên này **không** thêm trang, không thêm lời gọi, không làm D2.

Nguồn:
- `.reviews/` là vùng agent không đọc. Mọi phát hiện cần biết đã được chép sang `.plan/open_issues.md` (mục UI-4, UI-5, UI-6, CT-2);
- `.design/ui_decomposition.md` đã được cập nhật sau audit, gồm §5 `client_form` và §7.1, §7.2. Đọc kỹ: đó là đặc tả của phiên này.

Phiên có năm phần, làm theo thứ tự:

1. **UI-4:** e2e phải tất định.
2. **CT-2 phía giao diện:** hợp đồng lên Data Schema 7.0.0; luật "not blank" của `client_input`.
3. **Tương phản 3:1 cho thành phần tương tác** (§7.1 mới), máy kiểm.
4. **Hàng nút của form dưới tiêu đề trang** (§7.2, nguyên tắc 7), và **focus tới ô lỗi đầu tiên** (§7.2, nguyên tắc 4).
5. Cập nhật kịch bản bấm thử, tự kiểm I6, checkpoint.

**Điểm dừng:**
- `npm run e2e` đạt **5 lần liên tiếp**;
- `npm run check` đạt;
- ba kịch bản bấm thử chạy lại trên hệ thống thật.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 5 (vận hành layer giao diện, "Hướng giao diện V1");
   - skill `iwca-implementation` v1.0: `iwca_theory.md` (§6, §7 ma trận R1–R14), `i3-logic.md` (Bước I3.4, I3.5), `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`: §5 (ba trang D1, luật phủ) và §7, **bản cập nhật ngày 2026-09-28 sau audit phiên 16**;
   - `.plan/open_issues.md`: UI-4, UI-5, UI-6, CT-2;
   - hợp đồng: `data_schema.yaml`: changelog `v7.0.0`, `clause_a_common.formats.not_blank`, `manage_client.input_expected.client_input`; `api_contract.yaml`: `manage_client` (không đổi);
   - mọi khối checkpoint của `UI/`: `main`, `kit`, `screens`, `scaffold_ui`, `manage_client`;
   - plan này sau cùng.

   Xác nhận Data Schema **`7.0.0`** và API Contract **`4.0.0`**, cả hai `approved`. Bản 7.0.0 ghi `manage_client` ở `đang_triển_khai`. Đó là việc của **backend**, làm ở một phiên backend riêng, không phải phiên này. Phía giao diện, API Contract không đổi: nhãn và mã lỗi giữ nguyên.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node và npm; chạy `npm ci`.
   - Chạy `npm run check`: mốc là **225** kiểm thử.
   - Chạy `npm run e2e` và ghi kết quả thật, kể cả khi hỏng (UI-4 có thể làm nó hỏng trên máy này).
   - Chụp mốc `%APPDATA%\CommissionTracker`; cuối phiên chụp lại, hai lần phải giống nhau.

2. **UI-4: e2e tất định** (`.plan/open_issues.md` UI-4).
   - **Hook:** cờ tải của hook nào tải ngay khi trang mở thì khởi tạo là `true`: `use_client_list.loading`, `use_client_detail.loading`, `use_client_form.opening`. Như vậy lần vẽ đầu đã là trạng thái đang tải: có chỉ báo đang tải, nút "Tải lại" chưa bật. Giữ nguyên cơ chế chống gửi hai lần hiện có.
   - **Kiểm thử dựng trang:** thêm ca "lần vẽ đầu" cho cả ba trang. Trước khi Routers trả lời, trang hiện chỉ báo đang tải và không có nút nào đang bật mà bấm vào sẽ gọi phía sau.
   - **Spec e2e:** không spec nào được dùng trạng thái nút làm tín hiệu "đã tải xong". Chờ **nội dung đã tải**: danh sách có tên, hoặc trạng thái rỗng, hoặc thông báo lỗi. Sửa ít nhất:
     - `walkthrough_harness.ts`: `launch`, `reloadList`, `goToList`;
     - `client_form_walkthrough.spec.ts`: S2 (dòng đọc `before` và dòng so sánh sau "Hủy") và S5.

     Rà mọi spec khác theo cùng tiêu chí.
   - **Phép so không được đạt suông:** ở `client_form` S2, khẳng định `before` **khác rỗng** trước khi so. Làm tương tự cho mọi phép so "không đổi" khác.
   - **Bằng chứng:**
     - chạy `npm run e2e` **5 lần liên tiếp**, cả 5 lần đạt; ghi dòng tổng kết của từng lần vào EVIDENCE;
     - chứng minh bản sửa có tác dụng: tạm đặt lại cờ về `false`, cho thấy kiểm thử dựng trang mới hỏng, rồi khôi phục.

3. **CT-2 phía giao diện** (Data Schema 7.0.0).
   - **Configs `manage_client`:**
     - `contract.dataSchema` → `'7.0.0'`;
     - các chú thích `[CONTRACT]` trích đúng kiểu `client_input` mới (`not blank` cho `display_name`, `channel`, `value`) và `formats.not_blank`;
     - chú thích của các giá trị khác đang ghi `data_schema.yaml 6.2.0` thì cập nhật số phiên bản nếu nội dung không đổi.
   - **Luật kiểm ở Routers:** hành vi giữ nguyên (đã đúng hợp đồng mới). Sửa chú thích và checkpoint cho khớp `ui_decomposition.md` §5: luật nào sao từ hợp đồng, luật nào `[UI-ONLY]`. `[UI-ONLY]` gồm: bỏ khoảng trắng trước khi gửi; bỏ hàng trống cả hai ô; ghi chú rỗng thành `null`.
   - **NOTE về CT-2** trong checkpoint `manage_client`, mà phiên 16 để lại cho Orchestrator: đóng lại. Chuyển thành EXPERIENCES, nói rõ hợp đồng 7.0.0 đã giải quyết.
   - **Kiểm thử:** thêm ca tên chỉ gồm ký tự khoảng trắng Unicode, ví dụ khoảng trắng không ngắt `U+00A0` hoặc tab. Routers phải báo lỗi "Nhập tên khách hàng". Giữ các ca cũ.
   - **Không** đọc `error_body.details`, như cũ. Nếu backend trả 400 (ví dụ vì một ký tự điều khiển hiếm mà `trim` của JS không bỏ), giao diện hiện thông báo lỗi 400 chung. Đây là hành vi đúng, đã có kiểm thử dựng trang.

4. **Tương phản 3:1 cho thành phần tương tác** (§7.1 mới; WCAG 2.1 tiêu chí 1.4.11).
   - **Token:** tách viền của **ô nhập** khỏi viền trang trí. Thêm một role token riêng cho viền ô nhập, tên do bạn đặt theo vai trò, ví dụ `--color-border-field`. `TextField` và `TextArea` dùng token này. Viền của khung, danh sách và `DescriptionList` giữ `--color-border` và có thể nhạt như cũ.
   - **Phép kiểm:** mở rộng `scripts/check_contrast.mjs` với nhóm cặp **phi văn bản**, ngưỡng **≥ 3:1**, khai báo ngay trong script như nhóm chữ. Ít nhất các cặp sau, trên đúng nền ngay cạnh nó theo nơi dùng thật:
     - viền ô nhập;
     - viền ô nhập lỗi;
     - vòng focus: nền trang, và nền nút chính nếu vòng focus nằm sát nút;
     - vạch đánh dấu mục điều hướng đang mở.

     Trạng thái vô hiệu được miễn (WCAG). Nhóm chữ ≥ 4.5:1 giữ nguyên. Kết quả in ra phải ghi rõ nhóm của từng cặp.
   - **Lưu ý đo được:** vòng focus `#8fb0e8` trên nút chính `#3a66b5` chỉ đạt khoảng 2.55:1. Hiện `outline-offset` đặt vòng focus nằm **ngoài** nút, trên nền trang, và ở đó đạt 7.74:1. Hãy khai báo cặp theo đúng vị trí thật và chứng minh bằng CSS đang dùng. Nếu có chỗ vòng focus nằm sát hay đè lên nút thì phải đạt 3:1 với nút.
   - **Bằng chứng cắn:** tạm hạ viền ô nhập xuống một giá trị dưới 3:1, cho thấy `check` hỏng, rồi khôi phục.

5. **Hàng nút và focus ở `client_form`** (`ui_decomposition.md` §5 `client_form`; §7.2, nguyên tắc 4 và 7).
   - **Hàng nút:** hàng "Lưu" (chính, đứng đầu) và "Hủy" đặt **ngay dưới tiêu đề trang**, như hàng nút ở `client_list` và `client_detail`. Thông báo kết quả lưu ("Chưa lưu được", "Không kết nối được"…) đặt giữa hàng nút và các ô, hoặc ngay dưới hàng nút. Ở trạng thái mở form bị lỗi (`rejected`, `unreachable` khi mở), giữ nguyên cách hiện hiện nay.
   - **Focus:** khi lưu trả `rejected` với `origin: 'input'`, con trỏ nhập chuyển tới **ô lỗi đầu tiên theo thứ tự trên màn hình**: tên, rồi từng hàng liên hệ (kênh trước, giá trị sau), rồi ghi chú.
     - Cơ chế nằm ở kit và màn hình, **không** dùng biến toàn cục DOM (`document`, `window`) ở phân khu màn hình (R11).
     - Ví dụ: `TextField` và `TextArea` nhận ref hoặc một cách yêu cầu focus qua props. Thiết kế cụ thể do bạn chọn, miễn đúng R7–R11.
     - Việc chọn **ô nào** là ô đầu tiên là việc trình bày của trang, dựa trên `fieldErrors` và thứ tự ô đang hiện. Không đưa việc này vào logic.
   - **Không làm:** Enter để lưu, giữ focus khi nút đang bận, chặn rời form. Đó là việc của V2 (UI-6).
   - **Kiểm thử dựng trang:** hàng nút nằm trước ô đầu tiên trong thứ tự tài liệu. Sau `rejected_input`, ô được focus là ô lỗi đầu tiên; thử ít nhất hai ca, lỗi ở tên, và lỗi chỉ ở hàng liên hệ thứ hai.

6. **Kịch bản bấm thử và e2e** (I6.3; luật phủ D1 không đổi).
   - Sửa `client_form/walkthrough.yaml`:
     - vị trí nút mới;
     - ở S2 và S4, thêm kỳ vọng "con trỏ nhập nằm ở ô lỗi đầu tiên";
     - S2 đã gõ tên chỉ gồm khoảng trắng: giữ bước này.
   - Sửa hai kịch bản kia nếu câu chữ hay vị trí thay đổi.
   - Spec e2e kiểm focus bằng `toBeFocused()`.
   - Chạy lại đủ ba kịch bản trên hệ thống thật, với `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`; ảnh chụp mới thay ảnh cũ.

7. **Tự kiểm I6** cho ba trang, đủ năm góc. Ở góc người dùng, đối chiếu lại **bảy nguyên tắc §7.2** theo bản mới, đặc biệt 4 và 7. Ghi vào checkpoint `screens`.

8. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - `manage_client`: hợp đồng 7.0.0; luật nào sao từ hợp đồng, luật nào `[UI-ONLY]`; đóng NOTE về CT-2;
   - `kit`: token viền ô nhập; nhóm cặp phi văn bản của `check_contrast` và bằng chứng cắn; khả năng yêu cầu focus;
   - `screens`: UI-4 (cờ tải, lần vẽ đầu, 5 lần e2e); hàng nút của form; focus; đối chiếu §7.2; đề xuất trạng thái ba trang (chỉ đề xuất, không sửa `ui_decomposition.md`);
   - `main`: cập nhật dòng mốc và dòng kiểm cuối.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **NOTE ở checkpoint `manage_client` về luật hàng liên hệ:** đã được giải quyết bằng hợp đồng 7.0.0 (CT-2). Đóng ở việc 3.
- **NOTE về vị trí nút "Lưu"** (phiên 16 ghi lệch nguyên tắc 7): giải quyết ở việc 5.
- **Giới hạn R13 đã khai** (đọc qua `any`, qua khóa tính lúc chạy, qua hàm generic): Orchestrator chấp nhận ở V1, không vá.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `client_input` (Data Schema 7.0.0) = `{ display_name: string (1..120 characters, not blank), contacts: list[{ channel: string (1.. characters, not blank), value: string (1.. characters, not blank) }], note: string|null }`.
- `formats.not_blank`: sau khi bỏ khoảng trắng ở hai đầu còn ít nhất một ký tự. Đây chỉ là **phép kiểm**: giá trị được lưu đúng như gửi đi.
- Hợp đồng không giới hạn số liên hệ, và không cấm tên trùng.
- Nhãn không đổi (API Contract 4.0.0):
  - `create_client`: 201, 400, 500;
  - `get_client`: 200, 404, 500;
  - `edit_client`: 200, 400, 404, 500;
  - `set_client_archived`: 200, 400, 404, 500;
  - `list_clients`: 200, 500.
- `error_body.details` không có hình dạng trong hợp đồng: không đọc.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`): không trang, không workflow giao diện, không lời gọi. Watermark thuộc V4 trở đi.
- Không thêm trang, không thêm lời gọi, không làm D2. Việc nào cần một điều chưa có trong `ui_decomposition.md` thì **dừng và báo**.
- Không làm các mục V2 của UI-6: Enter để lưu, giữ focus khi nút bận, tiêu đề trang chi tiết, chống tạo trùng khi gửi lại `POST`. Không chặn rời form.
- Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài, không Tailwind.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- **Không sửa Backend**, dù `manage_client` đang ở `đang_triển_khai`: phần đó có phiên backend riêng. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **UI-4:** ba cờ tải khởi tạo `true`, có kiểm thử lần vẽ đầu, có bằng chứng kiểm thử đó cắn. Không spec nào còn chờ trạng thái nút làm tín hiệu đã tải. `npm run e2e` đạt **5/5 lần liên tiếp**, có dòng tổng kết từng lần.
2. **CT-2:** Configs ghi Data Schema 7.0.0; chú thích và checkpoint phân rõ luật hợp đồng và `[UI-ONLY]`; có ca khoảng trắng Unicode; NOTE cũ đã đóng.
3. **Tương phản:** `check_contrast` kiểm cả nhóm phi văn bản (≥ 3:1), có token viền ô nhập riêng, có bằng chứng cắn. Nhóm chữ vẫn ≥ 4.5:1.
4. **Form:** hàng nút dưới tiêu đề; focus tới ô lỗi đầu tiên, có kiểm thử dựng trang và kiểm e2e. Không biến toàn cục DOM ở phân khu màn hình.
5. `npm run check` đạt, với số kiểm thử cao hơn mốc 225.
6. Ba kịch bản bấm thử đã cập nhật, chạy lại trên hệ thống thật, có ảnh chụp mới và đúng tên người chạy.
7. Tự kiểm I6 đủ năm góc, đã đối chiếu §7.2 bản mới.
8. Checkpoint `manage_client`, `kit`, `screens`, `main` theo Giao thức 07. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
9. Mốc `%APPDATA%` không đổi.
10. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay cho cả ba kịch bản**, theo bản mới;
    - đề xuất trạng thái của ba trang;
    - danh sách ngoại lệ lint mới, nếu có.
