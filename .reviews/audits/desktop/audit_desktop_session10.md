# Audit phiên 10 (B1, phiên desktop đầu tiên) — `coding-agent@2026-09-26#2`

*Orchestrator, 2026-09-26. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

**B1 được chấp nhận.** Công việc thật, đúng phạm vi, và đạt đủ tiêu chí hoàn tất của plan. Mọi con số và khẳng định tôi kiểm lại được đều khớp báo cáo.

Phiên này là bước tiến lớn nhất của nền tảng kể từ phiên backend đầu tiên. Lần đầu tiên hai Main chạy cùng nhau, và điều đó đã có bằng chứng: một trang nạp qua `app://` đọc được dữ liệu thật từ backend thật.

Tôi không thấy lỗi nào chặn đường. Có hai điểm tôi **không kiểm lại được**, vì chúng chỉ đúng trên Windows (mục "Giới hạn của audit này"). Có bốn việc theo sau, ghi ở cuối báo cáo.

## Tôi kiểm lại độc lập

**Phạm vi và những thứ không được đụng tới.** Kiểm theo thời điểm sửa đổi trên đĩa và bằng so sánh nội dung:

- `.contracts/`, `CLAUDE.md`, `CommissionTracker.slnx`, toàn bộ `UI/` và toàn bộ `Backend/` đều không đổi.
- Không có `UI/dist`.
- Cây `Desktop/` đúng như agent báo cáo. Không còn tệp mẫu React/Vite nào; `CHANGELOG.md` còn nguyên.
- `Desktop.esproj` chỉ đổi bốn thuộc tính lệnh được phép: `StartupCommand`, `BuildCommand`, `TestCommand`, `JavaScriptTestRoot`.

**Build và lint** trên Linux, Node 22, cài bằng `npm ci` từ đúng `package-lock.json` của agent (Electron 44.4.5 tải về được):

- `npm run build` và `npm run lint` đều sạch.
- `dist/main.js` tôi dịch ra **giống hệt từng byte** bản agent dịch trên Windows (bỏ khác biệt ký tự xuống dòng).

**Chạy thật trên Linux: 19/19 phép kiểm đạt.** Tôi viết một script audit riêng thay cho bộ kiểm thử của agent, vì bộ đó dùng PowerShell và `tasklist`, chỉ chạy trên Windows. Script chạy `dist/main.js` thật bằng Electron 44.4.5 dưới Xvfb, dùng backend thật (`Backend.py`, Python 3.13) và backend giả của agent.

| Nhóm | Kết quả |
|---|---|
| Origin | `location.origin` và header `Origin` của **mọi** yêu cầu tới backend đều là `app://commission-tracker` |
| Bridge | `Object.keys` = `['backendBaseUrl']`, đóng băng; `require`, `process`, `ipcRenderer` đều `undefined` |
| Đọc/ghi thật từ renderer | `GET /clients` 200 `[]`; **`POST /clients` 201 và `PUT /clients/{id}` 200, thân JSON, đều đi qua preflight `OPTIONS` thành công** |
| Lỗi đã khai báo đọc được từ renderer | 404 `ERR_NOT_FOUND`, 400 `ERR_VALIDATION` |
| Method không khai báo | `DELETE` bị trình duyệt chặn (CORS) |
| `app://` thoát thư mục gốc | 6 dạng thử theo đường dẫn Linux (`..`, `..%2f`, `%2e%2e%2f`, `..%5c`, `%2fetc%2fpasswd`, `%00`) đều cho 404 |
| Đóng ứng dụng | Backend thoát mã 0, không sót tiến trình (đóng mất khoảng 0,9 s) |
| Backend thoát mã 2 | Đúng 3 lần thử trên 3 cổng, `FATAL`, ứng dụng thoát mã 1, không mở cửa sổ |
| Backend in `READY` rồi chết | `FATAL` "stopped unexpectedly (exit code 3)", không khởi động lại |
| Thiếu thư mục giao diện | Backend dừng mã 0, `FATAL` nêu đúng thư mục |
| Có thư mục nhưng thiếu `index.html` | `FATAL` "index.html is missing" — **nhánh này bộ kiểm thử của agent không phủ; tôi kiểm thêm** |
| Không bao giờ `READY` | Quá hạn đúng khoảng 30 s, kết thúc tiến trình, ứng dụng thoát mã 1 |
| Sau tất cả | Không còn tiến trình Python nào của dự án |

