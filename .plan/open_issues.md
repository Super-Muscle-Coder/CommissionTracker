# SỔ TỒN ĐỌNG — COMMISSION TRACKER

*Orchestrator, 2026-09-27, sau audit phiên 13 và lần Project Owner chạy lại trên Windows. Tài liệu bền, do Orchestrator giữ: mỗi mục đóng lại thì ghi ngày và phiên đã đóng, không xóa. Plan của phiên xử lý sẽ trích từ đây. Nguồn chi tiết: `.reviews/audits/desktop/audit_desktop_session13.md` và các bản audit trước.*

Mức độ:
- **chặn:** làm hỏng kiểm thử hoặc làm hỏng việc chạy thật;
- **cao:** hành vi sai hoặc chưa giải thích được;
- **trung bình:** chất lượng hoặc bằng chứng;
- **thấp:** dọn dẹp.

## Layer desktop — phiên 14 (phiên vá)

### DSK-1 — P4 hỏng vì cây tiến trình nhận nhầm tiến trình lạ (chặn)

> **ĐÓNG 2026-09-27, phiên 14. `buildTree` so `CreationDate`; đối chứng: logic cũ hỏng 3/3, mới đạt 3/3, Orchestrator đã làm lại; `test:packaged` 6/6 khi antivirus bật.**

- **Hiện tượng:** Project Owner chạy lại `npm run test:packaged` ngày 2026-09-27 và được 5 đạt, 1 hỏng. P4 hỏng ở `stillAlive(tree)`, vì "cây backend" có thêm bốn tiến trình `rsAppUI.exe` của ReasonLabs với `ParentProcessId` = PID của `python.exe` backend. Backend vẫn thoát mã 0 như bình thường, và `afterAll` vẫn báo không còn Python nào của gói.
- **Nguyên nhân** (đọc từ code): `tests/helpers.ts`, `processTree()` dựng cây chỉ dựa vào `ParentProcessId`. Windows không cập nhật `ParentProcessId` khi tiến trình cha chết, và số PID được tái sử dụng. Ở đây, `rsAppUI.exe` đã được một tiến trình cũ, trùng PID, khởi động từ trước, rồi tiến trình cũ chết và `python.exe` được cấp lại đúng PID đó. Đây là lỗi của **kiểm thử**, không phải của sản phẩm.
- **Hướng sửa:** khi dựng cây, chỉ nhận tiến trình con có `CreationDate` không sớm hơn `CreationDate` của cha (`Win32_Process.CreationDate`). Áp dụng cho mọi nơi dùng `processTree`: `npm test` và `test:packaged`.
- **Tiêu chí đóng:**
  - có một ca kiểm thử của chính `processTree`, với dữ liệu giả có PID tái sử dụng: hỏng trên code cũ, đạt trên code mới;
  - `test:packaged` đạt 6/6 trên máy Project Owner khi ReasonLabs vẫn chạy.

### DSK-2 — Một lần chạy bản đóng gói kết thúc bằng FATAL chưa giải thích được (cao)

> **ĐÃ ĐÓNG 2026-09-28 (ENV-5).** Lần đo lại không thấy bản sao nào trong vùng quan sát được. Ở lần mở đầu, bản thật giành khóa dữ liệu ngay lần thử đầu và chạy đúng. Rủi ro dữ liệu đã được chặn bằng BE-3. Chi tiết: `.reviews/runbooks/env4_env5_runbook.md`, mục "Kết quả ENV-5".

> **CHUYỂN THÀNH VIỆC LIÊN LAYER, 2026-09-27, phiên 14. H1 phù hợp với dữ liệu, nhưng mới có một lần quan sát (đợt C, lượt 1; `main-EXP-018`, `main-PROB-001`): antivirus giữ CreateProcess 64 s và chạy một bản sao có backend thật. Hướng xử lý: CT-1 (sửa hợp đồng) + BE-3 (khóa độc quyền `data.db`) + ENV-5 (đo lại). Main không sửa.**

- **Hiện tượng** (log `measure_startup` của Project Owner, 2026-09-27, lúc 19:59–20:00): một tiến trình Main của bản đóng gói ghi ra console lần lượt:
  - `first load finished`;
  - khoảng 23 s sau, `backend (pid …) exited with code 0`;
  - rồi `FATAL: The backend stopped unexpectedly (exit code 0). The app will close.` và `exiting with code 1`.

  Không có dòng `stopping backend … closing its standard input`. Tức là backend tự thoát trước khi Main kịp dừng nó.
- **Điểm mâu thuẫn:** kết quả JSON của lượt 1 ghi `exit_code: 0`, trong khi Main kia ghi `exiting with code 1`. `measure_startup.cjs` lại không in stderr của tiến trình nó chạy, nên khối log này không lẽ ra phải hiện trên console. Chưa rõ khối log đó thuộc lượt 1 hay thuộc một bản Main khác.
- **Giả thuyết** (chưa kiểm):
  - (a) `taskkill` không kèm `/F` (tức WM_CLOSE) không đóng được cửa sổ ở lượt chạy đầu, nên Main còn sống, rồi có thứ khác làm backend thoát;
  - (b) một phần mềm bên ngoài (antivirus, ReasonLabs) làm đứt pipe stdin của backend. Backend thoát mã 0 khi stdin gặp EOF;
  - (c) có một bản Main thứ hai, ví dụ do chạy lại khi lần mở đầu bị giữ lâu.
- **Manh mối thêm** (Orchestrator đọc lại log, 2026-09-27 20:20):
  - backend "thoát mã 0" mà không ghi `standard input closed` hay `Shutting down`, tức là bị kết thúc từ bên ngoài;
  - cùng lúc, Chromium báo tệp cache trong **đúng thư mục dữ liệu tạm của lượt đó** "đang bị tiến trình khác dùng".

  Đây là giả thuyết **H1, mạnh nhất**: antivirus tự chạy một bản sao của exe lạ, với cùng dòng lệnh, để phân tích. H1 giải thích được cả khối log trên console, mã thoát mâu thuẫn, lẫn độ trễ khoảng 33 s (DSK-3).
  
  **Nếu H1 đúng, đây là rủi ro toàn vẹn dữ liệu:** hai backend có thể cùng mở một `data.db`. Việc xử lý thuộc layer backend, và có thể phải sửa hợp đồng; Orchestrator và Project Owner quyết. Phiên 14 chỉ đo và báo.
- **Hướng xử lý: điều tra trước, không vá mò.** Chi tiết ở plan phiên 14.
  - `measure_startup.cjs` ghi toàn bộ stderr của từng lượt vào tệp riêng, kèm PID của Main và thời điểm gửi lệnh đóng.
  - Chạy nhiều lượt trên build mới cho tới khi tái hiện được.
  - Chỉ sửa Main khi đã xác định nguyên nhân. Nếu nguyên nhân nằm ngoài ứng dụng, ghi thành EXPERIENCES.
- **Tiêu chí đóng:** hoặc giải thích được bằng log tái hiện, hoặc 10 lượt liên tiếp trên build mới không tái hiện được, và ghi rõ đã thử những gì.

### DSK-3 — Lần mở đầu tiên chờ khoảng 33–36 s (trung bình; là Q-C1 của audit phiên 13)

> **Xác nhận lại 2026-09-28 (ENV-5), lần này có log gốc:** exe mới vừa cài, cả hai antivirus bật. Tiến trình bị giữ **75 s** trước khi chạy dòng code đầu tiên; lần mở thứ hai và thứ ba mất khoảng 4–5 s. Hướng xử lý giữ nguyên: ký số ở chặng G (DSK-9).

> **ĐÓNG PHẦN CHẨN ĐOÁN 2026-09-27, phiên 14. Phần chậm nằm trước khi code JavaScript của Main chạy: antivirus giữ exe lạ chưa ký. Không sửa được trong code; hướng xử lý là ký số (DSK-9, chặng G). Trong thư mục có ngoại lệ, lượt đầu chỉ khoảng 1,1 s.**

- **Dữ liệu mới:** khi AVG đã tắt, lượt đầu vẫn mất 33,1 s trước khi Main khởi động backend; các lượt sau chỉ 1,3–1,4 s. **Giả thuyết "do AVG" yếu đi.** ReasonLabs vẫn đang chạy nên chưa loại được antivirus nói chung. Log còn có dòng `Failed to find real location of …python.exe` ở lượt đầu, có thể liên quan tới một driver lọc tệp.
- **Hướng xử lý:**
  - `measure_startup` bấm thêm giờ cho dòng log **đầu tiên** của Main (`running the packaged app`), để tách hai khả năng: chậm trước khi code JavaScript chạy, hay chậm bên trong Main;
  - Project Owner đo một lượt khi đã tạm dừng cả ReasonLabs;
  - lấy số đo trên máy bạn của Project Owner.
- **Chưa quyết** màn hình chờ hay ký số khi chưa có ba số đo trên.

### DSK-4 — Gói chứa các tệp chạy thừa trong `site-packages\bin` (thấp)

> **ĐÓNG 2026-09-27, phiên 14.**

`pip --target` sinh các tệp `idna.exe`, `fastapi.exe`, `pytest.exe`, `py.test.exe`, `httpx.exe`, `pygmentize.exe`, `uvicorn.exe`. Các tệp này trỏ về interpreter của môi trường ảo trên máy build, nên vô dụng trong gói, và làm tăng số tệp exe mà antivirus phải quét. `prepare_runtime.mjs` xóa `Lib\site-packages\bin` sau khi cài.

### DSK-5 — Kiểm điều kiện build ngay từ đầu (trung bình)

> **ĐÓNG 2026-09-27, phiên 14. `prepare_runtime` kiểm `PATH`, rồi xóa `release` và `stage` ngay đầu, thử 5 lần; `main-EXP-017`.**

Máy Project Owner thiếu `C:\Windows\System32\WindowsPowerShell\v1.0` trong `PATH`, nên electron-builder hỏng với `spawn powershell.exe ENOENT`. Agent phiên 13 cũng gặp lỗi này nhưng cho rằng đó là môi trường của riêng nó, và NOTE (5) của checkpoint ghi "máy bình thường không gặp". **Nhận định đó sai.**

