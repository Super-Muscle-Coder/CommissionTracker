# Giai đoạn 3 — Phân loại chính thức các workflow của Commission Tracker

*Đầu ra của [Giai đoạn 3](../.claude/skills/wca-implementation/03-classify.md), dựa trên `.contracts/data_schema.yaml` và `.contracts/api_contract.yaml` phiên bản 1.0.0 (`approved`; bản 1.1.0 của Data Schema chỉ thêm luật khởi động/dừng giữa các Main và đổi `status`, không ảnh hưởng phân loại). Mọi kết luận dưới đây được tra từ hợp đồng, không suy đoán. Nếu hợp đồng đổi, tệp này phải được xét lại theo quy tắc quay lui.*

## Bước 3.1 — Phép thử gỡ bỏ

Với mỗi workflow, liệt kê những workflow có `from` trỏ tới nó, rồi xét hậu quả nếu nó biến mất: mất khả năng **tồn tại** (Main không khởi tạo và ráp nối được) hay chỉ mất khả năng **vận hành đúng** (vẫn tồn tại, nhưng thiếu dữ liệu khi được gọi).

| Workflow | Workflow có `from` trỏ tới nó (input) | Hậu quả nếu gỡ | Phân loại |
|---|---|---|---|
| `scaffold_backend` | `manage_client`, `manage_commission`, `update_progress`, `record_payment`, `manage_watermark_profile`, `apply_watermark`, `backup_data`, `send_reminder` (đều qua `db_connection`) | Tám workflow không có kết nối để Adapters của chúng được khởi tạo | **Nền tảng** |
| `manage_client` | `manage_commission` (`client_summary`) | `manage_commission` vẫn tồn tại; khi tạo hay sửa đơn thì không kiểm tra được khách hàng | Nghiệp vụ |
| `manage_commission` | `manage_client` (`client_id`), `update_progress`, `record_payment`, `apply_watermark` (`commission_summary`), `view_income_report`, `send_reminder` (`commissions`) | Tất cả vẫn tồn tại, chỉ thiếu dữ liệu đơn hàng khi chạy | Nghiệp vụ — nhiều bên phụ thuộc nhất, nhưng quy mô không phải tiêu chí |
| `update_progress` | `manage_commission` (`commission_id`), `view_income_report`, `send_reminder` (`progress`) | Vận hành | Nghiệp vụ |
| `record_payment` | `manage_commission` (`commission_id`), `view_income_report` (`payments`) | Vận hành | Nghiệp vụ |
| `view_income_report` | — | Không ảnh hưởng ai | Nghiệp vụ |
| `manage_watermark_profile` | `apply_watermark`, `verify_watermark` (`watermark_profile`) | Vận hành | Nghiệp vụ |
| `apply_watermark` | `manage_commission`, `manage_watermark_profile` (id tra cứu), `verify_watermark` (`registered_artwork`), `embed_watermark` (`embed_input`), `extract_watermark` (`extract_input`) | Vận hành | Nghiệp vụ |
| `verify_watermark` | `manage_watermark_profile` (`profile_id`), `apply_watermark` (`watermark_code`), `extract_watermark` (`extract_input`) | Vận hành | Nghiệp vụ |
| `backup_data` | `restore_data` (`restore_staging`, `safety_backup`) | Vận hành | Nghiệp vụ |
| `send_reminder` | — | Không ảnh hưởng ai | Nghiệp vụ |
| `init_watermark_engine` | `embed_watermark`, `extract_watermark` (`watermark_engine`) | Hai workflow không có engine để khởi tạo | **Nền tảng** |
| `embed_watermark` | `apply_watermark` (`watermarked_image`) | Vận hành | Nghiệp vụ |
| `extract_watermark` | `apply_watermark` (`readback`), `verify_watermark` (`extraction`) | Vận hành | Nghiệp vụ |
| `restore_data` | `backup_data` (`backup_request`, `archive_path`) | Vận hành | Nghiệp vụ |

