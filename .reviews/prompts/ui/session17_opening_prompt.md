Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 17 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Đây là **phiên vá của chặng D1**: sửa những chỗ chưa đạt của ba trang khách hàng. Không thêm trang, không làm D2.
- Các việc cần vá được ghi ở `.plan/open_issues.md` (UI-4, UI-5, CT-2, và phần UI-6 mà plan nêu).
- Đặc tả nằm ở `.design/ui_decomposition.md` §5 và §7, bản cập nhật ngày 2026-09-28.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`.

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`7.0.0`** và API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo. `manage_client` ở `đang_triển_khai` là việc của backend, không phải của phiên này.

2. Làm việc 1 của plan: môi trường; mốc `check` và `e2e` (ghi kết quả thật, kể cả khi hỏng); mốc `%APPDATA%`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - những spec và hàm nào hiện đang lấy trạng thái nút làm tín hiệu "đã tải xong", và bạn sẽ chờ tín hiệu gì thay vào;
   - các cặp phi văn bản mà `check_contrast` sẽ kiểm, mỗi cặp nằm trên nền nào;
   - bạn định cho kit yêu cầu focus thế nào mà không dùng biến toàn cục DOM ở phân khu màn hình;
   - điểm nào trong plan, `ui_decomposition.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Được đảo thứ tự nếu có lý do; phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. Không làm các mục V2: Enter để lưu, giữ focus khi nút bận, chặn rời form. Không gọt giao diện. Không có màn hình hồ sơ quyền sở hữu. Không tắt luật, không thêm `eslint-disable`. Nếu cần một điều chưa có trong `ui_decomposition.md`, dừng lại và báo. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm `npm run e2e` đạt **5 lần liên tiếp**. Khi chạy kịch bản bấm thử và e2e, đặt `CT_WALKTHROUGH_RUNNER` đúng định danh phiên của bạn.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh, và **các bước bấm tay cho cả ba kịch bản** theo bản mới, để tôi tự chạy;
   - đề xuất trạng thái của ba trang;
   - danh sách ngoại lệ lint mới, nếu có.