`prepare_runtime.mjs` kiểm `powershell.exe` có trong `PATH` ngay đầu, và dừng với hướng dẫn rõ ràng nếu thiếu. Sửa lại NOTE, và ghi thêm các điều kiện build vào EXPERIENCES:
- `PATH` có PowerShell;
- thư mục `release` và `packaging\stage` nên nằm trong danh sách loại trừ của antivirus;
- không để chương trình nào mở `release\…\app.asar`.

### DSK-6 — Sửa số liệu và NOTE trong checkpoint của Main (thấp)

> **ĐÓNG 2026-09-27, phiên 14.**

- EVIDENCE dung lượng ghi bộ cài 121 703 863 byte, nhưng bản build cuối là 121 709 519 byte.
- Cập nhật `main-EXP-015`, thời gian khởi động, bằng dữ liệu mới của DSK-3.
- Thêm vào `main-EXP-005` hoặc EXP mới: `ParentProcessId` không đáng tin khi PID bị tái sử dụng (DSK-1).

### DSK-7 — `author` trong `package.json` (thấp)

> **ĐÓNG 2026-09-27, phiên 14. Publisher = TGN.**

Mục Publisher trong danh sách gỡ cài đặt đang trống. **Project Owner đã chọn (2026-09-27): `"author": "TGN"`.** Kiểm lại: Publisher trong mục gỡ cài đặt hiện `TGN`, và electron-builder không còn cảnh báo `author is missed`.

### DSK-8 — Lỗi sandbox mạng của Chromium với thư mục dữ liệu tạm (thấp — chỉ quan sát)

> **Phiên 14: 0 lần xuất hiện trong mọi lượt đo. Giữ ở mức chỉ quan sát.**

`Failed to grant sandbox access to cache directory …\Temp\ct-startup-…\electron-user-data\…: Access is denied`. Lỗi này xuất hiện khi chạy với `--ct-test-data-dir` trong `%TEMP%`, và ứng dụng vẫn chạy.
- Kiểm xem lỗi có xuất hiện khi chạy thật, với `userData` trong `%APPDATA%`, qua lần Project Owner chạy tay hay máy bạn của Project Owner.
- Chỉ xử lý nếu lỗi xảy ra ở bản chạy thật.

### DSK-10 — `startup-logs/` chưa có trong `.gitignore` (thấp; Q14-2 của audit phiên 14)

> **ĐÃ ĐÓNG** (kiểm lại 2026-10-01, khi lập plan phiên 26): `.gitignore` gốc đã có dòng `Desktop/startup-logs/` (Project Owner thêm).

> **Chuyển thành việc của Project Owner, 2026-09-28:** thêm `Desktop/startup-logs/` vào `.gitignore` gốc, cùng lúc với phần còn thiếu của ENV-6. Hiện `*.log` đã bị bỏ qua nhờ `Desktop/.gitignore`, nhưng `*-summary.json` thì chưa.

Phiên desktop sau thêm vào.

### DSK-9 — Đã chấp nhận ở V1, không làm ở phiên 14

- **Q4** (audit phiên 10): cuộc đua khi nhận SIGINT lúc đang khởi động.
- **Q-C2** (audit phiên 13): điều hướng thay thế sau `ERR_ABORTED` nếu hỏng thì không ai báo.
- **Biểu tượng riêng và ký số:** thuộc chặng G. **Ký số là hướng xử lý duy nhất cho DSK-3**, và có thể cả nguyên nhân gốc của DSK-2; sau khi ký phải đo lại đợt C.

## Layer backend — phiên 15 (plan ở `.plan/backend_plan.md`)

### BE-1 — Tách phụ thuộc kiểm thử khỏi `requirements.txt` (trung bình)

> **ĐÓNG 2026-09-28, phiên 15. `requirements.txt` chỉ còn phụ thuộc lúc chạy; `requirements-dev.txt` thêm công cụ kiểm thử. Gói nhẹ đi khoảng 13,7 MB. Orchestrator kiểm trên một venv mới tinh chỉ cài `requirements.txt`: backend in READY.**

- `requirements.txt` chỉ còn phụ thuộc lúc chạy.
- `requirements-dev.txt` gồm `-r requirements.txt`, cộng `pytest` và `httpx`.
- Cập nhật `CLAUDE.md` mục 5 (Orchestrator làm) về lệnh cài môi trường dev.

Gói sẽ nhẹ đi khoảng 13,7 MB mà `prepare_runtime.mjs` không phải sửa gì, vì nó vẫn đọc `requirements.txt`.

### BE-2 — Checkpoint Main backend (thấp; từ audit phiên 9)

> **ĐÓNG 2026-09-28, phiên 15. Mọi khối checkpoint của Backend có `NOTES: []`; `claim` CORS đã viết lại theo 6.0.1.**

- Chuyển NOTE stdin-pipe và NOTE cho B1 thành EXPERIENCES. Cả hai hết hạn ngày 2026-10-08.
- Viết lại `claim` của EVIDENCE CORS cho đúng phạm vi 6.0.1.

### BE-3 — Mỗi lúc chỉ một backend được dùng `db_file_path` (trung bình; từ DSK-2) — plan phiên 15

> **ĐÓNG 2026-09-28, phiên 15. Tệp khóa `<db>.lock` giữ khóa hệ điều hành; bản thứ hai thoát mã 3. Orchestrator chạy nhánh Linux: 381/381; race 5 tiến trình × 10 vòng: luôn đúng một bản READY.**

- Backend giành **khóa độc quyền** trên tệp dữ liệu ngay khi khởi động, và giữ suốt vòng đời. Không giành được thì thoát mã khác 0 và không in `READY`.
- Có kiểm thử **hai tiến trình thật**: tiến trình thứ hai phải thoát mã khác 0 trong khi tiến trình thứ nhất vẫn chạy; tiến trình thứ nhất dừng thì khóa được nhả.
- Chọn cơ chế khóa và đo trên Windows. Không đoán, vì SQLite và Windows có khác biệt về khóa tệp.

Gộp vào phiên backend ngắn cùng BE-1 và BE-2.

### BE-4 — `data.db.lock` trong thư mục dữ liệu (thấp; Q15-1 của audit phiên 15) — cho plan chặng E và F

`backup_data` không sao lưu tệp này. `restore_data` không xóa hay di chuyển nó; chỉ di chuyển `data.db`. Xem `main-EXP-013` của Main backend.

### BE-5 — Backend áp dụng CT-2: `client_input` not blank (trung bình; Data Schema 7.0.0) — **plan phiên 18** (`.plan/backend_plan.md`, phát hành 2026-09-28)

> **ĐÃ ĐÓNG 2026-09-28, phiên 18** (`coding-agent@2026-09-28#3`). Audit: `.reviews/audits/backend/audit_backend_session18.md`. Đạt: 445/445 chạy lại hai lần; cắn 24/8/8; giá trị hợp lệ lưu nguyên văn. Project Owner duyệt; **Data Schema 8.0.1** ghi ba workflow `đã_hoàn_thiện`.

`create_client` và `edit_client` trả `400 ERR_VALIDATION` khi `display_name`, `channel` hoặc `value` trống sau khi bỏ khoảng trắng ở hai đầu, theo `formats.not_blank`. Giá trị hợp lệ được lưu **đúng như nhận được**, không bỏ khoảng trắng. Có kiểm thử cho mỗi trường: chuỗi rỗng, chỉ khoảng trắng ASCII, chỉ khoảng trắng Unicode (`U+00A0`, `U+3000`), và giá trị có khoảng trắng ở hai đầu (hợp lệ, lưu nguyên). Sau đó đề xuất đưa `manage_client` trở lại `đã_hoàn_thiện`.

### BE-6 — Backend áp dụng CT-3: `commission_input.title` và `profile_input.display_name` not blank (trung bình; Data Schema 8.0.0) — **gộp vào plan phiên 18**

> **ĐÃ ĐÓNG 2026-09-28, phiên 18**, cùng audit với BE-5.

Cùng cách làm với BE-5, cho `manage_commission` và `manage_watermark_profile`. Sau đó đề xuất đưa hai workflow này trở lại `đã_hoàn_thiện`.

**Giới hạn đã biết, không vá ở V1** (ghi trong checkpoint cả ba workflow; Orchestrator đã so toàn BMP): `str.isspace` của Python và `trim` của JavaScript khác nhau ở `U+001C..U+001F` và `U+0085` (chỉ Python coi là khoảng trắng) và `U+FEFF` (chỉ JavaScript). Ký tự vô hình như `U+200B` qua luật; hợp đồng không cấm.

### DSK-11 — Desktop chưa diễn giải mã thoát 3 của backend (thấp; Q15-2) — không làm ở V1

Desktop thử lại ba lần trên cổng khác, rồi báo một thông báo chung. Nếu muốn có thông báo riêng, việc đó thuộc phiên desktop sau V1.

*Rà soát 2026-09-28:* **không rẻ như vẻ ngoài.** Mã thoát 3 là giá trị trong `Backend/configs/backend.yaml`, còn hợp đồng (Data Schema 6.2.0) ghi rõ "The mechanism belongs to the backend; no other layer relies on how it is done". Muốn desktop hiểu mã này thì phải đưa nó vào hợp đồng trước. Giữ nguyên: không làm ở V1.

### BE-7 — Backend áp dụng CT-4: `payment_input.method` not blank (trung bình; Data Schema 9.0.0) — **plan phiên 23** (`.plan/backend_plan.md`, phát hành 2026-09-30)

> **ĐÃ ĐÓNG 2026-09-30, phiên 23** (`coding-agent@2026-09-30#1`). Orchestrator: backend 460/460 hai lần, `record_payment` 84/84, ba phép cắn đạt, dữ liệu cũ có `method` trống vẫn dùng được, UI e2e 54/54 với backend mới (`.reviews/audits/backend/audit_backend_session23.md`). Data Schema 9.0.1 (`record_payment` → `đã_hoàn_thiện`) được Project Owner duyệt và ghi 2026-09-30.

Cùng cách làm với BE-5 và BE-6 (phiên 18): trong `record_payment/routers.py`, `method` có `StringConstraints(min_length=1)` và một hàm `_not_blank` riêng của workflow (không `Backend/shared/`, không import chéo), gắn bằng `AfterValidator`; giá trị hợp lệ được lưu nguyên văn.

