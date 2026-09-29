/**
 * Screen hook of the page stage_change (i5-screens.md, Step I5.1): calls
 * Routers, holds the draft (raw, exactly as typed) and the results, hands
 * them to the page. It checks nothing and decides nothing: Routers checks the
 * draft; Services decides which stages are offered, which ones need a
 * confirmation first, and every message.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { StageChangeDraft, StageChangeOutcomeView, StageChangeView, ViewResult } from '../../../logic/workflows/update_progress/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

export type StageChangeState = {
  // Result of opening the page; null before it arrives.
  opened: ViewResult<StageChangeView> | null
  opening: boolean
  // Open again (after "không kết nối được").
  reopen: () => void
  draft: StageChangeDraft
  setField: (field: keyof StageChangeDraft, value: string) => void
  // Latest result of "Lưu" or "Xác nhận", as Routers returned it (kept while
  // the user answers the confirmation or fixes the draft); null if none.
  saved: ViewResult<StageChangeOutcomeView> | null
  // How many save results have arrived: a new number for each one, so the
  // page can ask the kit for the focus once per result (never 0 after one).
  saveCount: number
  saving: boolean
  // "Lưu": confirmed = false; "Xác nhận": confirmed = true.
  save: (confirmed: boolean) => void
  // "Quay lại" of the confirmation: forget the question, keep the draft.
  dismiss: () => void
}

const EMPTY_DRAFT: StageChangeDraft = { toStage: '', note: '' }

export function useStageChange(commissionId: string, onChanged: (commissionId: string, message: string) => void): StageChangeState {
  const { updateProgress } = useLogic()
  const [opened, setOpened] = useState<ViewResult<StageChangeView> | null>(null)
  // true from the first render: the page opens as soon as it is shown (UI-4).
  const [opening, setOpening] = useState(true)
  const [draft, setDraft] = useState<StageChangeDraft>(EMPTY_DRAFT)
  const [saved, setSaved] = useState<ViewResult<StageChangeOutcomeView> | null>(null)
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
    const r = await updateProgress.openStageChange(commissionId)
    openRunning.current = false
    if (!mounted.current) return
    // hold: the result, and — when it is ok — the draft it starts from.
    setOpened(r)
    switch (r.kind) {
      case 'ok':
        setDraft(r.view.draft)
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
    setOpening(false)
  }, [updateProgress, commissionId])

  // call — the draft is sent as typed; it stays as typed whatever the result.
  const save = useCallback(
    async (confirmed: boolean) => {
      if (saveRunning.current || opened === null) return
      switch (opened.kind) {
        case 'ok': {
          saveRunning.current = true
          setSaving(true)
          const r = await updateProgress.saveStageChange(opened.view.target, draft, confirmed)
          saveRunning.current = false
          if (!mounted.current) return
          // hold, then hand over: a changed stage goes to the page (which navigates).
          setSaved(r)
          setSaveCount((n) => n + 1)
          setSaving(false)
          switch (r.kind) {
            case 'ok':
              switch (r.view.outcome) {
                case 'changed':
                  onChanged(r.view.commissionId, r.view.message)
                  break
                case 'needs_confirmation':
                  break
                default:
                  assertNever(r.view)
              }
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
    },
    [updateProgress, opened, draft, onChanged],
  )

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
    save: (confirmed) => void save(confirmed),
    // hold: the question is forgotten; the draft stays.
    dismiss: () => setSaved(null),
  }
}
