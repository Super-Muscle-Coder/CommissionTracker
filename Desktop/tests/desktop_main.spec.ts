// Layer-level tests of the desktop Main (plan of desktop session B1, task 5).
// Every run uses a temporary data folder and no dialogs (the Main logs
// "FATAL: <message>" before it would show one). Runs that exit before any
// window are spawned as plain processes; runs with a window use _electron.
import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as path from 'node:path'
import {
  config,
  LAYER_ROOT,
  launchMain,
  type LogCollector,
  mainArgs,
  PROBE_ROOT,
  SLOW_FIRST_LOAD_ROOT,
  processTree,
  projectPythonProcesses,
  spawnMain,
  stillAlive,
  tempDataDir,
  waitForExit,
} from './helpers'

const UI_ORIGIN: string = config.boundary.ui_origin
const HOST: string = config.boundary.loopback_host
const ATTEMPTS: number = config.backend.start_attempts
const FAILURE_EXIT_CODE: number = config.main.failure_exit_code

/** Snapshot of the backend launcher and all its descendants, taken while it
 * runs (the venv python.exe is a launcher with a real python.exe child). */
async function backendTree(log: LogCollector) {
  await log.waitFor(/backend started \(pid (\d+)\)/)
  // The backend now running is the last one started.
  const launcherPid = log.backendPids().at(-1) as number
  // Give the launcher a moment to start its child.
  await new Promise((r) => setTimeout(r, 1500))
  const tree = processTree(launcherPid)
  console.log(`backend process tree: ${JSON.stringify(tree.map((r) => [r.ProcessId, r.Name]))}`)
  // Launcher python.exe plus the real python.exe it starts.
  expect(tree.filter((r) => /^python/i.test(r.Name)).length).toBeGreaterThanOrEqual(2)
  return { launcherPid, tree }
}

test.afterAll(() => {
  // Evidence for the whole suite: no Backend.py or fake backend left running.
  const left = projectPythonProcesses()
  console.log(`python processes of this project after the suite: ${JSON.stringify(left)}`)
  expect(left).toEqual([])
})

test('1. success path with the real backend: READY, bridge, origin, GET /clients, clean stop', async () => {
  const dataDir = tempDataDir()
  const { app, log } = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT }))
  const consoleLines: string[] = []
  const page = await app.firstWindow()
  page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`))
  await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })

  // Exactly one READY, nothing else on the backend's stdout.
  const readyPort = Number((await log.waitFor(/backend READY on port (\d+)/))[1])
  expect(log.lines(/backend READY on port/)).toHaveLength(1)
  expect(log.lines(/backend stdout \(unexpected\)/)).toEqual([])

  // The bridge: one frozen object, two properties (backendBaseUrl and, since
  // the first ipc entry exists, invoke), nothing of Node.
  const bridge = JSON.parse(await page.locator('#bridge').innerText())
  expect(bridge).toEqual({ keys: ['backendBaseUrl', 'invoke'], frozen: true, invoke: 'function', nodeRequire: 'undefined', nodeProcess: 'undefined' })
  const baseUrl = await page.locator('#backend-base-url').innerText()
  expect(baseUrl).toBe(`http://${HOST}:${readyPort}`)
  const reassigned = await page.evaluate((name) => {
    const w = window as unknown as Record<string, unknown>
    try {
      w[name] = { backendBaseUrl: 'http://evil' }
    } catch {
      // strict-mode assignment to a read-only property
    }
    return (w[name] as { backendBaseUrl: string }).backendBaseUrl
  }, config.boundary.renderer_bridge)
  expect(reassigned).toBe(baseUrl)
  expect(await page.evaluate(() => location.href)).toBe(`${UI_ORIGIN}/${config.renderer.entry_file}`)

  // Origin of the page, and a readable backend response.
  expect(await page.locator('#origin').innerText()).toBe(UI_ORIGIN)
  expect(await page.locator('#status').innerText()).toBe('200')
  expect(JSON.parse(await page.locator('#body').innerText())).toEqual([])
  expect(await page.locator('#error').innerText()).toBe('')

  // Measure the Origin header Chromium really sends: record request headers
  // in the main process, then run the probe again.
  await app.evaluate(({ session }) => {
    const seen: Array<{ url: string; method: string; origin: string | undefined }> = []
    ;(globalThis as unknown as { __ctSeen: typeof seen }).__ctSeen = seen
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      seen.push({ url: details.url, method: details.method, origin: details.requestHeaders['Origin'] })
      callback({})
    })
  })
  await page.locator('#rerun').click()
  await expect(page.locator('#done')).toBeVisible()
  expect(await page.locator('#status').innerText()).toBe('200')
  const seen = await app.evaluate(() => (globalThis as unknown as { __ctSeen: unknown[] }).__ctSeen)
  console.log(`MEASURED requests to the backend: ${JSON.stringify(seen)}`)
  console.log(`renderer console: ${JSON.stringify(consoleLines)}`)
  expect(seen).toEqual([{ url: `${baseUrl}/clients`, method: 'GET', origin: UI_ORIGIN }])
  expect(consoleLines.filter((l) => /CORS|Private Network|Local Network|blocked/i.test(l))).toEqual([])

  // The database lives in the temporary data folder.
  expect(fs.existsSync(path.join(dataDir, 'CommissionTracker', 'data.db'))).toBe(true)

  // Close: the backend exits with code 0 and nothing is left running.
  const { launcherPid, tree } = await backendTree(log)
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(log.text).toMatch(new RegExp(`backend \\(pid ${launcherPid}\\) exited with code 0`))
  expect(stillAlive(tree)).toEqual([])
})

