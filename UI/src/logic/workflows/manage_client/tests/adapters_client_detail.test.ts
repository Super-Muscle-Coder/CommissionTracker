// Adapters of manage_client — coverage matrix of i3-logic.md, Step I3.6, for
// the four endpoints that answer client_detail (api_contract.yaml 4.0.0):
//   get_client          GET  /clients/{client_id}           200 ok, 404 ERR_NOT_FOUND, 500 ERR_STORAGE_IO
//   create_client       POST /clients                       201 ok, 400 ERR_VALIDATION, 500 ERR_STORAGE_IO
//   edit_client         PUT  /clients/{client_id}           200 ok, 400 ERR_VALIDATION, 404 ERR_NOT_FOUND, 500 ERR_STORAGE_IO
//   set_client_archived PUT  /clients/{client_id}/archived  200 ok, 400 ERR_VALIDATION, 404 ERR_NOT_FOUND, 500 ERR_STORAGE_IO
// Every declared label, unreachable, an undeclared label, wrong bodies, a
// wrong code, extra fields; and the request each one sends (path, method,
// body keyed by input name — endpoint_forms.http). Fake http_client: no network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, Transport } from '../../../shared/resources'
import type { CallResult } from '../../../shared/results'
import { createManageClientAdapters, type ManageClientAdapters } from '../adapters'
import { MANAGE_CLIENT_CONFIGS } from '../configs'
import type { ClientDetail, ClientInput } from '../entities'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const DETAIL: ClientDetail = {
  client_id: ID,
  display_name: 'Nguyễn Thu Hà',
  contacts: [
    { channel: 'facebook', value: 'fb.com/thuha' },
    { channel: 'email', value: 'ha@example.com' },
  ],
  note: 'Thích tông màu ấm',
  is_archived: false,
  created_at: '2026-09-27T10:00:00+07:00',
  updated_at: '2026-09-28T08:30:15Z',
}
const INPUT: ClientInput = { display_name: 'Nguyễn Thu Hà', contacts: [{ channel: 'email', value: 'ha@example.com' }], note: null }
const errorBody = (code: string) => ({ code, message: 'x', details: null })

type Case = {
  name: string
  call: (a: ManageClientAdapters) => Promise<CallResult<ClientDetail>>
  request: [string, string, { query: null; body: unknown }]
  ok: number
  errors: Record<number, string>
  undeclared: number
}

