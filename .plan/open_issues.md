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

### DSK-17 — `reminder_ticker` chưa có (trung bình; thuộc V1, chặng D6) — **phiên desktop 30**, sau phiên giao diện 29 (Project Owner chọn 2026-10-04)

> **ĐÃ ĐÓNG 2026-10-05, phiên 30** (audit `.reviews/audits/desktop/audit_desktop_session30.md`). `Desktop/src/cross_cutting/reminder_ticker/`; 12 ca kiểm thử, ba phép cắn tái lập trên Linux; Project Owner xác nhận toast thật, bấm thì cửa sổ lên trước, nhắc việc còn trong danh sách. AUMID chỉ đặt ở bản đóng gói (số đo: AUMID không đăng ký làm toast vô hình dù `show` vẫn bắn). Chặng D6 xong hẳn. Việc nhỏ còn lại: DSK-19, DSK-20.

Theo API Contract 4.0.0 (`cross_cutting.reminder_ticker`), desktop Main khởi động `reminder_ticker` sau khi backend READY. Nó gọi `send_reminder.check_due` (`POST /reminders/checks`) theo nhịp riêng, hiện một thông báo Windows cho mỗi nhắc việc trả về (chữ dựng từ các trường của nhắc việc), bấm thông báo chỉ đưa cửa sổ lên trước. Nó không quyết định gì và không đánh dấu đã xem.

Chưa có thành phần này thì trong dùng thật danh sách nhắc việc đang chờ của giao diện (D6, phiên 27) luôn rỗng. Lập plan sau khi audit phiên 27; cần chốt: nhịp gọi, chữ thông báo tiếng Việt (trong `configs/desktop.json`), cách kiểm thử thông báo trên Windows.

**Thứ tự (chốt 2026-10-03, sửa 2026-10-04):** phiên 28 (giao diện) làm UI-15 trước, để e2e của giao diện không hỏng khi ticker xuất hiện (xong). Phiên 29 (giao diện) vá UI-16, UI-17, UI-18 theo lựa chọn của Project Owner ngày 2026-10-04. Phiên 30 (desktop) làm DSK-17.

> **Plan phiên 30 đã phát hành 2026-10-04** (`.plan/desktop_plan.md`, việc 2 và 4). Đặc tả dưới đây đã được chốt trong plan, mục "ĐẶC TẢ ĐÃ CHỐT"; chỗ nào khác thì theo plan.

**Đặc tả dự kiến cho phiên 30** (Orchestrator, 2026-10-03; chốt hẳn khi viết plan phiên 30):
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


### DSK-18 — Cửa sổ ứng dụng giành tiêu điểm khi khởi động trong e2e (trung bình; audit phiên 29 §5.1) — **plan phiên 30** (việc 3)

> **ĐÃ ĐÓNG 2026-10-05, phiên 30.** Cờ `--ct-test-show-inactive` (chỉ bản chạy từ mã nguồn; bản đóng gói bỏ qua, P7). Có cờ: `isFocused()` false 5/5 (Windows) và 3/3 (Linux, Orchestrator); không cờ: true. Bước giao diện: UI-18.

> **Project Owner chọn phương án A, 2026-10-04.** Đặc tả chốt ở `.plan/desktop_plan.md` (phiên 30), mục "ĐẶC TẢ ĐÃ CHỐT": cờ `--ct-test-show-inactive`, chỉ cho bản chạy từ mã nguồn.

`Desktop/src/main.ts` tạo `BrowserWindow` hiện ra ngay, nên cửa sổ được kích hoạt. Với người dùng thật, đó là hành vi đúng. Với e2e, mỗi lượt khoảng 16 lần khởi động, mỗi lần có thể giành tiêu điểm và nhận phím người vận hành đang gõ ở ứng dụng khác (UI-18). Agent phiên 29 đo: 2/3 lần khởi động vào nền trước, sau 2,3 s và 3,8 s.

**Phương án:**
- **A (Orchestrator khuyến nghị):** một cờ kiểm thử mới chỉ cho bản chạy từ mã nguồn (ví dụ `--ct-test-show-inactive`): có cờ thì Main tạo cửa sổ với `show: false` rồi `showInactive()` khi sẵn sàng. Hành vi khi người dùng mở ứng dụng không đổi; bản đóng gói bỏ qua cờ như mọi cờ `--ct-test-*` khác. Kiểm thử của Desktop: có cờ thì cửa sổ không lấy tiêu điểm, không cờ thì như cũ. Gộp vào phiên desktop 30 cùng DSK-17. Bước giao diện ghi ở UI-18.
- **B:** chấp nhận ở V1; người vận hành tránh gõ phím ở ứng dụng khác khi e2e chạy.

## Layer desktop — sau audit phiên 30

### DSK-19 — Dọn checkpoint và một ca kiểm thử của phiên 30 (thấp; audit phiên 30 §5.1–5.4) — **plan phiên 33** (mục "Kế thừa")

> **ĐÃ ĐÓNG 2026-10-07, phiên 33** (audit `.reviews/audits/desktop/audit_desktop_session33.md`, §4). Đủ bốn mục: `main-EXP-030` (`derived_from: main-PROB-002`), chữ của `reminder_ticker-EXP-003`, ca D2 chờ `reminder check #1:`.

