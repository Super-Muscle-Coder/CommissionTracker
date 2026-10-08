# Audit phiên 35 — desktop, chặng F pha 1: `restore_data` (chuẩn bị), `native_dialogs.open_file`, DSK-22

- Orchestrator, 2026-10-08.
- Plan: `.plan/desktop_plan.md` (phiên 35). Đặc tả: `.design/f_restore.md`. Hợp đồng: Data Schema 10.0.0, API Contract 5.0.0 (CT-7).
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-08 15:04 (chưa commit), đặt lên `HEAD = 923cc9f`.

## 1. Kết luận

**Đạt.** Workflow đầu tiên của desktop có đủ các lớp, ba lối vào `ipc` đúng nhãn của hợp đồng, pha 1 không chạm dữ liệu đang dùng. `open_file` đúng hợp đồng. DSK-22 xong cả hai mục. Mọi số liệu tôi chạy lại được trên Linux khớp báo cáo của agent, và bốn phép cắn của riêng tôi đều làm hỏng đúng ca.

**Một lỗi đặc tả của Orchestrator** (§5.1): bảng §5 của `f_restore.md` ghi "mọi nhãn không phải 200: không có gì đang chờ", mâu thuẫn với chính §2 bước 1 của tệp đó. Agent làm theo §2, và hợp đồng chỉ ghi chú "nothing pending" cho 409, 424, 500 và 503. Tôi sửa đặc tả; hợp đồng không phải sửa.

Không có việc nào phải làm trước khi commit. `restore_data` giữ `đang_chờ_triển_khai` vì còn pha 2. Agent đề xuất `đang_triển_khai`; hợp đồng không bắt buộc đổi giữa chừng, nên tôi giữ nguyên như cách đã làm với `backup_data`.

## 2. Tệp thay đổi

| Tệp | Nội dung |
|---|---|
| `Desktop/src/workflows/restore_data/` (mới) | `entities.ts`, `adapters.ts` (http tới `backup_data`; đọc, ghi nguyên tử, xóa tệp bản ghi; tạo thư mục), `services.ts` (khối checkpoint; trình tự pha 1 và cách chọn nhãn), `routers.ts` (ba trình xử lý `ipc`; tự kiểm khung gửi; kiểm đối số) |
| `Desktop/configs/restore_data.json` (mới) | địa chỉ, nhãn, mã lỗi, hai yêu cầu `http`, hạn chờ 30 s, tên tệp và thư mục |
| `Desktop/src/main.ts` | đọc Configs, ráp `restore_data` sau `READY` và trước khi tạo cửa sổ; năm địa chỉ cho preload; checkpoint |
| `Desktop/src/cross_cutting/native_dialogs/` | `open_file`, kiểm `filters`; DSK-22 (PROB-001 thành EXP-004); checkpoint |
| `Desktop/configs/desktop.json` | `native_dialogs.open_file` (địa chỉ, tiêu đề "Chọn tệp") |
| `Desktop/electron-builder.yml` | thêm `dist/workflows/**/*.js` và `configs/restore_data.json` (bài học `main-EXP-027`) |
| `Desktop/tests/restore_data.spec.ts` (mới) | R1–R15 |
| `Desktop/tests/native_dialogs.spec.ts` | N2: bỏ `dialog:open-file` khỏi danh sách địa chỉ lạ, spy chuyển sang `dialog:save-file`; ca `open_file`; N14 (gọi lúc nạp, DSK-22) |
| `Desktop/tests/fixtures/` | `fake_backend_restore.py` (backend giả cho 424, 503), `invoke_on_load/`; nút trên trang thử |
| `Desktop/tests/packaged/packaged_app.spec.ts` | P9 sửa theo `open_file` (địa chỉ lạ là `dialog:save-file`); P10 mới |
| `Desktop/tests/helpers.ts` | một hằng số mới |

Không đụng `Backend/`, `UI/`. Không có ngoại lệ lint mới. Với `core.ignorecase=true`, `git check-ignore` không bỏ qua tệp mới nào (ENV-9).

## 3. Những gì đã tự chạy lại

