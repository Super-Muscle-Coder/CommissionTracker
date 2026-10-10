// Desktop session 38 (DSK-26): step 8 of apply_pending_restore (f_restore.md section 3,
// "put the previous database back") has three jobs that can fail, and the person is told
// a different thing for each (9a, 9b, 9c).
//   U1-U3  Services with the real file system and scripted failures: 9a (the backend
//          does not start, 8c), 9b (8a: the moved-in file cannot be moved aside),
//          9c (8b: the previous file cannot be put back). Each: label, code,
//          rollback_stage, previous_database_path, the record is gone, where each file is,
//          and the sentence that the Main would show (Services -> Routers -> dialog).
//   U4-U6  The Main's choice of sentence (src/error_dialog.ts) with the real desktop.json:
//          each stage gives its own sentence with the right paths; a missing or unknown
//          stage gives the start-up sentence, which claims nothing about the data.
// No Electron, no backend process: the backend is a scripted controller. Temporary
// folders only; the user's real %APPDATA%\CommissionTracker is never touched.
import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildErrorDialog, restoreFailureContext, type ErrorDialogText } from '../src/error_dialog'
import { RestoreDataAdapters } from '../src/workflows/restore_data/adapters'
import type { BackendController, BackendStartResult, MoveFileOutcome, RestoreDataConfig, StoredPendingRecord } from '../src/workflows/restore_data/entities'
import { InProcessCallError, registerRestoreDataRouters } from '../src/workflows/restore_data/routers'
import { RestoreDataService } from '../src/workflows/restore_data/services'
import { config } from './helpers'

const restoreConfig: RestoreDataConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'configs', 'restore_data.json'), 'utf8'))
const TEXT: ErrorDialogText = config.main.error_dialog
const TITLE: string = config.main.error_dialog_title

/** moveFile calls are counted from 1 over the whole apply: 1 live -> aside,
 * 2 staged -> live, then the put-back: 3 = 8a (moved-in file aside), 4 = 8b (previous file back). */
const MOVE_8A = 3
const MOVE_8B = 4

class ScriptedAdapters extends RestoreDataAdapters {
  moveCalls = 0
  failMoveCall: number | null = null
  override async moveFile(from: string, to: string): Promise<MoveFileOutcome> {
    this.moveCalls++
    if (this.moveCalls === this.failMoveCall) return { kind: 'failed', reason: `scripted failure of rename #${this.moveCalls}` }
    return super.moveFile(from, to)
  }
}

/** A backend that never starts again: the first start (on the restored database) and
 * the second one (on the previous database) both fail. stop() does nothing. */
const neverStarts = (): BackendController & { starts: number } => {
  const controller = {
    starts: 0,
    stop: async (): Promise<void> => undefined,
    start: async (): Promise<BackendStartResult> => {
      controller.starts++
      return { kind: 'failed', reason: 'scripted: the backend does not start' }
    },
  }
  return controller
}

interface Setup {
  folder: string
  dbFilePath: string
  adapters: ScriptedAdapters
  service: RestoreDataService
  controller: ReturnType<typeof neverStarts>
}

async function setup(failMoveCall: number | null): Promise<Setup> {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-undo-'))
  const dbFilePath = path.join(folder, 'CommissionTracker', 'data.db')
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true })
  const stagedFile = path.join(path.dirname(dbFilePath), 'restore-staging', 'data.db')
  fs.mkdirSync(path.dirname(stagedFile), { recursive: true })
  fs.writeFileSync(dbFilePath, 'OLD DATABASE')
  fs.writeFileSync(stagedFile, 'STAGED DATABASE')
  const controller = neverStarts()
  const adapters = new ScriptedAdapters({ config: restoreConfig, dbFilePath, backendBaseUrl: 'http://127.0.0.1:9', backendController: controller })
  adapters.failMoveCall = failMoveCall
  const record: StoredPendingRecord = {
    archive_path: path.join(folder, 'archive.ctbackup'),
    archive_app_version: '0.1.0',
    archive_created_at: '2026-10-08T09:00:00+07:00',
    safety_backup_path: path.join(folder, 'safety.ctbackup'),
    prepared_at: '2026-10-08T09:01:00+07:00',
    staged_db_path: stagedFile,
  }
  expect(await adapters.writePendingRecord(record)).toEqual({ kind: 'written' })
  const service = new RestoreDataService(adapters, restoreConfig)
  return { folder, dbFilePath, adapters, service, controller }
}

/** Runs apply the way the Main does (through the in_process router) and returns the
 * error it raises. */
async function applyAndCatch(s: Setup): Promise<InProcessCallError> {
  const entry = registerRestoreDataRouters({
    ipc: { handle: () => undefined },
    service: s.service,
    config: restoreConfig,
    uiOrigin: config.boundary.ui_origin,
    getMainWindow: () => null,
    log: () => undefined,
  })
  const error: unknown = await entry.applyPendingRestore().then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(InProcessCallError)
  return error as InProcessCallError
}

