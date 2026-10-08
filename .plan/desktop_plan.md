# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-08T16:00:00+07:00
# contract: data_schema 10.0.0, api_contract 5.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 36 của dự án, phiên desktop thứ tám. Đây là phiên 2/3 của **chặng F, khôi phục theo hướng B**, và làm **pha 2: áp dụng** (`.design/f_restore.md` §3):

| Việc | Căn cứ |
|---|---|
| **`backend_controller`**: công cụ quản lý vòng đời do Main trao cho `restore_data`. Gồm ba việc: dừng backend, khởi động lại trên cùng cổng, chờ `READY` | Data Schema `restore_data.input_expected.backend_controller` (`from: main`); lý thuyết WCA §4, mục Main |
| **`restore_data.apply_pending_restore`**, lối vào `in_process` | API Contract `restore_data.apply_pending_restore`; Data Schema `restore_outcome`; `f_restore.md` §3, bước 1 tới 9 |
| **Hạ tầng cắt ngang `restore_trigger`**: một lần mỗi lần Main khởi động, sau `READY` và trước khi mở cửa sổ; hiện kết quả bằng hộp thoại thông báo | API Contract `cross_cutting.restore_trigger`; `.design/03_classification.md` |
| **Khứ hồi thật**: chuẩn bị ở lần chạy thứ nhất, áp dụng ở lần mở thứ hai | tiêu chí chặng F (`.plan/v1_roadmap.md`) |

Không có trang giao diện ở phiên này; trang Khôi phục là phiên 37.

**Điểm dừng:**
- lần mở ứng dụng sau một lần chuẩn bị thì dữ liệu là dữ liệu trong tệp sao lưu, có hộp thoại báo kết quả;
- tệp chờ hỏng hay biến mất thì không đổi gì, bản ghi bị bỏ, có thông báo;
- áp dụng hỏng thì dữ liệu cũ được đưa về, ứng dụng vẫn mở được;
- không có gì đang chờ thì khởi động như cũ, không hiện gì;
- chạy được trên bản đóng gói.

## ĐẶC TẢ ĐÃ CHỐT

Đặc tả đã chốt là `.design/f_restore.md` §3 (từng bước, bước 1 tới 9) và §4 (`restore_outcome`). Plan này chỉ ghi những điểm triển khai mà đặc tả để mở.

### `backend_controller` (Main tạo, trao cho `restore_data` lúc ráp nối)

- **Ba thao tác,** ví dụ `stop()`, `startOnSamePort()` và `waitReady()`, hoặc một `start()` tự chờ `READY`:
  - dừng: cùng cách Main dừng lúc đóng ứng dụng (đóng stdin, chờ thoát, quá hạn thì kết thúc tiến trình);
  - khởi động: cùng cổng đang dùng, cùng biến môi trường;
  - trả kết quả: `READY`, thoát trước khi `READY`, hay quá hạn.

  Lớp `BackendProcess` trong `main.ts` đã được viết sẵn cho việc này: comment của nó ghi "backend_controller, not wired yet".
- ⚠ **Dừng có chủ đích không được gây ra `FATAL`.** Hiện backend thoát trong lúc chạy thì Main gọi `fatal(..., 'running')` qua `onUnexpectedExit`. Một lần dừng qua `backend_controller` không phải "thoát bất ngờ". Kiểm thử phải khẳng định không có dòng `FATAL` trong một lần khôi phục thành công.
- Công cụ này chỉ là hậu cần. Nó không quyết định khi nào dừng hay khởi động: quyết định là của Services của `restore_data`.
- **Thứ tự trong `startLayer`** (`03_classification.md`, Bước 3.2 mục 3):
  1. backend `READY`;
  2. kiểm thư mục giao diện và `protocol.handle`;
  3. ráp `restore_data` (pha 1 như cũ, cộng `backend_controller`);
  4. **chạy `restore_trigger` và chờ nó xong**;
  5. đăng ký `native_dialogs` và các lối vào `ipc`, nếu agent thấy cần dời bước này. Thứ tự hiện tại vẫn đúng, miễn mọi thứ xảy ra trước khi tạo cửa sổ;
  6. tạo cửa sổ.

  `reminder_ticker` vẫn khởi động sau lần nạp đầu của cửa sổ, tức sau khi khôi phục đã xong.

