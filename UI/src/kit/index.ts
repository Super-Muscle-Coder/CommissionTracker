// ===WCA-CHECKPOINT-START===
// workflow: kit
// clause: external
// component: kit
// last_updated_by: coding-agent@2026-10-09#1
// last_updated_at: 2026-10-09T15:02:03.5476248+07:00
//
// EXPERIENCES:
//   - id: kit-EXP-001
//     content: >
//       Token có hai cấp, đặt tên theo i4-kit.md I4.2, tất cả ở tokens/tokens.css.
//       Từ phiên 16 là giao diện TỐI, giao diện duy nhất của V1
//       (ui_decomposition.md §7.1): giữ nguyên tên mọi token vai trò cũ, chỉ đổi
//       giá trị. Token nền: xám trung tính R=G=B (gray-0/100/400/600/700/800/
//       850/900/950; nền trang #1c1c1c, không đen tuyền, không ngả màu), một màu
//       nhấn xanh bão hòa vừa (blue-300/500/600), đỏ và xanh lá vừa phải
//       (red-300/500/900, green-300/500/900), space-1/2/4/6/8, font-size-1..4,
//       font-weight, line-height, radius-2, border-width-1/2, font-family-sans.
//       Token vai trò mới: --color-text-success; ba bậc bề mặt --color-surface
//       (trang), --color-surface-raised (header, điều hướng, danh sách, thẻ),
//       --color-surface-field (ô nhập); --color-surface-hover, -selected,
//       -success; --color-border-success, -selected; --color-action-secondary,
//       -secondary-hover, -secondary-text; --border-width-selected. :root đặt
//       color-scheme: dark để thanh cuộn và điều khiển gốc cũng tối. Không có
//       nhóm token size-* (không có trong bảng nhóm của I4.2 hay CLAUDE.md), nên
//       khung chính dùng lưới auto 1fr thay vì bề rộng cố định.
//   - id: kit-EXP-002
//     content: >
//       Component khung: Stack (gap: Scale, xếp dọc), Inline (gap: Scale, xếp
//       ngang, tự xuống dòng; dùng cho nhóm nút và hàng liên hệ), AppFrame
//       (title, nav, children: header có h1; dưới là cột điều hướng và vùng
//       <main>), FatalMessage (title, detail: màn hình lỗi khởi động). Kiểu prop
//       gap giới hạn đúng tập tên nên giá trị ngoài thang là lỗi biên dịch.
//       Không component nào có chữ cố định: mọi chữ đi vào qua props. JSX của kit
//       không được có prop style (R7_kit); style nằm trong CSS module cạnh
//       component, chỉ dùng token vai trò (stylelint R7).
//   - id: kit-EXP-003
//     content: >
//       Tệp này import tokens.css và styles/global.css, nên Main (và mọi trang)
//       có token và style toàn cục chỉ bằng việc import kit. Mọi thứ phân khu
//       màn hình dùng phải được export ở đây (R9); thứ không export là chi tiết
//       bên trong kit.
//   - id: kit-EXP-004
//     content: >
//       Phông chữ (nhóm font-family do CLAUDE.md mục 5 thêm): --base-font-family-sans
//       = "Segoe UI", system-ui, sans-serif (phông hệ thống của Windows, đủ dấu
//       tiếng Việt, không nhúng tệp phông); --font-family-body trỏ vào nó. Ảnh
//       chụp UI/evidence/walkthroughs/ cho thấy chữ không chân, dấu đủ trên nền tối.
//   - id: kit-EXP-005
//     content: >
//       Component của client_list (phiên 12), mở rộng ở phiên 16 thay vì tạo mới
//       (I4.1): Section (title, level page→h2 | group→h3, gap); Button (label,
//       busyLabel, busy, disabled, variant: 'primary' là màu nhấn cho hành động
//       chính của trang (§7.2 nguyên tắc 1), 'secondary' là nền trung tính; button
//       gốc, không bấm được khi busy hay disabled, aria-busy, focus-visible);
//       ItemList (label, items, emptyText, onSelect: null thì chỉ đọc, có hàm thì
//       mỗi mục là một button gốc trả lại key); EmptyState (text, action:
//       { label, onClick } | null, nút phụ cho việc tiếp theo, §7.2 nguyên tắc
//       6); InlineAlert (title, text; role="alert"); LoadingIndicator (label;
//       role="status").
//   - id: kit-EXP-006
//     content: >
//       Component mới phiên 16, đặt tên theo chức năng chung, câm, không lấy từ
//       nguồn ngoài, không animation hay transition: NavMenu (label, items
//       { key, text, current }, onSelect; nav có tên truy cập, mỗi mục một button,
//       mục hiện tại có aria-current="page" cùng viền trái và nền khác, không chỉ
//       bằng màu); TextField (id, label, value, onChange(value), error: string|null,
//       disabled, suggestions: readonly string[]; label gắn ô; lỗi là chữ ngay dưới
//       ô, gắn bằng aria-describedby, aria-invalid, viền đỏ; suggestions không
//       rỗng thì dùng datalist gốc); TextArea (như TextField, nhiều dòng, không
//       gợi ý); FieldGroup (legend, gap: fieldset và legend gốc); DescriptionList
//       (label, items { key, term, details: string[] }: dl gốc, mỗi dòng giá trị
//       một dd); SuccessNotice (text; role="status", viền và chữ xanh lá, chữ nói
//       rõ việc đã xong nên không chỉ bằng màu). Không prop nào mang khái niệm
//       nghiệp vụ (term, details, items, suggestions; không có client hay contact).
//   - id: kit-EXP-007
//     content: >
//       Phép kiểm độ tương phản bằng máy: scripts/check_contrast.mjs, bước
//       lint:contrast của npm run check (sau stylelint). Nó đọc tokens.css, phân
//       giải token vai trò qua var() tới giá trị #rgb hoặc #rrggbb, tính tỷ lệ
//       WCAG 2.x cho các cặp chữ/nền khai báo trong PAIRS (mỗi cặp ghi component
//       nào dùng), và hỏng khi một cặp dưới 4.5:1, một token không tồn tại, hay
//       một giá trị không phải mã màu. Component nào đặt một màu chữ lên một nền
//       mới thì thêm cặp vào PAIRS. 18 cặp hiện có, thấp nhất 5.60:1 (chữ trắng
//       trên nút chính). Từ phiên 17 có hai nhóm, xem kit-EXP-010.
//   - id: kit-EXP-008
//     content: >
//       Bẫy của datalist (TextField có suggestions) trong kiểm thử e2e: gõ vào ô
//       có danh sách gợi ý mở một popup gốc của Chromium; khi popup còn mở,
//       page.screenshot của Playwright trên Electron treo tới hết thời gian chờ
//       (đo ở phiên 16, client_form S5). Spec e2e bấm Escape sau khi gõ kênh, như
//       người dùng đóng gợi ý. Không phải lỗi của component.
//   - id: kit-EXP-009
//     content: >
//       Viền ô nhập tách khỏi viền trang trí (phiên 17, ui_decomposition §7.1,
//       WCAG 2.1 1.4.11). Token vai trò mới --color-border-field (base mới
//       --base-gray-500 #858585) và --color-border-field-danger (base mới
//       --base-red-400 #cc6b62); TextField và TextArea dùng hai token này cho
//       .input và .inputError. Viền lỗi cũ --color-border-danger (#b8574f) chỉ đạt
//       2.96:1 trên nền ô, nên ô lỗi cũng cần token riêng; --color-border-danger
//       giữ cho InlineAlert (trang trí). --color-border giữ nhạt cho khung, danh
//       sách, DescriptionList, header, điều hướng và viền nút phụ (nút có chữ,
//       WCAG không đòi viền).
//   - id: kit-EXP-010
//     content: >
//       check_contrast.mjs có hai nhóm, in rõ nhóm ở mỗi dòng: [text >= 4.5:1]
//       (18 cặp, TEXT_PAIRS, như cũ) và [non-text >= 3:1] (11 cặp,
//       NON_TEXT_PAIRS): viền ô nhập và viền ô lỗi, mỗi loại trên nền ô (mép
//       trong) và nền trang (mép ngoài); vòng focus trên nền trang (Button,
//       TextField, TextArea: offset >= 0 nên vòng nằm NGOÀI control), trên nền
//       EmptyState (nút của nó), trên nền bề mặt nổi, hover, mục chọn (NavMenu,
//       ItemList: offset âm nên vòng nằm TRONG mục); vạch mục điều hướng đang mở
//       trên nền mục chọn và nền vùng điều hướng. Mỗi cặp phi văn bản kèm các
//       khai báo CSS đặt nó vào đúng chỗ (bảng CSS trong script), và script đọc
//       CSS module để khẳng định giá trị cuối cùng (theo cascade: quy tắc sau
//       cùng của selector) đúng như khai; sai thì hỏng với dòng "place ... the
//       CSS no longer puts it there". Vì Button có outline-offset
//       var(--border-width-focus), vòng focus cách nút một khe nền trang, không
//       bao giờ sát nút chính (#8fb0e8 trên #3a66b5 chỉ 2.55:1), nên không khai
//       cặp đó; đổi offset về 0 là check hỏng (EVIDENCE). Trạng thái vô hiệu được
//       miễn. Component đặt một phần tương tác lên nền mới thì thêm cặp và CSS.
//   - id: kit-EXP-011
//     content: >
//       Yêu cầu focus (phiên 17, ui_decomposition §7.2 nguyên tắc 4): TextField
//       và TextArea có prop bắt buộc focusRequest: number. 0 là không yêu cầu;
//       mỗi số mới khác 0 đưa con trỏ vào ô đó đúng một lần, ngay khi ô không bị
//       vô hiệu (effect theo [focusRequest, disabled], nhớ số đã xử lý trong ref,
//       gọi focus() trên ref của chính phần tử). Kit không biết ô nào là "ô lỗi
//       đầu tiên": bên gọi quyết định. Nhờ vậy phân khu màn hình không đụng
//       document hay window (R11, R12). Prop không mang khái niệm nghiệp vụ.
//   - id: kit-EXP-012
//     content: >
//       Phiên 19 (D2), hai component mới, dùng phần tử HTML gốc, không thư viện
//       ngoài. SelectField (id, label, value, options: { value, label }[],
//       placeholder: string | null — lựa chọn đầu có value '' nghĩa "chưa chọn",
//       onChange(value), error, disabled, focusRequest): select gốc; kit chưa có
//       danh sách chọn nào, và TextField với datalist chỉ GỢI Ý, không buộc chọn
//       trong danh sách. DateField (id, label, value YYYY-MM-DD hoặc '', onChange,
//       clearLabel, error, disabled, focusRequest): input type="date" gốc cộng một
//       Button phụ "xóa" chỉ hiện khi có ngày, vì ô ngày của Chromium không có cách
//       xóa nhìn thấy được, mà đặc tả đòi "có cách xóa để về không có hạn"; không
//       gộp vào TextField vì TextField mang datalist và không có nút. Cả hai theo
//       đúng khuôn của TextField: nhãn gắn ô, lỗi là chữ dưới ô (aria-describedby,
//       aria-invalid), viền --color-border-field và --color-border-field-danger,
//       vòng focus ngoài ô (offset 0), chữ vô hiệu --color-text-muted, focusRequest
//       cùng cơ chế kit-EXP-011. Không prop nào mang khái niệm nghiệp vụ (không có
//       client, currency, deadline). Giao diện tối của control gốc: :root có
//       color-scheme: dark (kit-EXP-001), nên select, danh sách thả xuống và bảng
//       chọn ngày của Chromium cũng tối; e2e commission_form S1 khẳng định
//       color-scheme dark, nền rgb(45,45,45), chữ rgb(230,230,230) của cả ba ô, ảnh
//       commission_form-S1-filled.png. Ghi nhận: ô ngày hiện theo NGÔN NGỮ CỦA
//       ELECTRON (en-US: 11/30/2026, tháng trước), không theo lang của trang; kit
//       không đổi được (xem NOTE).
//   - id: kit-EXP-013
//     content: >
//       ItemList mở rộng thay vì tạo component mới (I4.1): ItemListItem thêm
//       detail: string | null, một dòng phụ dưới dòng chính, chữ --color-text-muted
//       cỡ --font-size-sm, display block. Có một dấu cách giữa hai dòng để tên truy
//       cập của nút là "tiêu đề dòng-phụ", không dính chữ. client_list truyền
//       detail: null, không đổi gì; commission_list dùng nó cho "khách · giá · hạn".
//       check_contrast thêm cặp chữ phụ trên nền hover (5.79:1); chữ phụ trên nền
//       bề mặt nổi đã có (6.45:1).
//   - id: kit-EXP-014
//     content: >
//       Phiên 20 (D3): ConfirmPanel — câu hỏi xác nhận NẰM TRONG TRANG trước một
//       thao tác không quay lại được (§7.2 nguyên tắc 5), không bao giờ là hộp
//       thoại của hệ thống hay trình duyệt. Không có component sẵn đủ: InlineAlert
//       không có nút, EmptyState chỉ một nút phụ và không phải cảnh báo. Props
//       đều là chữ và callback (title, text, confirmLabel, confirmBusyLabel,
//       cancelLabel, busy, onConfirm, onCancel), không mang khái niệm nghiệp vụ.
//       section role="group", aria-labelledby = tiêu đề, aria-describedby = câu;
//       nền --color-surface-danger, viền --color-border-danger, tiêu đề
//       --color-text-danger (có tiêu đề và câu, không chỉ màu). Hai nút gốc vẽ như
//       Button (primary rồi secondary, cùng token); busy thì CẢ HAI vô hiệu và nút
//       xác nhận hiện confirmBusyLabel. Khi khung hiện ra, focus chuyển tới nút
//       xác nhận (useEffect một lần lúc dựng) — trạng thái trình bày của chính kit.
//       Không tạo token mới. check_contrast thêm cặp phi văn bản vòng focus trên
//       --color-surface-danger (6.56:1) cùng khai báo CSS đặt nó ở đó
//       (confirmPanelRingOutside); các cặp chữ trên nền lỗi và của nút đã có, chỉ
//       ghi thêm nơi dùng. Dùng ở stage_change.
//   - id: kit-EXP-015
//     content: >
//       Phiên 22 (D4), DateTimeField: ô ngày giờ gốc (input type="datetime-local", giá trị
//       YYYY-MM-DDTHH:mm hoặc ''), theo đúng khuôn của DateField mà KHÔNG có nút xóa
//       (id, label, value, onChange, error, disabled, focusRequest): nhãn gắn ô, lỗi là chữ
//       dưới ô (aria-describedby, aria-invalid), viền --color-border-field và
//       --color-border-field-danger, vòng focus ngoài ô (offset 0), chữ vô hiệu
//       --color-text-muted, focusRequest cùng cơ chế kit-EXP-011. Không gộp vào DateField vì
//       DateField mang nút xóa (hạn giao có thể trống) còn ô này luôn cần một giá trị; không
//       prop nào mang khái niệm nghiệp vụ. Dùng ở payment_form ("Ngày giờ nhận tiền").
//   - id: kit-EXP-016
//     content: >
//       Phiên 22 (D4), ItemList MỞ RỘNG thay vì tạo component mới (I4.1; lý do: cùng khung,
//       cùng token, cùng phép kiểm tương phản, chỉ thêm một nút): ItemListItem thêm action:
//       { label, disabled } | null; ItemListProps thêm onAction: ((key) => void) | null. Mục
//       có action hiện một nút phụ (component Button, variant secondary) cạnh mục, trong cùng li
//       (li thành flex; nội dung mục flex: 1 nên ba trang cũ không đổi diện mạo); nút trả lại
//       key của mục qua onAction. Mục không có action (null) không có nút: khoản đã hủy của
//       payment_list dùng đúng điều đó. Ba trang cũ (client_list, commission_list,
//       progress_board) chỉ thêm action: null và onAction={null}, không đổi hành vi. Nút là
//       Button nên vòng focus nằm NGOÀI nút (offset dương) trên nền hàng (--color-surface-raised):
//       check_contrast thêm một cặp phi văn bản (6.97:1) cùng CSS đặt nó ở đó
//       (itemListRowBackground + buttonRingOutside).
//   - id: kit-EXP-017
//     content: >
//       Phiên 22 (D4), SelectField thêm hint: string | null (bắt buộc, null là không có), một
//       dòng gợi ý cố định dưới ô, chữ --color-text-muted cỡ --font-size-sm, gắn vào ô bằng
//       aria-describedby (cùng với lỗi nếu có: hint trước, lỗi sau; spec e2e đọc lỗi là id
//       cuối). Lý do: đặc tả D4 đòi dòng "Tiền tip không làm giảm số còn phải thu." dưới ô
//       "Khoản"; một component chữ rời sẽ mất liên kết với ô. Hai trang cũ dùng SelectField
//       (commission_form, stage_change) chỉ thêm hint={null}. Cặp chữ phụ trên nền trang đã có
//       (7.17:1), chỉ ghi thêm nơi dùng.
//   - id: kit-EXP-018
//     content: >
//       Phiên 24 (D5), component MỚI Caption: text: string, một đoạn chữ phụ (p) màu
//       --color-text-muted, cỡ --font-size-sm, dãn dòng --line-height-body, không có vai trò
//       status/alert (đọc như chữ thường). Vì sao mới, không mở rộng cái có sẵn: D5 đòi hai đoạn chữ
//       phụ thuần túy không gắn với ô nhập, không phải thông báo, không phải trạng thái rỗng: dòng "Từ …
//       đến … · Lập lúc …" (nói về báo cáo đang hiện) và câu giải thích cố định dưới ba con số của mỗi
//       đơn vị tiền. Đã cân nhắc: hint của SelectField/TextField gắn với một ô (không có ô ở đây);
//       EmptyState là khung nét đứt cho "chưa có gì" (dùng cho câu "Không có khoản thanh toán nào trong
//       kỳ." đúng nghĩa đó, nhưng không cho chữ giải thích); Section group là tiêu đề h3 (dòng phụ không
//       phải tiêu đề, và đặt nó làm h3 làm lẫn mục lục tiêu đề của trang với các phần đơn vị tiền). Đặt
//       trên nền trang (--color-surface), cặp chữ phụ/nền trang đã có trong check_contrast.mjs (7.17:1),
//       chỉ ghi thêm nơi dùng (Caption). Chỉ props kiểu nguyên thủy, không biết gì về thu nhập.
//   - id: kit-EXP-019
//     content: >
//       Phiên 27 (D6), component MỚI TimeField: ô giờ gốc (input type="time", giá trị HH:mm hoặc ''), đúng
//       khuôn của DateTimeField (id, label, value, onChange, error, disabled, focusRequest): nhãn gắn ô, lỗi là
//       chữ dưới ô (aria-describedby, aria-invalid), viền --color-border-field và --color-border-field-danger,
//       vòng focus ngoài ô (offset 0), chữ vô hiệu --color-text-muted, focusRequest cùng cơ chế kit-EXP-011.
//       Vì sao mới: DateTimeField là datetime-local (ngày kèm giờ), ô này chỉ là giờ trong ngày; thêm prop
//       "kiểu" vào DateTimeField sẽ làm một component mang hai nghĩa. Không prop nào mang khái niệm nghiệp vụ.
//       Dùng ở reminder_settings ("Vào lúc"). Thêm vào FIELDS của check_contrast.mjs, nên viền, viền lỗi và
//       vòng focus của nó được kiểm cả tỷ lệ lẫn vị trí trong CSS.
//   - id: kit-EXP-020
//     content: >
//       Phiên 27 (D6), component MỚI CheckboxField (id, label, checked, onChange(checked), disabled): input
//       type="checkbox" gốc cộng nhãn bên cạnh (bấm nhãn cũng đổi), accent-color là màu nhấn
//       --color-action, vòng focus ngoài ô với offset --border-width-focus (như Button, nên vòng nằm trên nền
//       trang, không sát ô). Vì sao mới: kit chưa có ô chọn có/không; SelectField chỉ chọn trong danh sách.
//       KHÔNG có lỗi và không có focusRequest: có hay không đều hợp lệ (Data Schema 9.0.2: enabled là boolean),
//       nên không có gì để báo lỗi hay dồn con trỏ tới. Chữ nhãn khi vô hiệu dùng --color-text-muted (cặp đã có).
//       check_contrast thêm khai báo CSS đặt vòng focus của nó (checkboxRingOutside) vào cặp vòng focus trên nền
//       trang; không cặp mới. Ghi nhận: viền của chính ô vuông là của control gốc (:root color-scheme: dark),
//       không có token để kiểm; ảnh UI/evidence/walkthroughs/reminder_settings/reminder_settings-S1-defaults.png
//       cho thấy ô vuông nhìn rõ trên nền tối.
//   - id: kit-EXP-021
//     content: >
//       Phiên 27 (D6), KHÔNG thêm component cho dòng mốc nhắc ("số", "giờ|ngày", "Bỏ mốc này"): dựng bằng
//       Inline + TextField + SelectField + Button sẵn có (plan việc 4: dùng component sẵn nếu được). Nhãn của ô
//       theo vị trí ("Mốc nhắc 2: số", "Mốc nhắc 2: đơn vị") để mỗi ô có tên duy nhất; nút "Bỏ mốc này" lặp tên
//       ở mỗi dòng (spec bấm theo vị trí). Khung "Mốc nhắc" là FieldGroup. Không có kiểm thử riêng cho kit (như
//       các phiên trước, kit được phủ qua kiểm thử dựng trang: ReminderSettings.test.tsx 27 ca).
//   - id: kit-EXP-022
//     content: >
//       Phiên 37 (chặng F), MỞ RỘNG ConfirmPanel, không thêm component, không đổi prop, không đổi màu: .text thêm white-space: pre-line (một
//       dấu xuống dòng trong text là một dòng mới trên màn hình, để khung xác nhận khôi phục có dòng "Khôi phục từ tệp: <đường dẫn>" riêng) và
//       overflow-wrap: anywhere (đường dẫn dài của Windows xuống dòng ở ký tự bất kỳ, như DescriptionList của chặng E). Vì sao không component mới:
//       spec chặng F bảo dùng ConfirmPanel; hai thuộc tính CSS không mang khái niệm nghiệp vụ. Không đổi hành vi của stage_change và payment_list
//       (text của chúng không có dấu xuống dòng, không có từ dài; ảnh evidence của chúng giữ nguyên trong 5 lượt e2e). check_contrast không đổi
//       (không cặp màu nào đổi). Dùng ở trang restore.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Token tối đặt xong; mọi cặp chữ/nền kit dùng đạt WCAG AA (>= 4.5:1); style
//       của kit sạch với R7; kit không import logic, screens hay Main.
//     how: >
//       Trong UI/: npm run check (stylelint, lint:contrast, eslint). node
//       scripts/check_contrast.mjs in từng cặp.
//     result: >
//       "check_contrast: 18 text/background pairs checked, all >= 4.5:1."
//       Các tỷ lệ: chữ trên nền trang 13.65, trên header và bề mặt nổi 12.28,
//       trên hover và ô nhập 11.03, trên mục chọn 9.68, trên nền lỗi 11.56; chữ
//       phụ 7.17 (trang), 6.45 (bề mặt nổi); chữ lỗi 7.90 (trang), 6.69 (nền
//       lỗi); chữ thành công 7.09; nút chính 5.60 và 6.78 (hover); nút phụ 9.68
//       và 7.68 (hover). stylelint --max-warnings 0 sạch (tokens.css, global.css,
//       16 CSS module); eslint sạch.
//     recorded_at: 2026-09-28T10:56:10+07:00
//   - claim: >
//       Phép kiểm độ tương phản cắn: một giá trị tương phản thấp làm npm run
//       check hỏng.
//     how: >
//       Tạm đổi --base-gray-400 (chữ phụ) từ #a8a8a8 thành #5a5a5a trong
//       tokens.css; trong UI/: npm run check; khôi phục giá trị cũ.
//     result: >
//       exit 1 ở bước lint:contrast: "below 4.5:1 2.47:1 --color-text-muted
//       (#5a5a5a) on --color-surface (#1c1c1c)", "2.22:1 ... on
//       --color-surface-raised", "2.22:1 ... on --color-surface-muted",
//       "check_contrast: 3 of 18 pair(s) fail WCAG AA (4.5:1)." (lúc đó 17 cặp
//       khác đạt). Sau khi khôi phục: --base-gray-400: #a8a8a8, check đạt.
//     recorded_at: 2026-09-28T10:29:01+07:00
//   - claim: >
//       Component mới dựng đúng trên ứng dụng thật, nền tối.
//     how: >
//       npm run e2e (ảnh chụp các kịch bản bấm thử).
//     result: >
//       UI/evidence/walkthroughs/client_list/client_list-S1.png (NavMenu, Button
//       primary và secondary, ItemList bấm được), client_list-S2-empty.png
//       (EmptyState có nút), client_detail/client_detail-S2.png (DescriptionList,
//       SuccessNotice), client_form/client_form-S2-errors.png (TextField có lỗi,
//       FieldGroup, Inline, TextArea, InlineAlert), client_form-S5-unreachable.png.
//     recorded_at: 2026-09-28T10:54:37+07:00
//   - claim: >
//       Phiên 17: nhóm chữ vẫn >= 4.5:1, nhóm phi văn bản >= 3:1, và CSS đặt từng
//       phần phi văn bản đúng chỗ đã khai.
//     how: >
//       Trong UI/: node scripts/check_contrast.mjs (cũng là bước lint:contrast
//       của npm run check).
//     result: >
//       "check_contrast: 18 text pairs >= 4.5:1 and 11 non-text pairs >= 3:1
//       checked, all pass." Phi văn bản: viền ô 3.73 (nền ô), 4.62 (trang); viền
//       ô lỗi 3.83, 4.74; vòng focus 7.74 (trang), 6.97 (EmptyState, bề mặt nổi),
//       6.26 (hover), 5.49 (mục chọn); vạch điều hướng 5.49 (mục chọn), 6.97 (vùng
//       điều hướng). Nhóm chữ không đổi (thấp nhất 5.60).
//     recorded_at: 2026-09-28T12:10:30+07:00
//   - claim: >
//       Phép kiểm phi văn bản cắn cả tỷ lệ lẫn vị trí.
//     how: >
//       (a) Tạm đổi --color-border-field thành var(--base-gray-600) (#6b6b6b);
//       npm run check; khôi phục. (b) Tạm đổi outline-offset của
//       .primary:focus-visible, .secondary:focus-visible trong Button.module.css
//       thành 0 (vòng focus sát nút); node scripts/check_contrast.mjs; khôi phục.
//     result: >
//       (a) exit 1 ở lint:contrast: "below [non-text >= 3:1] 2.58:1
//       --color-border-field (#6b6b6b) on --color-surface-field (#2d2d2d)",
//       "check_contrast: 1 of 29 pair(s) fail". (b) exit 1: "place [non-text >=
//       3:1] 7.74:1 --color-focus-ring ... on --color-surface ... the CSS no
//       longer puts it there: Button/Button.module.css .primary:focus-visible
//       ends with outline-offset: 0 (expected var(--border-width-focus)); ...
//       .secondary:focus-visible ...". Khôi phục: cả hai đạt, "all pass".
//     recorded_at: 2026-09-28T12:10:53+07:00
//   - claim: >
//       focusRequest đưa con trỏ tới ô được yêu cầu, trên ứng dụng thật.
//     how: >
//       Kiểm thử dựng trang ClientForm (khối "button row and focus"); e2e
//       client_form S2, S4 (toBeFocused), 5 lần liên tiếp.
//     result: >
//       Xem EVIDENCE của screens. Ảnh client_form-S2-errors.png,
//       client_form-S4-errors.png: vòng focus xanh ở "Tên hiển thị", viền ô nhập
//       và viền ô lỗi nhìn rõ trên nền tối.
//     recorded_at: 2026-09-28T12:24:05+07:00
//   - claim: >
//       Phiên 19: tương phản phủ SelectField, DateField và dòng phụ của ItemList:
//       viền, viền lỗi, vòng focus của hai ô mới được kiểm theo đúng vị trí thật
//       trong CSS; cả nhóm chữ vẫn >= 4.5:1.
//     how: >
//       Trong UI/: node scripts/check_contrast.mjs (bước lint:contrast của npm run
//       check). FIELDS trong script liệt kê bốn CSS module ô nhập; mỗi cặp phi văn
//       bản của ô nhập kiểm .input, .inputError, :focus-visible của cả bốn.
//     result: >
//       "check_contrast: 19 text pairs >= 4.5:1 and 11 non-text pairs >= 3:1
//       checked, all pass." Cặp chữ mới: --color-text-muted trên
//       --color-surface-hover 5.79:1 (dòng phụ ItemList khi rê chuột). Các cặp cũ
//       nay ghi thêm SelectField, DateField: viền ô 3.73 (nền ô), 4.62 (trang); viền
//       lỗi 3.83, 4.74; vòng focus 7.74; chữ trong ô 11.03; chữ vô hiệu 5.79.
//     recorded_at: 2026-09-29T09:13:30+07:00
//   - claim: >
//       Phép kiểm vị trí cắn với hai component mới.
//     how: >
//       Tạm đổi border của .input trong SelectField.module.css sang
//       var(--color-border) (viền trang trí), và outline-offset của .input:focus-visible,
//       .inputError:focus-visible trong DateField.module.css sang calc(-1 *
//       var(--border-width-focus)); node scripts/check_contrast.mjs; khôi phục; chạy lại.
//     result: >
//       exit 1: "place [non-text >= 3:1] 3.73:1 --color-border-field … the CSS no
//       longer puts it there: SelectField/SelectField.module.css .input ends with
//       border: var(--border-width-panel) solid var(--color-border) (expected …
//       var(--color-border-field))" (hai cặp viền), và "place … 7.74:1
//       --color-focus-ring … DateField/DateField.module.css .input:focus-visible ends
//       with outline-offset: calc(-1 * var(--border-width-focus)) (expected 0)";
//       "check_contrast: 3 of 30 pair(s) fail". Khôi phục: exit 0, "all pass".
//     recorded_at: 2026-09-29T09:13:10+07:00
//   - claim: >
//       Phiên 20: ConfirmPanel được phép kiểm tương phản phủ, và phép kiểm cắn khi
//       vòng focus của nó bị dời vào trong; focus tự tới nút xác nhận.
//     how: >
//       Trong UI/: node scripts/check_contrast.mjs. Scratchpad bite.py (h): tạm đổi
//       outline-offset của .cancel:focus-visible trong ConfirmPanel.module.css thành 0;
//       chạy lại; khôi phục. (g): tạm bỏ lời gọi focus() của ConfirmPanel; npx vitest
//       run src/screens/pages/stage_change; khôi phục.
//     result: >
//       "check_contrast: 19 text pairs >= 4.5:1 and 12 non-text pairs >= 3:1 checked,
//       all pass."; cặp mới 6.56:1 --color-focus-ring (#8fb0e8) on
//       --color-surface-danger (#3a2422). (h) exit 1 "check_contrast: 1 of 31 pair(s)
//       fail". (g) "1 failed | 21 passed (22)" (ca focus ở "Xác nhận"). Khôi phục: đạt.
//       Trên ứng dụng thật: stage_change S3 toBeFocused ở "Xác nhận", ảnh
//       UI/evidence/walkthroughs/stage_change/stage_change-S3-confirm.png.
//     recorded_at: 2026-09-29T17:45:30+07:00
//   - claim: >
//       Phiên 22: DateTimeField, hành động của ItemList và hint của SelectField được phép kiểm
//       tương phản phủ; nhóm chữ vẫn >= 4.5:1, nhóm phi văn bản >= 3:1 (13 cặp).
//     how: >
//       Trong UI/: node scripts/check_contrast.mjs (bước lint:contrast của npm run check).
//       FIELDS thêm DateTimeField/DateTimeField.module.css; NON_TEXT_PAIRS thêm cặp vòng focus
//       của nút hành động trong hàng ItemList; TEXT_PAIRS ghi thêm nơi dùng (DateTimeField,
//       hint của SelectField, nút hành động của ItemList).
//     result: >
//       "check_contrast: 19 text pairs >= 4.5:1 and 13 non-text pairs >= 3:1 checked, all
//       pass." (mốc phiên 21: 12 cặp phi văn bản). Cặp mới: 6.97:1 --color-focus-ring
//       (#8fb0e8) on --color-surface-raised (#252525) — vòng focus của nút hành động trong hàng
//       ItemList, ngoài nút. Các cặp viền ô, viền lỗi, vòng focus của ô nay ghi thêm
//       DateTimeField: 3.73 và 4.62 (viền), 3.83 và 4.74 (viền lỗi), 7.74 (vòng focus).
//     recorded_at: 2026-09-30T08:24:00+07:00
//   - claim: >
//       Phép kiểm cắn với hai phần mới: đổi CSS khỏi chỗ đã khai thì check hỏng.
//     how: >
//       Tạm đổi border của .input trong DateTimeField.module.css sang var(--color-border) (viền
//       trang trí), và background của .list trong ItemList.module.css sang
//       var(--color-surface-hover); node scripts/check_contrast.mjs; khôi phục cả hai; chạy lại.
//     result: >
//       exit 1, "place [non-text >= 3:1] 3.73:1 --color-border-field (#858585) on
//       --color-surface-field … the CSS no longer puts it there" và "… 4.62:1 … outer edge",
//       "place … 6.97:1 --color-focus-ring … focus ring of the action button of an ItemList row",
//       "check_contrast: 3 of 32 pair(s) fail". Khôi phục: "all pass", 13 cặp phi văn bản.
//     recorded_at: 2026-09-30T08:24:30+07:00
//   - claim: >
//       Ba component mới hoặc mở rộng dựng đúng trên ứng dụng thật, nền tối, và ba trang cũ dùng
//       ItemList, SelectField không đổi.
//     how: >
//       npm run e2e (ảnh chụp các kịch bản bấm thử); npm run check (kiểm thử dựng trang của ba
//       trang cũ giữ nguyên số ca: ClientList 11, ClientDetail 19, ClientForm 27, CommissionList 12,
//       CommissionForm 31, ProgressBoard 9, StageChange 22).
//     result: >
//       Xem EVIDENCE của screens. Ảnh: UI/evidence/walkthroughs/payment_form/payment_form-S1-errors.png
//       (SelectField có hint và lỗi, ô số tiền lỗi, ô đơn vị tiền vô hiệu, DateTimeField),
//       payment_list/payment_list-S3-confirm.png (ItemList có nút "Hủy khoản này", ConfirmPanel).
//     recorded_at: 2026-09-30T09:00:00+07:00
//   - claim: >
//       Phiên 24: Caption dựng đúng trên ứng dụng thật, nền tối; phép kiểm tương phản không đổi kết quả.
//     how: >
//       Trong UI/: node scripts/check_contrast.mjs (bước lint:contrast của npm run check); ảnh chụp kịch bản
//       income_report.
//     result: >
//       "check_contrast: 19 text pairs >= 4.5:1 and 13 non-text pairs >= 3:1 checked, all pass." (bằng mốc phiên
//       22; Caption dùng cặp chữ phụ/nền trang 7.17:1 đã có, chỉ ghi thêm nơi dùng ở TEXT_PAIRS). Ảnh:
//       UI/evidence/walkthroughs/income_report/income_report-S1.png (dòng phụ và câu giải thích là Caption).
//       Không có thay đổi cấu hình ESLint, stylelint, check_layer.
//     recorded_at: 2026-10-01T20:22:00+07:00
//   - claim: >
//       Phiên 27: TimeField và CheckboxField được phép kiểm tương phản phủ; nhóm chữ vẫn >= 4.5:1, nhóm phi văn
//       bản >= 3:1.
//     how: >
//       Trong UI/: node scripts/check_contrast.mjs (bước lint:contrast của npm run check). FIELDS thêm
//       TimeField/TimeField.module.css; CSS.checkboxRingOutside đưa vòng focus của CheckboxField vào cặp vòng
//       focus trên nền trang; TEXT_PAIRS và NON_TEXT_PAIRS ghi thêm nơi dùng.
//     result: >
//       "check_contrast: 19 text pairs >= 4.5:1 and 13 non-text pairs >= 3:1 checked, all pass." (số cặp bằng mốc
//       phiên 24: cả hai component dùng lại cặp đã có). Viền ô, viền lỗi, vòng focus của TimeField: 3.73 và
//       4.62, 3.83 và 4.74, 7.74. Vòng focus của CheckboxField trên nền trang 7.74:1.
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Phép kiểm vị trí cắn với hai component mới.
//     how: >
//       (a) Tạm đổi outline-offset của .input:focus-visible trong CheckboxField.module.css sang 0; (b) tạm đổi
//       border của .input trong TimeField.module.css sang var(--color-border); node scripts/check_contrast.mjs;
//       khôi phục từng cái (sao lưu và chép lại nguyên byte); chạy lại.
//     result: >
//       (a) exit 1: "the CSS no longer puts it there: CheckboxField/CheckboxField.module.css .input:focus-visible
//       ends with outline-offset: 0 (expected var(--border-width-focus))", "1 of 32 pair(s) fail". (b) exit 1:
//       "TimeField/TimeField.module.css .input ends with border: var(--border-width-panel) solid
//       var(--color-border) (expected …var(--color-border-field))", "2 of 32 pair(s) fail". Khôi phục: "all pass".
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//   - claim: >
//       Hai component mới dựng đúng trên ứng dụng thật, nền tối.
//     how: >
//       npm run e2e có runner (ảnh chụp các kịch bản bấm thử); npm run check (ReminderSettings.test.tsx 27 ca).
//     result: >
//       Ảnh: UI/evidence/walkthroughs/reminder_settings/reminder_settings-S1-defaults.png (hai ô đánh dấu có nhãn,
//       ô giờ "Vào lúc" 09:00, ô chọn thứ), reminder_settings-S4-errors.png (lỗi cạnh ô số của mốc và ô "Mỗi").
//       Kiểm thử dựng trang: ô giờ là input type time, ô bật là checkbox, các ô vô hiệu khi đang lưu.
//     recorded_at: 2026-10-03T10:42:22.0487385+07:00
//
// NOTES:
//   - content: >
//       Cho Orchestrator (không chặn, không phải việc của giao diện): ô ngày gốc
//       (DateField, "Hạn giao") hiện ngày theo ngôn ngữ của Electron, hiện là en-US
//       (11/30/2026, tháng trước ngày), khác cách viết dd/mm/yyyy ở mọi chỗ khác
//       của giao diện. Thuộc tính lang của trang không đổi được điều này; muốn đổi
//       thì desktop Main đặt ngôn ngữ của ứng dụng (ví dụ app.commandLine
//       appendSwitch('lang', 'vi') trước ready). Phiên giao diện không sửa Desktop/.
//     written_at: 2026-09-29
//   - content: >
//       Cho Orchestrator (không chặn, không phải việc của giao diện; DSK-15): từ phiên 22, ô ngày
//       giờ gốc (DateTimeField, "Ngày giờ nhận tiền") cũng hiện theo ngôn ngữ của Electron
//       (en-US: tháng/ngày/năm, giờ AM/PM), khác cách viết HH:mm dd/mm/yyyy ở mọi chỗ khác. Giá
//       trị của ô luôn là YYYY-MM-DDTHH:mm, nên logic không bị ảnh hưởng; chỉ cách hiện. Không sửa
//       ở phiên này (Desktop/).
//     written_at: 2026-09-30
// ===WCA-CHECKPOINT-END===
/**
 * Public entry of the kit zone — the only path the screens zone may import
 * the kit through (R9). Whatever is not exported here is an internal detail
 * of the kit.
 */
