// Shared helpers of the desktop layer tests (not used by the Main).
import { _electron, type ElectronApplication } from '@playwright/test'
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

export const LAYER_ROOT = path.resolve(__dirname, '..')
export const PROJECT_ROOT = path.resolve(LAYER_ROOT, '..')
export const FIXTURES = path.join(LAYER_ROOT, 'tests', 'fixtures')
export const PROBE_ROOT = path.join(FIXTURES, 'probe')
export const SLOW_FIRST_LOAD_ROOT = path.join(FIXTURES, 'slow_first_load')
export const INVOKE_ON_LOAD_ROOT = path.join(FIXTURES, 'invoke_on_load')
export const BACKEND_PYTHON = path.join(PROJECT_ROOT, 'Backend', 'env', 'Scripts', 'python.exe')

export const config = JSON.parse(fs.readFileSync(path.join(LAYER_ROOT, 'configs', 'desktop.json'), 'utf8'))
const flags = config.test_flags

// require('electron') from Node returns the path of the Electron binary.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const ELECTRON_BINARY: string = require('electron')

export function tempDataDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ct-desktop-test-'))
}

export interface RunOptions {
  dataDir: string
  rendererRoot?: string
  fakeBackend?: string // file name in tests/fixtures
  firstBackendPort?: number
  showInactive?: boolean
  reminderIntervalMs?: number
}

/** Command-line arguments for the Main; always without dialogs and with a
 * temporary data folder (never the user's real %APPDATA%). */
export function mainArgs(o: RunOptions): string[] {
  const args = [LAYER_ROOT, `${flags.data_dir}${o.dataDir}`, flags.no_dialog]
  if (o.rendererRoot !== undefined) args.push(`${flags.renderer_root}${o.rendererRoot}`)
  if (o.fakeBackend !== undefined) {
    args.push(`${flags.backend_interpreter}${BACKEND_PYTHON}`)
    args.push(`${flags.backend_script}${path.join(FIXTURES, o.fakeBackend)}`)
    args.push(`${flags.backend_working_dir}${FIXTURES}`)
  }
  if (o.firstBackendPort !== undefined) args.push(`${flags.first_backend_port}${o.firstBackendPort}`)
  if (o.showInactive === true) args.push(flags.show_inactive)
  if (o.reminderIntervalMs !== undefined) args.push(`${flags.reminder_interval_ms}${o.reminderIntervalMs}`)
  return args
}

/** Collects stderr of the Electron process (the Main's log and the
 * backend's forwarded log). */
export class LogCollector {
  text = ''
  attach(child: ChildProcess): this {
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (chunk: string) => {
      this.text += chunk
    })
    return this
  }
  lines(re: RegExp): string[] {
    return this.text.split(/\r?\n/).filter((l) => re.test(l))
  }
  async waitFor(re: RegExp, timeoutMs = 60_000): Promise<RegExpMatchArray> {
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const m = this.text.match(re)
      if (m) return m
      if (Date.now() > deadline) throw new Error(`log line ${re} not seen within ${timeoutMs} ms. Log:\n${this.text}`)
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  /** PIDs of every backend launched by the Main. */
  backendPids(): number[] {
    return [...this.text.matchAll(/backend started \(pid (\d+)\)/g)].map((m) => Number(m[1]))
  }
}

export interface SpawnedMain {
  child: ChildProcess
  log: LogCollector
  exited: Promise<number | null>
}

/** Plain child process, for runs that exit before any window opens
 * (Playwright's _electron.launch fails when the app quits before a window). */
export function spawnMain(args: string[]): SpawnedMain {
  const child = spawn(ELECTRON_BINARY, args, { cwd: LAYER_ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  const log = new LogCollector().attach(child)
  const exited = new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)))
  return { child, log, exited }
}

export async function launchMain(
  args: string[],
  extraEnv?: Record<string, string>,
): Promise<{ app: ElectronApplication; log: LogCollector }> {
  const env = extraEnv === undefined ? undefined : { ...(process.env as Record<string, string>), ...extraEnv }
  const app = await _electron.launch({ args, cwd: LAYER_ROOT, ...(env === undefined ? {} : { env }) })
  const log = new LogCollector().attach(app.process())
  return { app, log }
}

export function waitForExit(child: ChildProcess, timeoutMs = 60_000): Promise<number | null> {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`process did not exit within ${timeoutMs} ms`)), timeoutMs)
    child.once('exit', (code) => {
      clearTimeout(timer)
      resolve(code)
    })
  })
}

// --- Windows process inspection -------------------------------------------------

export interface ProcessRow {
  ProcessId: number
  ParentProcessId: number
  Name: string
  CommandLine: string | null
  ExecutablePath: string | null
  /** Win32_Process.CreationDate as a Windows FILETIME (100 ns ticks, UTC),
   * in decimal: too large for a JavaScript number, so compared as BigInt.
   * Null when Windows does not report it. */
  Created: string | null
}

