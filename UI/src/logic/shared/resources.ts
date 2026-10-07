/**
 * Programming interface of the foundation resources prepared by scaffold_ui
 * (iwca_theory.md §6). Types only: Adapters of every interface workflow learn
 * the shape of the resource Main hands them without importing scaffold_ui
 * (R2).
 *
 * Two resources: http_client, and (from the desktop layer's first ipc entry,
 * session 33; .design/ui_decomposition.md §2, §3) ipc_bridge.
 */

// HTTP methods used by api_contract.yaml 4.0.0 http addresses.
export type HttpMethod = 'GET' | 'POST' | 'PUT'

// What the http_client hands back: the raw response, never classified.
export type Transport =
  // label: the HTTP status code (the result label of endpoint_forms.http).
  // body: the parsed JSON body, or null when the body is empty or not JSON.
  | { kind: 'response'; label: number; body: unknown }
  // No response at all: connection refused, timeout, connection dropped.
  | { kind: 'unreachable'; reason: string }

export type HttpRequestOptions = {
  // Query parameters (GET inputs, endpoint_forms.http); null when none.
  query: Record<string, string> | null
  // JSON body whose keys are the input names (POST, PUT); null when none.
  body: unknown
}

export interface HttpClient {
  // path: the path of the address, with every {name} segment already filled.
  send(method: HttpMethod, path: string, options: HttpRequestOptions): Promise<Transport>
}

// The function the desktop preload script places on the renderer bridge
// (data_schema.yaml 6.1.0 renderer rule; api_contract.yaml 4.0.0
// endpoint_forms.ipc): invoke(address, argument). It answers a Promise that is
// rejected when the address is not implemented, the argument is refused, the
// sending frame is refused, or the handler throws (e.g. the dialog fails).
export type IpcInvoke = (address: string, argument: unknown) => Promise<unknown>

// The ipc_bridge resource: one call to an ipc address, passed on as it is.
// It checks nothing and decides nothing: the shape of the answer is checked by
// the Adapters of the workflow that calls, and a rejected Promise goes up to
// those Adapters untouched. No time limit, since a dialog waits for the person.
export interface IpcBridge {
  call(address: string, argument: unknown): Promise<unknown>
}
