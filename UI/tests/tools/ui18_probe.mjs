// Measurement tool for UI-18 of .plan/open_issues.md: which way of bringing a
// MINIMIZED main window back (a) leaves it not minimized, (b) does not take the
// focus from the application the person is using, (c) does not make the
// screenshot command hang. Test tooling only: not a spec of npm run e2e, not part
// of npm run check; it changes nothing in the layer, Desktop or Backend. It opens
// the real desktop app (built UI/dist, the fixture backend, a temporary data
// folder, never the real %APPDATA%).
//
// "The person is in another application" is made real: a SEPARATE process (a
// PowerShell host with a small WinForms window, started with -File) is given the
// foreground before every trial. A window of the same Electron process would not
// do: Windows lets a process move its own windows to the front more freely than
// another process's. The foreground window of the operating system is read with
// GetForegroundWindow + GetWindowThreadProcessId (user32) from that same helper
// process, before and after the way under test is applied.
//
// Ways measured (Electron 44.4.5, Desktop/node_modules/electron/electron.d.ts):
//   restore          BrowserWindow.restore()  ("Restores the window from minimized
//                    state to its previous state", line 3153): the way of
//                    window_guard.mjs before session 29 (baseline)
//   showInactive     BrowserWindow.showInactive() ("Shows the window but doesn't
//                    focus on it", line 3632)
//   show             BrowserWindow.show() (line 3622): control, expected to activate
//   maximize         BrowserWindow.maximize() ("This will also show (but not focus)
//                    the window if it isn't being displayed already", line 3110),
//                    then unmaximize() to return to the previous size
// For each trial it records: isMinimized and isFocused of the main window after
// the way, which process holds the foreground before and after (the helper's or the
// Electron app's), and whether a click and a screenshot of the page finish within
// the limit (a "hang" otherwise).
//
// Usage (from UI/):  node tests/tools/ui18_probe.mjs [--n=20] [--limit=10000]
//                    [--ways=restore,showInactive,show,maximize] [--label=name]
// Output: a table on stdout and one JSON line per trial in
// test-results/ui18_probe/<label>.jsonl (git ignores test-results).
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DESKTOP_ROOT, UI_ROOT, clearSession, electronBinary, launchArgs, makeDataDir, portFromLog } from './walkthrough_lib.mjs'

const opt = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit === undefined ? fallback : hit.slice(name.length + 3)
}
const N = Number(opt('n', '20'))
const LIMIT = Number(opt('limit', '10000'))
const WAYS = opt('ways', 'restore,showInactive,show,maximize').split(',')
const LABEL = opt('label', 'ui18')
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const outDir = path.join(UI_ROOT, 'test-results', 'ui18_probe')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, `${LABEL}.jsonl`)
fs.writeFileSync(outFile, '')
const shotFile = path.join(outDir, 'probe.png')

