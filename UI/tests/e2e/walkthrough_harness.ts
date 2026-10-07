// Shared by the automated walkthroughs (iWCA I6.3) of the pages client_list,
// client_detail and client_form: launch the real app (built UI/dist, the
// desktop app, the real Backend.py behind tests/fixtures/switchable_backend.py)
// on a temporary data folder; close it and remove that folder whatever fails;
// switch the backend through the very command the Project Owner uses
// (npm run walkthrough:backend -- down|up); take one screenshot per step
// (<evidence>/walkthroughs/<page>/<page>-<step>.png) and write the run record
// (<page>-run.json there: passed or not, runner, time, covers). <evidence> is
// evidenceRoot(): UI/evidence/ when CT_WALKTHROUGH_RUNNER names the runner,
// UI/test-results/evidence/ (ignored by git) otherwise (UI-8).
//
// The runner is CT_WALKTHROUGH_RUNNER ('unknown' when missing; never guessed),
// plus the tool that drove the app. Never page.reload() before the desktop
// Main's first load is done (main-EXP-005 of the UI layer).
import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  DESKTOP_ROOT,
  UI_ROOT,
  baseUrlFor,
  clearSession,
  electronBinary,
  evidenceRoot,
  launchArgs,
  makeDataDir,
  portFromLog,
  seedSampleData,
  SHOW_INACTIVE_LOG_LINE,
  showInactiveForRun,
  walkthroughRunner,
  writeSession,
} from '../tools/walkthrough_lib.mjs'
import { drainRestores, installRestoreGuard } from '../tools/window_guard.mjs'

// UI-18 (session 31): a regression run opens the app with the Desktop flag
// --ct-test-show-inactive, so that no window takes the foreground from the person using
// the machine; a run that writes evidence (CT_WALKTHROUGH_RUNNER) does not (see
// showInactiveForRun). Both the harness and main_layout.spec.ts check, from the Main log,
// that the flag reached Main and took effect (or, for evidence, that it did not).
export async function expectShowInactiveState(log: () => string): Promise<void> {
  if (showInactiveForRun()) {
    await expect.poll(() => log().includes(SHOW_INACTIVE_LOG_LINE), { timeout: 30_000, message: 'the desktop Main did not log that it showed the window without focus' }).toBe(true)
  } else {
    expect(log(), 'an evidence run must show the window as before').not.toContain(SHOW_INACTIVE_LOG_LINE)
  }
}

// The app of the running spec (one launch per spec file, so one per process):
// the screenshot timing log reads the state of its window through it (UI-11).
let launchedApp: ElectronApplication | null = null
// The spec of the run, for the window restore log (UI-11 step 4). The restore
// itself is done in the Electron main process (tests/tools/window_guard.mjs); it
// is read from there at each screenshot and when the app closes, so the step
// logged is the one ending with that screenshot (the restore happened in it, or
// just before it).
let currentSpec = 'unknown'

export type Launched = { app: ElectronApplication; page: Page; dataDir: string; baseUrl: string; log: () => string; exited: Promise<number | null> }

