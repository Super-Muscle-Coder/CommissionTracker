/**
 * Routers of restore_data: the workflow's only entry points, three ipc
 * handlers (api_contract.yaml clause_d_desktop.restore_data):
 *   request_restore     restore:prepare   argument { archive_path }
 *   get_restore_status  restore:status    argument {} (or none)
 *   cancel_restore      restore:cancel    argument {} (or none)
 * Each answers { status, body } (endpoint_forms.ipc).
 *
 * Only what the contract's types say is checked here: who the sender is, and
 * the format of the argument. Everything else is the Services' decision.
 * A call from a frame that must not call, or with an argument that the
 * contract gives no label for, is refused: the handler throws, so the promise
 * on the renderer side is rejected. A wrong archive_path is different: the
 * contract has label 400 for it, so it is an ordinary reply.
 *
 * The check of the sending frame is this workflow's own copy (the same rule as
 * native_dialogs): the two share no code, only the contract
 * (05-edge-cases.md, Step 5.3: a copy of a few lines is cheaper than a
 * dependency between a workflow and a cross-cutting component).
 *
 * ipcMain is handed in by the Main, so this file imports nothing at run time
 * and can be tried with a stand-in.
 */

import * as path from 'node:path'
import type { BrowserWindow, IpcMain, IpcMainInvokeEvent } from 'electron'
import type { ErrorBody, RestoreDataConfig, RestoreOutcome, RestoreReply } from './entities'
import type { RestoreDataService } from './services'

/** What an in_process call raises for a non-2xx label: the label and the
 * error_body (api_contract.yaml endpoint_forms.in_process). */
export class InProcessCallError extends Error {
  constructor(
    readonly label: number,
    readonly errorBody: ErrorBody,
  ) {
    super(`${errorBody.code} (${label}): ${errorBody.message}${errorBody.details === null ? '' : ` ${JSON.stringify(errorBody.details)}`}`)
    this.name = 'InProcessCallError'
  }
}

/** The in_process entry of this workflow, as a function the Main hands to the
 * one allowed caller (restore_trigger). */
export interface RestoreDataInProcess {
  /** apply_pending_restore: the outcome, or an InProcessCallError (500 ERR_RESTORE_FAILED). */
  applyPendingRestore(): Promise<RestoreOutcome>
}

export interface RestoreDataRoutersOptions {
  ipc: Pick<IpcMain, 'handle'>
  service: RestoreDataService
  config: RestoreDataConfig
  /** shared_values.ui_origin: the only origin whose frame may call. */
  uiOrigin: string
  /** The Main's window; null once it is closed. */
  getMainWindow: () => BrowserWindow | null
  log: (message: string) => void
}

/** Node's URL gives origin "null" for non-special schemes such as app:, so
 * the origin is rebuilt from protocol and host. */
function originOfUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

/** Why the call must be refused, or null: only the main window's frame whose
 * origin is ui_origin may call. */
export function senderProblem(facts: { senderIsMainWindow: boolean; frameUrl: string | null }, uiOrigin: string): string | null {
  if (!facts.senderIsMainWindow) return 'the sender is not the main window'
  if (facts.frameUrl === null) return 'the sending frame is unknown'
  const origin = originOfUrl(facts.frameUrl)
  if (origin !== uiOrigin) return `the sending frame's origin is ${origin === null ? 'unreadable' : origin}, not ${uiOrigin}`
  return null
}

/** restore:status and restore:cancel have no input: {} or no argument. */
export function emptyArgumentProblem(argument: unknown): string | null {
  if (argument === undefined) return null
  if (typeof argument === 'object' && argument !== null && !Array.isArray(argument) && Object.keys(argument).length === 0) return null
  return 'the argument is not an empty object'
}

/** restore:prepare: exactly { archive_path }, a non-empty absolute path
 * (clause_a_common.types.file_path). */
export function archivePathArgument(argument: unknown): { ok: true; archivePath: string } | { ok: false; message: string } {
  if (typeof argument !== 'object' || argument === null || Array.isArray(argument)) return { ok: false, message: 'the argument must be an object { archive_path }' }
  const keys = Object.keys(argument)
  if (keys.some((key) => key !== 'archive_path')) return { ok: false, message: 'the argument has a key other than archive_path' }
  const value = (argument as Record<string, unknown>).archive_path
  if (typeof value !== 'string' || value.length === 0) return { ok: false, message: 'archive_path must be a non-empty string' }
  if (value.includes('\0') || !path.isAbsolute(value)) return { ok: false, message: 'archive_path must be an absolute path' }
  return { ok: true, archivePath: value }
}

export function registerRestoreDataRouters(options: RestoreDataRoutersOptions): RestoreDataInProcess {
  const { ipc, service, config } = options

  /** One ipc entry: sender check first, then what the entry does. */
  const register = (address: string, run: (argument: unknown) => Promise<RestoreReply>): void => {
    ipc.handle(address, async (event: IpcMainInvokeEvent, argument: unknown): Promise<RestoreReply> => {
      const win = options.getMainWindow()
      const problem = senderProblem(
        { senderIsMainWindow: win !== null && event.sender === win.webContents, frameUrl: event.senderFrame?.url ?? null },
        options.uiOrigin,
      )
      if (problem !== null || win === null) {
        const reason = problem ?? 'there is no main window'
        options.log(`restore_data: ${address} refused: ${reason}`)
        throw new Error(`${address}: call refused (${reason})`)
      }
      const reply = await run(argument)
      options.log(`restore_data: ${address} -> ${reply.status}`)
      return reply
    })
  }

  const refuseArgument = (address: string, reason: string): never => {
    options.log(`restore_data: ${address} refused: ${reason}`)
    throw new Error(`${address}: call refused (${reason})`)
  }

  register(config.addresses.request_restore, async (argument) => {
    const checked = archivePathArgument(argument)
    if (!checked.ok) {
      return {
        status: config.labels.validation,
        body: {
          code: config.error_codes.validation,
          message: 'Invalid archive_path.',
          details: { errors: [{ loc: ['archive_path'], msg: checked.message }] },
        },
      }
    }
    return service.prepare(checked.archivePath)
  })

  register(config.addresses.get_restore_status, async (argument) => {
    const problem = emptyArgumentProblem(argument)
    if (problem !== null) return refuseArgument(config.addresses.get_restore_status, problem)
    return service.status()
  })

  register(config.addresses.cancel_restore, async (argument) => {
    const problem = emptyArgumentProblem(argument)
    if (problem !== null) return refuseArgument(config.addresses.cancel_restore, problem)
    return service.cancel()
  })

  // apply_pending_restore (in_process): no input, so nothing to check here.
  return {
    async applyPendingRestore(): Promise<RestoreOutcome> {
      const reply = await service.applyPending()
      if (reply.status !== config.labels.ok) throw new InProcessCallError(reply.status, reply.body as ErrorBody)
      return reply.body as RestoreOutcome
    },
  }
}
