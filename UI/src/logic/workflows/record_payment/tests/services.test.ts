// Services of record_payment — i3-logic.md, Step I3.6: every CallResult kind
// maps to the right ViewResult, for every operation and each of its calls (an
// operation of several calls ends at the first call that is not ok, and the
// later calls are not made); every declared error code has a message (walked
// from the label tables of Configs, not listed by hand); each presentation
// decision of ui_decomposition.md D4 has a case, plus the cases the plan of
// session 22 (item 3) requires: the balance with outstanding above, at and
// below zero, and with fractions of a dollar; the amount reading table of D2;
// a voided payment with no way to void it; the two 409 (record and
// get_balance → ERR_OUT_OF_RANGE, void_payment → ERR_CONFLICT) with two
// different sentences; the clock handed by Main.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { CallResult, ResultMessages, ViewResult } from '../../../shared/results'
import type { RecordPaymentAdapters } from '../adapters'
import { RECORD_PAYMENT_CONFIGS } from '../configs'
import type { CommissionBalance, Money, PaymentInput, PaymentRecord } from '../entities'
import { createRecordPaymentServices } from '../services'

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
const cfg = RECORD_PAYMENT_CONFIGS

const unused = () =>
  vi.fn(async () => {
    throw new Error('test: adapter not expected to be called')
  })

function fakeAdapters(over: Partial<RecordPaymentAdapters>): RecordPaymentAdapters {
  return { getBalance: unused(), listForCommission: unused(), record: unused(), voidPayment: unused(), ...over }
}
// The clock Main hands over: fixed, so the default of the form is known.
// Built in the machine's time zone AT THE CALL: some cases stub the time zone
// (process.env.TZ), and Node does not always go back to the default when the
// stub is removed, so a Date built once at import time would read differently.
const NOW = () => new Date(2026, 8, 30, 14, 5, 59)
const servicesOf = (over: Partial<RecordPaymentAdapters>, now = NOW) => createRecordPaymentServices(fakeAdapters(over), cfg, messages, now)
const answer = <T>(r: CallResult<T>) => vi.fn(async () => r)
const ok = <T>(data: T, label = 200): CallResult<T> => ({ kind: 'ok', label, data })
const declared = (label: number, code: string): CallResult<never> => ({ kind: 'declared_error', label, error: { code, message: 'x', details: null } })
const UNREACHABLE: CallResult<never> = { kind: 'unreachable', reason: 'refused' }
const VIOLATION: CallResult<never> = { kind: 'contract_violation', reason: 'bad body' }

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
let n = 0
const uuid = () => `00000000-0000-4000-8000-${(n += 1).toString(16).padStart(12, '0')}`
const vnd = (amount_minor: number): Money => ({ amount_minor, currency: 'VND' })
const usd = (amount_minor: number): Money => ({ amount_minor, currency: 'USD' })

function balance(agreed: Money, receivedNet: number, outstanding: number): CommissionBalance {
  return {
    commission_id: CID,
    agreed,
    received_net: { amount_minor: receivedNet, currency: agreed.currency },
    outstanding: { amount_minor: outstanding, currency: agreed.currency },
  }
}

function payment(over: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    payment_id: uuid(),
    commission_id: CID,
    direction: 'incoming',
    kind: 'deposit',
    amount: vnd(500000),
    method: 'Chuyển khoản',
    paid_at: '2026-09-28T08:30:00+07:00',
    note: null,
    is_voided: false,
    ...over,
  }
}

const INPUT: PaymentInput = {
  direction: 'incoming',
  kind: 'deposit',
  amount: vnd(500000),
  method: 'Chuyển khoản',
  paid_at: '2026-09-28T08:30:00+07:00',
  note: null,
}

