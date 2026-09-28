Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 15 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/backend_plan.md`: phiên ngắn cho ba mục tồn đọng BE-3, BE-1 và BE-2 trong `.plan/open_issues.md`.
- Việc chính là hiện thực luật mới của Data Schema **6.2.0**: mỗi lúc chỉ một backend được dùng tệp dữ liệu.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `Backend/`. Được **chạy**, nhưng không sửa, các lệnh của `Desktop/` và `UI/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Đọc kỹ mục **"BỐI CẢNH"** của plan, và **mục changelog `v6.2.0`** đầu `data_schema.yaml`. Xác nhận Data Schema **`6.2.0`**, API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường, chạy 375 kiểm thử cũ, và chụp mốc `%APPDATA%`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - phiên bản Python và kết quả 375 kiểm thử;
   - cơ chế giành quyền sở hữu tệp dữ liệu bạn định dùng. Vì sao nó không chặn các kết nối SQLite khác, và chạy được trên cả Windows lẫn Linux;
   - bạn định đo độ trễ nhả khóa sau khi tiến trình bị giết thế nào;
   - bạn định viết ca "B tới trước khi tệp dữ liệu tồn tại" (việc 2e, ca 2) ra sao;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ".
   - Với BE-3: **đo trước, không đoán.** Nếu cơ chế gợi ý không đạt một yêu cầu bắt buộc nào ở việc 2a, dừng lại và báo, kèm số đo.
   - Được đảo thứ tự nếu có lý do; phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. Không sửa code của workflow nào. Không dùng khóa SQLite độc quyền trên chính `data.db`. Không kiểm thử nào đụng `%APPDATA%` thật. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - Backend: toàn bộ kiểm thử đạt;
   - Desktop: `npm test` và `test:packaged` 6/6;
   - UI: `npm run e2e` 4/4.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - cơ chế đã chọn, và số đo độ trễ nhả khóa;
   - mã thoát riêng;
   - kích thước `site-packages` trước và sau khi tách phụ thuộc;
   - các lệnh để tôi tự chạy lại.
