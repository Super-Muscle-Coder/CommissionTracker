/**
 * Routers of the interface workflow manage_commission: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing a page does (.design/ui_decomposition.md, "Chặng D2": pages
 * commission_list, commission_detail, commission_form).
 */
import type { InputFormatCode, ViewResult } from '../../shared/results'
import type { ManageCommissionConfigs } from './configs'
import type {
  ClientChoicesView,
  CommissionDetailView,
  CommissionFormDraft,
  CommissionFormTarget,
  CommissionFormView,
  CommissionInput,
  CommissionListView,
  SavedCommissionView,
} from './entities'
import type { ManageCommissionServices } from './services'

// The Configs values Routers checks with, handed over by Main (R14).
export type ManageCommissionRules = Pick<ManageCommissionConfigs, 'limits' | 'currencyDecimals' | 'formats'>

// Length in characters as the contract counts them: code points, not UTF-16
// units ("😀" is one character, two UTF-16 units).
const codePoints = (s: string) => [...s].length

// A string of digits without leading zeros ("0" for zero).
const withoutLeadingZeros = (digits: string) => digits.replace(/^0+(?=[0-9])/, '')

// a <= b for two strings of digits without leading zeros: an integer
// comparison done on the digits, so no number is ever rounded.
const notAbove = (a: string, b: string) => a.length < b.length || (a.length === b.length && a <= b)

type AmountRead = { ok: true; amountMinor: number } | { ok: false; code: InputFormatCode }

