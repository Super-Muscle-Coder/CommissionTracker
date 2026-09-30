Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 22 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Có hai phần:
  - **chặng D4, thanh toán**: workflow giao diện `record_payment`, trang `payment_list`, trang `payment_form`, và phần "Thanh toán" trong `commission_detail`;
  - kèm **thu dữ liệu cho UI-11** (chụp ảnh e2e hết giờ trên Windows). Phần này chỉ thu dữ liệu, không sửa.
- Đặc tả nằm ở `.design/ui_decomposition.md`, mục "Chặng D4 — Thanh toán", cùng §5 và §7.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.0`** và API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo. `record_payment` ở `đang_triển_khai` là việc của backend (BE-7), không phải của phiên này.

2. Làm việc 1 và việc 2 của plan: môi trường; mốc `check` và `e2e` (có `CT_WALKTHROUGH_RUNNER`); mốc `%APPDATA%`; `git status --short`; bật trace và nhật ký chụp ảnh cho UI-11. Sau đó, trước dòng code đầu tiên của D4, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - bạn ghi nhật ký thời gian chụp ảnh ở đâu, ghi những gì;
   - danh sách lối vào Routers của `record_payment`, và thao tác nào gồm nhiều lời gọi;
   - bạn ghép `paid_at` (gồm độ lệch múi giờ) thế nào, và nguồn "bây giờ" đi từ Main vào workflow ra sao;
   - component kit nào bạn thêm hoặc mở rộng, vì sao;
   - điểm nào trong plan, `ui_decomposition.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Được đảo thứ tự nếu có lý do; phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. Không có màn hình hồ sơ quyền sở hữu. Không làm D5 trở đi, không làm việc V2, không sửa Desktop. Không đổi hành vi các trang đã `hoàn_tất`. Không dùng `window.confirm` hay hộp thoại gốc. Không nới thời gian chờ, không `retries`, không `skip`. Không gọt giao diện, không thư viện ngoài. Không tắt luật, không thêm `eslint-disable`. Cần một điều chưa có trong `ui_decomposition.md` thì dừng lại và báo. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - mỗi spec mới và `commission_detail` chạy riêng đạt 10 lần liên tiếp;
   - `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER` đúng định danh phiên của bạn;
   - một lần không đặt biến để lại `UI/evidence` nguyên vẹn.

   Lần hỏng chỉ vì chụp ảnh hết giờ thì ghi lại theo việc 2 của plan và không tính.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh, và **các bước bấm tay** cho hai kịch bản mới và các bước mới của `commission_detail`;
   - kết quả thu dữ liệu UI-11;
   - đề xuất trạng thái ba trang;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
