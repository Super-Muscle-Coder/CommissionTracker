/**
 * Configs of the interface workflow update_progress. Static data only (iWCA
 * D3): no function, no environment read. Only Main and tests import values
 * from this file (R14); every other file may import its type only.
 */
export const UPDATE_PROGRESS_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '4.0.0', dataSchema: '8.0.1' },

  // Every endpoint this workflow calls (.design/ui_decomposition.md, "Chặng D3",
  // table of calls), as declared in api_contract.yaml 4.0.0. labels: every
  // declared result label → 'ok' (declared with ref) or its error code
  // (declared with code). Nothing else is declared. A path segment {name}
  // carries the input of that name (endpoint_forms.http); the other inputs
  // travel in a JSON body whose keys are the input names (PUT).
  endpoints: {
    // [CONTRACT] update_progress.get_stage: "GET /commissions/{commission_id}/stage",
    //   input: [commission_id], output: 200 { ref: progress_state },
    //   404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    getStage: {
      method: 'GET',
      path: '/commissions/{commission_id}/stage',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] update_progress.get_stage_history: "GET /commissions/{commission_id}/stage/history",
    //   input: [commission_id], output: 200 { ref: progress_history },
    //   404 { code: ERR_NOT_FOUND }, 500 { code: ERR_STORAGE_IO }.
    getStageHistory: {
      method: 'GET',
      path: '/commissions/{commission_id}/stage/history',
      labels: { '200': 'ok', '404': 'ERR_NOT_FOUND', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] update_progress.change_stage: "PUT /commissions/{commission_id}/stage",
    //   input: [commission_id, stage_change] → body { stage_change },
    //   output: 200 { ref: progress_state }, 400 { code: ERR_VALIDATION },
    //   404 { code: ERR_NOT_FOUND }, 409 { code: ERR_INVALID_TRANSITION }, 500 { code: ERR_STORAGE_IO }.
    changeStage: {
      method: 'PUT',
      path: '/commissions/{commission_id}/stage',
      labels: {
        '200': 'ok',
        '400': 'ERR_VALIDATION',
        '404': 'ERR_NOT_FOUND',
        '409': 'ERR_INVALID_TRANSITION',
        '500': 'ERR_STORAGE_IO',
      } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] update_progress.get_board: "GET /progress/board", input: none,
    //   output: 200 { ref: progress_board }, 500 { code: ERR_STORAGE_IO }.
    getBoard: {
      method: 'GET',
      path: '/progress/board',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] update_progress.list_stages: "GET /progress/stages", input: none,
    //   output: 200 { ref: stage_options } — the only label.
    listStages: {
      method: 'GET',
      path: '/progress/stages',
      labels: { '200': 'ok' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] manage_commission.list_commissions: "GET /commissions", input: none,
    //   output: 200 { ref: commission_list }, 500 { code: ERR_STORAGE_IO }.
    //   This workflow's own call (ui_decomposition.md §2, I1.3): the interface
    //   workflow manage_commission is not imported (R2).
    listCommissions: {
      method: 'GET',
      path: '/commissions',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
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

  // [CONTRACT] data_schema.yaml 8.0.1 clause_a_common.types.stage_kind:
  // "'active' | 'on_hold' | 'finished' | 'cancelled'". Any other value is a
  // contract violation.
  stageKinds: ['active', 'on_hold', 'finished', 'cancelled'] as const,
  // [CONTRACT] data_schema.yaml 8.0.1 clause_b_backend.update_progress.description:
  // "A commission in a stage of kind 'finished' or 'cancelled' cannot change
  // stage." A stage is "closed" by its kind, never by its code
  // (ui_decomposition.md D3, "Giai đoạn khép lại").
  closedKinds: ['finished', 'cancelled'] as readonly string[],

  // [UI-ONLY] Vietnamese name of each stage code of the default stage_catalog
  // (ui_decomposition.md D3, "Tên giai đoạn"). A code missing here is shown
  // as is. The ORDER of stages always comes from list_stages, never from here.
  stageNames: {
    queued: 'Chờ bắt đầu',
    sketch: 'Phác thảo',
    lineart: 'Lên nét',
    coloring: 'Tô màu',
    rendering: 'Hoàn thiện chi tiết',
    final_review: 'Duyệt lần cuối',
    revision: 'Sửa theo yêu cầu',
    completed: 'Đã vẽ xong',
    on_hold: 'Tạm dừng',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
  } as Readonly<Record<string, string>>,

  // [UI-ONLY] Message shown for each error code the endpoints above declare,
  // by call (ui_decomposition.md D3): the same code means different things on
  // different calls.
  errorMessages: {
    getStage: {
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng này.',
      ERR_STORAGE_IO: 'Không đọc được dữ liệu tiến độ trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    getStageHistory: {
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng này.',
      ERR_STORAGE_IO: 'Không đọc được dữ liệu tiến độ trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    changeStage: {
      ERR_VALIDATION: 'Máy chủ không nhận dữ liệu này. Vui lòng kiểm tra lại rồi lưu lại.',
      ERR_NOT_FOUND: 'Không tìm thấy đơn hàng này.',
      ERR_INVALID_TRANSITION:
        'Không đổi được giai đoạn: đơn đã được đổi sang giai đoạn khác hoặc đã khép lại. Hãy mở lại trang.',
      ERR_STORAGE_IO: 'Không ghi được dữ liệu tiến độ trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    getBoard: {
      ERR_STORAGE_IO: 'Không đọc được dữ liệu tiến độ trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
    listStages: {},
    listCommissions: {
      ERR_STORAGE_IO: 'Không đọc được dữ liệu đơn hàng trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Message under a field that failed the format check in Routers,
  // by field (keys are the contract's field names) and reason
  // (ui_decomposition.md D3, stage_change). A pair not listed falls back to
  // ResultMessages.input.
  inputMessages: {
    to_stage: { required: 'Chọn giai đoạn mới.' },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] Words of the views (ui_decomposition.md D3). In a template,
  // {name} is the Vietnamese name of a stage, {code} a stage code, {count} a
  // number, {when} a date and time.
  texts: {
    // Title of a group of the board: "Phác thảo (2)".
    groupTitle: '{name} ({count})',
    // Last group of the board, for a stage code not in list_stages.
    otherStageGroup: 'Giai đoạn khác: {code}',
    noDeadline: 'Không có hạn',
    deadlinePrefix: 'Hạn giao',
    // Current stage of a commission.
    updatedAt: 'cập nhật lúc {when}',
    neverUpdated: 'chưa cập nhật lần nào',
    // One line of the history: "<from> → <to>", or, first change, "Bắt đầu: <to>".
    historyChange: '{from} → {to}',
    historyStart: 'Bắt đầu: {to}',
    historySeparator: ' · ',
    noHistory: 'Chưa đổi giai đoạn lần nào',
    // A commission in a closed stage. The spec's "Đơn đã <tên giai đoạn>, …"
    // reads "Đơn đã Đã giao" with the names above, so the name is quoted
    // after "đang ở giai đoạn" (update_progress-NOTE-001, for the Orchestrator).
    closed: 'Đơn đang ở giai đoạn "{name}", không đổi giai đoạn được nữa.',
    // First choice of the stage list of stage_change: nothing chosen yet.
    chooseStage: 'Chọn giai đoạn',
    // The in-page confirmation before moving to a closed stage.
    confirmClosing: 'Sau khi chuyển sang "{name}", đơn này không đổi giai đoạn được nữa.',
  },

  // [UI-ONLY] Confirmation after a stage change, shown on commission_detail.
  notices: { changed: 'Đã đổi giai đoạn sang {name}.' },

  // [UI-ONLY] Presentation decisions (.design/ui_decomposition.md §2, D3):
  // dates and times in the machine's time zone, Vietnamese format, as
  // client_detail.
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,
} as const

export type UpdateProgressConfigs = typeof UPDATE_PROGRESS_CONFIGS
