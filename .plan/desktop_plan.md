# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-10T09:30:00+07:00
# contract: data_schema 10.0.1, api_contract 5.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 39 của dự án, phiên desktop thứ mười, **mở đầu chặng G**. Phiên vá ngắn, chỉ hai mã:

| Mã | Việc | Căn cứ |
|---|---|---|
| **DSK-28** | Backend chết ngay sau READY thì họa sĩ thấy **hai** hộp thoại lỗi, hộp thứ hai nói sai nguyên nhân. Sửa để chỉ còn một | audit phiên 38 §5.1; NOTE cuối của khối checkpoint Main |
| **DSK-29** | Bốn việc nhỏ: dọn thư mục tạm của kiểm thử; sửa một chú thích sai; sửa một `last_updated_by`; bỏ chú thích `eslint-disable` duy nhất còn trong `Desktop/` | audit phiên 38 §5.3; mục (4) do Orchestrator phát hiện khi soạn plan này |

Hợp đồng không đổi. Phiên này không đóng gói bản chính thức và không đụng tới việc cài đè (DSK-21): việc đó thuộc runbook chặng G, soạn sau phiên này.

**Điểm dừng:**
- tái hiện được lỗi hai hộp thoại bằng một ca kiểm thử **trước** khi sửa; sau khi sửa ca đó đạt;
- `npm test` đạt 3 lượt liên tiếp **trong lúc máy bị làm tải**, rồi 1 lượt không tải;
- `dist` và `test:packaged` đạt;
- UI e2e đạt một lượt.

## ĐẶC TẢ ĐÃ CHỐT

### DSK-28

**Lỗi, theo log phiên 38:**
1. Backend chết ngay sau READY, trong lúc cửa sổ đang nạp trang đầu.
2. `onUnexpectedExit` gọi `fatal("The backend stopped unexpectedly …", 'running')`, rồi `fatal()` gọi `shutdown(…)`.
3. Lần nạp trang đầu bị hủy và báo `ERR_FAILED` (-2). Lỗi đó đi vào `.catch` của `whenReady().then(startLayer)` (cuối `src/main.ts`) và gọi `fatal("The app could not start: ERR_FAILED …")` **lần hai**.
4. Kết quả: hai dòng `FATAL:`, hai dòng `error dialog text` (họa sĩ thật thấy hai hộp thoại), và hộp thứ hai nói "không khởi động được", sai nguyên nhân.

**Quyết định của Orchestrator:**
- **Chỉ lần gọi `fatal()` đầu tiên được hiện hộp thoại và chọn mã thoát.** Mọi lần gọi sau đó, và mọi lần gọi khi `shutdown()` đã bắt đầu vì bất kỳ lý do nào (kể cả họa sĩ tự đóng cửa sổ), chỉ ghi **một** dòng log và không làm gì thêm.
- **Dòng log của lần gọi bị bỏ qua không bắt đầu bằng `FATAL:`.** Ví dụ: `[desktop-main] fatal error after shutdown started (no dialog): <message>`. Chữ cụ thể do agent chọn, miễn là không chứa chuỗi `FATAL:`. Lý do: mọi kiểm thử hiện có đếm dòng `FATAL:`, và "đúng một dòng `FATAL:` cho mỗi lần ứng dụng hỏng" là điều nên giữ. Thông tin về lỗi thứ hai vẫn còn trong log để chẩn đoán.
- **Cờ chặn phải được đặt ở đầu `fatal()`, trước khi hiện hộp thoại.** Lý do: `dialog.showErrorBox` chặn luồng chính cho tới khi họa sĩ bấm. Orchestrator **không nắm chắc** liệu trong lúc hộp thoại đang mở, Electron có chạy tiếp callback JS nào không (vòng lặp thông điệp lồng nhau của Windows). Đặt cờ trước hộp thoại thì đúng trong cả hai trường hợp. Agent không cần đo điều này.
- Agent chọn cách dùng `shutdownStarted` hiện có, hoặc thêm một cờ riêng cho `fatal`, và ghi lý do. Không đổi chữ của dòng `FATAL:` đầu tiên, không đổi chữ của hộp thoại, không đổi `failure_exit_code`.
- **Liệt kê mọi chỗ gọi `fatal()`** trong `src/main.ts`, và với mỗi chỗ, ghi xem nó có thể chạy khi `shutdown()` đã bắt đầu hay không. Chỗ nào bị chặn mà làm mất một thông báo họa sĩ cần thấy thì dừng lại và báo Orchestrator, không tự quyết.
- `restore_data` gọi `fatal(..., 'restore_failed', context)` **trước khi** mở cửa sổ, nên lúc đó `shutdown()` chưa bắt đầu. Ca U1–U6 của `restore_undo.spec.ts` và A5 của `restore_apply.spec.ts` phải đạt như cũ.

