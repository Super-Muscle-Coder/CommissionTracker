// ===WCA-CHECKPOINT-START===
// workflow: screens
// clause: external
// component: screens
// last_updated_by: coding-agent@2026-10-07#3
// last_updated_at: 2026-10-07T20:44:38.4471702+07:00
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
//       của bảng; từ phiên 19: "Khách hàng" mở client_list, rồi "Đơn hàng" mở
//       commission_list); mục đang mở là section của trang hiện tại (client_detail
//       và client_form thuộc client_list; commission_detail, commission_form thuộc
//       commission_list)
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
//   - id: screens-EXP-013
//     content: >
//       Chặng D2 (phiên 19): ba trang của manage_commission, mỗi trang một hook chỉ
//       gọi, giữ, chuyển, cùng mẫu D1 (ref running, mounted; cờ tải khởi tạo true:
//       use_commission_list.loading, use_commission_detail.loading,
//       use_commission_form.opening — UI-4). PageParams thêm commission_list: null;
//       commission_detail: { commission_id }; commission_form: { mode: 'create' } |
//       { mode: 'edit'; commission_id } (ba dòng expect-error mới trong
//       app_root.test.tsx). NAVIGATION thêm ba mục SAU các mục D1; mục menu "Đơn
//       hàng" đứng sau "Khách hàng", section commission_list cho cả ba trang. Lối
//       sang D1 duy nhất: commission_form (create, không có khách đang hoạt động) →
//       "Thêm khách hàng" → client_form(create). D1 không đổi hành vi: chỉ
//       ClientList.tsx thêm detail: null cho ItemList (kiểu mới của kit), kiểm thử
//       D1 giữ nguyên số ca (11, 19, 27) và đều đạt.
//   - id: screens-EXP-014
//     content: >
//       commission_list: hàng nút "Thêm đơn hàng" (primary), "Tải lại" dưới tiêu đề
//       "Đơn hàng"; mỗi đơn là một mục ItemList bấm được, dòng chính là tiêu đề, dòng
//       phụ là detailText của Services (trang không ghép chữ); rỗng → EmptyState
//       "Chưa có đơn hàng nào." có nút "Thêm đơn hàng". commission_detail: tiêu đề
//       trang "Chi tiết đơn hàng", tiêu đề nhóm là tiêu đề đơn, hàng nút "Sửa"
//       (primary), "Quay lại danh sách" ngay dưới (như client_detail); DescriptionList
//       "Thông tin đơn hàng" theo thứ tự đặc tả, mục Loại tranh, Mô tả, Liên kết tham
//       khảo chỉ có khi có dữ liệu; liên kết là dd chữ thường (pre-wrap, cắt dòng
//       bất kỳ), KHÔNG có phần tử a, chọn và sao chép được; không có tiến độ (D3) hay
//       thanh toán (D4). commission_form: hàng "Lưu" (primary), "Hủy" dưới tiêu đề;
//       SaveResult, rồi ClientsReloadResult, rồi các ô theo thứ tự đặc tả: Khách hàng
//       (SelectField, lựa chọn đầu "Chọn khách hàng"), Tiêu đề, Loại tranh (gợi ý),
//       hàng [Giá thỏa thuận, Đơn vị tiền] (SelectField; chế độ sửa: vô hiệu, chỉ đơn
//       vị cũ — "không chọn được", vẫn hiện dạng chữ cạnh ô số tiền), Hạn giao
//       (DateField, nút "Xóa hạn giao"), Mô tả, "Liên kết tham khảo (mỗi dòng một
//       liên kết)". FIELD_ORDER dùng tên trường của hợp đồng; ô lỗi đầu tiên nhận
//       focusRequest = saveCount. noActiveClient → thay form bằng EmptyState có nút
//       "Thêm khách hàng", hàng nút chỉ còn "Hủy".
//   - id: screens-EXP-015
//     content: >
//       Hook commission_form giữ: bản nháp thô (CommissionFormDraft, một setField
//       chung), danh sách khách đang hiện (từ lúc mở, rồi từ lần tải lại gần nhất),
//       keptClientId (khách của đơn, chế độ sửa), kết quả mở, lưu, tải lại khách.
//       KHI NÀO tải lại khách: sau một lần lưu mà phía sau từ chối (switch trên kind,
//       nhánh rejected, origin === 'system' — so origin, không phải kind, R13 không
//       áp). Khách nào còn chọn được là của Services; hook chỉ gán
//       draft.clientId = view.clientId (giữ). Lần lưu mới xóa kết quả tải lại cũ.
//       Tải lại hỏng → khung riêng "Không tải lại được danh sách khách hàng", bản
//       nháp giữ nguyên, "Lưu" vẫn bấm được.
//   - id: screens-EXP-016
//     content: >
//       Kịch bản bấm thử D2 và spec e2e: tests/e2e/commission_{list,detail,form}_walkthrough.spec.ts
//       dùng walkthrough_harness.ts (thêm goToCommissions, reloadCommissions,
//       openCommission, commissionRows, commissionEntries; detailEntries nhận nhãn).
//       Dữ liệu mẫu RIÊNG của D2 (seedCommissionSample ở
//       tests/tools/walkthrough_lib.mjs): khách Mai Anh, Quốc Bảo, Lan Chi (lưu trữ
//       sau khi tạo đơn); ba đơn tạo cách nhau 1,1 giây vì backend ghi updated_at tới
//       giây, để thứ tự "mới nhất trước" cố định. Chạy tay: npm run walkthrough:app
//       -- --commissions (hoặc -- --empty cho commission_list S1). Tín hiệu đã tải
//       luôn là NỘI DUNG (mục đầu của danh sách, trạng thái rỗng, tiêu đề nhóm của
//       chi tiết), không phải trạng thái nút (UI-4); mọi phép so "không đổi" khẳng
//       định giá trị trước khác rỗng (commission_form S2: 4 đơn, đơn đầu là đơn vừa
//       tạo; commission_list S3). Luật phủ D2: rejected_input ở cả hai chế độ
//       (commission_form S2 tạo: tiêu đề ba dấu cách và "1,5" VND; S4 sửa: "hai
//       triệu"); ok cho mọi thao tác, gồm USD có phần lẻ và đơn đủ mọi ô tùy chọn
//       (commission_form S1: 45,5 USD, loại tranh, hạn giao, mô tả, hai liên kết);
//       unreachable mỗi trang (commission_list S3, commission_detail S4,
//       commission_form S6); không đòi rejected_system. Thêm: commission_form S5
//       (sửa đơn của khách đã lưu trữ, giữ khách) và S7 (không có khách đang hoạt
//       động). reloadClientChoices không gây ra được bằng thao tác bình thường, chỉ
//       có ở kiểm thử dựng trang.
//   - id: screens-EXP-017
//     content: >
//       Đối chiếu bảy nguyên tắc §7.2 cho D2 (I6 góc người dùng). (1) Một hành động
//       chính mỗi trang, màu nhấn: "Thêm đơn hàng", "Sửa", "Lưu" ("Thêm khách hàng"
//       của EmptyState khi không có khách). Đạt. (2) Không dày: danh sách chỉ tiêu
//       đề và một dòng phụ ba phần; chi tiết tối đa tám mục, mục trống không hiện.
//       Đạt. (3) Nhãn tiếng Việt theo lời họa sĩ ("Giá thỏa thuận", "Hạn giao", "Loại
//       tranh", "Liên kết tham khảo"). Đạt. (4) Sau mỗi lần ghi: "Đã thêm đơn hàng.",
//       "Đã lưu thay đổi."; lỗi nhập ngay dưới ô, con trỏ tới ô lỗi đầu tiên theo thứ
//       tự trên màn hình (e2e S2: Tiêu đề; S4: Giá thỏa thuận). Đạt. (5) D2 không có
//       thao tác khó quay lại (không xóa). Đạt. (6) Trạng thái rỗng chỉ việc tiếp
//       theo: "Chưa có đơn hàng nào." + "Thêm đơn hàng"; "Chưa có khách hàng đang
//       hoạt động…" + "Thêm khách hàng". Đạt. (7) Vùng điều hướng cố định, "Khách
//       hàng" không đổi chỗ, "Đơn hàng" sau nó; hàng nút ngay dưới tiêu đề, hành động
//       chính đầu (đo bằng vị trí thật: commission_form S1, S3). Đạt. Ghi nhận ngoài
//       §7.2: ô ngày hiện tháng/ngày/năm theo ngôn ngữ Electron (NOTE ở kit).
//   - id: screens-EXP-018
//     content: >
//       Tự kiểm I6, ba trang D2, năm góc. HỢP ĐỒNG: Data Schema 8.0.1 và API Contract
//       4.0.0 approved, manage_commission đã_hoàn_thiện; Configs trỏ data 8.0.1, api
//       4.0.0; bảng nhãn bảy lời gọi khớp từng dòng (có kiểm thử so nguyên bảng);
//       commission_input gửi đúng bảy khóa; mọi mã có câu (duyệt từ Configs). Tìm
//       trong src và tests: không có /watermark-profiles, /watermark-strengths,
//       /artworks, /verifications, /reminders/checks, /payments, /progress,
//       /commissions/{…}/stage ngoài chú thích; lời gọi mới chỉ tới /commissions,
//       /commissions/{commission_id}, /currencies, /clients, /clients/{client_id}.
//       RANH GIỚI: npm run check đạt (R1–R14); Services chỉ quyết định trình bày
//       (manage_commission-EXP-005); Routers chỉ kiểm điều type ghi (not blank,
//       1..200, số nguyên >= 0 trong ±(2^53−1), date) cộng các luật [UI-ONLY] của đặc
//       tả; ba hook viết lại được bằng gọi, giữ, chuyển (so origin để biết KHI NÀO tải
//       lại là thời điểm, không phải nội dung); SelectField, DateField không mang khái
//       niệm nghiệp vụ. NGƯỜI DÙNG: ba kịch bản chạy trên hệ thống thật (EVIDENCE),
//       §7.2 ở screens-EXP-017. CHECKPOINT: manage_commission (mới), kit, screens,
//       main. BẰNG CHỨNG: đủ ba loại (dưới đây, ở manage_commission, kit, main).
//   - id: screens-EXP-019
//     content: >
//       UI-9 (phiên 20). Nguyên nhân: backend ghi updated_at, changed_at tới GIÂY;
//       hai lần ghi trong cùng giây có thứ tự theo hai UUID ngẫu nhiên. Sửa nguồn:
//       mọi hàm nạp mẫu có ghi đơn hoặc giai đoạn (seedCommissionSample,
//       seedProgressSample ở tests/tools/walkthrough_lib.mjs) chờ AFTER_LAST_WRITE_MS
//       = 1100 ms SAU lần ghi cuối, nên mọi lần ghi của kịch bản chắc chắn mới hơn
//       mẫu; các lần ghi của mẫu mà thứ tự có ý nghĩa cũng cách nhau 1100 ms (ba đơn
//       D2; hai lần đổi giai đoạn của "Chân dung bán thân"). Rà khẳng định vị trí
//       trong mọi spec: commission_form S2 before[0][0] → tìm theo tên (bước này
//       không kiểm thứ tự); commission_list S2 D2_EXPECTED_LIST CỐ Ý kiểm thứ tự, có
//       chú thích; progress_board S2 thứ tự trong nhóm theo HẠN GIAO, không theo thời
//       điểm ghi; stage_change và commission_detail S5 không khẳng định thứ tự lịch sử
//       khi hai lần đổi có thể trùng giây (chỉ số dòng, mẫu của dòng); so danh sách
//       trước–sau trên cùng dữ liệu (commission_form S2, commission_list S3,
//       progress_board S4) giữ nguyên vì thứ tự ổn định; danh sách khách sắp theo tên
//       và thứ tự mục của trang chi tiết không phụ thuộc thời gian.
//   - id: screens-EXP-020
//     content: >
//       Chặng D3 (phiên 20). PageParams thêm progress_board: null; stage_change: {
//       commission_id; title } (title do commission_detail trao, trang không gọi lại
//       get_commission); hai dòng expect-error mới. NAVIGATION thêm progress_board
//       (menu "Tiến độ" SAU "Đơn hàng", section progress_board) và stage_change
//       (section commission_list: là một bước của chi tiết đơn). LogicRouters thêm
//       updateProgress. progress_board: hàng nút chỉ "Tải lại" (secondary; đặc tả:
//       không có hành động chính riêng), mỗi nhóm là Section group (h3 = "<tên>
//       (<số>)") chứa ItemList cùng nhãn; rỗng → EmptyState "Chưa có đơn hàng nào." +
//       "Thêm đơn hàng"; không có nút đổi giai đoạn trên bảng. stage_change: Section
//       page "Đổi giai đoạn" > Section group <tiêu đề đơn> > hàng "Lưu" (primary),
//       "Hủy"; kết quả lưu; DescriptionList "Tiến độ hiện tại"; SelectField "Giai đoạn
//       mới" (lựa chọn đầu "Chọn giai đoạn"); TextArea "Ghi chú". Lỗi to_stage → focus
//       tới "Giai đoạn mới" (focusRequest = saveCount). Đã khép lại → không form: hàng
//       "Quay lại" + EmptyState câu khép lại. 404/500 khi mở → "Không mở được đơn
//       hàng" + "Quay lại"; unreachable → "Thử lại" + "Hủy". Mọi nút quay lại đi về
//       commission_detail(commission_id).
//   - id: screens-EXP-021
//     content: >
//       Khung xác nhận (stage_change): hook KHÔNG quyết định có hỏi hay không. "Lưu" gọi
//       saveStageChange(target, draft, false); Services trả ok needs_confirmation với
//       giai đoạn khép lại; trang thấy nhánh đó (switch trên outcome) và dựng
//       ConfirmPanel của kit với câu của Services. "Xác nhận" gọi lại với confirmed =
//       true; "Quay lại" là dismiss() của hook (giữ: quên kết quả, giữ bản nháp).
//       Trong lúc khung chờ trả lời: ô chọn, ghi chú, "Lưu" bị khóa (câu hỏi nói về
//       đúng bản nháp đó); trong lúc gửi: "Xác nhận" và "Quay lại" vô hiệu, không gửi
//       hai lần (ref saveRunning). Kết quả changed → hook trao (onChanged) → trang điều
//       hướng tới commission_detail kèm "Đã đổi giai đoạn sang <tên>.".
//   - id: screens-EXP-022
//     content: >
//       commission_detail có HAI hook (plan phiên 20 việc 5; i5 viết một trang một
//       hook, plan quyết định khác, đã báo đầu phiên): use_commission_detail
//       (manage_commission) và use_commission_progress (update_progress), mỗi hook
//       tải riêng, lỗi riêng, cờ tải khởi tạo true (UI-4). Trang chỉ ĐẶT CẠNH NHAU,
//       không ghép dữ liệu: phần "Tiến độ" (Section group, DescriptionList "Tiến độ
//       đơn hàng": "Giai đoạn hiện tại" [tên, cập nhật lúc], "Lịch sử" [dòng…]) nằm
//       dưới "Thông tin đơn hàng", chỉ khi phần đơn ok. Lỗi của phần (404, 500,
//       unreachable, contract_violation) hiện trong phần, kèm "Thử lại" riêng (chỉ tải
//       lại phần). "Đổi giai đoạn" (secondary, sau "Sửa") chỉ khi phần đã tải xong, ok
//       và không khép lại (stageCanChange, switch trên kind); nút trao title của phần
//       đơn làm tham số điều hướng. Hệ quả nhìn thấy (commission_detail S4): khi
//       backend tắt lúc mở trang, "Thử lại" của phần đơn chỉ tải lại phần đơn; phần
//       Tiến độ vẫn báo lỗi của nó tới khi bấm "Thử lại" của nó — đúng đặc tả (tải
//       riêng), ghi ở kịch bản.
//   - id: screens-EXP-023
//     content: >
//       Kịch bản và e2e D3: progress_board S1..S4, stage_change S1..S5, commission_detail
//       thêm S5 và bổ sung S1, S4. Mẫu D3 seedProgressSample (D2 + "Phác thảo nhân vật";
//       stage qua PUT /commissions/{id}/stage); chạy tay npm run walkthrough:app --
//       --progress. Helper mới ở walkthrough_harness.ts: goToBoard, reloadBoard,
//       boardGroups, progressEntries, expectProgressLoaded, openStageChange; tín hiệu đã
//       tải luôn là nội dung (danh sách đầu tiên, trạng thái rỗng, DescriptionList của
//       phần Tiến độ, ô "Giai đoạn mới"), không phải trạng thái nút (UI-4). Luật phủ D3:
//       ok mọi thao tác, gồm giai đoạn thường không hỏi (stage_change S2), "Đã giao" qua
//       khung rồi mất nút "Đổi giai đoạn" (S5), "Quay lại" không gửi gì (S3);
//       rejected_input khi chưa chọn (S1); unreachable mỗi trang: progress_board S4,
//       stage_change S4, phần Tiến độ commission_detail S4; không đòi rejected_system.
//       Vùng điều hướng: commission_list S1 nay có ba mục.
//   - id: screens-EXP-024
//     content: >
//       Tự kiểm I6 phiên 20, năm trang D2 và D3, năm góc. HỢP ĐỒNG: Data Schema 8.0.1,
//       API Contract 4.0.0 approved, update_progress và manage_commission
//       đã_hoàn_thiện; Configs của hai workflow trỏ data 8.0.1, api 4.0.0; bảng nhãn
//       13 lời gọi khớp từng dòng (hai kiểm thử so nguyên bảng); stage_change gửi đúng
//       hai khóa. Tìm trong src và tests: không lời gọi tới /watermark-profiles,
//       /watermark-strengths, /artworks, /verifications, /reminders, /payments,
//       /reports, /backups; đường dẫn trong Configs chỉ /clients…, /commissions…,
//       /commissions/{commission_id}/stage(/history), /currencies, /progress/board,
//       /progress/stages; không có confirm(, alert(, prompt( trong src. RANH GIỚI:
//       npm run check đạt (R1–R14); Services chỉ quyết định trình bày
//       (update_progress-EXP-003); Routers chỉ kiểm to_stage có mặt (type) cộng ghi
//       chú [UI-ONLY]; bốn hook mới (use_progress_board, use_stage_change,
//       use_commission_progress; use_commission_detail không đổi) viết lại được bằng
//       gọi, giữ, chuyển — switch trên outcome để trao kết quả changed là "chuyển";
//       stageCanChange và savedState là trình bày của trang (đọc nhánh của ViewResult).
//       ConfirmPanel không mang khái niệm nghiệp vụ. NGƯỜI DÙNG: tám kịch bản chạy trên
//       hệ thống thật (EVIDENCE); §7.2 ở screens-EXP-025. CHECKPOINT: update_progress
//       (mới), manage_commission (Q19-3), kit (ConfirmPanel), screens, main. BẰNG CHỨNG:
//       đủ ba loại.
//   - id: screens-EXP-025
//     content: >
//       §7.2 cho D3 (và D2 sau D3). (1) Hành động chính: stage_change "Lưu";
//       commission_detail vẫn "Sửa" ("Đổi giai đoạn" là phụ); progress_board theo đặc
//       tả không có hành động chính, hàng nút chỉ "Tải lại". Đạt theo đặc tả. (2) Bảng
//       chỉ tiêu đề và hạn giao; nhóm rỗng không hiện. Đạt. (3) Tên giai đoạn tiếng Việt
//       ("Chờ bắt đầu", "Lên nét", "Đã giao"…), không mã kỹ thuật. Đạt. (4) Sau đổi
//       giai đoạn: "Đã đổi giai đoạn sang <tên>." ở chi tiết; lỗi nhập dưới ô và con trỏ
//       tới "Giai đoạn mới" (e2e stage_change S1, toBeFocused). Đạt. (5) XÁC NHẬN: chuyển
//       sang giai đoạn khép lại hỏi trong trang, nói rõ hậu quả ("…đơn này không đổi
//       giai đoạn được nữa."), focus ở "Xác nhận", "Quay lại" không gửi gì; giai đoạn
//       thường không hỏi (e2e S2, S3, S5). Đạt. (6) Bảng rỗng: "Chưa có đơn hàng nào." +
//       "Thêm đơn hàng". Đạt. (7) "Tiến độ" thêm SAU "Đơn hàng", hai mục cũ không đổi
//       chỗ; mọi trang có hàng nút dưới tiêu đề (stage_change đo bằng vị trí thật, S1).
//       Đạt. Ghi nhận: câu khép lại dùng mẫu khác đặc tả (NOTE ở update_progress).
//   - id: screens-EXP-026
//     content: >
//       UI-10 (phiên 21, chỉ đổi tests/ và scripts/). Nguyên nhân: sau khi lưu đơn,
//       commission_detail có hai vùng role="status" cùng lúc (thông báo chuyển trang và
//       "Đang tải tiến độ…" của phần Tiến độ), nên getByRole('status') không lọc vi phạm
//       strict mode khi phần Tiến độ chưa tải xong. Cách sửa: mọi khẳng định CHỮ trên
//       vùng status chuyển thành getByRole('status').filter({ hasText }) kèm toHaveCount(1)
//       (cách của stage_change), không phụ thuộc phần Tiến độ đã tải hay chưa. Đã rà
//       12 chỗ getByRole('status') không lọc trong tests/e2e (không tính harness): SỬA 11 —
//       client_detail 56, 65, 83; client_form 81, 136, 181; commission_form 109, 175, 211,
//       237, 253 (253 là toContainText trên trang khách hàng, ngoài danh sách plan; sửa
//       cùng nhóm; trang D1 hiện một vùng status nhưng lọc để spec không phụ thuộc số vùng);
//       GIỮ 1 — commission_form 241, toHaveCount(0) ở trang danh sách, ý đúng là "không
//       còn vùng status nào". walkthrough_harness.ts, 10 chỗ toHaveCount(0) (dòng 58, 147,
//       164, 213, 237, 246, 279, 302, 313, 321): GIỮ, ý là chờ mọi chỉ báo tải biến mất;
//       dòng 313 đã giới hạn trong vùng "Tiến độ". Không đổi bước nào của walkthrough.yaml.
//       Phép kiểm tĩnh scripts/check_e2e_status.mjs (AST của TypeScript) nằm trong npm run
//       check qua lint:e2e: báo toHaveText/toContainText có chủ thể trực tiếp là
//       getByRole('status') một đối số; chỗ đã lọc có chủ thể là lời gọi .filter nên không
//       bị báo. Ghi nhận không sửa (ngoài UI-10): page.screenshot hết 30 s ở bước
//       "backend down" (xem EVIDENCE); main_layout.spec.ts không hỏng lần nào.
//   - id: screens-EXP-027
//     content: >
//       Chặng D4 (phiên 22), điều hướng. PageParams thêm payment_list: { commission_id; title }
//       và payment_form: { commission_id; title } (title do commission_detail rồi payment_list
//       trao, trang không gọi lại get_commission); hai dòng expect-error mới trong
//       app_root.test.tsx (thiếu title; commission_id sai tên). NAVIGATION thêm hai trang, section
//       commission_list (là một bước của chi tiết đơn: mục "Đơn hàng" đang mở). LogicRouters thêm
//       recordPayment. Luồng: commission_detail → "Thanh toán" → payment_list → "Ghi khoản thanh
//       toán" → payment_form → "Lưu" → payment_list kèm "Đã ghi khoản thanh toán."; "Hủy" → payment_list
//       không thông báo; "Quay lại đơn hàng" → commission_detail. app_root.test.tsx có ca đi hết
//       luồng đó (thông báo hiện một lần, "Đơn hàng" đang mở suốt).
//   - id: screens-EXP-028
//     content: >
//       payment_list: Section page "Thanh toán" > Section group <tiêu đề đơn> > hàng nút ngay dưới
//       tiêu đề (đặc tả: "Ghi khoản thanh toán" primary, "Quay lại đơn hàng"; "Tải lại" thêm ở
//       cuối vì đặc tả nói "khi bấm Tải lại", giống progress_board) > thông báo chuyển trang >
//       kết quả hủy > khung xác nhận > chỉ báo tải > DescriptionList "Số dư đơn hàng" (ba dòng)
//       > ItemList "Danh sách khoản thanh toán" (rỗng: EmptyState có nút "Ghi khoản thanh
//       toán"). "Ghi khoản thanh toán" của hàng nút chỉ hiện khi danh sách đã tải ok (switch trên
//       kind như stageCanChange); khi lỗi hàng nút chỉ còn "Quay lại đơn hàng", "Tải lại". Nút "Hủy
//       khoản này" là action của ItemList (row.canVoid do Services quyết định; khoản đã hủy không
//       có). Hai quyết định của TRANG (không phải nghiệp vụ): trong lúc khung xác nhận chờ hoặc
//       lúc đang gửi, mọi "Hủy khoản này" bị vô hiệu (câu hỏi nói về đúng một khoản mà khung
//       không nêu tên; đặc tả chỉ đòi vô hiệu lúc gửi, nên đây là phần thêm, ghi ở screens-EXP-048).
//   - id: screens-EXP-029
//     content: >
//       Hook use_payment_list (gọi, giữ, chuyển): giữ list (kết quả tải gần nhất), question
//       ({ paymentId, result } của lần hỏi confirmed = false; trang dựng ConfirmPanel khi
//       result là ok needs_confirmation, nên hook KHÔNG quyết định có hỏi hay không: Services
//       quyết, như D3), voiding, voided (kết quả lần gửi confirmed = true). "Xác nhận" gọi
//       voidPayment(paymentId, true) đúng một lần (cờ voidRunning, nút vô hiệu); "Quay lại" là
//       dismissVoid (quên câu hỏi, không gọi gì). KHI NÀO tải lại sau khi gửi (một quyết định về
//       thời điểm, switch trên kind): ok → load() (tải lại và thay danh sách); rejected → tải lại
//       LẶNG LẼ (refreshQuietly: kết quả ok thì thay danh sách, còn lại thì giữ danh sách cũ);
//       unreachable, contract_violation → không tải lại. Lý do: đặc tả đòi tải lại sau 404 và 409
//       nhưng "danh sách giữ nguyên" sau 500, còn bảng I3.4 gộp mọi lỗi khai báo thành rejected
//       (chỉ có code để phân biệt, mà hook không đọc mã); tải lại lặng lẽ làm cả hai đúng: 404 và
//       409 thì danh sách mới hiện, 500 thì tải lại hỏng theo và danh sách vẫn như cũ. Kiểm thử
//       dựng trang chứng minh cả bốn nhánh (số lần gọi loadPaymentList và hàng hiện ra).
//   - id: screens-EXP-030
//     content: >
//       payment_form: Section page "Ghi khoản thanh toán" > Section group <tiêu đề đơn> > hàng "Lưu"
//       (primary, busy khi gửi), "Hủy" > kết quả lưu > sáu ô theo thứ tự đặc tả: "Loại giao dịch"
//       (SelectField, không có lựa chọn đầu; mặc định của view), "Khoản" (SelectField, lựa chọn
//       đầu "Chọn khoản", hint "Tiền tip không làm giảm số còn phải thu."), hàng ["Số tiền"
//       (TextField), "Đơn vị tiền" (SelectField vô hiệu, đúng một lựa chọn là đơn vị tiền của
//       đơn)], "Phương thức" (TextField có gợi ý), "Ngày giờ nhận tiền" (DateTimeField), "Ghi chú"
//       (TextArea). FIELD_ORDER dùng tên trường của hợp đồng ('direction', 'kind',
//       'amount.amount_minor', 'method', 'paid_at', 'note'); ô lỗi đầu tiên nhận focusRequest =
//       saveCount. Khóa 'kind' chỉ xuất hiện dưới dạng CHUỖI (fail('kind', …), 'kind' trong
//       FIELD_ORDER, error('kind')), không bao giờ là truy cập thuộc tính .kind, nên R13 không
//       bị đụng (payment_record có trường tên kind: Services đọc nó qua switch, xem
//       record_payment-EXP-004). Bản nháp thô (PaymentFormDraft, một setField chung). Đơn vị tiền
//       lạ (view.supported = false): không form, hàng nút chỉ "Quay lại". Mọi nút quay lại và "Hủy"
//       về payment_list, kể cả khi lỗi mở (404 cũng vậy: đơn không còn thì trang thanh toán hiện
//       lỗi của nó).
//   - id: screens-EXP-031
//     content: >
//       commission_detail có BA hook (use_commission_detail, use_commission_progress, và từ D4
//       use_commission_balance của record_payment), mỗi hook tải riêng, lỗi riêng, cờ tải khởi tạo
//       true (UI-4); trang chỉ đặt cạnh nhau, không ghép dữ liệu. Phần "Thanh toán" (Section
//       group, DescriptionList "Số dư đơn hàng", ba dòng do Services viết: "Đã thu đủ", "Đã thu dư …")
//       nằm dưới "Tiến độ", chỉ khi phần đơn ok; lỗi của phần (404, 409, 500, unreachable,
//       contract_violation) hiện trong phần kèm "Thử lại" của riêng nó. Nút "Thanh toán" (secondary)
//       đứng sau "Đổi giai đoạn" và trước "Quay lại danh sách", LUÔN có khi phần đơn ok (kể cả lúc
//       phần Thanh toán đang tải hoặc đã lỗi, vì trang thanh toán tự tải và tự báo lỗi), khác "Đổi
//       giai đoạn" (chỉ khi phần Tiến độ ok và chưa khép lại). Kiểm thử dựng trang (24 → 37 ca) đổi
//       mọi khẳng định hàng nút cũ thêm "Thanh toán" (đó là chính đặc tả D4, không phải nới).
//   - id: screens-EXP-032
//     content: >
//       Kịch bản và e2e D4: payment_list S1..S5, payment_form S1..S6, commission_detail bổ sung S1,
//       S4, S5 và thêm S6; stage_change S5 chỉ sửa danh sách nút (thêm "Thanh toán"). Dữ liệu mẫu
//       riêng của D4 (seedPaymentSample ở tests/tools/walkthrough_lib.mjs; chạy tay npm run
//       walkthrough:app -- --payments): mẫu D2 cộng năm khoản cho "Minh họa bìa sách" (một khoản
//       đã hủy ngay lúc nạp), một khoản 15,00 USD cho "Chibi đôi" (thu dư), "Chân dung bán thân"
//       trống. paid_at của mẫu cách nhau nhiều ngày: danh sách khoản sắp theo paid_at, không theo
//       lúc ghi, nên UI-9 không đụng tới, nhưng hàm nạp vẫn chờ AFTER_LAST_WRITE_MS sau lần ghi
//       cuối. BẪY: hai khoản trong cùng một phút có cùng paid_at thì thứ tự hợp đồng không hứa;
//       payment_form gõ ngày giờ khác nhau cho mỗi bước (10, 11, 12/09/2026) và đặt 01/01/2099
//       cho khoản cuối (ngày tương lai được phép), còn S5 để mặc định là bước duy nhất dùng ngày
//       giờ mặc định và chỉ so với giá trị ô đã hiện lúc mở. Ngày giờ hiển thị của bước so bằng
//       shownAt() (cùng lời gọi Intl với ứng dụng, cùng múi giờ máy). Gõ phương thức (ô có
//       datalist) rồi bấm Escape, theo kit-EXP-008. Tín hiệu đã tải luôn là nội dung (Số dư đơn
//       hàng hiện, không còn status "Đang tải"), mọi khẳng định chữ trên status đều lọc theo chữ
//       (lint:e2e đạt). Luật phủ D4 (ui_decomposition §5): ok cho mọi thao tác (cọc payment_form
//       S2; tip S3; hoàn tiền S4; USD có phần lẻ S5; hủy qua khung payment_list S3; "Quay lại" ở
//       khung không gửi gì payment_list S3; thu dư payment_list S4, commission_detail S6);
//       rejected_input payment_form S1 (chưa chọn khoản, số 0, phương thức chỉ dấu cách, ô ngày
//       giờ trống); unreachable mỗi trang (payment_list S5, payment_form S6, phần Thanh toán của
//       commission_detail S4); không đòi rejected_system.
//   - id: screens-EXP-033
//     content: >
//       §7.2 cho D4. (1) Hành động chính: payment_list "Ghi khoản thanh toán" (đứng đầu hàng nút),
//       payment_form "Lưu"; commission_detail vẫn "Sửa" ("Thanh toán" là phụ). Đạt. (2) Không dày:
//       danh sách khoản chỉ hai dòng (chiều tiền, số tiền, loại; ngày giờ, phương thức, ghi chú);
//       số dư ba dòng; form sáu ô. Đạt. (3) Nhãn tiếng Việt theo lời họa sĩ ("Nhận tiền", "Hoàn tiền
//       cho khách", "Tiền cọc", "Thanh toán theo đợt", "Đã thu đủ", "Đã thu dư …"), không mã kỹ
//       thuật. Đạt. (4) Sau khi ghi: "Đã ghi khoản thanh toán."; sau khi hủy: "Đã hủy khoản thanh
//       toán."; lỗi nhập ngay dưới ô, con trỏ tới ô lỗi đầu tiên theo thứ tự trên màn hình (e2e
//       payment_form S1, toBeFocused ở "Khoản"). Đạt. (5) XÁC NHẬN: hủy khoản hỏi trong trang, nói
//       rõ hậu quả ("Khoản đã hủy không khôi phục được. Số dư sẽ được tính lại không có khoản
//       này."), focus ở "Xác nhận", "Quay lại" không gửi gì (e2e payment_list S3, đo trên ứng
//       dụng thật: sau "Quay lại" danh sách và số dư y như cũ); ghi khoản thì không hỏi (có thể hủy
//       sau). Đạt. (6) Rỗng: "Chưa có khoản thanh toán nào" kèm "Ghi khoản thanh toán". Đạt. (7)
//       Điều hướng ổn định: ba mục vùng điều hướng không đổi chỗ, "Đơn hàng" đang mở ở cả hai trang
//       mới; hàng nút ngay dưới tiêu đề (payment_form đo bằng vị trí thật, S1; payment_list S1).
//       Đạt.
//   - id: screens-EXP-034
//     content: >
//       Tự kiểm I6 phiên 22, ba trang (payment_list, payment_form, commission_detail), năm góc.
//       HỢP ĐỒNG: Data Schema 9.0.0 và API Contract 4.0.0 approved; record_payment ở
//       đang_triển_khai là việc của backend (BE-7), không của giao diện; Configs của record_payment
//       trỏ data 9.0.0, api 4.0.0; bảng nhãn bốn lời gọi khớp từng dòng (kiểm thử so nguyên bảng, hai
//       nhãn 409 phân biệt theo lời gọi); payment_input gửi đúng sáu khóa; luật phương thức
//       not blank là bản sao [CONTRACT] (phiên 22 giao diện chặn trước khi gửi, không dựa vào việc
//       backend từ chối). Tìm trong src và tests: không có lời gọi tới /watermark-profiles,
//       /watermark-strengths, /artworks, /verifications, /reminders, /reports, /backups; đường dẫn
//       mới chỉ /payments, /payments/balance/{commission_id}, /payments/{payment_id}/void; không có
//       confirm(, alert(, prompt( trong src. RANH GIỚI: npm run check đạt (R1–R14); Services chỉ
//       quyết định trình bày (record_payment-EXP-003: tự không cộng trừ số nào, số dư là số của
//       backend); Routers chỉ kiểm điều type ghi (số nguyên > 0 trong ±(2^53−1), not blank,
//       timestamp, liệt kê) cộng luật [UI-ONLY] của đặc tả (trim, ghi chú → null, cách ghép
//       paid_at); ba hook mới (use_payment_list, use_payment_form, use_commission_balance) viết lại
//       được bằng gọi, giữ, chuyển (switch trên kind để chọn KHI NÀO tải lại là thời điểm, không phải
//       nội dung). NGƯỜI DÙNG: ba kịch bản của D4 (payment_list, payment_form, commission_detail)
//       chạy trên hệ thống thật (EVIDENCE); §7.2 ở screens-EXP-033. CHECKPOINT: record_payment (mới), kit, screens, main. BẰNG CHỨNG: đủ ba
//       loại (dưới đây, ở record_payment, kit, main).
//   - id: screens-EXP-035
//     content: >
//       Chặng D5 (phiên 24), điều hướng. PageParams thêm income_report: null (một dòng expect-error
//       mới trong app_root.test.tsx: trang không nhận tham số). NAVIGATION thêm income_report với menu
//       "Thu nhập" SAU "Tiến độ" (bốn mục: Khách hàng, Đơn hàng, Tiến độ, Thu nhập; ba mục cũ không
//       đổi chỗ), section income_report. LogicRouters thêm viewIncomeReport. Không trang nào khác mở
//       nó và nó không mở trang nào. Kiểm thử cũ của app_root.test.tsx phải đổi vì ĐẾM mục (ba → bốn),
//       đó chính là đặc tả D5 chứ không phải nới: bảng có mười một trang, vùng điều hướng bốn mục, các
//       danh sách "mục nào đang mở" thêm dòng ['Thu nhập', null]; thêm một ca riêng: "Thu nhập" mở
//       income_report, được đánh dấu, ba mục kia không, báo cáo tải đúng một lần với khoảng mặc định.
//   - id: screens-EXP-036
//     content: >
//       income_report: Section page "Thu nhập" > hàng nút ngay dưới tiêu đề (CHỈ "Xem báo cáo", primary,
//       busy khi tải; không có "Tải lại") > khung lỗi nhập (nếu có) > hai DateField "Từ ngày", "Đến ngày"
//       (mỗi ô có nút xóa riêng "Xóa ngày bắt đầu", "Xóa ngày kết thúc", vì DateField của kit có nút đó
//       khi ô có giá trị) > chỉ báo tải > vùng kết quả: Caption dòng phụ (khoảng và giờ lập của KẾT QUẢ),
//       rồi mỗi đơn vị tiền một Section group (h3 = mã tiền) gồm DescriptionList "Tổng hợp <mã>" (ba dòng),
//       Caption giải thích cố định, rồi DescriptionList "Thực nhận theo tháng, <mã>" hoặc EmptyState (không
//       nút) với câu "Không có khoản thanh toán nào trong kỳ."; currencies rỗng → EmptyState không nút.
//       Dòng phụ đặt TRONG vùng kết quả (không giữa tiêu đề và hàng nút) để hàng nút không đổi chỗ khi có
//       kết quả (§7.2 nguyên tắc 7); đặc tả nói "dòng phụ dưới tiêu đề", tôi hiểu là dưới tiêu đề của báo
//       cáo. Hai ô ngày không bị vô hiệu lúc tải (đặc tả chỉ nói nút).
//   - id: screens-EXP-037
//     content: >
//       Hook use_income_report (gọi, giữ, chuyển): bản nháp đầu = defaultPeriod() của Routers (lúc vẽ lần đầu),
//       cờ tải khởi tạo true (UI-4), tải lần đầu bằng viewIncomeReport(bản nháp lúc mở) qua ref opening; giữ
//       HAI thứ riêng: report (kết quả gần nhất của một lần TẢI) và rejection (lần bản nháp bị Routers từ chối
//       gần nhất). KHI NÀO thay báo cáo (một quyết định về thời điểm, switch trên kind, nhánh rejected so
//       origin): ok, unreachable, contract_violation và rejected hệ thống thay report (nên lỗi tải BỎ báo cáo
//       cũ, không bao giờ để số cũ cạnh lỗi); rejected input KHÔNG đụng report (báo cáo đang hiện còn nguyên) mà
//       đặt rejection và tăng rejectionCount, là số trang trao cho DateField của ô lỗi đầu tiên (FIELD_ORDER
//       period_from, period_to) làm focusRequest, nên mỗi lần từ chối lại đưa con trỏ về ô. Lần nhận kết quả
//       khác xóa rejection. Phép cắn (b): đổi thành giữ báo cáo cũ khi có lỗi làm hỏng 6 ca.
//   - id: screens-EXP-038
//     content: >
//       Kịch bản và e2e D5: income_report S1..S5 (src/screens/pages/income_report/walkthrough.yaml,
//       tests/e2e/income_report_walkthrough.spec.ts). Dữ liệu mẫu RIÊNG của D5 (seedIncomeSample ở
//       tests/tools/walkthrough_lib.mjs; chạy tay npm run walkthrough:app -- --income) là mẫu D4 giữ nguyên
//       cộng khoản 5,05 USD tháng 8 cho "Chibi đôi" (đơn thu dư, USD lẻ hai tháng) và đơn "Bìa truyện (đã
//       hủy)" 2.000.000 VND có cọc 500.000 VND ngày 20/08 rồi đổi sang cancelled qua change_stage thật; chờ
//       AFTER_LAST_WRITE_MS sau lần ghi cuối (UI-9). Mọi paid_at là ngày cố định. Ba khoảng cố định
//       (D5_PERIODS) và số đúng đã đo bằng backend thật (USD 20,05 / 0,00 / -7,55, VND 5.100.000 / 500.000 /
//       6.000.000 cho 01/08–30/09/2026; hẹp hơn thì số trong kỳ đổi còn "Còn phải thu" không đổi; 2025 không
//       khoản nào). ẢNH chỉ chụp sau khi đã nhập khoảng cố định; báo cáo của khoảng MẶC ĐỊNH (đổi theo ngày
//       chạy) chỉ kiểm cấu trúc ở S1 (hai ô = 1/1 năm nay và hôm nay, dòng phụ khớp hai ô, hai phần USD, VND,
//       "Còn phải thu" cố định) và không chụp. Tín hiệu đã tải là NỘI DUNG: dòng phụ của kết quả mang đúng
//       khoảng vừa nhập (expectIncomeLoaded nhận khoảng), không phải trạng thái nút; mọi khẳng định chữ trên
//       status đều lọc (lint:e2e đạt). Số yêu cầu tới /reports/income đếm bằng page.on('request') để chứng
//       minh lỗi nhập KHÔNG gửi gì. Luật phủ D5: ok (S1 khoảng hai tháng hai đơn vị tiền, S2 thu hẹp và "Còn
//       phải thu" không đổi, S3 khoảng không khoản nào); rejected_input (S4: bắt đầu sau kết thúc, ô trống,
//       cả hai trống); unreachable rồi ok (S5: báo cáo cũ biến mất, bật lại xem được); không rejected_system.
//   - id: screens-EXP-039
//     content: >
//       Tự kiểm I6 phiên 24, trang income_report, năm góc. HỢP ĐỒNG: Data Schema 9.0.1, API Contract 4.0.0
//       approved, view_income_report đã_hoàn_thiện; Configs ghi data 9.0.1, api 4.0.0; bảng nhãn một lời gọi
//       khớp từng dòng (kiểm thử so nguyên bảng); đầu vào gửi đúng hai khóa trên query. Tìm trong src và tests
//       (grep): không có đường dẫn nào ngoài /reports/income cho workflow mới; không /watermark-profiles,
//       /watermark-strengths, /artworks, /verifications, /reminders, /backups; không confirm(, alert(, prompt(.
//       RANH GIỚI: npm run check đạt (R1–R14, không ngoại lệ lint mới); Services chỉ quyết định trình bày
//       (view_income_report-EXP-003, không cộng số, không cộng đơn vị tiền); Routers chỉ kiểm ngày (formats.date
//       và luật thứ tự chép từ hợp đồng, xem NOTE ở view_income_report); hook viết lại được bằng gọi, giữ,
//       chuyển (phép cắn b); Caption không mang khái niệm nghiệp vụ (text: string). NGƯỜI DÙNG: S1..S5 chạy trên
//       hệ thống thật, đạt (EVIDENCE). CHECKPOINT: view_income_report (mới), kit, screens, main. BẰNG CHỨNG: đủ
//       ba loại (check, kịch bản bấm thử, luật cắn của lint không đổi nên còn hiệu lực).
//   - id: screens-EXP-040
//     content: >
//       §7.2 cho D5. (1) Hành động chính: "Xem báo cáo" (primary, duy nhất ở hàng nút). Đạt. (2) Không dày: ba
//       con số mỗi đơn vị tiền, một dòng giải thích, danh sách tháng chỉ tháng có khoản, không bảng, không biểu
//       đồ, không tổng các đơn vị tiền. Đạt. (3) Nhãn rõ nghĩa: "Còn phải thu (mọi đơn chưa hủy, tính tới lúc
//       lập)" nói ngay trong nhãn rằng số này không theo khoảng thời gian, và dòng giải thích nhắc lại; "Thực nhận
//       trong kỳ" nói là đã trừ hoàn tiền. Ghi nhận (không chặn): danh sách tháng không có tiêu đề nhìn thấy, chỉ có
//       aria-label "Thực nhận theo tháng, <mã>"; người đọc hiểu qua câu giải thích ngay trên nó và dòng "Tháng …"; nếu
//       Orchestrator muốn một tiêu đề thì cần chốt chữ ở D5. (4) Lỗi nhập ngay dưới ô, con trỏ tới ô lỗi đầu tiên
//       (e2e S4, toBeFocused: "Đến ngày"; "Từ ngày" khi trống), báo cáo đang hiện không mất; báo cáo hỏng thì nói rõ
//       và bỏ số cũ (S5). Đạt. (5) Không có thao tác khó quay lại (chỉ đọc). Đạt. (6) Rỗng: câu "Không có khoản thanh
//       toán nào trong kỳ, và không có đơn nào còn phải thu." không nút, đúng đặc tả (trang này không có việc tiếp theo).
//       Đạt. (7) Điều hướng ổn định: "Thu nhập" thêm SAU "Tiến độ", ba mục cũ không đổi chỗ; hàng nút ngay dưới tiêu đề
//       và nút không đổi chỗ khi báo cáo hiện (e2e S1 đo vị trí: "Xem báo cáo" trên ô "Từ ngày"). Đạt. ĐỀ XUẤT: income_report
//       hoàn_tất, chờ Orchestrator audit và Project Owner tự chạy tay npm run walkthrough:app -- --income.
//   - id: screens-EXP-041
//     content: >
//       UI-12 (phiên 25), nguyên nhân: ca "rejected input (no stage chosen)" của StageChange.test.tsx khẳng định
//       isFocused(select()) NGAY sau findByRole('alert'), và ca "shown for a closing stage" khẳng định
//       isFocused(button('Xác nhận')) ngay sau findByRole('group'). Focus do kit đặt trong useEffect (passive):
//       SelectField.tsx:40 (effect [focusRequest, disabled]) và ConfirmPanel.tsx:32; effect passive chạy SAU lần
//       commit đã đưa alert/panel vào DOM, nên findBy có thể trả về trước khi focus được đặt (phụ thuộc thời điểm
//       lập lịch, hiện ra trên Windows). Không phải lỗi sản phẩm: focus tới nơi ngay sau đó. Sửa ở kiểm thử, không
//       ở mã: hai dòng nay là await vi.waitFor(() => expect(isFocused(...)).toBe(true)). Các tệp cùng luật
//       (ClientForm, CommissionForm, PaymentForm, IncomeReport, PaymentList) đã chờ focus bằng waitFor từ trước, nên
//       không sửa. Mã kit và trang không đổi, hành vi không đổi.
//   - id: screens-EXP-042
//     content: >
//       Phiên 27 (D6): hai trang mới, reminder_list và reminder_settings, mục điều hướng thứ năm "Nhắc việc"
//       (khóa reminder_list, đứng sau "Thu nhập"; thứ tự menu sinh từ thứ tự khóa của bảng NAVIGATION, nên chỉ
//       thêm khóa vào cuối). reminder_settings không có mục menu, section = reminder_list: ở trang cài đặt mục
//       "Nhắc việc" được đánh dấu đang mở (kiểm thử app_root và e2e). Cả hai trang không tham số (PageParams
//       null). Cờ tải khởi tạo true (UI-4); hàng nút ngay dưới tiêu đề, hành động chính đứng đầu; sau đó dòng
//       chữ phụ (Caption). Chỗ đặc tả để mở, agent quyết: dòng chữ phụ cố định "Nhắc việc đến hạn sẽ hiện…"
//       đặt DƯỚI hàng nút, không giữa tiêu đề và hàng nút, để giữ nguyên tắc 7 "hàng nút ngay dưới tiêu đề".
//   - id: screens-EXP-043
//     content: >
//       reminder_list: ItemList sẵn có (onSelect = mở theo mục, action "Đã xem", onAction = acknowledge). Bấm
//       dòng chính: nhắc việc hạn giao mở commission_detail(commission_id), tổng hợp mở commission_list, phân
//       nhánh bằng switch trên view.open.to (Services trao đích, trang chỉ dịch thành điều hướng). "Đã xem":
//       KHÔNG hỏi xác nhận (đặc tả D6; nguyên tắc 5 §7.2 chỉ đòi cho việc khó quay lại và có hậu quả; đánh dấu
//       đã xem không làm mất dữ liệu nào). Hook: một lần gọi (cờ ackRunning), mọi nút "Đã xem" vô hiệu trong
//       lúc gửi (action.disabled = acknowledging). Sau 200: tải lại (load) và thông báo "Đã đánh dấu đã xem.";
//       sau rejected (404 "không còn trong danh sách", cả 500): đọc lại IM LẶNG (refreshQuietly như payment_list),
//       danh sách cũ ở lại nếu lần đọc này cũng hỏng; unreachable và contract_violation: chỉ thông báo, không đọc
//       lại. Trạng thái rỗng: câu + nút "Cài đặt nhắc việc" (nguyên tắc 6). Thông báo chuyển trang từ trang cài
//       đặt hiện một lần. Trang KHÔNG gọi check_due (chỉ reminder_ticker của desktop).
//   - id: screens-EXP-044
//     content: >
//       reminder_settings: hook giữ bản nháp thô (chuỗi) và hai loại thao tác: sửa một ô (setField) và thay đổi
//       kéo theo ô khác (setPeriodicUnit, addLeadTime, removeLeadTime) đi qua Routers (Services quyết thứ
//       mặc định và mốc mặc định). "Vào thứ" hiện khi draft.periodicUnit === view.weekdayUnit (giá trị 'weeks'
//       đi từ Configs qua view, trang không gõ chữ 'weeks'). Mọi ô sửa được khi phần đang tắt. "Thêm mốc nhắc"
//       vô hiệu từ 5 dòng, "Bỏ mốc này" vô hiệu ở 1 dòng (giới hạn đi từ view.leadTimeLimits, [CONTRACT] 1..5);
//       trong lúc lưu mọi ô và nút vô hiệu, "Lưu" bận. Lỗi định dạng hiện cạnh ô, con trỏ tới ô lỗi đầu tiên
//       theo thứ tự trên màn hình (every, unit, at_time, weekday, rồi từng mốc: số, đơn vị, trùng) bằng
//       focusRequest = số lần lưu; lỗi "trùng mốc" (khóa deadline.lead_times.<i>) hiện dưới ô SỐ của mốc đó. Sau
//       200: về reminder_list kèm "Đã lưu cài đặt nhắc việc."; 400, 500, không tới được, vi phạm hợp đồng: thông
//       báo, giữ nguyên bản nháp, "Lưu" gửi lại được. Dòng mốc không có định danh riêng: key = vị trí (ô nhập có
//       điều khiển nên đúng giá trị khi xóa giữa danh sách; kiểm thử "Bỏ mốc này … giữ nguyên chữ đã gõ").
//   - id: screens-EXP-045
//     content: >
//       Kiểm thử dựng trang: fake_logic thêm fakeSendReminder (ba thao tác chỉ định hình bản nháp là hàm đồng bộ
//       có hành vi như Services, như defaultPeriod của income_report; không tính vào "routersCalled" ở khung
//       hình đầu). renderWithLogic, renderFirstCommit, logicOf nhận thêm tham số thứ bảy sendReminder.
//       app_root.test: năm mục điều hướng đúng thứ tự, bảng có 13 trang, hai lệnh sai-kiểu @ts-expect-error mới,
//       ca D6 đi vòng "Nhắc việc" → cài đặt → Hủy → cài đặt → Lưu. e2e: commission_list và progress_board đếm bốn
//       mục điều hướng nên thêm đúng ['Nhắc việc', null] (hai chỗ ở progress_board; lần chạy đầu của phiên quên
//       progress_board và hỏng S1 của nó, đã sửa).
//   - id: screens-EXP-046
//     content: >
//       Tự kiểm I6 cho reminder_list và reminder_settings (năm góc). (1) Hợp đồng: bảng nhãn của bốn lời gọi
//       khớp api_contract.yaml 4.0.0 từng dòng (kiểm thử so nguyên bảng), Configs ghi 9.0.2 và 4.0.0, 6 cặp
//       (lời gọi, mã) có câu; mọi lời gọi nằm trong bảng D6; tìm trong UI/src: không có lời gọi tới đường dẫn của
//       check_due, tới /watermark-profiles, /watermark-strengths, không confirm(, alert(, prompt(. (2) Ranh giới:
//       lệnh check đạt (R1–R14); Services chỉ có quyết định trình bày (dòng chữ, mốc, ngày, câu lỗi, mặc định của
//       bản nháp); Routers chỉ kiểm điều reminder_settings_record viết trong type (luật bản sao), ngoài ra là chữ
//       (câu "Nhập thời gian nhắc trước" cho mốc để trống) và cách tách mã lỗi (send_reminder-EXP-004); hook chỉ
//       gọi, giữ, chuyển (hook của reminder_list quyết KHI NÀO đọc lại, như payment_list); kit: CheckboxField và
//       TimeField không prop nào mang khái niệm nghiệp vụ. (3) Người dùng, bảy nguyên tắc §7.2: 1 mỗi trang một nút
//       chính ("Cài đặt nhắc việc", "Lưu"); 2 danh sách chỉ hai dòng mỗi mục; 3 nhãn tiếng Việt theo lời họa sĩ; 4
//       lỗi hiện cạnh ô và con trỏ tới ô lỗi đầu tiên (kiểm thử dựng trang, và e2e S4 toBeFocused ở "Mỗi" rồi ở
//       mốc 2); 5 "Đã xem" không hỏi xác nhận, vì nó không làm mất dữ liệu và không đổi đơn hàng hay cài đặt (đặc tả
//       D6 đã chốt), mỗi mục gửi một lần, mọi nút vô hiệu trong lúc gửi; 6 trạng thái rỗng có nút "Cài đặt nhắc
//       việc"; 7 hàng nút ngay dưới tiêu đề (e2e đo bằng boundingBox ở trang cài đặt, thứ tự nút ở trang danh
//       sách), mục "Nhắc việc" đứng cuối menu và được đánh dấu cả ở trang cài đặt. Kịch bản bấm thử: reminder_list
//       S1–S5 (ok, unreachable), reminder_settings S1–S5 (ok, rejected_input, unreachable); không rejected_system
//       (400 và 404 không gây ra được bằng thao tác bình thường; kiểm thử dựng trang chứng minh chúng hiện đúng
//       câu). (4) Checkpoint: bốn khối (send_reminder, kit, screens, main). (5) Bằng chứng: xem các EVIDENCE.
//       ĐỀ XUẤT: reminder_list và reminder_settings → hoàn_tất, sau audit của Orchestrator và Project Owner chạy
//       tay hai kịch bản.
//   - id: screens-EXP-047
//     content: >
//       UI-13 (phiên 28), phần của phân khu màn hình: use_reminder_settings.ts, khi addLeadTime/removeLeadTime, gọi thêm
//       sendReminder.dropLeadTimeErrors(saved) qua setSaved (hook chỉ gọi, giữ, chuyển; việc chọn lỗi nào bỏ do Services
//       quyết, xem send_reminder-EXP-006). Trang ReminderSettings.tsx không đổi: nó vẫn đọc fieldErrors của kết quả lưu
//       đang giữ, nên lỗi của dòng biến mất khỏi mọi dòng, còn lỗi "Nhắc định kỳ" và câu "Chưa lưu được" (InlineAlert)
//       giữ nguyên. fake_logic.tsx: fakeSendReminder có thêm dropLeadTimeErrors, và hàm này không được tính là lời gọi
//       tải (như ba hàm biến đổi bản nháp) ở renderFirstCommit. Hai kiểm thử dựng trang mới (bỏ dòng 1 của [1 ngày, 24
//       giờ, 5 ngày] sau khi lỗi trùng ở dòng 2; và thêm dòng), hỏng trên mã cũ.
//   - id: screens-EXP-048
//     content: >
//       Phiên 29: dọn bốn NOTE của phiên 21 và 22 (Giao thức 07, UI-17); phần còn giá trị: (1) hai đề xuất trạng thái (I6)
//       đã thực hiện: năm trang D2, D3 hoàn_tất ở phiên 21; payment_list, payment_form, commission_detail hoàn_tất ở
//       phiên 22 (Project Owner chạy tay xong), không còn gì để theo dõi. (2) Các chỗ D4 để Orchestrator quyết, đã
//       thành hành vi: tải lại lặng lẽ sau mọi rejected của void_payment (screens-EXP-029; muốn khác chỉ sửa
//       use_payment_list.ts); các "Hủy khoản này" còn lại bị vô hiệu lúc khung xác nhận chờ (screens-EXP-028); "làm
//       tròn tới phút" của ngày giờ mặc định là cắt giây; số 0 dùng violates_type_constraint, sai cú pháp not_number,
//       quá lớn not_integer (record_payment-EXP-005). (3) Bài học quy trình: một lượt e2e chạy nền có vòng lặp tự thử
//       tiếp thì KHÔNG được chạy thêm e2e khác, hai lượt dùng chung tệp phiên, thư mục kết quả và cổng (đã ở
//       main-EXP-025). (4) Kiểm thử StageChange "focus ở Xác nhận" hỏng không tất định đã vá ở phiên 25 (UI-12;
//       screens-EXP-012: chờ bằng vi.waitFor). (5) Cảnh báo cũ "chụp ảnh hết 30 s ở bước backend down không tất định"
//       đã giải ở UI-11 (cửa sổ bị thu nhỏ; main-EXP-026, main-EXP-027).
//   - id: screens-EXP-049
//     content: >
//       Phiên 34 (chặng E): trang backup (pages/backup/{Backup.tsx, use_backup.ts, walkthrough.yaml, tests/Backup.test.tsx}), khóa 'backup' (params
//       null, section 'backup', menu "Sao lưu" đứng SAU "Nhắc việc"; năm mục cũ giữ vị trí; PageParams thêm backup: null). Trang chỉ có MỘT nút, "Tạo
//       bản sao lưu" (primary) ngay dưới tiêu đề "Sao lưu dữ liệu", rồi dòng Caption cố định, rồi (khi có) LoadingIndicator "Đang tạo bản sao lưu…" và
//       kết quả. Hook use_backup: gọi Routers.createBackup(onCreating) MỘT lần mỗi luồng (ref chặn bấm hai lần trong cùng một nhịp, trước khi nút kịp
//       vẽ vô hiệu), giữ ba thứ: result, running (từ lúc bấm tới hết luồng; nút busy nên vô hiệu và aria-busy), creating (chỉ sau onCreating, tức khi
//       đã có thư mục). Kết quả hủy KHÔNG được giữ (ShownResult là kiểu hẹp không có 'canceled'), nên trang giữ nguyên thông báo và khung cũ; mọi kết
//       quả khác thay result nên khung của lần bấm trước biến mất khi lần này hỏng. Khung kết quả dùng DescriptionList có sẵn (term "Tệp", "Dung
//       lượng", "Tạo lúc"; dd đã có overflow-wrap: anywhere và pre-wrap nên đường dẫn dài xuống dòng, e2e đọc computed style = "anywhere"): KHÔNG
//       thêm hay mở rộng component kit nào, nên khối kit và check_contrast không đổi. Ba tiêu đề của khung lỗi: rejected (400, 500, hộp thoại hỏng)
//       "Chưa tạo được bản sao lưu"; unreachable "Không kết nối được"; contract_violation "Có lỗi không mong đợi". Trang không nhận thông báo chuyển
//       trang (chỉ mở từ mục điều hướng) nên không dùng props. fake_logic.tsx: fakeBackupData và tham số thứ bảy của renderWithLogic,
//       renderFirstCommit (Object.values của backupData tính là "đã gọi Routers"). Kiểm thử dựng trang 17 ca (khung đầu, nút và dòng chữ,
//       không câu hỏi, 201, đường dẫn dài, hủy trên trang trống, hủy sau thành công giữ nguyên, năm lỗi mỗi cái xóa khung cũ, thành công lần hai thay
//       khung, bấm hai lần một luồng, nút chờ khi hộp thoại mở rồi khi tạo, luồng hỏng thả nút, rời trang giữa chừng không ném lỗi); app_root.test.tsx
//       chỉ thêm mục "Sao lưu" (sáu mục đúng thứ tự, mười bốn trang, items[5] không aria-current, ts-expect-error cho params).
//   - id: screens-EXP-050
//     content: >
//       Tự kiểm I6 của trang backup (năm góc; đề xuất trạng thái ở cuối). (1) HỢP ĐỒNG: Configs trỏ Data Schema 9.0.3, API Contract 4.0.0; bảng nhãn
//       create_backup { 201 ok, 400 ERR_VALIDATION, 500 ERR_STORAGE_IO } khớp từng dòng, POST /backups, thân { backup_request: { destination_dir,
//       purpose: 'manual' } } (purpose luôn 'manual'); pick_folder qua ipc 'dialog:pick-folder', đối số {}, trả { status: 200, body: { canceled, path } }
//       kiểm đúng luật canceled/path; mọi mã lỗi có câu (kiểm thử đi từ bảng nhãn). Tìm trong src: không có "watermark-profiles", "watermark-strengths",
//       "restore-preparations" (chỉ trong chú thích và walkthrough.yaml), "dialog:open-file", "dialog:save-file", localStorage, confirm, alert.
//       size_bytes kiểm số nguyên an toàn >= 0. (2) RANH GIỚI: Services chỉ quyết định trình bày (câu cho từng nhãn, dung lượng, giờ, luồng hai
//       bước); phép thử §5: nếu backend đổi luật mà không đổi hợp đồng, không dòng nào thành sai. Routers không kiểm gì vì trang không có ô nhập (thư mục
//       do hệ điều hành trao, backend kiểm file_path). Hook viết lại được bằng "gọi, giữ, chuyển" (ngoại lệ có chủ ý: hai cờ ref và setCreating
//       trong onCreating là thời điểm kỹ thuật, không phải quyết định). Không component kit mới. Chỗ máy không kiểm: ánh xạ Promise bị từ chối của ipc
//       sang rejected/DIALOG_FAILED ở Services (backup_data-EXP-002). (3) NGƯỜI DÙNG: walkthrough.yaml S1..S5 (ok, ok, ok, rejected_system chỉ ở lần
//       chạy tự động, unreachable + ok); không rejected_input vì trang không có ô nhập (ghi trong precondition); chạy tự động trên ứng dụng thật,
//       ảnh trong UI/evidence/walkthroughs/backup/ (backup-S1-open, S1-created, S1, S2, S3, S4, S5-unreachable, S5) và backup-run.json với runner
//       "coding-agent@2026-10-07#3 (Playwright, tests/e2e/backup_walkthrough.spec.ts)"; lần chạy tay với hộp thoại THẬT là việc của Project Owner.
//       Nguyên tắc §7.2: (1) một hành động chính: một nút duy nhất, primary; (4) phản hồi sau thao tác: thông báo "Đã tạo bản sao lưu." kèm khung ba
//       dòng khi thành công, khung báo lỗi bằng lời riêng cho 400, 500, hộp thoại hỏng, không tới được, và hủy thì im lặng đúng đặc tả (người dùng tự
//       đóng hộp thoại, không có gì mới để báo); (5) không hỏi xác nhận, lý do: tạo bản sao lưu không ghi đè gì (backend thêm hậu tố khi trùng tên, e2e S2
//       thấy hai tệp) và không đổi dữ liệu nên không phải thao tác khó quay lại có hậu quả; (7) nút ngay dưới tiêu đề, mục điều hướng mới đứng cuối, năm
//       mục cũ không đổi vị trí; (2) không hiện sha256 hay app_version; (3) nhãn tiếng Việt ("Tạo bản sao lưu", "Tệp", "Dung lượng", "Tạo lúc").
//       (4) CHECKPOINT: bốn khối (backup_data mới, scaffold_ui, main, screens); kit không đổi. (5) BẰNG CHỨNG: xem EVIDENCE của main và của khối này.
//       ĐỀ XUẤT: backup -> hoan_tat sau khi Orchestrator audit và Project Owner chạy tay kịch bản với hộp thoại thật (tiêu đề hộp thoại có đúng "Chọn
//       thư mục" không; mở thư mục thấy tệp .ctbackup). Chặng E xong khi trang đó hoàn tất. Không đảo thứ tự việc nào của plan; việc thêm ngoài plan:
//       hai dòng UI/.gitignore và exact: true cho 11 locator e2e (main-EXP-033).
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Trang backup: kiểm thử dựng trang phủ mọi kết quả; chạy thật trên ứng dụng thật qua Desktop với hộp thoại thay thế; tệp tạo từ giao diện qua được
//       prepare_restore; không có lời gọi prepare_restore trong UI/src.
//     how: >
//       Trong UI/: npm run check (src/screens/pages/backup/tests/Backup.test.tsx, src/screens/tests/app_root.test.tsx); npx playwright test -c
//       tests/e2e/playwright.config.ts backup_walkthrough (10 lần); npm run e2e (5 lượt có CT_WALKTHROUGH_RUNNER=coding-agent@2026-10-07#3, 1 lượt không
//       biến); grep -rn "restore-preparations" src.
//     result: >
//       check "Tests 1679 passed (1679)". Spec riêng 10/10 "5 passed". e2e 5/5 "75 passed" (mốc 70), lượt không biến "75 passed", UI/evidence nguyên vẹn.
//       Bước S1 của e2e: tệp nằm trong thư mục chọn (path.dirname bằng thư mục tạm ct-ui-backup-*), đuôi .ctbackup, công cụ gọi POST
//       /backups/restore-preparations trả is_valid true và is_compatible true; S2: tệp thứ hai tên khác, hai tệp cùng qua prepare_restore; S3: hủy, số tệp
//       không đổi, khung giữ nguyên; S4: thư mục không tồn tại trả 400 và đúng câu "Không dùng được thư mục này. Hãy chọn thư mục khác.", khung cũ biến mất,
//       thư mục không được tạo; S5: backend tắt hiện "Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.", không tệp mới, bật lại thì tạo
//       được. Dung lượng thật trong e2e dạng "3,2 KB".
//     recorded_at: 2026-10-07T20:44:38.4471702+07:00
//   - claim: >
//       UI-12: StageChange.test.tsx hết không tất định.
//     how: >
//       Trong UI/: for i in 1..50: npx vitest run src/screens/pages/stage_change/tests/StageChange.test.tsx, đếm lần
//       exit khác 0; làm trước và sau khi sửa.
//     result: >
//       Trước khi sửa: 3 lần hỏng trong 50. Sau khi sửa: 0 trong 50 (50/50). Chưa chạy lại tệp khác vì không sửa tệp
//       nào khác.
//     recorded_at: 2026-10-01T22:03:00+07:00
//   - claim: >
//       Phiên 24: trang income_report và mục điều hướng "Thu nhập" đạt kiểm thử dựng trang; ma trận phủ I5.4.
//     how: >
//       Trong UI/: npm run check; npx vitest run src/screens/pages/income_report src/screens/tests/app_root.test.tsx.
//     result: >
//       IncomeReport.test.tsx 23 đạt (lần vẽ đầu có chỉ báo tải, "Xem báo cáo" bận, hai ô đã có khoảng mặc định,
//       Routers chưa gọi; tự tải một lần với bản nháp lúc mở; nhãn; hàng nút chỉ "Xem báo cáo"; tải lỗi lần đầu mà
//       hai ô vẫn giữ giá trị; hai đơn vị tiền đúng thứ tự, ba dòng số, giải thích, danh sách tháng; by_month rỗng;
//       currencies rỗng không nút; dòng phụ lấy từ KẾT QUẢ; gửi đúng bản nháp; đang tải thì nút bận, không gửi hai
//       lần, báo cáo cũ còn; lỗi nhập: câu dưới ô, khung lỗi, báo cáo cũ còn, con trỏ tới ô lỗi đầu tiên, lần hai về
//       lại ô, lần chấp nhận sau xóa lỗi; rejected hệ thống 400/409/500 bỏ báo cáo cũ; 400 khác 409; unreachable rồi
//       thử lại với cùng bản nháp; contract_violation không số, không "Lập lúc"; không status, dialog hay xác nhận).
//       app_root.test.tsx 8 đạt (bảng mười một trang; bốn mục; "Thu nhập" được đánh dấu, ba mục kia không; ba danh sách
//       "mục nào đang mở" thêm dòng Thu nhập; một ca riêng cho trang). Toàn layer 1303 (mốc 1100).
//     recorded_at: 2026-10-01T20:22:00+07:00
//   - claim: >
//       Kịch bản bấm thử income_report S1..S5 chạy trên hệ thống thật, đạt, có ảnh, đúng tên người chạy; e2e 5 lần
//       liên tiếp; spec riêng 10 lần liên tiếp; một lần không biến để UI/evidence nguyên vẹn.
//     how: >
//       Desktop đã build. Trong UI/: scratchpad run_loop.sh: spec income_report riêng 10 lần (npx playwright test …
//       income_report, 23:45–23:50); CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-30#3 npm run e2e từng lượt một đến khi
//       đủ 5 lần liên tiếp đạt (19:57–20:10 ngày 2026-10-01); rồi một lần không đặt biến với SHA-256 của mọi tệp dưới
//       UI/evidence trước và sau. Bản ghi UI/evidence/walkthroughs/income_report/income_report-run.json.
//     result: >
//       Spec riêng: 10/10 "5 passed" (21–25 s). e2e: 5/5 "59 passed" (2,9–3,0 phút; mốc 54), lượt 19:57, 20:01, 20:04,
//       20:07, 20:10. Trước đó 8 lượt hỏng/không tính, xem main-EXP-020 (2 spec cũ đếm ba mục điều hướng: sửa và thêm
//       Thu nhập; rồi các lượt máy nghẽn, trace giữ ở UI/test-results/ui11_traces). Lần không biến: "59 passed
//       (2.8m)", "UI/evidence 99 tệp, SHA-256 gộp 40da53cd… trước và sau, không đổi", runner nháp "unknown (Playwright,
//       tests/e2e/income_report_walkthrough.spec.ts)". Bản ghi lần cuối có tên: mọi bước passed true, runner
//       "coding-agent@2026-09-30#3 (Playwright, tests/e2e/income_report_walkthrough.spec.ts)": S1 (ok), S2 (ok), S3 (ok),
//       S4 (rejected_input), S5 (unreachable, ok). Ảnh: income_report-S1..S5, -S3-edited, -S4-from-after-to,
//       -S4-empty-field, -S5-unreachable. Mọi ảnh sau khi nhập khoảng cố định.
//     recorded_at: 2026-10-01T20:22:00+07:00
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
//   - claim: >
//       Phiên 19: kiểm thử dựng trang phủ mọi kind của mọi thao tác của ba trang D2,
//       mọi nhãn ở phần D2 cho từng lời gọi, lần vẽ đầu, và các ca riêng của plan
//       việc 5; ba trang D1 giữ nguyên.
//     how: >
//       Trong UI/: npm run check; npx vitest run --reporter=json (số theo tệp).
//     result: >
//       CommissionList.test.tsx 12 (lần vẽ đầu; hàng nút; dòng chính và dòng phụ;
//       bấm đơn → commission_detail; thêm; rỗng có nút; 500 của list_commissions và
//       của list_clients; unreachable rồi tải lại; contract_violation; nút bận không
//       gọi lần hai; thông báo). CommissionDetail.test.tsx 12 (lần vẽ đầu; đủ tám mục
//       đúng thứ tự; liên kết là dd, không có phần tử a hay role link; thiếu mục tùy
//       chọn; khách không tìm thấy, khách đã lưu trữ; Sửa, Quay lại; 404 và 500 của
//       get_commission, 500 của get_client; unreachable rồi Thử lại; contract_violation;
//       thông báo). CommissionForm.test.tsx 31 (lần vẽ đầu hai chế độ; bảy ô đúng thứ
//       tự; "Chọn khách hàng" đầu; VND chọn sẵn; hàng nút trước ô đầu; gợi ý loại tranh;
//       KHÔNG có khách đang hoạt động → trạng thái rỗng và "Thêm khách hàng" mở
//       client_form create; sửa: điền sẵn, khách "(đã lưu trữ)" chọn sẵn, ĐƠN VỊ TIỀN
//       vô hiệu chỉ một mã; 404, 500 của get_commission, 500 của list_clients, create
//       500; unreachable rồi Thử lại; contract_violation; bản nháp gửi nguyên như gõ; nút
//       "Xóa hạn giao"; Hủy hai chế độ; lưu ok hai chế độ (sửa gửi đúng bản nháp cũ gồm
//       đơn vị tiền cũ); rejected input: lỗi đúng ô, bản nháp giữ, FOCUS tới "Khách
//       hàng" khi nó lỗi, tới "Giá thỏa thuận" khi chỉ số tiền lỗi, tới "Hạn giao";
//       rejected system 400, 404, 409, 500 khi tạo và 404 khi sửa, không ô nào có focus,
//       danh sách khách được tải lại (khách không còn chọn được thì về "Chọn khách
//       hàng"); tải lại hỏng có khung riêng; unreachable rồi lưu lại cùng bản nháp;
//       contract_violation; đang lưu). app_root.test.tsx 5 (sáu trang; "Khách hàng" rồi
//       "Đơn hàng"; "Đơn hàng" mở danh sách và đánh dấu đang mở, cả ở chi tiết; bảy
//       dòng expect-error). D1: ClientList 11, ClientDetail 19, ClientForm 27, không
//       đổi. Toàn layer "Tests 555 passed (555)".
//     recorded_at: 2026-09-29T09:20:00+07:00
//   - claim: >
//       Phiên 19: sáu kịch bản bấm thử (ba D1, ba D2 mới) chạy trên ứng dụng thật với
//       Backend.py thật, mọi bước đạt, có ảnh chụp và đúng tên người chạy, 5 lần liên tiếp.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#1,
//       npm run e2e năm lần liên tiếp (09:13–09:24). Bản ghi
//       UI/evidence/walkthroughs/<trang>/<trang>-run.json và ảnh cạnh nó.
//     result: >
//       Năm lần "32 passed" (2.0m, 2.0m, 2.0m, 2.0m, 1.9m). Bản ghi lần 5: mọi bước
//       passed true, runner "coding-agent@2026-09-29#1 (Playwright, …)":
//       client_list S1..S5, client_detail S1..S6, client_form S1..S5 (D1, ảnh chụp lại),
//       commission_list S1..S4, commission_detail S1..S4, commission_form S1..S7. Ảnh
//       D2: commission_list-S1..S4, -S1-empty, -S3-unreachable; commission_detail-S1..S4,
//       -S4-unreachable; commission_form-S1..S7, -S1-filled (ô chọn và ô ngày nền tối),
//       -S2-errors, -S4-errors, -S6-unreachable, -S6-saved, -S7-empty. Khẳng định trên
//       ứng dụng thật: thứ tự đơn và dòng phụ đúng D2_EXPECTED_LIST; hạn giao
//       "01/01/2026" không lệch ngày; liên kết không là phần tử a và chọn được
//       (getSelection chứa URL); focus ở "Tiêu đề" (S2) và "Giá thỏa thuận" (S4); hàng
//       nút trên ô đầu theo vị trí thật (S1, S3); đơn vị tiền vô hiệu khi sửa; khách đã
//       lưu trữ giữ nguyên khi sửa (S5); color-scheme dark của select và ô ngày.
//     recorded_at: 2026-09-29T09:24:00+07:00
//   - claim: >
//       Phiên 20: kiểm thử dựng trang phủ mọi kind của mọi thao tác của progress_board,
//       stage_change và phần Tiến độ của commission_detail; khung xác nhận; ba trang D1
//       và các ca D2 cũ vẫn đạt.
//     how: >
//       Trong UI/: npm run check; npx vitest run src/screens.
//     result: >
//       ProgressBoard.test.tsx 9 (lần vẽ đầu; hàng nút chỉ "Tải lại"; nhóm và đơn đúng
//       thứ tự đã cho, gồm "Giai đoạn khác"; bấm đơn → commission_detail; rỗng + "Thêm
//       đơn hàng"; 500 của get_board và của list_commissions; unreachable rồi Tải lại;
//       contract_violation; nút bận). StageChange.test.tsx 22 (mở: lần vẽ đầu, ok hai
//       tiêu đề, hàng nút trước ô, lựa chọn; Hủy; đã khép lại → không form, chỉ "Quay
//       lại"; 404, 500; unreachable rồi Thử lại; contract_violation. Lưu: giai đoạn thường
//       gửi ngay confirmed false → commission_detail kèm câu; rejected input lỗi ở "Giai
//       đoạn mới", focus ở đó, ghi chú giữ; 400, 404, 409, 500 giữ bản nháp, không tự tải
//       lại; unreachable rồi lưu lại cùng bản nháp; contract_violation; nút bận. Xác nhận:
//       hiện với giai đoạn khép lại, câu, focus "Xác nhận", ô và "Lưu" khóa; không hiện
//       với giai đoạn thường; "Quay lại" không gửi, giữ bản nháp; "Xác nhận" gửi đúng một
//       lần confirmed true, cả hai nút vô hiệu khi gửi; 409 sau xác nhận).
//       CommissionDetail.test.tsx 24 (12 ca cũ, nay có "Đổi giai đoạn" giữa "Sửa" và
//       "Quay lại danh sách"; 12 ca Tiến độ: lần vẽ đầu của phần, không nút đổi khi đang
//       tải; ok hai mục; chưa đặt; khép lại → không nút, có câu; nút mở stage_change với
//       id và title; 404, 500, unreachable, contract_violation trong phần, phần đơn vẫn
//       hiện, không nút đổi; "Thử lại" của phần chỉ tải lại phần; phần đơn lỗi thì không
//       có phần Tiến độ; thông báo "Đã đổi giai đoạn sang …"). app_root.test.tsx 6 (tám
//       trang; ba mục điều hướng; "Tiến độ" mở bảng và đánh dấu; chín dòng
//       expect-error). D1 và D2 khác không đổi số ca. Toàn layer "Test Files 21 passed
//       (21)", "Tests 780 passed (780)" (mốc 555). Phép thử cắn (bite.py): (f) cho "Đổi
//       giai đoạn" hiện cả khi phần đang tải → "1 failed | 23 passed (24)"; (g) ở kit.
//     recorded_at: 2026-09-29T17:45:30+07:00
//   - claim: >
//       UI-9: spec commission_form tất định; bản sửa có tác dụng.
//     how: >
//       (1) Mốc đầu phiên: npx playwright test -c tests/e2e/playwright.config.ts
//       commission_form mười lần (không biến). (2) Spec tạm ui9_proof.spec.ts (đã xóa):
//       một lần mở, mười vòng: điền đơn mới, ghi lại đơn mẫu cuối qua PUT
//       /commissions/{id} (ép trùng giây), lưu, kiểm khẳng định CŨ "đơn đầu danh sách là
//       đơn vừa lưu"; UI9_MODE=nopause (không chờ) và pause (chờ AFTER_LAST_WRITE_MS sau
//       lần ghi ép). (3) Sau khi sửa: lệnh (1) mười lần.
//     result: >
//       (1) 8/10 đạt; lần 4 và 10 hỏng ở S2 "Expected: Tranh nhóm ba người, Received:
//       Minh họa bìa sách". (2) nopause "0/10 pass" (mọi vòng đơn mẫu đứng đầu: trùng
//       giây thì thứ tự theo UUID); pause "10/10 pass". (3) mười lần "7 passed" liên
//       tiếp (19.5s–26.7s).
//     recorded_at: 2026-09-29T17:44:00+07:00
//   - claim: >
//       Phiên 20: tám kịch bản bấm thử (ba D1, ba D2 — commission_detail bổ sung S5 và
//       phần Tiến độ ở S1, S4 —, hai D3 mới) chạy trên ứng dụng thật với Backend.py thật,
//       mọi bước đạt, có ảnh chụp, đúng tên người chạy, 5 lần liên tiếp.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#2,
//       npm run e2e năm lần liên tiếp (scratchpad e2e_final.sh). Bản ghi
//       UI/evidence/walkthroughs/<trang>/<trang>-run.json và ảnh cạnh nó.
//     result: >
//       Lần 1 "42 passed (2.5m)" (17:46:00–17:48:38), lần 2 "42 passed (2.6m)", lần 3
//       "42 passed (2.6m)", lần 4 "42 passed (2.6m)", lần 5 "42 passed (2.5m)" (kết thúc
//       17:59:31) (mốc 32). Tám bản ghi, mọi bước passed true, runner
//       "coding-agent@2026-09-29#2 (Playwright, …)": client_list 5, client_detail 6,
//       client_form 5, commission_list 4, commission_detail 5, commission_form 7,
//       progress_board 4, stage_change 5 bước. Ảnh mới: progress_board-S1..S4, -S1-empty,
//       -S4-unreachable; stage_change-S1..S5, -S3-confirm, -S4-unreachable;
//       commission_detail-S5, -S4-progress-unreachable. Một lượt năm lần trước đó
//       (17:28–17:43) hỏng ở lần 4, tại main_layout.spec.ts (không đổi trong phiên):
//       "page.screenshot: Timeout 30000ms exceeded", cùng hiện tượng main-EXP-013; không
//       tính, chạy lại cả năm lần.
//     recorded_at: 2026-09-29T17:59:31+07:00
//   - claim: >
//       UI-10 (phiên 21): spec commission_form đạt 30/30 lần riêng; e2e 5/5 lần có tên
//       người chạy; phép kiểm tĩnh cắn được; mốc %APPDATA% không đổi.
//     how: >
//       Node v24.14.1, npm 11.11.1, npm ci. Mốc: npx playwright test -c
//       tests/e2e/playwright.config.ts commission_form 30 lần, không biến. Sau khi sửa:
//       cùng lệnh 30 lần; CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#3 npm run e2e 5
//       lần; npm run e2e không biến (SHA-256 mọi tệp UI/evidence trước và sau). Bằng
//       chứng cắn: tạm đổi client_form_walkthrough.spec.ts dòng 136 về
//       getByRole('status')).toHaveText('Đã lưu thay đổi.'), chạy npm run check, rồi khôi
//       phục và chạy lại. %APPDATA%\CommissionTracker: tên, kích thước, giờ ghi, SHA-256
//       đầu (20:2x) và cuối (21:30) phiên.
//     result: >
//       Mốc: check "Tests 780 passed (780)"; e2e "42 passed (2.6m)"; commission_form 30/30
//       đạt, 0 lần hỏng (máy này không tái hiện được UI-10 trước khi sửa). Sau sửa:
//       commission_form 30/30 đạt (FAILS=0); e2e 5/5 lần "42 passed" (2.6m, 2.5m, 2.5m,
//       2.5m, 2.7m). Bằng chứng cắn: "STATUS tests/e2e/client_form_walkthrough.spec.ts:136:
//       toHaveText on getByRole('status') without a filter; a page may have several status
//       regions. Narrow it: …", chỉ đúng dòng đó, npm run check hỏng; khôi phục thì
//       "check_e2e_status: no unfiltered text assertion on getByRole('status')." và check
//       đạt, 780 kiểm thử (bằng mốc). Không biến: lần đầu "1 failed | 39 passed" (không
//       lưu tên bài), rồi "42 passed (2.5m)" với UI/evidence không đổi (diff SHA-256
//       rỗng); thêm 5 lần không biến có lưu log: lần 1 "1 failed, 2 did not run, 39
//       passed (3.0m)" ở client_detail S4, lần 2 "1 failed, 1 did not run, 40 passed
//       (3.0m)" ở stage_change S4, cả hai "TimeoutError: page.screenshot: Timeout 30000ms
//       exceeded"; lần 3, 4, 5 "42 passed". Tức 3 trong 8 lần không biến hỏng vì chụp ảnh
//       hết giờ ở bước backend down (cùng loại main-EXP-013), trong khi 6 lần có biến
//       (1 mốc và 5 sau sửa) đều đạt; không tìm ra nguyên nhân, không sửa.
//       main_layout.spec.ts: 0 lần hỏng trong 14 lần e2e của phiên. %APPDATA%: data.db
//       114688 byte, data.db.lock 0 byte, cùng giờ ghi 2026-09-28 21:09:42, cùng hash
//       B1996554…F390B đầu và cuối phiên — không đổi.
//     recorded_at: 2026-09-29T21:30:29+07:00
//   - claim: >
//       Phiên 22: kiểm thử dựng trang của payment_list, payment_form và phần Thanh toán của
//       commission_detail phủ mọi nhãn của bảng D4 cho từng lời gọi, lần vẽ đầu, hàng nút, khung xác
//       nhận hủy, và các ca riêng của plan việc 5; các trang cũ giữ nguyên số ca.
//     how: >
//       Trong UI/: npm run check; npx vitest run src/screens --reporter=verbose (đếm theo tệp).
//     result: >
//       PaymentList.test.tsx 22 (lần vẽ đầu; hàng nút; số dư; khoản đã hủy đánh dấu, không nút;
//       rỗng có nút; thông báo; rejected get_balance 404/409 và list 500; unreachable rồi Tải lại;
//       contract_violation; nút bận. Hủy: hỏi trước với confirmed=false, câu hậu quả, focus "Xác nhận",
//       các nút khác chờ; "Quay lại" không gửi (gọi đúng một lần, không bao giờ với true); "Xác nhận" gửi
//       đúng một lần, nút vô hiệu lúc gửi, rồi thông báo và tải lại; 404 và 409 → thông báo và tải lại;
//       500, unreachable, contract_violation → thông báo, danh sách y như cũ, số lần tải lại đúng; hỏi lại
//       xóa kết quả cũ). PaymentForm.test.tsx 28 (lần vẽ đầu; sáu ô đúng thứ tự, nút trước ô; mặc định;
//       hint gắn vào ô; đơn vị tiền vô hiệu; datalist; đơn vị lạ không form; rejected 404/409/500,
//       unreachable rồi Thử lại, contract_violation; Hủy. Lưu: nháp gửi nguyên như gõ, ok → payment_list
//       kèm thông báo; rejected input lỗi đúng ô, nháp giữ, focus ô lỗi đầu tiên (bốn tổ hợp) và lần
//       hai; system 400/404/409/422/500 không ô nào có focus; unreachable rồi lưu lại cùng bản nháp;
//       contract_violation; bận). CommissionDetail.test.tsx 37 (24 cũ với nút "Thanh toán" thêm, cộng 13
//       ca phần Thanh toán: lần vẽ đầu, ba dòng, "Đã thu đủ", "Đã thu dư", mở payment_list, 404/409/500,
//       unreachable, contract_violation, "Thử lại" riêng, độc lập với phần Tiến độ, phần đơn lỗi thì
//       không có phần và không có nút). app_root.test.tsx 7 (mười trang; ca đi hết luồng D4).
//       Toàn layer "Test Files 26 passed (26)", "Tests 1100 passed (1100)" (mốc 780).
//     recorded_at: 2026-09-30T09:15:00+07:00
//   - claim: >
//       Phiên 22: ba kịch bản D4 (payment_list S1..S5, payment_form S1..S6, commission_detail thêm S6 và
//       bổ sung S1, S4, S5) chạy trên ứng dụng thật với Backend.py thật, mọi bước đạt, có ảnh chụp, đúng
//       tên người chạy; e2e 5/5 lần liên tiếp; mỗi spec mới và commission_detail chạy riêng 10/10.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-30#1, npm run e2e năm lần
//       liên tiếp (scratchpad e2e_final.ps1, không chạy gì song song); npm run e2e KHÔNG biến một lần với
//       SHA-256 mọi tệp UI/evidence trước và sau; npx playwright test -c tests/e2e/playwright.config.ts
//       payment_list, payment_form, commission_detail mỗi cái 10 lần liên tiếp (scratchpad e2e_loop.ps1).
//     result: >
//       Mốc: "42 passed (3.1m)". Sau D4: năm lần "54 passed" (2.9m, 3.1m, 3.0m, 3.2m, 2.9m; 08:51–09:07);
//       lần không biến "54 passed (2.9m)", "UI/evidence UNCHANGED (89 files hashed)". payment_list 10/10
//       ("5 passed"), commission_detail 10/10 ("6 passed"), payment_form 10/10 ("6 passed") sau khi thêm
//       một cú bấm vào tiêu đề trước ảnh -S1-errors (xem dưới). Ảnh mới: payment_list-S1..S5,
//       -S3-confirm, -S5-unreachable; payment_form-S1..S6, -S1-errors, -S6-unreachable;
//       commission_detail-S6. Khẳng định trên ứng dụng thật: thứ tự khoản và dòng phụ đúng
//       D4_PAYMENTS (ngày giờ so bằng cùng lời gọi Intl); số dư 4.600.000/4.500.000 VND, sau khi hủy
//       tip 4.500.000/4.500.000; "Đã thu dư 2,50 USD"; "Đã thu đủ"; khung xác nhận có focus ở "Xác
//       nhận", các nút khác vô hiệu, "Quay lại" không đổi gì; focus ở "Khoản" (payment_form S1, hai
//       lần); ô đơn vị tiền vô hiệu; hàng nút trên ô đầu theo vị trí thật. Hai lần hỏng KHÔNG tính (xem
//       screens-EXP-048): lần 5 của lượt đầu (chụp ảnh hết giờ ở payment_form-S1-errors, backend đang bật), và một
//       lượt bị hỏng vì chạy TRÙNG (xem screens-EXP-048).
//     recorded_at: 2026-09-30T09:12:00+07:00
//   - claim: >
//       Phiên 22, UI-11 (thu dữ liệu): thời gian chụp ảnh của harness, tổng hợp từ nhật ký.
//     how: >
//       tests/e2e/walkthrough_harness.ts ghi UI/test-results/screenshot-timing.log; chép ra sau mỗi lần
//       chạy; scratchpad aggregate.ps1 tính max, trung bình, riêng bước backend tắt.
//     result: >
//       Năm lần e2e đầy đủ (FINAL2): 390 lần chụp, lớn nhất 155 ms, trung bình 92 ms; 50 lần ở bước
//       backend tắt: lớn nhất 128 ms, trung bình 87 ms; không lần lỗi. Mốc e2e (62 lần chụp): lớn nhất
//       298 ms (commission_form-S1), trung bình 113 ms; backend tắt (8 lần): lớn nhất 138 ms, trung bình
//       110 ms. Mười lần payment_form (80 lần chụp): lớn nhất 224 ms. MỘT lần hết giờ trong cả phiên: lượt
//       đầu, lần 5, tests/e2e/payment_form_walkthrough.spec.ts, ảnh payment_form-S1-errors, "page.screenshot:
//       Timeout 30000ms exceeded" (30004 ms trong nhật ký), BACKEND ĐANG BẬT (backend=up), lúc 08:39, lúc
//       không có tiến trình e2e nào khác. Trace giữ ở scratchpad traces_FINAL_5/
//       payment_form_walkthrough-w-e9789-…-back-to-the-list.zip (chưa mở xem). Bước ngay trước ảnh là gõ
//       phương thức (ô có datalist) rồi xóa ô ngày giờ: nghi popup gốc còn mở (kit-EXP-008) chứ không phải
//       backend tắt; đã thêm một cú bấm vào tiêu đề trang trước ảnh này và 16 lần chạy sạch sau đó (10 lần
//       payment_form, 5 lần e2e có tên, 1 lần không biến). Không nới thời gian chờ, không retries. KHÔNG kết luận được nguyên nhân của
//       UI-11 (các lần cũ đều ở bước backend tắt, lần này backend bật): để Orchestrator xét.
//     recorded_at: 2026-09-30T09:20:00+07:00
//   - claim: >
//       Phiên 27: kiểm thử dựng trang của hai trang mới và của điều hướng đạt, phủ mọi nhãn của bảng D6 cho từng lời
//       gọi.
//     how: >
//       Trong UI/: npm run check; npx vitest run src/screens/pages/reminder_list src/screens/pages/reminder_settings
//       src/screens/tests.
//     result: >
//       ReminderList.test.tsx 21 ca: khung hình đầu (UI-4: "Đang tải nhắc việc…", chỉ "Cài đặt nhắc việc" bấm được);
//       ok với hai loại nhắc việc và thứ tự nút; dòng chính mở commission_detail hoặc commission_list; trạng thái rỗng
//       có nút; thông báo chuyển trang; "Tải lại"; "Đã xem": một lần gọi đúng id, không hỏi, đọc lại và thông báo, mọi
//       nút vô hiệu trong lúc gửi và lần bấm thứ hai không gửi gì, 404 (câu và đọc lại), 500 (danh sách cũ ở lại),
//       unreachable, contract_violation; rejected 500, unreachable + "Tải lại", contract_violation của lần tải.
//       ReminderSettings.test.tsx 27 ca: khung hình đầu; ok; hai câu của dòng phụ; ô giữ bản nháp; ô giờ và ô đánh dấu
//       là ô gốc; ô sửa được khi phần tắt; "Hủy"; rejected 500, unreachable + "Thử lại", contract_violation khi mở;
//       "Vào thứ" hiện và ẩn theo đơn vị; "Thêm mốc nhắc" vô hiệu ở 5 dòng, "Bỏ mốc này" vô hiệu ở 1; lưu một lần, ok về
//       danh sách kèm thông báo; trong lúc lưu mọi ô vô hiệu; lỗi định dạng cạnh ô, con trỏ tới ô đầu tiên theo thứ tự
//       màn hình, hai lần liên tiếp; 400, 500, unreachable, contract_violation giữ bản nháp. app_root.test.tsx 9 ca
//       (mốc 8; năm mục điều hướng, 13 trang, ca D6). Tổng "Tests 1550 passed (1550)" (mốc 1303).
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Mỗi spec e2e mới chạy riêng đạt 10 lần liên tiếp.
//     how: >
//       Scratchpad loop10.sh: npx playwright test -c tests/e2e/playwright.config.ts reminder_settings, rồi
//       reminder_list, mỗi spec 10 lần, từng lượt một (không đặt runner: bằng chứng nháp vào test-results).
//     result: >
//       reminder_settings 10/10 "5 passed" (khoảng 14 s mỗi lượt), reminder_list 10/10 "5 passed" (khoảng 1,2 phút mỗi
//       lượt, phần lớn là chờ phút của nhắc việc tổng hợp). Không lần nào hết giờ chụp ảnh.
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       npm run e2e đạt 5 lần, từng lượt một, có CT_WALKTHROUGH_RUNNER=coding-agent@2026-10-03#1; lần hỏng duy nhất vì
//       chụp ảnh hết giờ (UI-11) không tính.
//     how: >
//       Scratchpad full5.sh (một tiến trình, dừng khi đủ 5 lượt đạt), sau npm run build trong UI/ và Desktop/.
//     result: >
//       Sáu lượt: 1 "69 passed (4.1m)"; 2 "1 failed, 64 passed" (reminder_list-S1-list hết giờ chụp ảnh 30 s, cửa sổ
//       minimized:true, trace ở UI/test-results/ui11_traces/); 3, 4, 5, 6 mỗi lượt "69 passed" (3.9–4.6 phút). Tức 5
//       lượt đạt, bốn lượt cuối liên tiếp (số e2e 69, mốc 59). Còn hai lượt chạy trước đó bị bỏ, không tính, không dùng:
//       tôi dừng nhầm tập lệnh bằng TaskStop mà vòng lặp bên trong vẫn chạy nên hai lượt Playwright chồng nhau (lỗi cách
//       làm của tôi, không phải của sản phẩm). Lượt đầu của vòng đó cũng làm lộ một chỗ tôi quên: spec progress_board
//       còn đếm bốn mục điều hướng (đã thêm ['Nhắc việc', null], hai chỗ).
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Lần chạy không đặt biến để UI/evidence nguyên vẹn.
//     how: >
//       SHA-256 mọi tệp dưới UI/evidence (120 tệp) trước và sau từng lần npm run e2e không đặt CT_WALKTHROUGH_RUNNER.
//     result: >
//       Ba lần chạy không biến: "63 passed, 2 failed, 4 did not run", "64 passed, 1 failed, 4 did not run", "59 passed,
//       3 failed, 7 did not run"; MỌI lỗi là hết giờ chụp ảnh (page.screenshot 30 s) lúc cửa sổ bị thu nhỏ (xem EVIDENCE
//       của main). Sau từng lần: UI/evidence UNCHANGED (120 tệp, so SHA-256). Chưa có lần không biến nào đạt đủ vì
//       UI-11, nên chưa có "69 passed" không biến; điều kiện "evidence nguyên vẹn" đạt.
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Việc 7: ảnh có ô ngày sau khi DSK-15 đổi ngôn ngữ ứng dụng sang vi.
//     how: >
//       Mở ảnh sinh bởi lượt e2e có runner số 6, và một ảnh chụp riêng của ô ngày giờ (script tạm trong tests/tools,
//       đã xóa; ảnh payment_form_datetime.png ở scratchpad của phiên).
//     result: >
//       commission_form-S1-filled.png, ô "Hạn giao": "30/11/2026" — ngày/tháng/năm. income_report-S3-edited.png, hai ô
//       "Từ ngày" và "Đến ngày": "01/01/2024" và "31/12/2025" — ngày/tháng/năm. payment_form: KHÔNG ảnh nào trong
//       evidence có ô "Ngày giờ nhận tiền" trong khung nhìn (nó nằm dưới mép dưới, ảnh chụp chỉ phần đầu trang); ảnh
//       riêng cho thấy "03/10/2026 10:38 SA" — ngày/tháng/năm, nhưng giờ theo 12 giờ có SA/CH (không phải 24 giờ như
//       HH:mm ở chỗ khác). Không sửa (plan việc 7).
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Mốc %APPDATA% và các điều kiện cuối phiên.
//     how: >
//       Tên, kích thước, giờ ghi của mọi tệp trong %APPDATA%\CommissionTracker lúc đầu và cuối phiên; git status.
//     result: >
//       data.db 114688 byte và data.db.lock 0 byte, giờ ghi 2026-09-28 21:09, không đổi. Không kiểm thử nào đụng
//       %APPDATA%. git status chỉ có tệp trong UI/. Không eslint-disable, không ngoại lệ lint mới, không phụ thuộc mới.
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//
// NOTES: []
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
import { Backup } from './pages/backup/Backup'
import { ClientDetail } from './pages/client_detail/ClientDetail'
import { ClientForm } from './pages/client_form/ClientForm'
import { ClientList } from './pages/client_list/ClientList'
import { CommissionDetail } from './pages/commission_detail/CommissionDetail'
import { CommissionForm } from './pages/commission_form/CommissionForm'
import { CommissionList } from './pages/commission_list/CommissionList'
import { IncomeReport } from './pages/income_report/IncomeReport'
import { PaymentForm } from './pages/payment_form/PaymentForm'
import { PaymentList } from './pages/payment_list/PaymentList'
import { ProgressBoard } from './pages/progress_board/ProgressBoard'
import { ReminderList } from './pages/reminder_list/ReminderList'
import { ReminderSettings } from './pages/reminder_settings/ReminderSettings'
import { StageChange } from './pages/stage_change/StageChange'