// The "other application": one PowerShell process with a WinForms window; it
// answers one line per command on stdout. 'grab' asks for the foreground, 'fg'
// prints the pid that owns the foreground window now, 'quit' ends it.
const HELPER = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class CtWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
"@
$f = New-Object System.Windows.Forms.Form
$f.Text = 'ct-ui18-other-application'
$f.Width = 320
$f.Height = 140
$f.StartPosition = 'Manual'
$f.Location = New-Object System.Drawing.Point(40, 40)
$f.Show()
[Console]::Out.WriteLine("ready $PID")
while (($line = [Console]::In.ReadLine()) -ne $null) {
  [System.Windows.Forms.Application]::DoEvents()
  if ($line -eq 'grab') {
    $f.WindowState = 'Normal'
    $f.Activate()
    [void][CtWin]::SetForegroundWindow($f.Handle)
    [System.Windows.Forms.Application]::DoEvents()
    [Console]::Out.WriteLine('grabbed')
  } elseif ($line -eq 'fg') {
    $p = 0
    [void][CtWin]::GetWindowThreadProcessId([CtWin]::GetForegroundWindow(), [ref]$p)
    [Console]::Out.WriteLine("fg $p")
  } elseif ($line -eq 'quit') { break }
}
$f.Close()
`

function startHelper() {
  const script = path.join(os.tmpdir(), `ct-ui18-helper-${process.pid}.ps1`)
  fs.writeFileSync(script, HELPER, 'utf8')
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { stdio: ['pipe', 'pipe', 'pipe'] })
  let buffer = ''
  const waiting = []
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8')
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      const w = waiting.shift()
      if (w !== undefined) w(line)
    }
  })
  const nextLine = (ms = 10_000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('helper did not answer')), ms)
      waiting.push((line) => {
        clearTimeout(timer)
        resolve(line)
      })
    })
  return {
    script,
    child,
    ready: nextLine(30_000),
    async ask(command) {
      const answer = nextLine()
      child.stdin.write(`${command}\n`)
      return answer
    },
    async stop() {
      child.stdin.write('quit\n')
      await pause(500)
      child.kill()
      fs.rmSync(script, { force: true })
    },
  }
}

const dataDir = makeDataDir()
let app = null
let helper = null
let log = ''
const rows = []

try {
  helper = startHelper()
  const ready = await helper.ready
  const helperPid = Number(ready.split(' ')[1])
  console.log(`other application (PowerShell helper): ${ready}`)

  app = await electron.launch({ executablePath: electronBinary(), args: launchArgs(dataDir, { noDialog: true }), cwd: DESKTOP_ROOT })
  app.process().stderr?.on('data', (chunk) => {
    log += chunk.toString('utf8')
  })
  // The pid of the Electron main process as it sees itself (the pid Playwright spawned may be a launcher).
  const appPid = await app.evaluate(() => process.pid)
  const deadline = Date.now() + 60_000
  while (portFromLog(log) === null && Date.now() < deadline) await pause(200)
  if (portFromLog(log) === null) throw new Error(`the desktop app did not report READY:\n${log}`)
  const page = await app.firstWindow()
  await page.getByRole('heading', { level: 2, name: 'Khách hàng' }).waitFor({ timeout: 60_000 })
  await page.waitForLoadState('load')
  console.log(`electron ${await app.evaluate(() => process.versions.electron)}; app pid ${appPid}; helper pid ${helperPid}`)

  const mainId = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].id)
  const winState = () =>
    app.evaluate(({ BrowserWindow }, id) => {
      const w = BrowserWindow.fromId(id)
      return { minimized: w.isMinimized(), focused: w.isFocused(), visible: w.isVisible(), maximized: w.isMaximized() }
    }, mainId)
  const owner = async () => {
    const pid = Number((await helper.ask('fg')).split(' ')[1])
    return pid === helperPid ? 'other' : pid === appPid ? 'app' : `pid${pid}`
  }
  const apply = (way) =>
    app.evaluate(({ BrowserWindow }, [id, w]) => {
      const win = BrowserWindow.fromId(id)
      if (w === 'restore') win.restore()
      else if (w === 'showInactive') win.showInactive()
      else if (w === 'show') win.show()
      else if (w === 'maximize') {
        win.maximize()
        win.unmaximize()
      } else throw new Error(`unknown way ${w}`)
    }, [mainId, way])

  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' })
  const names = ['Đơn hàng', 'Khách hàng']

  for (const way of WAYS) {
    console.log(`way ${way} ...`)
    let setupFailed = 0
    let notMinimizedAfter = 0
    let focusStolen = 0
    let appFocusedAfter = 0
    let hangs = 0
    let valid = 0
    for (let i = 0; i < N; i += 1) {
      // The person is in another application: the helper asks for the foreground. Windows may
      // refuse it while the person works elsewhere; then the application the person uses holds
      // it, which is the same condition. Any owner but the Electron app counts as "elsewhere".
      await helper.ask('grab')
      await pause(400)
      // Minimize while it stays in front (a minimized window is never the foreground).
      await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).minimize(), mainId)
      await pause(400)
      const before = { owner: await owner(), state: await winState() }
      let record = { label: LABEL, way, i, at: new Date().toISOString(), beforeOwner: before.owner, beforeMinimized: before.state.minimized }
      if (before.owner === 'app' || !before.state.minimized) {
        setupFailed += 1
        record = { ...record, outcome: 'setup-failed' }
        fs.appendFileSync(outFile, `${JSON.stringify(record)}\n`)
        await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).restore(), mainId)
        continue
      }
      valid += 1
      let applyError = null
      try {
        await apply(way)
      } catch (e) {
        applyError = String(e).slice(0, 100)
      }
      await pause(600)
      const after = { owner: await owner(), state: await winState() }
      // Hang test: a click the page really draws, then a screenshot.
      let hang = 'ok'
      const t0 = performance.now()
      try {
        await nav.getByRole('button', { name: names[i % 2] }).click({ timeout: LIMIT })
        await page.screenshot({ path: shotFile, timeout: LIMIT })
      } catch (e) {
        hang = /Timeout/i.test(String(e)) ? 'timeout' : `error: ${String(e).slice(0, 80)}`
      }
      const ms = Math.round(performance.now() - t0)
      if (after.state.minimized) notMinimizedAfter += 1
      if (after.owner === 'app') focusStolen += 1
      if (after.state.focused) appFocusedAfter += 1
      if (hang !== 'ok') hangs += 1
      record = { ...record, applyError, afterMinimized: after.state.minimized, afterMaximized: after.state.maximized, afterVisible: after.state.visible, afterFocusedElectron: after.state.focused, afterOwner: after.owner, hang, ms }
      fs.appendFileSync(outFile, `${JSON.stringify(record)}\n`)
      // Back to a normal window for the next trial.
      await app.evaluate(({ BrowserWindow }, id) => {
        const w = BrowserWindow.fromId(id)
        if (w.isMinimized()) w.restore()
      }, mainId)
      await pause(300)
    }
    rows.push({ way, trials: N, valid, setupFailed, stillMinimized: notMinimizedAfter, foregroundTaken: focusStolen, electronFocused: appFocusedAfter, hangs })
  }

  console.log('\nway           trials  valid  setup-failed  still-minimized  foreground-taken-by-app  electron-focused  hangs')
  for (const r of rows) {
    console.log(`${r.way.padEnd(13)} ${String(r.trials).padStart(6)}  ${String(r.valid).padStart(5)}  ${String(r.setupFailed).padStart(12)}  ${String(r.stillMinimized).padStart(15)}  ${String(r.foregroundTaken).padStart(16)}  ${String(r.electronFocused).padStart(16)}  ${String(r.hangs).padStart(5)}`)
  }
  console.log(`per-trial records: ${path.relative(UI_ROOT, outFile)}`)
} finally {
  if (app !== null) await app.close().catch(() => undefined)
  if (helper !== null) await helper.stop().catch(() => undefined)
  clearSession()
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}
