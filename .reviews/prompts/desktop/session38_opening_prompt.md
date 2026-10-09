Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 38 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Đây là phiên vá ngắn, đóng chặng F, gồm ba việc:
  - **DSK-26:** ba câu báo lỗi cho ba cách hoàn tác hỏng (`.design/f_restore.md` §3, bước 8 và 9);
  - **DSK-27:** kiểm thử không dựa vào dòng log in trước khi bộ gom log kịp gắn vào;
  - **dọn NOTES** quá hạn của các khối checkpoint Desktop.
- Mọi tệp bạn tạo hoặc sửa nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Script làm máy tải nằm ngoài dự án.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; trạng thái antivirus (hỏi tôi nếu cần); mốc `lint` và `npm test` (69); mốc `%APPDATA%`; `git status --short`. Rồi làm **việc 2**, tức đo DSK-27 trong lúc máy bị làm tải. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - kết quả đo ở việc 2;
   - danh sách mọi chỗ đang dựa vào dòng log khởi động, và cách bạn định sửa;
   - cách bạn định dựng ba ca 9a, 9b, 9c;
   - điểm nào trong plan, `f_restore.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không đổi nhãn hay mã lỗi của hợp đồng. Không thêm lối vào `ipc` hay cờ `--ct-test-*`. Không thêm vòng thử lại cho đổi tên tệp.
   - Không thay `_electron.launch`. Không nới thời gian chờ, không `retries`, không `skip`.
   - Không tắt, không đổi cấu hình antivirus. Không sửa registry, không cài bộ cài.
   - Không đụng `%APPDATA%\CommissionTracker` thật: mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`.
   - Không tắt luật, không thêm `eslint-disable`.
   - Không dùng sub-agent.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

   **Quy ước:** giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `npm test` một lượt và nói rõ trong báo cáo.

5. Phiên này không cần tôi chạy tay, trừ khi bạn thấy cần. Tôi dùng máy bình thường trong lúc kiểm thử chạy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết quả đo ở việc 2;
   - danh sách ca từng dựa vào dòng log sớm, và cách sửa từng ca;
   - ba câu mới, nguyên văn;
   - các phép cắn;
   - số đạt của ba lượt `npm test` có tải và một lượt không tải;
   - bảng NOTES (giữ, chuyển thành EXPERIENCES, hay xóa);
   - kết quả `dist`, `test:packaged` và UI e2e;
   - DSK-23 có lặp lại không;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`, kèm `git check-ignore -v` cho tệp mới;
   - danh sách ngoại lệ lint mới, nếu có.