### `apply_pending_restore` (Services của `restore_data`)

- **Bước 1 và 2** theo `f_restore.md` §3:
  - tệp bản ghi đọc không được (JSON hỏng, sai hình dạng, là thư mục) thì `discarded`;
  - `staged_db_path` không phải tệp, hoặc không còn, thì `discarded`;
  - xóa bản ghi. Nếu xóa không được thì vẫn trả `discarded`, kèm `reason` nói rõ. Lần sau sẽ lại `discarded`; không có vòng lặp nào làm hại dữ liệu.
- **Bước 4:**
  - thư mục `restore-previous` cạnh `db_file_path`. Tên nằm trong `configs/restore_data.json`; tạo thư mục nếu chưa có;
  - tên tệp `data-<thời điểm>.db`, thời điểm theo giờ máy, đủ tới giây. Trùng tên thì thêm hậu tố, **không ghi đè**;
  - chỉ đổi tên (`rename`) trong cùng ổ đĩa, không chép.
- **Bước 5:** đổi tên tệp chờ vào `db_file_path`. Tệp chờ là của `backup_data` nhưng hợp đồng giao cho `restore_data` chuyển nó; không mở, không đọc nội dung.
- **Tệp `data.db.lock`** của backend nằm cạnh `data.db`. Không đổi tên, không xóa nó: backend tự lấy lại khóa khi khởi động.
- **Bước 8, hoàn tác:**
  - nếu backend còn chạy (thoát trước `READY` thì không), dừng nó;
  - tệp đang nằm ở `db_file_path`, nếu có, là tệp vừa chuyển vào. Không xóa nó: đổi tên vào `restore-previous` với hậu tố `-failed`;
  - đổi tên tệp ở bước 4 về lại `db_file_path`;
  - khởi động, chờ `READY`; xóa bản ghi; trả `rolled_back`, kèm `reason` là lý do hỏng đầu tiên.
- **Bước 9:** lần khởi động trong lúc hoàn tác cũng hỏng thì ném lỗi theo `endpoint_forms.in_process`: nhãn `500`, kèm `error_body` mang `ERR_RESTORE_FAILED`. Bản ghi vẫn bị xóa trước khi ném. `restore_trigger` để lỗi đi lên Main, và Main dừng bằng đường `fatal` sẵn có, với một câu mới trong `desktop.json` nói rằng dữ liệu cũ đã được đưa về chỗ cũ.
- **Log:** mỗi bước một dòng, kiểm được không cần mắt người. Ví dụ `restore_data: apply: moved the live database aside to <path>`, rồi một dòng cuối `restore_data: apply -> restored`.

### `restore_trigger` (`Desktop/src/cross_cutting/restore_trigger/`)

- Không có năm lớp; không quyết định gì (lý thuyết WCA §5). Main trao cho nó:
  - hàm `apply_pending_restore` của Routers của `restore_data` (hình thức `in_process`);
  - chữ hiển thị;
  - cờ "có hiện hộp thoại không";
  - hàm log.
- `outcome` là `'none'`: không hiện gì, chỉ một dòng log.
- Khác `'none'`: một hộp thoại thông báo của hệ điều hành (`dialog.showMessageBox`), không có cửa sổ cha vì cửa sổ chưa mở. Có một nút "Đóng". Main chờ người dùng bấm xong rồi mới mở cửa sổ.
- Chữ nằm trong `desktop.json`, dựng từ các trường của `restore_outcome`. Tiêu đề "Khôi phục dữ liệu". Nội dung:
  - `restored`: "Đã khôi phục dữ liệu từ bản sao lưu:\n`<archive_path>`\n\nBản sao lưu an toàn của dữ liệu trước đó:\n`<safety_backup_path>`";
  - `rolled_back`: "Không khôi phục được dữ liệu. Dữ liệu trước đó được giữ nguyên.\n\nBản sao lưu đã chọn:\n`<archive_path>`\n\nChi tiết: `<reason>`";
  - `discarded`: "Lần khôi phục đang chờ không còn dùng được nên đã bị bỏ. Dữ liệu không thay đổi.\n\nChi tiết: `<reason>`".

  Trường nào `null` thì bỏ cả đoạn của trường đó.