// Absolute paths: the test runner's PATH may not contain System32.
const SYSTEM32 = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')
const POWERSHELL = path.join(SYSTEM32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')

// CreationDate is turned into a FILETIME string in PowerShell: ConvertTo-Json
// would otherwise give "\/Date(ms)\/" (millisecond precision only), and the
// FILETIME itself (~1.3e17) is beyond Number.MAX_SAFE_INTEGER.
const PROCESS_TABLE_COMMAND =
  'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,ExecutablePath,' +
  "@{n='Created';e={if ($_.CreationDate) { $_.CreationDate.ToFileTimeUtc().ToString() } else { $null }}} | ConvertTo-Json -Compress"

export function processTable(): ProcessRow[] {
  const out = execFileSync(POWERSHELL, ['-NoProfile', '-Command', PROCESS_TABLE_COMMAND], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return JSON.parse(out) as ProcessRow[]
}

/** True when child may really be a child of parent: Windows keeps a dead
 * parent's PID in ParentProcessId and reuses PIDs, so a process created
 * before the parent only shares its PID with the real parent. */
function createdNotBefore(child: ProcessRow, parent: ProcessRow): boolean {
  if (child.Created === null || parent.Created === null) return false
  return BigInt(child.Created) >= BigInt(parent.Created)
}

/** Pure part of processTree: rootPid's row and every descendant in rows,
 * following ParentProcessId but accepting a child only when it was not
 * created before its parent. */
export function buildTree(rows: readonly ProcessRow[], rootPid: number): ProcessRow[] {
  const root = rows.find((r) => r.ProcessId === rootPid)
  if (root === undefined) return []
  const tree: ProcessRow[] = [root]
  for (let i = 0; i < tree.length; i++) {
    const parent = tree[i]
    for (const row of rows) {
      if (row.ParentProcessId === parent.ProcessId && row !== parent && !tree.includes(row) && createdNotBefore(row, parent)) {
        tree.push(row)
      }
    }
  }
  return tree
}

/** The process and all its descendants that are alive now. */
export function processTree(rootPid: number): ProcessRow[] {
  return buildTree(processTable(), rootPid)
}

/** Processes (of the given list) still alive: same PID, image name and
 * creation time (a reused PID is another process). */
export function stillAlive(rows: ProcessRow[]): ProcessRow[] {
  if (rows.length === 0) return []
  const now = processTable()
  return rows.filter((row) =>
    now.some((r) => r.ProcessId === row.ProcessId && r.Name === row.Name && r.Created === row.Created),
  )
}

/** "The person works in another application": a separate PowerShell process
 * (tests/fixtures/foreground_holder.ps1) that takes the foreground on request
 * and tells which process owns the foreground window. DSK-18. */
export class ForegroundHolder {
  pid = 0
  private buffer = ''
  private waiting: Array<(line: string) => void> = []
  private constructor(private readonly child: ChildProcess) {
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => {
      this.buffer += chunk
      let nl: number
      while ((nl = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, nl).trim()
        this.buffer = this.buffer.slice(nl + 1)
        this.waiting.shift()?.(line)
      }
    })
  }

  static async start(): Promise<ForegroundHolder> {
    const script = path.join(FIXTURES, 'foreground_holder.ps1')
    const child = spawn(POWERSHELL, ['-NoProfile', '-NonInteractive', '-File', script], { stdio: ['pipe', 'pipe', 'ignore'] })
    const holder = new ForegroundHolder(child)
    const ready = await holder.nextLine(30_000)
    holder.pid = Number(ready.split(' ')[1])
    return holder
  }

  private nextLine(timeoutMs = 10_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('foreground holder did not answer')), timeoutMs)
      this.waiting.push((line) => {
        clearTimeout(timer)
        resolve(line)
      })
    })
  }

  private async ask(command: string): Promise<string> {
    const answer = this.nextLine()
    this.child.stdin?.write(`${command}\n`)
    return answer
  }

  async grab(): Promise<void> {
    await this.ask('grab')
  }

  /** Process id that owns the foreground window now. */
  async foregroundPid(): Promise<number> {
    return Number((await this.ask('fg')).split(' ')[1])
  }

  async stop(): Promise<void> {
    this.child.stdin?.write('quit\n')
    await new Promise((r) => setTimeout(r, 500))
    this.child.kill()
  }
}

/** Python processes running Backend.py or one of the fake backends. */
export function projectPythonProcesses(): ProcessRow[] {
  return processTable().filter(
    (r) => /^python/i.test(r.Name) && r.CommandLine !== null && /Backend\.py|fake_backend_/.test(r.CommandLine),
  )
}
