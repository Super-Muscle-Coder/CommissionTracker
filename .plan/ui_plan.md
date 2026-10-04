# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-04T11:35:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 29 của dự án, phiên giao diện thứ mười ba. Đây là **phiên vá ngắn** cho công cụ kiểm thử, ba mục, không có trang mới, không đổi hành vi của giao diện:

| Mục | Việc | Mức |
|---|---|---|
| **UI-18** | Cửa sổ e2e được mở lại sau khi bị thu nhỏ thì giành tiêu điểm của người đang dùng máy. Phải hết thu nhỏ mà **không** kích hoạt | trung bình |
| **UI-16** | Ca đầu của `tests/main/main.test.tsx` hết giờ 5 s ngắt quãng trên Windows khi máy tải | trung bình |
| **UI-17** | `main_layout.spec.ts` chưa được cơ chế mở lại cửa sổ che; dọn NOTES cũ trong checkpoint `screens` và `main` | thấp |

Chi tiết và dữ liệu từng mục ở `.plan/open_issues.md`. Plan này chỉ ghi cách làm và tiêu chí.

**Vì sao làm trước `reminder_ticker` (DSK-17):** mọi phiên sau, kể cả phiên desktop, đều chạy `npm run e2e` và `npm run check`. Project Owner chọn sửa hai chỗ này trước (2026-10-04).

**⚠ Như phiên 28, Project Owner dùng máy bình thường trong lúc e2e chạy, kể cả thu nhỏ cửa sổ và gõ phím ở ứng dụng khác.** Đó là điều kiện UI-18 phải chịu được.

Không trang nào đổi trạng thái. Mã trong `UI/src` không đổi, trừ khối checkpoint.

