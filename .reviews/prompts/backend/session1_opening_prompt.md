Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 1 (định danh phiên: `coding-agent@2026-09-24#1`; nếu bạn làm vào ngày khác, thay đúng ngày).

Plan của phiên này nằm ở `.plan/backend_plan.md`. Mọi tệp bạn tạo hoặc sửa trong phiên này đều nằm trong `Backend/`; các thư mục bắt đầu bằng dấu chấm chỉ để đọc, `.reviews/` thì không đụng tới (xem `CLAUDE.md`, mục 2 và 4). Làm theo đúng trình tự sau:

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, đã được nạp sẵn cùng lý thuyết nền;
   - skill `wca-implementation` (`.claude/skills/wca-implementation/`): `SKILL.md`, rồi `04-implement.md`, `06-self-check.md`, `07-checkpoint-protocol.md`; tra `02-contract.md` khi cần hiểu một trường trong hợp đồng;
   - phần hợp đồng mà plan chỉ định, trong `.contracts/`, và `.design/03_classification.md`;
   - checkpoint (chưa có: đây là phiên đầu tiên);
   - cuối cùng là `.plan/backend_plan.md`.

   Xác nhận cả hai tệp hợp đồng đang ở `contract_state: approved` trước khi viết code.

2. Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - bạn hiểu mục tiêu và tiêu chí hoàn tất của phiên này là gì;
   - bạn định xử lý ba điểm kỹ thuật mà plan đã nêu ra sao: dùng chung một kết nối SQLite giữa các luồng, chặn phản hồi `422` mặc định của FastAPI, phát hiện stdin bị đóng trên Windows;
   - có điểm nào trong plan hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn, không cần chờ tôi trả lời.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan (`08-operating-protocol.md`, Phần 6).

4. Nếu nghi hợp đồng sai hoặc thiếu, không tự sửa, không đoán giá trị. Xử lý theo `08-operating-protocol.md`, Phần 4:
   - không chặn đường: ghi vào NOTES rồi làm tiếp;
   - chặn đường: dừng lại và báo tôi, kèm đề xuất nếu bạn có.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN". Nếu context sắp đầy mà chưa đạt, dừng ở một điểm gọn, viết checkpoint phản ánh đúng thực trạng (việc dang dở ghi vào UNSOLVED_PROBLEMS) và báo tôi. Không coi "gần xong" là "xong".

6. Cuối phiên, gửi tôi báo cáo bằng tiếng Việt, gồm:
   - đã làm gì, theo từng workflow;
   - danh sách tệp đã tạo;
   - các lệnh để tôi tự chạy lại EVIDENCE;
   - có đảo thứ tự việc nào không và vì sao;
   - còn vướng gì;
   - nguyên văn hai khối checkpoint.
