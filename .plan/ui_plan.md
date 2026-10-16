# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-16T10:11:50+07:00
# contract: data_schema 10.0.1, api_contract 6.2.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Đây là phiên 44 của dự án, phiên giao diện thứ mười bảy. Phiên thuộc **chặng H: rà soát lại toàn bộ V1**, và là **phiên kiểm độc lập** cho layer `UI/`.

Bạn chưa từng thấy mã này được viết ra sao, và đó là lý do bạn được giao việc. Hãy đọc mã như một người kiểm, không phải người viết: không mặc định mã đúng, cũng không mặc định mã sai. Mọi kết luận phải dựa trên tệp, dòng và lệnh chạy được.

Phiên có **hai pha**:
- **Pha 1 (plan này): chỉ đọc.** Đọc mã, chạy kiểm tra, làm phép cắn trên **bản sao nằm ngoài kho**. Không sửa tệp nào trong kho. Cuối pha 1, gửi báo cáo đầy đủ mọi phát hiện, rồi **dừng và chờ**.
- **Pha 2: vá.** Chỉ bắt đầu khi Project Owner mang tới quyết định của Orchestrator, kèm plan pha 2 (sẽ ghi đè tệp này).

**Điểm dừng pha 1:** báo cáo có đủ các phần ở mục "BÁO CÁO PHA 1", và `git status --short` không đổi so với đầu phiên.

## CÂU HỎI CẦN TRẢ LỜI

Một câu hỏi lớn: **`UI/` có theo đúng iWCA (`iwca-implementation` v1.0, dựng trên `wca-implementation` v2.3), đúng hợp đồng, đúng đặc tả I1 (`.design/ui_decomposition.md`) và đúng quy ước trong `CLAUDE.md` không?** Câu hỏi chia thành chín phần.

Phạm vi:
- Main `src/main.tsx` và `src/configs/`;
- phân khu logic: `logic/shared/` và chín workflow (`scaffold_ui` cùng tám workflow giao diện);
- phân khu kit: token, style, component;
- phân khu màn hình: điều hướng, layout, 15 trang cùng hook của chúng;
- `scripts/`, các tệp cấu hình công cụ (`eslint.config.js`, `stylelint.config.js`, `tsconfig*.json`, `vite.config.ts`), `UI.esproj`;
- kiểm thử: kiểm thử trong `src/`, `tests/e2e/`, `tests/tools/`, `tests/fixtures/`;
- kịch bản bấm thử `walkthrough.yaml` và `UI/evidence/`.

### K1 — Bố cục (`i2-scaffold.md` Bước I2.1; `CLAUDE.md` mục 4, "Bố cục `UI/`")
- Bố cục thật khớp sơ đồ ở `CLAUDE.md` mục 4.
- Mỗi workflow giao diện có đủ năm lớp; `scaffold_ui` chỉ có lớp nó cần.
- `logic/shared/` chỉ có đúng hai tệp iWCA định sẵn (`iwca_theory.md` §6, §11 D4), hoặc tệp khác thỏa `05-edge-cases.md` Bước 5.3.
- Mỗi trang đi cặp với đúng một hook màn hình, và có `walkthrough.yaml` đặt cạnh.
- `UI.esproj` chỉ khác mẫu ở các thuộc tính lệnh mà `CLAUDE.md` mục 5 cho phép.

### K2 — Ma trận phụ thuộc R1–R14 (`iwca_theory.md` §7; `i2-scaffold.md` Bước I2.4, I2.5)
- Với **từng** luật R1 → R14: công cụ nào, cấu hình nào, dòng nào giữ luật đó bằng máy. Luật nào chỉ nằm trong tài liệu là một phát hiện.
- **Làm lại phép cắn cho cả mười bốn luật** theo Bước I2.5, trên bản sao. Tạo một tệp hay một dòng vi phạm đúng luật, ở đúng vùng luật áp dụng. Xác nhận lệnh kiểm tra hỏng, và thông báo lỗi chỉ đúng vào vi phạm. Khôi phục rồi xác nhận lệnh lại đạt.
- Với bốn luật có ngoại lệ (R5, R7, R12, R14), kiểm thêm chiều ngược: đặt đúng thứ đó vào đúng tệp được miễn, và lệnh vẫn đạt.
- Một luật mà phép cắn không bị bắt là một phát hiện.

