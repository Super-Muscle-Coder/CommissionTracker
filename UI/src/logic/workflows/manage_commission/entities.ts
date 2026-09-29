/**
 * Entities of the interface workflow manage_commission: types only.
 * Types at the boundary keep the contract's field names (data_schema.yaml
 * 8.0.1, clause_b_backend.manage_commission and manage_client). The client
 * types are this workflow's own description of manage_client's outputs, not
 * the interface workflow manage_client's (R2; WCA: Entities are never shared).
 */

// Realizes clause_a_common.types.money: object { amount_minor: integer
// (-9007199254740991..9007199254740991), currency: currency_code } — the
// amount in the currency's ISO 4217 minor unit; never floating point.
export type Money = {
  amount_minor: number // a safe integer
  currency: string // currency_code
}

// Realizes commission_input (sent): object { client_id: id, title: string
// (1..200 characters, not blank), description: string|null, commission_type:
// string|null, agreed_price: money (amount_minor >= 0; currency in
// supported_currencies), deadline: date|null, reference_links: list[string] }.
// Exactly these seven fields.
export type CommissionInput = {
  client_id: string
  title: string
  description: string | null
  commission_type: string | null
  agreed_price: Money
  deadline: string | null // date (formats.date)
  reference_links: string[]
}

// Realizes commission_detail (received): object { commission_id: id,
// client_id: id, title: string, description: string|null, commission_type:
// string|null, agreed_price: money, deadline: date|null, reference_links:
// list[string], created_at: timestamp, updated_at: timestamp }.
export type CommissionDetail = {
  commission_id: string
  client_id: string
  title: string
  description: string | null
  commission_type: string | null
  agreed_price: Money
  deadline: string | null
  reference_links: string[]
  created_at: string
  updated_at: string
}

// Realizes one element of commission_list: object { commission_id: id,
// client_id: id, title: string, agreed_price: money, deadline: date|null,
// updated_at: timestamp }.
export type CommissionListItem = {
  commission_id: string
  client_id: string
  title: string
  agreed_price: Money
  deadline: string | null
  updated_at: string
}

// Realizes commission_list: list[CommissionListItem].
export type CommissionList = CommissionListItem[]

// Realizes currency_options: list[currency_code].
export type CurrencyOptions = string[]

// Realizes one element of manage_client's client_list: object { client_id:
// id, display_name: string, is_archived: boolean, updated_at: timestamp }.
export type ClientListItem = {
  client_id: string
  display_name: string
  is_archived: boolean
  updated_at: string
}

export type ClientList = ClientListItem[]

// Realizes manage_client's client_detail: object { client_id: id,
// display_name: string, contacts: list[object { channel: string, value:
// string }], note: string|null, is_archived: boolean, created_at: timestamp,
// updated_at: timestamp }. This workflow shows only the name and whether the
// client is archived, but every committed field is checked (i3-logic.md I3.3).
export type ClientDetail = {
  client_id: string
  display_name: string
  contacts: { channel: string; value: string }[]
  note: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

// --- raw input from the page (what the user typed), handed to Routers ---------

export type CommissionFormDraft = {
  // The chosen client ('' = "Chọn khách hàng", nothing chosen).
  clientId: string
  title: string
  commissionType: string
  // The amount as typed, e.g. "1.500.000" or "12,50".
  amount: string
  // The chosen currency code (fixed in edit mode).
  currency: string
  // Value of the date field: YYYY-MM-DD, or '' for no deadline.
  deadline: string
  description: string
  // One link per line.
  referenceLinks: string
}

// Which form is open: a new commission, or an existing one.
export type CommissionFormTarget = { mode: 'create' } | { mode: 'edit'; commissionId: string }

// --- view models — the interface's own -----------------------------------------

// One commission of the list: its title (main line) and one secondary line
// with the client's name, the agreed price and the deadline (ui_decomposition.md D2).
export type CommissionRowView = {
  commissionId: string
  title: string
  detailText: string
}

// Commissions, most recently updated first; isEmpty: there is none at all.
export type CommissionListView = {
  rows: CommissionRowView[]
  isEmpty: boolean
}

export type CommissionDetailView = {
  commissionId: string
  title: string
  // The client's name; "(đã lưu trữ)" added for an archived client;
  // "Không tìm thấy khách hàng" when get_client answered 404.
  clientText: string
  // null when there is none (the page then shows no entry).
  commissionType: string | null
  priceText: string
  deadlineText: string
  description: string | null
  // [] when there is none (the page then shows no entry).
  referenceLinks: string[]
  createdText: string
  updatedText: string
}

export type ChoiceView = { value: string; label: string }

// The clients the form offers: active ones in Vietnamese alphabetical order;
// in edit mode, the commission's own client too when it is archived or gone.
// clientId: the client to show as chosen ('' = nothing chosen).
export type ClientChoicesView = {
  choices: ChoiceView[]
  clientId: string
}

export type CommissionFormView = {
  // create: the currencies that can be picked; edit: only the commission's
  // own currency (it cannot change).
  currencies: ChoiceView[]
  currencyLocked: boolean
  // Label of the first choice of the client list (nothing chosen).
  chooseClientLabel: string
  clients: ClientChoicesView
  // create with no active client: the page shows its empty state instead of the form.
  noActiveClient: boolean
  // edit: the commission's own client, kept in the list even when archived.
  keptClientId: string | null
  commissionTypeSuggestions: readonly string[]
  draft: CommissionFormDraft
}

// A saved commission: where to go next, and what to tell the user there.
export type SavedCommissionView = {
  commissionId: string
  message: string
}
