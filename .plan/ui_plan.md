# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-01T21:30:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 25 của dự án, phiên giao diện thứ mười. Đây là **phiên vá ngắn sau D5**, không có trang mới. Ba việc, theo thứ tự ưu tiên:

1. **CT-5:** `view_income_report` theo Data Schema 9.0.2. Luật "ngày bắt đầu không sau ngày kết thúc" nay nằm trong `type` của `period_to`. **Hành vi không đổi**: chỉ đổi số phiên bản và các chú thích trích hợp đồng.
2. **UI-12:** ca focus `StageChange.test.tsx` không tất định trên Windows. Tìm nguyên nhân và sửa.
3. **UI-11:** thí nghiệm có đối chứng để biết vì sao `page.screenshot` treo 30 s trên Windows.

Mọi chi tiết và dữ liệu đã có nằm ở `.plan/open_issues.md`, mục **CT-5**, **UI-12**, **UI-11**. Plan này không chép lại dữ liệu.

**Điểm dừng:**
- `npm run check` đạt, số kiểm thử không giảm so với mốc 1303;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`;
- có kết luận cho UI-12 và báo cáo thí nghiệm UI-11, kể cả khi thí nghiệm không ra kết quả.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 và mục 5;
   - skill `iwca-implementation` v1.0: `iwca_theory.md` §5 (ranh giới kiểm trước khi gửi), `i3-logic.md`, `i5-screens.md`;
   - `.plan/open_issues.md`: **CT-5**, **UI-12**, **UI-11** (đọc hết phần "Dữ liệu phiên 22" và "Dữ liệu phiên 24"), BE-8 (quy ước giờ trong checkpoint);
   - `.design/ui_decomposition.md`: mục "Chặng D5 — Thu nhập", phần "Kiểm trước khi gửi" (có dòng đính chính ngày 2026-10-01);
   - hợp đồng: `data_schema.yaml` changelog `v9.0.2` và `view_income_report.input_expected`;
   - khối checkpoint `view_income_report`, `screens`, `main`;
   - mã: `src/logic/workflows/view_income_report/`, `src/screens/pages/stage_change/` (cả kiểm thử), `tests/e2e/walkthrough_harness.ts`, `tests/tools/walkthrough_lib.mjs`;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **1303**. Nếu ca `StageChange` hỏng ở đây, ghi lại; đó là dữ liệu cho việc 3.
   - `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **59**.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **CT-5: `view_income_report` lên Data Schema 9.0.2.** Không đổi hành vi.
   - `configs.ts`: `contract.dataSchema: '9.0.2'`. Các chú thích `[CONTRACT]` trích `data_schema.yaml 9.0.1` đổi sang `9.0.2`.
   - Chú thích của luật thứ tự ngày (`configs.ts` `inputMessages`, `routers.ts` `readDraft`): trích đúng nguồn mới, `view_income_report.input_expected.period_to` `type: "date (on or after period_from)"`, thay cho `description`.
   - Các chú thích khác trích `9.0.1` trong workflow này (`adapters.ts`, `entities.ts`) cũng đổi sang `9.0.2`.
   - Kiểm thử "Configs name Data Schema …" đổi theo.
   - Checkpoint `view_income_report`: NOTE câu hỏi về luật thứ tự ngày ghi đã được trả lời (CT-5, Data Schema 9.0.2); không xóa NOTE cũ, thêm dòng trả lời.
   - **Không** đổi Configs của workflow khác. Mỗi workflow ghi phiên bản hợp đồng mà chính nó hiện thực.

