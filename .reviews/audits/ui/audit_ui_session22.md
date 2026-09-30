# AUDIT — PHIÊN 22 (LAYER GIAO DIỆN, CHẶNG D4: THANH TOÁN; THU DỮ LIỆU UI-11)

*Orchestrator, 2026-09-30. Đối chiếu với `.plan/ui_plan.md` (plan phiên 22), `.design/ui_decomposition.md` mục "Chặng D4 — Thanh toán", Data Schema 9.0.0, API Contract 4.0.0, và các khối checkpoint `main`, `kit`, `screens`, `record_payment`. Định danh phiên của agent: `coding-agent@2026-09-30#1`. Mốc so sánh: commit `b941b63` (trên `a4dfe72`, `CAS21`).*

## 1. Kết luận

**Đạt.** Mọi khẳng định của báo cáo được xác nhận độc lập trên máy thứ hai, và mọi bằng chứng đều ổn định. Không tìm thấy lỗi hành vi nào.

Ba trang `payment_list`, `payment_form`, `commission_detail` (có thêm phần Thanh toán) **đủ điều kiện `hoàn_tất` về phía Orchestrator**, chờ Project Owner tự chạy tay.

## 2. Phạm vi sửa

So nội dung mọi tệp trong `UI/src`, `UI/tests`, `UI/scripts` trên máy Project Owner với commit `b941b63`: **đúng 47 tệp đổi hoặc mới**, khớp báo cáo. `UI/package.json` không đổi. Mọi tệp khác giống hệt bản đã commit.

Năm trang đã `hoàn_tất` (`client_list`, `commission_list`, `progress_board`, `commission_form`, `stage_change`) chỉ đổi đúng những dòng truyền thêm `action: null`, `onAction={null}`, `hint={null}` cho component kit mới mở rộng. Hành vi không đổi, và kiểm thử của chúng vẫn đạt.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24, Xvfb; Backend ở trạng thái phiên 18 (chưa có BE-7).

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 1100 | 1100/1100, hai lần; 13 cặp phi văn bản đạt; 133 tệp, không vi phạm R1–R14; `lint:e2e` sạch | khớp |
| Vitest lặp lại | một lần `StageChange` hỏng | **10/10 lần** toàn bộ đạt | không tái hiện |
| Spec riêng | 10/10 mỗi spec | `payment_list` 12/12, `payment_form` 12/12, `commission_detail` 12/12 | ổn định |
| `npm run e2e` | 5/5, mỗi lần 54 | **6/6, mỗi lần 54**, không đặt biến | ổn định |
| UI-8 | nguyên vẹn | Băm toàn bộ `UI/evidence` trước và sau 6 lần: giống hệt | đạt |
| Cắn: số tiền 0 | công cụ chặn, chưa làm | Bỏ dòng chặn số 0: **6** ca hỏng; khôi phục thì đạt | đạt |
| Cắn: khoản đã hủy vẫn có nút | công cụ chặn, chưa làm | Đặt `canVoid: true`: **1** ca hỏng; khôi phục thì đạt | đạt |
| `paid_at` | có ca giờ mùa hè | **2.400 ngày giờ ngẫu nhiên** (2000–2040), trong sáu múi giờ: `Asia/Ho_Chi_Minh`, `America/New_York`, `Europe/London`, `Australia/Lord_Howe` (giờ mùa hè lệch 30 phút), `Asia/Kolkata`, `America/St_Johns` (lệch nửa giờ). So với thư viện múi giờ chuẩn của Python: **khớp 100%** | đạt |
| Checkpoint | không `UNSOLVED_PROBLEMS` | Parse lại 4 khối: hợp lệ, không trùng id; khối `record_payment` mới | đạt |
| Hộp thoại gốc, watermark | không có | Tìm trong `src/`: không có | đạt |
| Ảnh chụp | — | `payment_list-S2`: số dư đúng theo công thức hợp đồng (§4); khoản đã hủy không có nút. `payment_list-S4`: "Đã thu dư 2,50 USD" | đúng |

## 4. Đối chiếu với đặc tả D4

- **Lời gọi:** đúng bốn lời gọi.
  - `list_for_commission` gửi `commission_id` qua tham số truy vấn; `record` gửi `{ commission_id, payment_input }`.
  - 409 của `record`, `get_balance` (`ERR_OUT_OF_RANGE`) và của `void_payment` (`ERR_CONFLICT`) cho ra hai câu khác nhau.
- **Số dư**, Orchestrator tự tính lại từ dữ liệu mẫu `payment_list-S2`:
  - nhận 3.000.000 + 2.000.000 + 100.000 (tip) − hoàn 500.000 = **4.600.000** (khoản 250.000 đã hủy không tính);
  - còn phải thu = 9.000.000 − (5.000.000 − 500.000) = **4.500.000** (tip không tính).

  Cả hai khớp màn hình.
