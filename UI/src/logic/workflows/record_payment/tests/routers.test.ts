// Routers of record_payment — i3-logic.md, Step I3.6: with each input field,
// each reason of format error that applies to its type → rejected, origin
// 'input', and Services (so the backend) not called; a valid raw draft →
// Services called with the converted data. And the cases the plan of session
// 22 (item 3) requires: the reading table of D2 for amounts (USD rows too);
// zero → "Số tiền phải lớn hơn 0"; above 2^53−1; a method made of white space
// only (ASCII, U+00A0, U+3000) → error; a note of white space only → null; and
// paid_at composed with the UTC offset the machine has at THAT date and time
// (summer time: New York before and after the change, London, Ho Chi Minh,
// half-hour zones). The time zone is set with vi.stubEnv('TZ', …): Node applies
// process.env.TZ to every Date at once, and vi.unstubAllEnvs restores it.
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CallResult, ResultMessages } from '../../../shared/results'
import type { RecordPaymentAdapters } from '../adapters'
import { RECORD_PAYMENT_CONFIGS } from '../configs'
import type { PaymentFormDraft, PaymentFormTarget, PaymentInput, PaymentRecord } from '../entities'
import { createRecordPaymentRouters } from '../routers'
import { createRecordPaymentServices } from '../services'

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

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const VND: PaymentFormTarget = { commissionId: CID, currency: 'VND' }
const USD: PaymentFormTarget = { commissionId: CID, currency: 'USD' }

const SAVED: PaymentRecord = {
  payment_id: '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f',
  commission_id: CID,
  direction: 'incoming',
  kind: 'deposit',
  amount: { amount_minor: 1, currency: 'VND' },
  method: 'MoMo',
  paid_at: '2026-09-30T14:05:00+07:00',
  note: null,
  is_voided: false,
}

// Real Services over a fake `record` adapter, so a test sees what would be sent.
function routersWith() {
  const record = vi.fn(async (): Promise<CallResult<PaymentRecord>> => ({ kind: 'ok', label: 201, data: SAVED }))
  const adapters: RecordPaymentAdapters = {
    getBalance: vi.fn(async () => {
      throw new Error('test: not expected')
    }),
    listForCommission: vi.fn(async () => {
      throw new Error('test: not expected')
    }),
    record,
    voidPayment: vi.fn(async () => {
      throw new Error('test: not expected')
    }),
  }
  const services = createRecordPaymentServices(adapters, RECORD_PAYMENT_CONFIGS, messages, () => new Date(2026, 8, 30, 14, 5))
  const routers = createRecordPaymentRouters(services, {
    limits: RECORD_PAYMENT_CONFIGS.limits,
    currencyDecimals: RECORD_PAYMENT_CONFIGS.currencyDecimals,
    directions: RECORD_PAYMENT_CONFIGS.directions,
    paymentKinds: RECORD_PAYMENT_CONFIGS.paymentKinds,
  })
  return { routers, record }
}

const DRAFT: PaymentFormDraft = {
  direction: 'incoming',
  paymentKind: 'deposit',
  amount: '500000',
  method: 'Chuyển khoản',
  paidAtLocal: '2026-09-28T08:30',
  note: '',
}
const draft = (over: Partial<PaymentFormDraft>): PaymentFormDraft => ({ ...DRAFT, ...over })

// What one save sent, or null when nothing was sent (with the fieldErrors of the rejection).
async function save(target: PaymentFormTarget, d: PaymentFormDraft) {
  const { routers, record } = routersWith()
  const r = await routers.savePayment(target, d)
  const sent = record.mock.calls.length === 0 ? null : (record.mock.calls[0] as unknown as [string, PaymentInput])
  return { r, sent, calls: record.mock.calls.length }
}
const errorsOf = async (target: PaymentFormTarget, d: PaymentFormDraft) => {
  const { r, calls } = await save(target, d)
  expect(calls).toBe(0)
  if (r.kind !== 'rejected') throw new Error(`test: expected rejected, got ${r.kind}`)
  expect(r.origin).toBe('input')
  expect(r.code).toBe('INPUT_FORMAT')
  expect(r.message).toBe(messages.inputSummary)
  return r.fieldErrors
}
const amountOf = async (target: PaymentFormTarget, amount: string) => {
  const { sent } = await save(target, draft({ amount }))
  return sent === null ? null : sent[1].amount.amount_minor
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('a valid raw draft goes to Services, converted', () => {
  it('sends exactly the six fields of payment_input, the currency of the commission, the commission id', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    const { r, sent } = await save(VND, draft({ note: 'Đợt một' }))
    expect(r).toEqual({ kind: 'ok', view: { commissionId: CID, message: 'Đã ghi khoản thanh toán.' } })
    expect(sent).toEqual([
      CID,
      {
        direction: 'incoming',
        kind: 'deposit',
        amount: { amount_minor: 500000, currency: 'VND' },
        method: 'Chuyển khoản',
        paid_at: '2026-09-28T08:30:00+07:00',
        note: 'Đợt một',
      },
    ])
    expect(Object.keys((sent as [string, PaymentInput])[1]).sort()).toEqual(['amount', 'direction', 'kind', 'method', 'note', 'paid_at'])
  })

  it('a refund and each of the five kinds are sent as chosen', async () => {
    for (const kind of ['deposit', 'milestone', 'final', 'tip', 'other']) {
      const { sent } = await save(VND, draft({ direction: 'refund', paymentKind: kind }))
      expect(sent?.[1]).toMatchObject({ direction: 'refund', kind })
    }
  })

  it('the currency is the target\'s: a USD commission sends USD', async () => {
    const { sent } = await save(USD, draft({ amount: '12,50' }))
    expect(sent?.[1].amount).toEqual({ amount_minor: 1250, currency: 'USD' })
  })
})