**Điểm dừng:**
- `npm run check` đạt **10 lần liên tiếp**;
- `npm run e2e` đạt **10 lượt liên tiếp**, trong lúc Project Owner dùng máy;
- Project Owner xác nhận cửa sổ e2e không giành tiêu điểm nữa;
- `UI/evidence` không đổi.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 và mục 5;
   - `.plan/open_issues.md`: **UI-18**, **UI-16**, **UI-17**; UI-11 (đã đóng, để hiểu cơ chế mở lại cửa sổ và dữ liệu phiên 25, 27, 28); BE-8 (giờ trong checkpoint);
   - skill `iwca-implementation` v1.0: `iwca_theory.md` §8 (checkpoint) và Giao thức 07 (`07-checkpoint-protocol.md`) cho việc dọn NOTES;
   - mọi khối checkpoint của `UI/`, nhất là `main` (`main-EXP-025`, `main-EXP-026`, NOTES) và `screens` (NOTES);
   - `UI/tests/tools/window_guard.mjs`, `UI/tests/tools/ui11_probe.mjs`, `UI/tests/e2e/walkthrough_harness.ts`, `UI/tests/e2e/main_layout.spec.ts`, `UI/tests/main/main.test.tsx`;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`. Sai khác thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **1555**. Chạy **5 lần**, ghi số lần ca "no bridge on the global object" hết giờ và thời gian của ca đó ở mỗi lần (mốc của UI-16).
   - `npm run build` trong `Desktop/`, rồi `npm run e2e` **không** đặt `CT_WALKTHROUGH_RUNNER`: mốc **70**.
   - Băm toàn bộ `UI/evidence` (SHA-256 từng tệp) làm mốc.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **UI-18: mở lại cửa sổ mà không giành tiêu điểm.** Làm trước, để mọi lần e2e sau trong phiên đã dùng cách mới.
   - **Đo trước, rồi mới chọn.** Mở rộng `ui11_probe.mjs` để đo, cho mỗi cách mở lại:
     - cửa sổ có hết trạng thái thu nhỏ không (`isMinimized()` sau khi mở lại);
     - cửa sổ ứng dụng có thành cửa sổ có tiêu điểm không (`isFocused()` của nó sau khi mở lại);
     - lệnh chụp có treo không.
   - **Điều kiện "người dùng đang ở ứng dụng khác"** phải có thật: trước mỗi lần thu nhỏ, một cửa sổ khác giữ tiêu điểm. Ví dụ, công cụ mở một `BrowserWindow` thứ hai làm "ứng dụng khác" và cho nó tiêu điểm; hoặc một cách tương đương agent chọn, ghi lý do. Ghi cửa sổ nào có tiêu điểm trước và sau mỗi lần mở lại.
   - **Các cách cần đo**, ít nhất:
     - `restore()` (cách hiện tại, làm mốc);
     - `showInactive()` (Electron: "Shows the window but doesn't focus on it");
     - cách nào khác agent thấy trong `electron.d.ts` của 44.4.5 có thể hết thu nhỏ mà không kích hoạt. Ghi nguồn từng cách.
   - Orchestrator **không nắm chắc** `showInactive()` có đưa một cửa sổ đang thu nhỏ về trạng thái thường trên Windows hay không. Chỉ kết luận bằng số đo.
   - **Chọn** cách nào đạt cả ba: hết thu nhỏ, không lấy tiêu điểm, không treo, 20/20 lần. Áp vào `window_guard.mjs`. Nhật ký `window-restore.log` ghi thêm cách đã dùng và tiêu điểm sau khi mở lại.
   - **Nếu không cách nào đạt cả ba trên Windows:** dừng UI-18 ở đó, giữ nguyên cách hiện tại, báo bảng số đo. Project Owner sẽ quyết. Không tự tìm cách vòng (ví dụ đổi `focusable` của cửa sổ, hay sửa `Desktop/`).
   - Chỉ ở công cụ kiểm thử. Không đổi `UI/src`, không đổi `Desktop/`, không thêm cờ `--ct-test-*`.

3. **UI-17, phần 1: `main_layout.spec.ts` dùng cơ chế mở lại cửa sổ.**
   - Spec này tự mở Electron, không qua `launch()` của harness. Gắn cùng cơ chế (`installRestoreGuard`) ngay sau `firstWindow()`, và ghi nhật ký mở lại như các spec khác.
   - Không đổi điều spec khẳng định.

4. **UI-16: ca đầu của `main.test.tsx` không còn trả chi phí nạp mã trong giới hạn 5 s.**
   - **Đo trước:** trong lần chạy `npm run check` lúc máy tải, ca đầu mất bao lâu, và phần nào là nạp mã lần đầu (ví dụ chạy riêng tệp, chạy hai lần liền nhau, so thời gian của ca đầu và ca thứ hai).
   - **Sửa:** tách chi phí nạp mã khỏi ca kiểm thử. Ứng viên: nạp trước cây mô-đun của `src/main.tsx` một lần trong `beforeAll` (với giới hạn riêng của `beforeAll`, ghi rõ con số và lý do), để các ca sau chỉ trả chi phí chạy. Agent được chọn cách khác nếu tốt hơn; ghi lý do.
   - **Không** nới giới hạn của ca kiểm thử (`testTimeout`, đối số thứ ba của `it`), không `retries`, không bỏ ca nào. Điều các ca khẳng định không đổi.
   - **Phép cắn:** chứng minh cách sửa có hiệu lực. Ví dụ: làm chậm giả tạo việc nạp mã (một mô-đun thử chờ vài giây khi được nạp, chỉ trên bản tạm), thấy mã cũ hỏng ở ca đầu và mã mới đạt; khôi phục, ghi số liệu.

5. **UI-17, phần 2: dọn NOTES cũ trong checkpoint** (Giao thức 07).
   - `screens`: các NOTES của phiên 21 và 22 (đề xuất trạng thái đã thực hiện, sự cố quy trình). Phần còn giá trị chuyển sang EXPERIENCES; phần còn lại xóa.
   - `main`: NOTE về `StageChange.test.tsx:183` (UI-12, đã đóng ở phiên 25), và NOTE về `main.test.tsx` của phiên 28 (nay là UI-16, xử lý ở việc 4).
   - Ghi trong EXPERIENCES mới những id hay nội dung đã chuyển. Giữ NOTES nào còn đúng.

6. **Checkpoint** (Giao thức 07):
   - `main`: EXPERIENCES và EVIDENCE cho UI-18 (bảng số đo từng cách, cách đã chọn, nguồn), UI-16 (số đo trước và sau, phép cắn), UI-17;
   - `screens`: phần dọn NOTES;
   - **giờ ghi:** chép **nguyên** giá trị của `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn (BE-8).

