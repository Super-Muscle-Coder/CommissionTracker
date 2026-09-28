# Audit phiên 13 (chặng C, đóng gói thử) — `coding-agent@2026-09-27#3`

*Orchestrator, 2026-09-27. Theo `08-operating-protocol.md`, Phần 5. Plan: `.plan/desktop_plan.md`.*

## Kết luận

**Phiên 13 được chấp nhận.** **Chặng C chưa hoàn tất:** còn chờ bước chạy tay trên một máy Windows khác (tiêu chí 1 của roadmap), và chờ Project Owner tự chạy lại các lệnh đóng gói trên máy mình.

Báo cáo của agent **trung thực**. Mọi con số tôi đối chiếu được đều khớp:
- dung lượng;
- hash của gói Python;
- nội dung `app.asar`;
- bố cục `resources/`;
- locale;
- `._pth`;
- loại `.pyc`;
- phạm vi tệp đã sửa.

Phép đối chứng `ERR_ABORTED` tôi làm lại trên Linux cho đúng kết quả agent báo.

Agent làm đúng những chỗ plan đòi đo trước rồi mới làm:
- **`._pth`:** đo từng bước và ghi đủ ba trạng thái lỗi.
- **VC++ Runtime:** liệt kê DLL, và kiểm cả các DLL mà tệp `.pyd` cần.
- **Hash:** đối chiếu với python.org và với bundle sigstore.
- **Antivirus:** không làm được thì ghi rõ, không bỏ qua trong im lặng.

Chỗ nào plan gợi ý sai, agent đổi và nêu rõ lý do. Ví dụ: cách tái hiện `ERR_ABORTED` bằng `location.reload()` không chạy trên Electron 44, nên agent thay bằng cách khác.

## Tôi kiểm lại độc lập

| Kiểm | Cách | Kết quả |
|---|---|---|
| Phạm vi | Thời điểm sửa đổi của mọi tệp | `Backend/`, `.contracts/`, `CLAUDE.md`, `.slnx`, `Desktop.esproj`, `preload.ts` không đổi. Trong `UI/`, chỉ `evidence/` bị ghi lại, do `npm run e2e` tự làm, và đã khai báo |
| Hash gói Python | `sha256sum` tệp trong cache, so với trang phát hành 3.13.12 của python.org | `76f238f6…3d0`: khớp cả `python_runtime.json` lẫn số python.org công bố |
| C runtime | `unzip -l` gói zip | Có `vcruntime140.dll` và `vcruntime140_1.dll` |
| `._pth` trong gói | Đọc tệp | `python313.zip`, `.`, `Lib\site-packages`, `..\backend`; không có `import site`, đúng EXP-009 |
| Nội dung `app.asar` | Liệt kê trên máy Project Owner | Đúng 4 tệp: `package.json`, `configs/desktop.json`, `dist/main.js`, `dist/preload.js`; không có kiểm thử hay fixture |
| Bố cục `resources/` | Liệt kê | `app.asar`, `backend`, `python`, `ui`, `elevate.exe`; locale chỉ còn `en-US` và `vi` |
| `backend/` trong gói | Liệt kê | Không có thư mục `tests/` nào; `Backend.py` giống byte bản nguồn; bộ lọc `.py`/`.yaml` phủ đủ 39 + 9 tệp chạy thật của backend |
| `.pyc` | Đọc header của `Backend.cpython-313.pyc` trong gói | `flags = 1`, tức `unchecked-hash`, đúng plan; electron-builder không lọc mất `__pycache__` của `extraResources` |
| Dung lượng | Cộng kích thước tệp của `win-unpacked` | Electron 320,4 + Python lõi 20,2 + `site-packages` ~29,3–29,8 + backend 0,6 + giao diện 0,3 ≈ **371 MB**, khớp 371,4 MB. Bộ cài 121 709 519 byte (116,1 MiB) |
| Build và lint | `npm ci` từ `package-lock.json` của agent, Node 24.14.1, Linux | `tsc` sạch, `eslint --max-warnings 0` sạch |
| **Đối chứng `ERR_ABORTED`** | Kịch bản riêng: Electron 44.4.5 dưới Xvfb, backend thật, fixture `slow_first_load`, `page.reload()` ngay sau `firstWindow()`; Main phiên 10 so với Main phiên 13 | **Main cũ: hỏng 3/3** (`FATAL: The app could not start: ERR_ABORTED (-3)`, thoát mã 1). **Main mới: đạt 3/3** (log "was aborted (ERR_ABORTED, -3); continuing", backend thoát 0, Electron thoát 0) |
| Checkpoint | Parse YAML | Hợp lệ: 15 EXPERIENCES, 14 EVIDENCE, 5 NOTES, `UNSOLVED_PROBLEMS: []` |