const CASES: Case[] = [
  {
    name: 'get_client',
    call: (a) => a.getClient(ID),
    request: ['GET', `/clients/${ID}`, { query: null, body: null }],
    ok: 200,
    errors: { 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 400,
  },
  {
    name: 'create_client',
    call: (a) => a.createClient(INPUT),
    request: ['POST', '/clients', { query: null, body: { client_input: INPUT } }],
    ok: 201,
    errors: { 400: 'ERR_VALIDATION', 500: 'ERR_STORAGE_IO' },
    undeclared: 200,
  },
  {
    name: 'edit_client',
    call: (a) => a.editClient(ID, INPUT),
    request: ['PUT', `/clients/${ID}`, { query: null, body: { client_input: INPUT } }],
    ok: 200,
    errors: { 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 409,
  },
  {
    name: 'set_client_archived',
    call: (a) => a.setClientArchived(ID, true),
    request: ['PUT', `/clients/${ID}/archived`, { query: null, body: { is_archived: true } }],
    ok: 200,
    errors: { 400: 'ERR_VALIDATION', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 201,
  },
]

function adaptersAnswering(t: Transport) {
  const send = vi.fn<HttpClient['send']>(async () => t)
  return { send, adapters: createManageClientAdapters({ send }, MANAGE_CLIENT_CONFIGS) }
}

let consoleError: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  consoleError.mockRestore()
})

describe.each(CASES)('$name', (c) => {
  async function run(t: Transport) {
    return c.call(adaptersAnswering(t).adapters)
  }

  async function expectViolation(t: Transport, reasonPart: string) {
    expect(await run(t)).toEqual({ kind: 'contract_violation', reason: expect.stringContaining(reasonPart) })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('[manage_client] contract violation: '))
  }

  it('sends the declared method and path, the body keyed by input name', async () => {
    const { send, adapters } = adaptersAnswering({ kind: 'response', label: c.ok, body: DETAIL })
    await c.call(adapters)
    expect(send).toHaveBeenCalledExactlyOnceWith(...c.request)
  })

  it('ok label with a valid client_detail → ok, data checked', async () => {
    expect(await run({ kind: 'response', label: c.ok, body: DETAIL })).toEqual({ kind: 'ok', label: c.ok, data: DETAIL })
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('ok label with note null and no contact → ok', async () => {
    const body = { ...DETAIL, note: null, contacts: [] }
    expect(await run({ kind: 'response', label: c.ok, body })).toEqual({ kind: 'ok', label: c.ok, data: body })
  })

  it('every declared error label with its error_body → declared_error, body kept', async () => {
    for (const [label, code] of Object.entries(c.errors)) {
      const body = errorBody(code)
      expect(await run({ kind: 'response', label: Number(label), body })).toEqual({ kind: 'declared_error', label: Number(label), error: body })
    }
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('an error_body whose details is an object → declared_error (details not read further)', async () => {
    const [label, code] = Object.entries(c.errors)[0]
    const body = { code, message: 'x', details: { loc: ['client_input'], anything: [1, 2] } }
    expect(await run({ kind: 'response', label: Number(label), body })).toEqual({ kind: 'declared_error', label: Number(label), error: body })
  })

  it('no response → unreachable, reason logged', async () => {
    expect(await run({ kind: 'unreachable', reason: 'fetch failed' })).toEqual({ kind: 'unreachable', reason: 'fetch failed' })
    expect(consoleError).toHaveBeenCalledWith('[manage_client] unreachable: fetch failed')
  })

  it('an undeclared label → contract_violation', () =>
    expectViolation({ kind: 'response', label: c.undeclared, body: DETAIL }, `label ${c.undeclared} is not declared for ${c.name}`))

  it('ok label, body empty or not JSON → contract_violation', () =>
    expectViolation({ kind: 'response', label: c.ok, body: null }, 'body is empty or not JSON'))

  it('ok label, a committed field missing → contract_violation', () => {
    const { created_at: _dropped, ...body } = DETAIL
    void _dropped
    return expectViolation({ kind: 'response', label: c.ok, body }, 'created_at')
  })

  it('ok label, note of the wrong type → contract_violation', () =>
    expectViolation({ kind: 'response', label: c.ok, body: { ...DETAIL, note: 5 } }, 'note'))

  it('ok label, is_archived null (not declared |null) → contract_violation', () =>
    expectViolation({ kind: 'response', label: c.ok, body: { ...DETAIL, is_archived: null } }, 'is_archived'))

  it('ok label, exactly one contact of the wrong shape → contract_violation naming it', () =>
    expectViolation({ kind: 'response', label: c.ok, body: { ...DETAIL, contacts: [DETAIL.contacts[0], { channel: 'x' }] } }, 'contacts.1.value'))

  it('ok label, client_id not formats.id → contract_violation', () =>
    expectViolation({ kind: 'response', label: c.ok, body: { ...DETAIL, client_id: ID.toUpperCase() } }, 'client_id'))

  it('ok label, created_at without a UTC offset → contract_violation', () =>
    expectViolation({ kind: 'response', label: c.ok, body: { ...DETAIL, created_at: '2026-09-27T10:00:00' } }, 'created_at'))

  it('error label, error_body carrying another code → contract_violation', () => {
    const [label, code] = Object.entries(c.errors)[0]
    return expectViolation({ kind: 'response', label: Number(label), body: errorBody('ERR_CONFLICT') }, `error_body.code is ERR_CONFLICT, declared ${code}`)
  })

  it('error label, details neither object nor null → contract_violation', () => {
    const [label, code] = Object.entries(c.errors)[0]
    return expectViolation({ kind: 'response', label: Number(label), body: { code, message: 'x', details: 'text' } }, 'details')
  })

  it('error label, body empty or not JSON → contract_violation', () => {
    const [label] = Object.entries(c.errors)[0]
    return expectViolation({ kind: 'response', label: Number(label), body: null }, 'error_body: body is empty or not JSON')
  })

  it('extra fields in client_detail and in a contact are dropped, not rejected', async () => {
    const body = { ...DETAIL, owner: 'x', contacts: [{ ...DETAIL.contacts[0], verified: true }, DETAIL.contacts[1]] }
    expect(await run({ kind: 'response', label: c.ok, body })).toEqual({ kind: 'ok', label: c.ok, data: DETAIL })
  })
})

describe('path segments', () => {
  it('fills {client_id} URL-encoded (the value is never pasted raw into the path)', async () => {
    const { send, adapters } = adaptersAnswering({ kind: 'response', label: 404, body: errorBody('ERR_NOT_FOUND') })
    await adapters.getClient('a/b?c')
    expect(send).toHaveBeenCalledWith('GET', '/clients/a%2Fb%3Fc', { query: null, body: null })
  })
})
