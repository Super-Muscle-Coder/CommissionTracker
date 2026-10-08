// Desktop session 36: phase 2 of restore_data (apply a pending restore at the next
// start), the lifecycle tool backend_controller and the cross-cutting restore_trigger
// (api_contract.yaml 5.0.0, .design/f_restore.md sections 3-4).
//   A1  nothing pending: one log line, no dialog text, restore_trigger before the window
//   A2  the real round trip: prepare in run 1, applied in run 2 (same data folder)
//   A3  discarded: the staged file is gone / the record is broken JSON
//   A4  rolled back: the staged file is not a database, so the backend exits before READY
//   A5  rolling back fails too: a fake backend that starts once and never again
//   A6  two starts after one prepare: restored, then none
// backend_controller has no entry of its own (no ipc, no test hook): A2 (stop and start
// again on the same port, no FATAL), A4 and A5 (a start that exits before READY) drive it.
// Every run uses a temporary data folder and no dialogs; the user's real
// %APPDATA%\CommissionTracker is never touched.
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  BACKEND_PYTHON,
  config,
  launchMain,
  type LogCollector,
  mainArgs,
  PROBE_ROOT,
  processTree,
  projectPythonProcesses,
  spawnMain,
  stillAlive,
  tempDataDir,
  waitForExit,
} from './helpers'

const BRIDGE: string = config.boundary.renderer_bridge
const DB_RELATIVE: string[] = config.boundary.db_file_relative_to_app_data.split('/')
const DIALOG: { title: string; restored: string } = { title: config.restore_trigger.title, restored: config.restore_trigger.restored[0].text }

function tempFolder(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

interface Run {
  app: ElectronApplication
  log: LogCollector
  page: Page
  baseUrl: string
}

const dbFileOf = (dataDir: string): string => path.join(dataDir, ...DB_RELATIVE)
const dbFolderOf = (dataDir: string): string => path.dirname(dbFileOf(dataDir))
const pendingFileOf = (dataDir: string): string => path.join(dbFolderOf(dataDir), 'restore-pending.json')
const stagedFileOf = (dataDir: string): string => path.join(dbFolderOf(dataDir), 'restore-staging', 'data.db')
const previousFolderOf = (dataDir: string): string => path.join(dbFolderOf(dataDir), 'restore-previous')
const listFolder = (folder: string): string[] => (fs.existsSync(folder) ? fs.readdirSync(folder).sort() : [])

/** Starts the Main with the real backend and the probe page, up to the first load. */
async function startRun(dataDir: string): Promise<Run> {
  const { app, log } = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT }))
  const page = await app.firstWindow()
  await expect(page.locator('#done')).toBeVisible({ timeout: 90_000 })
  const baseUrl = await page.evaluate((name) => (window as unknown as Record<string, { backendBaseUrl: string }>)[name].backendBaseUrl, BRIDGE)
  return { app, log, page, baseUrl }
}

/** Closes the app the normal way: it must exit with 0 and leave no process of the
 * last backend behind. */
async function stopRun(run: Run): Promise<void> {
  const pids = run.log.backendPids()
  const tree = processTree(pids[pids.length - 1])
  const electronProcess = run.app.process()
  await run.app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
}

