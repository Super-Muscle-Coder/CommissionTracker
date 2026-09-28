# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-28T23:00:00+07:00
# contract: data_schema 8.0.1, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 19 của dự án, phiên giao diện thứ năm: **chặng D2, đơn hàng.** Làm I3 → I6 cho ba trang mới, `commission_list`, `commission_detail`, `commission_form`, cùng workflow giao diện `manage_commission`. Làm thêm **UI-8** (e2e không được ghi đè bằng chứng đã commit) trước tiên.

Đặc tả của phiên là `.design/ui_decomposition.md`, mục **"Chặng D2 — Đơn hàng"** (làm lại I1 ngày 2026-09-28), cùng §5 (layout, vùng điều hướng) và §7. Đọc kỹ phần D2: mọi quyết định trình bày, luật kiểm form, câu chữ thông báo và luật phủ đã chốt ở đó. Plan này không chép lại, chỉ nêu thứ tự việc, điểm cần chú ý và tiêu chí hoàn tất.

Phía backend đã sẵn sàng: `manage_client` và `manage_commission` đều `đã_hoàn_thiện` (Data Schema 8.0.1), tiêu đề đơn hàng đã được backend kiểm "not blank" (phiên 18).

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **5 lần liên tiếp**, và `git status UI/evidence` sạch sau các lần chạy đó;
- sáu kịch bản bấm thử (ba cũ, ba mới) chạy trên hệ thống thật, có đúng tên người chạy.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 (luật git) và mục 5 (vận hành layer giao diện);
   - skill `iwca-implementation` v1.0: `iwca_theory.md` (§6, §7 ma trận R1–R14), `i3-logic.md`, `i4-kit.md`, `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`: §1, §2 (hàng `manage_commission`), §5, mục **"Chặng D2 — Đơn hàng"**, §7;
   - `.plan/open_issues.md`: UI-8; UI-6 (phần để V2, để biết những gì **không** làm);
   - hợp đồng:
     - `data_schema.yaml`: `clause_a_common` (`formats`: `not_blank`, `date`, `timestamp`, `id`, `currency_code`, `money`; luật số nguyên ±(2^53−1)); `manage_commission` (toàn mục); `manage_client.output_guaranteed`;
     - `api_contract.yaml`: `manage_commission`, `manage_client`, `error_codes`, `error_body`;
   - mọi khối checkpoint của `UI/`: `main`, `kit`, `screens`, `scaffold_ui`, `manage_client`. Khối `manage_client` là mẫu gần nhất cho workflow mới;
   - plan này sau cùng.

   Xác nhận Data Schema **`8.0.1`** và API Contract **`4.0.0`**, cả hai `approved`, `manage_commission` ở `đã_hoàn_thiện`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **241** kiểm thử.
   - `npm run e2e`: mốc **17** kiểm thử. Chạy **có** đặt `CT_WALKTHROUGH_RUNNER` (vì UI-8 chưa sửa, chạy không đặt biến sẽ ghi đè bằng chứng với tên "unknown").
   - Chụp mốc `%APPDATA%\CommissionTracker`; cuối phiên chụp lại, hai lần phải giống nhau.
   - Ghi `git status --short` lúc đầu phiên (chỉ đọc).

2. **UI-8: e2e không ghi đè bằng chứng đã commit** (`.plan/open_issues.md` UI-8).
   - Thư mục gốc của bằng chứng do **một chỗ** trong harness quyết định:
     - có `CT_WALKTHROUGH_RUNNER` (khác rỗng): `UI/evidence/`, như hiện nay;
     - không có: `UI/test-results/evidence/`. `test-results` đã có trong `UI/.gitignore`. Nếu Playwright dọn thư mục này ở đầu mỗi lần chạy thì không sao: đó là bằng chứng nháp.
   - Áp dụng cho `walkthrough_harness.ts` và `main_layout.spec.ts` (ảnh `b2a/main_layout.png`), cùng mọi spec mới của phiên này.
   - Khi không có biến, giữ nguyên hành vi còn lại: vẫn chụp ảnh, vẫn ghi `*-run.json` (runner `unknown`), chỉ khác thư mục.
   - **Bằng chứng:**
     - chạy `npm run e2e` **không** đặt biến, rồi `git status --short UI/evidence`: không có dòng nào;
     - chạy có biến: bằng chứng ghi vào `UI/evidence/` với đúng tên người chạy.

     Ghi cả hai vào EVIDENCE.
   - Ghi cách chạy mới vào NOTE cách chạy của checkpoint `main` (hoặc khối đang giữ NOTE đó).

