# Audit phiên 36 — desktop, chặng F pha 2: `backend_controller`, `apply_pending_restore`, `restore_trigger`

- Orchestrator, 2026-10-08.
- Plan: `.plan/desktop_plan.md` (phiên 36). Đặc tả: `.design/f_restore.md` §3, §4, §7. Hợp đồng: Data Schema 10.0.0, API Contract 5.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-08 19:17 (chưa commit), đặt lên `HEAD = 471cb10`.

## 1. Kết luận

**Đạt về chức năng, kèm một điều kiện trước khi commit.**

Pha 2 đúng đặc tả:
- dừng có chủ đích không gây `FATAL`;
- tệp cũ được giữ, không ghi đè;
- hoàn tác đưa dữ liệu cũ về;
- hoàn tác cũng hỏng thì dừng bằng câu mới;
- `restore_trigger` chạy trước cửa sổ.

Bảy ca mới đạt ổn định trên Linux. Năm phép cắn của riêng tôi đều bị bắt, trừ một phép mà kiểu TypeScript chặn từ lúc dịch.

**Điều kiện (§5.1):** các lượt chạy trên Windows (`npm test` ×3, `dist`, `test:packaged`, UI e2e) xong lúc 16:51. Ba tệp mã nguồn được sửa lại lúc 19:10–19:11. Agent ghi rằng chỉ sửa chú thích, nhưng tôi không có bản trước đó để đối chiếu. Mã cuối đạt trên Linux, nhưng P11 và 10 ca chỉ chạy được trên Windows thì chưa chạy trên mã cuối. Project Owner chạy lại một lượt, xem §7.

**Kết quả lượt chạy lại của Project Owner (2026-10-08, 19:44–20:07):**
- lint: sạch;
- `npm test`: 67 đạt, 2 hỏng (N14, D2);
- `dist`: thoát mã 0;
- `test:packaged`: 11/11, có P11.

Hai ca hỏng là do một chỗ đua có sẵn từ trước trong công cụ kiểm thử, không phải do phiên này (§5.7). Điều kiện §5.1 coi như đạt; phiên **đạt**.

**Ba việc mới, không chặn** (DSK-27 ở §5.7):
- DSK-25: hộp thoại kết quả không tự lên trên cùng;
- DSK-26: hoàn tác hỏng ở bước đổi tên thì câu báo lỗi nói sai.

**Đề xuất CT-8:** đưa `restore_data` lên `đã_hoàn_thiện`, chờ Project Owner duyệt (§6).

## 2. Tệp thay đổi

Mọi thay đổi nằm trong `Desktop/`. Không có ngoại lệ lint mới. Dòng `eslint-disable` duy nhất trong `tests/helpers.ts` có từ trước. Với `core.ignorecase=true`, `git check-ignore` không bỏ qua tệp mới nào.

| Tệp | Nội dung |
|---|---|
| `src/main.ts` | `backendController` `{stop, start}` dựng từ `BackendProcess`; thứ tự mới trong `startLayer`; `fatal(..., 'restore_failed')`; main-EXP-033 và một EVIDENCE |
| `src/workflows/restore_data/services.ts` | `applyPending`, `swapIn`, `undo`; EXP-006 tới EXP-009; EVIDENCE; hai NOTES (DSK-23, hộp thoại) |
| `src/workflows/restore_data/adapters.ts` | `isFile`, `freePath` (không ghi đè, thêm `-2`, `-3`), `moveFile` (chỉ `rename`), `stopBackend` và `startBackend` qua controller, `nowFileStamp` |
| `src/workflows/restore_data/entities.ts` | `RestoreOutcome`, `BackendController`, `ApplyReply` |
| `src/workflows/restore_data/routers.ts` | `InProcessCallError` (nhãn và `error_body`); `registerRestoreDataRouters` trả lối vào `in_process` |
| `src/cross_cutting/restore_trigger/restore_trigger.ts` (mới) | gọi một lần, dựng chữ từ Configs, hiện hộp thoại hoặc ghi `restore dialog text`; khối checkpoint |
| `configs/restore_data.json` | nhãn 500 `ERR_RESTORE_FAILED`; tên thư mục và tệp của `restore-previous`, hậu tố `-failed` |
| `configs/desktop.json` | chữ của `restore_trigger`; `main.error_dialog.restore_failed_summary` |
| `tests/restore_apply.spec.ts` (mới) | A1, A2, A3a, A3b, A4, A5, A6 |
| `tests/fixtures/fake_backend_swap.py` (mới) | backend giả lên ở lần đầu, hỏng từ lần hai (A5) |
| `tests/restore_data.spec.ts` | truyền thêm `backendController` vào Adapters (controller không dùng, gọi thì ném lỗi) |
| `tests/packaged/packaged_app.spec.ts` | P11; tham số `keepDataDir` của `launchPackaged` |
| `tests/probe.cjs` | `--data-dir`; vẫn chỉ truyền `--ct-test-data-dir` |