3. **UI-12: ca focus không tất định của `StageChange`.**
   - Đọc ca "rejected input (no stage chosen)" trong `src/screens/pages/stage_change/tests/StageChange.test.tsx` (quanh dòng 173–186). Ca khẳng định `isFocused(select())` **ngay** sau khi `findByRole('alert')` trả về. Nếu focus được đặt trong một effect chạy sau lần vẽ có `alert`, đó là chỗ phụ thuộc thời điểm. Đây là gợi ý để đọc, không phải kết luận: hãy xác nhận bằng mã.
   - Tìm cùng mẫu ở các kiểm thử dựng trang khác (`ClientForm`, `CommissionForm`, `PaymentForm`, `IncomeReport`…), vì chúng có cùng luật "focus tới ô lỗi đầu tiên".
   - Sửa đúng chỗ:
     - nếu là kiểm thử khẳng định sớm, chờ đúng điều kiện (ví dụ `waitFor` trên chính focus);
     - nếu là mã đặt focus sai thời điểm, sửa mã (kit hoặc trang) và giữ hành vi.

     Không thêm `retries`, không nới thời gian chờ chung, không `skip`.
   - **Tiêu chí đóng:** chạy riêng `StageChange.test.tsx` **50 lần liên tiếp** trên Windows không hỏng; ghi lệnh và kết quả. Nếu bạn sửa cùng mẫu ở tệp khác, mỗi tệp đó cũng chạy 20 lần liên tiếp.

4. **UI-11: thí nghiệm có đối chứng.** Mục tiêu là **biết nguyên nhân**, không phải làm cho e2e xanh.
   - **4a. Tái hiện có chủ đích.** Viết một công cụ chẩn đoán riêng, ví dụ `tests/tools/ui11_probe.mjs` (không phải spec của `npm run e2e`, không chạy trong `npm run check`).
     - Công cụ mở ứng dụng bằng Playwright `_electron`, giống harness, với backend thật và thư mục dữ liệu tạm.
     - Nó chụp ảnh trong ít nhất ba điều kiện: (i) cửa sổ bình thường; (ii) cửa sổ bị thu nhỏ (`BrowserWindow.minimize()` qua `app.evaluate`); (iii) cửa sổ bị một cửa sổ khác che kín, hoặc mất tiêu điểm. Mỗi điều kiện chụp ít nhất 20 lần, mỗi lần có giới hạn thời gian riêng của công cụ (ví dụ 10 s), và ghi thời gian từng lần.
     - Kết quả mong đợi: biết điều kiện nào làm lệnh chụp treo, nếu có.
   - **4b. Thử cờ của Chromium**, chỉ khi 4a tái hiện được.
     - Tra tài liệu của **đúng phiên bản** Electron và Chromium đang dùng để chọn cờ tắt cơ chế ngừng vẽ cửa sổ bị che hoặc ở nền (ví dụ cờ về "native window occlusion" và "backgrounding"). Ghi nguồn.
     - **Xác nhận cờ thật sự có hiệu lực** trong tiến trình Electron (ví dụ đọc `app.commandLine.hasSwitch` qua `app.evaluate`); cờ truyền sai chỗ thì thí nghiệm vô nghĩa.
     - Chạy lại 4a với cờ, cùng số lần, cùng máy.
   - **4c. Chỉ khi 4b cho thấy cờ hết treo:** thêm cờ vào **lệnh khởi chạy Electron của harness kiểm thử** (`walkthrough_harness.ts`, và `main_layout.spec.ts` nếu nó tự khởi chạy). **Không** thêm vào Desktop hay ứng dụng thật. Chạy `npm run e2e` 10 lần liên tiếp. Báo rõ đây là thay đổi điều kiện môi trường kiểm thử; Project Owner quyết có giữ hay không lúc audit.
   - Nếu 4a không tái hiện được, dừng ở đó, báo dữ liệu, không thử cờ.
   - Giữ nguyên trace khi hỏng và nhật ký thời gian chụp ảnh; trace của mọi lần hết giờ trong phiên chép vào `UI/test-results/ui11_traces/` như phiên 24.

