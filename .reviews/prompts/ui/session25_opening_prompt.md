Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 25 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Đây là **phiên vá ngắn**, không có trang mới. Ba việc:
  - **CT-5:** `view_income_report` theo Data Schema 9.0.2, không đổi hành vi;
  - **UI-12:** ca focus không tất định của `StageChange`;
  - **UI-11:** thí nghiệm có đối chứng về lệnh chụp ảnh treo trên Windows.
- Dữ liệu và bối cảnh của ba việc nằm ở `.plan/open_issues.md`.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; mốc `check` (1303) và `e2e` (59, có `CT_WALKTHROUGH_RUNNER`); mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - những chỗ bạn sẽ đổi cho CT-5;
   - giả thuyết của bạn về UI-12 sau khi đọc mã, và cách bạn sẽ xác nhận;
   - thiết kế công cụ chẩn đoán UI-11 (điều kiện, số lần, cách đo);
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan. UI-11 nhằm **tìm nguyên nhân**: không nới thời gian chờ, không `retries`, không thêm cờ Chromium vào ứng dụng thật; chỉ thêm vào harness kiểm thử khi việc 4b đã chứng minh. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

4. Không có màn hình hồ sơ quyền sở hữu. Không làm D6, không làm việc V2, không sửa Desktop. Không đổi hành vi trang nào. Không tắt luật, không thêm `eslint-disable`. Giờ ghi trong checkpoint lấy bằng lệnh `Get-Date -Format o`, không ước lượng.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết luận UI-12 (nguyên nhân, dòng mã, số lần chạy);
   - bảng kết quả thí nghiệm UI-11;
   - các lệnh để tôi tự chạy lại, gồm lệnh chạy công cụ chẩn đoán;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
