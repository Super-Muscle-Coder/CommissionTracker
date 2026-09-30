/**
 * Entities of the interface workflow record_payment: types only. Types at the
 * boundary keep the contract's field names (data_schema.yaml 9.0.0,
 * clause_a_common types and clause_b_backend.record_payment).
 */

// Realizes clause_a_common.types.money.
export type Money = {
  amount_minor: number
  currency: string
}

// Realizes payment_record.direction: 'incoming' | 'refund'.
export type PaymentDirection = 'incoming' | 'refund'

// Realizes payment_record.kind: 'deposit' | 'milestone' | 'final' | 'tip' | 'other'.
export type PaymentKind = 'deposit' | 'milestone' | 'final' | 'tip' | 'other'

// Realizes clause_a_common.types.payment_record: object { payment_id: id,
// commission_id: id, direction, kind, amount: money, method: string, paid_at:
// timestamp, note: string|null, is_voided: boolean }.
export type PaymentRecord = {
  payment_id: string
  commission_id: string
  direction: PaymentDirection
  kind: PaymentKind
  amount: Money
  method: string
  paid_at: string
  note: string | null
  is_voided: boolean
}

// Realizes payment_list: list[payment_record] — voided ones included, newest
// first by the instant of paid_at.
export type PaymentList = PaymentRecord[]

// Realizes commission_balance: object { commission_id: id, agreed: money,
// received_net: money, outstanding: money } (outstanding may be negative).
export type CommissionBalance = {
  commission_id: string
  agreed: Money
  received_net: Money
  outstanding: Money
}

// Realizes payment_input (sent): object { direction, kind, amount: money
// (amount_minor > 0), method: string (1.. characters, not blank), paid_at:
// timestamp, note: string|null }. Exactly these six fields.
export type PaymentInput = {
  direction: PaymentDirection
  kind: PaymentKind
  amount: Money
  method: string
  paid_at: string
  note: string | null
}

// The clock Main hands to Services (D4: "bây giờ" comes from one place, so a
// test can fix the instant).
export type Now = () => Date

// --- raw input from the page (what the user typed), handed to Routers ---------

export type PaymentFormDraft = {
  // The chosen direction: 'incoming' or 'refund'.
  direction: string
  // The chosen kind of payment ('' = "Chọn khoản", nothing chosen).
  paymentKind: string
  // The amount as typed, without the currency ("1.500.000", "12,50").
  amount: string
  // The method as typed.
  method: string
  // The value of the date-time input: YYYY-MM-DDTHH:mm ('' = none).
  paidAtLocal: string
  note: string
}

// What saving needs besides the draft: the commission, and the currency of
// its agreed price (a payment's currency must equal it, so the form never
// lets it be chosen).
export type PaymentFormTarget = {
  commissionId: string
  currency: string
}

// --- view models — the interface's own -----------------------------------------

export type ChoiceView = { value: string; label: string }

// One line of the balance: "Giá thỏa thuận" → "1.500.000 VND".
export type BalanceLineView = { key: string; term: string; text: string }

export type BalanceView = { lines: BalanceLineView[] }

// One payment of the list.
export type PaymentRowView = {
  paymentId: string
  // "<direction> <amount> · <kind>".
  text: string
  // "<date time> · <method>[ · <note>][ · Đã hủy]".
  detailText: string
  // false for a payment that is voided: it has no "Hủy khoản này".
  canVoid: boolean
}

// What payment_list shows: the balance, then the payments.
export type PaymentListView = {
  balance: BalanceView
  rows: PaymentRowView[]
  isEmpty: boolean
  emptyText: string
}

// What payment_form opens with: a form, or the statement that the currency of
// the commission is not supported by the interface.
export type PaymentFormView =
  | {
      supported: true
      target: PaymentFormTarget
      // The currency of the commission, shown as text next to the amount.
      currencyText: string
      directionChoices: ChoiceView[]
      kindChoices: ChoiceView[]
      chooseKindLabel: string
      methodSuggestions: readonly string[]
      draft: PaymentFormDraft
    }
  | { supported: false; unsupportedText: string }

// Outcome of saving a payment.
export type SavedPaymentView = { commissionId: string; message: string }

// Outcome of asking to void a payment: either nothing was sent and the user
// must confirm first, or the payment was voided.
export type VoidOutcomeView =
  | { outcome: 'needs_confirmation'; message: string }
  | { outcome: 'voided'; message: string }