**Checkpoint của Main desktop** parse được bằng YAML sau khi bỏ tiền tố `// `: 7 EXPERIENCES, 4 EVIDENCE, 5 NOTES, không có `UNSOLVED_PROBLEMS`. Ngoài chú thích, code không chứa giá trị biên nào viết cứng: `ui_origin`, `loopback_host`, `renderer_bridge` và tên các biến `CT_*` đều đọc từ `configs/desktop.json`.

## Đối chiếu với hợp đồng (Data Schema 6.1.0, API Contract 4.0.0)

| Luật | Kết quả |
|---|---|
| Renderer chỉ nạp từ `ui_origin`, không bao giờ `file://` hay `http(s)://` | Khớp: `loadURL(<ui_origin>/index.html)`; điều hướng ra ngoài và mở cửa sổ mới đều bị chặn |
| Đúng một giá trị khởi động, là thuộc tính `backendBaseUrl` của đối tượng đóng băng `window.<renderer_bridge>` | Khớp (tôi đo lại ở trên) |
| Chưa có `invoke`, vì chưa có mục `ipc` nào | Khớp |
| Renderer không bao giờ nhận địa chỉ dịch vụ AI | Khớp: URL dịch vụ AI chỉ nằm trong biến môi trường của backend |
| Bốn biến `CT_*`; `CT_DB_FILE_PATH` là `%APPDATA%/CommissionTracker/data.db`; `CT_APP_VERSION` là semver (`0.1.0`) | Khớp |
| Cổng do desktop Main chọn lúc chạy, chỉ trên `loopback_host` | Khớp |
| Sẵn sàng = đúng một dòng `READY`; stdout được ghép theo dòng | Khớp. Agent có backend giả in `REA` + `DY\r\n` để kiểm việc ghép dòng |
| Dừng = đóng stdin; quá hạn thì kết thúc | Khớp (hạn 10 s, lớn hơn hạn 5 s của backend) |
| Ứng dụng chạy được khi không có dịch vụ AI | Khớp: không khởi động dịch vụ AI; vẫn chọn một cổng cho nó và ghi NOTE cho V2 |
| `restore_data.backend_controller` về sau cần khởi động lại trên cùng cổng | Đã chuẩn bị: `BackendProcess` giữ `port`; `start(port)` tạo tiến trình mới mỗi lần gọi |

## Đối chiếu với plan

Đủ các việc từ 0 tới 8. Hai lần đảo thứ tự đều có lý do và đều được khai rõ:

- làm ca 1 cùng phép đo origin trước tám ca còn lại;
- viết `probe.cjs` sau cùng.

Hai quyết định agent phải tự chọn, và chọn đúng:

- **Cách đưa giá trị vào preload đang chạy sandbox:** `additionalArguments` rồi đọc `process.argv`. Agent kiểm bằng chạy thật, và không mở kênh IPC nào. Đây là lựa chọn gọn nhất.
- **Kiểm các nhánh lỗi mà không phải bấm hộp thoại:** Main ghi dòng `FATAL: …` ra log trước khi hiện hộp thoại; cờ `--ct-test-no-dialog` bỏ hẳn hộp thoại. Kiểm thử so nội dung đúng dòng log đó.

Agent cũng tự phát hiện và tự sửa một kiểm thử không kiểm được gì. Ở ca 4, lúc đầu kiểm thử lấy PID của lần khởi động đầu, lần đã hỏng, nên cây tiến trình rỗng và phép kiểm "không sót tiến trình" luôn đạt. Agent đã sửa, và thêm điều kiện cây không được rỗng. Đây là đúng loại sơ hở audit hay phải tự đi tìm.

`typescript` 6.0.3 thay vì bản mới hơn là bắt buộc, vì peer dependency của `typescript-eslint` 8.70.1 chỉ nhận TypeScript dưới 6.1. Agent đã khai.

## Giới hạn của audit này