// The view of an ok result, or a failed test.
function viewOf<V>(r: ViewResult<V>): V {
  if (r.kind !== 'ok') throw new Error(`test: expected ok, got ${r.kind}`)
  return r.view
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('every declared error code has a message (walked from the label tables of Configs)', () => {
  const pairs = Object.entries(cfg.endpoints).flatMap(([endpoint, ep]) =>
    Object.values(ep.labels)
      .filter((v) => v !== 'ok')
      .map((code) => [endpoint, code] as const),
  )

  it('there are 13 (call, code) pairs', () => {
    expect(pairs).toHaveLength(13)
  })

  it.each(pairs)('%s %s', (endpoint, code) => {
    const message = cfg.errorMessages[endpoint]?.[code]
    expect(typeof message).toBe('string')
    expect((message as string).length).toBeGreaterThan(0)
  })
})

describe('every kind of CallResult becomes the right ViewResult, for every operation', () => {
  const BAL = balance(vnd(1000000), 500000, 500000)
  const operations: [string, (a: Partial<RecordPaymentAdapters>) => Promise<ViewResult<unknown>>, Partial<RecordPaymentAdapters>][] = [
    ['loadCommissionBalance', (a) => servicesOf(a).loadCommissionBalance(CID), { getBalance: answer(ok(BAL)) }],
    ['loadPaymentList (get_balance)', (a) => servicesOf(a).loadPaymentList(CID), { listForCommission: answer(ok([payment()])) }],
    ['openPaymentForm', (a) => servicesOf(a).openPaymentForm(CID), { getBalance: answer(ok(BAL)) }],
  ]

  it.each(operations)('%s: ok', async (_name, run, extra) => {
    const r = await run({ getBalance: answer(ok(BAL)), ...extra })
    expect(r.kind).toBe('ok')
  })

  it.each(operations)('%s: unreachable and contract_violation of get_balance', async (_name, run) => {
    expect(await run({ getBalance: answer(UNREACHABLE) })).toEqual({ kind: 'unreachable', message: messages.unreachable })
    expect(await run({ getBalance: answer(VIOLATION) })).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })

  it.each(operations)('%s: 404, 409 and 500 of get_balance are rejected, system, with the message of that call', async (_name, run) => {
    for (const [label, code] of [
      [404, 'ERR_NOT_FOUND'],
      [409, 'ERR_OUT_OF_RANGE'],
      [500, 'ERR_STORAGE_IO'],
    ] as const) {
      expect(await run({ getBalance: answer(declared(label, code)) })).toEqual({
        kind: 'rejected',
        origin: 'system',
        code,
        message: cfg.errorMessages.getBalance[code],
        fieldErrors: {},
      })
    }
  })

  it('get_balance 409 reads "Số dư của đơn này vượt giới hạn tính toán."', async () => {
    const r = await servicesOf({ getBalance: answer(declared(409, 'ERR_OUT_OF_RANGE')) }).loadCommissionBalance(CID)
    expect(r).toMatchObject({ kind: 'rejected', message: 'Số dư của đơn này vượt giới hạn tính toán.' })
  })

  it('loadPaymentList: list_for_commission 404, 500, unreachable, contract_violation end the operation with its own message', async () => {
    const run = (list: CallResult<never>) => servicesOf({ getBalance: answer(ok(BAL)), listForCommission: answer(list) }).loadPaymentList(CID)
    expect(await run(declared(404, 'ERR_NOT_FOUND'))).toMatchObject({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.' })
    expect(await run(declared(500, 'ERR_STORAGE_IO'))).toMatchObject({ kind: 'rejected', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.listForCommission.ERR_STORAGE_IO })
    expect(await run(UNREACHABLE)).toEqual({ kind: 'unreachable', message: messages.unreachable })
    expect(await run(VIOLATION)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })

  it('loadPaymentList: get_balance first, list_for_commission second; a failed first call means the second is not made', async () => {
    const order: string[] = []
    const getBalance = vi.fn(async () => (order.push('get_balance'), ok(BAL)))
    const listForCommission = vi.fn(async () => (order.push('list_for_commission'), ok([payment()])))
    await servicesOf({ getBalance, listForCommission }).loadPaymentList(CID)
    expect(order).toEqual(['get_balance', 'list_for_commission'])
    const listNotCalled = vi.fn(async () => ok([payment()]))
    await servicesOf({ getBalance: answer(UNREACHABLE), listForCommission: listNotCalled }).loadPaymentList(CID)
    expect(listNotCalled).not.toHaveBeenCalled()
  })

  it('savePayment: 201 → ok with the message; every declared error and the two other kinds are mapped', async () => {
    const target = { commissionId: CID, currency: 'VND' }
    const run = (r: CallResult<PaymentRecord>) => servicesOf({ record: answer(r) }).savePayment(target, INPUT)
    expect(await run(ok(payment(), 201))).toEqual({ kind: 'ok', view: { commissionId: CID, message: 'Đã ghi khoản thanh toán.' } })
    for (const [label, code] of [
      [400, 'ERR_VALIDATION'],
      [404, 'ERR_NOT_FOUND'],
      [409, 'ERR_OUT_OF_RANGE'],
      [422, 'ERR_CURRENCY_MISMATCH'],
      [500, 'ERR_STORAGE_IO'],
    ] as const) {
      expect(await run(declared(label, code))).toEqual({ kind: 'rejected', origin: 'system', code, message: cfg.errorMessages.record[code], fieldErrors: {} })
    }
    expect(await run(UNREACHABLE)).toEqual({ kind: 'unreachable', message: messages.unreachable })
    expect(await run(VIOLATION)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })

  it('savePayment sends the input as it is, for the commission of the target', async () => {
    const record = answer(ok(payment(), 201))
    await servicesOf({ record }).savePayment({ commissionId: CID, currency: 'VND' }, INPUT)
    expect(record).toHaveBeenCalledExactlyOnceWith(CID, INPUT)
  })
})

describe('the two 409 of the workflow say two different things', () => {
  it('record 409 (ERR_OUT_OF_RANGE) and void_payment 409 (ERR_CONFLICT) have different sentences', async () => {
    const recorded = await servicesOf({ record: answer(declared(409, 'ERR_OUT_OF_RANGE')) }).savePayment({ commissionId: CID, currency: 'VND' }, INPUT)
    const voided = await servicesOf({ voidPayment: answer(declared(409, 'ERR_CONFLICT')) }).voidPayment(uuid(), true)
    expect(recorded).toMatchObject({ kind: 'rejected', code: 'ERR_OUT_OF_RANGE', message: 'Không ghi được: với khoản này, số dư của đơn vượt giới hạn tính toán.' })
    expect(voided).toMatchObject({ kind: 'rejected', code: 'ERR_CONFLICT', message: 'Khoản này đã được hủy trước đó.' })
    if (recorded.kind !== 'rejected' || voided.kind !== 'rejected') throw new Error('test: both must be rejected')
    expect(recorded.message).not.toBe(voided.message)
  })
})

describe('the balance: three lines (D4, "Số dư")', () => {
  const linesOf = async (b: CommissionBalance) =>
    viewOf(await servicesOf({ getBalance: answer(ok(b)) }).loadCommissionBalance(CID)).lines.map((l) => [l.term, l.text])

  it('outstanding above zero: the amount', async () => {
    expect(await linesOf(balance(vnd(1500000), 500000, 1000000))).toEqual([
      ['Giá thỏa thuận', '1.500.000 VND'],
      ['Đã nhận', '500.000 VND'],
      ['Còn phải thu', '1.000.000 VND'],
    ])
  })

  it('outstanding at zero: "Đã thu đủ"', async () => {
    expect(await linesOf(balance(vnd(1500000), 1500000, 0))).toEqual([
      ['Giá thỏa thuận', '1.500.000 VND'],
      ['Đã nhận', '1.500.000 VND'],
      ['Còn phải thu', 'Đã thu đủ'],
    ])
  })

  it('outstanding below zero: "Đã thu dư <positive amount>"', async () => {
    expect(await linesOf(balance(vnd(1500000), 1600000, -100000))).toEqual([
      ['Giá thỏa thuận', '1.500.000 VND'],
      ['Đã nhận', '1.600.000 VND'],
      ['Còn phải thu', 'Đã thu dư 100.000 VND'],
    ])
  })

  it('fractions of a dollar: 12,50 USD agreed, 5,05 received, 7,45 left; and 0,05', async () => {
    expect(await linesOf(balance(usd(1250), 505, 745))).toEqual([
      ['Giá thỏa thuận', '12,50 USD'],
      ['Đã nhận', '5,05 USD'],
      ['Còn phải thu', '7,45 USD'],
    ])
    expect(await linesOf(balance(usd(5), 5, 0))).toEqual([
      ['Giá thỏa thuận', '0,05 USD'],
      ['Đã nhận', '0,05 USD'],
      ['Còn phải thu', 'Đã thu đủ'],
    ])
  })

  it('a tip received above what is owed: received more than agreed reads "Đã thu dư 2,00 USD"', async () => {
    expect((await linesOf(balance(usd(1000), 1200, -200)))[2]).toEqual(['Còn phải thu', 'Đã thu dư 2,00 USD'])
  })

  it('a negative received_net (refunds above receipts) keeps its minus sign', async () => {
    expect((await linesOf(balance(usd(1000), -1250, 2250)))[1]).toEqual(['Đã nhận', '-12,50 USD'])
  })

  it('9007199254740991 VND and USD are written digit by digit, never through a float', async () => {
    expect((await linesOf(balance(vnd(9007199254740991), 0, 9007199254740991)))[0][1]).toBe('9.007.199.254.740.991 VND')
    expect((await linesOf(balance(usd(9007199254740991), 0, 9007199254740991)))[0][1]).toBe('90.071.992.547.409,91 USD')
    expect((await linesOf(balance(vnd(9007199254740991), 0, -9007199254740991)))[2][1]).toBe('Đã thu dư 9.007.199.254.740.991 VND')
  })

  it('a currency the interface does not know is shown in minor units', async () => {
    const eur: Money = { amount_minor: 1234, currency: 'EUR' }
    expect((await linesOf(balance(eur, 0, 1234)))[0][1]).toBe('1234 EUR (đơn vị nhỏ nhất)')
  })
})

describe('money written as in D2 (the table of examples, shown)', () => {
  const text = async (m: Money) => viewOf(await servicesOf({ getBalance: answer(ok(balance(m, 0, 0))) }).loadCommissionBalance(CID)).lines[0].text
  it.each([
    [vnd(0), '0 VND'],
    [vnd(999), '999 VND'],
    [vnd(1000), '1.000 VND'],
    [vnd(1500000), '1.500.000 VND'],
    [usd(0), '0,00 USD'],
    [usd(1), '0,01 USD'],
    [usd(5), '0,05 USD'],
    [usd(100), '1,00 USD'],
    [usd(1250), '12,50 USD'],
    [usd(125050), '1.250,50 USD'],
    [usd(1250500), '12.505,00 USD'],
  ])('%j → %s', async (m, expected) => {
    expect(await text(m)).toBe(expected)
  })
})

describe('the list: rows in the order of the contract, main line, secondary line, voided ones', () => {
  const rowsOf = async (payments: PaymentRecord[], b = balance(vnd(1000000), 0, 1000000)) =>
    viewOf(await servicesOf({ getBalance: answer(ok(b)), listForCommission: answer(ok(payments)) }).loadPaymentList(CID))

  it('empty: isEmpty, the words of the empty state, the balance still shown', async () => {
    const v = await rowsOf([])
    expect(v.isEmpty).toBe(true)
    expect(v.rows).toEqual([])
    expect(v.emptyText).toBe('Chưa có khoản thanh toán nào')
    expect(v.balance.lines).toHaveLength(3)
  })

  it('names of the two directions and the five kinds', async () => {
    const directions = await rowsOf([payment({ direction: 'incoming' }), payment({ direction: 'refund' })])
    expect(directions.rows.map((r) => r.text)).toEqual(['Nhận tiền 500.000 VND · Tiền cọc', 'Hoàn tiền cho khách 500.000 VND · Tiền cọc'])
    const kinds = await rowsOf(
      (['deposit', 'milestone', 'final', 'tip', 'other'] as const).map((kind) => payment({ kind })),
    )
    expect(kinds.rows.map((r) => r.text.split(' · ')[1])).toEqual(['Tiền cọc', 'Thanh toán theo đợt', 'Thanh toán cuối', 'Tiền tip', 'Khác'])
  })

  it('keeps the order the contract promises (newest first): the list is not sorted again', async () => {
    const a = payment({ paid_at: '2026-09-01T10:00:00+07:00', method: 'A' })
    const b = payment({ paid_at: '2026-10-01T10:00:00+07:00', method: 'B' })
    // Deliberately handed in the opposite order of paid_at: shown as given.
    const v = await rowsOf([a, b])
    expect(v.rows.map((r) => r.paymentId)).toEqual([a.payment_id, b.payment_id])
  })

  it('secondary line: "<date time> · <method>", with " · <note>" when there is one', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    const v = await rowsOf([
      payment({ paid_at: '2026-09-28T08:30:00+07:00', method: 'MoMo', note: null }),
      payment({ paid_at: '2026-09-27T20:05:00+07:00', method: 'PayPal', note: 'Đợt hai' }),
    ])
    expect(v.rows.map((r) => r.detailText)).toEqual(['08:30 28/09/2026 · MoMo', '20:05 27/09/2026 · PayPal · Đợt hai'])
  })

  it('the instant is shown in the machine\'s time zone, whatever offset it was written in', async () => {
    const p = payment({ paid_at: '2026-09-28T01:30:00Z', method: 'MoMo' })
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    expect((await rowsOf([p])).rows[0].detailText).toBe('08:30 28/09/2026 · MoMo')
    vi.stubEnv('TZ', 'America/Los_Angeles')
    expect((await rowsOf([p])).rows[0].detailText).toBe('18:30 27/09/2026 · MoMo')
  })

  it('a voided payment stays, is marked "Đã hủy", and cannot be voided again', async () => {
    const live = payment({ method: 'MoMo' })
    const voided = payment({ method: 'PayPal', note: 'Nhầm', is_voided: true })
    const v = await rowsOf([live, voided])
    expect(v.rows.map((r) => r.canVoid)).toEqual([true, false])
    expect(v.rows[0].detailText.endsWith('MoMo')).toBe(true)
    expect(v.rows[1].detailText.endsWith('PayPal · Nhầm · Đã hủy')).toBe(true)
    expect(v.rows[0].detailText).not.toContain('Đã hủy')
  })

  it('a refund and a tip are shown with their own words and the amount unsigned', async () => {
    const v = await rowsOf([payment({ direction: 'refund', kind: 'tip', amount: usd(500) })], balance(usd(1000), 0, 1000))
    expect(v.rows[0].text).toBe('Hoàn tiền cho khách 5,00 USD · Tiền tip')
  })
})

describe('payment_form: what the form opens with', () => {
  const open = async (b: CommissionBalance, now?: () => Date) => viewOf(await servicesOf({ getBalance: answer(ok(b)) }, now).openPaymentForm(CID))

  it('the currency of the commission is fixed; the choices; the default draft', async () => {
    const v = await open(balance(usd(1250), 0, 1250))
    if (!v.supported) throw new Error('test: USD must be supported')
    expect(v.currencyText).toBe('USD')
    expect(v.target).toEqual({ commissionId: CID, currency: 'USD' })
    expect(v.directionChoices).toEqual([
      { value: 'incoming', label: 'Nhận tiền' },
      { value: 'refund', label: 'Hoàn tiền cho khách' },
    ])
    expect(v.kindChoices).toEqual([
      { value: 'deposit', label: 'Tiền cọc' },
      { value: 'milestone', label: 'Thanh toán theo đợt' },
      { value: 'final', label: 'Thanh toán cuối' },
      { value: 'tip', label: 'Tiền tip' },
      { value: 'other', label: 'Khác' },
    ])
    expect(v.chooseKindLabel).toBe('Chọn khoản')
    expect(v.methodSuggestions).toEqual(['Chuyển khoản', 'MoMo', 'PayPal', 'Tiền mặt'])
    expect(v.draft).toEqual({ direction: 'incoming', paymentKind: '', amount: '', method: '', paidAtLocal: '2026-09-30T14:05', note: '' })
  })

  it('the default date and time comes from the clock Main handed over, cut to the minute', async () => {
    const at = (d: Date) => open(balance(vnd(1), 0, 1), () => d)
    const draftOf = async (d: Date) => {
      const v = await at(d)
      if (!v.supported) throw new Error('test: supported')
      return v.draft.paidAtLocal
    }
    expect(await draftOf(new Date(2026, 0, 2, 3, 4, 59, 999))).toBe('2026-01-02T03:04')
    expect(await draftOf(new Date(2026, 11, 31, 23, 59, 0, 0))).toBe('2026-12-31T23:59')
    expect(await draftOf(new Date(2026, 5, 15, 0, 0, 30))).toBe('2026-06-15T00:00')
  })

  it('the clock is read when the form opens, not when Services is made', async () => {
    let t = new Date(2026, 8, 30, 10, 0, 0)
    const services = servicesOf({ getBalance: answer(ok(balance(vnd(1), 0, 1))) }, () => t)
    t = new Date(2026, 8, 30, 11, 30, 0)
    const v = viewOf(await services.openPaymentForm(CID))
    if (!v.supported) throw new Error('test: supported')
    expect(v.draft.paidAtLocal).toBe('2026-09-30T11:30')
  })

  it('a currency with no known decimals gets no form, and the words say which', async () => {
    const v = await open({ ...balance(vnd(1), 0, 1), agreed: { amount_minor: 100, currency: 'EUR' } })
    expect(v).toEqual({ supported: false, unsupportedText: 'Đơn vị tiền EUR chưa được hỗ trợ ở giao diện.' })
  })
})

describe('voiding a payment: asked first, sent once when confirmed', () => {
  const PID = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'

  it('not confirmed: ok needs_confirmation with the words of the consequence; void_payment is NOT called', async () => {
    const voidPayment = answer(ok(payment({ is_voided: true })))
    const r = await servicesOf({ voidPayment }).voidPayment(PID, false)
    expect(r).toEqual({
      kind: 'ok',
      view: { outcome: 'needs_confirmation', message: 'Khoản đã hủy không khôi phục được. Số dư sẽ được tính lại không có khoản này.' },
    })
    expect(voidPayment).not.toHaveBeenCalled()
  })

  it('confirmed: void_payment called exactly once with the payment id → ok voided "Đã hủy khoản thanh toán."', async () => {
    const voidPayment = answer(ok(payment({ is_voided: true })))
    const r = await servicesOf({ voidPayment }).voidPayment(PID, true)
    expect(r).toEqual({ kind: 'ok', view: { outcome: 'voided', message: 'Đã hủy khoản thanh toán.' } })
    expect(voidPayment).toHaveBeenCalledExactlyOnceWith(PID)
  })

  it('confirmed: 404, 409 and 500 are rejected (system) with the sentence of void_payment', async () => {
    const run = (r: CallResult<never>) => servicesOf({ voidPayment: answer(r) }).voidPayment(PID, true)
    expect(await run(declared(404, 'ERR_NOT_FOUND'))).toMatchObject({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy khoản thanh toán này.' })
    expect(await run(declared(409, 'ERR_CONFLICT'))).toMatchObject({ kind: 'rejected', origin: 'system', code: 'ERR_CONFLICT', message: 'Khoản này đã được hủy trước đó.' })
    expect(await run(declared(500, 'ERR_STORAGE_IO'))).toMatchObject({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO' })
    expect(await run(UNREACHABLE)).toEqual({ kind: 'unreachable', message: messages.unreachable })
    expect(await run(VIOLATION)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })
})

describe('rejectInput', () => {
  it('the words of the workflow for a field and reason; else the layer\'s', () => {
    const r = servicesOf({}).rejectInput({ 'amount.amount_minor': 'violates_type_constraint', method: 'required', direction: 'not_timestamp' })
    expect(r).toEqual({
      kind: 'rejected',
      origin: 'input',
      code: INPUT_FORMAT_CODE,
      message: messages.inputSummary,
      fieldErrors: {
        'amount.amount_minor': 'Số tiền phải lớn hơn 0.',
        method: 'Nhập phương thức thanh toán.',
        direction: messages.input.not_timestamp,
      },
    })
  })
})
