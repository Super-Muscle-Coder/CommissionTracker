# AUDIT — PHIÊN 19 (LAYER GIAO DIỆN, CHẶNG D2: ĐƠN HÀNG; UI-8)

*Orchestrator, 2026-09-29. Đối chiếu với `.plan/ui_plan.md` (plan phiên 19), `.design/ui_decomposition.md` mục "Chặng D2 — Đơn hàng", Data Schema 8.0.1, API Contract 4.0.0, và các khối checkpoint `main`, `kit`, `screens`, `manage_commission` trong `UI/`. Định danh phiên của agent: `coding-agent@2026-09-29#1`. Mốc so sánh: commit `a290db1`.*

## 1. Kết luận

**Đạt về chức năng; chưa đạt về độ ổn định của e2e.**

Toàn bộ mã sản phẩm của D2 được xác nhận độc lập:
- logic, kit, ba trang, điều hướng;
- UI-8;
- tương phản.

Không tìm thấy lỗi hành vi nào.

Nhưng e2e **không tất định trên máy thứ hai**: `commission_form` S2 hỏng khoảng 1/6 số lần (Q19-1). Nguyên nhân nằm ở spec, không ở sản phẩm, và đã được xác định chắc bằng thí nghiệm.

Theo luật "EVIDENCE chỉ đạt khi chạy lại ổn định", cùng tiền lệ UI-4 ở audit phiên 16, **ba trang D2 giữ `đang_làm`** cho tới khi UI-9 được vá và e2e ổn định trở lại.

## 2. Phạm vi sửa

So thời điểm sửa và nội dung của mọi tệp trong `UI/src`, `UI/tests`, `UI/scripts` trên máy Project Owner với commit `a290db1`:
- **đúng 42 tệp đổi hoặc mới**, khớp danh sách `git status` trong báo cáo (không tính `UI/evidence`);
- mọi tệp khác giống hệt bản đã commit;
- `Desktop/`, `Backend/`, `.contracts/`, `.plan/`, `.design/` không đổi.

Thay đổi duy nhất chạm vào D1:
- `ClientList.tsx` truyền thêm `detail: null` cho `ItemList`;
- `ItemList` có thêm dòng phụ tùy chọn.

Hành vi D1 không đổi, và kiểm thử D1 vẫn đạt.

`UI/evidence/`:
- 27 tệp D1 được chụp lại với tên người chạy của phiên;
- 27 tệp D2 mới;
- ba bản ghi `commission_*-run.json` ghi runner `coding-agent@2026-09-29#1`, mọi bước `passed`.

Việc này là đúng: đó là các lần chạy có đặt biến.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1, Xvfb. `node_modules` cài từ đúng `package-lock.json`, không đổi từ phiên 11. Backend ở trạng thái phiên 18 (`db7eeb3`).

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 555 kiểm thử, 30 cặp tương phản | 555/555, hai lần; 19 cặp chữ + 11 cặp phi văn bản, tất cả đạt; 95 tệp, không vi phạm R1–R14 | khớp |
| `npm run e2e` | 5/5 lần, mỗi lần 32 | **9 lần, 7 lần đạt 32/32, 2 lần hỏng** ở `commission_form` S2 | **không ổn định** (Q19-1) |
| Riêng spec `commission_form` | — | 22 lần, 3 lần hỏng, đều cùng một khẳng định | xác nhận Q19-1 |
| UI-8, chạy không đặt biến | `UI/evidence` không đổi | Băm SHA-1 toàn bộ `UI/evidence` trước và sau 3 lần chạy: **giống hệt**. Bằng chứng nháp nằm ở `UI/test-results/evidence/` | đạt |
| Cờ tải lần vẽ đầu | có kiểm thử | Cắn: đặt cờ về `false` ở từng hook thì hỏng 1 / 1 / 2 ca; khôi phục thì đạt | đạt |
| Đọc số tiền | bảng ví dụ, khứ hồi | **Fuzz 12.000 chuỗi** (ngẫu nhiên, và số có dấu nhóm quanh 2^53) so với một bản tham chiếu Orchestrator tự viết độc lập theo đặc tả: **khớp 100%**, cả VND lẫn USD | đạt |
| Checkpoint | 6 khối parse được | Parse lại cả 6 khối: hợp lệ; không `UNSOLVED_PROBLEMS`; `manage_commission` là khối mới, `clause: external` | đạt |
| Lời gọi bị loại trừ | không có | Tìm trong `src/`: không có `watermark` nào; không có phần tử `<a>` hay `href` nào | đạt |
| Giao diện tối của ô chọn và ô ngày | đạt | Xem ảnh `commission_form-S1-filled.png` và `commission_list-S2.png`: nền tối, chữ rõ; danh sách đúng đặc tả | đạt; ô ngày hiện kiểu Mỹ (Q19-2) |