test('2. backend exits with code 2 on every attempt: all attempts, error, exit != 0, no window', async () => {
  const run = spawnMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT, fakeBackend: 'fake_backend_exit_2.py' }))
  const code = await waitForExit(run.child)
  console.log(run.log.text)
  expect(code).toBe(FAILURE_EXIT_CODE)
  expect(run.log.lines(/backend start attempt \d+\/\d+ on port/)).toHaveLength(ATTEMPTS)
  expect(run.log.lines(/backend start attempt \d+\/\d+ failed \(exit code 2\)/)).toHaveLength(ATTEMPTS)
  // A new port for every attempt.
  const ports = run.log.lines(/start attempt \d+\/\d+ on port/).map((l) => l.replace(/.* on port /, ''))
  expect(new Set(ports).size).toBe(ATTEMPTS)
  expect(run.log.lines(/FATAL: The backend could not start after \d+ attempts \(last: exit code 2\)\./)).toHaveLength(1)
  expect(run.log.text).not.toMatch(/opening the window/)
  expect(run.log.text).not.toMatch(/backend READY/)
})

test('3. backend never writes READY: timeout, process terminated, nothing left', async () => {
  const run = spawnMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT, fakeBackend: 'fake_backend_never_ready.py' }))
  const { tree } = await backendTree(run.log)
  const code = await waitForExit(run.child, 90_000)
  console.log(run.log.text)
  expect(code).toBe(FAILURE_EXIT_CODE)
  expect(run.log.lines(/backend start attempt \d+\/\d+ on port/)).toHaveLength(1)
  expect(run.log.text).toMatch(new RegExp(`did not write READY within ${config.backend.ready_timeout_ms} ms; terminating it`))
  expect(run.log.lines(/FATAL: The backend did not become ready within/)).toHaveLength(1)
  expect(run.log.text).not.toMatch(/opening the window/)
  expect(stillAlive(tree)).toEqual([])
})

