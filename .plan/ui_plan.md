# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-16T13:22:18+07:00
# contract: data_schema 10.0.1, api_contract 6.2.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Đây là **pha 2 (vá)** của phiên 44, phiên kiểm độc lập giao diện của chặng H. Bạn tiếp tục cùng phiên. Định danh phiên: Project Owner xác nhận số thứ tự trong ngày (pha 1 tạm ghi `coding-agent@2026-10-16#?`). Chưa có câu trả lời thì hỏi lại trước khi ghi checkpoint đầu tiên; không ghi `#?` vào checkpoint.

Orchestrator đã audit báo cáo pha 1 và đánh giá đạt (bản audit Orchestrator giữ riêng). Năm phép cắn không bị bắt của bạn đều tái lập được. Pha 1 có 17 phát hiện, R44-1 → R44-17. Project Owner đã quyết ngày 2026-10-16:
- **duyệt cả bảng.** R44-2 nâng lên mức **cao**, cho khớp mục UI-23 đã có từ bước kiểm kê;
- **R44-8, R44-13, R44-15 là ngoại lệ có chủ đích.** Orchestrator đã ghi vào `.design/ui_decomposition.md` §8. Mã của ba chỗ này **không đổi**, và bạn không mở rộng chúng ra chỗ khác;
- **phần tải lại của R44-14:** Orchestrator đã sửa đặc tả D2 (`commission_form`, mục "Gửi") cho khớp mã: form tải lại danh sách khách sau **mọi** lần phía sau từ chối việc lưu. Hành vi hiện tại đúng đặc tả mới;
- **sơ đồ `CLAUDE.md` mục 4:** Orchestrator đã thêm `tests/main/`, `tests/tools/`, `tests/fixtures/`;
- **`UI/package.json`:** `version` đổi thành `1.0.0`.

Từ pha 2, bạn được sửa tệp trong `UI/`. Được đọc `.plan/open_issues.md` ở các mục: "Chặng H — phiên kiểm độc lập giao diện (phiên 44)", UI-21, UI-22, UI-23. Đọc lại `.design/ui_decomposition.md` §8 và mục `commission_form` của D2. Vẫn không đọc, không ghi `.reviews/`.

**Hợp đồng không đổi** so với pha 1: Data Schema `10.0.1`, API Contract `6.2.0`.

**Điểm dừng:** mọi việc ở mục "VIỆC CẦN LÀM" xong; mọi phép cắn ghi ở từng việc đều bị bắt; `npm run check` ba lượt và `npm run e2e` ba lượt; checkpoint đúng Giao thức 07.

## VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 2)

