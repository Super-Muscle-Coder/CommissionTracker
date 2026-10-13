# Audit phiên 43, pha 2 — desktop (chặng H, vá)

**Ngày audit:** 2026-10-13. **Người audit:** Orchestrator.
**Phiên được audit:** `coding-agent@2026-10-13#1`, pha 2 (vá), kể cả lần dừng ở H-9 và phần làm sau câu trả lời `.reviews/prompts/desktop/session43_phase2_h9_reply.md`.
**Plan:** `.plan/desktop_plan.md` (pha 2). Hợp đồng: Data Schema `10.0.1`, API Contract `6.2.0`.

## 1. Kết luận

**Đạt.** Phiên 43 (pha 1 và pha 2) được commit `CAS43`.

- Mọi việc ở bốn nhóm A → D đều xong.
- Mười phép cắn tôi tự làm trên Linux đều bị bắt: tám phép của agent tôi làm lại, cộng hai phép riêng.
- Ba lượt `npm test` trên Linux ra cùng một kết quả. Mọi ca hỏng là ca đã biết hỏng vì môi trường Linux.
- Checkpoint đúng Giao thức 07, giờ ghi lấy riêng cho từng khối.
- H-9 làm lộ một lỗi thật (R43-22): ứng dụng tắt im lặng với mã 0. Lỗi đã được sửa theo hướng A mà Project Owner chọn.

Có ba ghi nhận thấp (§4), không chặn commit.

## 2. Tôi tự kiểm lại

**Tệp.** Tôi liệt kê `Desktop\src`, `Desktop\tests`, `Desktop\configs` trên máy Project Owner theo giờ sửa:
- đúng **21** tệp có giờ sửa trong pha 2, và cả 21 đều khác HEAD. Báo cáo ghi "20 dòng" nhưng liệt kê đủ 21 tệp: đếm nhầm, không phải thiếu tệp;
- tệp sửa cuối cùng lúc 15:46:16, trước khi lượt `npm test` thứ tư bắt đầu (15:46:38). Như vậy lượt đó chạy trên đúng mã cuối.

Tôi dựng bản sao `/home/claude/audit43p2` từ `git archive` của HEAD (`8a7b406`), chồng 21 tệp lên, rồi cmp lại đủ 21/21. `Backend/` trong bản sao khớp HEAD. Để chạy trên Linux, tôi đổi đúng một chỗ, như ở pha 1: `tests/helpers.ts` đọc bảng tiến trình từ `/proc` thay cho PowerShell.

**Lint:** sạch trên mã nguyên bản của agent. Không có `eslint-disable`, `@ts-*`, `retries`, `skip` mới. Lần tìm duy nhất trúng là một comment lịch sử ở `main-EXP` cũ.

**`npm test` trên Linux, ba lượt liên tiếp** (Node 24, Xvfb + icewm, `ELECTRON_DISABLE_SANDBOX=1`):

| Lượt | Kết quả |
|---|---|
| 1 | 84 đạt, 11 hỏng (2,5 phút) |
| 2 | 84 đạt, 11 hỏng (2,4 phút) |
| 3 | 84 đạt, 11 hỏng (2,4 phút) |

- Tổng 95 ca, khớp báo cáo.
- Mười một ca hỏng ở cả ba lượt là cùng một danh sách: mười ca đã biết hỏng vì môi trường từ phiên 40 (ca 1, 3, 4, 7, 8, 9, 11, 12, 15, 16), cộng ca mới `1b`.
- `1b` hỏng ở `backendTree`, tức chỗ đếm cặp tiến trình python của trình khởi chạy Windows, giống ca 1. Khẳng định mới về `getLastWebPreferences()` nằm **trước** chỗ đó, và đã chạy và đạt ở cả ba lượt. Log đo được ghi `[{"sandbox":true,"contextIsolation":true,"nodeIntegration":false}]`.
- Mười sáu ca mới khác đều đạt trên Linux, kể cả H9a → H9c, H11a, H11b, R16 → R20.

Agent báo bốn lượt 95/95 trên Windows: ba lượt chính thức, cộng một lượt sau khi sửa checkpoint. Thêm một lượt trước đó hỏng ở N13 vì sót sửa ca, và agent đã báo lượt đó. Hai bên nhất quán.

**Phép cắn** (bản sao ngoài kho; mỗi phép: sửa, build, kiểm chuỗi đã sửa có trong JS đã build, chạy ca liên quan, khôi phục, so băm):

