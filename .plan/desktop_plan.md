# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-11T13:10:00+07:00
# contract: data_schema 10.0.1, api_contract 5.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 40 của dự án, phiên desktop thứ mười một, thuộc chặng G. Phiên ngắn, ba việc:

| Mã | Việc | Căn cứ |
|---|---|---|
| **G-VER** | Số phiên bản của ứng dụng thành **`1.0.0`** | `.plan/v1_roadmap.md`, chặng G, tiêu chí 1 (Project Owner quyết 2026-10-11) |
| **DSK-30 (1)** | N7 của `native_dialogs.spec.ts` chờ trang `data:` nạp xong rồi mới `evaluate` | `.plan/open_issues.md`, DSK-30 mục 1 |
| **DSK-30 (2)** | Ca 6 và ca 14 của `desktop_main.spec.ts` không phụ thuộc vào thứ tự thời gian | DSK-30 mục 2 |

Hợp đồng không đổi. Phiên này không cài bộ cài và không làm runbook cài đè (DSK-21): việc đó Project Owner chạy tay sau phiên này, với bộ cài `1.0.0` mà phiên này dựng.

**Điểm dừng:**
- `npm run dist` ra `release\Commission Tracker Setup 1.0.0.exe`, và bản đóng gói báo đúng `1.0.0` cho cả Electron lẫn backend;
- N7, ca 6, ca 14 đạt cả ba lượt có tải;
- `test:packaged` và UI e2e đạt.

## ĐẶC TẢ ĐÃ CHỐT

### G-VER — số phiên bản `1.0.0`

- Sửa trường `version` của `Desktop/package.json` từ `0.1.0` thành `1.0.0`, và hai chỗ tương ứng ở đầu `Desktop/package-lock.json`, sao cho `npm ci` vẫn chạy đúng. Agent chọn cách sửa (tự sửa hai tệp, hoặc `npm version 1.0.0 --no-git-tag-version`; lệnh này không đụng tới git khi có cờ đó) và ghi lý do.
- **Không sửa `UI/package.json`.** Trường đó không đi vào bản đóng gói, và phiên này không sửa `UI/`. Orchestrator sẽ xét lại ở chặng H.
- **Lý do phải đủ ba số:** hợp đồng khai báo `backup_data.app_version` là "semantic version of the running build" (`data_schema.yaml`), và `backup_data` từ chối giá trị không đúng dạng `x.y.z`. Giá trị này đi từ `app.getVersion()` của Main qua biến `CT_APP_VERSION` sang backend.
- **Kiểm thử ràng `package.json` với backend.** Phải có ít nhất một ca, chạy với backend thật, khẳng định `app_version` mà backend nhận được (ví dụ trong bản ghi do `create_backup` trả về) **bằng đúng** trường `version` đọc từ `package.json` lúc chạy kiểm thử, không phải một chuỗi gõ cứng. Nếu đã có ca như vậy thì chỉ ra; nếu chưa thì thêm. Có thể đặt trong `npm test`, trong `test:packaged`, hoặc cả hai. Với bản đóng gói thì nên có, vì đó là thứ họa sĩ cài.
- **Chuỗi `'0.1.0'` trong dữ liệu mẫu của kiểm thử** (`restore_*.spec.ts`, `fake_backend_restore.py`) là dữ liệu giả của tệp sao lưu, không phải phiên bản của ứng dụng. Giữ nguyên, trừ khi một ca hỏng vì nó. Nếu có ca hỏng, ghi rõ ca nào và vì sao, rồi sửa ca đó cho đúng ý nghĩa (ví dụ đọc phiên bản từ `package.json`).
- **Chữ trong checkpoint** nhắc `0.1.0` như hiện trạng (ví dụ dòng 22 của `src/main.ts`: "version của package.json (0.1.0)") thì sửa cho đúng. Các mục EVIDENCE cũ ghi tên bộ cài `0.1.0` là lịch sử, giữ nguyên.

### DSK-30 (1) — N7

