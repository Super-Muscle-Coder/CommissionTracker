/**
 * Adapters of the interface workflow update_progress: one function per
 * endpoint called, each sending exactly one call through the http_client
 * resource and classifying the answer into a CallResult (i3-logic.md, Step
 * I3.3). list_commissions (manage_commission's endpoint) is called here too,
 * by this workflow's own function (ui_decomposition.md §2, I1.3).
 */
import { z } from 'zod'
import type { HttpClient, HttpMethod } from '../../shared/resources'
import { assertNever } from '../../shared/results'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { UpdateProgressConfigs } from './configs'
import type {
  CommissionList,
  Money,
  ProgressBoard,
  ProgressHistory,
  ProgressState,
  StageChange,
  StageKind,
  StageOptions,
} from './entities'

const WORKFLOW = 'update_progress'

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

// A real calendar date (formats.date gives the shape; this rejects 2026-02-30).
// Date.UTC works on integers in UTC, so no time zone can shift the day.
function isCalendarDate(v: string): boolean {
  const [y, m, d] = v.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

export function createUpdateProgressAdapters(http: HttpClient, cfg: UpdateProgressConfigs) {
  // Minimum check of every body (Step I3.3): every committed field, primitive
  // types, null only where the contract says |null, formats.id, formats.date,
  // formats.timestamp, stage_kind one of its four values, and every integer
  // a safe integer of JavaScript (clause_a_common: ±(2^53−1)). z.object drops
  // extra fields.
  const id = z.string().regex(cfg.formats.id, 'expected formats.id (lowercase UUID v4)')
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')
  const date = z.string().regex(cfg.formats.date, 'expected formats.date (YYYY-MM-DD)').refine(isCalendarDate, 'expected a real calendar date')
  const currencyCode = z.string().regex(cfg.formats.currencyCode, 'expected currency_code (ISO 4217 alphabetic code)')
  const safeInteger = z.number().refine(Number.isSafeInteger, 'expected an integer within ±(2^53−1)')
  // clause_a_common.types.stage_kind.
  const stageKind: z.ZodType<StageKind> = z.enum(cfg.stageKinds)
  // clause_a_common.types.money.
  const money: z.ZodType<Money> = z.object({ amount_minor: safeInteger, currency: currencyCode })

  // data_schema.yaml 8.0.1 update_progress.output_guaranteed.stage_options:
  // "list[object { stage: string, kind: stage_kind }] (ordered)". Never empty:
  // the contract counts a commission with no stage set as "the first stage of
  // the catalog" (progress_state, progress_entry_record), so the catalog has
  // a first stage; an empty one is a contract violation.
  const stageOptions: z.ZodType<StageOptions> = z.array(z.object({ stage: z.string(), kind: stageKind })).min(1, 'expected at least one stage (the first stage of the catalog)')
  // data_schema.yaml 8.0.1 update_progress.output_guaranteed.progress_state.
  const progressState: z.ZodType<ProgressState> = z.object({
    commission_id: id,
    current_stage: z.string(),
    stage_kind: stageKind,
    updated_at: timestamp.nullable(),
  })
  // data_schema.yaml 8.0.1 update_progress.output_guaranteed.progress_board
  // (clause_a_common.types.progress_entry_record).
  const progressBoard: z.ZodType<ProgressBoard> = z.array(z.object({ commission_id: id, current_stage: z.string(), stage_kind: stageKind }))
  // data_schema.yaml 8.0.1 update_progress.output_guaranteed.progress_history.
  const progressHistory: z.ZodType<ProgressHistory> = z.array(
    z.object({ from_stage: z.string().nullable(), to_stage: z.string(), note: z.string().nullable(), changed_at: timestamp }),
  )
  // data_schema.yaml 8.0.1 manage_commission.output_guaranteed.commission_list.
  const commissionList: z.ZodType<CommissionList> = z.array(
    z.object({
      commission_id: id,
      client_id: id,
      title: z.string(),
      agreed_price: money,
      deadline: date.nullable(),
      updated_at: timestamp,
    }),
  )
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

  // Fill each {name} segment of the address with its input, URL-encoded.
  function fill(path: string, inputs: Readonly<Record<string, string>>): string {
    return path.replace(/\{([a-z_]+)\}/g, (_, name: string) => {
      const value = inputs[name]
      if (value === undefined) throw new Error(`no value for path segment {${name}} of ${path}`)
      return encodeURIComponent(value)
    })
  }

  // One call, classified by the four steps of i3-logic.md Step I3.3, in order.
  async function call<T>(
    name: string,
    ep: Endpoint,
    pathInputs: Readonly<Record<string, string>>,
    body: unknown,
    output: z.ZodType<T>,
    outputName: string,
  ): Promise<CallResult<T>> {
    const t = await http.send(ep.method, fill(ep.path, pathInputs), { query: null, body })
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

  const eps = cfg.endpoints

  return {
    // get_stage: GET /commissions/{commission_id}/stage.
    getStage(commissionId: string): Promise<CallResult<ProgressState>> {
      return call('get_stage', eps.getStage, { commission_id: commissionId }, null, progressState, 'progress_state')
    },

    // get_stage_history: GET /commissions/{commission_id}/stage/history.
    getStageHistory(commissionId: string): Promise<CallResult<ProgressHistory>> {
      return call('get_stage_history', eps.getStageHistory, { commission_id: commissionId }, null, progressHistory, 'progress_history')
    },

    // change_stage: PUT /commissions/{commission_id}/stage, body { stage_change }.
    changeStage(commissionId: string, input: StageChange): Promise<CallResult<ProgressState>> {
      return call('change_stage', eps.changeStage, { commission_id: commissionId }, { stage_change: input }, progressState, 'progress_state')
    },

    // get_board: GET /progress/board, no input.
    getBoard(): Promise<CallResult<ProgressBoard>> {
      return call('get_board', eps.getBoard, {}, null, progressBoard, 'progress_board')
    },

    // list_stages: GET /progress/stages, no input.
    listStages(): Promise<CallResult<StageOptions>> {
      return call('list_stages', eps.listStages, {}, null, stageOptions, 'stage_options')
    },

    // manage_commission.list_commissions: GET /commissions, no input.
    listCommissions(): Promise<CallResult<CommissionList>> {
      return call('list_commissions', eps.listCommissions, {}, null, commissionList, 'commission_list')
    },
  }
}

export type UpdateProgressAdapters = ReturnType<typeof createUpdateProgressAdapters>
