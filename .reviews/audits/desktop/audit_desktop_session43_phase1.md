# Audit phiên 43, pha 1 — desktop (chặng H, kiểm độc lập)

**Ngày audit:** 2026-10-13. **Người audit:** Orchestrator.
**Phiên được audit:** `coding-agent@2026-10-13#1`, pha 1 (chỉ đọc).
**Plan:** `.plan/desktop_plan.md` (pha 1). Hợp đồng: Data Schema `10.0.1`, API Contract `6.1.0`.

## 1. Kết luận

**Pha 1 đạt.** Phiên đã làm đủ những gì plan đòi:
- trả lời K1 → K8;
- chạy `lint`, `npm test` và `test:packaged`, mỗi lệnh một lượt, kết quả đúng mốc (79 và 12);
- làm 12 phép cắn trên bản sao ngoài kho, rồi xóa đúng thư mục bản sao;
- không sửa tệp nào trong kho; `git status` và mốc `%APPDATA%` không đổi.

Mỗi phát hiện có tệp, dòng và bằng chứng. Tôi thử lại các phát hiện quan trọng nhất và đều tái lập được (§2).

Báo cáo tự tìm ra được những việc đã biết từ trước mà không đọc sổ tồn đọng: H-9, H-11, hai trong ba ô của H-7 (thiếu ô `create_backup` trả thân sai hình dạng), và comment còn nói `save_file` (CT-9). Đó là dấu hiệu tốt cho tính độc lập và độ phủ của lần kiểm.

Không có phát hiện mức cao. Tôi thêm một phát hiện, R43-21 (§3.3): hai lần `restore:prepare` chạy cùng lúc có thể ghi bản ghi lệch với tệp chờ. Agent đã nêu ở phần 6, nhưng chưa xếp thành phát hiện.

Có hai điểm cần Project Owner quyết ở hợp đồng (R43-10, R43-4), và một quyết định về phạm vi pha 2 (§5).

## 2. Tôi tự kiểm lại

**Kho và máy Project Owner.**
- `Desktop/` ở HEAD không đổi kể từ commit của phiên 40.
- Tôi liệt kê `Desktop\src`, `Desktop\tests`, `Desktop\configs` trên máy Project Owner theo giờ sửa: tệp mới nhất ghi ngày 2026-10-11, không có tệp nào sửa hôm nay.
- `CAS42` khớp đủ 34 tệp tôi đã audit ở phiên 42.

**Chạy lại trên Linux.**
- Môi trường: Node 24, Xvfb và icewm, `ELECTRON_DISABLE_SANDBOX=1`, backend ở HEAD dùng `starlette 1.3.1`. Bản sao `/home/claude/audit43` khớp `Desktop/` ở HEAD, trừ một chỗ tôi đổi để chạy trên Linux: `tests/helpers.ts` đọc bảng tiến trình từ `/proc` thay cho PowerShell, giống bản sao của phiên 40.
- `npm test`: **69 đạt, 10 hỏng.** Mười ca hỏng đúng là mười ca đã biết hỏng vì môi trường từ phiên 40: cặp tiến trình python của launcher (ca 1, 3, 4, 7, 8, 9, 11), locale (ca 12) và PowerShell (ca 15, 16).
- Agent báo 79/79 trên Windows. Hai kết quả nhất quán với nhau.
- Tôi không chạy `test:packaged`, vì đó là bản dựng Windows.

**Phép cắn** (bản sao ở `/home/claude/audit43`). Script tạm làm từng phép: sửa một chuỗi, build, kiểm chuỗi đã sửa có trong JS đã build, chạy spec liên quan, rồi khôi phục tệp, so lại băm và build lại.

