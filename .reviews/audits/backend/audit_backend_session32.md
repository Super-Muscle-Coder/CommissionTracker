# Audit phiên 32 — backend, workflow `backup_data` (chặng E, phiên 1/3)

- Orchestrator, 2026-10-07.
- Plan: `.plan/backend_plan.md` (phiên 32). Hợp đồng: Data Schema 9.0.2, API Contract 4.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-07 10:52 (chưa commit), đặt lên `HEAD = 7fa2825`.

## 1. Kết luận

**Đạt.** Workflow đúng hợp đồng và đúng Bước 5.6. Mọi số liệu tôi chạy lại được trên Linux đều khớp báo cáo của agent. Ba phép cắn của agent được ghi đủ, và tôi thêm bốn phép cắn của riêng mình.

**Phải xử lý trước khi commit** (agent phát hiện và báo đúng, §5.1): `.gitignore` gốc bỏ qua cả thư mục `Backend/workflows/backup_data/` trên Windows. Orchestrator đã thêm một dòng ngoại lệ (§5.1). Commit `.gitignore` phải đi **trước** commit CAS32.

Đề xuất hợp đồng (§6): `backup_data` lên `đã_hoàn_thiện`, Data Schema 9.0.3. Chờ Project Owner duyệt.

## 2. Tệp thay đổi

| Tệp | Nội dung |
|---|---|
| `Backend/workflows/backup_data/` (mới) | `configs.yaml`, `entities.py`, `adapters.py` (313 dòng), `services.py` (573 dòng, có checkpoint), `routers.py`, `tests/test_backup_data.py` (104 ca) |
| `Backend/Backend.py` | ráp nối ở Order 2; `wire_workflows` có thêm `app_version` và `backup_clock` (tham số từ khóa); `main()` truyền `launch.app_version`; thêm main-EXP-015 |
| `Backend/Backend.pyproj` | 7 `Compile`, 1 `Content`, 2 `Folder`, đúng thư mục thật |

Không đụng `scaffold_backend` hay workflow nào khác. Không thêm phụ thuộc.

## 3. Những gì đã tự chạy lại

**Linux**, Python 3.13 (venv audit), `TZ=Asia/Ho_Chi_Minh`.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) |
|---|---|---|
| `pytest workflows/backup_data` | 104 | 104, không ca nào bị bỏ qua: khứ hồi hai tiến trình và ca bản mới hơn đều chạy thật |
| `pytest` toàn bộ | 564 ×3 | **564 ×3** (234 s, 243 s, 237 s) |
| Nhánh POSIX của `publish` (`os.link`) | agent ghi "chưa chạy trên Linux" | đã chạy qua bộ kiểm thử trên Linux: đạt, kể cả ca không ghi đè |
| Checkpoint `backup_data` | YAML hợp lệ | 6 EXPERIENCES, 6 EVIDENCE, `UNSOLVED_PROBLEMS: []` |
| Checkpoint Main | YAML hợp lệ | 15 EXPERIENCES (main-EXP-015 mới), không trùng id |
| Giờ (BE-8) | `10:29:51.14` | `services.py` ghi lúc 10:29:57: đúng quy ước |

**Phép cắn thêm của Orchestrator**, trên bản sao; mỗi phép chỉ chạy `workflows/backup_data`:

| Phép cắn | Kết quả |
|---|---|
| (d) bỏ kiểm tên thành phần có đường dẫn (zip slip) | 6 ca hỏng |
| (e) `publish` dùng `os.replace`, tức cho phép ghi đè | 2 ca hỏng |
| (f) bỏ `staging.clear()` trong `prepare_restore` | 1 ca hỏng |
| (g) chụp mà không giữ khóa của `db_connection` | **0 ca hỏng**, xem §5.3 |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: `npm run dist`, `test:packaged` 8/8, đo tay trên `win-unpacked` (201 rồi 200 hợp lệ và tương thích; Python nhúng đủ `zipfile`, `zlib`, `hashlib`), Desktop 31/31, UI e2e 70/70.

## 4. Đối chiếu với plan và hợp đồng

**Khớp hợp đồng:**
- Hai địa chỉ và các nhãn đúng: `create_backup` 201, 400, 500; `prepare_restore` 200, 400, 404, 500. Không thêm nhãn; không dùng `ERR_INCOMPATIBLE_BACKUP`.
- Hình dạng `backup_archive_record` và `restore_staging` đủ trường. `staged_db_path` chỉ có giá trị khi hợp lệ và tương thích.
- "Compatible when not newer": thứ tự SemVer 2.0, có 16 cặp kiểm thử.
- Bước 5.6: chỉ chạm `db_connection` (chụp bằng `backup()` bên trong `read()`, và hỏi `PRAGMA database_list`). Không đọc bảng nào, không gọi workflow nào, không mở kết nối thứ hai tới tệp dữ liệu đang chạy.
- `app_version` lấy từ `CT_APP_VERSION` mà Main đã đọc. Không đặt giá trị mặc định.

