// ===WCA-CHECKPOINT-START===
// workflow: screens
// clause: external
// component: screens
// last_updated_by: coding-agent@2026-09-28#2
// last_updated_at: 2026-09-28T12:35:00+07:00
//
// EXPERIENCES:
//   - id: screens-EXP-001
//     content: >
//       Điều hướng nằm trong trạng thái, không nằm trong URL (Desktop chỉ phục vụ
//       tệp, không có dự phòng kiểu SPA), không thư viện điều hướng (CLAUDE.md
//       mục 5). Từ phiên 16 có tham số CÓ KIỂU: PageParams = { client_list: null;
//       client_detail: { client_id }; client_form: { mode: 'create' } | { mode:
//       'edit'; client_id } }; PageKey = keyof PageParams; Route là hợp các
//       { page: K; params: PageParams[K] }, nên mở một trang với tham số của
//       trang khác (hay thiếu client_id) là lỗi biên dịch (kiểm bằng bốn dòng
//       expect-error trong src/screens/tests/app_root.test.tsx, tsc -b hỏng nếu
//       một dòng biên dịch được). NAVIGATION là bản ghi theo PageKey, mỗi mục
//       { layout, component: ComponentType<PageProps<K>>, section, menu }, nên
//       mỗi trang gắn với component nhận đúng tham số của nó. START_PAGE vẫn là
//       'client_list' (START_ROUTE = { page: 'client_list', params: null }).
//   - id: screens-EXP-002
//     content: >
//       AppRoot giữ { route, notice, visit }. Navigate = (to: Route, notice:
//       string | null) => void. Mỗi lần điều hướng thay cả ba, nên thông báo chuyển
//       trang chỉ hiện ở trang đích một lần: lần điều hướng sau (kể cả qua vùng
//       điều hướng) không mang nó. visit là key của trang, nên mỗi lần điều hướng
//       dựng trang mới và hook tải lại, kể cả khi về cùng một trang. Trang nhận
//       PageProps<K> = { params, navigate, notice }. Thêm một trang: thêm khóa và
//       kiểu tham số vào PageParams (đúng bảng trang của ui_decomposition.md §5),
//       thêm mục vào NAVIGATION, thêm kiểu Routers vào LogicRouters nếu có
//       workflow mới; trang và hook lấy Routers bằng useLogic() (R8).
//   - id: screens-EXP-003
//     content: >
//       main_layout (layouts/main_layout/MainLayout.tsx): AppFrame của kit, tiêu đề
//       cố định "Commission Tracker", VÙNG ĐIỀU HƯỚNG cố định bên trái là NavMenu
//       "Điều hướng chính", sinh từ các mục của NAVIGATION có menu (theo thứ tự
//       của bảng; hiện chỉ "Khách hàng" mở client_list); mục đang mở là section
//       của trang hiện tại (client_detail và client_form thuộc section client_list)
//       và được đánh dấu aria-current="page". Phiên sau thêm mục của mình vào
//       NAVIGATION (menu), không đổi vị trí mục cũ (§7.2 nguyên tắc 7). Vùng nội
//       dung là Stack gap="lg". Screens không có style (R10); assert_never.ts là
//       bản riêng của screens (R8, D4).
//   - id: screens-EXP-004
//     content: >
//       Ba trang, mỗi trang một hook chỉ gọi, giữ, chuyển; ref running (không gọi
//       lần hai khi lần một chưa xong, chặn cả lần gọi thứ hai của useEffect dưới
//       StrictMode) và mounted (không cập nhật sau khi trang đóng). client_list:
//       "Thêm khách hàng" (primary) và "Tải lại" (secondary) ở đầu trang; bấm một
//       khách mở client_detail; view.isEmpty thì EmptyState "Chưa có khách hàng
//       nào." có nút thêm. client_detail: tải khi mở; "Sửa" (primary), "Lưu trữ
//       khách hàng" hoặc "Bỏ lưu trữ", "Quay lại danh sách"; lưu trữ không hỏi xác
//       nhận (quay lại được); khi setClientArchived trả ok, hook giữ luôn chi tiết
//       mới đi kèm (switch đầy đủ), không gọi lại get_client; thông báo chuyển
//       trang chỉ hiện khi trang chưa có kết quả lưu trữ riêng. client_form: hook
//       giữ bản nháp THÔ (ClientFormDraft), không chuyển đổi gì; openClientForm khi
//       mở (ok thì lấy bản nháp của view); saveClient gửi bản nháp như đã gõ; ok thì
//       hook trao view cho trang (onSaved), trang điều hướng tới client_detail với
//       câu của Services; mọi kết quả khác giữ nguyên bản nháp. Thêm hay bỏ hàng
//       liên hệ xóa kết quả lưu cũ (lỗi theo chỉ số hàng không còn khớp). "Hủy" về
//       client_detail (edit) hoặc client_list (create). Mọi nhãn ô là chữ cố định
//       của trang (Tên hiển thị, Kênh n, Giá trị n, Ghi chú).
//   - id: screens-EXP-005
//     content: >
//       R13 (luật mới từ phiên 16): trong screens, thuộc tính kind chỉ được đọc
//       làm biểu thức của switch. Mọi phân nhánh ViewResult của ba trang là một
//       component con hoặc hàm có switch kết thúc bằng assertNever (ClientListResult,
//       DetailResult, ArchiveResult, OpenedResult, SaveResult, fieldErrorsOf, và
//       switch trong hai hook). Phân nhánh trên params.mode không phải kind.
//   - id: screens-EXP-006
//     content: >
//       Kịch bản bấm thử (walkthrough.yaml cạnh từng trang) và bản tự động
//       tests/e2e/<trang>_walkthrough.spec.ts, dùng chung
//       tests/e2e/walkthrough_harness.ts. client_list S1..S5 (mỗi bước một lần mở
//       ứng dụng; S1..S3 giữ nghĩa cũ, S2 nay là trạng thái rỗng có nút thêm);
//       client_detail S1..S6 và client_form S1..S5 nối tiếp trong một lần mở. Dữ
//       liệu mẫu (tests/tools/walkthrough_lib.mjs) thêm khách "Nguyễn Thu Hà" có
//       hai liên hệ và ghi chú. Luật phủ D1 (ui_decomposition §5): ok cho mọi
//       thao tác; rejected_input cho lưu ở cả hai chế độ (client_form S2 create,
//       S4 edit); ít nhất một unreachable mỗi trang (client_list S3, client_detail
//       S4, client_form S5); không đòi rejected_system (không gây ra được bằng
//       thao tác bình thường; kiểm thử dựng trang chứng minh 400, 404, 500).
//   - id: screens-EXP-007
//     content: >
//       TÊN NGƯỜI CHẠY (UI-2): mọi bản ghi <trang>-run.json ghi runner = biến môi
//       trường CT_WALKTHROUGH_RUNNER (thiếu hoặc rỗng thì "unknown", không đoán),
//       kèm công cụ đã điều khiển ứng dụng. Cách dùng, PowerShell:
//       $env:CT_WALKTHROUGH_RUNNER = "coding-agent@2026-09-28#1"; npm run e2e.
//       Git Bash: CT_WALKTHROUGH_RUNNER='Tên' npm run e2e. npm run walkthrough:app
//       in dòng "Người chạy (CT_WALKTHROUGH_RUNNER): …" lúc mở. Hàm
//       walkthroughRunner() ở tests/tools/walkthrough_lib.mjs.
//   - id: screens-EXP-008
//     content: >
//       Đảo thứ tự so với plan phiên 16: làm phần kit mà điều hướng cần (NavMenu,
//       Inline, AppFrame có nav) cùng lúc với việc 4, trước việc 5, vì vùng điều
//       hướng không dựng được khi kit chưa có component đó (thứ tự I4 trước I5).
//       Phần còn lại của kit (việc 6) làm sau logic (việc 5), đúng plan. Không
//       bỏ, không thêm việc.
//   - id: screens-EXP-009
//     content: >
//       Đối chiếu bảy nguyên tắc §7.2 của ui_decomposition.md, BẢN 2026-09-28 SAU
//       AUDIT PHIÊN 16 (I6 góc người dùng, phiên 17). (1) Một hành động chính mỗi
//       trang, màu nhấn: client_list "Thêm khách hàng", client_detail "Sửa",
//       client_form "Lưu"; nút khác secondary. Đạt. (2) Không dày thông tin: danh
//       sách chỉ tên; chi tiết năm mục; form ba nhóm ô. Đạt. (3) Nhãn tiếng Việt
//       theo lời họa sĩ. Đạt. (4) Phản hồi sau mỗi thao tác ghi ("Đã thêm khách
//       hàng.", "Đã lưu thay đổi.", câu lưu trữ nói hậu quả); lỗi nhập ngay dưới ô
//       sai; TỪ PHIÊN 17 con trỏ nhập chuyển tới ô lỗi đầu tiên theo thứ tự trên
//       màn hình (tên, từng hàng liên hệ kênh rồi giá trị, ghi chú), đo trên ứng
//       dụng thật (client_form S2, S4, toBeFocused). Đạt. (5) Không có thao tác
//       khó quay lại ở D1. Đạt. (6) Trạng thái rỗng "Chưa có khách hàng nào." có
//       nút thêm. Đạt. (7) Điều hướng ổn định: vùng điều hướng cố định bên trái;
//       TỪ PHIÊN 17 cả ba trang có hàng nút ngay dưới tiêu đề trang, hành động
//       chính đứng đầu (client_form: "Lưu", "Hủy"; thông báo kết quả lưu nằm ngay
//       dưới hàng nút, trên các ô), đo bằng vị trí thật trên màn hình ở e2e
//       (expectButtonRowFirst, S1 và S3). Đạt. Ghi nhận cũ về "Lưu" cuối form
//       (phiên 16) đã giải quyết. Trạng thái mở form hỏng (rejected, unreachable,
//       contract_violation khi mở) giữ nguyên cách hiện, đúng plan.
//   - id: screens-EXP-010
//     content: >
//       Tự kiểm I6, ba trang, năm góc (phiên 17). HỢP ĐỒNG: Data Schema 7.0.0 và
//       API Contract 4.0.0 approved; đã đọc changelog v7.0.0; Configs trỏ api
//       4.0.0, data 7.0.0; bảng nhãn năm điểm giao tiếp khớp từng dòng (API không
//       đổi); luật not blank của client_input là bản sao có chú thích [CONTRACT];
//       tìm trong src và tests (grep) không có lời gọi tới /watermark-profiles,
//       /watermark-strengths, /artworks, /verifications, /reminders/checks (chỉ
//       khớp trong chú thích checkpoint); chỉ gọi /clients, /clients/{client_id},
//       /clients/{client_id}/archived. RANH GIỚI: npm run check đạt (R1–R14);
//       Services chỉ quyết định trình bày; Routers kiểm đúng type (not blank,
//       1..120) cộng ba luật [UI-ONLY] ghi ở ui_decomposition §5; ba hook viết lại
//       được bằng gọi, giữ, chuyển (cờ tải khởi tạo true là giữ; saveCount là
//       giữ); chọn ô lỗi đầu tiên là trình bày của trang, không nằm trong logic;
//       focusRequest của kit không mang khái niệm nghiệp vụ. NGƯỜI DÙNG: ba kịch
//       bản chạy lại trên hệ thống thật, đạt; §7.2 ở screens-EXP-009. CHECKPOINT:
//       đã cập nhật manage_client (đóng NOTE CT-2), kit, screens, main. BẰNG
//       CHỨNG: đủ ba loại (dưới đây, ở manage_client, kit và main).
//   - id: screens-EXP-011
//     content: >
//       UI-4 (phiên 17). Cờ tải của hook nào tải ngay khi trang mở khởi tạo true:
//       use_client_list.loading, use_client_detail.loading,
//       use_client_form.opening. Lần vẽ đầu đã là trạng thái đang tải: có chỉ báo,
//       "Tải lại" bận, form chưa có ô và nút. Cơ chế chống gửi hai lần (ref
//       running) giữ nguyên. Kiểm thử "lần vẽ đầu" dùng renderFirstCommit của
//       src/screens/tests/fake_logic.tsx: RTL render() chạy trong act() nên effect
//       tải đã chạy trước khi kiểm thử nhìn được, kiểm sau render() không phân
//       biệt được; component thăm dò đặt cạnh trang đọc DOM trong useLayoutEffect,
//       lúc trang đã commit mà passive effect (lời gọi Routers) chưa chạy. Spec
//       e2e không còn dùng trạng thái nút làm tín hiệu đã tải: launch chờ trạng
//       thái rỗng (thư mục dữ liệu mới); reloadList(page, 'list' | 'unreachable')
//       chờ nội dung KHÁC nội dung trước (rỗng → danh sách, danh sách → "Không kết
//       nối được", lỗi → danh sách) rồi chờ hết chỉ báo đang tải; goToList và sau
//       "Hủy", "Quay lại danh sách" chờ expectListLoaded (danh sách có tên, không
//       status, không alert). client_form S2 khẳng định before khác rỗng và chứa
//       "Chi Mai" trước khi so. Các chỗ còn lại kiểm nút bật (client_detail S1,
//       client_list S4, client_form S5) là khẳng định sau khi nội dung đã hiện,
//       không phải tín hiệu đã tải.
//   - id: screens-EXP-012
//     content: >
//       client_form (phiên 17): FormBody đặt Inline("Lưu" primary, "Hủy") đầu
//       tiên, ngay dưới tiêu đề Section; SaveResult ngay dưới; rồi các ô. Trang
//       dựng thứ tự ô trên màn hình (displayName, contacts.i.channel,
//       contacts.i.value, note), lấy ô đầu tiên có trong fieldErrors, và trao cho
//       đúng ô đó focusRequest = form.saveCount (số kết quả lưu hook đã nhận), ô
//       khác 0. Mỗi kết quả lưu có số mới, nên lần từ chối sau lại đưa con trỏ về
//       ô lỗi đầu tiên dù người dùng đã rời ô; rejected system có fieldErrors {}
//       nên không ô nào được focus. Focus xảy ra trong effect sau commit, nên kiểm
//       thử chờ bằng vi.waitFor (khẳng định ngay sau findByRole('alert') hỏng
//       ngẫu nhiên khi chạy cả bộ; ca "không focus" flush effect bằng act trước
//       khi nhìn). Không làm V2: Enter để lưu, giữ focus khi nút bận, chặn rời form.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Phiên 17: kiểm thử dựng trang phủ lần vẽ đầu (UI-4), hàng nút dưới tiêu đề
//       và focus tới ô lỗi đầu tiên, cùng mọi ca cũ.
//     how: >
//       Trong UI/: npm run check; npx vitest run --reporter=verbose.
//     result: >
//       ClientList.test.tsx 11 (thêm lần vẽ đầu: chỉ báo "Đang tải danh sách
//       khách hàng…", nút bấm được chỉ có "Thêm khách hàng", Routers chưa gọi).
//       ClientDetail.test.tsx 19 (thêm lần vẽ đầu: không nút nào bấm được).
//       ClientForm.test.tsx 27 (thêm lần vẽ đầu create và edit: không ô, không
//       nút; hàng "Lưu", "Hủy" sau tiêu đề và trước ô đầu tiên, không control nào
//       xen giữa, khung lỗi nằm giữa hàng nút và ô, ở cả hai chế độ; focus: lỗi ở
//       tên (và ở liên hệ) → "Tên hiển thị"; lỗi chỉ ở hàng liên hệ thứ hai (và
//       ghi chú) → "Giá trị 2"; lần từ chối thứ hai lại đưa con trỏ về; rejected
//       system → không ô nào). Toàn layer "Test Files 10 passed (10)", "Tests 241
//       passed (241)" (mốc 225).
//     recorded_at: 2026-09-28T12:26:00+07:00
//   - claim: >
//       Kiểm thử lần vẽ đầu và kiểm thử focus cắn.
//     how: >
//       (a) Tạm đặt ba cờ loading, loading, opening về useState(false); npx vitest
//       run src/screens; khôi phục. (b) Tạm cho focusRequest trong ClientForm.tsx
//       luôn là 0; npx vitest run src/screens/pages/client_form; khôi phục.
//     result: >
//       (a) "Tests 4 failed | 50 passed (54)": bốn ca lần vẽ đầu (client_list,
//       client_detail, client_form create, edit), "AssertionError: expected [] to
//       deeply equal [ 'Đang tải danh sách khách hàng…' ]" và tương tự. Khôi phục:
//       54 đạt. (b) "Tests 3 failed | 24 passed (27)": ba ca focus. Khôi phục: 27
//       đạt (lần cuối với vi.waitFor lúc 12:15:20).
//     recorded_at: 2026-09-28T12:04:59+07:00
//   - claim: >
//       UI-4: npm run e2e đạt 5 lần liên tiếp trên Windows, với mã cuối phiên 17;
//       ba kịch bản bấm thử chạy lại trên hệ thống thật, ảnh mới, đúng tên người chạy.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#2,
//       npm run e2e năm lần liên tiếp; so danh sách ct-ui-* trong %TEMP% trước và
//       sau. Bản ghi UI/evidence/walkthroughs/<trang>/<trang>-run.json.
//     result: >
//       Lần 1 "17 passed (1.1m)" (12:18:28–12:19:39); lần 2 "17 passed (57.9s)";
//       lần 3 "17 passed (57.6s)"; lần 4 "17 passed (57.5s)"; lần 5 "17 passed
//       (59.5s)" (kết thúc 12:24:05). "NO NEW TEMP FOLDER". Bản ghi lần 5: mọi
//       bước passed true, runner "coding-agent@2026-09-28#2 (Playwright, …)":
//       client_list S1..S5, client_detail S1..S6, client_form S1..S5 (S2, S4 có
//       toBeFocused ở "Tên hiển thị"; S1, S3 kiểm hàng nút trên ô đầu tiên bằng
//       vị trí thật). Ảnh mới thay ảnh cũ: client_list-S1..S5, -S2-empty,
//       -S3-unreachable; client_detail-S1..S6, -S4-unreachable; client_form-S1..S5,
//       -S2-errors, -S4-errors, -S5-unreachable, -S5-saved. Một lượt trước đó bị
//       dừng giữa lần 1 vì đặt nhầm tên người chạy (#1); không tính.
//     recorded_at: 2026-09-28T12:24:05+07:00
//   - claim: >
//       Ba trang và điều hướng dựng đúng trong jsdom; kiểm thử dựng trang phủ mọi
//       kind của mọi thao tác của ba trang, cộng lỗi từng ô, thông báo chuyển
//       trang hiện một lần, tham số điều hướng đúng.
//     how: >
//       Trong UI/: npm run check (Routers giả trong LogicContext qua
//       src/screens/tests/fake_logic.tsx; tests/main/main.test.tsx dựng Main thật
//       với fetch giả).
//     result: >
//       ClientList.test.tsx 10 đạt (ok hai nhóm; bấm khách mở client_detail với
//       id; "Thêm khách hàng" mở client_form create; ok rỗng có nút thêm; chỉ có
//       khách lưu trữ; rejected 500; unreachable rồi tải lại; contract_violation;
//       đang tải; thông báo). ClientDetail.test.tsx 18 đạt (tải: ok, không ghi
//       chú và liên hệ, khách đã lưu trữ, rejected 404 có nút quay lại, 500,
//       unreachable rồi thử lại, contract_violation; điều hướng Sửa, quay lại,
//       thông báo chỉ hiện tới khi có kết quả riêng; lưu trữ: ok, bỏ lưu trữ ok,
//       rejected 400, 404, 500, unreachable rồi bấm lại, contract_violation, nút
//       bận không gọi lần hai). ClientForm.test.tsx 19 đạt (mở: create không gọi
//       backend, edit điền sẵn, gợi ý kênh, rejected 404, 500, unreachable rồi
//       thử lại, contract_violation; bản nháp gửi nguyên như gõ, hủy ở hai chế
//       độ; lưu: ok create, ok edit, rejected input có lỗi đúng ô và giữ bản
//       nháp, rejected system 400, 404, 500, unreachable rồi lưu lại cùng bản
//       nháp, contract_violation, đang lưu). app_root.test.tsx 3 đạt (bảng điều
//       hướng có đúng ba trang; vùng điều hướng, mục hiện tại; danh sách →
//       chi tiết → sửa → lưu → chi tiết có "Đã lưu thay đổi." đúng một lần).
//       main.test.tsx 17 đạt. Toàn bộ: "Test Files 10 passed (10)", "Tests 225
//       passed (225)".
//     recorded_at: 2026-09-28T10:56:10+07:00
//   - claim: >
//       Ba kịch bản bấm thử chạy trên ứng dụng thật với Backend.py thật, mọi bước
//       đạt, có ảnh chụp và đúng tên người chạy.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#1
//       npm run e2e (build UI/dist; mỗi spec mở ứng dụng qua
//       tests/e2e/walkthrough_harness.ts; bật/tắt backend bằng đúng lệnh npm run
//       walkthrough:backend -- down|up). Bản ghi:
//       UI/evidence/walkthroughs/<trang>/<trang>-run.json.
//     result: >
//       "17 passed (59.7s)": client_detail S1..S6, client_form S1..S5, client_list
//       S1..S5, main_layout. Bản ghi: mọi bước passed true, runner
//       "coding-agent@2026-09-28#1 (Playwright, tests/e2e/<trang>_walkthrough.spec.ts)",
//       finished_at từ 2026-09-28T03:53:42Z tới 03:54:31Z (UTC). Mỗi lần tắt/bật:
//       "walkthrough:backend: backend is down (…)", "… is up (…)" trên cùng cổng.
//       Ảnh: client_list-S1..S5.png, -S2-empty.png, -S3-unreachable.png;
//       client_detail-S1..S6.png, -S4-unreachable.png; client_form-S1..S5.png,
//       -S2-errors.png, -S4-errors.png, -S5-unreachable.png, -S5-saved.png. Không
//       còn thư mục ct-ui-* mới nào trong %TEMP% sau lần chạy.
//     recorded_at: 2026-09-28T10:54:37+07:00
//   - claim: >
//       Công cụ chạy tay cho Project Owner hoạt động với dữ liệu mẫu mới.
//     how: >
//       Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-28#1 node
//       tests/tools/walkthrough_app.mjs (UI/dist đã build); curl GET /clients; npm
//       run walkthrough:backend -- down, curl; -- up, curl; đóng cửa sổ bằng
//       taskkill (không /F).
//     result: >
//       In "Người chạy (CT_WALKTHROUGH_RUNNER): coding-agent@2026-09-28#1", "ĐÃ NẠP
//       XONG dữ liệu mẫu", "Khách có liên hệ và ghi chú: Nguyễn Thu Hà". GET
//       /clients 200; tắt thì không kết nối được (000); bật thì 200 trên cùng cổng
//       53843. Đóng: fixture "stdin closed: stopping", backend thoát mã 0,
//       "walkthrough:app: the desktop app exited with code 0; temporary data removed."
//     recorded_at: 2026-09-28T10:58:00+07:00
//
// NOTES:
//   - content: >
//       Đề xuất trạng thái (I6, phiên 17): client_list hoàn_tất, client_detail
//       hoàn_tất, client_form hoàn_tất; chờ Orchestrator audit và Project Owner tự
//       chạy lại ba kịch bản bằng tay. Coding agent không sửa ui_decomposition.md.
//     written_at: 2026-09-28
// ===WCA-CHECKPOINT-END===
/**
 * Navigation table of the screens zone. A page that is not in this table does
 * not exist (iwca_theory.md §9, step 2). Every entry matches a row of the
 * page table of .design/ui_decomposition.md §5.
 *
 * Navigation lives in state (app_root), never in the URL: the desktop Main
 * serves files only, with no single-page-app fallback. No routing library
 * (CLAUDE.md §5).
 */
