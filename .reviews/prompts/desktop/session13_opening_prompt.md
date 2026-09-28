Bạn là coding agent của dự án Commission Tracker. Đây là phiên theo layer `desktop`, phiên số 13 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint.

**Phạm vi được sửa và được chạy:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`: chặng C, đóng gói thử.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `Desktop/`.
- Được **chạy**, nhưng không sửa, mọi lệnh của `Backend/` và `UI/`.
- Không đụng tới `CommissionTracker.slnx`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Mọi lệnh npm của phiên chạy từ thư mục `Desktop`, trừ các lệnh mà plan chỉ định chạy trong `UI/`.

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1, với danh sách cụ thể ở việc 0 của plan. Đặc biệt:
   - `CLAUDE.md` mục 4 và mục 5;
   - chặng C của `.plan/v1_roadmap.md`;
   - **toàn bộ** khối checkpoint ở đầu `Desktop/src/main.ts`.

   Trước khi làm gì khác, xác nhận Data Schema ở `6.1.0`, API Contract ở `4.0.0`, và cả hai đều `contract_state: approved`. Nếu thấy phiên bản khác, dừng lại và báo.

2. Làm việc 1 của plan: kiểm môi trường, và chụp mốc `%APPDATA%\CommissionTracker`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - các phiên bản đã kiểm, và kết quả chụp mốc;
   - bạn định chọn đường dẫn bản đóng gói ở Main thế nào (D3), và bỏ qua cờ thế nào (D4);
   - bạn định tái hiện `ERR_ABORTED` thế nào;
   - bạn định đo và xử lý `._pth` thế nào;
   - có điểm nào trong plan hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan.
   - Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.
   - Mục "QUYẾT ĐỊNH ĐÃ CHỐT" (D1–D8) không được tự đổi. Nếu thực tế cho thấy một quyết định không làm được, dừng lại và báo, kèm số đo.
   - Ba chỗ plan yêu cầu **dừng và báo**, thay vì tự xử lý:
     - gói Python nhúng thiếu VC++ Runtime;
     - một gói phụ thuộc không có wheel;
     - electron-builder không đóng gói được Electron 44.4.5.

4. **Không kiểm thử nào được ghi vào `%APPDATA%\CommissionTracker` thật.** Mọi lần chạy ứng dụng, kể cả bản đã cài, đều kèm `--ct-test-data-dir` trỏ vào thư mục tạm. Nếu nghi hợp đồng sai hoặc thiếu, xử lý theo `08-operating-protocol.md`, Phần 4: không tự sửa, không đoán.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" của plan, chạy trên Windows.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh để tôi tự chạy: `npm test`, `npm run dist`, `npm run test:packaged`;
   - đường dẫn bộ cài;
   - bảng dung lượng;
   - thời gian khởi động;
   - danh sách các bước để tôi chạy tay trên một máy Windows sạch (việc 9).
