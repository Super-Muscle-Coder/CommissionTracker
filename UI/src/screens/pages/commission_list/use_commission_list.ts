/**
 * Screen hook of the page commission_list (i5-screens.md, Step I5.1): calls
 * Routers, holds the result, hands it to the page. It sorts nothing, joins
 * nothing and chooses no message: Services did that.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommissionListView, ViewResult } from '../../../logic/workflows/manage_commission/routers'
import { useLogic } from '../../logic_context'

export type CommissionListState = {
  // Latest result, as Routers returned it; null before the first one arrives.
  result: ViewResult<CommissionListView> | null
  // A load is running.
  loading: boolean
  // Load again (the reload button).
  reload: () => void
}

export function useCommissionList(): CommissionListState {
  const { manageCommission } = useLogic()
  const [result, setResult] = useState<ViewResult<CommissionListView> | null>(null)
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
    const r = await manageCommission.loadCommissionList()
    running.current = false
    if (!mounted.current) return
    // hold
    setResult(r)
    setLoading(false)
  }, [manageCommission])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  // hand over
  return { result, loading, reload: () => void load() }
}
