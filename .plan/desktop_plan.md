# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-01T23:00:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 26 của dự án, phiên desktop thứ tư (sau phiên 10, 13 và 14). Đây là **phiên dọn dẹp và vá nhỏ của desktop Main**, gom bốn mục còn mở, theo thứ tự ưu tiên:

| Mục | Việc | Mức |
|---|---|---|
| **DSK-15** | Ô ngày của giao diện hiện kiểu tháng/ngày/năm vì Electron dùng `en-US`. Đổi ngôn ngữ ứng dụng sang tiếng Việt, **đo** xem ô ngày có thật sự đổi không | trung bình |
| **DSK-13** | Hộp thoại lỗi của desktop đang là tiếng Anh kỹ thuật: chuyển sang câu tiếng Việt dễ hiểu, giữ chi tiết kỹ thuật ở dòng sau | thấp, đã duyệt |
| **DSK-14** | AVG chặn tiến trình theo dõi của `measure_startup.cjs` vì nó gọi PowerShell bằng `-EncodedCommand` | thấp |
| **DSK-12** | Dọn checkpoint Main: `main-PROB-001` thành EXPERIENCES, sửa NOTE "V2" thành "V4 trở đi", xử lý NOTE cũ của phiên 13 | thấp |

Chi tiết từng mục ở `.plan/open_issues.md`. Plan này chỉ ghi cách làm và tiêu chí.

**Điểm dừng:**
- bốn mục có bằng chứng;
- `npm test` và `npm run test:packaged` của Desktop đạt;
- `npm run e2e` của UI đạt với Main mới;
- mốc `%APPDATA%` không đổi.

Không có workflow mới, không có lối vào `ipc` mới, không đổi thứ tự khởi động hay cách dừng backend.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 2 (git), mục 5 (Desktop, điều kiện build), mục 6;
   - `.plan/open_issues.md`: **DSK-15, DSK-13, DSK-14, DSK-12**, cùng DSK-3, DSK-9 (bối cảnh ký số, không làm), ENV-2 (ngoại lệ antivirus cho thư mục build), BE-8 (quy ước giờ trong checkpoint);
   - hợp đồng: `data_schema.yaml` `clause_a_common.mandatory_rules` (luật renderer, luật dừng backend), `shared_values`; `clause_d_desktop`;
   - `Desktop/configs/desktop.json`; toàn bộ khối checkpoint ở đầu `Desktop/src/main.ts`; `Desktop/src/main.ts` quanh `fatal()` và `whenReady()`;
   - `Desktop/tests/desktop_main.spec.ts`, `Desktop/tests/packaged/packaged_app.spec.ts`, `Desktop/tests/packaged/measure_startup.cjs`, `Desktop/tests/helpers.ts`;
   - `.design/ui_decomposition.md` §7.2, nguyên tắc 3 (nhãn tiếng Việt), cho DSK-13;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron, Python; trạng thái AVG và ReasonLabs theo lời Project Owner.
   - Trong `Desktop/`: `npm ci`; `npm run lint`; `npm test` (mốc **14 đạt**).
   - Trong `UI/`: `npm run build` (Desktop nạp `UI/dist`).
   - Chụp mốc `%APPDATA%\CommissionTracker` (tồn tại hay không; kích thước, SHA-256 và thời điểm ghi của `data.db`).
   - Ghi `git status --short` (chỉ đọc).
   - **Ảnh "trước" của DSK-15:** mở ứng dụng từ mã nguồn, có `--ct-test-data-dir` trỏ vào thư mục tạm và dữ liệu mẫu. Cách dễ nhất là `npm run walkthrough:app -- --income` trong `UI/`, công cụ có sẵn. Chụp ảnh ô "Hạn giao" của form đơn hàng và hai ô ngày của trang "Thu nhập". Ghi `app.getLocale()`.

