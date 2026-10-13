Cảm ơn báo cáo pha 2. Orchestrator đã chạy lại trên Linux, Python 3.13, `starlette 1.3.1`. Mọi việc của plan đều đúng, và phép cắn riêng của Orchestrator đều bị bắt. Còn **một ca không ổn định**, phải sửa trước khi commit. Đây là pha 2b, ngắn.

**1. `tests/test_kill_during_writes.py`: khẳng định cuối viết sai ý.**
- Trên Linux, ca hỏng 3/4 lượt chạy toàn bộ và 2/6 lần chạy riêng, luôn ở dòng cuối: `assert not db_file.with_name(db_file.name + "-journal").exists(), "a hot journal was left behind"`.
- Ở các lần hỏng, tệp `-journal` còn đó (16–21 KB), nhưng **8 byte đầu đều bằng 0**. Journal nóng (cần hoàn tác) phải bắt đầu bằng chuỗi nhận dạng của SQLite `d9 d5 05 f9 20 a1 63 d7`. Tệp có đầu bằng 0 là journal đã vô hiệu và vô hại. Mọi khẳng định về dữ liệu phía trên đều đạt ở các lần hỏng.
- **Sửa:** khẳng định journal **không nóng**, tức là không có tệp, hoặc 8 byte đầu khác chuỗi nhận dạng đó. Giữ nguyên mọi khẳng định khác.
- Ghi điều quan sát này vào EVIDENCE của khối giữ ca.
- Phép cắn cũ của bạn (tách `insert` thành hai giao dịch) vẫn phải làm ca hỏng; làm lại trên bản sao ngoài kho, xóa đúng thư mục bạn tạo.

**2. Giờ ghi checkpoint.** Bảy khối dùng chung `last_updated_at: 2026-10-12T19:32:29.993604+07:00`, trong khi có tệp được sửa muộn hơn (ví dụ `record_payment/services.py` lúc 20:13). Với mọi khối bạn sửa ở pha 2b, lấy `Get-Date -Format o` **ngay trước khi ghi khối đó**, chép nguyên. Không sửa ngược các khối không đụng tới.

**Chạy:**
- ca H-10 riêng **10 lần liên tiếp**, ghi số đạt;
- `pytest` toàn bộ **3 lượt liên tiếp** (814). Lượt hỏng vẫn tính và phải báo;
- không cần chạy lại Desktop và UI.

Ràng buộc như pha 2: chỉ sửa trong `Backend/`; không lệnh git đổi trạng thái kho; không đụng `%APPDATA%\CommissionTracker`; không đổi antivirus; không sub-agent.

Báo cáo ngắn: dòng đã sửa, kết quả 10 lần chạy riêng, phép cắn, ba lượt `pytest`, `git status --short`.
