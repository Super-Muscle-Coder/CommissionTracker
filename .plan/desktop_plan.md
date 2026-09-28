# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-27T20:30:00+07:00
# contract: data_schema 6.1.0, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 14 của dự án, phiên desktop thứ ba: **phiên vá và chẩn đoán sau chặng C.** Phiên xử lý các mục DSK-1 tới DSK-8 trong `.plan/open_issues.md`. Không có tính năng mới.

Điểm dừng:

1. **Vá xong, có bằng chứng**, những mục đã rõ nguyên nhân:
   - DSK-1: cây tiến trình trong kiểm thử;
   - DSK-4: tệp thừa trong gói;
   - DSK-5: kiểm điều kiện build ngay từ đầu;
   - DSK-6: số liệu và NOTE trong checkpoint;
   - DSK-7: `author`.
2. **Chẩn đoán có kết luận**, dựa trên log tái lập được, cho DSK-2 (FATAL bí ẩn) và DSK-3 (lần mở đầu chờ khoảng 33 s).
   - Chỉ sửa Main nếu nguyên nhân nằm trong Main.
   - Nếu nguyên nhân nằm ngoài ứng dụng, ghi lại đầy đủ và **dừng ở đó**.
   - Một trường hợp đặc biệt phải **dừng và báo ngay** (việc 7).
3. `npm test`, `npm run dist` và `npm run test:packaged` (**6/6**) đều đạt trên máy Project Owner, **khi antivirus đang bật**.

## BỐI CẢNH ĐÃ BIẾT — đọc kỹ trước khi làm, để khỏi mò lại

Nguồn:
- `.reviews/` không phải của bạn. Mọi thông tin cần thiết đã chép vào đây và vào `.plan/open_issues.md`.
- Log mà Project Owner chạy ngày 2026-09-27, 19:57–20:02.

**Máy build (Windows 11, 10.0.26200):**
- Có hai phần mềm diệt virus chạy thời gian thực: **AVG** và **ReasonLabs** (tiến trình `rsAppUI.exe`). Microsoft Defender đang tắt.
- Project Owner đã thêm ngoại lệ **theo thư mục** cho `Desktop\release` và `Desktop\packaging\stage` trong **cả AVG lẫn ReasonLabs (RAV)**, ngày 2026-09-27. Không có ngoại lệ nào khác (theo tiến trình hay phần mở rộng).
- Các ngoại lệ này **chưa được chứng minh là có tác dụng**; phiên này kiểm (việc 8).
- Hệ quả cho việc đo:
  - đợt A và B (exe trong `release`) đo **khi có ngoại lệ**;
  - đợt C (bản đã cài ở thư mục tạm) đo **khi không có ngoại lệ**, giống máy người dùng thật.

  So A với C là cách chính để tách yếu tố antivirus.
- `PATH` đã có `C:\Windows\System32\WindowsPowerShell\v1.0` (Project Owner vừa thêm). Phiên 13 gặp `spawn powershell.exe ENOENT` chính vì thiếu mục này. Nhận định "máy bình thường không gặp" trong NOTE (5) của checkpoint là **sai**.

**Các lần `npm run dist` hỏng ngày 2026-09-27, và nguyên nhân đã xác định:**

| Lỗi | Nguyên nhân |
|---|---|
| `EBUSY` khi xóa `release\win-unpacked\resources\app.asar` | Ứng dụng Claude của Project Owner giữ tệp mở. Đã hết |
| `EPERM` khi đổi tên `release\win-unpacked.tmp` thành `win-unpacked` | AVG: tắt AVG thì lỗi biến mất |
| `spawn powershell.exe ENOENT` | `PATH` thiếu PowerShell |

**DSK-1 — P4 hỏng, nguyên nhân đã rõ:**
- `tests/helpers.ts`, `processTree()` duyệt cây chỉ theo `ParentProcessId`.
- Trong lượt P4, "cây backend" có thêm bốn tiến trình `rsAppUI.exe` với `ParentProcessId` = PID của `python.exe` backend. Windows tái sử dụng PID, và không cập nhật `ParentProcessId` khi tiến trình cha chết.
- Backend và Electron trong lượt đó đều thoát mã 0 bình thường.