7. **Chạy toàn bộ:**
   - `npm run check` **10 lần liên tiếp** đạt, trong lúc Project Owner dùng máy bình thường. Mọi lần hỏng đều tính và đếm lại từ đầu.
   - `npm run e2e` **không** đặt `CT_WALKTHROUGH_RUNNER`, **10 lượt liên tiếp đạt**, chạy từng lượt một. Báo Project Owner trước khi bắt đầu; Project Owner dùng máy bình thường, thu nhỏ cửa sổ và gõ phím ở ứng dụng khác.
     - Mọi lần hỏng đều tính, kể cả hết giờ chụp ảnh. Có lần hỏng thì giữ trace và nhật ký, rồi đếm lại từ đầu.
   - Sau 10 lượt: hỏi Project Owner có còn bị cửa sổ e2e giành tiêu điểm không, ghi câu trả lời vào báo cáo.
   - Băm lại `UI/evidence`: phải giống mốc; `git status --short UI/evidence` trống.
   - Chụp lại mốc `%APPDATA%`: phải giống mốc.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-6** (phần V2), **UI-7:** không làm.
- **DSK-17:** không làm (desktop, phiên sau).
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Phiên này không đổi lời gọi nào tới backend. Mã trong `UI/src` vẫn không bao giờ gọi `POST /reminders/checks`.
- Không có màn hình hồ sơ quyền sở hữu; không lời gọi nào tới `/watermark-profiles` hay `/watermark-strengths`.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không sửa tệp nào ngoài `UI/`. Không sửa mã chạy trong `UI/src`; chỉ khối checkpoint. Được **chạy** các lệnh của `Desktop/` và `Backend/`, không sửa chúng. Không thêm cờ `--ct-test-*`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không nới thời gian chờ của ca kiểm thử hay của Playwright, không `retries`, không `skip`, `fixme`, `flaky`. Không viết kiểm thử luôn đạt.
- Không gọi `focus()`, `moveTop()`, `setAlwaysOnTop()` trên cửa sổ ứng dụng; không đổi `focusable`.
- Không chạy e2e có `CT_WALKTHROUGH_RUNNER`.
- Không tắt luật lint, không thêm `eslint-disable`.
- Không tắt, không đổi cấu hình phần mềm diệt virus.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.
- Không dùng sub-agent. Không chạy song song hai lệnh e2e, hai lệnh `check`, hay hai bản ứng dụng.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner:

1. **UI-18:** có bảng số đo trên Windows cho từng cách mở lại (hết thu nhỏ, tiêu điểm trước và sau, treo hay không, 20 lần mỗi cách). Hoặc:
   - có cách đạt cả ba, đã áp vào `window_guard.mjs`, và Project Owner xác nhận không còn bị giành tiêu điểm; hoặc
   - không cách nào đạt, cách hiện tại giữ nguyên, bảng số đo gửi Project Owner quyết.
2. **UI-16:** số đo trước và sau; phép cắn; `npm run check` 10 lần liên tiếp đạt khi Project Owner dùng máy.
3. **UI-17:** `main_layout.spec.ts` dùng cơ chế mở lại cửa sổ; NOTES cũ đã dọn theo Giao thức 07.
4. `npm run e2e` 10 lượt liên tiếp đạt; `UI/evidence` giống mốc; mọi lần chụp mốc `%APPDATA%` giống nhau.
5. Checkpoint `main`, `screens`: YAML hợp lệ, `UNSOLVED_PROBLEMS: []` hoặc ghi rõ việc còn lại; giờ đúng quy ước BE-8.
6. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
7. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
   - bảng UI-16, UI-17, UI-18: trạng thái và bằng chứng;
   - bảng số đo của UI-18;
   - kết quả 10 lần `check`, 10 lượt e2e, số lần mở lại cửa sổ, câu trả lời của Project Owner về tiêu điểm;
   - các lệnh để chạy lại;
   - danh sách ngoại lệ lint mới, nếu có.