### K3 — Phân khu logic (`iwca_theory.md` §4, §5, §6; `i3-logic.md`)
Với **từng** workflow giao diện:
- **Configs:** chỉ dữ liệu tĩnh. Mỗi mục có đúng một nhãn `[CONTRACT]` hay `[UI-ONLY]`. Mục `[CONTRACT]` trỏ đúng điều khoản và đúng **phiên bản hợp đồng hiện hành** (`i6-self-check.md` Bước I6.1).
- **Entities:** chỉ kiểu, giữ nguyên tên trường của hợp đồng.
- **Adapters:**
  - mỗi hàm gửi đúng một lời gọi và kiểm hình dạng phản hồi lúc chạy;
  - phân loại `CallResult` theo **cách hợp đồng khai báo từng nhãn**, không theo số HTTP;
  - nhãn không khai báo, thân sai hình dạng, số nguyên ngoài khoảng, hay mã lỗi không khớp nhãn đều là `contract_violation`;
  - không đổi mã lỗi, không so chuỗi thông báo.
- **Services:** chỉ ra quyết định trình bày. Áp phép thử của §5 cho **từng** chỗ Services làm gì đó với dữ liệu: nếu phía sau đổi luật này mà không đổi hợp đồng, dòng này có thành sai không?
- **Routers:** chỉ kiểm những gì `type` mô tả. Ràng buộc trong ngoặc của `type` thì phải nằm trong Configs với nhãn `[CONTRACT]`. Không có kiểm nào ngoài `type`.
- **Hai kiểu kết quả** đúng tên loại, đúng các trường, không có trường tùy chọn (§6).
- **`scaffold_ui`:** là nơi duy nhất dùng API mạng trần và bọc cầu nối liên tiến trình. Tài nguyên `ipc_bridge` chỉ cho gọi đúng các kênh hợp đồng khai báo.

### K4 — Phân khu kit (`iwca_theory.md` §4; `i4-kit.md`; `.design/ui_decomposition.md` §7)
- Token đặt tên theo vai trò, theo các nhóm của `i4-kit.md` và nhóm `font-family` của `CLAUDE.md` mục 5. Không có giá trị trình bày thô nào ngoài tệp token.
- Component kit "câm": props là kiểu cơ bản hay kiểu của kit. Có component nào mà tên prop, dù là chuỗi, mang một khái niệm nghiệp vụ không (`i6-self-check.md` Bước I6.2)?
- Độ tương phản: chữ đạt 4.5:1, thành phần tương tác đạt 3:1, kiểm bằng máy (`scripts/check_contrast.mjs`). Kiểm xem công cụ có đo **mọi** cặp màu thực sự được dùng không, hay chỉ đo một danh sách gõ tay.
- §7 của `ui_decomposition.md`: không animation, không transition, không component từ nguồn ngoài, không giao diện sáng.

### K5 — Phân khu màn hình (`iwca_theory.md` §1, §4; `i5-screens.md`; R8–R11, R13)
- Hook màn hình: mọi dòng có viết lại được bằng ba động từ "gọi", "giữ", "chuyển" không? Có tính toán, định dạng hay quyết định nào trong hook hay trang không?
- Mọi phép phân nhánh trên `kind` đều đầy đủ, kết thúc bằng `assertNever`.
- Bảng điều hướng và thứ tự mục điều hướng khớp `.design/ui_decomposition.md` §5 và các mục "Điều hướng" của từng chặng.
- ⚠ **Ràng buộc "không có màn hình hồ sơ quyền sở hữu"** (`CLAUDE.md` mục 5; `.design/v1_scope.md` §3.1): kiểm không có trang, workflow hay lời gọi nào tới `/watermark-profiles`, `/watermark-strengths` (cùng `/artworks`, `/verifications` của watermark). Ghi rõ ràng buộc này đang được giữ **bằng máy** hay chỉ bằng tài liệu và lần tìm tay.

### K6 — Main (`src/main.tsx`; `iwca_theory.md` §4, Main; R12, R14)
- Main chỉ đọc giá trị khởi động từ `window.<renderer_bridge>`. Đối tượng đó có đúng hai thuộc tính `backendBaseUrl` và `invoke` (`data_schema.yaml` `mandatory_rules`; `CLAUDE.md` mục 5, "Renderer, origin và CORS").
- Giá trị khởi động thiếu hay sai: Main dựng màn hình lỗi khởi động bằng component kit, nói rõ điều gì thiếu, không đoán địa chỉ mặc định, không dựng phần còn lại.
- Main ráp nối, trao Routers qua ngữ cảnh. Không quyết định nghiệp vụ, không trình bày.
- Không phát tín hiệu sẵn sàng nào mà `mandatory_rules` không quy định.

