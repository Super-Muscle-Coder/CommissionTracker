// ===WCA-CHECKPOINT-START===
// workflow: kit
// clause: external
// component: kit
// last_updated_by: coding-agent@2026-09-29#1
// last_updated_at: 2026-09-29T10:10:00+07:00
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
export type { ItemListItem, ItemListProps } from './components/ItemList/ItemList'
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
