# Audit phiên 34 — giao diện, trang `backup` (chặng E, phiên 3/3)

- Orchestrator, 2026-10-07.
- Plan: `.plan/ui_plan.md` (phiên 34). Đặc tả: `.design/ui_decomposition.md`, mục "Chặng E — Sao lưu". Hợp đồng: Data Schema 9.0.3, API Contract 4.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-07 20:48 (chưa commit), đặt lên `HEAD = 9b59cd1`.

## 1. Kết luận

**Đạt về chức năng.** Trang `backup`, workflow `backup_data`, tài nguyên `ipc_bridge` và `invoke` bắt buộc đều đúng đặc tả và hợp đồng. Mọi số liệu tôi chạy lại được trên Linux khớp báo cáo của agent. Tiêu chí của chặng E đã được chứng minh trong e2e: tệp tạo từ giao diện qua được `prepare_restore`, với `is_valid` và `is_compatible` đều `true`.

**Phải xử lý trước khi commit** (§5.1): bản vá `.gitignore` của agent chưa đủ. Mẫu `Backup*/` của tệp gốc còn bỏ qua cả `UI/evidence/walkthroughs/backup/`, tức ảnh bằng chứng của trang mới. Orchestrator đã sửa dòng đó trong `.gitignore` gốc. Commit `.gitignore` phải đi **trước** commit CAS34.

`backup` giữ `đang_làm` cho tới khi Project Owner chạy tay với hộp thoại thật. Chạy xong thì trang `hoàn_tất` và chặng E xong.

## 2. Tệp thay đổi

| Nhóm | Tệp |
|---|---|
| Nền | `src/main.tsx` (`invoke` bắt buộc, ráp nối); `src/configs/layer_configs.ts`; `src/logic/shared/resources.ts` (`IpcInvoke`, `IpcBridge`); `src/logic/workflows/scaffold_ui/adapters.ts` (`createIpcBridge`) |
| Workflow mới | `src/logic/workflows/backup_data/`: configs, entities, adapters, services (khối checkpoint), routers, 3 tệp kiểm thử |
| Màn hình | `src/screens/pages/backup/`: `Backup.tsx`, `use_backup.ts`, `walkthrough.yaml`, kiểm thử; `navigation.ts` (khóa `backup`, mục thứ sáu); `logic_context.ts` |
| Kiểm thử cũ | `tests/main/main.test.tsx` (thêm `invoke` vào bridge giả, 6 ca mới); `app_root.test.tsx`, `fake_logic.tsx` (thêm mục mới); 4 spec e2e (thêm mục "Sao lưu" và `exact: true`) |
| Công cụ | `tests/tools/folder_dialog_stub.mjs` (+ `.d.mts`); `walkthrough_lib.mjs` (+ `.d.mts`): `makeBackupDir`, `prepareRestore` |
| Ngoài plan | `UI/.gitignore`: hai dòng phủ định (§5.1) |
| Bằng chứng | `UI/evidence/walkthroughs/`: chụp lại với runner của phiên, cộng thư mục `backup/` (9 tệp) |

Không đổi gì trong kit (`DescriptionList` có sẵn đã xuống dòng được). Không sửa `Desktop/`, `Backend/`. Không có ngoại lệ lint mới. Tôi đối chiếu danh sách tệp trên đĩa (theo thời điểm ghi) với báo cáo: khớp.

## 3. Những gì đã tự chạy lại

**Linux**, Node 24, Xvfb với icewm, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`, `ELECTRON_DISABLE_SANDBOX=1`. Desktop là mã `HEAD` (phiên 33), Backend là mã `HEAD`.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run check` | 1679 | **1679 ×3** | khớp |
| `backup_walkthrough` riêng | 10/10 | **5/5 ×3** | khớp |
| `npm run e2e` không runner | 75, `UI/evidence` không đổi | **75/75 ×2**; `UI/evidence` (120 tệp của `HEAD`) giống hệt trước và sau | khớp |
| Hộp thoại thay thế | đo ở việc 2 | chạy qua spec: không hộp thoại thật nào, đếm lời gọi đúng | khớp |
| `prepare_restore` trên tệp vừa tạo | `true`/`true` | `true`/`true` cho cả ba tệp của S1, S2 | khớp |
| Checkpoint `backup_data` | YAML hợp lệ | 4 EXPERIENCES, 2 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt |
| Checkpoint `scaffold_ui`, `main`, `screens` | YAML hợp lệ | 3, 34, 50 EXPERIENCES; không trùng id; không PROB | đạt |
| Giờ (BE-8) | `20:44:38.4471702` | bốn tệp ghi lúc 20:45:35 tới 20:48:15 | đúng quy ước |
| Định danh phiên | `#3` | phiên 32 là `#1`, 33 là `#2` | đúng |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: 5 lượt e2e có runner, `npm run dist` và `test:packaged` 9/9, mốc `%APPDATA%`.

