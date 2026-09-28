Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 12 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint.

Plan của phiên này nằm ở `.plan/ui_plan.md`. Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`. Không đụng tới `CommissionTracker.slnx`. Các thư mục bắt đầu bằng dấu chấm chỉ để đọc; `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ thư mục `UI`.

Phiên này có hai phần, theo đúng thứ tự:

- (1) vá ba chỗ hở của máy kiểm (R12, R13, R14), có bằng chứng cắn;
- (2) trang đầu tiên `client_list` theo iWCA I3 → I6.

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1, với danh sách cụ thể ở việc 0 của plan. Đặc biệt:
   - `CLAUDE.md` mục 5, đoạn "Vận hành layer giao diện";
   - `i3-logic.md` → `i6-self-check.md`;
   - `.design/ui_decomposition.md`;
   - bốn khối checkpoint hiện có của `UI/`.

   Trước khi làm gì khác, xác nhận Data Schema ở `6.1.0`, API Contract ở `4.0.0`, và cả hai đều `contract_state: approved`. Nếu thấy phiên bản khác, dừng lại và báo.

2. Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - cách bạn định vá P1, P2, P3 (luật nào, selector hay mẫu nào);
   - bảng nhãn của `list_clients` mà bạn đọc từ hợp đồng;
   - cách bạn định làm fixture `switchable_backend.py` cùng hai lệnh `walkthrough:app` và `walkthrough:backend`;
   - có điểm nào trong plan, iWCA hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Việc 1 (vá máy kiểm) **phải xong, có bằng chứng**, trước khi viết dòng code nào của `manage_client`. Được đảo thứ tự các việc khác nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. Không tắt luật, không thêm `eslint-disable`. Nếu nghi hợp đồng hay `ui_decomposition.md` sai hoặc thiếu, xử lý theo `08-operating-protocol.md`, Phần 4: không tự sửa, không đoán.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" của plan, chạy trên Windows.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh để tôi tự chạy: `npm run check`, `npm run e2e`, `npm run walkthrough:app`, `npm run walkthrough:backend -- down|up`;
   - đề xuất trạng thái của trang `client_list`;
   - danh sách mọi ngoại lệ lint mới, kèm lý do.