const read = (file: string): string => fs.readFileSync(file, 'utf8')
const previousFolder = (s: Setup): string => path.join(path.dirname(s.dbFilePath), restoreConfig.files.previous_folder_name)
const previousFiles = (s: Setup): string[] => (fs.existsSync(previousFolder(s)) ? fs.readdirSync(previousFolder(s)).sort() : [])

test('U1 (9a). the backend does not start on the previous database (8c): stage start, the previous file is back at db_file_path', async () => {
  const s = await setup(null)
  try {
    const error = await applyAndCatch(s)
    expect(error.label).toBe(500)
    expect(error.errorBody.code).toBe('ERR_RESTORE_FAILED')
    expect(error.errorBody.details).toMatchObject({
      rollback_stage: 'start',
      previous_database_path: s.dbFilePath,
      rollback_reason: expect.stringMatching(/did not start on the previous database/),
    })
    expect(s.controller.starts).toBe(2) // on the restored database, then on the previous one
    expect(await s.adapters.readPendingRecord()).toEqual({ kind: 'none' })
    expect(read(s.dbFilePath)).toBe('OLD DATABASE')
    const files = previousFiles(s)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/-failed\.db$/)
    expect(read(path.join(previousFolder(s), files[0]))).toBe('STAGED DATABASE')
    const dialog = buildErrorDialog(TITLE, TEXT, 'restore_failed', error.message, restoreFailureContext(error.errorBody.details, s.dbFilePath))
    expect(dialog.content).toContain('Dữ liệu trước đó đã được đưa về chỗ cũ')
    expect(dialog.content).not.toContain('Đừng nhập dữ liệu mới')
  } finally {
    fs.rmSync(s.folder, { recursive: true, force: true })
  }
})