describe('amounts: the reading table of D2, VND (no decimals)', () => {
  it.each(['1500000', '1.500.000', '1,500,000'])('%s → 1500000', async (typed) => {
    expect(await amountOf(VND, typed)).toBe(1500000)
  })
  it.each(['1,5', '1.50', '1.5', '12.34', '1.2345'])('%s → not readable', async (typed) => {
    const errors = await errorsOf(VND, draft({ amount: typed }))
    expect(errors).toEqual({ 'amount.amount_minor': 'Số tiền không hợp lệ.' })
  })
})

describe('amounts: the reading table of D2, USD (two decimals)', () => {
  it.each([
    ['12.5', 1250],
    ['12,50', 1250],
    ['1,250', 125000],
    ['1.250', 125000],
    ['1.250,5', 125050],
    ['12.505', 1250500],
    ['0,05', 5],
    ['0.5', 50],
    ['1 250,00', 125000],
  ])('%s → %d', async (typed, expected) => {
    expect(await amountOf(USD, typed)).toBe(expected)
  })
  it.each(['12.5055', '1.2345', '1,25,50'])('%s → not readable', async (typed) => {
    expect(await errorsOf(USD, draft({ amount: typed }))).toEqual({ 'amount.amount_minor': 'Số tiền không hợp lệ.' })
  })
})

describe('amounts: empty, unreadable, zero, above 2^53−1', () => {
  it.each(['', '   ', ' ', '　', '\t'])('%j → "Nhập số tiền."', async (typed) => {
    expect(await errorsOf(VND, draft({ amount: typed }))).toEqual({ 'amount.amount_minor': 'Nhập số tiền.' })
  })

  it.each(['-1', '−5', 'abc', '1e6', '.5', ',5', 'hai triệu', '5đ', '1..000'])('%j → "Số tiền không hợp lệ."', async (typed) => {
    expect(await errorsOf(VND, draft({ amount: typed }))).toEqual({ 'amount.amount_minor': 'Số tiền không hợp lệ.' })
  })

  it.each([
    [VND, '0'],
    [VND, '000'],
    [VND, ' 0 '],
    [USD, '0'],
    [USD, '0,00'],
    [USD, '0.0'],
  ])('%j %j → "Số tiền phải lớn hơn 0."', async (target, typed) => {
    expect(await errorsOf(target, draft({ amount: typed }))).toEqual({ 'amount.amount_minor': 'Số tiền phải lớn hơn 0.' })
  })

  it('9007199254740991 VND and 90.071.992.547.409,91 USD are the largest that go', async () => {
    expect(await amountOf(VND, '9007199254740991')).toBe(9007199254740991)
    expect(await amountOf(VND, '9.007.199.254.740.991')).toBe(9007199254740991)
    expect(await amountOf(USD, '90.071.992.547.409,91')).toBe(9007199254740991)
  })

  it.each([
    [VND, '9007199254740992'],
    [VND, '9.007.199.254.740.992'],
    [VND, '99999999999999999999'],
    [USD, '90.071.992.547.409,92'],
    [USD, '90.071.992.547.410'],
  ])('%j %j (above 2^53−1) → "Số tiền quá lớn."', async (target, typed) => {
    expect(await errorsOf(target, draft({ amount: typed }))).toEqual({ 'amount.amount_minor': 'Số tiền quá lớn.' })
  })
})