**DSK-2 — bằng chứng đã có, và giả thuyết mạnh nhất.**

Trong lượt 1 của `node tests/packaged/measure_startup.cjs 3`, chạy ngay sau một build mới, console hiện một khối log của Main:
- `running the packaged app` → backend `READY` → `first load finished`;
- rồi khoảng 23 s sau, `backend (pid …) exited with code 0` → `FATAL: The backend stopped unexpectedly (exit code 0)` → `exiting with code 1`.

Những điểm đáng chú ý:

1. `measure_startup.cjs` **không in** stderr của tiến trình nó chạy (stdio `['ignore','ignore','pipe']`, và không in lại). Vậy khối log này nhiều khả năng **không phải** của tiến trình mà script chạy.
2. JSON của lượt 1 ghi `exit_code: 0`, `window_loaded_ms: 36589`, trái với `exiting with code 1` trong khối log.
3. Khi dừng đúng cách, backend **luôn** ghi `standard input closed; stopping` (luồng theo dõi stdin trong `Backend.py`) hoặc uvicorn ghi `Shutting down`, rồi mới thoát. Trong khối log này, backend thoát mã 0 mà **không có dòng nào**. Vậy nó bị kết thúc từ bên ngoài, với mã thoát 0, chứ không phải tự dừng.
4. Cùng khoảng thời gian đó, Chromium báo `Failed to open persistent cache files … GPUPersistentCache … being used by another process`, **trong đúng thư mục dữ liệu tạm của lượt đó** (`ct-startup-msOkS1\electron-user-data`). Tức là có hai tiến trình dùng chung một thư mục `userData`.
5. Lượt 1 có thêm `Failed to find real location of …\python.exe`. Dòng này do Python in ra khi không phân giải được đường dẫn thật của chính nó, và hay gặp khi có một driver lọc tệp hay một môi trường ảo hóa chen vào.

**Giả thuyết H1 (mạnh nhất):** phần mềm diệt virus (AVG hoặc ReasonLabs) đã **tự chạy một bản sao** của `Commission Tracker.exe`, với **cùng dòng lệnh**, để phân tích hành vi của một tệp exe lạ chưa ký. Rồi nó kết thúc bản sao đó (hoặc backend của bản sao) với mã 0.

H1 giải thích được cùng lúc bốn điều:
- khối log hiện lên console, vì bản sao không nhận pipe của script;
- mã thoát bị mâu thuẫn, vì script đo tiến trình của chính nó, và tiến trình đó thoát mã 0;
- cache bị dùng chung, vì cùng thư mục dữ liệu;
- độ trễ khoảng 33 s ở lần mở đầu của mọi exe mới (DSK-3), vì bản thật bị giữ lại trong lúc bản sao được phân tích.

**Các giả thuyết khác phải loại trừ bằng dữ liệu:**
- **H2:** WM_CLOSE (`taskkill` không kèm `/F`) không đóng được cửa sổ ở lượt đầu, và có thứ khác làm backend chết.
- **H3:** chính script đo tự khởi động hai lần.
- **H4:** lỗi trong Main.

**Vì sao H1 quan trọng hơn một lỗi kiểm thử.** Ở máy người dùng thật không có cờ `--ct-test-data-dir`. Nếu antivirus chạy một bản sao của ứng dụng, và bản sao đó không bị khóa một-bản chặn lại (khóa tính theo `userData`; một môi trường ảo hóa có thể tách khóa ra), thì **hai backend sẽ cùng mở một `%APPDATA%\CommissionTracker\data.db`**. Đây là rủi ro toàn vẹn dữ liệu.

Phiên này **chỉ đo và báo**. Việc chống hai backend cùng ghi một cơ sở dữ liệu, nếu cần, thuộc layer backend và có thể phải sửa hợp đồng: Orchestrator và Project Owner quyết.