| Phép | Nguồn | Ca bắt được |
|---|---|---|
| M2: `sandbox: false` | pha 1 / agent | `1b`, đúng ở dòng 137 (`sandbox: false` trong log đo) |
| D2: gán `moves.asidePath` trước khi đổi tên | pha 1 / agent | U7 |
| D3: `startsWith` thay cho `!==` | pha 1 / agent | R1a |
| X1: `reminder_ticker` bỏ thông báo trùng id | pha 1 / agent | B3 |
| C1: `restore:prepare` thành `restore:prepare2` | pha 1 / agent | R1c |
| Bỏ hàng đợi (`job()` thay cho `queue.then(job)`) | agent | R19 và R20, **3/3 lần** |
| R43-22: bỏ `mkdirSync` của `userData` | agent | H9a, H9b (H9c vẫn đạt, đúng như mong đợi) |
| DSK-30 mục 7: backend giả thoát ngay sau `READY` | agent | ca 6 |
| O4: `prepare_restore` 400 bị ánh xạ thành 404 | Orchestrator | R18 |
| O6: `restore:status` nhận đối số bất kỳ | Orchestrator | R1a |

Sau các phép cắn, tôi so lại 21 tệp của bản sao với bản của agent: khớp hết, trừ `helpers.ts` (chỗ đổi cho Linux).

**Đọc mã.**
- **R43-22.** Khối "tạo `userData` rồi xin khóa" được dời xuống sau khai báo `fatal()` và các biến nó dùng. Khối vẫn nằm trước `whenReady` và trước mọi việc khởi động backend. Không tạo được thư mục thì gọi `fatal()` với câu khởi động. Tạo được mà khóa vẫn trả `false` thì giữ hành vi cũ (ca 9 đạt). Đúng câu trả lời ở mục 3, cách thứ nhất.
- **R43-21.** `serialized()` nối lời gọi bằng `queue.then(job)`, rồi đặt `queue` thành một Promise luôn được thực hiện, nên lời gọi trước hỏng không chặn lời gọi sau. Cả bốn lối vào của Services đi qua hàm này. Comment có cảnh báo một job không được gọi một lối vào khác đã tuần tự hóa (sẽ tự chờ chính nó).
- **R43-4.** `error_dialog.ts` tự khai `RollbackStage`, không còn nhập gì từ `workflows/restore_data/`.
- **R43-11.** `open_file` đòi đúng `{ filters }`, đúng API Contract 6.2.0. Giao diện luôn gửi `{ filters }` (`UI/src/logic/workflows/restore_data/adapters.ts:138`).
- **R43-6, R43-9.** Đã chuyển vào `configs/desktop.json`: `reminder_ticker.check_due {method, path}` và `native_dialogs.labels.ok`.
- **DSK-30 mục 3.** `settleSpawnedRuns` chỉ in log và kết thúc đúng những tiến trình mà chính ca đó khởi chạy bằng `spawnMain`, không tìm theo mẫu tên.

**Checkpoint.** Cả năm khối là YAML hợp lệ, không trùng ID, không có `UNSOLVED_PROBLEMS`. Giờ ghi lấy riêng cho từng khối, và đều trước giờ sửa tệp tương ứng:

| Khối | Giờ ghi | Giờ sửa tệp |
|---|---|---|
| Main | 15:44:33 | 15:45:20 |
| `restore_data` | 15:45:40 | 15:45:41 |
| `reminder_ticker` | 15:46:14 | 15:46:14 |
| `native_dialogs` | 15:46:15 | 15:46:16 |
| `restore_trigger` | 14:43:12 | 14:44:05 |

Sau gộp, Main còn 35 EVIDENCE, `restore_data` 11. Lỗi dùng chung một giờ cho nhiều khối của phiên 42 không lặp lại.

**Không chạy lại:**
- UI e2e. Thay đổi duy nhất bên giao diện thấy được là `open_file` đòi `{ filters }`, mà giao diện vẫn luôn gửi khóa đó; agent chạy 83/83.
- `test:packaged`. Theo plan, việc này để chặng H bước 3.

## 3. H-9, H-11 — kết quả thật

**H-9.** Trước khi sửa, ca dữ liệu trỏ vào một tệp thoát mã 0, không có hộp thoại; tôi cũng tái hiện được trên Linux trước khi trả lời. Sau khi sửa (R43-22), H9a và H9b đều thoát mã 1, có đúng một dòng `FATAL` và câu khởi động tiếng Việt, không treo, không sót python. H9c (thư mục cơ sở dữ liệu là một tệp) vốn đã đúng từ trước.