## 4. Đối chiếu với đặc tả D2

- **Lời gọi:** đúng bảy lời gọi của bảng D2.
  - `list_clients` và `get_client` là bản riêng của workflow, không import `manage_client` (R2; `check_layer` đạt).
  - Thao tác hai lời gọi trả **một** kết quả.
  - `get_client` 404 ở trang chi tiết không phải lỗi.
- **Số tiền:**
  - đọc bằng chuỗi chữ số, so với 2^53−1 bằng so sánh chuỗi, không qua số thực;
  - định dạng bằng `String(amount_minor)` rồi cắt chuỗi;
  - thông báo đúng câu chữ ("Số tiền không hợp lệ.", "Số tiền quá lớn.", "Nhập giá thỏa thuận.").
- **Ngày hạn giao:** cắt từ chuỗi, có kiểm thử ở múi giờ âm.
- **Form:**
  - văn bản tùy chọn để trống gửi `null`;
  - liên kết tách theo dòng, bỏ dòng rỗng;
  - đơn vị tiền khóa ở chế độ sửa;
  - khách đã lưu trữ được giữ, có nhãn;
  - không có khách đang hoạt động thì hiện trạng thái rỗng;
  - focus tới ô lỗi đầu tiên.
- **Chỗ làm khác chữ của plan:** agent đặt việc đọc số tiền ở Routers thay vì Services. Orchestrator đồng ý: đó là chuyển đổi định dạng ở ranh giới (iWCA I3.5), đúng tiền lệ `manage_client`. Lối vào `reloadClientChoices` là cách hiện thực câu "tải lại danh sách khách" của đặc tả, không phải việc thêm.

## 5. Phát hiện

### Q19-1 (trung bình, chặn `hoàn_tất`) — e2e `commission_form` S2 không tất định

**Hiện tượng:** S2 khẳng định đơn đứng đầu danh sách là "Tranh nhóm ba người", tức đơn vừa tạo ở S1. Thỉnh thoảng đơn đứng đầu lại là "Minh họa bìa sách", là đơn mẫu tạo cuối.

**Nguyên nhân:**
- Backend ghi `updated_at` chính xác tới giây. Giao diện sắp theo `updated_at` mới nhất trước, rồi theo `commission_id` (UUID ngẫu nhiên), đúng đặc tả.
- Hàm `seedCommissionSample` giãn các đơn mẫu cách nhau 1,1 s, nhưng **không** chờ sau đơn cuối.
- Trên máy Linux, S1 lưu xong chỉ khoảng 0,7 s sau khi nạp dữ liệu mẫu, nên hai đơn trùng giây. Khi đó thứ tự phụ thuộc hai UUID ngẫu nhiên.
- Trên máy Windows, chậm hơn, nên việc trùng giây hiếm gặp. Đó là lý do agent đạt 5/5.

**Thí nghiệm:**
- thêm chờ 1,1 s sau khi nạp mẫu, trên bản sao: **8/8 lần đạt**;
- bỏ chờ: 3 lần hỏng trên 22 lần.

**Sản phẩm không sai.** Hai đơn lưu trong cùng một giây có thứ tự ổn định nhưng tùy ý (theo `commission_id`). Điều này chấp nhận được ở V1, nhưng đáng ghi lại.