import type { ComponentType } from 'react'
import { ClientDetail } from './pages/client_detail/ClientDetail'
import { ClientForm } from './pages/client_form/ClientForm'
import { ClientList } from './pages/client_list/ClientList'

// Layouts of .design/ui_decomposition.md §5 that pages live in. The startup
// error screen is not a navigation target: Main renders it before any page.
export type LayoutKey = 'main_layout'

// The parameters each page opens with, typed per page
// (ui_decomposition.md §5, "Điều hướng giữa các trang khách hàng").
export type PageParams = {
  client_list: null
  client_detail: { client_id: string }
  client_form: { mode: 'create' } | { mode: 'edit'; client_id: string }
}

// Keys of the pages (ui_decomposition.md §5), one per page that is built.
export type PageKey = keyof PageParams

// Where to go: a page with ITS parameters. A page given the parameters of
// another page, or none, is a compile error.
export type Route = { [K in PageKey]: { page: K; params: PageParams[K] } }[PageKey]

// How a page moves to another one. notice: a short message shown once on the
// destination page (e.g. "Đã thêm khách hàng."), or null.
export type Navigate = (to: Route, notice: string | null) => void

// What every page receives from app_root.
export type PageProps<K extends PageKey> = {
  params: PageParams[K]
  navigate: Navigate
  notice: string | null
}

export type NavigationEntry<K extends PageKey> = {
  layout: LayoutKey
  component: ComponentType<PageProps<K>>
  // The top-level item of the navigation region this page belongs to
  // (marked as current while the page is shown).
  section: PageKey
  // A top-level item of the navigation region opens this page, with this
  // label and route; null for pages reached from another page only.
  menu: { label: string; route: Route } | null
}

// The page shown when the app opens.
export const START_PAGE = 'client_list' satisfies PageKey
export const START_ROUTE: Route = { page: START_PAGE, params: null }

// One entry per page. The type ties each page to the component that takes
// exactly its parameters.
export const NAVIGATION: { readonly [K in PageKey]: NavigationEntry<K> } = {
  client_list: {
    layout: 'main_layout',
    component: ClientList,
    section: 'client_list',
    menu: { label: 'Khách hàng', route: { page: 'client_list', params: null } },
  },
  client_detail: { layout: 'main_layout', component: ClientDetail, section: 'client_list', menu: null },
  client_form: { layout: 'main_layout', component: ClientForm, section: 'client_list', menu: null },
}