export async function launch(options: { seed: boolean }): Promise<Launched> {
  expect(fs.existsSync(path.join(DESKTOP_ROOT, 'dist', 'main.js')), 'Desktop is not built: run npm run build in Desktop/').toBe(true)
  expect(fs.existsSync(path.join(UI_ROOT, 'dist', 'index.html')), 'UI/dist is missing: run npm run build in UI/').toBe(true)
  const dataDir = makeDataDir()
  let app: ElectronApplication | null = null
  let log = ''
  try {
    app = await electron.launch({ executablePath: electronBinary(), args: launchArgs(dataDir, { noDialog: true, showInactive: showInactiveForRun() }), cwd: DESKTOP_ROOT })
    launchedApp = app
    const proc = app.process()
    const exited = new Promise<number | null>((resolve) => proc.once('exit', (code) => resolve(code)))
    proc.stderr?.on('data', (chunk: Buffer) => {
      log += chunk.toString('utf8')
    })
    await expect.poll(() => portFromLog(log), { timeout: 60_000 }).not.toBeNull()
    const baseUrl = baseUrlFor(portFromLog(log) as number)
    writeSession({ dataDir, baseUrl, pid: proc.pid ?? null })
    const page = await app.firstWindow()
    // UI-11 step 4: from now on a minimized window is restored (and each restore logged).
    await installRestoreGuard(app)
    // Let the desktop Main's first load finish, and the start page's first list
    // load end: the data folder is new, so the loaded content is the empty state.
    await expect(page.getByRole('heading', { level: 2, name: 'Khách hàng' })).toBeVisible({ timeout: 60_000 })
    await expectShowInactiveState(() => log)
    await page.waitForLoadState('load')
    await expect(page.getByText(EMPTY_LIST_TEXT)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('status')).toHaveCount(0)
    if (options.seed) await seedSampleData(baseUrl)
    return { app, page, dataDir, baseUrl, log: () => log, exited }
  } catch (e) {
    // Leave nothing behind when the launch itself fails.
    console.log(`desktop main log:\n${log}`)
    launchedApp = null
    if (app !== null) await app.close()
    clearSession()
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    throw e
  }
}

export async function close(l: Launched): Promise<void> {
  let code: number | null
  launchedApp = null
  await logRestores(l.app, 'closing')
  try {
    await l.app.close()
    code = await l.exited
  } finally {
    // Removed even when closing fails, so no temporary folder is left behind.
    clearSession()
    fs.rmSync(l.dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
  expect(code).toBe(0)
  // The fixture stopped its child, then exited 0 when the desktop Main closed its stdin.
  expect(l.log()).toContain('[switchable_backend] stdin closed: stopping')
  expect(l.log()).toMatch(/backend \(pid \d+\) exited with code 0/)
}

// Whether the backend is switched off right now, for the screenshot timing log
// (UI-11 of .plan/open_issues.md): one app launch per spec, so one flag per process.
let backendDown = false

export function setBackend(wanted: 'down' | 'up'): void {
  execSync(`npm run walkthrough:backend -- ${wanted}`, { cwd: UI_ROOT, stdio: 'inherit' })
  backendDown = wanted === 'down'
}

// UI-11, data only: one line per screenshot of the harness in
// test-results/screenshot-timing.log (git ignores test-results; Playwright
// empties it at the start of every run, so a run's log is read after that run):
// start time, spec, step, milliseconds, whether the backend was down, outcome,
// and (UI-11 step 3) the state of the window read just BEFORE the screenshot
// command: isMinimized, isVisible, isFocused of the main window (through the
// Electron main process) and document.visibilityState of the page. Read only:
// nothing here changes the window or the way the screenshot is taken.
const WINDOW_READ_MS = 3_000

async function within<T>(ms: number, read: Promise<T>): Promise<T | string> {
  let timer: NodeJS.Timeout | undefined
  const guarded = read.catch((e: unknown) => `error(${e instanceof Error ? e.message.slice(0, 80) : String(e)})`)
  const late = new Promise<string>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms)
  })
  try {
    return await Promise.race([guarded, late])
  } finally {
    clearTimeout(timer)
  }
}

async function readWindowState(page: Page, app: ElectronApplication | null): Promise<string> {
  const win =
    app === null
      ? 'no-app'
      : await within(
          WINDOW_READ_MS,
          app.evaluate(({ BrowserWindow }) => {
            const w = BrowserWindow.getAllWindows()[0]
            return w === undefined ? null : { minimized: w.isMinimized(), visible: w.isVisible(), focused: w.isFocused() }
          }),
        )
  const visibility = await within(WINDOW_READ_MS, page.evaluate('document.visibilityState') as Promise<string>)
  const parts =
    typeof win === 'string'
      ? [`window:${win}`]
      : win === null
        ? ['window:none']
        : [`minimized:${win.minimized}`, `visible:${win.visible}`, `focused:${win.focused}`]
  return [...parts, `visibility:${visibility}`].join(',')
}

