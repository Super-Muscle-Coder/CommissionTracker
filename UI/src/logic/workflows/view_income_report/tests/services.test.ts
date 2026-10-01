// Services of view_income_report — i3-logic.md, Step I3.6: every CallResult
// kind maps to the right ViewResult; every declared error code has a message
// (walked from the label table of Configs, not listed by hand); each
// presentation decision of ui_decomposition.md D5 has a case, plus the cases
// the plan of session 24 (item 3) requires: the default period (1 January and
// 31 December, and the moments around midnight where the UTC day is not the
// machine's day — the default follows the machine's clock); amounts (negative
// received_net and outstanding, USD with fractions, a code not in the table,
// ±(2^53−1)); months (2026-09 → "Tháng 9/2026", 2026-12 → "Tháng 12/2026");
// by_month empty; currencies empty; 400 and 409 with two different sentences;
// no old report in a result that is not ok.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { CallResult, ResultMessages } from '../../../shared/results'
import type { ViewIncomeReportAdapters } from '../adapters'
import { VIEW_INCOME_REPORT_CONFIGS } from '../configs'
import type { IncomeCurrency, IncomeReport } from '../entities'
import { createViewIncomeReportServices } from '../services'

// The layer-level messages Main hands to every Services (R2: the workflow's
// tests bring their own instead of the layer configuration).
const messages: ResultMessages = {
  unreachable: 'test: unreachable',
  contractViolation: 'test: contract violation',
  inputSummary: 'test: input summary',
  input: {
    required: 'test: required',
    not_integer: 'test: not_integer',
    not_number: 'test: not_number',
    not_date: 'test: not_date',
    not_timestamp: 'test: not_timestamp',
    not_in_list: 'test: not_in_list',
    violates_type_constraint: 'test: violates_type_constraint',
  },
}
const cfg = VIEW_INCOME_REPORT_CONFIGS

const unused = () =>
  vi.fn(async () => {
    throw new Error('test: adapter not expected to be called')
  })

// Built in the machine's time zone AT THE CALL: some cases stub the time zone
// (process.env.TZ), and Node does not always go back to the default when the
// stub is removed, so a Date built once at import time would read differently.
const NOW = () => new Date(2026, 8, 30, 14, 5, 59)
const servicesOf = (getIncomeReport: ViewIncomeReportAdapters['getIncomeReport'] = unused(), now = NOW) =>
  createViewIncomeReportServices({ getIncomeReport }, cfg, messages, now)
const answer = <T>(r: CallResult<T>) => vi.fn(async () => r)
const ok = <T>(data: T, label = 200): CallResult<T> => ({ kind: 'ok', label, data })
const declared = (label: number, code: string): CallResult<never> => ({ kind: 'declared_error', label, error: { code, message: 'x', details: null } })
const UNREACHABLE: CallResult<never> = { kind: 'unreachable', reason: 'refused' }
const VIOLATION: CallResult<never> = { kind: 'contract_violation', reason: 'bad body' }
const PERIOD = { period_from: '2026-01-01', period_to: '2026-09-30' }

