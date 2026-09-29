# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-29T11:30:00+07:00
# contract: data_schema 8.0.1, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 20 của dự án, phiên giao diện thứ sáu. Hai phần, làm theo thứ tự:

1. **Vá tồn đọng của D2:** UI-9 (e2e `commission_form` S2 không tất định), kèm Q19-3 (nhãn khách vắng mặt). Xem `.plan/open_issues.md` UI-9.
2. **Chặng D3, tiến độ:**
   - workflow giao diện `update_progress`;
   - hai trang mới, `progress_board` và `stage_change`;
   - phần "Tiến độ" trong trang `commission_detail` (trang của D2).

Đặc tả là `.design/ui_decomposition.md`, mục **"Chặng D3 — Tiến độ"** (làm lại I1 ngày 2026-09-29), cùng §5 và §7. Mọi quyết định trình bày, câu chữ, luật kiểm form, cách xác nhận và luật phủ đều đã chốt ở đó. Plan này không chép lại.

Cuối phiên, **cả năm trang** của D2 và D3 được đề xuất `hoàn_tất`: `commission_list`, `commission_detail`, `commission_form`, `progress_board`, `stage_change`.

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`;
- riêng spec `commission_form` đạt **10 lần liên tiếp**;
- mọi kịch bản bấm thử chạy lại trên hệ thống thật.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 (luật git) và mục 5 (vận hành layer giao diện);
   - skill `iwca-implementation` v1.0: `iwca_theory.md` (§6, §7 ma trận R1–R14), `i1-decompose.md` (Bước I1.5: một trang dùng Routers của nhiều workflow), `i3-logic.md`, `i4-kit.md`, `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`: §2 (hàng `update_progress`), §5, mục "Chặng D2 — Đơn hàng", mục **"Chặng D3 — Tiến độ"**, §7;
   - `.plan/open_issues.md`: UI-9; UI-6 (phần để V2);
   - hợp đồng:
     - `data_schema.yaml`: `clause_a_common.types` (`stage_kind`, `progress_entry_record`, `commission_summary_record`) và `formats`; `update_progress` (toàn mục);
     - `api_contract.yaml`: `update_progress`, `manage_commission` (`list_commissions`), `error_codes`, `error_body`, `endpoint_forms.http`;
   - mọi khối checkpoint của `UI/`: `main`, `kit`, `screens`, `scaffold_ui`, `manage_client`, `manage_commission`. Khối `manage_commission` là mẫu gần nhất;
   - plan này sau cùng.

   Xác nhận Data Schema **`8.0.1`** và API Contract **`4.0.0`**, cả hai `approved`, và `update_progress` ở `đã_hoàn_thiện`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm; chạy `npm ci`.
   - `npm run check`: mốc **555** kiểm thử.
   - `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **32**.
   - Chạy riêng spec `commission_form` 10 lần (`npx playwright test -c tests/e2e/playwright.config.ts commission_form`), ghi số lần hỏng. Đây là mốc của UI-9; trên máy chậm có thể 0 lần, vẫn ghi.
   - Chụp mốc `%APPDATA%\CommissionTracker`; cuối phiên chụp lại, hai lần phải giống nhau.
   - Ghi `git status --short` đầu phiên (chỉ đọc).

2. **UI-9: e2e tất định** (`.plan/open_issues.md` UI-9).
   - **Nguyên nhân:** backend ghi `updated_at` tới giây, còn `seedCommissionSample` (`tests/tools/walkthrough_lib.mjs`) không chờ sau lần ghi cuối. Trên máy nhanh, S1 lưu cùng giây với đơn mẫu cuối, nên thứ tự của hai đơn phụ thuộc hai UUID ngẫu nhiên.
   - **Sửa nguồn:** hàm nạp mẫu chờ hơn 1 s **sau** lần ghi cuối, để mọi lần ghi của kịch bản chắc chắn mới hơn dữ liệu mẫu. Áp dụng cho mọi hàm nạp mẫu có ghi đơn, kể cả hàm nạp mẫu mới của D3 nếu có.
   - **Rà mọi khẳng định về vị trí** trong danh sách, ở cả các spec cũ và mới. Chỗ nào hai lần ghi có thể trùng giây thì tìm theo tên, không theo vị trí. Chỗ nào **cố ý** kiểm thứ tự (ví dụ `commission_list` S2) thì các lần ghi phải cách nhau hơn 1 s, và ghi rõ điều đó bằng chú thích.
   - **Q19-3:** nhãn khách vắng mặt ở chế độ sửa của `commission_form` đổi thành "Không tìm thấy khách hàng" (bỏ "(đã lưu trữ)"). Sửa cả kiểm thử của nó.
   - **Bằng chứng:**
     - spec `commission_form` đạt 10/10 lần sau khi sửa;
     - chứng minh bản sửa có tác dụng: tạm bỏ lần chờ sau lần ghi cuối **và** tạm thêm một cách ép hai lần ghi trùng giây (ví dụ lưu S1 ngay sau khi nạp mẫu), cho thấy khẳng định cũ hỏng, rồi khôi phục. Nếu không ép được trên máy này thì ghi rõ đã thử gì.

