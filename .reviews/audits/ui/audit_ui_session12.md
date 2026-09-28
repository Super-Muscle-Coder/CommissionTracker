# Audit phiên 12 (B2b, trang `client_list`) — `coding-agent@2026-09-27#2`

*Orchestrator, 2026-09-27. Theo `08-operating-protocol.md`, Phần 5. Plan: `.plan/ui_plan.md` (vá máy kiểm, rồi iWCA I3 → I6).*

## Kết luận

**Chấp nhận.** Đây là trang đầu tiên của ứng dụng chạy thật từ đầu tới cuối: dữ liệu từ SQLite, qua backend, Desktop, renderer, và lên màn hình. Báo cáo của agent trung thực; mọi con số tôi chạy lại đều khớp. Không tệp nào ngoài `UI/` bị sửa.

Ba chỗ hở của phiên 11 (P1–P3) đã được vá, và tôi xác nhận cả ba nay bị bắt. Vẫn còn **hai đường nhỏ R13 bỏ sót**: agent tự khai một đường, tôi tìm thêm một. Hiện chưa có code nào dùng chúng (Q1).

Trang `client_list` đạt đủ ba loại bằng chứng I6 ở phía agent. Trang chỉ được chuyển sang `hoàn_tất` sau khi **Project Owner tự chạy kịch bản bấm thử**; hướng dẫn ở cuối báo cáo.

## Tôi kiểm lại độc lập

Linux, Node 24.14.1, cài bằng `npm ci` từ đúng `package-lock.json`. Tệp khóa không đổi so với phiên 11: không có gói mới.

| Kiểm | Kết quả |
|---|---|
| `npm run check` | Đạt: `tsc -b`, ESLint, stylelint, `check_layer` (46 tệp), Vitest **65/65** (6 tệp) |
| `npm run e2e` qua Desktop thật (Electron 44.4.5, Xvfb, `Backend.py` thật sau fixture) | **4/4**: S1, S2, S3 của `client_list`, cộng khung chính cũ |
| S3 trên máy tôi | `walkthrough:backend -- down` → trang báo "Không kết nối được", ứng dụng không đóng; `-- up` → tải lại thành công, đúng cổng cũ |
| Ảnh của agent (Windows) | S1: An, Ánh, Bảo, Dung, Đức, Zoe, và "Đã lưu trữ": Hà. S3 giữa bước: khung "Không kết nối được". Phông chữ không chân (token `font-family` đã có hiệu lực) |
| Tiến trình còn sót sau e2e | Không còn `Backend.py`, `switchable_backend`, hay Electron nào |
| Năm khối checkpoint (`main`, `kit`, `screens`, `scaffold_ui`, `manage_client`) | Parse được bằng YAML; `clause: external`; không có `UNSOLVED_PROBLEMS` |
| `walkthrough.yaml` | Đúng định dạng cố định của I6.3: `page`, `precondition`, và mỗi bước có đủ `id`, `setup`, `action`, `expect`, `covers` |
| Luật phủ | Có `unreachable` (S3, kèm tải lại sau khi backend chạy lại). Không cần `rejected_input` vì trang không có ô nhập. Không cần `rejected_system` vì người dùng không gây ra được `ERR_STORAGE_IO` bằng thao tác bình thường; nhánh này được phủ ở kiểm thử dựng trang |
| Lối vào bị loại trừ | Không có chuỗi `/watermark-*`, `/artworks`, `/verifications` nào trong `src/` |
| Phạm vi | `CLAUDE.md`, `.slnx`, `.contracts/`, `Desktop/src/`, `Backend/` không đổi |

**Bằng chứng cắn, tôi làm lại riêng:** 30 ca trên cấu hình mới.

- Cả 20 ca R1–R14 cũ (kèm chiều ngược của R5, R8) cho đúng kết quả.
- **Cả bốn chỗ hở tôi tìm ra ở phiên 11 nay bị bắt:**
  - R12, kit đọc bridge qua `document.defaultView`;
  - R14, giá trị cấu hình đi vòng qua một tệp trong `tests/`;
  - R14, kit re-export cấu hình;
  - R13, phân nhánh bằng `if` trên `kind`.
- **Thêm bốn đường mới tôi thử, đều bị bắt:**
  - `event.view` trong kit: luật dựa trên kiểu của agent báo "this expression is the global object";
  - `switch (true)` với phép so sánh `kind` trong `case`;
  - so sánh bằng toán tử `? :`;
  - tệp `.js` gọi `fetch`, bị `tsc` chặn.

**Đối chiếu hợp đồng của `manage_client`:**

