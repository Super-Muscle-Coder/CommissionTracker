# Audit phiên 38 — desktop, vá ngắn: DSK-26, DSK-27, dọn NOTES

- Orchestrator, 2026-10-10.
- Plan: `.plan/desktop_plan.md` (phiên 38). Đặc tả: `.design/f_restore.md` §3 (bổ sung 2026-10-09). Hợp đồng: Data Schema 10.0.1, API Contract 5.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-10 08:44 (chưa commit), đặt lên `HEAD = 2a9853c`.

## 1. Kết luận

**Đạt.** DSK-26 và DSK-27 đóng, nên **chặng F xong**.

- **DSK-26:** ba câu báo lỗi 9a, 9b, 9c đúng đặc tả, mỗi câu có đúng đường dẫn cần thiết.
- **DSK-27:** sửa ở gốc. Bộ gom log của kiểm thử nay đọc từ dòng đầu tiên Main ghi ra.
- **Dọn NOTES:** đúng cách.

Tôi tự chạy lại trên Linux: các spec bị ảnh hưởng đạt 56/56 cả 3 lượt, toàn bộ bộ kiểm thử không hồi quy, UI e2e đạt 83. Ba phép cắn của tôi đều bị bắt.

**Một tiêu chí của plan chưa đạt, và tôi chấp nhận.** Plan đòi "3 lượt `npm test` liên tiếp đạt trong lúc máy tải". Kết quả thực tế là 76/76, 76/76 rồi 75/76. Ca hỏng (ca 14) **không phải do DSK-27**. Agent tìm ra một lỗi thật, có từ trước, ở Main: khi backend chết ngay sau READY thì `fatal()` bị gọi hai lần, nên họa sĩ thấy hai hộp thoại lỗi. Lỗi này nằm ngoài phạm vi phiên, và Project Owner đã chọn không sửa Main trong phiên này. Tôi ghi nó thành **DSK-28** (§5.1).

**Một đính chính của Orchestrator (§5.2).** Ở audit phiên 36 §5.7, tôi viết rằng 8 ca `desktop_main` hỏng trên Linux là do cùng nguyên nhân với DSK-27. Câu đó **sai**.

## 2. Tệp thay đổi

Chỉ trong `Desktop/`. Lint sạch, không có `eslint-disable`, không phụ thuộc mới.

| Tệp | Nội dung |
|---|---|
| `src/error_dialog.ts` (mới) | Dựng chữ của hộp thoại lỗi: chọn câu theo `FailurePhase` và `rollback_stage`; điền đường dẫn bằng `split`/`join` (an toàn với `$&`); nếu thiếu stage hoặc thiếu đường dẫn thì dùng `startup_summary` |
| `src/workflows/restore_data/services.ts`, `entities.ts` | `undo()` trả `{stage, reason}`; `details` của `ERR_RESTORE_FAILED` thêm `rollback_stage` và `previous_database_path`; checkpoint có EXP-010 |
| `src/main.ts` | `fatal(..., 'restore_failed', context)`; checkpoint thêm main-EXP-034 tới 038; NOTES đã dọn, thêm một NOTE về ca 14 |
| `configs/desktop.json` | `restore_failed_summaries` gồm ba câu, thay cho câu cũ duy nhất |
| `electron-builder.yml` | thêm `dist/error_dialog.js` (tệp này liệt kê tường minh từng tệp) |
| `tests/helpers.ts`, `tests/fixtures/tee_stderr.cjs` (mới) | DSK-27 (§3) |
| `tests/restore_undo.spec.ts` (mới) | U1–U6 |
| `tests/desktop_main.spec.ts` | L1 (log bắt đầu từ dòng đầu tiên) |
| `tests/restore_data.spec.ts` | R10: chờ trang `data:` nạp xong rồi mới `evaluate`. Đây là chỗ đua của chính kiểm thử, sửa mà không nới thời gian chờ |

Với `core.ignorecase=true`, `git check-ignore` không bỏ qua tệp mới nào.

**Không ghi lại được trên `CLAUDE.md`:** bố cục `Desktop/` chưa có `src/error_dialog.ts`. Tôi bổ sung ở lượt này.

## 3. Đối chiếu

**DSK-26**, so với `f_restore.md` §3:

| Trường hợp | Kết quả |
|---|---|
| 9a: hỏng ở 8c | `rollback_stage: 'start'`; `previous_database_path` là `db_file_path`; câu cũ |
| 9b: hỏng ở 8a | `move_failed_aside`; đường dẫn trỏ vào `restore-previous`; câu nói dữ liệu cũ còn nguyên ở đó |
| 9c: hỏng ở 8b | `move_back`; câu có cả hai đường dẫn, lời dặn đừng nhập dữ liệu mới, và cách đưa tệp về |

Chung cho cả ba:
- Bản ghi đang chờ bị xóa trước khi ném lỗi.
- Nhãn và mã giữ nguyên.
- Không thêm vòng thử lại.

`details` không có hình dạng trong hợp đồng, nên phần thêm vào là chuyện bên trong Desktop. Hợp đồng không đổi.

**DSK-27.** Agent chép stderr của tiến trình Main vào một tệp từ dòng đầu tiên, rồi cho `LogCollector` đọc tệp đó:
- script `tests/fixtures/tee_stderr.cjs`, nạp bằng đối số `-r` của Electron (cùng đường Playwright dùng để nạp script của chính nó);
- không đổi Main, không đổi `_electron.launch`, không nới thời gian chờ;
- sửa một chỗ chung trong `launchMain`, không vá riêng từng ca.

Số đo của agent cho thấy dòng đầu tiên (`main started`) mất ở 16/16 lượt với cách cũ. Như vậy cơ chế mất dòng là có thật, kể cả khi trong 16 lượt đó không có lần nào mất đúng dòng `backend started`.

**Dọn NOTES.** Năm NOTES ghi trước 2026-09-28 của Main: ba chuyển thành main-EXP-034, 035, 036; hai bị xóa vì trùng hoặc lỗi thời. Các NOTES còn hạn giữ nguyên. NOTE của `restore_data` được cập nhật hiện trạng DSK-23.

## 4. Những gì đã tự chạy lại