test('4. first backend port already taken: retry on another port and run', async () => {
  // Hold a port on the loopback host, and force the first attempt onto it.
  const blocker = net.createServer()
  await new Promise<void>((resolve) => blocker.listen(0, HOST, () => resolve()))
  const takenPort = (blocker.address() as net.AddressInfo).port
  try {
    const { app, log } = await launchMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT, firstBackendPort: takenPort }))
    const page = await app.firstWindow()
    await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })
    console.log(log.text)
    expect(log.text).toContain(`backend start attempt 1/${ATTEMPTS} on port ${takenPort}`)
    expect(log.text).toMatch(new RegExp(`backend start attempt 1/${ATTEMPTS} failed \\(exit code [1-9]\\d*\\)`))
    const readyPort = Number((await log.waitFor(/backend READY on port (\d+)/))[1])
    expect(readyPort).not.toBe(takenPort)
    expect(await page.locator('#backend-base-url').innerText()).toBe(`http://${HOST}:${readyPort}`)
    expect(await page.locator('#status').innerText()).toBe('200')
    const { tree } = await backendTree(log)
    const electronProcess = app.process()
    await app.close()
    expect(await waitForExit(electronProcess)).toBe(0)
    expect(stillAlive(tree)).toEqual([])
  } finally {
    blocker.close()
  }
})

test('5. renderer root missing: error, backend stopped with code 0, app exits', async () => {
  const missingRoot = path.join(tempDataDir(), 'no-such-ui-dist')
  const run = spawnMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: missingRoot }))
  const code = await waitForExit(run.child)
  console.log(run.log.text)
  expect(code).toBe(FAILURE_EXIT_CODE)
  expect(run.log.lines(/backend READY on port/)).toHaveLength(1)
  expect(run.log.lines(/FATAL: The interface files were not found: the folder .* does not exist\./)).toHaveLength(1)
  expect(run.log.text).toContain(missingRoot)
  expect(run.log.text).toMatch(/backend \(pid \d+\) exited with code 0/)
  expect(run.log.text).not.toMatch(/opening the window/)
})

test('6. backend dies after READY: error, app exits', async () => {
  const run = spawnMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT, fakeBackend: 'fake_backend_ready_then_die.py' }))
  const code = await waitForExit(run.child)
  console.log(run.log.text)
  expect(code).toBe(FAILURE_EXIT_CODE)
  expect(run.log.text).toMatch(/opening the window/)
  expect(run.log.lines(/FATAL: The backend stopped unexpectedly \(exit code 3\)\. The app will close\./)).toHaveLength(1)
  // No restart in V1.
  expect(run.log.lines(/backend start attempt/)).toHaveLength(1)
})

test('7. backend ignores the closing of stdin: terminated after the timeout, app exits, nothing left', async () => {
  const { app, log } = await launchMain(
    mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT, fakeBackend: 'fake_backend_ignore_stdin.py' }),
  )
  await app.firstWindow()
  // READY arrived in two chunks ("REA", "DY\r\n") and was assembled into one line.
  expect(log.lines(/backend READY on port/)).toHaveLength(1)
  expect(log.lines(/backend stdout \(unexpected\)/)).toEqual([])
  const { tree } = await backendTree(log)
  const electronProcess = app.process()
  const started = Date.now()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  const elapsed = Date.now() - started
  console.log(log.text)
  console.log(`close took ${elapsed} ms`)
  expect(elapsed).toBeGreaterThanOrEqual(config.backend.shutdown_timeout_ms)
  expect(log.text).toMatch(/closing its standard input/)
  expect(log.text).toMatch(new RegExp(`did not exit within ${config.backend.shutdown_timeout_ms} ms; terminating it`))
  expect(stillAlive(tree)).toEqual([])
})

