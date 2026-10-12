# Audit phiên 41 — backend (chặng G: BE-11, BE-9, BE-10)

**Ngày audit:** 2026-10-12. **Người audit:** Orchestrator.
**Phiên được audit:** `coding-agent@2026-10-11#3`, checkpoint ghi lúc `2026-10-11T20:46:15.5976649+07:00`.
**Hợp đồng:** Data Schema `10.0.1`, API Contract `5.0.0` (không đổi).
**Plan:** `.plan/backend_plan.md` (commit `71a8075`).

## 1. Kết luận

**Đạt.** Cả ba mã đóng: BE-11, BE-9, BE-10. Số liệu trong báo cáo khớp với số tôi tự chạy ra. Ba phép cắn của agent và ba phép cắn riêng của tôi đều bị bắt, và bị bắt **đúng ở khẳng định cần bắt**. Không có phát hiện chặn. Có hai ghi nhận thấp (§5), không cần phiên vá.

## 2. Đối chiếu tệp

- `git status --short` (bản PO gửi) có 20 tệp sửa và 7 tệp mới, tất cả trong `Backend/`. Khớp báo cáo. Không có tệp nào ngoài `Backend/`.
- `git -c core.ignorecase=true check-ignore -v` cho 7 tệp mới: rỗng (không bị bỏ qua).
- `Backend.pyproj` có thêm 7 mục `<Compile Include>` tương ứng.
- `adapters.py` của các workflow bị cắn đã trở về đúng như HEAD (chỉ khác ký tự xuống dòng, vô hại với `* text=auto`).
- Không có bước nâng cấp nào được thêm vào `_STORAGE_UPGRADES` của mã sản phẩm: cả sáu danh sách vẫn chỉ có bước 1. Mỗi kiểm thử còn tự khẳng định điều này ở dòng đầu (`== [1]`).
- `scaffold_backend` và thân `ensure_storage()` không đổi.

## 3. Chạy lại

**Môi trường:** Linux, Python 3.13.13, pytest 9.0.2, bản sao `git archive HEAD` cộng các tệp phiên 41. Agent chạy trên Windows 11, Python 3.13.12, antivirus bật.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `pytest` lượt 1 | 573 passed | 573 passed (241 s) | khớp |
| `pytest` lượt 2 | 573 passed | 573 passed (289 s) | khớp |
| `pytest` lượt 3 | 573 passed | 573 passed (242 s) | khớp |
| Desktop `npm test` | 79/79 | 69 đạt, 10 hỏng do môi trường Linux (dưới đây) | đủ cho mục đích audit |
| UI `npm run build && npm run e2e` | 83/83 | không chạy lại | UI và hợp đồng không đổi |

**Desktop trên Linux.** Tôi chạy để kiểm `main()` thật (đường gọi `wire_workflows(..., app_version=...)` từ tiến trình thật) với backend phiên 41. Các ca dùng backend thật đều đạt: V1 (G-VER, `app_version` ghi vào bản sao lưu), D1 (nhắc việc), A2 (khứ hồi khôi phục thật), A4, A5, và phần thân ca 1 (READY, `GET /clients`). Mười ca hỏng đều do môi trường, không liên quan phiên 41:
- 7 ca `desktop_main` hỏng ở khẳng định "launcher `python.exe` cộng `python.exe` thật" (`>= 2` tiến trình python). Trên Linux, trình bọc `env/Scripts/python.exe` của bản sao dùng `exec`, nên chỉ có một tiến trình. Các ca này để lại một `python Backend.py`, làm khẳng định "không sót python" ở cuối bộ kiểm thử cũng hỏng theo;
- 1 ca ngôn ngữ (DSK-15): locale của Chromium trên Linux;
- 2 ca `show_inactive`: gọi `powershell.exe`, không có trên Linux.

Agent không chạy được ở nhánh POSIX (báo cáo "Điều cần biết"). Ba lượt `pytest` của tôi trên Linux là bằng chứng nhánh đó.

**Tiêu chí khác:** checkpoint ghi giờ nguyên `Get-Date -Format o` (bảy chữ số thập phân), `UNSOLVED_PROBLEMS: []`. Cả ba lượt `pytest` chạy sau lần sửa checkpoint cuối, theo báo cáo.

