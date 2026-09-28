Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 7 (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint.

Plan của phiên này nằm ở `.plan/backend_plan.md`. Mọi tệp bạn tạo hoặc sửa đều nằm trong `Backend/`. Các thư mục bắt đầu bằng dấu chấm chỉ để đọc; `.reviews/` thì không đụng tới. Mọi lệnh Python chạy bằng `env\Scripts\python.exe` từ thư mục `Backend`.

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`;
   - skill `wca-implementation` v2.2: `SKILL.md`, rồi `02-contract.md`, `04-implement.md`, `06-self-check.md`, `07-checkpoint-protocol.md`;
   - phần hợp đồng mà plan chỉ định, trong `.contracts/`. Đọc changelog 5.0.0 của Data Schema trước;
   - checkpoint: đầu `Backend/Backend.py` trước, rồi đầu `services.py` của `update_progress`, `view_income_report`, `record_payment`;
   - cuối cùng là `.plan/backend_plan.md`.

   Xác nhận Data Schema ở `5.0.0`, API Contract ở `3.0.1`, cả hai `contract_state: approved`, trước khi viết code.

2. Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - bạn tính mốc đầu tiên và các mốc sau của bản tóm tắt định kỳ ra sao, và xử lý thế nào khi lỡ nhiều mốc;
   - bạn nhớ "đã nhắc" cho nhắc hạn chót theo khóa nào, và vì sao khóa đó làm cho việc đổi hạn chót tự động nhắc lại;
   - cách bạn bảo đảm hai `check_due` đồng thời không giao trùng một lời nhắc;
   - cách bạn tiêm đồng hồ giả cho kiểm thử mà không đổi hành vi của tiến trình thật;
   - có điểm nào trong plan hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan. Nếu thấy plan sai ở chỗ nào, làm theo hợp đồng và nêu rõ trong báo cáo.

4. Nếu nghi hợp đồng sai hoặc thiếu, xử lý theo `08-operating-protocol.md`, Phần 4: không tự sửa, không đoán giá trị.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN", kể cả việc cập nhật EVIDENCE của Main sau lần chạy toàn bộ kiểm thử cuối cùng. Nếu context sắp đầy mà chưa đạt, dừng ở một điểm gọn, ghi checkpoint đúng thực trạng rồi báo tôi.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Không chép lại nội dung checkpoint.
