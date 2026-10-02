// Diagnostic tool for UI-11 of .plan/open_issues.md: why does page.screenshot
// hang (~30 s) on Windows in the e2e runs? Not a spec of npm run e2e and not
// part of npm run check. It changes nothing in the layer, in Desktop or in
// Backend; it opens the real desktop app (built UI/dist, the fixture backend,
// a temporary data folder — never the real %APPDATA%) and measures.
//
// Conditions, each repeated N times (default 20), every shot with its own limit
// (default 10 s), every shot preceded by a change the page really draws (a
// navigation click, as in the walkthroughs):
//   normal       the window as the harness has it
//   minimized    BrowserWindow.minimize() before the shots
//   occluded     a second window of the same size, in front, covering it
//   unfocused    a small second window at a corner, focused (the page loses
//                the focus but stays fully visible)
// For each shot it records the milliseconds, the outcome, and the state of the
// window as the page sees it (visibilityState, hasFocus) and as Electron sees it
// (isMinimized, isFocused, isVisible).
//
// Usage (from UI/):  node tests/tools/ui11_probe.mjs [--n=20] [--limit=10000]
//                    [--only=normal,minimized,occluded,unfocused]
//                    [--flags=--disable-renderer-backgrounding,...] [--label=name]
// --flags are Chromium switches put BEFORE the app path of the Electron binary
// (step 4b: the same run with the flags). The tool then reads them back inside
// the Electron process (app.commandLine) to prove they are in effect.
// Output: a table on stdout and one JSON line per shot in
// test-results/ui11_probe/<label>.jsonl (git ignores test-results).
import { _electron as electron } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { DESKTOP_ROOT, UI_ROOT, clearSession, electronBinary, launchArgs, makeDataDir, portFromLog } from './walkthrough_lib.mjs'

const opt = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit === undefined ? fallback : hit.slice(name.length + 3)
}
const N = Number(opt('n', '20'))
const LIMIT = Number(opt('limit', '10000'))
const ONLY = opt('only', 'normal,minimized,occluded,unfocused').split(',')
const FLAGS = opt('flags', '') === '' ? [] : opt('flags', '').split(',')
const LABEL = opt('label', FLAGS.length === 0 ? 'baseline' : 'flags')
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const outDir = path.join(UI_ROOT, 'test-results', 'ui11_probe')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, `${LABEL}.jsonl`)
fs.writeFileSync(outFile, '')
const shotFile = path.join(outDir, 'probe.png')

const dataDir = makeDataDir()
let app = null
let log = ''
const rows = []

