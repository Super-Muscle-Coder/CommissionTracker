# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-09T16:40:00+07:00
# contract: data_schema 10.0.1, api_contract 5.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 38 của dự án, phiên desktop thứ chín: **vá ngắn, đóng chặng F.** Ba việc:

| Mã | Việc | Căn cứ |
|---|---|---|
| **DSK-26** | Hoàn tác hỏng ở bước đổi tên thì câu báo lỗi phải nói đúng chỗ của dữ liệu cũ: ba câu cho ba trường hợp 9a, 9b, 9c | `.design/f_restore.md` §3, bước 8 và 9 (bổ sung 2026-10-09); audit phiên 36 §5.3 |
| **DSK-27** | Kiểm thử Desktop không được dựa vào một dòng log in trước khi bộ gom log kịp gắn vào | audit phiên 36 §5.7 |
| **Dọn NOTES** | Xem lại mọi NOTES của các khối checkpoint Desktop đã hoặc sắp quá 14 ngày | `CLAUDE.md` mục 5; audit phiên 36 §5.4 |

Chặng F xong khi DSK-26 đóng (`.plan/v1_roadmap.md`). Hợp đồng không đổi.

**Điểm dừng:**
- ba ca mới của DSK-26 đạt;
- `npm test` đạt 3 lượt liên tiếp **trong lúc máy bị làm tải** (việc 4);
- `dist` và `test:packaged` đạt;
- UI e2e đạt một lượt;
- mọi NOTES quá hạn đã được xử lý.

## ĐẶC TẢ ĐÃ CHỐT

### DSK-26 (`f_restore.md` §3, bước 8 và 9)

- **Bước 8 có ba việc**, mỗi việc có thể hỏng:
  - **8a:** dời tệp vừa chuyển vào sang `-failed`;
  - **8b:** đưa tệp cũ về `db_file_path`;
  - **8c:** khởi động lại backend.

  `undo()` hiện đã làm đúng thứ tự này; chỉ có điều cả ba chỗ hỏng đều ra cùng một lỗi.
- **Lỗi 500 `ERR_RESTORE_FAILED`** vẫn như cũ (nhãn, mã, xóa bản ghi trước khi ném). Thêm vào `details` của `error_body`:
  - việc nào của bước 8 hỏng, ví dụ `rollback_stage: 'move_failed_aside' | 'move_back' | 'start'`;
  - đường dẫn tệp dữ liệu cũ, ví dụ `previous_database_path`.

  Tên khóa do agent chọn. Hợp đồng không quy định hình dạng `details`, nên đây là chuyện bên trong Desktop. `reason` và `rollback_reason` giữ nguyên.
- **Ba câu**, nằm trong `configs/desktop.json`, thay cho `main.error_dialog.restore_failed_summary` duy nhất hiện nay. Main chọn câu theo `rollback_stage`. Đây là việc chọn chữ để trình bày, giống cách Main đã chọn câu theo `FailurePhase`. Nội dung:
  - **9a** (`start`): như câu hiện tại. Dữ liệu cũ đã về chỗ cũ; hãy mở lại ứng dụng.
  - **9b** (`move_failed_aside`): không khôi phục được. Dữ liệu trước đó vẫn nằm ở `<previous_database_path>`. Lần mở sau, ứng dụng dùng dữ liệu của bản sao lưu nếu nó mở được.
  - **9c** (`move_back`):
    - Không khôi phục được, và **không đưa được dữ liệu trước đó về chỗ cũ**.
    - Dữ liệu trước đó nằm ở `<previous_database_path>`.
    - Đừng nhập dữ liệu mới khi chưa đưa tệp đó về: lần mở sau, ứng dụng sẽ bắt đầu với dữ liệu trống.
    - Cách đưa về: đóng ứng dụng, chép tệp đó vào `<db_file_path>` với tên `data.db`.

  Câu chữ cuối cùng do agent viết theo đúng các ý trên, tiếng Việt, rõ nghĩa với họa sĩ. Phần "Chi tiết kỹ thuật" giữ như cũ.