2. **DSK-15: ngôn ngữ ứng dụng tiếng Việt.**
   - Thêm khóa ngôn ngữ vào `configs/desktop.json`, ví dụ `"app": { "locale": "vi" }`. Không viết cứng trong mã.
   - Main đặt ngôn ngữ **trước** `app.whenReady()`, bằng cách Electron 44.4.5 hỗ trợ.
     - Tra tài liệu Electron của đúng phiên bản, ghi nguồn. Ứng viên: switch dòng lệnh `lang` qua `app.commandLine.appendSwitch`. Còn cách nào khác thì so sánh và ghi lý do chọn.
     - Orchestrator **không nắm chắc** cách nào đổi được định dạng của `<input type="date">` trên Windows: Chromium có thể theo ngôn ngữ ứng dụng hoặc theo thiết lập vùng của hệ điều hành. Chỉ kết luận bằng đo.
   - **Đo:**
     - `app.getLocale()` sau khi đặt;
     - ảnh "sau" của đúng các ô ở việc 1, trên bản chạy từ mã nguồn;
     - sau `npm run dist`, ảnh trên **bản đóng gói** (`release\win-unpacked`, với `--ct-test-data-dir`).
   - **Kiểm thử tự động**, không phụ thuộc mắt người: một ca trong `desktop_main.spec.ts` (hoặc tệp mới cạnh nó) khẳng định ngôn ngữ ứng dụng là giá trị trong config (ví dụ đọc `app.getLocale()` qua `electronApp.evaluate`, hoặc `navigator.language` của trang). Ca này phải **hỏng** khi bỏ dòng đặt ngôn ngữ. Ghi bằng chứng cắn.
   - **Nếu đo cho thấy ô ngày không đổi** dù `getLocale()` đã là `vi`: dừng DSK-15 ở đó, giữ thay đổi chỉ khi nó vô hại, ghi kết quả đo và cách đã thử, **không** tự viết ô ngày riêng hay đổi gì ở `UI/`. Orchestrator sẽ đề xuất hướng khác.
   - **Ảnh hưởng tới UI:** giao diện luôn định dạng ngày, tiền bằng `Intl` với `'vi-VN'` viết rõ. Ô ngày gốc vẫn gửi `YYYY-MM-DD`, nên logic không đổi. Chạy `npm run e2e` của UI để xác nhận (việc 6). Ảnh bằng chứng trong `UI/evidence` có ô ngày sẽ cũ sau phiên này; **không** chạy e2e với `CT_WALKTHROUGH_RUNNER` để làm mới chúng. Phiên giao diện sau sẽ làm.

3. **DSK-13: hộp thoại lỗi tiếng Việt.**
   - Câu chữ đặt trong `configs/desktop.json`, ví dụ `"main": { "error_dialog": { "summary": "…", "detail_label": "…" } }`.
     - Câu chung đề xuất (agent được chỉnh cho tự nhiên hơn, ghi lại câu cuối cùng): "Commission Tracker không khởi động được hoặc vừa gặp lỗi và phải đóng. Hãy mở lại ứng dụng; nếu lỗi vẫn còn, gửi tệp nhật ký cho người hỗ trợ."
     - Nếu ngắn gọn được, phân biệt hai trường hợp "không khởi động được" và "đang chạy thì dừng"; không bắt buộc.
   - Hộp thoại có dòng tiếng Việt trước, chi tiết kỹ thuật tiếng Anh ở dòng sau (thông điệp hiện tại của `fatal()`).
   - **Dòng log `FATAL:` giữ nguyên tiếng Anh** như cũ; mọi kiểm thử đang so trên dòng đó không đổi.
   - **Kiểm thử:** kiểm thử chạy với `--ct-test-no-dialog`, nên hộp thoại không hiện. Nội dung hộp thoại phải kiểm được mà không cần bấm. Ví dụ: tách hàm dựng nội dung hộp thoại và ghi thêm một dòng log `error dialog text: …` khi không hiện hộp thoại; hoặc cách khác tương đương, ghi lý do chọn. Ít nhất một ca khẳng định câu tiếng Việt và chi tiết kỹ thuật cùng có mặt.
   - **Ảnh thật:** chạy một lần **không** có `--ct-test-no-dialog`, với lỗi giả lập có sẵn trong kiểm thử (ví dụ thư mục giao diện không tồn tại qua `--ct-test-renderer-root`, và `--ct-test-data-dir` tạm), chụp ảnh hộp thoại. Lần chạy này không được đụng `%APPDATA%`.

4. **DSK-14: `measure_startup.cjs` không dùng `-EncodedCommand`.**
   - Viết script theo dõi ra một tệp `.ps1` tạm trong thư mục tạm của lần đo, rồi chạy bằng `powershell.exe -NoProfile -NonInteractive -File <tệp>`; hoặc dùng cùng cách gọi `-Command` như `tests/helpers.ts`. Ghi lý do chọn. Xóa tệp tạm khi xong.
   - **Kiểm lại:** chạy công cụ đo trên bản đóng gói, **khi AVG và ReasonLabs đều bật**: `node tests/packaged/measure_startup.cjs 3 release/win-unpacked A`.
     - Tiến trình theo dõi phải sống suốt lần đo.
     - Không có cảnh báo AVG mới. Hỏi Project Owner nếu cần nhìn lịch sử cảnh báo.
   - **Không** thêm ngoại lệ antivirus cho `powershell.exe`, không đổi cấu hình antivirus.

