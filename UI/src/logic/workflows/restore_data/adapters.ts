/**
 * Adapters of the interface workflow restore_data: one function per call made,
 * each sending exactly one call through the ipc_bridge Main hands over and
 * classifying the answer into a CallResult (i3-logic.md, Step I3.3):
 *   - readStatus: restore_data.get_restore_status, "restore:status";
 *   - pickArchive: native_dialogs.open_file, "dialog:open-file";
 *   - prepare: restore_data.request_restore, "restore:prepare";
 *   - cancel: restore_data.cancel_restore, "restore:cancel".
 * This workflow has no http_client: every call is form ipc. apply_pending_restore
 * is not here: only restore_trigger of the desktop calls it.
 *
 * An ipc answer is the object { status, body } of endpoint_forms.ipc, and its
 * status is the result label. The four outcomes of a call, in this order: the
 * Promise of invoke is rejected → unreachable (no answer was received: the
 * desktop refused the call, or its handler threw); the answer is not an object
 * { status, body }, or its status is not a label this entry declares →
 * contract_violation; a label declared with ref → the body must be the referenced
 * output → ok, else contract_violation; a label declared with code → the body must
 * be an error_body whose code is exactly that code → declared_error, else
 * contract_violation. There is no fifth kind.
 */
import { z } from 'zod'
import type { IpcBridge } from '../../shared/resources'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { RestoreDataConfigs } from './configs'
import type { FileChoice, PendingRestoreRecord, RestoreCancellation, RestoreRequest, RestoreStatusRecord } from './entities'

const WORKFLOW = 'restore_data'

type Read<T> = { ok: true; value: T } | { ok: false; reason: string }

type IpcEndpoint = { address: string; labels: Readonly<Record<string, string>> }

// Turn a Zod failure into a reason that names the field and the value path.
function readWith<T>(schema: z.ZodType<T>, body: unknown, what: string): Read<T> {
  const parsed = schema.safeParse(body)
  if (parsed.success) return { ok: true, value: parsed.data }
  const issues = parsed.error.issues.map((i) => `${i.path.length === 0 ? '(root)' : i.path.join('.')}: ${i.message}`)
  return { ok: false, reason: `${what}: ${issues.join('; ')}` }
}

