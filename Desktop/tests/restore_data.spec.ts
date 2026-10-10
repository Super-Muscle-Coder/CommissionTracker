// Desktop session 35: the workflow restore_data, phase 1 (prepare, status, cancel),
// and its three ipc entries (api_contract.yaml clause_d_desktop.restore_data).
// Parts:
//   R1  pure checks of the Routers, and the Adapters against a closed port and a
//       backend that never answers (no Electron);
//   R2-R12 the whole Main with the REAL backend and the probe page: backups made by
//       the real create_backup, prepared through invoke(), the live database checked
//       to be untouched; the failures built on real files;
//   R13-R15 the whole Main with a FAKE backend (tests/fixtures/fake_backend_restore.py)
//       for the answers a healthy backend does not give (500 from prepare_restore,
//       a wrong shape, 500 from create_backup).
// Every run uses a temporary data folder and no dialogs: the user's real
// %APPDATA%\CommissionTracker is never touched. The file dialog is replaced from the
// test by assigning dialog.showOpenDialog inside the Main (native_dialogs-EXP-003).
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as os from 'node:os'
import * as path from 'node:path'
import { RestoreDataAdapters } from '../src/workflows/restore_data/adapters'
import type { BackendController, PendingRestoreRecord, RestoreDataConfig } from '../src/workflows/restore_data/entities'
import { archivePathArgument, emptyArgumentProblem, senderProblem } from '../src/workflows/restore_data/routers'
import { RestoreDataService } from '../src/workflows/restore_data/services'
import { BACKEND_PYTHON, config, launchMain, type LogCollector, mainArgs, PROBE_ROOT, processTree, stillAlive, tempDataDir, waitForExit } from './helpers'

const restoreConfig: RestoreDataConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'configs', 'restore_data.json'), 'utf8'))
const UI_ORIGIN: string = config.boundary.ui_origin
const BRIDGE: string = config.boundary.renderer_bridge
const PREPARE = restoreConfig.addresses.request_restore
const STATUS = restoreConfig.addresses.get_restore_status
const CANCEL = restoreConfig.addresses.cancel_restore
const OPEN_FILE: string = config.native_dialogs.open_file.address
const FIVE_FIELDS = ['archive_app_version', 'archive_created_at', 'archive_path', 'prepared_at', 'safety_backup_path']
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/

/** R1b never applies a restore, so the lifecycle tool must not be called. */
const unusedController: BackendController = {
  stop: () => Promise.reject(new Error('the backend must not be stopped in this test')),
  start: () => Promise.reject(new Error('the backend must not be started in this test')),
}

function tempFolder(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

// --- R1: no Electron -----------------------------------------------------------------

test('R1a. Routers, pure checks: archive_path is exactly one absolute path; status and cancel take {} or nothing; only the main window with the ui_origin origin', () => {
  const absolute = path.join(os.tmpdir(), 'a.ctbackup')
  expect(archivePathArgument({ archive_path: absolute })).toEqual({ ok: true, archivePath: absolute })
  const wrong: unknown[] = [undefined, null, 'abc', [], 5, {}, { archive_path: 5 }, { archive_path: '' }, { archive_path: 'relative\\a.ctbackup' }, { archive_path: 'a.ctbackup' }, { archive_path: `${absolute}\0` }, { archive_path: absolute, extra: 1 }, { archive: absolute }]
  for (const argument of wrong) expect(archivePathArgument(argument), JSON.stringify(argument)).toMatchObject({ ok: false })

  expect(emptyArgumentProblem(undefined)).toBeNull()
  expect(emptyArgumentProblem({})).toBeNull()
  for (const bad of [{ x: 1 }, 'abc', null, [], 0]) expect(emptyArgumentProblem(bad), JSON.stringify(bad)).not.toBeNull()

  const ok = { senderIsMainWindow: true, frameUrl: `${UI_ORIGIN}/index.html` }
  expect(senderProblem(ok, UI_ORIGIN)).toBeNull()
  expect(senderProblem({ ...ok, senderIsMainWindow: false }, UI_ORIGIN)).toMatch(/not the main window/)
  expect(senderProblem({ ...ok, frameUrl: null }, UI_ORIGIN)).toMatch(/unknown/)
  for (const url of ['data:text/html,x', 'about:blank', 'http://commission-tracker/', 'app://other-host/', 'not a url']) {
    expect(senderProblem({ ...ok, frameUrl: url }, UI_ORIGIN), url).not.toBeNull()
  }
})

/** A TCP port nobody listens on. */
async function closedPort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
  })
}