## 3. Đối chiếu với hợp đồng và đặc tả

| Điểm | Căn cứ | Kết quả |
|---|---|---|
| `backend_controller` là tài nguyên `from: main`, Main không gọi `restore_data` | Data Schema `restore_data.input_expected`; lý thuyết §4 | Đạt. Main dựng `{stop, start}` và trao cho Adapters. Bên gọi `apply_pending_restore` chỉ là `restore_trigger` |
| Không `FATAL` khi dừng có chủ đích | plan | Đạt. `stop()` đặt `stopping` trước khi tiến trình thoát, và cả hai trình nghe `exit` chạy trong cùng một lần phát, trước khi `await exited` trở lại. Vì vậy `start()` đặt lại cờ thì không lẫn sang tiến trình cũ. Tiến trình mới chết bất ngờ sau `READY` thì vẫn `FATAL` như cũ |
| Không thử lại | plan, việc 2 | Đạt. Một lần `start`; quá hạn thì `terminate` rồi trả `failed` |
| Bước 1–2: `none`, `discarded` | `f_restore.md` §3 | Đạt. Xóa bản ghi không được thì vẫn `discarded`, kèm lý do |
| Bước 4: `restore-previous`, tên `data-<giờ>.db`, không ghi đè, chỉ đổi tên | §3, plan | Đạt |
| Bước 5: không đọc nội dung `data.db` hay tệp chờ | Bước 5.6 | Đạt. Mã dự án chỉ dùng `stat`, `lstat`, `rename`; chỉ kiểm thử mở bằng `sqlite3` ở chế độ chỉ đọc |
| `data.db.lock` để nguyên | plan | Đạt |
| Bước 8: tệp chuyển vào giữ lại với `-failed`; `reason` là lý do hỏng đầu tiên | plan | Đạt |
| Bước 9: bản ghi xóa trước khi ném; 500 `ERR_RESTORE_FAILED`; Main dừng bằng câu mới | `endpoint_forms.in_process`; §3 | Đạt cho trường hợp "khởi động lại cũng hỏng". Xem §5.3 cho trường hợp đổi tên hỏng |
| `restore_trigger` không quyết định gì, chạy trước cửa sổ, Main chờ | API Contract `cross_cutting.restore_trigger` | Đạt. Chữ lấy từ `desktop.json`; trường `null` thì bỏ đoạn |
| SQLite chỉ là một tệp sau khi đóng sạch | điều kiện ngầm của việc đổi tên nguyên tệp | Đạt. Backend dùng `journal_mode=DELETE` (`scaffold_backend`, adapters), không có `-wal` hay `-shm` |
| Lối vào `ipc` vẫn năm địa chỉ | plan | Đạt (N14, ca 1) |

## 4. Những gì đã tự chạy lại