## 4. BE-11 — kiểm thử nâng cấp cấu trúc

### 4.1 Cách làm

Harness `Backend/tests/storage_upgrade.py`: `boot(db_path)` mở kết nối mới tới cùng tệp rồi gọi `Backend.wire_workflows`, chính lệnh chạy mọi `ensure_storage()`. Mỗi workflow có một tệp `test_<w>_storage_upgrade.py` với một ca, theo cùng khuôn:

1. tạo dữ liệu ở phiên bản 1 bằng mã thật, qua `http`;
2. khởi động lại với `_STORAGE_UPGRADES` có thêm bước 2 giả (monkeypatch, chỉ trong kiểm thử);
3. khẳng định (a) bước 2 đã chạy, (b) dữ liệu đọc qua `http` không đổi, (c) bảng phiên bản có đúng một dòng, giá trị 2;
4. (d) khởi động lần ba: bước 2 không chạy lại. Nếu chạy lại, nó sẽ hỏng vì cột hay chỉ mục đã có;
5. (e) trên một tệp mới ở phiên bản 1: bước 2 gồm một câu đúng rồi một câu sai. Khởi động ném `sqlite3.OperationalError`, phiên bản vẫn 1, tác dụng của câu đúng không còn, rồi dữ liệu cũ đọc lại vẫn nguyên.

| Workflow | Bước 2 giả |
|---|---|
| `manage_client` | `ALTER TABLE client ADD COLUMN upgrade_probe` |
| `manage_commission` | `ALTER TABLE commission ADD COLUMN upgrade_probe` |
| `update_progress` | `ALTER TABLE stage_change ADD COLUMN upgrade_probe` |
| `record_payment` | `CREATE INDEX payment_by_paid_at` |
| `manage_watermark_profile` | `ALTER TABLE watermark_profile ADD COLUMN upgrade_probe` |
| `send_reminder` | `ALTER TABLE reminder_notification ADD COLUMN upgrade_probe` |

Cả năm khẳng định đều đạt ở cả sáu workflow, cả ba lượt, trên cả hai máy. **Khẳng định (e) đạt** mà không phải sửa gì: `ensure_storage()` chạy mọi bước và việc ghi phiên bản trong một `db.transaction()` (`BEGIN IMMEDIATE`).

### 4.2 Phép cắn

Agent làm ba phép cắn theo plan: (a) bỏ `UPDATE` phiên bản, (b) `>` thành `>=`, (c) mỗi câu một giao dịch. Cả ba bị bắt. Agent ghi đúng rằng phép (c) phải cắn ở mức từng câu, vì trong (e) hai câu nằm chung một bước.

Tôi cắn thêm ba phép, mỗi phép trên một bản sao riêng và ở **workflow khác** với phép của agent:

| # | Phép cắn | Ca bị bắt | Hỏng ở |
|---|---|---|---|
| O1 | `manage_commission`: `COMMIT; BEGIN IMMEDIATE` sau mỗi câu nâng cấp | `test_manage_commission_storage_upgrade` | `assert not has_column(failing_path, "commission", "upgrade_probe")`, tức khẳng định (e) |
| O2 | `send_reminder`: bỏ nhánh `UPDATE` phiên bản | `test_send_reminder_storage_upgrade` | `assert version_rows(...) == [2]`, tức khẳng định (c): `[1] == [2]` |
| O3 | `Backend.py`: `app_version: str = "1.0.0"` (đặt lại giá trị mặc định) | `test_wiring_without_app_version_is_a_type_error_and_wires_nothing` | không còn `TypeError` |

Ba phép đều bị bắt đúng khẳng định cần bắt. Các bản sao bị cắn ở ngoài kho, đã bỏ.

### 4.3 Nhận xét

- Cách khởi động lại qua `wire_workflows` không đi qua `db_connection` của tiến trình thật. Chấp nhận được: `ensure_storage()` là đúng đoạn mã cần đo, và đường tiến trình thật đã có ca riêng (`tests/test_backend_process.py`, cộng các ca Desktop dùng backend thật ở §3).
- (d) dựa vào việc câu giả sẽ hỏng nếu chạy lại (`duplicate column name`; với `record_payment` thì `CREATE INDEX` không có `IF NOT EXISTS` cũng hỏng). Đúng và đơn giản.