- **Không thêm vòng thử lại** cho các lần đổi tên (đo ở phiên 36: 0/20 lần hỏng).
- **Không làm gì để chặn lần mở sau** tạo cơ sở dữ liệu rỗng ở trường hợp 9c. V1 chấp nhận, vì trường hợp này chưa từng xảy ra. Câu thông báo là biện pháp duy nhất.

### DSK-27

- Lỗi: `launchMain()` (`tests/helpers.ts`) gắn bộ gom log **sau khi** `_electron.launch` trả về. Dòng `backend started (pid N)` in sớm có thể mất khi máy tải. Các chỗ chờ dòng đó thì hết giờ.
- **Các chỗ đang dựa vào dòng đó** (Orchestrator liệt kê bằng `grep`; agent kiểm lại cho đủ):
  - `closeCleanly()` của `native_dialogs.spec.ts`, `reminder_ticker.spec.ts`, `restore_data.spec.ts`;
  - `desktop_main.spec.ts` dòng 33–35 và 297;
  - `LogCollector.backendPids()`, dùng nhiều ở `restore_apply.spec.ts`;
  - P-test bản đóng gói, nếu cũng qua `_electron.launch`.

  Ca nào chạy qua `spawnMain` (`child_process.spawn`) thì không mất dòng nào; agent ghi rõ ca nào thuộc loại nào.
- **Đo trước khi sửa** (việc 2): tái hiện được việc mất dòng khi máy bị làm tải, và chứng minh nguyên nhân là thời điểm gắn bộ gom log.
- **Cách sửa,** agent chọn và ghi lý do:
  - lấy PID không qua dòng log sớm, ví dụ PID của Electron qua `app.process().pid` rồi tìm tiến trình backend trong cây tiến trình;
  - hoặc Main ghi PID vào một dòng in muộn hơn;
  - hoặc cách khác đo được là chắc chắn.

  Không thay `_electron.launch` bằng công cụ khác. Không nới thời gian chờ.
- Ca nào khẳng định **chính dòng log khởi động** (ví dụ "đúng một dòng `backend started`" của ca hai bản ứng dụng) thì phải dùng đường gom log không mất dòng, hoặc đổi sang khẳng định tương đương không phụ thuộc thời điểm. Ghi rõ từng ca.

### Dọn NOTES

**Hiện trạng** (Orchestrator đọc ngày 2026-10-09):
- Main: bảy NOTES, ghi ngày 09-26 (hai), 09-27 (ba), 10-05 (hai);
- `restore_data`: hai NOTES, ngày 10-08;
- `native_dialogs`: ngày 10-08 và 10-07;
- `reminder_ticker`: ngày 10-05.

**Cách làm:** mọi NOTE có `written_at` trước 2026-09-28 (hết hạn trước hoặc trong tuần này) phải được xử lý:
- còn đúng và còn giá trị thì chuyển thành EXPERIENCES, kèm id mới;
- đã lỗi thời thì xóa.

Ghi trong báo cáo từng NOTE đi đâu. Các NOTES còn hạn: chỉ sửa nếu nội dung đã sai.

