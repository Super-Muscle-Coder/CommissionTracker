/**
 * Adapters of restore_data: the only place the workflow touches the outside
 * world. Each method does exactly one technical thing and decides nothing.
 *
 * - Two http calls to backup_data (the backend), by the addresses of
 *   api_contract.yaml clause_b_backend.backup_data.
 * - Folder and file operations on restore_data's own files, next to the live
 *   database file. The live database file and backup_data's staging file are
 *   never touched (05-edge-cases.md, Step 5.6; f_restore.md section 2).
 * - The clock.
 *
 * An I/O failure, a refused connection, a timeout or a reply of an unexpected
 * shape is reported as a { kind: 'failed' } outcome. Any other exception is a
 * programming error: it is thrown, never disguised as an outcome.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  BackupArchive,
  CreateBackupOutcome,
  DeletePendingOutcome,
  EnsureFolderOutcome,
  PrepareRestoreOutcome,
  ReadPendingOutcome,
  RestoreDataConfig,
  RestoreStaging,
  StoredPendingRecord,
  WritePendingOutcome,
} from './entities'

export interface RestoreDataAdaptersOptions {
  config: RestoreDataConfig
  /** environment_config: realizes shared_values.db_file_path (absolute). */
  dbFilePath: string
  /** environment_config: http://<loopback_host>:<port> of the backend. */
  backendBaseUrl: string
}

/** A file or folder operation that failed (permission, a name taken by
 * something else, disk…): Node gives these a string code. */
function isSystemError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && typeof (err as NodeJS.ErrnoException).code === 'string'
}

/** The backend did not answer: connection refused or reset, or the timeout. */
function isNetworkError(err: unknown): boolean {
  if (err instanceof DOMException) return err.name === 'TimeoutError' || err.name === 'AbortError'
  return err instanceof TypeError && err.message === 'fetch failed'
}