1. **`main-PROB-001`** (hồ sơ Chromium `%APPDATA%\Commission Tracker` đổi trong phiên 30; thư mục dữ liệu thật không đổi): **Project Owner xác nhận 2026-10-05**: đã tự cài bản mới đè lên bản cũ rồi mở thử, đúng các thời điểm đó. Nguồn là bản cài lỗi (thiếu module ticker, Main ném lỗi trước `setPath`), không phải kiểm thử. Chuyển thành EXPERIENCE, kèm mục 2.
2. **Định danh dùng lại:** `main-EXP-019` có `derived_from: main-PROB-001`, trỏ tới vấn đề cũ của phiên 26; vấn đề mới của phiên 30 lại tên `main-PROB-001`. Đổi vấn đề mới thành `main-PROB-002` (hoặc EXPERIENCE mới có `derived_from: main-PROB-002`).
3. **`reminder_ticker-EXP-003`** ghi "lead không nguyên dương bị coi là sai hình dạng"; mã chấp nhận mọi số nguyên (đúng hợp đồng `amount: integer`). Sửa chữ thành "lead không nguyên".
4. **Ca D2, lượt 1** (`tests/reminder_ticker.spec.ts`): chờ dòng `reminder check #1:` thay vì `reminder ticker started` trước khi tạo dữ liệu, như P8. Hiện có thể hỏng giả khi máy chậm.

### DSK-20 — Bấm toast trong Action Center sau khi toast lui vào đó: chưa đo (thấp; V2; audit phiên 30 §5.7)

Main bỏ tham chiếu tới `Notification` khi nhận `close`, mà agent đo được `close` sau khoảng 9,5 s, lúc toast lui vào Action Center. Bấm ở Action Center sau đó có tới tiến trình hay không: chưa đo. Đặc tả V1 không đòi. Xem lại ở V2, cùng việc đo trên bản cài sạch (ENV-8).

### DSK-21 — Cài bản mới đè lên bản cũ chưa được định nghĩa và chưa được kiểm (trung bình; thuộc V1, chặng G; Project Owner nêu 2026-10-05) — **Project Owner duyệt 2026-10-05**: năm tiêu chí dưới đây vào tiêu chí chặng G (`.plan/v1_roadmap.md`)

Người dùng thật cập nhật bằng cách chạy bộ cài mới; họ không gỡ bản cũ trước. Hiện chưa có quy định hay kiểm thử nào cho việc này.

**Đã biết:**
- `appId` cố định (`com.commissiontracker.desktop`); bộ cài NSIS `oneClick`, theo người dùng; gỡ cài đặt không xóa dữ liệu (`deleteAppDataOnUninstall: false`).
- Dữ liệu ở `%APPDATA%\CommissionTracker`, ngoài thư mục cài, nên bộ cài không đụng tới.
- Mỗi workflow tự nâng cấp cấu trúc bảng (`<workflow>_schema_version`); gặp phiên bản mới hơn bản build hiểu được thì backend dừng, không in `READY` (`CLAUDE.md` mục 5).
- `Desktop/package.json` vẫn là `0.1.0` từ đầu: mọi bộ cài đến nay cùng số phiên bản.
- Lỗi `Cannot find module` ngày 4/10 **không** do cài đè: bộ cài đó thiếu tệp (audit phiên 30 §5.5); cài sạch từ chính bộ cài đó cũng hỏng như vậy.

**Orchestrator chưa nắm chắc** (đo, không đoán): electron-builder 26.15.3 với NSIS `oneClick` xử lý cài đè thế nào (gỡ bản cũ trước hay chép đè, có phát hiện ứng dụng đang chạy không); điều gì xảy ra khi ứng dụng, và `python.exe` của backend, đang mở lúc cài; cài bản cũ hơn đè bản mới có bị chặn không.

**Tiêu chí** (đã đưa vào chặng G):
1. Quy ước số phiên bản: mỗi bản phát hành tăng `version`.
2. Cài N+1 đè N khi ứng dụng **đóng**: không cần gỡ; dữ liệu còn nguyên; ứng dụng mở được; lối tắt Start Menu và toast còn chạy.
3. Cài đè khi ứng dụng **đang mở**: bộ cài báo hoặc tự đóng ứng dụng, không để lại bản cài nửa vời, không có `python.exe` sót.
4. Dữ liệu tạo bởi N, có bước nâng cấp cấu trúc ở N+1: lần mở đầu của N+1 nâng cấp đúng.
5. Cài bản cũ hơn đè bản mới: hoặc bị chặn, hoặc backend dừng có hộp thoại tiếng Việt rõ ràng; không hỏng dữ liệu.

**Ai làm:** cần một máy Windows được phép cài. Plan hiện cấm agent cài bộ cài. Hướng khả dĩ: một runbook để Project Owner chạy tay, gộp với ENV-4 (máy sạch); hoặc một phiên desktop được phép cài trong môi trường cô lập. Windows Sandbox, theo hiểu biết của Orchestrator, không có trên Windows 11 Home; cần kiểm lại. Tự cập nhật (auto-update) vẫn ngoài V1.

## Layer desktop — sau audit phiên 33

### DSK-22 — Hai việc nhỏ của `native_dialogs` (thấp; audit phiên 33 §5.1, §5.2) — làm ở phiên desktop kế tiếp, không mở phiên riêng

> **ĐÃ ĐÓNG 2026-10-08, phiên 35** (audit `.reviews/audits/desktop/audit_desktop_session35.md`): `native_dialogs-EXP-004` thay PROB-001; ca N14 gọi `invoke` lúc nạp, phép cắn làm N14 hỏng ("No handler registered").