// Layouts of .design/ui_decomposition.md §5 that pages live in. The startup
// error screen is not a navigation target: Main renders it before any page.
export type LayoutKey = 'main_layout'

// The parameters each page opens with, typed per page
// (ui_decomposition.md §5, "Điều hướng giữa các trang khách hàng";
// "Chặng D2", "Điều hướng của D2"; "Chặng D3", "Điều hướng của D3";
// "Chặng D4", "Điều hướng của D4"; "Chặng D5", "Điều hướng của D5"; "Chặng D6", "Điều hướng của D6";
// "Chặng E", "Điều hướng của chặng E").
// stage_change receives the commission's title to show, handed by
// commission_detail (it does not call get_commission again); so do
// payment_list and payment_form (D4).
export type PageParams = {
  client_list: null
  client_detail: { client_id: string }
  client_form: { mode: 'create' } | { mode: 'edit'; client_id: string }
  commission_list: null
  commission_detail: { commission_id: string }
  commission_form: { mode: 'create' } | { mode: 'edit'; commission_id: string }
  progress_board: null
  stage_change: { commission_id: string; title: string }
  payment_list: { commission_id: string; title: string }
  payment_form: { commission_id: string; title: string }
  income_report: null
  reminder_list: null
  reminder_settings: null
  backup: null
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
// exactly its parameters. The navigation region lists the entries that have a
// menu, in this order: "Khách hàng", "Đơn hàng", "Tiến độ", "Thu nhập", "Nhắc việc", then "Sao lưu" (§5); a later
// stage adds its entries after these, never moving them. stage_change is a
// step of the commission detail: its item is "Đơn hàng" (D3).
export const NAVIGATION: { readonly [K in PageKey]: NavigationEntry<K> } = {
  client_list: {
    layout: 'main_layout',
    component: ClientList,
    section: 'client_list',
    menu: { label: 'Khách hàng', route: { page: 'client_list', params: null } },
  },
  client_detail: { layout: 'main_layout', component: ClientDetail, section: 'client_list', menu: null },
  client_form: { layout: 'main_layout', component: ClientForm, section: 'client_list', menu: null },
  commission_list: {
    layout: 'main_layout',
    component: CommissionList,
    section: 'commission_list',
    menu: { label: 'Đơn hàng', route: { page: 'commission_list', params: null } },
  },
  commission_detail: { layout: 'main_layout', component: CommissionDetail, section: 'commission_list', menu: null },
  commission_form: { layout: 'main_layout', component: CommissionForm, section: 'commission_list', menu: null },
  progress_board: {
    layout: 'main_layout',
    component: ProgressBoard,
    section: 'progress_board',
    menu: { label: 'Tiến độ', route: { page: 'progress_board', params: null } },
  },
  stage_change: { layout: 'main_layout', component: StageChange, section: 'commission_list', menu: null },
  // Payments are a step of the commission detail (D4): the "Đơn hàng" item is the current one.
  payment_list: { layout: 'main_layout', component: PaymentList, section: 'commission_list', menu: null },
  payment_form: { layout: 'main_layout', component: PaymentForm, section: 'commission_list', menu: null },
  income_report: {
    layout: 'main_layout',
    component: IncomeReport,
    section: 'income_report',
    menu: { label: 'Thu nhập', route: { page: 'income_report', params: null } },
  },
  reminder_list: {
    layout: 'main_layout',
    component: ReminderList,
    section: 'reminder_list',
    menu: { label: 'Nhắc việc', route: { page: 'reminder_list', params: null } },
  },
  // The settings are a step of the reminder list (D6): the "Nhắc việc" item is the current one.
  reminder_settings: { layout: 'main_layout', component: ReminderSettings, section: 'reminder_list', menu: null },
  backup: {
    layout: 'main_layout',
    component: Backup,
    section: 'backup',
    menu: { label: 'Sao lưu', route: { page: 'backup', params: null } },
  },
}
