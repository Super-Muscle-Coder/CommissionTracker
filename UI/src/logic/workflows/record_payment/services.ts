// ===WCA-CHECKPOINT-START===
// workflow: record_payment
// clause: external
// component: services
// last_updated_by: coding-agent@2026-09-30#1
// last_updated_at: 2026-09-30T09:00:00+07:00
//
// EXPERIENCES:
//   - id: record_payment-EXP-001
//     content: >
//       Bốn lời gọi (ui_decomposition.md, "Chặng D4", bảng "Lời gọi"), bảng nhãn ở configs.ts,
//       [CONTRACT] api_contract.yaml 4.0.0, chép từng dòng (kiểm thử so nguyên bảng): get_balance
//       GET /payments/balance/{commission_id} { 200 ok, 404 ERR_NOT_FOUND, 409 ERR_OUT_OF_RANGE,
//       500 ERR_STORAGE_IO }; list_for_commission GET /payments (commission_id đi trên QUERY, vì
//       không nằm trên đường dẫn: endpoint_forms.http) { 200 ok, 404, 500 }; record POST /payments,
//       thân { commission_id, payment_input } { 201 ok, 400 ERR_VALIDATION, 404, 409
//       ERR_OUT_OF_RANGE, 422 ERR_CURRENCY_MISMATCH, 500 }; void_payment PUT
//       /payments/{payment_id}/void (không thân) { 200 ok, 404, 409 ERR_CONFLICT, 500 }. Hai nhãn 409
//       của workflow mang HAI mã khác nhau và HAI câu khác nhau, phân biệt theo lời gọi (kiểm thử:
//       mã của lời gọi kia là contract_violation; hai câu khác nhau). errorMessages theo từng lời gọi;
//       kiểm thử "mọi mã có câu" duyệt 13 cặp (lời gọi, mã) từ bảng nhãn. Configs ghi Data Schema
//       9.0.0, API Contract 4.0.0.
//   - id: record_payment-EXP-002
//     content: >
//       Kiểm thân bằng Zod, mức tối thiểu của I3.3. direction = z.enum của hai giá trị, kind = z.enum
//       của năm giá trị (configs.directions, configs.paymentKinds, [CONTRACT] payment_record); giá trị
//       khác ("sale", "Deposit", "", "final ") là contract_violation. amount_minor của mọi Money là số
//       nguyên an toàn (âm cũng ok ở received_net và outstanding: hợp đồng cho outstanding âm; 2^53 và
//       −2^53 là contract_violation); note nullable; paid_at đúng formats.timestamp; danh sách rỗng và
//       khoản đã hủy là ok; trường thừa bị bỏ. Ràng buộc "amount_minor > 0" của payment_input KHÔNG
//       kiểm ở phản hồi (chỉ ở Routers khi gửi).
//   - id: record_payment-EXP-003
//     content: >
//       Quyết định trình bày ở Services (mỗi điều qua phép thử §5): (1) số tiền viết bằng chữ số, không
//       qua số thực: nhóm nghìn "." và phần lẻ ",", số chữ số lẻ theo bảng RIÊNG của workflow
//       (configs.currencyDecimals, VND 0, USD 2; R2), mã lạ hiện "<amount_minor> <mã> (đơn vị nhỏ
//       nhất)", số âm có dấu trừ; (2) số dư ba dòng "Giá thỏa thuận", "Đã nhận" (received_net), "Còn phải
//       thu" (outstanding): bằng 0 → "Đã thu đủ", âm → "Đã thu dư <số dương>". Giao diện KHÔNG cộng trừ
//       số nào: received_net và outstanding là số của backend (phép thử §5: backend đổi cách tính thì
//       giao diện không phải sửa); (3) mỗi khoản: dòng chính "<chiều tiền> <số tiền> · <loại khoản>",
//       dòng phụ "<ngày giờ> · <phương thức>[ · <ghi chú>][ · Đã hủy]", canVoid = chưa hủy; ngày giờ
//       theo giờ của máy, HH:mm dd/mm/yyyy; (4) danh sách giữ đúng thứ tự hợp đồng (mới nhất trước
//       theo paid_at), Services không sắp lại (kiểm thử đưa vào thứ tự ngược và thấy nguyên); (5) form:
//       đơn vị tiền lấy từ agreed.currency của get_balance, không chọn được; mã không có trong bảng →
//       PaymentFormView { supported: false } (không form); mặc định direction 'incoming', khoản chưa
//       chọn, ngày giờ = "bây giờ" cắt tới phút (bỏ giây, để không bao giờ muộn hơn bây giờ), phương
//       thức và ghi chú rỗng; (6) hủy khoản: chưa xác nhận → ok needs_confirmation và KHÔNG gọi
//       void_payment; đã xác nhận → gọi đúng một lần → ok voided. Xác nhận là quyết định của Services
//       (như update_progress), không của hook.
//   - id: record_payment-EXP-004
//     content: >
//       R13 cho đọc thuộc tính tên kind DUY NHẤT ở vị trí discriminant của switch. payment_record đặt
//       tên trường là kind (hợp đồng; Entities giữ tên), nên Services lấy tên loại khoản qua kindName(p):
//       một switch năm nhánh trên p.kind, mỗi nhánh trả tên của mình (không default; ESLint kiểm đủ
//       năm). Tương tự update_progress-EXP-004. Khóa lỗi 'kind' ở Routers và ở trang chỉ là CHUỖI
//       (fail('kind', …), 'kind' trong FIELD_ORDER, error('kind')), không phải truy cập thuộc tính.
//       Ở bản nháp thô đặt tên paymentKind. Không tắt luật, không ngoại lệ lint.
//   - id: record_payment-EXP-005
//     content: >
//       Routers (một lối vào cho mỗi việc trang làm, iWCA D2): loadCommissionBalance(id) (1 lời gọi),
//       loadPaymentList(id) (get_balance → list_for_commission, dừng ở lời gọi đầu tiên không ok:
//       kiểm thử khẳng định lời gọi sau không chạy), openPaymentForm(id) (1 lời gọi),
//       savePayment(target, draft) (record), voidPayment(paymentId, confirmed) (0 hoặc 1 lời gọi).
//       Routers nhận từ Main (R14) limits, currencyDecimals, directions, paymentKinds. Đọc số tiền
//       theo luật D2 (bản riêng), làm trên chuỗi chữ số. Mã lỗi định dạng của số tiền: rỗng →
//       required; sai cú pháp → not_number ("Số tiền không hợp lệ."); vượt 2^53−1 → not_integer (đúng
//       chú thích "ngoài khoảng an toàn" của results.ts, "Số tiền quá lớn."); bằng 0 →
//       violates_type_constraint ("Số tiền phải lớn hơn 0.", amount_minor > 0 viết trong type). Khác
//       manage_commission (nơi quá lớn là violates_type_constraint) vì ở đây ba lý do cùng phải có
//       câu riêng cho một ô, mà bộ mã là danh sách đóng. Phương thức: trim của JS (ASCII, U+00A0,
//       U+3000, U+2003, U+FEFF…), rỗng → required; ghi chú rỗng → null; khoảng trắng chỉ ở đầu cuối
//       bị bỏ, bên trong giữ. Vì Python strip() coi U+001C..U+001F là khoảng trắng còn JS trim() thì
//       không, ca hiếm đó backend quyết (BE-7 chưa áp dụng luật not blank: giao diện chặn trước, không
//       dựa vào việc backend từ chối).
//   - id: record_payment-EXP-006
//     content: >
//       paid_at và "bây giờ" (ui_decomposition.md D4). Routers ghép YYYY-MM-DDTHH:mm[:ss] của ô thành
//       formats.timestamp: giờ trên tường của ô, thêm ":00" nếu chưa có giây, thêm độ lệch múi giờ của
//       MÁY tại đúng ngày giờ đó (đọc từ một Date dựng theo giờ máy: new Date(2000,0,1,h,mi,s) rồi
//       setFullYear(y, m, d) để năm nhỏ hơn 100 không bị đổi thành 19xx; độ lệch = −getTimezoneOffset()
//       làm tròn tới phút). Không đổi sang UTC, nên cùng ô nhập cho cùng giờ tường ở mọi múi giờ; giờ
//       mùa hè đúng vì độ lệch lấy ở ngày đó (New York: −05:00 ngày 7/3/2026, −04:00 ngày 9/3/2026;
//       −04:00 ngày 31/10, −05:00 ngày 2/11). Ngày không có thật (30/2, tháng 13, giờ 24) →
//       not_timestamp; ngày tương lai được phép (hợp đồng không cấm). Giờ không tồn tại (nhảy giờ
//       mùa hè) và giờ trùng (lùi giờ) để Date của máy quyết: ghi nhận, không xử lý ở V1. "Bây giờ": Main
//       trao hàm now: () => Date cho createRecordPaymentServices (ở main.tsx: () => new Date()),
//       chỉ Services dùng, chỉ để dựng giá trị mặc định lúc mở form (không gọi đồng hồ rải rác).
//       Kiểm thử đặt múi giờ bằng vi.stubEnv('TZ', …) (Node áp process.env.TZ cho mọi Date ngay lúc
//       gán), và BẪY: sau vi.unstubAllEnvs Node có thể không trở lại múi giờ mặc định, nên một Date
//       dựng ở thời điểm nạp module (const NOW = new Date(...)) đọc lệch ở ca sau; kiểm thử dựng đồng
//       hồ giả BÊN TRONG hàm (const NOW = () => new Date(…)).
//   - id: record_payment-EXP-007
//     content: >
//       Hai phép kiểm nhánh cho trang, đều do kiểm thử của trang phủ: void_payment 404 và 409 là rejected
//       (system) như mọi lỗi khai báo (I3.4) với câu "Không tìm thấy khoản thanh toán này." và "Khoản này
//       đã được hủy trước đó."; cách trang tải lại sau đó ở screens-EXP-029. Giao diện không đọc
//       error_body.details.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Kiểm thử của record_payment đạt, đủ ma trận phủ I3.6 cho bốn lời gọi, cộng mọi ca bắt buộc của
//       plan phiên 22 việc 3.
//     how: >
//       Trong UI/: npm run check (vitest, http_client giả, không mạng); npx vitest run
//       src/logic/workflows/record_payment. Tệp tests/adapters.test.ts, services.test.ts,
//       routers.test.ts.
//     result: >
//       "Tests 256 passed (256)": adapters.test.ts 102 (bảng nhãn khớp từng dòng; Configs ghi data
//       9.0.0, api 4.0.0; với từng lời gọi: phương thức, đường dẫn, query, thân keyed theo tên input;
//       mọi nhãn khai báo; code khác mã; thân lỗi sai hình; unreachable ghi console.error; nhãn không
//       khai báo; thân rỗng; thiếu trường; sai kiểu; amount_minor ±2^53; một phần tử sai của danh sách;
//       trường thừa bị bỏ; hai giá trị direction và năm giá trị kind hợp lệ, bốn và bốn giá trị lạ bị từ
//       chối; outstanding âm, khoản đã hủy, note null ok; hai 409 phân biệt theo lời gọi; URL-encode).
//       services.test.ts 63 (13 cặp mã có câu duyệt từ Configs; mọi loại lỗi của từng lời gọi của từng
//       thao tác, lời gọi sau không chạy; số dư với outstanding dương, bằng 0, âm, phần lẻ USD (12,50;
//       5,05; 7,45; 0,05; −12,50), 2^53−1 VND và USD từng chữ số, mã lạ EUR; bảng ví dụ D2 (11 dòng);
//       thứ tự hợp đồng giữ nguyên; tên hai chiều và năm loại khoản; dòng phụ có ghi chú, có "Đã hủy",
//       canVoid; ngày giờ ở Asia/Ho_Chi_Minh và America/Los_Angeles; form mở với mặc định, đồng hồ do
//       Main trao (cắt phút, đọc lúc mở), đơn vị tiền lạ; hủy: chưa xác nhận không gọi, xác nhận gọi một
//       lần, 404/409/500; rejectInput). routers.test.ts 91 (bảng ví dụ D2 từng dòng cho VND và USD;
//       0, 000, 0,00 → "Số tiền phải lớn hơn 0"; 2^53−1 đi, 2^53 trở lên → "Số tiền quá lớn"; rỗng và
//       khoảng trắng (ASCII, U+00A0, U+3000, tab) → "Nhập số tiền"; sai cú pháp; phương thức chỉ gồm
//       khoảng trắng ASCII, tab, U+00A0, U+3000, U+2003, hỗn hợp → lỗi; ghi chú chỉ khoảng trắng → null;
//       paid_at: +07:00 ở Asia/Ho_Chi_Minh, −05:00 và −04:00 ở America/New_York trước và sau ngày đổi giờ
//       (độ lệch khác nhau), Europe/London, Asia/Kolkata, America/St_Johns, UTC, giây, tương lai, ngày không
//       có thật, 29/2 năm nhuận; đúng sáu khóa của payment_input; Services không được gọi khi có lỗi).
//     recorded_at: 2026-09-30T08:02:00+07:00
//   - claim: >
//       Các kiểm thử bắt buộc cắn: làm hỏng từng quyết định thì kiểm thử hỏng.
//     how: >
//       Sửa tạm một dòng của services.ts hoặc routers.ts, chạy npx vitest run
//       src/logic/workflows/record_payment (và src/screens/pages/payment_list), khôi phục nguyên
//       byte (đã kiểm bằng tìm chuỗi đã sửa).
//     result: >
//       (a) bỏ xác nhận ở voidPayment (không hỏi mà gửi ngay): "1 failed | 277 passed (278)" ("not
//       confirmed: … void_payment is NOT called"); (b) độ lệch múi giờ lấy của HÔM NAY thay cho của ngày
//       đó: "4 failed | 252 passed (256)" (hai ca New York, Europe/London, Asia/Kolkata + St_Johns).
//       Hai phép sửa nữa (cho số 0 đi qua; cho khoản đã hủy vẫn có canVoid) đã được sửa tạm nhưng lần
//       chạy kiểm thử bị hệ thống phân quyền của công cụ chặn ("Security Test Removal"), nên KHÔNG có
//       kết quả cắn cho hai phép đó; đã khôi phục cả hai (kiểm bằng tìm chuỗi). Hai quyết định đó vẫn có
//       kiểm thử riêng (routers.test.ts: sáu dòng số 0; services.test.ts: canVoid [true, false]) và
//       e2e (payment_form S1 khẳng định "Số tiền phải lớn hơn 0"; payment_list S2, S3).
//     recorded_at: 2026-09-30T08:09:00+07:00
//   - claim: >
//       Chạy thật (iWCA D7): Routers của record_payment, được payment_list, payment_form và phần Thanh
//       toán của commission_detail gọi, đi qua Services, Adapters, http_client tới Backend.py thật, cho
//       cả bốn lời gọi.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-30#1, npm run e2e năm lần
//       liên tiếp (08:51–09:07). Bản ghi UI/evidence/walkthroughs/{payment_list,payment_form,
//       commission_detail}/*-run.json.
//     result: >
//       Năm lần "54 passed". loadCommissionBalance (get_balance): commission_detail S1, S4 (unreachable
//       của phần rồi ok), S6; loadPaymentList (get_balance + list_for_commission): payment_list S1..S5
//       (S5 unreachable rồi ok), payment_form S1..S6 (sau mỗi lần lưu); openPaymentForm (get_balance):
//       payment_form S1..S6; savePayment (record): rejected_input không gửi gì ở S1; ok S2 (cọc), S3
//       (tip), S4 (hoàn tiền), S5 (USD 5,05, ngày giờ mặc định), S6 (unreachable rồi ok, ngày tương lai);
//       voidPayment: payment_list S3 ("Quay lại" không gọi void_payment; "Xác nhận" gọi một lần, số dư tính
//       lại). Số dư "Đã thu dư 2,50 USD" (payment_list S4), "Đã thu đủ" (payment_form S6). Backend thật
//       hiện chưa từ chối phương thức trống (BE-7): giao diện đã chặn trước (payment_form S1).
//     recorded_at: 2026-09-30T09:12:00+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow record_payment: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4;
 * an operation made of several calls stops at the first call that is not ok,
 * and its result is that call's (ui_decomposition.md D4).
 */