1. **Tôi không chạy lại được bộ kiểm thử của agent** (`npm test`), vì nó cần PowerShell và `tasklist`. Máy của tôi chạy Linux, và chạy Electron với `--no-sandbox` vì container chạy bằng root. `--no-sandbox` tắt sandbox cấp hệ điều hành của Chromium. Theo hiểu biết của tôi, nó không đổi môi trường JS của preload vốn do `sandbox: true` quy định, nhưng tôi không chứng minh được điều đó trên Linux.
2. **Hai khẳng định chỉ đúng trên Windows, và chỉ có bằng chứng của agent:**
   - `child.kill()` lên trình phóng `python.exe` của môi trường ảo cũng giết luôn tiến trình Python con (`main-EXP-005`: job object với `KILL_ON_JOB_CLOSE`);
   - không sót tiến trình sau ca 3 và ca 7 (nhánh "kết thúc").

   Cách agent kiểm hai điều này có vẻ chắc: chụp cả cây tiến trình lúc đang chạy, rồi dùng `tasklist` theo từng PID. Nhưng tôi không tự đo được.

**Đề nghị Project Owner tự chạy trên máy mình**, từ thư mục `Desktop`:

- `npm test`: phải ra `9 passed`. Chạy lâu hơn 1,5 phút một chút; ca 3 và ca 7 mỗi ca chờ 10–30 giây là bình thường.
- `npm run probe`: cửa sổ trang thử phải hiện `location.origin` là `app://commission-tracker`, và `GET /clients` trả `200`.

Hai lần chạy này là bằng chứng Windows độc lập với agent, bù cho giới hạn ở trên.

## Phát hiện

Không có phát hiện nào chặn đường. Bốn điểm dưới đây ghi để xử lý ở đúng chặng.

### Q1 — Cờ kiểm thử vẫn có hiệu lực ở bản chạy thật (xử lý ở chặng C)

Các cờ `--ct-test-*` (gồm `--ct-test-backend-interpreter` và `--ct-test-backend-script`) được đọc ở mọi lần chạy.

Hôm nay việc này **không** tạo ra rủi ro nào: người đã chạy được ứng dụng kèm tham số dòng lệnh thì vốn đã chạy được bất cứ chương trình nào. Nhưng bản đóng gói không nên mang theo cửa sau kiểu này.

Việc cho chặng C: bỏ qua mọi cờ `--ct-test-*` khi `app.isPackaged`. Ngoài ra, kiểm lại `main-EXP-005` với Python nhúng; agent cũng đã tự ghi điều này.

### Q2 — Chưa có bằng chứng trên Windows cho yêu cầu có preflight

Ca 1 của agent chỉ gửi `GET`. Đây là yêu cầu đơn giản, nên Chromium không gửi preflight. Kết luận "không có preflight Private/Local Network Access" trong EVIDENCE vì vậy chỉ đúng cho `GET`.

Tôi đã chứng minh `POST` và `PUT` kèm preflight chạy được **trên Linux**. Chromium trên Windows chưa được thử với loại yêu cầu này.

- Rủi ro thấp: cơ chế CORS và Private Network Access của Chromium như nhau trên các nền tảng, theo hiểu biết của tôi. Nhưng đó vẫn là suy luận, chưa phải phép đo.
- B2 chỉ gửi `GET`. Lần ghi đầu tiên từ giao diện ở chặng D sẽ tự nhiên là phép đo này, nên plan của lần đó phải yêu cầu ghi nó vào EVIDENCE.
- Tôi không đề nghị mở thêm một phiên desktop chỉ để đo việc này.

### Q3 — Kiểm thử của agent không phủ nhánh "có thư mục nhưng thiếu `index.html`"

Code có xử lý nhánh này, và tôi đã kiểm nó chạy đúng (bảng ở trên). Chỉ thiếu một ca kiểm thử. Để phiên desktop kế tiếp thêm vào; không đáng mở phiên riêng.

### Q4 — Một cuộc đua nhỏ khi thoát giữa lúc đang khởi động (chấp nhận ở V1)

Nếu nhận `SIGINT`/`SIGTERM` trong lúc Main đang ở vòng thử khởi động backend: `shutdown()` đóng stdin, backend thoát trước `READY`, và vòng lặp có thể sinh thêm một lần thử nữa trước khi `app.exit` chạy.

Tiến trình sinh thêm đó vẫn tự thoát, vì pipe stdin của nó đóng theo Electron. Hai tín hiệu kia cũng chỉ xuất hiện khi chạy tay từ terminal. Tôi chấp nhận ở V1; ghi lại để phiên làm `restore_data` (dừng và khởi động lại backend) để ý.

### Ghi nhận nhỏ

