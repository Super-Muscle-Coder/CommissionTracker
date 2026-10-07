/**
 * Preload script of the renderer window (responsibility of the desktop Main).
 *
 * Runs sandboxed, before any renderer code. Places exactly one frozen object
 * on the renderer's global object, under the name
 * shared_values.renderer_bridge, with exactly two properties: the launch value
 * backendBaseUrl and the function invoke(address, argument) that realizes the
 * ipc endpoint form (data_schema.yaml, clause_a_common.mandatory_rules;
 * api_contract.yaml, endpoint_forms.ipc). invoke relays the call to
 * ipcRenderer.invoke, which the renderer never touches; only the addresses the
 * Main has implemented are relayed.
 *
 * All values arrive from the Main as command-line arguments of the renderer
 * process (webPreferences.additionalArguments): a sandboxed preload can read
 * process.argv but cannot read configs/desktop.json.
 */

import { contextBridge, ipcRenderer } from 'electron'

// Must equal configs/desktop.json preload.arguments (the Main builds the
// arguments from there; a sandboxed preload cannot read that file).
const BRIDGE_NAME_ARG = '--ct-renderer-bridge='
const BACKEND_BASE_URL_ARG = '--ct-backend-base-url='
const IPC_ADDRESSES_ARG = '--ct-ipc-addresses='

function argumentValue(prefix: string): string | null {
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit === undefined ? null : hit.slice(prefix.length)
}

const bridgeName = argumentValue(BRIDGE_NAME_ARG)
const backendBaseUrl = argumentValue(BACKEND_BASE_URL_ARG)
// The implemented ipc addresses, comma separated. Missing: none is implemented.
const allowedAddresses = new Set((argumentValue(IPC_ADDRESSES_ARG) ?? '').split(',').filter((a) => a !== ''))

function invoke(address: string, argument?: unknown): Promise<unknown> {
  // An address the Main has not implemented is a programming error of the
  // caller: nothing is sent, and the promise is rejected.
  if (typeof address !== 'string' || !allowedAddresses.has(address)) {
    return Promise.reject(new Error(`ipc address not implemented: ${String(address)}`))
  }
  return ipcRenderer.invoke(address, argument)
}

if (bridgeName !== null && bridgeName !== '' && backendBaseUrl !== null && backendBaseUrl !== '') {
  contextBridge.exposeInMainWorld(bridgeName, Object.freeze({ backendBaseUrl, invoke }))
}