### K7 — Đối chiếu hợp đồng và đặc tả I1 (`i6-self-check.md` Bước I6.1; `02-contract.md` Bước 2.3)
- **Mọi lời gọi** trong `UI/src/`, cả `http` lẫn `ipc`, đều nằm trong bảng workflow của `.design/ui_decomposition.md` §1, §2 và các mục chặng. Không lời gọi nào tới mục trong bảng loại trừ §4. Kiểm bằng cách tìm trong mã nguồn đường dẫn và địa chỉ của từng mục loại trừ, không bằng trí nhớ.
- Với **mỗi** lời gọi: phương thức, đường dẫn, tên tham số truy vấn, khóa của thân (hay đối số `ipc`) khớp `api_contract.yaml`; bảng nhãn trong Configs khớp `output` của lối vào **từng dòng**; mọi mã lỗi đã khai có câu thông báo trong Configs; kiểm thử duyệt từ Configs chứ không gõ tay danh sách.
- **API Contract đã đổi kể từ lần cuối giao diện được viết** (phiên 37, lúc đó là 5.0.0). Đọc changelog v6.0.0, v6.1.0, v6.2.0. Ghi mỗi thay đổi có ảnh hưởng gì tới `UI/` không, nhất là cách giao diện xử lý một lời gọi `ipc` bị từ chối (`invoke` bị từ chối), theo câu mới cuối `endpoint_forms.ipc`.
- Số nguyên, tiền, ngày, thời điểm ở ranh giới đúng `clause_a_common` (khoảng `-9007199254740991..9007199254740991`, `money`, `formats`).

### K8 — Kiểm thử và bằng chứng (`i3-logic.md`, `i5-screens.md`: ma trận phủ; `i6-self-check.md` Bước I6.3, I6.5)

**(a) Ma trận phủ của I3.** Với mỗi workflow giao diện và **mỗi** nhãn của mỗi lời gọi, có ca khẳng định đúng loại `CallResult` và `ViewResult`. Thêm các ca `unreachable` và `contract_violation`. Ô nào thiếu thì ghi rõ.

**(b) Ma trận phủ của I5.** Với mỗi trang, có ca dựng trang cho đủ bốn loại `ViewResult` ở mỗi thao tác.

**(c) Kịch bản bấm thử.** Với **từng** `walkthrough.yaml` của 15 trang:
- đúng định dạng cố định, đủ trường;
- đạt luật phủ (theo từng thao tác: `ok`, `rejected_input` nếu nhận dữ liệu nhập, `rejected_system` nếu người dùng gây ra được; mỗi trang ít nhất một bước `unreachable`);
- mỗi bước có ảnh ở `UI/evidence/walkthroughs/<trang>/<trang>-<id>.png`.

Ghi danh sách ảnh thiếu hoặc thừa.

**(d) Bằng chứng chạy thật** (`iwca_theory.md` §11 D7): mỗi workflow giao diện có ít nhất một bước kịch bản kích hoạt nó trên hệ thống thật, và EVIDENCE của workflow ghi đúng trang và id bước đó.

**(e) An toàn và độ tin cậy:**
- mọi lần mở ứng dụng trong `tests/e2e/` và `tests/tools/` đều kèm `--ct-test-data-dir`;
- không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật;
- thư mục tạm được dọn đúng chỗ, không dọn theo mẫu tên;
- `npm run e2e` không đặt `CT_WALKTHROUGH_RUNNER` thì không ghi vào `UI/evidence/`;
- ca không có khẳng định thật; ca phụ thuộc thứ tự, thời gian ngủ cố định, hay tiêu điểm cửa sổ. Ghi tệp và dòng.

### K9 — Checkpoint và bằng chứng (`07-checkpoint-protocol.md`; `iwca_theory.md` §8; `CLAUDE.md` mục 5)
- Mọi khối checkpoint trong `UI/` đúng khuôn Giao thức 07 cộng §8 của iWCA:
  - `clause: external`;
  - vị trí đúng: `main` ở `src/main.tsx`, `kit` ở `src/kit/index.ts`, `screens` ở `src/screens/navigation.ts`, khối của từng workflow ở `services` (riêng `scaffold_ui` ở `adapters`);
  - YAML hợp lệ, quy tắc ID.