| Phép | Nguồn | Kết quả ở Linux | Khớp agent? |
|---|---|---|---|
| D2: gán `moves.asidePath` trước khi đổi tên | agent | không bị bắt: `restore_undo` + `restore_apply` 13/13 đạt | khớp (R43-2) |
| D3: `!==` thành `startsWith` ở kiểm origin của Routers | agent | không bị bắt: `restore_data` 16/16 | khớp (R43-3) |
| X1: `reminder_ticker` bỏ thông báo trùng id | agent | không bị bắt: 12/12 | khớp (R43-5) |
| M2: `sandbox: false` ở cửa sổ chính | agent | không bị bắt: chỉ có đúng 10 ca hỏng vì môi trường như mốc | khớp (R43-1) |
| O1: `prepare` bỏ bước xóa bản ghi cũ | Orchestrator | **bắt được:** R5 | — |
| O2: `contextIsolation: false` | Orchestrator | **bắt được:** 23 ca hỏng so với 10 của mốc (preload không phơi được bridge) | — |
| O3: bridge phơi thêm `ipcRenderer` | Orchestrator | **bắt được:** N9 (bridge đúng hai thuộc tính) | — |

Như vậy `contextIsolation` được kiểm gián tiếp, còn `sandbox` thì không. R43-1 chỉ cần thêm khẳng định cho `sandbox` (và `nodeIntegration`).

**Đọc mã.** Tôi đọc lại vị trí của R43-4, R43-6, R43-10 và R43-11: đúng như agent tả.

## 3. Đánh giá từng phát hiện

### 3.1 Đồng ý, sửa ở pha 2

| Mã | Mức | Việc ở pha 2 |
|---|---|---|
| R43-1 | TB | Ca khẳng định `getLastWebPreferences()` của cửa sổ chính có `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`. Phép cắn M2 phải bị bắt |
| R43-2 | TB | Ca cho bước 4 và bước 5 hỏng (`ScriptedAdapters`, lần gọi đổi tên thứ 1 và 2). Phép cắn D2 phải bị bắt |
| R43-3 | TB | Thêm `app://commission-tracker.evil/` vào R1a. Phép cắn D3 phải bị bắt |
| R43-5 | TB | Ca: hai lần kiểm trả cùng một `notification_id` thì hiện hai toast. Phép cắn X1 phải bị bắt |
| R43-6 | TB | Đường dẫn và phương thức của `check_due` vào `desktop.json`, mục `reminder_ticker`; Main trao cho ticker |
| R43-8 | thấp | Một khẳng định so ba địa chỉ `ipc` của `restore_data.json` với chuỗi nguyên văn của hợp đồng |
| R43-9 | thấp | Nhãn `200` của `native_dialogs` vào Configs |
| R43-12 | thấp | Comment `save_file` (trùng việc còn lại của CT-9) |
| R43-13, R43-14, R43-15 | thấp | Sửa comment và EXPERIENCES lỗi thời |
| R43-16 | thấp | Gộp EVIDENCE cũ thành mục mốc hiện tại, theo Giao thức 07 |
| R43-20 | thấp | Agent đặt mã `R43-14b`; tôi đánh lại là R43-20. `tests/tools/toast_probe_main.cjs` và `tests/probe.cjs` không dọn thư mục tạm. Sửa nhỏ, cùng pha |

### 3.2 Cần quyết định ở hợp đồng

**R43-10: lối vào `ipc` từ chối đầu vào sai bằng cách nào.** `restore:status`, `restore:cancel`, `dialog:open-file` và `dialog:pick-folder` chỉ khai nhãn 200. Khi khung gửi hay đối số sai, `invoke` bị từ chối (Promise reject), không có đối tượng `{ status, body }`. Hành vi này hợp lý nhưng không được ghi ở đâu. Đây đúng là tình huống của CT-10, nhưng cho `ipc`.
- **Hướng A (đề xuất):** ghi vào `endpoint_forms.ipc` rằng lời gọi bị từ chối vì đối số sai dạng, hay vì không đến từ khung chính ở `ui_origin`, thì không có đối tượng trả lời: `invoke` bị từ chối. Lối vào nào khai 400 thì vẫn trả 400 cho đầu vào sai. Đây là mở rộng: API Contract **6.2.0**, không đổi mã.
- **Hướng B:** khai 400 cho bốn lối vào. Đây là thay đổi phá vỡ (7.0.0): giao diện phải xử lý thêm một nhãn, và Desktop phải đổi hành vi. Lợi ích nhỏ.