**Đo trước khi sửa (việc 2).**
- Dựng một ca **tái hiện được ổn định, không cần máy tải**:
  - Fixture có sẵn `tests/fixtures/slow_first_load` giữ mỗi lần nạp trang bận 3 giây.
  - `fake_backend_ready_then_die.py` chết 2 giây sau READY.

  Ghép hai thứ đó lại thì lúc backend chết, lần nạp đầu vẫn chưa xong. Orchestrator **chưa chạy thử** cách ghép này: agent đo xem nó có tái hiện hai dòng `FATAL:` trên mã hiện tại không, ở 5 lượt không tải.
- Được thêm fixture mới trong `tests/fixtures/` nếu cần, ví dụ một backend giả chết sau một khoảng khác, hoặc một trang nạp chậm hơn. **Không thêm cờ `--ct-test-*`, không thêm gì vào mã sản phẩm chỉ để kiểm thử.**
- Ghi số lượt tái hiện trên 5. Nếu dưới 5/5, thử chỉnh khoảng thời gian trong fixture. Nếu vẫn không ổn định, ghi lại kết quả, dùng ca 14 cùng ba lượt có tải làm bằng chứng, và nói rõ trong báo cáo rằng chưa có ca tái hiện ổn định.

  Báo kết quả đo trước dòng code sửa đầu tiên.

**Kiểm thử sau khi sửa:**
- **Ca tái hiện mới** (nếu dựng được) khẳng định:
  - đúng một dòng `FATAL:`, chính là dòng "backend stopped unexpectedly";
  - đúng một dòng `error dialog text`, với câu `running_summary`;
  - có dòng log của lần gọi bị bỏ qua, chứa `ERR_FAILED` hoặc lỗi thật xảy ra;
  - mã thoát `failure_exit_code`.
- **Ca 6 và ca 14** khẳng định thêm: đúng một dòng `error dialog text` (ca 14 hiện chỉ đếm dòng `FATAL:`).
- **Ca đóng bình thường:** mở ứng dụng, đóng cửa sổ; không có dòng `FATAL:`, mã thoát 0. Kiểm lại ca hiện có nào đã phủ việc này; nếu chưa có thì thêm.
- **Phép cắn** (chỉ trên bản sao tạm, khôi phục ngay):
  - (a) bỏ cờ chặn: ca tái hiện hỏng **mỗi lượt** (nếu không có ca tái hiện ổn định thì ghi rõ phép cắn này không bắt được ổn định);
  - (b) đảo điều kiện của cờ, khiến lần gọi **đầu tiên** cũng bị bỏ qua: ca 6, 13, 14 hỏng;
  - (c) cho lần gọi bị bỏ qua vẫn ghi `FATAL:`: ca tái hiện và ca 14 hỏng.

### DSK-29

