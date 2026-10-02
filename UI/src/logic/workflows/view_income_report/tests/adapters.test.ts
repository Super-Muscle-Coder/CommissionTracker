// Adapters of view_income_report — coverage matrix of i3-logic.md, Step I3.6,
// for the one call of ui_decomposition.md D5 (api_contract.yaml 4.0.0):
//   get_income_report   GET /reports/income   200 ok, 400 ERR_VALIDATION, 409 ERR_OUT_OF_RANGE, 500 ERR_STORAGE_IO
// Every declared label, unreachable, an undeclared label, a missing field, a
// wrong type, a wrong code, an integer outside the safe range (in every
// *_minor), extra fields dropped, one bad element of each list; and the request
// it sends (method, path, the two inputs on the query — endpoint_forms.http).
// Plus the cases the plan of session 24 (item 3) requires: period_from,
// period_to not formats.date (also a day that does not exist); generated_at
// not formats.timestamp; a currency not currency_code; a month not YYYY-MM;
// refunded_minor negative; the order of currencies and of by_month kept as
// received; negative received_net and outstanding ok; ±(2^53−1) ok.
// Fake http_client.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, Transport } from '../../../shared/resources'
import { createViewIncomeReportAdapters } from '../adapters'
import { VIEW_INCOME_REPORT_CONFIGS } from '../configs'
import type { IncomeReport } from '../entities'

const REPORT: IncomeReport = {
  period_from: '2026-01-01',
  period_to: '2026-09-30',
  currencies: [
    {
      currency: 'USD',
      received_net_minor: 2005,
      refunded_minor: 0,
      outstanding_minor: -755,
      by_month: [
        { month: '2026-08', received_net_minor: 505 },
        { month: '2026-09', received_net_minor: 1500 },
      ],
    },
    {
      currency: 'VND',
      received_net_minor: 5100000,
      refunded_minor: 500000,
      outstanding_minor: 6000000,
      by_month: [{ month: '2026-09', received_net_minor: 5100000 }],
    },
  ],
  generated_at: '2026-09-30T23:40:12+07:00',
}
const PERIOD = { period_from: '2026-01-01', period_to: '2026-09-30' }
const errorBody = (code: string) => ({ code, message: 'x', details: null })
const ERRORS: Record<number, string> = { 400: 'ERR_VALIDATION', 409: 'ERR_OUT_OF_RANGE', 500: 'ERR_STORAGE_IO' }

const withCurrency = (over: Record<string, unknown>) => ({ ...REPORT, currencies: [{ ...REPORT.currencies[0], ...over }] })
const withTop = (over: Record<string, unknown>) => ({ ...REPORT, ...over })
const omit = <T extends object>(o: T, k: string) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k))

function adaptersAnswering(t: Transport) {
  const send = vi.fn<HttpClient['send']>(async () => t)
  return { send, adapters: createViewIncomeReportAdapters({ send }, VIEW_INCOME_REPORT_CONFIGS) }
}
const respond = (label: number, body: unknown): Transport => ({ kind: 'response', label, body })
const read = (body: unknown) => adaptersAnswering(respond(200, body)).adapters.getIncomeReport(PERIOD)

let consoleError: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  consoleError.mockRestore()
})

describe('the label table of Configs matches api_contract.yaml 4.0.0 line by line', () => {
  it('has exactly the declared labels of the call', () => {
    const ep = VIEW_INCOME_REPORT_CONFIGS.endpoints.getIncomeReport
    expect([ep.method, ep.path, ep.labels]).toEqual(['GET', '/reports/income', { 200: 'ok', 400: 'ERR_VALIDATION', 409: 'ERR_OUT_OF_RANGE', 500: 'ERR_STORAGE_IO' }])
    expect(Object.keys(VIEW_INCOME_REPORT_CONFIGS.endpoints)).toEqual(['getIncomeReport'])
  })

  it('Configs name Data Schema 9.0.2 and API Contract 4.0.0', () => {
    expect(VIEW_INCOME_REPORT_CONFIGS.contract).toEqual({ apiContract: '4.0.0', dataSchema: '9.0.2' })
  })
})