- **Lỗi** (audit phiên 39 §5.3): N7 gọi `mainWindow.loadURL('data:…')` rồi `page.evaluate(...)` ngay. Khi máy tải, `evaluate` chạy lúc trang đang chuyển, nên hỏng với "Execution context was destroyed". Orchestrator đo trên Linux: 2/3 lượt có tải.
- **Sửa** theo đúng cách R10 của `restore_data.spec.ts` đã dùng ở phiên 38: chờ chính trang `data:` nạp xong rồi mới `evaluate`. Agent đọc R10 và dùng cùng cách. Không nới thời gian chờ.
- Rà toàn bộ spec của `Desktop/tests/` xem còn chỗ nào điều hướng rồi `evaluate` ngay mà không chờ. Liệt kê trong báo cáo, và sửa cùng cách.

### DSK-30 (2) — ca 6 và ca 14

- **Lỗi:** cả hai ca dùng `fake_backend_ready_then_die.py`, backend giả chết **2 giây sau READY**.
  - Ca 6 khẳng định có dòng `opening the window`, tức giả định cửa sổ mở trước khi backend chết. Máy chậm thì giả định đó sai, dù ứng dụng xử lý đúng.
  - Ca 14 cũng dựa vào cùng khoảng 2 giây đó.
- **Sửa:** thêm một backend giả mới trong `tests/fixtures/`. Nó lắng nghe `http` trên cổng Main truyền qua `CT_PORT` (như `fake_backend_restore.py`), in READY, rồi **thoát với mã 3 ngay khi nhận lời gọi `http` đầu tiên**. Trang `probe` gọi `GET /clients` khi nạp, nên lúc backend chết thì chắc chắn cửa sổ đã mở và trang đã chạy.
  - Không cần trả lời lời gọi đó; chọn cách nào do agent quyết, ghi lý do.
  - Ca 6 và ca 14 dùng backend giả mới. Mọi khẳng định hiện có của hai ca giữ nguyên: đúng một dòng `FATAL:` với "exit code 3", đúng một dòng `error dialog text`, câu `running_summary`, mã thoát.
- **Không đổi K1.** K1 cố ý cần lần nạp trang chưa xong lúc backend chết, nên giữ `fake_backend_ready_then_die.py` + `slow_first_load`. Nếu K1 hỏng khi có tải thì ghi lại nguyên nhân đọc từ log, không sửa trong phiên này.
- **Không xóa `fake_backend_ready_then_die.py`**, vì K1 vẫn dùng nó.

### DSK-30 (3) — ca 14 "did not exit within 60000 ms"