Tôi xem ảnh `backup-S1-created.png`: bố cục đúng đặc tả, gồm một nút, dòng chữ phụ dưới hàng nút, thông báo và khung ba dòng, với dung lượng "3,2 KB".

**Phép cắn của Orchestrator**, trên bản sao; mỗi phép chỉ chạy kiểm thử liên quan:

| Phép cắn | Kết quả |
|---|---|
| (a) chấp nhận `canceled: false` với `path: null` | 1 ca hỏng (adapters) |
| (b) hủy hộp thoại vẫn tạo bản sao lưu | 2 ca hỏng (routers, services) |
| (c) hủy thì xóa khung kết quả cũ | 1 ca hỏng (trang) |
| (d) `invoke` không bắt buộc | 1 ca hỏng (`main.test`) |
| (e) `purpose` khác `'manual'` | 2 ca hỏng |
| (f) bỏ cờ `flowRunning` của hook | 0 ca hỏng: nút bận đã chặn lần bấm thứ hai. Bỏ **cả** cờ lẫn trạng thái bận thì 3 ca hỏng. Hai lớp chặn, không phải lỗ hổng |
| (g) lỗi không xóa khung kết quả cũ | 5 ca hỏng |

## 4. Đối chiếu với đặc tả, plan và hợp đồng

**Khớp hợp đồng:**
- `create_backup`: thân `{ backup_request: { destination_dir, purpose: 'manual' } }`; nhãn 201, 400, 500.
- `backup_archive_record`: đủ năm trường; `created_at` đúng `formats.timestamp`; `size_bytes` là số nguyên an toàn ≥ 0.
- `pick_folder`: `invoke('dialog:pick-folder', {})`; kiểm `{ status: 200, body }` với hai tổ hợp hợp lệ của `canceled` và `path`.
- `prepare_restore` không có trong `UI/src/`; chỉ `walkthrough_lib.mjs` gọi nó (đã grep).
- Không có lời gọi `/watermark-*`, `dialog:open-file`, `dialog:save-file`.
- Chỉ Main đọc bridge (R12); `ipc_bridge` chuyển nguyên lời gọi, không kiểm, không hạn chờ, không bắt lỗi.

**Khớp đặc tả:**
- tiêu đề, một nút, dòng chữ phụ dưới hàng nút;
- không gọi gì khi mở trang;
- luồng hai bước; nút bị vô hiệu suốt luồng;
- "Đang tạo bản sao lưu…" chỉ hiện ở bước 2;
- hủy thì không gửi gì và trang giữ nguyên;
- câu chữ của 400, 500, hộp thoại hỏng;
- mọi kết quả không phải 201 xóa khung cũ;
- dung lượng theo cơ số 1024, dấu phẩy, đủ 5 ca của plan;
- đường dẫn xuống dòng được (e2e kiểm `overflow-wrap: anywhere`);
- không hiện `sha256` hay `app_version`;
- mục điều hướng thứ sáu; năm mục cũ giữ vị trí.

**Luật phủ:** đủ `ok` (S1, S2, S3), `rejected_system` (S4, chỉ ở lần chạy tự động), `unreachable` (S5). Không có `rejected_input`, kèm lý do. Bước chạy tay có ghi tiêu đề hộp thoại.

**Agent tự quyết, chấp nhận:**
1. **Promise bị từ chối:** Adapters xếp vào `unreachable`; Services đổi thành `rejected` với mã riêng của giao diện `DIALOG_FAILED`, để trang không hiện tiêu đề "Không kết nối được" cho một hộp thoại hỏng. Mã nằm trong Configs, ghi rõ không phải mã của hợp đồng.
2. **`onCreating`:** Routers nhận một hàm do hook trao, để "Đang tạo…" chỉ hiện ở bước 2 mà vẫn giữ một lối vào như plan đòi. Logic không import gì của màn hình, nên ma trận R không bị vi phạm. Cách khác là hai lối vào; chấp nhận cách của agent.
3. **Tiêu đề khung lỗi** "Chưa tạo được bản sao lưu": đặc tả chỉ định câu, không định tiêu đề. Hợp với cách các trang khác đặt tiêu đề.
4. **Làm tròn dung lượng:** đơn vị chọn trước khi làm tròn, nên 1048575 byte là "1024,0 KB". Đúng ca của plan.
5. **`exact: true` cho 11 locator "Lưu"** ở `client_form`, `client_list`: hệ quả trực tiếp của mục điều hướng mới. Chỉ thêm `exact`, không đổi khẳng định nào. Lượt e2e hỏng trước đó được tính, và agent đếm lại từ đầu.

