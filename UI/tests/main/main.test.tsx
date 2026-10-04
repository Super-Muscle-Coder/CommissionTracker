// @vitest-environment jsdom
//
// Tests of the Main of the interface layer (src/main.tsx), built for real in
// jsdom: each test places (or not) the renderer bridge on the global object,
// creates the root element, then imports Main afresh. The test plays the host
// environment (the desktop preload script), so it sets the bridge with
// vi.stubGlobal and never touches window directly (R12).
import { act } from 'react'
import { screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { LAYER_CONFIGS } from '../../src/configs/layer_configs'

const { rendererBridge } = LAYER_CONFIGS.launch
const failure = LAYER_CONFIGS.startupFailure
const APP_TITLE = 'Commission Tracker'

// UI-16: the first import of src/main pays the one-time cost of loading and transforming the
// whole module tree (every workflow). It is paid HERE, once, with a limit of its own, so that no
// test spends its 5 s on it. Measured in session 29 (Windows): ~1.0 s alone for the first test
// against ~15 ms for the next; 5.1-5.5 s, past the limit, in 2 of 5 runs of the whole suite
// with the machine in use. 60 s is the limit for the loading alone (about ten times the worst
// time seen). The tests below keep the default limit and still reset the module registry, so
// each one evaluates Main afresh; only the loading work is already done.
beforeAll(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  document.body.innerHTML = `<div id="${LAYER_CONFIGS.rootElementId}"></div>`
  await act(async () => {
    await import('../../src/main')
  })
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
}, 60_000)

let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  fetchSpy = vi.fn(async () => new Response('[]'))
  vi.stubGlobal('fetch', fetchSpy)
  document.body.innerHTML = `<div id="${LAYER_CONFIGS.rootElementId}"></div>`
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

async function startMain(bridge?: unknown): Promise<void> {
  if (bridge !== undefined) vi.stubGlobal(rendererBridge, bridge)
  await act(async () => {
    await import('../../src/main')
  })
}

function expectStartupError(detailPart: string): void {
  const alert = screen.getByRole('alert')
  expect(alert.textContent).toContain(failure.title)
  expect(alert.textContent).toContain(detailPart)
  // Nothing else is built: no main frame, no content region.
  expect(screen.queryByText(APP_TITLE)).toBeNull()
  expect(screen.queryByRole('main')).toBeNull()
  expect(fetchSpy).not.toHaveBeenCalled()
}

describe('Main, launch value missing or malformed → startup error screen', () => {
  it('no bridge on the global object', async () => {
    await startMain()
    expectStartupError(`${failure.bridgeMissing}: window.${rendererBridge}`)
  })

  it('bridge is null', async () => {
    await startMain(null)
    expectStartupError(`${failure.bridgeMissing}: window.${rendererBridge}`)
  })

  it('bridge without backendBaseUrl', async () => {
    await startMain(Object.freeze({}))
    expectStartupError(`${failure.valueNotString}: window.${rendererBridge}.backendBaseUrl`)
  })

  it('backendBaseUrl is not a string', async () => {
    await startMain(Object.freeze({ backendBaseUrl: 51062 }))
    expectStartupError(`${failure.valueNotString}: window.${rendererBridge}.backendBaseUrl`)
  })

  it.each([
    'http://localhost:1', // not the loopback host of the contract
    'https://127.0.0.1:1', // not http
    'http://127.0.0.1:0', // port 0
    'http://127.0.0.1:65536', // port above 65535
    'http://127.0.0.1:', // no port
    'http://127.0.0.1', // no port
    'http://127.0.0.1:080', // leading zero
    'http://127.0.0.1:51062/', // trailing path
    ' http://127.0.0.1:51062', // leading space
    '', // empty
  ])('backendBaseUrl is malformed: %j', async (value) => {
    await startMain(Object.freeze({ backendBaseUrl: value }))
    expectStartupError(`${failure.valueMalformed}: window.${rendererBridge}.backendBaseUrl = ${JSON.stringify(value)}`)
  })
})

describe('Main, valid launch value → main frame', () => {
  it.each(['http://127.0.0.1:51062', 'http://127.0.0.1:1', 'http://127.0.0.1:65535'])(
    'backendBaseUrl %s',
    async (value) => {
      await startMain(Object.freeze({ backendBaseUrl: value }))
      expect(screen.getByRole('heading', { level: 1, name: APP_TITLE })).toBeTruthy()
      expect(screen.getByRole('main')).toBeTruthy()
      expect(screen.queryByRole('alert')).toBeNull()
      // Main makes no call of its own. The start page (client_list) loads the
      // client list once, through the wired manage_client and the http_client
      // built on the launch value: exactly GET <backendBaseUrl>/clients.
      // An empty list shows the empty state of D1 (ui_decomposition.md §5).
      expect(await screen.findByText('Chưa có khách hàng nào.')).toBeTruthy()
      expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeTruthy()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy.mock.calls[0]?.[0]).toEqual(new URL(`${value}/clients`))
      expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' })
    },
  )
})