Kiểm thử: `""`, khoảng trắng ASCII, `U+00A0`, `U+3000` bị 400 và không ghi gì; phương thức có khoảng trắng hai đầu được lưu nguyên văn; `note` không đổi; có kiểm thử cắn. Sau đó đề xuất đưa `record_payment` về `đã_hoàn_thiện` (Data Schema 9.0.1).

Lúc lập plan (2026-09-30), Orchestrator thấy kiểm thử `test_method_is_free_text` của `record_payment` khẳng định `method=""` trả 201, trái với 9.0.0. Plan phiên 23 cho phép viết lại đúng ca đó.

### BE-8 — Thời điểm trong checkpoint `record_payment` sai khoảng một giờ (thấp; Q23-1 của audit phiên 23) — cho phiên backend kế tiếp

Checkpoint ở đầu `record_payment/services.py` ghi `last_updated_at` và `recorded_at` của EVIDENCE BE-7 là `2026-09-30T23:40:00+07:00`, trong khi tệp được ghi lần cuối lúc 22:38:59 (+07:00). Sửa hai giá trị thành thời điểm thật. Không đổi gì khác.

**Cùng loại, phiên 24** (audit phiên 24 §5.5): bốn khối checkpoint giao diện ghi 20:20–20:25, trong khi tệp được ghi 20:17–20:19. Lệch vài phút, không cần sửa riêng. **Quy ước cho mọi plan từ nay:** agent lấy giờ bằng lệnh (`Get-Date -Format o`) ngay trước khi ghi checkpoint, không ước lượng.

**Phiên 25** (audit phiên 25 §5.3): giờ đã lấy bằng lệnh nhưng vẫn muộn hơn lúc ghi tệp từ 11 s tới khoảng 1 phút, có vẻ do làm tròn lên. Quy ước bổ sung: chép nguyên giá trị của lệnh, không làm tròn.

### DSK-16 — `test:packaged` hỏng từ phiên 16 mà không ai biết (trung bình, quy trình; audit phiên 26 §5.2)

`packaged_app.spec.ts` chờ câu trạng thái rỗng cũ của `client_list`; câu đó đổi ở phiên giao diện 16, còn `test:packaged` chỉ chạy ở phiên desktop (gần nhất là phiên 14). Agent phiên 26 sửa dòng chờ chữ, Orchestrator chấp nhận.

**Quy ước từ nay:**
- plan giao diện nào đổi chữ của trang mở đầu (`client_list`) hay khung chính phải chạy thêm `npm run dist` và `npm run test:packaged` trong `Desktop/`, hoặc ghi rõ lý do không chạy;
- tiêu chí của chặng G (phát hành) có `test:packaged`.

### DSK-17 — `reminder_ticker` chưa có (trung bình; thuộc V1, chặng D6) — **phiên desktop 29**, sau phiên giao diện 28 (UI-15)

Theo API Contract 4.0.0 (`cross_cutting.reminder_ticker`), desktop Main khởi động `reminder_ticker` sau khi backend READY. Nó gọi `send_reminder.check_due` (`POST /reminders/checks`) theo nhịp riêng, hiện một thông báo Windows cho mỗi nhắc việc trả về (chữ dựng từ các trường của nhắc việc), bấm thông báo chỉ đưa cửa sổ lên trước. Nó không quyết định gì và không đánh dấu đã xem.

Chưa có thành phần này thì trong dùng thật danh sách nhắc việc đang chờ của giao diện (D6, phiên 27) luôn rỗng. Lập plan sau khi audit phiên 27; cần chốt: nhịp gọi, chữ thông báo tiếng Việt (trong `configs/desktop.json`), cách kiểm thử thông báo trên Windows.

**Thứ tự (chốt 2026-10-03):** phiên 28 (giao diện) làm UI-15 trước, để e2e của giao diện không hỏng khi ticker xuất hiện; phiên 29 (desktop) làm DSK-17.

**Đặc tả dự kiến cho phiên 29** (Orchestrator, 2026-10-03; chốt hẳn khi viết plan phiên 29):
- **Vị trí:** `Desktop/src/cross_cutting/reminder_ticker/`, đúng bố cục ở `CLAUDE.md` mục 4. Không có năm lớp; không quyết định nghiệp vụ (lý thuyết WCA §5).
- **Khởi động:** Main khởi động ticker sau khi backend READY và cửa sổ đã nạp lần đầu. Lần kiểm đầu tiên chạy ngay, để nhắc việc đến hạn trong lúc ứng dụng đóng hiện ra khi mở; sau đó theo nhịp cố định. Ticker dừng trước khi Main dừng backend.
- **Nhịp:** giá trị nội bộ của ticker, trong `configs/desktop.json`; đề xuất 60 s. Không chạy lần kiểm mới khi lần trước chưa xong. Mỗi lời gọi có hạn chờ riêng (trong config).
- **Mỗi nhắc việc trả về, một thông báo Windows.** Chữ tiếng Việt trong config, dựng từ các trường của nhắc việc, cùng lời với trang `reminder_list`:
  - hạn giao: tiêu đề "Sắp tới hạn giao: <title>", nội dung "Hạn giao dd/mm/yyyy · nhắc trước <n> ngày|giờ";
  - tổng hợp: tiêu đề "Tổng hợp định kỳ: <open_count> đơn đang mở", nội dung "<số đơn trong upcoming> đơn có hạn giao", thêm " · sớm nhất: <title> (dd/mm/yyyy)" khi `upcoming` không rỗng.
- **Bấm thông báo:** chỉ đưa cửa sổ lên trước (mở lại nếu đang thu nhỏ, rồi focus), như khi có lần mở thứ hai. Không mở trang nào, không đánh dấu đã xem.
- **Lỗi:** 500, không tới được, hay thân trả về sai hình dạng: ghi log, không hiện gì, thử lại ở nhịp sau; không làm ứng dụng dừng. Một phần tử sai hình dạng thì bỏ riêng phần tử đó và ghi log.
- **Windows:** thông báo có thể cần Application User Model ID khớp `appId` của `electron-builder.yml` (`com.commissiontracker.desktop`). Orchestrator **không nắm chắc** yêu cầu này với Electron 44.4.5 khi chạy từ mã nguồn, từ `win-unpacked` và từ bản cài: agent tra tài liệu của đúng phiên bản và **đo** ở cả ba (sự kiện `show` hay `failed` của thông báo). Không sửa registry, không tự tạo lối tắt Start Menu.
- **Kiểm được không cần mắt người:** mỗi thông báo ghi một dòng log có chữ của nó. Cờ kiểm thử chỉ cho bản chạy từ mã nguồn để rút ngắn nhịp; bản đóng gói bỏ qua cờ đó.
- **Mắt người:** Project Owner thấy thông báo thật và bấm thử, trên bản chạy từ mã nguồn (`npm run walkthrough:app -- --reminders`).


## Hợp đồng — chờ Project Owner duyệt

### CT-5 — Luật "ngày bắt đầu không sau ngày kết thúc" của `view_income_report` nằm ngoài `type` (trung bình; đề xuất của Orchestrator, 2026-10-01, audit phiên 24 §5.1)

> **ĐÃ DUYỆT VÀ GHI 2026-10-01: Data Schema 9.0.2, phương án A.** Phía giao diện: plan phiên 25 (đổi phiên bản và chú thích trong Configs của `view_income_report`, không đổi hành vi).

**Nguồn:** câu hỏi của agent phiên 24. Đặc tả D5 (Orchestrator viết) bắt giao diện kiểm luật này, trong khi iWCA §5 cấm kiểm điều không viết trong `type` (ví dụ chính là "một điều kiện giữa hai trường"). Lỗi của Orchestrator.

**Đề xuất (A), Data Schema 9.0.1 → 9.0.2:** `view_income_report.input_expected.period_to`: `{ type: date, from: end_user }` → `{ type: "date (on or after period_from)", from: end_user }`. Câu tương ứng trong `description` giữ nguyên. Giá trị đầu vào được chấp nhận không đổi, nên chỉ tăng số cuối; `api_contract.yaml` không đổi; backend không đổi gì. Giao diện giữ hành vi; phiên giao diện kế tiếp đổi `contract.dataSchema` và chú thích trong Configs của `view_income_report`.

**Phương án (B):** bỏ phép kiểm ở giao diện; ngày đảo ngược nhận 400 từ backend và trang hiện "Máy chủ không nhận khoảng thời gian này.", không chỉ ra ô sai.

### CT-1 — Luật "một backend cho một `db_file_path`" (đề xuất của Orchestrator, 2026-09-27)

> **ĐÃ DUYỆT VÀ GHI 2026-09-27: Data Schema 6.2.0.** Câu chữ cuối cùng nằm ở `clause_a_common.mandatory_rules`, kèm changelog `v6.2.0`. So với bản đề xuất, câu chữ ghi rõ ba điều: backend giành quyền trước khi mở tệp; quyền mất khi tiến trình kết thúc, dù kết thúc kiểu gì; cơ chế thuộc về backend.

Data Schema 6.1.0 → **6.2.0**, thêm vào `clause_a_common.mandatory_rules`:

> "At most one clause_b_backend process uses db_file_path at a time. A backend that cannot take exclusive ownership of db_file_path at start-up exits with a non-zero code and never writes READY."

**Lý do:** DSK-2 cho thấy một bản sao của ứng dụng, do phần mềm bên ngoài chạy, có thể khởi động backend trên cùng tệp dữ liệu. Main desktop không chặn được, vì hệ điều hành đã cho bản sao chạy.

Desktop không phải sửa: backend thoát trước `READY` thì Main vốn đã thử lại rồi báo lỗi.

### CT-2 — `client_input` không được nhận tên trống và ô liên hệ trống (đề xuất của Orchestrator, 2026-09-28; UI-5)

> **ĐÃ DUYỆT VÀ GHI 2026-09-28: Data Schema 7.0.0** (không phải 6.3.0 như bản đề xuất: thu hẹp giá trị đầu vào được chấp nhận là thay đổi phá vỡ, theo `02-contract.md` và tiền lệ v5.0.0). Kèm theo: định nghĩa `clause_a_common.formats.not_blank`; `manage_client` chuyển `đã_hoàn_thiện` → `đang_triển_khai`. Phía giao diện làm ở phiên 17; phía backend là BE-5.

Bản đề xuất ban đầu, Data Schema 6.2.0 → 6.3.0, sửa `manage_client.input_expected.client_input`:

