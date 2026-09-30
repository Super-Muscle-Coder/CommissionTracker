/**
 * Screen hook of the page payment_form (i5-screens.md, Step I5.1): calls
 * Routers, holds the draft (raw, exactly as typed) and the results, hands them
 * to the page. It checks nothing and decides nothing: Routers checks the
 * draft and writes paid_at; Services decides what the form opens with (the
 * commission's currency, the default date and time) and every message.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaymentFormDraft, PaymentFormView, SavedPaymentView, ViewResult } from '../../../logic/workflows/record_payment/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

export type PaymentFormState = {
  // Result of opening the page; null before it arrives.
  opened: ViewResult<PaymentFormView> | null
  opening: boolean
  // Open again (after "không kết nối được").
  reopen: () => void
  draft: PaymentFormDraft
  setField: (field: keyof PaymentFormDraft, value: string) => void
  // Latest result of "Lưu", as Routers returned it; null if none.
  saved: ViewResult<SavedPaymentView> | null
  // How many save results have arrived: a new number for each one, so the
  // page can ask the kit for the focus once per result (never 0 after one).
  saveCount: number
  saving: boolean
  save: () => void
}

const EMPTY_DRAFT: PaymentFormDraft = { direction: '', paymentKind: '', amount: '', method: '', paidAtLocal: '', note: '' }

export function usePaymentForm(commissionId: string, onSaved: (view: SavedPaymentView) => void): PaymentFormState {
  const { recordPayment } = useLogic()
  const [opened, setOpened] = useState<ViewResult<PaymentFormView> | null>(null)
  // true from the first render: the page opens as soon as it is shown (UI-4).
  const [opening, setOpening] = useState(true)
  const [draft, setDraft] = useState<PaymentFormDraft>(EMPTY_DRAFT)
  const [saved, setSaved] = useState<ViewResult<SavedPaymentView> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveCount, setSaveCount] = useState(0)
  // Technical timing only: no second call while one runs, no state update
  // after the page is gone.
  const openRunning = useRef(false)
  const saveRunning = useRef(false)
  const mounted = useRef(false)

  // call
  const open = useCallback(async () => {
    if (openRunning.current) return
    openRunning.current = true
    setOpening(true)
    const r = await recordPayment.openPaymentForm(commissionId)
    openRunning.current = false
    if (!mounted.current) return
    // hold: the result, and — when it is ok and has a form — the draft it starts from.
    setOpened(r)
    switch (r.kind) {
      case 'ok':
        if (r.view.supported) setDraft(r.view.draft)
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
    setOpening(false)
  }, [recordPayment, commissionId])

  // call — the draft is sent as typed; it stays as typed whatever the result.
  const save = useCallback(async () => {
    if (saveRunning.current || opened === null) return
    switch (opened.kind) {
      case 'ok': {
        // No form is shown for a currency that is not supported: nothing to send.
        if (!opened.view.supported) return
        saveRunning.current = true
        setSaving(true)
        const r = await recordPayment.savePayment(opened.view.target, draft)
        saveRunning.current = false
        if (!mounted.current) return
        // hold, then hand over: a saved payment goes to the page (which navigates).
        setSaved(r)
        setSaveCount((n) => n + 1)
        setSaving(false)
        switch (r.kind) {
          case 'ok':
            onSaved(r.view)
            break
          case 'rejected':
          case 'unreachable':
          case 'contract_violation':
            break
          default:
            assertNever(r)
        }
        break
      }
      // No form is shown unless the page opened: nothing to send.
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(opened)
    }
  }, [recordPayment, opened, draft, onSaved])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void open()
    return () => {
      mounted.current = false
    }
  }, [open])

  // hand over
  return {
    opened,
    opening,
    reopen: () => void open(),
    draft,
    // hold: an edit of the draft.
    setField: (field, value) => setDraft((d) => ({ ...d, [field]: value })),
    saved,
    saveCount,
    saving,
    save: () => void save(),
  }
}
