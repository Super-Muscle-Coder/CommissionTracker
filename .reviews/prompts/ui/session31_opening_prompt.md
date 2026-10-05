Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 31 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Đây là phiên vá ngắn cho công cụ kiểm thử, hai mục:
  - **UI-18 (phần còn lại):** e2e mở ứng dụng với cờ `--ct-test-show-inactive` mà Desktop đã có từ phiên 30, để cửa sổ không giành tiêu điểm của tôi. Không bật cờ ở chế độ ghi bằng chứng, và không bật ở `walkthrough_app.mjs`;
  - **UI-19:** ca D6 của `app_root.test.tsx` hỏng ngắt quãng.
- Mọi tệp bạn sửa nằm trong `UI/`. Mã chạy trong `UI/src` không đổi; chỉ khối checkpoint và tệp kiểm thử `app_root.test.tsx`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`. Không thêm cờ `--ct-test-*` mới.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`, và Desktop có `test_flags.show_inactive`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; mốc `npm run check` 5 lần (1555); mốc e2e (70); băm `UI/evidence`; mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - những chỗ đang mở Electron, và chỗ nào sẽ nhận cờ, chỗ nào không;
   - cách bạn kiểm tự động việc truyền cờ, và phép cắn;
   - điểm nào trong plan bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Không nới thời gian chờ**, không `retries`, không `skip`, `fixme`, `flaky`. Không gọi `focus()`, `moveTop()`, `setAlwaysOnTop()` trên cửa sổ ứng dụng, không đổi `focusable`. Không thêm `-ExecutionPolicy` vào lệnh PowerShell. Không tắt, không đổi cấu hình antivirus. Không tắt luật lint, không thêm `eslint-disable`. Không chạy e2e có `CT_WALKTHROUGH_RUNNER`. Không đụng `%APPDATA%\CommissionTracker` thật. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn.

5. **Cần tôi ở hai chỗ:**
   - báo tôi trước khi chạy 10 lượt e2e: tôi sẽ dùng máy bình thường trong lúc đó (gõ phím ở ứng dụng khác, thu nhỏ cửa sổ, để cửa sổ khác che lên). Thông báo Windows thật sẽ hiện trong các lượt có `reminder_list`; đó là hành vi đúng;
   - sau 10 lượt, hỏi tôi còn bị giành tiêu điểm không.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - bảng UI-18, UI-19: trạng thái và bằng chứng;
   - bảng đo trước/sau của UI-18;
   - kết quả 10 lần `check` và 10 lượt e2e, mọi lần hết giờ chụp ảnh nếu có, kèm trạng thái cửa sổ;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