**Việc sửa** (UI-9):
- `seedCommissionSample` chờ thêm hơn 1 s **sau** đơn mẫu cuối, để mọi lần ghi của kịch bản chắc chắn mới hơn;
- rà mọi khẳng định về vị trí trong danh sách: chỗ nào có thể trùng giây với một lần ghi khác thì tìm theo tên, không theo vị trí.

Tiêu chí: `npm run e2e` đạt 5/5 trên Windows, **và** Orchestrator chạy lại trên Linux đạt ổn định.

### Q19-2 (thấp) — ô ngày hiện tháng/ngày/năm

Ô "Hạn giao" hiện `11/30/2026`, trong khi trang chi tiết và danh sách hiện `30/11/2026`. Nguyên nhân là locale của Electron đang là `en-US`, và giao diện không đổi được; agent đã ghi NOTE ở checkpoint `kit`.

Hướng xử lý thuộc desktop Main: đặt ngôn ngữ ứng dụng là tiếng Việt trước sự kiện `ready`. Orchestrator **chưa kiểm** cách nào của Electron 44 đổi được định dạng của `<input type="date">`; phiên desktop phải đo trên máy thật. Ghi thành DSK-15, gộp vào phiên desktop dọn dẹp (cùng DSK-12, 13, 14).

### Q19-3 (thấp) — nhãn "Không tìm thấy khách hàng (đã lưu trữ)"

Khi khách hiện tại của đơn không còn trong danh sách (ở chế độ sửa), nhãn có thêm "(đã lưu trữ)" dù không biết khách đã lưu trữ. Trường hợp này không xảy ra ở V1, vì không có thao tác xóa khách. Nên đổi thành "Không tìm thấy khách hàng". Rẻ; gộp vào UI-9.

### Q19-4 — hai chỗ sai của chính plan (Orchestrator)

Agent chỉ ra đúng hai chỗ:
- Plan ghi `money` và `currency_code` thuộc `formats`; thật ra chúng thuộc `clause_a_common.types`.
- "Điểm dừng" của plan đòi "`git status UI/evidence` sạch sau các lần chạy đó". Điều này mâu thuẫn với chính yêu cầu chạy 5 lần có tên người chạy, vốn phải ghi vào `UI/evidence`. Ý đúng, và tiêu chí hoàn tất số 1 đã ghi đúng: lần chạy **không** đặt biến thì không đổi gì.

Không ảnh hưởng kết quả. Ghi lại để plan sau cẩn thận hơn.

### Ghi nhận khác

- Lần chạy e2e mốc đầu phiên hỏng một lần (hết giờ chờ khi chụp ảnh ở `client_detail` S4), và có một lúc e2e chậm bất thường (6,9 phút). Cả hai trên Windows, không tái hiện ở máy thứ hai. Chưa đủ dữ liệu để kết luận; theo dõi ở phiên sau.
- `%APPDATA%\CommissionTracker` trên máy Project Owner có `data.db` từ ngày 28/09, là dữ liệu của lần anh tự dùng ứng dụng. Agent đo đầu và cuối phiên: giống hệt.

## 6. Trạng thái trang

`commission_list`, `commission_detail`, `commission_form`: **giữ `đang_làm`**.

Chuyển `hoàn_tất` khi đủ ba điều:
1. UI-9 được vá, e2e ổn định trên cả hai máy;
2. audit của lần vá đạt;
3. Project Owner tự chạy tay ba kịch bản. Các bước nằm ở cuối báo cáo của agent phiên 19 và trong ba `walkthrough.yaml`.

Project Owner có thể chạy tay ngay bây giờ: UI-9 chỉ sửa spec kiểm thử, không đổi màn hình.

## 7. Commit

Sản phẩm của phiên 19 đúng và đã được xác nhận, nên commit được ngay dưới tên `CAS19`, gồm cả `UI/evidence` (bằng chứng có tên người chạy). UI-9 sẽ là một commit `CAS` riêng.