- **Có `--ct-test-no-dialog`:** không hiện hộp thoại; ghi một dòng `restore dialog text: <JSON {title, content}>`, như cách Main làm với hộp thoại lỗi (DSK-13). Bản đóng gói vẫn nhận cờ này.

### Cách đo trước khi viết (việc 2)

`f_restore.md` §7 có ba điều Orchestrator chưa nắm chắc. Đo trên chính máy này, với AVG và ReasonLabs bật, bằng script tạm ngoài dự án:
1. **Cùng cổng:** chạy `Backend.py` thật trên một thư mục dữ liệu tạm và một cổng cố định; chờ `READY`; đóng stdin, chờ thoát; khởi động lại ngay trên cùng cổng. Lặp **20 lần**, ghi số lần bị từ chối và thông báo lỗi.
2. **Đổi tên ngay sau khi thoát:** trong cùng vòng lặp, ngay sau khi tiến trình thoát, đổi tên `data.db` sang tên khác rồi đổi lại. Ghi số lần hỏng (`EBUSY`, `EPERM`) và thời gian.
3. **Hộp thoại thông báo trước khi có cửa sổ:** một script Electron tạm gọi `dialog.showMessageBox` không có cửa sổ cha, sau `app.whenReady()` và trước khi có `BrowserWindow`. Ghi xem hộp thoại có hiện lên trên cùng và có biểu tượng ứng dụng không; Project Owner nhìn giúp.

**Nếu đo 1 hoặc 2 có lần hỏng thì dừng lại và báo,** không tự thêm vòng thử lại. Orchestrator sẽ quyết: có thể là một vòng thử lại có giới hạn trong Configs, hoặc sửa hợp đồng (bỏ yêu cầu "cùng cổng").

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 4, mục 5, mục 6;
   - lý thuyết WCA §4 (Main và công cụ quản lý vòng đời), §5 (hạ tầng cắt ngang); `04-implement.md` Bước 4.9; `05-edge-cases.md` Bước 5.6; `07-checkpoint-protocol.md`;
   - **`.design/f_restore.md`, toàn bộ**; `.design/03_classification.md`, Bước 3.2 và bảng hạ tầng cắt ngang;
   - hợp đồng:
     - `data_schema.yaml`: `clause_a_common.mandatory_rules` (vòng đời và dừng backend, khóa tệp dữ liệu), `restore_data`;
     - `api_contract.yaml`: `endpoint_forms.in_process`, `restore_data`, `cross_cutting.restore_trigger`, `error_codes.ERR_RESTORE_FAILED`;
   - code:
     - `Desktop/src/main.ts`: khối checkpoint; `BackendProcess`; `startBackend`, `startLayer`, `fatal`, `shutdown`, `onUnexpectedExit`;
     - `Desktop/src/workflows/restore_data/`, cả bốn tệp và khối checkpoint: pha 1, EXP-001 tới 005, hai NOTES;
     - `Desktop/configs/desktop.json`, `Desktop/configs/restore_data.json`;
     - `Desktop/tests/restore_data.spec.ts`, `tests/helpers.ts`, `tests/fixtures/` (gồm `fake_backend_restore.py`), `tests/probe.cjs`, `tests/packaged/packaged_app.spec.ts`;
     - `Backend/workflows/backup_data/` (chỉ đọc): EXP-003 về tệp chờ;
   - `.plan/open_issues.md`: **DSK-23** (theo dõi lần thoát 0xC0000005), DSK-24, DSK-16, BE-8;
   - plan này sau cùng.

   Xác nhận Data Schema **`10.0.0`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron, Python; trạng thái AVG và ReasonLabs theo lời Project Owner.
   - Trong `Desktop/`: `npm ci`; `npm run lint`; `npm test`: mốc **62 đạt**.
   - Trong `UI/`: `npm run build`.
   - Chụp mốc `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`. Ghi `git status --short` (chỉ đọc).