1. **`native_dialogs-PROB-001`** (phép cắn (b) bị bộ phân loại quyền chặn): Orchestrator đã chạy phép cắn này trong audit phiên 33, trên bản sao Linux. Bỏ danh sách địa chỉ trong preload thì N2 hỏng ở `dialog:open-file`: spy trong Main nhận lời gọi và trả `{ok: true, value: {status: 200, …}}` thay vì bị từ chối "ipc address not implemented". **Việc:** chuyển mục PROB thành EXPERIENCE (`derived_from: native_dialogs-PROB-001`), ghi số trên làm kết quả, nói rõ Orchestrator chạy trên Linux; `UNSOLVED_PROBLEMS: []`.
2. **Thứ tự đăng ký:** dời `registerNativeDialogs` xuống sau lần nạp đầu mà 9/9 vẫn đạt (phép cắn (g) của Orchestrator). **Việc:** thêm một ca trong đó trang gọi `invoke('dialog:pick-folder', {})` ngay lúc nạp (ví dụ một trang thử riêng, hoặc một tham số của trang thử), rồi khẳng định lời gọi đó có trả lời. Không đổi mã Main.

## Layer desktop — sau audit phiên 35

### DSK-23 — Ứng dụng thoát một lần với mã 0xC0000005 trên trang thử (theo dõi; audit phiên 35 §5.2)

Phiên 35: một lần chạy `npm run probe` thoát với mã 3221225477 (vi phạm truy cập bộ nhớ của tiến trình Electron), ngay sau ba lần hộp thoại chọn tệp **thật** trả "canceled". Log Main không có `FATAL`; các lượt khác của cùng phiên không sập; chưa tái hiện. Đường gọi chỉ có `dialog.showOpenDialog` của Electron. **Việc:** phiên 36 (cũng dùng hộp thoại thật) ghi lại nếu lặp lại; lặp lại thì đo (Windows Event Viewer, mục Application Error; số lần mở và hủy hộp thoại). Không lặp lại tới hết chặng F thì đóng. **Phiên 36 (2026-10-08): không lặp lại** (một lần hộp thoại chọn tệp thật, một lần hộp thoại kết quả thật).

### DSK-24 — Bản sao lưu an toàn tích lũy (thấp; V2; audit phiên 35 §5.4)

Mỗi lần `restore:prepare` thành công tạo thêm một bản sao lưu an toàn trong `safety-backups`; không có gì dọn. Đúng đặc tả V1. **V2:** dọn bản cũ (ví dụ chỉ giữ N bản gần nhất), kèm đặc tả và có thể cả sửa hợp đồng. Trang Khôi phục ở V1 nói rõ mỗi lần chuẩn bị tạo một bản an toàn.

## Layer desktop — sau audit phiên 36

### DSK-25 — Hộp thoại kết quả khôi phục không tự lên trên cùng (trung bình; audit phiên 36 §5.2)

> **ĐÃ ĐÓNG 2026-10-09, phiên 37** (audit `.reviews/audits/ui/audit_ui_session37.md` §5.1). Project Owner mở bản đóng gói bằng lối tắt (`--ct-test-data-dir=C:\ct-owner-f37`): hộp thoại "Khôi phục dữ liệu" hiện trước cửa sổ ứng dụng, có tiêu điểm, Enter đóng được; sau đó ứng dụng mở với dữ liệu của tệp sao lưu. Chỉ khi mở từ một tiến trình khác (script, `npm`) thì hộp thoại không lên trên cùng, và đó không phải cách họa sĩ dùng. Không cần sửa.

`restore_trigger` hiện hộp thoại thông báo khi chưa có cửa sổ ứng dụng; Main chờ hộp thoại đóng rồi mới mở cửa sổ. Đo ở phiên 36: hộp thoại có trên thanh tác vụ nhưng không chiếm tiêu điểm, nên người dùng có thể tưởng ứng dụng không mở. Hai lần đo đều mở ứng dụng từ một tiến trình khác (script, `npm run probe`); chưa đo khi người dùng tự mở bằng lối tắt. **Việc:** đo khi mở bản đóng gói bằng lối tắt hoặc bấm đúp `Commission Tracker.exe` (kèm `--ct-test-data-dir`), ở lần chạy tay của phiên 37 hoặc ở chặng G. Vẫn không lên trên cùng thì phiên desktop kế tiếp sửa và đo lại; Orchestrator đề xuất cách sửa khi có số đo (có thể đổi thứ tự trong `.design/03_classification.md`).

### DSK-26 — Hoàn tác hỏng ở bước đổi tên: câu báo lỗi nói sai, lần mở sau có thể ra cơ sở dữ liệu rỗng (thấp; audit phiên 36 §5.3, §5.4) — phiên desktop kế tiếp

`restore_data` `undo()` trả 500 ở ba chỗ: (1) dời tệp đã chuyển vào sang `-failed`, (2) đưa tệp cũ về `db_file_path`, (3) khởi động lại. Cả ba dùng chung câu `main.error_dialog.restore_failed_summary` ("Dữ liệu trước đó đã được đưa về chỗ cũ"), chỉ đúng với (3). Ở (2), `data.db` không còn ở chỗ cũ; lần mở sau backend tạo cơ sở dữ liệu rỗng, dữ liệu thật nằm trong `restore-previous/` mà không ai báo. Hiếm (đo phiên 36: 0/20 lần đổi tên hỏng), nhưng nặng. Chỗ hở là của đặc tả (`f_restore.md` §3 bước 9 chỉ nói lần khởi động hỏng). **Việc:** Orchestrator bổ sung `f_restore.md` §3 trước (**xong 2026-10-09**: bước 8a–8c, ba câu 9a–9c; plan phiên 38); phiên desktop kế tiếp tách câu báo lỗi theo tình huống (kèm đường dẫn tệp cũ trong `restore-previous`) và thêm một ca kiểm thử cho (2). **Gộp:** xem lại NOTES của Main ghi 2026-09-26, 09-27, 10-05 (hết hạn 14 ngày từ 2026-10-10): chuyển thành EXPERIENCES hoặc xóa.

