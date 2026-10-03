Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 28 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Đây là **phiên vá ngắn**, ba mục:
  - **UI-11 bước (4):** công cụ kiểm thử tự mở lại cửa sổ Electron khi nó bị thu nhỏ, và ghi lại mỗi lần;
  - **UI-13:** lỗi "trùng mốc" của `reminder_settings` nhảy sang dòng khác sau khi bấm "Bỏ mốc này";
  - **UI-15:** dữ liệu mẫu D6 khẳng định trên danh sách đang chờ, để chịu được `reminder_ticker` của desktop sau này.
- Chi tiết từng mục ở `.plan/open_issues.md`.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`, trừ `npm run build` của Desktop ở việc 1.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; mốc `check` (1550) và `e2e` (69, **không** đặt `CT_WALKTHROUGH_RUNNER`); băm `UI/evidence`; mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - cách bạn mở lại cửa sổ bị thu nhỏ, cùng nguồn tài liệu Electron 44.4.5;
   - bạn sửa UI-13 ở phân khu nào, vì sao;
   - cách bạn chứng minh UI-15 bằng một ca tất định;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Trong phiên này, tôi dùng máy bình thường, kể cả thu nhỏ cửa sổ ứng dụng khi e2e đang chạy.** Đó là điều kiện UI-11 phải chịu được. Báo tôi trước khi bắt đầu 10 lượt e2e ở việc 6.

5. Không nới thời gian chờ, không `retries`, không `skip`. Không ép focus hay đưa cửa sổ lên trên cùng. Không thêm cờ `--ct-test-*`, không đổi `Desktop/`. Không đổi hành vi nào khác của các trang đã `hoàn_tất`. Không có màn hình hồ sơ quyền sở hữu. Không tắt luật, không thêm `eslint-disable`. Mã trong `UI/src` không bao giờ gọi `POST /reminders/checks`. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - `npm run e2e` đạt **10 lượt liên tiếp**, không đặt runner. Mọi lần hỏng đều tính, kể cả hết giờ chụp ảnh;
   - `UI/evidence` giống mốc.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - bảng UI-11, UI-13, UI-15: trạng thái và bằng chứng;
   - kết quả 10 lượt e2e và số lần mở lại cửa sổ;
   - các lệnh, và một bước bấm tay để tôi xem lại UI-13;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
