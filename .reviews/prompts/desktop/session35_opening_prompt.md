Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 35 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Phiên làm chặng F, khôi phục theo hướng B, **pha 1**:
  - **workflow `restore_data`**, workflow đầu tiên của desktop, với ba lối vào `ipc`: `restore:prepare`, `restore:status`, `restore:cancel`;
  - **`native_dialogs.open_file`**;
  - **DSK-22**.

  Đặc tả: `.design/f_restore.md`, cùng mục "ĐẶC TẢ ĐÃ CHỐT" của plan.
- **Không làm pha 2:** không dừng backend từ workflow, không đụng `data.db`, không có `restore_trigger`.
- Mọi tệp bạn tạo hoặc sửa nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`10.0.0`** và API Contract **`5.0.0`**, cả hai `approved`, và `restore_data` có ba lối vào `restore:prepare`, `restore:status`, `restore:cancel`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; trạng thái antivirus (hỏi tôi nếu cần); mốc `lint` và `npm test` (40); mốc `%APPDATA%`; `git status --short`. Rồi làm **việc 2** (đo trước khi viết). Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - kết quả đo ở việc 2;
   - bố cục `restore_data` và cách Main ráp nó;
   - cách bạn định dựng các ca 424, 500 và 503;
   - điểm nào trong plan, `f_restore.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
   - Không tắt, không đổi cấu hình antivirus. Không sửa registry, không cài bộ cài.
   - Không đụng `%APPDATA%\CommissionTracker` thật: mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`.
   - Không tắt luật, không thêm `eslint-disable`.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

   **Quy ước:** giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn.

5. **Cần tôi ở một chỗ** (việc 10): chạy trang thử với hộp thoại thật. Lệnh là `npm run probe`; các nút cần bấm: chọn tệp sao lưu, chuẩn bị, xem trạng thái, hủy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết quả đo ở việc 2;
   - bảng ca kiểm thử;
   - các phép cắn;
   - câu trả lời của tôi;
   - nội dung `app.asar`;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`, kèm `git check-ignore -v` cho tệp mới;
   - danh sách ngoại lệ lint mới, nếu có.
