// ===WCA-CHECKPOINT-START===
// workflow: view_income_report
// clause: external
// component: services
// last_updated_by: coding-agent@2026-09-30#3
// last_updated_at: 2026-10-01T20:20:00+07:00
//
// EXPERIENCES:
//   - id: view_income_report-EXP-001
//     content: >
//       Một lời gọi (ui_decomposition.md, "Chặng D5", bảng "Lời gọi"), bảng nhãn ở configs.ts, [CONTRACT]
//       api_contract.yaml 4.0.0, chép từng dòng (kiểm thử so nguyên bảng): get_income_report GET
//       /reports/income { 200 ok, 400 ERR_VALIDATION, 409 ERR_OUT_OF_RANGE, 500 ERR_STORAGE_IO }. Hai đầu vào
//       period_from, period_to không nằm trên đường dẫn và đây là GET, nên đi trên QUERY, đặt tên theo đầu vào
//       (endpoint_forms.http); không có thân. 400 và 409 có HAI câu khác nhau (kiểm thử). errorMessages theo
//       lời gọi như record_payment; kiểm thử "mọi mã có câu" duyệt từ bảng nhãn. Configs ghi Data Schema 9.0.1,
//       API Contract 4.0.0. Workflow không gọi địa chỉ nào khác (tìm trong src và tests: không có đường dẫn
//       nào ngoài /reports/income trong Configs của nó).
//   - id: view_income_report-EXP-002
//     content: >
//       Kiểm thân bằng Zod, mức tối thiểu của I3.3. period_from, period_to: formats.date VÀ phải là một ngày có
//       thật (30/2, tháng 13, năm 0000 đều là contract_violation; isCalendarDate); generated_at: formats.timestamp
//       và Date.parse đọc được; currency: currency_code (ba chữ hoa; mã lạ như EUR vẫn ok, vì hình thức là của
//       hợp đồng còn bảng chữ số lẻ là của giao diện); month: YYYY-MM (tháng 01..12); mọi *_minor, kể cả của
//       by_month, là số nguyên an toàn (±(2^53−1) ok, 2^53 là contract_violation); refunded_minor >= 0 (âm là
//       contract_violation); received_net_minor và outstanding_minor âm thì ok (hợp đồng cho giữ dấu). Thứ tự của
//       currencies và by_month KHÔNG kiểm, không sắp lại (plan việc 3); currencies rỗng và by_month rỗng là ok;
//       trường thừa ở ba cấp bị bỏ. Không kiểm period_from <= period_to ở phản hồi (hợp đồng không hứa điều đó
//       với phía nhận ngoài việc gửi đi).
//   - id: view_income_report-EXP-003
//     content: >
//       Quyết định trình bày ở Services (mỗi điều qua phép thử §5): (1) số tiền viết bằng chữ số, không qua số
//       thực, bảng chữ số lẻ RIÊNG của workflow (configs.currencyDecimals, VND 0, USD 2; R2): nhóm nghìn ".", phần
//       lẻ ",", số âm có dấu trừ ở đầu ("-500.000 VND", "-7,55 USD"), mã lạ hiện "<amount_minor> <mã> (đơn vị nhỏ
//       nhất)"; ±(2^53−1) in đủ chữ số; (2) tháng "YYYY-MM" → "Tháng M/YYYY" (2026-09 → "Tháng 9/2026", 2026-12 →
//       "Tháng 12/2026"), ngày "YYYY-MM-DD" → "dd/mm/yyyy", cả hai CẮT TỪ CHUỖI, không qua Date (Date đọc chuỗi ngày
//       như thời điểm UTC và có thể nêu ngày khác); (3) generated_at → "HH:mm dd/mm/yyyy" theo giờ của máy (kiểm thử
//       ở Asia/Ho_Chi_Minh và America/Los_Angeles); (4) dòng phụ "Từ … đến … · Lập lúc …" lấy khoảng từ KẾT QUẢ
//       (period_from, period_to của báo cáo), không từ ô nhập; (5) ba dòng số của mỗi đơn vị tiền đúng số của
//       backend, KHÔNG cộng, KHÔNG cộng các đơn vị tiền với nhau, không đổi "Còn phải thu" âm thành câu chữ ("Đã thu
//       dư" là của MỘT đơn ở record_payment, không phải của tổng; ở đây chỉ có dấu trừ, đúng D5); (6) các phần theo
//       đúng thứ tự nhận (mã tiền), các dòng tháng theo đúng thứ tự nhận (cũ nhất trước), không sắp lại; (7)
//       by_month rỗng → months [] kèm câu "Không có khoản thanh toán nào trong kỳ."; currencies rỗng → isEmpty
//       kèm câu của trạng thái rỗng. Kết quả không ok KHÔNG mang báo cáo nào (kiểm thử: ViewResult không có trường
//       view), nên trang không thể để số cũ cạnh lỗi nếu nó chỉ hiện kết quả gần nhất.
//   - id: view_income_report-EXP-004
//     content: >
//       Khoảng mặc định và nguồn "bây giờ" (D5). Services nhận now: () => Date do Main trao (main.tsx:
//       () => new Date(), một hàm riêng của workflow, không dùng chung với record_payment, R2); chỉ defaultPeriod()
//       gọi nó, đúng một lần mỗi lần gọi, không nơi nào khác trong workflow đọc đồng hồ. Đọc NĂM, THÁNG, NGÀY bằng
//       getFullYear/getMonth/getDate (giờ của máy), không phải getUTC* hay toISOString: 00:30 ngày 1/1 giờ Việt Nam
//       (17:30 ngày 31/12 UTC) cho 2026-01-01 → 2026-01-01; 20:00 ngày 31/12 ở Los Angeles (đã là 1/1 theo UTC) cho
//       2026-01-01 → 2026-12-31. Phép cắn (a): đổi sang getUTC* làm hỏng 3 ca (1/1, ca Việt Nam, ca Los Angeles).
//       BẪY kế thừa từ record_payment-EXP-006: kiểm thử dựng Date BÊN TRONG hàm (() => new Date(…)), không ở mức
//       module, vì vi.stubEnv('TZ') áp cho mọi Date ngay lúc gán và có thể không trở lại múi giờ mặc định.
//   - id: view_income_report-EXP-005
//     content: >
//       Routers có HAI lối vào (plan nói "mở trang" và "xem báo cáo"; tôi tách "mở trang" thành phần mặc định và
//       phần tải): defaultPeriod() (đồng bộ, trả hai giá trị thô của ô) và viewIncomeReport(draft). Lý do tách: một
//       ViewResult không ok không mang được hai ngày mặc định, nên nếu "mở trang" là một thao tác duy nhất trả
//       ViewResult thì khi tải lỗi hai ô sẽ trống và người dùng phải gõ lại; theo D5 "bấm Xem báo cáo để thử lại" thì
//       hai ô phải còn giá trị. Trang lấy bản nháp đầu từ defaultPeriod() lúc vẽ lần đầu (nên lần vẽ đầu đã có hai
//       ô) và tải lần đầu bằng chính viewIncomeReport(bản nháp đó), cùng đường với nút. Kiểm định dạng ở Routers
//       (bản sao của hợp đồng, không có luật [UI-ONLY] nào): ô rỗng → required ("Chọn ngày bắt đầu/kết thúc"); sai
//       dạng (kể cả năm 5 chữ số "20260-01-01") hoặc ngày không có thật (30/2, 29/2 năm thường, tháng 13, năm
//       0000) → not_date ("Ngày không hợp lệ"); ngày bắt đầu sau ngày kết thúc → violates_type_constraint Ở Ô
//       "Đến ngày" ("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu"); hai ngày bằng nhau hợp lệ. Khi một ô đã sai
//       hoặc rỗng thì KHÔNG xét thứ tự (chỉ báo ô đó). So sánh thứ tự bằng so sánh chuỗi, đúng vì hai bên đều là
//       ngày có thật với năm bốn chữ số.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Kiểm thử của view_income_report đạt, đủ ma trận phủ I3.6 cho get_income_report, cộng mọi ca bắt buộc
//       của plan phiên 24 việc 3.
//     how: >
//       Trong UI/: npm run check (vitest, http_client giả, không mạng); npx vitest run
//       src/logic/workflows/view_income_report. Tệp tests/adapters.test.ts, services.test.ts, routers.test.ts.
//     result: >
//       adapters 101 đạt (bảng nhãn khớp từng dòng; Configs ghi data 9.0.1, api 4.0.0; yêu cầu GET
//       /reports/income với hai đầu vào trên query, không thân; ok; ba nhãn lỗi đúng mã, sai mã, thân lỗi sai
//       hình; unreachable ghi console.error; nhãn không khai báo 404/422/201; thân rỗng; từng trường thiếu hoặc
//       sai kiểu ở ba cấp; *_minor ±2^53 và 2^53 làm tròn; ±(2^53−1) ok; refunded_minor âm; ngày, thời điểm, mã
//       tiền, tháng sai dạng và ngày không có thật; trường thừa; một phần tử sai của mỗi danh sách; thứ tự giữ
//       nguyên). services 43 đạt (bốn loại CallResult; 400 khác 409; mã có câu duyệt từ Configs; lỗi không mang
//       báo cáo; khoảng mặc định ở 1/1, 31/12, năm nhuận, ca 00:30 ngày 1/1 giờ Việt Nam, ca Los Angeles; số tiền
//       âm, USD lẻ, mã lạ EUR, ±(2^53−1) VND và USD; tháng 2026-09 và 2026-12; ngày và giờ lập theo múi giờ; hai
//       đơn vị tiền giữ thứ tự; by_month rỗng; currencies rỗng; rejectInput). routers 35 đạt (ô rỗng, năm 5 chữ
//       số, 30/2, 29/2 năm thường, năm 0000, bắt đầu sau kết thúc lỗi ở period_to, hai ngày bằng nhau hợp lệ,
//       Services không được gọi khi có lỗi). Toàn layer: "Tests 1303 passed" (mốc 1100).
//     recorded_at: 2026-10-01T20:14:00+07:00
//   - claim: >
//       Các quyết định chính có kiểm thử cắn: làm hỏng thì kiểm thử hỏng.
//     how: >
//       (a) services.ts defaultPeriod đọc getUTCFullYear/getUTCMonth/getUTCDate thay cho giờ máy; npx vitest run
//       services.test.ts; khôi phục. (b) use_income_report.ts giữ báo cáo cũ khi có lỗi (setReport((old) => old
//       ?? r)); npx vitest run src/screens/pages/income_report; khôi phục. Cả hai phép đổi giá trị, khôi phục
//       nguyên byte (kiểm bằng tìm chuỗi đã sửa).
//     result: >
//       (a) "3 failed | 40 passed (43)": 1 January, ca Việt Nam 00:30, ca Los Angeles 20:00. (b) "6 failed |
//       17 passed (23)": lỗi đầu tiên khi mở, thay báo cáo bằng báo cáo mới, ok sau lỗi nhập, unreachable,
//       contract_violation, và chặn gửi hai lần. Sau khôi phục: 202 đạt (logic 179 + trang 23).
//     recorded_at: 2026-10-01T20:00:00+07:00
//   - claim: >
//       Chạy thật (iWCA D7): Routers của view_income_report, được trang income_report gọi, đi qua Services,
//       Adapters, http_client tới Backend.py thật, cho cả hai lối vào.
//     how: >
//       Desktop đã build. Trong UI/: CT_WALKTHROUGH_RUNNER=coding-agent@2026-09-30#3, npm run e2e năm lần liên
//       tiếp (19:57–20:10), spec income_report riêng 10 lần liên tiếp. Bản ghi UI/evidence/walkthroughs/
//       income_report/income_report-run.json.
//     result: >
//       Năm lần "59 passed". defaultPeriod: income_report S1 (mở trang, hai ô = 1/1 năm nay và hôm nay);
//       viewIncomeReport: S1 (tự tải khi mở, rồi khoảng 01/08–30/09/2026), S2 (thu hẹp), S3 (khoảng 2025 không
//       khoản nào), S4 (rejected_input, không gửi gì: số yêu cầu tới /reports/income không đổi), S5 (unreachable
//       rồi ok). Số liệu so với backend thật: USD 20,05 / 0,00 / -7,55, VND 5.100.000 / 500.000 / 6.000.000.
//     recorded_at: 2026-10-01T20:12:00+07:00
//
// NOTES:
//   - content: >
//       Câu hỏi cho Orchestrator (không chặn): luật "ngày bắt đầu sau ngày kết thúc" nằm ở phần description của
//       view_income_report trong data_schema.yaml 9.0.1 ("period_from after period_to is invalid"), không nằm
//       trong `type` của đầu vào; iWCA §5 chỉ cho kiểm điều viết trong `type`. Tôi theo D5 (đặc tả ghi rõ đây là
//       "bản sao của luật hợp đồng, không phải [UI-ONLY]"). Nếu Orchestrator muốn coi đó là kiểm ngoài `type`, cần
//       chốt lại ở D5 hoặc thêm vào `type`; backend đã trả 400 ERR_VALIDATION cho đúng ca này (đo thật), nên
//       nếu bỏ luật ở giao diện thì người dùng vẫn thấy một câu lỗi ("Máy chủ không nhận khoảng thời gian này.").
//     written_at: 2026-09-30
//   - content: >
//       Năm 0000 bị coi là ngày không có thật cả ở Routers lẫn Adapters: Python date không có năm 0 (MINYEAR = 1),
//       backend sẽ trả 400. Hợp đồng chỉ ghi "ISO 8601 calendar date"; đây là cách đọc hẹp có chủ đích để lỗi
//       hiện ở ô thay vì thành "Máy chủ không nhận". Không ảnh hưởng người dùng thật.
//     written_at: 2026-09-30
// ===WCA-CHECKPOINT-END===
/**
 * Services of the interface workflow view_income_report: the only place of the
 * workflow that decides, and only presentation decisions (iwca_theory.md §5).
 * Every CallResult becomes a ViewResult by the table of i3-logic.md Step I3.4
 * (.design/ui_decomposition.md, "Chặng D5").
 */