## 5. Phát hiện

### 5.1 `.gitignore`: ảnh bằng chứng của trang mới không vào commit (phải xử lý trước commit)

Agent phát hiện đúng loại lỗi của ENV-9: trên Windows, mẫu `Backup*/` khớp `UI/src/logic/workflows/backup_data/` và `UI/src/screens/pages/backup/`. Agent thêm hai dòng phủ định vào `UI/.gitignore`. Hai dòng đó có tác dụng.

Nhưng mẫu này còn khớp **`UI/evidence/walkthroughs/backup/`**. Orchestrator tái hiện bằng `core.ignorecase=true`: `git check-ignore` trỏ dòng 258 của `.gitignore` gốc cho `backup-run.json` và mọi ảnh. Nếu commit như hiện tại, CAS34 thiếu bằng chứng của trang mới mà không ai thấy. Danh sách `git status` của agent liệt kê thư mục, nên không lộ ra.

**Đã sửa (Orchestrator), tận gốc thay vì vá từng thư mục.** Trong `.gitignore` gốc, dòng `Backup*/` được thay bằng các mẫu neo vào đúng nơi Visual Studio ghi bản sao lưu khi nâng cấp, là cạnh Solution và cạnh tệp project:

```
/Backup*/
/Backend/Backup*/
/Desktop/Backup*/
/UI/Backup*/
```

Kèm một chú thích nói lý do. Kiểm với `core.ignorecase=true`:
- mọi tệp mới của phiên, kể cả 9 tệp bằng chứng, và `Backend/workflows/backup_data/` đều **không** bị bỏ qua, kể cả khi bỏ hai dòng của `UI/.gitignore`;
- `Backup/`, `Backend/Backup1/`, `Desktop/BACKUP/`, `UI/Backup/` vẫn bị bỏ qua như mẫu cũ muốn.

Dòng `!Backend/workflows/backup_data/` của phiên 32 và hai dòng của `UI/.gitignore` nay thừa nhưng vô hại; tôi giữ nguyên. Việc dọn và sửa chữ ở `main-EXP-033` ghi ở UI-21.

**Bài học quy trình:** từ phiên 32, audit kiểm tệp sẽ vào commit. Lần này kiểm có kết quả, nhưng phải kiểm **từng tệp**, kể cả `UI/evidence`, không chỉ thư mục mã.

### 5.2 Hai lớp chặn lần bấm thứ hai (ghi nhận)

Phép cắn (f): cờ của hook và trạng thái bận của nút cùng chặn. Bỏ một lớp thì kiểm thử vẫn đạt. Giống hai lớp chặn của `reminder_ticker` (audit phiên 30). Không cần ca riêng cho từng lớp.

### 5.3 `UI/.gitignore` sửa ngoài plan (chấp nhận)

Agent sửa một tệp ngoài plan, nhưng trong `UI/`, có nói rõ trong báo cáo và checkpoint, và để Project Owner quyết. Cách làm đúng tinh thần `CLAUDE.md` mục 2. Sau §5.1, hai dòng đó thừa.

## 6. Đề xuất sửa hợp đồng

Không có.

## 7. Việc tồn đọng và trạng thái

- **Trang `backup`:** giữ `đang_làm`, chờ Project Owner chạy tay 6 bước với hộp thoại thật (các bước nằm trong báo cáo của agent và `walkthrough.yaml`). Ở bước 2, ghi lại tiêu đề hộp thoại: điểm treo từ audit phiên 33 §5.3.
- **ENV-9:** mở rộng và sửa tận gốc (§5.1).
- **Mới: UI-21** (thấp): sửa chữ `main-EXP-033` cho khớp `.gitignore` gốc mới; có thể bỏ hai dòng thừa của `UI/.gitignore`. Làm ở phiên giao diện kế tiếp.
- **Chặng E:** xong khi `backup` `hoàn_tất`.