test('R1b. Adapters: a closed port and a backend that never answers are failures with a reason (the Services turn them into 503 / 424); the pending file is read and written as a whole', async () => {
  const dbFolder = tempFolder('ct-restore-adapters-')
  const dbFilePath = path.join(dbFolder, 'data.db')
  const archive = path.join(dbFolder, 'x.ctbackup')
  fs.writeFileSync(archive, 'x')

  // Closed port: the connection is refused.
  const closed = new RestoreDataAdapters({ config: restoreConfig, dbFilePath, backendBaseUrl: `http://127.0.0.1:${await closedPort()}`, backendController: unusedController })
  expect(await closed.prepareRestore(archive)).toMatchObject({ kind: 'failed', reason: expect.stringMatching(/not reachable/) })
  expect(await closed.createSafetyBackup(dbFolder)).toMatchObject({ kind: 'failed', reason: expect.stringMatching(/not reachable/) })
  const service = new RestoreDataService(closed, restoreConfig)
  expect(await service.prepare(archive)).toMatchObject({ status: 503, body: { code: 'ERR_SERVICE_UNAVAILABLE', details: { reason: expect.stringMatching(/not reachable/) } } })

  // A server that accepts and never answers: the timeout of the Configs (shortened here) ends the wait.
  const silent = net.createServer(() => undefined)
  await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve))
  try {
    const shortWait: RestoreDataConfig = { ...restoreConfig, backend_requests: { ...restoreConfig.backend_requests, timeout_ms: 300 } }
    const slow = new RestoreDataAdapters({ config: shortWait, dbFilePath, backendBaseUrl: `http://127.0.0.1:${(silent.address() as net.AddressInfo).port}`, backendController: unusedController })
    const started = Date.now()
    expect(await slow.prepareRestore(archive)).toMatchObject({ kind: 'failed', reason: expect.stringMatching(/not reachable/) })
    expect(Date.now() - started).toBeLessThan(5000)
  } finally {
    silent.close()
  }

  // The pending file: absent, written, read back, unreadable forms, deleted.
  expect(await closed.readPendingRecord()).toEqual({ kind: 'none' })
  expect(await closed.deletePendingRecord()).toEqual({ kind: 'absent' })
  const record = {
    archive_path: archive,
    archive_app_version: '0.1.0',
    archive_created_at: '2026-10-08T09:00:00+07:00',
    safety_backup_path: path.join(dbFolder, 'safety.ctbackup'),
    prepared_at: closed.nowTimestamp(),
    staged_db_path: path.join(dbFolder, 'restore-staging', 'data.db'),
  }
  expect(record.prepared_at).toMatch(TIMESTAMP)
  expect(await closed.writePendingRecord(record)).toEqual({ kind: 'written' })
  expect(await closed.readPendingRecord()).toEqual({ kind: 'record', record })
  expect(fs.existsSync(`${closed.pendingFile}${restoreConfig.files.temp_suffix}`)).toBe(false)
  fs.writeFileSync(closed.pendingFile, '{not json')
  expect(await closed.readPendingRecord()).toMatchObject({ kind: 'unreadable' })
  fs.writeFileSync(closed.pendingFile, JSON.stringify({ archive_path: archive }))
  expect(await closed.readPendingRecord()).toMatchObject({ kind: 'unreadable' })
  expect(await closed.deletePendingRecord()).toEqual({ kind: 'deleted' })
  expect(await closed.deletePendingRecord()).toEqual({ kind: 'absent' })
  fs.rmSync(dbFolder, { recursive: true, force: true })
})

// --- helpers of the Main runs -----------------------------------------------------------

type Reply = { ok: true; value: { status: number; body: Record<string, unknown> } } | { ok: false; message: string }

/** invoke(address, argument) in the page: the answer, or the rejection. `argument`
 * is passed as given, undefined included. */
