# Audit phiên 15 (backend: BE-3, BE-1, BE-2) — `coding-agent@2026-09-27#5`

*Orchestrator, 2026-09-28. Theo `08-operating-protocol.md`, Phần 5. Plan: `.plan/backend_plan.md`. Hợp đồng: Data Schema 6.2.0, API Contract 4.0.0.*

## Kết luận

**Phiên 15 được chấp nhận. Đóng BE-1, BE-2 và BE-3.**

Báo cáo trung thực, và mọi con số tôi đối chiếu được đều khớp. Nhánh Linux (`fcntl`), phần duy nhất agent không chạy được, nay đã được tôi chạy: **381/381 đạt**. Tôi còn thử thêm một ca agent chưa thử, và khóa giữ đúng cả trong ca đó: năm backend khởi động **cùng lúc** trên một tệp dữ liệu mới.

Agent làm đúng những chỗ đáng chú ý:
- **Đo độ trễ nhả khóa trước khi chọn khoảng thử lại**, rồi đo lại với chính `Backend.py` làm bên giữ khóa.
- **Tự tìm ra lỗi trong kiểm thử của mình** lúc chứng minh kiểm thử cắn: `subprocess.run` đóng stdin sớm khiến backend B dừng trước khi kịp chạy tới bước khóa. Agent sửa lỗi đó, chứ không coi lượt hỏng đó là bằng chứng.
- **Tách mã thoát**: lỗi I/O thật trả mã 2, còn "tệp dữ liệu đang có backend khác dùng" trả mã 3.

## Tôi kiểm lại độc lập (Linux, Python 3.13.13)

| Kiểm | Kết quả |
|---|---|
| Phạm vi | Đúng 8 tệp trong `Backend/` đổi, khớp báo cáo. Hợp đồng, `.plan/`, `CLAUDE.md` không đổi. `Desktop/src/main.ts` có thời điểm sửa đổi mới (21:41 ngày 27, trước phiên), nhưng nội dung **giống từng byte** bản đã audit ở phiên 14 (cùng SHA-256): tệp chỉ bị chạm, không bị sửa |
| **Toàn bộ kiểm thử backend, nhánh `fcntl`** | **381 passed** (375 cũ + 6 mới), 266 s |
| Chứng minh cắn, làm lại | Thay bước giành khóa bằng một bước chỉ mở tệp mà không khóa: **2 ca hỏng** (backend thứ hai trên cùng tệp; và "không tạo tệp dữ liệu mình không sở hữu"). Khôi phục: 6/6 đạt |
| **Race, ca mới của Orchestrator** | 5 tiến trình `Backend.py` thật khởi động cùng lúc trên một tệp dữ liệu mới tinh, 10 vòng: **10/10 vòng có đúng một bản in `READY`, mọi bản khác thoát mã 3.** Trong lúc bản giữ khóa chạy, một kết nối SQLite khác vẫn đọc được tệp dữ liệu (25 bảng) |
| Nhả khi bị giết | Sau `SIGKILL`, backend mới in `READY` trong 0,35–0,45 s, tính cả thời gian khởi động bình thường (5 vòng) |
| BE-1, môi trường ảo mới tinh | `pip install -r requirements.txt` vào một venv mới: không có `pytest`, `httpx`, `pygments`. Backend in `READY`, đóng stdin thì thoát mã 0, tạo `data.db` và `data.db.lock` |
| Code của Main | Thứ tự đúng plan: kiểm biến `CT_*` → tạo thư mục → giành quyền → mở DB. Dừng: `db.close()` → mở khóa tường minh → đóng fd. Không khóa gì trên `data.db`. Giá trị cấu hình nằm trong `backend.yaml` (`lock_file_suffix`, `retry_window_ms` 2000, `retry_interval_ms` 50, `database_in_use_exit_code` 3) |
| Checkpoint | Ba khối parse được bằng YAML, cả ba có `NOTES: []`. Main: 14 EXPERIENCES (EXP-011 tới 014 mới), 6 EVIDENCE, `claim` CORS đã theo 6.0.1 ("không nhận `Access-Control-Allow-Origin`"). `record_payment` và `view_income_report`: NOTE cũ chuyển thành EXPERIENCES, **chỉ phần chú thích đổi** |
| `Backend.pyproj` | Có `tests\test_database_ownership.py` và `requirements-dev.txt` |

**Không kiểm lại được từ đây** (cần Windows): nhánh `msvcrt`, số đo độ trễ trên Windows, Desktop `npm test` 14/14, `test:packaged` 6/6, UI e2e 4/4, và kích thước `site-packages` đo trên Windows.

Nhánh Windows đã được agent chạy trên máy thật: 381/381 và 6/6. Còn tôi, trong phiên này, đã chạy nhánh Linux, là phần agent không chạy được. Hai nhánh chỉ khác nhau ở một lời gọi hàm khóa.

## Phát hiện

Không có phát hiện nào chặn đường.

- **Q15-1 — `data.db.lock` nằm lại vĩnh viễn trong thư mục dữ liệu** (mức thấp, ghi cho phiên sau). Đây là hành vi đúng: chỉ **khóa** mất đi khi tiến trình dừng. Nhưng plan của `backup_data` (chặng E) và `restore_data` (chặng F) phải ghi rõ hai điều: không sao lưu tệp này, và không xóa hay di chuyển nó. Agent đã ghi trong `main-EXP-013`. Tôi thêm vào sổ tồn đọng để plan chặng E và F trích lại.
- **Q15-2 — Mã thoát 3 chưa được desktop diễn giải** (mức thấp, không làm ở V1). Desktop Main coi mọi lần thoát trước `READY` là một lần thử hỏng, và thử lại ba lần. Với mã 3, thử lại trên cổng khác là vô ích; sau khoảng 6 s, người dùng thấy thông báo chung "The backend could not start". Chấp nhận ở V1: tình huống này chỉ xảy ra khi có bản sao do antivirus tạo ra. Nếu sau này muốn có thông báo riêng, việc đó thuộc phiên desktop.
- **Q15-3 — `UI/evidence/` lại bị ghi đè** với tên người chạy sai (UI-2). Phải làm ở đầu D1.
- **Số thứ tự phiên `#5`:** đúng. Ngày 2026-09-27 có các phiên 11–15, tức `#1` tới `#5`.

## Đề xuất

1. **Phiên 15: chấp nhận.** Đóng BE-1, BE-2, BE-3 trong `.plan/open_issues.md`. DSK-2 được xử lý về phía dữ liệu: bản sao do antivirus tạo ra không còn mở được tệp dữ liệu khi bản thật đang chạy, và ngược lại. Nguyên nhân gốc (exe chưa ký) vẫn để chặng G.
2. **`CLAUDE.md` mục 5** (Orchestrator làm): ghi `requirements-dev.txt` là tệp cài môi trường phát triển, và `requirements.txt` là tệp của bản đóng gói.
3. **Việc tiếp theo: D1**, trang thêm, sửa, lưu trữ khách hàng. Đầu phiên làm UI-1, UI-2 và UI-3.