3. **Logic: workflow giao diện `manage_commission`** (I3). Bốn thành phần như `manage_client`: `configs`, `entities`, `adapters`, `services`, `routers`, cùng khối checkpoint ở `services`.
   - **Configs:**
     - `contract.dataSchema: '8.0.1'`, `apiContract: '4.0.0'`;
     - bảng số chữ số lẻ `{ VND: 0, USD: 2 }`;
     - giới hạn tiêu đề 200;
     - gợi ý loại tranh;
     - locale hiển thị, locale sắp xếp;
     - câu chữ mọi thông báo, lấy đúng từ `ui_decomposition.md`.
     
     Chú thích `[CONTRACT]` trích đúng kiểu trong hợp đồng; luật nào là `[UI-ONLY]` thì ghi rõ.
   - **Adapters:** bảy lời gọi ở bảng "Lời gọi của workflow giao diện `manage_commission`". Kiểm hình dạng mọi phản hồi 2xx và mọi `error_body` bằng Zod, như `manage_client`; lệch hình dạng là **vi phạm hợp đồng**. `list_clients` và `get_client` là bản của workflow này, **không** import từ `manage_client` (R2).
   - **Services:**
     - sắp đơn theo `updated_at` mới nhất trước, rồi `commission_id`;
     - ghép tên khách;
     - danh sách khách chọn được (đang hoạt động, sắp tiếng Việt; ở chế độ sửa, thêm khách hiện tại nếu đã lưu trữ hoặc vắng mặt);
     - định dạng tiền và đọc số tiền theo đúng luật ở `ui_decomposition.md`, **bằng phép tính số nguyên**;
     - định dạng ngày hạn giao từ chuỗi, không qua `Date`;
     - định dạng ngày giờ tạo, sửa.
   - **Routers:** mỗi thao tác của ba trang là một lối vào; thao tác gồm hai lời gọi thì trả **một** kết quả (quy tắc ở phần D2). Kiểm form trước khi gửi, trả `rejected_input` kèm lỗi từng ô, khóa ô theo đúng tên trường của hợp đồng.
   - **Kiểm thử bắt buộc**, ngoài các ca thường:
     - bảng ví dụ đọc số tiền trong `ui_decomposition.md`, **từng dòng một**, cả VND lẫn USD; cộng thêm `9007199254740991` (đạt, VND), số vượt 2^53−1 ("Số tiền quá lớn"), dấu trừ, chữ cái, chuỗi rỗng, chỉ khoảng trắng;
     - định dạng tiền: `0 VND`, `1.500.000 VND`, `12,50 USD`, `5 USD` → `0,05 USD`, `9007199254740991` với cả VND và USD, hiện đúng từng chữ số; mã tiền lạ;
     - khứ hồi: với mọi giá trị ở trên, định dạng dạng điền sẵn rồi đọc lại ra đúng `amount_minor` ban đầu;
     - hạn giao `2026-01-01` hiện `01/01/2026` bất kể múi giờ của tiến trình kiểm thử (chạy ca này với ít nhất một múi giờ âm, ví dụ đặt `TZ=America/Los_Angeles` cho riêng ca đó hoặc cho một lần chạy riêng; ghi lại cách làm);
     - tiêu đề chỉ gồm khoảng trắng ASCII, `U+00A0`, `U+3000` → "Nhập tiêu đề đơn hàng"; tiêu đề đúng 200 ký tự có dấu (code point) đạt; 201 ký tự lỗi;
     - "Loại tranh", "Mô tả" chỉ khoảng trắng → gửi `null`; hạn giao rỗng → `null`; liên kết: dòng rỗng và dòng khoảng trắng bị bỏ, không dòng nào → `[]`;
     - sửa đơn gửi đúng đơn vị tiền cũ, kể cả khi người dùng không đụng ô tiền;
     - thao tác hai lời gọi: mỗi lời gọi hỏng (500, không tới được, vi phạm hợp đồng) cho ra đúng lỗi đó; ở `commission_detail`, `get_client` 404 không phải lỗi.

