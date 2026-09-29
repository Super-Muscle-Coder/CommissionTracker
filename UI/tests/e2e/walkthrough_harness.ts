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
  walkthroughRunner,
  writeSession,
} from '../tools/walkthrough_lib.mjs'

export type Launched = { app: ElectronApplication; page: Page; dataDir: string; baseUrl: string; log: () => string; exited: Promise<number | null> }

export async function launch(options: { seed: boolean }): Promise<Launched> {
  expect(fs.existsSync(path.join(DESKTOP_ROOT, 'dist', 'main.js')), 'Desktop is not built: run npm run build in Desktop/').toBe(true)
  expect(fs.existsSync(path.join(UI_ROOT, 'dist', 'index.html')), 'UI/dist is missing: run npm run build in UI/').toBe(true)
  const dataDir = makeDataDir()
  let app: ElectronApplication | null = null
  let log = ''
  try {
    app = await electron.launch({ executablePath: electronBinary(), args: launchArgs(dataDir, { noDialog: true }), cwd: DESKTOP_ROOT })
    const proc = app.process()
    const exited = new Promise<number | null>((resolve) => proc.once('exit', (code) => resolve(code)))
    proc.stderr?.on('data', (chunk: Buffer) => {
      log += chunk.toString('utf8')
    })
    await expect.poll(() => portFromLog(log), { timeout: 60_000 }).not.toBeNull()
    const baseUrl = baseUrlFor(portFromLog(log) as number)
    writeSession({ dataDir, baseUrl, pid: proc.pid ?? null })
    const page = await app.firstWindow()
    // Let the desktop Main's first load finish, and the start page's first list
    // load end: the data folder is new, so the loaded content is the empty state.
    await expect(page.getByRole('heading', { level: 2, name: 'Khách hàng' })).toBeVisible({ timeout: 60_000 })
    await page.waitForLoadState('load')
    await expect(page.getByText(EMPTY_LIST_TEXT)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('status')).toHaveCount(0)
    if (options.seed) await seedSampleData(baseUrl)
    return { app, page, dataDir, baseUrl, log: () => log, exited }
  } catch (e) {
    // Leave nothing behind when the launch itself fails.
    console.log(`desktop main log:\n${log}`)
    if (app !== null) await app.close()
    clearSession()
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    throw e
  }
}

export async function close(l: Launched): Promise<void> {
  let code: number | null
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

export function setBackend(wanted: 'down' | 'up'): void {
  execSync(`npm run walkthrough:backend -- ${wanted}`, { cwd: UI_ROOT, stdio: 'inherit' })
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
    await page.screenshot({ path: file })
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
