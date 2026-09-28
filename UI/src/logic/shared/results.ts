/**
 * The two result types of the interface layer, and what goes with them.
 * Fixed specification: iwca_theory.md §6 (iwca-implementation v1.0). Same
 * kinds, same fields; no optional field, no fifth kind.
 */

// Realizes api_contract.yaml 4.0.0 clause_a_common.error_body:
// object { code: string (one of error_codes), message: string, details: object|null }
export type ErrorBody = {
  code: string
  message: string
  details: Record<string, unknown> | null
}

// Adapters → Services
export type CallResult<T> =
  | { kind: 'ok'; label: number; data: T }
  | { kind: 'declared_error'; label: number; error: ErrorBody }
  | { kind: 'unreachable'; reason: string }
  | { kind: 'contract_violation'; reason: string }

// Services → Routers → screens zone
export type ViewResult<V> =
  | { kind: 'ok'; view: V }
  | { kind: 'rejected'; origin: 'input' | 'system'; code: string; message: string; fieldErrors: Record<string, string> }
  | { kind: 'unreachable'; message: string }
  | { kind: 'contract_violation'; message: string }

// Code of a 'rejected' ViewResult whose origin is 'input'.
export const INPUT_FORMAT_CODE = 'INPUT_FORMAT'

// Why an input field failed the format check in Routers — closed list.
export type InputFormatCode =
  | 'required' // a required value is missing
  | 'not_integer' // not readable as an integer, or outside the safe range
  | 'not_number' // not readable as a number
  | 'not_date' // not readable as a date per formats.date
  | 'not_timestamp' // not readable as a timestamp per formats.timestamp
  | 'not_in_list' // not one of the values listed by the type
  | 'violates_type_constraint' // violates a constraint written in parentheses in the type

// Messages every Services needs to build a ViewResult. The layer
// configuration realizes this type; Main hands it to each Services.
export type ResultMessages = {
  unreachable: string
  contractViolation: string
  inputSummary: string
  input: Record<InputFormatCode, string>
}

// Last branch of every branching on kind: if a kind is left unhandled, the
// compiler reports it here.
export function assertNever(x: never): never {
  throw new Error(`Unhandled result kind: ${JSON.stringify(x)}`)
}
