/**
 * Configs of the foundation workflow scaffold_ui. Static data only (iWCA D3):
 * no function, no environment read. Only Main and tests import values from
 * this file (R14); every other file may import its type only.
 */
export const SCAFFOLD_UI_CONFIGS = {
  // [UI-ONLY] How long the http_client waits for a complete response (status
  // and body) before answering "unreachable". The backend runs on the same
  // machine; a call that takes longer than this is treated as lost.
  timeoutMs: 15000,

  // [CONTRACT] The ipc addresses the interface calls: exactly the five entries
  // of API Contract 6.2.0 that its workflows use (clause_a_common.cross_cutting.
  // native_dialogs: dialog:open-file, dialog:pick-folder; clause_d_desktop.
  // restore_data: restore:prepare, restore:status, restore:cancel). The
  // ipc_bridge passes nothing else to invoke (iWCA section 4: the resource
  // calls only the addresses the contract declares).
  ipcAddresses: ['dialog:open-file', 'dialog:pick-folder', 'restore:prepare', 'restore:status', 'restore:cancel'],
} as const

export type ScaffoldUiConfigs = typeof SCAFFOLD_UI_CONFIGS
