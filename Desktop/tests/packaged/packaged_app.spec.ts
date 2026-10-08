// Tests of the packaged app (plan of desktop session 13, task 8: P1-P6).
// They run release/win-unpacked/Commission Tracker.exe, built by
// "npm run dist". Every run passes a temporary data folder and no dialogs:
// nothing here ever touches the user's real %APPDATA%\CommissionTracker.
// Runs driven by Playwright (_electron) see the Main's stderr only from the
// moment launch() returns, so its first log lines are missing there; P3
// spawns the exe directly to read the whole log.
import { _electron, test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  config,
  FIXTURES,
  LAYER_ROOT,
  LogCollector,
  processTable,
  processTree,
  stillAlive,
  tempDataDir,
  waitForExit,
  type ProcessRow,
} from '../helpers'

const UNPACKED = path.join(LAYER_ROOT, 'release', 'win-unpacked')
const PRODUCT_NAME: string = JSON.parse(fs.readFileSync(path.join(LAYER_ROOT, 'package.json'), 'utf8')).productName
const EXE = path.join(UNPACKED, `${PRODUCT_NAME}.exe`)
const RESOURCES = path.join(UNPACKED, 'resources')
const PACKAGED_PYTHON = path.resolve(RESOURCES, config.packaged.backend.interpreter)
const PACKAGED_BACKEND_DIR = path.resolve(RESOURCES, config.packaged.backend.working_dir)
const PACKAGED_SCRIPT = path.join(PACKAGED_BACKEND_DIR, config.packaged.backend.script)
const PACKAGED_UI_DIR = path.resolve(RESOURCES, config.packaged.renderer_root_dir)
const UI_ORIGIN: string = config.boundary.ui_origin
const HOST: string = config.boundary.loopback_host
const flags = config.test_flags
const TASKKILL = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe')

interface Launched {
  app: ElectronApplication
  /** What Playwright started (cmd.exe running the exe); kept from launch,
   * since app.process() cannot be read once the app has closed. */
  proc: ChildProcess
  page: Page
  log: LogCollector
  dataDir: string
  port: number
  /** PID of the Electron main process. Playwright starts the exe through
   * cmd.exe (its path has spaces), so app.process() is that cmd.exe. */
  mainPid: number
}

test.beforeAll(() => {
  expect(fs.existsSync(EXE), `${EXE} not found: run "npm run dist" first`).toBe(true)
})

test.afterAll(() => {
  // Evidence for the whole suite: no Python of the package left running.
  const left = packagedPythons()
  console.log(`python processes of the package after the suite: ${JSON.stringify(left)}`)
  expect(left).toEqual([])
})

/** python.exe processes whose image lies inside release/win-unpacked. */
function packagedPythons(): ProcessRow[] {
  const prefix = UNPACKED.toLowerCase()
  return processTable().filter((r) => /^python/i.test(r.Name) && (r.ExecutablePath ?? '').toLowerCase().startsWith(prefix))
}

/** Launch the packaged exe (always with a temporary data folder and without
 * dialogs), and wait until the product UI shows the client_list page, using
 * the signals of UI/tests/e2e (heading "Khách hàng", then the page's own
 * "Tải lại" button enabled once its first list load has ended). */
async function launchPackaged(extraArgs: string[] = [], env?: Record<string, string>): Promise<Launched> {
  const dataDir = tempDataDir()
  const app = await _electron.launch({
    executablePath: EXE,
    args: [`${flags.data_dir}${dataDir}`, flags.no_dialog, ...extraArgs],
    cwd: UNPACKED,
    ...(env === undefined ? {} : { env }),
  })
  const log = new LogCollector().attach(app.process())
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('heading', { level: 2, name: 'Khách hàng' })).toBeVisible({ timeout: 60_000 })
    await page.waitForLoadState('load')
    await expect(page.getByRole('button', { name: 'Tải lại' })).toBeEnabled({ timeout: 30_000 })
    const baseUrl = await page.evaluate(
      (name) => (window as unknown as Record<string, { backendBaseUrl: string }>)[name].backendBaseUrl,
      config.boundary.renderer_bridge,
    )
    const port = Number(new URL(baseUrl).port)
    const mainPid = await app.evaluate(() => process.pid)
    return { app, proc: app.process(), page, log, dataDir, port, mainPid }
  } catch (e) {
    console.log(`desktop main log:\n${log.text}`)
    await app.close().catch(() => undefined)
    throw e
  }
}