3. **Logic: workflow giao diện `update_progress`** (I3), đủ các thành phần như `manage_commission`.
   - **Configs:**
     - `contract.dataSchema: '8.0.1'`, `apiContract: '4.0.0'`;
     - bảng tên tiếng Việt của giai đoạn, đúng bảng trong `ui_decomposition.md`;
     - câu chữ mọi thông báo;
     - locale hiển thị.
   - **Adapters:** sáu lời gọi của bảng D3. Kiểm hình dạng bằng Zod.
     - `stage_kind` phải là một trong bốn giá trị của hợp đồng; khác thì là vi phạm hợp đồng.
     - `updated_at` được phép `null`; `from_stage` được phép `null`.
     - `list_commissions` là bản riêng của workflow này (R2).
   - **Services:**
     - nhóm bảng tiến độ theo luật của trang `progress_board` (gồm đơn chưa có mục, và nhóm "Giai đoạn khác");
     - thứ tự trong nhóm;
     - tên giai đoạn;
     - lịch sử mới nhất trước;
     - các giai đoạn chọn được (trừ giai đoạn hiện tại);
     - nhận biết giai đoạn khép lại theo `kind` (không theo mã);
     - định dạng ngày giờ và hạn giao.
   - **Routers:** mỗi thao tác của hai trang mới và của phần Tiến độ là một lối vào. Kiểm form trước khi gửi (chưa chọn giai đoạn → `rejected_input`, khóa ô `to_stage`; ghi chú rỗng → `null`).
   - **Kiểm thử bắt buộc**, ngoài ma trận I3.6:
     - nhóm bảng: đơn không có mục thì nằm ở giai đoạn đầu; nhóm rỗng không có; nhóm theo thứ tự `list_stages`, kể cả khi `list_stages` trả thứ tự khác mặc định; mã giai đoạn lạ; mục của đơn không có trong danh sách đơn bị bỏ;
     - thứ tự trong nhóm: hạn sớm trước, không hạn cuối, cùng hạn thì mới sửa trước;
     - `updated_at: null` và lịch sử rỗng;
     - danh sách chọn không có giai đoạn hiện tại;
     - giai đoạn khép lại nhận theo `kind`: thử với một danh mục giả có mã khác mặc định nhưng `kind` là `finished`;
     - ghi chú chỉ khoảng trắng (ASCII, `U+00A0`, `U+3000`) → `null`.

4. **Kit** (I4). Dùng component có sẵn nếu đủ. Nếu khung xác nhận trong trang cần một component mới (ví dụ một khung cảnh báo có hàng nút), thêm vào kit, dùng token có sẵn, và `check_contrast.mjs` phủ nó. Không dùng `window.confirm`, không hộp thoại gốc. Mọi component mới export qua `kit/index.ts` (R9).

5. **Màn hình** (I5).
   - Trang `progress_board` và `stage_change`, cùng hook của chúng, theo mẫu của D2:
     - cờ tải khởi tạo `true`;
     - hàng nút dưới tiêu đề;
     - focus tới ô lỗi đầu tiên;
     - khi khung xác nhận hiện, focus tới nút "Xác nhận".
   - `commission_detail` thêm phần Tiến độ, dùng Routers của `update_progress` với **hook riêng**, tải riêng và lỗi riêng. Trang **không ghép** dữ liệu của hai workflow: phần đơn hàng và phần Tiến độ chỉ đặt cạnh nhau. Nút "Đổi giai đoạn" trong hàng nút, sau "Sửa", chỉ có khi phần Tiến độ đã tải xong và giai đoạn chưa khép lại.
   - Mục "Tiến độ" trong vùng điều hướng, **sau** "Đơn hàng". Tham số có kiểu cho `stage_change` (`commission_id`, `title`). Ráp nối `update_progress` ở Main và `logic_context`.
   - **Kiểm thử dựng trang:**
     - mọi nhãn của bảng D3, cho từng lời gọi;
     - lần vẽ đầu của hai trang mới và của phần Tiến độ;
     - phần Tiến độ lỗi trong khi phần đơn hàng vẫn hiện;
     - không có nút "Đổi giai đoạn" khi giai đoạn khép lại, và khi phần Tiến độ chưa tải hoặc lỗi;
     - khung xác nhận: hiện khi chọn giai đoạn khép lại, không hiện với giai đoạn thường; "Quay lại" không gửi gì; "Xác nhận" gửi đúng một lần;
     - `stage_change` mở khi giai đoạn đã khép lại thì không có form.

   Không đổi hành vi của ba trang D1; kiểm thử của chúng vẫn đạt.

6. **Kịch bản bấm thử và e2e** (I6.3).
   - `walkthrough.yaml` mới cho `progress_board` và `stage_change`, theo luật phủ D3.
   - Bổ sung các bước của phần Tiến độ vào `commission_detail/walkthrough.yaml`.
   - Kịch bản tự tạo dữ liệu của chính nó; nạp mẫu theo luật của việc 2.
   - Tín hiệu "đã tải xong" là nội dung đã tải; mọi phép so "không đổi" khẳng định giá trị trước khác rỗng.
   - Chạy `npm run e2e` **5 lần liên tiếp** có đặt `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`, ghi dòng tổng kết từng lần. Chạy spec `commission_form` **10 lần liên tiếp**.
   - Chạy thêm một lần không đặt biến: `UI/evidence` không đổi (UI-8 không tái phát).

