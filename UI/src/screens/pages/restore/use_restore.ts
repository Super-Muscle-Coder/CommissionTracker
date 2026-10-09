/**
 * Screen hook of the page restore (i5-screens.md, Step I5.1): calls Routers,
 * holds the results, hands them to the page. It checks nothing and decides
 * nothing: Services decides every message, the question put before anything is
 * sent, and what the frame "Đang chờ khôi phục" shows after each call. The hook
 * only decides WHEN: read on opening, one operation at a time, and what the
 * page keeps when the person cancels the dialog or answers "Quay lại".
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PendingView, RunDone, RunOutcome, ViewResult } from '../../../logic/workflows/restore_data/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

// Which operation produced the result the page shows (its alert gets the matching title).
export type RestoreOperation = 'status' | 'choose' | 'prepare' | 'cancel'

// The latest result worth showing: its operation, and the ViewResult as Services gave it.
export type ShownResult = { operation: RestoreOperation; result: ViewResult<RunDone> }

// The question put in the page after a file was chosen: nothing has been sent yet.
export type Question = { path: string; text: string }

export type RestoreState = {
  // What is known of the restore waiting for the next start; unknown until the first answer.
  pending: PendingView
  // The latest result of a read, a dialog that failed, a prepare or a cancel; null until one exists.
  result: ShownResult | null
  // The question waiting for the answer "Chuẩn bị khôi phục" or "Quay lại"; null when none.
  question: Question | null
  // Reading the status, from the first frame (UI-4) until the answer.
  opening: boolean
  // From the press of "Chọn tệp sao lưu" until the dialog is closed.
  choosing: boolean
  // From "Chuẩn bị khôi phục" until the answer.
  preparing: boolean
  // From "Hủy lần khôi phục đang chờ" until the answer.
  canceling: boolean
  // "Chọn tệp sao lưu".
  choose: () => void
  // "Chuẩn bị khôi phục" in the question.
  confirm: () => void
  // "Quay lại" in the question: drop it, send nothing.
  dismiss: () => void
  // "Hủy lần khôi phục đang chờ".
  cancel: () => void
}

export function useRestore(): RestoreState {
  const { restoreData } = useLogic()
  const [pending, setPending] = useState<PendingView>({ state: 'unknown' })
  const [result, setResult] = useState<ShownResult | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  // UI-4: the page starts by reading the status, so the first frame is already the loading state.
  const [opening, setOpening] = useState(true)
  const [choosing, setChoosing] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  // Technical timing only: no second operation while one runs (two presses in the same
  // instant, before the button has been drawn disabled), no state update after the page is gone.
  const running = useRef(false)
  const mounted = useRef(false)
  // What the page holds now, handed to the call that needs it (the question says whether it replaces one).
  const waiting = pending.state === 'pending'

  // hold: the result of a call that can change what is waiting replaces what was shown, and the
  // frame takes the state Services gave back.
  const hold = useCallback((operation: RestoreOperation, outcome: RunOutcome) => {
    setResult({ operation, result: outcome.result })
    setPending(outcome.pending)
  }, [])

  // call, on opening — once.
  const open = useCallback(async () => {
    if (running.current) return
    running.current = true
    const outcome = await restoreData.loadStatus()
    running.current = false
    if (!mounted.current) return
    setOpening(false)
    hold('status', outcome)
  }, [restoreData, hold])

  useEffect(() => {
    mounted.current = true
    void open()
    return () => {
      mounted.current = false
    }
  }, [open])

  // call — "Chọn tệp sao lưu": the dialog, then the question (nothing is sent to prepare).
  const choose = useCallback(async () => {
    if (running.current) return
    running.current = true
    setChoosing(true)
    const r = await restoreData.chooseArchive(waiting)
    running.current = false
    if (!mounted.current) return
    setChoosing(false)
    // hold: a cancel changes nothing; a file gives the question; a failure is shown.
    switch (r.kind) {
      case 'ok':
        switch (r.view.outcome) {
          case 'canceled':
            break
          case 'chosen':
            setQuestion({ path: r.view.path, text: r.view.question })
            break
          default:
            assertNever(r.view)
        }
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        setResult({ operation: 'choose', result: r })
        break
      default:
        assertNever(r)
    }
  }, [restoreData, waiting])

  // call — "Chuẩn bị khôi phục", sent once, with the path that was chosen.
  const confirm = useCallback(async () => {
    if (running.current || question === null) return
    running.current = true
    setPreparing(true)
    const outcome = await restoreData.prepare(question.path)
    running.current = false
    if (!mounted.current) return
    setPreparing(false)
    setQuestion(null)
    hold('prepare', outcome)
  }, [restoreData, hold, question])

  // call — "Hủy lần khôi phục đang chờ".
  const cancel = useCallback(async () => {
    if (running.current) return
    running.current = true
    setCanceling(true)
    const outcome = await restoreData.cancel()
    running.current = false
    if (!mounted.current) return
    setCanceling(false)
    hold('cancel', outcome)
  }, [restoreData, hold])

  // hand over
  return {
    pending,
    result,
    question,
    opening,
    choosing,
    preparing,
    canceling,
    choose: () => void choose(),
    confirm: () => void confirm(),
    dismiss: () => setQuestion(null),
    cancel: () => void cancel(),
  }
}