describe('kind and direction', () => {
  it('no kind chosen → "Chọn khoản thanh toán."', async () => {
    expect(await errorsOf(VND, draft({ paymentKind: '' }))).toEqual({ kind: 'Chọn khoản thanh toán.' })
  })
  it('a kind that is not one of the five → not in the list', async () => {
    expect(await errorsOf(VND, draft({ paymentKind: 'gift' }))).toEqual({ kind: 'Chọn khoản trong danh sách.' })
  })
  it('no direction, or one that is not one of the two → an error on direction', async () => {
    expect(await errorsOf(VND, draft({ direction: '' }))).toEqual({ direction: 'Chọn loại giao dịch.' })
    expect(await errorsOf(VND, draft({ direction: 'sale' }))).toEqual({ direction: 'Chọn loại giao dịch trong danh sách.' })
  })
})

describe('the method: not blank (Data Schema 9.0.0), trimmed', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'ASCII spaces'],
    ['\t\n', 'tab and newline'],
    ['  ', 'U+00A0'],
    ['　', 'U+3000'],
    [' ', 'U+2003'],
    ['  　﻿ ', 'a mix'],
  ])('%j (%s) → "Nhập phương thức thanh toán."', async (typed) => {
    expect(await errorsOf(VND, draft({ method: typed }))).toEqual({ method: 'Nhập phương thức thanh toán.' })
  })

  it('a method is trimmed before it is sent; the inside is kept', async () => {
    const { sent } = await save(VND, draft({ method: '   Chuyển  khoản　 ' }))
    expect(sent?.[1].method).toBe('Chuyển  khoản')
  })
})

describe('the note: optional, trimmed, empty → null', () => {
  it.each(['', '   ', '\t', ' ', '　', ' ', '﻿', '  　 '])('%j → null', async (typed) => {
    const { sent } = await save(VND, draft({ note: typed }))
    expect(sent?.[1].note).toBeNull()
  })
  it('a note is trimmed and otherwise kept', async () => {
    const { sent } = await save(VND, draft({ note: '  Đợt hai \n' }))
    expect(sent?.[1].note).toBe('Đợt hai')
  })
})

describe('paid_at: wall-clock time of the input + the offset of the machine at that date and time', () => {
  const paidAt = async (local: string) => {
    const { sent } = await save(VND, draft({ paidAtLocal: local }))
    return sent?.[1].paid_at ?? null
  }

  it('Asia/Ho_Chi_Minh: +07:00, seconds :00 added', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    expect(await paidAt('2026-09-28T08:30')).toBe('2026-09-28T08:30:00+07:00')
    expect(await paidAt('2026-01-01T00:00')).toBe('2026-01-01T00:00:00+07:00')
    expect(await paidAt('2026-12-31T23:59')).toBe('2026-12-31T23:59:00+07:00')
  })

  it('America/New_York: −05:00 the day before the change to summer time (2026-03-08), −04:00 the day after; the offsets differ', async () => {
    vi.stubEnv('TZ', 'America/New_York')
    const before = await paidAt('2026-03-07T12:00')
    const after = await paidAt('2026-03-09T12:00')
    expect(before).toBe('2026-03-07T12:00:00-05:00')
    expect(after).toBe('2026-03-09T12:00:00-04:00')
    expect(before?.slice(-6)).not.toBe(after?.slice(-6))
  })

  it('America/New_York: −04:00 the day before the change back (2026-11-01), −05:00 the day after', async () => {
    vi.stubEnv('TZ', 'America/New_York')
    expect(await paidAt('2026-10-31T12:00')).toBe('2026-10-31T12:00:00-04:00')
    expect(await paidAt('2026-11-02T12:00')).toBe('2026-11-02T12:00:00-05:00')
  })

  it('Europe/London: +00:00 in winter, +01:00 in summer', async () => {
    vi.stubEnv('TZ', 'Europe/London')
    expect(await paidAt('2026-01-15T09:00')).toBe('2026-01-15T09:00:00+00:00')
    expect(await paidAt('2026-07-15T09:00')).toBe('2026-07-15T09:00:00+01:00')
  })

  it('a zone with a half-hour offset: Asia/Kolkata +05:30, America/St_Johns −03:30 in winter and −02:30 in summer', async () => {
    vi.stubEnv('TZ', 'Asia/Kolkata')
    expect(await paidAt('2026-09-28T08:30')).toBe('2026-09-28T08:30:00+05:30')
    vi.stubEnv('TZ', 'America/St_Johns')
    expect(await paidAt('2026-01-15T08:30')).toBe('2026-01-15T08:30:00-03:30')
    expect(await paidAt('2026-07-15T08:30')).toBe('2026-07-15T08:30:00-02:30')
  })

  it('UTC: +00:00', async () => {
    vi.stubEnv('TZ', 'UTC')
    expect(await paidAt('2026-09-28T08:30')).toBe('2026-09-28T08:30:00+00:00')
  })

  it('the wall-clock time is never converted: the same input gives the same time of day in every zone', async () => {
    for (const tz of ['Asia/Ho_Chi_Minh', 'America/New_York', 'Pacific/Auckland', 'UTC']) {
      vi.stubEnv('TZ', tz)
      expect((await paidAt('2026-09-28T08:30'))?.startsWith('2026-09-28T08:30:00')).toBe(true)
    }
  })

  it('seconds in the input are kept; a date in the future is allowed (the contract does not forbid it)', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    expect(await paidAt('2026-09-28T08:30:45')).toBe('2026-09-28T08:30:45+07:00')
    expect(await paidAt('2099-01-01T00:00')).toBe('2099-01-01T00:00:00+07:00')
  })

  it('the result has the form of formats.timestamp', async () => {
    vi.stubEnv('TZ', 'America/New_York')
    expect(await paidAt('2026-06-15T18:45')).toMatch(RECORD_PAYMENT_CONFIGS.formats.timestamp)
  })

  it('empty → "Chọn ngày giờ nhận tiền."', async () => {
    expect(await errorsOf(VND, draft({ paidAtLocal: '' }))).toEqual({ paid_at: 'Chọn ngày giờ nhận tiền.' })
    expect(await errorsOf(VND, draft({ paidAtLocal: '   ' }))).toEqual({ paid_at: 'Chọn ngày giờ nhận tiền.' })
  })

  it.each(['2026-09-28', '28/09/2026 08:30', '2026-09-28 08:30', '2026-02-30T10:00', '2026-13-01T10:00', '2026-09-31T10:00', '2026-09-28T24:00', '2026-09-28T08:60', 'yesterday'])(
    '%j → "Chọn một ngày giờ hợp lệ."',
    async (typed) => {
      expect(await errorsOf(VND, draft({ paidAtLocal: typed }))).toEqual({ paid_at: 'Chọn một ngày giờ hợp lệ.' })
    },
  )

  it('29 February of a leap year is a date; of another year is not', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    expect(await paidAt('2028-02-29T10:00')).toBe('2028-02-29T10:00:00+07:00')
    expect(await errorsOf(VND, draft({ paidAtLocal: '2026-02-29T10:00' }))).toEqual({ paid_at: 'Chọn một ngày giờ hợp lệ.' })
  })
})