```
display_name: string (1..120 characters, not blank: at least one non-whitespace character)
contacts: list[object { channel: string (1.. characters, not blank; free label, e.g. email, facebook, discord, zalo), value: string (1.. characters, not blank) }]
```

**Lý do:** backend hiện nhận tên `"   "` và liên hệ có ô rỗng. Luật chặn việc này chỉ nằm ở giao diện (`ui_decomposition.md` §5), nên hở tầng dữ liệu. Agent phiên 16 phát hiện.

**Ảnh hưởng:**
- API Contract không đổi: vẫn trả `400 ERR_VALIDATION`.
- Backend cần một phiên nhỏ (`create_client`, `edit_client`).
- Giao diện: luật hiện có trở thành bản sao của hợp đồng.

Chi tiết: `.reviews/audits/ui/audit_ui_session16.md` §4.

### CT-3 — `commission_input.title` và bút danh `profile_input.display_name` not blank (đề xuất của Orchestrator, 2026-09-28)

> **ĐÃ DUYỆT VÀ GHI 2026-09-28: Data Schema 8.0.0.** `manage_commission` và `manage_watermark_profile` chuyển `đã_hoàn_thiện` → `đang_triển_khai`. Phía backend: BE-6 (phiên 18). Phía giao diện: tiêu đề đơn hàng áp dụng ở chặng D2 (ghi vào I1 của D2); bút danh không có màn hình ở V1.

**Lý do:** cùng chỗ hở với CT-2. Hai tên bắt buộc còn lại của hợp đồng nhận chuỗi chỉ gồm dấu cách.

**Các trường tùy chọn (`string|null`) không đổi:** một văn bản tùy chọn để trống là một quyết định riêng (rỗng hay `null`), chưa đặt ra ở đây.

### CT-4 — `payment_input.method` not blank (đề xuất của Orchestrator, 2026-09-29, khi làm I1 cho D4)

> **ĐÃ DUYỆT VÀ GHI 2026-09-30: Data Schema 9.0.0.** `record_payment` chuyển `đã_hoàn_thiện` → `đang_triển_khai`. Phía giao diện: D4 (phiên 22). Phía backend: BE-7.

**Lý do:** cùng chỗ hở với CT-2 và CT-3. `method` là chuỗi bắt buộc ("free label, e.g. bank_transfer, momo, paypal, cash"), nhưng hợp đồng không ghi not blank. Backend hiện kiểm `method: str`, nên nhận `""` và `"   "`: một khoản thanh toán không có phương thức, mà họa sĩ không biết đã nhận tiền qua đâu.

**Thay đổi đề xuất (Data Schema 8.0.1 → 9.0.0):**
- `record_payment.input_expected.payment_input`: `method: string (free label, …)` → `method: string (1.. characters, not blank; free label, …)`.
- Thay đổi phá vỡ, vì thu hẹp giá trị đầu vào được chấp nhận (tiền lệ v5.0.0, v7.0.0, v8.0.0). Nhãn lỗi không đổi (400 `ERR_VALIDATION`), nên `api_contract.yaml` không đổi.
- `record_payment` chuyển `đã_hoàn_thiện` → `đang_triển_khai` cho tới khi backend áp dụng (một phiên backend ngắn, BE-7). Dữ liệu cũ không bị chuyển đổi.
- `note` giữ `string|null`, không đổi.

**Phía giao diện:** D4 (phiên 22) đã kiểm "phương thức không rỗng" như một luật `[UI-ONLY]`. Nếu CT-4 được duyệt, luật đó thành bản sao của hợp đồng; hành vi không đổi.

## Layer giao diện — gộp vào đầu phiên D1 (phiên 16, plan ở `.plan/ui_plan.md`)

### UI-1 — R13 còn lọt (trung bình; Q1 của audit phiên 12)

> **ĐÃ ĐÓNG ở phiên 16 (2026-09-28).** Orchestrator kiểm lại bằng mẫu vi phạm riêng. Chỉ còn lọt các dạng đọc qua hàm generic hoặc `Object.values`, thuộc giới hạn đã khai.

R13 còn lọt khi `kind` được gán sang biến khác, destructuring rồi đổi tên, hoặc khi tra bảng hay `.includes` theo `kind`. Đề xuất: `.kind` chỉ được đọc làm biểu thức của `switch`. Chứng minh luật cắn.

### UI-2 — Tên người chạy trong `client_list-run.json` bị ghi cứng (trung bình; Q2 của audit phiên 12)

> **ĐÃ ĐÓNG ở phiên 16 (2026-09-28).**

Phiên 13 chạy e2e, và tệp bằng chứng hiện ghi sai người chạy (`coding-agent@2026-09-27#2`). Lấy tên từ biến môi trường `CT_WALKTHROUGH_RUNNER`; thiếu biến thì ghi `unknown`, không đoán.

### UI-3 — `main_layout.spec.ts` để lại thư mục tạm khi hỏng (thấp; Q3 của audit phiên 12)

> **ĐÃ ĐÓNG ở phiên 16 (2026-09-28).** Xác nhận độc lập: 8 lần chạy trên Linux, 5 lần có bước hỏng, không sót thư mục tạm hay tiến trình.

Đưa việc xóa thư mục tạm vào `finally`.

## Layer giao diện — sau audit phiên 16

### UI-4 — e2e không tất định: hook tải khởi tạo `loading = false` (chặn việc chuyển trang sang `hoàn_tất`; Q16-1)

> **ĐÃ ĐÓNG ở phiên 17 (2026-09-28).** Orchestrator chạy lại trên Linux: e2e 6/6 lần; kiểm thử lần vẽ đầu cắn (4 ca hỏng khi đặt lại cờ `false`).

**Hiện tượng:** trên Linux, e2e chạy 5 lần thì hỏng 4 lần, ở `client_form` S2 và S5.

**Nguyên nhân:** khung hình đầu có nút "Tải lại" đã bật trong khi dữ liệu chưa tải. Spec lại lấy "nút bật" làm tín hiệu đã tải xong. Ở S2, phép so `before` có thể đạt mà không kiểm gì.

**Việc sửa:**
- Cờ tải của ba hook (`use_client_list.loading`, `use_client_detail.loading`, `use_client_form.opening`) khởi tạo là `true`.
- Spec chờ nội dung đã tải, không chờ trạng thái nút; ở S2, khẳng định `before` khác rỗng.
- Thêm kiểm thử dựng trang cho lần vẽ đầu.
- Tiêu chí: e2e đạt 5 lần liên tiếp.

Orchestrator đã chứng minh việc đổi cờ đủ để e2e đạt 3/3 lần. Chi tiết: audit phiên 16 §3.

### UI-5 — Luật trống ở `client_input` chỉ có ở giao diện (cao; Q16-2)

Xem CT-2, **đã duyệt 2026-09-28** (Data Schema 7.0.0). Phía giao diện: **đã đóng ở phiên 17**. Phía backend: BE-5, còn mở.

### UI-6 — Quan sát sau audit phiên 16 (Q16-3)

Ngày 2026-09-28, Project Owner yêu cầu vá mọi chỗ chưa đạt chuẩn. Orchestrator đối chiếu từng mục với §7 của `ui_decomposition.md`. Chuẩn được nâng ở §7.1 (tương phản 3:1) và §7.2 (nguyên tắc 4, 7).

**Làm ở phiên 17 — ĐÃ ĐÓNG (2026-09-28):**
- Tương phản phi văn bản của viền ô nhập: 1.78:1, trong khi WCAG 1.4.11 đòi 3:1.
- Nút "Lưu" nằm dưới mép cửa sổ, lệch nguyên tắc 7: đưa hàng nút lên dưới tiêu đề.
- Focus không chuyển tới ô lỗi (nguyên tắc 4).

**Để V2 (trải nghiệm dùng):**
- Enter không lưu form. Chưa chắc Enter khi đang chọn gợi ý của `datalist` có gửi form nhầm không, nên cần đo trước.
- Mất focus khi nút "Lưu" đang bận.
- Tên khách ở trang chi tiết nhỏ hơn tiêu đề chung (thứ bậc thị giác, gần với V3).
- `POST` gửi lại sau `unreachable` có thể tạo trùng.
- Tiêu đề cửa sổ hộp thoại lỗi của desktop là "Error" (hành vi của `dialog.showErrorBox` trên Windows); đổi bằng `showMessageBox` (audit phiên 26 §5.3).
- `income_report`: lỗi "ngày kết thúc trước ngày bắt đầu" kèm câu tổng của layer "Một số ô chưa đúng định dạng", sai nghĩa với lỗi thứ tự; danh sách theo tháng không có tiêu đề nhìn thấy (audit phiên 24 §5.6).
- Khoản thanh toán đã hủy trên `payment_list` có dòng chính giống hệt khoản còn hiệu lực; chữ "Đã hủy" chỉ ở cuối dòng phụ (Q22-1 của audit phiên 22). Đạt đặc tả V1; V2 làm dấu hiệu rõ hơn.
- Ô giờ và ô ngày giờ gốc hiện theo kiểu giờ của Windows (12 giờ có SA/CH trên máy Project Owner), khác chữ giờ 24 giờ ở chỗ khác của giao diện (UI-14, đóng 2026-10-03). V2 có thể thay bằng ô chọn giờ và phút riêng.

**Rút lại:** "Thông báo lưu trữ còn lại sau Tải lại" không xảy ra được. Trang chi tiết chỉ có nút tải lại khi tải thất bại, lúc đó chưa thể có kết quả lưu trữ. Orchestrator đọc sót ở audit.

Chi tiết: audit phiên 16 §6.

### UI-7 — Chưa có quy ước xuống dòng (thấp; Q17-1)

> **ĐÃ ĐÓNG 2026-09-28** bằng ENV-6: `.gitattributes` gốc có `* text=auto`, nên git chuẩn hóa xuống dòng khi commit.

> **Đính chính 2026-09-28 (Orchestrator):** rà lại thì dự án **chưa có git** (xem ENV-6). Lý do "commit sẽ hiện cả tệp là đã sửa" vì vậy chưa áp dụng. Mục này được giải quyết cùng ENV-6, bằng tệp `.gitattributes` đặt ngay từ commit đầu tiên.

