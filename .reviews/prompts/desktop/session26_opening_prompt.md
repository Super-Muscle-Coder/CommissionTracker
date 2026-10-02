Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 26 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Đây là **phiên dọn dẹp và vá nhỏ** của desktop Main, gồm bốn mục theo thứ tự ưu tiên:
  - **DSK-15:** ngôn ngữ ứng dụng tiếng Việt, để ô ngày hiện ngày/tháng/năm. Phải **đo**, không đoán;
  - **DSK-13:** hộp thoại lỗi tiếng Việt;
  - **DSK-14:** công cụ đo không gọi PowerShell bằng `-EncodedCommand`;
  - **DSK-12:** dọn checkpoint Main.
- Chi tiết từng mục ở `.plan/open_issues.md`.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; trạng thái antivirus (hỏi tôi nếu cần); mốc `lint` và `npm test` (14 đạt); mốc `%APPDATA%`; `git status --short`; ảnh "trước" của DSK-15. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử và `app.getLocale()` hiện tại;
   - cách bạn sẽ đặt ngôn ngữ ứng dụng, cùng nguồn tài liệu Electron 44.4.5;
   - cách bạn làm cho nội dung hộp thoại lỗi kiểm được khi chạy với `--ct-test-no-dialog`;
   - cách bạn thay `-EncodedCommand` trong `measure_startup.cjs`;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan. Nếu đo cho thấy ô ngày không đổi dù ngôn ngữ ứng dụng đã là `vi`, dừng DSK-15 ở đó và báo số đo; không tự vá bằng cách khác.

4. **Không tắt, không đổi cấu hình antivirus**; không thêm ngoại lệ cho `powershell.exe`. Không đổi chữ dòng log `FATAL:`. Không đổi cách dừng hay thứ tự khởi động backend. Không đụng `%APPDATA%\CommissionTracker` thật: mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`. Không tắt luật, không thêm `eslint-disable`. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Trong lúc e2e chạy, không thu nhỏ cửa sổ Electron.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - bảng DSK-12 tới DSK-15 (trạng thái và bằng chứng);
   - đường dẫn các ảnh trước và sau;
   - các lệnh để tôi tự chạy lại;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
