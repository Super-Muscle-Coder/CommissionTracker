// Adapters of update_progress — coverage matrix of i3-logic.md, Step I3.6,
// for the six calls of ui_decomposition.md D3 (api_contract.yaml 4.0.0):
//   get_stage          GET /commissions/{commission_id}/stage          200 ok, 404, 500
//   get_stage_history  GET /commissions/{commission_id}/stage/history  200 ok, 404, 500
//   change_stage       PUT /commissions/{commission_id}/stage          200 ok, 400, 404, 409, 500
//   get_board          GET /progress/board                             200 ok, 500
//   list_stages        GET /progress/stages                            200 ok
//   list_commissions   GET /commissions                                200 ok, 500
// Every declared label, unreachable, an undeclared label, a missing field, a
// wrong type, a wrong code, an integer outside the safe range (money of
// commission_list), extra fields dropped, one bad element of a list; and the
// request each one sends (method, path, body keyed by input name —
// endpoint_forms.http). Plus: stage_kind only its four values; updated_at and
// from_stage may be null; list_stages never empty. Fake http_client.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, Transport } from '../../../shared/resources'
import type { CallResult } from '../../../shared/results'
import { createUpdateProgressAdapters, type UpdateProgressAdapters } from '../adapters'
import { UPDATE_PROGRESS_CONFIGS } from '../configs'
import type { ProgressState, StageChange } from '../entities'

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const KID = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const STATE: ProgressState = { commission_id: CID, current_stage: 'sketch', stage_kind: 'active', updated_at: '2026-09-28T08:30:15Z' }
const HISTORY_ITEM = { from_stage: 'queued', to_stage: 'sketch', note: 'Bắt đầu phác', changed_at: '2026-09-28T08:30:15+07:00' }
const ENTRY = { commission_id: CID, current_stage: 'sketch', stage_kind: 'active' }
const STAGE = { stage: 'queued', kind: 'active' }
const LIST_ITEM = {
  commission_id: CID,
  client_id: KID,
  title: 'Chân dung',
  agreed_price: { amount_minor: 1250, currency: 'USD' },
  deadline: '2026-10-15',
  updated_at: '2026-09-28T08:30:15Z',
}
const INPUT: StageChange = { to_stage: 'lineart', note: null }
const errorBody = (code: string) => ({ code, message: 'x', details: null })