Hiện `UI/` có 11 tệp CRLF và 72 tệp LF. Phiên 17 đổi `tokens.css` từ CRLF sang LF, nên lần commit tới sẽ hiện toàn bộ tệp là đã sửa. Đề xuất cho một phiên dọn dẹp:
- thêm `.gitattributes` với quy ước chung, ví dụ `* text=auto eol=lf`;
- chuẩn hóa toàn kho một lần, trong một commit riêng.

Không ảnh hưởng hành vi.

## Layer giao diện — sau audit phiên 18

### UI-8 — `npm run e2e` ghi đè bằng chứng đã commit trong `UI/evidence/` (trung bình; Q18-1) — **plan phiên 19** (D2, việc 2)

> **ĐÃ ĐÓNG 2026-09-29, phiên 19** (`coding-agent@2026-09-29#1`). Hàm `evidenceRoot()` trong `tests/tools/walkthrough_lib.mjs`. Orchestrator xác nhận: ba lần chạy không đặt biến, băm toàn bộ `UI/evidence` trước và sau giống hệt (`.reviews/audits/ui/audit_ui_session19.md`).

**Hiện tượng:** phiên 18 (backend) chạy `npm run e2e` để kiểm hồi quy theo plan. Lệnh này ghi lại toàn bộ 27 tệp đang được git theo dõi trong `UI/evidence/`:
- 26 tệp ở `walkthroughs/`;
- `b2a/main_layout.png`.

Vì `CT_WALKTHROUGH_RUNNER` không được đặt, ba tệp `*-run.json` ghi runner `"unknown (Playwright, …)"`, thay cho bằng chứng mà Project Owner đã chấp nhận ở phiên 17.

**Xử lý tạm:** trước mỗi commit của một phiên không phải giao diện, Project Owner chạy `git restore UI/evidence`.

**Việc sửa:** một lần chạy e2e để kiểm hồi quy không được ghi vào `UI/evidence/`. Hai hướng:
- chỉ ghi khi `CT_WALKTHROUGH_RUNNER` được đặt;
- hoặc tách lệnh: e2e ghi ra thư mục tạm, còn một lệnh riêng ghi bằng chứng.

Plan phiên 19 chọn hướng thứ nhất: không có biến thì ghi vào `UI/test-results/evidence/` (đã bị git bỏ qua).

**Tiêu chí đóng:** chạy `npm run e2e` không đặt biến thì `git status UI/evidence` sạch; chạy với biến thì bằng chứng ghi đúng tên người chạy.

## Layer giao diện — sau audit phiên 19

### UI-9 — e2e `commission_form` S2 không tất định (trung bình; chặn `hoàn_tất` của ba trang D2; Q19-1) — **plan phiên 20** (việc 2)

> **ĐÃ ĐÓNG 2026-09-29, phiên 20** (`coding-agent@2026-09-29#2`). Hàm nạp mẫu chờ 1,1 s sau lần ghi cuối; S2 tìm đơn theo tên. Q19-3 đã sửa. Orchestrator chạy spec `commission_form` 45 lần: không lần nào hỏng ở chỗ cũ (`.reviews/audits/ui/audit_ui_session20.md`). Có một lỗi không tất định **khác**: UI-10.

> Project Owner chạy tay ba kịch bản D2 ngày 2026-09-29, không thấy bất thường; e2e trên máy Project Owner đạt 32/32. Quyết định: gộp UI-9 vào phiên 20 (D3), chốt `hoàn_tất` cả năm trang D2 và D3 ở cuối phiên đó.

**Hiện tượng:** S2 khẳng định đơn đứng đầu danh sách là đơn vừa tạo ở S1. Trên máy Orchestrator (Linux), khẳng định này hỏng khoảng 1/6 số lần: đơn mẫu tạo cuối lại đứng đầu.

**Nguyên nhân:**
- Backend ghi `updated_at` tới giây. Giao diện sắp theo `updated_at` rồi theo `commission_id` (UUID ngẫu nhiên), đúng đặc tả.
- `seedCommissionSample` (`tests/tools/walkthrough_lib.mjs`) không chờ sau đơn mẫu cuối. Trên máy nhanh, S1 lưu trong cùng giây với đơn mẫu cuối.

Thí nghiệm: chờ thêm 1,1 s sau khi nạp mẫu thì 8/8 lần đạt; không chờ thì 3/22 lần hỏng.

**Việc sửa:**
- `seedCommissionSample` chờ hơn 1 s sau lần ghi cuối;
- rà mọi khẳng định về vị trí trong danh sách của cả sáu spec: chỗ nào có thể trùng giây với một lần ghi khác thì tìm theo tên, không theo vị trí;
- kèm Q19-3: nhãn khách vắng mặt ở chế độ sửa đổi từ "Không tìm thấy khách hàng (đã lưu trữ)" thành "Không tìm thấy khách hàng".

**Tiêu chí đóng:** `npm run e2e` đạt 5/5 trên Windows, và Orchestrator chạy lại trên Linux đạt ổn định (ít nhất 10 lần spec `commission_form`, 5 lần toàn bộ e2e).

**Ghi nhận về sản phẩm, không vá ở V1:** hai đơn lưu trong cùng một giây có thứ tự ổn định nhưng tùy ý trong danh sách.

## Layer giao diện — sau audit phiên 20

### UI-10 — spec e2e khẳng định `getByRole('status')` không lọc (trung bình; chặn `hoàn_tất` của năm trang D2, D3; Q20-1) — **plan phiên 21** (phiên vá ngắn, Project Owner chọn ngày 2026-09-29)

> **ĐÃ ĐÓNG 2026-09-29, phiên 21** (`coding-agent@2026-09-29#3`). 11 khẳng định đã lọc theo chữ; `scripts/check_e2e_status.mjs` nằm trong `npm run check`. Orchestrator: spec `commission_form` 40/40, e2e 6/6 (`.reviews/audits/ui/audit_ui_session21.md`). Giới hạn đã biết (Q21-1): script không bắt locator gán vào biến trước (`const s = page.getByRole('status'); expect(s).toHaveText(…)`); gặp kiểu viết đó thì mở rộng script. Phần theo dõi chụp ảnh chuyển sang UI-11.

**Hiện tượng:** Sau khi lưu đơn, `commission_detail` có hai vùng `role="status"`: thông báo chuyển trang, và "Đang tải tiến độ…" của phần Tiến độ (D3). Spec `commission_form` khẳng định bằng `getByRole('status')` không lọc (dòng 109, 175, 211, 237), nên hỏng "strict mode violation" khi phần Tiến độ chưa tải xong. Trên máy Orchestrator, chạy spec riêng 45 lần thì hỏng 3 lần; toàn bộ e2e thì đạt 6/6.

**Thí nghiệm:** đổi bốn khẳng định sang `getByRole('status').filter({ hasText: '…' })` thì đạt 30/30 lần.

**Việc sửa:**
1. sửa bốn khẳng định của `commission_form`;
2. rà mọi `getByRole('status')` không lọc trong `tests/e2e` (`client_detail`, `client_form`, `commission_form`, harness). Chỗ nào trang có thể có nhiều vùng `status` và spec khẳng định chữ thì lọc theo chữ. Các `toHaveCount(0)` của harness dùng để chờ mọi chỉ báo tải biến mất, nên đúng như hiện nay;
3. thêm vào `npm run check` một phép kiểm tĩnh: trong `tests/e2e`, không được khẳng định chữ (`toHaveText`, `toContainText`) trực tiếp trên `getByRole('status')` chưa lọc.

**Kèm theo, theo dõi:** `main_layout.spec.ts` hết giờ chụp ảnh (30 s) trên Windows đã ba lần (phiên 19 mốc, `main-EXP-013`, phiên 20). Gặp lần nữa thì điều tra.

**Tiêu chí đóng:** spec `commission_form` chạy riêng đạt ổn định trên máy Orchestrator (ít nhất 30 lần); `npm run e2e` đạt 5/5 trên Windows; phép kiểm tĩnh cắn được (tạm thêm một khẳng định chưa lọc thì `check` hỏng).

## Layer giao diện — sau audit phiên 21

### UI-11 — `page.screenshot` hết 30 s trong e2e, chỉ trên Windows (trung bình; không chặn `hoàn_tất`; audit phiên 21 §5) — **plan phiên 28** (việc 2)

**Dữ liệu:**
- phiên 19, mốc đầu phiên: `client_detail` S4 (backend tắt), có đặt runner;
- phiên 20: `main_layout.spec.ts`, có đặt runner;
- phiên 21: `client_detail` S4 và `stage_change` S4 (đều là bước backend tắt), cùng một lần chưa rõ bước; không đặt runner; 3 trong 8 lần.

Máy Orchestrator (Linux) chưa gặp lần nào trong hơn 20 lần e2e toàn bộ.

**Chưa rõ nguyên nhân.** Các giả thuyết, chưa có dữ liệu để chọn:
- kết nối tới cổng đóng trên Windows chậm;
- phần mềm diệt virus quét tệp ảnh vừa ghi;
- cửa sổ Electron không nhận khung hình mới khi không có tiêu điểm.

**Việc cho phiên giao diện kế tiếp** (thu dữ liệu, không nới thời gian chờ, không `retries`) — **đưa vào plan phiên 22** (việc 2):
- bật `trace: 'retain-on-failure'` trong `tests/e2e/playwright.config.ts`;
- ghi thời điểm bắt đầu và kết thúc của mỗi lệnh chụp ảnh ở bước backend tắt;
- khi có lần hỏng, giữ trace và báo lại.

**Nếu trace cho thấy giao diện thật sự đứng khi backend tắt**, đó là lỗi của sản phẩm: mở lại trạng thái các trang liên quan.

**Tiêu chí đóng:** biết nguyên nhân, sửa đúng chỗ; sau đó 10 lần e2e liên tiếp trên Windows không hết giờ chụp ảnh.