async function http(run: Run, method: string, route: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await fetch(`${run.baseUrl}${route}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await response.text()
  return { status: response.status, json: text === '' ? {} : JSON.parse(text) }
}

async function addClient(run: Run, name: string): Promise<void> {
  expect((await http(run, 'POST', '/clients', { client_input: { display_name: name, contacts: [], note: null } })).status).toBe(201)
}

async function clientNames(run: Run): Promise<string[]> {
  const listed = await fetch(`${run.baseUrl}/clients`)
  return ((await listed.json()) as Array<{ display_name: string }>).map((c) => c.display_name).sort()
}

/** The client names inside a database file, read with Python's sqlite3, read-only. */
function clientNamesIn(file: string): string[] {
  const script = [
    'import sys, json, sqlite3, pathlib',
    "c = sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri() + '?mode=ro', uri=True)",
    "print(json.dumps(sorted(r[0] for r in c.execute('select display_name from client'))))",
  ].join('\n')
  return JSON.parse(execFileSync(BACKEND_PYTHON, ['-c', script, file], { encoding: 'utf8' })) as string[]
}

async function invoke(run: Run, address: string, argument?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  return run.page.evaluate(
    async ({ name, address, argument }) => {
      const bridge = (window as unknown as Record<string, { invoke: (a: unknown, b?: unknown) => Promise<unknown> }>)[name]
      return (await bridge.invoke(address, argument)) as { status: number; body: Record<string, unknown> }
    },
    { name: BRIDGE, address, argument },
  )
}

/** Run 1 of the round trip: clients A and B, a backup, client C, then restore:prepare.
 * Leaves a pending restore for "A, B"; the live data is "A, B, C". */
async function runOnePrepare(dataDir: string, archiveDir: string): Promise<{ archivePath: string; safetyBackupPath: string }> {
  const run = await startRun(dataDir)
  await addClient(run, 'Khach A')
  await addClient(run, 'Khach B')
  const backup = await http(run, 'POST', '/backups', { backup_request: { destination_dir: archiveDir, purpose: 'manual' } })
  expect(backup.status).toBe(201)
  await addClient(run, 'Khach C')
  const archivePath = backup.json.archive_path as string
  const prepared = await invoke(run, 'restore:prepare', { archive_path: archivePath })
  expect(prepared.status).toBe(200)
  expect(fs.existsSync(pendingFileOf(dataDir))).toBe(true)
  expect(fs.existsSync(stagedFileOf(dataDir))).toBe(true)
  await stopRun(run)
  return { archivePath, safetyBackupPath: prepared.body.safety_backup_path as string }
}

/** The text the Main logged instead of showing the message box. */
function dialogText(log: LogCollector): { title: string; content: string } {
  const lines = log.lines(/restore dialog text: /)
  expect(lines, 'one restore dialog text line').toHaveLength(1)
  return JSON.parse(lines[0].slice(lines[0].indexOf('restore dialog text: ') + 'restore dialog text: '.length)) as { title: string; content: string }
}

const noFatal = (log: LogCollector): void => expect(log.text).not.toContain('FATAL')

test('A1. nothing pending: apply -> none, no dialog text, restore_trigger runs before the window opens', async () => {
  const dataDir = tempDataDir()
  const run = await startRun(dataDir)
  try {
    await log_waitFor(run.log, /restore_trigger: apply_pending_restore -> none/)
    expect(run.log.lines(/restore_data: apply -> none/)).toHaveLength(1)
    expect(run.log.lines(/restore dialog text/)).toHaveLength(0)
    const trigger = run.log.text.indexOf('restore_trigger: apply_pending_restore -> none')
    const opening = run.log.text.indexOf('opening the window')
    expect(trigger).toBeGreaterThanOrEqual(0)
    expect(opening).toBeGreaterThan(trigger)
    // The backend was neither stopped nor started again.
    expect(run.log.backendPids()).toHaveLength(1)
    noFatal(run.log)
  } finally {
    await stopRun(run)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})

async function log_waitFor(log: LogCollector, re: RegExp): Promise<void> {
  await log.waitFor(re, 30_000)
}

test('A2. the real round trip: run 1 prepares, run 2 (same data folder) has the archive data, the old file is kept, the backend came back on the same port without FATAL', async () => {
  const dataDir = tempDataDir()
  const archiveDir = tempFolder('ct-apply-archives-')
  try {
    const { archivePath, safetyBackupPath } = await runOnePrepare(dataDir, archiveDir)
    expect(fs.existsSync(previousFolderOf(dataDir))).toBe(false)

    const run = await startRun(dataDir)
    try {
      await log_waitFor(run.log, /restore_data: apply -> restored/)
      // Data: the archive's, not the live data of run 1.
      expect(await clientNames(run)).toEqual(['Khach A', 'Khach B'])
      // The message box text: both paths of the outcome.
      const text = dialogText(run.log)
      expect(text.title).toBe(DIALOG.title)
      expect(text.content).toContain(DIALOG.restored)
      expect(text.content).toContain(archivePath)
      expect(text.content).toContain(safetyBackupPath)
      // The record is gone; status says so.
      expect(fs.existsSync(pendingFileOf(dataDir))).toBe(false)
      expect(await invoke(run, 'restore:status', {})).toEqual({ status: 200, body: { pending: null } })
      // The replaced database is kept, with client C in it; the safety backup is still there.
      const previous = listFolder(previousFolderOf(dataDir))
      expect(previous).toHaveLength(1)
      expect(previous[0]).toMatch(/^data-\d{8}-\d{6}\.db$/)
      expect(clientNamesIn(path.join(previousFolderOf(dataDir), previous[0]))).toEqual(['Khach A', 'Khach B', 'Khach C'])
      expect(fs.existsSync(safetyBackupPath)).toBe(true)
      // backend_controller: two backends, the same port, the first one ended with 0, no unexpected exit.
      const ports = [...run.log.text.matchAll(/backend READY on port (\d+)/g)].map((m) => m[1])
      expect(ports).toHaveLength(2)
      expect(ports[1]).toBe(ports[0])
      expect(run.log.backendPids()).toHaveLength(2)
      expect(run.log.text).toContain(`backend_controller: starting the backend again on port ${ports[0]}`)
      expect(run.log.lines(/backend \(pid \d+\) exited with code 0/).length).toBeGreaterThanOrEqual(1)
      noFatal(run.log)
      expect(run.log.text).not.toContain('stopped unexpectedly')
      expect(run.log.text).toContain('opening the window')
      // Order: the outcome comes before the window.
      expect(run.log.text.indexOf('restore_trigger: apply_pending_restore -> restored')).toBeLessThan(run.log.text.indexOf('opening the window'))
    } finally {
      console.log(`A2 main log:\n${run.log.text}`)
      await stopRun(run)
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
    fs.rmSync(archiveDir, { recursive: true, force: true })
  }
})

test('A3a. discarded: the pending record is valid but the staged file is gone; the data is unchanged and the record is removed', async () => {
  const dataDir = tempDataDir()
  const archiveDir = tempFolder('ct-apply-archives-')
  try {
    const { archivePath } = await runOnePrepare(dataDir, archiveDir)
    fs.rmSync(stagedFileOf(dataDir))
    const run = await startRun(dataDir)
    try {
      await log_waitFor(run.log, /restore_data: apply -> discarded/)
      expect(await clientNames(run)).toEqual(['Khach A', 'Khach B', 'Khach C'])
      const text = dialogText(run.log)
      expect(text.content).toContain('Lần khôi phục đang chờ không còn dùng được')
      expect(text.content).toMatch(/Chi tiết: .*staged database file is gone/)
      expect(text.content).not.toContain('Dữ liệu trước đó được giữ nguyên')
      expect(fs.existsSync(pendingFileOf(dataDir))).toBe(false)
      expect(fs.existsSync(previousFolderOf(dataDir))).toBe(false)
      expect(run.log.backendPids()).toHaveLength(1) // never stopped
      expect(archivePath.length).toBeGreaterThan(0)
      noFatal(run.log)
    } finally {
      await stopRun(run)
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
    fs.rmSync(archiveDir, { recursive: true, force: true })
  }
})

test('A3b. discarded: the pending record is broken JSON; the data is unchanged and the record is removed', async () => {
  const dataDir = tempDataDir()
  const first = await startRun(dataDir)
  await addClient(first, 'Khach X')
  await stopRun(first)
  fs.writeFileSync(pendingFileOf(dataDir), '{this is not json')
  const run = await startRun(dataDir)
  try {
    await log_waitFor(run.log, /restore_data: apply -> discarded/)
    expect(await clientNames(run)).toEqual(['Khach X'])
    expect(dialogText(run.log).content).toMatch(/Chi tiết: the pending record cannot be read/)
    expect(fs.existsSync(pendingFileOf(dataDir))).toBe(false)
    expect(run.log.backendPids()).toHaveLength(1)
    noFatal(run.log)
  } finally {
    await stopRun(run)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})

test('A4. rolled back: the staged file is not a database, so the backend exits before READY; the old data is back, the bad file is kept with -failed, the record is gone, the third start is "none"', async () => {
  const dataDir = tempDataDir()
  const archiveDir = tempFolder('ct-apply-archives-')
  try {
    const { archivePath } = await runOnePrepare(dataDir, archiveDir)
    // Measured: the real backend exits with code 2 ("file is not a database") for a text file.
    fs.writeFileSync(stagedFileOf(dataDir), 'this is not a sqlite database at all')

    const run = await startRun(dataDir)
    try {
      await log_waitFor(run.log, /restore_data: apply -> rolled_back/)
      expect(await clientNames(run)).toEqual(['Khach A', 'Khach B', 'Khach C']) // the data from before
      const text = dialogText(run.log)
      expect(text.content).toContain('Không khôi phục được dữ liệu. Dữ liệu trước đó được giữ nguyên.')
      expect(text.content).toContain(archivePath)
      expect(text.content).toMatch(/Chi tiết: the backend did not start on the restored database \(it exited before READY \(exit code 2\)\)/)
      expect(fs.existsSync(pendingFileOf(dataDir))).toBe(false)
      const previous = listFolder(previousFolderOf(dataDir))
      expect(previous).toHaveLength(1)
      expect(previous[0]).toMatch(/^data-\d{8}-\d{6}-failed\.db$/)
      expect(fs.readFileSync(path.join(previousFolderOf(dataDir), previous[0]), 'utf8')).toBe('this is not a sqlite database at all')
      // Three backends: the first, the one that failed, the one on the old data.
      expect(run.log.backendPids()).toHaveLength(3)
      noFatal(run.log)
      expect(run.log.text).toContain('opening the window')
    } finally {
      await stopRun(run)
    }

    const third = await startRun(dataDir)
    try {
      await log_waitFor(third.log, /restore_trigger: apply_pending_restore -> none/)
      expect(third.log.lines(/restore dialog text/)).toHaveLength(0)
      expect(await clientNames(third)).toEqual(['Khach A', 'Khach B', 'Khach C'])
      noFatal(third.log)
    } finally {
      await stopRun(third)
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
    fs.rmSync(archiveDir, { recursive: true, force: true })
  }
})

test('A5. rolling back fails too: FATAL with the new sentence, exit code 1, the old data.db is back at its place, the record is gone, no backend left', async () => {
  const dataDir = tempDataDir()
  const dbFolder = dbFolderOf(dataDir)
  fs.mkdirSync(path.dirname(stagedFileOf(dataDir)), { recursive: true })
  fs.writeFileSync(dbFileOf(dataDir), 'OLD DATABASE')
  fs.writeFileSync(stagedFileOf(dataDir), 'STAGED DATABASE')
  fs.writeFileSync(
    pendingFileOf(dataDir),
    JSON.stringify({
      archive_path: path.join(dataDir, 'archive.ctbackup'),
      archive_app_version: '0.1.0',
      archive_created_at: '2026-10-08T09:00:00+07:00',
      safety_backup_path: path.join(dbFolder, 'safety-backups', 'safety.ctbackup'),
      prepared_at: '2026-10-08T09:01:00+07:00',
      staged_db_path: stagedFileOf(dataDir),
    }),
  )
  const main = spawnMain(mainArgs({ dataDir, fakeBackend: 'fake_backend_swap.py' }))
  const code = await waitForExit(main.child, 90_000)
  try {
    expect(code).toBe(config.main.failure_exit_code)
    expect(main.log.text).toMatch(/FATAL: Applying the pending restore failed: ERR_RESTORE_FAILED \(500\)/)
    const dialogLine = main.log.lines(/error dialog text: /)
    expect(dialogLine).toHaveLength(1)
    expect(dialogLine[0]).toContain('Dữ liệu trước đó đã được đưa về chỗ cũ')
    expect(main.log.text).not.toContain('opening the window')
    expect(main.log.text).not.toContain('restore dialog text')
    expect(main.log.text).toMatch(/restore_data: apply -> failed/)
    // Files: the old database is where it was; the one that was moved in is kept as -failed.
    expect(fs.readFileSync(dbFileOf(dataDir), 'utf8')).toBe('OLD DATABASE')
    expect(fs.existsSync(pendingFileOf(dataDir))).toBe(false)
    const previous = listFolder(previousFolderOf(dataDir))
    expect(previous).toHaveLength(1)
    expect(previous[0]).toMatch(/^data-\d{8}-\d{6}-failed\.db$/)
    expect(fs.readFileSync(path.join(previousFolderOf(dataDir), previous[0]), 'utf8')).toBe('STAGED DATABASE')
    // Three starts (first, restored, put back), no process left.
    expect(main.log.backendPids()).toHaveLength(3)
    expect(projectPythonProcesses().filter((r) => /fake_backend_swap/.test(r.CommandLine ?? ''))).toEqual([])
  } finally {
    console.log(`A5 main log:\n${main.log.text}`)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})

test('A6. two starts after one prepare: the first applies it ("restored"), the second finds nothing ("none") and keeps the same data', async () => {
  const dataDir = tempDataDir()
  const archiveDir = tempFolder('ct-apply-archives-')
  try {
    await runOnePrepare(dataDir, archiveDir)
    const second = await startRun(dataDir)
    try {
      await log_waitFor(second.log, /restore_data: apply -> restored/)
      expect(await clientNames(second)).toEqual(['Khach A', 'Khach B'])
    } finally {
      await stopRun(second)
    }
    const third = await startRun(dataDir)
    try {
      await log_waitFor(third.log, /restore_trigger: apply_pending_restore -> none/)
      expect(third.log.lines(/restore dialog text/)).toHaveLength(0)
      expect(third.log.backendPids()).toHaveLength(1)
      expect(await clientNames(third)).toEqual(['Khach A', 'Khach B'])
      expect(listFolder(previousFolderOf(dataDir))).toHaveLength(1)
      noFatal(third.log)
    } finally {
      await stopRun(third)
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
    fs.rmSync(archiveDir, { recursive: true, force: true })
  }
})
