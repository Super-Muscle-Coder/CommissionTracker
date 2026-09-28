Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 9 (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint.

Plan của phiên này nằm ở `.plan/backend_plan.md`. Mọi tệp bạn tạo hoặc sửa đều nằm trong `Backend/`. Dự án nay có thêm hai thư mục `Desktop/` và `UI/`, nhưng chúng thuộc các phiên sau: không tạo, không sửa, không xóa gì trong đó. Các thư mục bắt đầu bằng dấu chấm chỉ để đọc; `.reviews/` thì không đụng tới. Mọi lệnh Python chạy bằng `env\Scripts\python.exe` từ thư mục `Backend`.

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, **đặc biệt mục 4 và mục 5** (đã đổi nhiều kể từ phiên trước);
   - skill `wca-implementation` **v2.3**: `SKILL.md`, rồi `02-contract.md`, `04-implement.md`, `06-self-check.md`, `07-checkpoint-protocol.md`;
   - phần hợp đồng mà plan chỉ định, trong `.contracts/`;
   - checkpoint ở đầu `Backend/Backend.py`;
   - cuối cùng là `.plan/backend_plan.md`.

   Trước khi viết code, xác nhận Data Schema ở `6.0.0`, API Contract ở `3.0.1`, và cả hai đều `contract_state: approved`.

2. Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 6 dòng:
   - mục tiêu của phiên;
   - giá trị `ui_origin` trong hợp đồng, và những method, header nào bạn sẽ cho phép, kèm căn cứ trong hợp đồng;
   - bạn gắn CORS ở đâu, để kiểm thử đi đúng con đường mà `main()` phục vụ;
   - có điểm nào trong plan hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan. Nếu thấy plan sai ở chỗ nào, làm theo hợp đồng và nêu rõ trong báo cáo.

4. Nếu nghi hợp đồng sai hoặc thiếu, xử lý theo `08-operating-protocol.md`, Phần 4: không tự sửa, không đoán giá trị.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN", kể cả việc cập nhật EVIDENCE của Main sau lần chạy toàn bộ kiểm thử cuối cùng.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5.