**Hệ quả cho DSK-21 tiêu chí 4:** đã có bằng chứng cơ chế ở mức backend, đúng như hướng A. Lần đầu có bước nâng cấp thật, tiêu chí 4 vẫn phải chạy đầy đủ qua bộ cài.

## 5. BE-9 và BE-10

### 5.1 BE-9

`wire_workflows(app: FastAPI, db, configs: dict, *, app_version: str, reminder_clock=None, backup_clock=None)`, không còn giá trị mặc định cho `app_version`. Nhánh "không ráp `backup_data`" đã bỏ. Ca `test_backup_is_not_wired_without_app_version` được thay bằng ca khẳng định ba điều: có `TypeError`, `app.routes` không đổi, DB không có bảng nào. Phép O3 xác nhận ca này có răng.

Số chỗ gọi là 19 (18 trong kiểm thử, cộng `main()`), không phải 22 như plan ghi. **Lỗi đếm của tôi trong plan**, agent đếm đúng.

### 5.2 BE-10

| Vị trí | Việc làm | Kiểm lại |
|---|---|---|
| `# noqa: F401` ở **8** `services.py` | bỏ; thêm `__all__ = ["StorageIOError"]` | grep không còn; router nào cũng nhập rõ tên từ `.services` nên `__all__` không ảnh hưởng gì |
| `# type: ignore[misc]` ×2 ở `compare_semver` | kiểm tường minh, ném `ValueError`; thêm ca tham số hóa `test_compare_semver_rejects_a_text_that_is_not_a_version` | đạt |
| `# pragma: no cover` ở `test_manage_client.py` | bỏ chú thích, giữ mã | đạt |

Plan ghi 7 dòng `noqa`, thực tế 8: tôi đếm sót `manage_commission`. **Lỗi đếm của tôi trong plan**, agent tìm ra và làm đủ.

Tôi grep toàn bộ `Backend/` của bản sao (trừ `env/`, `__pycache__/`) tìm `noqa`, `type: ignore`, `pragma` dạng chú thích: không còn. Các chữ `PRAGMA` còn lại là câu lệnh SQL.

### 5.3 Ghi nhận thấp (không cần phiên vá)

**L1 — `__all__` chỉ có một tên.** Theo quy ước Python, `__all__` liệt kê **mọi** tên công khai của module. Ở đây nó chỉ có `StorageIOError`, kèm chú thích "the name imported only to be re-exported". Đây là cách đọc hợp lý của câu chữ trong plan, vốn **không rõ ý** (lỗi của plan). Hệ quả thực tế bằng không: không ai `from … services import *`. Nếu một ngày có, các lớp Service sẽ không được xuất. Ghi vào BE-10 để chặng H quyết: giữ nguyên kèm chú thích hiện có, hoặc liệt kê đủ.

**L2 — Ghi chú cũ về mốc `%APPDATA%`.** Agent báo `%APPDATA%\CommissionTracker` đã tồn tại sẵn trên máy (`data.db` 114 688 B, ngày 28/9/2026), không phải "không tồn tại" như một ghi chú cũ trong checkpoint Main. Mốc không đổi trong phiên, nên không có vi phạm. Ghi chú cũ đó để chặng H dọn.

## 6. Việc tồn đọng

- **Đóng:** BE-9, BE-10, BE-11 (2026-10-12, phiên 41).
- **Thêm vào BE-10 (đã đóng), để chặng H xem:** L1.
- Không mở mục mới.

## 7. Bước tiếp theo

- Commit phiên 41: `CAS41 - Backend: storage upgrade tests (BE-11), app_version required (BE-9), suppressions removed (BE-10)`.
- Commit của Orchestrator: `OS - Audit session 41; BE-9, BE-10, BE-11 closed`.
- Chặng G còn phần F của runbook (ENV-4), Project Owner chạy khi tiện. Sau đó sang chặng H.
