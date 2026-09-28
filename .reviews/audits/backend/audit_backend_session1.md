# Audit phiên backend #1 — `coding-agent@2026-09-24#1`

*Orchestrator, 2026-09-24. Theo `08-operating-protocol.md`, Phần 5: kiểm trực tiếp thư mục dự án, không chỉ tin báo cáo.*

## Kết luận

Công việc thật, đúng phạm vi, chất lượng cao. Không phát hiện kết quả gán cứng hay code giả lập.

- Chạy lại độc lập toàn bộ kiểm thử trên một máy khác (Linux, Python 3.11, đúng các phiên bản trong `requirements.txt`): **44/44 đạt**.
- Tự kiểm thêm bằng cách gọi thẳng vào tiến trình `Backend.py` thật với các đầu vào mà bộ kiểm thử của agent không có. Kết quả đúng hợp đồng:
  - `display_name` dài 120 ký tự được nhận, 121 ký tự bị từ chối (`400`);
  - khóa thừa ở cả cấp ngoài lẫn cấp trong bị từ chối;
  - thiếu khóa `note` bị từ chối;
  - `is_archived: 1` (số thay vì boolean) bị từ chối;
  - `client_id` viết hoa trả `404`;
  - `/openapi.json` trả `404`;
  - đóng stdin thì tiến trình thoát mã 0, stdout chỉ có `READY`;
  - cơ sở dữ liệu chỉ chứa ba bảng của `manage_client`.
- Hai khối checkpoint nằm đúng vị trí và parse được bằng YAML. Có đủ năm trường đầu khối và bốn mục nội dung; `UNSOLVED_PROBLEMS` rỗng.

## Đối chiếu với hợp đồng và plan

| Điểm | Kết quả |
|---|---|
| Sáu điểm giao tiếp của `manage_client`: đúng `form`, `address`, `input`, nhãn kết quả | Khớp |
| Hình dạng `client_detail`, `client_list` (4 khóa), `client_summary` (2 khóa) | Khớp |
| `error_body`; không còn `422` mặc định của FastAPI; `/docs`, `/redoc`, `/openapi.json` đã tắt | Khớp |
| `scaffold_backend` chỉ có Configs + Adapters, không tạo bảng | Khớp |
| `manage_client` tự tạo bảng của mình trong Adapters (`ensure_storage`), được Main gọi | Khớp |
| Routers chỉ kiểm tra định dạng; Services giữ quyết định nghiệp vụ; Entities không dùng Pydantic | Khớp |
| Luật khởi động/dừng giữa các Main (`CT_*`, `READY`, đóng stdin) | Khớp |
| Thứ tự ráp nối theo `.design/03_classification.md` | Khớp |
| Đảo thứ tự việc 2 và 3 | Có lý do, đã ghi NOTES (được phép theo 08, Phần 6) |
| Chỉ ghi trong `Backend/` | Khớp. `Backend.pyproj` có thay đổi (thêm môi trường `env` 3.13 và `TestFramework`) — cần người vận hành xác nhận do ai sửa |

## Những điểm cần quyết

1. **Phiên bản Python.** Máy dùng 3.13 (môi trường `Backend\env` của Visual Studio). `CLAUDE.md` đang chốt 3.12. Đề xuất: sửa `CLAUDE.md` thành 3.13.
2. **Chạy lại EVIDENCE bằng đúng interpreter của project.** Agent chạy bằng `py -3.13`, có thể khác `Backend\env\Scripts\python.exe`. Nhờ người vận hành chạy `Backend\env\Scripts\python.exe -m pytest -q` từ thư mục `Backend` và gửi kết quả thô.
3. **Hợp đồng chưa có nhãn cho lỗi hạ tầng bất ngờ** (ghi, đọc cơ sở dữ liệu lỗi). Đây là lỗ ở khung hợp đồng, không chỉ ở `manage_client`.
4. **Nghĩa của `kiểu|null` trong cú pháp `type` còn mơ hồ.** Không rõ là "khóa có thể vắng" hay "khóa luôn có, giá trị có thể là null". Agent chọn cách thứ hai.
5. **Chưa có chỗ đặt checkpoint cho Main.** Kinh nghiệm cấp layer đang nằm tạm trong checkpoint của `scaffold_backend`.
6. **Quy ước phiên bản cấu trúc bảng theo từng workflow** (bảng `<workflow>_schema_version`). Nên nâng thành quy ước chung của dự án.

## Điểm nhỏ, không chặn

- `_now()` (đọc đồng hồ) và `uuid4()` nằm trong Services. Theo phép thử Adapters/Services, đây là công cụ (mọi cách làm đúng cho cùng kết quả), nên chặt chẽ ra thì thuộc Adapters. Không ảnh hưởng ranh giới.
- Đường dẫn hay phương thức không khai báo (ví dụ `DELETE /clients`) trả mã `405` kèm `ERR_VALIDATION`. Không vi phạm, vì đó không phải điểm giao tiếp đã khai báo.
- Ctrl+C mới được mô phỏng bằng tín hiệu, chưa thử bấm tay.
