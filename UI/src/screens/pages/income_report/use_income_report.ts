/**
 * Screen hook of the page income_report (i5-screens.md, Step I5.1): calls
 * Routers, holds the draft of the period (the two dates as chosen, nothing
 * converted) and the results, hands them to the page. It checks nothing,
 * writes no date and chooses no message: Routers checks the draft, Services
 * decides the default period, the numbers and every sentence.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { IncomePeriodDraft, IncomeReportView, ViewResult } from '../../../logic/workflows/view_income_report/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

// A draft that failed the format check: what the page shows next to the fields.
export type InputRejection = { message: string; fieldErrors: Record<string, string> }

export type IncomeReportState = {
  draft: IncomePeriodDraft
  setField: (field: keyof IncomePeriodDraft, value: string) => void
  // Latest result of a LOAD, as Routers returned it: the report, or the failure
  // that replaced it. null before the first one arrives. A draft that fails
  // the format check is not a load: it never replaces this.
  report: ViewResult<IncomeReportView> | null
  // Latest draft that failed the format check; null once a later press was accepted.
  rejection: InputRejection | null
  // How many format rejections have arrived: a new number for each one, so the
  // page can ask the kit for the focus once per rejection (never 0 after one).
  rejectionCount: number
  loading: boolean
  // "Xem báo cáo": send the draft as it stands.
  view: () => void
}

export function useIncomeReport(): IncomeReportState {
  const { viewIncomeReport } = useLogic()
  // The period the page opens with: decided by Services, from the clock Main handed over.
  const [draft, setDraft] = useState<IncomePeriodDraft>(() => viewIncomeReport.defaultPeriod())
  const [report, setReport] = useState<ViewResult<IncomeReportView> | null>(null)
  const [rejection, setRejection] = useState<InputRejection | null>(null)
  const [rejectionCount, setRejectionCount] = useState(0)
  // true from the first render: the report loads as soon as the page opens (UI-4).
  const [loading, setLoading] = useState(true)
  // Technical timing only: no second call while one runs, no state update
  // after the page is gone.
  const running = useRef(false)
  const mounted = useRef(false)
  // The draft the page opened with: what the first load sends.
  const opening = useRef(draft)

  // call — the draft is sent as chosen.
  const run = useCallback(
    async (d: IncomePeriodDraft) => {
      if (running.current) return
      running.current = true
      setLoading(true)
      const r = await viewIncomeReport.viewIncomeReport(d)
      running.current = false
      if (!mounted.current) return
      // hold: a rejected draft leaves the report on the screen; any other
      // result replaces it (an old report never stays next to a new failure).
      switch (r.kind) {
        case 'ok':
        case 'unreachable':
        case 'contract_violation':
          setReport(r)
          setRejection(null)
          break
        case 'rejected':
          if (r.origin === 'input') {
            setRejection({ message: r.message, fieldErrors: r.fieldErrors })
            setRejectionCount((n) => n + 1)
          } else {
            setReport(r)
            setRejection(null)
          }
          break
        default:
          assertNever(r)
      }
      setLoading(false)
    },
    [viewIncomeReport],
  )

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void run(opening.current)
    return () => {
      mounted.current = false
    }
  }, [run])

  // hand over
  return {
    draft,
    // hold: an edit of the draft.
    setField: (field, value) => setDraft((d) => ({ ...d, [field]: value })),
    report,
    rejection,
    rejectionCount,
    loading,
    view: () => void run(draft),
  }
}