test('8. app:// serves only the renderer root; navigation and new windows are blocked', async () => {
  const { app, log } = await launchMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT }))
  const page = await app.firstWindow()
  await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })

  const configEncoded = encodeURIComponent(path.join(LAYER_ROOT, 'configs', 'desktop.json'))
  const escapes = [
    '/../fake_backend_exit_2.py',
    '/%2e%2e/fake_backend_exit_2.py',
    '/%2E%2E/%2E%2E/playwright.config.ts',
    '/..%2ffake_backend_exit_2.py',
    '/..%2f..%2f..%2fconfigs%2fdesktop.json',
    '/..%5cfake_backend_exit_2.py',
    '/..\\..\\..\\configs\\desktop.json',
    '/%2e%2e%5c%2e%2e%5c%2e%2e%5cconfigs%5cdesktop.json',
    `/${configEncoded}`,
    '/%00index.html',
    '/%E0%A4%A',
    '/nonexistent.js',
  ].map((p) => `${UI_ORIGIN}${p}`)
  const urls = [
    `${UI_ORIGIN}/index.html`,
    `${UI_ORIGIN}/probe.js`,
    ...escapes,
    'app://other-host/index.html',
    'app://other-host/../index.html',
  ]
  // net.fetch in the main process goes through the same protocol handler.
  const results = await app.evaluate(async ({ net }, list) => {
    const out: Array<{ url: string; status: number; type: string | null }> = []
    for (const url of list) {
      const r = await net.fetch(url)
      out.push({ url, status: r.status, type: r.headers.get('content-type') })
    }
    return out
  }, urls)
  console.log(JSON.stringify(results, null, 1))
  expect(results[0]).toMatchObject({ status: 200, type: 'text/html; charset=utf-8' })
  expect(results[1]).toMatchObject({ status: 200, type: 'text/javascript; charset=utf-8' })
  for (const r of results.slice(2)) expect(r.status, r.url).toBe(404)

  // The same escapes from the renderer (same origin fetch).
  const fromPage = await page.evaluate(async (list) => {
    const out: number[] = []
    for (const url of list) out.push((await fetch(url)).status)
    return out
  }, escapes)
  expect(fromPage).toEqual(escapes.map(() => 404))

  // No new window; no navigation away from ui_origin.
  expect(await page.evaluate(() => window.open('https://example.com/') === null)).toBe(true)
  await page.evaluate(() => {
    location.href = 'https://example.com/'
  })
  await log.waitFor(/blocked navigation to https:\/\/example\.com\//)
  expect(await page.evaluate(() => location.origin)).toBe(UI_ORIGIN)
  expect(log.text).toMatch(/blocked new window for https:\/\/example\.com\//)
  expect(app.windows()).toHaveLength(1)

  const { tree } = await backendTree(log)
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
})

test('9. second instance exits without starting a second backend', async () => {
  const dataDir = tempDataDir()
  const { app, log } = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT }))
  await expect((await app.firstWindow()).locator('#done')).toBeVisible({ timeout: 60_000 })

  const second = spawnMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT }))
  const code = await waitForExit(second.child)
  console.log(second.log.text)
  expect(code).toBe(0)
  expect(second.log.text).toMatch(/another instance is already running; exiting without starting the backend/)
  expect(second.log.text).not.toMatch(/backend start/)
  expect(log.lines(/backend started \(pid/)).toHaveLength(1)
  expect(app.windows()).toHaveLength(1)

  const { tree } = await backendTree(log)
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
})

test('10. renderer root exists but has no index.html: error, backend stopped with code 0, app exits', async () => {
  // An empty folder: the root is there, the entry file is not.
  const emptyRoot = tempDataDir()
  const run = spawnMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: emptyRoot }))
  const code = await waitForExit(run.child)
  console.log(run.log.text)
  expect(code).toBe(FAILURE_EXIT_CODE)
  expect(run.log.lines(/backend READY on port/)).toHaveLength(1)
  expect(run.log.lines(/FATAL: The interface files were not found: index\.html is missing in .*\./)).toHaveLength(1)
  expect(run.log.text).toContain(emptyRoot)
  expect(run.log.text).toMatch(/backend \(pid \d+\) exited with code 0/)
  expect(run.log.text).not.toMatch(/opening the window/)
})

test('11. first load aborted by a reload (ERR_ABORTED, -3): logged, not fatal; the page loads and the app closes cleanly', async () => {
  const { app, log } = await launchMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: SLOW_FIRST_LOAD_ROOT }))
  try {
    const page = await app.firstWindow()
    // The page keeps each load busy for 3 s: this reload starts while the
    // Main's first loadURL is still pending, and aborts it.
    await page.reload()
    await expect(page.locator('#loaded')).toBeVisible({ timeout: 60_000 })
    // Give a fatal error time to show up before judging.
    await new Promise((r) => setTimeout(r, 2000))
  } finally {
    console.log(log.text)
  }
  expect(log.lines(/first load of .* was aborted \(ERR_ABORTED, -3\)/)).toHaveLength(1)
  expect(log.text).not.toMatch(/FATAL/)
  expect(app.windows()).toHaveLength(1)

  const { tree } = await backendTree(log)
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
})