async function invokeIn(page: Page, address: unknown, argument?: unknown): Promise<Reply> {
  return page.evaluate(
    async ({ name, address, argument }) => {
      const bridge = (window as unknown as Record<string, { invoke: (a: unknown, b?: unknown) => Promise<unknown> }>)[name]
      try {
        return { ok: true as const, value: (await bridge.invoke(address, argument)) as { status: number; body: Record<string, unknown> } }
      } catch (err) {
        return { ok: false as const, message: err instanceof Error ? err.message : String(err) }
      }
    },
    { name: BRIDGE, address, argument },
  )
}

/** The answer of an entry that must have answered (not rejected). */
async function answer(page: Page, address: string, argument?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const reply = await invokeIn(page, address, argument)
  if (!reply.ok) throw new Error(`${address} was rejected: ${reply.message}`)
  return reply.value
}

async function closeCleanly(app: ElectronApplication, log: LogCollector): Promise<void> {
  const launcher = await log.waitFor(/backend started \(pid (\d+)\)/)
  const tree = processTree(Number(launcher[1]))
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
}

async function stubOpenDialog(app: ElectronApplication, filePaths: string[] | null): Promise<void> {
  await app.evaluate(({ dialog }, paths) => {
    const g = globalThis as unknown as { __openDialogOptions?: unknown[] }
    g.__openDialogOptions = []
    ;(dialog as unknown as { showOpenDialog: (...a: unknown[]) => Promise<unknown> }).showOpenDialog = async (...args: unknown[]) => {
      g.__openDialogOptions?.push(args[1])
      return paths === null ? { canceled: true, filePaths: [] } : { canceled: false, filePaths: paths }
    }
  }, filePaths)
}

// --- R2-R12: the real backend ---------------------------------------------------------------