4. **Kit** (I4). Nhiều khả năng cần hai component mới, dùng phần tử HTML gốc, không thư viện ngoài:
   - `SelectField`: `<select>` có nhãn, lỗi, vô hiệu, yêu cầu focus (cùng cơ chế `focusRequest` như `TextField`);
   - `DateField`: `<input type="date">` có nhãn, lỗi, vô hiệu, yêu cầu focus; giá trị là chuỗi `YYYY-MM-DD` hoặc rỗng.

   Viền của hai component dùng `--color-border-field` và `--color-border-field-danger`. `scripts/check_contrast.mjs` phải phủ viền, viền lỗi và vòng focus của chúng, theo đúng vị trí thật trong CSS như phiên 17. Nếu một component có sẵn đã đủ thì không tạo mới; ghi lý do. Export qua `kit/index.ts` (R9).

   **Phải tự thử và ghi lại:** ô ngày và danh sách chọn của Chromium hiện đúng giao diện tối (đã có `color-scheme: dark`); chữ bên trong đọc được. Có ảnh chụp trong bằng chứng kịch bản.

5. **Màn hình** (I5). Ba trang, ba hook, theo mẫu của D1, gồm cả bài học của phiên 17:
   - cờ tải khởi tạo `true` ở mọi hook tải ngay khi mở;
   - hàng nút ngay dưới tiêu đề, hành động chính đứng đầu;
   - focus tới ô lỗi đầu tiên theo thứ tự ô ở `ui_decomposition.md`.

   Thêm:
   - mục "Đơn hàng" vào vùng điều hướng, **sau** "Khách hàng", không đổi vị trí mục cũ;
   - tham số có kiểu trong `navigation.ts`;
   - ráp nối `manage_commission` ở Main và `logic_context`.

   **Kiểm thử dựng trang:**
   - mọi nhãn ở phần D2, cho từng lời gọi;
   - lần vẽ đầu của cả ba trang;
   - form ở chế độ sửa: đơn vị tiền không chọn được;
   - form khi không có khách đang hoạt động: trạng thái rỗng và nút "Thêm khách hàng";
   - khách đã lưu trữ xuất hiện với nhãn "(đã lưu trữ)" ở chế độ sửa;
   - focus khi lỗi ở ô "Khách hàng" và khi lỗi chỉ ở ô số tiền;
   - liên kết tham khảo hiện dạng chữ, không phải phần tử liên kết.

   Không thay đổi hành vi của ba trang D1. Kiểm thử của chúng phải vẫn đạt.

6. **Kịch bản bấm thử và e2e** (I6.3). Ba `walkthrough.yaml` mới, theo luật phủ D2. Spec e2e mới chạy trên hệ thống thật, dùng `walkthrough_harness.ts` và fixture `switchable_backend.py` cho bước `unreachable`. Tín hiệu "đã tải xong" là **nội dung đã tải**, không phải trạng thái nút (bài học UI-4); mọi phép so "không đổi" phải khẳng định giá trị trước khác rỗng. Kịch bản phải tạo khách hàng của chính nó; không dựa vào dữ liệu của kịch bản khác.
   - Chạy `npm run e2e` **5 lần liên tiếp**, cả 5 lần đạt, với `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`; ghi dòng tổng kết từng lần. Sau đó chạy thêm một lần **không** đặt biến để chứng minh UI-8 (việc 2).
   - Ảnh chụp của ba kịch bản D1 được chụp lại trong lần chạy có biến; đó là điều bình thường.

7. **Tự kiểm I6** cho ba trang mới, đủ năm góc; đối chiếu bảy nguyên tắc §7.2. Ghi vào checkpoint `screens`.

8. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - khối mới `manage_commission` (logic): các quyết định ở việc 3, luật nào sao từ hợp đồng, luật nào `[UI-ONLY]`, bằng chứng;
   - `kit`: component mới, cặp tương phản mới;
   - `screens`: ba trang, điều hướng, tự kiểm I6, **đề xuất** trạng thái ba trang (không sửa `ui_decomposition.md`);
   - `main`: ráp nối mới, mốc kiểm thử mới, UI-8.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **Giới hạn R13 đã khai** (đọc qua `any`, qua khóa tính lúc chạy, qua hàm generic): Orchestrator chấp nhận ở V1, không vá.
