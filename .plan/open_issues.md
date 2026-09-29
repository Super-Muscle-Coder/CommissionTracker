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

## Hợp đồng — chờ Project Owner duyệt

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

### UI-11 — `page.screenshot` hết 30 s trong e2e, chỉ trên Windows (trung bình; không chặn `hoàn_tất`; audit phiên 21 §5) — cho phiên giao diện kế tiếp

**Dữ liệu:**
- phiên 19, mốc đầu phiên: `client_detail` S4 (backend tắt), có đặt runner;
- phiên 20: `main_layout.spec.ts`, có đặt runner;
- phiên 21: `client_detail` S4 và `stage_change` S4 (đều là bước backend tắt), cùng một lần chưa rõ bước; không đặt runner; 3 trong 8 lần.

Máy Orchestrator (Linux) chưa gặp lần nào trong hơn 20 lần e2e toàn bộ.

**Chưa rõ nguyên nhân.** Các giả thuyết, chưa có dữ liệu để chọn:
- kết nối tới cổng đóng trên Windows chậm;
- phần mềm diệt virus quét tệp ảnh vừa ghi;
- cửa sổ Electron không nhận khung hình mới khi không có tiêu điểm.

**Việc cho phiên giao diện kế tiếp** (thu dữ liệu, không nới thời gian chờ, không `retries`):
- bật `trace: 'retain-on-failure'` trong `tests/e2e/playwright.config.ts`;
- ghi thời điểm bắt đầu và kết thúc của mỗi lệnh chụp ảnh ở bước backend tắt;
- khi có lần hỏng, giữ trace và báo lại.

**Nếu trace cho thấy giao diện thật sự đứng khi backend tắt**, đó là lỗi của sản phẩm: mở lại trạng thái các trang liên quan.

**Tiêu chí đóng:** biết nguyên nhân, sửa đúng chỗ; sau đó 10 lần e2e liên tiếp trên Windows không hết giờ chụp ảnh.

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

## Rà soát toàn bộ checkpoint — 2026-09-28 (trước phiên 18)

- **Backend** (Main và 8 khối workflow): không có `UNSOLVED_PROBLEMS`, không có NOTE nào.
- **Giao diện** (5 khối): không có `UNSOLVED_PROBLEMS`. Các NOTE còn lại đều là ghi chú còn giá trị (cách chạy, việc tương lai của `ipc_bridge`, đề xuất trạng thái đã được xử lý).
- **Desktop** (Main): còn **`main-PROB-001`** trong `UNSOLVED_PROBLEMS`, và một NOTE ghi watermark là "V2". Xem DSK-12.

### DSK-12 — Dọn checkpoint Main desktop (thấp) — cho phiên desktop kế tiếp

- `main-PROB-001` (bản sao do antivirus chạy) nay đã có hướng xử lý ở mọi mặt, nên chuyển thành EXPERIENCES và dẫn nguồn. Đây cũng là nơi ghi kết quả ENV-5: giữ 75 s; không thấy bản sao trong 15,9 s quan sát được, trước khi AVG chặn tiến trình theo dõi (DSK-14); bản thật chạy đúng với khóa của phiên 15. Các nguồn:
  - rủi ro dữ liệu: đã chặn bằng khóa backend (BE-3, Data Schema 6.2.0);
  - độ trễ lần mở đầu: đã chẩn đoán xong, hướng xử lý là ký số ở chặng G (DSK-3, DSK-9);
  - việc đo lại: ENV-5.
- NOTE "Dịch vụ AI không được khởi động ở V1 (watermark để dành V2)": sửa thành "V4 trở đi", theo `.design/product_versions.md`.
- NOTE "Cách làm của phiên 13 so với plan": chuyển thành EXPERIENCES nếu còn giá trị, hoặc xóa.

### DSK-13 — Hộp thoại lỗi của desktop viết bằng tiếng Anh kỹ thuật (thấp) — **ĐÃ DUYỆT 2026-09-28**, cho phiên desktop kế tiếp

> Project Owner: ứng dụng phục vụ cộng đồng họa sĩ Việt, nên V1 dùng **tiếng Việt**. Tiếng Anh (hay đa ngôn ngữ) bàn ở phiên bản sau; đặt câu chữ trong `configs/desktop.json` giúp việc đó rẻ về sau.

`fatal()` hiện đưa thẳng thông điệp kỹ thuật lên hộp thoại. Ví dụ: "The backend could not start after 3 attempts (last: …)", "The backend stopped unexpectedly (exit code 0). The app will close."

Họa sĩ là người Việt, và giao diện V1 dùng nhãn tiếng Việt (`ui_decomposition.md` §7.2, nguyên tắc 3).

**Đề xuất rẻ:**
- hộp thoại hiện một câu tiếng Việt dễ hiểu và việc người dùng nên làm, ví dụ "Commission Tracker không khởi động được. Hãy đóng ứng dụng rồi mở lại; nếu vẫn lỗi, gửi tệp nhật ký cho người hỗ trợ.";
- chi tiết kỹ thuật giữ ở dòng thứ hai;
- dòng log `FATAL:` giữ tiếng Anh như cũ, vì kiểm thử so trên dòng đó.

Câu chữ đặt trong `configs/desktop.json`.

### DSK-14 — AVG chặn công cụ đo `measure_startup.cjs` (thấp; phát hiện ở ENV-5, 2026-09-28) — cho phiên desktop kế tiếp

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

### DSK-15 — Ô ngày của giao diện hiện kiểu tháng/ngày/năm (thấp; Q19-2 của audit phiên 19) — cho phiên desktop kế tiếp

Ô "Hạn giao" (`<input type="date">`) hiện `11/30/2026`, trong khi trang chi tiết và danh sách hiện `30/11/2026`. Nguyên nhân: locale của Electron đang là `en-US`, và giao diện không đổi được định dạng ô ngày gốc.

**Hướng xử lý:** desktop Main đặt ngôn ngữ ứng dụng là tiếng Việt trước sự kiện `ready`, và giá trị đó nằm trong `configs/desktop.json`. Orchestrator chưa kiểm cách nào của Electron 44 thật sự đổi được định dạng ô ngày; phiên desktop phải đo trên máy thật, có ảnh chụp trước và sau.

**Tiêu chí đóng:** ô "Hạn giao" hiện `30/11/2026` trên bản chạy từ mã nguồn và trên bản đóng gói; kiểm thử của Desktop vẫn đạt.