**R43-11** đi theo R43-10. Với hướng A, pha 2 siết `open_file` theo đúng luật "mọi khóa của `object { … }` bắt buộc có mặt" (`02-contract.md` Bước 2.3): đối số không có `filters` thì bị từ chối như mọi đối số sai khác. Giao diện luôn gửi `{ filters }` (`UI/src/logic/workflows/restore_data/adapters.ts:138`), nên không bên gọi nào bị ảnh hưởng.

**R43-4: Main đọc `details` của `ERR_RESTORE_FAILED`.** Hai khóa `rollback_stage` và `previous_database_path` không được khai ở đâu, vì hợp đồng chỉ có `details: object|null`. `error_dialog.ts` còn nhập kiểu `RollbackStage` từ Entities của `restore_data`.

Mức phụ thuộc mềm: khi thiếu hay sai khóa, Main dùng câu khởi động chung, không nói sai về chỗ dữ liệu. Khuôn hợp đồng (`02-contract.md`) hiện không có chỗ khai hình dạng `details` theo từng nhãn.
- **Hướng A (đề xuất):** cho nhãn lỗi một trường `details` tùy chọn, rồi khai `details` của `apply_pending_restore` 500. Đây là mở rộng, gộp vào 6.2.0. Pha 2 cho Main tự khai kiểu của hai khóa đó (không nhập từ Entities của workflow), giống luật "mỗi bên tự mô tả dữ liệu nhận về".
- **Hướng B:** chấp nhận như hiện tại, ghi lý do vào checkpoint của Main, và chỉ bỏ việc nhập kiểu từ Entities.

### 3.3 Phát hiện thêm của Orchestrator

**R43-21 (TB): `restore_data` không tự tuần tự hóa `restore:prepare`, `restore:cancel` và `restore:status`.**
- `backup_data` chỉ có **một** tệp chờ, ở đường dẫn cố định `restore-staging/data.db`. Desktop thì ghi bản ghi đang chờ ở **cuối** mỗi lần chuẩn bị, sau bước sao lưu an toàn.
- Hai lần chuẩn bị A rồi B chen nhau có thể ra thứ tự: tệp chờ của A, rồi tệp chờ của B ghi đè, rồi bản ghi B, rồi bản ghi A ghi sau cùng. Kết quả là bản ghi nói A trong khi tệp chờ chứa dữ liệu của B. Lần mở sau sẽ khôi phục dữ liệu B và báo "đã khôi phục từ A".
- `restore:cancel` chen vào giữa một lần chuẩn bị cũng có thể báo đã hủy trong khi bản ghi được ghi ngay sau đó.
- Tôi suy ra điều này từ `services.ts:503-548`, chưa tái hiện.
- V1 không chạm tới được: trang `restore` chặn bằng cờ đồng bộ `running.current` (`use_restore.ts:125`), và ứng dụng chỉ có một cửa sổ (ca 9). Dù vậy, Desktop đang dựa vào kỷ luật của bên gọi để giữ đúng dữ liệu.
- **Việc ở pha 2:** Services chạy ba lối vào nối tiếp nhau (hàng đợi, không cần nhãn mới). Thêm ca: hai lần `restore:prepare` gửi cùng lúc thì bản ghi cuối cùng khớp tệp chờ. Ước lượng vừa.

### 3.4 Chấp nhận, không sửa

| Mã | Lý do |
|---|---|
| R43-7 | Kiểm `fsync` cần cắt điện; không có cách kiểm thường. Ghi vào checkpoint là bằng chứng không kiểm được |
| R43-17 | Toast thật trên màn hình là bản chất của D1, D2, P8; agent ghi nhận đúng |
| R43-18 | Ngủ cố định và ca phụ thuộc tiêu điểm: đúng việc của DSK-30 mục 4 (bộ đo ổn định ở câu hỏi 3). Không sửa từng chỗ ở pha 2 |
| R43-19 | `Desktop/evidence/` thiếu trong sơ đồ ở `CLAUDE.md` mục 4. Lỗi tài liệu của Orchestrator; tôi sửa `CLAUDE.md`, agent không cần làm gì |

