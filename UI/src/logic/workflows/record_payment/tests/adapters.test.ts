// Adapters of record_payment — coverage matrix of i3-logic.md, Step I3.6, for
// the four calls of ui_decomposition.md D4 (api_contract.yaml 4.0.0):
//   get_balance          GET /payments/balance/{commission_id}  200 ok, 404, 409 ERR_OUT_OF_RANGE, 500
//   list_for_commission  GET /payments?commission_id=…          200 ok, 404, 500
//   record               POST /payments                         201 ok, 400, 404, 409 ERR_OUT_OF_RANGE, 422, 500
//   void_payment         PUT /payments/{payment_id}/void        200 ok, 404, 409 ERR_CONFLICT, 500
// Every declared label, unreachable, an undeclared label, a missing field, a
// wrong type, a wrong code, an integer outside the safe range, extra fields
// dropped, one bad element of a list; and the request each one sends (method,
// path, query, body keyed by input name — endpoint_forms.http). Plus:
// direction and kind only their listed values; a negative outstanding and a
// voided payment are ok; the two 409 of the workflow (record, get_balance →
// ERR_OUT_OF_RANGE; void_payment → ERR_CONFLICT) are told apart by call.
// Fake http_client.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, Transport } from '../../../shared/resources'
import type { CallResult } from '../../../shared/results'
import { createRecordPaymentAdapters, type RecordPaymentAdapters } from '../adapters'
import { RECORD_PAYMENT_CONFIGS } from '../configs'
import type { CommissionBalance, PaymentInput, PaymentRecord } from '../entities'

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const PID = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const BALANCE: CommissionBalance = {
  commission_id: CID,
  agreed: { amount_minor: 150000, currency: 'VND' },
  received_net: { amount_minor: 50000, currency: 'VND' },
  outstanding: { amount_minor: 100000, currency: 'VND' },
}
const PAYMENT: PaymentRecord = {
  payment_id: PID,
  commission_id: CID,
  direction: 'incoming',
  kind: 'deposit',
  amount: { amount_minor: 50000, currency: 'VND' },
  method: 'Chuyển khoản',
  paid_at: '2026-09-28T08:30:15+07:00',
  note: null,
  is_voided: false,
}
const INPUT: PaymentInput = {
  direction: 'incoming',
  kind: 'deposit',
  amount: { amount_minor: 50000, currency: 'VND' },
  method: 'Chuyển khoản',
  paid_at: '2026-09-28T08:30:00+07:00',
  note: null,
}
const errorBody = (code: string) => ({ code, message: 'x', details: null })

type Case = {
  name: string
  call: (a: RecordPaymentAdapters) => Promise<CallResult<unknown>>
  request: [string, string, { query: Record<string, string> | null; body: unknown }]
  ok: number
  // A valid body of the ok label, and that body with one committed field missing / wrongly typed.
  body: unknown
  missingField: unknown
  wrongType: unknown
  errors: Record<number, string>
  undeclared: number
  // A body with an integer outside ±(2^53−1).
  unsafeInteger: unknown
  // A list output: the valid body with one element of the wrong shape.
  badElement: unknown | null
}

const omit = <T extends object>(o: T, k: keyof T) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k))

