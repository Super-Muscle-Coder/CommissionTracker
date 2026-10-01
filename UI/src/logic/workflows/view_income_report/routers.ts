/**
 * Routers of the interface workflow view_income_report: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing the page income_report does (.design/ui_decomposition.md, "Chặng D5"):
 * the period it opens with, and the report of a period.
 */
import type { InputFormatCode, ViewResult } from '../../shared/results'
import type { IncomePeriod, IncomePeriodDraft, IncomeReportView } from './entities'
import type { ViewIncomeReportServices } from './services'

// The two values of the inputs, if they name a day of the calendar: the value
// of a date input, YYYY-MM-DD with a four-digit year (the input lets a longer
// year be typed, so this is checked). Year 0000, 30 February and month 13
// are not days.
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function isCalendarDate(value: string): boolean {
  const m = DATE.exec(value)
  if (m === null) return false
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  return day <= daysInMonth
}

export function createViewIncomeReportRouters(services: ViewIncomeReportServices) {
  // Format check and conversion of the draft, before anything is sent
  // (ui_decomposition.md D5, page income_report). Rules copied from the
  // contract (data_schema.yaml 9.0.1 view_income_report.input_expected and
  // .description, formats.date):
  //   - period_from, period_to: formats.date, a day that exists → else
  //     'required' (empty) / 'not_date';
  //   - period_from after period_to is invalid → 'violates_type_constraint' on
  //     period_to. Two equal days are valid (both days are counted).
  // No rule of the interface only. Field keys are the contract's input names.
  function readDraft(draft: IncomePeriodDraft): { ok: true; period: IncomePeriod } | { ok: false; errors: Record<string, InputFormatCode> } {
    const errors: Record<string, InputFormatCode> = {}
    if (draft.periodFrom === '') errors.period_from = 'required'
    else if (!isCalendarDate(draft.periodFrom)) errors.period_from = 'not_date'
    if (draft.periodTo === '') errors.period_to = 'required'
    else if (!isCalendarDate(draft.periodTo)) errors.period_to = 'not_date'
    // Both are real days with four-digit years, so the text order is the calendar order.
    if (Object.keys(errors).length === 0 && draft.periodFrom > draft.periodTo) errors.period_to = 'violates_type_constraint'
    if (Object.keys(errors).length > 0) return { ok: false, errors }
    return { ok: true, period: { period_from: draft.periodFrom, period_to: draft.periodTo } }
  }

  return {
    // Page income_report, when it opens: the period the inputs start with.
    defaultPeriod(): IncomePeriodDraft {
      return services.defaultPeriod()
    },

    // Page income_report: "Xem báo cáo", also the first load. Nothing is sent
    // when the draft fails the format check; the page keeps the draft as chosen.
    async viewIncomeReport(draft: IncomePeriodDraft): Promise<ViewResult<IncomeReportView>> {
      const read = readDraft(draft)
      if (!read.ok) return services.rejectInput(read.errors)
      return services.loadIncomeReport(read.period)
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type ViewIncomeReportRouters = ReturnType<typeof createViewIncomeReportRouters>
export type { ViewResult } from '../../shared/results'
export type { CurrencySectionView, IncomeLineView, IncomePeriodDraft, IncomeReportView } from './entities'
