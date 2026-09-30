/**
 * Configs of the interface workflow record_payment. Static data only (iWCA
 * D3): no function, no environment read. Only Main and tests import values
 * from this file (R14); every other file may import its type only.
 */
export const RECORD_PAYMENT_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '4.0.0', dataSchema: '9.0.0' },

  // Every endpoint this workflow calls (.design/ui_decomposition.md, "Chặng D4",
  // table of calls), as declared in api_contract.yaml 4.0.0. labels: every
  // declared result label → 'ok' (declared with ref) or its error code
  // (declared with code). Nothing else is declared. A path segment {name}
  // carries the input of that name; a GET input that is not in the path
  // travels on the query; the other inputs travel in a JSON body whose keys
  // are the input names (endpoint_forms.http).
  endpoints: {
    // [CONTRACT] record_payment.get_balance: "GET /payments/balance/{commission_id}",
    //   input: [commission_id], output: 200 { ref: commission_balance },
    //   404 { code: ERR_NOT_FOUND }, 409 { code: ERR_OUT_OF_RANGE }, 500 { code: ERR_STORAGE_IO }.
    getBalance: {
      method: 'GET',
      path: '/payments/balance/{commission_id}',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '409': 'ERR_OUT_OF_RANGE', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] record_payment.list_for_commission: "GET /payments", input:
    //   [commission_id] (on the query), output: 200 { ref: payment_list },
    //   404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    listForCommission: {
      method: 'GET',
      path: '/payments',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] record_payment.record: "POST /payments", input: [commission_id,
    //   payment_input] → body { commission_id, payment_input }, output: 201 { ref: payment },
    //   400 { code: ERR_VALIDATION }, 404 { code: ERR_NOT_FOUND }, 409 { code: ERR_OUT_OF_RANGE },
    //   422 { code: ERR_CURRENCY_MISMATCH }, 500 { code: ERR_STORAGE_IO }.
    record: {
      method: 'POST',
      path: '/payments',
      labels: {
        '201': 'ok',
        '400': 'ERR_VALIDATION',
        '404': 'ERR_NOT_FOUND',
        '409': 'ERR_OUT_OF_RANGE',
        '422': 'ERR_CURRENCY_MISMATCH',
        '500': 'ERR_STORAGE_IO',
      } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] record_payment.void_payment: "PUT /payments/{payment_id}/void",
    //   input: [payment_id], output: 200 { ref: payment }, 404 { code: ERR_NOT_FOUND },
    //   409 { code: ERR_CONFLICT }, 500 { code: ERR_STORAGE_IO }.
    voidPayment: {
      method: 'PUT',
      path: '/payments/{payment_id}/void',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '409': 'ERR_CONFLICT', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
  },

  formats: {
    // [CONTRACT] data_schema.yaml 9.0.0 clause_a_common.formats.id: "UUID v4, lowercase string".
    id: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    // [CONTRACT] data_schema.yaml 9.0.0 clause_a_common.formats.timestamp:
    // "ISO 8601 with UTC offset, e.g. 2026-09-23T14:05:00+07:00" (Z is offset zero).
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    // [CONTRACT] data_schema.yaml 9.0.0 clause_a_common.types.currency_code:
    // "string (ISO 4217 alphabetic code, e.g. VND, USD)" — three capital letters.
    currencyCode: /^[A-Z]{3}$/,
  },

  // [CONTRACT] data_schema.yaml 9.0.0 clause_a_common.types.payment_record and
  // clause_b_backend.record_payment.input_expected.payment_input:
  //   direction: 'incoming' | 'refund'
  //   kind: 'deposit' | 'milestone' | 'final' | 'tip' | 'other'
  // Any other value received is a contract violation; the form offers only these.
  directions: ['incoming', 'refund'] as const,
  paymentKinds: ['deposit', 'milestone', 'final', 'tip', 'other'] as const,

  limits: {
    // [CONTRACT] data_schema.yaml 9.0.0 clause_a_common.types.money:
    //   "amount_minor: integer (-9007199254740991..9007199254740991)", and
    //   mandatory_rules: every integer lies within ±(2^53−1). With payment_input's
    //   "amount (amount_minor > 0)", the range of an amount sent is
    //   1..maxAmountMinor. Kept as a string: it is compared as a BigInt-like
    //   string of digits, never as a floating-point number.
    maxAmountMinor: '9007199254740991',
  },

  // [UI-ONLY] Number of decimals of each currency (ISO 4217 minor unit), for
  // showing and reading amounts (ui_decomposition.md D4, "Số tiền" → D2). The
  // workflow's own copy (R2). A code missing here is shown as "<amount_minor>
  // <code> (đơn vị nhỏ nhất)", and no payment form is offered for it.
  currencyDecimals: { VND: 0, USD: 2 } as Readonly<Record<string, number>>,
  // [UI-ONLY] How an amount is written: thousands grouped with ".", decimals
  // after "," (1.500.000 VND, 12,50 USD).
  moneyFormat: { groupSeparator: '.', decimalSeparator: ',', unknownCurrencySuffix: '(đơn vị nhỏ nhất)' },

  // [UI-ONLY] Vietnamese names of the direction and of the kind of a payment
  // (ui_decomposition.md D4, "Chiều tiền", "Loại khoản").
  directionNames: { incoming: 'Nhận tiền', refund: 'Hoàn tiền cho khách' } as Readonly<Record<string, string>>,
  kindNames: {
    deposit: 'Tiền cọc',
    milestone: 'Thanh toán theo đợt',
    final: 'Thanh toán cuối',
    tip: 'Tiền tip',
    other: 'Khác',
  } as Readonly<Record<string, string>>,
  // [UI-ONLY] Direction preselected in the form.
  defaultDirection: 'incoming',
  // [UI-ONLY] Suggested payment methods (free text; the contract's `method` is a free label).
  methodSuggestions: ['Chuyển khoản', 'MoMo', 'PayPal', 'Tiền mặt'] as readonly string[],

  // [UI-ONLY] Message shown for each error code the endpoints above declare,
  // by call: the same code means different things on different calls.
  errorMessages: {
    getBalance: {
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng này.',
      ERR_OUT_OF_RANGE: 'Số dư của đơn này vượt giới hạn tính toán.',
      ERR_STORAGE_IO: 'Không đọc được dữ liệu thanh toán trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    listForCommission: {
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng này.',
      ERR_STORAGE_IO: 'Không đọc được dữ liệu thanh toán trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    record: {
      ERR_VALIDATION: 'Máy chủ không nhận dữ liệu này. Vui lòng kiểm tra lại các ô rồi lưu lại.',
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng này.',
      ERR_OUT_OF_RANGE: 'Không ghi được: với khoản này, số dư của đơn vượt giới hạn tính toán.',
      ERR_CURRENCY_MISMATCH: 'Đơn vị tiền không khớp với đơn hàng.',
      ERR_STORAGE_IO: 'Không ghi được dữ liệu thanh toán trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    voidPayment: {
      ERR_NOT_FOUND: 'Không tìm thấy khoản thanh toán này.',
      ERR_CONFLICT: 'Khoản này đã được hủy trước đó.',
      ERR_STORAGE_IO: 'Không ghi được dữ liệu thanh toán trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Message under a field that failed the format check in Routers,
  // by field (keys are the contract's field names) and reason
  // (ui_decomposition.md D4, payment_form). The amount uses three different
  // reasons: not_number (cannot be read), not_integer (outside ±(2^53−1), the
  // definition of that reason in results.ts), violates_type_constraint
  // (amount_minor > 0). A pair not listed falls back to ResultMessages.input.
  inputMessages: {
    direction: { required: 'Chọn loại giao dịch.', not_in_list: 'Chọn loại giao dịch trong danh sách.' },
    kind: { required: 'Chọn khoản thanh toán.', not_in_list: 'Chọn khoản trong danh sách.' },
    'amount.amount_minor': {
      required: 'Nhập số tiền.',
      not_number: 'Số tiền không hợp lệ.',
      not_integer: 'Số tiền quá lớn.',
      violates_type_constraint: 'Số tiền phải lớn hơn 0.',
    },
    method: { required: 'Nhập phương thức thanh toán.' },
    paid_at: { required: 'Chọn ngày giờ nhận tiền.', not_timestamp: 'Chọn một ngày giờ hợp lệ.' },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Words of the views (ui_decomposition.md D4). In a template,
  // {amount} is a written amount, {code} a currency code.
  texts: {
    // The three lines of the balance.
    agreedTerm: 'Giá thỏa thuận',
    receivedTerm: 'Đã nhận',
    outstandingTerm: 'Còn phải thu',
    // "Còn phải thu" when nothing is left, and when more than agreed came in.
    settled: 'Đã thu đủ',
    overpaid: 'Đã thu dư {amount}',
    // First choice of the kind list of the form: nothing chosen yet.
    chooseKind: 'Chọn khoản',
    // Row of a payment: "<direction> <amount> · <kind>", then "<date time> · <method>[ · <note>]".
    rowSeparator: ' · ',
    // Added to the secondary line of a voided payment.
    voided: 'Đã hủy',
    emptyList: 'Chưa có khoản thanh toán nào',
    // A currency with no decimals in the table above: no form.
    unsupportedCurrency: 'Đơn vị tiền {code} chưa được hỗ trợ ở giao diện.',
    // In-page confirmation before a payment is voided (it cannot be undone, §7.2 principle 5).
    confirmVoid: 'Khoản đã hủy không khôi phục được. Số dư sẽ được tính lại không có khoản này.',
  },

  // [UI-ONLY] Confirmation after each write (ui_decomposition.md D4).
  notices: { recorded: 'Đã ghi khoản thanh toán.', voided: 'Đã hủy khoản thanh toán.' },

  // [UI-ONLY] Presentation decisions (.design/ui_decomposition.md §2, D4):
  // dates and times in the machine's time zone, Vietnamese format
  // ("HH:mm dd/mm/yyyy"), as client_detail.
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,
} as const

export type RecordPaymentConfigs = typeof RECORD_PAYMENT_CONFIGS
