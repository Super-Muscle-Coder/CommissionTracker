/**
 * Configs of the interface workflow backup_data. Static data only (iWCA D3):
 * no function, no environment read. Only Main and tests import values from
 * this file (R14); every other file may import its type only.
 */
export const BACKUP_DATA_CONFIGS = {
  // [CONTRACT] Versions of the supreme contract these values realize.
  contract: { apiContract: '4.0.0', dataSchema: '9.0.3' },

  // Every http endpoint this workflow calls (.design/ui_decomposition.md,
  // "Chặng E", table of calls), as declared in api_contract.yaml 4.0.0.
  // labels: every declared result label → 'ok' (declared with ref) or its error
  // code (declared with code). Nothing else is declared. prepare_restore is
  // deliberately absent: its called_by is [restore_data] only, the interface
  // never calls it (only test tooling does, in tests/).
  endpoints: {
    // [CONTRACT] backup_data.create_backup: "POST /backups", input: [backup_request]
    //   → body { backup_request }, output: 201 { ref: backup_archive },
    //   400 { code: ERR_VALIDATION }, 500 { code: ERR_STORAGE_IO }.
    createBackup: {
      method: 'POST',
      path: '/backups',
      labels: { '201': 'ok', '400': 'ERR_VALIDATION', '500': 'ERR_STORAGE_IO' } as Readonly<Record<string, string>>,
    },
  },

  // [CONTRACT] api_contract.yaml 4.0.0 cross_cutting.native_dialogs.entries.pick_folder:
  // form ipc, address "dialog:pick-folder", called_by [external], input none (the
  // single argument of endpoint_forms.ipc is an object whose keys are the input
  // names: none, so {}), output 200 { canceled, path }.
  dialogs: {
    pickFolder: { address: 'dialog:pick-folder', okLabel: 200 },
  },

  // [CONTRACT] data_schema.yaml 9.0.3 clause_a_common.types.backup_request_record: the
  // interface always sends 'manual'; 'pre_restore' is restore_data's.
  purpose: 'manual' as const,

  formats: {
    // [CONTRACT] data_schema.yaml 9.0.3 clause_a_common.formats.timestamp:
    // "ISO 8601 with UTC offset, e.g. 2026-09-23T14:05:00+07:00" (Z is offset zero).
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
  },

  // [UI-ONLY] Size of the archive file (ui_decomposition.md, "Luật trình bày của chặng E"):
  // below 1024 → "<n> byte"; below 1024 × 1024 → KB; else MB. Base 1024, one decimal,
  // decimal comma. The quotient is rounded to the nearest tenth, a tie going up
  // (Number.prototype.toFixed); the unit is chosen from the bytes BEFORE rounding, so
  // 1048575 is "1024,0 KB", never promoted to "1,0 MB" by its own rounding.
  size: {
    base: 1024,
    decimals: 1,
    decimalSeparator: ',',
    units: { byte: 'byte', kilo: 'KB', mega: 'MB' },
  },

  // [UI-ONLY] Presentation decisions (ui_decomposition.md, "Chặng E"): the time of
  // creation in the machine's time zone, Vietnamese format ("HH:mm dd/mm/yyyy"), as
  // the other pages.
  displayLocale: 'vi-VN',
  dateTimeFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions,

  // [UI-ONLY] Words of the result frame (three lines) and of the notice.
  texts: {
    created: 'Đã tạo bản sao lưu.',
    entryFile: 'Tệp',
    entrySize: 'Dung lượng',
    entryCreatedAt: 'Tạo lúc',
  },

  // [UI-ONLY] Message shown for each error code create_backup declares.
  errorMessages: {
    createBackup: {
      ERR_VALIDATION: 'Không dùng được thư mục này. Hãy chọn thư mục khác.',
      ERR_STORAGE_IO: 'Không ghi được tệp sao lưu vào thư mục này. Hãy chọn thư mục khác, hoặc kiểm tra ổ đĩa còn chỗ trống.',
    },
  } as Readonly<Record<string, Readonly<Record<string, string>>>>,

  // [UI-ONLY] The folder dialog failed (the Promise of invoke was rejected: the
  // dialog threw, or the desktop refused the call). Not a code of the contract: a
  // name of the interface's own for a named reason, so the page can say it in its
  // own words instead of "không kết nối được".
  dialogFailure: {
    code: 'DIALOG_FAILED',
    message: 'Không mở được hộp thoại chọn thư mục. Hãy thử lại.',
  },
} as const

export type BackupDataConfigs = typeof BACKUP_DATA_CONFIGS