2. **Đo trước khi viết**, theo mục "Cách đo trước khi viết" ở trên. Báo kết quả trước dòng code đầu tiên.

3. **`backend_controller`** trong Main, kèm kiểm thử:
   - dừng rồi khởi động lại trên cùng cổng: `READY`, cùng cổng, không `FATAL`, ứng dụng vẫn chạy;
   - khởi động lại mà backend thoát trước `READY`: trả kết quả "thoát", không `FATAL`.

   Một ca chỉ dùng để kiểm thử `backend_controller` thì gọi nó qua `app.evaluate` hoặc qua một đường kiểm thử, **không** thêm lối vào `ipc` nào.

4. **`apply_pending_restore`** theo đặc tả, rồi **`restore_trigger`**, rồi ráp ở Main.

5. **Kiểm thử** (Playwright, ứng dụng thật, `--ct-test-data-dir` và `--ct-test-no-dialog`). Đặt trong `tests/restore_data.spec.ts` hoặc một spec mới cho pha 2:
   - **A1, không có gì đang chờ:**
     - một dòng log `apply -> none`;
     - không có dòng `restore dialog text`;
     - thứ tự log: dòng của `restore_trigger` **trước** dòng `opening the window`.
   - **A2, khứ hồi thật.** Lần chạy thứ nhất:
     1. tạo khách A, B qua `http`;
     2. `POST /backups`;
     3. tạo khách C;
     4. `restore:prepare` qua `invoke`;
     5. đóng ứng dụng sạch.

     Lần chạy thứ hai, **cùng thư mục dữ liệu**:
     - log `apply -> restored`;
     - `restore dialog text` có `archive_path` và `safety_backup_path`;
     - `GET /clients` có đúng A, B, **không có C**;
     - không còn tệp bản ghi;
     - `restore-previous/` có một tệp `data-*.db`, và mở bằng `sqlite3` thì có C;
     - bản sao lưu an toàn vẫn còn;
     - không `FATAL`; cửa sổ mở; `restore:status` trả `pending: null`.
   - **A3, discarded:**
     - bản ghi hợp lệ nhưng tệp chờ không còn: `discarded`, dữ liệu không đổi, bản ghi bị xóa;
     - bản ghi là JSON hỏng: `discarded`.
   - **A4, hoàn tác:**
     - dựng một tệp chờ làm backend **không lên được**. Ví dụ ghi thẳng một tệp không phải SQLite vào chỗ của tệp chờ, hoặc một cơ sở dữ liệu có bảng phiên bản cấu trúc mới hơn bản build hiểu. Agent đo xem cách nào làm backend thoát trước `READY`, và ghi lại;
     - kết quả: `rolled_back`, kèm `reason`; dữ liệu trước đó còn nguyên (C vẫn có); bản ghi bị xóa; tệp hỏng nằm trong `restore-previous` với hậu tố `-failed`; cửa sổ mở; không `FATAL`;
     - lần mở thứ ba: `none`.
   - **A5, hoàn tác cũng hỏng:**
     - dựng bằng một backend giả trong `tests/fixtures/` lên được ở lần khởi động đầu rồi hỏng ở mọi lần sau;
     - kết quả: `FATAL` với câu mới; mã thoát của lỗi; `data.db` là tệp cũ đã được đưa về; bản ghi bị xóa; không còn tiến trình con.
   - **A6, hai lần mở liên tiếp sau một lần chuẩn bị:** lần hai `restored`, lần ba `none`.

   **Phép cắn**, ghi số liệu rồi khôi phục:
   - (a) bỏ bước hoàn tác: A4 hỏng;
   - (b) không xóa bản ghi sau khi hoàn tác: A4, ở lần mở thứ ba, hỏng;
   - (c) chạy `restore_trigger` sau khi tạo cửa sổ: A1 hỏng ở khẳng định thứ tự;
   - (d) dừng backend qua đường làm `onUnexpectedExit` gọi `fatal`: A2 hỏng.

   Phép nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp; Orchestrator chạy trong audit.

