Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 34 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Phiên làm **chặng E, sao lưu, phần giao diện**:
  - tài nguyên `ipc_bridge` của `scaffold_ui`, dựng từ `invoke`;
  - `invoke` thành giá trị khởi động bắt buộc của Main;
  - workflow giao diện `backup_data`;
  - trang `backup`;
  - mục điều hướng "Sao lưu".
- Đặc tả nằm ở `.design/ui_decomposition.md`, mục "Chặng E — Sao lưu", cùng §2, §3, §4, §5 và §7.
- ⚠ Mã trong `UI/src/` **không bao giờ** gọi `POST /backups/restore-preparations`. Chỉ công cụ kiểm thử trong `UI/tests/` được gọi.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`.
  - Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`. Kể cả `npm run dist` và `npm run test:packaged` ở việc 8.
  - Mọi lệnh npm chạy từ `UI/`, trừ các lệnh của Desktop ở việc 1 và việc 8.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan.
   - Xác nhận Data Schema **`9.0.3`** và API Contract **`4.0.0`**, cả hai `approved`.
   - Xác nhận `backup_data` ở `đã_hoàn_thiện`.
   - Xác nhận Desktop có `native_dialogs.pick_folder`.

   Sai thì dừng lại và báo.

2. Làm việc 1 và việc 2 của plan: môi trường; mốc `check` (1555) và `e2e` (70, có `CT_WALKTHROUGH_RUNNER`); mốc `%APPDATA%`; `git status --short`; đo cách thay hộp thoại từ công cụ e2e. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - kết quả đo ở việc 2, gồm nguyên văn `message` khi hàm thay thế ném lỗi;
   - cách Main trao `ipc_bridge` cho `backup_data`, và danh sách lối vào Routers của `backup_data`;
   - component kit nào bạn thêm hoặc mở rộng, vì sao;
   - điểm nào trong plan, `ui_decomposition.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Được đảo thứ tự nếu có lý do, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không có màn hình hồ sơ quyền sở hữu.
   - Không làm khôi phục.
   - Không gọi `dialog:open-file` hay `dialog:save-file`.
   - Không làm gì ở Desktop: không sửa tệp nào, không thêm cờ.
   - Không đổi hành vi các trang đã `hoàn_tất`.
   - Không dùng hộp thoại gốc nào ngoài `pick_folder`. Không lưu gì qua `localStorage`.
   - Không nới thời gian chờ, không `retries`, không `skip`.
   - Không gọt giao diện, không thư viện ngoài.
   - Không tắt luật, không thêm `eslint-disable`.
   - Không ghi tệp sao lưu ra ngoài thư mục tạm của lần chạy.

   **Quy ước:**
   - Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn.
   - Cần một điều chưa có trong `ui_decomposition.md` thì dừng lại và báo.
   - Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

5. **Cần tôi ở hai chỗ:**
   - Trong lúc e2e chạy, tôi dùng máy bình thường. Báo tôi trước khi bắt đầu.
   - Cuối phiên, tôi chạy tay kịch bản `backup` với hộp thoại thật, theo các bước bấm tay bạn viết.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - spec mới chạy riêng đạt 10 lần liên tiếp;
   - `npm run e2e` đạt **5 lần liên tiếp**, chạy từng lượt một, có đặt `CT_WALKTHROUGH_RUNNER` đúng định danh phiên của bạn;
   - một lần không đặt biến để lại `UI/evidence` nguyên vẹn;
   - `npm run dist` và `npm run test:packaged` (9/9) đạt.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết quả đo ở việc 2;
   - các lệnh để chạy lại;
   - **các bước bấm tay** cho kịch bản `backup`;
   - kết quả `test:packaged`;
   - đề xuất trạng thái trang;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