### DSK-27 — Kiểm thử Desktop chờ một dòng log có thể đã mất (trung bình; audit phiên 36 §5.7) — phiên desktop kế tiếp

`launchMain()` (`Desktop/tests/helpers.ts`) gắn bộ gom log sau khi `_electron.launch` trả về, nên dòng `backend started (pid N)` ghi sớm có thể mất khi máy tải. Các hàm dọn dẹp chờ dòng đó (`closeCleanly()` của `native_dialogs`, `reminder_ticker`, `restore_data`; `backendPids()`) thì hết giờ. Lượt chạy lại của Project Owner ngày 2026-10-08: N14 và D2 hỏng sau khoảng 1 phút dù chức năng đúng; log N14 không có dòng đó. Trên Linux dòng đó luôn mất: đây là nguyên nhân của các ca `desktop_main` hỏng "do môi trường" trong mọi bản audit desktop. **Việc:** lấy PID không qua dòng log sớm (ví dụ `app.evaluate(() => process.pid)` cộng cây tiến trình, hoặc PID trong dòng `backend READY`); chạy `npm test` ba lượt trong lúc máy tải; không nới thời gian chờ.

## Layer giao diện — sau audit phiên 37

### UI-22 — NOTES của khối `main` giao diện sắp hết hạn (thấp; audit phiên 37 §5.2)

Khối checkpoint `main` (`UI/src/main.tsx`) còn sáu NOTES ghi ngày 2026-09-27 (ba), 09-28, 09-29, 10-07; ba NOTES ngày 09-27 hết hạn 14 ngày vào 2026-10-11 (`CLAUDE.md` mục 5). **Việc:** phiên giao diện kế tiếp, hoặc chặng H, xem lại từng NOTE: chuyển thành EXPERIENCES nếu còn giá trị, xóa nếu không.

## Layer backend — sau audit phiên 32

### BE-9 — `wire_workflows(app_version=None)` thì không ráp `backup_data` (thấp; audit phiên 32 §5.4)

Phiên 32 cho `app_version` là tham số từ khóa tùy chọn, vì 20 chỗ gọi `wire_workflows(app, db, configs)` trong kiểm thử của các workflow khác không truyền nó, và agent không được sửa chúng. Quên truyền ở `main()` thì mất hai điểm giao tiếp mà không báo lỗi; kiểm thử tiến trình thật của `backup_data` chặn được điều đó. **Việc:** khi một phiên backend chạm lại các kiểm thử đó, cho chúng truyền `app_version`, rồi bỏ nhánh "không ráp".

## Hợp đồng — chờ Project Owner duyệt

### CT-8 — `restore_data` lên `đã_hoàn_thiện` (đề xuất 2026-10-08, audit phiên 36 §6) — **ĐÃ DUYỆT VÀ GHI 2026-10-09** (Data Schema 10.0.1). Project Owner đặt điều kiện: duyệt nếu hai ca hỏng ở lượt chạy lại (N14, D2) không nghiêm trọng; Orchestrator đánh giá không nghiêm trọng (audit phiên 36 §5.7: chỗ đua của công cụ kiểm thử, chức năng đúng; DSK-27). DSK-26 làm sai một cam kết trong `description` của `restore_data` ("never ends up without a working database") ở một trường hợp chưa từng xảy ra, nên phải đóng trong chặng F

Data Schema 10.0.0 → **10.0.1**, `clause_d_desktop.restore_data.status`: `đang_chờ_triển_khai` → `đã_hoàn_thiện`. Không phá vỡ (chỉ đổi `status`), như CT-6. Lý do: đủ năm lớp; ba lối vào `ipc` và `apply_pending_restore` đúng nhãn; `UNSOLVED_PROBLEMS: []` ở `restore_data`, `restore_trigger`, Main; EVIDENCE tái lập trên Windows và Linux; Project Owner chạy khứ hồi thật. DSK-25, DSK-26 là chuyện bên trong và trình bày, không đổi ranh giới.

### CT-7 — Khôi phục theo hướng B: "chuẩn bị, rồi mở lại để hoàn tất" (đề xuất 2026-10-08; Project Owner chọn hướng B ngày 2026-10-08) — **chờ Project Owner duyệt nội dung**

> **ĐÃ DUYỆT VÀ GHI 2026-10-08:** Project Owner duyệt nội dung; Orchestrator ghi Data Schema 10.0.0 và API Contract 5.0.0, kèm changelog, và sửa `.design/03_classification.md`, bảng §1 của `.design/ui_decomposition.md`.

Đặc tả: `.design/f_restore.md`. Hai tệp đều có thay đổi phá vỡ: bỏ một lối vào và một output đã khai báo.

**Data Schema `9.0.3` → `10.0.0`:**
1. `clause_a_common.types`, thêm:
   `pending_restore_record: "object { archive_path: file_path, archive_app_version: string, archive_created_at: timestamp, safety_backup_path: file_path, prepared_at: timestamp }"`