**Không kiểm lại được từ đây:** mọi thứ cần Windows. Cụ thể là:
- `npm run dist`;
- P1–P6;
- cài và gỡ;
- thời gian khởi động;
- các lần chụp mốc `%APPDATA%`.

Tôi đọc code của `packaged_app.spec.ts`: các phép kiểm có thật và đủ chặt. Ví dụ, P2 đọc network log của Chromium để thấy preflight thật, P6 kiểm cả việc Electron thực sự nhận `PYTHONHOME` giả, và P5 kiểm cha của `python.exe` là Main. Những kết quả này cần Project Owner chạy lại trên Windows (mục "Việc cho Project Owner").

## Đối chiếu với plan

| Tiêu chí | Kết quả |
|---|---|
| 1. `lint` và `test` từ mã nguồn, ca `ERR_ABORTED` hỏng trên code cũ | Đạt; đối chứng tôi đã làm lại |
| 2. `npm run dist` một lệnh từ trạng thái sạch | Đạt theo báo cáo, kèm một lần hỏng `spawn EPERM` ở bước NSIS (Q-C4) |
| 3. P1–P6 | Đạt theo báo cáo và code |
| 4. Cài và gỡ im lặng | Đạt theo báo cáo. `/D` được tôn trọng; mục gỡ cài đặt thiếu Publisher |
| 5. ≤ 400 MB | **Đạt:** 371 MB, tôi đã tự cộng |
| 6. Số đo khởi động và antivirus | Khởi động: có. **Antivirus: không làm được**, vì Defender tắt do máy dùng AVG (Q-C3) |
| 7. Đường chạy từ mã nguồn | Đạt theo báo cáo: backend 375/375, UI `check` 65/65, e2e 4/4, Desktop 11/11 |
| 8. Mốc `%APPDATA%` giống nhau | Đạt theo báo cáo: bốn lần đều "chưa tồn tại" |
| 9. Checkpoint | Đạt |

**Việc tồn của Desktop:**

| Mục | Kết quả |
|---|---|
| Q1 | Đóng, theo D4 |
| Q2 | Đóng: preflight `OPTIONS` → 200 → `POST` 201, cả hai có `Access-Control-Allow-Origin: app://commission-tracker`, đo trên Windows |
| Q3 | Đóng: ca 10 |
| Q5 | Đóng: ca 11, và gỡ menu ở bản đóng gói |
| Q4 | Giữ nguyên, chấp nhận ở V1 |

**Những chỗ lệch khỏi plan, đều có lý do và được ghi lại:**
- sửa `eslint.config.js` và `playwright.config.ts`;
- thêm ba dòng log đo đạc vào Main;
- thêm các tệp `tests/packaged/`, `playwright.packaged.config.ts` và fixture `slow_first_load`;
- khóa lỗi không chết (`non_fatal_first_load_errors`) đặt trong `desktop.json` thay vì gõ thẳng vào code.

Chấp nhận cả bốn.

## Phát hiện

### Q-C1 — Lần mở đầu tiên chờ khoảng 36 s, chưa xác định được do đâu (mức: trung bình, ảnh hưởng người dùng)

Agent đo được như sau:
- khi exe có hash mới (sau build, hay ở đường dẫn cài mới), phải mất khoảng 36 s Main mới khởi động backend;
- các lần sau chỉ mất 1,4–1,6 s.

Giả thuyết là antivirus (AVG, Reason) giữ exe chưa ký ở lần chạy đầu. Giả thuyết này **hợp lý** nhưng **chưa được chứng minh**, vì công cụ đo không phân biệt được hai khả năng:

- **(a)** hệ điều hành hoặc antivirus giữ exe trước khi dòng JavaScript đầu tiên của Main chạy;
- **(b)** chậm bên trong Main, ở đâu đó giữa `whenReady` và `pickFreePort`.

