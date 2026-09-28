Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 14 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`: **phiên vá và chẩn đoán** sau chặng C. Danh sách việc tồn nằm ở `.plan/open_issues.md`, phần desktop (DSK-1 tới DSK-8).
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, các lệnh của `Backend/` và `UI/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Mọi lệnh npm chạy từ `Desktop`, trừ `npm run e2e` chạy trong `UI`.

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. **Đọc kỹ mục "BỐI CẢNH ĐÃ BIẾT" của plan**: nó chứa log và các nguyên nhân đã được xác định ngày 2026-09-27, để bạn không phải tìm lại. Xác nhận Data Schema `6.1.0`, API Contract `4.0.0`, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường, danh sách antivirus, và mốc `%APPDATA%`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các phiên bản và antivirus đã kiểm;
   - bạn định lấy `CreationDate` từ PowerShell thế nào để so sánh được, và ca kiểm thử giả của `buildTree` trông ra sao;
   - bạn định dựng công cụ đo (việc 6b) thế nào để phát hiện được một bản Main thứ hai không do script khởi động;
   - bạn định làm cho đợt A có exe mang hash mới ra sao;
   - điểm nào trong plan bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ".
   - DSK-1 (việc 2) phải xong **trước** mọi phép đo. Công cụ chẩn đoán (việc 6) phải được chạy thử trước khi dùng để kết luận.
   - Được đảo thứ tự các việc khác nếu có lý do; phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. **Chẩn đoán DSK-2 và DSK-3 bằng dữ liệu, không đoán.** Kết luận phải đi theo bảng ở việc 7 của plan.
   - Nếu thấy **hai bản Main, hoặc hai backend, cùng chạy với cùng thư mục dữ liệu**, ghi bằng chứng và dừng phần DSK-2 theo điểm dừng bắt buộc. Không tự thêm khóa cơ sở dữ liệu, không sửa `Backend/`.
   - **Không tắt hay đổi cấu hình phần mềm diệt virus nào.** Phép đo cần tắt antivirus thì viết sẵn lệnh để tôi làm.

5. Không lần chạy ứng dụng nào được ghi vào `%APPDATA%` thật: luôn kèm `--ct-test-data-dir`. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN", chạy trên Windows với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - bảng DSK-1 tới DSK-8: trạng thái và bằng chứng;
   - kết luận DSK-2 và DSK-3, cùng bảng số liệu của đợt A, B, C;
   - các lệnh để tôi tự chạy lại: `npm test`, `npm run dist`, `npm run test:packaged`, `node tests/packaged/measure_startup.cjs …`;
   - lệnh để tôi đo khi đã tạm dừng cả AVG lẫn ReasonLabs.