**DSK-3 — dữ liệu hiện có:**
- AVG đang bật: lượt đầu của exe mới mất khoảng 36 s trước khi Main khởi động backend; các lượt sau 1,3–1,6 s.
- AVG tắt, ReasonLabs vẫn bật: lượt đầu **vẫn 33,1 s**.
- Ở cả hai trường hợp, phần chậm nằm trước dòng `backend started`. Chưa biết nó nằm trước hay sau khi code JavaScript của Main bắt đầu chạy, vì `measure_startup` không bấm giờ dòng log đầu tiên.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 4 (cây `Desktop/`), mục 5 (công nghệ Desktop và đóng gói), mục 6;
   - **`.plan/open_issues.md`: toàn bộ phần desktop**;
   - **toàn bộ** khối checkpoint ở đầu `Desktop/src/main.ts`, đặc biệt EXP-005, 007, 008, 010, 011, 013, 014, 015 và NOTE (5);
   - `Desktop/tests/helpers.ts`, `tests/packaged/packaged_app.spec.ts`, `tests/packaged/measure_startup.cjs`, `packaging/prepare_runtime.mjs`;
   - trong `Backend/Backend.py`: chỉ đọc hàm `_stop_when_stdin_closes` và phần xử lý SIGINT, để biết backend ghi gì khi tự dừng;
   - plan này sau cùng.

   Xác nhận Data Schema `6.1.0`, API Contract `4.0.0`, cả hai `approved`.

1. **Môi trường và mốc dữ liệu.**
   - Ghi phiên bản `node`, `npm`, Python (`Backend\env\Scripts\python.exe`) và electron-builder.
   - Ghi danh sách antivirus mà Windows biết: `Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object displayName, productState`.
   - Kiểm `where.exe powershell` có kết quả.
   - Chụp mốc `%APPDATA%\CommissionTracker`, và thêm `%APPDATA%\Commission Tracker`, thư mục `userData` theo `productName`: tệp, kích thước, thời điểm sửa đổi, SHA-256; hoặc "chưa tồn tại".
   - **Không tắt, không đổi cấu hình của phần mềm diệt virus nào.** Nếu cần một phép đo khi antivirus tắt, ghi rõ và để Project Owner làm (việc 7).

2. **DSK-1: sửa cách dựng cây tiến trình.** Làm việc này trước, để mọi phép đo sau dùng công cụ đúng.
   - Tách phần dựng cây thành một hàm thuần, ví dụ `buildTree(rows, rootPid)`, nhận danh sách dòng gồm `ProcessId`, `ParentProcessId` và **`CreationDate`**. Chỉ nhận một tiến trình làm con khi `CreationDate` của nó **không sớm hơn** `CreationDate` của cha.
   - `processTable()` lấy thêm `CreationDate`. Chú ý: `ConvertTo-Json` của `Get-CimInstance` trả ngày giờ dưới dạng đặc biệt. Chọn cách lấy ra một giá trị so sánh được, ví dụ `@{n='Created';e={$_.CreationDate.ToFileTimeUtc()}}`, rồi ghi lại cách đã chọn.
   - Viết một ca kiểm thử của riêng `buildTree` với dữ liệu giả có PID tái sử dụng: tiến trình lạ có `ParentProcessId` = PID của backend nhưng được tạo **trước** backend.
     - Ca này **hỏng** trên logic cũ và **đạt** trên logic mới. Ghi cả hai kết quả.
     - Ca này không cần Electron, và chạy trong `npm test`.
   - Mọi nơi đang dùng `processTree` (`desktop_main.spec.ts`, `packaged_app.spec.ts`, kể cả `stillAlive(whole)` ở P5) đều đi qua hàm mới.

3. **DSK-5: kiểm điều kiện build ngay từ đầu, trong `packaging/prepare_runtime.mjs`**, trước mọi bước khác:
   - `powershell.exe` phải có trong `PATH`, vì electron-builder cần nó. Nếu thiếu, dừng với thông báo nói đúng thư mục cần thêm vào `PATH`.
   - **Xóa `release/`** ở đầu, thay vì để electron-builder tự dọn giữa chừng. Nếu không xóa được (EBUSY, EPERM), dừng với thông báo:
     - nêu tệp nào bị giữ;
     - gợi ý tìm tiến trình giữ tệp bằng `resmon`;
     - gợi ý đặt ngoại lệ cho thư mục đó trong antivirus.
   - Có thể thử lại vài lần, cách nhau vài giây, rồi mới dừng. Ghi số lần thử.
   - Không tắt antivirus, không xử lý gì thay người dùng.

