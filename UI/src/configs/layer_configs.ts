/**
 * Layer configuration of the interface layer. Static data only (iWCA D3): no
 * function, no environment read. Every entry is labelled [CONTRACT] (realizes
 * a clause of the supreme contract, with its version) or [UI-ONLY] (internal
 * value of the interface). Only Main and tests import values from this file
 * (R14).
 */
import type { ResultMessages } from '../logic/shared/results'

export const LAYER_CONFIGS = {
  launch: {
    // [CONTRACT] data_schema.yaml 6.1.0 clause_a_common.shared_values.renderer_bridge:
    // name of the frozen object the desktop preload script places on the
    // renderer's global object (mandatory_rules, renderer rule).
    rendererBridge: 'commissionTracker',
    // [CONTRACT] data_schema.yaml 6.1.0 clause_a_common.mandatory_rules (renderer
    // rule): the launch value is the string property backendBaseUrl of the bridge.
    backendBaseUrlProperty: 'backendBaseUrl',
    // [CONTRACT] data_schema.yaml 6.1.0 clause_a_common.shared_values.loopback_host:
    // the backend base URL is http://<loopback_host>:<port>.
    loopbackHost: '127.0.0.1',
    // shared_values.ui_origin is deliberately absent: the renderer never uses
    // it (used_by: clause_b_backend, clause_d_desktop). The e2e test checks the
    // page is served from it, reading the desktop layer's copy of the value.
  },

  // [UI-ONLY] id of the element in index.html that Main renders into.
  rootElementId: 'root',

  // [UI-ONLY] Startup error screen, shown by Main when a launch value is
  // missing or malformed. Main appends the name of the value to the detail.
  startupFailure: {
    title: 'Không khởi động được Commission Tracker',
    bridgeMissing: 'Thiếu đối tượng khởi động do ứng dụng desktop cung cấp',
    valueNotString: 'Giá trị khởi động bị thiếu hoặc không phải chuỗi',
    valueMalformed: 'Giá trị khởi động sai định dạng (cần http://127.0.0.1:<cổng 1–65535>)',
  },

  // [UI-ONLY] Messages every Services needs (iwca_theory.md §6, ResultMessages).
  resultMessages: {
    unreachable: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.',
    contractViolation: 'Ứng dụng nhận được một phản hồi không mong đợi. Thao tác chưa được thực hiện.',
    inputSummary: 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.',
    input: {
      required: 'Ô này là bắt buộc.',
      not_integer: 'Cần một số nguyên.',
      not_number: 'Cần một số.',
      not_date: 'Cần một ngày hợp lệ.',
      not_timestamp: 'Cần một thời điểm hợp lệ.',
      not_in_list: 'Giá trị không nằm trong danh sách cho phép.',
      violates_type_constraint: 'Giá trị nằm ngoài giới hạn cho phép.',
    },
  } satisfies ResultMessages,
} as const

export type LayerConfigs = typeof LAYER_CONFIGS