6. **Bản đóng gói.**
   - `electron-builder.yml` phải có `dist/cross_cutting/**/*.js`. Đã có, nên `restore_trigger` đi theo; kiểm lại bằng `@electron/asar`.
   - **P11** trong `tests/packaged/packaged_app.spec.ts`: khứ hồi thật trên bản đóng gói, tức A2 rút gọn (một khách trước, một khách sau, chuẩn bị, mở lại, thấy dữ liệu cũ).

7. **Trang thử cho Project Owner.**
   - Thêm vào `tests/probe.cjs` một tùy chọn giữ thư mục dữ liệu qua các lần chạy, ví dụ `npm run probe -- --data-dir <đường dẫn>`. Không có tùy chọn thì như cũ (thư mục tạm mới).
   - Đây là công cụ kiểm thử, không phải cờ của Main: nó chỉ truyền `--ct-test-data-dir` với đường dẫn đó.

8. **Checkpoint** (Giao thức 07):
   - **`restore_data`:** EXPERIENCES cho pha 2, kết quả đo ở việc 2, cách dựng A4 và A5; EVIDENCE. Xóa NOTE "Chưa làm pha 2". NOTE về DSK-23: ghi có lặp lại hay không;
   - **khối mới `restore_trigger`** ở đầu tệp chính;
   - **Main:** `backend_controller`, thứ tự mới trong `startLayer`, câu `fatal` mới;
   - **Giờ ghi:** chép **nguyên** `Get-Date -Format o` lấy ngay trước khi ghi (BE-8).

9. **Chạy toàn bộ**, với AVG và ReasonLabs bật:
   - **Desktop:**
     - `npm run lint`;
     - `npm test` đạt đủ **3 lần liên tiếp**;
     - xóa `packaging\stage` và `release`, rồi `npm run dist`;
     - `npm run test:packaged`: 10 ca cũ cộng P11.
   - **UI:** `npm run e2e` không đặt `CT_WALKTHROUGH_RUNNER`, **1 lượt**, 75/75; `UI/evidence` không đổi.
   - **Project Owner, khứ hồi thật với hộp thoại thật:**
     1. tạo một tệp sao lưu có dữ liệu: `npm run walkthrough:app` trong `UI/` (mẫu D1 có khách hàng), rồi trang "Sao lưu", rồi đóng;
     2. `npm run probe -- --data-dir <thư mục cố định trong %TEMP%>`, bấm "Chọn tệp sao lưu", chọn tệp ở bước 1, rồi "Chuẩn bị khôi phục";
     3. đóng trang thử; chạy lại đúng lệnh ở bước 2;
     4. hộp thoại "Khôi phục dữ liệu" hiện ra; ghi lại chữ trên đó;
     5. sau khi bấm "Đóng", ô `GET /clients` của trang thử có đúng khách hàng của mẫu D1.

     Ghi câu trả lời vào EVIDENCE.
   - Chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-23:** quan sát. Nếu trang thử hay ứng dụng thoát với mã `3221225477` khi dùng hộp thoại thật, ghi lại số lần mở và hủy hộp thoại, giờ, và mục Application Error trong Windows Event Viewer (chỉ đọc). Không sửa gì vì nó.
