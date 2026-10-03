Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 27 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`:
  - **chặng D6, nhắc việc, phần giao diện:** workflow giao diện `send_reminder`, trang `reminder_list` và `reminder_settings`, mục điều hướng "Nhắc việc";
  - **UI-11 bước (3):** harness ghi trạng thái cửa sổ cạnh mỗi lần chụp ảnh (chỉ ghi);
  - **xem lại ảnh bằng chứng có ô ngày** sau khi ngôn ngữ ứng dụng đổi sang `vi`.
- Đặc tả nằm ở `.design/ui_decomposition.md`, mục "Chặng D6 — Nhắc việc", cùng §5 và §7.
- ⚠ Mã trong `UI/src/` **không bao giờ** gọi `POST /reminders/checks`. Chỉ công cụ kiểm thử trong `UI/tests/` được gọi, để tạo dữ liệu mẫu.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`, trừ `npm run build` của Desktop ở việc 1.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`, và `send_reminder` ở `đã_hoàn_thiện`; sai thì dừng lại và báo.

2. Làm việc 1 và việc 2 của plan: môi trường; mốc `check` (1303) và `e2e` (59, có `CT_WALKTHROUGH_RUNNER`); mốc `%APPDATA%`; `git status --short`; ghi trạng thái cửa sổ cho UI-11. Sau đó, trước dòng code đầu tiên của D6, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - danh sách lối vào Routers của `send_reminder`;
   - component kit nào bạn thêm hoặc mở rộng (ô đánh dấu, ô giờ, dòng mốc nhắc), vì sao;
   - cách bạn tạo dữ liệu mẫu có nhắc việc hạn giao, và có đưa được nhắc việc tổng hợp vào kịch bản không;
   - điểm nào trong plan, `ui_decomposition.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Được đảo thứ tự nếu có lý do; phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. Không có màn hình hồ sơ quyền sở hữu. Không làm `reminder_ticker` hay gì ở Desktop, không làm sao lưu, khôi phục, không làm việc V2. Không đổi hành vi các trang đã `hoàn_tất`. Không dùng hộp thoại gốc. Không nới thời gian chờ, không `retries`, không `skip`, không `restore()` cửa sổ. Không gọt giao diện, không thư viện ngoài. Không tắt luật, không thêm `eslint-disable`. Trong lúc e2e chạy, không thu nhỏ cửa sổ Electron. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Cần một điều chưa có trong `ui_decomposition.md` thì dừng lại và báo. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - mỗi spec mới chạy riêng đạt 10 lần liên tiếp;
   - `npm run e2e` đạt **5 lần liên tiếp**, chạy từng lượt một, có đặt `CT_WALKTHROUGH_RUNNER` đúng định danh phiên của bạn;
   - một lần không đặt biến để lại `UI/evidence` nguyên vẹn.

   Lần hỏng chỉ vì chụp ảnh hết giờ thì giữ trace theo việc 2 của plan và không tính.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh, và **các bước bấm tay** cho hai kịch bản mới;
   - kết quả UI-11 (bảng thời gian chụp, trạng thái cửa sổ ở mọi lần hết giờ);
   - kết quả xem lại ảnh có ô ngày (việc 7);
   - đề xuất trạng thái hai trang;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
