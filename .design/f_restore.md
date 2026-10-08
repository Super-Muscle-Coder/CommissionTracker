# Chặng F — Khôi phục dữ liệu, hướng B: "chuẩn bị, rồi mở lại để hoàn tất"

*Orchestrator, 2026-10-08. Project Owner chọn hướng B ngày 2026-10-08 (`.design/v1_scope.md` mục 4). Tài liệu bền, chỉ Orchestrator sửa; coding agent chỉ đọc.*

Đặc tả này là căn cứ cho:
- **CT-7**, đề xuất sửa hợp đồng: Data Schema `9.0.3` → `10.0.0`, API Contract `4.0.0` → `5.0.0`;
- ba phiên của chặng F (mục 6).

Chỗ nào hợp đồng đã ghi thì theo hợp đồng.

---

## 1. Vì sao là hướng B

Hợp đồng hiện tại (hướng A, `restore:start`) dừng backend **trong lúc** giao diện và `reminder_ticker` vẫn đang gọi vào nó. Hướng B tách việc khôi phục làm hai pha:

- **Pha 1, lúc ứng dụng đang chạy:** kiểm tệp sao lưu, tạo bản sao lưu an toàn, ghi lại "có một lần khôi phục đang chờ". Không đụng vào dữ liệu đang dùng. Backend vẫn chạy.
- **Pha 2, ở lần mở ứng dụng kế tiếp,** sau khi backend `READY` và **trước khi mở cửa sổ:** thay tệp dữ liệu. Lúc này chưa có giao diện, chưa có `reminder_ticker`, nên không có bên gọi nào khác ngoài chính việc khôi phục.

Pha 2 vẫn dừng và khởi động lại backend, vẫn hoàn tác nếu hỏng: phần điều phối của hướng A còn nguyên. Cái bỏ đi là rủi ro **có bên khác đang gọi backend** trong lúc nó bị dừng. Cái giá là họa sĩ phải tự đóng rồi mở lại ứng dụng.

Một hệ quả phải nói rõ với họa sĩ: dữ liệu họ nhập **sau** lúc chuẩn bị và **trước** lúc mở lại sẽ không có trong dữ liệu sau khôi phục. Bản sao lưu an toàn được tạo lúc chuẩn bị, nên cũng không chứa phần đó. Tệp dữ liệu cũ được giữ lại ở pha 2 (mục 3, bước 4) thì chứa, nhưng chỉ lấy được bằng tay. Trang Khôi phục nói điều này trước khi họa sĩ xác nhận, và cho hủy lần khôi phục đang chờ.

## 2. Pha 1 — chuẩn bị (lối vào `ipc` `restore:prepare`)

Bên gọi: giao diện (`external`), với đường dẫn tệp họa sĩ chọn qua `native_dialogs.open_file`.

1. Kiểm đầu vào: `archive_path` là `file_path`. Sai thì trả 400.
   Qua bước này thì xóa bản ghi khôi phục đang chờ, nếu có: một yêu cầu mới thay mọi yêu cầu cũ, và yêu cầu mới hỏng thì không còn gì đang chờ. Lý do: `backup_data.prepare_restore` xóa tệp chờ cũ mỗi lần nó qua được bước kiểm tồn tại, nên bản ghi cũ không còn đáng tin.
2. Gọi `backup_data.prepare_restore` với `archive_path`.
   - 404: trả 404.
   - 200 với `is_valid` hoặc `is_compatible` là `false`: trả 409 `ERR_INCOMPATIBLE_BACKUP`, kèm `reason` trong `details`. Không có gì đang chờ.
   - 500, hoặc không tới được backend: trả 503 `ERR_SERVICE_UNAVAILABLE`. Không có gì đang chờ.
3. Tạo thư mục bản sao lưu an toàn nếu chưa có: `<thư mục chứa db_file_path>/<tên thư mục trong Configs của restore_data>`. Giá trị nội bộ; đề xuất tên `safety-backups`.
4. Gọi `backup_data.create_backup` với `{ destination_dir: <thư mục đó>, purpose: 'pre_restore' }`.
   - Hỏng: trả 424 `ERR_STORAGE_IO`. Không có gì đang chờ.