Hai NOTES của `restore_data` có nhắc DSK-23, DSK-24, DSK-25. Cập nhật cho đúng hiện trạng: DSK-25 đã đóng; DSK-23 không lặp lại.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md` mục 4, 5, 6;
   - `.design/f_restore.md` §3 (bản bổ sung 2026-10-09);
   - hợp đồng:
     - `api_contract.yaml`: `error_codes.ERR_RESTORE_FAILED`, `error_body`, `restore_data.apply_pending_restore`, `endpoint_forms.in_process`;
     - `data_schema.yaml`: `restore_data`;
   - code:
     - `Desktop/src/workflows/restore_data/` (cả bốn tệp, khối checkpoint);
     - `Desktop/src/cross_cutting/restore_trigger/`;
     - `Desktop/src/main.ts` (khối checkpoint, `fatal`, `buildErrorDialog`, `FailurePhase`);
     - `Desktop/configs/desktop.json`;
     - `Desktop/tests/helpers.ts` và mọi spec;
   - `.plan/open_issues.md`: DSK-26, DSK-27, DSK-23, BE-8;
   - plan này sau cùng.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron, Python; trạng thái AVG và ReasonLabs theo lời Project Owner.
   - Trong `Desktop/`: `npm ci`; `npm run lint`; `npm test`. Mốc **69**: ghi đủ số đạt, số hỏng và tên ca hỏng nếu có.
   - Chụp mốc `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`. Ghi `git status --short` (chỉ đọc).

2. **Đo DSK-27 trước khi sửa.**
   - Viết một script tạm **ngoài dự án** làm máy tải, ví dụ chạy vòng lặp bận trên số lõi trừ một, có giới hạn thời gian.
   - Trong lúc nó chạy, chạy `npx playwright test tests/native_dialogs.spec.ts tests/reminder_ticker.spec.ts` vài lượt.
   - Ghi: có tái hiện được việc mất dòng `backend started` không, bao nhiêu lần trên bao nhiêu; ca nào hỏng; thời điểm `launch` trả về so với thời điểm Main in dòng đó, nếu đo được.
   - Không tái hiện được trong 5 lượt thì vẫn sửa theo đặc tả, và ghi rõ là chưa tái hiện được.

   Báo kết quả trước dòng code đầu tiên.

3. **DSK-26.**
   - Services của `restore_data`: phân biệt ba chỗ hỏng của `undo()`; thêm `rollback_stage` và đường dẫn tệp cũ vào `details`.
   - Main: chọn câu theo `rollback_stage`; ba câu trong `desktop.json`.
   - **Kiểm thử:**
     - Ba ca 9a, 9b, 9c ở mức Services với Adapters giả: `moveFile` hỏng ở lần gọi chọn trước, hoặc `startBackend` hỏng. Mỗi ca khẳng định nhãn 500, mã, `rollback_stage`, đường dẫn tệp cũ, bản ghi đã xóa, và tệp nào nằm ở đâu.
     - Ba ca chọn câu ở Main: `buildErrorDialog` hay hàm tương đương, mỗi `rollback_stage` ra đúng câu, câu có đúng đường dẫn.
     - A5 (`restore_apply.spec.ts`) vẫn đạt: nó là trường hợp 9a qua ứng dụng thật.
   - **Phép cắn:**
     - (a) mọi trường hợp đều trả `rollback_stage: 'start'`;
     - (b) câu 9c không có đường dẫn tệp cũ;
     - (c) ném lỗi ở 8a mà không xóa bản ghi.

4. **DSK-27.** Sửa theo đặc tả và kết quả đo ở việc 2.
   - Chạy `npm test` đủ **3 lượt liên tiếp, mỗi lượt trong lúc script tải ở việc 2 đang chạy**. Ghi số đạt mỗi lượt.
   - Rồi 1 lượt không tải.
   - **Phép cắn (d):** cho Main in dòng `backend started` sau một khoảng chờ nhân tạo ngắn, chỉ trong bản sao tạm. Ca đã sửa vẫn phải đạt; nếu khôi phục cách cũ thì ca hỏng.

5. **Dọn NOTES** theo đặc tả.

6. **Bản đóng gói:** xóa `packaging\stage` và `release`; `npm run dist`; `npm run test:packaged`: mốc **11**, phải đạt cả 11. Nếu `dist` hỏng EXDEV, đặt `ELECTRON_BUILDER_CACHE` vào một thư mục tạm.

7. **UI:** `npm run build` trong `UI/`, rồi `npm run e2e` một lượt, không đặt `CT_WALKTHROUGH_RUNNER`: 83/83, và `UI/evidence` không đổi.

8. **Checkpoint** (Giao thức 07):
   - `restore_data`: EXPERIENCES cho DSK-26; EVIDENCE;
   - Main: DSK-27, ba câu mới, NOTES đã dọn;
   - khối nào có NOTES được dọn thì ghi trong khối đó.

   **Giờ ghi:** chép **nguyên** `Get-Date -Format o` lấy ngay trước khi ghi (BE-8). **Sửa checkpoint sau khi đã chạy toàn bộ thì chạy lại `npm test` một lượt** và ghi trong báo cáo (bài học audit phiên 36 §5.1).

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-23:** chỉ theo dõi. Nếu ứng dụng thoát với mã `3221225477` thì ghi lại; không sửa vì nó. Không lặp lại tới hết phiên này thì Orchestrator đóng ở audit.
- **DSK-24, DSK-20** (V2), **DSK-21** (chặng G), **DSK-9, DSK-11:** không làm.
- **UI-22:** việc của layer giao diện; không làm.
- **ENV-7:** không chạy `npm audit fix`.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `apply_pending_restore`: 200 `restore_outcome`; 500 `ERR_RESTORE_FAILED`. Nhãn và mã không đổi.
- `ERR_RESTORE_FAILED.meaning`: "Applying a pending restore failed and the previous database was put back; or putting it back failed too (the app stops)". Ba trường hợp 9a, 9b, 9c đều nằm trong vế sau.
- `error_body` = `{ code, message, details: object|null }`. `details` không có hình dạng trong hợp đồng.
- Bước 5.6: chỉ thao tác nguyên tệp; mã dự án không mở, không đọc nội dung `data.db`.
- Tệp ở `restore-previous` được giữ, không xóa.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không đổi nhãn, mã lỗi, hay hành vi của ba lối vào `restore:*`, `native_dialogs`, `reminder_ticker`. Không thêm lối vào `ipc` nào, không thêm cờ `--ct-test-*`.
- Không thêm vòng thử lại cho đổi tên tệp hay cho cổng.
- Không thay `_electron.launch`, không đổi bộ công cụ kiểm thử. Không tăng thời gian chờ sẵn có, không `retries`, không `skip`.
- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Script làm máy tải nằm ngoài dự án và không đưa vào kho.
- Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus. Không sửa registry, không cài bộ cài.
- Không tắt luật lint, không thêm `eslint-disable`, không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật. Mọi lần chạy ứng dụng kèm `--ct-test-data-dir`.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng. Script làm tải không phải bản ứng dụng, nên được chạy song song với kiểm thử.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **Đo DSK-27:** kết quả đo ở việc 2 có trong báo cáo.
2. **DSK-26:**
   - ba trường hợp 9a, 9b, 9c ra ba câu đúng, có đường dẫn;
   - kiểm thử mức Services và mức Main đủ;
   - A5 vẫn đạt;
   - ba phép cắn (a), (b), (c).
3. **DSK-27:**
   - không ca nào còn chờ một dòng log in trước khi bộ gom log gắn vào; mỗi ca được liệt kê;
   - `npm test` đạt **3 lượt liên tiếp có tải** và 1 lượt không tải, 69 cộng các ca mới;
   - phép cắn (d).
4. **NOTES:** mọi NOTE ghi trước 2026-09-28 đã chuyển hoặc xóa, có bảng trong báo cáo.
5. `npm run lint` sạch; `npm run dist` từ trạng thái sạch; `npm run test:packaged` 11/11.
6. UI e2e 83/83 một lượt; `UI/evidence` không đổi.
7. **Checkpoint:** YAML hợp lệ; giờ đúng BE-8; `UNSOLVED_PROBLEMS: []`.
8. Mốc `%APPDATA%` giống đầu phiên.
9. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo, kèm `git check-ignore -v` cho tệp mới.
10. **Báo cáo cuối phiên** theo `CLAUDE.md` mục 5, kèm:
    - kết quả đo;
    - danh sách ca từng dựa vào dòng log sớm, và cách sửa từng ca;
    - ba câu mới, nguyên văn;
    - các phép cắn;
    - bảng NOTES;
    - DSK-23 có lặp lại không;
    - các lệnh để chạy lại;
    - danh sách ngoại lệ lint mới, nếu có.
