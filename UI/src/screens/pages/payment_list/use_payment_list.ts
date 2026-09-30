/**
 * Screen hook of the page payment_list (i5-screens.md, Step I5.1): calls
 * Routers, holds the results, hands them to the page. It checks nothing and
 * decides nothing: Services decides that voiding is asked first, and every
 * message. The hook only decides WHEN to call again (after a voiding that
 * reached the backend, the balance and the list are read again).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaymentListView, VoidOutcomeView, ViewResult } from '../../../logic/workflows/record_payment/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

// The question waiting for an answer: which payment, and what Services said.
export type VoidQuestion = { paymentId: string; result: ViewResult<VoidOutcomeView> }

export type PaymentListState = {
  // Latest result (the balance and the payments); null before the first one arrives.
  list: ViewResult<PaymentListView> | null
  loading: boolean
  // Load again ("Tải lại", "Thử lại").
  reload: () => void
  // The question that waits for "Xác nhận" or "Quay lại"; null if none.
  question: VoidQuestion | null
  // "Hủy khoản này": asks Services, which says the payment is not voided until confirmed.
  askVoid: (paymentId: string) => void
  // "Xác nhận": voids the payment of the question.
  confirmVoid: () => void
  // "Quay lại" of the question: forget it, send nothing.
  dismissVoid: () => void
  // A void_payment is running: no second one, no second "Xác nhận".
  voiding: boolean
  // Latest result of a confirmed voiding; null if none since the page opened or since the last question.
  voided: ViewResult<VoidOutcomeView> | null
}

export function usePaymentList(commissionId: string): PaymentListState {
  const { recordPayment } = useLogic()
  const [list, setList] = useState<ViewResult<PaymentListView> | null>(null)
  // true from the first render: the page loads as soon as it opens (UI-4).
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<VoidQuestion | null>(null)
  const [voiding, setVoiding] = useState(false)
  const [voided, setVoided] = useState<ViewResult<VoidOutcomeView> | null>(null)
  // Technical timing only: no second call while one runs, no state update
  // after the page is gone.
  const running = useRef(false)
  const voidRunning = useRef(false)
  const mounted = useRef(false)

  // call
  const load = useCallback(async () => {
    if (running.current) return
    running.current = true
    setLoading(true)
    const r = await recordPayment.loadPaymentList(commissionId)
    running.current = false
    if (!mounted.current) return
    // hold
    setList(r)
    setLoading(false)
  }, [recordPayment, commissionId])

  // call — after a voiding the backend refused, the list is read again
  // without replacing what is shown by a failure: the latest good list stays
  // if this reading fails too (D4: "danh sách giữ nguyên").
  const refreshQuietly = useCallback(async () => {
    if (running.current) return
    running.current = true
    const r = await recordPayment.loadPaymentList(commissionId)
    running.current = false
    if (!mounted.current) return
    switch (r.kind) {
      case 'ok':
        // hold
        setList(r)
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
  }, [recordPayment, commissionId])

  // call
  const askVoid = useCallback(
    async (paymentId: string) => {
      const r = await recordPayment.voidPayment(paymentId, false)
      if (!mounted.current) return
      // hold
      setVoided(null)
      setQuestion({ paymentId, result: r })
    },
    [recordPayment],
  )

  // call — sent once: a second press while it runs is ignored.
  const confirmVoid = useCallback(async () => {
    if (voidRunning.current || question === null) return
    voidRunning.current = true
    setVoiding(true)
    const r = await recordPayment.voidPayment(question.paymentId, true)
    voidRunning.current = false
    if (!mounted.current) return
    // hold
    setVoided(r)
    setQuestion(null)
    setVoiding(false)
    // when: the backend answered — read the balance and the list again.
    switch (r.kind) {
      case 'ok':
        await load()
        break
      case 'rejected':
        await refreshQuietly()
        break
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
  }, [recordPayment, question, load, refreshQuietly])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  // hand over
  return {
    list,
    loading,
    reload: () => void load(),
    question,
    askVoid: (paymentId) => void askVoid(paymentId),
    confirmVoid: () => void confirmVoid(),
    // hold: the question is forgotten; nothing was sent.
    dismissVoid: () => setQuestion(null),
    voiding,
    voided,
  }
}