5. Ghi **bản ghi khôi phục đang chờ** vào tệp riêng của `restore_data`: `<thư mục chứa db_file_path>/<tên tệp trong Configs>`; đề xuất tên `restore-pending.json`.
   - Ghi nguyên tử: tệp tạm rồi đổi tên.
   - Nội dung gồm các trường của `pending_restore_record` (mục 4), cộng `staged_db_path` (nội bộ, không trả ra ngoài).
   - Đã có bản ghi cũ thì ghi đè: lần chuẩn bị mới nhất thắng.
   - Ghi hỏng: trả 500 `ERR_STORAGE_IO`. Không có gì đang chờ. Bản sao lưu an toàn vừa tạo được giữ lại.
6. Trả 200 `restore_scheduled`, tức một `pending_restore_record`.

Pha 1 không chạm vào tệp dữ liệu đang dùng, và không chạm vào tệp chờ: tệp đó là của `backup_data`.

## 3. Pha 2 — áp dụng (lối vào `in_process` `apply_pending_restore`)

Bên gọi: hạ tầng cắt ngang mới **`restore_trigger`** của desktop. Main khởi động nó **một lần**, sau khi backend `READY` và `restore_data` đã được ráp nối, **trước khi tạo cửa sổ**. Main chờ nó xong rồi mới mở cửa sổ.

1. Không có bản ghi đang chờ: trả `outcome: 'none'`. Không làm gì.
2. Bản ghi đọc không được, hoặc tệp chờ `staged_db_path` không còn: xóa bản ghi, trả `outcome: 'discarded'`, kèm `reason`. Không đụng dữ liệu đang dùng.
3. Dừng backend qua `backend_controller`. Đây là công cụ quản lý vòng đời Main trao lúc ráp nối, như hợp đồng hiện tại đã khai.
4. Đổi tên tệp dữ liệu đang dùng sang `<thư mục chứa db_file_path>/<thư mục trong Configs>/data-<thời điểm>.db`; đề xuất thư mục `restore-previous`. Tệp này được **giữ lại**, không xóa.
5. Chuyển tệp chờ vào đúng `db_file_path`.
6. Khởi động backend qua `backend_controller`, trên **cùng cổng**, và chờ `READY`.
7. `READY`: xóa bản ghi đang chờ, trả `outcome: 'restored'`.
8. Bước 4, 5 hoặc 6 hỏng: dừng backend nếu nó đang chạy, đưa tệp ở bước 4 về lại `db_file_path`, khởi động backend, chờ `READY`. Xóa bản ghi đang chờ, trả `outcome: 'rolled_back'`, kèm `reason`. Bản ghi bị xóa để lần mở sau không thử lại mãi.
9. Lần khởi động ở bước 8 cũng hỏng: báo lỗi `500 ERR_RESTORE_FAILED`. Main dừng với hộp thoại lỗi khởi động tiếng Việt như mọi lần backend không lên được. Tệp dữ liệu cũ nằm ở `db_file_path`, nên lần mở sau dùng lại dữ liệu cũ.

**`restore_trigger`** chỉ kích hoạt và trình bày, không quyết định gì:
- `outcome` khác `'none'` thì hiện một hộp thoại thông báo của hệ điều hành, modal với cửa sổ (hoặc không có cửa sổ cha, vì cửa sổ chưa mở). Chữ dựng từ các trường của `restore_outcome`, nằm trong `configs/desktop.json`.
- `'none'` thì không hiện gì.

## 4. Hình dạng ở ranh giới (đề xuất cho CT-7)

```
pending_restore_record: object {
  archive_path: file_path,          # tệp sao lưu họa sĩ chọn
  archive_app_version: string,      # app_version trong tệp đó
  archive_created_at: timestamp,    # lúc tệp đó được tạo
  safety_backup_path: file_path,    # bản sao lưu an toàn vừa tạo ở pha 1
  prepared_at: timestamp
}
restore_status:        object { pending: pending_restore_record|null }
restore_cancellation:  object { canceled: boolean }      # true khi có một lần đang chờ và nó vừa bị hủy
restore_outcome:       object { outcome: 'none'|'restored'|'rolled_back'|'discarded',
                                archive_path: file_path|null, safety_backup_path: file_path|null,
                                reason: string|null }
```

## 5. Lối vào (đề xuất cho CT-7)