**Linux**, Node 24, Xvfb với icewm, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`, `ELECTRON_DISABLE_SANDBOX=1`. Bản sao có các chỗ sửa thường lệ (`processTable()` đọc `/proc`; `closeCleanly()` lấy PID của Main).

Phiên này cần thêm một chỗ sửa:
- **Vấn đề:** trên Linux mất dòng `backend started (pid N)` của backend **đầu tiên**, nên `backendPids()` đếm thiếu một.
- **Chỗ sửa, chỉ trong bản sao:**
  - dòng `backend READY on port P` của Main có thêm `(pid N)`;
  - `backendPids()` đọc PID từ cả hai dòng, bỏ trùng.
- Không khẳng định nào bị nới.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint` | sạch | sạch (mã gốc), `tsc` đạt | khớp |
| `restore_apply.spec.ts` + `restore_data.spec.ts` | 7 mới, 69 tổng | **23/23 ×3** (27–28 s mỗi lượt) | khớp |
| Toàn bộ `npm test` | 69 ×3 | 59 đạt, 10 hỏng: đúng 8 ca `desktop_main` và 2 ca `show_inactive` đã biết từ audit phiên 30, 33, 35. Mọi ca mới đều đạt | khớp, không hồi quy |
| UI e2e với Desktop mới | 75/75 | **75/75**; `UI/evidence` giống hệt trước và sau | khớp |
| Checkpoint `restore_data` | YAML hợp lệ | 9 EXPERIENCES, 10 EVIDENCE, `UNSOLVED_PROBLEMS: []`, 2 NOTES; NOTE "chưa làm pha 2" đã bỏ | đạt |
| Checkpoint `restore_trigger` (mới) | YAML hợp lệ | 3 EXPERIENCES, 1 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt |
| Checkpoint Main | YAML hợp lệ | 33 EXPERIENCES, 30 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt; xem §5.4 về NOTES sắp hết hạn |
| Giờ (BE-8) | `19:09:25.3415976+07:00` ở cả ba khối | tệp ghi lúc 19:10:58 tới 19:11:47 | đúng quy ước |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent:
- việc 2: cùng cổng 0/20 và 0/20, đổi tên 0/20;
- `dist`;
- `test:packaged` 11/11 có P11;
- nội dung `app.asar`;
- mốc `%APPDATA%`;
- khứ hồi thật của Project Owner.

**Phép cắn:**

| Phép cắn | Ai chạy | Kết quả |
|---|---|---|
| (a) bỏ hoàn tác | agent | A4 hỏng |
| (b) không xóa bản ghi sau hoàn tác | agent | A4 hỏng |
| (c) `restore_trigger` sau khi tạo cửa sổ | agent | A1 hỏng ở khẳng định thứ tự |
| (d) dừng backend không đánh dấu | agent | A2 hỏng, ứng dụng tự đóng bằng đường `fatal` |
| (e) hoàn tác không dời tệp đã chuyển vào | Orchestrator | A4, A5 hỏng |
| (h) hoàn tác không đưa tệp cũ về | Orchestrator | A4, A5 hỏng |
| (i) bỏ kiểm tệp chờ còn hay không | Orchestrator | A3a hỏng |
| (k) lỗi 500 đi vào câu "startup" thay vì câu mới | Orchestrator | A5 hỏng |
| (g) `restore_trigger` hiện hộp thoại cả khi `none` | Orchestrator | không dịch được: kiểu `ShownOutcome` loại `'none'`. Lỗi này bị chặn từ lúc biên dịch |

## 5. Phát hiện

### 5.1 Mã cuối chưa chạy trên Windows (điều kiện trước khi commit)

**Mốc thời gian:**
- các lượt chạy toàn bộ của agent: 16:23–16:51;
- khứ hồi thật của Project Owner: khoảng 19:03;
- tệp sửa sau đó:
  - `services.ts` lúc 19:10:58;
  - `restore_trigger.ts` lúc 19:11:22;
  - `main.ts` lúc 19:11:47.

EVIDENCE ghi "chỉ đổi chú thích". `dist/` trên máy đã dịch lại lúc 19:11:59, nên không còn bản cũ để so.

Mã cuối đạt mọi ca chạy được trên Linux. Điều chưa được chứng minh là P11 trên bản đóng gói và 10 ca chỉ chạy trên Windows. **Việc:** Project Owner chạy một lượt trước khi commit (§7). Đạt thì phiên đạt hẳn.

### 5.7 N14 và D2 hỏng ở lượt chạy lại: chỗ đua của công cụ kiểm thử (DSK-27, trung bình, không chặn)

**Lượt chạy lại của Project Owner:**
- 67 đạt, 2 hỏng: N14 (`native_dialogs`) và D2 (`reminder_ticker`);
- cả hai hỏng sau khoảng 1 phút;
- bộ chạy mất 7,5 phút, so với khoảng 5,9 phút ở các lượt của agent.

