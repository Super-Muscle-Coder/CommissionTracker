// Desktop session 33: the first ipc entry. The bridge's invoke (preload) and the
// cross-cutting native_dialogs entry pick_folder (dialog:pick-folder).
// Parts: (N1) the pure checks; (N2-N9) the whole Main with the real backend and
// the probe page, in one run: the real folder dialog is replaced from the test by
// assigning dialog.showOpenDialog inside the Main (measured in session 33: the
// property is writable and the Main's compiled call reads it at call time), so no
// dialog ever opens and no test flag is needed. Every run uses a temporary data
// folder and no dialogs.
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import * as path from 'node:path'
import { argumentRefusal, senderRefusal } from '../src/cross_cutting/native_dialogs/request_checks'
import { config, LAYER_ROOT, launchMain, type LogCollector, mainArgs, PROBE_ROOT, processTree, stillAlive, tempDataDir, waitForExit } from './helpers'

const UI_ORIGIN: string = config.boundary.ui_origin
const BRIDGE: string = config.boundary.renderer_bridge
const ADDRESS: string = config.native_dialogs.pick_folder.address
const TITLE: string = config.native_dialogs.pick_folder.title

// --- N1: pure checks ----------------------------------------------------------------

test('N1. pure checks: only the main window with the ui_origin origin; only {} or no argument', () => {
  const ok = { senderIsMainWindow: true, frameUrl: `${UI_ORIGIN}/index.html` }
  expect(senderRefusal(ok, UI_ORIGIN)).toBeNull()
  expect(senderRefusal({ ...ok, senderIsMainWindow: false }, UI_ORIGIN)).toMatch(/not the main window/)
  expect(senderRefusal({ ...ok, frameUrl: null }, UI_ORIGIN)).toMatch(/unknown/)
  for (const url of ['data:text/html,x', 'about:blank', 'http://commission-tracker/index.html', 'app://other-host/index.html', 'app://commission-tracker.evil/', 'not a url']) {
    expect(senderRefusal({ ...ok, frameUrl: url }, UI_ORIGIN), url).not.toBeNull()
  }
  expect(argumentRefusal(undefined)).toBeNull()
  expect(argumentRefusal({})).toBeNull()
  for (const bad of [{ x: 1 }, 'abc', null, [], 0, true]) expect(argumentRefusal(bad), JSON.stringify(bad)).not.toBeNull()
})

// --- N2-N9: the whole Main -----------------------------------------------------------

type Reply = { ok: true; value: unknown } | { ok: false; message: string }
type Kind = 'object' | 'none' | 'extra_key' | 'string' | 'null' | 'array'

/** Calls invoke(address, argument) in the page and reports the answer or the rejection. */
async function invokeIn(page: Page, address: unknown, kind: Kind): Promise<Reply> {
  return page.evaluate(
    async ({ name, address, kind }) => {
      const bridge = (window as unknown as Record<string, { invoke: (a: unknown, b?: unknown) => Promise<unknown> }>)[name]
      try {
        let value: unknown
        if (kind === 'none') value = await bridge.invoke(address)
        else if (kind === 'object') value = await bridge.invoke(address, {})
        else if (kind === 'extra_key') value = await bridge.invoke(address, { x: 1 })
        else if (kind === 'string') value = await bridge.invoke(address, 'abc')
        else if (kind === 'null') value = await bridge.invoke(address, null)
        else value = await bridge.invoke(address, [])
        return { ok: true as const, value }
      } catch (err) {
        return { ok: false as const, message: err instanceof Error ? err.message : String(err) }
      }
    },
    { name: BRIDGE, address, kind },
  )
}

interface StubCall {
  windowId: number | null
  options: unknown
}

/** Replaces dialog.showOpenDialog in the Main: records each call (the window it
 * was given and the options), then returns the answer or throws. */
async function stubDialog(app: ElectronApplication, behaviour: { answer?: { canceled: boolean; filePaths: string[] }; throwMessage?: string }): Promise<void> {
  await app.evaluate(({ dialog }, b) => {
    const g = globalThis as unknown as { __dialogCalls?: StubCall[] }
    g.__dialogCalls = g.__dialogCalls ?? []
    ;(dialog as unknown as { showOpenDialog: (...a: unknown[]) => Promise<unknown> }).showOpenDialog = async (...args: unknown[]) => {
      const first = args[0] as { id?: number } | undefined
      g.__dialogCalls?.push({ windowId: typeof first?.id === 'number' ? first.id : null, options: args[1] })
      if (b.throwMessage !== undefined) throw new Error(b.throwMessage)
      return b.answer
    }
  }, behaviour)
}

