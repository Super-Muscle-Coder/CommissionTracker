/**
 * Routers of the interface workflow record_payment: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing a page does (.design/ui_decomposition.md, "Chặng D4": pages
 * payment_list, payment_form, and the "Thanh toán" part of commission_detail).
 */
import type { InputFormatCode, ViewResult } from '../../shared/results'
import type { RecordPaymentConfigs } from './configs'
import type {
  BalanceView,
  PaymentFormDraft,
  PaymentFormTarget,
  PaymentFormView,
  PaymentInput,
  PaymentListView,
  SavedPaymentView,
  VoidOutcomeView,
} from './entities'
import type { RecordPaymentServices } from './services'

// The Configs values Routers checks with, handed over by Main (R14).
export type RecordPaymentRules = Pick<RecordPaymentConfigs, 'limits' | 'currencyDecimals' | 'directions' | 'paymentKinds'>

// A string of digits without leading zeros ("0" for zero).
const withoutLeadingZeros = (digits: string) => digits.replace(/^0+(?=[0-9])/, '')

// a <= b for two strings of digits without leading zeros: an integer
// comparison done on the digits, so no number is ever rounded.
const notAbove = (a: string, b: string) => a.length < b.length || (a.length === b.length && a <= b)

type AmountRead = { ok: true; amountMinor: number } | { ok: false; code: InputFormatCode }

const pad2 = (n: number) => String(n).padStart(2, '0')

// The value of a date-time input, YYYY-MM-DDTHH:mm (with seconds if given).
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

