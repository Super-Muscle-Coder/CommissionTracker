// The built interface (UI/dist) loaded by the real desktop app, with the real
// backend: the main frame appears, no startup error, no CSP violation or CSP
// warning, and the app exits with code 0 when closed.
//
// Desktop and Backend are only run, never modified. The desktop layer must
// have been built once (npm run build in Desktop/). The user's real
// %APPDATA% is never touched: the desktop Main gets a temporary data folder.
import { _electron as electron, expect, test } from '@playwright/test'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evidenceRoot } from '../tools/walkthrough_lib.mjs'

const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DESKTOP_ROOT = path.resolve(UI_ROOT, '..', 'Desktop')
// UI/evidence/ when CT_WALKTHROUGH_RUNNER names the runner, draft evidence
// under UI/test-results/ otherwise (UI-8).
const SCREENSHOT = path.join(evidenceRoot(), 'b2a', 'main_layout.png')
const APP_TITLE = 'Commission Tracker'

type DesktopConfig = {
  boundary: { ui_origin: string }
  renderer: { root_dir: string }
  test_flags: { data_dir: string; no_dialog: string }
}
const desktopConfig = JSON.parse(
  fs.readFileSync(path.join(DESKTOP_ROOT, 'configs', 'desktop.json'), 'utf8'),
) as DesktopConfig
const flags = desktopConfig.test_flags

// require('electron') from Node answers the path of the Electron binary.
const electronBinary = createRequire(path.join(DESKTOP_ROOT, 'package.json'))('electron') as string

test('the desktop app loads UI/dist: main frame, no startup error, no CSP violation or warning, exit code 0', async () => {
  expect(fs.existsSync(path.join(DESKTOP_ROOT, 'dist', 'main.js')), 'Desktop is not built: run npm run build in Desktop/').toBe(true)
  // The desktop Main loads UI/dist by default; no --ct-test-renderer-root is passed.
  expect(path.resolve(DESKTOP_ROOT, desktopConfig.renderer.root_dir)).toBe(path.join(UI_ROOT, 'dist'))
  expect(fs.existsSync(path.join(UI_ROOT, 'dist', 'index.html'))).toBe(true)

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-ui-e2e-'))
  const consoleLines: string[] = []
  let exitCode: number | null
  // The temporary data folder is removed in the outer finally, whatever fails
  // (launch, an assertion, closing): UI-3 of .plan/open_issues.md.
  try {
    const app = await electron.launch({
      executablePath: electronBinary,
      args: [DESKTOP_ROOT, `${flags.data_dir}${dataDir}`, flags.no_dialog],
      cwd: DESKTOP_ROOT,
    })
    const electronProcess = app.process()
    const exited = new Promise<number | null>((resolve) => electronProcess.once('exit', (code) => resolve(code)))
    let mainLog = ''
    electronProcess.stderr?.on('data', (chunk: Buffer) => {
      mainLog += chunk.toString('utf8')
    })

    try {
      const page = await app.firstWindow()
      // Let the desktop Main's own first load finish: it treats an aborted first
      // load (ERR_ABORTED) as fatal and exits with code 1 (measured).
      await expect(page.getByRole('heading', { level: 1, name: APP_TITLE })).toBeVisible({ timeout: 60_000 })
      await page.waitForLoadState('load')
      page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`))
      page.on('pageerror', (e) => consoleLines.push(`pageerror: ${e.message}`))
      // Load the page once more with the listeners attached, so that every
      // console message of a complete load (CSP, Electron security warnings) is seen.
      await page.reload()

      await expect(page.getByRole('heading', { level: 1, name: APP_TITLE })).toBeVisible({ timeout: 60_000 })
      await expect(page.getByRole('main')).toBeVisible()
      await expect(page.getByRole('alert')).toHaveCount(0)
      expect(await page.evaluate('location.origin')).toBe(desktopConfig.boundary.ui_origin)
      const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
      expect(csp).toBe("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src http://127.0.0.1:*")

      // Electron prints its security warnings shortly after load; give them time.
      await page.waitForTimeout(2000)
      fs.mkdirSync(path.dirname(SCREENSHOT), { recursive: true })
      await page.screenshot({ path: SCREENSHOT })
    } finally {
      console.log(`renderer console: ${JSON.stringify(consoleLines)}`)
      await app.close()
      // The backend (a child of the app) holds a lock file inside dataDir
      // until it ends: wait for the app to exit before removing the folder.
      exitCode = await exited
      console.log(`desktop main log:
${mainLog}`)
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
  expect(consoleLines.filter((l) => /Content[- ]Security[- ]Policy|Refused to/i.test(l))).toEqual([])
  expect(consoleLines.filter((l) => /^(error|pageerror):/.test(l))).toEqual([])
  expect(exitCode).toBe(0)
})
