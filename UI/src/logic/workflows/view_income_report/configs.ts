/**
 * Configs of the interface workflow view_income_report. Static data only (iWCA
 * D3): no function, no environment read. Only Main and tests import values
 * from this file (R14); every other file may import its type only.
 */
export const VIEW_INCOME_REPORT_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '4.0.0', dataSchema: '9.0.1' },

  // The one endpoint this workflow calls (.design/ui_decomposition.md, "Chặng
  // D5", table of calls), as declared in api_contract.yaml 4.0.0. labels: every
  // declared result label → 'ok' (declared with ref) or its error code
  // (declared with code). Nothing else is declared. Both inputs are not in the
  // path, so they travel on the query, named after the input
  // (endpoint_forms.http).
  endpoints: {
    // [CONTRACT] view_income_report.get_income_report: "GET /reports/income",
    //   input: [period_from, period_to], output: 200 { ref: income_report },
    //   400 { code: ERR_VALIDATION }, 409 { code: ERR_OUT_OF_RANGE },
    //   500 { code: ERR_STORAGE_IO }.
    getIncomeReport: {
      method: 'GET',
      path: '/reports/income',
      labels: { '200': 'ok', '400': 'ERR_VALIDATION', '409': 'ERR_OUT_OF_RANGE', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
  },

  formats: {
    // [CONTRACT] data_schema.yaml 9.0.1 clause_a_common.formats.date:
    // "ISO 8601 calendar date, e.g. 2026-10-01". The digits are checked here; that
    // the day exists is checked by the code that reads it.
    date: /^\d{4}-\d{2}-\d{2}$/,
    // [CONTRACT] data_schema.yaml 9.0.1 clause_a_common.formats.timestamp:
    // "ISO 8601 with UTC offset, e.g. 2026-09-23T14:05:00+07:00" (Z is offset zero).
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    // [CONTRACT] data_schema.yaml 9.0.1 clause_a_common.types.currency_code:
    // "string (ISO 4217 alphabetic code, e.g. VND, USD)" — three capital letters.
    currencyCode: /^[A-Z]{3}$/,
    // [CONTRACT] data_schema.yaml 9.0.1 view_income_report.output_guaranteed.income_report:
    // "by_month: list[object { month: string (YYYY-MM), … }]".
    month: /^\d{4}-(0[1-9]|1[0-2])$/,
  },

  // [UI-ONLY] Number of decimals of each currency (ISO 4217 minor unit), for
  // showing amounts (ui_decomposition.md D5, "Số tiền" → D2). The workflow's
  // own copy (R2). A code missing here is shown as "<amount_minor> <code>
  // (đơn vị nhỏ nhất)".
  currencyDecimals: { VND: 0, USD: 2 } as Readonly<Record<string, number>>,
  // [UI-ONLY] How an amount is written: thousands grouped with ".", decimals
  // after "," (1.500.000 VND, 12,50 USD); a negative amount has "-" first.
  moneyFormat: { groupSeparator: '.', decimalSeparator: ',', unknownCurrencySuffix: '(đơn vị nhỏ nhất)' },

  // [UI-ONLY] Message shown for each error code the endpoint above declares.
  errorMessages: {
    getIncomeReport: {
      ERR_VALIDATION: 'Máy chủ không nhận khoảng thời gian này.',
      ERR_OUT_OF_RANGE: 'Tổng thu nhập vượt giới hạn tính toán, không lập được báo cáo.',
      ERR_STORAGE_IO: 'Không đọc được dữ liệu thu nhập trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Message under a field that failed the format check in Routers,
  // by field (keys are the contract's input names) and reason
  // (ui_decomposition.md D5, "Kiểm trước khi gửi"). period_to also carries the
  // rule "period_from after period_to is invalid" (data_schema.yaml 9.0.1,
  // view_income_report.description), reported as violates_type_constraint. A
  // pair not listed falls back to ResultMessages.input.
  inputMessages: {
    period_from: { required: 'Chọn ngày bắt đầu.', not_date: 'Ngày không hợp lệ.' },
    period_to: {
      required: 'Chọn ngày kết thúc.',
      not_date: 'Ngày không hợp lệ.',
      violates_type_constraint: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Words of the view (ui_decomposition.md D5). In a template,
  // {from}, {to}, {at} are written dates and times, {month}, {year} the parts
  // of a month.
  texts: {
    // Line under the page title: "Từ dd/mm/yyyy đến dd/mm/yyyy · Lập lúc HH:mm dd/mm/yyyy".
    periodLine: 'Từ {from} đến {to}',
    generatedLine: 'Lập lúc {at}',
    lineSeparator: ' · ',
    // The three numbers of one currency.
    receivedTerm: 'Thực nhận trong kỳ',
    refundedTerm: 'Đã hoàn cho khách trong kỳ',
    outstandingTerm: 'Còn phải thu (mọi đơn chưa hủy, tính tới lúc lập)',
    // Fixed line under the three numbers of every currency.
    explanation: 'Thực nhận đã trừ tiền hoàn, gồm cả tiền tip. Còn phải thu không phụ thuộc khoảng thời gian.',
    // A row of the month list.
    monthTerm: 'Tháng {month}/{year}',
    // Instead of the month list when the currency has no payment in the period.
    noPaymentsInPeriod: 'Không có khoản thanh toán nào trong kỳ.',
    // No currency at all: no payment in the period and no commission owing.
    emptyReport: 'Không có khoản thanh toán nào trong kỳ, và không có đơn nào còn phải thu.',
  },

  // [UI-ONLY] Presentation decisions (.design/ui_decomposition.md D5): the
  // time a report was made in the machine's time zone, Vietnamese format
  // ("HH:mm dd/mm/yyyy"), as every other date and time.
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,
} as const

export type ViewIncomeReportConfigs = typeof VIEW_INCOME_REPORT_CONFIGS
