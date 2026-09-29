// Adapters of manage_commission — coverage matrix of i3-logic.md, Step I3.6,
// for the seven calls of ui_decomposition.md D2 (api_contract.yaml 4.0.0):
//   list_commissions  GET  /commissions                  200 ok, 500
//   get_commission    GET  /commissions/{commission_id}  200 ok, 404, 500
//   create_commission POST /commissions                  201 ok, 400, 404, 409, 500
//   edit_commission   PUT  /commissions/{commission_id}  200 ok, 400, 404, 409, 500
//   list_currencies   GET  /currencies                   200 ok
//   list_clients      GET  /clients                      200 ok, 500
//   get_client        GET  /clients/{client_id}          200 ok, 404, 500
// Every declared label, unreachable, an undeclared label, a missing field, a
// wrong type, a wrong code, an integer outside the safe range (money), extra
// fields dropped, one bad element of a list; and the request each one sends
// (method, path, body keyed by input name — endpoint_forms.http). Fake http_client.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, Transport } from '../../../shared/resources'
import type { CallResult } from '../../../shared/results'
import { createManageCommissionAdapters, type ManageCommissionAdapters } from '../adapters'
import { MANAGE_COMMISSION_CONFIGS } from '../configs'
import type { CommissionDetail, CommissionInput } from '../entities'

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const KID = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const DETAIL: CommissionDetail = {
  commission_id: CID,
  client_id: KID,
  title: 'Chân dung bán thân',
  description: 'Nền xanh',
  commission_type: 'bán thân',
  agreed_price: { amount_minor: 1500000, currency: 'VND' },
  deadline: '2026-10-15',
  reference_links: ['https://example.com/a'],
  created_at: '2026-09-27T10:00:00+07:00',
  updated_at: '2026-09-28T08:30:15Z',
}
const LIST_ITEM = {
  commission_id: CID,
  client_id: KID,
  title: 'Chân dung',
  agreed_price: { amount_minor: 1250, currency: 'USD' },
  deadline: null,
  updated_at: '2026-09-28T08:30:15Z',
}
const CLIENT_ITEM = { client_id: KID, display_name: 'An', is_archived: false, updated_at: '2026-09-27T10:00:00+07:00' }
const CLIENT_DETAIL = {
  client_id: KID,
  display_name: 'An',
  contacts: [{ channel: 'email', value: 'an@example.com' }],
  note: null,
  is_archived: true,
  created_at: '2026-09-27T10:00:00+07:00',
  updated_at: '2026-09-28T08:30:15Z',
}
const INPUT: CommissionInput = {
  client_id: KID,
  title: 'Chân dung',
  description: null,
  commission_type: null,
  agreed_price: { amount_minor: 1250, currency: 'USD' },
  deadline: null,
  reference_links: [],
}
const errorBody = (code: string) => ({ code, message: 'x', details: null })

type Case = {
  name: string
  call: (a: ManageCommissionAdapters) => Promise<CallResult<unknown>>
  request: [string, string, { query: null; body: unknown }]
  ok: number
  // A valid body of the ok label, and that body with one committed field missing / wrongly typed.
  body: unknown
  missingField: unknown
  wrongType: unknown
  errors: Record<number, string>
  undeclared: number
  // A body with an integer outside ±(2^53−1), when the output carries one.
  unsafeInteger: unknown | null
  // A list output: the valid body with one element of the wrong shape.
  badElement: unknown | null
}

const omit = <T extends object>(o: T, k: keyof T) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k))