function logScreenshotTiming(spec: string, step: string, startedAt: Date, ms: number, outcome: 'ok' | 'error', windowState: string): void {
  const file = path.join(UI_ROOT, 'test-results', 'screenshot-timing.log')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.appendFileSync(file, `${startedAt.toISOString()}\t${spec}\t${step}\t${ms}\tbackend=${backendDown ? 'down' : 'up'}\t${outcome}\t${windowState}\n`)
}

// UI-11 step 4: one line per restore of a minimized window in
// test-results/window-restore.log (git ignores test-results; emptied by Playwright
// at the start of every run): time of the restore (taken in the main process),
// spec, step, window id. The number of lines of a run is the number of times the
// tooling had to reopen the window.
async function logRestores(app: ElectronApplication | null, step: string): Promise<void> {
  if (app === null) return
  const restores = await drainRestores(app)
  if (restores.length === 0) return
  const file = path.join(UI_ROOT, 'test-results', 'window-restore.log')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  for (const r of restores) fs.appendFileSync(file, `${r.at}\t${currentSpec}\t${step}\trestored\twindow=${r.windowId}\tway=${r.way}\tfocused_after=${r.focusedAfter}\n`)
}

// The one place a screenshot is taken (the walkthrough recorder and
// main_layout.spec.ts go through it): the window state is read first, then the
// screenshot, timed, exactly as before.
export async function timedScreenshot(page: Page, specFile: string, step: string, file: string, app: ElectronApplication | null = launchedApp): Promise<void> {
  currentSpec = specFile
  await logRestores(app, step)
  const windowState = await readWindowState(page, app)
  const startedAt = new Date()
  const t0 = performance.now()
  try {
    await page.screenshot({ path: file })
  } catch (e) {
    logScreenshotTiming(specFile, step, startedAt, Math.round(performance.now() - t0), 'error', windowState)
    throw e
  }
  logScreenshotTiming(specFile, step, startedAt, Math.round(performance.now() - t0), 'ok', windowState)
}

type StepRecord = { step: string; passed: boolean; runner: string; finished_at: string; screenshot: string; covers: string[] }

