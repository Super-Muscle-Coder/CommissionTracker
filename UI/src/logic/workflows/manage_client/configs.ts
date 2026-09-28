/**
 * Configs of the interface workflow manage_client. Static data only (iWCA D3):
 * no function, no environment read. Only Main and tests import values from
 * this file (R14); every other file may import its type only.
 */
export const MANAGE_CLIENT_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '4.0.0', dataSchema: '7.0.0' },

  // Every endpoint of clause_b_backend.manage_client that has external in
  // called_by (api_contract.yaml 4.0.0). labels: every declared result label
  // → 'ok' (declared with ref) or its error code (declared with code).
  // Nothing else is declared. A path segment {client_id} carries the input of
  // that name (endpoint_forms.http); the other inputs travel in a JSON body
  // whose keys are the input names (POST, PUT).
  endpoints: {
    // [CONTRACT] list_clients: "GET /clients", input: none,
    //   output: 200 { ref: client_list }, 500 { code: ERR_STORAGE_IO }.
    listClients: {
      method: 'GET',
      path: '/clients',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] get_client: "GET /clients/{client_id}", input: [client_id],
    //   output: 200 { ref: client_detail }, 404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    getClient: {
      method: 'GET',
      path: '/clients/{client_id}',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] create_client: "POST /clients", input: [client_input] → body { client_input },
    //   output: 201 { ref: client_detail }, 400 { code: ERR_VALIDATION }, 500 { code: ERR_STORAGE_IO }.
    createClient: {
      method: 'POST',
      path: '/clients',
      labels: { '201': 'ok', '400': 'ERR_VALIDATION', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] edit_client: "PUT /clients/{client_id}", input: [client_id, client_input] → body { client_input },
    //   output: 200 { ref: client_detail }, 400 { code: ERR_VALIDATION }, 404 { code: ERR_NOT_FOUND },
    //   500 { code: ERR_STORAGE_IO }.
    editClient: {
      method: 'PUT',
      path: '/clients/{client_id}',
      labels: { '200': 'ok', '400': 'ERR_VALIDATION', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] set_client_archived: "PUT /clients/{client_id}/archived", input: [client_id, is_archived]
    //   → body { is_archived }, output: 200 { ref: client_detail }, 400 { code: ERR_VALIDATION },
    //   404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    setClientArchived: {
      method: 'PUT',
      path: '/clients/{client_id}/archived',
      labels: { '200': 'ok', '400': 'ERR_VALIDATION', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
  },

  formats: {
    // [CONTRACT] data_schema.yaml 7.0.0 clause_a_common.formats.id: "UUID v4, lowercase string".
    id: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    // [CONTRACT] data_schema.yaml 7.0.0 clause_a_common.formats.timestamp:
    // "ISO 8601 with UTC offset, e.g. 2026-09-23T14:05:00+07:00" (Z is offset zero).
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
  },

  limits: {
    // [CONTRACT] data_schema.yaml 7.0.0 clause_b_backend.manage_client.input_expected.client_input:
    //   object { display_name: string (1..120 characters, not blank),
    //   contacts: list[object { channel: string (1.. characters, not blank),
    //   value: string (1.. characters, not blank) }], note: string|null }.
    // not blank = clause_a_common.formats.not_blank: "the string still has at
    // least one character after its leading and trailing whitespace is
    // removed. It is a check only: the value is stored and returned exactly
    // as given." Routers checks not blank on these three fields (no value is
    // needed for it) and the length below. Characters are code points, not
    // UTF-16 units (the backend is Python: len() counts code points).
    displayNameMaxLength: 120,
  },

  // [UI-ONLY] Message shown for each error code the endpoints above declare.
  errorMessages: {
    ERR_STORAGE_IO: 'Không đọc hoặc ghi được dữ liệu khách hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    ERR_VALIDATION: 'Ứng dụng không nhận dữ liệu này. Vui lòng kiểm tra lại các ô rồi lưu lại.',
    ERR_NOT_FOUND: 'Không tìm thấy khách hàng này.',
  } as Readonly<Record<string, string>>,

  // [UI-ONLY] Message under a field that failed the format check in Routers,
  // by field (row index removed: contacts.2.value → contacts.value) and
  // reason. A pair not listed falls back to ResultMessages.input.
  inputMessages: {
    displayName: {
      required: 'Nhập tên khách hàng.',
      violates_type_constraint: 'Tên khách hàng dài tối đa 120 ký tự.',
    },
    'contacts.channel': { required: 'Nhập kênh liên hệ, hoặc bỏ hàng này.' },
    'contacts.value': { required: 'Nhập thông tin liên hệ, hoặc bỏ hàng này.' },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Status of a client, as the artist says it.
  statusText: { active: 'Đang hoạt động', archived: 'Đã lưu trữ' },

  // [UI-ONLY] Confirmation after each write. Archiving says what it changes:
  // a commission cannot be created for an archived client (data_schema.yaml
  // 7.0.0 manage_commission.description; ui_decomposition.md §5 client_detail).
  notices: {
    created: 'Đã thêm khách hàng.',
    edited: 'Đã lưu thay đổi.',
    archived: 'Đã lưu trữ. Khách này sẽ không có trong danh sách chọn khi tạo đơn mới; đơn cũ không bị ảnh hưởng.',
    unarchived: 'Đã bỏ lưu trữ. Khách này lại có trong danh sách chọn khi tạo đơn mới.',
  },

  // [UI-ONLY] Suggested channels of a contact (free text; ui_decomposition.md
  // §5 client_form). client_input.contacts.channel is a free label in the contract.
  channelSuggestions: ['email', 'facebook', 'instagram', 'discord', 'zalo', 'x'] as readonly string[],

  // [UI-ONLY] Presentation decisions (.design/ui_decomposition.md §2, §5):
  // names sorted in Vietnamese alphabetical order (not the backend's
  // casefold order, where "Ánh" comes after "z"); dates and times shown in
  // the machine's time zone, Vietnamese format; a contact shown as
  // "channel: value".
  collationLocale: 'vi',
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,
  contactSeparator: ': ',
} as const

export type ManageClientConfigs = typeof MANAGE_CLIENT_CONFIGS
