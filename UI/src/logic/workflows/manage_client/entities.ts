/**
 * Entities of the interface workflow manage_client: types only.
 * Types at the boundary keep the contract's field names (data_schema.yaml
 * 7.0.0, clause_b_backend.manage_client).
 */

// Realizes one element of client_list:
// object { client_id: id, display_name: string, is_archived: boolean, updated_at: timestamp }.
export type ClientListItem = {
  client_id: string // id (formats.id)
  display_name: string
  is_archived: boolean
  updated_at: string // timestamp (formats.timestamp)
}

// Realizes client_list: list[ClientListItem].
export type ClientList = ClientListItem[]

// Realizes one element of client_input.contacts and client_detail.contacts:
// object { channel: string, value: string }.
export type Contact = {
  channel: string
  value: string
}

// Realizes client_input (sent; data_schema.yaml 7.0.0): object { display_name:
// string (1..120 characters, not blank), contacts: list[object { channel:
// string (1.. characters, not blank), value: string (1.. characters, not
// blank) }], note: string|null }. Exactly these fields.
export type ClientInput = {
  display_name: string
  contacts: Contact[]
  note: string | null
}

// Realizes client_detail (received): object { client_id: id, display_name: string,
// contacts: list[Contact], note: string|null, is_archived: boolean,
// created_at: timestamp, updated_at: timestamp }.
export type ClientDetail = {
  client_id: string
  display_name: string
  contacts: Contact[]
  note: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

// --- raw input from the page (what the user typed), handed to Routers ---------

export type ContactDraft = {
  channel: string
  value: string
}

export type ClientFormDraft = {
  displayName: string
  contacts: ContactDraft[]
  note: string
}

// Which form is open: a new client, or an existing one.
export type ClientFormTarget = { mode: 'create' } | { mode: 'edit'; clientId: string }

// --- view models — the interface's own -----------------------------------------

export type ClientRowView = {
  clientId: string
  name: string
}

// Active and archived clients, each sorted in Vietnamese alphabetical order;
// isEmpty: there is no client at all (the page then shows its empty state).
export type ClientListView = {
  active: ClientRowView[]
  archived: ClientRowView[]
  isEmpty: boolean
}

export type ClientDetailView = {
  clientId: string
  name: string
  isArchived: boolean
  statusText: string
  // One line per contact, "channel: value", in the order stored.
  contactLines: string[]
  // null when there is no note (the page then shows no note entry).
  note: string | null
  createdText: string
  updatedText: string
}

// What the form opens with: the draft to edit (empty for a new client) and
// the suggested channels.
export type ClientFormView = {
  draft: ClientFormDraft
  channelSuggestions: readonly string[]
}

// A saved client: where to go next, and what to tell the user there.
export type SavedClientView = {
  clientId: string
  message: string
}

// A client after archiving or unarchiving, with the confirmation to show.
export type ArchivedClientView = {
  detail: ClientDetailView
  message: string
}