**Môi trường:** Linux, Node 24, Xvfb với icewm, Electron 44.4.5. Bản sao **chỉ còn một** chỗ sửa thường lệ: `processTable()` đọc `/proc` thay cho PowerShell. Không cần vá `closeCleanly()` hay `backendPids()` nữa, vì log không còn mất dòng.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint`, `tsc` | sạch | sạch | khớp |
| `restore_undo` + `restore_apply` + `restore_data` + `native_dialogs` + `reminder_ticker` | — | **56/56 ×3** | đạt |
| Toàn bộ `npm test` | 76 (không tải) | 66 đạt, 10 hỏng: đúng 8 ca `desktop_main` và 2 ca `show_inactive`, do môi trường (§5.2) | khớp, không hồi quy |
| UI e2e với Desktop mới | 83 | **83** | khớp |
| Checkpoint Main | — | 38 EXPERIENCES, không trùng id, 34 EVIDENCE, `UNSOLVED_PROBLEMS: []`, NOTES ngày 10-05 (hai) và 10-09 | đạt |
| Checkpoint `restore_data` | — | 10 EXPERIENCES, 11 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt |

**Ghi nhận:** ba ca của `native_dialogs`, `reminder_ticker` và `restore_data` trước đây phải vá `closeCleanly()` mới chạy được trên Linux; nay chúng đạt mà không cần vá. Đây là bằng chứng độc lập rằng cách sửa DSK-27 có tác dụng.

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent:
- `npm test` có tải 76, 76, 75 và không tải 76;
- `dist`, `test:packaged` 11/11;
- mốc `%APPDATA%`.

**Phép cắn:**

| Phép cắn | Ai chạy | Ca hỏng |
|---|---|---|
| (a) luôn trả stage `start` | agent | U2, U3 |
| (b) câu 9c bỏ đường dẫn | agent | U3, U4, U6 |
| (c) ném lỗi ở 8a trước khi xóa bản ghi | agent | U2 |
| (d) cách gom log cũ, cộng trễ 4 s sau `launch` | agent | L1, N2 |
| (e) mọi stage đều dùng câu của 9a | Orchestrator | U2, U3, U4, U6 |
| (f) `previous_database_path` là `null` ở 9b và 9c | Orchestrator | U2, U3 |
| (g) hỏng ở 8b nhưng báo stage `start` | Orchestrator | U3 |

## 5. Phát hiện

### 5.1 `fatal()` chạy hai lần, họa sĩ thấy hai hộp thoại lỗi (DSK-28, trung bình)

**Cách xảy ra:**
1. Backend chết ngay sau READY, trong lúc cửa sổ đang nạp trang đầu.
2. `onUnexpectedExit` gọi `fatal(..., 'running')`, và ứng dụng bắt đầu thoát.
3. Lần nạp trang đầu báo `ERR_FAILED`. Lỗi đó đi vào `.catch` của `whenReady().then(startLayer)` và gọi `fatal("The app could not start: ERR_FAILED …")` **lần thứ hai**.
4. Hậu quả:
   - hai hộp thoại hiện liên tiếp;
   - hộp thoại thứ hai nói sai nguyên nhân ("không khởi động được");
   - log có hai dòng `FATAL:`.

**Đo trên Windows:** ca 14 hỏng 2 trong 4 lượt có tải, 0 trong 1 lượt không tải.

**Đánh giá:** lỗi hiếm, vì backend phải chết đúng trong khoảng khoảng một giây đó, nhưng là lỗi họa sĩ nhìn thấy được. Lỗi có từ trước phiên này; phiên này chỉ làm nó lộ ra nhờ chạy kiểm thử khi máy tải.

**Cách sửa** đã ghi trong NOTE của Main: trong `fatal()`, nếu `shutdownStarted` đã đúng thì chỉ ghi log, không hiện hộp thoại thứ hai. Cần cân nhắc dòng `FATAL:` thứ hai có nên vẫn ghi vào log hay không.

**Việc:** làm ở phiên desktop đầu tiên của chặng G, trước khi đóng gói bản chính thức. Sau khi sửa, ca 14 phải đạt 3 lượt liên tiếp có tải.

### 5.2 Đính chính: 8 ca `desktop_main` hỏng trên Linux không phải do DSK-27

Audit phiên 36 §5.7 viết rằng việc mất dòng `backend started` "là nguyên nhân của các ca `desktop_main` hỏng do môi trường trong mọi bản audit desktop". Lần này log không còn mất dòng nào, nhưng 8 ca đó vẫn hỏng.

Nguyên nhân thật: `backendTree()` của `desktop_main` khẳng định có ít nhất hai tiến trình `python`, vì trên Windows `env\Scripts\python.exe` là trình khởi chạy, nó sinh thêm `python.exe` thật. Trên Linux, môi trường ảo chỉ có một tiến trình. Đây đúng là giới hạn của môi trường, như các audit trước ghi. Câu của tôi ở audit 36 là suy luận sai. Tôi sửa lại ở DSK-27 trong sổ tồn đọng.

### 5.3 Việc nhỏ (DSK-29, thấp)

- Mỗi lần `launchMain` tạo một thư mục `ct-desktop-log-*` trong thư mục tạm và không xóa. Một lượt `npm test` để lại vài chục thư mục; trên Linux tôi đếm được 113 sau bốn lượt. Cần dọn khi đóng ứng dụng, hoặc khi ca kết thúc.
- Chú thích đầu `tee_stderr.cjs` còn ghi "loaded … with NODE_OPTIONS=--require", nhưng mã thật dùng đối số `-r`.
- `last_updated_by` của hai khối là `coding-agent@2026-10-09#1`. Phiên 37 cũng chạy ngày 2026-10-09 với số `#1`, nên phiên 38 đúng ra là `#2` (`CLAUDE.md` mục 5: đếm mọi phiên trong ngày).

Không chặn commit. Làm kèm DSK-28.

### 5.4 DSK-23 đóng

Không lặp lại trong suốt chặng F, phiên 35 tới 38. Điều kiện đóng ghi trong sổ tồn đọng ("không lặp lại tới hết chặng F") đã đạt.

## 6. Trạng thái

- DSK-26, DSK-27, DSK-23 đóng ngày 2026-10-10, phiên 38.
- Mở DSK-28 (trung bình, phiên desktop đầu chặng G) và DSK-29 (thấp, làm kèm DSK-28).
- **Chặng F xong** ngày 2026-10-10.
- `restore_data` giữ `đã_hoàn_thiện`. Hợp đồng không đổi.

## 7. Commit

```
git add Desktop
git commit -m "CAS38 - Desktop: DSK-26 rollback sentences, DSK-27 early log capture, NOTES cleanup"
git add .reviews/audits/desktop/audit_desktop_session38.md .plan/open_issues.md .plan/v1_roadmap.md CLAUDE.md
git commit -m "OS - Audit session 38; stage F done; DSK-28, DSK-29"
git push
```
