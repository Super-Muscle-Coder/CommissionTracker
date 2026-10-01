// Routers of view_income_report — i3-logic.md, Step I3.6: for each input a
// draft that fails the format check → rejected (input) and Services is not
// called; a valid draft → Services is called with the converted data. The
// cases the plan of session 24 (item 3) requires: an empty field; a year of
// five digits ("20260-01-01"); a day that does not exist ("2026-02-30"); from
// after to (the error is on "Đến ngày"); two equal days valid.
import { describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { ViewResult } from '../../../shared/results'
import type { IncomePeriodDraft, IncomeReportView } from '../entities'
import { createViewIncomeReportRouters } from '../routers'
import type { ViewIncomeReportServices } from '../services'

const VIEW: IncomeReportView = { periodText: 'x', sections: [], isEmpty: true, emptyText: 'y' }
const OK: ViewResult<IncomeReportView> = { kind: 'ok', view: VIEW }
const REJECTED: ViewResult<never> = { kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: 'rejected', fieldErrors: {} }

function setup() {
  const services = {
    defaultPeriod: vi.fn((): IncomePeriodDraft => ({ periodFrom: '2026-01-01', periodTo: '2026-09-30' })),
    loadIncomeReport: vi.fn(async () => OK),
    rejectInput: vi.fn<ViewIncomeReportServices['rejectInput']>(() => REJECTED),
  } satisfies ViewIncomeReportServices
  return { services, routers: createViewIncomeReportRouters(services) }
}
const draft = (periodFrom: string, periodTo: string): IncomePeriodDraft => ({ periodFrom, periodTo })

describe('defaultPeriod', () => {
  it('hands over what Services decided, and calls nothing else', () => {
    const { services, routers } = setup()
    expect(routers.defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-09-30' })
    expect(services.defaultPeriod).toHaveBeenCalledTimes(1)
    expect(services.loadIncomeReport).not.toHaveBeenCalled()
  })
})

describe('viewIncomeReport: a valid draft is converted and sent', () => {
  it('passes the two days under the contract\'s input names', async () => {
    const { services, routers } = setup()
    expect(await routers.viewIncomeReport(draft('2026-08-01', '2026-09-30'))).toBe(OK)
    expect(services.loadIncomeReport).toHaveBeenCalledExactlyOnceWith({ period_from: '2026-08-01', period_to: '2026-09-30' })
    expect(services.rejectInput).not.toHaveBeenCalled()
  })

  it('two equal days are valid (both days are counted)', async () => {
    const { services, routers } = setup()
    await routers.viewIncomeReport(draft('2026-09-30', '2026-09-30'))
    expect(services.loadIncomeReport).toHaveBeenCalledExactlyOnceWith({ period_from: '2026-09-30', period_to: '2026-09-30' })
  })

  it.each([
    ['2024-02-29', '2024-03-01'],
    ['2000-02-29', '2000-02-29'],
    ['0001-01-01', '9999-12-31'],
    ['2026-12-31', '2027-01-01'],
  ])('%s to %s is valid', async (from, to) => {
    const { services, routers } = setup()
    await routers.viewIncomeReport(draft(from, to))
    expect(services.loadIncomeReport).toHaveBeenCalledTimes(1)
  })
})

describe('viewIncomeReport: a draft that fails the format check is rejected, nothing is sent', () => {
  async function rejected(d: IncomePeriodDraft) {
    const { services, routers } = setup()
    const r = await routers.viewIncomeReport(d)
    expect(r).toBe(REJECTED)
    expect(services.loadIncomeReport).not.toHaveBeenCalled()
    return services.rejectInput.mock.calls[0][0]
  }

  it('an empty "from" → required on period_from', async () => {
    expect(await rejected(draft('', '2026-09-30'))).toEqual({ period_from: 'required' })
  })

  it('an empty "to" → required on period_to', async () => {
    expect(await rejected(draft('2026-01-01', ''))).toEqual({ period_to: 'required' })
  })

  it('both empty → required on both, in one rejection', async () => {
    expect(await rejected(draft('', ''))).toEqual({ period_from: 'required', period_to: 'required' })
  })

  it.each(['20260-01-01', '+2026-01-01', '2026-1-1', '26-01-01', '2026/01/01', '01/01/2026', 'x', ' 2026-01-01', '2026-01-01T00:00', '2026-01-011'])(
    'a year of five digits or another shape (%j) → not_date',
    async (value) => {
      expect(await rejected(draft(value, '2026-09-30'))).toEqual({ period_from: 'not_date' })
      expect(await rejected(draft('2026-01-01', value))).toEqual({ period_to: 'not_date' })
    },
  )

  it.each(['2026-02-30', '2026-02-29', '2025-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00', '2026-01-32', '0000-01-01', '2100-02-29'])(
    'a day that does not exist (%j) → not_date',
    async (value) => {
      expect(await rejected(draft(value, '9999-12-31'))).toEqual({ period_from: 'not_date' })
      expect(await rejected(draft('0001-01-01', value))).toEqual({ period_to: 'not_date' })
    },
  )

  it('from after to → the error is on period_to (the "Đến ngày" field), not on period_from', async () => {
    expect(await rejected(draft('2026-10-01', '2026-09-30'))).toEqual({ period_to: 'violates_type_constraint' })
  })

  it('from one day after to → still an error', async () => {
    expect(await rejected(draft('2026-09-30', '2026-09-29'))).toEqual({ period_to: 'violates_type_constraint' })
  })

  it('from after to across a year → an error', async () => {
    expect(await rejected(draft('2027-01-01', '2026-12-31'))).toEqual({ period_to: 'violates_type_constraint' })
  })

  it('the order is not judged while a day is missing or not real: only that field is reported', async () => {
    expect(await rejected(draft('2026-10-01', ''))).toEqual({ period_to: 'required' })
    expect(await rejected(draft('2026-10-01', '2026-02-30'))).toEqual({ period_to: 'not_date' })
    expect(await rejected(draft('2026-02-30', '2026-01-01'))).toEqual({ period_from: 'not_date' })
  })

  it('a bad "from" and a good "to" report the "from" only', async () => {
    expect(await rejected(draft('2026-02-30', '2026-09-30'))).toEqual({ period_from: 'not_date' })
  })
})