describe('get_income_report', () => {
  it('sends GET /reports/income with both inputs on the query and no body', async () => {
    const { send, adapters } = adaptersAnswering(respond(200, REPORT))
    await adapters.getIncomeReport(PERIOD)
    expect(send).toHaveBeenCalledExactlyOnceWith('GET', '/reports/income', { query: { period_from: '2026-01-01', period_to: '2026-09-30' }, body: null })
  })

  it('label 200 with a valid body → ok, the data as checked', async () => {
    expect(await read(REPORT)).toEqual({ kind: 'ok', label: 200, data: REPORT })
  })

  it.each(Object.entries(ERRORS))('label %s with its declared code → declared_error, body untouched', async (label, code) => {
    const body = { code, message: 'Something failed', details: { field: 'x' } }
    const r = await adaptersAnswering(respond(Number(label), body)).adapters.getIncomeReport(PERIOD)
    expect(r).toEqual({ kind: 'declared_error', label: Number(label), error: body })
  })

  it.each(Object.entries(ERRORS))('label %s with another code → contract_violation', async (label, code) => {
    const other = code === 'ERR_CONFLICT' ? 'ERR_NOT_FOUND' : 'ERR_CONFLICT'
    const r = await adaptersAnswering(respond(Number(label), errorBody(other))).adapters.getIncomeReport(PERIOD)
    expect(r.kind).toBe('contract_violation')
  })

  it.each(Object.entries(ERRORS))('label %s with a body that is not error_body → contract_violation', async (label) => {
    const r = await adaptersAnswering(respond(Number(label), { code: 'ERR_STORAGE_IO', details: 'no' })).adapters.getIncomeReport(PERIOD)
    expect(r.kind).toBe('contract_violation')
  })

  it('no response → unreachable, the reason logged', async () => {
    const r = await adaptersAnswering({ kind: 'unreachable', reason: 'connection refused' }).adapters.getIncomeReport(PERIOD)
    expect(r).toEqual({ kind: 'unreachable', reason: 'connection refused' })
    expect(consoleError).toHaveBeenCalledWith('[view_income_report] unreachable: connection refused')
  })

  it.each([404, 422, 201])('undeclared label %s → contract_violation, the reason logged', async (label) => {
    const r = await adaptersAnswering(respond(label, errorBody('ERR_NOT_FOUND'))).adapters.getIncomeReport(PERIOD)
    expect(r.kind).toBe('contract_violation')
    expect(consoleError).toHaveBeenCalledWith(`[view_income_report] contract violation: label ${label} is not declared for get_income_report`)
  })

  it('an empty body on the ok label → contract_violation', async () => {
    expect((await read(null)).kind).toBe('contract_violation')
  })
})

describe('the body of label 200 is checked to the minimum of Step I3.3', () => {
  it.each(['period_from', 'period_to', 'currencies', 'generated_at'])('top-level field %s missing → contract_violation', async (field) => {
    expect((await read(omit(REPORT, field))).kind).toBe('contract_violation')
  })

  it.each(['currency', 'received_net_minor', 'refunded_minor', 'outstanding_minor', 'by_month'])('currency field %s missing → contract_violation', async (field) => {
    expect((await read({ ...REPORT, currencies: [omit(REPORT.currencies[0], field)] })).kind).toBe('contract_violation')
  })

  it.each(['month', 'received_net_minor'])('month field %s missing → contract_violation', async (field) => {
    expect((await read(withCurrency({ by_month: [omit(REPORT.currencies[0].by_month[0], field)] }))).kind).toBe('contract_violation')
  })

  it.each([
    ['period_from', 20260101],
    ['generated_at', null],
    ['currencies', {}],
  ])('top-level field %s of the wrong type → contract_violation', async (field, value) => {
    expect((await read(withTop({ [field]: value }))).kind).toBe('contract_violation')
  })

  it.each([
    ['currency', 5],
    ['received_net_minor', '5100000'],
    ['refunded_minor', 1.5],
    ['outstanding_minor', null],
    ['by_month', 'none'],
  ])('currency field %s of the wrong type → contract_violation', async (field, value) => {
    expect((await read(withCurrency({ [field]: value }))).kind).toBe('contract_violation')
  })

  it('a month row whose amount is a string → contract_violation', async () => {
    expect((await read(withCurrency({ by_month: [{ month: '2026-09', received_net_minor: '1' }] }))).kind).toBe('contract_violation')
  })

  it.each([9007199254740992, -9007199254740992])('received_net_minor %s outside ±(2^53−1) → contract_violation', async (value) => {
    expect((await read(withCurrency({ received_net_minor: value }))).kind).toBe('contract_violation')
    expect(String(consoleError.mock.calls.at(-1)?.[0])).toContain('received_net_minor')
  })

  it.each([9007199254740992, -9007199254740992])('outstanding_minor %s outside ±(2^53−1) → contract_violation', async (value) => {
    expect((await read(withCurrency({ outstanding_minor: value }))).kind).toBe('contract_violation')
  })

  it('refunded_minor above 2^53−1 → contract_violation', async () => {
    expect((await read(withCurrency({ refunded_minor: 9007199254740992 }))).kind).toBe('contract_violation')
  })

  it.each([9007199254740992, -9007199254740992])('a month amount %s outside ±(2^53−1) → contract_violation', async (value) => {
    expect((await read(withCurrency({ by_month: [{ month: '2026-09', received_net_minor: value }] }))).kind).toBe('contract_violation')
  })

  it('a rounded integer (2^53 as JSON parsers give it) is caught right after parsing', async () => {
    expect((await read(withCurrency({ received_net_minor: Number('9007199254740993') }))).kind).toBe('contract_violation')
  })

  it('±(2^53−1) themselves are ok, in every *_minor', async () => {
    const body = withCurrency({
      received_net_minor: 9007199254740991,
      refunded_minor: 9007199254740991,
      outstanding_minor: -9007199254740991,
      by_month: [{ month: '2026-09', received_net_minor: -9007199254740991 }],
    })
    expect(await read(body)).toEqual({ kind: 'ok', label: 200, data: body })
  })

  it('refunded_minor negative → contract_violation (the contract says >= 0)', async () => {
    expect((await read(withCurrency({ refunded_minor: -1 }))).kind).toBe('contract_violation')
    expect(String(consoleError.mock.calls.at(-1)?.[0])).toContain('refunded_minor')
  })

  it('refunded_minor 0 is ok', async () => {
    expect((await read(withCurrency({ refunded_minor: 0 }))).kind).toBe('ok')
  })

  it('a negative received_net_minor and a negative outstanding_minor are ok (the contract lets both go below zero)', async () => {
    const body = withCurrency({ received_net_minor: -500000, outstanding_minor: -1 })
    expect(await read(body)).toEqual({ kind: 'ok', label: 200, data: body })
  })
})