2. `clause_d_desktop.restore_data.description`, thay bằng:
   "Replaces the live database with a backup archive in two phases. Request (while the app runs): clear any pending restore; ask backup_data to prepare the archive (stop here if it is invalid or incompatible); ask backup_data for a pre-restore safety archive in restore_data's own folder next to db_file_path (stop here if it fails); record the pending restore in restore_data's own file next to db_file_path. The live database and the running backend are not touched. Apply (once per start of the desktop Main, after the backend is ready and before the window opens, when restore_trigger calls): if nothing is pending, do nothing; if the pending record is unreadable or its staged file is gone, discard it; otherwise stop the backend through backend_controller, move the live database file aside (kept), move the staged file into db_file_path, start the backend on the same port and wait for it to be ready. If any step after the stop fails, put the moved-aside file back and start the backend again, so the artist never ends up without a working database. The pending record is removed after every apply attempt. The pending restore can be read and cancelled while the app runs. Operates on whole files only (05-edge-cases.md, Step 5.6)."
3. `restore_data.input_expected`: giữ nguyên (`archive_path`, `restore_staging`, `safety_backup`, `backend_controller`, `db_file_path`, `backend_base_url`).
4. `restore_data.output_guaranteed`: giữ `restore_preparation_request`, `safety_backup_request`; **bỏ** `restore_result`; thêm:
   - `restore_scheduled: { type: pending_restore_record, consumed_by: none }`
   - `restore_status: { type: "object { pending: pending_restore_record|null }", consumed_by: none }`
   - `restore_cancellation: { type: "object { canceled: boolean (true when a pending restore existed and was removed) }", consumed_by: none }`
   - `restore_outcome: { type: "object { outcome: 'none'|'restored'|'rolled_back'|'discarded', archive_path: file_path|null, safety_backup_path: file_path|null, reason: string|null }", consumed_by: [restore_trigger] }`
5. `status` giữ `đang_chờ_triển_khai`.