**Dữ liệu phiên 22** (audit phiên 22 §5; trace đã bật, nhật ký `UI/test-results/screenshot-timing.log`):
- Windows, năm lần e2e cuối: 390 lần chụp, lâu nhất 155 ms; riêng 50 lần lúc backend tắt, lâu nhất 128 ms.
- **Một lần hết giờ lúc backend đang bật**: `payment_form-S1-errors`, ngay sau khi gõ vào ô có `datalist`. Agent nghi popup gợi ý gốc còn mở, nên thêm cú bấm vào tiêu đề trang trước ảnh đó; sau đó 16 lần sạch. Orchestrator chấp nhận thay đổi spec này (không che lỗi sản phẩm).
- Giả thuyết datalist không giải thích được các lần hết giờ trước ở bước backend tắt (`client_detail` S4, `stage_change` S4), nơi không có ô gợi ý. Có thể có hai nguyên nhân.
- Linux (máy Orchestrator): 468 lần chụp, lâu nhất 96 ms, không lần nào hết giờ.
- Trace của lần hết giờ nằm trong thư mục tạm của phiên agent (`traces_FINAL_5/*.zip`), chưa ai mở. **Việc của Project Owner:** nếu còn, chép các tệp đó vào `UI/test-results/ui11_traces/` để Orchestrator xem.

**Việc tiếp:** giữ trace và nhật ký trong mọi phiên giao diện; lần hỏng kế tiếp ở bước backend tắt là dữ liệu quyết định. Từ plan phiên 24: trace của lần hết giờ được giữ ngay trong `UI/test-results/ui11_traces/`, không để trong thư mục tạm của phiên agent.

**Dữ liệu phiên 24** (audit phiên 24 §5.2; trace ở `UI/test-results/ui11_traces/` trên máy Project Owner, có `INDEX.txt`):
- Windows, 24 lượt (gồm các lượt hỏng): 1280 lần chụp, trung bình 217 ms; 4 lần hết giờ ~30 s, mọi lần khác dưới 2,5 s (hai mode: treo, không phải chậm).
- 4 lần: `client_form-S5-saved`, `payment_form-S1-errors`, `payment_list-S1` (backend bật), `payment_form-S6-unreachable` (backend tắt). Đi thành cụm trong lúc máy nghẽn (mỗi cú bấm ~2 s).
- Trace của hai lần: nhật ký dừng ở "fonts loaded" rồi treo; ảnh chụp khi hỏng của Playwright ngay sau đó chụp được trong ~2,2 s.
- **Giả thuyết datalist bị bác:** `payment_form-S1-errors` hết giờ lại dù cú bấm vào tiêu đề đã chạy xong 2 s trước.
- **Giả thuyết còn lại phù hợp nhất:** cửa sổ Electron ngừng vẽ khung hình mới (Chromium trên Windows có thể ngừng vẽ cửa sổ bị che hoặc ở nền). Orchestrator chưa nắm chắc cơ chế và cờ cụ thể.

**Thí nghiệm — plan phiên 25 (việc 4):** tái hiện có chủ đích bằng công cụ chẩn đoán riêng (cửa sổ bình thường, thu nhỏ, bị che hoặc mất tiêu điểm), rồi mới thử cờ. Đề xuất ban đầu: chỉ trong lệnh khởi chạy Electron của harness kiểm thử (không ở ứng dụng thật), bật các cờ tắt cơ chế "cửa sổ bị che thì ngừng vẽ / bị hạ ưu tiên"; agent tra tài liệu Electron/Chromium của đúng phiên bản đang dùng để chọn cờ, ghi nguồn. Chạy cùng số lượt e2e với và không có cờ, trên cùng máy, ghi số lần hết giờ. Đây là đổi điều kiện môi trường kiểm thử, không phải nới thời gian chờ; nếu có hiệu quả, Project Owner quyết có giữ hay không.

**Dữ liệu phiên 25: thí nghiệm có đối chứng** (audit phiên 25 §5.1; công cụ `UI/tests/tools/ui11_probe.mjs`):
- Windows, Electron 44.4.5, 20 lần mỗi điều kiện, giới hạn 10 s: **thu nhỏ 11/20 treo**; bị che, mất tiêu điểm, bình thường 0/20 mỗi điều kiện.
- Cờ Chromium (đã xác nhận có hiệu lực trong tiến trình): không bộ nào đưa về 0 (10–11/20; một lần 3/20 không lặp lại được). Không thêm cờ nào.
- Linux (Orchestrator): lệnh thu nhỏ không có tác dụng dưới Xvfb (`minimized: false`), 0 lần treo. Điều này giải thích vì sao Linux chưa bao giờ treo.
- **Giả thuyết hiện tại:** cửa sổ Electron bị thu nhỏ trong lúc e2e chạy (bấm thu nhỏ, Win+D, "Show desktop"). Chưa chứng minh cho các lần treo cũ.

**Việc tiếp theo:**
1. **Hỏi Project Owner** (audit phiên 25): trong lúc agent chạy e2e trên máy, anh có thu nhỏ cửa sổ Electron hay dùng "Show desktop" không?
   **Trả lời 2026-10-02:** Project Owner có thu nhỏ và phóng to cửa sổ trong lúc dùng máy, và ứng dụng vẫn chạy bình thường. Điều này khớp giả thuyết: thu nhỏ không làm hỏng ứng dụng, chỉ làm **lệnh chụp ảnh của công cụ kiểm thử** chờ khung hình mới. Ứng dụng thật không chụp ảnh nên không bị ảnh hưởng. Giả thuyết được củng cố; bước (3) sẽ xác nhận dứt khoát.
2. **Quy ước vận hành, chờ Project Owner đồng ý:** khi e2e chạy, không thu nhỏ cửa sổ Electron, không dùng "Show desktop".
3. **Phiên giao diện kế tiếp, chỉ ghi:** harness ghi `isMinimized`, `isVisible`, `visibilityState` cạnh mỗi lần chụp trong nhật ký thời gian chụp ảnh. — **plan phiên 27** (việc 2).
4. **Chỉ khi (3) xác nhận:** Project Owner quyết harness có tự `restore()` cửa sổ trước khi chụp (và ghi lại mỗi lần phải làm vậy) hay chỉ dựa vào quy ước (2).

**Dữ liệu phiên 27: bước (3) đã làm** (audit phiên 27 §5.1; trace ở `UI/test-results/ui11_traces/`, 10 thư mục, có `INDEX.txt`; lượt e2e kế tiếp sẽ xóa):
- Windows, 29 lượt: 1119 lần chụp có trạng thái cửa sổ; 7 lần hết giờ 30 s. **Cả 7 lần**, đọc ngay trước lệnh chụp: `minimized:true, visible:false`. Không lần hết giờ nào ở cửa sổ không bị thu nhỏ.
- Cơ chế đã rõ: cửa sổ bị thu nhỏ thì lệnh chụp của Playwright chờ khung hình mới mà không có. Ứng dụng thật không bị ảnh hưởng.
- **Nguồn của việc thu nhỏ chưa rõ.** Agent khẳng định không thu nhỏ cửa sổ nào. Không có lệnh thu nhỏ trong mã. Việc thu nhỏ rải rác qua nhiều spec, mỗi spec một cửa sổ mới (lượt `norunner3`: `commission_form`, `commission_list`, `progress_board`). Giả thuyết phù hợp nhất: người dùng máy hoặc Windows, trong lúc lượt chạy (10:16–10:38 ngày 2026-10-03).
- Linux (Orchestrator), 555 lần chụp: lâu nhất 105 ms, không lần nào thu nhỏ.
- **Hỏi Project Owner** (audit phiên 27): trong khoảng 10:15–10:40 ngày 2026-10-03, anh có dùng máy và thu nhỏ cửa sổ hay dùng "Show desktop" không?
- **Bước (4), chờ Project Owner quyết:**
  - **A (Orchestrator khuyến nghị):** harness, trước mỗi lần chụp, nếu cửa sổ đang thu nhỏ thì gọi `restore()`, ghi một dòng `restored` vào nhật ký, rồi chụp. Chỉ ở công cụ kiểm thử; không che lỗi sản phẩm, vì ứng dụng thật không chụp ảnh và thu nhỏ không làm ứng dụng hỏng.
  - **B:** chỉ giữ quy ước không thu nhỏ. Dữ liệu phiên 27 cho thấy quy ước không giữ được e2e tất định khi máy có người dùng.
- **Tiêu chí đóng (đề xuất, thay tiêu chí cũ):** sau khi áp quyết định (4), 10 lượt e2e liên tiếp trên Windows không hết giờ chụp ảnh.

**Trả lời và quyết định của Project Owner, 2026-10-03:**
- Trong lúc agent chạy e2e, Project Owner vẫn dùng máy; cửa sổ ứng dụng bật lên liên tục nên Project Owner tiện tay thu nhỏ. **Nguồn của việc thu nhỏ đã rõ**; cơ chế đã chứng minh ở phiên 25 và 27. Nguyên nhân UI-11 coi như đã biết.
- **Chọn A:** công cụ kiểm thử tự mở lại cửa sổ bị thu nhỏ và ghi lại mỗi lần. Quy ước "không thu nhỏ khi e2e chạy" bỏ: người vận hành được dùng máy bình thường.
- Lưu ý từ dữ liệu phiên 27: một lần hỏng ở mốc đầu phiên là `locator.click` không thấy nút (không phải chụp ảnh), cũng trong lượt có cửa sổ thu nhỏ. Vậy cửa sổ thu nhỏ có thể làm treo cả thao tác khác chứ không chỉ chụp ảnh; cách làm phải phủ mọi thao tác, không chỉ lệnh chụp.
- **Tiêu chí đóng:** 10 lượt `npm run e2e` liên tiếp trên Windows đạt, trong lúc người vận hành dùng máy bình thường, nhật ký cho biết số lần phải mở lại cửa sổ.

**Ghi nhận thêm, không phải UI-11 (Q22-2, thấp, không vá ở V1):** ở múi giờ có giờ mùa hè, giờ "không tồn tại" trong khoảng nhảy giờ (ví dụ 02:30 ngày đổi giờ ở New York) được ghép với độ lệch sau khi đổi. Việt Nam không có giờ mùa hè.

### UI-12 — Ca focus `StageChange.test.tsx:183` không tất định trên Windows (thấp; audit phiên 24 §5.4) — **plan phiên 25**