describe('several errors at once, each on its field; nothing is sent', () => {
  it('an empty draft: every required field is named', async () => {
    const errors = await errorsOf(VND, { direction: 'incoming', paymentKind: '', amount: '', method: '', paidAtLocal: '', note: '' })
    expect(errors).toEqual({
      kind: 'Chọn khoản thanh toán.',
      'amount.amount_minor': 'Nhập số tiền.',
      method: 'Nhập phương thức thanh toán.',
      paid_at: 'Chọn ngày giờ nhận tiền.',
    })
  })
})

describe('the other operations go straight to Services', () => {
  it('loadCommissionBalance, loadPaymentList, openPaymentForm, voidPayment are handed on', async () => {
    const services = {
      loadCommissionBalance: vi.fn(async () => ({ kind: 'unreachable' as const, message: 'a' })),
      loadPaymentList: vi.fn(async () => ({ kind: 'unreachable' as const, message: 'b' })),
      openPaymentForm: vi.fn(async () => ({ kind: 'unreachable' as const, message: 'c' })),
      voidPayment: vi.fn(async () => ({ kind: 'unreachable' as const, message: 'd' })),
      savePayment: vi.fn(),
      rejectInput: vi.fn(),
    }
    const routers = createRecordPaymentRouters(services as unknown as Parameters<typeof createRecordPaymentRouters>[0], {
      limits: RECORD_PAYMENT_CONFIGS.limits,
      currencyDecimals: RECORD_PAYMENT_CONFIGS.currencyDecimals,
      directions: RECORD_PAYMENT_CONFIGS.directions,
      paymentKinds: RECORD_PAYMENT_CONFIGS.paymentKinds,
    })
    await routers.loadCommissionBalance(CID)
    await routers.loadPaymentList(CID)
    await routers.openPaymentForm(CID)
    await routers.voidPayment('p-1', false)
    await routers.voidPayment('p-1', true)
    expect(services.loadCommissionBalance).toHaveBeenCalledExactlyOnceWith(CID)
    expect(services.loadPaymentList).toHaveBeenCalledExactlyOnceWith(CID)
    expect(services.openPaymentForm).toHaveBeenCalledExactlyOnceWith(CID)
    expect(services.voidPayment.mock.calls).toEqual([
      ['p-1', false],
      ['p-1', true],
    ])
  })
})
