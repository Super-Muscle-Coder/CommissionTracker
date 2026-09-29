/**
 * Adapters of the interface workflow manage_commission: one function per
 * endpoint called, each sending exactly one call through the http_client
 * resource and classifying the answer into a CallResult (i3-logic.md, Step
 * I3.3). list_clients and get_client (manage_client's endpoints) are called
 * here too, by this workflow's own functions (ui_decomposition.md §2, I1.3).
 */
import { z } from 'zod'
import type { HttpClient, HttpMethod } from '../../shared/resources'
import { assertNever } from '../../shared/results'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { ManageCommissionConfigs } from './configs'
import type { ClientDetail, ClientList, CommissionDetail, CommissionInput, CommissionList, CurrencyOptions, Money } from './entities'

const WORKFLOW = 'manage_commission'

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

export function createManageCommissionAdapters(http: HttpClient, cfg: ManageCommissionConfigs) {
  // Minimum check of every body (Step I3.3): every committed field, primitive
  // types, null only where the contract says |null, formats.id, formats.date,
  // formats.timestamp, currency_code, and every integer a safe integer of
  // JavaScript within the contract's range (clause_a_common: ±(2^53−1)) —
  // checked right after JSON parsing, the only place a silently rounded
  // integer can be caught. z.object drops extra fields.
  const id = z.string().regex(cfg.formats.id, 'expected formats.id (lowercase UUID v4)')
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')
  const date = z.string().regex(cfg.formats.date, 'expected formats.date (YYYY-MM-DD)').refine(isCalendarDate, 'expected a real calendar date')
  const currencyCode = z.string().regex(cfg.formats.currencyCode, 'expected currency_code (ISO 4217 alphabetic code)')
  const safeInteger = z.number().refine(Number.isSafeInteger, 'expected an integer within ±(2^53−1)')
  // clause_a_common.types.money.
  const money: z.ZodType<Money> = z.object({ amount_minor: safeInteger, currency: currencyCode })

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
  // data_schema.yaml 8.0.1 manage_commission.output_guaranteed.commission_detail.
  const commissionDetail: z.ZodType<CommissionDetail> = z.object({
    commission_id: id,
    client_id: id,
    title: z.string(),
    description: z.string().nullable(),
    commission_type: z.string().nullable(),
    agreed_price: money,
    deadline: date.nullable(),
    reference_links: z.array(z.string()),
    created_at: timestamp,
    updated_at: timestamp,
  })
  // data_schema.yaml 8.0.1 manage_commission.output_guaranteed.currency_options.
  const currencyOptions: z.ZodType<CurrencyOptions> = z.array(currencyCode)
  // data_schema.yaml 8.0.1 manage_client.output_guaranteed.client_list.
  const clientList: z.ZodType<ClientList> = z.array(
    z.object({ client_id: id, display_name: z.string(), is_archived: z.boolean(), updated_at: timestamp }),
  )
  // data_schema.yaml 8.0.1 manage_client.output_guaranteed.client_detail.
  const clientDetail: z.ZodType<ClientDetail> = z.object({
    client_id: id,
    display_name: z.string(),
    contacts: z.array(z.object({ channel: z.string(), value: z.string() })),
    note: z.string().nullable(),
    is_archived: z.boolean(),
    created_at: timestamp,
    updated_at: timestamp,
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
    // list_commissions: GET /commissions, no input.
    listCommissions(): Promise<CallResult<CommissionList>> {
      return call('list_commissions', eps.listCommissions, {}, null, commissionList, 'commission_list')
    },

    // get_commission: GET /commissions/{commission_id}.
    getCommission(commissionId: string): Promise<CallResult<CommissionDetail>> {
      return call('get_commission', eps.getCommission, { commission_id: commissionId }, null, commissionDetail, 'commission_detail')
    },

    // create_commission: POST /commissions, body { commission_input }.
    createCommission(input: CommissionInput): Promise<CallResult<CommissionDetail>> {
      return call('create_commission', eps.createCommission, {}, { commission_input: input }, commissionDetail, 'commission_detail')
    },

    // edit_commission: PUT /commissions/{commission_id}, body { commission_input }.
    editCommission(commissionId: string, input: CommissionInput): Promise<CallResult<CommissionDetail>> {
      return call(
        'edit_commission',
        eps.editCommission,
        { commission_id: commissionId },
        { commission_input: input },
        commissionDetail,
        'commission_detail',
      )
    },

    // list_currencies: GET /currencies, no input.
    listCurrencies(): Promise<CallResult<CurrencyOptions>> {
      return call('list_currencies', eps.listCurrencies, {}, null, currencyOptions, 'currency_options')
    },

    // manage_client.list_clients: GET /clients, no input.
    listClients(): Promise<CallResult<ClientList>> {
      return call('list_clients', eps.listClients, {}, null, clientList, 'client_list')
    },

    // manage_client.get_client: GET /clients/{client_id}.
    getClient(clientId: string): Promise<CallResult<ClientDetail>> {
      return call('get_client', eps.getClient, { client_id: clientId }, null, clientDetail, 'client_detail')
    },
  }
}

export type ManageCommissionAdapters = ReturnType<typeof createManageCommissionAdapters>