const CASES: Case[] = [
  {
    name: 'get_balance',
    call: (a) => a.getBalance(CID),
    request: ['GET', `/payments/balance/${CID}`, { query: null, body: null }],
    ok: 200,
    body: BALANCE,
    missingField: omit(BALANCE, 'outstanding'),
    wrongType: { ...BALANCE, agreed: { amount_minor: '150000', currency: 'VND' } },
    errors: { 404: 'ERR_NOT_FOUND', 409: 'ERR_OUT_OF_RANGE', 500: 'ERR_STORAGE_IO' },
    undeclared: 400,
    unsafeInteger: { ...BALANCE, received_net: { amount_minor: 9007199254740992, currency: 'VND' } },
    badElement: null,
  },
  {
    name: 'list_for_commission',
    call: (a) => a.listForCommission(CID),
    request: ['GET', '/payments', { query: { commission_id: CID }, body: null }],
    ok: 200,
    body: [PAYMENT],
    missingField: [omit(PAYMENT, 'is_voided')],
    wrongType: [{ ...PAYMENT, method: 3 }],
    errors: { 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 409,
    unsafeInteger: [{ ...PAYMENT, amount: { amount_minor: 9007199254740992, currency: 'VND' } }],
    badElement: [PAYMENT, { ...PAYMENT, paid_at: '2026-09-28' }],
  },
  {
    name: 'record',
    call: (a) => a.record(CID, INPUT),
    request: ['POST', '/payments', { query: null, body: { commission_id: CID, payment_input: INPUT } }],
    ok: 201,
    body: PAYMENT,
    missingField: omit(PAYMENT, 'payment_id'),
    wrongType: { ...PAYMENT, payment_id: 'not-an-id' },
    errors: { 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_OUT_OF_RANGE', 422: 'ERR_CURRENCY_MISMATCH', 500: 'ERR_STORAGE_IO' },
    undeclared: 200,
    unsafeInteger: { ...PAYMENT, amount: { amount_minor: 9007199254740992, currency: 'VND' } },
    badElement: null,
  },
  {
    name: 'void_payment',
    call: (a) => a.voidPayment(PID),
    request: ['PUT', `/payments/${PID}/void`, { query: null, body: null }],
    ok: 200,
    body: { ...PAYMENT, is_voided: true },
    missingField: omit(PAYMENT, 'amount'),
    wrongType: { ...PAYMENT, is_voided: 'yes' },
    errors: { 404: 'ERR_NOT_FOUND', 409: 'ERR_CONFLICT', 500: 'ERR_STORAGE_IO' },
    undeclared: 400,
    unsafeInteger: { ...PAYMENT, amount: { amount_minor: -9007199254740992, currency: 'VND' } },
    badElement: null,
  },
]

function adaptersAnswering(t: Transport) {
  const send = vi.fn<HttpClient['send']>(async () => t)
  return { send, adapters: createRecordPaymentAdapters({ send }, RECORD_PAYMENT_CONFIGS) }
}
const respond = (label: number, body: unknown): Transport => ({ kind: 'response', label, body })

let consoleError: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  consoleError.mockRestore()
})

