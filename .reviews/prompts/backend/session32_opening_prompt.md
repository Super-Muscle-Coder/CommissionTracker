Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 32 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/backend_plan.md`. Bạn xây workflow mới `backup_data`, với hai điểm giao tiếp `create_backup` (`POST /backups`) và `prepare_restore` (`POST /backups/restore-preparations`). Đây là thao tác cấp kho lưu trữ (`05-edge-cases.md`, Bước 5.6): xử lý cơ sở dữ liệu như một khối, không đọc bảng của workflow nào.
- Mọi tệp bạn tạo hoặc sửa nằm trong `Backend/`: `workflows/backup_data/` (mới), phần ráp nối trong `Backend.py`, `Backend.pyproj`. **Không sửa `scaffold_backend`** hay workflow nào khác. Được **chạy**, nhưng không sửa, `Desktop/` và `UI/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`, và `backup_data` ở `đang_chờ_triển_khai`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan: phiên bản Python; mốc `pytest` (460); mốc `%APPDATA%`; `git status --short`. Rồi làm **việc 2**: đo xem có chụp được cơ sở dữ liệu qua `SharedConnection` hiện có không. Sau đó, trước dòng code đầu tiên của workflow, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - kết quả đo ở việc 2, và cách chụp bạn sẽ dùng;
   - cách chia ba lớp Routers, Services, Adapters cho hai điểm giao tiếp;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu việc 2 cho thấy không chụp được qua `SharedConnection`, dừng ở đó và báo số đo. Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Không đụng `%APPDATA%\CommissionTracker` thật:** mọi tệp kiểm thử ở thư mục tạm. Không mở kết nối thứ hai tới tệp dữ liệu đang chạy. Không thêm phụ thuộc. Không `skip`, `xfail`, không tăng thời gian chờ. Không tắt, không đổi cấu hình antivirus. Không cài bộ cài. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết quả đo ở việc 2;
   - bảng ca kiểm thử theo điểm giao tiếp;
   - ba phép cắn;
   - kết quả trên bản đóng gói;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`.
