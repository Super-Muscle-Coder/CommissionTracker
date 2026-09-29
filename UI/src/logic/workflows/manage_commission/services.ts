// ===WCA-CHECKPOINT-START===
// workflow: manage_commission
// clause: external
// component: services
// last_updated_by: coding-agent@2026-09-29#2
// last_updated_at: 2026-09-29T17:45:00+07:00
//
// EXPERIENCES:
//   - id: manage_commission-EXP-001
//     content: >
//       Bảy lời gọi (ui_decomposition.md, "Chặng D2", bảng "Lời gọi"), bảng nhãn ở
//       configs.ts, [CONTRACT] api_contract.yaml 4.0.0, chép từng dòng (kiểm thử
//       "label tables of Configs match api_contract.yaml 4.0.0 line by line"):
//       list_commissions GET /commissions { 200 ok, 500 ERR_STORAGE_IO };
//       get_commission GET /commissions/{commission_id} { 200 ok, 404
//       ERR_NOT_FOUND, 500 }; create_commission POST /commissions { 201 ok, 400
//       ERR_VALIDATION, 404, 409 ERR_CONFLICT, 500 }; edit_commission PUT
//       /commissions/{commission_id} { 200 ok, 400, 404, 409, 500 };
//       list_currencies GET /currencies { 200 ok } (nhãn duy nhất); list_clients
//       GET /clients { 200 ok, 500 }; get_client GET /clients/{client_id} { 200
//       ok, 404, 500 }. Hai lời gọi của manage_client là hàm riêng của Adapters
//       workflow này, không import manage_client của giao diện (R2, I1.3), và
//       Entities tự mô tả client_list, client_detail. Thân gửi { commission_input }
//       (endpoint_forms.http). Khác manage_client: errorMessages theo TỪNG LỜI GỌI
//       (errorMessages[endpoint][code]), vì cùng một mã mang nghĩa khác nhau:
//       ERR_NOT_FOUND là "Không tìm thấy khách hàng đã chọn. Hãy chọn lại." khi
//       tạo, "Không tìm thấy đơn hàng hoặc khách hàng đã chọn." khi sửa, "Không
//       tìm thấy đơn hàng này." khi mở. Kiểm thử "mọi mã có câu" duyệt 14 cặp
//       (lời gọi, mã) từ bảng nhãn.
//   - id: manage_commission-EXP-002
//     content: >
//       Kiểm thân bằng Zod, đủ mức tối thiểu của I3.3. Số nguyên: money.amount_minor
//       phải Number.isSafeInteger (±(2^53−1), clause_a_common) — 9007199254740992,
//       -9007199254740992, 1e20, 12.5 đều là contract_violation. currency_code: ba
//       chữ hoa (types.currency_code, ISO 4217 alphabetic). date: formats.date VÀ
//       là ngày lịch thật (2026-02-30 bị từ chối), kiểm bằng Date.UTC trên số
//       nguyên, không múi giờ. client_detail kiểm đủ trường cam kết dù trang chỉ
//       dùng tên và is_archived. Không kiểm dấu của amount_minor ở output (money
//       cho phép âm; ràng buộc >= 0 là của commission_input).
//   - id: manage_commission-EXP-003
//     content: >
//       Tiền, không bao giờ qua số thực. ĐỊNH DẠNG (Services, quyết định trình
//       bày): String(amount_minor) cho đúng các chữ số của một số nguyên an toàn;
//       cắt chuỗi thành phần nguyên và phần lẻ theo số chữ số lẻ của mã tiền
//       (configs.currencyDecimals { VND: 0, USD: 2 }, [UI-ONLY]); nhóm nghìn bằng
//       cắt chuỗi, dấu "." nhóm, "," lẻ: "1.500.000 VND", "12,50 USD", "0,05 USD",
//       "9.007.199.254.740.991 VND", "90.071.992.547.409,91 USD". Mã không có trong
//       bảng: "<amount_minor> <mã> (đơn vị nhỏ nhất)", không chọn được khi tạo.
//       ĐỌC (Routers.readAmount): đây là chuyển đổi định dạng của dữ liệu thô ở
//       ranh giới (iWCA I3.5), nên nằm ở Routers; plan phiên 19 việc 3 ghi "Services
//       … đọc số tiền" — làm theo iWCA như tiền lệ manage_client-EXP-006, kết quả
//       như nhau. Bảy bước của ui_decomposition D2; so với 2^53−1 bằng so chuỗi chữ
//       số (bỏ số 0 đầu, so độ dài rồi thứ tự), không BigInt, không số thực; chỉ
//       gọi Number() khi đã chắc <= 2^53−1. Mã lỗi: rỗng → required ("Nhập giá thỏa
//       thuận."), cách viết sai (dấu trừ, chữ, không bắt đầu bằng chữ số, nhóm
//       nghìn sai, quá số chữ số lẻ) → not_integer ("Số tiền không hợp lệ."), vượt
//       2^53−1 → violates_type_constraint ("Số tiền quá lớn.": khoảng
//       ±(2^53−1) nằm trong ngoặc của types.money). Ở chế độ sửa, ô tiền điền sẵn
//       dạng hiển thị không kèm mã và đọc lại đúng amount_minor (kiểm thử khứ hồi
//       với 8 giá trị, qua Services và Routers thật); đơn vị tiền gửi đi luôn là
//       đơn vị cũ.
//   - id: manage_commission-EXP-004
//     content: >
//       Hạn giao: dd/mm/yyyy cắt thẳng từ chuỗi YYYY-MM-DD, không qua new Date (đọc
//       chuỗi ngày thành thời điểm UTC; múi giờ âm hiện ngày hôm trước). Kiểm thử
//       với múi giờ âm: trong services.test.ts, vi.stubEnv('TZ',
//       'America/Los_Angeles') cho riêng ca đó (Node áp múi giờ ngay khi
//       process.env.TZ được gán; vi.unstubAllEnvs khôi phục), và khẳng định trước
//       new Date('2026-01-01').getDate() === 31 để chứng minh múi giờ âm đang có
//       hiệu lực; 2026-01-01 vẫn hiện 01/01/2026. src/ không có kiểu Node nên không
//       dùng process trực tiếp. Trên ứng dụng thật: commission_detail S2 hiện
//       "01/01/2026".
//   - id: manage_commission-EXP-005
//     content: >
//       Quyết định trình bày ở Services, mỗi quyết định đã qua phép thử §5:
//       (1) đơn sắp theo updated_at mới nhất trước, so THỜI ĐIỂM (Date.parse) vì hai
//       timestamp có thể khác độ lệch UTC, rồi commission_id; (2) dòng phụ của mỗi
//       đơn "<khách> · <giá> · Hạn giao dd/mm/yyyy" hoặc "… · Không có hạn"
//       (detailText; trang không tự ghép chữ); client_id không có trong client_list
//       → "Không tìm thấy khách hàng"; (3) chi tiết: khách đã lưu trữ thêm "(đã lưu
//       trữ)", get_client 404 KHÔNG phải lỗi (so error.code với
//       endpoints.getClient.labels['404'] của Configs) → "Không tìm thấy khách
//       hàng"; (4) khách chọn được: đang hoạt động, Intl.Collator('vi'), trùng tên
//       theo id; ở chế độ sửa, khách của đơn nếu đã lưu trữ hoặc vắng mặt được thêm
//       ĐẦU danh sách với "(đã lưu trữ)" và chọn sẵn; (5) đơn vị tiền khi tạo =
//       list_currencies giao bảng số chữ số lẻ, theo thứ tự nhận được, mặc định VND
//       nếu có, không thì mã đầu; khi sửa chỉ đơn vị cũ, currencyLocked; (6) không
//       có khách đang hoạt động (tạo) → noActiveClient; (7) bản nháp sửa từ đơn đã
//       lưu (null thành chuỗi rỗng, liên kết nối bằng xuống dòng); (8) ngày giờ tạo,
//       sửa như client_detail (vi-VN, giờ của máy); (9) câu cho mỗi mã lỗi của mỗi
//       lời gọi, câu xác nhận "Đã thêm đơn hàng.", "Đã lưu thay đổi.". Thao tác hai
//       lời gọi: step() lấy dữ liệu lời gọi đầu hoặc dừng với failure() của nó; lời
//       gọi sau không được gọi (kiểm thử khẳng định).
//   - id: manage_commission-EXP-006
//     content: >
//       Routers (một lối vào cho mỗi việc trang làm, iWCA D2): loadCommissionList
//       (list_commissions + list_clients), loadCommissionDetail(id) (get_commission
//       + get_client), openCommissionForm(target) (create: list_clients +
//       list_currencies; edit: get_commission + list_clients), saveCommission(target,
//       draft) (create_commission | edit_commission), reloadClientChoices(keptClientId,
//       chosenClientId) (list_clients). Routers nhận Services và rules = { limits,
//       currencyDecimals, formats } do Main trao (R14). readDraft: SAO TỪ HỢP ĐỒNG
//       (commission_input, formats.not_blank): client_id có → else required; title
//       not blank, 1..200 code point; amount_minor số nguyên >= 0, <= 2^53−1;
//       currency có; deadline null hoặc formats.date. [UI-ONLY]: bỏ khoảng trắng
//       hai đầu mọi ô chữ (trim của JS, gồm U+00A0, U+3000, U+FEFF); "Loại tranh",
//       "Mô tả" rỗng → null; hạn giao rỗng → null; liên kết tách dòng, bỏ dòng rỗng,
//       không kiểm URL, không dòng nào → []. Khóa lỗi là tên trường của hợp đồng:
//       client_id, title, agreed_price.amount_minor, agreed_price.currency, deadline.
//       Không đọc error_body.details.
//   - id: manage_commission-EXP-007
//     content: >
//       reloadClientChoices là lối vào thứ năm, không có trong danh sách "thao tác"
//       của bảng trang nhưng dùng đúng list_clients đã có trong bảng lời gọi D2:
//       đặc tả đòi "tải lại danh sách khách" sau 404 (tạo) và 409. Services quyết
//       định khách nào còn được chọn (giữ khách đang chọn nếu còn trong danh sách,
//       không thì "Chọn khách hàng"). Trang gọi nó sau MỌI lần phía sau từ chối lưu
//       (origin system), rộng hơn đặc tả một chút (cả 400, 500, 404 khi sửa) nhưng
//       vô hại: danh sách chỉ đổi khi khách đã chọn không còn chọn được. Không gây
//       ra được trên hệ thống thật bằng thao tác bình thường (404, 409 không gây ra
//       được), nên chỉ được chứng minh ở kiểm thử dựng trang.
//   - id: manage_commission-EXP-008
//     content: >
//       Q19-3 (phiên 20): ở chế độ sửa, khách của đơn KHÔNG CÒN trong client_list
//       được giữ trong danh sách chọn với nhãn "Không tìm thấy khách hàng" (bỏ
//       "(đã lưu trữ)": không có gì cho biết khách đó đã lưu trữ); khách còn trong
//       danh sách mà đã lưu trữ vẫn là "<tên> (đã lưu trữ)". Chỉ đổi clientChoices;
//       kiểm thử services "the commission's client no longer listed …" khẳng định
//       nhãn mới. Không gây ra được trên hệ thống thật (không có thao tác xóa khách).
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Kiểm thử của manage_commission đạt, đủ ma trận phủ của I3.6 cho bảy lời
//       gọi, cộng các ca bắt buộc của plan phiên 19 việc 3.
//     how: >
//       Trong UI/: npm run check (vitest, http_client giả, không có mạng); npx
//       vitest run --reporter=json cho số theo tệp. Tệp
//       src/logic/workflows/manage_commission/tests/adapters.test.ts,
//       services.test.ts, routers.test.ts.
//     result: >
//       adapters.test.ts 111 đạt: bảng nhãn khớp hợp đồng; với từng lời gọi:
//       phương thức, đường dẫn, thân { commission_input }; mọi nhãn khai báo; code
//       khác mã khai báo; thân lỗi sai hình; unreachable (ghi console.error); nhãn
//       không khai báo; thân rỗng; thiếu trường; sai kiểu; amount_minor ngoài
//       ±(2^53−1) (list_commissions, get_commission, create, edit); danh sách có
//       đúng một phần tử sai (list_commissions, list_currencies "usd", list_clients);
//       trường thừa bị bỏ; cộng 9007199254740991 đạt đúng, 12.5 và "vnd" và
//       2026-02-30 bị từ chối, deadline null đạt, {commission_id} mã hóa URL.
//       services.test.ts 82 đạt: 14 cặp (lời gọi, mã) có câu; 11 ca định dạng tiền
//       (0 VND, 1.500.000 VND, 12,50 USD, 0,05 USD, 0,00 USD, 1,00 USD, 999 VND,
//       1.000 VND, 9007199254740991 VND và USD từng chữ số, mã lạ EUR); hạn giao ở
//       America/Los_Angeles và Asia/Ho_Chi_Minh; mọi loại lỗi của TỪNG lời gọi của
//       bốn thao tác (lời gọi sau không được gọi); thứ tự, tên khách, khách lưu trữ,
//       khách vắng mặt, get_client 404, đơn vị tiền, noActiveClient, bản nháp sửa,
//       reloadClientChoices, rejectInput. routers.test.ts 64 đạt: bảng ví dụ D2 TỪNG
//       DÒNG (VND 1500000, 1.500.000, 1,500,000 → 1500000; 1,5 và 1.50 lỗi; USD
//       12.5, 12,50 → 1250; 1,250 và 1.250 → 125000; 1.250,5 → 125050; 12.505 →
//       1250500; 12.5055 và 1.2345 lỗi); 9007199254740991 VND và
//       90.071.992.547.409,91 USD đạt; bốn số vượt → violates_type_constraint; 13
//       cách viết sai (-1, −5, chữ, 1e6, .5, …) → not_integer ở cả VND lẫn USD;
//       rỗng, khoảng trắng, U+00A0 U+3000 tab → required; khứ hồi 8 giá trị qua
//       openCommissionForm(edit) rồi saveCommission với Services và Routers thật,
//       gửi đúng amount_minor và đơn vị cũ; tiêu đề chỉ gồm khoảng trắng ASCII, tab
//       và xuống dòng, U+00A0, U+3000, trộn U+2003 U+FEFF, rỗng → required; 200 ký
//       tự "ệ" gửi đi, 201 lỗi, 199 chữ + emoji gửi đi; Loại tranh, Mô tả chỉ
//       khoảng trắng → null; hạn giao rỗng → null, "15/10/2026" → not_date; liên kết
//       bỏ dòng rỗng và dòng khoảng trắng, không dòng → []; đúng bảy khóa của
//       commission_input; Services không được gọi khi có lỗi. Toàn layer "Test
//       Files 16 passed (16)", "Tests 555 passed (555)" (mốc 241).
//     recorded_at: 2026-09-29T09:20:00+07:00
//   - claim: >
//       Chạy thật (iWCA D7): Routers của manage_commission, được ba trang D2 gọi, đi
//       qua Services, Adapters, http_client tới Backend.py thật, cho cả bảy lời gọi.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-29#1,
//       npm run e2e năm lần liên tiếp (09:13–09:24). Bản ghi
//       UI/evidence/walkthroughs/commission_{list,detail,form}/*-run.json.
//     result: >
//       Năm lần "32 passed". loadCommissionList (list_commissions + list_clients):
//       commission_list S1 (rỗng), S2, S3 (unreachable rồi ok). loadCommissionDetail
//       (get_commission + get_client): commission_list S4, commission_detail S1, S2
//       (khách đã lưu trữ), S3, S4 (unreachable rồi ok). openCommissionForm create
//       (list_clients + list_currencies): commission_list S1, commission_form S1, S2,
//       S6, S7 (không khách đang hoạt động). openCommissionForm edit (get_commission +
//       list_clients): commission_detail S3, commission_form S3, S4, S5.
//       create_commission: commission_form S1 (45,5 USD → "45,50 USD", đủ ô tùy chọn),
//       S6 (unreachable rồi ok). edit_commission: commission_form S3 (2.000.000 VND,
//       xóa hạn giao), S5 (giữ khách đã lưu trữ). rejected_input không gửi gì:
//       commission_form S2 (tiêu đề ba dấu cách, "1,5" VND; danh sách không đổi), S4
//       ("hai triệu"; giá không đổi). reloadClientChoices không kích hoạt được trên hệ
//       thống thật bằng thao tác bình thường (manage_commission-EXP-007).
//     recorded_at: 2026-09-29T09:24:00+07:00
//   - claim: >
//       Phiên 20, Q19-3: nhãn khách vắng mặt ở chế độ sửa là "Không tìm thấy khách
//       hàng"; mọi kiểm thử khác của workflow không đổi.
//     how: >
//       Trong UI/: npx vitest run src/logic/workflows/manage_commission; npm run check.
//     result: >
//       "Test Files 3 passed (3)", "Tests 257 passed (257)" (số ca không đổi; ca
//       "the commission's client no longer listed …" khẳng định nhãn mới). Chạy thật:
//       ba kịch bản D2 đạt 5/5 lần e2e phiên 20 (EVIDENCE của screens).
//     recorded_at: 2026-09-29T11:22:10+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow manage_commission: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4;
 * an operation made of two calls stops at the first call that is not ok, and
 * its result is that call's (ui_decomposition.md D2).
 */