Hai chiều của tra cứu đã khớp: hợp đồng đã qua bước kiểm tra tự động (mỗi `from` có output `consumed_by` trỏ ngược lại, và ngược lại).

⚠ **`from` hai chiều không có nghĩa là gọi nhau hai chiều.** Nhiều cặp workflow có `from` trỏ lẫn nhau, ví dụ `manage_client` ↔ `manage_commission`, `apply_watermark` ↔ `verify_watermark`, `manage_commission` ↔ `update_progress`. Lý do: bên gọi gửi tham số đi (một output của bên gọi) và nhận kết quả về (một output của bên được gọi). Chiều **gọi** thì chỉ đọc từ `called_by` trong API Contract, và ở hệ thống này không có cặp workflow nào gọi lẫn nhau. Vì vậy không có vòng phụ thuộc khi ráp nối (xem thứ tự ráp nối ở Bước 3.2).

`restore_data.backend_controller` là `from: main`: nó không tạo phụ thuộc vào workflow nền tảng nào, nên không ảnh hưởng phân loại.

## Bước 3.2 — Thứ tự khởi tạo

**Trong từng layer.** Mỗi layer có nhiều nhất một workflow nền tảng, nên không có thứ tự nào giữa các workflow nền tảng cần xét và không có phụ thuộc vòng. Lớp `clause_d_desktop` không có workflow nền tảng: nó không có gì cần chuẩn bị, còn việc quản lý vòng đời là của Main.

**Thứ tự ráp nối workflow nghiệp vụ trong backend** (theo 04, Bước 4.5, bước 3: bên được gọi `in_process` phải được ráp nối trước bên gọi):

1. `scaffold_backend`
2. `manage_client`, `backup_data`
3. `manage_commission` (gọi `manage_client`)
4. `update_progress`, `record_payment`, `manage_watermark_profile` (gọi `manage_commission`, trừ `manage_watermark_profile`)
5. `apply_watermark` (gọi `manage_commission`, `manage_watermark_profile`)
6. `verify_watermark` (gọi `apply_watermark`, `manage_watermark_profile`), `view_income_report`, `send_reminder` (gọi `manage_commission`, `update_progress`, `record_payment`)
7. Mở máy chủ `http`, rồi phát tín hiệu `READY`.

Các lời gọi `http` sang `clause_c_ai_service` không tạo ràng buộc thứ tự: bên gọi chỉ cần địa chỉ (`ai_service_base_url`), không cần layer kia đang chạy lúc khởi tạo.

**Giữa các layer** (việc của Main, theo tín hiệu sẵn sàng trong `mandatory_rules`):

1. Main của `desktop` khởi động `ai_service` và `backend`. Hai layer này không phụ thuộc nhau lúc khởi động, nên có thể khởi động song song.
2. Chờ `READY` của `backend`: bắt buộc. Chờ `READY` của `ai_service`: không bắt buộc. Quá thời gian chờ thì app vẫn chạy, chỉ các chức năng watermark trả `ERR_SERVICE_UNAVAILABLE`.
3. Ráp nối `restore_data` (trao công cụ `from: main`), đăng ký `native_dialogs` và các lối vào `ipc` của `restore_data`, chạy `restore_trigger` và chờ nó xong, rồi mới mở cửa sổ và khởi động `reminder_ticker`. *(Sửa 2026-10-08 theo CT-7: Data Schema 10.0.0, API Contract 5.0.0; `.design/f_restore.md`.)*

## Bước 3.3 — Các lớp của workflow nền tảng