**API Contract `4.0.0` → `5.0.0`:**
1. `restore_data.endpoints`: **bỏ** `start_restore` (`restore:start`); thêm:
   - `request_restore`: `form: ipc`, `address: "restore:prepare"`, `called_by: [external]`, `input: [archive_path]`, output `200 { ref: restore_scheduled }`, `400 ERR_VALIDATION`, `404 ERR_NOT_FOUND`, `409 ERR_INCOMPATIBLE_BACKUP` (# nothing pending), `424 ERR_STORAGE_IO` (# safety archive failed; nothing pending), `500 ERR_STORAGE_IO` (# pending record not written; nothing pending), `503 ERR_SERVICE_UNAVAILABLE` (# backend not reachable; nothing pending);
   - `get_restore_status`: `ipc`, `"restore:status"`, `[external]`, `input: none`, `200 { ref: restore_status }`, `500 ERR_STORAGE_IO`;
   - `cancel_restore`: `ipc`, `"restore:cancel"`, `[external]`, `input: none`, `200 { ref: restore_cancellation }`, `500 ERR_STORAGE_IO`;
   - `apply_pending_restore`: `form: in_process`, `address: "apply_pending_restore"`, `called_by: [restore_trigger]`, `input: none`, `200 { ref: restore_outcome }`, `500 ERR_RESTORE_FAILED` (# the put-back database could not be started; the desktop Main stops with its start-up failure dialog).
2. `clause_a_common.cross_cutting`, thêm:
   ```
   restore_trigger:
     layer: clause_d_desktop
     trigger: "Once per start of the desktop Main, after the backend is ready and restore_data is wired, before the window opens; the Main waits for it."
     description: "Calls restore_data.apply_pending_restore. When the outcome is not 'none', shows one operating-system message box whose text is built from the outcome fields. Decides nothing."
   ```
3. `error_codes.ERR_RESTORE_FAILED.meaning`, đổi thành: "Applying a pending restore failed and the previous database was put back; or putting it back failed too (the app stops)". Chỉ sửa chữ.

**Bên bị ảnh hưởng:** chưa có code nào dùng `restore:start` hay `restore_result` (`restore_data` chưa triển khai). Giao diện chưa gọi gì của `restore_data`.

**`.design/03_classification.md`** sửa theo, sau khi duyệt: thêm `restore_trigger`, và thứ tự ráp nối của desktop (backend `READY` → ráp `restore_data` → `restore_trigger` → mở cửa sổ).

### CT-6 — `backup_data` lên `đã_hoàn_thiện` (đề xuất 2026-10-07, audit phiên 32 §6) — chờ Project Owner duyệt

> **ĐÃ ĐÓNG 2026-10-07:** Project Owner duyệt; Orchestrator ghi Data Schema 9.0.3 kèm changelog.

Data Schema `9.0.2` → `9.0.3`: chỉ đổi `clause_b_backend.backup_data.status` từ `đang_chờ_triển_khai` sang `đã_hoàn_thiện`. Không đổi hình dạng hay luật, nên là bản vá.

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

> **ĐÃ ĐÓNG 2026-10-04, phiên 28** (`coding-agent@2026-10-03#2`; `.reviews/audits/ui/audit_ui_session28.md`). Nguyên nhân: cửa sổ Electron bị người vận hành thu nhỏ trong lúc e2e chạy; cửa sổ thu nhỏ không vẽ khung hình mới nên lệnh chụp và cả cú bấm của Playwright chờ tới hết giờ. Sửa (phương án A): `UI/tests/tools/window_guard.mjs` gắn trình nghe `minimize` trong tiến trình chính, gọi `restore()` và ghi `test-results/window-restore.log`. Windows: probe tắt cơ chế 6/20 và 12/20 treo, bật 0/20; 10 lượt e2e liên tiếp đạt trong lúc Project Owner dùng máy, 7 lần mở lại. Orchestrator (Linux, icewm): cơ chế mở lại đúng; hai lượt e2e có vòng lặp thu nhỏ mỗi 9 s đạt 70/70, 35 lần mở lại. Phần còn hở: `main_layout.spec.ts` chưa gắn cơ chế (UI-17).

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

> **ĐÃ ĐÓNG 2026-10-04, phiên 28.** Hàm thuần `dropLeadTimeErrors` ở Services của `send_reminder`; hook gọi khi thêm hay bỏ dòng mốc. Kiểm thử dựng trang hỏng trước, đạt sau; phép cắn của Orchestrator ở hook và Services đều làm kiểm thử hỏng. Project Owner bấm tay ngày 2026-10-04: đúng.

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

> **ĐÃ ĐÓNG 2026-10-04, phiên 28.** `seedReminderSample` khẳng định trên `GET /reminders/pending`; ca tất định `UI/tests/e2e/reminder_seed_ticker.spec.ts` (một lời gọi `check_due` đóng vai ticker). Phép cắn của Orchestrator: khẳng định cũ thì ca hỏng ("check_due produced 0"). DSK-17 không còn bị chặn.

`seedReminderSample` (`UI/tests/tools/walkthrough_lib.mjs`) gọi `POST /reminders/checks` một lần rồi đòi kết quả có **đúng hai** nhắc việc. Theo hợp đồng, mỗi nhắc việc đến hạn chỉ được trao ra **một lần** (`send_reminder.description`). Khi desktop có `reminder_ticker` (DSK-17), ticker trong ứng dụng mà e2e mở cũng gọi `check_due` theo nhịp, và có thể nhận trước một hoặc cả hai nhắc việc. Khi đó lần gọi của công cụ nhận ít hơn hai, và `reminder_list_walkthrough.spec`, cùng `npm run walkthrough:app -- --reminders`, hỏng không tất định.

**Việc:** công cụ kiểm thử vẫn gọi `check_due` như cũ, nhưng điều nó khẳng định là **danh sách đang chờ** (`GET /reminders/pending`) có đúng hai nhắc việc mong đợi, không phụ thuộc bên nào đã nhận chúng trước. Kịch bản và ảnh bằng chứng không đổi.

**Tiêu chí đóng:** một kiểm thử của công cụ (hoặc một lần chạy có chủ đích) cho thấy: khi nhắc việc đã bị một lời gọi `check_due` khác nhận trước, dữ liệu mẫu vẫn đạt; trước khi sửa thì hỏng.

## Layer giao diện — sau audit phiên 28

### UI-16 — `main.test.tsx` hỏng ngắt quãng trên Windows khi máy tải (trung bình; audit phiên 28 §5.1) — **plan phiên 29** (việc 4)

> **ĐÃ ĐÓNG 2026-10-04, phiên 29** (`coding-agent@2026-10-04#1`; `.reviews/audits/ui/audit_ui_session29.md`). `beforeAll` nạp trước `src/main` một lần (giới hạn riêng 60 s); ca đầu từ ~1000 ms xuống ~100 ms; `npm run check` 10/10 lần liên tiếp trên Windows khi máy dùng bình thường. Phép cắn của Orchestrator (biến đổi `src/main.tsx` chậm 7 s): tệp mới 17/17, tệp cũ 16/17 hỏng.

Ca "no bridge on the global object" (ca đầu của `UI/tests/main/main.test.tsx`) hết giờ 5 s ở 3 trong 5 lần `npm run check` lúc máy Project Owner đang tải; chạy riêng thì đạt. Ca đầu là nơi nạp lần đầu toàn bộ `src/main.tsx` và mọi workflow, nên phải trả chi phí biến đổi mã; chi phí này tăng theo mỗi workflow mới. Linux (Orchestrator): 0,9–1,2 s, kể cả khi máy tải; không tái hiện được.

**Việc:** tách chi phí nạp mã khỏi ca kiểm thử (ví dụ nạp trước cây mô-đun một lần trong `beforeAll`), để không ca nào trả chi phí đó trong giới hạn 5 s. Không nới thời gian chờ, không `retries`.

**Tiêu chí đóng:** `npm run check` 10 lần liên tiếp đạt trên Windows khi máy đang dùng bình thường.

### UI-17 — Dọn dẹp sau phiên 28 (thấp; audit phiên 28 §5.2, §5.3) — **plan phiên 29** (việc 3, 5)

> **ĐÃ ĐÓNG 2026-10-04, phiên 29.** `main_layout.spec.ts` gắn cơ chế mở lại cửa sổ; NOTES cũ đã dọn (`main` xóa 2, `screens` xóa 4; nội dung còn giá trị ở `main-EXP-029`, `screens-EXP-048`).

- `UI/tests/e2e/main_layout.spec.ts` tự mở Electron, không qua `launch()` của harness, nên chưa gắn cơ chế mở lại cửa sổ (UI-11). Gắn cùng cơ chế sau `firstWindow()` của spec đó.
- NOTES cũ trong checkpoint: `screens` còn ba NOTES của phiên 21, 22 (đề xuất trạng thái đã thực hiện, sự cố quy trình); `main` còn NOTE về `StageChange.test.tsx:183` (UI-12, đã đóng). Chuyển phần còn giá trị sang EXPERIENCES, xóa phần còn lại, theo Giao thức 07.

### UI-18 — Cửa sổ e2e được mở lại thì giành tiêu điểm của người đang dùng máy (trung bình; audit phiên 28 §5.4) — **plan phiên 29** (việc 2); phần còn lại: **plan phiên 31** (việc 2)

> **ĐÃ ĐÓNG HẲN 2026-10-05, phiên 31** (audit `.reviews/audits/ui/audit_ui_session31.md`). Harness e2e và `main_layout.spec.ts` truyền `--ct-test-show-inactive`, trừ chế độ ghi bằng chứng; `walkthrough_app.mjs` không đổi. Project Owner xác nhận không còn bị giành sau 10 lượt e2e. Quan sát còn lại: UI-20.

> **Phần mở lại cửa sổ ĐÃ ĐÓNG 2026-10-04, phiên 29:** `window_guard.mjs` dùng `showInactive()` thay `restore()`. Đo trên Windows, 20 lần mỗi cách, một tiến trình khác giữ nền trước: `restore()` giành nền trước 18/20, `showInactive()` 0/20, hết thu nhỏ, không treo. **Phần còn lại vẫn mở:** Project Owner vẫn bị giành tiêu điểm trong 10 lượt e2e. Nguồn chính là lúc ứng dụng khởi động (mỗi spec một cửa sổ mới, hiện ra kích hoạt; agent đo 2/3 lần khởi động vào nền trước), nằm ở `Desktop/`: xem **DSK-18**. DSK-18 đã có cờ `--ct-test-show-inactive` (phiên 30, đóng 2026-10-05). Phiên giao diện kế tiếp, cùng với UI-19, thêm cờ đó vào `launchArgs` của công cụ kiểm thử và vào `main_layout.spec.ts`; tiêu chí đóng: Project Owner xác nhận không còn bị giành tiêu điểm sau 10 lượt e2e. Ghi chú: trên Linux với icewm, `showInactive()` không đưa cửa sổ khỏi trạng thái thu nhỏ; vô hại vì Linux không treo.

Cơ chế của UI-11 (`UI/tests/tools/window_guard.mjs`) gọi `restore()`. Project Owner xác nhận ngày 2026-10-04: trên Windows, cửa sổ bật lại **và lấy tiêu điểm**, nhảy lên trên ứng dụng đang dùng. Linux (Orchestrator, icewm) cũng thấy `focused: true` sau mỗi lần mở lại. Mã không gọi `focus()`; việc kích hoạt đến từ `restore()` của hệ điều hành.

Vì sao trung bình, không phải chỉ phiền:
- người vận hành đang gõ phím ở ứng dụng khác thì phím có thể rơi vào cửa sổ ứng dụng đang chạy kiểm thử, làm sai dữ liệu một bước và làm e2e hỏng không tất định;
- quyết định của Project Owner (phương án A) là để người vận hành dùng máy bình thường khi e2e chạy.

**Việc:** cửa sổ phải hết bị thu nhỏ để lệnh chụp và cú bấm không treo, nhưng **không** được kích hoạt. Ứng viên: `BrowserWindow.showInactive()` (Electron: "Shows the window but doesn't focus on it"). Orchestrator **không nắm chắc** `showInactive()` có đưa một cửa sổ đang thu nhỏ về trạng thái thường trên Windows mà không kích hoạt hay không: agent tra `electron.d.ts` 44.4.5 và **đo** trên Windows.

**Tiêu chí đóng:**
- probe điều kiện `reminimized` 20 lần: 0 lần treo, và mỗi lần mở lại cửa sổ ứng dụng **không** thành cửa sổ có tiêu điểm (ghi `isFocused()` sau khi mở lại; cửa sổ đang có tiêu điểm trước đó vẫn giữ);
- 10 lượt e2e liên tiếp đạt trong lúc Project Owner dùng máy, và Project Owner xác nhận không bị giành tiêu điểm.

Nếu đo cho thấy không có cách nào hết thu nhỏ mà không kích hoạt trên Windows: dừng, báo số đo; Project Owner quyết giữ cách hiện tại hay quay về quy ước không thu nhỏ.

## Layer giao diện — sau audit phiên 29

### UI-19 — `app_root.test.tsx`, ca D6, hỏng ngắt quãng (thấp; audit phiên 29 §5.3) — **plan phiên 31** (việc 3)

> **ĐÃ ĐÓNG 2026-10-05, phiên 31.** `await vi.waitFor(...)`; 50 lần: trước 1 hỏng, sau 0. Phép cắn tất định tái lập trên Linux (bản cũ 3/3 hỏng, bản mới 3/3 đạt).

Dòng 291 `expect(loadPending).toHaveBeenCalledTimes(3)` nhận 2, một lần trong 5 lần `npm run check` lúc máy Project Owner tải (mốc đầu phiên 29). Linux (Orchestrator): 0/25. Giả thuyết: câu "Đã lưu cài đặt nhắc việc." hiện ngay lúc `reminder_list` dựng xong, còn lần gọi `loadPending` thứ ba nằm trong `useEffect`, chạy sau; khẳng định ngay sau `findByText` có thể chạy trước nó. Cùng loại `screens-EXP-012`.

**Việc:** chờ bằng `vi.waitFor` thay vì khẳng định ngay. Phép cắn tất định: làm lần gọi thứ ba đến chậm thì kiểm thử cũ hỏng, mới đạt. Không nới thời gian chờ.

## Layer giao diện — sau audit phiên 31

### UI-20 — Có cờ show-inactive, cửa sổ vẫn bị kích hoạt muộn khi khởi chạy từ cửa sổ đang ở nền trước (thấp; audit phiên 31 §5.1)

> **ĐÃ ĐÓNG 2026-10-07, không phải lỗi.** Project Owner xác nhận: trong lần đo đó anh có bấm vào cửa sổ ứng dụng (nút chức năng, phóng to, thu nhỏ). Bấm vào cửa sổ thì cửa sổ được kích hoạt; đó là hành vi đúng. Các lần kích hoạt muộn 3,8–12 s là do người dùng, không do Electron hay Desktop. Bài học cho lần đo sau: probe đo tiêu điểm chỉ có nghĩa khi không ai chạm máy.

Project Owner chạy `ui18_launch_probe.mjs --runs=20 --show-inactive` ngày 2026-10-07 từ PowerShell của mình: 8/20 lần ứng dụng vào nền trước và `isFocused()` true, **muộn** 3,8–12,1 s (không lần nào ở khoảng 2 s như khi không cờ). Agent đo 2/20 ở phiên 31.

Chia theo tiến trình giữ nền trước lúc mở:
- tiến trình phụ của probe giữ được: 1/10;
- cửa sổ PowerShell đã khởi chạy probe: 6/9;
- ứng dụng khác: 1/1.

**Giả thuyết, chưa đo:** Windows cho tiến trình được khởi chạy từ ứng dụng đang ở nền trước quyền lấy nền trước; chưa biết bên nào gọi việc kích hoạt muộn (Electron, Chromium, hay thao tác của người dùng).

Không ảnh hưởng điều kiện của UI-18: e2e do agent khởi chạy, Project Owner làm việc ở ứng dụng khác, đã xác nhận không bị giành.

**Nếu cần làm:** công cụ đo ghi giờ sự kiện `focus` của `BrowserWindow`, chạy khi chắc chắn không ai chạm máy, để tách nguồn. Chờ Project Owner trả lời có chạm máy trong lần đo ngày 7/10 không.

## Layer giao diện — sau audit phiên 34

### UI-21 — Dọn sau khi sửa `.gitignore` gốc (thấp; audit phiên 34 §5.1, §5.3) — làm ở phiên giao diện kế tiếp

`main-EXP-033` (`UI/src/main.tsx`) ghi rằng hai dòng phủ định của `UI/.gitignore` giải quyết việc `Backup*/` bỏ qua thư mục mới. Sau ENV-9 (mở rộng), `.gitignore` gốc không còn khớp thư mục lồng nhau, nên hai dòng đó thừa, và câu trong EXP thiếu thư mục `UI/evidence/walkthroughs/backup/`. **Việc:** viết lại EXP cho đúng (giữ id), và bỏ hai dòng thừa của `UI/.gitignore` sau khi kiểm `git check-ignore` vẫn không bỏ qua tệp nào.

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
- **ENV-8** (Project Owner; audit phiên 30 §5.5) — **Project Owner chọn gỡ hẳn rồi cài lại, 2026-10-05.** máy Project Owner có (1) bản cài cũ ngày 2026-09-28 với lối tắt Start Menu mang AUMID `com.commissiontracker.desktop`, và (2) bản cài lúc 20:57 ngày 2026-10-04 thiếu module ticker (báo `Cannot find module`). Cần gỡ hẳn hoặc cài lại từ bộ cài mới trong `Desktop\release`. Bản cài dùng thư mục dữ liệu thật; đó là dùng thật, không phải kiểm thử. Việc đo thông báo trên bản cài sạch gộp vào ENV-4 (máy khác, chưa có bản cài).
- **ENV-9** (Orchestrator; audit phiên 32 §5.1): dòng `Backup*/` của `.gitignore` gốc (mẫu Visual Studio) khớp `Backend/workflows/backup_data/` khi git không phân biệt hoa thường (Windows), nên cả workflow không vào commit. Agent phát hiện và báo. **Đã sửa 2026-10-07:** Orchestrator thêm `!Backend/workflows/backup_data/` vào cuối `.gitignore`, kiểm với `core.ignorecase=true`. Commit `.gitignore` phải đi trước commit CAS32. Từ nay audit đối chiếu danh sách tệp trên đĩa với danh sách tệp sẽ vào commit, không chỉ clone kho.
  - **Mở rộng 2026-10-07, audit phiên 34 §5.1:** cùng mẫu còn khớp `UI/src/logic/workflows/backup_data/`, `UI/src/screens/pages/backup/` (agent vá bằng `UI/.gitignore`) và `UI/evidence/walkthroughs/backup/` (agent không thấy). **Sửa tận gốc:** Orchestrator thay dòng `Backup*/` của `.gitignore` gốc bằng `/Backup*/`, `/Backend/Backup*/`, `/Desktop/Backup*/`, `/UI/Backup*/` (nơi Visual Studio ghi bản sao lưu khi nâng cấp), kiểm với `core.ignorecase=true`. Các dòng phủ định cũ nay thừa, vô hại. Commit `.gitignore` phải đi trước commit CAS34. Kiểm tệp sẽ vào commit theo **từng tệp**, kể cả `UI/evidence`.
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