4. **DSK-4: xóa `Lib\site-packages\bin`** trong `prepare_runtime.mjs`, sau bước `pip install`. Thư mục này chứa các tệp exe của console script (`pytest.exe`, `uvicorn.exe`…) trỏ về interpreter của môi trường ảo, vô dụng trong gói.
   - Kiểm lại: bản đóng gói không còn thư mục `bin`, và log electron-builder không còn dòng `signing … site-packages\bin\…`.

5. **DSK-7:** thêm `"author": "TGN"` vào `Desktop/package.json`.
   - Kiểm lại: electron-builder không còn cảnh báo `author is missed`, và sau khi cài, mục gỡ cài đặt có Publisher = `TGN` (việc 9).

6. **Công cụ chẩn đoán cho DSK-2 và DSK-3.** Dựng xong và kiểm công cụ trước khi đo.

   a. **Log của Main**, trong `src/main.ts`, chỉ thêm dòng log, không đổi hành vi:
      - một dòng ngay đầu `main()`: PID, PID cha, `process.argv` và thời điểm tiến trình bắt đầu. Dòng này là mốc "code JavaScript của Main đã chạy" cho DSK-3;
      - một dòng khi xảy ra mỗi sự kiện vòng đời: `window-all-closed`, `before-quit`, `second-instance`, nhận SIGINT hay SIGTERM, không lấy được khóa một-bản;
      - dòng `backend … exited` ghi cả tín hiệu, nếu có.

      Giữ nguyên tiền tố `[desktop-main] ` và mọi dòng log hiện có, để kiểm thử cũ không phải sửa. Nếu buộc phải sửa kiểm thử, ghi lý do.

   b. **`tests/packaged/measure_startup.cjs`:**
      - nhận thêm tham số đường dẫn exe, mặc định là `release/win-unpacked`, để đo được cả bản đã cài (việc 7C);
      - mỗi lượt ghi **toàn bộ** stderr vào tệp riêng, ví dụ `test-results/startup/<nhãn>-run<N>.log`, mỗi dòng có tiền tố số mili giây kể từ lúc spawn;
      - ghi PID của tiến trình đã spawn và thời điểm gửi lệnh đóng;
      - trong suốt lượt chạy, cứ 500 ms chụp bảng tiến trình của **mọi** tiến trình có `ExecutablePath` nằm trong thư mục của exe đang đo, gồm `ProcessId`, `ParentProcessId`, tên tiến trình cha, `CreationDate` và `CommandLine`. Ghi vào cùng tệp;
      - thêm vào kết quả JSON: `first_log_ms` (dòng log đầu tiên của Main), `main_pid`, `extra_main_instances` (số tiến trình `Commission Tracker.exe` chính **không phải** con của script đo mà có cùng `--ct-test-data-dir`), và đường dẫn tệp log.

   c. Chạy thử công cụ một lượt trên build hiện có, để chắc nó ghi đúng. Chưa kết luận gì ở bước này.