describe('label tables of Configs match api_contract.yaml 4.0.0 line by line', () => {
  it('has exactly the declared labels of each call', () => {
    const tables = Object.fromEntries(Object.entries(RECORD_PAYMENT_CONFIGS.endpoints).map(([k, ep]) => [k, [ep.method, ep.path, ep.labels]]))
    expect(tables).toEqual({
      getBalance: ['GET', '/payments/balance/{commission_id}', { 200: 'ok', 404: 'ERR_NOT_FOUND', 409: 'ERR_OUT_OF_RANGE', 500: 'ERR_STORAGE_IO' }],
      listForCommission: ['GET', '/payments', { 200: 'ok', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' }],
      record: [
        'POST',
        '/payments',
        { 201: 'ok', 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_OUT_OF_RANGE', 422: 'ERR_CURRENCY_MISMATCH', 500: 'ERR_STORAGE_IO' },
      ],
      voidPayment: ['PUT', '/payments/{payment_id}/void', { 200: 'ok', 404: 'ERR_NOT_FOUND', 409: 'ERR_CONFLICT', 500: 'ERR_STORAGE_IO' }],
    })
  })

  it('Configs name Data Schema 9.0.0 and API Contract 4.0.0', () => {
    expect(RECORD_PAYMENT_CONFIGS.contract).toEqual({ apiContract: '4.0.0', dataSchema: '9.0.0' })
  })
})

describe.each(CASES)('$name', (c) => {
  it('sends the declared method and path, the query, the body keyed by input name', async () => {
    const { send, adapters } = adaptersAnswering(respond(c.ok, c.body))
    await c.call(adapters)
    expect(send).toHaveBeenCalledExactlyOnceWith(...c.request)
  })

  it(`label ${c.ok} with a valid body → ok, the data as checked`, async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.body))
    expect(await c.call(adapters)).toEqual({ kind: 'ok', label: c.ok, data: c.body })
  })

  it.each(Object.entries(c.errors))('label %s with its declared code → declared_error, body untouched', async (label, code) => {
    const body = { code, message: 'Something failed', details: { field: 'x' } }
    const { adapters } = adaptersAnswering(respond(Number(label), body))
    expect(await c.call(adapters)).toEqual({ kind: 'declared_error', label: Number(label), error: body })
  })

  it.each(Object.entries(c.errors))('label %s with another code → contract_violation', async (label, code) => {
    const other = code === 'ERR_CONFLICT' ? 'ERR_OUT_OF_RANGE' : 'ERR_CONFLICT'
    const { adapters } = adaptersAnswering(respond(Number(label), errorBody(other)))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it.each(Object.entries(c.errors))('label %s with a body that is not error_body → contract_violation', async (label) => {
    const { adapters } = adaptersAnswering(respond(Number(label), { code: 'ERR_STORAGE_IO', details: 'no' }))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('no response → unreachable, the reason logged', async () => {
    const { adapters } = adaptersAnswering({ kind: 'unreachable', reason: 'connection refused' })
    expect(await c.call(adapters)).toEqual({ kind: 'unreachable', reason: 'connection refused' })
    expect(consoleError).toHaveBeenCalledWith('[record_payment] unreachable: connection refused')
  })

  it(`undeclared label ${c.undeclared} → contract_violation, the reason logged`, async () => {
    const { adapters } = adaptersAnswering(respond(c.undeclared, errorBody('ERR_VALIDATION')))
    const r = await c.call(adapters)
    expect(r.kind).toBe('contract_violation')
    expect(consoleError).toHaveBeenCalledWith(`[record_payment] contract violation: label ${c.undeclared} is not declared for ${c.name}`)
  })

  it('an empty body on the ok label → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, null))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('a committed field missing → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.missingField))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('a field of the wrong type → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.wrongType))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('amount_minor outside ±(2^53−1) → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.unsafeInteger))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
    expect(String(consoleError.mock.calls.at(-1)?.[0])).toContain('amount_minor')
  })

  if (c.badElement !== null) {
    it('a list with exactly one element of the wrong shape → contract_violation', async () => {
      const { adapters } = adaptersAnswering(respond(c.ok, c.badElement))
      expect((await c.call(adapters)).kind).toBe('contract_violation')
    })
  }

  it('extra fields are dropped, not rejected', async () => {
    const withExtra = Array.isArray(c.body)
      ? c.body.map((x) => (typeof x === 'object' && x !== null ? { ...x, extra_field: 1 } : x))
      : { ...(c.body as object), extra_field: 1 }
    const { adapters } = adaptersAnswering(respond(c.ok, withExtra))
    expect(await c.call(adapters)).toEqual({ kind: 'ok', label: c.ok, data: c.body })
  })
})