const currency = (over: Partial<IncomeCurrency> = {}): IncomeCurrency => ({
  currency: 'VND',
  received_net_minor: 5100000,
  refunded_minor: 500000,
  outstanding_minor: 6000000,
  by_month: [{ month: '2026-09', received_net_minor: 5100000 }],
  ...over,
})
const report = (currencies: IncomeCurrency[], over: Partial<IncomeReport> = {}): IncomeReport => ({
  ...PERIOD,
  currencies,
  generated_at: '2026-09-30T23:40:12+07:00',
  ...over,
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// The view of one report, or a failed test.
async function viewOf(r: IncomeReport, now = NOW) {
  const result = await servicesOf(answer(ok(r)), now).loadIncomeReport(PERIOD)
  if (result.kind !== 'ok') throw new Error(`expected ok, got ${result.kind}`)
  return result.view
}
const linesOf = (view: Awaited<ReturnType<typeof viewOf>>, i = 0) => Object.fromEntries(view.sections[i].lines.map((l) => [l.key, l.text]))

describe('every kind of CallResult becomes the right ViewResult', () => {
  it('ok → ok with the view', async () => {
    const r = await servicesOf(answer(ok(report([currency()])))).loadIncomeReport(PERIOD)
    expect(r.kind).toBe('ok')
  })

  it('calls the adapter once with the period as given', async () => {
    const get = answer(ok(report([])))
    await servicesOf(get).loadIncomeReport(PERIOD)
    expect(get).toHaveBeenCalledExactlyOnceWith(PERIOD)
  })

  it('unreachable → unreachable with the layer message', async () => {
    expect(await servicesOf(answer(UNREACHABLE)).loadIncomeReport(PERIOD)).toEqual({ kind: 'unreachable', message: 'test: unreachable' })
  })

  it('contract_violation → contract_violation with the layer message', async () => {
    expect(await servicesOf(answer(VIOLATION)).loadIncomeReport(PERIOD)).toEqual({ kind: 'contract_violation', message: 'test: contract violation' })
  })

  it('declared_error → rejected (system), the code kept, the message of Configs', async () => {
    const r = await servicesOf(answer(declared(400, 'ERR_VALIDATION'))).loadIncomeReport(PERIOD)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_VALIDATION', message: cfg.errorMessages.getIncomeReport.ERR_VALIDATION, fieldErrors: {} })
  })

  it('400 and 409 give two different sentences', async () => {
    const a = await servicesOf(answer(declared(400, 'ERR_VALIDATION'))).loadIncomeReport(PERIOD)
    const b = await servicesOf(answer(declared(409, 'ERR_OUT_OF_RANGE'))).loadIncomeReport(PERIOD)
    if (a.kind !== 'rejected' || b.kind !== 'rejected') throw new Error('expected rejected')
    expect(a.message).toBe('Máy chủ không nhận khoảng thời gian này.')
    expect(b.message).toBe('Tổng thu nhập vượt giới hạn tính toán, không lập được báo cáo.')
    expect(a.message).not.toBe(b.message)
  })

  it('every declared error code of the label table has a message (walked from Configs, not listed by hand)', () => {
    for (const [name, ep] of Object.entries(cfg.endpoints)) {
      const codes = Object.values(ep.labels).filter((v) => v !== 'ok')
      expect(codes.length).toBeGreaterThan(0)
      for (const code of codes) {
        const text = cfg.errorMessages[name][code]
        expect(text, `${name} ${code}`).toBeTypeOf('string')
        expect(text.trim().length, `${name} ${code}`).toBeGreaterThan(0)
      }
    }
  })

  it('a result that is not ok carries no report at all (no old report can be shown next to the error)', async () => {
    for (const r of [declared(500, 'ERR_STORAGE_IO'), UNREACHABLE, VIOLATION]) {
      const result = await servicesOf(answer(r)).loadIncomeReport(PERIOD)
      expect(result.kind).not.toBe('ok')
      expect(Object.keys(result)).not.toContain('view')
    }
  })
})

describe('the default period: the 1st of January of the current year to today, by the machine clock', () => {
  it('a day in the middle of the year', () => {
    expect(servicesOf(unused(), () => new Date(2026, 8, 30, 14, 5, 59)).defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-09-30' })
  })

  it('1 January: both days are the same', () => {
    expect(servicesOf(unused(), () => new Date(2026, 0, 1, 0, 0, 0)).defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-01-01' })
  })

  it('31 December: the whole year', () => {
    expect(servicesOf(unused(), () => new Date(2026, 11, 31, 23, 59, 59)).defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-12-31' })
  })

  it('a leap day and a single-digit month and day are written with two digits', () => {
    expect(servicesOf(unused(), () => new Date(2028, 1, 29, 12, 0, 0)).defaultPeriod()).toEqual({ periodFrom: '2028-01-01', periodTo: '2028-02-29' })
    expect(servicesOf(unused(), () => new Date(2026, 2, 5, 12, 0, 0)).defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-03-05' })
  })

  it('asks the clock Main handed over, at the call, and nowhere else', () => {
    const now = vi.fn(() => new Date(2030, 4, 6, 8, 0, 0))
    const services = servicesOf(unused(), now)
    expect(now).not.toHaveBeenCalled()
    expect(services.defaultPeriod()).toEqual({ periodFrom: '2030-01-01', periodTo: '2030-05-06' })
    expect(now).toHaveBeenCalledTimes(1)
  })

  it('00:30 on 1 January in Việt Nam (17:30 on 31 December UTC): the default follows the machine, not UTC', () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    // The instant itself: the UTC day is the year before.
    const instant = () => new Date('2026-01-01T00:30:00+07:00')
    expect(instant().toISOString()).toBe('2025-12-31T17:30:00.000Z')
    expect(servicesOf(unused(), instant).defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-01-01' })
  })

  it('23:30 on 31 December in Việt Nam (16:30 UTC, the same day): still that year, that day', () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    expect(servicesOf(unused(), () => new Date('2026-12-31T23:30:00+07:00')).defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-12-31' })
  })

  it('a machine west of UTC: 20:00 on 31 December in Los Angeles is already 1 January in UTC — the default is still the machine\'s 31 December', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    const instant = () => new Date('2026-12-31T20:00:00-08:00')
    expect(instant().toISOString()).toBe('2027-01-01T04:00:00.000Z')
    expect(servicesOf(unused(), instant).defaultPeriod()).toEqual({ periodFrom: '2026-01-01', periodTo: '2026-12-31' })
  })
})

describe('amounts: the D2 way of writing, in the D5 lines', () => {
  it('the three lines of a currency, with their terms', async () => {
    const view = await viewOf(report([currency()]))
    expect(view.sections[0].lines).toEqual([
      { key: 'received', term: 'Thực nhận trong kỳ', text: '5.100.000 VND' },
      { key: 'refunded', term: 'Đã hoàn cho khách trong kỳ', text: '500.000 VND' },
      { key: 'outstanding', term: 'Còn phải thu (mọi đơn chưa hủy, tính tới lúc lập)', text: '6.000.000 VND' },
    ])
  })

  it('a negative received_net_minor has "-" first', async () => {
    expect(linesOf(await viewOf(report([currency({ received_net_minor: -500000 })]))).received).toBe('-500.000 VND')
  })

  it('a negative outstanding_minor has "-" first and is not turned into a sentence', async () => {
    const lines = linesOf(await viewOf(report([currency({ outstanding_minor: -755, currency: 'USD' })])))
    expect(lines.outstanding).toBe('-7,55 USD')
  })

  it('outstanding_minor of 0 is the number, not "Đã thu đủ" (that wording belongs to one commission)', async () => {
    expect(linesOf(await viewOf(report([currency({ outstanding_minor: 0 })]))).outstanding).toBe('0 VND')
  })

  it.each([
    [1250, '12,50 USD'],
    [5, '0,05 USD'],
    [0, '0,00 USD'],
    [100, '1,00 USD'],
    [-5, '-0,05 USD'],
    [-1250, '-12,50 USD'],
    [123456789, '1.234.567,89 USD'],
  ])('USD %i minor units → %s (integer arithmetic on the digits)', async (minor, text) => {
    expect(linesOf(await viewOf(report([currency({ currency: 'USD', received_net_minor: minor })]))).received).toBe(text)
  })

  it('a code not in the table of decimals is shown in minor units with its note, sign kept', async () => {
    const lines = linesOf(await viewOf(report([currency({ currency: 'EUR', received_net_minor: 1250, refunded_minor: 0, outstanding_minor: -300 })])))
    expect(lines.received).toBe('1250 EUR (đơn vị nhỏ nhất)')
    expect(lines.refunded).toBe('0 EUR (đơn vị nhỏ nhất)')
    expect(lines.outstanding).toBe('-300 EUR (đơn vị nhỏ nhất)')
  })

  it('9007199254740991 and −9007199254740991 are written digit for digit, VND and USD', async () => {
    const max = 9007199254740991
    const vnd = linesOf(await viewOf(report([currency({ received_net_minor: max, refunded_minor: max, outstanding_minor: -max })])))
    expect(vnd).toEqual({ received: '9.007.199.254.740.991 VND', refunded: '9.007.199.254.740.991 VND', outstanding: '-9.007.199.254.740.991 VND' })
    const usd = linesOf(await viewOf(report([currency({ currency: 'USD', received_net_minor: max, outstanding_minor: -max })])))
    expect(usd.received).toBe('90.071.992.547.409,91 USD')
    expect(usd.outstanding).toBe('-90.071.992.547.409,91 USD')
  })

  it('a month amount is written the same way, negative too', async () => {
    const view = await viewOf(
      report([currency({ currency: 'USD', by_month: [{ month: '2026-08', received_net_minor: 505 }, { month: '2026-09', received_net_minor: -1500 }] })]),
    )
    expect(view.sections[0].months.map((m) => m.text)).toEqual(['5,05 USD', '-15,00 USD'])
  })
})

describe('months, dates and the time the report was made', () => {
  it('"2026-09" → "Tháng 9/2026" and "2026-12" → "Tháng 12/2026"; the rows keep the order received', async () => {
    const view = await viewOf(
      report([currency({ by_month: [{ month: '2026-09', received_net_minor: 1 }, { month: '2026-12', received_net_minor: 2 }, { month: '2026-01', received_net_minor: 3 }] })]),
    )
    expect(view.sections[0].months.map((m) => [m.key, m.term])).toEqual([
      ['2026-09', 'Tháng 9/2026'],
      ['2026-12', 'Tháng 12/2026'],
      ['2026-01', 'Tháng 1/2026'],
    ])
  })

  it('the period line is cut from the strings of the REPORT: dd/mm/yyyy, whatever period was asked', async () => {
    const get = answer(ok(report([], { period_from: '2026-08-01', period_to: '2026-09-30' })))
    const r = await servicesOf(get).loadIncomeReport({ period_from: '2000-01-01', period_to: '2000-01-02' })
    if (r.kind !== 'ok') throw new Error('expected ok')
    expect(r.view.periodText.startsWith('Từ 01/08/2026 đến 30/09/2026 · Lập lúc ')).toBe(true)
  })

  it('no time zone can move a date: the strings are cut, not read as instants', async () => {
    for (const tz of ['Asia/Ho_Chi_Minh', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      vi.stubEnv('TZ', tz)
      const view = await viewOf(report([], { period_from: '2026-01-01', period_to: '2026-12-31' }))
      expect(view.periodText.startsWith('Từ 01/01/2026 đến 31/12/2026 · ')).toBe(true)
    }
  })

  it('generated_at is shown as HH:mm dd/mm/yyyy in the machine\'s time zone', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    const view = await viewOf(report([], { generated_at: '2026-09-30T23:40:12+07:00' }))
    expect(view.periodText).toBe('Từ 01/01/2026 đến 30/09/2026 · Lập lúc 23:40 30/09/2026')
    vi.stubEnv('TZ', 'America/Los_Angeles')
    const la = await viewOf(report([], { generated_at: '2026-09-30T23:40:12+07:00' }))
    expect(la.periodText).toBe('Từ 01/01/2026 đến 30/09/2026 · Lập lúc 09:40 30/09/2026')
  })
})

describe('sections, empty month list, empty report', () => {
  it('two currencies keep the order received (not sorted, not added up)', async () => {
    const view = await viewOf(report([currency({ currency: 'VND' }), currency({ currency: 'USD', received_net_minor: 2005 }), currency({ currency: 'AUD', received_net_minor: 1 })]))
    expect(view.sections.map((s) => s.currency)).toEqual(['VND', 'USD', 'AUD'])
    expect(view.isEmpty).toBe(false)
  })

  it('every section carries the fixed explanation', async () => {
    const view = await viewOf(report([currency(), currency({ currency: 'USD' })]))
    for (const s of view.sections) {
      expect(s.explanation).toBe('Thực nhận đã trừ tiền hoàn, gồm cả tiền tip. Còn phải thu không phụ thuộc khoảng thời gian.')
    }
  })

  it('by_month empty → no month rows and the sentence for it', async () => {
    const view = await viewOf(report([currency({ by_month: [], received_net_minor: 0, refunded_minor: 0 })]))
    expect(view.sections[0].months).toEqual([])
    expect(view.sections[0].noMonthsText).toBe('Không có khoản thanh toán nào trong kỳ.')
    expect(linesOf(view).outstanding).toBe('6.000.000 VND')
  })

  it('currencies empty → the empty view with its sentence', async () => {
    const view = await viewOf(report([]))
    expect(view.sections).toEqual([])
    expect(view.isEmpty).toBe(true)
    expect(view.emptyText).toBe('Không có khoản thanh toán nào trong kỳ, và không có đơn nào còn phải thu.')
  })

  it('services add nothing up: the numbers shown are the numbers received, one currency by one', async () => {
    const view = await viewOf(report([currency({ received_net_minor: 7 }), currency({ currency: 'USD', received_net_minor: 9 })]))
    expect(linesOf(view, 0).received).toBe('7 VND')
    expect(linesOf(view, 1).received).toBe('0,09 USD')
    expect(view.sections).toHaveLength(2)
  })
})

describe('rejectInput: the workflow\'s words for the field and the reason, else the layer\'s', () => {
  const services = servicesOf()

  it('gives a rejected (input) with the summary and one sentence per field', () => {
    const r = services.rejectInput({ period_from: 'required', period_to: 'not_date' })
    expect(r).toEqual({
      kind: 'rejected',
      origin: 'input',
      code: INPUT_FORMAT_CODE,
      message: 'test: input summary',
      fieldErrors: { period_from: 'Chọn ngày bắt đầu.', period_to: 'Ngày không hợp lệ.' },
    })
  })

  it('the rule "from after to" has its own sentence on period_to', () => {
    const r = services.rejectInput({ period_to: 'violates_type_constraint' })
    if (r.kind !== 'rejected') throw new Error('expected rejected')
    expect(r.fieldErrors).toEqual({ period_to: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' })
  })

  it('a pair the workflow does not list falls back to the layer sentence', () => {
    const r = services.rejectInput({ period_from: 'not_integer' })
    if (r.kind !== 'rejected') throw new Error('expected rejected')
    expect(r.fieldErrors).toEqual({ period_from: 'test: not_integer' })
  })

  it('the sentences under the two dates for "empty" are different from each other', () => {
    const r = services.rejectInput({ period_from: 'required', period_to: 'required' })
    if (r.kind !== 'rejected') throw new Error('expected rejected')
    expect(r.fieldErrors.period_from).toBe('Chọn ngày bắt đầu.')
    expect(r.fieldErrors.period_to).toBe('Chọn ngày kết thúc.')
  })
})
