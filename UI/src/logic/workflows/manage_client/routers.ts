/**
 * Routers of the interface workflow manage_client: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing a page does (.design/ui_decomposition.md §5, pages client_list,
 * client_detail, client_form).
 */
import type { InputFormatCode, ViewResult } from '../../shared/results'
import type { ManageClientConfigs } from './configs'
import type {
  ArchivedClientView,
  ClientDetailView,
  ClientFormDraft,
  ClientFormTarget,
  ClientFormView,
  ClientInput,
  ClientListView,
  SavedClientView,
} from './entities'
import type { ManageClientServices } from './services'

// Length in characters as the contract counts them: code points, not UTF-16
// units ("😀" is one character, two UTF-16 units).
const codePoints = (s: string) => [...s].length

export function createManageClientRouters(services: ManageClientServices, limits: ManageClientConfigs['limits']) {
  // Format check and conversion of the form draft, before anything is sent
  // (ui_decomposition.md §5, page client_form). Rules copied from the
  // contract (data_schema.yaml 7.0.0 client_input, formats.not_blank):
  //   - display_name not blank → else 'required'; at most
  //     displayNameMaxLength characters → else 'violates_type_constraint';
  //   - contacts[].channel and contacts[].value not blank → else 'required'
  //     on that field of that row.
  // Rules of the interface only [UI-ONLY], not in the contract:
  //   - every field is trimmed before it is checked and sent (the backend
  //     stores what it gets; the interface chooses to send trimmed values);
  //   - a contact row empty in both fields is dropped, with no error;
  //   - an empty note is sent as null.
  // String.prototype.trim and the backend's strip differ on a few rare
  // control characters; then the backend decides (400, shown as any 400).
  // Field keys: displayName, contacts.<row>.channel, contacts.<row>.value
  // (row = index in the draft, as the page shows it).
  function readDraft(draft: ClientFormDraft): { ok: true; input: ClientInput } | { ok: false; errors: Record<string, InputFormatCode> } {
    const errors: Record<string, InputFormatCode> = {}

    // [UI-ONLY] trim. Contract: not blank (empty once trimmed), then 1..120.
    const displayName = draft.displayName.trim()
    if (displayName === '') errors.displayName = 'required'
    else if (codePoints(displayName) > limits.displayNameMaxLength) errors.displayName = 'violates_type_constraint'

    const contacts: ClientInput['contacts'] = []
    draft.contacts.forEach((row, index) => {
      // [UI-ONLY] trim; a row empty in both fields is dropped.
      const channel = row.channel.trim()
      const value = row.value.trim()
      if (channel === '' && value === '') return
      // Contract: channel and value not blank.
      if (channel === '') errors[`contacts.${index}.channel`] = 'required'
      if (value === '') errors[`contacts.${index}.value`] = 'required'
      contacts.push({ channel, value })
    })

    // [UI-ONLY] trim; an empty note is sent as null.
    const note = draft.note.trim()
    if (Object.keys(errors).length > 0) return { ok: false, errors }
    return { ok: true, input: { display_name: displayName, contacts, note: note === '' ? null : note } }
  }

  return {
    // Page client_list: load (or reload) the list. No input.
    loadClientList(): Promise<ViewResult<ClientListView>> {
      return services.loadClientList()
    },

    // Page client_detail: load one client when the page opens.
    loadClientDetail(clientId: string): Promise<ViewResult<ClientDetailView>> {
      return services.loadClientDetail(clientId)
    },

    // Page client_form: what the form opens with (empty, or the stored client).
    openClientForm(target: ClientFormTarget): Promise<ViewResult<ClientFormView>> {
      return services.openClientForm(target)
    },

    // Page client_form: save (create or edit). Nothing is sent when the draft
    // fails the format check; the page keeps the draft as typed.
    async saveClient(target: ClientFormTarget, draft: ClientFormDraft): Promise<ViewResult<SavedClientView>> {
      const read = readDraft(draft)
      if (!read.ok) return services.rejectInput(read.errors)
      return services.saveClient(target, read.input)
    },

    // Page client_detail: archive (true) or unarchive (false). No typed input.
    setClientArchived(clientId: string, archived: boolean): Promise<ViewResult<ArchivedClientView>> {
      return services.setClientArchived(clientId, archived)
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type ManageClientRouters = ReturnType<typeof createManageClientRouters>
export type { ViewResult } from '../../shared/results'
export type {
  ArchivedClientView,
  ClientDetailView,
  ClientFormDraft,
  ClientFormTarget,
  ClientFormView,
  ClientListView,
  ClientRowView,
  ContactDraft,
  SavedClientView,
} from './entities'