- Bảng nhãn đúng từng dòng hợp đồng: `200 → ok (client_list)`, `500 → ERR_STORAGE_IO`.
- Thuật toán phân loại bốn bước đúng thứ tự I3.3, viết bằng `switch` trên `Transport.kind`, kết thúc bằng `assertNever`.
- Kiểm thân phản hồi đủ mức tối thiểu: `formats.id` (UUID v4 viết thường), `formats.timestamp` (có độ lệch múi giờ, và phải là một thời điểm thật). Trường thừa bị bỏ. `client_list` không có số nguyên nên không cần kiểm số nguyên an toàn.
- Services chỉ có quyết định trình bày: sắp theo `Intl.Collator('vi')` (hòa thì xếp theo id để ổn định), tách nhóm lưu trữ, chọn câu cho từng mã lỗi.
- Hook chỉ gọi, giữ, chuyển.
- Trang dùng `switch` đầy đủ trên cả bốn `kind`, kết thúc bằng `assertNever`.

## Phát hiện

### Q1 — R13 còn bỏ sót khi `kind` được đọc ra ngoài `switch` (mức: thấp đến trung bình)

Hai đường sau vẫn đạt `npm run check`:

- **Gán `kind` vào một biến tên khác rồi mới so sánh.** Ví dụ `const k = r.kind; return k === 'ok' ? 'a' : 'b'`, hoặc `const { kind: k } = r`. Luật mới của agent chỉ nhận ra `X.kind` và biến có tên đúng là `kind`. Đường này agent không khai; tôi tìm ra.
- **Tra bảng theo `kind`**, ví dụ `T[r.kind] ?? …`, và `.includes(kind)`. Đường này agent đã tự khai trong báo cáo.

Hiện chưa có code nào dùng hai đường này. Nhưng phiên D1 sẽ viết Services và hook có nhiều nhánh hơn hẳn.

**Đề xuất vá (đưa vào plan phiên giao diện kế tiếp):** đổi cách diễn đạt luật. Thay vì cấm từng kiểu so sánh, quy định rằng trong `logic/**` và `screens/**` (trừ tệp kiểm thử), `.kind` chỉ được đọc ở đúng một chỗ: làm biểu thức của `switch`. Luật bắt mọi `MemberExpression` có thuộc tính `kind` không phải là `discriminant` của một `SwitchStatement`, kể cả khi `kind` được tách ra bằng destructuring. Một luật như vậy đóng được cả gán biến, destructuring, tra bảng lẫn `.includes`. Chứng minh cắn cho từng dạng.

Đường truy cập qua `any` hay qua khóa tính lúc chạy (`document['default' + 'View']`) là giới hạn chung của phân tích tĩnh. Chấp nhận, và ghi vào EXPERIENCES; không đòi vá.

### Q2 — Bản ghi kịch bản ghi cứng tên người chạy (mức: thấp)

`client_list-run.json` luôn ghi `runner: "coding-agent@2026-09-27#2 (Playwright…)"`, bất kể ai chạy. Lần tôi chạy `npm run e2e` đã ghi đè ảnh và tệp này bằng một lần chạy của tôi, nhưng vẫn gán cho agent.

iWCA I6.3 đòi "người chạy luôn được ghi tên". Mỗi lần có người chạy lại, bằng chứng sẽ bị ghi đè và ghi sai tên người chạy.

**Vá:** lấy tên người chạy từ một biến môi trường (ví dụ `CT_WALKTHROUGH_RUNNER`). Nếu thiếu thì ghi rõ `unknown`, không ghi tên agent.

Bằng chứng trên đĩa hiện là lần chạy thật của agent, trên Windows; tôi không ghi gì lên thư mục `UI/evidence/` của máy bạn.

### Q3 — Kiểm thử e2e khung chính để lại thư mục tạm khi hỏng (mức: thấp)

`tests/e2e/main_layout.spec.ts` chỉ xóa thư mục dữ liệu tạm khi kiểm thử đạt. Máy tôi còn hai thư mục `ct-ui-e2e-*` từ hai lần hỏng có chủ đích ở audit phiên 11.

Kiểm thử `client_list` mới đã dọn đúng khi hỏng. Chỉ cần đưa việc xóa của spec cũ vào `finally`.

### Ghi nhận

