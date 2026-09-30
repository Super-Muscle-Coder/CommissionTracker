/**
 * Third screen hook of the page commission_detail, for its "Thanh toán" part
 * (plan of session 22, item 5: its own hook, its own load, its own errors).
 * The part uses the Routers of record_payment; the commission part keeps
 * use_commission_detail (manage_commission) and the "Tiến độ" part
 * use_commission_progress (update_progress). The three are never joined: the
 * page only places them side by side (ui_decomposition.md D4, I1.5). Like
 * every screen hook (i5-screens.md, Step I5.1): calls Routers, holds the
 * result, hands it to the page; it formats nothing and chooses no message.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BalanceView, ViewResult } from '../../../logic/workflows/record_payment/routers'
import { useLogic } from '../../logic_context'

export type CommissionBalanceState = {
  // Latest result (the three lines of the balance); null before the first one arrives.
  balance: ViewResult<BalanceView> | null
  loading: boolean
  // Load the part again ("Thử lại" of the part).
  reload: () => void
}

export function useCommissionBalance(commissionId: string): CommissionBalanceState {
  const { recordPayment } = useLogic()
  const [balance, setBalance] = useState<ViewResult<BalanceView> | null>(null)
  // true from the first render: the part loads as soon as the page opens (UI-4).
  const [loading, setLoading] = useState(true)
  // Technical timing only: no second call while one runs, no state update
  // after the page is gone.
  const running = useRef(false)
  const mounted = useRef(false)

  // call
  const load = useCallback(async () => {
    if (running.current) return
    running.current = true
    setLoading(true)
    const r = await recordPayment.loadCommissionBalance(commissionId)
    running.current = false
    if (!mounted.current) return
    // hold
    setBalance(r)
    setLoading(false)
  }, [recordPayment, commissionId])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  // hand over
  return { balance, loading, reload: () => void load() }
}