test('12. application language is the one in the config (DSK-15): getLocale() and the renderer', async () => {
  const wanted: string = config.app.locale
  const { app, log } = await launchMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT }))
  const page = await app.firstWindow()
  await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })
  const measured = {
    getLocale: await app.evaluate(({ app: electronApp }) => electronApp.getLocale()),
    navigatorLanguage: await page.evaluate(() => navigator.language),
    intlLocale: await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().locale),
  }
  console.log(`MEASURED language: ${JSON.stringify(measured)}`)
  expect(measured).toEqual({ getLocale: wanted, navigatorLanguage: wanted, intlLocale: wanted })

  const { tree } = await backendTree(log)
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
})

/** The one "error dialog text:" line the Main logs instead of a dialog. */
function dialogTextOf(log: LogCollector): { title: string; content: string } {
  const lines = log.lines(/\[desktop-main\] error dialog text: /)
  expect(lines).toHaveLength(1)
  return JSON.parse(lines[0].replace(/^.*error dialog text: /, ''))
}

test('13. error dialog at start-up (DSK-13): Vietnamese sentence first, technical detail after, FATAL line unchanged', async () => {
  const missingRoot = path.join(tempDataDir(), 'no-such-ui-dist')
  const run = spawnMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: missingRoot }))
  expect(await waitForExit(run.child)).toBe(FAILURE_EXIT_CODE)
  const dialog = dialogTextOf(run.log)
  console.log(`error dialog: ${JSON.stringify(dialog)}`)
  const text = config.main.error_dialog
  const fatal = run.log.lines(/\[desktop-main\] FATAL: /)
  expect(fatal).toHaveLength(1)
  const detail = fatal[0].replace(/^\[desktop-main\] FATAL: /, '')
  expect(detail).toMatch(/^The interface files were not found: the folder .* does not exist\.$/)
  expect(dialog.title).toBe(config.main.error_dialog_title)
  // Vietnamese sentence, blank line, label, then the exact FATAL message.
  expect(dialog.content).toBe(`${text.startup_summary}\n\n${text.detail_label}\n${detail}`)
  expect(dialog.content).toContain('không khởi động được')
  expect(dialog.content.indexOf('không khởi động được')).toBeLessThan(dialog.content.indexOf(detail))
  expect(dialog.content).not.toContain(text.running_summary)
})

test('14. error dialog while running (DSK-13): the "stopped while running" sentence, same layout', async () => {
  const run = spawnMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT, fakeBackend: 'fake_backend_ready_then_die.py' }))
  expect(await waitForExit(run.child)).toBe(FAILURE_EXIT_CODE)
  const dialog = dialogTextOf(run.log)
  console.log(`error dialog: ${JSON.stringify(dialog)}`)
  const text = config.main.error_dialog
  const detail = 'The backend stopped unexpectedly (exit code 3). The app will close.'
  expect(run.log.lines(/\[desktop-main\] FATAL: /)).toEqual([`[desktop-main] FATAL: ${detail}`])
  expect(dialog.content).toBe(`${text.running_summary}\n\n${text.detail_label}\n${detail}`)
  expect(dialog.content).toContain('gặp lỗi khi đang chạy')
  expect(dialog.content).not.toContain(text.startup_summary)
})

test('L1. the log of a launchMain run starts at the first line (DSK-27): "main started" is there, once, before "backend started"', async () => {
  const { app, log } = await launchMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT }))
  try {
    await expect((await app.firstWindow()).locator('#done')).toBeVisible({ timeout: 60_000 })
    const lines = log.text.split(/\r?\n/)
    const first = lines.findIndex((l) => /\[desktop-main\] main started: /.test(l))
    const backend = lines.findIndex((l) => /backend started \(pid \d+\)/.test(l))
    expect(first).toBe(0) // the very first line the Main writes; a stream attached after launch() always missed it
    expect(backend).toBeGreaterThan(first)
    expect(log.lines(/main started: /)).toHaveLength(1)
  } finally {
    await app.close()
  }
})
