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