async function dialogCalls(app: ElectronApplication): Promise<StubCall[]> {
  return app.evaluate(() => (globalThis as unknown as { __dialogCalls?: StubCall[] }).__dialogCalls ?? [])
}

async function closeCleanly(app: ElectronApplication, log: LogCollector): Promise<void> {
  const launcher = await log.waitFor(/backend started \(pid (\d+)\)/)
  const tree = processTree(Number(launcher[1]))
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
}

test.describe.serial('the real Main with the probe page', () => {
  let app: ElectronApplication
  let log: LogCollector
  let page: Page
  let dataDir: string
  let mainWindowId: number

  test.beforeAll(async () => {
    dataDir = tempDataDir()
    ;({ app, log } = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT })))
    page = await app.firstWindow()
    await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })
    mainWindowId = await (await app.browserWindow(page)).evaluate((w) => w.id)
  })

  test.afterAll(async () => {
    console.log(`desktop main log:\n${log.text}`)
    await closeCleanly(app, log)
  })

  test('N2. an address the Main has not implemented: the promise is rejected and nothing reaches the Main', async () => {
    // A spy on the Main side: if the preload relayed the call, this handler would run.
    await app.evaluate(({ ipcMain }) => {
      const g = globalThis as unknown as { __spyCalls: string[] }
      g.__spyCalls = []
      ipcMain.handle('dialog:open-file', (_event, ...args) => {
        g.__spyCalls.push(JSON.stringify(args))
        return { status: 200, body: { canceled: true, path: null } }
      })
    })
    for (const address of ['dialog:open-file', 'dialog:save-file', 'no:such:channel', '', 123, undefined]) {
      const reply = await invokeIn(page, address, 'object')
      expect(reply, `address ${String(address)}`).toEqual({ ok: false, message: expect.stringMatching(/ipc address not implemented/) })
    }
    const spied = await app.evaluate(() => (globalThis as unknown as { __spyCalls: string[] }).__spyCalls)
    expect(spied).toEqual([])
    await app.evaluate(({ ipcMain }) => ipcMain.removeHandler('dialog:open-file'))
  })

  test('N3. a folder is chosen: 200 { canceled: false, path } with the absolute path; the dialog is asked for with the main window as parent', async () => {
    const chosen = path.join(dataDir, 'chosen folder')
    await stubDialog(app, { answer: { canceled: false, filePaths: [chosen] } })
    const reply = await invokeIn(page, ADDRESS, 'object')
    expect(reply).toEqual({ ok: true, value: { status: 200, body: { canceled: false, path: chosen } } })
    const calls = await dialogCalls(app)
    expect(calls).toEqual([{ windowId: mainWindowId, options: { properties: ['openDirectory'], title: TITLE } }])
    expect(TITLE).toBe('Chọn thư mục')
    expect(log.text).toContain(`native_dialogs: ${ADDRESS} -> chosen ${chosen}`)
  })

  test('N4. the dialog is canceled: 200 { canceled: true, path: null }', async () => {
    await stubDialog(app, { answer: { canceled: true, filePaths: [] } })
    const reply = await invokeIn(page, ADDRESS, 'object')
    expect(reply).toEqual({ ok: true, value: { status: 200, body: { canceled: true, path: null } } })
    expect(log.text).toContain(`native_dialogs: ${ADDRESS} -> canceled`)
  })

  test('N5. the argument: {} and no argument open the dialog; {x:1}, "abc", null, [] are refused and no dialog opens', async () => {
    await stubDialog(app, { answer: { canceled: true, filePaths: [] } })
    const before = (await dialogCalls(app)).length
    expect(await invokeIn(page, ADDRESS, 'none')).toMatchObject({ ok: true })
    expect(await invokeIn(page, ADDRESS, 'object')).toMatchObject({ ok: true })
    expect((await dialogCalls(app)).length).toBe(before + 2)
    for (const kind of ['extra_key', 'string', 'null', 'array'] as const) {
      const reply = await invokeIn(page, ADDRESS, kind)
      expect(reply, kind).toEqual({ ok: false, message: expect.stringMatching(/call refused \(the argument is not an empty object\)/) })
    }
    expect((await dialogCalls(app)).length).toBe(before + 2)
    expect(log.lines(/native_dialogs: dialog:pick-folder refused: the argument is not an empty object/)).toHaveLength(4)
  })

  test('N6. the dialog throws: the promise is rejected, the failure is logged, the app keeps running and answers the next call', async () => {
    await stubDialog(app, { throwMessage: 'boom from the dialog' })
    const reply = await invokeIn(page, ADDRESS, 'object')
    expect(reply).toEqual({ ok: false, message: expect.stringMatching(/boom from the dialog/) })
    expect(log.text).toContain(`native_dialogs: ${ADDRESS} failed: boom from the dialog`)
    await stubDialog(app, { answer: { canceled: true, filePaths: [] } })
    expect(await invokeIn(page, ADDRESS, 'object')).toEqual({ ok: true, value: { status: 200, body: { canceled: true, path: null } } })
    expect(log.text).not.toMatch(/FATAL/)
  })

  test('N7. a frame whose origin is not ui_origin (a data: page in the main window) is refused and no dialog opens', async () => {
    await stubDialog(app, { answer: { canceled: true, filePaths: [] } })
    const before = (await dialogCalls(app)).length
    const mainWindow = await app.browserWindow(page)
    await mainWindow.evaluate((w) => w.loadURL('data:text/html,<title>other origin</title><p>other</p>'))
    try {
      // The preload still runs there, so the bridge exists; only the origin differs.
      expect(await page.evaluate((name) => typeof (window as unknown as Record<string, { invoke: unknown }>)[name]?.invoke, BRIDGE)).toBe('function')
      expect(await page.evaluate(() => location.origin)).toBe('null')
      const reply = await invokeIn(page, ADDRESS, 'object')
      expect(reply).toEqual({ ok: false, message: expect.stringMatching(/call refused \(the sending frame's origin is data:\/\/, not app:\/\/commission-tracker\)/) })
      expect(log.text).toContain(`native_dialogs: ${ADDRESS} refused: the sending frame's origin is data://`)
      expect((await dialogCalls(app)).length).toBe(before)
    } finally {
      await mainWindow.evaluate((w, url) => w.loadURL(url), `${UI_ORIGIN}/${config.renderer.entry_file}`)
    }
    await expect(page.locator('#done')).toBeVisible()
    expect(await invokeIn(page, ADDRESS, 'object')).toMatchObject({ ok: true })
  })

  test('N8. a call from another window (right origin, not the main window) is refused and no dialog opens', async () => {
    const before = (await dialogCalls(app)).length
    const baseUrl = await page.evaluate((name) => (window as unknown as Record<string, { backendBaseUrl: string }>)[name].backendBaseUrl, BRIDGE)
    const args = config.preload.arguments
    const secondWindow = app.waitForEvent('window')
    await app.evaluate(
      ({ BrowserWindow }, p) => {
        const w = new BrowserWindow({
          width: 400,
          height: 300,
          show: false,
          webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: p.preload, additionalArguments: p.additional },
        })
        void w.loadURL(p.url)
      },
      {
        preload: path.join(LAYER_ROOT, 'dist', 'preload.js'),
        url: `${UI_ORIGIN}/${config.renderer.entry_file}`,
        additional: [`${args.bridge_name}${BRIDGE}`, `${args.backend_base_url}${baseUrl}`, `${args.ipc_addresses}${ADDRESS}`],
      },
    )
    const other = await secondWindow
    await other.waitForLoadState('load')
    expect(await other.evaluate(() => location.origin)).toBe(UI_ORIGIN)
    const reply = await invokeIn(other, ADDRESS, 'object')
    expect(reply).toEqual({ ok: false, message: expect.stringMatching(/call refused \(the sender is not the main window\)/) })
    expect(log.text).toContain(`native_dialogs: ${ADDRESS} refused: the sender is not the main window`)
    expect((await dialogCalls(app)).length).toBe(before)
    await other.close()
    // The main window still works.
    expect(await invokeIn(page, ADDRESS, 'object')).toMatchObject({ ok: true })
  })

  test('N9. the bridge: frozen, exactly backendBaseUrl and invoke, no ipcRenderer, no Node', async () => {
    const shape = await page.evaluate((name) => {
      const w = window as unknown as Record<string, Record<string, unknown>>
      const bridge = w[name]
      return {
        keys: Object.keys(bridge),
        frozen: Object.isFrozen(bridge),
        invoke: typeof bridge.invoke,
        ipcRenderer: typeof (window as unknown as Record<string, unknown>).ipcRenderer,
        electron: typeof (window as unknown as Record<string, unknown>).electron,
        require: typeof (window as unknown as Record<string, unknown>).require,
        process: typeof (window as unknown as Record<string, unknown>).process,
      }
    }, BRIDGE)
    expect(shape).toEqual({ keys: ['backendBaseUrl', 'invoke'], frozen: true, invoke: 'function', ipcRenderer: 'undefined', electron: 'undefined', require: 'undefined', process: 'undefined' })
  })
})
