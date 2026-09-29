/**
 * Screen hook of the page commission_detail (i5-screens.md, Step I5.1): calls
 * Routers, holds the result, hands it to the page. It formats nothing and
 * chooses no message: Services did that.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommissionDetailView, ViewResult } from '../../../logic/workflows/manage_commission/routers'
import { useLogic } from '../../logic_context'

export type CommissionDetailState = {
  // Latest result (the commission and its client); null before the first one arrives.
  detail: ViewResult<CommissionDetailView> | null
  loading: boolean
  // Load again (after "không kết nối được").
  reload: () => void
}

export function useCommissionDetail(commissionId: string): CommissionDetailState {
  const { manageCommission } = useLogic()
  const [detail, setDetail] = useState<ViewResult<CommissionDetailView> | null>(null)
  // true from the first render: the page loads as soon as it opens (UI-4).
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
    const r = await manageCommission.loadCommissionDetail(commissionId)
    running.current = false
    if (!mounted.current) return
    // hold
    setDetail(r)
    setLoading(false)
  }, [manageCommission, commissionId])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  // hand over
  return { detail, loading, reload: () => void load() }
}