**Linux**, Node 24, Xvfb với icewm, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`, `ELECTRON_DISABLE_SANDBOX=1`.

Bản sao có các chỗ sửa thường lệ, vì công cụ đọc tiến trình dùng PowerShell và dòng `backend started` bị mất trên Linux:
- `processTable()` đọc `/proc`;
- `closeCleanly()` của ba spec lấy PID của Main bằng `app.evaluate`, và khẳng định cây tiến trình có backend.

Không khẳng định nào bị nới.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint` | sạch | sạch (mã gốc) | khớp |
| `restore_data.spec.ts` + `native_dialogs.spec.ts` | 31 | **31/31 ×3** | khớp |
| Toàn bộ `npm test` | 62 ×3 | 52 đạt, 10 hỏng: 8 ca `desktop_main` (giới hạn Linux đã biết, như audit phiên 30, 33) và 2 ca `show_inactive` (cần PowerShell). Mọi ca mới đều đạt | khớp, không hồi quy |
| UI e2e với Desktop mới | 75/75 | **75/75**; `UI/evidence` giống hệt trước và sau | khớp |
| Checkpoint `restore_data` | YAML hợp lệ | 5 EXPERIENCES, 5 EVIDENCE, `UNSOLVED_PROBLEMS: []`, 2 NOTES | đạt |
| Checkpoint `native_dialogs` | YAML hợp lệ | 6 EXPERIENCES (EXP-004 từ PROB-001), 6 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt; DSK-22 mục 1 xong |
| Checkpoint Main | YAML hợp lệ | 32 EXPERIENCES, không trùng id, 29 EVIDENCE | đạt |
| Giờ (BE-8) | `14:59:36.1924815` | ba tệp ghi lúc 15:00:27 tới 15:03:57 | đúng quy ước |

Khung checkpoint rỗng với giờ làm tròn `09:30:00`, mà tôi thấy trên đĩa lúc phiên chưa xong, đã được thay đúng cách.

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: `npm run dist` từ trạng thái sạch, `test:packaged` 10/10 có P10, nội dung `app.asar` có `dist\workflows\restore_data\*.js` và `configs\restore_data.json`, mốc `%APPDATA%` 69 dòng và 0 khác biệt.

**Phép cắn:**

| Phép cắn | Ai chạy | Kết quả |
|---|---|---|
| (a) bỏ bước xóa bản ghi cũ | agent | R5 hỏng |
| (b) không dừng khi `is_compatible` là `false` | agent | R4 hỏng |
| (c) `status` trả cả `staged_db_path` | agent | R3 hỏng |
| DSK-22: đăng ký `native_dialogs` sau lần nạp đầu | agent | N14 hỏng ("No handler registered"). Đóng §5.2 của audit phiên 33 |
| (d) chấp nhận `archive_path` tương đối | Orchestrator | R1a, R6 hỏng |
| (f) bỏ bản sao lưu an toàn | Orchestrator | R2, R15 hỏng |
| (g) bản ghi hỏng thì `status` trả `pending: null` thay vì 500 | Orchestrator | R9 hỏng |
| (j) bỏ kiểm khung gửi của `restore_data` | Orchestrator | R10 hỏng |

## 4. Đối chiếu với hợp đồng, đặc tả và plan

**Khớp hợp đồng:**
- Ba lối vào `ipc` đúng địa chỉ. Nhãn của `restore:prepare` gồm 200, 400, 404, 409, 424, 500 và 503; của `restore:status` và `restore:cancel` gồm 200 và 500. Câu trả lời đúng `{ status, body }`; `body` lỗi là `error_body`.
- `restore_status.pending` có đúng năm trường của `pending_restore_record` (R3, phép cắn c).
- 400 là một câu trả lời bình thường; khung gửi hay đối số sai của hai lối vào không có đầu vào thì Promise bị từ chối, vì hợp đồng không có nhãn cho chúng.
- `restore_data` gọi `backup_data` qua `http`, mô tả dữ liệu nhận về bằng Entities của chính nó, không import gì của Backend.
- `open_file`: `{ filters }` là `null` hoặc danh sách; câu trả lời `{ canceled, path }`.
- `restore:start` đã bị bỏ: preload từ chối (R11).

**Khớp đặc tả `f_restore.md` §2:**
- bước 1 xóa bản ghi cũ ngay sau khi qua kiểm đầu vào;
- 404 trả 404;
- tệp hỏng hoặc mới hơn trả 409, kèm `reason`;
- backend không trả lời được trả 503;
- bản sao lưu an toàn nằm trong `safety-backups`, và tự nó qua được `prepare_restore` (R2);
- bản ghi được ghi nguyên tử;
- `data.db` đang dùng không đổi: R2 kiểm cả inode lẫn `GET /clients`.

**Khớp plan:** Configs ở `Desktop/configs/restore_data.json`; ráp nối trước khi tạo cửa sổ; `electron-builder.yml` có thư mục workflow; P10; trang thử có bốn nút; DSK-22.