`measure_startup.cjs` chỉ bấm giờ từ dòng "backend started", không bấm giờ dòng log **đầu tiên** của Main ("running the packaged app…").

Phân biệt hai khả năng này quan trọng, vì nó quyết định cách xử lý:
- nếu là (a), **màn hình chờ không giúp gì** (code của ứng dụng chưa chạy), và cách xử lý thật là ký số;
- nếu là (b), phải sửa trong Main.

Báo cáo của agent nhắc tới "màn hình chờ" như một lựa chọn; lựa chọn đó chỉ có nghĩa nếu là (b).

**Đề xuất:**
- Phiên desktop kế tiếp thêm một mốc đo cho dòng log đầu tiên. Việc nhỏ.
- Lần chạy trên máy bạn của Project Owner, vốn không có AVG, sẽ cho thêm một điểm dữ liệu.
- Chưa quyết gì về ký số hay màn hình chờ khi chưa có hai số đo này.

### Q-C2 — `ERR_ABORTED` được bỏ qua, nhưng điều hướng thay thế nếu hỏng thì không ai báo (mức: thấp, chấp nhận ở V1)

Main chỉ theo dõi promise của `loadURL` đầu tiên. Nếu điều hướng thay thế lần nạp đó cũng hỏng, cửa sổ sẽ trắng mà không có hộp thoại lỗi.

Ở bản đóng gói, menu đã bị gỡ, nên chỉ Playwright mới gây ra tình huống này. Ghi lại để phiên làm `restore_data` hay `native_dialogs` để ý, nếu sau này có thêm nguồn điều hướng.

### Q-C3 — Chưa có lượt quét antivirus nào (mức: thấp)

Không phải lỗi của agent. Project Owner có thể tự quét bộ cài bằng AVG, bằng menu chuột phải. Trên máy bạn của Project Owner, Defender sẽ tự quét khi tải và chạy bộ cài; nếu có cảnh báo thì chụp lại.

### Q-C4 — `npm run dist` hỏng một lần ở bước NSIS (`spawn EPERM`), chạy lại thì đạt (mức: thấp)

Cùng nghi vấn antivirus như Q-C1. Theo dõi; nếu lặp lại thường xuyên thì mở việc.

### Nhận xét nhỏ

- **Số không khớp nhỏ:** trong EVIDENCE dung lượng, bộ cài ghi 121 703 863 byte, nhưng bộ cài của build cuối là 121 709 519 byte. Số trong EVIDENCE đo trên một build trước. Không ảnh hưởng kết luận.
- **`release/` đang giữ build trước lần sửa chú thích cuối của checkpoint:** `main.js` trong asar là 57 672 byte, `dist/main.js` là 63 559 byte; chỉ khác phần chú thích. Lần `npm run dist` của Project Owner sẽ tạo lại.
- **Evidence của `UI/`:** `npm run e2e` ghi đè ảnh và `client_list-run.json`, với `runner` vẫn là `coding-agent@2026-09-27#2`. Đây là việc tồn UI Q2 (tên người chạy bị ghi cứng), không phải lỗi phiên này, nhưng làm cho bằng chứng ghi sai người chạy. Việc tồn UI Q2 vì vậy nên làm ở đầu D1.
- **`productName`:** khi chạy từ mã nguồn, thư mục `userData` đổi thành `%APPDATA%\Commission Tracker`; bản dev và bản đóng gói dùng chung khóa một-bản. `db_file_path` không đổi. Chấp nhận.
- **`package.json` chưa có `author`:** Project Owner chọn giá trị, sửa ở phiên desktop sau.
- **`pytest`, `httpx` và các gói phụ thuộc của chúng chiếm 13,7 MB trong gói:** phiên backend kế tiếp tách `requirements.txt` (D6).

## Việc cho Project Owner

1. Trên máy của bạn, trong `Desktop/`, chạy:
   - `npm test`
   - `npm run dist`
   - `npm run test:packaged`
   - `node tests/packaged/measure_startup.cjs 3`

   Gửi log cho Orchestrator.
2. Chạy danh sách các bước trên máy của bạn bè, theo báo cáo của agent. Ghi thêm thời gian chờ ở lần mở đầu (bước 3), vì đó là dữ liệu cho Q-C1.
3. Tùy chọn: quét bộ cài bằng AVG.

## Đề xuất

