/**
 * Programming interface of the foundation resources prepared by scaffold_ui
 * (iwca_theory.md §6). Types only: Adapters of every interface workflow learn
 * the shape of the resource Main hands them without importing scaffold_ui
 * (R2).
 *
 * Only http_client exists today. ipc_bridge is added once the desktop layer
 * implements its first ipc entry (.design/ui_decomposition.md §2, §3).
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