- Không còn `UNSOLVED_PROBLEMS`. Không có NOTES quá 14 ngày tính tới hôm nay.
- **Mỗi mục EVIDENCE**, xếp vào một trong ba loại:
  1. chạy lại được ở pha 1, nằm trong `npm run check` hay `npm run e2e`: ghi ca hoặc lệnh và kết quả;
  2. không chạy lại ở pha 1, ví dụ cần Project Owner chạy tay, cần hộp thoại thật, hay cần chế độ ghi bằng chứng: ghi lý do;
  3. nêu một thứ không còn tồn tại (ca đã đổi tên, con số đã khác, phiên bản hợp đồng cũ): ghi rõ.
- Nội dung checkpoint, comment và Configs phải khớp mã và hợp đồng hiện tại.

## VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 1)

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, toàn bộ;
   - skill `wca-implementation`: `wca_theory_compressed.md`, `02-contract.md` (Bước 2.3, 2.4), `05-edge-cases.md` (Bước 5.3), `06-self-check.md`, `07-checkpoint-protocol.md`, `08-operating-protocol.md`;
   - skill `iwca-implementation`, **toàn bộ**: `SKILL.md`, `iwca_theory.md`, `i1-decompose.md` → `i6-self-check.md`;
   - `.design/ui_decomposition.md`, toàn bộ; `.design/v1_scope.md` §3.1; `.design/product_versions.md`;
   - hợp đồng: `clause_a_common` của cả hai tệp, mọi lối vào có `external` trong `called_by` (cả `http` lẫn `ipc`, gồm `cross_cutting.native_dialogs`), changelog đầu mỗi tệp;
   - toàn bộ `UI/` (trừ `node_modules/`, `dist/`, `test-results/`, ảnh trong `evidence/`);
   - plan này, sau cùng.

   **Để giữ tính độc lập, ở pha 1 không đọc `.plan/open_issues.md` và `.plan/v1_roadmap.md`.** Không đọc mã `Backend/` hay `Desktop/` để tìm phát hiện của layer đó. Chỉ đọc đúng chỗ cần để hiểu một lời gọi của giao diện, và ghi lại chỗ đã đọc.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`6.2.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, và các gói chính của `UI/package.json`.
   - Hỏi Project Owner hai điều: hôm nay đã có phiên coding agent nào chạy chưa (để ghi định danh phiên); antivirus đang ở trạng thái nào.
   - Ghi `git status --short` (chỉ đọc). Kết quả này phải giống hệt lúc cuối pha 1.
   - Chụp mốc, chỉ liệt kê tên và giờ sửa, không mở tệp: `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`.
   - **Không chạy `npm ci`.** Kiểm `UI\node_modules` và `Desktop\node_modules\electron\dist\electron.exe` có sẵn. Thiếu thì dừng lại và báo.
   - Trong `UI/`: `npm run check`, **một lượt**: mốc **1936** kiểm thử. Khác thì ghi số đạt, số hỏng, tên ca, không dừng.
   - Trong `Desktop/`: `npm run build` (chỉ sinh `Desktop\dist\`, git bỏ qua).
   - Trong `UI/`: `npm run e2e`, **một lượt**, **không đặt `CT_WALKTHROUGH_RUNNER`**: mốc **83**. Sau lượt này `UI/evidence/` phải không đổi (xem `git status`).
   - Không chạy hai lệnh kiểm thử cùng lúc.

2. **Đọc và trả lời K1 → K9**, theo thứ tự đó. Ghi phát hiện ngay khi thấy, kèm tệp và dòng.

3. **Phép cắn**, chỉ trên bản sao ngoài kho.

   **Dựng bản sao** ở `%TEMP%\ct_review_ui\`. Giữ cấu trúc anh em, vì e2e và công cụ của `UI/` tìm `Desktop` và `Backend` theo đường dẫn tương đối. Dùng `robocopy` có `/XD` cho các thư mục bỏ; không dùng junction hay liên kết tượng trưng trỏ về kho.
   - `UI\`, gồm `node_modules\`, bỏ `dist\`, `test-results\`;
   - `Desktop\`, gồm `node_modules\`, bỏ `dist\`, `release\`, `packaging\cache\`, `packaging\stage\`, `test-results\`, `startup-logs\`;
   - `Backend\`, gồm `env\`, bỏ `__pycache__\`, `.pytest_cache\`.

   Chạy `npm run build` trong `Desktop\` của bản sao trước khi dùng e2e ở đó. Interpreter của bản sao không chạy được thì báo lại; đừng sửa gì trong kho để chữa.

   **Phép cắn gồm hai loại:**
   - **(i) Mười bốn luật R1 → R14,** cộng chiều ngược của R5, R7, R12, R14 (K2). Được chạy đúng bước con của `npm run check` mà luật đó thuộc về (`typecheck`, `lint`, `lint:style`, `lint:layer`…). Nhưng phải chạy `npm run check` toàn bộ cho ít nhất ba luật, để chứng minh lệnh chung trả mã khác 0.
   - **(ii) Ít nhất năm phép cắn hành vi** do bạn tự chọn, mỗi phép một vi phạm khác loại, trong đó ít nhất một ở phân khu logic, một ở phân khu màn hình, một ở phân khu kit. Ví dụ:
     - Adapters nhận một nhãn không khai báo như `ok`;
     - Routers thêm một kiểm không có trong `type`;
     - Services tự tính một con số mà hợp đồng giao cho phía sau;
     - một hook tự định dạng tiền;
     - một trang bỏ một nhánh `kind`;
     - một token màu bị đổi làm tương phản dưới ngưỡng;
     - một lời gọi tới `/watermark-profiles` được thêm vào `UI/src/`.

   Với mỗi phép, ghi: sửa gì, ở đâu; lệnh hay ca nào bắt được, hay không ca nào bắt được. **Một phép cắn không bị bắt là một phát hiện.**

   **Dọn bản sao khi xong:** xóa đúng `%TEMP%\ct_review_ui\`, gọi đích danh. Không xóa theo mẫu tên, không đụng thư mục tạm nào khác.

4. **Kết thúc pha 1.**
   - `git status --short` phải giống hệt bước 1, kể cả `UI/evidence/`.
   - Mốc `%APPDATA%` phải giống bước 1.
   - Gửi báo cáo, rồi **dừng**. Không tự bắt đầu sửa gì, kể cả việc nhỏ.

## BÁO CÁO PHA 1

Viết bằng tiếng Việt, ngắn gọn, theo `CLAUDE.md` mục 5. Báo cáo gồm sáu phần:

1. **Môi trường:**
   - phiên bản Node, npm, trạng thái antivirus;
   - kết quả `npm run check` (từng bước), `npm run e2e`;
   - `git status --short` và mốc `%APPDATA%`, đầu và cuối.
2. **Bảng phát hiện.** Mỗi dòng một phát hiện:

   | Mã | Mức | Phần (K1–K9) | Vị trí (tệp:dòng) | Điều bị vi phạm (trích dẫn skill, hợp đồng, đặc tả I1 hoặc `CLAUDE.md`) | Bằng chứng (lệnh, trích mã) | Đề xuất sửa | Ước lượng (nhỏ / vừa / lớn) |
   |---|---|---|---|---|---|---|---|

   Mã đặt `R44-1`, `R44-2`… Ba mức:
   - **cao:** sai hợp đồng, sai đặc tả I1, giao diện tự nắm một quyết định nghiệp vụ, ranh giới phân khu bị phá, một luật R không được giữ bằng máy, hoặc kiểm thử có thể đụng dữ liệu thật;
   - **trung bình:** sai skill nhưng người dùng vẫn thấy đúng; hoặc thiếu ca cho một ô quan trọng;
   - **thấp:** checkpoint, comment, tài liệu, đặt tên.

   Phát hiện cần sửa hợp đồng hay đặc tả I1 thì ghi rõ "cần quyết định ở hợp đồng" hoặc "cần quyết định ở đặc tả I1" ở cột đề xuất. Đừng đề xuất gọi một lối vào ngoài bảng I1.

   Phần nào không có phát hiện thì ghi "không có", kèm một câu nói đã kiểm những gì.
3. **Ma trận:**
   - K2: bảng R1 → R14, công cụ giữ luật, kết quả phép cắn, chiều ngược;
   - K8 (a), (b): số ô, số ô có ca, danh sách ô thiếu;
   - K8 (c): bảng 15 trang, kịch bản đạt luật phủ hay không, ảnh thiếu hay thừa.
4. **EVIDENCE (K9):** bảng từng mục, ghi khối nào, loại 1, 2 hay 3, và kết quả hoặc lý do.
5. **Phép cắn hành vi:** bảng từng phép và kết quả. Ghi cả việc dựng bản sao và việc dọn.
6. **Những gì bạn không kiểm được**, và vì sao.

Không có phát hiện nào là kết quả hợp lệ, nếu bạn đã kiểm đủ. Đừng tạo phát hiện cho đủ số, và cũng đừng bỏ qua một điều vì nó "nhỏ".

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG VÀ ĐẶC TẢ

- Giao diện là bên gọi `external`, không có Điều khoản. Nó chỉ gọi những lối vào có `external` trong `called_by`, và chỉ những lối vào trong bảng I1.
- Hợp đồng chỉ quản lý ranh giới. Cách làm bên trong một phân khu không phải phát hiện, trừ khi nó phá một luật của iWCA, của WCA, của hợp đồng, của đặc tả I1 hay của `CLAUDE.md`.
- 15 trang đều `hoàn_tất` theo bảng §5 của `ui_decomposition.md`. Kiểm độc lập không đổi trạng thái trang; phát hiện thì ghi vào báo cáo.
- `manage_watermark_profile` đang chạy ở backend, nhưng giao diện V1 **không** gọi nó (`CLAUDE.md` mục 5). Watermark (`/artworks`, `/verifications`) thuộc V4 trở đi.
- API Contract 6.0.0 đã bỏ `dialog:save-file`; 6.1.0 thêm luật tham số truy vấn thừa cho `http`; 6.2.0 ghi cách một lối vào `ipc` từ chối lời gọi, và hình dạng `details` của `ERR_RESTORE_FAILED`.

## CẢNH BÁO — điều KHÔNG được làm trong pha 1

- ⚠ **Không thêm màn hình hồ sơ quyền sở hữu**, kể cả trong bản sao, trừ khi đó chính là một phép cắn và bạn khôi phục ngay.
- **Không sửa, không tạo, không xóa tệp nào trong kho**, kể cả checkpoint, kể cả lỗi chính tả. Các thư mục build mà git bỏ qua (`UI\dist\`, `Desktop\dist\`, `test-results\`) được sinh lại khi chạy lệnh; đó không phải sửa kho.
- Phép cắn chỉ làm trên bản sao ở `%TEMP%\ct_review_ui\`, không bao giờ trên `E:\CommissionTracker\`. Không tạo junction hay liên kết tượng trưng.
- **Không đặt `CT_WALKTHROUGH_RUNNER`.** Không chạy `npm run walkthrough:app`, `walkthrough:backend` hay công cụ nào ghi vào `UI/evidence/`.
- Không chạy `npm ci`, `npm install`, `npm audit fix`. Không cài gói, linter hay công cụ nào. Muốn dùng một công cụ chưa có thì ghi vào phần 6 của báo cáo.
- Không chạy kiểm thử của `Backend/`. Không chạy `npm test`, `npm run dist`, `test:packaged` của `Desktop/`. Chỉ được `npm run build` trong `Desktop/`.
- Không mở ứng dụng ngoài `npm run e2e`, ở kho hay ở bản sao.
- Không đọc `.plan/open_issues.md`, `.plan/v1_roadmap.md` ở pha 1. Không đọc, không ghi `.reviews/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash`, `clean`, `tag` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật.
- Không cài bộ cài, không gỡ bản đã cài, không sửa registry.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus.
- Không tắt luật lint, không thêm `eslint-disable`, `@ts-*` hay `stylelint-disable`, kể cả trong bản sao, trừ khi đó chính là một phép cắn có ghi rõ.
- Không nới thời gian chờ, không thêm `retries`, `skip`, `fixme`. Không gọi `focus()`, `moveTop()`, `restore()` trên cửa sổ ngoài cơ chế có sẵn của công cụ kiểm thử.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- Chỉ xóa đúng thư mục bạn tạo, gọi đích danh.
- Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

## TIÊU CHÍ HOÀN TẤT PHA 1

1. Đã trả lời đủ K1 → K9.
2. Đã chạy `npm run check` và `npm run e2e` (không đặt runner), mỗi lệnh một lượt, và đã ghi kết quả, kể cả ca hỏng.
3. Đã làm phép cắn cho cả R1 → R14 cùng chiều ngược của bốn luật có ngoại lệ, và ít nhất năm phép cắn hành vi (đủ ba phân khu) trên bản sao ngoài kho; đã xóa đúng thư mục bản sao.
4. `git status --short` (kể cả `UI/evidence/`) và mốc `%APPDATA%` cuối pha 1 giống hệt đầu phiên.
5. Báo cáo có đủ sáu phần ở mục "BÁO CÁO PHA 1".