7. **Tái lập và chẩn đoán DSK-2 và DSK-3.** Mỗi đợt ghi rõ: build nào (hash của exe), đường dẫn nào, trạng thái antivirus theo lời Project Owner, và kết quả.

   - **A. Exe mới, trong thư mục có ngoại lệ AVG.**
     - `npm run dist`, để có exe mới vì `app.asar` đổi hash.
     - Ngay sau đó chạy `measure_startup 3` với nhãn `A`.
     - Lặp lại toàn bộ đợt A một lần nữa: sửa nhẹ một dòng log để build ra hash mới, hoặc dùng cách khác mà bạn thấy chắc hơn, và ghi lại.
   - **B. Cùng một build, 10 lượt liên tiếp** (`measure_startup 10`, nhãn `B`).
   - **C. Bản đã cài, ở vị trí không có ngoại lệ antivirus**, giống máy người dùng thật.
     - Cài im lặng vào một thư mục tạm (`/S /D=…`).
     - Chạy `measure_startup 3 <exe đã cài>`, nhãn `C`.
     - Gỡ cài đặt im lặng.
     - Chụp lại mốc `%APPDATA%`.

   **Với mỗi đợt, lập bảng từ log và ảnh chụp tiến trình:**
   - `first_log_ms`, `backend_started_ms`, `ready_ms`, `window_loaded_ms`;
   - có hay không bản `Commission Tracker.exe` thứ hai. Nếu có: tiến trình cha của nó là gì, `CommandLine` có trùng không;
   - có hay không backend thoát mã 0 mà không có dòng `standard input closed` hay `Shutting down`.

   **Kết luận theo dữ liệu:**

   | Dữ liệu cho thấy | Kết luận | Làm gì |
   |---|---|---|
   | Có bản Main thứ hai, cha không phải script đo, cùng dòng lệnh | **H1 đúng** | Ghi bằng chứng vào EVIDENCE, **dừng và báo** (xem bên dưới). Không sửa Main |
   | `first_log_ms` khoảng 33 s | Phần chậm nằm **trước** code JavaScript của Main: hệ điều hành hoặc antivirus giữ exe | Ghi lại; không sửa được trong code |
   | `first_log_ms` nhỏ, nhưng `backend_started_ms` khoảng 33 s | Phần chậm nằm **trong** Main | Khoanh vùng bằng log ở việc 6a, rồi báo lại trước khi sửa |
   | Không tái lập được sau A, B, C | — | Ghi đủ những gì đã chạy; DSK-2 giữ mở với dữ liệu mới |
   | Lỗi nằm trong Main (H4) | — | Viết một ca kiểm thử tái lập lỗi (hỏng trước khi sửa), rồi sửa, rồi đạt |

   **Điểm dừng bắt buộc:** nếu thấy **hai bản Main, hoặc hai backend, cùng chạy với cùng thư mục dữ liệu**, thì:
   - ghi đầy đủ bằng chứng;
   - dừng phần DSK-2 tại đó;
   - nêu rõ trong báo cáo cuối phiên, ở mục đầu tiên.

   Không tự thêm khóa tệp cơ sở dữ liệu, không sửa `Backend/`: đó là thay đổi ở layer backend, và có thể phải sửa hợp đồng.

   **Phép đo cần Project Owner** (ghi vào báo cáo; không tự làm): một đợt C khi **tạm dừng cả AVG lẫn ReasonLabs**, chỉ cần nếu so A với C chưa đủ để kết luận. Viết sẵn lệnh để Project Owner chạy.

8. **Kiểm ngoại lệ AVG** (ENV-2 trong `.plan/open_issues.md`): mọi lần `npm run dist` trong phiên đều chạy khi AVG bật.
   - Ghi mọi lần hỏng: bước nào, thông điệp lỗi, lần thử thứ mấy.
   - Nếu `EPERM` hay `EBUSY` còn xuất hiện dù đã có ngoại lệ, ghi lại, và dùng thông báo mới của việc 3 để chỉ ra tệp bị giữ.

9. **Chạy toàn bộ trên build cuối:**
   - `npm run lint`;
   - `npm test`, gồm ca mới của `buildTree`;
   - `npm run dist`, từ trạng thái đã xóa `packaging/stage` và `release`;
   - `npm run test:packaged`: **6/6, khi AVG và ReasonLabs đều đang bật**;
   - trong `UI/`: `npm run e2e`, vì Main có thêm dòng log. Được chạy, không sửa `UI/`;
   - cài và gỡ im lặng một lần: Publisher = `TGN`; thư mục cài bị xóa sau khi gỡ;
   - chụp lại mốc `%APPDATA%` như ở việc 1. Các lần chụp phải giống nhau.