- **Phiên 13: chấp nhận.**
- **Chặng C:** đánh dấu "phiên xong, chờ chạy trên máy khác". Hoàn tất khi bước 2 ở trên đạt.
- **Quyết định đã chốt:** biến thể Python là gói nhúng python.org 3.13.12 (D1). Ghi vào `CLAUDE.md` mục 5.
- **Tồn cho phiên desktop kế tiếp:**
  - Q-C1: thêm mốc đo cho dòng log đầu tiên;
  - `author`;
  - Q-C2: để ý khi có thêm nguồn điều hướng.
- **Tồn cho phiên backend kế tiếp:**
  - tách phụ thuộc kiểm thử khỏi `requirements.txt`;
  - hai NOTE và `claim` của EVIDENCE CORS (từ audit phiên 9).

## Phụ lục — Project Owner chạy lại trên Windows (2026-09-27, 19:15–20:02)

**Kết quả:**
- `npm run dist`: **đạt**, ở lần thứ tư.
- `measure_startup`: 3 lượt chạy xong. Lượt 1 có một điểm bất thường (DSK-2).
- `npm run test:packaged`: **5 đạt, 1 hỏng** (P4, DSK-1). P2 tái lập lại đúng phép đo preflight trên Windows. P5: backend tự thoát sau 219 ms.

**Ba lần hỏng trước khi `dist` đạt, và nguyên nhân:**

1. **`EBUSY` khi xóa `release\win-unpacked\resources\app.asar`.** Do Orchestrator: trong lúc audit, tôi liệt kê bên trong `app.asar` qua ứng dụng Claude trên máy Project Owner, và ứng dụng đó giữ tệp mở. `resmon` xác nhận: `claude.exe` (PID 13484) giữ đúng tệp này. Đã thành quy tắc ENV-3.
2. **`EPERM` khi đổi tên `win-unpacked.tmp` thành `win-unpacked`.** Do AVG: tắt AVG thì lỗi biến mất. Lỗi `EPERM` ở bước NSIS mà agent gặp (Q-C4) nhiều khả năng cùng nguyên nhân.
3. **`spawn powershell.exe ENOENT`.** `PATH` của máy Project Owner thiếu `C:\Windows\System32\WindowsPowerShell\v1.0`: `Test-Path` cho `True`, nhưng tìm trong `PATH` không thấy. Nhận định "máy bình thường không gặp" trong NOTE của agent vì vậy **sai**, và sẽ được sửa (DSK-5).

**P4 hỏng là lỗi của kiểm thử, không phải của sản phẩm.**
- `processTree()` dựng cây chỉ theo `ParentProcessId`, nên nhận nhầm bốn tiến trình `rsAppUI.exe` của ReasonLabs có `ParentProcessId` trùng PID của backend. Đây là PID tái sử dụng, và Windows không cập nhật `ParentProcessId` khi tiến trình cha chết.
- Log của chính P4 cho thấy backend thoát mã 0 và Electron thoát mã 0 như bình thường.

**Q-C1, dữ liệu mới:** khi AVG đã tắt, lượt đầu vẫn mất 33,1 s trước khi Main khởi động backend. Giả thuyết "do AVG" yếu đi. ReasonLabs vẫn chạy nên chưa loại được antivirus nói chung. Chưa có kết luận (DSK-3).

**Bất thường mới, mức cao (DSK-2).** Một bản Main của gói ghi ra console:
- `backend … exited with code 0`, khoảng 23 s sau `first load finished`, mà không có dòng `stopping backend`;
- rồi `FATAL: The backend stopped unexpectedly (exit code 0)` và `exiting with code 1`.

Trong khi đó, JSON của lượt 1 ghi `exit_code: 0`, và công cụ đo không lẽ ra phải in stderr của tiến trình nó chạy. Chưa rõ khối log này thuộc về tiến trình nào. Phải điều tra có log đầy đủ trước khi sửa gì.

**Cập nhật kết luận:**
- Phiên 13 vẫn **được chấp nhận**. P4 hỏng do một lỗi đã xác định trong kiểm thử, và mọi hành vi của sản phẩm mà kiểm thử đo được đều đúng.
- **Chặng C chưa hoàn tất.** Còn DSK-1 (chặn), DSK-2 (cao), và bước chạy trên máy khác.
- Toàn bộ việc tồn được gom vào `.plan/open_issues.md`.
