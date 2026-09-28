/**
 * Preload script of the renderer window (responsibility of the desktop Main).
 *
 * Runs sandboxed, before any renderer code. Places exactly one frozen object
 * on the renderer's global object, under the name
 * shared_values.renderer_bridge, carrying the single launch value
 * backendBaseUrl (data_schema.yaml, clause_a_common.mandatory_rules). The
 * function invoke is added only once an ipc entry is implemented; none is
 * today.
 *
 * Both values arrive from the Main as command-line arguments of the renderer
 * process (webPreferences.additionalArguments): a sandboxed preload can read
 * process.argv but cannot read configs/desktop.json.
 */

import { contextBridge } from 'electron'

// Must equal configs/desktop.json preload.arguments (the Main builds the
// arguments from there; a sandboxed preload cannot read that file).
const BRIDGE_NAME_ARG = '--ct-renderer-bridge='
const BACKEND_BASE_URL_ARG = '--ct-backend-base-url='

function argumentValue(prefix: string): string | null {
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit === undefined ? null : hit.slice(prefix.length)
}

const bridgeName = argumentValue(BRIDGE_NAME_ARG)
const backendBaseUrl = argumentValue(BACKEND_BASE_URL_ARG)

if (bridgeName !== null && bridgeName !== '' && backendBaseUrl !== null && backendBaseUrl !== '') {
  contextBridge.exposeInMainWorld(bridgeName, Object.freeze({ backendBaseUrl }))
}
