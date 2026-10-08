Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 36 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Phiên làm chặng F, khôi phục theo hướng B, **pha 2: áp dụng**:
  - **`backend_controller`**: công cụ vòng đời do Main trao cho `restore_data`;
  - **`restore_data.apply_pending_restore`**, lối vào `in_process`;
  - **hạ tầng cắt ngang `restore_trigger`**, chạy trước khi mở cửa sổ.

  Đặc tả: `.design/f_restore.md` §3 và §4, cùng mục "ĐẶC TẢ ĐÃ CHỐT" của plan.
- **Không làm trang giao diện**, không thêm lối vào `ipc`, không đổi hành vi ba lối vào `restore:*` của pha 1.
- Mọi tệp bạn tạo hoặc sửa nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`10.0.0`** và API Contract **`5.0.0`**, cả hai `approved`, và `restore_data` có lối vào `in_process` `apply_pending_restore`, còn `cross_cutting` có `restore_trigger`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; trạng thái antivirus (hỏi tôi nếu cần); mốc `lint` và `npm test` (62); mốc `%APPDATA%`; `git status --short`. Rồi làm **việc 2** (đo trước khi viết: cùng cổng ×20, đổi tên `data.db` ngay sau khi thoát ×20, hộp thoại thông báo khi chưa có cửa sổ). Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - kết quả đo ở việc 2;
   - cách `backend_controller` tránh `FATAL` khi dừng có chủ đích;
   - thứ tự mới trong `startLayer`;
   - cách bạn định dựng A4 (hoàn tác) và A5 (hoàn tác cũng hỏng);
   - điểm nào trong plan, `f_restore.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   **Nếu đo cùng cổng hoặc đổi tên có lần hỏng thì dừng lại ở đây và chờ.** Không tự thêm vòng thử lại. Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
   - Không tắt, không đổi cấu hình antivirus. Không sửa registry, không cài bộ cài.
   - ⚠ Không đụng `%APPDATA%\CommissionTracker` thật. Phiên này đổi tên tệp dữ liệu: mọi lần chạy ứng dụng, kể cả trang thử, đều kèm `--ct-test-data-dir`; script đo chỉ dùng thư mục tạm.
   - Không tắt luật, không thêm `eslint-disable`. Không tăng thời gian chờ, không `retries`, không `skip`.
   - Không dùng sub-agent.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

   **Quy ước:** giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn.

5. **Cần tôi ở một chỗ** (việc 9): khứ hồi thật với hộp thoại thật. Hãy đưa tôi các lệnh đầy đủ, theo đúng thứ tự:
   1. tạo tệp sao lưu có dữ liệu bằng `npm run walkthrough:app` trong `UI/`, ở trang "Sao lưu";
   2. `npm run probe -- --data-dir <thư mục cố định>`, rồi chọn tệp, rồi chuẩn bị;
   3. đóng, rồi chạy lại đúng lệnh đó;
   4. đọc hộp thoại và ô `GET /clients`.

   Tôi dùng máy bình thường trong lúc e2e chạy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết quả đo ở việc 2;
   - bảng ca kiểm thử A1 tới A6 và P11;
   - các phép cắn;
   - câu trả lời của tôi, kèm chữ trên hộp thoại;
   - nội dung `app.asar`;
   - DSK-23 có lặp lại không;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`, kèm `git check-ignore -v` cho tệp mới;
   - danh sách ngoại lệ lint mới, nếu có;
   - đề xuất `status` của `restore_data`.