0. **Đọc lại** plan này từ đầu, các mục `open_issues` nêu trên, `ui_decomposition.md` §8 và mục `commission_form` của D2. Xác nhận Data Schema **`10.0.1`** và API Contract **`6.2.0`**, cả hai `approved`. Sai thì dừng lại và báo.

   **Mốc:** ghi `git status --short` (phải trống) và mốc `%APPDATA%` như pha 1. Hỏi Project Owner trạng thái antivirus nếu pha 1 chưa có câu trả lời.

   **Phép cắn** của pha 2 làm trên bản sao ở `%TEMP%\ct_review_ui\`, dựng như pha 1. Tham số `/XD` của `robocopy` ghi **đường dẫn đầy đủ** của thư mục nguồn cần bỏ, không ghi tên trần (bài học pha 1: `/XD dist` loại nhầm `node_modules\*\dist`). Phép cắn chỉ cần `npm run check` thì được dựng bản sao chỉ có `UI\`; ghi rõ cách dựng trong báo cáo. Xóa đúng thư mục bản sao khi xong, gọi đích danh.

### Nhóm A — máy phải giữ được những luật pha 1 tìm ra chỉ nằm trong tài liệu

Với mỗi việc, làm lại **đúng phép cắn của pha 1** trên bản sao. Phép cắn phải làm lệnh kiểm tra hỏng, và thông báo lỗi chỉ đúng vào vi phạm. Khôi phục rồi xác nhận lệnh lại đạt.

1. **R44-1 (cao): luật R7 cho tệp `.ts`/`.tsx` của kit.**
   - Thêm luật vào `eslint.config.js` cho vùng `src/kit/**/*.{ts,tsx}`: cấm giá trị trình bày thô dạng literal trong chuỗi, template và giá trị thuộc tính JSX. Tối thiểu: mã màu hex, `rgb(`/`rgba(`/`hsl(`/`hsla(`, và độ dài có đơn vị tuyệt đối (`px`, `pt`, `cm`, `mm`, `in`). Với tên màu CSS (`red`, `white`…): cấm ít nhất ở các thuộc tính JSX mang màu (`fill`, `stroke`, `color`, `stopColor`, và thuộc tính bắt đầu bằng `background`). Dùng luật có sẵn của ESLint (ví dụ `no-restricted-syntax` với selector AST); không cài plugin.
   - Tệp token (`tokens.css`) không bị ảnh hưởng: luật chỉ áp cho `.ts`/`.tsx`.
   - Mọi tệp kit hiện có vẫn đạt. Nếu một tệp hiện có vi phạm, dừng lại và báo trước khi sửa tệp đó.
   - **Phép cắn,** ba lần riêng: `kit/_v.tsx` có `fill="#ff0000"`; có `width="16px"`; có `rgb(1,2,3)` trong một chuỗi. Cả ba phải làm `npm run lint` hỏng. Chạy `npm run check` toàn bộ cho ít nhất một lần.
2. **R44-2 = UI-23 (cao): ràng buộc "không có màn hình hồ sơ quyền sở hữu" được kiểm bằng máy.**
   - Script mới trong `UI/scripts/`, chạy như một bước của `npm run check`. Script làm lệnh hỏng khi bất kỳ tệp nào dưới `UI/src/` hay `UI/tests/` chứa một trong bốn chuỗi `/watermark-profiles`, `/watermark-strengths`, `/artworks`, `/verifications`. Thông báo lỗi ghi tệp, dòng và chuỗi.
   - Script quét mọi tệp văn bản, kể cả comment và checkpoint. **Không có danh sách miễn trừ.** Comment và EVIDENCE hiện có trong `src/screens/navigation.ts` đang ghi nguyên văn các chuỗi này (khoảng dòng 128–129, 262–263, 356–357, 522–523, 590–591, 672, 733): viết lại thành một câu trỏ tới script mới (làm cùng việc 15).
   - **Phép cắn:** thêm `GET /watermark-profiles` vào `manage_client/adapters.ts` thì `npm run check` hỏng; bỏ đi thì đạt. Lặp lại với một chuỗi khác (ví dụ `/artworks` trong một tệp dưới `tests/`).
3. **R44-3: `ipc_bridge` chỉ cho gọi đúng các địa chỉ hợp đồng khai báo** (iWCA §4).
   - `SCAFFOLD_UI_CONFIGS` có danh sách địa chỉ `ipc` nhãn `[CONTRACT]`, đúng năm địa chỉ mà giao diện gọi: `dialog:open-file`, `dialog:pick-folder`, `restore:prepare`, `restore:status`, `restore:cancel` (API Contract 6.2.0). Ghi nguồn: `clause_a_common.cross_cutting.native_dialogs` và các lối vào `ipc` của `restore_data`.
   - `createIpcBridge` từ chối địa chỉ ngoài danh sách bằng một Promise bị từ chối, **không** gọi `invoke`. Như vậy một địa chỉ lạ đi theo đúng đường mà Desktop đã dùng khi từ chối (API Contract 6.2.0, `endpoint_forms.ipc`). Không thêm loại kết quả mới, không thêm mã lỗi mới.
   - Ca mới trong kiểm thử của `scaffold_ui`: địa chỉ ngoài danh sách bị từ chối và `invoke` giả không được gọi; năm địa chỉ trong danh sách vẫn đi qua. Một khẳng định so năm địa chỉ của danh sách với chuỗi nguyên văn của hợp đồng, gõ trong kiểm thử.
   - **Phép cắn B8:** `ipc.call('dialog:save-file', {})` trong `backup_data/adapters.ts`. Ca mới phải bắt được, hoặc một ca có sẵn của `backup_data` phải hỏng. Ghi rõ ca nào bắt.
4. **R44-4: máy đo tương phản bắt được cặp màu chưa liệt kê.**
   - `scripts/check_contrast.mjs` báo lỗi khi một CSS module trong kit dùng một token màu chữ hay màu viền mà không có cặp tương ứng trong danh sách. Cách suy cặp do bạn chọn; ghi lý do trong comment đầu script và trong EXPERIENCES của khối `kit`.
   - Hai chỗ đang dùng `--color-action-text-disabled` (`Button.module.css:42`, `ConfirmPanel.module.css:72`) là chữ của thành phần đang bị vô hiệu: WCAG 2.1 tiêu chí 1.4.3 miễn cho thành phần không hoạt động. Hai chỗ đó chỉ được đạt nhờ một **danh sách miễn trừ ghi rõ** trong script: tệp, selector, lý do. Miễn trừ theo token (mọi chỗ dùng token đó đều qua) là không đạt yêu cầu, vì như vậy phép cắn B6b vẫn lọt.
   - **Phép cắn B6b:** chữ của `Caption` đổi sang `--color-action-text-disabled`. `npm run lint:contrast` phải hỏng. Thêm một phép: viền của một ô nhập đổi sang một token chưa có cặp. Cũng phải hỏng.
5. **R44-5: component không dùng token nền.**
   - Luật stylelint cấm `var(--base-*)` trong mọi tệp CSS dưới `src/` trừ `src/kit/tokens/tokens.css`. Dùng luật có sẵn của stylelint (kèm `overrides` nếu cần); không cài plugin.
   - **Phép cắn B6c:** `Caption.module.css` dùng `var(--base-gray-600)`. `npm run lint:style` phải hỏng. Chiều ngược: `tokens.css` vẫn đạt.

### Nhóm B — kiểm thử

6. **R44-6: Routers không kiểm điều ngoài `type`.** Với **mỗi** trường chữ tự do mà Routers của một workflow giao diện kiểm (tên khách, kênh và giá trị liên hệ, tiêu đề đơn, phương thức thanh toán, ghi chú, và những trường khác bạn tìm thấy), thêm ca "giá trị có chữ số, emoji, ký tự đặc biệt vẫn qua Routers". Ca duyệt danh sách trường từ một bảng trong kiểm thử, không viết tay từng ca giống nhau. Trường nào có ràng buộc độ dài trong `type` thì giá trị thử nằm trong giới hạn.
   - **Phép cắn B2b:** thêm `|| /[0-9]/.test(displayName)` vào Routers của `manage_client`. Phải bị bắt. Thêm một phép cùng loại ở Routers của một workflow khác.
7. **R44-7: tám ô thiếu của ma trận I5** (danh sách từ phép cắn nhánh `kind` của pha 1):
   - `commission_form`, kết quả của thao tác tải lại danh sách khách: trang (`CommissionForm.tsx:259` `rejected`, `:263` `contract_violation`) và hook (`use_commission_form.ts:123` `rejected`, `:125` `contract_violation`);
   - `payment_list`, lần đọc lại lặng lẽ sau khi "Hủy khoản" thất bại: `use_payment_list.ts:78` `unreachable`, `:79` `contract_violation`;
   - `reminder_list`, lần đọc lại lặng lẽ sau khi "Đã xem" thất bại: `use_reminder_list.ts:68` `unreachable`, `:69` `contract_violation`.

   Ca khẳng định điều người dùng thấy ở mỗi kết quả. **Phép cắn:** đổi nhãn `case` của từng nhánh đó (như pha 1). Mỗi nhánh phải làm ít nhất một ca hỏng.
8. **R44-17: ngủ cố định và công cụ chẩn đoán cũ.**
   - `tests/e2e/main_layout.spec.ts:88` (`waitForTimeout(2000)`). **Đính chính của Orchestrator:** ca này đợi để chứng minh **không có** thông báo lỗi CSP hay lỗi trang, nên không có sẵn một điều kiện dương để chờ. Tìm một điều kiện dương chắc chắn xảy ra **sau** thời điểm Electron in cảnh báo (ví dụ một sự kiện của trang hay của `webContents`). Có thì thay, và ghi nguồn của điều kiện đó. Không có thì **giữ nguyên** lệnh ngủ, ghi lý do vào comment cạnh dòng đó và vào EXPERIENCES của khối `main`. Không nới hay rút ngắn thời gian.
   - Ba công cụ chẩn đoán của UI-11, UI-18 (đều đã đóng): `tests/tools/ui11_probe.mjs`, `tests/tools/ui18_probe.mjs`, `tests/tools/ui18_launch_probe.mjs`. Trước khi xóa, tìm tên ba tệp trong toàn bộ `UI/` (gồm `package.json`, `tests/`, `src/`, `scripts/`, các tệp cấu hình) và báo kết quả. Không nơi nào dùng thì xóa ba tệp đó, gọi đích danh. Có nơi dùng thì dừng lại và báo.

### Nhóm C — mã và công cụ

9. **R44-14: quyết định ra khỏi hook.**
   - `use_client_form.ts` (`addContact`, `removeContact` gọi `setSaved(null)`): quyết định "lỗi nào còn đúng sau khi hàng đổi chỗ" chuyển vào Services của `manage_client`, theo mẫu `dropLeadTimeErrors` của `send_reminder` (UI-13). Hook chỉ gọi hàm đó qua Routers, giữ kết quả, rồi chuyển đi.
   - `use_commission_form.ts:154`: quyết định "kết quả lưu nào thì tải lại danh sách khách" chuyển vào Services của `manage_commission`. Hành vi không đổi, đúng đặc tả D2 mới: mọi `rejected` có origin `system` thì tải lại; `ok`, `unreachable`, `contract_violation` và `rejected` có origin `input` thì không.
   - Ca của Services cho cả hai quyết định. Ca dựng trang hiện có (`CommissionForm.test.tsx` khoảng dòng 363–378, cùng ca của `client_form`) đạt như cũ.
   - **Phép cắn:** trong Services mới, cho `unreachable` cũng tải lại. Một ca phải hỏng.
10. **R44-16: `walkthrough_app.mjs` kiểm đường dẫn trước khi xóa.** Trước mỗi `fs.rmSync` đệ quy trên một đường dẫn đọc từ `KEPT_FILE` (khoảng dòng 106–111 và 225): đường dẫn đã chuẩn hóa phải nằm ngay trong `os.tmpdir()`, và tên thư mục bắt đầu bằng `ct-ui-walkthrough-`. Không thỏa thì không xóa, in một dòng cảnh báo, và xóa `KEPT_FILE`. Viết phần kiểm thành một hàm trong `walkthrough_lib.mjs` để kiểm thử được bằng Vitest: đường dẫn hợp lệ, đường dẫn ngoài tmpdir, tiền tố sai, đường dẫn có `..`, đường dẫn lồng sâu hơn một cấp. Ca phải chạy trong `npm run check`. Hiện `include` của Vitest chỉ gồm `src/**` và `tests/main/**` (`vite.config.ts:20`): được thêm một mẫu cho tệp kiểm thử dưới `tests/tools/`, và ghi lý do vào EXPERIENCES của khối `main`. Ca không mở ứng dụng, không tạo hay xóa thư mục thật ngoài thư mục tạm của chính nó. Không chạy `walkthrough:app` ở pha này.
11. **UI-21: dọn sau khi sửa `.gitignore` gốc.**
    - Viết lại `main-EXP-033` trong `src/main.tsx` cho đúng hiện trạng, giữ id.
    - Bỏ hai dòng phủ định thừa của `UI/.gitignore`. Trước và sau khi bỏ, liệt kê tệp được theo dõi bằng `git ls-files UI/evidence UI/tests`, rồi đưa danh sách đó vào `git -c core.ignorecase=true check-ignore -v --no-index --stdin`. Kết quả phải là không tệp nào bị bỏ qua (gồm `UI/evidence/walkthroughs/backup/`). Ghi lệnh và kết quả vào báo cáo. Có tệp bị bỏ qua thì giữ lại hai dòng đó và báo.
12. **Phiên bản `1.0.0`:** `version` trong `UI/package.json`, và hai chỗ tương ứng trong `UI/package-lock.json` (khóa gốc và mục `packages[""]`), thành `1.0.0`. Sửa bằng công cụ soạn tệp. Không chạy `npm install`, `npm version` hay `npm ci`, kể cả `--dry-run`. Xác nhận `git diff UI/package-lock.json` chỉ có hai dòng `version`, và `npm run check` đạt.

### Nhóm D — checkpoint, comment, Configs

13. **R44-9:** dòng ghi phiên bản hợp đồng trong Configs của các workflow giao diện ghi đúng phiên bản hiện hành: API Contract `6.2.0`, Data Schema `10.0.1`. Các câu ghi phiên bản lúc một luật ra đời (ví dụ "Data Schema 7.0.0, CT-2") thì giữ nguyên. Không thêm script đọc `.contracts/`.
14. **R44-10 (gồm UI-22):** bỏ 11 NOTES quá 14 ngày: `main` 5, `kit` 2, `update_progress` 1, `view_income_report` 3. NOTE nào còn giá trị thật thì chuyển thành EXPERIENCES (id mới, theo Giao thức 07); còn lại thì xóa. Ghi trong báo cáo từng NOTE đi đâu.
15. **R44-11:** EVIDENCE của `main`, `screens`, `kit` chỉ giữ bằng chứng mới nhất cho mỗi khẳng định (Giao thức 07: không cộng dồn lịch sử). Gộp các mục "môi trường, mốc phiên N" thành một mục mốc hiện tại, ghi số kiểm thử sau pha 2. Kinh nghiệm thật đang nằm trong EVIDENCE hay nhật ký phiên thì chuyển vào EXPERIENCES. Không xóa bằng chứng duy nhất của một khẳng định còn đúng.
16. **R44-12:** EVIDENCE chạy thật của `backup_data` ghi đúng trang `backup` và các bước `S1`–`S5` của `walkthrough.yaml`; bỏ số liệu cũ ("1679", "75 passed").
17. Ghi vào EXPERIENCES của đúng khối:
    - `scaffold_ui`: danh sách địa chỉ `ipc` và cách từ chối (R44-3), trích API Contract 6.2.0 `endpoint_forms.ipc`;
    - `kit`: luật R7 cho `.ts`/`.tsx` (R44-1), luật token nền (R44-5), cách suy cặp tương phản và danh sách miễn trừ (R44-4);
    - `screens`: script kiểm bốn đường dẫn watermark (R44-2);
    - `manage_client`, `manage_commission`: hai quyết định chuyển từ hook vào Services (R44-14).

    Ba ngoại lệ ở `ui_decomposition.md` §8: checkpoint chỉ trỏ tới §8 nếu cần nhắc; không viết lại lý do.

### Nhóm E — chạy và bằng chứng

18. **Theo thứ tự:**
    - Trong `UI/`: `npm run check` **ba lượt liên tiếp** (tiêu chí ổn định của chặng H). Mọi lượt hỏng đều tính và phải báo: bước nào, ca nào, lỗi gì.
    - Trong `Desktop/`: `npm run build`.
    - Trong `UI/`: `npm run e2e` **ba lượt liên tiếp**, **không đặt `CT_WALKTHROUGH_RUNNER`**, trên máy Project Owner trong lúc anh dùng máy bình thường. Mốc **83**. Sau mỗi lượt, `UI/evidence/` không đổi.
    - Ca nào hỏng thì tìm nguyên nhân. Không chạy lại cho tới khi đạt, không nới thời gian chờ.
    - Không chạy hai lệnh kiểm thử cùng lúc.
19. **Checkpoint** theo Giao thức 07, ở mọi khối bạn sửa:
    - EVIDENCE gồm các phép cắn của pha 2, ba lượt `npm run check`, ba lượt e2e;
    - **Giờ ghi:** với mỗi khối, chép **nguyên** giá trị `Get-Date -Format o` lấy **ngay trước khi ghi khối đó**. Không dùng chung một giá trị cho nhiều khối. Không sửa ngược khối không đụng tới;
    - `UNSOLVED_PROBLEMS: []` ở mọi khối;
    - **nếu sửa checkpoint sau khi đã chạy ba lượt, chạy lại `npm run check` một lượt** và ghi điều đó trong báo cáo.

## BÁO CÁO PHA 2

Viết bằng tiếng Việt, ngắn gọn, theo `CLAUDE.md` mục 5. Báo cáo gồm:
1. Bảng từng việc (nhóm A → D): đã làm gì, ở tệp nào, phép cắn và kết quả (lệnh hay ca nào bắt).
2. Ba lượt `npm run check`: kết quả từng bước của từng lượt; số kiểm thử Vitest (mốc pha 1: 1936). Ba lượt e2e: số đạt và hỏng từng lượt, tên ca hỏng, thời gian.
3. UI-21: lệnh `check-ignore` và kết quả trước, sau. R44-17: điều kiện đã dùng, hoặc lý do giữ lệnh ngủ; kết quả tìm kiếm trước khi xóa ba công cụ.
4. R44-10: từng NOTE đi đâu.
5. `git status --short`: mọi dòng phải nằm trong `UI/`. Tệp mới thì kèm `git -c core.ignorecase=true check-ignore -v`. Tệp đã xóa thì gọi tên.
6. Mốc `%APPDATA%` đầu và cuối. Thư mục tạm đã tạo và đã xóa.
7. Chỗ nào đã dừng để báo, nếu có, và điều cần quyết.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG VÀ ĐẶC TẢ

- Giao diện là bên gọi `external`. Không lời gọi mới, không lối vào mới, không nhãn hay mã lỗi mới. Danh sách địa chỉ `ipc` của việc 3 chỉ chứa năm địa chỉ giao diện đã gọi.
- API Contract 6.2.0, `endpoint_forms.ipc`: lời gọi tới địa chỉ không khai báo thì không có đối tượng trả lời, `invoke` bị từ chối. Bridge của giao diện từ chối sớm theo đúng cách đó.
- `.design/ui_decomposition.md` §8: R44-8, R44-13, R44-15 là ngoại lệ có chủ đích. Không đổi mã của ba chỗ đó, không thêm chỗ mới cùng loại.
- Đặc tả D2 (`commission_form`, "Gửi"): tải lại danh sách khách sau mọi lần phía sau từ chối việc lưu.
- 15 trang vẫn `hoàn_tất`. Pha 2 không đổi điều người dùng thấy, nên không trang nào trở lại `đang_làm`. Nếu một việc buộc phải đổi điều người dùng thấy, dừng lại và báo.
- ⚠ Giao diện V1 không gọi `manage_watermark_profile`, dù endpoint đang chạy ở backend. Watermark (`/artworks`, `/verifications`) thuộc V4 trở đi.

## CẢNH BÁO — điều KHÔNG được làm trong pha 2

- ⚠ **Không thêm màn hình hồ sơ quyền sở hữu**: không trang, không workflow, không lời gọi nào tới `/watermark-profiles`, `/watermark-strengths`. Chỉ ngoại lệ: phép cắn của việc 2, trên bản sao, khôi phục ngay.
- Không sửa tệp nào ngoài `UI/`. Được **chạy** `npm run build` trong `Desktop/`; không sửa `Desktop/`, không sửa `Backend/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không đặt `CT_WALKTHROUGH_RUNNER`. Không chạy `walkthrough:app`, `walkthrough:backend` hay công cụ nào ghi vào `UI/evidence/`. `UI/evidence/` không đổi.
- Không chạy `npm ci`, `npm install`, `npm version`, `npm audit fix`. Không cài gói, plugin, linter hay công cụ nào.
- Không chạy kiểm thử của `Backend/`. Không chạy `npm test`, `npm run dist`, `test:packaged` của `Desktop/`.
- Không tắt luật lint, không thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `stylelint-disable`, kể cả trong bản sao, trừ khi đó chính là một phép cắn có ghi rõ. Không viết kiểm thử luôn đạt.
- Không nới thời gian chờ, không thêm `retries`, `skip`, `fixme`. Không gọi `focus()`, `moveTop()`, `restore()` trên cửa sổ ngoài cơ chế có sẵn của công cụ kiểm thử.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash`, `clean`, `tag` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật. Mọi lần mở ứng dụng phải kèm `--ct-test-data-dir`.
- Không cài bộ cài, không gỡ bản đã cài, không sửa registry.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus.
- Phép cắn chỉ làm trên bản sao ở `%TEMP%\ct_review_ui\`, không junction, không liên kết tượng trưng; `/XD` ghi đường dẫn đầy đủ. Chỉ xóa đúng thư mục bạn tạo, gọi đích danh, không xóa theo mẫu tên. Ba tệp công cụ ở việc 8 cũng xóa bằng tên đầy đủ.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.
- Gặp chỗ dường như phải đổi hợp đồng, đặc tả I1 hay điều người dùng thấy: dừng lại và báo.

## TIÊU CHÍ HOÀN TẤT PHA 2

1. Nhóm A: năm việc xong; phép cắn R44-1 (ba dạng), R44-2 (hai chuỗi), B8, B6b cùng phép viền, B6c đều bị bắt; chiều ngược của R44-5 đạt; mọi tệp hiện có vẫn đạt.
2. Nhóm B: R44-6 có ca theo bảng, hai phép cắn bị bắt; tám ô của R44-7 có ca, phép cắn từng nhánh bị bắt; R44-17 xong (điều kiện mới hoặc lý do ghi rõ; ba công cụ đã xóa sau khi tìm kiếm).
3. Nhóm C: R44-14 có ca Services, phép cắn bị bắt, hành vi không đổi; R44-16 có hàm kiểm và ca Vitest; UI-21 xong với kết quả `check-ignore`; `UI/package.json` và `package-lock.json` ở `1.0.0`.
4. Nhóm D: R44-9 → R44-12 xong; không còn NOTE quá 14 ngày; không còn chuỗi đường dẫn watermark trong `UI/src/`, `UI/tests/`.
5. `npm run check` ba lượt liên tiếp và `npm run e2e` ba lượt liên tiếp (83/83 mỗi lượt), mọi lượt đã báo; `UI/evidence/` không đổi.
6. Checkpoint: YAML hợp lệ, `UNSOLVED_PROBLEMS: []`, giờ ghi lấy riêng cho từng khối, định danh phiên đã được Project Owner xác nhận.
7. `git status --short` chỉ có tệp trong `UI/`; mốc `%APPDATA%` giống đầu phiên.