| Lối vào | Hình thức, địa chỉ | Bên gọi | Kết quả |
|---|---|---|---|
| `request_restore` | ipc `restore:prepare`, input `[archive_path]` | `external` | 200 `restore_scheduled`; 400 `ERR_VALIDATION`; 404 `ERR_NOT_FOUND`; 409 `ERR_INCOMPATIBLE_BACKUP`; 424 `ERR_STORAGE_IO` (bản an toàn hỏng); 500 `ERR_STORAGE_IO` (bản ghi không ghi được); 503 `ERR_SERVICE_UNAVAILABLE`. Mọi nhãn từ 404 trở đi: không có gì đang chờ. Riêng 400 giữ nguyên bản ghi cũ: lời gọi sai định dạng không qua bước 1 (sửa 2026-10-08, audit phiên 35 §5.1). Ngoại lệ hiếm: bước 1 không xóa được bản ghi cũ thì trả 500 và bản ghi cũ còn đó (audit phiên 35 §5.3) |
| `get_restore_status` | ipc `restore:status`, input none | `external` | 200 `restore_status`; 500 `ERR_STORAGE_IO` |
| `cancel_restore` | ipc `restore:cancel`, input none | `external` | 200 `restore_cancellation`; 500 `ERR_STORAGE_IO` |
| `apply_pending_restore` | in_process `apply_pending_restore`, input none | `restore_trigger` | 200 `restore_outcome`; 500 `ERR_RESTORE_FAILED` |
| `native_dialogs.open_file` | ipc `dialog:open-file` | `external` | đã có trong hợp đồng; hiện thực ở phiên 35 |

Lối vào `start_restore` (`restore:start`) và output `restore_result` bị **bỏ**.

Mọi lối vào `ipc` của `restore_data` kiểm khung gửi như `native_dialogs` (cửa sổ chính, origin bằng `ui_origin`), và chỉ được gọi qua `invoke`. Preload chỉ chuyển các địa chỉ đã hiện thực.

## 6. Chia phiên

1. **Phiên 35 (desktop): pha 1.**
   - workflow `restore_data` đủ năm lớp ở `Desktop/src/workflows/restore_data/`. Đây là workflow đầu tiên của desktop;
   - ba lối vào `restore:prepare`, `restore:status`, `restore:cancel`;
   - `native_dialogs.open_file`;
   - DSK-22.

   Chưa có pha 2: một bản ghi đang chờ chỉ nằm đó.
2. **Phiên 36 (desktop): pha 2.**
   - `backend_controller` của Main;
   - `apply_pending_restore`;
   - `restore_trigger` và hộp thoại kết quả;
   - khứ hồi thật: tạo dữ liệu, sao lưu, đổi dữ liệu, chuẩn bị, mở lại, thấy dữ liệu cũ;
   - các ca hỏng và hoàn tác; bản đóng gói.
3. **Phiên 37 (giao diện):** làm lại I1 cho khôi phục, rồi làm trang hoặc phần Khôi phục. Phần này gọi `open_file`, `restore:prepare`, `restore:status`, `restore:cancel`; xác nhận trước khi chuẩn bị, nói rõ hậu quả (§7.2 nguyên tắc 5) và chuyện mất dữ liệu nhập sau lúc chuẩn bị.

**Chặng F xong khi:** họa sĩ chọn một tệp sao lưu từ giao diện, chuẩn bị, đóng rồi mở lại ứng dụng, và thấy đúng dữ liệu trong tệp sao lưu. Một tệp hỏng hay mới hơn bị từ chối mà không có gì thay đổi. Một lần áp dụng hỏng được hoàn tác về dữ liệu cũ. Trang Khôi phục `hoàn_tất`.

## 7. Điều Orchestrator chưa nắm chắc (đo ở phiên, không đoán)

- Backend khởi động lại **trên cùng cổng** ngay sau khi dừng có lúc bị từ chối vì cổng chưa nhả không. Phiên 36 đo. Nếu có, đề xuất sửa hợp đồng, không vá bằng cách thử cổng khác.
- Trên Windows, đổi tên `data.db` ngay sau khi tiến trình backend thoát có lúc gặp khóa của antivirus không. Phiên 36 đo, trên máy có AVG và ReasonLabs bật.
- Hộp thoại thông báo của Electron trước khi có cửa sổ: phiên 36 đo hành vi thật trên Windows.