| Workflow nền tảng | Configs | Entities | Adapters | Services | Routers | Checkpoint đặt ở |
|---|---|---|---|---|---|---|
| `scaffold_backend` | Có (`db_file_path`) | Không | Có (tạo thư mục và tệp nếu chưa có, mở kết nối, thiết lập cấp kết nối) | Không — chuỗi thao tác cố định, không có quyết định | **Không** — không ai gọi lại sau khởi động; câu hỏi "sẵn sàng chưa" là tín hiệu giữa các Main | Adapters |
| `init_watermark_engine` | Có (`payload_bits`, `strength_presets`, cùng giá trị nội bộ như vị trí trọng số) | Không | Có (nạp engine) | Không — trừ khi Giai đoạn 4 phát hiện việc nạp có quyết định thật (ví dụ chọn phương án dự phòng); khi đó thêm Services và ghi lý do vào checkpoint | **Không** | Adapters |

## Bước 3.4 — Workflow nghiệp vụ: đủ năm lớp, hình thức Routers

| Workflow | Layer | Hình thức Routers (từ API Contract) | Có lưu trữ riêng (Adapters tự tạo cấu trúc) |
|---|---|---|---|
| `manage_client` | backend | `http` (5, cho UI) + `in_process` (`get_client_summary`, cho `manage_commission`) | Có |
| `manage_commission` | backend | `http` (5) + `in_process` (2) | Có |
| `update_progress` | backend | `http` (5) + `in_process` (`list_progress_board`) | Có |
| `record_payment` | backend | `http` (4) + `in_process` (`list_payment_ledger`) | Có |
| `view_income_report` | backend | `http` (1) | Không |
| `manage_watermark_profile` | backend | `http` (5) + `in_process` (1) | Có |
| `apply_watermark` | backend | `http` (3) + `in_process` (`find_artwork_by_code`) | Có |
| `verify_watermark` | backend | `http` (1) | Không |
| `backup_data` | backend | `http` (2; `create_backup` được cả UI lẫn `restore_data` gọi) | Không có bảng riêng; thao tác cấp kho lưu trữ (05, Bước 5.6) |
| `send_reminder` | backend | `http` (5; `check_due` do `reminder_ticker` gọi) | Có |
| `embed_watermark` | ai_service | `http` (1) | Không (stateless) |
| `extract_watermark` | ai_service | `http` (1) | Không (stateless) |
| `restore_data` | desktop | `ipc` (3, cho UI: `restore:prepare`, `restore:status`, `restore:cancel`) + `in_process` (`apply_pending_restore`, cho `restore_trigger`) | Có, một tệp riêng (bản ghi khôi phục đang chờ) cạnh `db_file_path`; còn lại chỉ thao tác nguyên tệp |

Mọi workflow nghiệp vụ đều có đủ năm lớp, kể cả những workflow không lưu trữ: Adapters của chúng vẫn làm việc kỹ thuật (gọi workflow khác, đọc tệp, gọi dịch vụ AI).

## Hạ tầng cắt ngang

| Thành phần | Layer | Vai trò | Được Main khởi động khi |
|---|---|---|---|
| `reminder_ticker` | desktop | Bên gọi: gọi `send_reminder.check_due` theo nhịp, hiện toast | `backend` đã `READY` |
| `native_dialogs` | desktop | Bên được gọi (`entries`): mở hộp thoại tệp cho UI | Trước khi mở cửa sổ |
| `restore_trigger` | desktop | Bên gọi: một lần mỗi lần Main khởi động, gọi `restore_data.apply_pending_restore`, hiện kết quả bằng hộp thoại thông báo | Sau khi backend `READY` và `restore_data` đã ráp nối, trước khi mở cửa sổ; Main chờ nó xong |

## Kết quả

| Workflow | Layer | Phân loại | Thứ tự | Routers |
|---|---|---|---|---|
| `scaffold_backend` | backend | Nền tảng | Đầu tiên trong backend | Không |
| `init_watermark_engine` | ai_service | Nền tảng | Đầu tiên trong ai_service | Không |
| 12 workflow nghiệp vụ của backend và ai_service (bảng Bước 3.4) | như bảng | Nghiệp vụ | Thứ tự ráp nối ở Bước 3.2 | Có, như bảng |
| `restore_data` | desktop | Nghiệp vụ | Sau khi backend `READY` và Main có công cụ quản lý vòng đời | `ipc` + `in_process` |