/**
 * Screen hook of the page backup (i5-screens.md, Step I5.1): calls Routers,
 * holds the results, hands them to the page. It checks nothing and decides
 * nothing: Services decides every message and the flow of the two steps
 * (choose a folder, then create the archive). The hook only decides WHEN: one
 * flow at a time, and what the page keeps when the person cancels.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BackupRunView, ViewResult } from '../../../logic/workflows/backup_data/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

// What the page can show once a press has ended in something to say: the
// created view (a cancel says nothing and is never held), or a failure.
export type ShownResult =
  | Exclude<ViewResult<BackupRunView>, { kind: 'ok' }>
  | { kind: 'ok'; view: Extract<BackupRunView, { outcome: 'created' }> }

export type BackupState = {
  // The latest result worth showing; null until one exists. A cancel leaves it as it was.
  result: ShownResult | null
  // From the press until the whole flow ends (dialog open, then creating): the button waits.
  running: boolean
  // Only while the archive is being made, after the folder has been chosen.
  creating: boolean
  // "Tạo bản sao lưu".
  start: () => void
}

export function useBackup(): BackupState {
  const { backupData } = useLogic()
  const [result, setResult] = useState<ShownResult | null>(null)
  const [running, setRunning] = useState(false)
  const [creating, setCreating] = useState(false)
  // Technical timing only: no second flow while one runs (two presses in the same
  // instant, before the button has been drawn disabled), no state update after the page is gone.
  const flowRunning = useRef(false)
  const mounted = useRef(false)

  // call — sent once: a second press while the flow runs is ignored.
  const start = useCallback(async () => {
    if (flowRunning.current) return
    flowRunning.current = true
    setRunning(true)
    const r = await backupData.createBackup(() => {
      // when: Services has the folder and is about to create the archive.
      if (mounted.current) setCreating(true)
    })
    flowRunning.current = false
    if (!mounted.current) return
    setCreating(false)
    setRunning(false)
    // hold: a cancel changes nothing; every other result replaces what was shown,
    // so a failure also takes away the result frame of an earlier press.
    switch (r.kind) {
      case 'ok':
        switch (r.view.outcome) {
          case 'canceled':
            break
          case 'created':
            setResult({ kind: 'ok', view: r.view })
            break
          default:
            assertNever(r.view)
        }
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        setResult(r)
        break
      default:
        assertNever(r)
    }
  }, [backupData])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // hand over
  return { result, running, creating, start: () => void start() }
}