5. **DSK-12: dọn checkpoint Main** (`Desktop/src/main.ts`, Giao thức 07).
   - `main-PROB-001` (bản sao do antivirus chạy) → chuyển thành EXPERIENCES, dẫn nguồn theo `open_issues` DSK-12: khóa backend (BE-3, Data Schema 6.2.0); độ trễ lần mở đầu và ký số (DSK-3, DSK-9, chặng G); kết quả ENV-5.
     - Giao thức 07 cho phép xóa mục `UNSOLVED_PROBLEMS` khi đã chuyển nội dung sang EXPERIENCES: ghi rõ id cũ trong EXPERIENCES mới.
   - NOTE "Dịch vụ AI không được khởi động ở V1 (watermark để dành V2)" → "V4 trở đi", theo `.design/product_versions.md`. Mọi chỗ khác trong checkpoint Main còn ghi "V2" cho watermark cũng sửa.
   - NOTE "Cách làm của phiên 13 so với plan": chuyển thành EXPERIENCES nếu còn giá trị, hoặc xóa. Ghi quyết định.
   - Thêm EXPERIENCES và EVIDENCE cho DSK-15, DSK-13, DSK-14.
   - **Giờ ghi trong checkpoint:** chép **nguyên** giá trị của `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn (BE-8).

6. **Chạy toàn bộ**, khi AVG và ReasonLabs đều bật:
   - `Desktop`:
     - `npm run lint`;
     - `npm test` đạt đủ (14 cộng số ca mới);
     - xóa `packaging/stage` và `release` rồi chạy `npm run dist`;
     - `npm run test:packaged` đạt **6/6** (hoặc hơn nếu thêm ca).
   - `UI`: `npm run e2e` đạt **59/59**, **không** đặt `CT_WALKTHROUGH_RUNNER`; sau đó `git status --short UI/evidence` phải trống. Lần hỏng chỉ vì chụp ảnh hết giờ (UI-11) thì ghi tên bước, chạy lại, không tính. ⚠ Trong lúc e2e chạy, không thu nhỏ cửa sổ Electron (UI-11).
   - Chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-9** (Q4, Q-C2, biểu tượng, ký số): không làm.
- **DSK-11** (mã thoát 3): không làm ở V1.
- **DSK-8:** chỉ quan sát.
- **DSK-10** đã xong ở `.gitignore` gốc (`Desktop/startup-logs/`); không cần làm gì.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `shared_values.db_file_path` là `%APPDATA%/CommissionTracker/data.db`. Mọi lần chạy ứng dụng trong phiên, kể cả bản đóng gói, đều kèm `--ct-test-data-dir` trỏ vào thư mục tạm.
- Backend dừng bằng việc đóng stdin. Không đổi cách dừng, không đổi thứ tự khởi động.
- Preload và bridge (`shared_values.renderer_bridge`) không đổi. Không thêm lối vào `ipc`.
- Luật renderer và CORS của `clause_a_common.mandatory_rules` không đổi; `ui_origin` không đổi.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- **Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus nào**, kể cả tạm thời. Không thêm ngoại lệ cho `powershell.exe`.
- Không đổi chữ của dòng log `FATAL:`.
- Không tự viết component ô ngày, không đổi `UI/` để vá DSK-15.
- Không ký số, không thêm biểu tượng, không auto-update, không màn hình chờ.
- Không tăng `ready_timeout_ms` hay thời gian chờ nào khác.
- Không tắt luật lint, không thêm `eslint-disable`, không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.
- Không dùng sub-agent. Không chạy song song hai lệnh e2e hay hai bản ứng dụng.
- ⚠ Ràng buộc V1: không màn hình hồ sơ quyền sở hữu. Phiên này không làm giao diện.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **DSK-15:**
   - ngôn ngữ ứng dụng đặt từ config;
   - có ca kiểm thử tự động và bằng chứng cắn;
   - có ảnh trước và sau của ô "Hạn giao" và hai ô ngày của "Thu nhập", trên bản chạy từ mã nguồn **và** bản đóng gói;
   - kết luận rõ ô ngày đã hiện ngày/tháng/năm hay chưa. Nếu chưa, có số đo và cách đã thử.
2. **DSK-13:** hộp thoại tiếng Việt, chi tiết kỹ thuật ở dòng sau; câu chữ trong config; có ca kiểm thử; có ảnh hộp thoại thật; dòng `FATAL:` không đổi.
3. **DSK-14:** `measure_startup.cjs` không còn `-EncodedCommand`; một lần đo đầy đủ khi AVG bật, tiến trình theo dõi sống tới cuối.
4. **DSK-12:** checkpoint Main theo việc 5; YAML hợp lệ; không còn chữ "V2" gắn với watermark.
5. `npm run lint`, `npm test`, `npm run dist` (từ trạng thái sạch), `npm run test:packaged` của Desktop, và `npm run e2e` của UI (59/59, `UI/evidence` không đổi) đều đạt.
6. Mọi lần chụp mốc `%APPDATA%` giống nhau.
7. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo.
8. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
   - bảng DSK-12 tới DSK-15: trạng thái và bằng chứng;
   - các ảnh (đường dẫn);
   - các lệnh để Project Owner tự chạy lại;
   - danh sách ngoại lệ lint mới, nếu có.