1. **Thư mục tạm.**
   - Hiện trạng: `tempDataDir()` tạo `ct-desktop-test-*`, `launchMain()` tạo `ct-desktop-log-*`, trong `os.tmpdir()`. Không chỗ nào xóa. Trên máy audit Linux có 414 thư mục `ct-desktop-test-*` sau vài lượt.
   - **Việc:** khi một ca **đạt**, xóa mọi thư mục tạm mà ca đó tạo ra. Khi một ca **hỏng**, giữ lại và in đường dẫn ra, để còn chẩn đoán. Chỉ xóa sau khi ứng dụng của ca đã thoát (trên Windows, tệp đang mở thì không xóa được).
   - Chỉ xóa thư mục mà chính lượt chạy đó tạo ra. Không quét và xóa theo tiền tố, vì như thế có thể xóa thư mục của một lượt khác hay của Project Owner.
   - Cơ chế (fixture của Playwright, `afterEach`, hay cách khác) do agent chọn, ghi lý do.
   - **Đo:** đếm số thư mục `ct-desktop-*` trong `%TEMP%` trước và sau một lượt `npm test` đạt. Sau phải bằng trước.
   - Bản đóng gói (`tests/packaged/`): cũng làm như vậy nếu nó tạo thư mục tạm.
2. **Chú thích đầu `tests/fixtures/tee_stderr.cjs`** còn nói "loaded … with NODE_OPTIONS=--require". Mã thật dùng đối số `-r` (xem `launchMain`). Sửa cho đúng.
3. **`last_updated_by`.**
   - Phiên 38 ghi `coding-agent@2026-10-09#1`, nhưng phiên 37 (giao diện) đã chạy trước trong cùng ngày 2026-10-09 với `#1`. Phiên 38 đúng ra là `#2`.
   - Khối nào phiên này sửa thì ghi định danh mới của phiên này.
   - Khối nào phiên này không sửa mà còn ghi `coding-agent@2026-10-09#1` của phiên 38 (ít nhất `src/workflows/restore_data/services.ts`): sửa thành `coding-agent@2026-10-09#2`, không đổi gì khác.
   - **Đếm số phiên trong ngày cho đúng:** hỏi Project Owner hôm nay đã có phiên coding agent nào chạy chưa.
4. **Chú thích `eslint-disable` ở `tests/helpers.ts`, dòng 20.**
   - `// eslint-disable-next-line @typescript-eslint/no-require-imports` đứng trước `export const ELECTRON_BINARY: string = require('electron')`. Dòng này có từ commit đầu tiên của kho ("Add project files.", 2026-09-28), và chưa bản audit nào nêu ra.
   - Đây là chỗ hở của Orchestrator: các audit trước chỉ tìm `eslint-disable` trong phần mã mới của phiên, không tìm trên toàn bộ mã.
   - **Việc:** lấy đường dẫn tệp chạy Electron mà không cần chú thích đó, không tắt hay nới luật nào, không thêm phụ thuộc. Agent chọn cách và ghi lý do, ví dụ:
     - `import` có kiểu đúng;
     - đọc `path.txt` cạnh `require.resolve('electron')` như chính gói `electron` làm;
     - cách khác.
   - Sau khi sửa, `spawnMain` phải chạy đúng tệp như trước. Các ca dùng `spawnMain` (ca 2, 3, 5, 6, 10, 13, 14…) đạt.
   - **Rà toàn bộ `Desktop/`** (trừ `node_modules`, `dist`, `release`, `packaging`): liệt kê mọi `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`. Cuối phiên danh sách phải rỗng. Nếu thấy chỗ nào không bỏ được, dừng lại và báo, không tự giữ.

### NOTE của Main về ca 14