**Agent tự quyết, chấp nhận:**
1. **Xóa bản ghi cũ hỏng ở bước 1 thì trả 500 `ERR_STORAGE_IO`.** Plan không nêu ca này. Hợp đồng ghi chú 500 là "nothing pending", nhưng ở ca này bản ghi cũ còn nằm đó. Ca rất hiếm, chỉ xảy ra khi tệp bản ghi không xóa được. Ghi nhận ở §5.3, không sửa hợp đồng.
2. **`restore_staging` hợp lệ nhưng thiếu `app_version`, `created_at` hoặc `staged_db_path` thì trả 503.** Backend làm trái hợp đồng thì coi như không phục vụ được. Hợp lý.
3. **Routers tự giữ bản kiểm khung gửi riêng,** không dùng chung với `native_dialogs`. Có ghi lý do theo Bước 5.3.
4. **`ipcMain` do Main tiêm vào Routers,** nên kiểm được Routers mà không cần Electron.
5. **N14 kiểm thêm `restore:status` lúc nạp,** ngoài plan. Cùng mục đích giữ thứ tự đăng ký; chấp nhận.
6. **Lần Project Owner chạy tay không có ô "xem trạng thái sau khi hủy".** R3 và P10 kiểm đúng điều đó. Chấp nhận.

## 5. Phát hiện

### 5.1 Đặc tả tự mâu thuẫn về nhãn 400 (lỗi của Orchestrator; đã sửa)

`f_restore.md` §5 viết "Mọi nhãn không phải 200: không có gì đang chờ". Nhưng §2 bước 1 chỉ xóa bản ghi cũ **sau khi** qua kiểm đầu vào. Vì vậy 400 giữ bản ghi cũ, và mã làm đúng như vậy (R6).

Cách của §2 là cách đúng: một lời gọi sai định dạng không nên hủy một lần khôi phục đang chờ. Hợp đồng không phải sửa, vì nó chỉ ghi chú "nothing pending" ở 409, 424, 500 và 503.

Tôi sửa câu ở §5 thành: "Mọi nhãn từ 404 trở đi: không có gì đang chờ. Riêng 400 giữ nguyên bản ghi cũ (lời gọi sai định dạng không qua bước 1)."

### 5.2 Ứng dụng thoát một lần với mã 0xC0000005 trên trang thử (chưa rõ; DSK-23)

Theo báo cáo của agent, một lần chạy trang thử thoát với mã 3221225477 (vi phạm truy cập bộ nhớ), ngay sau ba lần hộp thoại chọn tệp thật trả "canceled". Log Main không có `FATAL`, các lượt sau không sập, chưa tái hiện được.

Đường gọi chỉ có `dialog.showOpenDialog` của Electron, không có mã của dự án. Orchestrator không đo được trên Linux, vì ở đây hộp thoại bị thay.

Mở **DSK-23** để theo dõi: nếu lặp lại, đo ở phiên 36 (phiên đó cũng dùng hộp thoại thật).

### 5.3 Ghi chú "nothing pending" của nhãn 500 không đúng ở một ca hiếm (thấp)

Xem §4, điểm 1. Nếu sau này cần chính xác tuyệt đối thì sửa chú thích trong hợp đồng; chỉ là sửa chữ, tăng số bản vá. Chưa đề xuất. Ghi vào `f_restore.md` §5.

### 5.4 Bản sao lưu an toàn tích lũy (thấp; V2; DSK-24)

Mỗi lần chuẩn bị thành công tạo thêm một bản sao lưu an toàn; agent bấm lặp tạo ra 7 tệp. Đúng đặc tả hiện tại, vì không có gì dọn. Với dữ liệu của một họa sĩ, mỗi tệp cỡ KB tới vài MB.

Không sửa ở V1. Mở **DSK-24** (V2): dọn bớt bản sao lưu an toàn cũ, hoặc chỉ giữ N bản gần nhất. Trang Khôi phục (phiên 37) nên nói rõ mỗi lần chuẩn bị tạo một bản an toàn.

## 6. Đề xuất sửa hợp đồng

Không có.

## 7. Việc tồn đọng

- **Đóng:** DSK-22 (2026-10-08, phiên 35).
- **Mới:**
  - DSK-23 (theo dõi), §5.2;
  - DSK-24 (thấp, V2), §5.4.
- **Đặc tả:** `f_restore.md` §5 sửa theo §5.1 và §5.3.
- **Chặng F:** phiên 1/3 xong. Tiếp theo là phiên 36 (desktop, pha 2).
