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
} as const

export type ScaffoldUiConfigs = typeof SCAFFOLD_UI_CONFIGS