NOTE cuối của khối checkpoint Main (ghi 2026-10-09, "Cho Orchestrator … ca 14 …") đã được xử lý bằng DSK-28. Chuyển ý còn giá trị thành EXPERIENCES, có id mới, rồi xóa NOTE đó.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 4, 5 và 6;
   - hợp đồng:
     - `api_contract.yaml`: phần `clause_d_desktop` và `error_body`;
     - `data_schema.yaml`: `clause_d_desktop`, chỉ để xác nhận không có gì liên quan tới hộp thoại lỗi;
   - code:
     - `Desktop/src/main.ts`: khối checkpoint, `fatal`, `shutdown`, `BackendProcess`, `startLayer`, `.catch` ở cuối tệp;
     - `Desktop/src/error_dialog.ts`;
     - `Desktop/tests/helpers.ts` và mọi spec;
     - `Desktop/tests/fixtures/`;
   - `.plan/open_issues.md`: DSK-28, DSK-29, BE-8;
   - plan này sau cùng.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron, Python. Ghi trạng thái AVG và ReasonLabs theo lời Project Owner.
   - Trong `Desktop/`:
     - `npm ci`;
     - `npm run lint`;
     - `npm test`: mốc **76**. Ghi số đạt, số hỏng, và tên ca hỏng nếu có.
   - Đếm số thư mục `ct-desktop-*` trong `%TEMP%`. Ghi lại, **không xóa**.
   - Chụp mốc `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`.
   - Ghi `git status --short` (chỉ đọc).

2. **Đo DSK-28 trước khi sửa**, theo đặc tả. Báo kết quả trước dòng code sửa đầu tiên.

3. **DSK-28.** Sửa, thêm kiểm thử, làm ba phép cắn (a), (b), (c).

4. **DSK-29**, bốn mục, theo thứ tự (4), (1), (2), (3). Mục (4) làm trước, vì nó đổi helper mà mọi ca dùng. Đo số thư mục tạm cho mục (1).

5. **Chạy có tải.**
   - Dựng script làm máy tải **ngoài dự án**, như phiên 38: vòng lặp bận trên số lõi trừ một, có giới hạn thời gian. Nếu script của phiên 38 còn trên máy thì dùng lại, ghi đường dẫn.
   - `npm test` đủ **3 lượt liên tiếp, mỗi lượt trong lúc script tải đang chạy**. Ghi số đạt mỗi lượt.
   - Rồi chạy 1 lượt không tải.
   - Ca 14 và ca tái hiện mới phải đạt ở cả 4 lượt.

6. **Bản đóng gói:**
   - xóa `packaging\stage` và `release`;
   - `npm run dist`;
   - `npm run test:packaged`: mốc **11**, phải đạt cả 11.

   Nếu `dist` hỏng EXDEV, đặt `ELECTRON_BUILDER_CACHE` vào một thư mục tạm.

7. **UI:** trong `UI/`, `npm run build` rồi `npm run e2e` một lượt, không đặt `CT_WALKTHROUGH_RUNNER`. Phải đạt 83/83, và `UI/evidence` không đổi.

