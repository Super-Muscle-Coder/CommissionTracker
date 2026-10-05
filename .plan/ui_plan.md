# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-05T15:10:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 31 của dự án, phiên giao diện thứ mười bốn. Đây là **phiên vá ngắn** cho công cụ kiểm thử. Hai mục; không có trang mới, không đổi hành vi của giao diện:

| Mục | Việc | Mức |
|---|---|---|
| **UI-18** (phần còn lại) | Các ứng dụng mà e2e mở phải hiện lên **không** giành tiêu điểm của người đang dùng máy. Desktop đã có cờ `--ct-test-show-inactive` (DSK-18, phiên 30); phiên này đưa cờ đó vào công cụ e2e của giao diện | trung bình |
| **UI-19** | Ca D6 của `app_root.test.tsx` hỏng ngắt quãng ở khẳng định `toHaveBeenCalledTimes(3)` | thấp |

Chi tiết và dữ liệu từng mục ở `.plan/open_issues.md`. Plan này chỉ ghi cách làm và tiêu chí.

**Bối cảnh:**
- Từ phiên 30, ứng dụng nào e2e mở cũng chạy `reminder_ticker`, nên trong các lượt có `reminder_list` sẽ hiện thông báo Windows thật. Đó là hành vi đúng. Thông báo không giành tiêu điểm.
- **Như phiên 28 và 29, Project Owner dùng máy bình thường trong lúc e2e chạy:** gõ phím ở ứng dụng khác, thu nhỏ cửa sổ, để một cửa sổ khác che lên ứng dụng. Đó là điều kiện phiên này phải chịu được.

Không trang nào đổi trạng thái. Mã trong `UI/src` không đổi, trừ khối checkpoint và tệp kiểm thử của UI-19.