**Log N14 cho thấy chức năng đúng hết:** `dialog:pick-folder` trả thư mục đã chọn, `restore:status -> 200`, lần nạp đầu xong, `restore_trigger -> none` trước khi mở cửa sổ. Log của D2 cũng cho thấy chức năng đúng: toast đầu tiên 1301 ms sau khi mở cửa sổ.

**Nguyên nhân:** log N14 **không có dòng `backend started (pid N)`**. Hàm `closeCleanly()` chờ đúng dòng đó, nên hết giờ.

`launchMain()` (`tests/helpers.ts`) chỉ gắn bộ gom log **sau khi** `_electron.launch` trả về. Mọi dòng Main ghi trước thời điểm đó đều mất. Dòng `backend started` ghi rất sớm, nên khi máy tải và `launch` trả về chậm, dòng này rơi mất.

Đây là cùng nguyên nhân với các ca hỏng "do môi trường" trên Linux ở mọi bản audit desktop từ phiên 30: trên Linux, dòng đó luôn mất.

**Vì sao không phải hồi quy của phiên 36:** phiên này không đổi `helpers.ts`, và không đổi gì xảy ra trước khi backend được khởi động. Tôi không có khối `Error:` của D2. Kết luận cho D2 suy từ cùng thời lượng hỏng và cùng hàm dọn dẹp, chưa được xác nhận trực tiếp.

**Việc cho phiên desktop kế tiếp:** đừng để kiểm thử phụ thuộc vào một dòng log ghi trước khi bộ gom log gắn vào. Ví dụ:
- lấy PID qua `app.evaluate(() => process.pid)` rồi tìm backend trong cây tiến trình;
- hoặc Main ghi PID vào dòng `backend READY on port P`.

Sửa xong thì chạy `npm test` ba lượt trong lúc máy tải. Bản audit trên Linux cũng sẽ chạy được 8 ca `desktop_main` lâu nay bị bỏ.

### 5.2 Hộp thoại kết quả không tự lên trên cùng (DSK-25, trung bình, không chặn)

**Đo của agent:** hộp thoại không cửa sổ cha có trên thanh tác vụ nhưng không chiếm tiêu điểm. Trong lúc đó Main chờ và chưa có cửa sổ, nên người dùng có thể tưởng ứng dụng không mở.

**Điều tôi không chắc:** hai lần đo đều mở ứng dụng từ một tiến trình khác (script của agent, `npm run probe` trong terminal). Windows thường chỉ cho một tiến trình giành tiêu điểm khi nó được người dùng mở trực tiếp, ví dụ bấm lối tắt. Vì vậy cách mở thật có thể cho kết quả khác. Tôi chưa đo được điều này.

**Đề xuất:**
- giữ nguyên cho phiên 37;
- đo bằng cách mở bản đóng gói từ lối tắt hoặc bấm đúp `Commission Tracker.exe`, với `--ct-test-data-dir`. Đo ở lần chạy tay của phiên 37, hoặc ở chặng G;
- vẫn không lên trên cùng thì phiên desktop kế tiếp chọn một cách sửa và đo lại. Ví dụ: hiện hộp thoại gắn với cửa sổ ứng dụng ngay khi cửa sổ vừa mở, rồi mới nạp giao diện; hoặc nháy nút trên thanh tác vụ.

Cả hai cách vẫn đúng hợp đồng, vì hợp đồng chỉ yêu cầu hộp thoại xuất hiện trước khi người dùng thao tác. Cách thứ nhất đổi thứ tự trong `03_classification.md`, nên tôi sẽ đề xuất cụ thể khi có số đo.

### 5.3 Hoàn tác hỏng ở bước đổi tên: câu báo lỗi nói sai (DSK-26, thấp, không chặn)

`undo()` trả lỗi ở ba chỗ:
1. dời tệp đã chuyển vào sang `-failed`;
2. đưa tệp cũ về `db_file_path`;
3. khởi động lại.

Cả ba đều thành 500 với cùng câu `restore_failed_summary`: "Dữ liệu trước đó đã được đưa về chỗ cũ". Câu này chỉ đúng với chỗ 3.

Ở chỗ 2, `data.db` không còn ở chỗ cũ. Lần mở sau, backend sẽ **tạo một cơ sở dữ liệu rỗng**: họa sĩ thấy ứng dụng trống, còn dữ liệu thật nằm trong `restore-previous/` mà không ai báo.