5. **Chạy toàn bộ.**
   - `npm run check` đạt.
   - `npm run e2e` **5 lần liên tiếp**, chạy từng lượt một, có `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`. Lần hỏng chỉ vì chụp ảnh hết giờ thì giữ trace, không tính, chạy tiếp cho đủ.
   - Một lần không đặt biến: `UI/evidence` nguyên vẹn.
   - Mốc `%APPDATA%` không đổi.

6. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - `view_income_report`: CT-5;
   - `screens` (và `kit` nếu sửa): UI-12;
   - `main`: mốc kiểm thử; kết quả thí nghiệm UI-11 (điều kiện, số lần, thời gian, cờ đã thử, nguồn).
   - **Giờ ghi trong checkpoint lấy bằng lệnh** (`Get-Date -Format o`) ngay trước khi ghi, không ước lượng (BE-8).

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-15** (ô ngày kiểu Mỹ): việc của Desktop, phiên desktop riêng. Không làm.
- **UI-6** (các mục V2): không làm.
- **Phép kiểm tĩnh `lint:e2e`** không bắt locator gán vào biến trước (Q21-1): đừng viết kiểu đó.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Data Schema 9.0.2: `view_income_report.input_expected.period_to` có `type: "date (on or after period_from)"`. Luật này nay là ràng buộc trong ngoặc của `type`: theo iWCA §5, giao diện **được phép** kiểm nó, nhãn `[CONTRACT]`.
- Giá trị đầu vào được chấp nhận không đổi; backend không đổi; API Contract 4.0.0 không đổi.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`).
- Không thêm trang, không làm D6, không làm việc V2. Không đổi hành vi trang nào; riêng việc 3 chỉ được sửa đúng chỗ gây không tất định.
- Không đổi Configs của workflow khác ngoài `view_income_report`.
- Không thêm cờ Chromium vào Desktop hay ứng dụng thật. Ở harness kiểm thử, chỉ thêm khi việc 4b đã chứng minh.
- Không nới thời gian chờ, không thêm `retries`, không đánh dấu `skip`, `fixme` hay `flaky`.
- Không sửa Desktop, không sửa Backend. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không dùng `window.confirm`, `alert` hay hộp thoại gốc nào.
- Không thư viện hay component từ nguồn ngoài; không phụ thuộc mới.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay công cụ chẩn đoán nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent để code song song. Không chạy song song hai lệnh e2e hay hai lần chạy công cụ chẩn đoán.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **CT-5:** Configs của `view_income_report` ghi Data Schema 9.0.2; chú thích trích đúng `type` của `period_to`; kiểm thử dựng trang và logic của D5 vẫn đạt; không đổi hành vi.
2. **UI-12:** nêu nguyên nhân (trích dòng mã); `StageChange.test.tsx` chạy riêng 50/50 lần; các tệp sửa cùng mẫu chạy 20/20.
3. **UI-11:** báo cáo thí nghiệm gồm:
   - bảng điều kiện × số lần × số lần treo × thời gian lớn nhất;
   - nếu thử cờ: tên cờ, nguồn tài liệu, bằng chứng cờ có hiệu lực, kết quả có cờ;
   - nếu thêm cờ vào harness: 10 lần `npm run e2e` liên tiếp.

   Không tái hiện được cũng là một kết quả, miễn có số liệu.
4. `npm run check` đạt (kể cả `lint:e2e`), số kiểm thử không giảm so với 1303.
5. `npm run e2e` đạt **5/5 lần liên tiếp**, 59 ca mỗi lần (hoặc hơn nếu có lý do). Một lần không đặt biến để `UI/evidence` nguyên vẹn.
6. Checkpoint `view_income_report`, `screens`, `main` (và `kit` nếu đổi) theo Giao thức 07, giờ lấy bằng lệnh. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
7. Mốc `%APPDATA%` không đổi.
8. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
9. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm các lệnh để Project Owner tự chạy (gồm lệnh chạy công cụ chẩn đoán UI-11), và danh sách ngoại lệ lint mới, nếu có.