try {
  app = await electron.launch({
    executablePath: electronBinary(),
    args: [...FLAGS, ...launchArgs(dataDir, { noDialog: true })],
    cwd: DESKTOP_ROOT,
  })
  app.process().stderr?.on('data', (chunk) => {
    log += chunk.toString('utf8')
  })
  const deadline = Date.now() + 60_000
  while (portFromLog(log) === null && Date.now() < deadline) await pause(200)
  if (portFromLog(log) === null) throw new Error(`the desktop app did not report READY:\n${log}`)
  const page = await app.firstWindow()
  await page.getByRole('heading', { level: 2, name: 'Khách hàng' }).waitFor({ timeout: 60_000 })
  await page.waitForLoadState('load')

  // Proof of the flags inside the Electron process (4b).
  const switches = await app.evaluate(({ app: a }) => ({
    disableFeatures: a.commandLine.getSwitchValue('disable-features'),
    disableBackgroundingOccluded: a.commandLine.hasSwitch('disable-backgrounding-occluded-windows'),
    disableRendererBackgrounding: a.commandLine.hasSwitch('disable-renderer-backgrounding'),
    disableBackgroundTimerThrottling: a.commandLine.hasSwitch('disable-background-timer-throttling'),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  }))
  console.log(`label=${LABEL} flags=${JSON.stringify(FLAGS)}`)
  console.log(`inside Electron: ${JSON.stringify(switches)}`)

  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' })
  const names = ['Đơn hàng', 'Khách hàng']

  // The main window is told apart from the probe's own by its id, taken before any other exists.
  const mainId = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].id)
  const windowState = () =>
    app.evaluate(({ BrowserWindow }, id) => {
      const w = BrowserWindow.fromId(id)
      return { minimized: w.isMinimized(), focused: w.isFocused(), visible: w.isVisible() }
    }, mainId)

  async function measure(condition) {
    const times = []
    let hangs = 0
    for (let i = 0; i < N; i += 1) {
      // A change the page really draws: the other navigation entry.
      await nav.getByRole('button', { name: names[i % 2] }).click({ timeout: LIMIT })
      const startedAt = new Date()
      const t0 = performance.now()
      let outcome = 'ok'
      try {
        await page.screenshot({ path: shotFile, timeout: LIMIT })
      } catch (e) {
        outcome = /Timeout/i.test(String(e)) ? 'timeout' : `error: ${String(e).slice(0, 120)}`
      }
      const ms = Math.round(performance.now() - t0)
      if (outcome !== 'ok') hangs += 1
      const seen = await page.evaluate('({ visibility: document.visibilityState, hasFocus: document.hasFocus() })').catch(() => ({ visibility: '?', hasFocus: '?' }))
      const record = { label: LABEL, condition, i, startedAt: startedAt.toISOString(), ms, outcome, ...seen, window: await windowState() }
      fs.appendFileSync(outFile, `${JSON.stringify(record)}\n`)
      times.push(ms)
    }
    rows.push({ condition, shots: N, hangs, maxMs: Math.max(...times), medianMs: [...times].sort((a, b) => a - b)[Math.floor(N / 2)] })
  }

  // Second windows are made inside the Electron process (BrowserWindow of the
  // same app): the only way to put a window over the app without touching the
  // rest of the desktop. They are closed after each condition.
  const secondWindow = (kind) =>
    app.evaluate(({ BrowserWindow }, [k, id]) => {
      const main = BrowserWindow.fromId(id)
      const b = main.getBounds()
      const bounds = k === 'cover' ? b : { x: b.x, y: b.y, width: 120, height: 80 }
      const w = new BrowserWindow({ ...bounds, show: false, frame: true })
      w.loadURL('data:text/html,<body style="background:#fff">probe</body>')
      w.once('ready-to-show', () => w.show())
      w.setAlwaysOnTop(true)
      return w.id
    }, [kind, mainId])
  const closeOthers = () =>
    app.evaluate(({ BrowserWindow }, id) => {
      const main = BrowserWindow.fromId(id)
      for (const w of BrowserWindow.getAllWindows()) if (w.id !== id) w.destroy()
      if (main.isMinimized()) main.restore()
      main.focus()
    }, mainId)

  for (const condition of ONLY) {
    console.log(`condition ${condition} ...`)
    switch (condition) {
      case 'normal':
        await measure('normal')
        break
      case 'minimized':
        await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).minimize(), mainId)
        await pause(1000)
        await measure('minimized')
        await closeOthers()
        break
      case 'occluded':
        await secondWindow('cover')
        await pause(1500)
        await measure('occluded')
        await closeOthers()
        break
      case 'unfocused':
        await secondWindow('corner')
        await pause(1500)
        await measure('unfocused')
        await closeOthers()
        break
      default:
        throw new Error(`unknown condition ${condition}`)
    }
    await pause(500)
  }

  console.log('\ncondition   shots  hangs  median ms  max ms')
  for (const r of rows) console.log(`${r.condition.padEnd(11)} ${String(r.shots).padStart(5)}  ${String(r.hangs).padStart(5)}  ${String(r.medianMs).padStart(9)}  ${String(r.maxMs).padStart(6)}`)
  console.log(`per-shot records: ${path.relative(UI_ROOT, outFile)}`)
} finally {
  if (app !== null) await app.close().catch(() => undefined)
  clearSession()
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}