// Records the steps of the walkthrough of one page.
export function walkthroughRecorder(pageKey: string, specFile: string) {
  // UI/evidence/ for a named runner, draft evidence under UI/test-results/ otherwise (UI-8).
  const dir = path.join(evidenceRoot(), 'walkthroughs', pageKey)
  const runner = `${walkthroughRunner()} (Playwright, ${specFile})`
  const records: StepRecord[] = []

  async function screenshot(page: Page, name: string): Promise<string> {
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${name}.png`)
    await timedScreenshot(page, specFile, name, file)
    return path.relative(UI_ROOT, file).split(path.sep).join('/')
  }

  return {
    // Empty the evidence folder of the page before a run.
    reset(): void {
      fs.mkdirSync(dir, { recursive: true })
      for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f))
    },
    screenshot,
    // Run one step; screenshot <page>-<id>.png at its end (also when it fails) and record it.
    async step(page: Page, id: string, covers: string[], body: () => Promise<void>): Promise<void> {
      let passed = false
      try {
        await body()
        passed = true
      } finally {
        const shot = await screenshot(page, `${pageKey}-${id}`)
        records.push({ step: id, passed, runner, finished_at: new Date().toISOString(), screenshot: shot, covers })
      }
    },
    write(): void {
      fs.writeFileSync(
        path.join(dir, `${pageKey}-run.json`),
        JSON.stringify({ page: pageKey, walkthrough: `src/screens/pages/${pageKey}/walkthrough.yaml`, steps: records }, null, 2),
      )
    },
  }
}

// Helpers on the real pages.
export const listTexts = (page: Page, name: string) => page.getByRole('list', { name }).getByRole('listitem').allTextContents()

// "Loaded" is always read from the content, never from the state of a button
// (UI-4 of .plan/open_issues.md): a button can be enabled in a frame where
// nothing has loaded yet.
const EMPTY_LIST_TEXT = 'Chưa có khách hàng nào.'
const ACTIVE_LIST = 'Khách hàng đang hoạt động'

// The client list is loaded and shows clients (the sample data), with no
// loading status and no alert.
export async function expectListLoaded(page: Page): Promise<void> {
  await expect(page.getByRole('list', { name: ACTIVE_LIST }).getByRole('listitem').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
}

// Press "Tải lại" and wait for the content it must end on. Every caller moves
// between two different contents (empty state → list, list → "không kết nối
// được", that alert → list), so the wait cannot be met by what was shown before.
export async function reloadList(page: Page, outcome: 'list' | 'unreachable'): Promise<void> {
  await page.getByRole('button', { name: 'Tải lại' }).click()
  switch (outcome) {
    case 'list':
      await expectListLoaded(page)
      await expect(page.getByText(EMPTY_LIST_TEXT)).toHaveCount(0)
      break
    case 'unreachable':
      await expect(page.getByRole('alert')).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(page.getByRole('list', { name: ACTIVE_LIST })).toHaveCount(0)
      await expect(page.getByRole('status')).toHaveCount(0)
      break
  }
}

// Open the list through the navigation region; the list page is built anew,
// so what it shows once loaded is the list (never a leftover of before).
export async function goToList(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Khách hàng' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Khách hàng' })).toBeVisible()
  await expectListLoaded(page)
}

// [term, details] of the entries of the client detail.
export async function detailEntries(page: Page, label = 'Thông tin khách hàng'): Promise<[string, string[]][]> {
  const dl = page.getByLabel(label)
  const entries = await dl.locator(':scope > div').all()
  return Promise.all(
    entries.map(async (e) => [await e.locator('dt').innerText(), await e.locator('dd').allInnerTexts()] as [string, string[]]),
  )
}

// --- D2: commissions ------------------------------------------------------------

const COMMISSION_LIST = 'Danh sách đơn hàng'
const EMPTY_COMMISSIONS_TEXT = 'Chưa có đơn hàng nào.'

export const commissionEntries = (page: Page) => detailEntries(page, 'Thông tin đơn hàng')

// [title, secondary line] of each commission of the list, in the order shown.
export async function commissionRows(page: Page): Promise<[string, string][]> {
  const texts = await page.getByRole('list', { name: COMMISSION_LIST }).getByRole('button').allInnerTexts()
  return texts.map((t) => {
    const [title, ...rest] = t.split('\n').map((s) => s.trim()).filter((s) => s !== '')
    return [title, rest.join(' ')]
  })
}

// The commission list is loaded: it shows commissions ('list') or its empty
// state ('empty'), with no loading status and no alert. Read from the content.
async function expectCommissionsLoaded(page: Page, shown: 'list' | 'empty'): Promise<void> {
  switch (shown) {
    case 'list':
      await expect(page.getByRole('list', { name: COMMISSION_LIST }).getByRole('listitem').first()).toBeVisible({ timeout: 30_000 })
      break
    case 'empty':
      await expect(page.getByText(EMPTY_COMMISSIONS_TEXT)).toBeVisible({ timeout: 30_000 })
      break
  }
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
}

// Open the commission list through the navigation region ("Đơn hàng"); the
// page is built anew, so what it shows once loaded is never a leftover.
export async function goToCommissions(page: Page, shown: 'list' | 'empty'): Promise<void> {
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Đơn hàng' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Đơn hàng' })).toBeVisible()
  await expectCommissionsLoaded(page, shown)
}

// Press "Tải lại" on the commission list and wait for the content it must end
// on; every caller moves between two different contents (list → "không kết
// nối được", that alert → list).
export async function reloadCommissions(page: Page, outcome: 'list' | 'unreachable'): Promise<void> {
  await page.getByRole('button', { name: 'Tải lại' }).click()
  switch (outcome) {
    case 'list':
      await expectCommissionsLoaded(page, 'list')
      break
    case 'unreachable':
      await expect(page.getByRole('alert')).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(page.getByRole('list', { name: COMMISSION_LIST })).toHaveCount(0)
      await expect(page.getByRole('status')).toHaveCount(0)
      break
  }
}

// Open one commission of the list by its title; wait for its detail.
export async function openCommission(page: Page, title: string): Promise<void> {
  await page.getByRole('list', { name: COMMISSION_LIST }).getByRole('button', { name: new RegExp(`^${title}(\\s|$)`) }).click()
  await expect(page.getByRole('heading', { level: 3, name: title })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('status')).toHaveCount(0)
}

// --- D3: progress ----------------------------------------------------------------

const EMPTY_BOARD_TEXT = 'Chưa có đơn hàng nào.'

// [group heading, [title, secondary line] of each commission] of the board, in the order shown.
export async function boardGroups(page: Page): Promise<[string, [string, string][]][]> {
  const headings = await page.getByRole('main').getByRole('heading', { level: 3 }).allInnerTexts()
  return Promise.all(
    headings.map(async (h) => {
      const texts = await page.getByRole('list', { name: h, exact: true }).getByRole('button').allInnerTexts()
      const rows = texts.map((t): [string, string] => {
        const [title, ...rest] = t.split('\n').map((s) => s.trim()).filter((s) => s !== '')
        return [title, rest.join(' ')]
      })
      return [h, rows] as [string, [string, string][]]
    }),
  )
}

// The board is loaded: it shows groups ('board') or its empty state ('empty'),
// with no loading status and no alert. Read from the content (UI-4).
async function expectBoardLoaded(page: Page, shown: 'board' | 'empty'): Promise<void> {
  switch (shown) {
    case 'board':
      await expect(page.getByRole('main').getByRole('list').first()).toBeVisible({ timeout: 30_000 })
      break
    case 'empty':
      await expect(page.getByText(EMPTY_BOARD_TEXT)).toBeVisible({ timeout: 30_000 })
      break
  }
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
}

// Open the board through the navigation region ("Tiến độ"); the page is built
// anew, so what it shows once loaded is never a leftover.
export async function goToBoard(page: Page, shown: 'board' | 'empty'): Promise<void> {
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Tiến độ' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Tiến độ' })).toBeVisible()
  await expectBoardLoaded(page, shown)
}

// Press "Tải lại" on the board and wait for the content it must end on
// (board → "không kết nối được", that alert → board).
export async function reloadBoard(page: Page, outcome: 'board' | 'unreachable'): Promise<void> {
  await page.getByRole('button', { name: 'Tải lại' }).click()
  switch (outcome) {
    case 'board':
      await expectBoardLoaded(page, 'board')
      break
    case 'unreachable':
      await expect(page.getByRole('alert')).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(page.getByRole('main').getByRole('list')).toHaveCount(0)
      await expect(page.getByRole('status')).toHaveCount(0)
      break
  }
}

// [term, details] of the "Tiến độ" part of commission_detail.
export const progressEntries = (page: Page) => detailEntries(page, 'Tiến độ đơn hàng')

// The "Tiến độ" part of commission_detail has loaded (its entries are shown).
export async function expectProgressLoaded(page: Page): Promise<void> {
  await expect(page.getByLabel('Tiến độ đơn hàng')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('region', { name: 'Tiến độ' }).getByRole('status')).toHaveCount(0)
}

// Open stage_change from a loaded commission_detail; wait for its form.
export async function openStageChange(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Đổi giai đoạn' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Đổi giai đoạn' })).toBeVisible()
  await expect(page.getByLabel('Giai đoạn mới', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('status')).toHaveCount(0)
}

// --- D4: payments ------------------------------------------------------------------

const PAYMENT_LIST = 'Danh sách khoản thanh toán'

// "HH:mm dd/mm/yyyy" of an instant in the machine's time zone, as the app
// shows it (the same Intl call as the app: this process and Electron share the
// machine's time zone).
export const shownAt = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

// [term, details] of the balance (on payment_list, and in the "Thanh toán" part of commission_detail).
export const balanceEntries = (page: Page) => detailEntries(page, 'Số dư đơn hàng')

// The "Thanh toán" part of commission_detail has loaded (its balance is shown).
export async function expectPaymentPartLoaded(page: Page): Promise<void> {
  const part = page.getByRole('region', { name: 'Thanh toán', exact: true })
  await expect(part.getByLabel('Số dư đơn hàng')).toBeVisible({ timeout: 30_000 })
  await expect(part.getByRole('status')).toHaveCount(0)
}

// payment_list is loaded: the balance is shown, and no loading status is left. Read from the content (UI-4).
export async function expectPaymentsLoaded(page: Page): Promise<void> {
  await expect(page.getByLabel('Số dư đơn hàng')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('status').filter({ hasText: 'Đang tải' })).toHaveCount(0)
}

// Open payment_list from a loaded commission_detail; wait for it.
export async function openPayments(page: Page): Promise<void> {
  await page.getByRole('main').getByRole('button', { name: 'Thanh toán', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Thanh toán', exact: true })).toBeVisible()
  await expectPaymentsLoaded(page)
}

// From the commission list (through the navigation region) to the payments of one commission.
export async function goToPaymentsOf(page: Page, title: string): Promise<void> {
  await goToCommissions(page, 'list')
  await openCommission(page, title)
  await expectPaymentPartLoaded(page)
  await openPayments(page)
}

// [main line, secondary line, has "Hủy khoản này"] of each payment of the list, in the order shown.
export async function paymentRows(page: Page): Promise<[string, string, boolean][]> {
  const items = page.getByRole('list', { name: PAYMENT_LIST }).getByRole('listitem')
  const count = await items.count()
  const rows: [string, string, boolean][] = []
  for (let i = 0; i < count; i += 1) {
    const item = items.nth(i)
    const lines = (await item.locator(':scope > span').innerText()).split('\n').map((s) => s.trim()).filter((s) => s !== '')
    rows.push([lines[0], lines.slice(1).join(' '), (await item.getByRole('button', { name: 'Hủy khoản này' }).count()) > 0])
  }
  return rows
}

// Press "Tải lại" on payment_list and wait for the content it must end on
// (list → "không kết nối được", that alert → list).
export async function reloadPayments(page: Page, outcome: 'list' | 'unreachable'): Promise<void> {
  await page.getByRole('button', { name: 'Tải lại' }).click()
  switch (outcome) {
    case 'list':
      await expectPaymentsLoaded(page)
      await expect(page.getByRole('alert')).toHaveCount(0)
      break
    case 'unreachable':
      await expect(page.getByRole('alert')).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(page.getByLabel('Số dư đơn hàng')).toHaveCount(0)
      await expect(page.getByRole('status').filter({ hasText: 'Đang tải' })).toHaveCount(0)
      break
  }
}

// --- D5: income ----------------------------------------------------------------------

// "dd/mm/yyyy" of a "YYYY-MM-DD", cut from the string as the app does.
export const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

// The sub-line of a loaded report: "Từ … đến … · Lập lúc HH:mm dd/mm/yyyy".
const REPORT_LINE = /^Từ \d{2}\/\d{2}\/\d{4} đến \d{2}\/\d{2}\/\d{4} · Lập lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/
export const incomeLine = (page: Page) => page.getByText(REPORT_LINE)

// The report is loaded: its sub-line is shown, with no loading status and no alert.
// Read from the content, never from the state of a button (UI-4). With a period
// given, the sub-line must name that period: a report of another period (the
// one before) cannot satisfy the wait.
export async function expectIncomeLoaded(page: Page, period?: readonly [string, string]): Promise<void> {
  if (period === undefined) {
    await expect(incomeLine(page)).toBeVisible({ timeout: 30_000 })
  } else {
    await expect(incomeLine(page)).toContainText(`Từ ${dmy(period[0])} đến ${dmy(period[1])} · Lập lúc `, { timeout: 30_000 })
  }
  await expect(page.getByRole('status').filter({ hasText: 'Đang lập báo cáo' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
}

// Open the report through the navigation region ("Thu nhập"): the page is built
// anew and loads the report of its default period by itself.
export async function goToIncome(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Thu nhập' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Thu nhập' })).toBeVisible()
  await expectIncomeLoaded(page)
}

export const incomeFrom = (page: Page) => page.getByLabel('Từ ngày', { exact: true })
export const incomeTo = (page: Page) => page.getByLabel('Đến ngày', { exact: true })

// Choose a period in the two fields (the values of the native date inputs).
export async function chooseIncomePeriod(page: Page, period: readonly [string, string]): Promise<void> {
  await incomeFrom(page).fill(period[0])
  await incomeTo(page).fill(period[1])
}

// Choose a period, press "Xem báo cáo", wait for the report OF THAT PERIOD.
export async function viewIncome(page: Page, period: readonly [string, string]): Promise<void> {
  await chooseIncomePeriod(page, period)
  await page.getByRole('button', { name: 'Xem báo cáo', exact: true }).click()
  await expectIncomeLoaded(page, period)
}

// The currency sections, in the order shown.
export const incomeCurrencies = (page: Page) => page.getByRole('main').getByRole('heading', { level: 3 }).allInnerTexts()

// [term, details] of the three numbers of one currency.
export const incomeNumbers = (page: Page, currency: string) => detailEntries(page, `Tổng hợp ${currency}`)

// [term, details] of the month list of one currency ([] when it has none: the sentence is shown instead).
export async function incomeMonths(page: Page, currency: string): Promise<[string, string[]][]> {
  const name = `Thực nhận theo tháng, ${currency}`
  return (await page.getByLabel(name).count()) === 0 ? [] : detailEntries(page, name)
}

// --- D6: reminders --------------------------------------------------------------------

const REMINDER_LIST = 'Nhắc việc đang chờ'
const EMPTY_REMINDERS_TEXT = 'Không có nhắc việc nào đang chờ.'

// [main line, secondary line] of each reminder of the list, in the order shown.
export async function reminderRows(page: Page): Promise<[string, string][]> {
  const texts = await page.getByRole('list', { name: REMINDER_LIST }).getByRole('listitem').locator(':scope > button').allInnerTexts()
  return texts.map((t) => {
    const [title, ...rest] = t.split('\n').map((s) => s.trim()).filter((s) => s !== '')
    return [title, rest.join(' ')]
  })
}

// The list of reminders is loaded: it shows reminders ('list') or its empty
// state ('empty'), with no "Đang tải" status and no alert. Read from the
// content (UI-4); a notice (also role="status") may stay, so the status is
// filtered by its words.
export async function expectRemindersLoaded(page: Page, shown: 'list' | 'empty'): Promise<void> {
  switch (shown) {
    case 'list':
      await expect(page.getByRole('list', { name: REMINDER_LIST }).getByRole('listitem').first()).toBeVisible({ timeout: 30_000 })
      break
    case 'empty':
      await expect(page.getByText(EMPTY_REMINDERS_TEXT)).toBeVisible({ timeout: 30_000 })
      break
  }
  await expect(page.getByRole('status').filter({ hasText: 'Đang tải' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
}

// Open the reminders through the navigation region ("Nhắc việc"); the page is
// built anew, so what it shows once loaded is never a leftover.
export async function goToReminders(page: Page, shown: 'list' | 'empty'): Promise<void> {
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Nhắc việc' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Nhắc việc', exact: true })).toBeVisible()
  await expectRemindersLoaded(page, shown)
}

// Press "Tải lại" on reminder_list and wait for the content it must end on
// (list → "không kết nối được", that alert → list).
export async function reloadReminders(page: Page, outcome: 'list' | 'empty' | 'unreachable'): Promise<void> {
  await page.getByRole('button', { name: 'Tải lại' }).click()
  switch (outcome) {
    case 'list':
    case 'empty':
      await expectRemindersLoaded(page, outcome)
      break
    case 'unreachable':
      await expect(page.getByRole('alert')).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(page.getByRole('list', { name: REMINDER_LIST })).toHaveCount(0)
      await expect(page.getByRole('status').filter({ hasText: 'Đang tải' })).toHaveCount(0)
      break
  }
}

// reminder_settings is open: its form is shown (the button "Lưu"), with no "Đang mở" status.
export async function expectSettingsLoaded(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Lưu', exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('status').filter({ hasText: 'Đang mở' })).toHaveCount(0)
}

// From reminder_list (its row of buttons) to reminder_settings.
export async function openReminderSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Cài đặt nhắc việc', exact: true }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Cài đặt nhắc việc' })).toBeVisible()
  await expectSettingsLoaded(page)
}