const CASES: Case[] = [
  {
    name: 'list_commissions',
    call: (a) => a.listCommissions(),
    request: ['GET', '/commissions', { query: null, body: null }],
    ok: 200,
    body: [LIST_ITEM],
    missingField: [omit(LIST_ITEM, 'agreed_price')],
    wrongType: [{ ...LIST_ITEM, deadline: 20261015 }],
    errors: { 500: 'ERR_STORAGE_IO' },
    undeclared: 404,
    unsafeInteger: [{ ...LIST_ITEM, agreed_price: { amount_minor: 9007199254740992, currency: 'USD' } }],
    badElement: [LIST_ITEM, { ...LIST_ITEM, commission_id: 'not-an-id' }],
  },
  {
    name: 'get_commission',
    call: (a) => a.getCommission(CID),
    request: ['GET', `/commissions/${CID}`, { query: null, body: null }],
    ok: 200,
    body: DETAIL,
    missingField: omit(DETAIL, 'reference_links'),
    wrongType: { ...DETAIL, description: 5 },
    errors: { 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 400,
    unsafeInteger: { ...DETAIL, agreed_price: { amount_minor: -9007199254740992, currency: 'VND' } },
    badElement: null,
  },
  {
    name: 'create_commission',
    call: (a) => a.createCommission(INPUT),
    request: ['POST', '/commissions', { query: null, body: { commission_input: INPUT } }],
    ok: 201,
    body: DETAIL,
    missingField: omit(DETAIL, 'created_at'),
    wrongType: { ...DETAIL, commission_type: false },
    errors: { 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_CONFLICT', 500: 'ERR_STORAGE_IO' },
    undeclared: 200,
    unsafeInteger: { ...DETAIL, agreed_price: { amount_minor: 1e20, currency: 'VND' } },
    badElement: null,
  },
  {
    name: 'edit_commission',
    call: (a) => a.editCommission(CID, INPUT),
    request: ['PUT', `/commissions/${CID}`, { query: null, body: { commission_input: INPUT } }],
    ok: 200,
    body: DETAIL,
    missingField: omit(DETAIL, 'deadline'),
    wrongType: { ...DETAIL, reference_links: 'https://example.com' },
    errors: { 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_CONFLICT', 500: 'ERR_STORAGE_IO' },
    undeclared: 201,
    unsafeInteger: { ...DETAIL, agreed_price: { amount_minor: 9007199254740992, currency: 'VND' } },
    badElement: null,
  },
  {
    name: 'list_currencies',
    call: (a) => a.listCurrencies(),
    request: ['GET', '/currencies', { query: null, body: null }],
    ok: 200,
    body: ['VND', 'USD'],
    missingField: null,
    wrongType: 'VND',
    errors: {},
    undeclared: 500,
    unsafeInteger: null,
    badElement: ['VND', 'usd'],
  },
  {
    name: 'list_clients',
    call: (a) => a.listClients(),
    request: ['GET', '/clients', { query: null, body: null }],
    ok: 200,
    body: [CLIENT_ITEM],
    missingField: [omit(CLIENT_ITEM, 'is_archived')],
    wrongType: [{ ...CLIENT_ITEM, display_name: null }],
    errors: { 500: 'ERR_STORAGE_IO' },
    undeclared: 404,
    unsafeInteger: null,
    badElement: [CLIENT_ITEM, { ...CLIENT_ITEM, updated_at: '2026-09-27' }],
  },
  {
    name: 'get_client',
    call: (a) => a.getClient(KID),
    request: ['GET', `/clients/${KID}`, { query: null, body: null }],
    ok: 200,
    body: CLIENT_DETAIL,
    missingField: omit(CLIENT_DETAIL, 'contacts'),
    wrongType: { ...CLIENT_DETAIL, is_archived: 'yes' },
    errors: { 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 409,
    unsafeInteger: null,
    badElement: null,
  },
]

function adaptersAnswering(t: Transport) {
  const send = vi.fn<HttpClient['send']>(async () => t)
  return { send, adapters: createManageCommissionAdapters({ send }, MANAGE_COMMISSION_CONFIGS) }
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
    const tables = Object.fromEntries(Object.entries(MANAGE_COMMISSION_CONFIGS.endpoints).map(([k, ep]) => [k, [ep.method, ep.path, ep.labels]]))
    expect(tables).toEqual({
      listCommissions: ['GET', '/commissions', { 200: 'ok', 500: 'ERR_STORAGE_IO' }],
      getCommission: ['GET', '/commissions/{commission_id}', { 200: 'ok', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' }],
      createCommission: ['POST', '/commissions', { 201: 'ok', 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_CONFLICT', 500: 'ERR_STORAGE_IO' }],
      editCommission: ['PUT', '/commissions/{commission_id}', { 200: 'ok', 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_CONFLICT', 500: 'ERR_STORAGE_IO' }],
      listCurrencies: ['GET', '/currencies', { 200: 'ok' }],
      listClients: ['GET', '/clients', { 200: 'ok', 500: 'ERR_STORAGE_IO' }],
      getClient: ['GET', '/clients/{client_id}', { 200: 'ok', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' }],
    })
  })
})

describe.each(CASES)('$name', (c) => {
  it('sends the declared method and path, the body keyed by input name', async () => {
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

  it.each(Object.entries(c.errors))('label %s with another code → contract_violation', async (label) => {
    const { adapters } = adaptersAnswering(respond(Number(label), errorBody('ERR_OUT_OF_RANGE')))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it.each(Object.entries(c.errors))('label %s with a body that is not error_body → contract_violation', async (label) => {
    const { adapters } = adaptersAnswering(respond(Number(label), { code: 'ERR_STORAGE_IO', details: 'no' }))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('no response → unreachable, the reason logged', async () => {
    const { adapters } = adaptersAnswering({ kind: 'unreachable', reason: 'connection refused' })
    expect(await c.call(adapters)).toEqual({ kind: 'unreachable', reason: 'connection refused' })
    expect(consoleError).toHaveBeenCalledWith('[manage_commission] unreachable: connection refused')
  })

  it(`undeclared label ${c.undeclared} → contract_violation, the reason logged`, async () => {
    const { adapters } = adaptersAnswering(respond(c.undeclared, errorBody('ERR_VALIDATION')))
    const r = await c.call(adapters)
    expect(r.kind).toBe('contract_violation')
    expect(consoleError).toHaveBeenCalledWith(`[manage_commission] contract violation: label ${c.undeclared} is not declared for ${c.name}`)
  })

  it('an empty body on the ok label → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, null))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  if (c.missingField !== null) {
    it('a committed field missing → contract_violation', async () => {
      const { adapters } = adaptersAnswering(respond(c.ok, c.missingField))
      expect((await c.call(adapters)).kind).toBe('contract_violation')
    })
  }

  it('a field of the wrong type → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.wrongType))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  if (c.unsafeInteger !== null) {
    it('amount_minor outside ±(2^53−1) → contract_violation', async () => {
      const { adapters } = adaptersAnswering(respond(c.ok, c.unsafeInteger))
      expect((await c.call(adapters)).kind).toBe('contract_violation')
      expect(String(consoleError.mock.calls.at(-1)?.[0])).toContain('amount_minor')
    })
  }

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

describe('money and dates in the outputs', () => {
  const get = (body: unknown) => adaptersAnswering(respond(200, body)).adapters.getCommission(CID)

  it('the largest safe amount 9007199254740991 is ok, exactly', async () => {
    const body = { ...DETAIL, agreed_price: { amount_minor: 9007199254740991, currency: 'VND' } }
    expect(await get(body)).toEqual({ kind: 'ok', label: 200, data: body })
  })

  it('a non-integer amount (12.5) → contract_violation', async () => {
    expect((await get({ ...DETAIL, agreed_price: { amount_minor: 12.5, currency: 'USD' } })).kind).toBe('contract_violation')
  })

  it('a currency that is not an ISO 4217 alphabetic code → contract_violation', async () => {
    expect((await get({ ...DETAIL, agreed_price: { amount_minor: 1, currency: 'vnd' } })).kind).toBe('contract_violation')
  })

  it('a deadline that is not a calendar date (2026-02-30, or a timestamp) → contract_violation', async () => {
    expect((await get({ ...DETAIL, deadline: '2026-02-30' })).kind).toBe('contract_violation')
    expect((await get({ ...DETAIL, deadline: '2026-10-15T00:00:00Z' })).kind).toBe('contract_violation')
  })

  it('a null deadline is ok (deadline: date|null)', async () => {
    expect((await get({ ...DETAIL, deadline: null })).kind).toBe('ok')
  })

  it('a commission_id path segment is URL-encoded', async () => {
    const { send, adapters } = adaptersAnswering(respond(404, errorBody('ERR_NOT_FOUND')))
    await adapters.getCommission('a/b c')
    expect(send.mock.calls[0][1]).toBe('/commissions/a%2Fb%20c')
  })
})