describe('dates, time, currency and month follow the formats of the contract', () => {
  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '2026-04-31', '2025-02-29', '0000-01-01', '2026-9-1', '20260-01-01', '01/01/2026', '2026-01-01T00:00:00+07:00', ''])(
    'period_from %j is not formats.date (or names no day) → contract_violation',
    async (value) => {
      expect((await read(withTop({ period_from: value }))).kind).toBe('contract_violation')
    },
  )

  it.each(['2026-02-30', 'x', '2026-1-31'])('period_to %j → contract_violation', async (value) => {
    expect((await read(withTop({ period_to: value }))).kind).toBe('contract_violation')
  })

  it.each(['2024-02-29', '2000-02-29', '2026-12-31', '0001-01-01'])('period_from %j names a day → ok', async (value) => {
    expect((await read(withTop({ period_from: value }))).kind).toBe('ok')
  })

  it.each(['2026-09-30', '2026-09-30T23:40:12', '2026-09-30T23:40:12.500+07:00x', 'yesterday', 20260930, ''])('generated_at %j is not formats.timestamp → contract_violation', async (value) => {
    expect((await read(withTop({ generated_at: value }))).kind).toBe('contract_violation')
  })

  it.each(['2026-09-30T23:40:12+07:00', '2026-09-30T16:40:12Z', '2026-09-30T23:40+07:00', '2026-09-30T23:40:12.250-05:00'])('generated_at %j → ok', async (value) => {
    expect((await read(withTop({ generated_at: value }))).kind).toBe('ok')
  })

  it.each(['vnd', 'VN', 'VNDD', 'V1D', '', ' VND'])('currency %j is not currency_code → contract_violation', async (value) => {
    expect((await read(withCurrency({ currency: value }))).kind).toBe('contract_violation')
  })

  it('a currency the interface does not know (EUR) is still ok: the format is the contract', async () => {
    expect((await read(withCurrency({ currency: 'EUR' }))).kind).toBe('ok')
  })

  it.each(['2026-13', '2026-00', '2026-9', '26-09', '2026-09-01', '2026/09', 'September', ''])('month %j is not YYYY-MM → contract_violation', async (value) => {
    expect((await read(withCurrency({ by_month: [{ month: value, received_net_minor: 1 }] }))).kind).toBe('contract_violation')
  })

  it.each(['2026-01', '2026-12', '1999-06'])('month %j → ok', async (value) => {
    expect((await read(withCurrency({ by_month: [{ month: value, received_net_minor: 1 }] }))).kind).toBe('ok')
  })
})

describe('lists and extra fields', () => {
  it('currencies with exactly one element of the wrong shape → contract_violation', async () => {
    expect((await read(withTop({ currencies: [REPORT.currencies[0], { ...REPORT.currencies[1], currency: 'vnd' }] }))).kind).toBe('contract_violation')
  })

  it('by_month with exactly one element of the wrong shape → contract_violation', async () => {
    const good = { month: '2026-08', received_net_minor: 1 }
    expect((await read(withCurrency({ by_month: [good, { month: '2026-09' }] }))).kind).toBe('contract_violation')
  })

  it('an empty currencies list and an empty by_month are ok', async () => {
    expect(await read(withTop({ currencies: [] }))).toEqual({ kind: 'ok', label: 200, data: withTop({ currencies: [] }) })
    const noMonths = withCurrency({ by_month: [] })
    expect(await read(noMonths)).toEqual({ kind: 'ok', label: 200, data: noMonths })
  })

  it('extra fields — at the top, in a currency, in a month — are dropped, not rejected', async () => {
    const withExtra = {
      ...REPORT,
      total_minor: 1,
      currencies: REPORT.currencies.map((c) => ({ ...c, share: 0.5, by_month: c.by_month.map((m) => ({ ...m, count: 3 })) })),
    }
    expect(await read(withExtra)).toEqual({ kind: 'ok', label: 200, data: REPORT })
  })

  it('the order of currencies and of by_month is kept as received: not checked, not sorted', async () => {
    const unordered = {
      ...REPORT,
      currencies: [
        { ...REPORT.currencies[1] },
        { ...REPORT.currencies[0], by_month: [{ month: '2026-09', received_net_minor: 1500 }, { month: '2026-08', received_net_minor: 505 }] },
      ],
    }
    expect(await read(unordered)).toEqual({ kind: 'ok', label: 200, data: unordered })
  })
})