> **ĐÃ ĐÓNG 2026-10-01, phiên 25** (`coding-agent@2026-10-01#1`). Nguyên nhân: kit đặt focus trong `useEffect` (`SelectField.tsx:40`, `ConfirmPanel.tsx:32`), còn hai khẳng định ở `StageChange.test.tsx` (dòng 183, 262 cũ) không chờ. Sửa: `await vi.waitFor(...)`, chỉ ở kiểm thử. Agent: trước 3/50 hỏng, sau 0/50 trên Windows. Orchestrator: 0/50 trên Linux; làm focus đến chậm 40 ms thì kiểm thử cũ hỏng, kiểm thử mới đạt; bỏ hẳn focus thì kiểm thử mới hỏng (`.reviews/audits/ui/audit_ui_session25.md` §3).

Hỏng một lần ở phiên 22 và một lần ở lần chạy mốc của phiên 24, đều trên Windows. Orchestrator chạy 20 lần trên Linux, không lần nào hỏng. Việc: đọc ca này, tìm chỗ phụ thuộc thời điểm (focus sau khi vẽ lại), sửa kiểm thử hoặc mã nếu thấy lỗi thật; không thêm `retries`, không nới thời gian chờ. **Tiêu chí đóng:** chạy riêng tệp này 50 lần liên tiếp trên Windows không hỏng.

## Layer giao diện — sau audit phiên 27

### UI-13 — Lỗi "trùng mốc" nhảy sang dòng khác sau "Bỏ mốc này" (thấp; audit phiên 27 §5.3) — **plan phiên 28** (việc 3)

Trang `reminder_settings` gắn lỗi của form theo vị trí dòng mốc (`deadline.lead_times.<i>`) và giữ lỗi tới lần lưu kế tiếp. Tái hiện bằng kiểm thử dựng trang tạm của Orchestrator:
1. ba dòng [1 ngày, 24 giờ, 5 ngày];
2. lưu: lỗi "Mốc nhắc này trùng với một mốc khác" ở dòng 2;
3. bỏ dòng 1: còn [24 giờ, 5 ngày], hết trùng;
4. kết quả: câu lỗi hiện dưới dòng "5 ngày".

Hết khi lưu lại; không mất dữ liệu, không gửi sai.

**Việc:** khi thêm hoặc bỏ một dòng mốc, bỏ các lỗi đang gắn với dòng mốc. Agent chọn chỗ sửa theo iWCA và ghi lý do.

**Tiêu chí đóng:** một kiểm thử dựng trang tái hiện đúng bốn bước trên, hỏng trước khi sửa và đạt sau khi sửa.

Không chặn `hoàn_tất` của `reminder_settings`.

### UI-14 — Ô giờ hiện kiểu 12 giờ có SA/CH trên Windows (thấp; audit phiên 27 §5.2)

> **ĐÃ ĐÓNG 2026-10-03** (sau audit phiên 27). Project Owner xác nhận đồng hồ máy hiện "11h53 SA", tức máy đặt giờ kiểu 12 giờ: ô giờ gốc theo đúng cài đặt của người dùng. V1 chấp nhận; việc đồng nhất kiểu giờ chuyển sang UI-6 (phần V2).


- **Windows:** ô "Vào lúc" (`reminder_settings`, `<input type="time">`) hiện `08:15 SA`; ô "Ngày giờ nhận tiền" (`payment_form`, `datetime-local`) hiện `03/10/2026 10:38 SA`.
- **Linux, cùng bản build và `--lang=vi`:** ô "Vào lúc" hiện `08:15` (24 giờ).
- Vậy định dạng đến từ phía Windows, nhiều khả năng là định dạng giờ ngắn trong cài đặt vùng. Orchestrator không nắm chắc cơ chế của Chromium trên Windows.
- Giá trị lưu vẫn là `HH:MM`, dữ liệu đúng. Chỉ khác chữ giờ 24 giờ ở các chỗ khác, ví dụ "Lưu lần cuối lúc 10:20".

**Hỏi Project Owner:** trong Windows Settings → Time & language → Language & region → Regional format, giờ ngắn (Short time) đang là 12 giờ hay 24 giờ?

**Đề xuất:** V1 chấp nhận, vì ô gốc theo cài đặt của chính người dùng. Muốn đồng nhất thì làm ở V2, bằng hai ô chọn giờ và phút, và chuyển mục này sang UI-6.

### UI-15 — Dữ liệu mẫu D6 phải chịu được `reminder_ticker` (trung bình; điều kiện trước của DSK-17; phát hiện khi lập plan phiên 28) — **plan phiên 28** (việc 4)

`seedReminderSample` (`UI/tests/tools/walkthrough_lib.mjs`) gọi `POST /reminders/checks` một lần rồi đòi kết quả có **đúng hai** nhắc việc. Theo hợp đồng, mỗi nhắc việc đến hạn chỉ được trao ra **một lần** (`send_reminder.description`). Khi desktop có `reminder_ticker` (DSK-17), ticker trong ứng dụng mà e2e mở cũng gọi `check_due` theo nhịp, và có thể nhận trước một hoặc cả hai nhắc việc. Khi đó lần gọi của công cụ nhận ít hơn hai, và `reminder_list_walkthrough.spec`, cùng `npm run walkthrough:app -- --reminders`, hỏng không tất định.

**Việc:** công cụ kiểm thử vẫn gọi `check_due` như cũ, nhưng điều nó khẳng định là **danh sách đang chờ** (`GET /reminders/pending`) có đúng hai nhắc việc mong đợi, không phụ thuộc bên nào đã nhận chúng trước. Kịch bản và ảnh bằng chứng không đổi.

**Tiêu chí đóng:** một kiểm thử của công cụ (hoặc một lần chạy có chủ đích) cho thấy: khi nhắc việc đã bị một lời gọi `check_due` khác nhận trước, dữ liệu mẫu vẫn đạt; trước khi sửa thì hỏng.

## Môi trường và vận hành (không phải việc của coding agent)

- **ENV-1** (Project Owner): thêm vĩnh viễn `%SystemRoot%\System32\WindowsPowerShell\v1.0\` vào `Path` của System variables. **Đã làm, 2026-09-27.**
- **ENV-2** (Project Owner): thêm hai thư mục vào **ngoại lệ theo thư mục** (Exceptions) của AVG, không phải Allow App, và của ReasonLabs (RAV, loại rule `Folder`): `Desktop\release` và `Desktop\packaging\stage`. Không đặt ngoại lệ rộng hơn hai thư mục này; không dùng rule theo `Process` hay `Extension`. **Đã làm ở cả AVG lẫn RAV, 2026-09-27; cả hai vẫn bật.** Lỗi `EPERM` khi đổi tên `win-unpacked.tmp` biến mất khi tắt AVG, tức AVG là nguyên nhân.
- **ENV-3** (Orchestrator): không liệt kê hay đọc vào bên trong tệp `.asar` qua ứng dụng Claude trên máy Project Owner. Ứng dụng đó giữ tệp mở, và việc này đã gây ra lỗi `EBUSY` lúc 19:15 ngày 2026-09-27.
- **ENV-5 — ĐÃ LÀM 2026-09-28.** Kết quả và cách đọc ở `.reviews/runbooks/env4_env5_runbook.md`. Đóng DSK-2; xác nhận lại DSK-3. *Nội dung gốc:* (Project Owner) đo lại đợt C bằng công cụ đã sửa, theo các lệnh ở mục 7 của báo cáo phiên 14 (log nay được giữ ở `Desktop/startup-logs/`).
  - Đo với cả hai antivirus bật, rồi lần lượt tạm dừng AVG, rồi tạm dừng ReasonLabs.
  - Mục đích: xác nhận lại H1 bằng log được lưu, và biết bên nào tạo bản sao (Q14-1).
- **ENV-4** (Project Owner): chạy tay trên máy bạn của Project Owner, là tiêu chí 1 của chặng C. **Còn mở**; quy trình chi tiết ở `.reviews/runbooks/env4_env5_runbook.md`. Đây là việc duy nhất còn lại của chặng C. Ghi lại thời gian chờ ở lần mở đầu.
- **ENV-6** — **ĐÃ LÀM 2026-09-28.** Project Owner khởi tạo git và đẩy lên GitHub: `https://github.com/Super-Muscle-Coder/CommissionTracker` (public). Hai commit đầu: `9f5218a` (`.gitattributes` với `* text=auto`, `.gitignore` mẫu Visual Studio), `2c10b9a` (toàn bộ dự án). Orchestrator đã clone và kiểm: 298 tệp; hợp đồng 8.0.0; mã `UI/` và `Backend/` khớp đúng từng tệp với bản trên đĩa; không có thư mục build, môi trường ảo hay tệp lớn; không có thông tin bí mật. **Còn thiếu ba dòng trong `.gitignore` gốc**, vì `Backend/env/`, `Backend/.pytest_cache/` và `Desktop/startup-logs/*.json` hiện **không** bị bỏ qua: một lệnh `git add .` sau này sẽ đưa cả môi trường ảo Python lên kho. Cách làm: Project Owner thêm ba dòng `Backend/env/`, `.pytest_cache/`, `Desktop/startup-logs/` vào `.gitignore` gốc rồi commit. *Nội dung phát hiện ban đầu:* **dự án chưa có quản lý phiên bản.** Không có `.git` ở `E:\CommissionTracker` hay ở `E:\`. Mọi phiên coding agent sửa tệp trực tiếp, không có mốc để quay lại hay so sánh. Các tệp `.gitignore` trong `UI/` và `Desktop/` hiện chưa có tác dụng gì.
  - **Đề xuất:** khởi tạo git ở gốc dự án, kèm hai tệp đặt ngay từ đầu:
    - `.gitignore` chung (thư mục build, `node_modules`, môi trường ảo, cache, `startup-logs/`, kết quả kiểm thử);
    - `.gitattributes` (`* text=auto`), để giải quyết UI-7.
  - Sau đó **mỗi phiên đã audit đạt là một commit** do Project Owner tạo.
  - DSK-10 được giải quyết luôn trong `.gitignore` chung.
  - Chờ Project Owner quyết. Orchestrator soạn sẵn hai tệp cấu hình và các lệnh khi được yêu cầu.