export function createRestoreDataAdapters(ipc: IpcBridge, cfg: RestoreDataConfigs) {
  // Minimum check of every answer (Step I3.3): every committed field, primitive
  // types, null only where the contract says |null, formats.timestamp. These
  // answers carry no integer. z.object drops extra fields.
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')
  // data_schema.yaml 10.0.1 clause_a_common.types.pending_restore_record: both paths are
  // file_path (a string that is not empty), the version is a string, the two instants
  // are formats.timestamp.
  const pendingRestoreRecord: z.ZodType<PendingRestoreRecord> = z.object({
    archive_path: z.string().min(1),
    archive_app_version: z.string(),
    archive_created_at: timestamp,
    safety_backup_path: z.string().min(1),
    prepared_at: timestamp,
  })
  // restore_data.output_guaranteed.restore_status: object { pending: pending_restore_record|null }.
  const restoreStatus: z.ZodType<RestoreStatusRecord> = z.object({ pending: pendingRestoreRecord.nullable() })
  // restore_data.output_guaranteed.restore_cancellation: object { canceled: boolean }.
  const restoreCancellation: z.ZodType<RestoreCancellation> = z.object({ canceled: z.boolean() })
  // api_contract.yaml 5.0.0 clause_a_common.error_body: details is object|null,
  // and nothing more is checked inside it (its shape is not in the contract).
  const errorBody: z.ZodType<ErrorBody> = z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).nullable(),
  })
  // endpoint_forms.ipc: the reply is an object { status, body }; the status is the result label.
  const envelope = z.object({ status: z.number(), body: z.unknown() })
  // api_contract.yaml 5.0.0 cross_cutting.native_dialogs.entries.open_file, output 200:
  // the reply of endpoint_forms.ipc with body object { canceled: boolean, path: file_path|null }.
  // A cancelled dialog carries no path; a chosen file carries one (a string that is not empty).
  const openFileAnswer = z.object({
    status: z.literal(cfg.dialogs.openFile.okLabel),
    body: z.discriminatedUnion('canceled', [
      z.object({ canceled: z.literal(true), path: z.null() }),
      z.object({ canceled: z.literal(false), path: z.string().min(1) }),
    ]),
  })

  function unreachable<T>(reason: string): CallResult<T> {
    console.error(`[${WORKFLOW}] unreachable: ${reason}`)
    return { kind: 'unreachable', reason }
  }

  function violation<T>(reason: string): CallResult<T> {
    console.error(`[${WORKFLOW}] contract violation: ${reason}`)
    return { kind: 'contract_violation', reason }
  }

  // Send one ipc call. Only the rejection of the Promise is caught here (it is the
  // "no answer" of this call); a programming error elsewhere is not turned into a result.
  async function send(address: string, argument: unknown): Promise<{ sent: true; answer: unknown } | { sent: false; reason: string }> {
    try {
      return { sent: true, answer: await ipc.call(address, argument) }
    } catch (error) {
      return { sent: false, reason: `${address} was rejected: ${error instanceof Error ? error.message : String(error)}` }
    }
  }

  // One restore call, classified by the four steps above, in order.
  async function call<T>(name: string, ep: IpcEndpoint, argument: unknown, output: z.ZodType<T>, outputName: string): Promise<CallResult<T>> {
    const sent = await send(ep.address, argument)
    // 1. No answer at all.
    if (!sent.sent) return unreachable(sent.reason)
    // 2. Not the object { status, body }, or a label the contract does not declare for this entry.
    const reply = readWith(envelope, sent.answer, `${name} answer`)
    if (!reply.ok) return violation(reply.reason)
    const label = reply.value.status
    const key = String(label)
    if (!Object.hasOwn(ep.labels, key)) return violation(`label ${label} is not declared for ${name}`)
    const declared = ep.labels[key]
    // 3. A label declared with ref: the body must be the referenced output.
    if (declared === 'ok') {
      const data = readWith(output, reply.value.body, `${name} label ${label} ${outputName}`)
      return data.ok ? { kind: 'ok', label, data: data.value } : violation(data.reason)
    }
    // 4. A label declared with code: error_body carrying exactly that code.
    const err = readWith(errorBody, reply.value.body, `${name} label ${label} error_body`)
    if (!err.ok) return violation(err.reason)
    if (err.value.code !== declared) return violation(`${name} label ${label} error_body.code is ${err.value.code}, declared ${declared}`)
    return { kind: 'declared_error', label, error: err.value }
  }

  return {
    // get_restore_status: invoke('restore:status', {}).
    readStatus(): Promise<CallResult<RestoreStatusRecord>> {
      return call('get_restore_status', cfg.ipc.getRestoreStatus, {}, restoreStatus, 'restore_status')
    },

    // native_dialogs.open_file: invoke('dialog:open-file', { filters }). The dialog
    // declares no error label: its only label is 200.
    async pickArchive(): Promise<CallResult<FileChoice>> {
      const { address, okLabel } = cfg.dialogs.openFile
      const sent = await send(address, { filters: cfg.openFileFilters })
      if (!sent.sent) return unreachable(sent.reason)
      const read = readWith(openFileAnswer, sent.answer, `${address} answer`)
      return read.ok ? { kind: 'ok', label: okLabel, data: read.value.body } : violation(read.reason)
    },

    // request_restore: invoke('restore:prepare', { archive_path }).
    prepare(archivePath: string): Promise<CallResult<PendingRestoreRecord>> {
      const argument: RestoreRequest = { archive_path: archivePath }
      return call('request_restore', cfg.ipc.requestRestore, argument, pendingRestoreRecord, 'restore_scheduled')
    },

    // cancel_restore: invoke('restore:cancel', {}).
    cancel(): Promise<CallResult<RestoreCancellation>> {
      return call('cancel_restore', cfg.ipc.cancelRestore, {}, restoreCancellation, 'restore_cancellation')
    },
  }
}

export type RestoreDataAdapters = ReturnType<typeof createRestoreDataAdapters>
