# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-29T20:30:00+07:00
# contract: data_schema 8.0.1, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 21 của dự án, phiên giao diện thứ bảy. **Phiên vá ngắn, chỉ làm UI-10**: các spec e2e khẳng định chữ trên `getByRole('status')` mà không lọc. Xem `.plan/open_issues.md` UI-10.

Phiên này **không** thêm trang, không thêm lời gọi, không đổi hành vi nào của sản phẩm. Chỉ sửa trong `UI/tests/`, `UI/scripts/`, và `UI/package.json` (thêm một bước vào `check`).

Mục đích: năm trang D2 và D3 (`commission_list`, `commission_detail`, `commission_form`, `progress_board`, `stage_change`) đủ điều kiện `hoàn_tất` sau audit.

**Điểm dừng:**
- `npm run check` đạt, và có phép kiểm tĩnh mới;
- spec `commission_form` chạy riêng đạt **30 lần liên tiếp**;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 (luật git) và mục 5 (vận hành layer giao diện, kịch bản bấm thử);
   - `.plan/open_issues.md`: UI-10, UI-9 (đã đóng, để hiểu tiền lệ), UI-4;
   - skill `iwca-implementation` v1.0: `i6-self-check.md` (kịch bản bấm thử, EVIDENCE);
   - checkpoint `screens` (`src/screens/navigation.ts`) và `main` (`src/main.tsx`), phần về e2e và UI-9;
   - mọi tệp trong `UI/tests/e2e/` và `UI/tests/tools/`; `UI/scripts/`; `UI/package.json`;
   - plan này sau cùng.

   Xác nhận Data Schema **`8.0.1`** và API Contract **`4.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **780** kiểm thử.
   - `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **42**.
   - Chạy riêng spec `commission_form` **30 lần**, không đặt biến (`npx playwright test -c tests/e2e/playwright.config.ts commission_form`). Ghi số lần hỏng và câu lỗi. Trên máy chậm có thể 0 lần; vẫn ghi.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **Sửa bốn khẳng định của `commission_form`** (UI-10, việc sửa 1).

   Dòng 109, 175, 211, 237 của `tests/e2e/commission_form_walkthrough.spec.ts` đang dùng `getByRole('status')).toHaveText('…')` trên trang `commission_detail`. Trang này có thể có cùng lúc thông báo chuyển trang và "Đang tải tiến độ…".

   Đổi sang cách mà `stage_change_walkthrough.spec.ts` đã dùng: lọc theo chữ, rồi khẳng định đúng một phần tử khớp, ví dụ `getByRole('status').filter({ hasText: '…' })` kèm `toHaveCount(1)`. Nếu bạn dùng cách khác thì cách đó phải không phụ thuộc việc phần Tiến độ đã tải xong hay chưa; ghi lý do.

3. **Rà mọi `getByRole('status')` trong `tests/e2e/`** (UI-10, việc sửa 2).
   - Lập danh sách mọi chỗ. Hiện có ở `client_detail`, `client_form`, `commission_form`, `stage_change` và `walkthrough_harness.ts`.
   - Với từng chỗ, quyết và ghi lý do:
     - **khẳng định chữ** (`toHaveText`, `toContainText`) trên vùng `status` chưa lọc: lọc theo chữ, **kể cả ở trang D1** hiện chỉ có một vùng `status`, để spec không phụ thuộc số vùng `status` của trang;
     - **chờ mọi chỉ báo tải biến mất** (`toHaveCount(0)`, chủ yếu ở harness): giữ nguyên nếu ý đúng là "không còn vùng `status` nào". Nếu ý thật chỉ là "không còn chỉ báo tải của một phần" thì lọc cho đúng ý đó.
   - Không đổi ý nghĩa của bước nào trong `walkthrough.yaml`. Nếu một bước buộc phải đổi câu chữ, sửa cả `walkthrough.yaml` tương ứng.

4. **Phép kiểm tĩnh trong `npm run check`** (UI-10, việc sửa 3).
   - Thêm một script trong `UI/scripts/`, cùng kiểu với `check_layer.mjs` (Node thuần, không phụ thuộc mới). Script báo lỗi và trả mã thoát khác 0 khi, trong `tests/e2e/**/*.ts`, một khẳng định chữ (`toHaveText`, `toContainText`) được gọi thẳng trên kết quả của `getByRole('status')` chưa lọc (không có `.filter(`, không có tùy chọn `name`).
   - Thêm bước đó vào script `check` của `UI/package.json`. Không sửa bước nào khác, không sửa gì khác trong `package.json`.
   - Thông báo lỗi nêu tệp, dòng, và cách sửa.
   - **Bằng chứng cắn:** tạm thêm một khẳng định chưa lọc vào một spec thì `npm run check` hỏng, và thông báo chỉ đúng dòng đó; khôi phục thì đạt. Ghi cả hai vào EVIDENCE.
   - Script chỉ đọc tệp; không đụng `src/`.