**Điểm dừng:**
- `npm run check` đạt **10 lần liên tiếp**;
- `npm run e2e` đạt **10 lượt liên tiếp** trong lúc Project Owner dùng máy;
- Project Owner xác nhận không còn bị cửa sổ e2e giành tiêu điểm;
- `UI/evidence` không đổi.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 và mục 5 (nhất là "Vận hành layer giao diện" và "Chạy ứng dụng thật");
   - `.plan/open_issues.md`: **UI-18** (cả phần đã đóng ở phiên 29), **UI-19**, **DSK-18** (đã đóng; đặc tả cờ), UI-11 (đã đóng; cơ chế mở lại cửa sổ), BE-8 (giờ trong checkpoint);
   - `Desktop/configs/desktop.json`: `test_flags.show_inactive` và `packaged.ignored_test_flags` (chỉ đọc);
   - khối checkpoint Main của Desktop, `Desktop/src/main.ts`: `main-EXP-024` (cờ DSK-18: cách hoạt động, cái gì đo được tất định và cái gì không). Chỉ đọc;
   - mọi khối checkpoint của `UI/`, nhất là `main` (`src/main.tsx`) và `screens` (`src/screens/navigation.ts`);
   - `UI/tests/tools/walkthrough_lib.mjs` (+ `.d.mts`), `UI/tests/e2e/walkthrough_harness.ts`, `UI/tests/e2e/main_layout.spec.ts`, `UI/tests/tools/window_guard.mjs`, `UI/tests/tools/ui18_launch_probe.mjs`, `UI/tests/tools/walkthrough_app.mjs`;
   - `UI/src/screens/tests/app_root.test.tsx` quanh dòng 291;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`, và Desktop có `test_flags.show_inactive = "--ct-test-show-inactive"`. Sai khác thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm. Chạy `npm ci` trong `UI/`.
   - `npm run check`: mốc **1555**. Chạy **5 lần**, ghi số lần UI-19 hỏng.
   - `npm run build` trong `Desktop/`, rồi `npm run e2e` **không** đặt `CT_WALKTHROUGH_RUNNER`: mốc **70**.
   - Băm toàn bộ `UI/evidence` (SHA-256 từng tệp) làm mốc.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **UI-18: e2e mở ứng dụng với `--ct-test-show-inactive`.** Làm trước, để mọi lượt e2e sau trong phiên đã dùng cờ.
   - **Đo trước (mốc):** chạy `ui18_launch_probe.mjs` với **20** lần mở, đúng như phiên 29. Một tiến trình khác giữ nền trước; công cụ ghi lần mở nào để ứng dụng vào nền trước, và sau bao lâu.
   - **Sửa:**
     - `launchArgs` của `walkthrough_lib.mjs` nhận thêm một tùy chọn (ví dụ `showInactive`). Khi bật, nó thêm `test_flags.show_inactive`, đọc từ `Desktop/configs/desktop.json`, không gõ thẳng chuỗi. Cập nhật `walkthrough_lib.d.mts` theo.
     - `walkthrough_harness.ts` bật tùy chọn đó, **trừ khi** `CT_WALKTHROUGH_RUNNER` được đặt. Ở chế độ ghi bằng chứng, ứng dụng hiện ra như cũ, để ảnh trong `UI/evidence` được chụp trong đúng điều kiện cũ: cửa sổ không có tiêu điểm có thể vẽ vòng tiêu điểm và con trỏ nhập liệu khác đi. Ghi lý do này trong comment và checkpoint.
     - `main_layout.spec.ts` tự mở Electron với mảng tham số riêng: thêm cờ, đọc từ config như hai cờ đang có.
     - `walkthrough_app.mjs` (công cụ Project Owner chạy tay) **không** đổi: ở đó cửa sổ phải hiện ra trước mặt người dùng.
     - Các công cụ đo cũ (`ui11_probe.mjs`, `ui18_probe.mjs`) không đổi.
   - **Đo sau:** thêm vào `ui18_launch_probe.mjs` một tùy chọn bật cờ (ví dụ `--show-inactive`), rồi chạy 20 lần mở có cờ. Kỳ vọng: không lần nào ứng dụng vào nền trước. Ghi bảng trước/sau.
     - Khi sửa công cụ đo này, chạy PowerShell như `Desktop/tests/helpers.ts`: `-NoProfile -NonInteractive -File`, **bỏ** `-ExecutionPolicy Bypass` (cùng lý do với DSK-14). Nếu bỏ rồi mà script không chạy được thì báo, không tự thêm lại.
   - **Kiểm thử tự động cho việc truyền cờ.** Có thể là một ca trong `npm run check` gọi `launchArgs` hai cách, hoặc một khẳng định trong `main_layout.spec.ts` đọc log của Main: có cờ thì log có dòng `ready-to-show: showing the window without focus (test flag)`. Agent chọn, ghi lý do.
   - **Phép cắn:** bỏ việc truyền cờ trong harness thì kiểm thử ở trên hỏng, và lần đo có cờ quay về mức mốc. Ghi số liệu, khôi phục.
   - **Rủi ro cần quan sát, Orchestrator chưa nắm chắc:** cửa sổ hiện không tiêu điểm có thể bị cửa sổ khác của Project Owner che kín ngay từ đầu. Phiên 25 và 28 chỉ thấy lệnh chụp treo khi cửa sổ **thu nhỏ**, chưa thấy khi bị che. Trong 10 lượt e2e ở việc 5, mọi lần hết giờ chụp ảnh đều phải ghi trạng thái cửa sổ (nhật ký có sẵn của UI-11), để biết bị che có gây treo không. Không đổi cách chụp hay thời gian chờ để né.

3. **UI-19: ca D6 của `app_root.test.tsx`.**
   - **Đo trước:** chạy riêng tệp đó **50 lần**; ghi số lần hỏng.
   - **Sửa:** chờ lần gọi `loadPending` thứ ba bằng `vi.waitFor` (hoặc `waitFor` của Testing Library), thay vì khẳng định ngay sau `findByText`. Điều ca khẳng định không đổi: vẫn đúng **ba** lần gọi, và câu "Đã lưu cài đặt nhắc việc." vẫn hiện đúng một lần.
   - **Phép cắn tất định:** trên bản tạm, làm lần gọi `loadPending` thứ ba đến chậm (ví dụ `answers` trả lời sau một `setTimeout` ngắn ở lần thứ ba). Mã cũ hỏng, mã mới đạt. Ghi số liệu, khôi phục.
   - Không nới `testTimeout`, không `retries`, không bỏ ca.

4. **Checkpoint** (Giao thức 07):
   - `main` (`src/main.tsx`): EXPERIENCES và EVIDENCE cho UI-18 (bảng đo trước/sau, chế độ ghi bằng chứng không bật cờ và lý do, phép cắn) và UI-19 (số đo, phép cắn). Nếu UI-19 hợp hơn ở `screens` thì đặt ở đó, ghi lý do.
   - **Giờ ghi:** chép **nguyên** giá trị của `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn (BE-8).