test('U2 (9b). the moved-in file cannot be moved aside (8a): stage move_failed_aside, the previous file stays in restore-previous, db_file_path holds the backup', async () => {
  const s = await setup(MOVE_8A)
  try {
    const error = await applyAndCatch(s)
    expect(error.label).toBe(500)
    expect(error.errorBody.code).toBe('ERR_RESTORE_FAILED')
    const details = error.errorBody.details as Record<string, string>
    expect(details.rollback_stage).toBe('move_failed_aside')
    expect(details.rollback_reason).toMatch(/could not be moved out of the way.*scripted failure of rename #3/)
    const files = previousFiles(s)
    expect(files).toHaveLength(1) // only the previous database; nothing was moved aside as -failed
    expect(files[0]).not.toMatch(/-failed/)
    const previous = path.join(previousFolder(s), files[0])
    expect(details.previous_database_path).toBe(previous)
    expect(read(previous)).toBe('OLD DATABASE')
    expect(read(s.dbFilePath)).toBe('STAGED DATABASE')
    expect(s.controller.starts).toBe(1) // the put-back stopped at 8a: no second start
    expect(await s.adapters.readPendingRecord()).toEqual({ kind: 'none' })
    const dialog = buildErrorDialog(TITLE, TEXT, 'restore_failed', error.message, restoreFailureContext(error.errorBody.details, s.dbFilePath))
    expect(dialog.content).toContain(previous)
    expect(dialog.content).toContain('dữ liệu của bản sao lưu')
    expect(dialog.content).not.toContain('đã được đưa về chỗ cũ')
  } finally {
    fs.rmSync(s.folder, { recursive: true, force: true })
  }
})

test('U3 (9c). the previous file cannot be put back (8b): stage move_back, db_file_path is empty, the dialog says where the data is and how to bring it back', async () => {
  const s = await setup(MOVE_8B)
  try {
    const error = await applyAndCatch(s)
    expect(error.label).toBe(500)
    expect(error.errorBody.code).toBe('ERR_RESTORE_FAILED')
    const details = error.errorBody.details as Record<string, string>
    expect(details.rollback_stage).toBe('move_back')
    expect(details.rollback_reason).toMatch(/previous database could not be put back.*scripted failure of rename #4/)
    const files = previousFiles(s)
    expect(files).toHaveLength(2) // the previous database and the moved-in file, set aside as -failed
    const kept = files.filter((f) => !/-failed/.test(f))
    const failed = files.filter((f) => /-failed/.test(f))
    expect(kept).toHaveLength(1)
    expect(failed).toHaveLength(1)
    const previous = path.join(previousFolder(s), kept[0])
    expect(details.previous_database_path).toBe(previous)
    expect(read(previous)).toBe('OLD DATABASE')
    expect(read(path.join(previousFolder(s), failed[0]))).toBe('STAGED DATABASE')
    expect(fs.existsSync(s.dbFilePath)).toBe(false) // the next start would make an empty database here
    expect(s.controller.starts).toBe(1)
    expect(await s.adapters.readPendingRecord()).toEqual({ kind: 'none' })
    const dialog = buildErrorDialog(TITLE, TEXT, 'restore_failed', error.message, restoreFailureContext(error.errorBody.details, s.dbFilePath))
    expect(dialog.content).toContain(previous)
    expect(dialog.content).toContain(s.dbFilePath)
    expect(dialog.content).toContain('không đưa được dữ liệu trước đó về chỗ cũ')
    expect(dialog.content).toContain('Đừng nhập dữ liệu mới')
    expect(dialog.content).toContain('dữ liệu trống')
  } finally {
    fs.rmSync(s.folder, { recursive: true, force: true })
  }
})

// --- the Main's choice of sentence ------------------------------------------------------

const OLD = 'C:\\Users\\An\\AppData\\Roaming\\CommissionTracker\\restore-previous\\data-20261009-101500.db'
const LIVE = 'C:\\Users\\An\\AppData\\Roaming\\CommissionTracker\\data.db'
const DETAIL = 'ERR_RESTORE_FAILED (500): the technical text'

function dialogFor(stage: string | null, previous: string | null): string {
  return buildErrorDialog(TITLE, TEXT, 'restore_failed', DETAIL, { rollbackStage: stage, previousDatabasePath: previous, dbFilePath: LIVE }).content
}

test('U4. each rollback_stage gives its own sentence, with the paths it needs, and the technical detail stays at the end', () => {
  const a = dialogFor('start', OLD)
  const b = dialogFor('move_failed_aside', OLD)
  const c = dialogFor('move_back', OLD)
  expect(new Set([a, b, c]).size).toBe(3)
  // 9a: the old data is where it was; no path is needed.
  expect(a).toContain('Dữ liệu trước đó đã được đưa về chỗ cũ')
  expect(a).not.toContain(OLD)
  // 9b: the path of the old file, and what the next start uses.
  expect(b).toContain(OLD)
  expect(b).toContain('Lần mở sau, ứng dụng sẽ dùng dữ liệu của bản sao lưu đã chọn')
  expect(b).not.toContain(LIVE)
  // 9c: both paths, the warning, the way back.
  expect(c).toContain(OLD)
  expect(c).toContain(LIVE)
  expect(c).toContain('Đừng nhập dữ liệu mới khi chưa đưa tệp đó về')
  expect(c).toContain('đóng ứng dụng')
  expect(c).toContain('data.db')
  for (const text of [a, b, c]) {
    expect(text).not.toMatch(/\{[a-z_]+\}/) // no placeholder left
    expect(text.endsWith(`${TEXT.detail_label}\n${DETAIL}`)).toBe(true)
  }
})

test('U5. a stage that is missing or unknown, or a stage without its path, gets the start-up sentence (it says nothing about where the data is)', () => {
  for (const content of [dialogFor(null, OLD), dialogFor('somewhere_else', OLD), dialogFor('move_back', null), dialogFor('move_failed_aside', null)]) {
    expect(content.startsWith(TEXT.startup_summary)).toBe(true)
  }
  expect(buildErrorDialog(TITLE, TEXT, 'restore_failed', DETAIL).content.startsWith(TEXT.startup_summary)).toBe(true)
  // The other two phases ignore the stage.
  expect(buildErrorDialog(TITLE, TEXT, 'startup', DETAIL).content.startsWith(TEXT.startup_summary)).toBe(true)
  const context = { rollbackStage: 'move_back', previousDatabasePath: OLD, dbFilePath: LIVE }
  expect(buildErrorDialog(TITLE, TEXT, 'running', DETAIL, context).content.startsWith(TEXT.running_summary)).toBe(true)
})

test('U6. details of the wrong type are read as missing; a path with "$&" is written as it is', () => {
  expect(restoreFailureContext(null, LIVE)).toEqual({ rollbackStage: null, previousDatabasePath: null, dbFilePath: LIVE })
  expect(restoreFailureContext('text', LIVE)).toEqual({ rollbackStage: null, previousDatabasePath: null, dbFilePath: LIVE })
  expect(restoreFailureContext({ rollback_stage: 7, previous_database_path: ['x'] }, LIVE)).toEqual({ rollbackStage: null, previousDatabasePath: null, dbFilePath: LIVE })
  expect(restoreFailureContext({ rollback_stage: 'move_back', previous_database_path: OLD, reason: 'x' }, LIVE)).toEqual({ rollbackStage: 'move_back', previousDatabasePath: OLD, dbFilePath: LIVE })
  const odd = 'C:\\data $& $1 $`\\data-1.db'
  expect(dialogFor('move_back', odd)).toContain(odd)
})
