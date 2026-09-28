# Audit phiên backend #2 — `coding-agent@2026-09-24#2`

*Orchestrator, 2026-09-24. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Công việc thật, đúng phạm vi, đạt đủ tiêu chí hoàn tất của plan. Đây là phiên đầu tiên có một agent mới hoàn toàn nhận việc chỉ từ checkpoint, plan và tài liệu. Agent tự đọc đúng thứ tự, nắm được hiện trạng, không hỏi lại điều gì đã có sẵn trong checkpoint. **Cơ chế bàn giao giữa các phiên hoạt động.**

- Chạy lại độc lập toàn bộ kiểm thử trên một máy khác (Linux, Python 3.11): **106/106 đạt**.
- Đọc toàn bộ code của `manage_commission`, cùng phần sửa ở `manage_client` và `Backend.py`.
- Bốn khối checkpoint (`main`, `scaffold_backend`, `manage_client`, `manage_commission`) nằm đúng vị trí, đúng khuôn 07.
- `Backend.pyproj` là XML hợp lệ, liệt kê 22 Compile, 6 Content, 9 Folder, khớp đúng với thư mục thật. Chỉ còn cần người vận hành mở thử trong Visual Studio.

## Đối chiếu với hợp đồng, plan và lý thuyết

| Điểm | Kết quả |
|---|---|
| Bảy điểm giao tiếp của `manage_commission`: đúng `form`, `address`, `input`, nhãn kết quả (kể cả `list_currencies` không có `500`) | Khớp |
| Hình dạng `commission_detail` (10 khóa), `commission_list` (6), `commission_summary` và `commission_index` (4) | Khớp |
| Quyết định nghiệp vụ nằm ở Services (khách đã lưu trữ; đổi đơn vị tiền; chỉ kiểm tra khách khi `client_id` đổi) | Khớp |
| Lời gọi `in_process` thật sang `manage_client` qua Adapter `ClientDirectory`; không import code, không đọc bảng `client`, không có khóa ngoại | Khớp |
| Entities của riêng `manage_commission` (kể cả `ClientSummary`) | Khớp |
| `supported_currencies` nằm trong `configs.yaml`, Main đọc rồi trao vào | Khớp |
| Nhãn `500`: chỉ lỗi `sqlite3` và `OSError` được chuyển thành lỗi lưu trữ; một lỗi lập trình vẫn là lỗi lập trình; không có handler chung ở Main | Khớp, có kiểm thử riêng |
| Gây lỗi lưu trữ thật (một kết nối khác giữ `BEGIN EXCLUSIVE` trên cùng tệp) | Đúng tinh thần plan |
| Tách checkpoint của Main; không nội dung nào nằm ở hai nơi | Khớp |
| Thứ tự ráp nối Order 3; giữ lối vào `in_process` cho các workflow sau | Khớp |

## Phát hiện cần quyết

1. **Cận trên của `amount_minor` phải là 2^53−1, không phải 2^63−1.** Agent đã phát hiện hợp đồng thiếu cận trên và chặn ở 2^63−1 (giới hạn của SQLite). Agent bỏ sót một điểm: giao diện viết bằng JavaScript, nơi mọi số trong JSON là số thực 64-bit. Số nguyên lớn hơn 2^53−1 (9.007.199.254.740.991) sẽ bị làm tròn âm thầm khi tới giao diện, nên số tiền hiển thị hay gửi lại có thể sai mà không ai hay. Đề xuất ghi cận trên 2^53−1 vào `types.money` của Data Schema. Đây là thay đổi phá vỡ (thu hẹp giá trị), nên Data Schema lên 2.0.0. Khi đó `manage_commission` phải sửa cận trên ở Routers.
2. **Tên bảng phiên bản của `manage_client`** là `client_schema_version`, lệch với quy ước `<tên_workflow>_schema_version`, trong khi `CLAUDE.md` lại lấy nó làm mẫu. Đề xuất giữ quy ước chặt: phiên sau thêm một bước nâng cấp đổi tên bảng (có xử lý tên cũ); `CLAUDE.md` đổi mẫu tham khảo sang `manage_commission`.
3. **`derived_from` đang được dùng để trỏ về id kinh nghiệm cũ** (khi chuyển mục sang checkpoint của Main), trong khi 07 định nghĩa nó là id của *vấn đề* đã sinh ra kinh nghiệm. Cách dùng này hữu ích cho việc truy vết. Đề xuất sửa 07 cho phép `derived_from` trỏ tới một mục kinh nghiệm cũ đã được chuyển hay viết lại.
4. Ghi chú trong `requirements.txt` còn ghi "Python 3.12+": sửa ở phiên sau.

## Đề xuất `status`

- `manage_client` → `đã_hoàn_thiện` ngay. Việc đổi tên bảng phiên bản là thay đổi nội bộ, không đổi ranh giới.
- `manage_commission` giữ `đang_triển_khai` cho tới khi áp cận trên mới của `money`, nếu mục 1 được duyệt.

## Chi phí

Context của phiên dùng khoảng 27% (Messages 266k). Phiên này làm nhiều hơn phiên 1 (một workflow mới, sửa một workflow, tách checkpoint, đồng bộ `.pyproj`), số kiểm thử tăng từ 44 lên 106. Chi phí tăng tương ứng, không có dấu hiệu lãng phí.
