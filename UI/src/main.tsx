// ===WCA-CHECKPOINT-START===
// workflow: main
// clause: external
// component: main
// last_updated_by: coding-agent@2026-09-28#2
// last_updated_at: 2026-09-28T12:38:00+07:00
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
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
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
//
// NOTES:
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
  const routers: LogicRouters = {
    manageClient: createManageClientRouters(manageClientServices, MANAGE_CLIENT_CONFIGS.limits),
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