Lỗi này hiếm: hai lần đổi tên trên cùng ổ đĩa vừa thành công vài giây trước, và đo không có lần đổi tên nào hỏng. Nhưng hậu quả nặng hơn mọi trường hợp khác.

Đây là chỗ hở của đặc tả: `f_restore.md` §3 bước 9 chỉ nói về lần khởi động hỏng. Lỗi là của Orchestrator, không phải của agent.

**Việc cho phiên desktop kế tiếp:**
- câu báo lỗi tách theo tình huống: tệp cũ đã về chỗ cũ, hay chưa, kèm đường dẫn của nó trong `restore-previous`;
- một ca kiểm thử cho chỗ 2;
- tôi bổ sung `f_restore.md` §3 trước khi viết plan đó.

### 5.4 NOTES của Main sắp hết hạn (thấp)

Bảy NOTES của Main ghi ngày 2026-09-26, 09-27 và 10-05. Ngưỡng 14 ngày (`CLAUDE.md` mục 5) nghĩa là hai NOTES ngày 09-26 hết hạn từ 2026-10-10. Phiên desktop kế tiếp xem lại: chuyển thành EXPERIENCES, hoặc xóa. Gộp vào DSK-26.

### 5.5 DSK-23

Không lặp lại. Phiên này có một lần hộp thoại chọn tệp thật và một lần hộp thoại kết quả thật. Giữ mục ở chế độ theo dõi tới hết chặng F như đã ghi; phiên 37 cũng dùng hộp thoại thật.

### 5.6 Ghi nhận

- Các quyết định agent tự chọn ở chỗ plan để mở đều hợp lý và có ghi trong EXP-006:
  - hỏng ở bước 4 thì chỉ khởi động lại;
  - `restored` mà xóa bản ghi không được thì vẫn `restored`;
  - tên tệp hỏng.
- Agent đo trước khi chọn cách dựng A4: tệp rỗng thì backend vẫn lên, nên không dùng được. Điều này cứu một ca kiểm thử khỏi việc kiểm sai thứ.
- `Desktop/startup-logs/` và các thư mục build vẫn không nằm trong danh sách thay đổi. Đúng.

## 6. Đề xuất hợp đồng — CT-8

`restore_data`: `đang_chờ_triển_khai` → **`đã_hoàn_thiện`**, Data Schema **10.0.1**. Đổi `status` không phá vỡ, nên chỉ tăng số cuối, như CT-6 với `backup_data`.

**Lý do:**
- đủ năm lớp;
- ba lối vào `ipc` và lối vào `in_process` đúng nhãn;
- `UNSOLVED_PROBLEMS: []`;
- EVIDENCE tái lập được trên hai máy;
- khứ hồi thật do Project Owner chạy.

DSK-25 và DSK-26 là chuyện bên trong và trình bày, không đổi ranh giới. Trang Khôi phục (phiên 37) thuộc layer giao diện.

**Cách khác:** chờ tới khi sửa xong DSK-26. Tôi không chọn cách này, vì nó không đổi gì ở ranh giới.

Chỉ ghi vào `.contracts/` sau khi Project Owner duyệt, và chỉ sau khi điều kiện §5.1 đạt.

## 7. Việc Project Owner làm trước khi commit

Trong `E:\CommissionTracker\Desktop`, với antivirus bật. Không đặt `CT_WALKTHROUGH_RUNNER`.

```
npm run lint
npm test
npm run dist
npm run test:packaged
```

**Lưu ý:**
- nếu `dist` hỏng vì cache, đặt `ELECTRON_BUILDER_CACHE` vào một thư mục trong `%TEMP%` như agent đã làm;
- đóng trang thử và ứng dụng trước khi chạy.

**Cần thấy:**
- lint sạch;
- 69 passed;
- `dist` thoát mã 0;
- 11 passed.

Gửi tôi bốn dòng tổng kết. Đạt thì commit:

```
git add Desktop
git commit -m "CAS36 - Desktop: restore_data phase 2 (backend_controller, apply_pending_restore), restore_trigger"
```

Sau đó là commit của Orchestrator (audit, sổ tồn đọng, lộ trình, `CLAUDE.md`), riêng.
