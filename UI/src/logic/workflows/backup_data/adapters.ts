/**
 * Adapters of the interface workflow backup_data: one function per call made,
 * each sending exactly one call through a resource Main hands over and
 * classifying the answer into a CallResult (i3-logic.md, Step I3.3):
 *   - pickFolder: native_dialogs.pick_folder, form ipc, through ipc_bridge;
 *   - createBackup: create_backup, POST /backups, through http_client.
 * prepare_restore is not here: only restore_data calls it (api_contract.yaml 4.0.0).
 *
 * An ipc call has no label to classify, so its four outcomes are: the Promise
 * of invoke answers a value of the declared shape → ok; it answers anything else
 * → contract_violation; it is rejected → unreachable (no answer was received:
 * the dialog threw, or the desktop refused the call). There is no fifth kind.
 */
import { z } from 'zod'
import type { HttpClient, HttpMethod, IpcBridge } from '../../shared/resources'
import { assertNever } from '../../shared/results'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { BackupDataConfigs } from './configs'
import type { BackupArchiveRecord, BackupRequestRecord, FolderChoice } from './entities'

const WORKFLOW = 'backup_data'

type Read<T> = { ok: true; value: T } | { ok: false; reason: string }

type Endpoint = { method: HttpMethod; path: string; labels: Readonly<Record<string, string>> }

// Turn a Zod failure into a reason that names the field and the value path.
function readWith<T>(schema: z.ZodType<T>, body: unknown, what: string): Read<T> {
  if (body === null) return { ok: false, reason: `${what}: body is empty or not JSON` }
  const parsed = schema.safeParse(body)
  if (parsed.success) return { ok: true, value: parsed.data }
  const issues = parsed.error.issues.map((i) => `${i.path.length === 0 ? '(root)' : i.path.join('.')}: ${i.message}`)
  return { ok: false, reason: `${what}: ${issues.join('; ')}` }
}

export function createBackupDataAdapters(http: HttpClient, ipc: IpcBridge, cfg: BackupDataConfigs) {
  // Minimum check of every answer (Step I3.3): every committed field, primitive
  // types, null only where the contract says |null, formats.timestamp, and
  // every integer a safe integer of JavaScript within the contract's range
  // (clause_a_common: ±(2^53−1)) — checked right after JSON parsing, the only
  // place a silently rounded integer can be caught. z.object drops extra fields.
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')
  const sizeBytes = z
    .number()
    .refine(Number.isSafeInteger, 'expected an integer within ±(2^53−1)')
    .refine((v) => v >= 0, 'expected an integer >= 0')
  // data_schema.yaml 9.0.3 clause_a_common.types.backup_archive_record.
  const backupArchive: z.ZodType<BackupArchiveRecord> = z.object({
    archive_path: z.string().min(1),
    app_version: z.string(),
    size_bytes: sizeBytes,
    sha256: z.string(),
    created_at: timestamp,
  })
  // api_contract.yaml 4.0.0 cross_cutting.native_dialogs.entries.pick_folder, output
  // 200: the reply of endpoint_forms.ipc, object { status, body }, with body object
  // { canceled: boolean, path: file_path|null }. A cancelled dialog carries no path;
  // a chosen folder carries one (a string that is not empty).
  const pickFolderAnswer = z.object({
    status: z.literal(cfg.dialogs.pickFolder.okLabel),
    body: z.discriminatedUnion('canceled', [
      z.object({ canceled: z.literal(true), path: z.null() }),
      z.object({ canceled: z.literal(false), path: z.string().min(1) }),
    ]),
  })
  // api_contract.yaml 4.0.0 clause_a_common.error_body: details is object|null,
  // and nothing more is checked inside it (its shape is not in the contract).
  const errorBody: z.ZodType<ErrorBody> = z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).nullable(),
  })

  function unreachable<T>(reason: string): CallResult<T> {
    console.error(`[${WORKFLOW}] unreachable: ${reason}`)
    return { kind: 'unreachable', reason }
  }

  function violation<T>(reason: string): CallResult<T> {
    console.error(`[${WORKFLOW}] contract violation: ${reason}`)
    return { kind: 'contract_violation', reason }
  }

  // One http call, classified by the four steps of i3-logic.md Step I3.3, in order.
  async function call<T>(
    name: string,
    ep: Endpoint,
    body: unknown,
    output: z.ZodType<T>,
    outputName: string,
  ): Promise<CallResult<T>> {
    const t = await http.send(ep.method, ep.path, { query: null, body })
    switch (t.kind) {
      // 1. No response at all.
      case 'unreachable':
        return unreachable(t.reason)
      case 'response': {
        // 2. A label the contract does not declare for this endpoint.
        const key = String(t.label)
        if (!Object.hasOwn(ep.labels, key)) return violation(`label ${t.label} is not declared for ${name}`)
        const declared = ep.labels[key]
        // 3. A label declared with ref: the body must be the referenced output.
        if (declared === 'ok') {
          const data = readWith(output, t.body, `${name} label ${t.label} ${outputName}`)
          return data.ok ? { kind: 'ok', label: t.label, data: data.value } : violation(data.reason)
        }
        // 4. A label declared with code: error_body carrying exactly that code.
        const err = readWith(errorBody, t.body, `${name} label ${t.label} error_body`)
        if (!err.ok) return violation(err.reason)
        if (err.value.code !== declared) {
          return violation(`${name} label ${t.label} error_body.code is ${err.value.code}, declared ${declared}`)
        }
        return { kind: 'declared_error', label: t.label, error: err.value }
      }
      default:
        return assertNever(t)
    }
  }

  return {
    // native_dialogs.pick_folder: invoke('dialog:pick-folder', {}). Only the
    // rejection of the Promise is caught here (it is the "no answer" of this
    // call); a programming error elsewhere is not turned into a result.
    async pickFolder(): Promise<CallResult<FolderChoice>> {
      const { address, okLabel } = cfg.dialogs.pickFolder
      let answer: unknown
      try {
        answer = await ipc.call(address, {})
      } catch (error) {
        return unreachable(`${address} was rejected: ${error instanceof Error ? error.message : String(error)}`)
      }
      const read = readWith(pickFolderAnswer, answer, `${address} answer`)
      return read.ok ? { kind: 'ok', label: okLabel, data: read.value.body } : violation(read.reason)
    },

    // create_backup: POST /backups, body { backup_request }, purpose always 'manual'.
    createBackup(destinationDir: string): Promise<CallResult<BackupArchiveRecord>> {
      const request: BackupRequestRecord = { destination_dir: destinationDir, purpose: cfg.purpose }
      return call('create_backup', cfg.endpoints.createBackup, { backup_request: request }, backupArchive, 'backup_archive')
    },
  }
}

export type BackupDataAdapters = ReturnType<typeof createBackupDataAdapters>
