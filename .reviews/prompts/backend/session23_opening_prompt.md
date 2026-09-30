Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 23 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/backend_plan.md`: **BE-7**. Workflow `record_payment` áp dụng luật "not blank" (Data Schema 9.0.0) cho `payment_input.method`.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `Backend/workflows/record_payment/`. Được **chạy**, nhưng không sửa, `Desktop/` và `UI/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Mọi lệnh Python dùng `Backend\env\Scripts\python.exe`. Không chạy lệnh git nào đổi trạng thái kho.

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.0`** và API Contract **`4.0.0`**, cả hai `approved`, và `record_payment` đang ở `đang_triển_khai`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; mốc `pytest` (phải là 445/445); mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - bạn hiện thực "not blank" ở đâu, theo mẫu nào của phiên 18, và vì sao FastAPI sẽ không tự trả `422`;
   - `details` của lỗi sẽ chỉ ra trường vi phạm ra sao;
   - ca kiểm thử cũ nào trái với hợp đồng mới, và bạn viết lại nó thế nào;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan. Không áp luật cho trường nào ngoài `method`. Chỉ viết lại đúng một ca kiểm thử cũ mà plan nêu; không sửa kiểm thử của workflow khác. Không bỏ khoảng trắng khỏi giá trị trước khi lưu. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

4. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows. Đề xuất trạng thái `đã_hoàn_thiện` bằng NOTE trong checkpoint; không tự sửa hợp đồng.

5. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5, kèm các lệnh để tôi tự chạy lại và danh sách tệp trong `git status --short`.