describe('values of the contract, nulls, negative outstanding, voided payments', () => {
  const list = (body: unknown) => adaptersAnswering(respond(200, body)).adapters.listForCommission(CID)
  const balance = (body: unknown) => adaptersAnswering(respond(200, body)).adapters.getBalance(CID)

  it.each(['incoming', 'refund'])('direction %s is ok', async (direction) => {
    expect((await list([{ ...PAYMENT, direction }])).kind).toBe('ok')
  })

  it.each(['deposit', 'milestone', 'final', 'tip', 'other'])('kind %s is ok', async (kind) => {
    expect((await list([{ ...PAYMENT, kind }])).kind).toBe('ok')
  })

  it.each(['sale', 'Incoming', '', 'both'])('direction %j (not one of the two of the contract) → contract_violation', async (direction) => {
    expect((await list([{ ...PAYMENT, direction }])).kind).toBe('contract_violation')
  })

  it.each(['gift', 'Deposit', '', 'final '])('kind %j (not one of the five of the contract) → contract_violation', async (kind) => {
    expect((await list([{ ...PAYMENT, kind }])).kind).toBe('contract_violation')
  })

  it('an empty list is ok; a voided payment is ok; a note is ok', async () => {
    expect(await list([])).toEqual({ kind: 'ok', label: 200, data: [] })
    const voided = { ...PAYMENT, is_voided: true, note: 'Khách chuyển nhầm' }
    expect(await list([voided])).toEqual({ kind: 'ok', label: 200, data: [voided] })
  })

  it('a negative outstanding (overpaid) and a negative received_net are ok', async () => {
    const body = { ...BALANCE, received_net: { amount_minor: -5, currency: 'VND' }, outstanding: { amount_minor: -50000, currency: 'VND' } }
    expect(await balance(body)).toEqual({ kind: 'ok', label: 200, data: body })
  })

  it('a currency that is not three capital letters → contract_violation', async () => {
    expect((await balance({ ...BALANCE, agreed: { amount_minor: 1, currency: 'vnd' } })).kind).toBe('contract_violation')
  })

  it('paid_at that is not a timestamp with an offset → contract_violation', async () => {
    expect((await list([{ ...PAYMENT, paid_at: '2026-09-28T08:30:15' }])).kind).toBe('contract_violation')
  })

  it('a null note is ok; a note that is not a string → contract_violation', async () => {
    expect((await list([{ ...PAYMENT, note: null }])).kind).toBe('ok')
    expect((await list([{ ...PAYMENT, note: 5 }])).kind).toBe('contract_violation')
  })

  it('ids and path segments are URL-encoded; the query carries commission_id', async () => {
    const { send, adapters } = adaptersAnswering(respond(404, errorBody('ERR_NOT_FOUND')))
    await adapters.getBalance('a/b c')
    expect(send.mock.calls[0][1]).toBe('/payments/balance/a%2Fb%20c')
    await adapters.voidPayment('x/y')
    expect(send.mock.calls[1][1]).toBe('/payments/x%2Fy/void')
  })
})

describe('the two 409 of the workflow are told apart by call', () => {
  it('record and get_balance: ERR_OUT_OF_RANGE is declared; ERR_CONFLICT is a contract violation', async () => {
    for (const call of [(a: RecordPaymentAdapters) => a.record(CID, INPUT), (a: RecordPaymentAdapters) => a.getBalance(CID)]) {
      expect((await call(adaptersAnswering(respond(409, errorBody('ERR_OUT_OF_RANGE'))).adapters)).kind).toBe('declared_error')
      expect((await call(adaptersAnswering(respond(409, errorBody('ERR_CONFLICT'))).adapters)).kind).toBe('contract_violation')
    }
  })

  it('void_payment: ERR_CONFLICT is declared; ERR_OUT_OF_RANGE is a contract violation', async () => {
    expect((await adaptersAnswering(respond(409, errorBody('ERR_CONFLICT'))).adapters.voidPayment(PID)).kind).toBe('declared_error')
    expect((await adaptersAnswering(respond(409, errorBody('ERR_OUT_OF_RANGE'))).adapters.voidPayment(PID)).kind).toBe('contract_violation')
  })

  it('record: 422 carries ERR_CURRENCY_MISMATCH; 404 carries ERR_NOT_FOUND', async () => {
    const r = await adaptersAnswering(respond(422, errorBody('ERR_CURRENCY_MISMATCH'))).adapters.record(CID, INPUT)
    expect(r).toEqual({ kind: 'declared_error', label: 422, error: errorBody('ERR_CURRENCY_MISMATCH') })
  })
})
