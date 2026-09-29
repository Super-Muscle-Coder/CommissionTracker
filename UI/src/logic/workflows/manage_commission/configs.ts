/**
 * Configs of the interface workflow manage_commission. Static data only (iWCA
 * D3): no function, no environment read. Only Main and tests import values
 * from this file (R14); every other file may import its type only.
 */
export const MANAGE_COMMISSION_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '4.0.0', dataSchema: '8.0.1' },

  // Every endpoint this workflow calls (.design/ui_decomposition.md, "Chặng D2",
  // table of calls), as declared in api_contract.yaml 4.0.0. labels: every
  // declared result label → 'ok' (declared with ref) or its error code
  // (declared with code). Nothing else is declared. A path segment {name}
  // carries the input of that name (endpoint_forms.http); the other inputs
  // travel in a JSON body whose keys are the input names (POST, PUT).
  endpoints: {
    // [CONTRACT] manage_commission.list_commissions: "GET /commissions", input: none,
    //   output: 200 { ref: commission_list }, 500 { code: ERR_STORAGE_IO }.
    listCommissions: {
      method: 'GET',
      path: '/commissions',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] manage_commission.get_commission: "GET /commissions/{commission_id}",
    //   input: [commission_id], output: 200 { ref: commission_detail },
    //   404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    getCommission: {
      method: 'GET',
      path: '/commissions/{commission_id}',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] manage_commission.create_commission: "POST /commissions",
    //   input: [commission_input] → body { commission_input },
    //   output: 201 { ref: commission_detail }, 400 { code: ERR_VALIDATION },
    //   404 { code: ERR_NOT_FOUND }, 409 { code: ERR_CONFLICT }, 500 { code: ERR_STORAGE_IO }.
    createCommission: {
      method: 'POST',
      path: '/commissions',
      labels: {
        '201': 'ok',
        '400': 'ERR_VALIDATION',
        '404': 'ERR_NOT_FOUND',
        '409': 'ERR_CONFLICT',
        '500': 'ERR_STORAGE_IO',
      } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] manage_commission.edit_commission: "PUT /commissions/{commission_id}",
    //   input: [commission_id, commission_input] → body { commission_input },
    //   output: 200 { ref: commission_detail }, 400 { code: ERR_VALIDATION },
    //   404 { code: ERR_NOT_FOUND }, 409 { code: ERR_CONFLICT }, 500 { code: ERR_STORAGE_IO }.
    editCommission: {
      method: 'PUT',
      path: '/commissions/{commission_id}',
      labels: {
        '200': 'ok',
        '400': 'ERR_VALIDATION',
        '404': 'ERR_NOT_FOUND',
        '409': 'ERR_CONFLICT',
        '500': 'ERR_STORAGE_IO',
      } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] manage_commission.list_currencies: "GET /currencies", input: none,
    //   output: 200 { ref: currency_options } — the only label.
    listCurrencies: {
      method: 'GET',
      path: '/currencies',
      labels: { '200': 'ok' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] manage_client.list_clients: "GET /clients", input: none,
    //   output: 200 { ref: client_list }, 500 { code: ERR_STORAGE_IO }.
    //   This workflow's own call (ui_decomposition.md §2, I1.3): the interface
    //   workflow manage_client is not imported (R2).
    listClients: {
      method: 'GET',
      path: '/clients',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] manage_client.get_client: "GET /clients/{client_id}", input: [client_id],
    //   output: 200 { ref: client_detail }, 404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    getClient: {
      method: 'GET',
      path: '/clients/{client_id}',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
  },

  formats: {
    // [CONTRACT] data_schema.yaml 8.0.1 clause_a_common.formats.id: "UUID v4, lowercase string".
    id: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    // [CONTRACT] data_schema.yaml 8.0.1 clause_a_common.formats.timestamp:
    // "ISO 8601 with UTC offset, e.g. 2026-09-23T14:05:00+07:00" (Z is offset zero).
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    // [CONTRACT] data_schema.yaml 8.0.1 clause_a_common.formats.date:
    // "ISO 8601 calendar date, e.g. 2026-10-01".
    date: /^\d{4}-\d{2}-\d{2}$/,
    // [CONTRACT] data_schema.yaml 8.0.1 clause_a_common.types.currency_code:
    // "string (ISO 4217 alphabetic code, e.g. VND, USD)" — three capital letters.
    currencyCode: /^[A-Z]{3}$/,
  },

  limits: {
    // [CONTRACT] data_schema.yaml 8.0.1 clause_b_backend.manage_commission.input_expected.commission_input:
    //   object { client_id: id, title: string (1..200 characters, not blank),
    //   description: string|null, commission_type: string|null, agreed_price:
    //   money (amount_minor >= 0; currency in supported_currencies), deadline:
    //   date|null, reference_links: list[string] }.
    // not blank = clause_a_common.formats.not_blank: "the string still has at
    // least one character after its leading and trailing whitespace is
    // removed." Characters are code points, not UTF-16 units (the backend is
    // Python: len() counts code points).
    titleMaxLength: 200,
    // [CONTRACT] data_schema.yaml 8.0.1 clause_a_common.types.money:
    //   "amount_minor: integer (-9007199254740991..9007199254740991)", and
    //   mandatory_rules: every integer lies within ±(2^53−1). With
    //   commission_input's "amount_minor >= 0", the range of a price is
    //   0..maxAmountMinor. Kept as a string: it is compared as a BigInt, never
    //   as a floating-point number.
    maxAmountMinor: '9007199254740991',
  },

  // [UI-ONLY] Number of decimals of each currency (ISO 4217 minor unit), for
  // showing and reading amounts (ui_decomposition.md D2, "Số tiền"). VND and
  // USD are the default supported_currencies. A code missing here is shown
  // as "<amount_minor> <code> (đơn vị nhỏ nhất)" and cannot be picked in the form.
  currencyDecimals: { VND: 0, USD: 2 } as Readonly<Record<string, number>>,
  // [UI-ONLY] Currency preselected when creating a commission, when offered.
  defaultCurrency: 'VND',
  // [UI-ONLY] How an amount is written: thousands grouped with ".", decimals
  // after "," (ui_decomposition.md D2: 1.500.000 VND, 12,50 USD).
  moneyFormat: { groupSeparator: '.', decimalSeparator: ',', unknownCurrencySuffix: '(đơn vị nhỏ nhất)' },

  // [UI-ONLY] Message shown for each error code the endpoints above declare,
  // by call: the same code means different things on different calls.
  errorMessages: {
    listCommissions: { ERR_STORAGE_IO: 'Không đọc được dữ liệu đơn hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.' },
    getCommission: {
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng này.',
      ERR_STORAGE_IO: 'Không đọc được dữ liệu đơn hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    createCommission: {
      ERR_VALIDATION: 'Máy chủ không nhận dữ liệu này. Vui lòng kiểm tra lại các ô rồi lưu lại.',
      ERR_NOT_FOUND: 'Không tìm thấy khách hàng đã chọn. Hãy chọn lại.',
      ERR_CONFLICT: 'Khách hàng đã chọn đã được lưu trữ. Hãy chọn khách khác.',
      ERR_STORAGE_IO: 'Không ghi được dữ liệu đơn hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    editCommission: {
      ERR_VALIDATION: 'Máy chủ không nhận dữ liệu này. Vui lòng kiểm tra lại các ô rồi lưu lại.',
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng hoặc khách hàng đã chọn.',
      ERR_CONFLICT: 'Khách hàng đã chọn đã được lưu trữ. Hãy chọn khách khác.',
      ERR_STORAGE_IO: 'Không ghi được dữ liệu đơn hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    listCurrencies: {},
    listClients: { ERR_STORAGE_IO: 'Không đọc được danh sách khách hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.' },
    getClient: {
      ERR_NOT_FOUND: 'Không tìm thấy khách hàng.',
      ERR_STORAGE_IO: 'Không đọc được dữ liệu khách hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Message under a field that failed the format check in Routers,
  // by field (keys are the contract's field names) and reason
  // (ui_decomposition.md D2, commission_form). A pair not listed falls back
  // to ResultMessages.input.
  inputMessages: {
    client_id: { required: 'Chọn khách hàng.' },
    title: { required: 'Nhập tiêu đề đơn hàng.', violates_type_constraint: 'Tiêu đề dài tối đa 200 ký tự.' },
    'agreed_price.amount_minor': {
      required: 'Nhập giá thỏa thuận.',
      not_integer: 'Số tiền không hợp lệ.',
      violates_type_constraint: 'Số tiền quá lớn.',
    },
    'agreed_price.currency': { required: 'Chọn đơn vị tiền.', not_in_list: 'Chọn đơn vị tiền trong danh sách.' },
    deadline: { not_date: 'Chọn một ngày hợp lệ, hoặc xóa hạn giao.' },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Words of the views.
  texts: {
    // A client_id with no client in client_list (commission_list), or get_client 404 (commission_detail).
    clientNotFound: 'Không tìm thấy khách hàng',
    // Marks an archived client: in the detail, and in the form's choice list (edit mode).
    archivedSuffix: '(đã lưu trữ)',
    noDeadline: 'Không có hạn',
    // Secondary line of a commission in the list: "<client> · <price> · Hạn giao <date>".
    deadlinePrefix: 'Hạn giao',
    rowSeparator: ' · ',
    // First choice of the client list of the form: nothing chosen yet.
    chooseClient: 'Chọn khách hàng',
  },

  // [UI-ONLY] Confirmation after each write (ui_decomposition.md D2, "Gửi").
  notices: { created: 'Đã thêm đơn hàng.', edited: 'Đã lưu thay đổi.' },

  // [UI-ONLY] Suggested kinds of artwork (free text; ui_decomposition.md D2,
  // "Loại tranh"). commission_type is a free label in the contract.
  commissionTypeSuggestions: ['bán thân', 'toàn thân', 'chibi', 'chân dung', 'minh họa'] as readonly string[],

  // [UI-ONLY] Presentation decisions (.design/ui_decomposition.md §2, D2):
  // clients sorted in Vietnamese alphabetical order; dates and times shown
  // in the machine's time zone, Vietnamese format, as client_detail.
  collationLocale: 'vi',
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,
} as const

export type ManageCommissionConfigs = typeof MANAGE_COMMISSION_CONFIGS