8. **Checkpoint** theo Giao thức 07:
   - Main: EXPERIENCES cho DSK-28, gồm danh sách chỗ gọi `fatal()` và lý do chọn cờ; EVIDENCE gồm kết quả đo, ba phép cắn, bốn lượt `npm test`; NOTE ca 14 đã xử lý;
   - các khối khác: chỉ sửa khi nội dung đổi, và theo DSK-29 (3).

   **Giờ ghi:** chép **nguyên** giá trị `Get-Date -Format o` lấy ngay trước khi ghi (BE-8). **Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `npm test` một lượt** và ghi điều đó trong báo cáo (bài học audit phiên 36 §5.1).

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-21** (cài đè, chặng G): không làm trong phiên này. Không đổi `version` của `package.json`.
- **DSK-24, DSK-20** (V2), **DSK-9, DSK-11:** không làm.
- **UI-22, UI-21:** việc của layer giao diện; không làm.
- **BE-9, BE-10:** việc của layer backend; không làm.
- **ENV-7:** không chạy `npm audit fix`.
- **Ứng dụng thoát với mã `3221225477`** (DSK-23 đã đóng): nếu gặp lại thì ghi lại, không sửa.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Hộp thoại lỗi là việc trình bày của Main. Hợp đồng không quy định chữ hay số lượng hộp thoại. Không lối vào, nhãn hay mã lỗi nào đổi.
- `apply_pending_restore`: 200 `restore_outcome`; 500 `ERR_RESTORE_FAILED`. Không đổi.
- Main chỉ đọc, ráp nối và quản lý vòng đời. Cờ chặn hộp thoại thứ hai là việc vòng đời, không phải quyết định nghiệp vụ.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không đổi nhãn, mã lỗi, hay hành vi của các lối vào `ipc` hiện có. Không thêm lối vào `ipc` nào. Không thêm cờ `--ct-test-*`. Không thêm mã vào sản phẩm chỉ để phục vụ kiểm thử.
- Không đổi chữ của dòng `FATAL:` đầu tiên, của các câu hộp thoại trong `desktop.json`, hay `failure_exit_code`.
- Không thay `_electron.launch`, không đổi bộ công cụ kiểm thử. Không tăng thời gian chờ sẵn có, không `retries`, không `skip`.
- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Script làm tải nằm ngoài dự án và không đưa vào kho.
- Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus. Không sửa registry, không cài bộ cài.
- Không tắt luật lint, không thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error` hay `@ts-nocheck`. Không viết kiểm thử luôn đạt.
- Việc dọn thư mục tạm chỉ xóa thư mục do chính lượt chạy đó tạo ra.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật. Mọi lần chạy ứng dụng phải kèm `--ct-test-data-dir`.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng. Script làm tải không phải bản ứng dụng, nên được chạy song song với kiểm thử.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **Đo DSK-28:** kết quả đo ở việc 2 có trong báo cáo: tái hiện được bao nhiêu trên 5 lượt, với fixture nào.
2. **DSK-28:**
   - mọi chỗ gọi `fatal()` đã được liệt kê;
   - ca tái hiện, ca 6, ca 14 và ca đóng bình thường khẳng định đúng như đặc tả;
   - U1–U6 và A5 vẫn đạt;
   - ba phép cắn (a), (b), (c) đã làm.
3. **DSK-29:**
   - số thư mục `ct-desktop-*` trong `%TEMP%` sau một lượt đạt bằng số trước lượt đó;
   - chú thích của `tee_stderr.cjs` đã đúng;
   - `last_updated_by` đã đúng;
   - `Desktop/` không còn `eslint-disable`, `@ts-ignore`, `@ts-expect-error` hay `@ts-nocheck`.
4. `npm test` đạt **3 lượt liên tiếp có tải** và 1 lượt không tải, với 76 ca cộng các ca mới.
5. `npm run lint` sạch; `npm run dist` chạy từ trạng thái sạch; `npm run test:packaged` đạt 11/11.
6. UI e2e đạt 83/83 một lượt; `UI/evidence` không đổi.
7. **Checkpoint:** YAML hợp lệ; giờ ghi đúng BE-8; `UNSOLVED_PROBLEMS: []`; NOTE ca 14 đã xử lý.
8. Mốc `%APPDATA%` giống đầu phiên.
9. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo, kèm `git check-ignore -v` cho từng tệp mới.
10. **Báo cáo cuối phiên** theo `CLAUDE.md` mục 5, kèm:
    - kết quả đo;
    - danh sách chỗ gọi `fatal()`, và cờ đã chọn;
    - chữ nguyên văn của dòng log cho lần gọi bị bỏ qua;
    - các phép cắn;
    - số đạt của bốn lượt `npm test`;
    - số thư mục tạm trước và sau;
    - cách đã dùng để bỏ `eslint-disable`;
    - kết quả `dist`, `test:packaged` và UI e2e;
    - các lệnh để chạy lại;
    - danh sách ngoại lệ lint mới (phải rỗng).