- **Phương thức not blank** (Data Schema 9.0.0): kiểm ở giao diện, có kiểm thử khoảng trắng Unicode. Backend chưa kiểm (BE-7). Giao diện chặn trước khi gửi, nên họa sĩ không ghi được phương thức trống qua giao diện.
- **`paid_at`:** độ lệch múi giờ lấy tại đúng ngày giờ đó, không đổi sang UTC. Nguồn "bây giờ" do Main trao cho Services.
- **Phần Thanh toán của `commission_detail`:** hook thứ ba, tải và lỗi riêng; nút "Thanh toán" luôn có mặt, đứng sau "Đổi giai đoạn".
- **Xác nhận khi hủy khoản:** dùng lại `ConfirmPanel`, nằm trong trang.

### Các chỗ agent tự quyết, Orchestrator chấp nhận và ghi vào đặc tả

1. **Tải lại sau mọi lần hủy khoản bị từ chối** (không chỉ 404, 409), lặng lẽ, giữ danh sách cũ nếu tải lại hỏng. An toàn hơn đặc tả; không làm mất dữ liệu đang hiện.
2. **Vô hiệu mọi nút "Hủy khoản này" khác khi khung xác nhận đang mở.** Khung không nêu tên khoản, nên chặn bấm nhầm là đúng.
3. **"Làm tròn tới phút" = cắt bỏ giây**, để giá trị mặc định không bao giờ vượt thời điểm hiện tại. Đúng ý đặc tả; chữ "làm tròn" của Orchestrator viết chưa chính xác.
4. **Mã lỗi ô số tiền** tách ba lý do (sai cách viết, quá lớn, bằng 0), mỗi lý do một câu. Chấp nhận.

## 5. Phát hiện

### UI-11 — dữ liệu mới

- **Trên máy Project Owner** (agent thu): 5 lần e2e cuối có 390 lần chụp, lâu nhất 155 ms; 50 lần chụp lúc backend tắt, lâu nhất 128 ms.
- **Một lần hết giờ**, lần đầu tiên xảy ra lúc **backend đang bật**: `payment_form-S1-errors`, ngay sau khi gõ vào ô có gợi ý (`datalist`).
- **Giả thuyết của agent:** danh sách gợi ý gốc của hệ thống còn mở làm treo lệnh chụp ảnh. Agent thêm một cú bấm vào tiêu đề trang trước ảnh đó; sau đó 16 lần chạy sạch.
- **Trên máy Orchestrator:** 468 lần chụp, lâu nhất 96 ms, không lần nào hết giờ.

**Nhận định:**
- Giả thuyết "popup gốc còn mở" hợp lý cho **lần này**, nhưng không giải thích được các lần trước ở bước backend tắt của `client_detail` và `stage_change`: các bước đó không có ô gợi ý. Có thể có **hai** nguyên nhân khác nhau.
- Cú bấm vào tiêu đề là thay đổi của spec, không che lỗi của sản phẩm (chỉ đóng một popup trước khi chụp), nên chấp nhận.
- Trace của lần hết giờ nằm trong thư mục tạm của phiên agent trên máy Project Owner (`traces_FINAL_5/*.zip`). Orchestrator chưa xem được.

UI-11 vẫn mở, vẫn không chặn.

### Q22-1 (thấp, V2) — khoản đã hủy khó nhận ra

Trên `payment_list`, dòng chính của khoản đã hủy trông giống hệt khoản còn hiệu lực. "Đã hủy" chỉ nằm ở cuối dòng phụ, và dấu hiệu duy nhất khác là mục đó không có nút. Đặc tả V1 chỉ đòi "đánh dấu, chữ phụ", nên đạt. Nhưng họa sĩ lướt nhanh có thể cộng nhầm khoản đã hủy khi tự nhẩm. Ghi vào UI-6 (phần V2).

### Q22-2 (thấp) — giờ không tồn tại khi đổi giờ mùa hè

Ở múi giờ có giờ mùa hè, một giờ "không tồn tại" (ví dụ 02:30 sáng ngày đổi giờ ở New York) được ghép với độ lệch của giờ sau khi đổi, nên rơi vào một thời điểm sớm hơn một giờ. Việt Nam không có giờ mùa hè. Không vá ở V1; ghi nhận.

### Ghi nhận quy trình

Agent tự báo một lần chạy e2e song song làm hỏng 7 lần chạy, rồi không tính các lần đó và chạy lại từng lượt một. Cách xử lý đúng, báo cáo trung thực.

## 6. Trạng thái trang

`payment_list`, `payment_form`, `commission_detail`: **đủ điều kiện `hoàn_tất`**, chờ Project Owner chạy tay các bước D4 (báo cáo agent phiên 22, phần "Bấm tay").

## 7. Commit

`CAS22`, gồm cả `UI/evidence`.