type Case = {
  name: string
  call: (a: UpdateProgressAdapters) => Promise<CallResult<unknown>>
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
    name: 'get_stage',
    call: (a) => a.getStage(CID),
    request: ['GET', `/commissions/${CID}/stage`, { query: null, body: null }],
    ok: 200,
    body: STATE,
    missingField: omit(STATE, 'updated_at'),
    wrongType: { ...STATE, current_stage: 3 },
    errors: { 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 400,
    unsafeInteger: null,
    badElement: null,
  },
  {
    name: 'get_stage_history',
    call: (a) => a.getStageHistory(CID),
    request: ['GET', `/commissions/${CID}/stage/history`, { query: null, body: null }],
    ok: 200,
    body: [HISTORY_ITEM],
    missingField: [omit(HISTORY_ITEM, 'note')],
    wrongType: [{ ...HISTORY_ITEM, to_stage: null }],
    errors: { 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 409,
    unsafeInteger: null,
    badElement: [HISTORY_ITEM, { ...HISTORY_ITEM, changed_at: '2026-09-28' }],
  },
  {
    name: 'change_stage',
    call: (a) => a.changeStage(CID, INPUT),
    request: ['PUT', `/commissions/${CID}/stage`, { query: null, body: { stage_change: INPUT } }],
    ok: 200,
    body: STATE,
    missingField: omit(STATE, 'stage_kind'),
    wrongType: { ...STATE, commission_id: 'not-an-id' },
    errors: { 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_INVALID_TRANSITION', 500: 'ERR_STORAGE_IO' },
    undeclared: 201,
    unsafeInteger: null,
    badElement: null,
  },
  {
    name: 'get_board',
    call: (a) => a.getBoard(),
    request: ['GET', '/progress/board', { query: null, body: null }],
    ok: 200,
    body: [ENTRY],
    missingField: [omit(ENTRY, 'current_stage')],
    wrongType: [{ ...ENTRY, stage_kind: 1 }],
    errors: { 500: 'ERR_STORAGE_IO' },
    undeclared: 404,
    unsafeInteger: null,
    badElement: [ENTRY, { ...ENTRY, commission_id: KID.toUpperCase() }],
  },
  {
    name: 'list_stages',
    call: (a) => a.listStages(),
    request: ['GET', '/progress/stages', { query: null, body: null }],
    ok: 200,
    body: [STAGE, { stage: 'delivered', kind: 'finished' }],
    missingField: [omit(STAGE, 'kind')],
    wrongType: [{ ...STAGE, stage: false }],
    errors: {},
    undeclared: 500,
    unsafeInteger: null,
    badElement: [STAGE, { stage: 'delivered', kind: 'done' }],
  },
  {
    name: 'list_commissions',
    call: (a) => a.listCommissions(),
    request: ['GET', '/commissions', { query: null, body: null }],
    ok: 200,
    body: [LIST_ITEM],
    missingField: [omit(LIST_ITEM, 'updated_at')],
    wrongType: [{ ...LIST_ITEM, title: null }],
    errors: { 500: 'ERR_STORAGE_IO' },
    undeclared: 404,
    unsafeInteger: [{ ...LIST_ITEM, agreed_price: { amount_minor: 9007199254740992, currency: 'USD' } }],
    badElement: [LIST_ITEM, { ...LIST_ITEM, deadline: '2026-02-30' }],
  },
]

function adaptersAnswering(t: Transport) {
  const send = vi.fn<HttpClient['send']>(async () => t)
  return { send, adapters: createUpdateProgressAdapters({ send }, UPDATE_PROGRESS_CONFIGS) }
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
    const tables = Object.fromEntries(Object.entries(UPDATE_PROGRESS_CONFIGS.endpoints).map(([k, ep]) => [k, [ep.method, ep.path, ep.labels]]))
    expect(tables).toEqual({
      getStage: ['GET', '/commissions/{commission_id}/stage', { 200: 'ok', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' }],
      getStageHistory: ['GET', '/commissions/{commission_id}/stage/history', { 200: 'ok', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' }],
      changeStage: [
        'PUT',
        '/commissions/{commission_id}/stage',
        { 200: 'ok', 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 409: 'ERR_INVALID_TRANSITION', 500: 'ERR_STORAGE_IO' },
      ],
      getBoard: ['GET', '/progress/board', { 200: 'ok', 500: 'ERR_STORAGE_IO' }],
      listStages: ['GET', '/progress/stages', { 200: 'ok' }],
      listCommissions: ['GET', '/commissions', { 200: 'ok', 500: 'ERR_STORAGE_IO' }],
    })
  })

  it('Configs name Data Schema 8.0.1 and API Contract 4.0.0', () => {
    expect(UPDATE_PROGRESS_CONFIGS.contract).toEqual({ apiContract: '4.0.0', dataSchema: '8.0.1' })
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
    expect(consoleError).toHaveBeenCalledWith('[update_progress] unreachable: connection refused')
  })

  it(`undeclared label ${c.undeclared} → contract_violation, the reason logged`, async () => {
    const { adapters } = adaptersAnswering(respond(c.undeclared, errorBody('ERR_VALIDATION')))
    const r = await c.call(adapters)
    expect(r.kind).toBe('contract_violation')
    expect(consoleError).toHaveBeenCalledWith(`[update_progress] contract violation: label ${c.undeclared} is not declared for ${c.name}`)
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

describe('stage kinds, nulls and the catalog', () => {
  const stage = (body: unknown) => adaptersAnswering(respond(200, body)).adapters.getStage(CID)

  it.each(['active', 'on_hold', 'finished', 'cancelled'])('stage_kind %s is ok', async (kind) => {
    expect((await stage({ ...STATE, stage_kind: kind })).kind).toBe('ok')
  })

  it.each(['done', 'Active', 'closed', ''])('stage_kind %j (not one of the four of the contract) → contract_violation', async (kind) => {
    expect((await stage({ ...STATE, stage_kind: kind })).kind).toBe('contract_violation')
  })

  it('updated_at null (no stage set yet) is ok', async () => {
    const body = { ...STATE, current_stage: 'queued', updated_at: null }
    expect(await stage(body)).toEqual({ kind: 'ok', label: 200, data: body })
  })

  it('updated_at that is not a timestamp → contract_violation', async () => {
    expect((await stage({ ...STATE, updated_at: '2026-09-28' })).kind).toBe('contract_violation')
  })

  it('from_stage null (the first change) and note null are ok; an empty history is ok', async () => {
    const first = { from_stage: null, to_stage: 'sketch', note: null, changed_at: '2026-09-28T08:30:15Z' }
    const history = (body: unknown) => adaptersAnswering(respond(200, body)).adapters.getStageHistory(CID)
    expect(await history([first])).toEqual({ kind: 'ok', label: 200, data: [first] })
    expect(await history([])).toEqual({ kind: 'ok', label: 200, data: [] })
  })

  it('an empty board is ok', async () => {
    expect(await adaptersAnswering(respond(200, [])).adapters.getBoard()).toEqual({ kind: 'ok', label: 200, data: [] })
  })

  it('an empty stage list → contract_violation (the catalog always has a first stage)', async () => {
    expect((await adaptersAnswering(respond(200, [])).adapters.listStages()).kind).toBe('contract_violation')
  })

  it('a stage code outside the default catalog is ok (the backend may change stage_catalog)', async () => {
    const body = [{ stage: 'inking', kind: 'active' }]
    expect(await adaptersAnswering(respond(200, body)).adapters.listStages()).toEqual({ kind: 'ok', label: 200, data: body })
  })

  it('a commission_id path segment is URL-encoded', async () => {
    const { send, adapters } = adaptersAnswering(respond(404, errorBody('ERR_NOT_FOUND')))
    await adapters.getStage('a/b c')
    expect(send.mock.calls[0][1]).toBe('/commissions/a%2Fb%20c/stage')
  })
})