5. **Theo dõi `main_layout.spec.ts`** (UI-10, phần theo dõi). Không sửa gì nếu trong phiên này nó không hỏng. Nếu nó hỏng vì hết giờ chụp ảnh:
   - ghi lại đầy đủ (lần chạy, thời gian, câu lỗi);
   - chưa sửa;
   - báo trong báo cáo cuối phiên.

   Orchestrator sẽ quyết ở audit.

6. **Chạy và ghi bằng chứng.**
   - Spec `commission_form` chạy riêng **30 lần liên tiếp**, không đặt biến: cả 30 lần đạt. Ghi số lần đạt.
   - `npm run e2e` **5 lần liên tiếp** có `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`: cả 5 lần 42 đạt. Ghi dòng tổng kết từng lần.
   - Một lần `npm run e2e` không đặt biến: `UI/evidence` nguyên vẹn (so băm trước và sau).
   - `npm run check` đạt; số kiểm thử **bằng** mốc 780, vì phiên này không thêm kiểm thử vitest nào; nếu khác thì giải thích.

7. **Checkpoint** (Giao thức 07; `clause: external`):
   - `screens`: UI-10 (nguyên nhân, cách sửa, bằng chứng 30 lần và 5 lần); cập nhật NOTE đề xuất trạng thái năm trang D2 và D3 (chỉ đề xuất, không sửa `ui_decomposition.md`);
   - `main`: phép kiểm tĩnh mới là một bước của `check`; mốc kiểm thử; lần chạy không đặt biến.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-10:** toàn bộ phiên này.
- **Ô ngày hiện kiểu tháng/ngày/năm** (NOTE ở `kit`): việc của Desktop (DSK-15); không làm. Giữ NOTE.
- **Giới hạn R13 đã khai:** chấp nhận ở V1, không vá.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

Phiên này không chạm hợp đồng. Không có lời gọi mới, không đổi Adapters, Services, Routers hay màn hình.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- **Không sửa `UI/src/`**, trừ khối chú thích checkpoint ở `src/screens/navigation.ts` và `src/main.tsx`. Nếu thấy lỗi của sản phẩm, ghi lại và báo; không sửa.
- Không thêm trang, không thêm lời gọi, không làm D4.
- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`).
- Không nới thời gian chờ chung (`timeout` của Playwright, của `expect`) để che lỗi không tất định. Không thêm `retries`. Không đánh dấu kiểm thử `skip`, `fixme` hay `flaky`.
- Không tắt luật, không thêm `eslint-disable`.
- Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent để code song song.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. Bốn khẳng định của `commission_form` đã lọc theo chữ. Mọi `getByRole('status')` trong `tests/e2e/` đã rà, mỗi chỗ có lý do giữ hay sửa (ghi trong checkpoint `screens` hoặc báo cáo).
2. Phép kiểm tĩnh nằm trong `npm run check`, có bằng chứng cắn.
3. `git diff` không có dòng nào trong `UI/src/`.
4. Spec `commission_form` chạy riêng đạt **30/30** lần liên tiếp.
5. `npm run e2e` đạt **5/5** lần liên tiếp, mỗi lần 42; một lần không đặt biến để `UI/evidence` nguyên vẹn.
6. `npm run check` đạt; số kiểm thử vitest bằng 780 hoặc có giải thích.
7. Checkpoint `screens`, `main` theo Giao thức 07. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
8. Mốc `%APPDATA%` không đổi.
9. `git status --short` cuối phiên chỉ có tệp trong `UI/tests/`, `UI/scripts/`, `UI/package.json`, `UI/evidence/`, và hai tệp checkpoint (`src/screens/navigation.ts`, `src/main.tsx`: chỉ chú thích). Liệt kê trong báo cáo.

   ⚠ Hai tệp checkpoint là ngoại lệ **chỉ cho khối chú thích**. `git diff` của chúng chỉ được đổi dòng chú thích nằm trong khối checkpoint.
10. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - các lệnh để Project Owner tự chạy;
    - danh sách các chỗ `getByRole('status')` đã rà và quyết định từng chỗ;
    - kết quả theo dõi `main_layout.spec.ts`;
    - đề xuất trạng thái năm trang.