5. **Chạy toàn bộ:**
   - `npm run check` **10 lần liên tiếp** đạt. Mọi lần hỏng đều tính, và đếm lại từ đầu.
   - `npm run e2e` **không** đặt `CT_WALKTHROUGH_RUNNER`, **10 lượt liên tiếp đạt**, chạy từng lượt một.
     - Báo Project Owner trước khi bắt đầu. Project Owner dùng máy bình thường: gõ phím ở ứng dụng khác, thu nhỏ cửa sổ, để cửa sổ khác che lên ứng dụng.
     - Mọi lần hỏng đều tính, kể cả hết giờ chụp ảnh. Có lần hỏng thì giữ trace và nhật ký, rồi đếm lại từ đầu.
   - Sau 10 lượt: hỏi Project Owner có còn bị cửa sổ e2e giành tiêu điểm không, ghi nguyên câu trả lời vào báo cáo.
   - Băm lại `UI/evidence`: phải giống mốc; `git status --short UI/evidence` trống.
   - Chụp lại mốc `%APPDATA%`: phải giống mốc.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-6** (phần V2), **UI-7:** không làm.
- **DSK-19, DSK-20, DSK-21:** việc của layer desktop hoặc chặng G, không làm ở phiên này.
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Phiên này không đổi lời gọi nào tới backend. Mã trong `UI/src` vẫn không bao giờ gọi `POST /reminders/checks`: chỉ `reminder_ticker` của Desktop gọi nó (`check_due.called_by: [reminder_ticker]`).
- Không có màn hình hồ sơ quyền sở hữu; không lời gọi nào tới `/watermark-profiles` hay `/watermark-strengths`.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không sửa tệp nào ngoài `UI/`. Không sửa mã chạy trong `UI/src`; chỉ khối checkpoint và tệp kiểm thử `app_root.test.tsx`. Được **chạy** các lệnh của `Desktop/` và `Backend/`, không sửa chúng. Không thêm cờ `--ct-test-*` mới; chỉ dùng cờ Desktop đã có.
- Không bật cờ show-inactive ở chế độ ghi bằng chứng (`CT_WALKTHROUGH_RUNNER`), hay ở `walkthrough_app.mjs`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không nới thời gian chờ của ca kiểm thử hay của Playwright, không `retries`, không `skip`, `fixme`, `flaky`. Không viết kiểm thử luôn đạt.
- Không gọi `focus()`, `moveTop()`, `setAlwaysOnTop()` trên cửa sổ ứng dụng; không đổi `focusable`.
- Không chạy e2e có `CT_WALKTHROUGH_RUNNER`.
- Không tắt luật lint, không thêm `eslint-disable`.
- Không tắt, không đổi cấu hình phần mềm diệt virus. Không thêm `-ExecutionPolicy` vào lệnh PowerShell.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.
- Không dùng sub-agent. Không chạy song song hai lệnh e2e, hai lệnh `check`, hay hai bản ứng dụng.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner:

1. **UI-18:**
   - harness e2e và `main_layout.spec.ts` truyền `--ct-test-show-inactive` (đọc từ config), trừ chế độ ghi bằng chứng; `walkthrough_app.mjs` không đổi;
   - bảng `ui18_launch_probe.mjs` 20 lần mở không cờ và 20 lần có cờ;
   - có kiểm thử tự động cho việc truyền cờ, và phép cắn;
   - Project Owner xác nhận không còn bị giành tiêu điểm sau 10 lượt e2e.
2. **UI-19:** số đo 50 lần trước và sau; phép cắn tất định; khẳng định giữ nguyên.
3. `npm run check` 10 lần liên tiếp đạt; `npm run e2e` 10 lượt liên tiếp đạt; `UI/evidence` giống mốc; mọi lần chụp mốc `%APPDATA%` giống nhau.
4. Checkpoint `main` (và `screens` nếu dùng): YAML hợp lệ, `UNSOLVED_PROBLEMS: []` hoặc ghi rõ việc còn lại; giờ đúng quy ước BE-8.
5. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
6. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
   - bảng UI-18, UI-19: trạng thái và bằng chứng;
   - bảng đo của UI-18 (trước/sau);
   - kết quả 10 lần `check` và 10 lượt e2e; mọi lần hết giờ chụp ảnh, nếu có, kèm trạng thái cửa sổ; câu trả lời của Project Owner về tiêu điểm;
   - các lệnh để chạy lại;
   - danh sách ngoại lệ lint mới, nếu có.