**H-11.** Cả hai trạng thái ra kết quả khớp suy luận từ `.design/f_restore.md` §3, nên chặng F không có lỗi:
- **Sau bước 4:** kết quả `restored`. Trong `restore-previous` có hai tệp, vì backend khởi động trước `restore_trigger` nên tạo một cơ sở dữ liệu rỗng ở `db_file_path`, rồi tệp rỗng đó bị dời sang. Vô hại.
- **Sau bước 5:** kết quả `discarded`, dữ liệu là của bản sao lưu. Câu "Dữ liệu không thay đổi" đúng với lần mở đó, nhưng người dùng không biết rằng việc khôi phục thực ra đã hoàn tất trước khi máy tắt (§4.2).

## 4. Ghi nhận

### 4.1 Hộp thoại của R43-22 chưa được nhìn thấy trên Windows (thấp)

Mọi ca H-9 chạy với `--ct-test-no-dialog`, nên chưa ai thấy hộp thoại thật hiện ra ở chỗ mới: trước sự kiện `ready`. Tôi tin là tài liệu Electron cho phép gọi `dialog.showErrorBox` trước `ready`, nhưng chưa có bằng chứng trên máy Project Owner. **Việc:** ở chặng H bước 3, trên bản đóng gói dựng lại, Project Owner chạy `Commission Tracker.exe --ct-test-data-dir=<đường dẫn tới một tệp có sẵn>` (bản đóng gói nhận cờ này) và nhìn thấy hộp thoại lỗi khởi động tiếng Việt. Ghi thành **DSK-31**.

### 4.2 Câu của kết quả `discarded` sau khi máy tắt ở bước 5 (thấp, V2)

Câu "Dữ liệu không thay đổi" đúng nhưng thiếu: dữ liệu khi đó đã là của bản sao lưu. Đây là chuyện trải nghiệm dùng của một tình huống hiếm (máy tắt đúng giữa bước 5 và 6), và không có rủi ro dữ liệu. Đề xuất để V2 (trải nghiệm dùng dễ chịu). Ghi thành **DSK-32**.

### 4.3 NOTES của Main (thấp)

Agent bỏ đúng câu lỗi thời về DSK-18, và giữ phần còn lại của NOTE. Đó là một cách hiểu hợp lý của R43-15. Mục (2) của NOTE thứ hai (bản cài ngày 2026-10-04 thiếu `dist\cross_cutting`) cũng đã lỗi thời. Hai NOTE hết hạn ngày 2026-10-19. Phiên desktop kế tiếp chạm Main thì dọn, theo luật 14 ngày; gộp vào DSK-31.

### 4.4 Cách làm của phiên

- Phiên dừng đúng chỗ ở H-9, lấy đủ bằng chứng trước khi báo, và tự thêm H9c để tách hai nguyên nhân.
- Phiên báo cả lượt hỏng N13, do chính mình sót sửa ca, rồi chạy lại từ đầu.
- Phiên báo Project Owner trước khi chạy công cụ hiện toast thật.
- Phiên xóa đúng sáu thư mục tạm của mình theo tên, và để nguyên các thư mục `ct-toast-probe-*`, `ct-desktop-probe-*` có từ trước.
- Phạm vi có nới nhẹ, đều hợp lý và có ghi lại: thêm origin `:8080` vào R1a; gộp thêm hai mục EVIDENCE cùng loại (#38, #41).

## 5. Đóng mục

Đóng 2026-10-13, phiên 43:
- R43-1 → R43-6, R43-8 → R43-16, R43-20, R43-21, R43-22 (đã sửa);
- R43-7 (ghi vào checkpoint là không kiểm được); R43-17, R43-18 (chấp nhận); R43-19 (Orchestrator đã sửa `CLAUDE.md`);
- DSK-30 mục 3, 6, 7; mục 4: ca 15 và 16 đạt cả bốn lượt có người dùng máy;
- H-7, H-9, H-11;
- phần còn lại của CT-9 (comment `save_file`, R43-12).

Mở DSK-31 (thấp), DSK-32 (thấp, V2). DSK-30 mục 5 (ca lý thuyết hộp thoại `restore_failed` bị che) vẫn chưa có quyết định; đề xuất để V2.

## 6. Việc tiếp theo

- Project Owner commit `CAS43` (21 tệp `Desktop/`), rồi commit `OS`.
- Phiên kiểm độc lập kế tiếp: giao diện (UI-21, UI-22, UI-23, H-6 cho pha 2).
- Chặng H bước 3, sau phiên giao diện: dựng lại bộ cài (Starlette mới của BE-12, mã của phiên 43), chạy `test:packaged`, đo lại dung lượng (H-3), kiểm hộp thoại R43-22 (DSK-31).