function describe(err: unknown): string {
  if (isSystemError(err)) return `${err.code}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isStringOrNull = (value: unknown): value is string | null => value === null || typeof value === 'string'

function asRestoreStaging(json: unknown): RestoreStaging | null {
  if (!isRecord(json)) return null
  const { archive_path, is_valid, is_compatible, app_version, created_at, reason, staged_db_path } = json
  if (typeof archive_path !== 'string' || typeof is_valid !== 'boolean' || typeof is_compatible !== 'boolean') return null
  if (!isStringOrNull(app_version) || !isStringOrNull(created_at) || !isStringOrNull(reason) || !isStringOrNull(staged_db_path)) return null
  return { archive_path, is_valid, is_compatible, app_version, created_at, reason, staged_db_path }
}

function asBackupArchive(json: unknown): BackupArchive | null {
  if (!isRecord(json)) return null
  const { archive_path, app_version, size_bytes, sha256, created_at } = json
  if (typeof archive_path !== 'string' || typeof app_version !== 'string' || typeof size_bytes !== 'number') return null
  if (typeof sha256 !== 'string' || typeof created_at !== 'string') return null
  return { archive_path, app_version, size_bytes, sha256, created_at }
}

function asStoredPendingRecord(json: unknown): StoredPendingRecord | null {
  if (!isRecord(json)) return null
  const { archive_path, archive_app_version, archive_created_at, safety_backup_path, prepared_at, staged_db_path } = json
  const all = [archive_path, archive_app_version, archive_created_at, safety_backup_path, prepared_at, staged_db_path]
  if (!all.every((value) => typeof value === 'string')) return null
  return {
    archive_path: archive_path as string,
    archive_app_version: archive_app_version as string,
    archive_created_at: archive_created_at as string,
    safety_backup_path: safety_backup_path as string,
    prepared_at: prepared_at as string,
    staged_db_path: staged_db_path as string,
  }
}

type HttpOutcome = { kind: 'response'; status: number; json: unknown } | { kind: 'unreachable'; reason: string }

export class RestoreDataAdapters {
  private readonly config: RestoreDataConfig
  private readonly backendBaseUrl: string
  /** <folder of the live database file>/<safety folder name> */
  readonly safetyFolder: string
  /** <folder of the live database file>/<pending file name> */
  readonly pendingFile: string

  constructor(options: RestoreDataAdaptersOptions) {
    this.config = options.config
    this.backendBaseUrl = options.backendBaseUrl
    const dataFolder = path.dirname(options.dbFilePath)
    this.safetyFolder = path.join(dataFolder, options.config.files.safety_folder_name)
    this.pendingFile = path.join(dataFolder, options.config.files.pending_file_name)
  }

  // --- backup_data over http ------------------------------------------------------

  private async postJson(request: { method: string; path: string }, body: unknown): Promise<HttpOutcome> {
    try {
      const response = await fetch(`${this.backendBaseUrl}${request.path}`, {
        method: request.method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.backend_requests.timeout_ms),
      })
      const text = await response.text()
      let json: unknown = null
      try {
        json = text === '' ? null : JSON.parse(text)
      } catch {
        json = null
      }
      return { kind: 'response', status: response.status, json }
    } catch (err) {
      if (isNetworkError(err)) return { kind: 'unreachable', reason: describe(err) }
      throw err
    }
  }

  /** backup_data.prepare_restore (404 and 200 are the only answers that mean
   * something; anything else, or no answer, is a failure). */
  async prepareRestore(archivePath: string): Promise<PrepareRestoreOutcome> {
    const outcome = await this.postJson(this.config.backend_requests.prepare_restore, { archive_path: archivePath })
    if (outcome.kind === 'unreachable') return { kind: 'failed', reason: `the backend is not reachable (${outcome.reason})` }
    if (outcome.status === 404) return { kind: 'not_found' }
    if (outcome.status !== 200) return { kind: 'failed', reason: `the backend answered ${outcome.status} to prepare_restore` }
    const staging = asRestoreStaging(outcome.json)
    if (staging === null) return { kind: 'failed', reason: 'the backend answered prepare_restore with an unexpected shape' }
    return { kind: 'staging', staging }
  }

  /** backup_data.create_backup with purpose pre_restore into destinationDir. */
  async createSafetyBackup(destinationDir: string): Promise<CreateBackupOutcome> {
    const outcome = await this.postJson(this.config.backend_requests.create_backup, {
      backup_request: { destination_dir: destinationDir, purpose: this.config.backend_requests.safety_backup_purpose },
    })
    if (outcome.kind === 'unreachable') return { kind: 'failed', reason: `the backend is not reachable (${outcome.reason})` }
    if (outcome.status !== 201) return { kind: 'failed', reason: `the backend answered ${outcome.status} to create_backup` }
    const archive = asBackupArchive(outcome.json)
    if (archive === null) return { kind: 'failed', reason: 'the backend answered create_backup with an unexpected shape' }
    return { kind: 'created', archive }
  }

  // --- restore_data's own files ----------------------------------------------------

  /** Creates the folder (and its parents) if it does not exist. */
  async ensureFolder(folder: string): Promise<EnsureFolderOutcome> {
    try {
      await fs.promises.mkdir(folder, { recursive: true })
      return { kind: 'ready' }
    } catch (err) {
      if (isSystemError(err)) return { kind: 'failed', reason: describe(err) }
      throw err
    }
  }

  async readPendingRecord(): Promise<ReadPendingOutcome> {
    let text: string
    try {
      text = await fs.promises.readFile(this.pendingFile, 'utf8')
    } catch (err) {
      if (isSystemError(err)) return err.code === 'ENOENT' ? { kind: 'none' } : { kind: 'unreadable', reason: describe(err) }
      throw err
    }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch (err) {
      return { kind: 'unreadable', reason: `the pending file is not JSON (${describe(err)})` }
    }
    const record = asStoredPendingRecord(json)
    return record === null ? { kind: 'unreadable', reason: 'the pending file does not hold a pending restore record' } : { kind: 'record', record }
  }

  /** Atomic: a temporary file next to it, flushed, then renamed over the real name. */
  async writePendingRecord(record: StoredPendingRecord): Promise<WritePendingOutcome> {
    const temp = `${this.pendingFile}${this.config.files.temp_suffix}`
    try {
      const handle = await fs.promises.open(temp, 'w')
      try {
        await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, 'utf8')
        await handle.sync()
      } finally {
        await handle.close()
      }
      await fs.promises.rename(temp, this.pendingFile)
      return { kind: 'written' }
    } catch (err) {
      if (isSystemError(err)) {
        await fs.promises.rm(temp, { force: true }).catch(() => undefined)
        return { kind: 'failed', reason: describe(err) }
      }
      throw err
    }
  }

  async deletePendingRecord(): Promise<DeletePendingOutcome> {
    try {
      await fs.promises.unlink(this.pendingFile)
      return { kind: 'deleted' }
    } catch (err) {
      if (isSystemError(err)) return err.code === 'ENOENT' ? { kind: 'absent' } : { kind: 'failed', reason: describe(err) }
      throw err
    }
  }

  // --- clock -----------------------------------------------------------------------

  /** Now as formats.timestamp: ISO 8601 with the machine's UTC offset. */
  nowTimestamp(): string {
    const d = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const offsetMinutes = -d.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? '+' : '-'
    const abs = Math.abs(offsetMinutes)
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
      `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
    )
  }
}
