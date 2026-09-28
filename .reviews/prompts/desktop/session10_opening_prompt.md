Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 10 của dự án và là phiên desktop đầu tiên (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint.

Plan của phiên này nằm ở `.plan/desktop_plan.md`. Mọi tệp bạn tạo hoặc sửa đều nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/Backend.py` và kiểm thử của backend. Không đụng tới `UI/` và `CommissionTracker.slnx`. Các thư mục bắt đầu bằng dấu chấm chỉ để đọc; `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ thư mục `Desktop`.

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1, với danh sách cụ thể ở việc 0 của plan:
   - `CLAUDE.md`, đặc biệt mục 2, 4 và 5;
   - skill `wca-implementation` v2.3;
   - phần hợp đồng mà plan chỉ định;
   - checkpoint của Main backend ở đầu `Backend/Backend.py`, cả hai NOTE;
   - cuối cùng là plan.

   Trước khi làm gì khác, xác nhận Data Schema ở `6.1.0`, API Contract ở `4.0.0`, và cả hai đều `contract_state: approved`. Nếu thấy phiên bản khác, dừng lại và báo.

2. Làm việc 1 của plan: kiểm Node, npm và Python. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - ba phiên bản đã kiểm;
   - giá trị `ui_origin` và `renderer_bridge` trong hợp đồng;
   - bạn định đưa `backendBaseUrl` vào preload đang chạy sandbox bằng cách nào;
   - bạn định kiểm các nhánh lỗi mà không phải bấm hộp thoại bằng cách nào;
   - có điểm nào trong plan hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan. Nếu thấy plan sai ở chỗ nào, làm theo hợp đồng và nêu rõ trong báo cáo.

4. Việc 6 (đo origin thật, và kiểm Private/Local Network Access) là việc **bắt buộc đo**. Nếu kết quả không khớp hợp đồng, dừng lại theo `08-operating-protocol.md`, Phần 4. Không vá bằng cấu hình, không vá bằng cờ Chromium. Nghi hợp đồng sai hoặc thiếu ở bất kỳ chỗ nào khác cũng xử lý như vậy.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" của plan, chạy trên Windows, kể cả bằng chứng không còn tiến trình Python nào sót lại.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5, kèm lệnh `npm run probe` để tôi tự chạy thử.