7. **Tự kiểm I6** cho năm trang của D2 và D3, đủ năm góc; đối chiếu bảy nguyên tắc §7.2, đặc biệt nguyên tắc 5 (xác nhận) ở `stage_change`. Ghi vào checkpoint `screens`.

8. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - khối mới `update_progress` (logic);
   - `manage_commission`: Q19-3;
   - `kit`: component mới, nếu có;
   - `screens`: hai trang mới, phần Tiến độ của `commission_detail`, UI-9, tự kiểm I6, **đề xuất** trạng thái của năm trang;
   - `main`: ráp nối mới, mốc kiểm thử mới.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **UI-9, Q19-3:** việc 2.
- **Ô ngày hiện kiểu tháng/ngày/năm** (NOTE ở checkpoint `kit`): việc của Desktop (DSK-15), **không** làm ở phiên này. Giữ NOTE.
- **Giới hạn R13 đã khai:** Orchestrator chấp nhận ở V1, không vá.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `stage_change` = `{ to_stage: string (a stage of stage_catalog), note: string|null }`. Thân của `change_stage` là `{ "stage_change": … }` (`endpoint_forms.http`).
- Mô tả của workflow `update_progress`:
  - đơn ở giai đoạn có `kind` `finished` hoặc `cancelled` không đổi giai đoạn được;
  - từ giai đoạn khác, đổi được sang **bất kỳ** giai đoạn nào khác của danh mục, không theo thứ tự;
  - đổi sang đúng giai đoạn hiện tại bị từ chối (409).
- `progress_state.updated_at` là `null` khi đơn chưa từng đặt giai đoạn; khi đó `current_stage` là giai đoạn đầu của danh mục.
- `progress_board` chỉ có đơn đã từng đặt giai đoạn.
- `progress_history`: cũ nhất trước; `from_stage` là `null` ở lần đổi đầu tiên.
- `stage_kind` = `'active' | 'on_hold' | 'finished' | 'cancelled'`.
- `list_stages` chỉ có nhãn 200. `error_body.details` không có hình dạng trong hợp đồng: không đọc.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`): không trang, không workflow giao diện, không lời gọi. Watermark thuộc V4 trở đi.
- Không làm thanh toán (D4), báo cáo (D5), nhắc việc (D6). Không thêm lời gọi ngoài sáu lời gọi của bảng D3 và các lời gọi D1, D2 đã có. Việc nào cần một điều chưa có trong `ui_decomposition.md` thì **dừng và báo**.
- Không kéo thả trên bảng tiến độ, không đổi giai đoạn ngay trên bảng: đổi giai đoạn chỉ qua trang `stage_change`.
- Không dùng `window.confirm`, `alert` hay hộp thoại gốc nào.
- Không sửa Desktop (kể cả DSK-15), không sửa Backend. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend.
- Không làm các mục V2: Enter để lưu, chặn rời form, lọc hay tìm kiếm, đánh dấu đơn quá hạn.
- Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài, không Tailwind.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent để code song song.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **UI-9:**
   - hàm nạp mẫu chờ sau lần ghi cuối;
   - mọi khẳng định vị trí đã rà;
   - spec `commission_form` đạt 10/10 lần;
   - có bằng chứng bản sửa có tác dụng, hoặc ghi rõ vì sao không ép được;
   - Q19-3 đã sửa.
2. Workflow `update_progress` có đủ thành phần; Configs ghi Data Schema 8.0.1; các ca kiểm thử bắt buộc của việc 3 đều có.
3. Hai trang mới và phần Tiến độ chạy đúng đặc tả D3. Khung xác nhận nằm trong trang. Kiểm thử dựng trang phủ mọi nhãn. Ba trang D1 không đổi hành vi.
4. `npm run check` đạt, với số kiểm thử cao hơn mốc 555.
5. `npm run e2e` đạt **5/5 lần liên tiếp**, có dòng tổng kết từng lần; số e2e cao hơn mốc 32. Một lần chạy không đặt biến để `UI/evidence` nguyên vẹn.
6. Mọi kịch bản bấm thử (ba D1, ba D2 đã bổ sung, hai D3) chạy trên hệ thống thật, có ảnh chụp và đúng tên người chạy.
7. Tự kiểm I6 đủ năm góc cho năm trang của D2 và D3.
8. Checkpoint `update_progress` (mới), `manage_commission`, `screens`, `main`, và `kit` nếu có đổi, theo Giao thức 07. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
9. Mốc `%APPDATA%` không đổi.
10. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê chúng trong báo cáo.
11. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay** cho hai kịch bản mới và các bước mới của `commission_detail`;
    - đề xuất trạng thái của năm trang;
    - danh sách ngoại lệ lint mới, nếu có.
