Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 16 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`: **chặng D1**, gồm ba trang khách hàng (`client_list` sửa, `client_detail` mới, `client_form` mới).
- Đặc tả chi tiết của ba trang nằm ở `.design/ui_decomposition.md` §5; hướng giao diện V1 nằm ở §7.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`.

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Đọc **toàn bộ** `.design/ui_decomposition.md`, và `.design/product_versions.md`. Xác nhận Data Schema **`6.2.0`**, API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường, mốc `check` và `e2e`, mốc `%APPDATA%`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - bạn định diễn đạt luật R13 mới thế nào để bắt đủ năm dạng ở việc 2;
   - bạn định khai báo tham số điều hướng có kiểu thế nào;
   - bảng nhãn của bốn lời gọi mới mà bạn đọc từ hợp đồng;
   - các cặp chữ/nền mà `check_contrast` sẽ kiểm;
   - điểm nào trong plan, `ui_decomposition.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ".
   - UI-1, UI-2 và UI-3 (việc 2) phải xong, có bằng chứng, trước dòng code đầu tiên của D1.
   - Được đảo thứ tự các việc khác nếu có lý do; phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. V1 **không gọt giao diện**: không animation, không component từ nguồn ngoài, không giao diện sáng. Không có màn hình hồ sơ quyền sở hữu. Nếu cần một trang, một lời gọi hay một tham số chưa có trong `ui_decomposition.md`, dừng lại và báo; không tự thêm. Không tắt luật, không thêm `eslint-disable`. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows. Khi bạn chạy kịch bản bấm thử và e2e, đặt `CT_WALKTHROUGH_RUNNER` đúng định danh phiên của bạn.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh và **các bước bấm tay cho cả ba kịch bản**, để tôi tự chạy;
   - đề xuất trạng thái của ba trang;
   - danh sách ngoại lệ lint mới, nếu có.