- **ENV-7** (Orchestrator, thấp; audit phiên 27 §5.5): `npm audit` báo lỗ hổng mới, chỉ ở công cụ phát triển.
  - UI: 5 lỗ hổng mức high, cùng một chuỗi `stylelint → globby → fast-glob → micromatch → braces` (GHSA-vfj7-8cjw-p6xm).
  - Desktop: 8 lỗ hổng mức high (ví dụ `http-cache-semantics`, GHSA-ch52-4w7c-c8xp).
  - `npm audit --omit=dev` ở cả hai layer: 0. `package-lock.json` không đổi từ phiên trước: đây là cảnh báo mới được công bố, không phải phụ thuộc mới.
  - Không chạy `npm audit fix --force` (đổi phiên bản phá vỡ, ví dụ hạ `stylelint`). Rà lại trước chặng G; nếu khi đó có bản vá không phá vỡ thì đưa vào một phiên riêng.

## Rà soát toàn bộ checkpoint — 2026-09-28 (trước phiên 18)

- **Backend** (Main và 8 khối workflow): không có `UNSOLVED_PROBLEMS`, không có NOTE nào.
- **Giao diện** (5 khối): không có `UNSOLVED_PROBLEMS`. Các NOTE còn lại đều là ghi chú còn giá trị (cách chạy, việc tương lai của `ipc_bridge`, đề xuất trạng thái đã được xử lý).
- **Desktop** (Main): còn **`main-PROB-001`** trong `UNSOLVED_PROBLEMS`, và một NOTE ghi watermark là "V2". Xem DSK-12.

### DSK-12 — Dọn checkpoint Main desktop (thấp) — **plan phiên 26**

> **ĐÃ ĐÓNG 2026-10-02, phiên 26** (`coding-agent@2026-10-02#1`). `main-PROB-001` → `main-EXP-019` (`derived_from`); `UNSOLVED_PROBLEMS: []`; không còn "V2" gắn với watermark; NOTE phiên 13 bị xóa, lý do ở `main-EXP-023` (`.reviews/audits/desktop/audit_desktop_session26.md`).

- `main-PROB-001` (bản sao do antivirus chạy) nay đã có hướng xử lý ở mọi mặt, nên chuyển thành EXPERIENCES và dẫn nguồn. Đây cũng là nơi ghi kết quả ENV-5: giữ 75 s; không thấy bản sao trong 15,9 s quan sát được, trước khi AVG chặn tiến trình theo dõi (DSK-14); bản thật chạy đúng với khóa của phiên 15. Các nguồn:
  - rủi ro dữ liệu: đã chặn bằng khóa backend (BE-3, Data Schema 6.2.0);
  - độ trễ lần mở đầu: đã chẩn đoán xong, hướng xử lý là ký số ở chặng G (DSK-3, DSK-9);
  - việc đo lại: ENV-5.
- NOTE "Dịch vụ AI không được khởi động ở V1 (watermark để dành V2)": sửa thành "V4 trở đi", theo `.design/product_versions.md`.
- NOTE "Cách làm của phiên 13 so với plan": chuyển thành EXPERIENCES nếu còn giá trị, hoặc xóa.

### DSK-13 — Hộp thoại lỗi của desktop viết bằng tiếng Anh kỹ thuật (thấp) — **ĐÃ DUYỆT 2026-09-28**, **plan phiên 26**

> **ĐÃ ĐÓNG 2026-10-02, phiên 26.** Câu tiếng Việt trong `configs/desktop.json` (`main.error_dialog`, hai trường hợp: khởi động và đang chạy), chi tiết kỹ thuật ở dòng sau, dòng `FATAL:` không đổi; có ca kiểm thử, phép cắn và ảnh hộp thoại thật. Câu cuối dùng "gửi nội dung chi tiết bên dưới" thay cho "gửi tệp nhật ký" (ứng dụng không ghi tệp nhật ký) (`.reviews/audits/desktop/audit_desktop_session26.md`).

> Project Owner: ứng dụng phục vụ cộng đồng họa sĩ Việt, nên V1 dùng **tiếng Việt**. Tiếng Anh (hay đa ngôn ngữ) bàn ở phiên bản sau; đặt câu chữ trong `configs/desktop.json` giúp việc đó rẻ về sau.

`fatal()` hiện đưa thẳng thông điệp kỹ thuật lên hộp thoại. Ví dụ: "The backend could not start after 3 attempts (last: …)", "The backend stopped unexpectedly (exit code 0). The app will close."

Họa sĩ là người Việt, và giao diện V1 dùng nhãn tiếng Việt (`ui_decomposition.md` §7.2, nguyên tắc 3).

**Đề xuất rẻ:**
- hộp thoại hiện một câu tiếng Việt dễ hiểu và việc người dùng nên làm, ví dụ "Commission Tracker không khởi động được. Hãy đóng ứng dụng rồi mở lại; nếu vẫn lỗi, gửi tệp nhật ký cho người hỗ trợ.";
- chi tiết kỹ thuật giữ ở dòng thứ hai;
- dòng log `FATAL:` giữ tiếng Anh như cũ, vì kiểm thử so trên dòng đó.

Câu chữ đặt trong `configs/desktop.json`.

### DSK-14 — AVG chặn công cụ đo `measure_startup.cjs` (thấp; phát hiện ở ENV-5, 2026-09-28) — **plan phiên 26**

> **ĐÃ ĐÓNG PHẦN MÃ 2026-10-02, phiên 26.** `measure_startup.cjs` ghi script ra `.ps1` tạm (có BOM) và chạy bằng `-File`, xóa khi xong; 3 lượt đo trên bản dựng cuối khi AVG bật, tiến trình theo dõi sống tới cuối. **ĐÃ ĐÓNG HẲN 2026-10-02:** Project Owner xác nhận không có cảnh báo nào của AVG hay ReasonLabs trong suốt phiên 26 (`.reviews/audits/desktop/audit_desktop_session26.md`).

**Hiện tượng:** AVG Behavior Shield chặn `powershell.exe` với nhận dạng `IDP.HELU.PSE91 - Command line detection`. Project Owner có ảnh chụp cảnh báo.

**Nguyên nhân gần như chắc chắn:** tiến trình theo dõi của `tests/packaged/measure_startup.cjs` (khoảng dòng 80) chạy `powershell.exe -NoProfile -NonInteractive -EncodedCommand <base64>`. Trong lượt 1 của ENV-5, ảnh chụp tiến trình dừng ở +15,9 s và không chạy lại.

**Phạm vi:**
- Chỉ ảnh hưởng **công cụ đo**, không ảnh hưởng ứng dụng. Main desktop chỉ chạy `python.exe`, không gọi PowerShell.
- `tests/helpers.ts` gọi PowerShell bằng `-Command` thường, chưa thấy bị chặn.

**Đề xuất:** viết script theo dõi ra một tệp `.ps1` tạm, rồi chạy bằng `-File`, hoặc dùng cùng cách gọi `-Command` như `tests/helpers.ts`. Không dùng `-EncodedCommand`.

**Không** thêm ngoại lệ antivirus cho `powershell.exe`: đó là ngoại lệ quá rộng cho máy của Project Owner.

Chưa rõ AVG chặn lúc build hay lúc đo; lịch sử cảnh báo của AVG ghi giờ chính xác. Theo log, tiến trình theo dõi dừng khoảng 21:06:43.

## Quyết định của Project Owner — 2026-09-28, trước phiên 18

- **Not blank ở backend:** mỗi workflow tự có hàm kiểm riêng, theo tiền lệ `_ID_PATTERN`; không tạo `Backend/shared/`. Đã ghi vào `.plan/backend_plan.md`.
- **Độ dài tối đa đếm trên giá trị gốc**, kể cả khoảng trắng hai đầu: giữ nguyên như hợp đồng.
- **DSK-13:** hộp thoại lỗi desktop bằng tiếng Việt ở V1.
- **Thứ tự:** sau phiên 18 là **D2 (đơn hàng)**. Phiên desktop dọn dẹp (DSK-12, DSK-13) gộp với lần đo lại, nếu cần build lại.
- **Văn bản tùy chọn để trống** (`description`, `commission_type` và các trường `string|null` khác): giao diện gửi `null`, là quy tắc `[UI-ONLY]` như ô ghi chú khách hàng. Không sửa hợp đồng. Ghi vào I1 của D2.

### DSK-15 — Ô ngày của giao diện hiện kiểu tháng/ngày/năm (**trung bình** từ 2026-10-01; trước đó thấp; Q19-2 của audit phiên 19) — **plan phiên 26** (`.plan/desktop_plan.md`, phát hành 2026-10-01), trước D6

> **ĐÃ ĐÓNG 2026-10-02, phiên 26.** `app.locale: "vi"` trong config; Main gọi `app.commandLine.appendSwitch('lang', …)` trước `whenReady`. Đo: `getLocale()` `en-US` → `vi`; ô "Hạn giao" `11/30/2026` → `30/11/2026`, hai ô của "Thu nhập" cũng ngày/tháng/năm, trên bản mã nguồn và bản đóng gói (ảnh ở `Desktop/evidence/dsk15/`). Ca kiểm thử 12 hỏng khi bỏ dòng đặt ngôn ngữ. Ảnh có ô ngày trong `UI/evidence` cần làm mới ở phiên giao diện kế tiếp (`.reviews/audits/desktop/audit_desktop_session26.md`).

> **Nâng mức 2026-10-01** (audit phiên 24 §5.3): trang `income_report` đặt ô "Từ ngày" `10/01/2026` (tháng/ngày) ngay trên dòng báo cáo "Từ 01/08/2026 …" (ngày/tháng). Họa sĩ đọc `10/01/2026` thành 10 tháng 1, nên có thể chọn sai khoảng và đọc sai báo cáo. Tiêu chí đóng thêm: hai ô ngày của `income_report` hiện kiểu ngày/tháng/năm.

Ô "Hạn giao" (`<input type="date">`) hiện `11/30/2026`, trong khi trang chi tiết và danh sách hiện `30/11/2026`. Nguyên nhân: locale của Electron đang là `en-US`, và giao diện không đổi được định dạng ô ngày gốc.

**Hướng xử lý:** desktop Main đặt ngôn ngữ ứng dụng là tiếng Việt trước sự kiện `ready`, và giá trị đó nằm trong `configs/desktop.json`. Orchestrator chưa kiểm cách nào của Electron 44 thật sự đổi được định dạng ô ngày; phiên desktop phải đo trên máy thật, có ảnh chụp trước và sau.

**Tiêu chí đóng:** ô "Hạn giao" hiện `30/11/2026` trên bản chạy từ mã nguồn và trên bản đóng gói; kiểm thử của Desktop vẫn đạt.