10. **Checkpoint của Main** (Giao thức 07, `Desktop/src/main.ts`):
    - **DSK-6:**
      - sửa số byte của bộ cài trong EVIDENCE dung lượng cho khớp build cuối;
      - cập nhật `main-EXP-015` bằng dữ liệu mới;
      - thêm vào `main-EXP-005`, hoặc một mục mới: `ParentProcessId` không đáng tin khi PID bị tái sử dụng, cùng cách `buildTree` xử lý.
    - Sửa NOTE (5): bỏ câu "máy bình thường không gặp". Thêm EXPERIENCES về **điều kiện build**:
      - `PATH` có PowerShell;
      - ngoại lệ antivirus cho `release` và `packaging\stage`;
      - không để chương trình nào giữ tệp trong `release`;
      - thông báo mới của `prepare_runtime`.
    - EXPERIENCES cho kết quả chẩn đoán DSK-2 và DSK-3, dù kết luận là gì.
    - EVIDENCE cho mỗi mục đã vá, kèm lệnh chạy lại được.
    - `UNSOLVED_PROBLEMS`: nếu DSK-2 hay DSK-3 chưa có kết luận, ghi thành mục ở đây, kèm `next_suggested`. Không để trống cho có.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- Mọi mục DSK-* ở `.plan/open_issues.md`. Riêng DSK-8 (lỗi sandbox mạng của Chromium với thư mục dữ liệu trong `%TEMP%`) **chỉ quan sát**: ghi số lần xuất hiện trong log của việc 7. Không sửa.
- DSK-9 (Q4, Q-C2, biểu tượng, ký số): **không làm.**

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `shared_values.db_file_path` là `%APPDATA%/CommissionTracker/data.db`. Mọi lần chạy ứng dụng trong phiên, kể cả bản đã cài, đều kèm `--ct-test-data-dir` trỏ vào thư mục tạm. Không lần nào được ghi vào `%APPDATA%` thật.
- Backend dừng bằng việc đóng stdin. Không đổi cách dừng. Không đổi thứ tự khởi động (`main-EXP-007`).
- Preload và bridge không đổi. Không thêm mục `ipc` nào.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- **Không tắt, gỡ, hay đổi cấu hình của phần mềm diệt virus nào**, kể cả tạm thời. Phép đo nào cần tắt antivirus thì để Project Owner làm.
- Không "vá" DSK-2 hay DSK-3 bằng cách đoán:
  - không tăng `ready_timeout_ms`;
  - không thêm màn hình chờ;
  - không thêm thử lại khi backend chết;
  - không bỏ qua FATAL.

  Chỉ sửa khi dữ liệu chỉ ra nguyên nhân nằm trong Main.
- Không thêm khóa cơ sở dữ liệu, không sửa `Backend/`, kể cả khi H1 được xác nhận (việc 7, điểm dừng bắt buộc).
- Không tắt luật lint, không viết kiểm thử luôn đạt, không chạy lại kiểm thử hỏng cho tới khi may mắn đạt.
- Không ký số, không thêm biểu tượng, không auto-update.
- ⚠ Ràng buộc V1: không màn hình hồ sơ quyền sở hữu (`/watermark-profiles`). Phiên này không làm giao diện.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **DSK-1:** ca kiểm thử `buildTree` hỏng trên logic cũ, đạt trên logic mới. `npm test` đạt đủ. `npm run test:packaged` đạt **6/6**.
2. **DSK-4, DSK-5, DSK-7:** mỗi mục có bằng chứng theo đúng dòng "Kiểm lại" của nó. DSK-5 có một lần chạy chứng minh thông báo lỗi mới hiện đúng, ví dụ chạy với `PATH` đã bỏ PowerShell, trong một tiến trình con.
3. **DSK-2 và DSK-3:** có bảng số liệu của đợt A, B, C, cùng một trong ba kết cục:
   - đã xác định nguyên nhân;
   - H1 được xác nhận, và phiên dừng theo điểm dừng bắt buộc;
   - chưa tái lập được, kèm ghi chép đầy đủ.

   Cả ba kết cục đều là hoàn tất phiên, miễn là có dữ liệu.
4. `npm run lint`, `npm run dist` (một lệnh, từ trạng thái sạch), `UI` `npm run e2e` đều đạt.
5. Mọi lần chụp mốc `%APPDATA%` giống nhau.
6. Checkpoint của Main cập nhật theo việc 10. YAML hợp lệ.
7. Báo cáo cuối phiên có:
   - bảng DSK-1 tới DSK-8: trạng thái và bằng chứng;
   - kết luận DSK-2 và DSK-3;
   - lệnh để Project Owner đo khi đã tạm dừng cả hai antivirus.