export function createManageCommissionRouters(services: ManageCommissionServices, rules: ManageCommissionRules) {
  // Reads an amount as typed into amount_minor (ui_decomposition.md D2,
  // "Đọc số người dùng nhập"). The way of writing it is [UI-ONLY]; that
  // amount_minor is an integer >= 0 and within ±(2^53−1) is the contract
  // (commission_input.agreed_price, clause_a_common.types.money). Done on the
  // string of digits only — never through a floating-point number.
  function readAmount(raw: string, decimals: number): AmountRead {
    // 1. Spaces removed, at both ends and inside.
    const s = raw.replace(/\s/g, '')
    // 2. Empty.
    if (s === '') return { ok: false, code: 'required' }
    // 3. Only digits, "." and ","; starting with a digit (so no minus sign).
    if (!/^[0-9][0-9.,]*$/.test(s)) return { ok: false, code: 'not_integer' }
    // 4. With decimals: a final "." or "," followed by 1..decimals digits is the fraction.
    let whole = s
    let fraction = ''
    if (decimals > 0) {
      const m = new RegExp(`^(.+)[.,]([0-9]{1,${decimals}})$`).exec(s)
      if (m !== null) {
        whole = m[1]
        fraction = m[2]
      }
    }
    // 5. Every "." or "," left is a thousands separator: exactly 3 digits after it.
    if (!/^[0-9]+([.,][0-9]{3})*$/.test(whole)) return { ok: false, code: 'not_integer' }
    const digits = withoutLeadingZeros(whole.replace(/[.,]/g, '') + fraction.padEnd(decimals, '0'))
    // 7. Above 2^53−1: too large (a constraint written in the type money).
    if (!notAbove(digits, rules.limits.maxAmountMinor)) return { ok: false, code: 'violates_type_constraint' }
    // At most 2^53−1, so Number() holds it exactly.
    return { ok: true, amountMinor: Number(digits) }
  }

  // Format check and conversion of the form draft, before anything is sent
  // (ui_decomposition.md D2, page commission_form). Rules copied from the
  // contract (data_schema.yaml 8.0.1 commission_input, formats.not_blank):
  //   - client_id: a client chosen → else 'required';
  //   - title not blank → else 'required'; at most titleMaxLength characters
  //     → else 'violates_type_constraint';
  //   - agreed_price.amount_minor: an integer >= 0, at most 2^53−1 (readAmount);
  //   - agreed_price.currency: a currency chosen → else 'required' (it can
  //     only be chosen from list_currencies, so it is one of them);
  //   - deadline: null or formats.date → else 'not_date'.
  // Rules of the interface only [UI-ONLY], not in the contract:
  //   - every text field is trimmed before it is checked and sent;
  //   - "Loại tranh" and "Mô tả" empty once trimmed → null; no deadline → null;
  //   - reference links: one per line, each line trimmed, empty lines
  //     dropped, no URL check (the contract says list[string]); none → [].
  // Field keys are the contract's field names.
  function readDraft(draft: CommissionFormDraft): { ok: true; input: CommissionInput } | { ok: false; errors: Record<string, InputFormatCode> } {
    const errors: Record<string, InputFormatCode> = {}

    if (draft.clientId === '') errors.client_id = 'required'

    const title = draft.title.trim()
    if (title === '') errors.title = 'required'
    else if (codePoints(title) > rules.limits.titleMaxLength) errors.title = 'violates_type_constraint'

    const commissionType = draft.commissionType.trim()

    // A code with no known decimals (only an existing commission's, in edit
    // mode) is written in raw minor units, as it is shown.
    const amount = readAmount(draft.amount, rules.currencyDecimals[draft.currency] ?? 0)
    if (!amount.ok) errors['agreed_price.amount_minor'] = amount.code
    if (draft.currency === '') errors['agreed_price.currency'] = 'required'

    const deadline = draft.deadline.trim()
    if (deadline !== '' && !rules.formats.date.test(deadline)) errors.deadline = 'not_date'

    const description = draft.description.trim()
    const referenceLinks = draft.referenceLinks
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')

    if (!amount.ok || Object.keys(errors).length > 0) return { ok: false, errors }
    return {
      ok: true,
      input: {
        client_id: draft.clientId,
        title,
        description: description === '' ? null : description,
        commission_type: commissionType === '' ? null : commissionType,
        agreed_price: { amount_minor: amount.amountMinor, currency: draft.currency },
        deadline: deadline === '' ? null : deadline,
        reference_links: referenceLinks,
      },
    }
  }

  return {
    // Page commission_list: load (or reload) the list — commissions and client names.
    loadCommissionList(): Promise<ViewResult<CommissionListView>> {
      return services.loadCommissionList()
    },

    // Page commission_detail: load one commission and its client when the page opens.
    loadCommissionDetail(commissionId: string): Promise<ViewResult<CommissionDetailView>> {
      return services.loadCommissionDetail(commissionId)
    },

    // Page commission_form: what the form opens with (clients and currencies,
    // or the stored commission and the clients).
    openCommissionForm(target: CommissionFormTarget): Promise<ViewResult<CommissionFormView>> {
      return services.openCommissionForm(target)
    },

    // Page commission_form: save (create or edit). Nothing is sent when the
    // draft fails the format check; the page keeps the draft as typed.
    async saveCommission(target: CommissionFormTarget, draft: CommissionFormDraft): Promise<ViewResult<SavedCommissionView>> {
      const read = readDraft(draft)
      if (!read.ok) return services.rejectInput(read.errors)
      return services.saveCommission(target, read.input)
    },

    // Page commission_form, after a save refused because of the chosen
    // client (404, 409): the clients offered again. keptClientId: the
    // commission's own client (edit mode), else null; chosenClientId: the
    // client of the draft.
    reloadClientChoices(keptClientId: string | null, chosenClientId: string): Promise<ViewResult<ClientChoicesView>> {
      return services.reloadClientChoices(keptClientId, chosenClientId)
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type ManageCommissionRouters = ReturnType<typeof createManageCommissionRouters>
export type { ViewResult } from '../../shared/results'
export type {
  ChoiceView,
  ClientChoicesView,
  CommissionDetailView,
  CommissionFormDraft,
  CommissionFormTarget,
  CommissionFormView,
  CommissionListView,
  CommissionRowView,
  SavedCommissionView,
} from './entities'
