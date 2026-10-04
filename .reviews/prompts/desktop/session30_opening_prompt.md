Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 30 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Hai mục:
  - **DSK-17:** thành phần cắt ngang `reminder_ticker`. Nó gọi `POST /reminders/checks` theo nhịp và hiện một thông báo Windows cho mỗi nhắc việc trả về. Đặc tả đã chốt nằm trong plan, mục "ĐẶC TẢ ĐÃ CHỐT";
  - **DSK-18:** cờ kiểm thử `--ct-test-show-inactive`, chỉ cho bản chạy từ mã nguồn. Có cờ thì cửa sổ hiện lên mà không giành tiêu điểm; không cờ thì như cũ.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`, và `send_reminder` ở `đã_hoàn_thiện`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; trạng thái antivirus (hỏi tôi nếu cần); mốc `lint` và `npm test` (17 đạt); mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử;
   - nguồn tài liệu Electron 44.4.5 cho `Notification`, `setAppUserModelId`, `showInactive` và sự kiện cửa sổ sẵn sàng hiện;
   - cách bạn sẽ đo thông báo Windows (việc 2), và cách đo "cửa sổ không giành tiêu điểm" (việc 3);
   - vị trí khối checkpoint của `reminder_ticker`, và vì sao;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan. Nếu đo cho thấy thông báo không hiện được khi chạy từ mã nguồn dù đã thử AUMID, dừng DSK-17 ở đó và báo số đo; không tìm cách vòng.

4. **Không tắt, không đổi cấu hình antivirus.** Không sửa registry, không tạo lối tắt Start Menu, không cài bộ cài. Không đổi chữ dòng log `FATAL:`, không đổi cách dừng hay thứ tự khởi động backend, không đổi preload, không thêm lối vào `ipc`. Không đổi hành vi khi người dùng tự mở ứng dụng. Không đụng `%APPDATA%\CommissionTracker` thật: mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`. Không tắt luật, không thêm `eslint-disable`. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn.

5. **Cần tôi ở hai chỗ:**
   - tôi xác nhận bằng mắt thông báo Windows (việc 4, "Thông báo thật");
   - báo tôi trước khi chạy UI e2e: thông báo Windows thật sẽ hiện trong các lượt có `reminder_list`.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - bảng DSK-17, DSK-18: trạng thái và bằng chứng;
   - kết quả đo thông báo;
   - các lệnh, và các bước để tôi tự xem thông báo;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
