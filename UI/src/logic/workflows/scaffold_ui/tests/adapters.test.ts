// Tests of the http_client resource of scaffold_ui, with a fake fetch.
// Runs in the node environment: the logic zone needs no DOM.
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IpcInvoke } from '../../../shared/resources'
import { createHttpClient, createIpcBridge } from '../adapters'
import { SCAFFOLD_UI_CONFIGS } from '../configs'

const BASE = 'http://127.0.0.1:51062'
const ADDRESSES = SCAFFOLD_UI_CONFIGS.ipcAddresses

type FetchArgs = [URL, RequestInit]

function stubFetch(impl: (...args: FetchArgs) => Promise<Response>) {
  const fake = vi.fn(impl)
  vi.stubGlobal('fetch', fake)
  return fake
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createHttpClient', () => {
  it('returns a 200 response raw: label and parsed body, not classified', async () => {
    stubFetch(async () => new Response(JSON.stringify([{ client_id: 'x' }]), { status: 200 }))
    const t = await createHttpClient(BASE, 1000).send('GET', '/clients', { query: null, body: null })
    expect(t).toEqual({ kind: 'response', label: 200, body: [{ client_id: 'x' }] })
  })

  it('returns a 500 response raw, the same way as a 200', async () => {
    const errorBody = { code: 'ERR_STORAGE_IO', message: 'disk full', details: null }
    stubFetch(async () => new Response(JSON.stringify(errorBody), { status: 500 }))
    const t = await createHttpClient(BASE, 1000).send('GET', '/clients', { query: null, body: null })
    expect(t).toEqual({ kind: 'response', label: 500, body: errorBody })
  })

  it('answers "unreachable" on a network error', async () => {
    stubFetch(async () => {
      throw new TypeError('fetch failed')
    })
    const t = await createHttpClient(BASE, 1000).send('GET', '/clients', { query: null, body: null })
    expect(t.kind).toBe('unreachable')
    expect(t).toMatchObject({ reason: expect.stringContaining('fetch failed') })
  })

  it('answers "unreachable" when no response arrives within the timeout', async () => {
    const fake = stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const started = Date.now()
    const t = await createHttpClient(BASE, 50).send('GET', '/clients', { query: null, body: null })
    expect(t).toEqual({ kind: 'unreachable', reason: 'no complete response within 50 ms (GET /clients)' })
    expect(Date.now() - started).toBeGreaterThanOrEqual(45)
    expect(fake).toHaveBeenCalledTimes(1)
  })

  it('joins the base URL with the path and query, and sends a JSON body with its content type', async () => {
    const fake = stubFetch(async () => new Response(null, { status: 201 }))
    const t = await createHttpClient(BASE, 1000).send('POST', '/clients', {
      query: { include_archived: 'true' },
      body: { display_name: 'Ánh' },
    })
    expect(t).toEqual({ kind: 'response', label: 201, body: null })
    const [url, init] = fake.mock.calls[0]
    expect(url.href).toBe(`${BASE}/clients?include_archived=true`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ display_name: 'Ánh' }))
  })

  it('sends no body and no content type when the body is null', async () => {
    const fake = stubFetch(async () => new Response('[]', { status: 200 }))
    await createHttpClient(BASE, 1000).send('GET', '/clients', { query: null, body: null })
    const [, init] = fake.mock.calls[0]
    expect(init.body).toBeUndefined()
    expect(init.headers).toEqual({})
  })

  it('hands back body null when the body is not JSON, leaving the judgement to the caller', async () => {
    stubFetch(async () => new Response('Internal Server Error', { status: 500 }))
    const t = await createHttpClient(BASE, 1000).send('GET', '/clients', { query: null, body: null })
    expect(t).toEqual({ kind: 'response', label: 500, body: null })
  })
})

describe('createIpcBridge', () => {
  // The five addresses of API Contract 6.2.0 that the interface calls, typed here
  // word for word (clause_a_common.cross_cutting.native_dialogs: open_file,
  // pick_folder; clause_d_desktop.restore_data: request_restore, get_restore_status,
  // cancel_restore). Not read from the Configs: this is the check against the contract.
  const CONTRACT_ADDRESSES = ['dialog:open-file', 'dialog:pick-folder', 'restore:prepare', 'restore:status', 'restore:cancel']

  it('allows exactly the five ipc addresses of API Contract 6.2.0 the interface calls', () => {
    expect([...ADDRESSES].sort()).toEqual([...CONTRACT_ADDRESSES].sort())
  })

  it('passes each of the five contract addresses to invoke', async () => {
    for (const address of CONTRACT_ADDRESSES) {
      const invoke = vi.fn<IpcInvoke>(async () => ({ status: 200, body: null }))
      await createIpcBridge(invoke, ADDRESSES).call(address, {})
      expect(invoke).toHaveBeenCalledTimes(1)
      expect(invoke.mock.calls[0]?.[0]).toBe(address)
    }
  })

  it('rejects an address outside the list and never calls invoke', async () => {
    // dialog:save-file was removed by API Contract 6.0.0; restore:start by 5.0.0.
    const foreign = ['dialog:save-file', 'restore:start', 'Dialog:Pick-Folder', 'dialog:pick-folder ', '', 'check_due']
    for (const address of foreign) {
      const invoke = vi.fn<IpcInvoke>(async () => ({ status: 200, body: null }))
      await expect(createIpcBridge(invoke, ADDRESSES).call(address, {})).rejects.toBeInstanceOf(Error)
      expect(invoke).not.toHaveBeenCalled()
    }
  })

  it('passes the address and the argument to invoke exactly as given', async () => {
    const invoke = vi.fn<IpcInvoke>(async () => ({ status: 200, body: { canceled: true, path: null } }))
    const argument = { filters: null }
    await createIpcBridge(invoke, ADDRESSES).call('dialog:pick-folder', argument)
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke.mock.calls[0]?.[0]).toBe('dialog:pick-folder')
    // The very same object: nothing is copied, wrapped or filled in.
    expect(invoke.mock.calls[0]?.[1]).toBe(argument)
  })

  it('answers what invoke answered, unchecked: a value of any shape comes back as it is', async () => {
    const shapes: unknown[] = [{ status: 200, body: { canceled: false, path: 'C:\\x' } }, { status: 400 }, 'abc', null, 42]
    for (const shape of shapes) {
      const answer = await createIpcBridge(async () => shape, ADDRESSES).call('dialog:pick-folder', {})
      expect(answer).toBe(shape)
    }
  })

  it('keeps a rejected Promise rejected, with the same error', async () => {
    const error = new Error("Error invoking remote method 'dialog:pick-folder': Error: boom")
    await expect(createIpcBridge(() => Promise.reject(error), ADDRESSES).call('dialog:pick-folder', {})).rejects.toBe(error)
  })

  it('waits as long as invoke does: it sets no time limit of its own', async () => {
    let release: (value: unknown) => void = () => {}
    const slow = new Promise<unknown>((resolve) => {
      release = resolve
    })
    let settled = false
    const waiting = createIpcBridge(() => slow, ADDRESSES)
      .call('dialog:pick-folder', {})
      .then((v) => {
        settled = true
        return v
      })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(settled).toBe(false)
    release({ status: 200, body: { canceled: true, path: null } })
    expect(await waiting).toEqual({ status: 200, body: { canceled: true, path: null } })
  })
})