- Visual Studio tự sinh `Desktop/obj/`. Thư mục này chưa có trong `.gitignore`.
- `Desktop.esproj` giữ `JavaScriptTestFramework = Vitest`. Agent không đoán, đúng như plan dặn; Test Explorer có thể không thấy các kiểm thử. `npm test` vẫn đủ.
- Agent hỏi có đưa `playwright.config.ts` vào cây ở `CLAUDE.md` mục 4 không. Có: tôi đã thêm `playwright.config.ts`, `package-lock.json`, và mô tả `tests/` (`helpers.ts`, `probe.cjs`, `fixtures/`).

## Đề xuất

- **`status`:** không đổi gì. Phiên này chỉ làm Main; `restore_data` vẫn `đang_chờ_triển_khai`.
- **B1: chấp nhận.** Chặng B còn lại B2.
- **Đã cập nhật sau audit:**
  - `CLAUDE.md`: cây `Desktop/`, hiện trạng, và dòng về `ui_origin`, nay là "đã đo, khớp";
  - `.plan/v1_roadmap.md`: B1 xong.
- **Việc cho phiên backend kế tiếp** (việc nhỏ, gộp được vào phiên backend nào cũng được):
  - xóa NOTE stdin-pipe và NOTE cho B1 trong checkpoint Main backend, vì cả hai đã được B1 đáp ứng và đo;
  - viết lại `claim` của EVIDENCE CORS cho đúng phạm vi đã chứng minh (6.0.1).
- **Trước B2:** còn nợ phần vận hành cho layer giao diện trong `08-operating-protocol.md` (roadmap, chặng A), rồi mới tới iWCA I1 cho trang danh sách khách hàng.

  Plan B2 phải nhắc lại hai điều: **không có màn hình hồ sơ quyền sở hữu**; và các NOTE của desktop dành cho B2 (Vite `base`, CSP, Content-Type, không có dự phòng kiểu SPA).

## Phụ lục — Project Owner chạy lại trên Windows (2026-09-26, 22:12–22:14)

Project Owner tự chạy các lệnh trên máy của mình, Windows, Developer PowerShell của Visual Studio 2026, từ `Desktop/`. Đây là bằng chứng Windows độc lập với agent, và nó đóng giới hạn số 2 của audit này.

- **`npm run build` và `npm run lint`:** sạch.
- **`npm test`: 9 passed (1.4m).**
  - Mọi ca in ra cây tiến trình đúng ba phần: trình phóng `python.exe`, `conhost.exe` và `python.exe` thật.
  - Cuối bộ kiểm thử in `python processes of this project after the suite: []`.
- **Ca 3:** hết hạn 30 s thì trình phóng bị kết thúc (`exit code null (signal SIGTERM)`); không còn tiến trình nào.
- **Ca 7:** hết hạn 10 s thì trình phóng bị kết thúc; đóng ứng dụng mất 10312 ms; Electron thoát mã 0; không còn tiến trình nào. Như vậy khẳng định `main-EXP-005` (kết thúc trình phóng thì tiến trình Python con chết theo) được xác nhận trên một lần chạy thứ hai, do người khác chạy.
- **Ca 4:** uvicorn báo `[Errno 10048]`; lần thử 2 chạy trên cổng khác và in READY.
- **Ca 1** (`npx playwright test -g "1. success path…"`): `MEASURED requests to the backend: [{"url":"http://127.0.0.1:55271/clients","method":"GET","origin":"app://commission-tracker"}]`.
- **`npm run probe`:**
  - Cửa sổ trang thử hiện: bridge `{"keys":["backendBaseUrl"],"frozen":true,"invoke":"undefined","nodeRequire":"undefined","nodeProcess":"undefined"}`, `location.origin` = `app://commission-tracker`, `GET /clients` → `200`, `[]`, không có lỗi.
  - Đóng cửa sổ thì backend in `standard input closed; stopping` rồi thoát mã 0, và ứng dụng thoát mã 0.

Hai dòng log trông lạ nhưng vô hại:

- **Ở ca 9:** bản thứ hai in `Unable to move the cache: Access is denied` và `Gpu Cache Creation failed`. Lý do là hai tiến trình Electron cùng mở một thư mục `userData`, tức đúng điều ca này cố ý tạo ra; bản thứ hai thoát ngay sau đó. Không ảnh hưởng kết quả.
- **Ở ca 7:** `Debugger ending on ws://…` là thông báo của Playwright khi đóng ứng dụng mà nó đã mở.

**Kết luận phụ lục:** bằng chứng Windows đã đủ. Các phát hiện Q1–Q4 giữ nguyên.
