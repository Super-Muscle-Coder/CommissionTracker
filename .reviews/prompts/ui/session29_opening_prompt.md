Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 29 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Đây là **phiên vá ngắn cho công cụ kiểm thử**, ba mục:
  - **UI-18:** cửa sổ e2e được mở lại sau khi bị thu nhỏ thì giành tiêu điểm của người đang dùng máy. Phải hết thu nhỏ mà không kích hoạt. **Đo trước, rồi mới chọn cách**;
  - **UI-16:** ca đầu của `tests/main/main.test.tsx` hết giờ 5 s ngắt quãng trên Windows khi máy tải;
  - **UI-17:** `main_layout.spec.ts` dùng cơ chế mở lại cửa sổ; dọn NOTES cũ trong checkpoint `screens` và `main`.
- Chi tiết từng mục ở `.plan/open_issues.md`.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Không sửa mã chạy trong `UI/src`, chỉ khối checkpoint. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`, trừ `npm run build` của Desktop ở việc 1.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; `check` 5 lần (mốc 1555, ghi thời gian ca đầu của `main.test.tsx`); `e2e` (70, **không** đặt `CT_WALKTHROUGH_RUNNER`); băm `UI/evidence`; mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử, gồm số lần ca đầu của `main.test.tsx` hết giờ;
   - các cách mở lại cửa sổ bạn sẽ đo cho UI-18, nguồn tài liệu Electron 44.4.5, và cách tạo điều kiện "người dùng đang ở ứng dụng khác";
   - cách bạn tách chi phí nạp mã cho UI-16, và phép cắn;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan. Nếu không cách nào của UI-18 đạt cả ba điều kiện trên Windows, dừng UI-18, giữ cách hiện tại, báo bảng số đo.

4. **Trong phiên này, tôi dùng máy bình thường, kể cả thu nhỏ cửa sổ và gõ phím ở ứng dụng khác khi e2e chạy.** Báo tôi trước khi bắt đầu 10 lượt e2e ở việc 7, và hỏi tôi về tiêu điểm sau khi xong.

5. Không nới thời gian chờ của ca kiểm thử hay của Playwright, không `retries`, không `skip`. Không gọi `focus()`, `moveTop()`, `setAlwaysOnTop()`, không đổi `focusable` của cửa sổ ứng dụng. Không thêm cờ `--ct-test-*`, không đổi `Desktop/`. Không có màn hình hồ sơ quyền sở hữu. Không tắt luật, không thêm `eslint-disable`. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - `npm run check` đạt **10 lần liên tiếp**;
   - `npm run e2e` đạt **10 lượt liên tiếp**, không đặt runner. Mọi lần hỏng đều tính;
   - `UI/evidence` giống mốc.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - bảng UI-16, UI-17, UI-18: trạng thái và bằng chứng;
   - bảng số đo của UI-18;
   - kết quả 10 lần `check`, 10 lượt e2e, số lần mở lại cửa sổ, câu trả lời của tôi về tiêu điểm;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
