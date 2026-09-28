// Adapters of manage_client — coverage matrix of i3-logic.md, Step I3.6, for
// list_clients (GET /clients: 200 { ref: client_list }, 500 { code: ERR_STORAGE_IO }),
// plus the cases of the session-12 plan. Fake http_client: no network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, Transport } from '../../../shared/resources'
import { createManageClientAdapters } from '../adapters'
import { MANAGE_CLIENT_CONFIGS } from '../configs'

const AN = { client_id: '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b', display_name: 'An', is_archived: false, updated_at: '2026-09-27T10:00:00+07:00' }
const ANH = { client_id: 'a1b2c3d4-e5f6-4a7b-9c8d-0e1f2a3b4c5d', display_name: 'Ánh', is_archived: true, updated_at: '2026-09-26T08:30:15Z' }
const STORAGE_ERROR = { code: 'ERR_STORAGE_IO', message: 'database is locked', details: null }

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

describe('listClients — declared labels', () => {
  it('sends GET /clients with no query and no body', async () => {
    const { send, adapters } = adaptersAnswering({ kind: 'response', label: 200, body: [] })
    await adapters.listClients()
    expect(send).toHaveBeenCalledExactlyOnceWith('GET', '/clients', { query: null, body: null })
  })

  it('200 with a valid client_list → ok, data checked', async () => {
    const { adapters } = adaptersAnswering({ kind: 'response', label: 200, body: [AN, ANH] })
    expect(await adapters.listClients()).toEqual({ kind: 'ok', label: 200, data: [AN, ANH] })
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('200 with an empty list → ok, empty data', async () => {
    const { adapters } = adaptersAnswering({ kind: 'response', label: 200, body: [] })
    expect(await adapters.listClients()).toEqual({ kind: 'ok', label: 200, data: [] })
  })

  it('500 with error_body ERR_STORAGE_IO → declared_error, body kept as is', async () => {
    const { adapters } = adaptersAnswering({ kind: 'response', label: 500, body: STORAGE_ERROR })
    expect(await adapters.listClients()).toEqual({ kind: 'declared_error', label: 500, error: STORAGE_ERROR })
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('500 whose details is an object → declared_error', async () => {
    const error = { ...STORAGE_ERROR, details: { path: 'data.db' } }
    const { adapters } = adaptersAnswering({ kind: 'response', label: 500, body: error })
    expect(await adapters.listClients()).toEqual({ kind: 'declared_error', label: 500, error })
  })
})

describe('listClients — unreachable', () => {
  it('no response → unreachable, reason logged', async () => {
    const { adapters } = adaptersAnswering({ kind: 'unreachable', reason: 'fetch failed (GET /clients)' })
    expect(await adapters.listClients()).toEqual({ kind: 'unreachable', reason: 'fetch failed (GET /clients)' })
    expect(consoleError).toHaveBeenCalledWith('[manage_client] unreachable: fetch failed (GET /clients)')
  })
})

describe('listClients — contract violations', () => {
  async function expectViolation(t: Transport, reasonPart: string) {
    const { adapters } = adaptersAnswering(t)
    const r = await adapters.listClients()
    expect(r).toEqual({ kind: 'contract_violation', reason: expect.stringContaining(reasonPart) })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(`[manage_client] contract violation: `))
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(reasonPart))
  }

  it('undeclared label 404', () => expectViolation({ kind: 'response', label: 404, body: { ...STORAGE_ERROR, code: 'ERR_NOT_FOUND' } }, 'label 404 is not declared'))

  it('undeclared label 201 (a success status the contract does not declare)', () =>
    expectViolation({ kind: 'response', label: 201, body: [] }, 'label 201 is not declared'))

  it('200 whose body is not a list', () => expectViolation({ kind: 'response', label: 200, body: { clients: [AN] } }, '(root)'))

  it('200 whose body is empty or not JSON (http_client gives null)', () =>
    expectViolation({ kind: 'response', label: 200, body: null }, 'body is empty or not JSON'))

  it('200 with an element missing a committed field', () => {
    const { updated_at: _dropped, ...noUpdatedAt } = AN
    void _dropped
    return expectViolation({ kind: 'response', label: 200, body: [noUpdatedAt] }, '0.updated_at')
  })

  it('200 with a field of the wrong type', () =>
    expectViolation({ kind: 'response', label: 200, body: [{ ...AN, is_archived: 'false' }] }, '0.is_archived'))

  it('200 with exactly one element of the wrong shape among valid ones', () =>
    expectViolation({ kind: 'response', label: 200, body: [AN, { ...ANH, display_name: null }, AN] }, '1.display_name'))

  it('200 with client_id in upper case', () =>
    expectViolation({ kind: 'response', label: 200, body: [{ ...AN, client_id: AN.client_id.toUpperCase() }] }, '0.client_id'))

  it('200 with client_id that is not a UUID', () =>
    expectViolation({ kind: 'response', label: 200, body: [{ ...AN, client_id: 'client-1' }] }, '0.client_id'))

  it('200 with client_id that is a UUID but not version 4', () =>
    expectViolation({ kind: 'response', label: 200, body: [{ ...AN, client_id: '3f2b8c1e-9a4d-1e6f-8b2a-1c3d5e7f9a0b' }] }, '0.client_id'))

  it('200 with updated_at without a UTC offset', () =>
    expectViolation({ kind: 'response', label: 200, body: [{ ...AN, updated_at: '2026-09-27T10:00:00' }] }, '0.updated_at'))

  it('200 with updated_at that is not a real point in time', () =>
    expectViolation({ kind: 'response', label: 200, body: [{ ...AN, updated_at: '2026-13-45T10:00:00+07:00' }] }, '0.updated_at'))

  it('500 whose error_body carries another code than the declared one', () =>
    expectViolation({ kind: 'response', label: 500, body: { ...STORAGE_ERROR, code: 'ERR_VALIDATION' } }, 'code is ERR_VALIDATION, declared ERR_STORAGE_IO'))

  it('500 whose body is not an error_body', () =>
    expectViolation({ kind: 'response', label: 500, body: { code: 'ERR_STORAGE_IO' } }, 'error_body: message'))

  it('500 whose body is empty or not JSON', () =>
    expectViolation({ kind: 'response', label: 500, body: null }, 'label 500 error_body: body is empty or not JSON'))
})

describe('listClients — extra fields', () => {
  it('extra fields in a 200 body are dropped, not rejected', async () => {
    const { adapters } = adaptersAnswering({ kind: 'response', label: 200, body: [{ ...AN, created_at: AN.updated_at, contacts: [] }] })
    expect(await adapters.listClients()).toEqual({ kind: 'ok', label: 200, data: [AN] })
  })

  it('extra fields in a 500 error_body are dropped', async () => {
    const { adapters } = adaptersAnswering({ kind: 'response', label: 500, body: { ...STORAGE_ERROR, trace: 'x' } })
    expect(await adapters.listClients()).toEqual({ kind: 'declared_error', label: 500, error: STORAGE_ERROR })
  })
})
