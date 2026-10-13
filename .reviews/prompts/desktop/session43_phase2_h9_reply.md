Cảm ơn bạn đã dừng đúng chỗ. Orchestrator đã đọc mã và tái hiện được trên Linux: `--ct-test-data-dir` trỏ vào một tệp thì ứng dụng thoát mã 0, chỉ để lại dòng log "another instance is already running", không có hộp thoại. Chẩn đoán của bạn đúng.

**Project Owner chọn hướng A.** Phát hiện này mang mã **R43-22**, mức trung bình, đã ghi vào `.plan/open_issues.md`.

**Yêu cầu:**
1. Trước khi gọi `app.requestSingleInstanceLock()`, Main tạo thư mục `userData` (có `recursive`). Việc này áp dụng cho cả lúc chạy từ mã nguồn lẫn bản đóng gói, và cả khi không có cờ `--ct-test-data-dir`.
2. Nếu không tạo được, ứng dụng dừng như mọi lỗi khởi động khác:
   - đúng một dòng `FATAL:` trong log, nêu đường dẫn và lỗi;
   - chữ hộp thoại là câu khởi động (`phase` `startup`), qua `buildErrorDialog`; với `--ct-test-no-dialog` thì ghi dòng `error dialog text:` như hiện nay;
   - mã thoát `main.failure_exit_code`;
   - không khởi động backend.
3. ⚠ **Coi chừng thứ tự khai báo.** Chỗ xin khóa hiện nằm trước khai báo `shutdownStarted`, `fatalReported` (khoảng dòng 2113–2116) và `backend` (khoảng dòng 2160). Gọi `fatal()` ở đó sẽ ném `ReferenceError`. Bạn chọn một trong hai cách, và ghi lý do vào EXPERIENCES:
   - dời khối "tạo `userData` rồi xin khóa" xuống sau các khai báo đó, miễn là vẫn trước `whenReady` và trước mọi việc khởi động backend;
   - hoặc viết một nhánh dừng sớm riêng mà vẫn giữ đúng ba điều ở mục 2.
4. Khi thư mục tạo được mà khóa vẫn trả `false`, hành vi giữ nguyên như cũ: đang có bản khác chạy, thoát im lặng, không khởi động backend. Ca 9 phải đạt như cũ.
5. H9a, H9b giữ đúng mong đợi của plan. H9c giữ nguyên.
6. **Phép cắn:** bỏ bước tạo `userData` (khôi phục mã cũ). H9a và H9b phải hỏng.
7. Thư mục tạm do H9a, H9b để lại ở các lần chạy hỏng: chỉ xóa đúng những thư mục bạn đã liệt kê theo tên, không xóa theo mẫu.

Không đổi hợp đồng, không thêm nhãn, không thêm cờ. Xong thì làm tiếp phần còn lại của pha 2 theo plan (nhóm A còn lại, H-11, nhóm D, phép cắn, ba lượt `npm test`, UI e2e, checkpoint), rồi gửi báo cáo theo mục "BÁO CÁO PHA 2". Trong báo cáo, thêm một dòng cho R43-22: cách bạn chọn ở mục 3 và kết quả phép cắn.