- **S1 và S3 phải bấm "Tải lại" sau khi nạp dữ liệu mẫu.** Backend khởi động cùng Desktop, nên dữ liệu mẫu chỉ nạp được sau lần tải đầu của trang. Chấp nhận: bấm tải lại vẫn là thao tác thật của trang, và kịch bản đã ghi rõ.
- **`tests/main/main.test.tsx` đổi khẳng định** từ "không có lời gọi nào lúc khởi động" sang "đúng một lời gọi `GET /clients`". Đây là hệ quả đúng của việc trang mặc định tự tải danh sách, không phải nới kiểm thử. Kiểm thử vẫn kiểm đúng địa chỉ.
- **Lỗi của chính agent khi nạp dữ liệu mẫu.** Lần đầu công cụ gửi `client_input` trần, không bọc trong khóa `client_input`, nên backend trả 400. Agent tự tìm ra lỗi, sửa theo `endpoint_forms.http`, và ghi NOTE cho D1. Đây là đúng loại lỗi mà Adapters của D1 sẽ gặp khi làm `create_client`.
- **Hai ngoại lệ lint mới đều hợp lý:**
  - tệp kiểm thử được miễn TEST_IMPORTS: tệp kiểm thử được import helper kiểm thử, cùng lý do đã miễn R14;
  - luật kiểu của R12 tắt ở Main: đúng ngoại lệ R12 vốn có.

  Không có `eslint-disable` nào.
- **Fixture `switchable_backend.py` làm đúng cơ chế đã chốt:** con là `Backend.py` thật; đúng một `READY`; bật/tắt trên cùng cổng, thử lại nếu cổng chưa kịp giải phóng; đóng sạch khi stdin đóng. Nếu con chết lúc đang ở trạng thái `up`, fixture thoát theo mã của con, nên Desktop phản ứng đúng như khi backend thật chết.

## Trạng thái trang và việc tiếp theo

- **`client_list`:** giữ `đang_làm` trong `.design/ui_decomposition.md`. Chuyển sang `hoàn_tất` ngay khi Project Owner tự chạy kịch bản bằng tay và xác nhận S1–S3 đúng như `expect`.

  Các bước, tất cả từ `UI/`:
  1. `npm run walkthrough:app`. Chờ dòng "ĐÃ NẠP XONG", bấm "Tải lại": thấy An, Ánh, Bảo, Dung, Đức, Zoe; nhóm "Đã lưu trữ" có Hà.
  2. Mở một cửa sổ lệnh khác, chạy `npm run walkthrough:backend -- down`, bấm "Tải lại": thấy khung "Không kết nối được", ứng dụng không đóng.
  3. `npm run walkthrough:backend -- up`, bấm "Tải lại": danh sách hiện lại.
  4. Đóng ứng dụng. Chạy `npm run walkthrough:app -- --empty`: thấy hai dòng trạng thái rỗng, không có khung lỗi.
- **Chặng B hoàn tất** khi `client_list` được đánh dấu `hoàn_tất`. Chặng C (đóng gói thử) hoặc chặng D (D1 khách hàng) là bước kế.
- **Việc tồn dồn lại:**
  - UI: Q1–Q3 ở trên;
  - Desktop: Q1–Q5 của audit phiên 10 và 11, gồm bỏ qua cờ kiểm thử ở bản đóng gói, và coi lần nạp đầu bị hủy là lỗi chết;
  - Backend: xóa hai NOTE mà B1 đã đáp ứng; viết lại `claim` của EVIDENCE CORS.

## Phụ lục — Project Owner chạy kịch bản bấm thử bằng tay (Windows, 2026-09-27, 12:29–12:30)

Project Owner chạy `npm run walkthrough:app` ở một cửa sổ và `npm run walkthrough:backend -- down|up` ở cửa sổ thứ hai, theo đúng kịch bản. Kết quả Project Owner xác nhận:

- **S1 đạt:** sau khi nạp dữ liệu mẫu và bấm "Tải lại", danh sách hiện đúng.
- **S3 đạt, cả hai chiều:**
  - backend tắt rồi bấm "Tải lại" → báo mất kết nối;
  - backend bật lại rồi bấm "Tải lại" → tải được;
  - cửa sổ ứng dụng không sập ở cả hai lần.

Log khớp với xác nhận:

- fixture tắt backend lúc 12:29:34 (mã 0), rồi bật lại trên **đúng cổng 64718** lúc 12:30:19;
- đóng ứng dụng: Desktop dừng fixture, fixture dừng backend (mã 0), Electron thoát mã 0, thư mục tạm bị xóa.

**S2:** Project Owner đã chạy `walkthrough:app -- --empty` ở lần trước, lúc 12:20; ứng dụng mở và đóng sạch.

**Kết luận:** `client_list` → `hoàn_tất`, ghi vào `.design/ui_decomposition.md`. Chặng B hoàn tất.
