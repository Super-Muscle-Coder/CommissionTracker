Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 2 (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`, ví dụ `coding-agent@2026-09-25#1`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint, không nằm trong trí nhớ nào khác.

Plan của phiên này nằm ở `.plan/backend_plan.md`. Mọi tệp bạn tạo hoặc sửa đều nằm trong `Backend/`. Các thư mục bắt đầu bằng dấu chấm chỉ để đọc; `.reviews/` thì không đụng tới (xem `CLAUDE.md`, mục 2 và 4). Mọi lệnh Python chạy bằng `env\Scripts\python.exe` từ thư mục `Backend`.

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, đã được nạp sẵn cùng lý thuyết nền;
   - skill `wca-implementation` (`.claude/skills/wca-implementation/`, v2.1): `SKILL.md`, rồi `02-contract.md`, `04-implement.md`, `06-self-check.md`, `07-checkpoint-protocol.md`;
   - phần hợp đồng mà plan chỉ định, trong `.contracts/`, và `.design/03_classification.md`;
   - checkpoint của phiên trước: đầu `Backend/workflows/scaffold_backend/adapters.py` và đầu `Backend/workflows/manage_client/services.py`;
   - cuối cùng là `.plan/backend_plan.md`.

   Xác nhận cả hai tệp hợp đồng đang ở `contract_state: approved` trước khi viết code.

2. Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu và tiêu chí hoàn tất của phiên;
   - những mục nào sẽ chuyển sang checkpoint của Main, những mục nào ở lại;
   - bạn định gây một lỗi lưu trữ thật để chứng minh nhãn `500` bằng cách nào;
   - có điểm nào trong plan hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn, không cần chờ tôi trả lời.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan (`08-operating-protocol.md`, Phần 6).

4. Nếu nghi hợp đồng sai hoặc thiếu, không tự sửa, không đoán giá trị. Xử lý theo `08-operating-protocol.md`, Phần 4:
   - không chặn đường: ghi vào NOTES rồi làm tiếp;
   - chặn đường: dừng lại và báo tôi, kèm đề xuất nếu bạn có.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN". Nếu context sắp đầy mà chưa đạt, dừng ở một điểm gọn, viết checkpoint phản ánh đúng thực trạng (việc dang dở ghi vào UNSOLVED_PROBLEMS) và báo tôi.

6. Cuối phiên, gửi tôi báo cáo bằng tiếng Việt, gồm:
   - đã làm gì, theo từng việc trong plan;
   - danh sách tệp đã tạo hoặc sửa;
   - các lệnh để tôi tự chạy lại EVIDENCE;
   - có đảo thứ tự việc nào không và vì sao;
   - còn vướng gì;
   - nguyên văn ba khối checkpoint `main`, `manage_client`, `manage_commission`, cùng danh sách những gì đã chuyển ra khỏi checkpoint `scaffold_backend`.