## 4. Ghi nhận về cách làm của phiên

- Phiên dựng bản sao đúng cách plan chỉ, không dùng junction, interpreter của bản sao chạy được ngay. Phiên xóa đúng `%TEMP%\ct_review_desktop` sau khi kiểm không còn tiến trình nào dùng nó, và không đụng thư mục tạm nào khác. Lỗi xóa theo mẫu tên của phiên 42 không lặp lại.
- Phiên tự đếm EVIDENCE và chia ba loại đúng yêu cầu: 24 loại 1, 30 loại 2, 10 loại 3.
- Project Owner chưa trả lời hai câu hỏi (phiên trong ngày, antivirus). Phiên ghi rõ là chưa xác nhận, không lấy giá trị cũ làm sự thật. Cách làm đúng.
- Định danh `coding-agent@2026-10-13#1` đúng: phiên 42 mang định danh của ngày 2026-10-12, dù pha 2b chạy sáng nay.

## 5. Đề xuất cho pha 2

**Phạm vi, gồm phát hiện của pha 1 và việc đã biết của Desktop:**
- **Kiểm thử:** R43-1, R43-2, R43-3, R43-5, R43-8.
- **Mã:** R43-21 (tuần tự hóa), R43-6, R43-9, R43-11 (nếu R43-10 theo hướng A), R43-4 (theo hướng được chọn).
- **Checkpoint và comment:** R43-12 → R43-16, R43-20.
- **Việc đã biết:**
  - DSK-30 mục 3, 6, 7;
  - H-7: ba ô, tức `create_backup` 400, `create_backup` trả thân sai hình dạng, `prepare_restore` 400;
  - H-9: thư mục dữ liệu không dùng được;
  - H-11: máy tắt giữa lúc khôi phục.
- **Chạy:** `npm test` 3 lượt liên tiếp trên máy Project Owner đang được dùng (tiêu chí ổn định của chặng H). Ca 15 và 16 được tách khỏi bộ đo ổn định theo DSK-30 mục 4, kèm lý do.

Phạm vi này lớn hơn pha 2 của phiên 42, nhưng mọi việc đều nằm gọn trong `Desktop/` và phiên đã có sẵn context. Tôi đề xuất làm trong cùng phiên 43, như Project Owner đã chọn cho chặng H.

## 6. Việc tồn đọng

Ghi vào `.plan/open_issues.md`, mục "Chặng H — phiên kiểm độc lập desktop (phiên 43)": bảng R43-1 → R43-21, kèm quyết định cho từng mục. CT-11 (R43-10) và CT-12 (R43-4) chờ Project Owner duyệt.

## 7. Quyết định của Project Owner (2026-10-13)

- **CT-11:** hướng A. Đã ghi API Contract **6.2.0**: câu mới cuối `endpoint_forms.ipc`.
- **CT-12:** hướng A, nhưng ghi trong `meaning` của `ERR_RESTORE_FAILED`. **Đính chính của tôi:** §3.2 đề xuất thêm trường `details` cho nhãn lỗi "trong khuôn hợp đồng". Khuôn nhãn của `02-contract.md` (skill v2.3) chỉ có `code`, nên đề xuất đó là sửa khuôn của skill; tôi đã không kiểm khuôn trước khi đề xuất. Project Owner chọn cách nằm trong khuôn hiện tại. Gộp vào 6.2.0.
- **Pha 2:** cùng phiên 43, đúng phạm vi §5. Plan `.plan/desktop_plan.md`, prompt `.reviews/prompts/desktop/session43_phase2_prompt.md`.
- Khi soạn plan, tôi lần lại H-11 theo `.design/f_restore.md` §3 và thêm hai điều agent phải ghi lại (không khẳng định cứng):
  - sau bước 4, backend có thể tạo một cơ sở dữ liệu rỗng trước khi `restore_trigger` chạy;
  - sau bước 5, kết quả `discarded` đi kèm câu "Dữ liệu không thay đổi", trong khi dữ liệu lúc đó đã là của bản sao lưu.