import { assertNever, INPUT_FORMAT_CODE } from '../../shared/results'
import type { CallResult, InputFormatCode, ResultMessages, ViewResult } from '../../shared/results'
import type { ManageCommissionAdapters } from './adapters'
import type { ManageCommissionConfigs } from './configs'
import type {
  ChoiceView,
  ClientChoicesView,
  ClientList,
  CommissionDetail,
  CommissionDetailView,
  CommissionFormDraft,
  CommissionFormTarget,
  CommissionFormView,
  CommissionInput,
  CommissionList,
  CommissionListView,
  CommissionRowView,
  CurrencyOptions,
  Money,
  SavedCommissionView,
} from './entities'

type EndpointKey = keyof ManageCommissionConfigs['endpoints']

// An operation of two calls: the first answer that is not ok ends it.
type Step<T> = { ok: true; data: T } | { ok: false; result: ViewResult<never> }
type Failed = Exclude<CallResult<unknown>, { kind: 'ok' }>

export function createManageCommissionServices(
  adapters: ManageCommissionAdapters,
  cfg: ManageCommissionConfigs,
  messages: ResultMessages,
) {
  // Presentation decision: Vietnamese alphabetical order of client names
  // ("Ánh" right after "An"); same names keep a stable order by id.
  const collator = new Intl.Collator(cfg.collationLocale)
  const byLabel = (a: ChoiceView, b: ChoiceView) =>
    collator.compare(a.label, b.label) || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0)

  // Presentation decision: dates and times in the machine's time zone, Vietnamese format.
  const dateTime = new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat)
  const { groupSeparator, decimalSeparator, unknownCurrencySuffix } = cfg.moneyFormat

  // "1234567" → "1.234.567": groups of three digits from the right, by
  // slicing the string of digits (no arithmetic at all).
  function groupThousands(digits: string): string {
    const groups: string[] = []
    for (let end = digits.length; end > 0; end -= 3) groups.unshift(digits.slice(Math.max(0, end - 3), end))
    return groups.join(groupSeparator)
  }

  // Presentation decision: an amount in minor units, written with its
  // currency's decimals: 150000000 VND → "150.000.000", 1250 USD → "12,50",
  // 5 USD → "0,05". amount_minor is a safe integer (checked by Adapters), so
  // String() gives its exact digits; the integer and decimal parts are cut
  // from that string — never divided into a floating-point number, since the
  // amount may be as large as 2^53−1.
  function amountText(amountMinor: number, decimals: number): string {
    const digits = String(Math.abs(amountMinor)).padStart(decimals + 1, '0')
    const whole = groupThousands(digits.slice(0, digits.length - decimals))
    const fraction = decimals === 0 ? '' : `${decimalSeparator}${digits.slice(digits.length - decimals)}`
    return `${amountMinor < 0 ? '-' : ''}${whole}${fraction}`
  }

  // Presentation decision: "<amount> <code>"; a code with no known decimals
  // is shown as its raw minor units ("<amount_minor> <code> (đơn vị nhỏ nhất)").
  function moneyText(m: Money): string {
    const decimals = cfg.currencyDecimals[m.currency]
    if (decimals === undefined) return `${m.amount_minor} ${m.currency} ${unknownCurrencySuffix}`
    return `${amountText(m.amount_minor, decimals)} ${m.currency}`
  }

  // Presentation decision: a deadline YYYY-MM-DD shown as dd/mm/yyyy, cut
  // straight from the string. Never through new Date(...): a date string is
  // read as a UTC instant, which a negative time zone shows as the day before.
  function deadlineText(deadline: string | null): string {
    if (deadline === null) return cfg.texts.noDeadline
    const [y, m, d] = deadline.split('-')
    return `${d}/${m}/${y}`
  }

  // A CallResult that is not ok, to its ViewResult (i3-logic.md Step I3.4).
  // The message of a declared error is the one of that call.
  function failure(r: Failed, endpoint: EndpointKey): ViewResult<never> {
    switch (r.kind) {
      case 'declared_error':
        // Presentation decision: the message for each declared error code of each call.
        return { kind: 'rejected', origin: 'system', code: r.error.code, message: cfg.errorMessages[endpoint][r.error.code], fieldErrors: {} }
      case 'unreachable':
        return { kind: 'unreachable', message: messages.unreachable }
      case 'contract_violation':
        return { kind: 'contract_violation', message: messages.contractViolation }
      default:
        return assertNever(r)
    }
  }

  // Every CallResult to a ViewResult; ok builds the view.
  function toView<T, V>(r: CallResult<T>, endpoint: EndpointKey, ok: (data: T) => V): ViewResult<V> {
    switch (r.kind) {
      case 'ok':
        return { kind: 'ok', view: ok(r.data) }
      case 'declared_error':
      case 'unreachable':
      case 'contract_violation':
        return failure(r, endpoint)
      default:
        return assertNever(r)
    }
  }

  // The first call of a two-call operation: its data, or the operation's result.
  function step<T>(r: CallResult<T>, endpoint: EndpointKey): Step<T> {
    switch (r.kind) {
      case 'ok':
        return { ok: true, data: r.data }
      case 'declared_error':
      case 'unreachable':
      case 'contract_violation':
        return { ok: false, result: failure(r, endpoint) }
      default:
        return assertNever(r)
    }
  }

  // Presentation decision: commissions most recently updated first (the
  // contract promises no order); same instant → by commission_id. Instants are
  // compared, not strings: two timestamps may carry different UTC offsets.
  function listView(commissions: CommissionList, clients: ClientList): CommissionListView {
    const names = new Map(clients.map((c) => [c.client_id, c.display_name]))
    const rows = [...commissions]
      .sort(
        (a, b) =>
          Date.parse(b.updated_at) - Date.parse(a.updated_at) ||
          (a.commission_id < b.commission_id ? -1 : a.commission_id > b.commission_id ? 1 : 0),
      )
      .map(
        (c): CommissionRowView => ({
          commissionId: c.commission_id,
          title: c.title,
          // Presentation decision: one secondary line — the client's name joined
          // in (a client_id with no client → "Không tìm thấy khách hàng"), the
          // price, the deadline ("Hạn giao dd/mm/yyyy" or "Không có hạn").
          detailText: [
            names.get(c.client_id) ?? cfg.texts.clientNotFound,
            moneyText(c.agreed_price),
            c.deadline === null ? cfg.texts.noDeadline : `${cfg.texts.deadlinePrefix} ${deadlineText(c.deadline)}`,
          ].join(cfg.texts.rowSeparator),
        }),
      )
    return { rows, isEmpty: commissions.length === 0 }
  }

  function detailView(c: CommissionDetail, client: { name: string; archived: boolean } | null): CommissionDetailView {
    return {
      commissionId: c.commission_id,
      title: c.title,
      clientText: client === null ? cfg.texts.clientNotFound : client.archived ? `${client.name} ${cfg.texts.archivedSuffix}` : client.name,
      commissionType: c.commission_type,
      priceText: moneyText(c.agreed_price),
      deadlineText: deadlineText(c.deadline),
      description: c.description,
      referenceLinks: c.reference_links,
      createdText: dateTime.format(new Date(c.created_at)),
      updatedText: dateTime.format(new Date(c.updated_at)),
    }
  }

  // Presentation decision: the clients offered by the form — the active ones,
  // in Vietnamese order; plus, first, the commission's own client (edit mode)
  // when it is archived ("<name> (đã lưu trữ)") or no longer listed ("Không
  // tìm thấy khách hàng", Q19-3: nothing says it is archived). The contract
  // lets a commission keep an archived client. The chosen client stays
  // chosen while it is offered; otherwise nothing is chosen.
  function clientChoices(clients: ClientList, keptClientId: string | null, chosenClientId: string): ClientChoicesView {
    const active = clients.filter((c) => !c.is_archived).map((c): ChoiceView => ({ value: c.client_id, label: c.display_name })).sort(byLabel)
    const kept = keptClientId === null ? undefined : clients.find((c) => c.client_id === keptClientId)
    const extra: ChoiceView[] =
      keptClientId === null || (kept !== undefined && !kept.is_archived)
        ? []
        : [{ value: keptClientId, label: kept === undefined ? cfg.texts.clientNotFound : `${kept.display_name} ${cfg.texts.archivedSuffix}` }]
    const choices = [...extra, ...active]
    return { choices, clientId: choices.some((c) => c.value === chosenClientId) ? chosenClientId : '' }
  }

  // Presentation decision: the currencies offered when creating — those of
  // list_currencies whose decimals are known, in the order given; VND chosen
  // first when offered, otherwise the first one.
  function currencyChoices(options: CurrencyOptions): ChoiceView[] {
    return options.filter((code) => cfg.currencyDecimals[code] !== undefined).map((code) => ({ value: code, label: code }))
  }

  function createFormView(clients: ClientList, currencies: CurrencyOptions): CommissionFormView {
    const offered = currencyChoices(currencies)
    const currency = offered.some((c) => c.value === cfg.defaultCurrency) ? cfg.defaultCurrency : (offered[0]?.value ?? '')
    const choices = clientChoices(clients, null, '')
    return {
      currencies: offered,
      currencyLocked: false,
      chooseClientLabel: cfg.texts.chooseClient,
      clients: choices,
      noActiveClient: choices.choices.length === 0,
      keptClientId: null,
      commissionTypeSuggestions: cfg.commissionTypeSuggestions,
      draft: { clientId: '', title: '', commissionType: '', amount: '', currency, deadline: '', description: '', referenceLinks: '' },
    }
  }

  // A stored commission back into the raw draft it is edited from. The
  // amount is written the way it is shown, without the code ("1.500.000",
  // "12,50"): Routers reads that form back to the same amount_minor.
  function editFormView(c: CommissionDetail, clients: ClientList): CommissionFormView {
    const { currency, amount_minor } = c.agreed_price
    const draft: CommissionFormDraft = {
      clientId: c.client_id,
      title: c.title,
      commissionType: c.commission_type ?? '',
      amount: amountText(amount_minor, cfg.currencyDecimals[currency] ?? 0),
      currency,
      deadline: c.deadline ?? '',
      description: c.description ?? '',
      referenceLinks: c.reference_links.join('\n'),
    }
    return {
      // The currency is fixed at creation (manage_commission.description): only it is shown, not choosable.
      currencies: [{ value: currency, label: currency }],
      currencyLocked: true,
      chooseClientLabel: cfg.texts.chooseClient,
      clients: clientChoices(clients, c.client_id, c.client_id),
      noActiveClient: false,
      keptClientId: c.client_id,
      commissionTypeSuggestions: cfg.commissionTypeSuggestions,
      draft,
    }
  }

  return {
    // commission_list: list_commissions, then list_clients — one operation.
    async loadCommissionList(): Promise<ViewResult<CommissionListView>> {
      const commissions = step(await adapters.listCommissions(), 'listCommissions')
      if (!commissions.ok) return commissions.result
      return toView(await adapters.listClients(), 'listClients', (clients) => listView(commissions.data, clients))
    },

    // commission_detail: get_commission, then get_client of its client — one
    // operation. get_client 404 is not an error: the client is shown as not found.
    async loadCommissionDetail(commissionId: string): Promise<ViewResult<CommissionDetailView>> {
      const commission = step(await adapters.getCommission(commissionId), 'getCommission')
      if (!commission.ok) return commission.result
      const c = commission.data
      const client = await adapters.getClient(c.client_id)
      switch (client.kind) {
        case 'ok':
          return { kind: 'ok', view: detailView(c, { name: client.data.display_name, archived: client.data.is_archived }) }
        case 'declared_error':
          if (client.error.code === cfg.endpoints.getClient.labels['404']) return { kind: 'ok', view: detailView(c, null) }
          return failure(client, 'getClient')
        case 'unreachable':
        case 'contract_violation':
          return failure(client, 'getClient')
        default:
          return assertNever(client)
      }
    },

    // commission_form: create → list_clients, then list_currencies; edit →
    // get_commission, then list_clients. One operation each.
    async openCommissionForm(target: CommissionFormTarget): Promise<ViewResult<CommissionFormView>> {
      switch (target.mode) {
        case 'create': {
          const clients = step(await adapters.listClients(), 'listClients')
          if (!clients.ok) return clients.result
          return toView(await adapters.listCurrencies(), 'listCurrencies', (currencies) => createFormView(clients.data, currencies))
        }
        case 'edit': {
          const commission = step(await adapters.getCommission(target.commissionId), 'getCommission')
          if (!commission.ok) return commission.result
          return toView(await adapters.listClients(), 'listClients', (clients) => editFormView(commission.data, clients))
        }
        default:
          return assertNever(target)
      }
    },

    // input has passed the format check of Routers.
    async saveCommission(target: CommissionFormTarget, input: CommissionInput): Promise<ViewResult<SavedCommissionView>> {
      switch (target.mode) {
        case 'create':
          return toView(await adapters.createCommission(input), 'createCommission', (c) => ({ commissionId: c.commission_id, message: cfg.notices.created }))
        case 'edit':
          return toView(await adapters.editCommission(target.commissionId, input), 'editCommission', (c) => ({
            commissionId: c.commission_id,
            message: cfg.notices.edited,
          }))
        default:
          return assertNever(target)
      }
    },

    // commission_form, after a save refused with 404 or 409: the clients
    // offered again (list_clients), keeping the chosen one while it is offered.
    async reloadClientChoices(keptClientId: string | null, chosenClientId: string): Promise<ViewResult<ClientChoicesView>> {
      return toView(await adapters.listClients(), 'listClients', (clients) => clientChoices(clients, keptClientId, chosenClientId))
    },

    // The fixed rejection function for Routers (i3-logic.md, Step I3.4):
    // Routers detects, Services chooses the words — the workflow's own message
    // for the field and reason (configs.inputMessages), else the layer's.
    rejectInput(fields: Record<string, InputFormatCode>): ViewResult<never> {
      const fieldErrors = Object.fromEntries(
        Object.entries(fields).map(([field, code]) => [field, cfg.inputMessages[field]?.[code] ?? messages.input[code]]),
      )
      return { kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: messages.inputSummary, fieldErrors }
    },
  }
}

export type ManageCommissionServices = ReturnType<typeof createManageCommissionServices>
