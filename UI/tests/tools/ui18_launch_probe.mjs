// UI-18 follow-up (session 29): does LAUNCHING the app take the foreground? A separate process
// holds it; the app is launched exactly as the e2e harness does; the foreground owner is polled.
// Measurement only. Usage (from UI/): node tests/tools/ui18_launch_probe.mjs [--runs=3] [--show-inactive]
// --show-inactive (session 31) launches with the Desktop flag test_flags.show_inactive, as the e2e
// harness now does. Each line also says whether Electron's own win.isFocused() was ever true during
// the 12 s: the deterministic indicator (main-EXP-024) where the foreground of the operating system
// is not, because Windows does not always hand the foreground to a new window.
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DESKTOP_ROOT, clearSession, electronBinary, launchArgs, makeDataDir, portFromLog } from './walkthrough_lib.mjs'

const RUNS = Number((process.argv.find((a) => a.startsWith('--runs=')) ?? '--runs=3').slice(7))
const SHOW_INACTIVE = process.argv.includes('--show-inactive')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const PS = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class CtWin { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }
"@
$f = New-Object System.Windows.Forms.Form; $f.Text='ct-ui18-other'; $f.Width=300; $f.Height=120; $f.Show()
[Console]::Out.WriteLine("ready $PID")
while (($l = [Console]::In.ReadLine()) -ne $null) {
  [System.Windows.Forms.Application]::DoEvents()
  if ($l -eq 'grab') { $f.Activate(); [void][CtWin]::SetForegroundWindow($f.Handle); [Console]::Out.WriteLine('ok') }
  elseif ($l -eq 'fg') { $p=0; [void][CtWin]::GetWindowThreadProcessId([CtWin]::GetForegroundWindow(),[ref]$p); [Console]::Out.WriteLine("fg $p") }
  elseif ($l -eq 'quit') { break } }
`
const script = path.join(os.tmpdir(), 'ct-ui18-launch.ps1')
fs.writeFileSync(script, PS, 'utf8')
// No -ExecutionPolicy (same as Desktop/tests/helpers.ts, DSK-14).
const h = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', script])
const q = []
let buf = ''
h.stdout.on('data', (c) => { buf += c; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); q.shift()?.(l) } })
const ask = (cmd) => new Promise((res) => { q.push(res); h.stdin.write(cmd + '\n') })
q.push(() => {})
await pause(4000)
for (let r = 0; r < RUNS; r += 1) {
  await ask('grab'); await pause(500)
  const before = await ask('fg')
  const dataDir = makeDataDir(); let log = ''
  const t0 = performance.now()
  const app = await electron.launch({ executablePath: electronBinary(), args: launchArgs(dataDir, { noDialog: true, showInactive: SHOW_INACTIVE }), cwd: DESKTOP_ROOT })
  app.process().stderr?.on('data', (c) => { log += c })
  const appPid = await app.evaluate(() => process.pid)
  const seen = []
  let focusedAt = null
  const until = performance.now() + 12_000
  while (performance.now() < until) {
    const fg = await ask('fg')
    seen.push([Math.round(performance.now() - t0), Number(fg.split(' ')[1]) === appPid ? 'APP' : 'other'])
    const focused = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.isFocused()))
    if (focused && focusedAt === null) focusedAt = Math.round(performance.now() - t0)
    await pause(150)
  }
  const firstApp = seen.find((s) => s[1] === 'APP')
  console.log(`run ${r + 1}: before=${before}; app pid ${appPid}; ready=${portFromLog(log) !== null}; flag=${SHOW_INACTIVE}; first APP in foreground at ${firstApp ? firstApp[0] + ' ms after launch call' : 'never (12 s)'}; isFocused() true at ${focusedAt === null ? 'never (12 s)' : focusedAt + ' ms'}`)
  await app.close().catch(() => undefined); clearSession(); fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}
h.stdin.write('quit\n'); await pause(300); h.kill(); fs.rmSync(script, { force: true })