- **Khoảng trắng hiếm:** `trim` của JavaScript và `str.strip` của Python khác nhau ở `U+001C..U+001F`, `U+0085` và `U+FEFF`. Backend là bên quyết định; giao diện hiện 400 chung. Áp dụng như nhau cho tiêu đề đơn.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `commission_input` (Data Schema 8.0.1): `{ client_id: id, title: string (1..200 characters, not blank), description: string|null, commission_type: string|null, agreed_price: money (amount_minor >= 0; currency in supported_currencies), deadline: date|null, reference_links: list[string] }`. Đủ bảy khóa, không khóa thừa (backend kiểm `extra=forbid`, kiểu chặt).
- `description` của workflow `manage_commission` ghi: không tạo được đơn cho, hay chuyển đơn sang, khách không tồn tại hoặc đã lưu trữ (404, 409); đơn vị tiền cố định từ lúc tạo, sửa chỉ đổi được số tiền (409). Giữ nguyên khách cũ dù khách đó đã lưu trữ sau khi tạo đơn thì được.
- `money` = `{ amount_minor: integer (±(2^53−1)), currency: currency_code }`, đơn vị nhỏ nhất ISO 4217; **không bao giờ là số thực**.
- `commission_list` và `commission_detail`: hình dạng đúng như hợp đồng; hợp đồng không hứa thứ tự.
- `list_currencies` chỉ có nhãn 200.
- `error_body.details` không có hình dạng trong hợp đồng: không đọc. Phân biệt lỗi chỉ bằng nhãn (và `code` nếu cần).

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`): không trang, không workflow giao diện, không lời gọi. Watermark thuộc V4 trở đi.
- Không làm tiến độ (D3), thanh toán (D4) hay bất kỳ lời gọi nào ngoài bảy lời gọi của phần D2. Không thêm lối "Tạo đơn cho khách này" ở `client_detail`; D1 không đổi. Việc nào cần một điều chưa có trong `ui_decomposition.md` thì **dừng và báo**.
- Không làm liên kết bấm mở được. Desktop chặn điều hướng, và hợp đồng không có lối vào để mở trình duyệt ngoài.
- Không làm các mục V2: Enter để lưu, chặn rời form, chống tạo trùng khi gửi lại `POST`, lọc hay tìm kiếm đơn, đánh dấu đơn quá hạn.
- Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài (kể cả thư viện chọn ngày), không Tailwind.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore` hay lệnh nào đổi trạng thái kho. Chỉ được đọc (`git status`, `git diff`).
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent để code song song.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **UI-8:** chạy `npm run e2e` không đặt `CT_WALKTHROUGH_RUNNER` thì `git status --short UI/evidence` rỗng; có đặt thì bằng chứng ghi đúng chỗ và đúng tên người chạy. Có cả hai trong EVIDENCE.
2. Workflow `manage_commission` có đủ thành phần; Configs ghi Data Schema 8.0.1; bảng ví dụ đọc số tiền được kiểm từng dòng; khứ hồi định dạng rồi đọc lại đúng; ca ngày hạn giao với múi giờ âm; ca tiêu đề khoảng trắng Unicode.
3. Ba trang chạy đúng đặc tả phần D2; kiểm thử dựng trang phủ mọi nhãn; ba trang D1 không đổi hành vi.
4. `npm run check` đạt, với số kiểm thử cao hơn mốc 241; tương phản phủ component mới.
5. `npm run e2e` đạt **5/5 lần liên tiếp**, có dòng tổng kết từng lần; số e2e cao hơn mốc 17.
6. Sáu kịch bản bấm thử chạy trên hệ thống thật, có ảnh chụp và đúng tên người chạy; ba kịch bản mới thỏa luật phủ D2.
7. Tự kiểm I6 đủ năm góc cho ba trang mới, đã đối chiếu §7.2.
8. Checkpoint `manage_commission` (mới), `kit`, `screens`, `main` theo Giao thức 07. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
9. Mốc `%APPDATA%` không đổi.
10. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê chúng trong báo cáo.
11. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay cho ba kịch bản mới**;
    - đề xuất trạng thái của ba trang;
    - danh sách ngoại lệ lint mới, nếu có.