import { assertNever, INPUT_FORMAT_CODE } from '../../shared/results'
import type { CallResult, InputFormatCode, ResultMessages, ViewResult } from '../../shared/results'
import type { RecordPaymentAdapters } from './adapters'
import type { RecordPaymentConfigs } from './configs'
import type {
  BalanceView,
  ChoiceView,
  CommissionBalance,
  Money,
  Now,
  PaymentFormTarget,
  PaymentFormView,
  PaymentInput,
  PaymentList,
  PaymentListView,
  PaymentRecord,
  PaymentRowView,
  SavedPaymentView,
  VoidOutcomeView,
} from './entities'

type EndpointKey = keyof RecordPaymentConfigs['endpoints']

// An operation of several calls: the first answer that is not ok ends it.
type Step<T> = { ok: true; data: T } | { ok: false; result: ViewResult<never> }
type Failed = Exclude<CallResult<unknown>, { kind: 'ok' }>

// "{amount}" with { amount: '1.000 VND' } → "Đã thu dư 1.000 VND".
function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, key: string) => (Object.hasOwn(values, key) ? values[key] : whole))
}

// Two digits, four for a year: the parts of the value of a date-time input.
const two = (n: number) => String(n).padStart(2, '0')

export function createRecordPaymentServices(adapters: RecordPaymentAdapters, cfg: RecordPaymentConfigs, messages: ResultMessages, now: Now) {
  // Presentation decision: dates and times in the machine's time zone, Vietnamese format.
  const dateTime = new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat)
  const { groupSeparator, decimalSeparator, unknownCurrencySuffix } = cfg.moneyFormat
  const { texts } = cfg

  // "1234567" → "1.234.567": groups of three digits from the right, by
  // slicing the string of digits (no arithmetic at all).
  function groupThousands(digits: string): string {
    const groups: string[] = []
    for (let end = digits.length; end > 0; end -= 3) groups.unshift(digits.slice(Math.max(0, end - 3), end))
    return groups.join(groupSeparator)
  }

  // Presentation decision: an amount in minor units, written with its
  // currency's decimals: 150000000 VND → "150.000.000", 1250 USD → "12,50",
  // 5 USD → "0,05", −5 USD → "-0,05". amount_minor is a safe integer (checked
  // by Adapters), so String() gives its exact digits; the integer and decimal
  // parts are cut from that string — never divided into a floating-point
  // number, since the amount may be as large as 2^53−1.
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

  // Presentation decision (D4, "Số dư"): what is still owed reads "Đã thu đủ"
  // at zero and "Đã thu dư <amount>" below zero (the contract lets it go
  // negative: overpaid); above zero it is the amount.
  function outstandingText(m: Money): string {
    if (m.amount_minor === 0) return texts.settled
    if (m.amount_minor < 0) return fillTemplate(texts.overpaid, { amount: moneyText({ amount_minor: -m.amount_minor, currency: m.currency }) })
    return moneyText(m)
  }

  // The three lines of the balance, as they are shown: no arithmetic here —
  // received_net and outstanding are the backend's own numbers (the contract
  // gives them; the interface never adds payments up).
  function balanceView(b: CommissionBalance): BalanceView {
    return {
      lines: [
        { key: 'agreed', term: texts.agreedTerm, text: moneyText(b.agreed) },
        { key: 'received', term: texts.receivedTerm, text: moneyText(b.received_net) },
        { key: 'outstanding', term: texts.outstandingTerm, text: outstandingText(b.outstanding) },
      ],
    }
  }

  // Presentation decision: the Vietnamese name of a direction and of a kind;
  // a value missing from the table (not possible: Adapters checks the values)
  // is shown as is. The kind is read through a switch on the record's own
  // property, one case per value of the contract, since R13 lets a property
  // named kind be read only as the discriminant of a switch.
  function directionName(direction: string): string {
    return Object.hasOwn(cfg.directionNames, direction) ? cfg.directionNames[direction] : direction
  }
  function kindName(p: PaymentRecord): string {
    switch (p.kind) {
      case 'deposit':
        return cfg.kindNames.deposit
      case 'milestone':
        return cfg.kindNames.milestone
      case 'final':
        return cfg.kindNames.final
      case 'tip':
        return cfg.kindNames.tip
      case 'other':
        return cfg.kindNames.other
    }
  }

  // Presentation decision (D4, payment_list): "<direction> <amount> · <kind>"
  // and "<date time> · <method>[ · <note>][ · Đã hủy]". The payment's instant
  // is shown in the machine's time zone. A voided payment stays and is marked,
  // and has no "Hủy khoản này" (canVoid).
  function rowView(p: PaymentRecord): PaymentRowView {
    const sep = texts.rowSeparator
    return {
      paymentId: p.payment_id,
      text: `${directionName(p.direction)} ${moneyText(p.amount)}${sep}${kindName(p)}`,
      detailText: [dateTime.format(new Date(p.paid_at)), p.method, ...(p.note === null ? [] : [p.note]), ...(p.is_voided ? [texts.voided] : [])].join(sep),
      canVoid: !p.is_voided,
    }
  }

  // The list keeps the order the contract promises (newest first by paid_at).
  function listView(balance: CommissionBalance, payments: PaymentList): PaymentListView {
    return { balance: balanceView(balance), rows: payments.map(rowView), isEmpty: payments.length === 0, emptyText: texts.emptyList }
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

  // Presentation decision (D4, payment_form): the instant "now", from the
  // clock Main handed over, cut to the minute (seconds dropped, so it is never
  // later than now), written as the value of a date-time input in the
  // machine's time zone: YYYY-MM-DDTHH:mm.
  function nowInputValue(): string {
    const d = now()
    return `${String(d.getFullYear()).padStart(4, '0')}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`
  }

  // What the form opens with (D4): the currency of the commission fixes the
  // amount's unit; a currency with no known decimals gets no form.
  function formView(commissionId: string, balance: CommissionBalance): PaymentFormView {
    const currency = balance.agreed.currency
    if (cfg.currencyDecimals[currency] === undefined) {
      return { supported: false, unsupportedText: fillTemplate(texts.unsupportedCurrency, { code: currency }) }
    }
    const kindChoices: ChoiceView[] = cfg.paymentKinds.map((k) => ({ value: k, label: cfg.kindNames[k] }))
    return {
      supported: true,
      target: { commissionId, currency },
      currencyText: currency,
      directionChoices: cfg.directions.map((d) => ({ value: d, label: cfg.directionNames[d] })),
      kindChoices,
      chooseKindLabel: texts.chooseKind,
      methodSuggestions: cfg.methodSuggestions,
      draft: { direction: cfg.defaultDirection, paymentKind: '', amount: '', method: '', paidAtLocal: nowInputValue(), note: '' },
    }
  }

  return {
    // commission_detail, part "Thanh toán": get_balance — one call.
    async loadCommissionBalance(commissionId: string): Promise<ViewResult<BalanceView>> {
      return toView(await adapters.getBalance(commissionId), 'getBalance', balanceView)
    },

    // payment_list: get_balance, then list_for_commission — one operation.
    async loadPaymentList(commissionId: string): Promise<ViewResult<PaymentListView>> {
      const balance = step(await adapters.getBalance(commissionId), 'getBalance')
      if (!balance.ok) return balance.result
      return toView(await adapters.listForCommission(commissionId), 'listForCommission', (payments) => listView(balance.data, payments))
    },

    // payment_form: get_balance — for the currency of the commission, and to
    // know it still exists.
    async openPaymentForm(commissionId: string): Promise<ViewResult<PaymentFormView>> {
      return toView(await adapters.getBalance(commissionId), 'getBalance', (balance) => formView(commissionId, balance))
    },

    // payment_form, "Lưu" (input has passed the format check of Routers).
    async savePayment(target: PaymentFormTarget, input: PaymentInput): Promise<ViewResult<SavedPaymentView>> {
      return toView(await adapters.record(target.commissionId, input), 'record', (p) => ({ commissionId: p.commission_id, message: cfg.notices.recorded }))
    },

    // payment_list, "Hủy khoản này" (confirmed = false) or "Xác nhận" (confirmed
    // = true). Presentation decision (§7.2, principle 5): voiding cannot be
    // undone, so it is not sent until confirmed.
    async voidPayment(paymentId: string, confirmed: boolean): Promise<ViewResult<VoidOutcomeView>> {
      if (!confirmed) return { kind: 'ok', view: { outcome: 'needs_confirmation', message: texts.confirmVoid } }
      return toView(await adapters.voidPayment(paymentId), 'voidPayment', () => ({ outcome: 'voided', message: cfg.notices.voided }))
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

export type RecordPaymentServices = ReturnType<typeof createRecordPaymentServices>