import { assertNever, INPUT_FORMAT_CODE } from '../../shared/results'
import type { CallResult, InputFormatCode, ResultMessages, ViewResult } from '../../shared/results'
import type { ViewIncomeReportAdapters } from './adapters'
import type { ViewIncomeReportConfigs } from './configs'
import type { CurrencySectionView, IncomeCurrency, IncomeLineView, IncomePeriod, IncomePeriodDraft, IncomeReport, IncomeReportView, Now } from './entities'

type EndpointKey = keyof ViewIncomeReportConfigs['endpoints']

// "{from}" with { from: '01/01/2026' } → "01/01/2026".
function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, key: string) => (Object.hasOwn(values, key) ? values[key] : whole))
}

// Digits padded to a width: the parts of a date.
const pad = (n: number, width: number) => String(n).padStart(width, '0')

export function createViewIncomeReportServices(adapters: ViewIncomeReportAdapters, cfg: ViewIncomeReportConfigs, messages: ResultMessages, now: Now) {
  // Presentation decision: the time a report was made, in the machine's time zone, Vietnamese format.
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
  // 5 USD → "0,05", −500000 VND → "-500.000". amount_minor is a safe integer
  // (checked by Adapters), so String() gives its exact digits; the integer and
  // decimal parts are cut from that string — never divided into a
  // floating-point number, since an amount may be as large as 2^53−1.
  function amountText(amountMinor: number, decimals: number): string {
    const digits = String(Math.abs(amountMinor)).padStart(decimals + 1, '0')
    const whole = groupThousands(digits.slice(0, digits.length - decimals))
    const fraction = decimals === 0 ? '' : `${decimalSeparator}${digits.slice(digits.length - decimals)}`
    return `${amountMinor < 0 ? '-' : ''}${whole}${fraction}`
  }

  // Presentation decision: "<amount> <code>"; a code with no known decimals
  // is shown as its raw minor units ("<amount_minor> <code> (đơn vị nhỏ nhất)").
  function moneyText(amountMinor: number, currency: string): string {
    const decimals = cfg.currencyDecimals[currency]
    if (decimals === undefined) return `${amountMinor} ${currency} ${unknownCurrencySuffix}`
    return `${amountText(amountMinor, decimals)} ${currency}`
  }

  // Presentation decision: YYYY-MM-DD → dd/mm/yyyy, cut straight from the
  // string (a Date would read it as an instant in UTC and could name another day).
  function dateText(isoDate: string): string {
    return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}/${isoDate.slice(0, 4)}`
  }

  // Presentation decision: YYYY-MM → "Tháng M/YYYY" (month without a leading
  // zero), cut straight from the string.
  function monthText(isoMonth: string): string {
    return fillTemplate(texts.monthTerm, { month: String(Number(isoMonth.slice(5, 7))), year: isoMonth.slice(0, 4) })
  }

  // The lines of one currency, as they are shown: no arithmetic here — the
  // three numbers and the months are the backend's own (the contract gives
  // them; the interface never adds payments up, never adds currencies up).
  function sectionView(c: IncomeCurrency): CurrencySectionView {
    const lines: IncomeLineView[] = [
      { key: 'received', term: texts.receivedTerm, text: moneyText(c.received_net_minor, c.currency) },
      { key: 'refunded', term: texts.refundedTerm, text: moneyText(c.refunded_minor, c.currency) },
      { key: 'outstanding', term: texts.outstandingTerm, text: moneyText(c.outstanding_minor, c.currency) },
    ]
    // The months are kept in the order received (oldest first): not sorted here.
    const months = c.by_month.map((m) => ({ key: m.month, term: monthText(m.month), text: moneyText(m.received_net_minor, c.currency) }))
    return { currency: c.currency, lines, explanation: texts.explanation, months, noMonthsText: texts.noPaymentsInPeriod }
  }

  // The sections keep the order received (by currency code, the contract's).
  // The period shown is the report's own (period_from, period_to), not the one typed.
  function reportView(r: IncomeReport): IncomeReportView {
    const period = fillTemplate(texts.periodLine, { from: dateText(r.period_from), to: dateText(r.period_to) })
    const generated = fillTemplate(texts.generatedLine, { at: dateTime.format(new Date(r.generated_at)) })
    return {
      periodText: [period, generated].join(texts.lineSeparator),
      sections: r.currencies.map(sectionView),
      isEmpty: r.currencies.length === 0,
      emptyText: texts.emptyReport,
    }
  }

  // A CallResult that is not ok, to its ViewResult (i3-logic.md Step I3.4).
  function toView<T, V>(r: CallResult<T>, endpoint: EndpointKey, ok: (data: T) => V): ViewResult<V> {
    switch (r.kind) {
      case 'ok':
        return { kind: 'ok', view: ok(r.data) }
      case 'declared_error':
        // Presentation decision: the message for each declared error code of the call.
        return { kind: 'rejected', origin: 'system', code: r.error.code, message: cfg.errorMessages[endpoint][r.error.code], fieldErrors: {} }
      case 'unreachable':
        return { kind: 'unreachable', message: messages.unreachable }
      case 'contract_violation':
        return { kind: 'contract_violation', message: messages.contractViolation }
      default:
        return assertNever(r)
    }
  }

  return {
    // income_report, when the page opens: the period it starts with — from the
    // 1st of January of the current year to today, by the date of the
    // machine's clock (its time zone, not UTC), from the clock Main handed over
    // (ui_decomposition.md D5). Returned as the two input values.
    defaultPeriod(): IncomePeriodDraft {
      const today = now()
      const year = pad(today.getFullYear(), 4)
      return {
        periodFrom: `${year}-01-01`,
        periodTo: `${year}-${pad(today.getMonth() + 1, 2)}-${pad(today.getDate(), 2)}`,
      }
    },

    // income_report, "Xem báo cáo" (the period has passed the format check of Routers).
    async loadIncomeReport(period: IncomePeriod): Promise<ViewResult<IncomeReportView>> {
      return toView(await adapters.getIncomeReport(period), 'getIncomeReport', reportView)
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

export type ViewIncomeReportServices = ReturnType<typeof createViewIncomeReportServices>