import './tokens/tokens.css'
import './styles/global.css'

export type { Scale } from './scale'
export { Stack } from './components/Stack/Stack'
export type { StackProps } from './components/Stack/Stack'
export { AppFrame } from './components/AppFrame/AppFrame'
export type { AppFrameProps } from './components/AppFrame/AppFrame'
export { FatalMessage } from './components/FatalMessage/FatalMessage'
export type { FatalMessageProps } from './components/FatalMessage/FatalMessage'
export { Section } from './components/Section/Section'
export type { SectionProps } from './components/Section/Section'
export { Button } from './components/Button/Button'
export type { ButtonProps } from './components/Button/Button'
export { ItemList } from './components/ItemList/ItemList'
export type { ItemListAction, ItemListItem, ItemListProps } from './components/ItemList/ItemList'
export { EmptyState } from './components/EmptyState/EmptyState'
export type { EmptyStateAction, EmptyStateProps } from './components/EmptyState/EmptyState'
export { InlineAlert } from './components/InlineAlert/InlineAlert'
export type { InlineAlertProps } from './components/InlineAlert/InlineAlert'
export { LoadingIndicator } from './components/LoadingIndicator/LoadingIndicator'
export type { LoadingIndicatorProps } from './components/LoadingIndicator/LoadingIndicator'
export { Inline } from './components/Inline/Inline'
export type { InlineProps } from './components/Inline/Inline'
export { NavMenu } from './components/NavMenu/NavMenu'
export type { NavMenuItem, NavMenuProps } from './components/NavMenu/NavMenu'
export { TextField } from './components/TextField/TextField'
export type { TextFieldProps } from './components/TextField/TextField'
export { TextArea } from './components/TextArea/TextArea'
export type { TextAreaProps } from './components/TextArea/TextArea'
export { FieldGroup } from './components/FieldGroup/FieldGroup'
export type { FieldGroupProps } from './components/FieldGroup/FieldGroup'
export { DescriptionList } from './components/DescriptionList/DescriptionList'
export type { DescriptionListItem, DescriptionListProps } from './components/DescriptionList/DescriptionList'
export { SuccessNotice } from './components/SuccessNotice/SuccessNotice'
export type { SuccessNoticeProps } from './components/SuccessNotice/SuccessNotice'
export { SelectField } from './components/SelectField/SelectField'
export type { SelectFieldOption, SelectFieldProps } from './components/SelectField/SelectField'
export { DateField } from './components/DateField/DateField'
export type { DateFieldProps } from './components/DateField/DateField'
export { DateTimeField } from './components/DateTimeField/DateTimeField'
export type { DateTimeFieldProps } from './components/DateTimeField/DateTimeField'
export { TimeField } from './components/TimeField/TimeField'
export type { TimeFieldProps } from './components/TimeField/TimeField'
export { CheckboxField } from './components/CheckboxField/CheckboxField'
export type { CheckboxFieldProps } from './components/CheckboxField/CheckboxField'
export { ConfirmPanel } from './components/ConfirmPanel/ConfirmPanel'
export type { ConfirmPanelProps } from './components/ConfirmPanel/ConfirmPanel'
export { Caption } from './components/Caption/Caption'
export type { CaptionProps } from './components/Caption/Caption'