Không sửa gì. Nếu trong phiên có ca nào báo "process did not exit within …", **giữ nguyên log của ca đó** và chép trong báo cáo: hai mươi dòng cuối Main ghi ra, và thời điểm của dòng `FATAL:`. Mục đích: phân biệt máy chậm với một lần treo thật lúc thoát.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 4, 5 và 6;
   - hợp đồng: `data_schema.yaml`, phần `backup_data` (`app_version`) và `clause_d_desktop`; `api_contract.yaml`, phần `create_backup`;
   - code:
     - `Desktop/package.json`, `Desktop/package-lock.json` (đầu tệp), `Desktop/electron-builder.yml`;
     - `Desktop/src/main.ts`: khối checkpoint, chỗ truyền `CT_APP_VERSION`;
     - `Desktop/tests/helpers.ts`, `desktop_main.spec.ts`, `native_dialogs.spec.ts` (N7), `restore_data.spec.ts` (R10), `tests/packaged/`;
     - `Desktop/tests/fixtures/`: `fake_backend_ready_then_die.py`, `fake_backend_restore.py`, `probe/`;
   - `.plan/open_issues.md`: DSK-30, DSK-21, BE-8;
   - plan này sau cùng.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron, Python. Ghi trạng thái AVG và ReasonLabs theo lời Project Owner.
   - **Hỏi Project Owner** đã chép bộ cài `release\Commission Tracker Setup 0.1.0.exe` ra ngoài `Desktop\` chưa (việc 5 sẽ xóa `release`). Chưa chép thì chờ Project Owner chép xong rồi mới đi tiếp. Agent không tự chép ra ngoài dự án.
   - Trong `Desktop/`:
     - `npm ci`;
     - `npm run lint`;
     - `npm test`: mốc **78**. Ghi số đạt, số hỏng, và tên ca hỏng nếu có.
   - Chụp mốc `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`.
   - Ghi `git status --short` (chỉ đọc).

2. **G-VER.** Đổi phiên bản; thêm hoặc chỉ ra ca ràng `package.json` với backend; chạy `npm ci` lại để chắc `package-lock.json` đúng.

3. **DSK-30 (1) và (2).** Sửa và thêm backend giả mới.
   - **Phép cắn** (chỉ trên bản sao tạm, khôi phục ngay):
     - (a) backend giả mới thoát **ngay sau READY**, không chờ lời gọi: ca 6 phải hỏng (mất `opening the window`, hoặc lời gọi của trang);
     - (b) ca ràng phiên bản: trong bản sao, Main truyền `CT_APP_VERSION` là một chuỗi gõ cứng `0.1.0` thay cho `app.getVersion()`: ca đó phải hỏng;
     - (c) N7: bỏ bước chờ trang `data:`, chạy N7 5 lượt trong lúc máy tải. Ghi số lượt hỏng. Không bắt được ổn định thì ghi rõ.

4. **Chạy có tải.**
   - Script làm tải ngoài dự án, như phiên 39, với **4 tiến trình** vòng lặp bận. Dùng lại script cũ nếu còn, ghi đường dẫn.
   - `npm test` **3 lượt liên tiếp có tải**, rồi 1 lượt không tải.
   - **N7, ca 6, ca 14, K1, C1 phải đạt cả 4 lượt.**
   - Ca khác hỏng khi có tải thì ghi tên ca, lỗi, và log theo DSK-30 (3). Ca 15, 16 của `show_inactive` đo tiêu điểm cửa sổ: hỏng khi Project Owner đang chuyển cửa sổ thì ghi lại, không tính là lỗi của phiên.
   - Lượt không tải phải đạt **toàn bộ**.

5. **Bản đóng gói:**
   - xóa `packaging\stage` và `release` (sau khi Project Owner đã chép bộ cài `0.1.0` ra ngoài, việc 1);
   - `npm run dist`: phải ra `release\Commission Tracker Setup 1.0.0.exe`;
   - `npm run test:packaged`: mốc **11**, cộng ca mới nếu có; phải đạt toàn bộ;
   - ghi kích thước và SHA-256 của bộ cài `1.0.0`. Runbook của chặng G dùng giá trị này để biết đúng tệp.

   Nếu `dist` hỏng EXDEV, đặt `ELECTRON_BUILDER_CACHE` vào một thư mục tạm.

6. **UI:** trong `UI/`, `npm run build` rồi `npm run e2e` một lượt, không đặt `CT_WALKTHROUGH_RUNNER`. Phải đạt 83/83, và `UI/evidence` không đổi.

7. **Checkpoint** theo Giao thức 07:
   - Main: EXPERIENCES cho G-VER (chỗ phiên bản đi từ `package.json` tới backend, ca ràng phiên bản) và DSK-30 (1), (2) (backend giả mới, N7); EVIDENCE gồm các phép cắn, bốn lượt `npm test`, kích thước và SHA-256 bộ cài;
   - sửa các câu hiện trạng còn nói `0.1.0`.

   **Giờ ghi:** chép **nguyên** giá trị `Get-Date -Format o` lấy ngay trước khi ghi (BE-8). **Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `npm test` một lượt** và ghi điều đó trong báo cáo.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-30 mục 4, 5:** không làm (chặng H).
- **DSK-21** (cài đè): không làm; Project Owner chạy runbook sau phiên này. Không đụng `electron-builder.yml` trừ khi việc đổi phiên bản đòi hỏi, và nếu có thì ghi lý do.
- **BE-9, BE-10, BE-11:** việc của layer backend; không làm.
- **UI-21, UI-22:** việc của layer giao diện; không làm.
- **DSK-24, DSK-20** (V2), **DSK-9, DSK-11:** không làm.
- **ENV-7:** không chạy `npm audit fix`.
- Ứng dụng thoát với mã `3221225477`: nếu gặp lại thì ghi lại, không sửa.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `backup_data.app_version`: "semantic version of the running build, handed over at launch", `from: environment_config`. Main là bên trao giá trị này lúc khởi động backend.
- `create_backup` trả `backup_archive_record` có `app_version`. Không lối vào, nhãn hay mã lỗi nào đổi.
- Main chỉ đọc, ráp nối và quản lý vòng đời. Số phiên bản là giá trị cấu hình (`package.json`), không gõ thẳng vào code.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không đổi nhãn, mã lỗi hay hành vi của lối vào nào. Không thêm lối vào `ipc`, không thêm cờ `--ct-test-*`, không thêm mã vào sản phẩm chỉ để phục vụ kiểm thử.
- Không sửa `src/main.ts` ngoài phần checkpoint, trừ khi việc đổi phiên bản đòi hỏi; nếu có thì ghi lý do.
- Không thay `_electron.launch`, không đổi bộ công cụ kiểm thử. Không tăng thời gian chờ sẵn có, không `retries`, không `skip`.
- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Script làm tải nằm ngoài dự án và không đưa vào kho.
- Không xóa `release\` trước khi Project Owner xác nhận đã chép bộ cài `0.1.0` ra ngoài.
- Không cài bộ cài, không gỡ bản đã cài, không sửa registry.
- Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus.
- Không tắt luật lint, không thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error` hay `@ts-nocheck`. Không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash`, `tag` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật. Mọi lần chạy ứng dụng phải kèm `--ct-test-data-dir`.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng. Script làm tải không phải bản ứng dụng, nên được chạy song song với kiểm thử.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **G-VER:**
   - `package.json` và `package-lock.json` ghi `1.0.0`; `npm ci` chạy đúng;
   - có ít nhất một ca chạy với backend thật khẳng định `app_version` bằng `version` đọc từ `package.json`;
   - phép cắn (b) bắt được;
   - bộ cài tên `Commission Tracker Setup 1.0.0.exe`, có kích thước và SHA-256 trong báo cáo.
2. **DSK-30 (1):** N7 chờ trang `data:` như R10; danh sách các chỗ "điều hướng rồi `evaluate`" khác, kèm cách xử lý; phép cắn (c) đã làm.
3. **DSK-30 (2):** backend giả mới; ca 6 và ca 14 dùng nó với khẳng định giữ nguyên; K1 không đổi; phép cắn (a) bắt được.
4. **`npm test`:** 3 lượt liên tiếp có tải (4 tiến trình) và 1 lượt không tải. N7, ca 6, ca 14, K1, C1 đạt cả 4 lượt. Lượt không tải đạt toàn bộ.
5. `npm run lint` sạch; `npm run dist` chạy từ trạng thái sạch; `npm run test:packaged` đạt toàn bộ.
6. UI e2e đạt 83/83 một lượt; `UI/evidence` không đổi.
7. **Checkpoint:** YAML hợp lệ; giờ ghi đúng BE-8; `UNSOLVED_PROBLEMS: []`.
8. Mốc `%APPDATA%` giống đầu phiên.
9. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo, kèm `git check-ignore -v` cho từng tệp mới (`core.ignorecase=true`).
10. **Báo cáo cuối phiên** theo `CLAUDE.md` mục 5, kèm:
    - cách đổi phiên bản và ca ràng phiên bản;
    - danh sách ca từng hỏng vì chuỗi `0.1.0`, nếu có;
    - các chỗ "điều hướng rồi `evaluate`" đã rà;
    - các phép cắn;
    - số đạt của bốn lượt `npm test`, tên và nguyên nhân mọi ca hỏng;
    - log theo DSK-30 (3), nếu có;
    - kích thước và SHA-256 bộ cài `1.0.0`; kết quả `test:packaged` và UI e2e;
    - các lệnh để chạy lại;
    - danh sách ngoại lệ lint mới (phải rỗng).
