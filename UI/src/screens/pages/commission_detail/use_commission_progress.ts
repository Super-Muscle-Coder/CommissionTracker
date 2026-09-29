/**
 * Second screen hook of the page commission_detail, for its "Tiến độ" part
 * (plan of session 20, item 5: its own hook, its own load, its own errors).
 * The part uses the Routers of update_progress; the commission part keeps
 * use_commission_detail (manage_commission). The two are never joined: the
 * page only places them side by side (ui_decomposition.md D3, I1.5). Like
 * every screen hook (i5-screens.md, Step I5.1): calls Routers, holds the
 * result, hands it to the page; it formats nothing and chooses no message.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommissionProgressView, ViewResult } from '../../../logic/workflows/update_progress/routers'
import { useLogic } from '../../logic_context'

export type CommissionProgressState = {
  // Latest result (the current stage and the history); null before the first one arrives.
  progress: ViewResult<CommissionProgressView> | null
  loading: boolean
  // Load the part again ("Thử lại" of the part).
  reload: () => void
}

export function useCommissionProgress(commissionId: string): CommissionProgressState {
  const { updateProgress } = useLogic()
  const [progress, setProgress] = useState<ViewResult<CommissionProgressView> | null>(null)
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
    const r = await updateProgress.loadCommissionProgress(commissionId)
    running.current = false
    if (!mounted.current) return
    // hold
    setProgress(r)
    setLoading(false)
  }, [updateProgress, commissionId])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  // hand over
  return { progress, loading, reload: () => void load() }
}