test.describe.serial('restore_data with the real backend and the probe page', () => {
  let app: ElectronApplication
  let log: LogCollector
  let page: Page
  let dataDir: string
  let baseUrl: string
  let dbFolder: string
  let dbFile: string
  let safetyFolder: string
  let pendingFile: string
  let stagingFile: string
  let archiveDir: string

  const http = async (method: string, route: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> => {
    const response = await fetch(`${baseUrl}${route}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await response.text()
    return { status: response.status, json: text === '' ? {} : JSON.parse(text) }
  }
  const addClient = async (name: string): Promise<void> => {
    const created = await http('POST', '/clients', { client_input: { display_name: name, contacts: [], note: null } })
    expect(created.status).toBe(201)
  }
  const clientNames = async (): Promise<string[]> => {
    const listed = await fetch(`${baseUrl}/clients`)
    return ((await listed.json()) as Array<{ display_name: string }>).map((c) => c.display_name).sort()
  }
  const makeArchive = async (): Promise<{ archive_path: string; created_at: string; app_version: string }> => {
    const created = await http('POST', '/backups', { backup_request: { destination_dir: archiveDir, purpose: 'manual' } })
    expect(created.status).toBe(201)
    return created.json as { archive_path: string; created_at: string; app_version: string }
  }
  const safetyFiles = (): string[] => (fs.existsSync(safetyFolder) && fs.statSync(safetyFolder).isDirectory() ? fs.readdirSync(safetyFolder).sort() : [])
  const expectNothingPending = async (): Promise<void> => {
    expect(fs.existsSync(pendingFile)).toBe(false)
    expect(await answer(page, STATUS, {})).toEqual({ status: 200, body: { pending: null } })
  }

  test.beforeAll(async () => {
    dataDir = tempDataDir()
    archiveDir = tempFolder('ct-restore-archives-')
    ;({ app, log } = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT })))
    page = await app.firstWindow()
    await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })
    baseUrl = await page.evaluate((name) => (window as unknown as Record<string, { backendBaseUrl: string }>)[name].backendBaseUrl, BRIDGE)
    dbFile = path.join(dataDir, ...config.boundary.db_file_relative_to_app_data.split('/'))
    dbFolder = path.dirname(dbFile)
    safetyFolder = path.join(dbFolder, restoreConfig.files.safety_folder_name)
    pendingFile = path.join(dbFolder, restoreConfig.files.pending_file_name)
    stagingFile = path.join(dbFolder, 'restore-staging', 'data.db')
  })

  test.afterAll(async () => {
    console.log(`desktop main log:\n${log.text}`)
    await closeCleanly(app, log)
    fs.rmSync(archiveDir, { recursive: true, force: true })
  })

  test('R2. prepare succeeds: 200 with the five fields; the pending file and the safety backup exist; the live database is not changed', async () => {
    await addClient('Khach A')
    await addClient('Khach B')
    const archive = await makeArchive()
    await addClient('Khach C') // changed after the backup: the live data now differs from the archive
    expect(await clientNames()).toEqual(['Khach A', 'Khach B', 'Khach C'])
    const dbBefore = fs.statSync(dbFile)

    const before = Date.now()
    const reply = await answer(page, PREPARE, { archive_path: archive.archive_path })
    expect(reply.status).toBe(200)
    expect(Object.keys(reply.body).sort()).toEqual(FIVE_FIELDS)
    const record = reply.body as unknown as PendingRestoreRecord
    expect(record.archive_path).toBe(archive.archive_path)
    expect(record.archive_app_version).toBe(archive.app_version)
    expect(record.archive_created_at).toBe(archive.created_at)
    expect(record.prepared_at).toMatch(TIMESTAMP)
    expect(Math.abs(new Date(record.prepared_at).getTime() - before)).toBeLessThan(60_000)

    // The safety backup is in the workflow's own folder next to the live database file.
    expect(path.dirname(record.safety_backup_path)).toBe(safetyFolder)
    expect(path.basename(record.safety_backup_path)).toMatch(/pre_restore/)
    expect(fs.existsSync(record.safety_backup_path)).toBe(true)
    expect(safetyFiles()).toEqual([path.basename(record.safety_backup_path)])

    // The pending file holds the five fields and the internal staged file path.
    const stored = JSON.parse(fs.readFileSync(pendingFile, 'utf8')) as Record<string, string>
    expect(Object.keys(stored).sort()).toEqual([...FIVE_FIELDS, 'staged_db_path'].sort())
    expect(stored.staged_db_path).toBe(stagingFile)
    expect(fs.existsSync(stagingFile)).toBe(true)
    expect(fs.existsSync(`${pendingFile}${restoreConfig.files.temp_suffix}`)).toBe(false)

    // The live database and the running backend are untouched.
    expect(await clientNames()).toEqual(['Khach A', 'Khach B', 'Khach C'])
    expect(fs.existsSync(dbFile)).toBe(true)
    expect(fs.existsSync(`${dbFile}.lock`)).toBe(true)
    expect(fs.statSync(dbFile).ino).toBe(dbBefore.ino)
    expect(log.text).toContain(`restore_data: ${PREPARE} -> 200`)

    // The safety backup is a backup that backup_data itself accepts (this call
    // replaces backup_data's staging file; the next tests prepare again).
    const checked = await http('POST', '/backups/restore-preparations', { archive_path: record.safety_backup_path })
    expect(checked.status).toBe(200)
    expect(checked.json).toMatchObject({ is_valid: true, is_compatible: true })
    await answer(page, CANCEL, {})
  })

  test('R3. status and cancel: status has the five fields only; cancel true, then status null, then cancel false; the staging file and the safety backup stay', async () => {
    const archive = await makeArchive()
    const prepared = await answer(page, PREPARE, { archive_path: archive.archive_path })
    expect(prepared.status).toBe(200)
    const safetyBefore = safetyFiles()

    for (const argument of [{}, undefined]) {
      const status = await answer(page, STATUS, argument)
      expect(status.status).toBe(200)
      expect(Object.keys(status.body)).toEqual(['pending'])
      expect(status.body.pending).toEqual(prepared.body)
      expect(Object.keys(status.body.pending as object).sort()).toEqual(FIVE_FIELDS)
      expect(JSON.stringify(status.body)).not.toContain('staged_db_path')
    }

    expect(await answer(page, CANCEL, {})).toEqual({ status: 200, body: { canceled: true } })
    await expectNothingPending()
    expect(await answer(page, CANCEL, {})).toEqual({ status: 200, body: { canceled: false } })
    expect(await answer(page, CANCEL)).toEqual({ status: 200, body: { canceled: false } })
    expect(safetyFiles()).toEqual(safetyBefore)
    expect(fs.existsSync(stagingFile)).toBe(true)

    // status and cancel take {} or nothing: anything else is refused, not answered.
    for (const argument of [{ x: 1 }, 'abc', null, []]) {
      expect(await invokeIn(page, STATUS, argument), JSON.stringify(argument)).toEqual({ ok: false, message: expect.stringMatching(/call refused \(the argument is not an empty object\)/) })
      expect(await invokeIn(page, CANCEL, argument), JSON.stringify(argument)).toEqual({ ok: false, message: expect.stringMatching(/call refused \(the argument is not an empty object\)/) })
    }
  })

  test('R4. 409: a text file named .ctbackup, and an archive made by a newer app_version; nothing pending and no new safety backup', async () => {
    const safetyBefore = safetyFiles()
    const notABackup = path.join(archiveDir, 'not-a-backup.ctbackup')
    fs.writeFileSync(notABackup, 'this is only text')
    const first = await answer(page, PREPARE, { archive_path: notABackup })
    expect(first.status).toBe(409)
    expect(first.body).toMatchObject({ code: 'ERR_INCOMPATIBLE_BACKUP', message: expect.any(String), details: { reason: expect.stringMatching(/zip/) } })
    await expectNothingPending()
    expect(safetyFiles()).toEqual(safetyBefore)

    // A real archive whose manifest says app_version 9.9.9 (rewritten with Python's zipfile).
    const real = await makeArchive()
    const newer = path.join(archiveDir, 'newer.ctbackup')
    const rewrite = [
      'import sys, json, zipfile',
      'src, dst = sys.argv[1], sys.argv[2]',
      "zin = zipfile.ZipFile(src); zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)",
      'for item in zin.infolist():',
      '    data = zin.read(item.filename)',
      "    if item.filename == 'manifest.json':",
      "        manifest = json.loads(data); manifest['app_version'] = '9.9.9'; data = json.dumps(manifest, indent=2).encode('utf-8')",
      '    zout.writestr(item.filename, data)',
      'zout.close(); zin.close()',
    ].join('\n')
    execFileSync(BACKEND_PYTHON, ['-c', rewrite, real.archive_path, newer])
    const second = await answer(page, PREPARE, { archive_path: newer })
    expect(second.status).toBe(409)
    expect(second.body).toMatchObject({ code: 'ERR_INCOMPATIBLE_BACKUP', details: { reason: expect.stringMatching(/newer/) } })
    await expectNothingPending()
    expect(safetyFiles()).toEqual(safetyBefore)
  })

  test('R5. a new request replaces the old one: the latest prepare wins; a failed prepare leaves nothing pending (f_restore.md section 2, step 1)', async () => {
    const a = await makeArchive()
    await addClient('Khach D')
    const b = await makeArchive()
    expect((await answer(page, PREPARE, { archive_path: a.archive_path })).status).toBe(200)
    expect((await answer(page, PREPARE, { archive_path: b.archive_path })).status).toBe(200)
    const status = await answer(page, STATUS, {})
    expect((status.body.pending as PendingRestoreRecord).archive_path).toBe(b.archive_path)

    const broken = path.join(archiveDir, 'broken.ctbackup')
    fs.writeFileSync(broken, 'broken')
    const reply = await answer(page, PREPARE, { archive_path: broken })
    expect(reply.status).toBe(409)
    await expectNothingPending() // the valid pending restore of b is gone too
  })

  test('R6. 404 for a file that does not exist (and for a folder); 400 for a wrong argument is an ordinary reply and keeps an earlier pending restore', async () => {
    const missing = path.join(archiveDir, 'no-such-file.ctbackup')
    for (const target of [missing, archiveDir]) {
      const reply = await answer(page, PREPARE, { archive_path: target })
      expect(reply.status, target).toBe(404)
      expect(reply.body).toMatchObject({ code: 'ERR_NOT_FOUND', details: { archive_path: target } })
    }
    await expectNothingPending()

    const good = await makeArchive()
    const prepared = await answer(page, PREPARE, { archive_path: good.archive_path })
    expect(prepared.status).toBe(200)
    const safetyBefore = safetyFiles()
    const wrong: unknown[] = [undefined, null, 'abc', [], 5, {}, { archive_path: 5 }, { archive_path: '' }, { archive_path: 'relative\\x.ctbackup' }, { archive_path: good.archive_path, extra: 1 }]
    for (const argument of wrong) {
      const reply = await answer(page, PREPARE, argument)
      expect(reply.status, JSON.stringify(argument)).toBe(400)
      expect(reply.body).toMatchObject({ code: 'ERR_VALIDATION', details: { errors: [{ loc: ['archive_path'] }] } })
    }
    // 400 is decided before step 1: the earlier pending restore is still there, nothing new was made.
    expect(await answer(page, STATUS, {})).toEqual({ status: 200, body: { pending: prepared.body } })
    expect(safetyFiles()).toEqual(safetyBefore)
    await answer(page, CANCEL, {})
  })

  test('R7. 424 when the safety backup cannot be made: a FILE named safety-backups stands where the folder must be; nothing pending', async () => {
    const good = await makeArchive()
    fs.rmSync(safetyFolder, { recursive: true, force: true })
    fs.writeFileSync(safetyFolder, 'a file where the folder should be')
    try {
      const reply = await answer(page, PREPARE, { archive_path: good.archive_path })
      expect(reply.status).toBe(424)
      expect(reply.body).toMatchObject({ code: 'ERR_STORAGE_IO', details: { reason: expect.stringMatching(/EEXIST|ENOTDIR/) } })
      await expectNothingPending()
    } finally {
      fs.rmSync(safetyFolder, { force: true })
    }
    // Back to normal once the obstacle is gone.
    expect((await answer(page, PREPARE, { archive_path: good.archive_path })).status).toBe(200)
    await answer(page, CANCEL, {})
  })

  test('R8. 500 when the pending record cannot be written: a FOLDER named like its temporary file; the safety backup was made and stays; nothing pending', async () => {
    const good = await makeArchive()
    const safetyBefore = safetyFiles()
    const obstacle = `${pendingFile}${restoreConfig.files.temp_suffix}`
    fs.mkdirSync(obstacle)
    try {
      const reply = await answer(page, PREPARE, { archive_path: good.archive_path })
      expect(reply.status).toBe(500)
      expect(reply.body).toMatchObject({ code: 'ERR_STORAGE_IO', details: { reason: expect.any(String) } })
      // The failure came at step 5: the safety backup of step 4 exists.
      expect(safetyFiles()).toHaveLength(safetyBefore.length + 1)
      await expectNothingPending()
    } finally {
      fs.rmSync(obstacle, { recursive: true, force: true })
    }
  })

  test('R9. an unreadable pending file: status 500 (a folder, bad JSON, wrong shape); cancel removes a file but not a folder; prepare cannot clear a folder (500)', async () => {
    // A folder where the pending file should be.
    fs.mkdirSync(pendingFile)
    try {
      expect(await answer(page, STATUS, {})).toMatchObject({ status: 500, body: { code: 'ERR_STORAGE_IO' } })
      expect(await answer(page, CANCEL, {})).toMatchObject({ status: 500, body: { code: 'ERR_STORAGE_IO' } })
      const good = await makeArchive()
      const safetyBefore = safetyFiles()
      expect(await answer(page, PREPARE, { archive_path: good.archive_path })).toMatchObject({ status: 500, body: { code: 'ERR_STORAGE_IO' } })
      expect(safetyFiles()).toEqual(safetyBefore) // it failed at step 1, before any safety backup
    } finally {
      fs.rmSync(pendingFile, { recursive: true, force: true })
    }
    // Bad JSON, then JSON of the wrong shape.
    for (const content of ['{not json', JSON.stringify({ archive_path: 'x' }), JSON.stringify([1, 2])]) {
      fs.writeFileSync(pendingFile, content)
      expect(await answer(page, STATUS, {}), content).toMatchObject({ status: 500, body: { code: 'ERR_STORAGE_IO' } })
    }
    // cancel removes a file whatever it holds; the cleaning of a broken record belongs to phase 2.
    expect(await answer(page, CANCEL, {})).toEqual({ status: 200, body: { canceled: true } })
    await expectNothingPending()
  })

  test('R10. a frame that must not call is refused (the promise is rejected) and nothing is prepared: a data: page in the main window; a second window', async () => {
    const good = await makeArchive()
    const safetyBefore = safetyFiles()
    const mainWindow = await app.browserWindow(page)
    await mainWindow.evaluate((w) => w.loadURL('data:text/html,<title>other origin</title><p>other</p>'))
    // Wait for the data: page itself: calling evaluate while the navigation is still
    // settling destroys the execution context (seen under CPU load, DSK-27).
    await expect(page.locator('p')).toHaveText('other')
    try {
      for (const address of [PREPARE, STATUS, CANCEL]) {
        const reply = await invokeIn(page, address, address === PREPARE ? { archive_path: good.archive_path } : {})
        expect(reply, address).toEqual({ ok: false, message: expect.stringMatching(/call refused \(the sending frame's origin is data:\/\/, not app:\/\/commission-tracker\)/) })
      }
    } finally {
      await mainWindow.evaluate((w, url) => w.loadURL(url), `${UI_ORIGIN}/${config.renderer.entry_file}`)
    }
    await expect(page.locator('#done')).toBeVisible()
    await expectNothingPending()
    expect(safetyFiles()).toEqual(safetyBefore)

    // A second window with the right origin and the same preload.
    const args = config.preload.arguments
    const ipcAddresses = [PREPARE, STATUS, CANCEL].join(',')
    const secondWindow = app.waitForEvent('window')
    await app.evaluate(
      ({ BrowserWindow }, p) => {
        const w = new BrowserWindow({
          width: 400,
          height: 300,
          show: false,
          webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: p.preload, additionalArguments: p.additional },
        })
        void w.loadURL(p.url)
      },
      {
        preload: path.join(__dirname, '..', 'dist', 'preload.js'),
        url: `${UI_ORIGIN}/${config.renderer.entry_file}`,
        additional: [`${args.bridge_name}${BRIDGE}`, `${args.backend_base_url}${baseUrl}`, `${args.ipc_addresses}${ipcAddresses}`],
      },
    )
    const other = await secondWindow
    await other.waitForLoadState('load')
    for (const address of [PREPARE, STATUS, CANCEL]) {
      const reply = await invokeIn(other, address, address === PREPARE ? { archive_path: good.archive_path } : {})
      expect(reply, address).toEqual({ ok: false, message: expect.stringMatching(/call refused \(the sender is not the main window\)/) })
    }
    await other.close()
    await expectNothingPending()
    expect(safetyFiles()).toEqual(safetyBefore)
    expect(log.text).toContain(`restore_data: ${PREPARE} refused: the sender is not the main window`)
    // The main window still works.
    expect((await answer(page, STATUS, {})).status).toBe(200)
  })

  test('R11. restore:start was removed from the contract: the preload rejects it and nothing reaches the Main', async () => {
    expect(await invokeIn(page, 'restore:start', { archive_path: path.join(archiveDir, 'x.ctbackup') })).toEqual({ ok: false, message: expect.stringMatching(/ipc address not implemented: restore:start/) })
    expect(await invokeIn(page, 'restore:apply', {})).toEqual({ ok: false, message: expect.stringMatching(/ipc address not implemented/) })
  })

  test('R12. the probe page buttons: choose the backup file (filter .ctbackup), prepare, status, cancel', async () => {
    const archive = await makeArchive()
    await stubOpenDialog(app, [archive.archive_path])
    await page.getByRole('button', { name: 'Chọn tệp sao lưu' }).click()
    await expect(page.locator('#open-file-answer')).toContainText('"canceled":false')
    const options = await app.evaluate(() => (globalThis as unknown as { __openDialogOptions: unknown[] }).__openDialogOptions)
    expect(options).toEqual([{ properties: ['openFile'], title: config.native_dialogs.open_file.title, filters: [{ name: 'Tệp sao lưu Commission Tracker', extensions: ['ctbackup'] }] }])
    expect(OPEN_FILE).toBe('dialog:open-file')

    await page.getByRole('button', { name: 'Chuẩn bị khôi phục' }).click()
    await expect(page.locator('#restore-prepare-answer')).toContainText('"status":200')
    await page.getByRole('button', { name: 'Xem trạng thái' }).click()
    await expect(page.locator('#restore-status-answer')).toContainText(JSON.stringify(archive.archive_path).slice(1, -1))
    await page.getByRole('button', { name: 'Hủy khôi phục' }).click()
    await expect(page.locator('#restore-cancel-answer')).toContainText('"canceled":true')
    await page.getByRole('button', { name: 'Xem trạng thái' }).click()
    await expect(page.locator('#restore-status-answer')).toContainText('"pending":null')
    expect(await clientNames()).toEqual(['Khach A', 'Khach B', 'Khach C', 'Khach D']) // untouched by all of the above
  })
})

// --- R13-R15: a fake backend ------------------------------------------------------------------

/** Launches the Main with the fake backend and the given switches (CT_FAKE_RESTORE),
 * and runs the body on the probe page. */
async function withFakeBackend(switches: string, body: (page: Page, dbFolder: string, log: LogCollector) => Promise<void>): Promise<void> {
  const dataDir = tempDataDir()
  const { app, log } = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT, fakeBackend: 'fake_backend_restore.py' }), { CT_FAKE_RESTORE: switches })
  try {
    const page = await app.firstWindow()
    await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })
    const dbFolder = path.dirname(path.join(dataDir, ...config.boundary.db_file_relative_to_app_data.split('/')))
    await body(page, dbFolder, log)
    expect(log.text).not.toMatch(/FATAL/)
    await closeCleanly(app, log)
  } finally {
    console.log(`desktop main log:\n${log.text}`)
    await app.close().catch(() => undefined)
  }
}

const SOME_ARCHIVE = path.join(os.tmpdir(), 'whatever.ctbackup')

test('R13. 503 when prepare_restore answers 500: nothing pending, no safety backup folder made', async () => {
  await withFakeBackend('prepare500', async (page, dbFolder, log) => {
    const reply = await answer(page, PREPARE, { archive_path: SOME_ARCHIVE })
    expect(reply.status).toBe(503)
    expect(reply.body).toMatchObject({ code: 'ERR_SERVICE_UNAVAILABLE', details: { reason: expect.stringMatching(/answered 500 to prepare_restore/) } })
    expect(await answer(page, STATUS, {})).toEqual({ status: 200, body: { pending: null } })
    expect(fs.existsSync(path.join(dbFolder, restoreConfig.files.pending_file_name))).toBe(false)
    expect(fs.existsSync(path.join(dbFolder, restoreConfig.files.safety_folder_name))).toBe(false)
    expect(log.lines(/fake backend: POST \/backups -> /)).toEqual([])
  })
})

test('R14. 503 when prepare_restore answers 200 with an object of the wrong shape', async () => {
  await withFakeBackend('preparebad', async (page, dbFolder) => {
    const reply = await answer(page, PREPARE, { archive_path: SOME_ARCHIVE })
    expect(reply.status).toBe(503)
    expect(reply.body).toMatchObject({ code: 'ERR_SERVICE_UNAVAILABLE', details: { reason: expect.stringMatching(/unexpected shape/) } })
    expect(fs.existsSync(path.join(dbFolder, restoreConfig.files.pending_file_name))).toBe(false)
  })
})

test('R15. 424 when create_backup answers 500: the safety folder was made, nothing pending', async () => {
  await withFakeBackend('create500', async (page, dbFolder, log) => {
    const reply = await answer(page, PREPARE, { archive_path: SOME_ARCHIVE })
    expect(reply.status).toBe(424)
    expect(reply.body).toMatchObject({ code: 'ERR_STORAGE_IO', details: { reason: expect.stringMatching(/answered 500 to create_backup/) } })
    expect(fs.statSync(path.join(dbFolder, restoreConfig.files.safety_folder_name)).isDirectory()).toBe(true)
    expect(fs.existsSync(path.join(dbFolder, restoreConfig.files.pending_file_name))).toBe(false)
    expect(await answer(page, STATUS, {})).toEqual({ status: 200, body: { pending: null } })
    expect(log.lines(/fake backend: POST \/backups -> 500/)).toHaveLength(1)
  })
})