**Khớp plan:**
- việc 2 đo trước rồi mới viết;
- định dạng `.ctbackup` gồm `manifest.json` và `data.db`;
- tên tệp trùng thì thêm hậu tố, không ghi đè;
- ghi nguyên tử;
- tệp chờ nằm cạnh tệp dữ liệu, mỗi lúc một tệp;
- chia mã lỗi đúng như plan;
- ca khứ hồi chạy trên backend thứ hai;
- ba phép cắn;
- đo trên bản đóng gói;
- mốc `%APPDATA%` không đổi.

**Ba điểm agent tự quyết, chấp nhận:**
1. **`wire_workflows(app_version=None)` thì không ráp `backup_data`.** Lý do: 20 chỗ gọi cũ trong kiểm thử của workflow khác không truyền tham số này, và agent không được sửa chúng. Cái giá: nếu quên truyền ở `main()` thì mất hai điểm giao tiếp mà không báo lỗi. Rủi ro đó được kiểm thử tiến trình thật của `backup_data` chặn lại. Ghi vào việc nên dọn khi có phiên chạm lại các kiểm thử đó (§5.4).
2. **Mỗi lần `prepare_restore` qua được bước 404 thì xóa tệp chờ cũ trước.** Nhờ vậy `staged_db_path: null` luôn đi kèm "không còn tệp chờ". Hợp lý, vì `restore_data` chỉ dùng câu trả lời gần nhất.
3. **Ngắt `backup()` khi SQLite báo BUSY hoặc LOCKED** (callback `progress`). Nếu không, `backup()` thử lại mãi trong khi vẫn giữ khóa, và cả backend đứng yên. Agent tự tìm ra bẫy này.

## 5. Phát hiện

### 5.1 `.gitignore` gốc bỏ qua `backup_data/` (phải xử lý trước commit)

Dòng 258 của mẫu Visual Studio là `Backup*/`. Git trên Windows (`core.ignorecase=true`) coi nó khớp `backup_data/`, nên cả workflow không bao giờ vào commit. Orchestrator tái hiện trên Linux với `core.ignorecase=true`: `git check-ignore` trỏ đúng dòng 258.

**Đã sửa (Orchestrator):** thêm vào cuối `.gitignore` gốc:

```
# Commission Tracker: the workflow backup_data is source code, not a Visual Studio backup folder
# (Backup*/ above matches it where git ignores case, as on Windows).
!Backend/workflows/backup_data/
```

Kiểm lại: tệp trong `backup_data/` hiện ra `??`. Các luật khác vẫn áp cho tệp bên trong, ví dụ `__pycache__/`.

**Bài học quy trình:** Orchestrator kiểm bằng cách clone kho, và với lỗi này đã không thấy workflow. Từ nay audit đối chiếu danh sách tệp trên đĩa với danh sách tệp sẽ vào commit (ENV-9).

### 5.2 Khóa Windows của tệp chờ và backend thứ hai (ghi nhận)

Ca khứ hồi chạy backend thứ hai trên `restore-staging/data.db`. Backend đó tạo `restore-staging/data.db.lock` của riêng nó. Lần `prepare_restore` sau xóa tệp chờ nhưng không xóa tệp `.lock`. Vô hại: tệp rỗng, không ai đọc. Chỉ ghi lại để phiên `restore_data` biết.

### 5.3 Không có kiểm thử nào chứng minh việc chụp giữ khóa `db_connection` (thấp)

Phép cắn (g) bỏ `read()` quanh `backup()` mà 104 ca vẫn đạt. Ca "15 lần ghi trong lúc sao lưu" không phân biệt được hai trường hợp, vì SQLite tự xử lý thay đổi từ chính kết nối nguồn.

Khóa vẫn cần, vì `SharedConnection` là một kết nối dùng chung giữa các luồng. Đọc mã thì thấy chụp nằm trong `with self._db.read()`, đúng như checkpoint và phép đo ở việc 2.

Không mở mục riêng; ghi ở đây để audit sau không bỏ sót nếu có ai sửa `DatabaseSnapshots.take`.

### 5.4 `app_version` tùy chọn trong `wire_workflows` (thấp; BE-9)

Xem §4, điểm 1. Việc dọn: khi một phiên backend chạm lại các kiểm thử gọi `wire_workflows`, cho chúng truyền `app_version`, rồi bỏ nhánh "không ráp".

## 6. Đề xuất sửa hợp đồng (chờ Project Owner duyệt)

**CT-6:** Data Schema `9.0.2` → **`9.0.3`**, chỉ đổi `clause_b_backend.backup_data.status`: `đang_chờ_triển_khai` → **`đã_hoàn_thiện`**.
- Không đổi hình dạng hay luật, nên là bản vá, như bản 9.0.1 trước đây.
- Changelog: "backup_data built in session 32 (both endpoints, 104 tests, packaged build verified), audit `.reviews/audits/backend/audit_backend_session32.md`".

## 7. Việc tồn đọng

- **Mới:**
  - ENV-9: `.gitignore` (§5.1), đã sửa, chờ commit;
  - BE-9 (thấp, §5.4);
  - CT-6 (đề xuất).
- **Chặng E:** phiên 1/3 xong. Tiếp theo là phiên desktop `native_dialogs.pick_folder`.