/** The backend of a running app: the one python.exe child of the Electron
 * main process (with the embedded Python there is no launcher in between),
 * and its own descendants. */
function backendTree(electronPid: number): ProcessRow[] {
  const whole = processTree(electronPid)
  const pythons = whole.filter((r) => /^python/i.test(r.Name))
  expect(pythons, JSON.stringify(whole)).toHaveLength(1)
  expect(pythons[0].ParentProcessId).toBe(electronPid)
  const tree = processTree(pythons[0].ProcessId)
  console.log(`backend process tree: ${JSON.stringify(tree.map((r) => [r.ProcessId, r.Name, r.CommandLine]))}`)
  return tree
}

/** The backend is resources\python\python.exe running
 * resources\backend\Backend.py (the packaged Main passes the script's
 * absolute path). */
function expectPackagedBackend(tree: ProcessRow[]): void {
  const python = tree[0]
  expect(python.ExecutablePath?.toLowerCase()).toBe(PACKAGED_PYTHON.toLowerCase())
  expect(python.CommandLine).toBe(`${PACKAGED_PYTHON} ${PACKAGED_SCRIPT}`)
}

/** P1 checks, shared with P2, P4 and P6: the product UI from the package,
 * the packaged backend, the database in the temporary folder, no menu. */
async function expectPackagedRun(l: Launched): Promise<ProcessRow[]> {
  const { app, page, log, dataDir, port } = l
  expect(await app.evaluate(({ app }) => ({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath }))).toEqual({
    isPackaged: true,
    resourcesPath: RESOURCES,
  })
  expect(log.text).not.toMatch(/FATAL/)

  // The window shows the product UI served from resources\ui at ui_origin,
  // with an empty client list (fresh database): the empty state of client_list
  // ("Chưa có khách hàng nào.", since UI session 16; before it the page showed
  // "Chưa có khách hàng nào đang hoạt động.").
  expect(await page.evaluate(() => location.href)).toBe(`${UI_ORIGIN}/${config.renderer.entry_file}`)
  await expect(page.getByText('Chưa có khách hàng nào.', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  const indexOnDisk = fs.readFileSync(path.join(PACKAGED_UI_DIR, 'index.html'), 'utf8')
  // Through the app:// handler from the main process: the product page's
  // own Content-Security-Policy (connect-src) does not allow the renderer
  // to fetch it.
  const served = await app.evaluate(async ({ net }, url) => (await net.fetch(url)).text(), `${UI_ORIGIN}/index.html`)
  expect(served).toBe(indexOnDisk)
  expect(port).toBeGreaterThan(0)

  const tree = backendTree(l.mainPid)
  expectPackagedBackend(tree)

  // The database is in the temporary data folder.
  expect(fs.existsSync(path.join(dataDir, ...config.boundary.db_file_relative_to_app_data.split('/')))).toBe(true)

  // No application menu in the packaged app.
  expect(await app.evaluate(({ Menu }) => Menu.getApplicationMenu() === null)).toBe(true)
  return tree
}

/** Runs a test body with a launched app, and never leaves it running. */
async function withPackaged(body: (l: Launched) => Promise<void>, extraArgs: string[] = [], env?: Record<string, string>): Promise<void> {
  const l = await launchPackaged(extraArgs, env)
  try {
    await body(l)
  } finally {
    console.log(l.log.text)
    if (l.proc.exitCode === null && l.proc.signalCode === null) await l.app.close().catch(() => undefined)
  }
}

async function closeWindow(l: Launched, tree: ProcessRow[]): Promise<void> {
  const electronProcess = l.proc
  await l.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((w) => w.close()))
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(l.log.text).toMatch(/backend \(pid \d+\) exited with code 0/)
  expect(stillAlive(tree)).toEqual([])
}

test('P1. runs from the package: product UI, packaged backend, database in the data folder, no menu', async () => {
  await withPackaged(async (l) => {
    const tree = await expectPackagedRun(l)
    await closeWindow(l, tree)
  })
})

test('P2. read and write through CORS from app://commission-tracker, with a recorded preflight', async () => {
  await withPackaged(async (l) => {
    const tree = await expectPackagedRun(l)
    const netLogFile = path.join(l.dataDir, 'netlog.json')
    // Chromium's network log of this run: every request that reached the
    // backend, including CORS preflights, with their headers.
    await l.app.evaluate(async ({ netLog }, file) => {
      await netLog.startLogging(file, { captureMode: 'includeSensitive' })
    }, netLogFile)
    const baseUrl = `http://${HOST}:${l.port}`
    const input = { display_name: 'Khách thử P2', contacts: [{ channel: 'email', value: 'p2@example.com' }], note: null }
    const result = await l.page.evaluate(
      async ({ baseUrl, input }) => {
        const created = await fetch(`${baseUrl}/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_input: input }),
        })
        const createdBody = await created.json()
        const listed = await fetch(`${baseUrl}/clients`)
        return { origin: location.origin, createdStatus: created.status, createdBody, listStatus: listed.status, list: await listed.json() }
      },
      { baseUrl, input },
    )
    await l.app.evaluate(async ({ netLog }) => {
      await netLog.stopLogging()
    })
    console.log(`P2 renderer result: ${JSON.stringify(result)}`)
    expect(result.origin).toBe(UI_ORIGIN)
    expect(result.createdStatus).toBe(201)
    expect(result.createdBody).toMatchObject({ display_name: input.display_name, contacts: input.contacts, note: null, is_archived: false })
    expect(result.listStatus).toBe(200)
    expect(result.list).toEqual([
      expect.objectContaining({ client_id: result.createdBody.client_id, display_name: input.display_name, is_archived: false }),
    ])

    const seen = backendRequests(netLogFile, `${HOST}:${l.port}`)
    console.log(`MEASURED requests to the backend (netLog): ${JSON.stringify(seen, null, 1)}`)
    expect(seen.map((r) => r.method)).toEqual(['OPTIONS', 'POST', 'GET'])
    expect(seen[0]).toMatchObject({ path: '/clients', origin: UI_ORIGIN, status: 200, allowOrigin: UI_ORIGIN })
    expect(seen[0].requestMethod).toBe('POST')
    expect(seen[1]).toMatchObject({ path: '/clients', origin: UI_ORIGIN, status: 201, allowOrigin: UI_ORIGIN })
    expect(seen[2]).toMatchObject({ path: '/clients', origin: UI_ORIGIN, status: 200, allowOrigin: UI_ORIGIN })
    await closeWindow(l, tree)
  })
})

test('P3. the test flags that point outside the package are ignored and logged', async () => {
  // Spawned directly, to read the Main's log from its first line.
  const dataDir = tempDataDir()
  const missingRoot = path.join(tempDataDir(), 'no-such-ui')
  const fakeBackend = path.join(FIXTURES, 'fake_backend_exit_2.py')
  const child = spawn(
    EXE,
    [`${flags.data_dir}${dataDir}`, flags.no_dialog, `${flags.backend_script}${fakeBackend}`, `${flags.renderer_root}${missingRoot}`],
    { cwd: UNPACKED, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const log = new LogCollector().attach(child)
  try {
    await log.waitFor(/first load finished: /, 90_000)
    const tree = backendTree(child.pid as number)
    expectPackagedBackend(tree)

    // The two flags are named in the log and have no effect.
    expect(log.lines(/ignoring test flag/)).toEqual([
      `[desktop-main] ignoring test flag ${flags.renderer_root}... in the packaged app`,
      `[desktop-main] ignoring test flag ${flags.backend_script}... in the packaged app`,
    ])
    expect(log.text).toContain(`[desktop-main] running the packaged app (resources: ${RESOURCES})`)
    expect(log.lines(/backend start attempt/)).toEqual([expect.stringMatching(/backend start attempt 1\/\d+ on port \d+$/)])
    expect(log.text).toMatch(
      new RegExp(
        `backend started \\(pid \\d+\\) on port \\d+: ${escapeRe(`${PACKAGED_PYTHON} ${PACKAGED_SCRIPT} in ${PACKAGED_BACKEND_DIR}`)}`,
      ),
    )
    expect(log.text).toContain(`serving the interface from ${PACKAGED_UI_DIR} at ${UI_ORIGIN}`)
    expect(log.text).toContain(`first load finished: ${UI_ORIGIN}/${config.renderer.entry_file}`)
    expect(log.text).not.toContain(fakeBackend)
    expect(log.text).not.toContain(missingRoot)
    expect(log.text).not.toMatch(/FATAL/)
    expect(fs.existsSync(path.join(dataDir, ...config.boundary.db_file_relative_to_app_data.split('/')))).toBe(true)

    // Close the window (taskkill without /F sends WM_CLOSE): clean stop.
    execFileSync(TASKKILL, ['/PID', String(child.pid)])
    expect(await waitForExit(child)).toBe(0)
    expect(log.text).toMatch(/backend \(pid \d+\) exited with code 0/)
    expect(stillAlive(tree)).toEqual([])
  } finally {
    console.log(log.text)
    if (child.exitCode === null) child.kill()
  }
})

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('P4. closing the window stops the backend with code 0 and leaves no Python of the package', async () => {
  await withPackaged(async (l) => {
    const tree = await expectPackagedRun(l)
    await closeWindow(l, tree)
    expect(l.log.text).toMatch(/closing its standard input/)
    expect(packagedPythons()).toEqual([])
  })
})

test('P5. main process killed: the backend exits on its own when its stdin pipe closes', async () => {
  await withPackaged(async (l) => {
    const electronPid = l.mainPid
    const tree = await expectPackagedRun(l)
    const whole = processTree(electronPid)
    console.log(`process tree of the running app: ${JSON.stringify(whole.map((r) => [r.ProcessId, r.ParentProcessId, r.Name]))}`)
    // Started directly by the Main: no launcher between them (backendTree).
    const backend = tree[0]

    execFileSync(TASKKILL, ['/F', '/PID', String(electronPid)])
    const killedAt = Date.now()
    let left = stillAlive([backend])
    while (left.length > 0 && Date.now() - killedAt < 10_000) {
      await new Promise((r) => setTimeout(r, 250))
      left = stillAlive([backend])
    }
    const elapsed = Date.now() - killedAt
    console.log(`backend (pid ${backend.ProcessId}) gone ${left.length === 0 ? 'after' : 'NOT within'} ${elapsed} ms`)
    expect(left).toEqual([])
    // The rest of the tree (Electron helpers, conhost) is gone too.
    await new Promise((r) => setTimeout(r, 2000))
    expect(stillAlive(whole)).toEqual([])
  })
})

test('P6. independent of any Python on the machine (PYTHONHOME, PYTHONPATH, PATH)', async () => {
  const missing = path.join(tempDataDir(), 'no-such-python')
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH'
  const dirs = (process.env[pathKey] ?? '').split(path.delimiter)
  const kept = dirs.filter((d) => d !== '' && !fs.existsSync(path.join(d, 'python.exe')))
  const inherited = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined))
  const env: Record<string, string> = { ...inherited, PYTHONHOME: missing, PYTHONPATH: missing, [pathKey]: kept.join(path.delimiter) }
  console.log(`PATH folders removed (they hold a python.exe): ${JSON.stringify(dirs.filter((d) => !kept.includes(d)))}`)
  console.log(`PYTHONHOME=${env.PYTHONHOME} PYTHONPATH=${env.PYTHONPATH}`)
  await withPackaged(
    async (l) => {
      const tree = await expectPackagedRun(l)
      // The Electron process really runs with this environment.
      const seenEnv = await l.app.evaluate(() => ({ home: process.env.PYTHONHOME, path: process.env.PYTHONPATH }))
      expect(seenEnv).toEqual({ home: missing, path: missing })
      await closeWindow(l, tree)
    },
    [],
    env,
  )
})

// --- netLog ------------------------------------------------------------------------

interface SeenRequest {
  method: string
  path: string
  origin: string | undefined
  requestMethod: string | undefined // Access-Control-Request-Method of a preflight
  status: number | undefined
  allowOrigin: string | undefined
}

/** Requests sent to host:port in a Chromium net log, in order, with the
 * response status and Access-Control-Allow-Origin. */
function backendRequests(file: string, hostPort: string): SeenRequest[] {
  const log = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    constants: { logEventTypes: Record<string, number> }
    events: Array<{ type: number; source: { id: number }; params?: { line?: string; headers?: string[] } }>
  }
  const types = log.constants.logEventTypes
  const sent = types.HTTP_TRANSACTION_SEND_REQUEST_HEADERS
  const received = types.HTTP_TRANSACTION_READ_RESPONSE_HEADERS
  const header = (headers: string[], name: string) => {
    const hit = headers.find((h) => h.toLowerCase().startsWith(`${name.toLowerCase()}:`))
    return hit === undefined ? undefined : hit.slice(name.length + 1).trim()
  }
  const bySource = new Map<number, SeenRequest>()
  const order: SeenRequest[] = []
  for (const e of log.events) {
    const headers = e.params?.headers ?? []
    if (e.type === sent && e.params?.line !== undefined && header(headers, 'Host') === hostPort) {
      const [method, target] = e.params.line.trim().split(' ')
      const r: SeenRequest = {
        method,
        path: target,
        origin: header(headers, 'Origin'),
        requestMethod: header(headers, 'Access-Control-Request-Method'),
        status: undefined,
        allowOrigin: undefined,
      }
      bySource.set(e.source.id, r)
      order.push(r)
    } else if (e.type === received && bySource.has(e.source.id)) {
      const r = bySource.get(e.source.id) as SeenRequest
      r.status = Number(headers[0]?.split(' ')[1])
      r.allowOrigin = header(headers, 'Access-Control-Allow-Origin')
    }
  }
  return order
}

test('P7. DSK-17, DSK-18: the reminder ticker runs in the package (first check without error) and the two new test flags are ignored', async () => {
  // Spawned directly, to read the Main's log from its first line.
  const dataDir = tempDataDir()
  const child = spawn(
    EXE,
    [`${flags.data_dir}${dataDir}`, flags.no_dialog, flags.show_inactive, `${flags.reminder_interval_ms}200`],
    { cwd: UNPACKED, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const log = new LogCollector().attach(child)
  try {
    await log.waitFor(/reminder check #1: \d+ notification\(s\)/, 90_000)
    // Flags named in the log, values hidden, no effect: the beat is the one of desktop.json, the window is not inactive.
    expect(log.lines(/ignoring test flag/)).toEqual([
      `[desktop-main] ignoring test flag ${flags.show_inactive}... in the packaged app`,
      `[desktop-main] ignoring test flag ${flags.reminder_interval_ms}... in the packaged app`,
    ])
    expect(log.text).not.toContain(`${flags.reminder_interval_ms}200`)
    expect(log.text).toContain(`[desktop-main] reminder ticker started: first check now, then every ${config.reminder_ticker.interval_ms} ms`)
    expect(log.text).not.toMatch(/ready-to-show: showing the window without focus/)
    expect(log.text).toContain(`[desktop-main] application user model id set to ${config.app.app_user_model_id}`)
    // The first check ran against the packaged backend and ended without an error.
    expect(log.lines(/reminder check #1: 0 notification\(s\)/)).toHaveLength(1)
    expect(log.text).not.toMatch(/reminder check #\d+ failed|FATAL/)
    // Beat of 60 s: still only one check after a couple of seconds.
    await new Promise((r) => setTimeout(r, 2500))
    expect(log.lines(/reminder check #\d+: /)).toHaveLength(1)

    // Close the window (taskkill without /F sends WM_CLOSE): the ticker stops before the backend.
    execFileSync(TASKKILL, ['/PID', String(child.pid)])
    expect(await waitForExit(child)).toBe(0)
    const lines = log.text.split(/\r?\n/)
    const stoppedAt = lines.findIndex((l) => /reminder ticker stopped/.test(l))
    const backendStopAt = lines.findIndex((l) => /stopping backend \(pid \d+\): closing its standard input/.test(l))
    expect(stoppedAt).toBeGreaterThan(-1)
    expect(stoppedAt).toBeLessThan(backendStopAt)
  } finally {
    console.log(log.text)
    if (child.exitCode === null && child.signalCode === null) child.kill()
  }
})

test('P8. DSK-17: a real Windows toast from the package: shown or failed is reported by Electron (measured on release\\win-unpacked)', async () => {
  const dataDir = tempDataDir()
  const spawnPackaged = () => {
    const child = spawn(EXE, [`${flags.data_dir}${dataDir}`, flags.no_dialog], { cwd: UNPACKED, stdio: ['ignore', 'pipe', 'pipe'] })
    return { child, log: new LogCollector().attach(child) }
  }
  const close = async (child: ChildProcess) => {
    execFileSync(TASKKILL, ['/PID', String(child.pid)])
    expect(await waitForExit(child)).toBe(0)
  }
  const call = async (baseUrl: string, method: string, route: string, body: unknown, expected: number): Promise<unknown> => {
    const response = await fetch(`${baseUrl}${route}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const text = await response.text()
    if (response.status !== expected) throw new Error(`${method} ${route}: expected ${expected}, got ${response.status} ${text}`)
    return JSON.parse(text)
  }
  const two = (n: number) => String(n).padStart(2, '0')
  const title = 'Tranh thử thông báo gói'

  // Run 1: create a commission due today with the deadline reminder on (no toast yet: nothing existed at its first check).
  const first = spawnPackaged()
  try {
    const port = Number((await first.log.waitFor(/backend READY on port (\d+)/, 90_000))[1])
    await first.log.waitFor(/reminder check #1: \d+ notification\(s\)/, 30_000)
    const baseUrl = `http://${HOST}:${port}`
    const now = new Date()
    const today = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
    const client = (await call(baseUrl, 'POST', '/clients', { client_input: { display_name: 'Mai Anh', contacts: [], note: null } }, 201)) as { client_id: string }
    await call(
      baseUrl,
      'POST',
      '/commissions',
      {
        commission_input: {
          client_id: client.client_id,
          title,
          commission_type: null,
          agreed_price: { amount_minor: 1500000, currency: 'VND' },
          deadline: today,
          description: null,
          reference_links: [],
        },
      },
      201,
    )
    await call(
      baseUrl,
      'PUT',
      '/reminders/settings',
      {
        reminder_settings_input: {
          periodic: { enabled: false, every: 1, unit: 'weeks', at_time: '09:00', weekday: 1 },
          deadline: { enabled: true, lead_times: [{ amount: 1, unit: 'days' }] },
        },
      },
      200,
    )
    expect(first.log.lines(/reminder toast:/)).toEqual([])
  } finally {
    await close(first.child)
  }

  // Run 2: the first check finds it; the toast is shown by the packaged exe.
  const second = spawnPackaged()
  try {
    await second.log.waitFor(new RegExp(`reminder toast: .*${title}`), 90_000)
    await second.log.waitFor(/reminder toast [^:]+: (show|failed)/, 20_000)
    // Give 'close' (or a failure after show) a moment: measured, not asserted.
    await new Promise((r) => setTimeout(r, 12_000))
    console.log(`MEASURED toast events of the package: ${JSON.stringify(second.log.lines(/reminder toast/))}`)
    expect(second.log.lines(/reminder toast [^:]+: failed/)).toEqual([])
    expect(second.log.lines(/reminder toast [^:]+: show/)).toHaveLength(1)
  } finally {
    await close(second.child)
    console.log(second.log.text)
  }
})

test('P9. desktop session 33: the packaged bridge has invoke; dialog:pick-folder answers 200 for a chosen folder and a cancel (dialog replaced); an unknown address is rejected', async () => {
  const bridge: string = config.boundary.renderer_bridge
  const address: string = config.native_dialogs.pick_folder.address
  await withPackaged(async (l) => {
    const tree = await expectPackagedRun(l)
    const shape = await l.page.evaluate((name) => {
      const b = (window as unknown as Record<string, Record<string, unknown>>)[name]
      return { keys: Object.keys(b), frozen: Object.isFrozen(b), invoke: typeof b.invoke }
    }, bridge)
    expect(shape).toEqual({ keys: ['backendBaseUrl', 'invoke'], frozen: true, invoke: 'function' })

    const invoke = (addr: string, arg: unknown) =>
      l.page.evaluate(
        async ({ name, addr, arg }) => {
          const b = (window as unknown as Record<string, { invoke: (a: string, b?: unknown) => Promise<unknown> }>)[name]
          try {
            return { ok: true, value: await b.invoke(addr, arg) }
          } catch (err) {
            return { ok: false, message: err instanceof Error ? err.message : String(err) }
          }
        },
        { name: bridge, addr, arg },
      )
    // The real folder dialog is replaced inside the Main: nothing opens on screen.
    const stub = (answer: { canceled: boolean; filePaths: string[] }) =>
      l.app.evaluate(({ dialog }, a) => {
        ;(dialog as unknown as { showOpenDialog: () => Promise<unknown> }).showOpenDialog = async () => a
      }, answer)

    const chosen = path.join(l.dataDir, 'chosen folder')
    await stub({ canceled: false, filePaths: [chosen] })
    expect(await invoke(address, {})).toEqual({ ok: true, value: { status: 200, body: { canceled: false, path: chosen } } })
    await stub({ canceled: true, filePaths: [] })
    expect(await invoke(address, {})).toEqual({ ok: true, value: { status: 200, body: { canceled: true, path: null } } })
    // dialog:open-file is implemented since session 35; dialog:save-file is the one dialog entry that is not.
    expect(await invoke('dialog:save-file', {})).toEqual({ ok: false, message: expect.stringMatching(/ipc address not implemented/) })
    expect(l.log.text).not.toMatch(/FATAL/)
    await closeWindow(l, tree)
  })
})

test('P10. desktop session 35: the package holds the restore_data workflow and its Configs: restore:status answers, dialog:open-file answers (dialog replaced), a real backup is prepared and canceled', async () => {
  const bridge: string = config.boundary.renderer_bridge
  const openFile: string = config.native_dialogs.open_file.address
  await withPackaged(async (l) => {
    const tree = await expectPackagedRun(l)
    const invoke = (addr: string, arg: unknown) =>
      l.page.evaluate(
        async ({ name, addr, arg }) => {
          const b = (window as unknown as Record<string, { invoke: (a: string, b?: unknown) => Promise<unknown> }>)[name]
          try {
            return { ok: true, value: await b.invoke(addr, arg) }
          } catch (err) {
            return { ok: false, message: err instanceof Error ? err.message : String(err) }
          }
        },
        { name: bridge, addr, arg },
      )

    // The Main found dist/workflows/restore_data and configs/restore_data.json inside app.asar.
    expect(await invoke('restore:status', {})).toEqual({ ok: true, value: { status: 200, body: { pending: null } } })

    // dialog:open-file, the real dialog replaced inside the Main: nothing opens on screen.
    const chosen = path.join(l.dataDir, 'chosen file.ctbackup')
    await l.app.evaluate(({ dialog }, answer) => {
      ;(dialog as unknown as { showOpenDialog: () => Promise<unknown> }).showOpenDialog = async () => answer
    }, { canceled: false, filePaths: [chosen] })
    const filters = [{ name: 'Tệp sao lưu Commission Tracker', extensions: ['ctbackup'] }]
    expect(await invoke(openFile, { filters })).toEqual({ ok: true, value: { status: 200, body: { canceled: false, path: chosen } } })
    await l.app.evaluate(({ dialog }) => {
      ;(dialog as unknown as { showOpenDialog: () => Promise<unknown> }).showOpenDialog = async () => ({ canceled: true, filePaths: [] })
    })
    expect(await invoke(openFile, { filters: null })).toEqual({ ok: true, value: { status: 200, body: { canceled: true, path: null } } })

    // A real backup made by the packaged backend, prepared by the packaged workflow, then canceled.
    const baseUrl = `http://${HOST}:${l.port}`
    const archiveDir = path.join(l.dataDir, 'archives')
    fs.mkdirSync(archiveDir)
    const created = await fetch(`${baseUrl}/backups`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ backup_request: { destination_dir: archiveDir, purpose: 'manual' } }),
    })
    expect(created.status).toBe(201)
    const archive = (await created.json()) as { archive_path: string }
    const prepared = (await invoke('restore:prepare', { archive_path: archive.archive_path })) as { ok: boolean; value: { status: number; body: Record<string, string> } }
    expect(prepared.ok).toBe(true)
    expect(prepared.value.status).toBe(200)
    expect(Object.keys(prepared.value.body).sort()).toEqual(['archive_app_version', 'archive_created_at', 'archive_path', 'prepared_at', 'safety_backup_path'])
    expect(prepared.value.body.archive_path).toBe(archive.archive_path)
    expect(fs.existsSync(prepared.value.body.safety_backup_path)).toBe(true)
    expect(await invoke('restore:status', {})).toEqual({ ok: true, value: { status: 200, body: { pending: prepared.value.body } } })
    expect(await invoke('restore:cancel', {})).toEqual({ ok: true, value: { status: 200, body: { canceled: true } } })
    expect(await invoke('restore:status', {})).toEqual({ ok: true, value: { status: 200, body: { pending: null } } })

    expect(l.log.text).not.toMatch(/FATAL/)
    await closeWindow(l, tree)
  })
})
