/**
 * Configs of the interface workflow send_reminder. Static data only (iWCA D3):
 * no function, no environment read. Only Main and tests import values from
 * this file (R14); every other file may import its type only.
 */
export const SEND_REMINDER_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '4.0.0', dataSchema: '9.0.2' },

  // Every endpoint this workflow calls (.design/ui_decomposition.md, "Chặng D6",
  // table of calls), as declared in api_contract.yaml 4.0.0. labels: every
  // declared result label → 'ok' (declared with ref) or its error code
  // (declared with code). Nothing else is declared. A path segment {name}
  // carries the input of that name; a GET input that is not in the path
  // travels on the query; the other inputs travel in a JSON body whose keys
  // are the input names (endpoint_forms.http). check_due is deliberately absent:
  // its called_by is [reminder_ticker] only, the interface never calls it.
  endpoints: {
    // [CONTRACT] send_reminder.list_pending: "GET /reminders/pending", input: none,
    //   output: 200 { ref: pending_notifications }, 500 { code: ERR_STORAGE_IO }.
    listPending: {
      method: 'GET',
      path: '/reminders/pending',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] send_reminder.acknowledge: "PUT /reminders/{notification_id}/ack",
    //   input: [notification_id], output: 200 { ref: notification_ack } (acknowledging
    //   twice is not an error), 404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    acknowledge: {
      method: 'PUT',
      path: '/reminders/{notification_id}/ack',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] send_reminder.get_settings: "GET /reminders/settings", input: none,
    //   output: 200 { ref: reminder_settings }, 500 { code: ERR_STORAGE_IO }.
    getSettings: {
      method: 'GET',
      path: '/reminders/settings',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] send_reminder.edit_settings: "PUT /reminders/settings", input:
    //   [reminder_settings_input] → body { reminder_settings_input }, output: 200
    //   { ref: reminder_settings }, 400 { code: ERR_VALIDATION }, 500 { code: ERR_STORAGE_IO }.
    editSettings: {
      method: 'PUT',
      path: '/reminders/settings',
      labels: { '200': 'ok', '400': 'ERR_VALIDATION', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
  },

  formats: {
    // [CONTRACT] data_schema.yaml 9.0.2 clause_a_common.formats.id: "UUID v4, lowercase string".
    id: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    // [CONTRACT] data_schema.yaml 9.0.2 clause_a_common.formats.timestamp:
    // "ISO 8601 with UTC offset, e.g. 2026-09-23T14:05:00+07:00" (Z is offset zero).
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    // [CONTRACT] data_schema.yaml 9.0.2 clause_a_common.formats.date:
    // "ISO 8601 calendar date, e.g. 2026-10-01".
    date: /^\d{4}-\d{2}-\d{2}$/,
    // [CONTRACT] data_schema.yaml 9.0.2 clause_a_common.types.reminder_settings_record,
    // periodic.at_time: "string (HH:MM, local time)" — 00:00 .. 23:59, two digits each.
    atTime: /^([01][0-9]|2[0-3]):[0-5][0-9]$/,
  },

  // [CONTRACT] data_schema.yaml 9.0.2 clause_a_common.types.reminder_settings_record
  // and types.reminder_notification_record: the closed lists of values.
  //   periodic.unit: 'days' | 'weeks'; lead_times[].unit: 'hours' | 'days';
  //   reminder_notification_record.kind: 'periodic_digest' | 'deadline'.
  // Any other value received is a contract violation; the form offers only these.
  periodicUnits: ['days', 'weeks'] as const,
  leadUnits: ['hours', 'days'] as const,
  notificationKinds: ['periodic_digest', 'deadline'] as const,

  limits: {
    // [CONTRACT] data_schema.yaml 9.0.2 clause_a_common.mandatory_rules: every
    // integer lies within ±(2^53−1). Kept as a string: it is compared as a
    // string of digits, never as a floating-point number.
    maxSafeInteger: '9007199254740991',
    // [CONTRACT] reminder_settings_record, periodic.weekday: "integer|null (1..7, ISO weekday;
    // required when unit = 'weeks', null when unit = 'days')".
    weekday: { min: 1, max: 7 },
    // [CONTRACT] reminder_settings_record, deadline.lead_times: "1..5 entries; 1 day = 24
    // hours; each at most 365 days / 8760 hours; no two entries of the same duration".
    leadTimes: { min: 1, max: 5, maxDays: 365, maxHours: 8760, hoursPerDay: 24 },
  },

  // [UI-ONLY] Vietnamese names (ui_decomposition.md D6, "Luật trình bày chung").
  // Weekday names are keyed by the ISO number written as text ('1' .. '7').
  weekdayNames: {
    '1': 'Thứ Hai',
    '2': 'Thứ Ba',
    '3': 'Thứ Tư',
    '4': 'Thứ Năm',
    '5': 'Thứ Sáu',
    '6': 'Thứ Bảy',
    '7': 'Chủ nhật',
  } as Readonly<Record<string, string>>,
  // [CONTRACT] reminder_settings_record, periodic.weekday: "required when unit = 'weeks'" — the unit the weekday goes with.
  weekdayUnit: 'weeks',
  periodicUnitNames: { days: 'ngày', weeks: 'tuần' } as Readonly<Record<string, string>>,
  leadUnitNames: { hours: 'giờ', days: 'ngày' } as Readonly<Record<string, string>>,
  // [UI-ONLY] What the form starts with where the contract's own default does not decide:
  // the weekday chosen when the unit becomes "tuần" with none chosen yet (Thứ Hai), the
  // row added by "Thêm mốc nhắc" when the list is empty ("1 ngày"), the unit of a row
  // added to a list that already has one (the amount is left empty).
  defaults: { weekday: '1', newLeadTime: { amount: '1', unit: 'days' }, newLeadTimeFollowing: { amount: '', unit: 'days' } },

  // [UI-ONLY] Message shown for each error code the endpoints above declare,
  // by call: the same code means different things on different calls.
  errorMessages: {
    listPending: {
      ERR_STORAGE_IO: 'Không đọc được danh sách nhắc việc trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    acknowledge: {
      ERR_NOT_FOUND: 'Nhắc việc này không còn trong danh sách.',
      ERR_STORAGE_IO: 'Không ghi được dữ liệu nhắc việc trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    getSettings: {
      ERR_STORAGE_IO: 'Không đọc được cài đặt nhắc việc trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    editSettings: {
      ERR_VALIDATION: 'Máy chủ không nhận cài đặt này. Vui lòng kiểm tra lại các ô rồi lưu lại.',
      ERR_STORAGE_IO: 'Không ghi được cài đặt nhắc việc trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Message under a field that failed the format check in Routers,
  // by field and reason (ui_decomposition.md D6, page reminder_settings). Keys
  // are the contract's field paths with the index of a lead time left out
  // ('deadline.lead_times.amount' for 'deadline.lead_times.2.amount'). The row
  // key 'deadline.lead_times' is the rule on the list as a whole (no two entries
  // of the same duration), shown on the later of the two entries. A pair not
  // listed falls back to ResultMessages.input.
  inputMessages: {
    'periodic.every': {
      required: 'Nhập số ngày hoặc số tuần',
      not_integer: 'Nhập một số nguyên từ 1 trở lên',
      violates_type_constraint: 'Nhập một số nguyên từ 1 trở lên',
    },
    'periodic.unit': { required: 'Chọn ngày hoặc tuần', not_in_list: 'Chọn ngày hoặc tuần trong danh sách' },
    'periodic.at_time': { required: 'Chọn giờ nhắc', not_timestamp: 'Chọn giờ nhắc' },
    'periodic.weekday': { required: 'Chọn thứ trong tuần', not_in_list: 'Chọn thứ trong tuần' },
    'deadline.lead_times.amount': {
      required: 'Nhập thời gian nhắc trước',
      not_integer: 'Nhập một số nguyên từ 1 trở lên',
      violates_type_constraint: 'Mốc nhắc tối đa 365 ngày (8760 giờ)',
    },
    'deadline.lead_times.unit': { required: 'Chọn giờ hoặc ngày', not_in_list: 'Chọn giờ hoặc ngày trong danh sách' },
    'deadline.lead_times': { violates_type_constraint: 'Mốc nhắc này trùng với một mốc khác' },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Words of the views (ui_decomposition.md D6).
  texts: {
    // Main and secondary line of a reminder. {title} {count} {when} {deadline} {lead} {first}
    // are filled by Services.
    deadlineMain: 'Sắp tới hạn giao: {title}',
    deadlineDetail: 'Hạn giao {deadline} · nhắc trước {lead} · đến hạn lúc {when}',
    digestMain: 'Tổng hợp định kỳ: {count} đơn đang mở',
    digestDetail: '{upcoming} đơn có hạn giao · đến hạn lúc {when}',
    digestEarliest: 'sớm nhất: {title} ({deadline})',
    separator: ' · ',
    emptyList: 'Không có nhắc việc nào đang chờ.',
    // Sub-line of the settings page.
    neverSaved: 'Chưa lưu lần nào, đang dùng cài đặt mặc định.',
    savedAt: 'Lưu lần cuối lúc {when}',
  },

  // [UI-ONLY] Confirmation after each write (ui_decomposition.md D6).
  notices: { acknowledged: 'Đã đánh dấu đã xem.', saved: 'Đã lưu cài đặt nhắc việc.' },

  // [UI-ONLY] Presentation decisions (.design/ui_decomposition.md D6): dates and
  // times in the machine's time zone, Vietnamese format ("HH:mm dd/mm/yyyy"), as
  // the other pages.
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,
} as const

export type SendReminderConfigs = typeof SEND_REMINDER_CONFIGS