// Format conversion at the boundary (ui_decomposition.md D4, "paid_at"): the
// value of the input is a wall-clock date and time of the machine; the
// timestamp of the contract (formats.timestamp) is that same wall-clock time
// with `:00` seconds when there are none, and the UTC offset the machine has
// AT THAT DATE AND TIME — read from a Date built in the machine's time zone,
// so summer time is right (New York is −05:00 on 7 March and −04:00 on 9
// March 2026). Never converted to UTC. null when the value is not a real date
// and time (a month or day out of range, 30 February).
function toTimestamp(local: string): string | null {
  const m = LOCAL_DATE_TIME.exec(local)
  if (m === null) return null
  const [year, month, day, hour, minute] = [m[1], m[2], m[3], m[4], m[5]].map(Number)
  const second = m[6] === undefined ? 0 : Number(m[6])
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return null
  // setFullYear keeps a year below 100 as is (the Date constructor maps it to 19xx).
  const at = new Date(2000, 0, 1, hour, minute, second)
  at.setFullYear(year, month - 1, day)
  if (at.getMonth() !== month - 1 || at.getDate() !== day) return null
  // getTimezoneOffset is minutes WEST of UTC; the timestamp writes minutes EAST.
  const east = Math.round(-at.getTimezoneOffset())
  const sign = east < 0 ? '-' : '+'
  const hh = pad2(Math.floor(Math.abs(east) / 60))
  const mm = pad2(Math.abs(east) % 60)
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${pad2(second)}${sign}${hh}:${mm}`
}

export function createRecordPaymentRouters(services: RecordPaymentServices, rules: RecordPaymentRules) {
  // Reads an amount as typed into amount_minor (ui_decomposition.md D2,
  // "Đọc số người dùng nhập", used by D4). The way of writing it is
  // [UI-ONLY]; that amount_minor is an integer > 0 and within ±(2^53−1) is
  // the contract (payment_input.amount, clause_a_common.types.money). Done on
  // the string of digits only — never through a floating-point number.
  // Reasons: 'required' (empty), 'not_number' (cannot be read), 'not_integer'
  // (above 2^53−1, the outside-the-safe-range meaning of that reason),
  // 'violates_type_constraint' (zero: amount_minor > 0).
  function readAmount(raw: string, decimals: number): AmountRead {
    // 1. Spaces removed, at both ends and inside.
    const s = raw.replace(/\s/g, '')
    // 2. Empty.
    if (s === '') return { ok: false, code: 'required' }
    // 3. Only digits, "." and ","; starting with a digit (so no minus sign).
    if (!/^[0-9][0-9.,]*$/.test(s)) return { ok: false, code: 'not_number' }
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
    if (!/^[0-9]+([.,][0-9]{3})*$/.test(whole)) return { ok: false, code: 'not_number' }
    const digits = withoutLeadingZeros(whole.replace(/[.,]/g, '') + fraction.padEnd(decimals, '0'))
    // 6. Above 2^53−1: too large (the range of money).
    if (!notAbove(digits, rules.limits.maxAmountMinor)) return { ok: false, code: 'not_integer' }
    // 7. Zero: the contract asks amount_minor > 0.
    if (digits === '0') return { ok: false, code: 'violates_type_constraint' }
    // At most 2^53−1, so Number() holds it exactly.
    return { ok: true, amountMinor: Number(digits) }
  }

  // Format check and conversion of the form draft, before anything is sent
  // (ui_decomposition.md D4, page payment_form). Rules copied from the
  // contract (data_schema.yaml 9.0.0 payment_input, formats.not_blank):
  //   - direction: 'incoming' or 'refund' → else 'required' / 'not_in_list';
  //   - kind: one of the five kinds → else 'required' (none chosen) / 'not_in_list';
  //   - amount.amount_minor: an integer > 0, at most 2^53−1 (readAmount); the
  //     currency is the commission's, never chosen;
  //   - method not blank → else 'required';
  //   - paid_at: a timestamp (formats.timestamp) → else 'required' (empty) /
  //     'not_timestamp'.
  // Rules of the interface only [UI-ONLY], not in the contract:
  //   - every text field is trimmed (String.prototype.trim: ASCII spaces,
  //     U+00A0, U+3000, U+FEFF…) before it is checked and sent;
  //   - a note empty once trimmed → null;
  //   - the way paid_at is written from the input (toTimestamp).
  // Field keys are the contract's field names.
  function readDraft(target: PaymentFormTarget, draft: PaymentFormDraft): { ok: true; input: PaymentInput } | { ok: false; errors: Record<string, InputFormatCode> } {
    const errors: Record<string, InputFormatCode> = {}
    const fail = (field: string, code: InputFormatCode) => {
      errors[field] = code
    }

    const direction = rules.directions.find((d) => d === draft.direction)
    if (draft.direction === '') fail('direction', 'required')
    else if (direction === undefined) fail('direction', 'not_in_list')

    const paymentKind = rules.paymentKinds.find((k) => k === draft.paymentKind)
    if (draft.paymentKind === '') fail('kind', 'required')
    else if (paymentKind === undefined) fail('kind', 'not_in_list')

    // A currency with no known decimals has no form (Services); written in raw minor units if it ever gets here.
    const amount = readAmount(draft.amount, rules.currencyDecimals[target.currency] ?? 0)
    if (!amount.ok) fail('amount.amount_minor', amount.code)

    const method = draft.method.trim()
    if (method === '') fail('method', 'required')

    const paidAt = draft.paidAtLocal.trim() === '' ? null : toTimestamp(draft.paidAtLocal.trim())
    if (draft.paidAtLocal.trim() === '') fail('paid_at', 'required')
    else if (paidAt === null) fail('paid_at', 'not_timestamp')

    const note = draft.note.trim()

    if (!amount.ok || direction === undefined || paymentKind === undefined || paidAt === null || Object.keys(errors).length > 0) return { ok: false, errors }
    const input: PaymentInput = {
      direction,
      kind: paymentKind,
      amount: { amount_minor: amount.amountMinor, currency: target.currency },
      method,
      paid_at: paidAt,
      note: note === '' ? null : note,
    }
    return { ok: true, input }
  }

  return {
    // Page commission_detail, part "Thanh toán": the balance.
    loadCommissionBalance(commissionId: string): Promise<ViewResult<BalanceView>> {
      return services.loadCommissionBalance(commissionId)
    },

    // Page payment_list: load (or reload) the balance and the payments.
    loadPaymentList(commissionId: string): Promise<ViewResult<PaymentListView>> {
      return services.loadPaymentList(commissionId)
    },

    // Page payment_form: what the form opens with (the commission's currency).
    openPaymentForm(commissionId: string): Promise<ViewResult<PaymentFormView>> {
      return services.openPaymentForm(commissionId)
    },

    // Page payment_form: save. Nothing is sent when the draft fails the format
    // check; the page keeps the draft as typed.
    async savePayment(target: PaymentFormTarget, draft: PaymentFormDraft): Promise<ViewResult<SavedPaymentView>> {
      const read = readDraft(target, draft)
      if (!read.ok) return services.rejectInput(read.errors)
      return services.savePayment(target, read.input)
    },

    // Page payment_list: "Hủy khoản này" (confirmed = false: nothing is sent,
    // the page asks) or "Xác nhận" (confirmed = true: void_payment).
    voidPayment(paymentId: string, confirmed: boolean): Promise<ViewResult<VoidOutcomeView>> {
      return services.voidPayment(paymentId, confirmed)
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type RecordPaymentRouters = ReturnType<typeof createRecordPaymentRouters>
export type { ViewResult } from '../../shared/results'
export type {
  BalanceLineView,
  BalanceView,
  ChoiceView,
  PaymentFormDraft,
  PaymentFormTarget,
  PaymentFormView,
  PaymentListView,
  PaymentRowView,
  SavedPaymentView,
  VoidOutcomeView,
} from './entities'
