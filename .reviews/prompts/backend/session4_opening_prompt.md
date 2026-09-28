Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 4 (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint.

Plan của phiên này nằm ở `.plan/backend_plan.md`. Mọi tệp bạn tạo hoặc sửa đều nằm trong `Backend/`. Các thư mục bắt đầu bằng dấu chấm chỉ để đọc; `.reviews/` thì không đụng tới. Mọi lệnh Python chạy bằng `env\Scripts\python.exe` từ thư mục `Backend`.

1. Đọc tài liệu theo **đúng** thứ tự ở `08-operating-protocol.md`, Phần 1. Phiên trước đã đọc lệch thứ tự, phiên này thì không:
   - `CLAUDE.md`;
   - skill `wca-implementation` v2.2: `SKILL.md`, rồi `02-contract.md`, `04-implement.md`, `06-self-check.md`, `07-checkpoint-protocol.md`;
   - phần hợp đồng mà plan chỉ định, trong `.contracts/`. Đọc changelog 3.0.0 ở đầu cả hai tệp trước;
   - checkpoint: đầu `Backend/Backend.py` trước, rồi đầu `services.py` của `record_payment` và `manage_commission`;
   - cuối cùng là `.plan/backend_plan.md`.

   Xác nhận cả hai tệp hợp đồng đang ở phiên bản `3.0.0` và `contract_state: approved` trước khi viết code.

2. Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - cách bạn giữ cho kiểm tra vượt khoảng của `record` đúng khi có hai lời ghi đồng thời;
   - cách bạn giữ cho chuỗi lịch sử giai đoạn không đứt khi có hai lời chuyển đồng thời;
   - có điểm nào trong plan hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. Nếu nghi hợp đồng sai hoặc thiếu, xử lý theo `08-operating-protocol.md`, Phần 4: không tự sửa, không đoán giá trị.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN". Nếu context sắp đầy mà chưa đạt, dừng ở một điểm gọn, ghi checkpoint đúng thực trạng rồi báo tôi.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Không chép lại nội dung checkpoint.
