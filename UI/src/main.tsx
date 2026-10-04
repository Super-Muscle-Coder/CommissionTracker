// ===WCA-CHECKPOINT-START===
// workflow: main
// clause: external
// component: main
// last_updated_by: coding-agent@2026-10-04#1
// last_updated_at: 2026-10-04T13:20:16.5016162+07:00
//
// EXPERIENCES:
//   - id: main-EXP-001
//     content: >
//       Giá trị khởi động và cách ráp nối. Giá trị khởi động duy nhất là
//       window.commissionTracker.backendBaseUrl. Tên bridge, tên thuộc tính và
//       loopback_host nằm ở LAYER_CONFIGS.launch, nhãn [CONTRACT], chép từ
//       data_schema.yaml 6.1.0 (shared_values.renderer_bridge, loopback_host,
//       mandatory_rules luật renderer). Main đọc bridge bằng
//       Reflect.get(window, tên) và kiểm: bridge là object khác null;
//       backendBaseUrl là chuỗi; đúng dạng http://127.0.0.1:<cổng>, cổng
//       1..65535, không số 0 ở đầu, không đường dẫn phía sau. Hỏng ở đâu thì
//       dựng FatalMessage của kit (tiêu đề và câu ở LAYER_CONFIGS.startupFailure,
//       [UI-ONLY]), nối thêm tên giá trị hỏng (và giá trị sai dạng), rồi dừng.
//       ui_origin không nằm trong cấu hình của UI: renderer không dùng nó
//       (used_by chỉ có backend và desktop); e2e đọc bản của desktop. Bước 3 tạo
//       http_client với SCAFFOLD_UI_CONFIGS.timeoutMs. Bước 4 (từ phiên 12) ráp
//       nối manage_client: createManageClientAdapters(httpClient,
//       MANAGE_CLIENT_CONFIGS) → createManageClientServices(adapters,
//       MANAGE_CLIENT_CONFIGS, LAYER_CONFIGS.resultMessages) →
//       createManageClientRouters(services, MANAGE_CLIENT_CONFIGS.limits) (từ
//       phiên 16 Routers nhận thêm giới hạn độ dài của client_input, vì chỉ Main
//       đọc giá trị Configs, R14), đặt vào LogicRouters.manageClient. Workflow
//       mới thêm đúng theo mẫu đó, theo thứ tự của ui_decomposition §2. Data
//       Schema 6.2.0 không đổi gì ở phía giao diện. Data Schema 7.0.0 (phiên 17)
//       không đổi cách ráp nối: chỉ Configs và chú thích của manage_client.
//   - id: main-EXP-002
//     content: >
//       Cơ chế máy kiểm R1–R14. Lệnh npm run check chạy theo thứ tự tsc -b,
//       eslint, stylelint, node scripts/check_contrast.mjs (từ phiên 16, độ tương
//       phản của token, xem kit-EXP-007; từ phiên 17 thêm nhóm phi văn bản >= 3:1
//       và phép kiểm vị trí bằng CSS, kit-EXP-010), node scripts/check_layer.mjs, vitest
//       run; bước nào hỏng thì dừng và trả mã khác 0. Trong eslint.config.js, mỗi luật của
//       ma trận là một mục của MATRIX, và mỗi vùng tệp (tách rời nhau) liệt kê
//       các luật áp cho nó. Hàm zone() gộp chúng thành đúng một danh sách cho
//       mỗi khóa luật của ESLint, để không khóa nào bị ghi đè. Hai bẫy thật, do
//       bằng chứng cắn phát hiện: (1) mẫu phủ định kiểu gitignore ('!…') không
//       gỡ loại được một tệp khi thư mục cha đã bị loại, nên R8, R9 và
//       TEST_IMPORTS dùng regex; (2) @typescript-eslint/no-restricted-imports bỏ
//       qua cả câu `import type` nếu nó khớp BẤT KỲ mẫu allowTypeImports nào,
//       nên mẫu cấm hẳn đi vào no-restricted-imports lõi (lõi bắt cả import
//       type), và chỉ các mẫu chỉ-cấm-giá-trị (nhóm Routers của R8, và R14) đi
//       vào bản của typescript-eslint. STATIC_IMPORTS_ONLY cấm import() động ở
//       mọi vùng trừ Main. R7 dùng các luật lõi của stylelint; tokens.css được
//       miễn bằng overrides. Kit cấm prop style trong JSX (R7_kit).
//       scripts/check_layer.mjs lo ZONES, R2 (phân giải đường dẫn thật) và R10
//       (không có tệp style trong screens/). Đổi cấu hình kiểm thì phải chạy lại
//       bằng chứng cắn cho những luật bị ảnh hưởng (i6-self-check.md, I6.5).
//   - id: main-EXP-007
//     content: >
//       Ba chỗ vá sau audit phiên 11, phiên 12 (P1 đã được thay ở phiên 16 bằng
//       luật R13 mới, xem main-EXP-009). P1 (R13): switch-exhaustiveness-check
//       chỉ thấy switch, nên if và ?: trên kind lọt. Mục R13 của MATRIX cấm mọi
//       so sánh ===, !==, ==, != mà một vế là X.kind, X['kind'], X?.kind hoặc
//       biến tên kind (no-restricted-syntax), ở mọi vùng logic và screens, kể cả
//       tệp kiểm thử và Transport.kind trong Adapters. Phân nhánh trên kind chỉ
//       còn đi được qua switch kết thúc bằng assertNever. Không cấm .includes(kind)
//       hay tra bảng theo kind; chưa ai dùng, xem bằng mắt ở I6. P2 (R12): kit đọc
//       được bridge qua document.defaultView. Đường đi từ đối tượng DOM tới đối
//       tượng toàn cục còn có event.view, event.nativeEvent.view,
//       iframe.contentWindow, el.ownerDocument.defaultView, destructuring, Reflect,
//       Function('return this'), eval. Vá hai lớp: (a) cú pháp: R12 cấm thêm các
//       global Reflect, Function, eval, cấm thuộc tính defaultView, contentWindow,
//       parentWindow, getOwnPropertyDescriptor(s), __lookupGetter__ (cả khi
//       destructuring); (b) luật cục bộ có thông tin kiểu ct/no-host-global-object,
//       viết ngay trong eslint.config.js (không phải gói npm): báo mọi
//       MemberExpression, CallExpression hoặc giá trị destructuring có kiểu Window,
//       WindowProxy, AbstractView (event.view của React) hoặc typeof globalThis. Vì
//       vậy đường mới nào cũng bị bắt theo kiểu, không cần biết tên. Luật bật ở mọi
//       vùng có R12, tắt ở Main. Còn lọt ở mức cú pháp: truy cập qua any (ví dụ
//       ép kiểu rồi đọc thuộc tính theo tên tính được); strict của tsc và CSP (không
//       có unsafe-eval) chặn phần lớn lúc biên dịch và lúc chạy. P3 (R14): tệp
//       kiểm thử được miễn R14, nên một tệp chạy thật import một tệp trong tests/
//       là rửa được giá trị cấu hình. Mục TEST_IMPORTS cấm mọi tệp chạy thật
//       (không khớp **/tests/**, *.test.*) import từ đường có đoạn tests/ hoặc
//       đuôi .test.*, áp ở mọi vùng kể cả Main; tệp kiểm thử được miễn.
//   - id: main-EXP-003
//     content: >
//       Ngoại lệ lint của tệp kiểm thử: ba (TEST_EXEMPT trong eslint.config.js).
//       Tệp kiểm thử trong một vùng (**/tests/**, *.test.ts(x)) nhận mọi luật
//       của vùng đó trừ R14 và TEST_IMPORTS (nó đóng vai Main khi dựng workflow,
//       và được import helper kiểm thử) và, từ phiên 16, R13 (plan phiên 16 việc
//       2: luật mới áp cho logic/** và screens/** "trừ tệp kiểm thử"; kiểm thử
//       khẳng định trên kind, ví dụ expect(r.kind).toBe(...), không phân nhánh). Khối cấu hình
//       theo files do zone() sinh ra, không có chú thích eslint-disable nào.
//       tests/main và tests/e2e nằm trong vùng layer-tests, chỉ có R12. Kiểm thử
//       Main đặt bridge bằng vi.stubGlobal(tên, giá trị) nên không chạm window.
//       Tệp công cụ (eslint.config.js, stylelint.config.js, vite.config.ts,
//       scripts/*.mjs, tests/tools/*.mjs) không phải mã chạy của layer nên không
//       thuộc vùng nào; chúng chỉ nhận luật recommended.
//   - id: main-EXP-004
//     content: >
//       Phụ thuộc. typescript giữ 6.0.3 vì typescript-eslint 8.70.1 đòi
//       typescript < 6.1.0 (bản mới nhất trên npm là 7.0.2). jsdom giữ 29.1.1
//       vì jsdom 30.x đòi Node ^24.15.0, còn máy có Node 24.14.1. Ngoài danh sách
//       của plan có thêm @testing-library/dom (peer bắt buộc của
//       @testing-library/react 16.3.3), @types/react, @types/react-dom (kiểu
//       cho strict) và @types/node 24.19.0 (cho vite.config.ts và e2e, cùng bản
//       với Desktop). Không có plugin ESLint nào từ npm: luật kiểu của R12 là
//       một luật cục bộ trong eslint.config.js, dùng parserServices của
//       typescript-eslint. Phiên 12 không thêm gói nào.
//   - id: main-EXP-005
//     content: >
//       e2e qua Desktop. Electron lấy từ Desktop/node_modules qua
//       createRequire(Desktop/package.json)('electron'). Main desktop coi lần
//       nạp đầu bị hủy là lỗi nghiêm trọng: gọi page.reload() khi loadURL đầu
//       tiên chưa xong thì Desktop ghi "FATAL: The app could not start:
//       ERR_ABORTED (-3)" và thoát mã 1. Vì vậy kiểm thử chờ tiêu đề hiện ra và
//       sự kiện load trước mọi thao tác. main_layout.spec.ts nạp lại một lần với
//       listener console để bắt cảnh báo CSP; client_list_walkthrough.spec.ts
//       không nạp lại trang, chỉ bấm "Tải lại" của trang.
//   - id: main-EXP-006
//     content: >
//       CSP là thẻ meta trong index.html, đúng mức tối thiểu và không nới chỉ
//       thị nào: default-src 'self'; script-src 'self'; style-src 'self';
//       img-src 'self' data:; connect-src http://127.0.0.1:*. Vite build với
//       base './' và publicDir false chỉ sinh index.html, assets/*.js và
//       assets/*.css. Phông chữ là phông hệ thống (token font-family), không có
//       tệp phông nên không cần font-src.
//   - id: main-EXP-008
//     content: >
//       Kịch bản bấm thử trên ứng dụng thật (cơ chế do Orchestrator chốt ở plan
//       phiên 12). tests/fixtures/switchable_backend.py: Desktop chạy nó bằng
//       interpreter mặc định (Backend/env) qua --ct-test-backend-script và
//       --ct-test-backend-working-dir=Backend. Nó chạy Backend.py thật làm con
//       (cùng CT_*, stdin là pipe), in đúng một READY sau READY của con, nuốt
//       stdout sau đó, chuyển stderr, và đọc tệp điều khiển
//       switchable_backend.control (down|up) cạnh CT_DB_FILE_PATH. down: đóng
//       stdin của con, chờ thoát, cổng trống. up: chạy lại trên đúng CT_PORT,
//       thử lại tối đa 10 lần. Xong thì ghi switchable_backend.state. stdin của
//       fixture đóng thì dừng con, thoát 0. Con chết khi đang up thì fixture
//       thoát theo mã của con. tests/tools/walkthrough_lib.mjs (có
//       walkthrough_lib.d.mts cho spec TypeScript) dùng chung cho npm run
//       walkthrough:app (build, mở app với thư mục tạm, đọc "backend READY on
//       port N", nạp dữ liệu mẫu, ghi phiên vào %TEMP%/ct-ui-walkthrough-session.json,
//       dọn thư mục tạm khi app đóng), npm run walkthrough:backend -- down|up
//       (ghi tệp điều khiển, chờ state) và e2e. Theo endpoint_forms.http, thân
//       JSON có khóa là tên input: POST /clients nhận { client_input: {...} }
//       (NOTE ở checkpoint manage_client).
//   - id: main-EXP-009
//     content: >
//       R13 mới (phiên 16, UI-1 của .plan/open_issues.md, Q1 của audit phiên
//       12). Luật so sánh của phiên 12 còn lọt khi kind được gán sang biến khác,
//       destructuring, tra bảng hay .includes. Luật mới diễn đạt theo chiều
//       ngược: trong logic/** và screens/** (trừ tệp kiểm thử), thuộc tính kind
//       chỉ được ĐỌC ở đúng một chỗ, biểu thức của switch. Mục R13 của MATRIX
//       (no-restricted-syntax) cấm: MemberExpression có property kind (không
//       tính toán) hoặc ['kind'] mà không phải "SwitchStatement >
//       MemberExpression.discriminant"; [`kind`] dạng template; và
//       "ObjectPattern > Property" có key kind (const { kind } = r, const { kind:
//       k } = r, tham số destructure). Viết kind trong object literal hay trong
//       kiểu không phải đọc, vẫn được. Mọi switch còn lại do
//       switch-exhaustiveness-check giữ đầy đủ tới assertNever. Giới hạn của phân
//       tích tĩnh: đọc qua any, hay qua khóa tính lúc chạy (r[k]), không bị bắt.
//   - id: main-EXP-010
//     content: >
//       Công cụ kiểm thử chạy thật (phiên 16). UI-2: tên người chạy trong mọi bản
//       ghi kịch bản lấy từ CT_WALKTHROUGH_RUNNER, thiếu thì "unknown"
//       (walkthroughRunner() ở tests/tools/walkthrough_lib.mjs; cách dùng ở
//       screens-EXP-007). UI-3: main_layout.spec.ts xóa thư mục dữ liệu tạm
//       ct-ui-e2e-* trong một finally bọc cả việc mở ứng dụng, sau khi Electron
//       đã thoát (backend giữ tệp khóa trong thư mục đó tới khi thoát, Data Schema
//       6.2.0), bằng rmSync có maxRetries; close() của các spec kịch bản cũng xóa
//       trong finally. tests/e2e/walkthrough_harness.ts gom phần mở, đóng, ảnh
//       chụp và bản ghi của ba spec kịch bản. Năm thư mục ct-ui-e2e-* ngày
//       2026-09-27 (09:34–09:35) trong %TEMP% là sót lại từ trước bản vá; phiên
//       này không xóa chúng (ngoài UI/).
//   - id: main-EXP-011
//     content: >
//       Ráp nối thứ hai (phiên 19, D2), đúng mẫu main-EXP-001, theo thứ tự
//       ui_decomposition §2: createManageCommissionAdapters(httpClient,
//       MANAGE_COMMISSION_CONFIGS) → createManageCommissionServices(adapters,
//       MANAGE_COMMISSION_CONFIGS, LAYER_CONFIGS.resultMessages) →
//       createManageCommissionRouters(services, { limits, currencyDecimals, formats }
//       của MANAGE_COMMISSION_CONFIGS) (Routers kiểm và đọc bản nháp bằng các giá trị
//       đó; chỉ Main đọc giá trị Configs, R14), đặt vào LogicRouters.manageCommission
//       (logic_context.ts). src/screens/tests/fake_logic.tsx có fakeManageCommission,
//       và renderWithLogic, renderFirstCommit nhận Routers thứ hai tùy chọn (thiếu
//       thì mọi lời gọi của nó làm kiểm thử hỏng), nên kiểm thử D1 không đổi.
//       tests/main/main.test.tsx không đổi: trang mở đầu vẫn là client_list, đúng một
//       GET /clients lúc khởi động.
//   - id: main-EXP-012
//     content: >
//       UI-8 (phiên 19): thư mục gốc của bằng chứng e2e do ĐÚNG MỘT chỗ quyết định,
//       evidenceRoot() ở tests/tools/walkthrough_lib.mjs, cạnh walkthroughRunner():
//       CT_WALKTHROUGH_RUNNER khác rỗng → UI/evidence/ (bằng chứng được commit); không
//       có → UI/test-results/evidence/ (git bỏ qua test-results; Playwright dọn thư mục
//       này ở đầu mỗi lần chạy, đó là bằng chứng nháp). walkthrough_harness.ts
//       (walkthroughRecorder) và main_layout.spec.ts (ảnh b2a/main_layout.png) chỉ lấy
//       thư mục qua hàm này; ba spec D2 dùng harness. Khi không có biến, mọi thứ khác
//       giữ nguyên: vẫn chụp ảnh, vẫn ghi *-run.json với runner "unknown (…)". Một phiên
//       của layer khác chạy npm run e2e để kiểm hồi quy không còn ghi đè UI/evidence,
//       nên không cần git restore UI/evidence nữa.
//   - id: main-EXP-013
//     content: >
//       Quan sát về thời gian e2e (phiên 19). Mốc lần 1 hỏng một lần ở
//       client_detail S4 vì page.screenshot hết 30 giây (không đổi mã, lần 2 đạt 17);
//       lần chạy bằng chứng UI-8 lúc 08:54 mất 6,9 phút cho 17 test (mỗi lần mở ứng
//       dụng 20 giây tới 1,3 phút, so với 4–12 giây ở mốc) rồi tự trở lại bình thường
//       ở các lần sau (32 test trong khoảng 2 phút). Không tìm ra nguyên nhân trong
//       UI/; nghi do máy bận (quét của antivirus sau npm ci, ENV-2). Chỉ ghi nhận.
//   - id: main-EXP-014
//     content: >
//       Phiên 20 (D3): bước 4 ráp nối update_progress theo đúng mẫu, sau
//       manage_commission (thứ tự ui_decomposition §2): createUpdateProgressAdapters(
//       httpClient, UPDATE_PROGRESS_CONFIGS) → createUpdateProgressServices(adapters,
//       UPDATE_PROGRESS_CONFIGS, LAYER_CONFIGS.resultMessages) →
//       createUpdateProgressRouters(services) (Routers không cần giá trị Configs nào),
//       đặt vào LogicRouters.updateProgress (screens/logic_context.ts). Không đổi giá
//       trị khởi động, cơ chế kiểm (ESLint, stylelint, check_layer không đổi cấu hình;
//       check_contrast thêm một cặp — bằng chứng ở kit). tests/main/main.test.tsx không
//       đổi: trang mở đầu vẫn client_list. Kiểm thử dựng trang: fake_logic.tsx thêm
//       fakeUpdateProgress và tham số thứ tư của renderWithLogic, renderFirstCommit.
//       UI-9: hàm nạp mẫu chờ AFTER_LAST_WRITE_MS sau lần ghi cuối (screens-EXP-019).
//       Chạy tay D3: npm run walkthrough:app -- --progress.
//   - id: main-EXP-015
//     content: >
//       Kinh nghiệm công cụ (phiên 20): trên máy này, heredoc của Git Bash có chữ tiếng
//       Việt trong thân lệnh (python - <<'EOF' …) hỏng với "unexpected EOF while looking
//       for matching" dù thẻ có nháy; không tệp nào bị sửa. Viết script bằng công cụ
//       soạn thảo tệp (scratchpad) hoặc sửa thẳng bằng Edit, đúng lời khuyên của
//       CLAUDE.md mục 5. Không đặt lệnh đọc stdin (cat, python -) trước lệnh dài: công
//       cụ Bash không có stdin, lệnh treo tới hết giờ.
//   - id: main-EXP-016
//     content: >
//       Phiên 21 (UI-10): npm run check có thêm một bước, lint:e2e (node
//       scripts/check_e2e_status.mjs), đứng sau lint:layer và trước test; đây là thay đổi
//       duy nhất của script check (package.json thêm dòng lint:e2e). Không đổi cấu hình
//       ESLint, stylelint, check_layer, check_contrast; không thêm kiểm thử vitest (mốc
//       780 giữ nguyên). Chi tiết và bằng chứng cắn ở screens-EXP-026. Ghi nhận công cụ:
//       chạy e2e không đặt biến thì bước "backend down" (client_detail S4, stage_change
//       S4) hỏng vì page.screenshot hết 30 s ở 3 trong 8 lần; main_layout.spec.ts không
//       hỏng lần nào (theo dõi của main-EXP-013).
//   - id: main-EXP-017
//     content: >
//       Phiên 22 (D4): bước 4 ráp nối record_payment theo mẫu, sau update_progress (thứ tự
//       ui_decomposition §2): createRecordPaymentAdapters(httpClient, RECORD_PAYMENT_CONFIGS) →
//       createRecordPaymentServices(adapters, RECORD_PAYMENT_CONFIGS, LAYER_CONFIGS.resultMessages,
//       () => new Date()) → createRecordPaymentRouters(services, { limits, currencyDecimals,
//       directions, paymentKinds } của RECORD_PAYMENT_CONFIGS) (Routers kiểm và đọc bản nháp bằng
//       các giá trị đó; chỉ Main đọc giá trị Configs, R14), đặt vào LogicRouters.recordPayment
//       (screens/logic_context.ts). NGUỒN "BÂY GIỜ": tham số thứ tư của Services là hàm now: () =>
//       Date do Main tạo (() => new Date()); Services chỉ gọi nó lúc mở form để dựng ngày giờ mặc
//       định, không nơi nào khác gọi new Date() cho "bây giờ" (R4 không cấm Date, nhưng đặc tả D4 đòi
//       một nguồn để kiểm thử cố định được). Không đổi giá trị khởi động, cơ chế kiểm ESLint,
//       stylelint, check_layer; check_contrast đổi (xem kit-EXP-015, 016, 017). tests/main/main.test.tsx
//       không đổi: trang mở đầu vẫn client_list. Kiểm thử dựng trang: fake_logic.tsx thêm
//       fakeRecordPayment và tham số thứ năm của renderWithLogic, renderFirstCommit. Chạy tay D4:
//       npm run walkthrough:app -- --payments.
//   - id: main-EXP-018
//     content: >
//       UI-11 (phiên 22), CHỈ THU DỮ LIỆU, không sửa: (1) tests/e2e/playwright.config.ts có use: {
//       trace: 'retain-on-failure' } (thay đổi duy nhất của tệp); đã chứng minh trace được giữ với
//       Electron: một spec tạm cố ý hỏng (đã xóa) để lại test-results/<tên bài>/trace.zip (9 KB) và
//       error-context.md. (2) walkthroughRecorder.screenshot (mọi lệnh chụp ảnh của harness, cả
//       rec.step lẫn rec.screenshot) ghi một dòng vào UI/test-results/screenshot-timing.log: thời
//       điểm bắt đầu (ISO), tên spec, tên ảnh, số ms, backend=down|up (cờ backendDown của harness,
//       đặt trong setBackend), ok|error (đúng cả khi chụp ảnh ném lỗi). Playwright xóa cả
//       test-results/ ở đầu mỗi lần chạy, nên log của một lần chạy phải được đọc hoặc chép ra sau
//       lần đó. main_layout.spec.ts tự gọi page.screenshot (không qua harness) nên không có dòng
//       nào. Không nới thời gian chờ, không retries, không đổi cách chụp ảnh. Kết quả tổng hợp ở
//       EVIDENCE.
//   - id: main-EXP-019
//     content: >
//       Kinh nghiệm công cụ (phiên 22): (1) PowerShell 5.1 Get-Content/Set-Content làm hỏng tệp UTF-8
//       có tiếng Việt (đọc bằng bảng mã ANSI, ghi thêm BOM; một hook bị mojibake phải viết lại bằng
//       công cụ soạn thảo tệp): không dùng chúng để sửa mã nguồn, đúng lời khuyên của CLAUDE.md mục
//       5; chỉ dùng để ĐỌC log ASCII. (2) Hệ thống phân quyền của công cụ đôi lúc không trả lời (Bash
//       và PowerShell "no verdict") ở vài lần đầu; thử lại sau là được. (3) Nó từ chối chạy kiểm thử
//       trên cây mã đã bị sửa tạm để tắt một kiểm tra ("Security Test Removal"): phép sửa kiểu "&&
//       false" bị coi là gỡ kiểm tra; phép sửa đổi một giá trị (đổi tham số, đổi token) thì chạy
//       được. Bằng chứng cắn ghi rõ phép nào có kết quả.
//   - id: main-EXP-020
//     content: >
//       Phiên 24 (D5): bước 4 ráp nối view_income_report theo mẫu, sau record_payment (thứ tự
//       ui_decomposition §2): createViewIncomeReportAdapters(httpClient, VIEW_INCOME_REPORT_CONFIGS) →
//       createViewIncomeReportServices(adapters, VIEW_INCOME_REPORT_CONFIGS, LAYER_CONFIGS.resultMessages,
//       () => new Date()) → createViewIncomeReportRouters(services) (Routers không cần giá trị Configs nào), đặt
//       vào LogicRouters.viewIncomeReport. NGUỒN "BÂY GIỜ": hàm () => new Date() thứ hai do Main tạo (không dùng
//       chung với record_payment, R2); chỉ Services.defaultPeriod() gọi nó. fake_logic.tsx thêm
//       fakeViewIncomeReport (defaultPeriod là hàm đồng bộ, mặc định 2026-01-01 → 2026-09-30) và tham số thứ sáu
//       của renderWithLogic, renderFirstCommit; renderFirstCommit không tính defaultPeriod là "đã gọi Routers"
//       (đó là phép đọc đồng bộ lúc vẽ, không phải lần tải). Chạy tay D5: npm run walkthrough:app -- --income.
//       Không đổi giá trị khởi động, cấu hình ESLint, stylelint, check_layer; check_contrast chỉ ghi thêm nơi dùng
//       của một cặp có sẵn. tests/main/main.test.tsx không đổi.
//   - id: main-EXP-021
//     content: >
//       Phiên 24, thứ tự và các lượt e2e hỏng (để Orchestrator biết). (1) Không đảo thứ tự việc nào của plan. (2) Lượt
//       e2e đầu hỏng 2 ca vì commission_list và progress_board đếm ĐÚNG ba mục điều hướng (spec
//       commission_list S1, progress_board S1, S3): đó là hệ quả trực tiếp của mục "Thu nhập" (đặc tả D5), đã sửa bằng
//       cách thêm ['Thu nhập', null] vào ba danh sách, không đổi hành vi nào. (3) Từ 23:55 đến 00:31 (giờ máy) bảy
//       lượt kế tiếp bị nghẽn máy: bốn lần page.screenshot hết 30 s (client_form-S5-saved, payment_form-S6-unreachable,
//       payment_form-S1-errors, payment_list-S1; ba trong đó với backend ĐANG CHẠY), một lần locator.click hết giờ ở
//       client_detail S4 sau khi backend bật lại mà trang đã về danh sách khách hàng (trang khởi động; trace không nói
//       vì sao), và một lần "the backend did not switch up within 60000 ms". Không có lỗi nào ở income_report hay ở mã mới;
//       lượt 2-3 ở chính đợt đó đạt (59 passed, 7,3 và 5,9 phút so với 2,9 phút lúc bình thường). Sáng hôm sau (19:57
//       2026-10-01) máy bình thường: 5 lượt liên tiếp đạt, mỗi lượt khoảng 3 phút. Script bọc (scratchpad run_loop.sh)
//       coi lần hỏng là UI-11 chỉ khi MỌI lỗi là "page.screenshot: Timeout"; hai lỗi khác loại (click, backend) không
//       được tính là UI-11 và các trace của chúng để ngoài ui11_traces. Chuỗi 5 lượt liên tiếp tính từ 19:57. Nghi
//       phạm vi: AVG (AVGUI chạy), xem ENV-2; không thay đổi gì ở máy.
//   - id: main-EXP-022
//     content: >
//       UI-11, dữ liệu phiên 24 (CHỈ THU DỮ LIỆU, không sửa gì, không nới giờ chờ, không retries). Cách ghi không đổi
//       so với main-EXP-018. Playwright xóa test-results/ ở đầu mỗi lần chạy, nên script bọc cất screenshot-timing.log
//       và thư mục lỗi của từng lượt ra ngoài rồi chép lại: UI/test-results/ui11_traces/ có INDEX.txt, bốn thư mục
//       trace_* (trace.zip, error-context.md) và screenshot-timing-all-runs.log (1280 dòng của 24 lượt). Tổng hợp:
//       1280 lần chụp, trung bình 217 ms, lớn nhất 30012 ms; riêng bước backend tắt 162 lần, trung bình 307 ms, lớn
//       nhất 30012 ms; 4 lần hết giờ 30 s: client_form-S5-saved (backend=up), payment_form-S6-unreachable (down),
//       payment_form-S1-errors (up), payment_list-S1 (up); lần thứ năm có dòng "error" (client_detail-S4, 29 ms) là
//       trang bị đóng sau lỗi khác, không phải hết giờ. Trong 4 lượt khỏe (spec riêng 10 lượt, mốc, 5 lượt cuối) không
//       lần nào chụp quá 2,2 giây. Điều mới so với phiên 22: hết giờ cũng xảy ra khi backend ĐANG CHẠY, ở trang không
//       liên quan tới việc tắt backend; chúng đi thành cụm trong một giai đoạn máy chậm, không rải đều.
//   - id: main-EXP-023
//     content: >
//       UI-11, thí nghiệm có đối chứng (phiên 25). Công cụ tests/tools/ui11_probe.mjs (không thuộc npm run e2e hay
//       check): mở ứng dụng thật bằng Playwright _electron (Desktop đã build, fixture backend, thư mục dữ liệu tạm),
//       trước mỗi lần chụp bấm một mục điều hướng (trang vẽ thật), chụp page.screenshot với giới hạn riêng 10 s, ghi
//       ms từng lần vào test-results/ui11_probe/<nhãn>.jsonl. Electron 44.4.5, Chromium 152.0.7977.130, Windows 11.
//       KẾT QUẢ 4a (mỗi điều kiện 20 lần): bình thường 0 treo (lớn nhất 107 ms); CHE KÍN bằng một cửa sổ cùng kích
//       thước, luôn ở trên: 0 treo (85 ms); MẤT TIÊU ĐIỂM (cửa sổ nhỏ ở góc, có tiêu điểm): 0 treo (95 ms);
//       THU NHỎ (BrowserWindow.minimize()): 11/20 treo đủ 10 s, các lần còn lại 97–2108 ms. Chỉ thu nhỏ (cửa sổ
//       isVisible()=false) làm lệnh chụp treo. Khớp tài liệu Electron (BrowserWindow, backgroundThrottling): trên
//       Windows trang chỉ "hidden" khi cửa sổ thu nhỏ hoặc bị ẩn; che kín không đủ (chỉ macOS tính che kín). Chưa kiểm
//       được rằng Chromium thật sự coi cửa sổ bị che là occluded; chỉ biết là nó không treo. KẾT QUẢ 4b, chỉ điều
//       kiện thu nhỏ, 20 lần mỗi bộ cờ, cờ đặt TRƯỚC đường dẫn ứng dụng, và đọc lại trong tiến trình Electron bằng
//       app.commandLine (hasSwitch, getSwitchValue) nên chắc chắn có hiệu lực: --disable-renderer-backgrounding
//       11/20; --disable-backgrounding-occluded-windows + --disable-features=CalculateNativeWinOcclusion 10/20;
//       --disable-background-timer-throttling 10/20; renderer-backgrounding + timer-throttling 10/20; cả bốn cờ 3/20
//       ở lần đầu nhưng 10/20 ở lần lặp lại (nên 3/20 là ngẫu nhiên). Không cờ nào hết treo. NGUỒN: Electron docs
//       "Command Line Switches" (chỉ ghi --disable-renderer-backgrounding) và "BrowserWindow" (backgroundThrottling,
//       visibilityState); hai cờ còn lại là cờ của Chromium, không có trong tài liệu Electron, chưa tra được tài liệu
//       Chromium trực tiếp. Việc 4c KHÔNG làm: không thêm cờ vào harness, Desktop hay ứng dụng thật. KẾT LUẬN: lệnh
//       chụp treo khi cửa sổ Electron bị thu nhỏ; chưa chứng minh được cửa sổ e2e bị thu nhỏ lúc hết giờ ở các lần
//       phiên 19-24 (không có dữ liệu trạng thái cửa sổ lúc đó). Nếu muốn khẳng định, lần sau có thể ghi isMinimized
//       cùng thời gian chụp trong harness (chỉ ghi, không đổi hành vi). Trong phiên này, sáu lượt e2e đầy đủ không
//       có lần hết giờ nào (87 lần chụp mỗi lượt, lớn nhất 127 ms ở năm lượt có nhật ký).
//   - id: main-EXP-024
//     content: >
//       Phiên 27 (D6): ráp nối send_reminder đúng mẫu: createSendReminderAdapters(httpClient, SEND_REMINDER_CONFIGS) →
//       createSendReminderServices(adapters, SEND_REMINDER_CONFIGS, LAYER_CONFIGS.resultMessages) →
//       createSendReminderRouters(services, { limits, formats, periodicUnits, leadUnits }) (Routers nhận các giá trị
//       Configs nó kiểm bằng, vì chỉ Main đọc Configs, R14), đặt vào LogicRouters.sendReminder. Không có đồng hồ: mặc
//       định của form đến từ backend (get_settings). Giao diện không gọi check_due.
//   - id: main-EXP-025
//     content: >
//       UI-11 bước (3) (phiên 27): harness tests/e2e/walkthrough_harness.ts ghi, cạnh mỗi dòng của
//       test-results/screenshot-timing.log, trạng thái cửa sổ ĐỌC TRƯỚC lệnh chụp: isMinimized, isVisible, isFocused
//       của cửa sổ chính (electronApp.evaluate, tiến trình chính) và document.visibilityState của trang, mỗi lần đọc
//       có hạn 3 s (quá hạn ghi "timeout"). Hàm timedScreenshot là chỗ duy nhất chụp ảnh (bộ ghi kịch bản và
//       main_layout.spec.ts cùng dùng). Chỉ ghi: không đổi cách chụp, không restore(), không nới thời gian chờ. Cạm
//       bẫy vận hành: Playwright xóa test-results ở đầu mỗi lượt, nên trace và nhật ký phải chép ra ngay sau lượt (tôi
//       chép vào UI/test-results/ui11_traces/ ở cuối phiên, sau lượt chạy cuối); TaskStop trên một tập lệnh bash KHÔNG
//       dừng vòng lặp bên trong, và hai lượt Playwright chạy chồng nhau hỏng cả hai (SESSION_FILE và thư mục kết quả
//       dùng chung): đừng bao giờ chạy hai lệnh e2e cùng lúc.
//   - id: main-EXP-026
//     content: >
//       UI-11 bước (4), phương án A của Project Owner (phiên 28): công cụ kiểm thử tự mở lại cửa sổ bị thu nhỏ.
//       Mô-đun tests/tools/window_guard.mjs (cùng window_guard.d.mts) gắn MỘT trình nghe sự kiện 'minimize' vào mọi
//       BrowserWindow ngay trong tiến trình chính (electronApp.evaluate, kèm 'browser-window-created' cho cửa sổ tạo
//       sau); mỗi lần thu nhỏ thì gọi restore() từ setImmediate (không gọi trong chính trình xử lý sự kiện) và ghi
//       {at, windowId} vào globalThis.__ctRestoreGuard trong tiến trình chính. Cửa sổ đã thu nhỏ trước khi gắn thì
//       được kiểm một lần lúc gắn (sự kiện của nó đã qua). CHỌN CÁCH NÀY thay vì "restore() trước mỗi lần chụp" vì
//       dữ liệu phiên 27 cho thấy thu nhỏ cũng làm treo locator.click: trình nghe nằm trong tiến trình chính nên phủ
//       MỌI thao tác và không phụ thuộc phía Playwright còn phản hồi. Chỉ restore(): không focus(), không moveTop(),
//       không setAlwaysOnTop(), không đổi kích thước; không đổi UI/src, Desktop/, không thêm cờ --ct-test-*. NGUỒN
//       TÀI LIỆU: electron.d.ts của đúng bản cài trong Desktop/node_modules/electron (44.4.5): sự kiện 'minimize'
//       ("Emitted when the window is minimized", dòng 2268; ghi chú Wayland không áp dụng cho Windows), restore()
//       ("Restores the window from minimized state to its previous state", dòng 3153), isMinimized() (dòng 3036).
//       Harness (walkthrough_harness.ts) gắn trình nghe ngay sau app.firstWindow() trong launch(), và đọc các lần
//       mở lại ra test-results/window-restore.log (cạnh screenshot-timing.log; Playwright xóa cả hai ở đầu mỗi
//       lượt): mỗi dòng "thời điểm (giờ của tiến trình chính, UTC)\tspec\tbước\trestored\twindow=<id>". Bước là bước
//       kết thúc bằng lần chụp mà nhật ký được đọc ra (hoặc "closing" khi đóng ứng dụng): lần mở lại xảy ra trong
//       bước đó hoặc ngay trước nó. Nhật ký trạng thái cửa sổ của phiên 27 giữ nguyên. Công cụ ui11_probe.mjs có
//       thêm cờ --guard=on|off (mặc định off), điều kiện 'reminimized' (thu nhỏ lại TRƯỚC MỖI lần chụp, không nghỉ),
//       và coi một cú click quá hạn là treo (không chỉ chụp ảnh).
//   - id: main-EXP-027
//     content: >
//       UI-18 (phiên 29): cơ chế mở lại cửa sổ của main-EXP-026 nay gọi BrowserWindow.showInactive(), KHÔNG còn restore():
//       restore() kích hoạt cửa sổ và giành nền trước của ứng dụng người dùng đang dùng. ĐO trước khi chọn bằng công cụ
//       mới tests/tools/ui18_probe.mjs: "ứng dụng khác" là một TIẾN TRÌNH riêng (PowerShell + cửa sổ WinForms, chạy bằng
//       -File) được xin nền trước trước mỗi lần thử; nền trước của hệ điều hành đọc bằng GetForegroundWindow +
//       GetWindowThreadProcessId, so với pid của tiến trình chính Electron lấy bằng process.pid BÊN TRONG Electron (pid
//       Playwright sinh ra là pid khác: lần thử đầu của tôi so nhầm pid và báo sai). Một cửa sổ cùng tiến trình sẽ không
//       đủ, vì Windows cho một tiến trình đẩy cửa sổ của chính nó lên dễ hơn của tiến trình khác. Bốn cách, 20 lần mỗi
//       cách, nguồn electron.d.ts 44.4.5: restore() (dòng 3153), showInactive() (dòng 3632: "Shows the window but doesn't
//       focus on it"), show() (dòng 3622, đối chứng), maximize() rồi unmaximize() (dòng 3110: "will also show (but not
//       focus)"). Số đo ở EVIDENCE: chỉ showInactive() đạt cả ba (hết thu nhỏ, không giành nền trước, không treo, 20/20);
//       maximize() cũng giành nền trước 20/20 dù tài liệu nói "not focus" (tài liệu không đáng tin ở điểm này, chỉ số đo).
//       window_guard.mjs ghi thêm cách đã dùng và isFocused() ngay sau khi mở lại; harness ghi hai trường đó vào
//       test-results/window-restore.log ("way=showInactive focused_after=false"). Không focus(), không moveTop(), không
//       setAlwaysOnTop(), không đổi focusable; không đổi UI/src, Desktop/, không cờ --ct-test-*. Công cụ ui18_probe.mjs
//       chiếm nền trước của máy trong vài phút khi chạy: báo người dùng trước.
//   - id: main-EXP-028
//     content: >
//       UI-16 (phiên 29): tests/main/main.test.tsx nạp trước cây mô-đun của src/main một lần trong beforeAll (giới hạn
//       riêng 60 s, ghi lý do ngay tại hook), nên ca đầu không còn trả chi phí nạp mã lần đầu trong giới hạn 5 s. Đo
//       trước: chạy riêng tệp ca đầu ~1000 ms, ca hai ~15 ms (khoảng 985 ms là nạp mã); cả bộ lúc máy tải 5,09 s và 5,47 s
//       (hết giờ ở 2 trong 5 lần). Sau: ca đầu ~100 ms. beforeEach vẫn vi.resetModules() nên mỗi ca vẫn chạy Main từ đầu;
//       chỉ phần biến đổi mã đã làm sẵn (suy từ số đo: ca hai ~15 ms sau khi ca đầu nạp, và phép cắn dưới đây). Phép cắn: một
//       cấu hình vitest tạm (đã xóa) làm chậm biến đổi src/main.tsx 7 s như một lần nạp lạnh chậm: tệp cũ HỎNG ở ca đầu
//       (5018 ms, rồi các ca sau hỏng theo vì mô-đun còn dở), tệp mới 17/17 đạt. Không nới giới hạn ca, không retries,
//       không bỏ ca. Lưu ý: giới hạn 60 s của beforeAll là giới hạn của việc nạp, không phải của một ca.
//   - id: main-EXP-029
//     content: >
//       UI-17 (phiên 29): (1) main_layout.spec.ts gắn installRestoreGuard ngay sau firstWindow() (spec này tự mở Electron,
//       không qua launch() của harness); các lần mở lại được ghi bởi timedScreenshot như mọi spec. (2) Dọn NOTES theo
//       Giao thức 07: xóa khỏi main hai NOTE cũ: StageChange.test.tsx:183 (phiên 24; UI-12 đã đóng ở phiên 25, nội dung
//       đã ở screens-EXP-012) và NOTE về main.test.tsx của phiên 28 (nay là UI-16, xử lý ở main-EXP-028). Xóa khỏi screens
//       bốn NOTE phiên 21 và 22 (hai đề xuất trạng thái đã thực hiện, một sự cố quy trình, một ghi chú cho Orchestrator);
//       phần còn giá trị đã chuyển sang screens-EXP-048. Giữ NOTES còn đúng (UI.esproj, cách chạy e2e, hai ghi chú sửa main.test.tsx).
//   - id: main-EXP-030
//     content: >
//       Phát hiện ngoài plan (phiên 29, không sửa, ghi cho Orchestrator): npm run check hỏng ngắt quãng ở MỘT CA KHÁC,
//       src/screens/tests/app_root.test.tsx, ca D6 "Nhắc việc → ... reminder_list with the notice, once": dòng 291
//       expect(loadPending).toHaveBeenCalledTimes(3) nhận 2. Một lần trong 5 lần chạy mốc đầu phiên, lúc máy tải. Nguyên
//       nhân CHƯA điều tra; giả thuyết (chưa kiểm): dòng 291 đếm lời gọi ngay sau findByText, có thể trước khi lần tải
//       thứ ba xảy ra, cùng loại với screens-EXP-012 (chờ bằng vi.waitFor thay vì khẳng định ngay).
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Phiên 25: môi trường, mốc, và kết quả cuối; mốc %APPDATA% không đổi.
//     how: >
//       node --version; npm --version; git status --short; trong UI/: npm ci; npm run check (mốc và cuối);
//       CT_WALKTHROUGH_RUNNER=coding-agent@2026-10-01#1 npm run e2e (mốc; 5 lần liên tiếp cuối); một lần không biến
//       với SHA-256 UI/evidence trước và sau; node tests/tools/ui11_probe.mjs [--n=20] [--only=...] [--flags=...]
//       [--label=...]; tên, kích thước, giờ ghi mọi tệp trong %APPDATA%\CommissionTracker đầu (21:12) và cuối phiên
//       (22:02).
//     result: >
//       Node v24.14.1; npm 11.11.0; git status đầu phiên rỗng; npm ci "found 0 vulnerabilities". Mốc: check "Tests
//       1303 passed (1303)", e2e "59 passed (2.9m)". Cuối: check exit 0 (tsc -b, eslint --max-warnings 0, stylelint,
//       check_contrast "19 text pairs ... all pass", check_layer "147 files", check_e2e_status, "Test Files 30 passed",
//       "Tests 1303 passed (1303)"); e2e 5/5 "59 passed" (2,8–2,9 phút), không lần chụp nào hết giờ (87 lần mỗi lượt,
//       lớn nhất 127 ms); lần không biến "59 passed", UI/evidence không đổi (99 tệp, băm toàn thư mục trước và sau).
//       %APPDATA%: data.db 114688 byte, data.db.lock 0 byte, cùng giờ ghi 2026-09-28 21:09 — không đổi. UI-12:
//       StageChange.test.tsx 3/50 hỏng trước khi sửa, 50/50 đạt sau (xem EVIDENCE của screens). Không eslint-disable,
//       không ngoại lệ lint mới, không phụ thuộc mới. Công cụ ui11_probe.mjs phải sửa một lỗi lint (no-undef
//       'document') bằng cách đưa biểu thức dạng chuỗi vào page.evaluate.
//     recorded_at: 2026-10-01T22:04:00+07:00
//   - claim: >
//       Phiên 24: môi trường, mốc, và kết quả cuối; mốc %APPDATA% không đổi.
//     how: >
//       node --version; npm --version; git status --short; Backend/env/Scripts/python.exe --version; trong UI/: npm ci;
//       npm run check (mốc và cuối); CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-30#3 npm run e2e (mốc; 5 lần liên tiếp cuối);
//       một lần không biến với SHA-256 UI/evidence trước và sau; tên, kích thước, giờ ghi, SHA-256 mọi tệp trong
//       %APPDATA%CommissionTracker đầu (23:20) và cuối phiên (20:17).
//     result: >
//       Node v24.14.1; npm 11.11.0; Python 3.13.12; git status đầu phiên rỗng; npm ci "found 0 vulnerabilities". Mốc: check
//       "Tests 1100 passed (1100)" (lần chạy đầu hỏng 1 ca focus của StageChange.test.tsx:183, không tất định có sẵn, bốn lần
//       chạy lại đạt; không sửa, ngoài plan), e2e "54 passed (3.5m)". Cuối: check exit 0 (tsc -b, eslint --max-warnings 0,
//       stylelint, "check_contrast: 19 text pairs >= 4.5:1 and 13 non-text pairs >= 3:1 checked, all pass.", "check_layer: 147
//       files under src/ checked", "check_e2e_status: no unfiltered text assertion", vitest 1303 đạt); spec income_report
//       riêng 10/10; e2e 5/5 "59 passed" (mốc 54); lần không biến "59 passed", UI/evidence không đổi (99 tệp).
//       %APPDATA%: data.db 114688 byte và data.db.lock 0 byte, cùng giờ ghi 2026-09-28 21:09, cùng hash B1996554… — không đổi.
//       Không eslint-disable, không ngoại lệ lint mới, không phụ thuộc mới. Backend: Backend/env/Scripts/python.exe (qua fixture).
//     recorded_at: 2026-10-01T20:25:00+07:00
//   - claim: >
//       Môi trường và phiên bản công cụ của phiên.
//     how: >
//       node --version; npm --version; trong UI/: npm ls --depth=0.
//     result: >
//       Node v24.14.1; npm 11.11.0; Windows 11 Home 10.0.26200. Phụ thuộc không
//       đổi so với phiên 11 (khóa chính xác trong package.json và
//       package-lock.json): react 19.3.0, react-dom 19.3.0, zod 4.6.5, vite
//       8.3.1, typescript 6.0.3, vitest 5.0.2, jsdom 29.1.1, eslint 10.11.0,
//       typescript-eslint 8.70.1, stylelint 17.15.0, @playwright/test 1.63.0.
//       Backend chạy bằng Backend/env/Scripts/python.exe (Python 3.13.12).
//     recorded_at: 2026-09-27T11:39:31+07:00
//   - claim: >
//       Toàn bộ bằng chứng cắn R1–R14 cũ chạy lại với cấu hình sau khi vá P1–P3,
//       vẫn cắn đúng: mỗi lỗi chỉ đúng tệp và dòng vi phạm vừa tạo.
//     how: >
//       Tạo lại đúng các tệp tạm của phiên 11, gom theo bước của npm run check
//       vì lệnh dừng ở bước hỏng đầu tiên. Nhóm 1 (eslint), cùng lúc với các ca
//       P1–P3 bên dưới: R1 (scaffold_ui/_violation_r1.ts import react,
//       _violation_r1_kit.ts import type từ kit, _violation_r1_jsx.tsx), R3
//       (logic/shared/_violation_r3.ts import type từ configs của workflow), R4
//       (document.title trong scaffold_ui), R5 (other_wf/adapters.ts dùng fetch,
//       other_wf/services.ts dùng localStorage), R6 (kit import type từ
//       logic/shared/results và từ configs của workflow), R7b (prop style trong
//       JSX của kit), R8 (screens import giá trị từ routers, import type từ
//       logic/shared/results, import type từ configs), R9 (screens import sâu
//       vào kit), R10a (screens import .css, className, style, thẻ style), R11
//       (screens dùng fetch, sessionStorage), R12 (kit Reflect.get(window…),
//       screens import.meta.env, scaffold_ui Reflect.get(globalThis…)), R13
//       (switch thiếu hai nhánh, switch có default), R14 (giá trị configs trong
//       scaffold_ui, screens, kit), import() động. Nhóm 2 (stylelint): R7a
//       (kit/components/Stack/_violation_r7.module.css có #ff0000, red, rgb(),
//       4px, 200ms). Nhóm 3 (check_layer): R2 (other_wf/_violation_r2.ts import
//       type ../scaffold_ui/configs), R10b (MainLayout.module.css trong
//       screens). Trong UI/: npm run check cho từng nhóm, xóa tệp sau mỗi nhóm.
//     result: >
//       Nhóm 1: tsc -b đạt; eslint exit 1, "✖ 49 problems (49 errors, 0
//       warnings)" cho cả nhóm 1 (cũ và mới). Các dòng của ca cũ, ví dụ:
//       "_violation_r1.ts 1:1 'react' import is restricted ... R1: the logic zone
//       must not depend on the UI library"; "_violation_r3.ts 1:1
//       '../workflows/scaffold_ui/configs' ... R3"; "_violation_r4.ts 2:10
//       Unexpected use of 'document'. R4"; "other_wf/adapters.ts 2:19 ... 'fetch'.
//       R5"; "other_wf/services.ts 1:37 ... 'localStorage'. R5"; hai lỗi R6;
//       "_violation_r7.tsx 1:28 R7: no inline style in the kit"; R8 hai dòng
//       (1:1 chỉ TYPES từ Routers, 3:1 chỉ từ routers) và tệp configs_type;
//       "_violation_r9.tsx 1:1 ... R9"; R10 bốn lỗi (1:1, 5:10, 5:26, 6:7); R11
//       hai lỗi; R12: kit "Unexpected use of 'Reflect'" và "'window'", screens
//       "1:29 ... no build-time environment variables", scaffold_ui "'Reflect'"
//       và "'globalThis'"; R13 "4:11 Switch is not exhaustive. Cases not
//       matched: "unreachable" | "contract_violation"" và "14:11 ...
//       "unreachable" | "rejected" | "contract_violation""; R14 ba lỗi
//       (kit còn thêm R6); "1:44 R1/R3/R6/R8/R9/R10/R14: no dynamic import()".
//       Nhóm 2: exit 2 ở stylelint, 5 lỗi (2:10 color-no-hex, 3:17 color-named,
//       4:15 function-disallowed-list, 5:12 và 6:27 unit-disallowed-list). Nhóm
//       3: exit 1 ở lint:layer, "R2 src/logic/workflows/other_wf/_violation_r2.ts:
//       import '../scaffold_ui/configs' resolves to ...", "R10
//       src/screens/layouts/main_layout/MainLayout.module.css: the screens zone
//       has no style file", "check_layer: 2 violation(s).".
//     recorded_at: 2026-09-27T11:43:40+07:00
//   - claim: >
//       R13 mới (phiên 16) cắn đủ năm dạng của plan việc 2, ở logic và screens;
//       switch đầy đủ, kiểu R['kind'] và tệp kiểm thử không bị báo. (Thay bằng
//       chứng R13 của phiên 12, vì cấu hình R13 đã đổi.)
//     how: >
//       Tạo src/logic/workflows/r13_wf/services.ts (dòng 8 const k = r.kind rồi so
//       sánh; 12 const { kind } = r; 16 const { kind: k } = r; 20 LABELS[r.kind];
//       23 ['ok','rejected'].includes(r.kind); 26 r.kind === 'ok'; 29 r['kind']
//       !== 'ok' ? … : …; 32 r?.kind === 'ok'; 34 tham số ({ kind }); 38 switch
//       (r.kind) đầy đủ tới assertNever; dòng 5 kiểu Record<R['kind'], string>),
//       src/screens/pages/r13_page/use_r13_page.ts (const k = r.kind; k === 'ok'
//       ? r.kind : 'x'), src/logic/workflows/r13_wf/tests/services.test.ts và
//       tests/helper.ts (đọc và destructure kind). npx eslint trên hai thư mục,
//       rồi npm run check. Xóa tệp, npm run check lại.
//     result: >
//       eslint: services.ts 8:13, 12:11, 16:11, 20:17, 23:38, 26:10, 29:10,
//       32:10, 34:25 và use_r13_page.ts 4:13, 5:23, cùng thông báo "R13: the
//       property kind is read only as the discriminant of a switch that ends in
//       assertNever (no copy, destructuring, lookup, includes or comparison)
//       no-restricted-syntax"; "✖ 11 problems (11 errors, 0 warnings)"; không
//       lỗi nào ở dòng 5, dòng 38 hay trong tests/. npm run check exit 1. Sau
//       khi xóa: exit 0, "Tests 65 passed (65)".
//     recorded_at: 2026-09-28T10:21:30+07:00
//   - claim: >
//       R12 (phạm vi sau vá P2): ngoài Main không đọc được giá trị của môi trường
//       chủ, kể cả qua đường từ đối tượng DOM tới đối tượng toàn cục
//       (document.defaultView, event.view, event.nativeEvent.view,
//       iframe.contentWindow, ownerDocument.defaultView kể cả destructuring,
//       Reflect, Function, eval). Còn lọt: truy cập qua kiểu any.
//     how: >
//       Trong nhóm 1: src/kit/_violation_p2.ts (document.defaultView rồi đọc
//       commissionTracker), src/kit/_violation_p2_paths.tsx (e.nativeEvent.view;
//       const { view } = e với MouseEvent của React; f.contentWindow; const {
//       defaultView } = el.ownerDocument; Function('return this')()). npm run
//       check. Xóa tệp.
//     result: >
//       eslint: "_violation_p2.ts 2:13 R12: ... this expression is the global
//       object ((Window & typeof globalThis) | null) ct/no-host-global-object" và
//       "2:13 R12: ... (no path from a DOM object to the global object)
//       no-restricted-syntax"; "_violation_p2_paths.tsx 4:10 ... (Window | null)
//       ct/no-host-global-object"; "8:11 ... (AbstractView)
//       ct/no-host-global-object"; "13:10" hai lỗi (kiểu và cú pháp,
//       contentWindow); "17:11" hai lỗi (destructuring defaultView); "22:10
//       Unexpected use of 'Function'. R12 no-restricted-globals".
//     recorded_at: 2026-09-27T11:43:10+07:00
//   - claim: >
//       R14 (phạm vi sau vá P3): chỉ Main và tệp kiểm thử import giá trị từ
//       configs; và không tệp chạy thật nào (kể cả Main) import được từ thư mục
//       tests/ hay tệp *.test.*, nên không rửa được giá trị cấu hình qua tệp
//       kiểm thử.
//     how: >
//       Trong nhóm 1: src/screens/tests/leak.ts (tệp kiểm thử, import
//       LAYER_CONFIGS rồi xuất leakedTitle), src/screens/_violation_p3.ts
//       (import { leakedTitle } from './tests/leak'),
//       src/screens/leak_helper.test.ts (import giá trị cấu hình rồi xuất),
//       src/screens/_violation_p3_test_file.ts (import từ './leak_helper.test').
//       npm run check. Xóa tệp.
//     result: >
//       eslint: "_violation_p3.ts 1:1 error './tests/leak' import is restricted
//       from being used by a pattern. R14: a runtime file imports nothing from a
//       tests/ folder no-restricted-imports"; "_violation_p3_test_file.ts 1:1
//       error './leak_helper.test' ... R14: a runtime file imports nothing from a
//       *.test.* file". Hai tệp kiểm thử leak.ts và leak_helper.test.ts không bị
//       báo (ngoại lệ R14 của tệp kiểm thử, đúng luật).
//     recorded_at: 2026-09-27T11:43:10+07:00
//   - claim: >
//       Chiều ngược của R5, R7, R12, R14 và TEST_IMPORTS: tệp được miễn thật sự
//       được miễn.
//     how: >
//       Tạo src/logic/workflows/other_wf/adapters.ts dùng localStorage.getItem
//       (R5: lưu trữ cục bộ trong một tệp adapters),
//       src/logic/workflows/scaffold_ui/tests/_exempt_helper.ts (tệp trong tests/
//       import giá trị SCAFFOLD_UI_CONFIGS) và
//       src/logic/workflows/scaffold_ui/tests/_exempt_r14.test.ts (import giá trị
//       SCAFFOLD_UI_CONFIGS và import helper từ './_exempt_helper'). npm run check.
//       Xóa tệp. R7, R12: giá trị thô có sẵn trong tokens.css; Reflect.get(window,
//       ...) và giá trị cấu hình có sẵn trong main.tsx.
//     result: >
//       exit 0: "check_layer: 25 files under src/ checked (ZONES, R2, R10), no
//       violation.", "Test Files 3 passed (3)", "Tests 25 passed (25)". Lần chạy
//       sạch ngay sau khi xóa: exit 0, "Tests 24 passed (24)". Không còn tệp
//       _violation_* hay _exempt_* nào trong UI/.
//     recorded_at: 2026-09-27T11:44:07+07:00
//   - claim: >
//       npm ci && npm run check đạt trên cài đặt sạch, với mã cuối phiên 12.
//     how: >
//       Trong UI/: xóa node_modules; npm ci; npm run check.
//     result: >
//       npm ci: "found 0 vulnerabilities". check exit 0: tsc -b sạch; eslint
//       --max-warnings 0 sạch; stylelint sạch; "check_layer: 46 files under src/
//       checked (ZONES, R2, R10), no violation."; vitest "Test Files 6 passed
//       (6)", "Tests 65 passed (65)": manage_client adapters 23, services 10,
//       routers 1; scaffold_ui adapters 7; ClientList 7; tests/main 17.
//     recorded_at: 2026-09-27T12:01:26+07:00
//   - claim: >
//       Chạy thật qua Desktop với backend thật: khung chính (main_layout.spec.ts)
//       và kịch bản bấm thử client_list (client_list_walkthrough.spec.ts) đạt;
//       đóng thì Electron thoát mã 0, fixture dừng con rồi thoát 0.
//     how: >
//       Desktop đã build (Desktop/dist). Trong UI/: npm run e2e (npm run build,
//       rồi playwright test -c tests/e2e/playwright.config.ts).
//     result: >
//       "4 passed (30.7s)": client_list_walkthrough S1 (5.5s), S2 (6.1s), S3
//       (11.6s), main_layout (6.6s). main_layout: "renderer console: []",
//       "[desktop-main] exiting with code 0". Build chỉ sinh dist/index.html,
//       dist/assets/index-*.css, dist/assets/index-*.js. Chi tiết kịch bản ở
//       EVIDENCE của screens.
//     recorded_at: 2026-09-27T12:02:15+07:00
//   - claim: >
//       Môi trường và mốc của phiên 16.
//     how: >
//       node --version; npm --version; trong UI/: npm ci; npm run check; npm run
//       e2e; ls "%APPDATA%\CommissionTracker" đầu và cuối phiên.
//     result: >
//       Node v24.14.1; npm 11.11.0; npm ci "found 0 vulnerabilities" (không
//       thêm gói nào). Mốc check: "Tests 65 passed (65)", 46 tệp. Mốc e2e: "4
//       passed (27.9s)". %APPDATA%\CommissionTracker: không tồn tại, đầu phiên
//       (10:17) và cuối phiên. Backend: Backend/env/Scripts/python.exe.
//     recorded_at: 2026-09-28T10:19:30+07:00
//   - claim: >
//       UI-3: sau một lần main_layout.spec.ts hỏng có chủ đích, không còn thư mục
//       ct-ui-e2e-* mới nào.
//     how: >
//       Ghi danh sách ct-ui-* trong %TEMP%; chèn tạm expect(true, 'DELIBERATE
//       FAILURE (UI-3 proof)').toBe(false) ngay sau waitForLoadState('load') (lúc
//       Electron và backend đang chạy); npx playwright test -c
//       tests/e2e/playwright.config.ts main_layout; khôi phục tệp; so danh sách.
//     result: >
//       "Error: DELIBERATE FAILURE (UI-3 proof)", "1 failed", "[desktop-main]
//       backend (pid 6056) exited with code 0". Danh sách trước và sau giống hệt
//       (năm thư mục cũ ngày 2026-09-27), "NO NEW TEMP FOLDER". Hai lần npm run
//       e2e đầy đủ sau đó (một lần có 2 bước hỏng, một lần đạt) cũng không để lại
//       thư mục mới.
//     recorded_at: 2026-09-28T10:23:53+07:00
//   - claim: >
//       UI-2: bản ghi kịch bản ghi đúng tên người chạy theo CT_WALKTHROUGH_RUNNER,
//       và "unknown" khi thiếu biến.
//     how: >
//       Trong UI/: bỏ biến rồi npx playwright test … client_list; đọc runner
//       trong client_list-run.json; đặt CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#1
//       rồi chạy lại.
//     result: >
//       Lần 1 "3 passed", cả 3 bước runner "unknown (Playwright,
//       tests/e2e/client_list_walkthrough.spec.ts)". Lần 2 "3 passed", cả 3 bước
//       "coding-agent@2026-09-28#1 (Playwright, …)". Lần chạy cuối phiên: mọi bản
//       ghi của ba trang mang tên coding-agent@2026-09-28#1.
//     recorded_at: 2026-09-28T10:25:35+07:00
//   - claim: >
//       Phép kiểm độ tương phản (bước mới của npm run check) cắn. Chi tiết ở
//       EVIDENCE của kit.
//     how: >
//       --base-gray-400 tạm thành #5a5a5a; npm run check; khôi phục.
//     result: >
//       exit 1 ở lint:contrast, "check_contrast: 3 of 18 pair(s) fail WCAG AA
//       (4.5:1)."; khôi phục thì đạt.
//     recorded_at: 2026-09-28T10:29:01+07:00
//   - claim: >
//       npm run check và npm run e2e đạt với mã cuối phiên 16.
//     how: >
//       Trong UI/: npm run check; CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#1
//       npm run e2e.
//     result: >
//       check exit 0: tsc -b, eslint --max-warnings 0, stylelint sạch;
//       "check_contrast: 18 text/background pairs checked, all >= 4.5:1.";
//       "check_layer: 71 files under src/ checked (ZONES, R2, R10), no
//       violation."; "Test Files 10 passed (10)", "Tests 225 passed (225)" (lần
//       chạy cuối, sau khi viết checkpoint). e2e "17 passed (59.7s)", main_layout
//       "renderer console: []". %APPDATA%\CommissionTracker vẫn không tồn tại.
//     recorded_at: 2026-09-28T11:01:26+07:00
//   - claim: >
//       Môi trường và mốc của phiên 17.
//     how: >
//       node --version; npm --version; trong UI/: npm ci; npm run check; npm run
//       e2e; ls "%APPDATA%\CommissionTracker" đầu và cuối phiên.
//     result: >
//       Node v24.14.1; npm 11.11.0; npm ci "found 0 vulnerabilities" (không thêm
//       gói nào trong phiên). Mốc check: "Tests 225 passed (225)", 71 tệp. Mốc
//       e2e: "17 passed (1.0m)" (trên máy này UI-4 không lộ ở lần mốc).
//       %APPDATA%\CommissionTracker: không tồn tại, đầu phiên (11:58:48) và cuối
//       phiên (12:28:10). Backend: Backend/env/Scripts/python.exe.
//     recorded_at: 2026-09-28T12:01:10+07:00
//   - claim: >
//       npm run check và npm run e2e đạt với mã cuối phiên 17.
//     how: >
//       Trong UI/: npm run check (sau khi ghi mọi checkpoint);
//       CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#2 npm run e2e năm lần liên tiếp.
//     result: >
//       check exit 0: tsc -b, eslint --max-warnings 0, stylelint sạch;
//       "check_contrast: 18 text pairs >= 4.5:1 and 11 non-text pairs >= 3:1
//       checked, all pass."; "check_layer: 71 files under src/ checked (ZONES,
//       R2, R10), no violation."; "Test Files 10 passed (10)", "Tests 241 passed
//       (241)". e2e 5/5 lần "17 passed" (chi tiết ở EVIDENCE của screens). Cấu
//       hình ESLint, stylelint, check_layer không đổi trong phiên, nên bằng chứng
//       cắn R1–R14 cũ còn hiệu lực; check_contrast đổi và có bằng chứng cắn mới
//       ở kit. Không có eslint-disable, không ngoại lệ lint mới.
//     recorded_at: 2026-09-28T12:28:10+07:00
//   - claim: >
//       Môi trường và mốc của phiên 19.
//     how: >
//       node --version; npm --version; git status --short; trong UI/: npm ci; npm
//       run check; CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#1 npm run e2e (hai
//       lần); SHA-256 của mọi tệp trong %APPDATA%\CommissionTracker đầu và cuối phiên.
//     result: >
//       Node v24.14.1; npm 11.11.0; npm ci "found 0 vulnerabilities" (không thêm gói
//       nào trong phiên). git status --short đầu phiên: rỗng. Mốc check: "Tests 241
//       passed (241)", 71 tệp. Mốc e2e: lần 1 "1 failed, 14 passed" (client_detail S4,
//       "page.screenshot: Timeout 30000ms exceeded", 2 bước sau không chạy), lần 2
//       "17 passed (1.4m)" không đổi mã (main-EXP-013). %APPDATA%\CommissionTracker
//       có data.db (114688 byte, SHA-256 B1996554…F390B, ghi 2026-09-28 21:09:42) và
//       data.db.lock (0 byte) từ trước phiên; lúc 09:2x cuối phiên giống hệt (hash,
//       kích thước, giờ ghi). Backend: Backend/env/Scripts/python.exe.
//     recorded_at: 2026-09-29T08:41:11+07:00
//   - claim: >
//       UI-8: npm run e2e không đặt CT_WALKTHROUGH_RUNNER không đổi UI/evidence; bằng
//       chứng nháp vào UI/test-results/evidence với runner "unknown".
//     how: >
//       PowerShell (scratchpad ui8_proof.ps1): bỏ biến; SHA-256 mọi tệp dưới
//       UI/evidence; trong UI/ npm run e2e; SHA-256 lại và so; liệt kê
//       test-results/evidence; đọc runner trong client_list-run.json ở đó. Hai lần: trước
//       khi có mã D2 (08:54) và với mã cuối phiên (09:24, sau năm lần có tên).
//     result: >
//       Lần 1: "17 passed (6.9m)", "UI/evidence UNCHANGED (27 files hashed)", 27 tệp
//       nháp (b2a/main_layout.png và ba thư mục walkthroughs). Lần 2: "32 passed
//       (1.9m)", "UI/evidence UNCHANGED (54 files hashed)", runner "unknown (Playwright,
//       tests/e2e/client_list_walkthrough.spec.ts)". git status --short UI/evidence
//       không đổi bởi lần chạy không biến (các dòng còn lại do lần chạy có tên của
//       phiên này ghi, đúng thiết kế).
//     recorded_at: 2026-09-29T09:26:26+07:00
//   - claim: >
//       UI-8, chiều có biến: năm lần e2e với CT_WALKTHROUGH_RUNNER ghi bằng chứng vào
//       UI/evidence với đúng tên người chạy.
//     how: >
//       Trong UI/: $env:CT_WALKTHROUGH_RUNNER = "coding-agent@2026-09-29#1"; npm run e2e
//       năm lần liên tiếp (scratchpad e2e5.ps1); đọc mọi
//       UI/evidence/walkthroughs/*/*-run.json.
//     result: >
//       Sáu bản ghi (client_list 5, client_detail 6, client_form 5, commission_list 4,
//       commission_detail 4, commission_form 7 bước), mọi bước passed true, runner
//       "coding-agent@2026-09-29#1 (Playwright, tests/e2e/<trang>_walkthrough.spec.ts)".
//     recorded_at: 2026-09-29T09:24:00+07:00
//   - claim: >
//       npm run check và npm run e2e đạt với mã cuối phiên 19; e2e 5/5 lần liên tiếp.
//     how: >
//       Trong UI/: npm run check (sau khi ghi mọi checkpoint);
//       CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#1, npm run e2e năm lần liên tiếp;
//       danh sách ct-ui-* trong %TEMP% trước và sau.
//     result: >
//       check exit 0: tsc -b, eslint --max-warnings 0, stylelint sạch;
//       "check_contrast: 19 text pairs >= 4.5:1 and 11 non-text pairs >= 3:1 checked,
//       all pass."; "check_layer: 95 files under src/ checked (ZONES, R2, R10), no
//       violation."; "Test Files 16 passed (16)", "Tests 555 passed (555)" (mốc 241).
//       e2e: lần 1 "32 passed (2.0m)" (09:13:25–09:15:31), lần 2 "32 passed (2.0m)",
//       lần 3 "32 passed (2.0m)", lần 4 "32 passed (2.0m)", lần 5 "32 passed (1.9m)"
//       (kết thúc 09:24:00) (mốc 17). ct-ui-* trước và sau giống hệt (sáu thư mục cũ
//       ngày 27 và 28). Cấu hình ESLint, stylelint, check_layer không đổi trong phiên,
//       nên bằng chứng cắn R1–R14 cũ còn hiệu lực; check_contrast đổi (FIELDS) và có
//       bằng chứng cắn mới ở kit. Không có eslint-disable, không ngoại lệ lint mới.
//     recorded_at: 2026-09-29T09:30:00+07:00
//   - claim: >
//       Phiên 20: npm run check và npm run e2e đạt với mã cuối phiên; e2e 5/5 lần liên
//       tiếp có tên người chạy; một lần không đặt biến để UI/evidence nguyên vẹn; mốc
//       %APPDATA%\CommissionTracker không đổi.
//     how: >
//       Node v24.14.1, npm 11.11.0, npm ci; Backend/env/Scripts/python.exe (qua
//       fixture). Trong UI/: npm run check (sau khi ghi mọi checkpoint); scratchpad
//       e2e_final.sh: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#2 npm run e2e năm
//       lần, rồi SHA-256 mọi tệp dưới UI/evidence, npm run e2e KHÔNG biến, SHA-256 lại và
//       so. %APPDATA%\CommissionTracker: tên, kích thước, giờ ghi, SHA-256 mọi tệp lúc
//       11:1x đầu phiên và lúc 18:0x cuối phiên.
//     result: >
//       check exit 0: tsc -b, eslint --max-warnings 0, stylelint sạch; "check_contrast:
//       19 text pairs >= 4.5:1 and 12 non-text pairs >= 3:1 checked, all pass.";
//       "check_layer: 114 files under src/ checked (ZONES, R2, R10), no violation.";
//       "Test Files 21 passed (21)", "Tests 780 passed (780)" (mốc 555). e2e năm lần
//       "42 passed" (17:46:00–17:59:31; mốc 32). Lần không biến "42 passed (2.5m)",
//       "UI/evidence UNCHANGED (71 files hashed)", runner nháp "unknown (Playwright,
//       tests/e2e/progress_board_walkthrough.spec.ts)". %APPDATA%: data.db 114688 byte và
//       data.db.lock 0 byte, cùng giờ ghi 2026-09-28 21:09, cùng hash — "UNCHANGED". Cấu
//       hình ESLint, stylelint, check_layer không đổi; check_contrast thêm một cặp có
//       bằng chứng cắn ở kit. Không eslint-disable, không ngoại lệ lint mới.
//     recorded_at: 2026-09-29T18:10:00+07:00
//   - claim: >
//       Phiên 21: npm run check (có lint:e2e) và npm run e2e đạt với mã cuối phiên.
//     how: >
//       Node v24.14.1, npm 11.11.1, npm ci "found 0 vulnerabilities". Trong UI/: npm run
//       check (sau khi ghi checkpoint); CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#3 npm
//       run e2e 5 lần; lần không biến với SHA-256 UI/evidence trước và sau.
//     result: >
//       check exit 0, "check_e2e_status: no unfiltered text assertion on
//       getByRole('status')."; "Tests 780 passed (780)" (bằng mốc). e2e 5/5 "42 passed";
//       lần không biến "42 passed (2.5m)", UI/evidence không đổi. Phần còn lại (30 lần
//       commission_form, bằng chứng cắn, %APPDATA%, lỗi chụp ảnh không biến) ở EVIDENCE
//       của screens. Backend: Backend/env/Scripts/python.exe (qua fixture). Không
//       eslint-disable, không ngoại lệ lint mới.
//     recorded_at: 2026-09-29T21:30:29+07:00
//   - claim: >
//       Phiên 22: môi trường, mốc, và kết quả cuối; mốc %APPDATA% không đổi.
//     how: >
//       node --version; npm --version; git status --short; Backend/env/Scripts/python.exe --version; trong
//       UI/: npm ci; npm run check (mốc và cuối); CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-30#1 npm run
//       e2e (mốc; 5 lần liên tiếp cuối); một lần không biến với SHA-256 UI/evidence trước và sau; tên,
//       kích thước, giờ ghi, SHA-256 mọi tệp trong %APPDATA%\CommissionTracker đầu (07:40) và cuối phiên.
//     result: >
//       Node v24.14.1; npm 11.11.0; Python 3.13.12; git status đầu phiên rỗng; npm ci "found 0
//       vulnerabilities". Mốc: check "Tests 780 passed (780)" (21 tệp), e2e "42 passed (3.1m)". Cuối:
//       check exit 0 (tsc -b, eslint --max-warnings 0, stylelint, "check_contrast: 19 text pairs >= 4.5:1
//       and 13 non-text pairs >= 3:1 checked, all pass.", "check_layer: 131 files under src/ checked", "check_e2e_status: no unfiltered
//       text assertion", "Test Files 26 passed (26)", "Tests 1100 passed (1100)"); e2e 5/5 "54 passed"
//       (mốc 42); lần không biến "54 passed", UI/evidence không đổi (89 tệp). %APPDATA%: data.db 114688 byte
//       và data.db.lock 0 byte, cùng giờ ghi 2026-09-28 21:09, cùng hash B1996554… — không đổi. Không
//       eslint-disable, không ngoại lệ lint mới, không phụ thuộc mới. Backend: Backend/env/Scripts/python.exe
//       (qua fixture).
//     recorded_at: 2026-09-30T09:25:00+07:00
//   - claim: >
//       Phiên 27: môi trường, mốc đầu phiên và kết quả cuối; mốc %APPDATA% không đổi.
//     how: >
//       node --version; npm --version; Backend/env/Scripts/python.exe --version; git status --short; trong UI/: npm ci,
//       npm run check (mốc và cuối); npm run build trong Desktop/ rồi CT_WALKTHROUGH_RUNNER=coding-agent@2026-10-03#1 npm
//       run e2e (mốc và cuối); tên, kích thước, giờ ghi mọi tệp trong %APPDATA%\CommissionTracker.
//     result: >
//       Node v24.14.1; npm 11.11.0 (npm ci in thêm cảnh báo của npm audit, không còn "0 vulnerabilities" như các phiên
//       trước; không sửa, ngoài plan); Python 3.13.12; git status đầu phiên sạch. Mốc: check "Tests 1303 passed (1303)"
//       (30 tệp); e2e mốc 59 test: "54 passed, 3 failed, 2 did not run" — hai lần hết giờ chụp ảnh (client_detail S4,
//       client_form S5) và một lần locator.click "Tải lại" không thấy (progress_board S4); mốc này chạy TRƯỚC khi có
//       nhật ký trạng thái cửa sổ nên không có dữ liệu cửa sổ. Cuối: check exit 0 (tsc -b, eslint --max-warnings 0,
//       stylelint, "check_contrast: 19 text pairs >= 4.5:1 and 13 non-text pairs >= 3:1 checked, all pass.",
//       "check_layer: 167 files under src/ checked", "check_e2e_status: no unfiltered text assertion", "Test Files 35
//       passed (35)", "Tests 1550 passed (1550)"); e2e 69 test, xem EVIDENCE của screens. %APPDATA%: data.db 114688
//       byte, data.db.lock 0 byte, giờ ghi 2026-09-28 21:09, không đổi.
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       UI-11, dữ liệu của phiên 27: mọi lần hết giờ chụp ảnh xảy ra khi cửa sổ Electron bị THU NHỎ.
//     how: >
//       Gộp mọi nhật ký test-results/screenshot-timing.log của các lượt có trạng thái cửa sổ (20 lượt riêng từng spec, 6
//       lượt đầy đủ có runner, 3 lượt không runner; không tính hai lượt chạy chồng nhau), script scratchpad agg.mjs.
//     result: >
//       1119 lần chụp có trạng thái cửa sổ. Lần chụp thành công (1112): trung bình 122 ms, lâu nhất 2859 ms, không lần
//       nào quá 5 s. Riêng 134 lần lúc backend tắt: trung bình 349 ms (gồm một lần hết giờ), lâu nhất 30005 ms. Hết giờ
//       (30 s): 7 lần — reminder_list-S1-list (2 lần), income_report-S1, payment_form-S6, commission_form-S1,
//       commission_list-S3-unreachable (backend tắt), progress_board-S4 — và CẢ BẢY lần, đọc trước lệnh chụp, đều là
//       "minimized:true, visible:false, focused:false, visibility:visible". Trạng thái của các lần thành công: 1096
//       bình thường (không thu nhỏ, có tiêu điểm), 11 không thu nhỏ nhưng mất tiêu điểm, 5 minimized:true (chụp vẫn
//       xong: cửa sổ được mở lại giữa lúc đọc và lúc chụp). Không lần hết giờ nào ở cửa sổ không bị thu nhỏ. Cùng cơ
//       chế với thí nghiệm phiên 25 (thu nhỏ: 11/20 treo; bị che, mất tiêu điểm: 0/20). Trace của các lượt hỏng (thêm ba
//       lượt của mốc đầu phiên, chưa có dữ liệu cửa sổ) ở UI/test-results/ui11_traces/ với INDEX.txt; thư mục nằm trong
//       test-results nên git bỏ qua và lượt e2e kế tiếp xóa nó: chép đi nếu cần giữ. Việc tiếp (4 của UI-11) thuộc
//       Project Owner: quyết harness có tự restore() hay chỉ dựa vào quy ước không thu nhỏ khi e2e chạy. Trong phiên này
//       tôi không thu nhỏ cửa sổ nào, nhưng cửa sổ vẫn bị thu nhỏ nhiều lần (nguồn chưa rõ: có thể Windows hoặc ứng dụng
//       khác khi máy đang dùng); người vận hành nên đối chiếu.
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       UI-11 bước (4): với cơ chế mở lại cửa sổ, probe điều kiện "thu nhỏ" 0/20 treo; tắt cơ chế thì treo trở lại.
//     how: >
//       Trong UI/ (Windows 11, Electron 44.4.5, Chromium 152.0.7977.130, giới hạn mỗi lệnh 10 s, 20 lần mỗi điều kiện):
//       node tests/tools/ui11_probe.mjs --guard=on --only=normal,minimized,reminimized --label=guard_on; rồi cùng lệnh với
//       --guard=off --label=guard_off (phép cắn). Bản ghi từng lần: test-results/ui11_probe/guard_on.jsonl, guard_off.jsonl.
//     result: >
//       CÓ cơ chế: normal 0 treo (lớn nhất 84 ms); minimized (thu nhỏ một lần, nghỉ 1 s) 0/20 treo, 1 lần mở lại, lớn nhất
//       87 ms; reminimized (thu nhỏ trước MỖI lần chụp) 0/20 treo, 20 lần mở lại, lớn nhất 85 ms. TẮT cơ chế: normal 0;
//       minimized 6/20 treo (lớn nhất 10017 ms); reminimized 12/20 treo (trung vị 10004 ms). (Phiên 25, không cơ chế:
//       minimized 11/20; số treo mỗi lần chạy thay đổi, nhưng luôn > 0 khi tắt và luôn 0 khi bật.)
//     recorded_at: 2026-10-03T22:33:18.0540800+07:00
//   - claim: >
//       UI-11, tiêu chí đóng: 10 lượt npm run e2e liên tiếp đạt, không đặt CT_WALKTHROUGH_RUNNER, trong lúc người vận hành dùng
//       máy bình thường (có thu nhỏ cửa sổ); số lần công cụ phải mở lại cửa sổ.
//     how: >
//       Desktop đã build. Trong UI/: tập lệnh chạy 10 lần "npm run e2e", từng lượt một, dừng ở lần hỏng đầu; sau mỗi lượt
//       chép test-results/window-restore.log và screenshot-timing.log ra ngoài. Lượt 1 bắt đầu 2026-10-03T21:40:47+07:00,
//       lượt 10 kết thúc 22:32:33+07:00.
//     result: >
//       Cả 10 lượt "70 passed" (69 test cũ + reminder_seed_ticker), lượt nào cũng 107 lần chụp, 0 lần chụp lỗi hay hết giờ,
//       0 lần chụp ghi minimized:true. Số lần mở lại cửa sổ: lượt 1-3: 0; lượt 4: 1 (income_report-S1); lượt 5: 4
//       (income_report-S1; reminder_list lúc đóng, hai lần liền cách nhau 2 s; reminder_settings-S5-unreachable); lượt 6: 1
//       (commission_detail-S1); lượt 7-8: 0; lượt 9: 1 (commission_form-S3); lượt 10: 0. TỔNG 7 lần ở 4 lượt trên 10,
//       mỗi lần cửa sổ được mở lại thì bước đó vẫn đạt, không lần chụp nào hết giờ. Trước đó (không phải lượt tính): reminder_list_walkthrough chạy riêng 10/10 đạt
//       (0 lần mở lại); mốc đầu phiên 69/69 đạt, không có cơ chế, không có lần hết giờ.
//     recorded_at: 2026-10-03T22:33:18.0540800+07:00
//   - claim: >
//       Môi trường, mốc, và điều kiện cuối phiên 28; mốc %APPDATA% và UI/evidence không đổi.
//     how: >
//       node --version; npm --version; npm ci; npm run check (mốc và cuối); git status --short; SHA-256 từng tệp
//       UI/evidence trước và sau (120 tệp); tên, kích thước, giờ ghi tệp trong %APPDATA%\CommissionTracker đầu (21:03) và
//       cuối phiên (22:32).
//     result: >
//       Node v24.14.1; npm 11.11.0; git status đầu phiên trống. Mốc check "Tests 1550 passed (1550)", e2e 69 passed (5,3
//       phút). Cuối: check "Tests 1555 passed (1555)" (+5: hai kiểm thử trang và ba kiểm thử Services của UI-13); 120 tệp
//       UI/evidence, so sánh từng SHA-256 với mốc: 0 khác biệt; data.db 114688 byte và data.db.lock 0 byte, giờ ghi
//       2026-09-28 21:09, không đổi. Không eslint-disable, không ngoại lệ lint mới, không phụ thuộc mới.
//       LƯU Ý (xem main-EXP-028, đã vá ở phiên 29): npm run check hỏng ngắt quãng ở một ca của tests/main/main.test.tsx do hết 5 s khi máy đang tải.
//     recorded_at: 2026-10-03T22:33:18.0540800+07:00
//   - claim: >
//       UI-18: bảng số đo bốn cách đưa cửa sổ đang thu nhỏ về lại, với một TIẾN TRÌNH khác giữ nền trước; cách chọn.
//     how: >
//       Trong UI/: node tests/tools/ui18_probe.mjs --n=20 --label=ui18_run1 (Electron 44.4.5, Windows 11, người dùng
//       dùng máy bình thường lúc đó). Mỗi lần: một tiến trình PowerShell xin nền trước; thu nhỏ cửa sổ chính; áp cách đo;
//       đọc isMinimized, isFocused, chủ nền trước của hệ điều hành (GetForegroundWindow); click + chụp ảnh với hạn 10 s.
//       Bản ghi từng lần: UI/test-results/ui18_probe/ui18_run1.jsonl (git bỏ qua). Kiểm cơ chế thật: node
//       tests/tools/ui11_probe.mjs --guard=on --only=reminimized --n=20 --label=guard_s29.
//     result: >
//       cách / số lần hợp lệ / còn thu nhỏ / ứng dụng giành nền trước / Electron isFocused / treo:
//       restore 20 / 0 / 18 / 18 / 0; showInactive 20 / 0 / 0 / 0 / 0; show 20 / 0 / 20 / 20 / 0; maximize+unmaximize
//       20 / 0 / 20 / 20 / 0. CHỌN showInactive (đạt cả ba, 20/20), đã áp vào window_guard.mjs. Cơ chế thật với
//       showInactive: ui11_probe reminimized 20 lần thu nhỏ trước mỗi lần chụp, 20 lần mở lại, 0 treo, trung vị 100 ms,
//       lớn nhất 116 ms, focused:false sau mỗi lần. Trong 10 lượt e2e cuối phiên: 2 lần mở lại (lượt 4,
//       commission_form-S1-filled; lượt 5, reminder_settings-S5-unreachable), cả hai "way=showInactive focused_after=false".
//     recorded_at: 2026-10-04T12:56:44.6836972+07:00
//   - claim: >
//       UI-16: số đo trước và sau, phép cắn.
//     how: >
//       Trước: npm run check ×5 đầu phiên; npx vitest run tests/main --reporter=verbose ×3. Sau: cùng lệnh. Phép cắn:
//       cấu hình vitest tạm (đã xóa) làm chậm biến đổi src/main.tsx 7 s; chạy tệp cũ (git show HEAD, bản tạm đã xóa) và tệp mới.
//     result: >
//       Trước: ca đầu 1004, 1066, 964 ms chạy riêng (ca hai 14-25 ms); trong 5 lần check cả bộ: hỏng 3 lần, trong đó ca
//       đầu hết giờ 2 lần (5093 ms, 5470 ms), một lần là ca app_root (main-EXP-030). Sau: ca đầu 103 ms chạy riêng. Phép cắn: tệp
//       cũ "no bridge on the global object 5018ms" hỏng (và các ca theo sau), tệp mới "Tests 17 passed (17)". npm run
//       check 10 lần liên tiếp đạt ("Tests 1555 passed (1555)" mỗi lần, lần hỏng đầu tiên của vòng: không có).
//     recorded_at: 2026-10-04T12:56:44.6836972+07:00
//   - claim: >
//       Điều kiện cuối phiên 29.
//     how: >
//       npm run e2e KHÔNG đặt CT_WALKTHROUGH_RUNNER, 10 lượt liên tiếp từng lượt một; SHA-256 từng tệp UI/evidence (120 tệp)
//       và tên, kích thước, giờ ghi tệp trong %APPDATA%\CommissionTracker, trước và sau; git status --short.
//     result: >
//       Mốc đầu phiên: Node v24.14.1, npm 11.11.0, e2e 70 passed (5,4 phút). 10 lượt: "70 passed" mỗi lượt (4,8-5,9 phút),
//       0 lần hỏng, 2 lần mở lại cửa sổ trong tổng 700 ca. UI/evidence: 0 khác biệt. data.db 114688 byte, data.db.lock 0
//       byte, giờ ghi 2026-09-28 21:09, không đổi. git status chỉ có tệp trong UI/. Không eslint-disable, không ngoại lệ
//       lint mới, không phụ thuộc mới. Câu trả lời của Project Owner về tiêu điểm (sau 10 lượt): CÒN bị giành tiêu điểm và chiếm phím, dù chỉ 2 lần mở lại trong 10 lượt. UI-18 CHƯA đạt tiêu chí cuối (xem NOTES).
//     recorded_at: 2026-10-04T12:56:44.6836972+07:00
//
// NOTES:
//   - content: >
//       UI-18 CHƯA ĐÓNG (phiên 29): Project Owner xác nhận sau 10 lượt e2e rằng cửa sổ ứng dụng vẫn nhảy lên giành tiêu
//       điểm và chiếm phím. showInactive() đã loại việc mở lại (chỉ 2 lần trong 10 lượt), nên nguồn chính là LÚC KHỞI ĐỘNG
//       ứng dụng: Desktop/src/main.ts tạo BrowserWindow hiện thường (không show:false, không showInactive), và mỗi spec
//       e2e khởi động ứng dụng riêng (khoảng 16 lần mỗi lượt). Số đo tests/tools/ui18_launch_probe.mjs (3 lần, máy đang
//       dùng): ứng dụng vào nền trước 2/3 lần, sau 2322 ms và 3835 ms kể từ lệnh khởi động; lần thứ ba không (12 s). Hạn
//       chế của số đo: tiến trình PowerShell mồi KHÔNG giữ được nền trước (ứng dụng của Project Owner giữ nó), nên chỉ khẳng
//       định "khởi động giành nền trước từ ứng dụng khác", chưa tách được từng nguyên nhân phụ. Không chữa được trong
//       UI/: cần đổi cách Desktop mở cửa sổ (ví dụ show:false rồi showInactive) hoặc một cờ --ct-test-*, cả hai ngoài
//       phiên này. Đề xuất cho Orchestrator: mục mới (có thể ở Desktop), hoặc chấp nhận cho V1 và chạy e2e lúc không dùng máy.
//     written_at: 2026-10-04T13:20:16.5016162+07:00
//   - content: >
//       UI.esproj: StartupCommand = npm run build (giao diện không tự chạy được;
//       chạy thật là npm run build trong UI/ rồi npm start trong Desktop/),
//       BuildCommand = npm run build, TestCommand = npm run check,
//       JavaScriptTestRoot = src\, JavaScriptTestFramework giữ Vitest. Kiểm thử
//       Main nằm ở tests/main/ (kiểm thử cấp layer, CLAUDE.md mục 4), ngoài
//       src\, nên Test Explorer có thể không thấy; chạy bằng npm run check.
//     written_at: 2026-09-27
//   - content: >
//       npm run e2e, npm run walkthrough:app cần Desktop đã được build
//       (Desktop/dist/main.js); công cụ báo rõ nếu thiếu. Phiên UI không build
//       Desktop.
//     written_at: 2026-09-27
//   - content: >
//       Cách chạy e2e từ phiên 19 (UI-8). Kiểm hồi quy (mọi phiên, mọi layer): trong
//       UI/, npm run e2e KHÔNG đặt CT_WALKTHROUGH_RUNNER; bằng chứng nháp vào
//       UI/test-results/evidence/, UI/evidence không đổi. Ghi bằng chứng của một phiên
//       giao diện hoặc của Project Owner: đặt biến trước, PowerShell
//       $env:CT_WALKTHROUGH_RUNNER = "coding-agent@<ngày>#<số>"; npm run e2e (Git Bash:
//       CT_WALKTHROUGH_RUNNER='Tên' npm run e2e); bằng chứng vào UI/evidence/ với đúng
//       tên người chạy. Chạy tay kịch bản: npm run walkthrough:app (dữ liệu mẫu D1),
//       -- --commissions (D2), -- --progress (D3, từ phiên 20), -- --empty (trống).
//     written_at: 2026-09-29
//   - content: >
//       Phiên 12 sửa tests/main/main.test.tsx: ca "valid launch value → main
//       frame" trước khẳng định không có lời gọi nào lúc khởi động. Nay trang
//       mặc định client_list tải danh sách khi mở, nên ca này khẳng định đúng
//       một lời gọi GET <backendBaseUrl>/clients. Đây là hành vi mới theo plan
//       việc 5, không phải nới kiểm thử.
//     written_at: 2026-09-27
//   - content: >
//       Phiên 16 sửa tests/main/main.test.tsx: ca "valid launch value" nay chờ
//       "Chưa có khách hàng nào." (trạng thái rỗng của D1) thay cho câu rỗng của
//       nhóm cũ, và khẳng định có vùng điều hướng "Điều hướng chính". Vẫn đúng
//       một lời gọi GET <backendBaseUrl>/clients. Hành vi mới theo plan việc 4 và
//       7, không phải nới kiểm thử.
//     written_at: 2026-09-28
// ===WCA-CHECKPOINT-END===
/**
 * Main of the interface layer (iwca_theory.md §4; i2-scaffold.md, Step I2.6).
 *
 * Logistics only, five steps in this order: (1) read the launch value from the
 * host environment and check its format — the only branch of Main: if it is
 * missing or malformed, render the startup error screen and stop; (2) read
 * the configs; (3) prepare the foundation workflow scaffold_ui; (4) wire every
 * interface workflow; (5) put the Routers into the context and render the root.
 *
 * Main is the only file that reads the host environment (R12) and the only
 * runtime file that imports configuration values (R14).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LAYER_CONFIGS } from './configs/layer_configs'
import { FatalMessage } from './kit'
import { createManageClientAdapters } from './logic/workflows/manage_client/adapters'
import { MANAGE_CLIENT_CONFIGS } from './logic/workflows/manage_client/configs'
import { createManageClientRouters } from './logic/workflows/manage_client/routers'
import { createManageClientServices } from './logic/workflows/manage_client/services'
import { createManageCommissionAdapters } from './logic/workflows/manage_commission/adapters'
import { MANAGE_COMMISSION_CONFIGS } from './logic/workflows/manage_commission/configs'
import { createManageCommissionRouters } from './logic/workflows/manage_commission/routers'
import { createManageCommissionServices } from './logic/workflows/manage_commission/services'
import { createUpdateProgressAdapters } from './logic/workflows/update_progress/adapters'
import { UPDATE_PROGRESS_CONFIGS } from './logic/workflows/update_progress/configs'
import { createUpdateProgressRouters } from './logic/workflows/update_progress/routers'
import { createUpdateProgressServices } from './logic/workflows/update_progress/services'
import { createRecordPaymentAdapters } from './logic/workflows/record_payment/adapters'
import { RECORD_PAYMENT_CONFIGS } from './logic/workflows/record_payment/configs'
import { createRecordPaymentRouters } from './logic/workflows/record_payment/routers'
import { createRecordPaymentServices } from './logic/workflows/record_payment/services'
import { createViewIncomeReportAdapters } from './logic/workflows/view_income_report/adapters'
import { VIEW_INCOME_REPORT_CONFIGS } from './logic/workflows/view_income_report/configs'
import { createViewIncomeReportRouters } from './logic/workflows/view_income_report/routers'
import { createViewIncomeReportServices } from './logic/workflows/view_income_report/services'
import { createSendReminderAdapters } from './logic/workflows/send_reminder/adapters'
import { SEND_REMINDER_CONFIGS } from './logic/workflows/send_reminder/configs'
import { createSendReminderRouters } from './logic/workflows/send_reminder/routers'
import { createSendReminderServices } from './logic/workflows/send_reminder/services'
import { createHttpClient } from './logic/workflows/scaffold_ui/adapters'
import { SCAFFOLD_UI_CONFIGS } from './logic/workflows/scaffold_ui/configs'
import { AppRoot } from './screens/app_root'
import { LogicContext, type LogicRouters } from './screens/logic_context'

type LaunchValues = { ok: true; backendBaseUrl: string } | { ok: false; detail: string }

// Step 1. The launch value (.design/ui_decomposition.md §3): the string
// property backendBaseUrl of the frozen object window.<renderer_bridge>,
// shaped http://<loopback_host>:<port 1..65535> (data_schema.yaml 6.1.0,
// clause_a_common.mandatory_rules, renderer rule). No default, no guess.
function readLaunchValues(): LaunchValues {
  const { rendererBridge, backendBaseUrlProperty, loopbackHost } = LAYER_CONFIGS.launch
  const failure = LAYER_CONFIGS.startupFailure
  const bridgeName = `window.${rendererBridge}`
  const valueName = `${bridgeName}.${backendBaseUrlProperty}`

  const bridge: unknown = Reflect.get(window, rendererBridge)
  if (typeof bridge !== 'object' || bridge === null) {
    return { ok: false, detail: `${failure.bridgeMissing}: ${bridgeName}` }
  }
  const value: unknown = Reflect.get(bridge, backendBaseUrlProperty)
  if (typeof value !== 'string') {
    return { ok: false, detail: `${failure.valueNotString}: ${valueName}` }
  }
  const prefix = `http://${loopbackHost}:`
  const port = value.startsWith(prefix) ? value.slice(prefix.length) : ''
  if (!/^[1-9][0-9]{0,4}$/.test(port) || Number(port) > 65535) {
    return { ok: false, detail: `${failure.valueMalformed}: ${valueName} = ${JSON.stringify(value)}` }
  }
  return { ok: true, backendBaseUrl: value }
}

const root = createRoot(document.getElementById(LAYER_CONFIGS.rootElementId)!)
const launch = readLaunchValues()

if (!launch.ok) {
  // Startup error screen: say which value is wrong, render nothing else.
  root.render(
    <StrictMode>
      <FatalMessage title={LAYER_CONFIGS.startupFailure.title} detail={launch.detail} />
    </StrictMode>,
  )
} else {
  // Step 2. Configs: LAYER_CONFIGS (layer) and SCAFFOLD_UI_CONFIGS (workflow),
  // imported above as static data.

  // Step 3. Foundation workflow scaffold_ui: the http_client resource.
  const httpClient = createHttpClient(launch.backendBaseUrl, SCAFFOLD_UI_CONFIGS.timeoutMs)

  // Step 4. Wire each interface workflow, in the order of
  // .design/ui_decomposition.md §2:
  //   Adapters(httpClient, <WORKFLOW>_CONFIGS)
  //   → Services(adapters, <WORKFLOW>_CONFIGS, LAYER_CONFIGS.resultMessages)
  //   → Routers(services[, the Configs values Routers checks with]), added to `routers` below.
  const manageClientAdapters = createManageClientAdapters(httpClient, MANAGE_CLIENT_CONFIGS)
  const manageClientServices = createManageClientServices(
    manageClientAdapters,
    MANAGE_CLIENT_CONFIGS,
    LAYER_CONFIGS.resultMessages,
  )
  const manageCommissionAdapters = createManageCommissionAdapters(httpClient, MANAGE_COMMISSION_CONFIGS)
  const manageCommissionServices = createManageCommissionServices(
    manageCommissionAdapters,
    MANAGE_COMMISSION_CONFIGS,
    LAYER_CONFIGS.resultMessages,
  )
  const updateProgressAdapters = createUpdateProgressAdapters(httpClient, UPDATE_PROGRESS_CONFIGS)
  const updateProgressServices = createUpdateProgressServices(updateProgressAdapters, UPDATE_PROGRESS_CONFIGS, LAYER_CONFIGS.resultMessages)
  // record_payment also gets the clock: the one place "now" comes from
  // (ui_decomposition.md D4), so a test can fix the instant.
  const recordPaymentAdapters = createRecordPaymentAdapters(httpClient, RECORD_PAYMENT_CONFIGS)
  const recordPaymentServices = createRecordPaymentServices(recordPaymentAdapters, RECORD_PAYMENT_CONFIGS, LAYER_CONFIGS.resultMessages, () => new Date())
  // view_income_report gets the clock too (ui_decomposition.md D5): the period
  // the report page opens with is decided from it. Its own arrow, not shared
  // with record_payment's.
  const viewIncomeReportAdapters = createViewIncomeReportAdapters(httpClient, VIEW_INCOME_REPORT_CONFIGS)
  const viewIncomeReportServices = createViewIncomeReportServices(
    viewIncomeReportAdapters,
    VIEW_INCOME_REPORT_CONFIGS,
    LAYER_CONFIGS.resultMessages,
    () => new Date(),
  )
  // send_reminder: the four calls of D6 only; check_due is the desktop's
  // reminder_ticker's, never the interface's (api_contract.yaml 4.0.0).
  const sendReminderAdapters = createSendReminderAdapters(httpClient, SEND_REMINDER_CONFIGS)
  const sendReminderServices = createSendReminderServices(sendReminderAdapters, SEND_REMINDER_CONFIGS, LAYER_CONFIGS.resultMessages)
  const routers: LogicRouters = {
    manageClient: createManageClientRouters(manageClientServices, MANAGE_CLIENT_CONFIGS.limits),
    manageCommission: createManageCommissionRouters(manageCommissionServices, {
      limits: MANAGE_COMMISSION_CONFIGS.limits,
      currencyDecimals: MANAGE_COMMISSION_CONFIGS.currencyDecimals,
      formats: MANAGE_COMMISSION_CONFIGS.formats,
    }),
    updateProgress: createUpdateProgressRouters(updateProgressServices),
    recordPayment: createRecordPaymentRouters(recordPaymentServices, {
      limits: RECORD_PAYMENT_CONFIGS.limits,
      currencyDecimals: RECORD_PAYMENT_CONFIGS.currencyDecimals,
      directions: RECORD_PAYMENT_CONFIGS.directions,
      paymentKinds: RECORD_PAYMENT_CONFIGS.paymentKinds,
    }),
    viewIncomeReport: createViewIncomeReportRouters(viewIncomeReportServices),
    sendReminder: createSendReminderRouters(sendReminderServices, {
      limits: SEND_REMINDER_CONFIGS.limits,
      formats: SEND_REMINDER_CONFIGS.formats,
      periodicUnits: SEND_REMINDER_CONFIGS.periodicUnits,
      leadUnits: SEND_REMINDER_CONFIGS.leadUnits,
    }),
  }

  // Step 5. Hand the Routers to the screens zone and render the root.
  root.render(
    <StrictMode>
      <LogicContext.Provider value={routers}>
        <AppRoot />
      </LogicContext.Provider>
    </StrictMode>,
  )
}