- **DSK-24** (V2): không làm.
- **DSK-16:** gói đổi, nên chạy `test:packaged`.
- **DSK-9, DSK-11, DSK-20, DSK-21:** không làm.
- **ENV-7:** không chạy `npm audit fix`.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `backend_controller` là tài nguyên `from: main`: "lifecycle tool handed over by the desktop Main: stop the backend, start it on the same port, wait until it signals READY". Main là **nguồn** của công cụ, không bao giờ là **bên gọi** `restore_data` (lý thuyết WCA §4). Bên gọi `apply_pending_restore` là `restore_trigger`.
- `endpoint_forms.in_process`: một lời gọi trực tiếp vào hàm Routers; nhãn không phải 2xx được ném thành lỗi mang nhãn và `error_body`.
- `restore_outcome` = `{ outcome: 'none'|'restored'|'rolled_back'|'discarded', archive_path: file_path|null, safety_backup_path: file_path|null, reason: string|null }`.
- Luật một backend cho một tệp dữ liệu (Data Schema 6.2.0): mỗi lúc chỉ một tiến trình backend dùng `data.db`. Phải dừng hẳn trước khi đổi tên, và khởi động lại sau khi tệp đã ở đúng chỗ.
- Bước 5.6: chỉ thao tác nguyên tệp. Không mở, không đọc nội dung của `data.db` hay tệp chờ trong mã dự án. Riêng kiểm thử được mở bằng `sqlite3` để khẳng định.
- Tệp ở `restore-previous` được giữ lại, không xóa.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không thêm lối vào `ipc` nào. Không đổi pha 1, trừ việc ráp thêm `backend_controller`; ba lối vào `restore:*` giữ nguyên hành vi.
- Không đổi chữ dòng log `FATAL:` cũ, cách dừng backend lúc đóng ứng dụng, hay hành vi của `reminder_ticker`.
- Không tự thêm vòng thử lại cho cổng hay cho việc đổi tên tệp khi chưa báo kết quả đo (việc 2).
- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus. Không sửa registry, không cài bộ cài.
- Không tăng thời gian chờ sẵn có. Không `retries`, không `skip`. Không tắt luật lint, không thêm `eslint-disable`, không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ **Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.** Phiên này đổi tên tệp dữ liệu, nên điều này quan trọng hơn mọi phiên trước. Mọi lần chạy ứng dụng, kể cả trang thử của Project Owner, đều kèm `--ct-test-data-dir`. Script đo ở việc 2 chỉ dùng thư mục tạm.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- ⚠ Ràng buộc V1: không màn hình hồ sơ quyền sở hữu. Phiên này không làm giao diện.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **Đo trước khi viết:** kết quả đo ở việc 2 có trong báo cáo, và không có lần hỏng nào, hoặc đã báo và Orchestrator đã quyết.
2. **`backend_controller`:** dừng và khởi động lại trên cùng cổng không gây `FATAL`.
3. **Pha 2:** `apply_pending_restore` và `restore_trigger` đúng `f_restore.md` §3; đủ A1 tới A6; bốn phép cắn (hoặc ghi rõ phép nào bị chặn).
4. Lối vào `ipc` vẫn chỉ có năm địa chỉ của phiên 35.
5. Project Owner chạy khứ hồi thật với hộp thoại thật (việc 9).
6. **Chạy toàn bộ:**
   - `npm run lint`;
   - `npm test` 3 lần liên tiếp đạt;
   - `npm run dist` từ trạng thái sạch;
   - `npm run test:packaged` có P11;
   - UI e2e 75/75, `UI/evidence` không đổi;
   - mốc `%APPDATA%` giống nhau.
7. **Checkpoint** `restore_data`, `restore_trigger` (mới) và Main: YAML hợp lệ; giờ đúng BE-8.
8. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo, kèm `git check-ignore -v` cho mọi tệp và thư mục mới.
9. **Báo cáo cuối phiên** theo `CLAUDE.md` mục 5. Kèm:
   - kết quả đo;
   - bảng ca kiểm thử;
   - các phép cắn;
   - câu trả lời của Project Owner, kèm chữ trên hộp thoại;
   - nội dung `app.asar`;
   - DSK-23 có lặp lại không;
   - các lệnh để chạy lại;
   - danh sách ngoại lệ lint mới, nếu có;
   - đề xuất `status` của `restore_data`.
