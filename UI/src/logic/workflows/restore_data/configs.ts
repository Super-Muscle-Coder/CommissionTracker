/**
 * Configs of the interface workflow restore_data. Static data only (iWCA D3):
 * no function, no environment read. Only Main and tests import values from
 * this file (R14); every other file may import its type only.
 */
export const RESTORE_DATA_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '5.0.0', dataSchema: '10.0.1' },

  // Every ipc entry this workflow calls (.design/ui_decomposition.md, "Chặng F",
  // table of calls), as declared in api_contract.yaml 5.0.0 clause_d_desktop.restore_data.
  // The single argument of endpoint_forms.ipc is an object whose keys are the
  // input names. labels: every declared result label → 'ok' (declared with ref)
  // or its error code (declared with code). Nothing else is declared.
  // apply_pending_restore is deliberately absent: its called_by is
  // [restore_trigger] only, with form in_process; the interface cannot call it.
  ipc: {
    // [CONTRACT] restore_data.get_restore_status: form ipc, address "restore:status",
    //   input none (argument {}), output 200 { ref: restore_status }, 500 { code: ERR_STORAGE_IO }.
    getRestoreStatus: {
      address: 'restore:status',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] restore_data.request_restore: form ipc, address "restore:prepare",
    //   input [archive_path] (argument { archive_path }), output 200 { ref: restore_scheduled },
    //   400 ERR_VALIDATION, 404 ERR_NOT_FOUND, 409 ERR_INCOMPATIBLE_BACKUP, 424 ERR_STORAGE_IO,
    //   500 ERR_STORAGE_IO, 503 ERR_SERVICE_UNAVAILABLE.
    requestRestore: {
      address: 'restore:prepare',
      labels: {
        '200': 'ok',
        '400': 'ERR_VALIDATION',
        '404': 'ERR_NOT_FOUND',
        '409': 'ERR_INCOMPATIBLE_BACKUP',
        '424': 'ERR_STORAGE_IO',
        '500': 'ERR_STORAGE_IO',
        '503': 'ERR_SERVICE_UNAVAILABLE',
      } as Readonly<Record<string, string>>,
    },
    // [CONTRACT] restore_data.cancel_restore: form ipc, address "restore:cancel",
    //   input none (argument {}), output 200 { ref: restore_cancellation }, 500 { code: ERR_STORAGE_IO }.
    cancelRestore: {
      address: 'restore:cancel',
      labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
  },

  // [CONTRACT] api_contract.yaml 5.0.0 cross_cutting.native_dialogs.entries.open_file:
  // form ipc, address "dialog:open-file", called_by [external], input { filters }
  // (list of { name, extensions }, or null), output 200 { canceled, path }.
  dialogs: {
    openFile: { address: 'dialog:open-file', okLabel: 200 },
  },

  // [UI-ONLY] The filter handed to the open-file dialog: the file the artist picks is
  // one that create_backup made (extension ctbackup, no dot, the way Electron takes it).
  openFileFilters: [{ name: 'Bản sao lưu Commission Tracker', extensions: ['ctbackup'] }] as ReadonlyArray<{ name: string; extensions: readonly string[] }>,

  formats: {
    // [CONTRACT] data_schema.yaml 10.0.1 clause_a_common.formats.timestamp:
    // "ISO 8601 with UTC offset, e.g. 2026-09-23T14:05:00+07:00" (Z is offset zero).
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
  },

  // [UI-ONLY] Presentation decisions (ui_decomposition.md, "Luật trình bày của chặng F"):
  // the two instants of the frame in the machine's time zone, Vietnamese format
  // ("HH:mm dd/mm/yyyy"), as the other pages.
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,

  // [UI-ONLY] Words of the frame "Đang chờ khôi phục" (four lines and a closing sentence).
  frame: {
    entryArchive: 'Tệp sao lưu',
    entryArchiveCreatedAt: 'Bản sao lưu tạo lúc',
    entryPreparedAt: 'Chuẩn bị lúc',
    entrySafetyBackup: 'Bản sao lưu an toàn của dữ liệu trước khi khôi phục',
    note: 'Hãy đóng rồi mở lại ứng dụng để hoàn tất. Dữ liệu bạn nhập từ lúc chuẩn bị tới lúc mở lại sẽ không có trong dữ liệu sau khôi phục.',
  },

  // [UI-ONLY] Words of the question asked in the page after a file is chosen (§7.2, principle 5).
  // The lines are joined by a line break; the line with the path comes first.
  confirmation: {
    fileLead: 'Khôi phục từ tệp:',
    consequence:
      'Khi bạn đóng rồi mở lại ứng dụng, toàn bộ dữ liệu hiện tại sẽ được thay bằng dữ liệu trong tệp này. Trước đó, ứng dụng tạo một bản sao lưu an toàn của dữ liệu hiện tại. Dữ liệu bạn nhập sau bước này sẽ không có trong dữ liệu sau khôi phục.',
    replacesPending: 'Lần khôi phục đang chờ sẽ được thay bằng lần này.',
    lineBreak: '\n',
  },

  // [UI-ONLY] Notices of the successful results.
  texts: {
    prepared: 'Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.',
    canceled: 'Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.',
    nothingToCancel: 'Không còn lần khôi phục nào đang chờ.',
  },

  // [UI-ONLY] Message shown for each declared error LABEL of each call. Keyed by
  // label, not by error code: labels 424 and 500 of restore:prepare share the code
  // ERR_STORAGE_IO and say different things.
  errorMessages: {
    getRestoreStatus: {
      '500': 'Không đọc được trạng thái khôi phục. Hãy mở lại trang này.',
    },
    requestRestore: {
      '400': 'Không dùng được tệp này. Hãy chọn tệp khác.',
      '404': 'Không tìm thấy tệp này. Có thể tệp đã bị chuyển hoặc xóa. Hãy chọn lại.',
      '409': 'Tệp này không dùng được để khôi phục: có thể không phải bản sao lưu của Commission Tracker, đã bị hỏng, hoặc được tạo bởi phiên bản mới hơn của ứng dụng.',
      '424': 'Không tạo được bản sao lưu an toàn của dữ liệu hiện tại, nên chưa chuẩn bị khôi phục. Hãy kiểm tra ổ đĩa còn chỗ trống rồi thử lại.',
      '500': 'Không ghi được thông tin khôi phục, nên chưa chuẩn bị khôi phục. Hãy thử lại.',
      '503': 'Ứng dụng chưa đọc được tệp sao lưu vì phần xử lý dữ liệu không phản hồi. Hãy đóng rồi mở lại ứng dụng, rồi thử lại.',
    },
    cancelRestore: {
      '500': 'Không hủy được lần khôi phục đang chờ. Hãy thử lại.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] The Promise of invoke was rejected for one of the three restore calls
  // (the desktop refused the call or its handler threw). Not a code of the contract: a
  // name of the interface's own for a named reason, said in its own words instead of
  // "không kết nối được" (the page cannot offer a retry that would help: the desktop
  // itself does not answer).
  ipcFailure: {
    code: 'IPC_FAILED',
    message: 'Không liên lạc được với ứng dụng. Hãy đóng rồi mở lại ứng dụng.',
  },

  // [UI-ONLY] The open-file dialog failed (the Promise of invoke was rejected: the
  // dialog threw, or the desktop refused the call).
  dialogFailure: {
    code: 'DIALOG_FAILED',
    message: 'Không mở được hộp thoại chọn tệp. Hãy thử lại.',
  },
} as const

export type RestoreDataConfigs = typeof RESTORE_DATA_CONFIGS
