/**
 * Adapters of the interface workflow manage_client: one function per endpoint
 * called, each sending exactly one call through the http_client resource and
 * classifying the answer into a CallResult (i3-logic.md, Step I3.3).
 */
import { z } from 'zod'
import type { HttpClient, HttpMethod } from '../../shared/resources'
import { assertNever } from '../../shared/results'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { ManageClientConfigs } from './configs'
import type { ClientDetail, ClientInput, ClientList } from './entities'

const WORKFLOW = 'manage_client'

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

export function createManageClientAdapters(http: HttpClient, cfg: ManageClientConfigs) {
  // Minimum check of every body (Step I3.3): every committed field, primitive
  // types, null only where the contract says |null, formats.id and
  // formats.timestamp. z.object drops extra fields. No output of this
  // workflow carries an integer, so there is no safe-integer check here.
  const id = z.string().regex(cfg.formats.id, 'expected formats.id (lowercase UUID v4)')
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')

  // data_schema.yaml 7.0.0 manage_client.output_guaranteed.client_list.
  const clientList: z.ZodType<ClientList> = z.array(
    z.object({ client_id: id, display_name: z.string(), is_archived: z.boolean(), updated_at: timestamp }),
  )
  // data_schema.yaml 7.0.0 manage_client.output_guaranteed.client_detail.
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
    // list_clients: GET /clients, no input.
    listClients(): Promise<CallResult<ClientList>> {
      return call('list_clients', eps.listClients, {}, null, clientList, 'client_list')
    },

    // get_client: GET /clients/{client_id}.
    getClient(clientId: string): Promise<CallResult<ClientDetail>> {
      return call('get_client', eps.getClient, { client_id: clientId }, null, clientDetail, 'client_detail')
    },

    // create_client: POST /clients, body { client_input }.
    createClient(input: ClientInput): Promise<CallResult<ClientDetail>> {
      return call('create_client', eps.createClient, {}, { client_input: input }, clientDetail, 'client_detail')
    },

    // edit_client: PUT /clients/{client_id}, body { client_input }.
    editClient(clientId: string, input: ClientInput): Promise<CallResult<ClientDetail>> {
      return call('edit_client', eps.editClient, { client_id: clientId }, { client_input: input }, clientDetail, 'client_detail')
    },

    // set_client_archived: PUT /clients/{client_id}/archived, body { is_archived }.
    setClientArchived(clientId: string, isArchived: boolean): Promise<CallResult<ClientDetail>> {
      return call(
        'set_client_archived',
        eps.setClientArchived,
        { client_id: clientId },
        { is_archived: isArchived },
        clientDetail,
        'client_detail',
      )
    },
  }
}

export type ManageClientAdapters = ReturnType<typeof createManageClientAdapters>
