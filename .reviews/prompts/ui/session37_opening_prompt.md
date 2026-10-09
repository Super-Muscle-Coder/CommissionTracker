Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 37 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Phiên làm chặng F, khôi phục, phần giao diện:
  - workflow giao diện `restore_data`, chỉ dùng `ipc_bridge`;
  - trang mới `restore`;
  - mục điều hướng thứ bảy, "Khôi phục".

  Đặc tả: `.design/ui_decomposition.md`, mục "Chặng F — Khôi phục".
- Mọi tệp bạn tạo hoặc sửa nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`, kể cả `npm run dist` và `npm run test:packaged`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận:
   - Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`;
   - `restore_data` ở `đã_hoàn_thiện`;
   - Desktop có đủ bốn địa chỉ `restore:prepare`, `restore:status`, `restore:cancel`, `dialog:open-file`.

   Sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; mốc `npm run check` (1679) và `npm run e2e` (75); mốc `%APPDATA%`; `git status --short`. Rồi làm **việc 2** (đo trước khi viết): hộp thoại chọn tệp thay thế; khứ hồi đóng rồi mở lại với fixture; harness có bắt được dòng `restore dialog text` không, đo 5 lần.

   Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - kết quả đo ở việc 2;
   - bố cục `restore_data` và cách Main ráp nó;
   - cách harness đóng rồi mở lại trên cùng thư mục dữ liệu mà vẫn dọn sạch;
   - điểm nào trong plan, đặc tả hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu khứ hồi với fixture không chạy được, dừng lại và chờ. Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không có màn hình hồ sơ quyền sở hữu.
   - Không gọi `prepare_restore`, `pre_restore` hay `dialog:save-file` từ `UI/src/`.
   - Không sửa Desktop hay Backend. Không thêm cờ `--ct-test-*`.
   - ⚠ Không đụng `%APPDATA%\CommissionTracker` thật. Mọi lần mở ứng dụng, kể cả lần mở lại, đều kèm `--ct-test-data-dir` tạm.
   - Không tắt luật, không thêm `eslint-disable`. Không nới thời gian chờ, không `retries`, không `skip`.
   - Không tắt, không đổi cấu hình antivirus.
   - Không dùng sub-agent.

   **Quy ước:** giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Nếu sửa lại checkpoint sau khi đã chạy toàn bộ, chạy lại phần kiểm thử bị ảnh hưởng và nói rõ trong báo cáo.

5. **Cần tôi ở hai chỗ** (mục "Lần chạy tay của Project Owner" của plan):
   - chạy kịch bản `restore` với hộp thoại thật, gồm một lần đóng rồi mở lại;
   - đo DSK-25 trên bản đóng gói mở bằng lối tắt.

   Đưa tôi các lệnh và bước bấm đầy đủ, theo đúng thứ tự. Tôi dùng máy bình thường trong lúc e2e chạy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết quả đo ở việc 2;
   - số kiểm thử `check` và e2e, với số lượt đạt liên tiếp;
   - kết quả `dist` và `test:packaged`;
   - câu trả lời của tôi ở hai lần chạy tay;
   - đề xuất trạng thái trang;
   - danh sách tệp trong `git status --short`, kèm `git check-ignore -v` cho tệp mới;
   - danh sách ngoại lệ lint mới, nếu có.
