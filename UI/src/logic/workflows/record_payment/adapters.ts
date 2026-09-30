/**
 * Adapters of the interface workflow record_payment: one function per
 * endpoint called, each sending exactly one call through the http_client
 * resource and classifying the answer into a CallResult (i3-logic.md, Step
 * I3.3): get_balance, list_for_commission, record, void_payment.
 */
import { z } from 'zod'
import type { HttpClient, HttpMethod } from '../../shared/resources'
import { assertNever } from '../../shared/results'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { RecordPaymentConfigs } from './configs'
import type { CommissionBalance, Money, PaymentInput, PaymentList, PaymentRecord } from './entities'

const WORKFLOW = 'record_payment'

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

export function createRecordPaymentAdapters(http: HttpClient, cfg: RecordPaymentConfigs) {
  // Minimum check of every body (Step I3.3): every committed field, primitive
  // types, null only where the contract says |null, formats.id,
  // formats.timestamp, currency_code, direction and kind one of their listed
  // values, and every integer a safe integer of JavaScript within the
  // contract's range (clause_a_common: ±(2^53−1)) — checked right after JSON
  // parsing, the only place a silently rounded integer can be caught.
  // z.object drops extra fields.
  const id = z.string().regex(cfg.formats.id, 'expected formats.id (lowercase UUID v4)')
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')
  const currencyCode = z.string().regex(cfg.formats.currencyCode, 'expected currency_code (ISO 4217 alphabetic code)')
  const safeInteger = z.number().refine(Number.isSafeInteger, 'expected an integer within ±(2^53−1)')
  // clause_a_common.types.money.
  const money: z.ZodType<Money> = z.object({ amount_minor: safeInteger, currency: currencyCode })
  // clause_a_common.types.payment_record.
  const paymentRecord: z.ZodType<PaymentRecord> = z.object({
    payment_id: id,
    commission_id: id,
    direction: z.enum(cfg.directions),
    kind: z.enum(cfg.paymentKinds),
    amount: money,
    method: z.string(),
    paid_at: timestamp,
    note: z.string().nullable(),
    is_voided: z.boolean(),
  })
  // data_schema.yaml 9.0.0 record_payment.output_guaranteed.payment_list.
  const paymentList: z.ZodType<PaymentList> = z.array(paymentRecord)
  // data_schema.yaml 9.0.0 record_payment.output_guaranteed.commission_balance.
  const commissionBalance: z.ZodType<CommissionBalance> = z.object({
    commission_id: id,
    agreed: money,
    received_net: money,
    outstanding: money,
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
    inputs: { path: Readonly<Record<string, string>>; query: Record<string, string> | null; body: unknown },
    output: z.ZodType<T>,
    outputName: string,
  ): Promise<CallResult<T>> {
    const t = await http.send(ep.method, fill(ep.path, inputs.path), { query: inputs.query, body: inputs.body })
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
    // get_balance: GET /payments/balance/{commission_id}.
    getBalance(commissionId: string): Promise<CallResult<CommissionBalance>> {
      return call('get_balance', eps.getBalance, { path: { commission_id: commissionId }, query: null, body: null }, commissionBalance, 'commission_balance')
    },

    // list_for_commission: GET /payments?commission_id=… (the input is not in the path, so it is on the query).
    listForCommission(commissionId: string): Promise<CallResult<PaymentList>> {
      return call('list_for_commission', eps.listForCommission, { path: {}, query: { commission_id: commissionId }, body: null }, paymentList, 'payment_list')
    },

    // record: POST /payments, body { commission_id, payment_input }.
    record(commissionId: string, input: PaymentInput): Promise<CallResult<PaymentRecord>> {
      return call('record', eps.record, { path: {}, query: null, body: { commission_id: commissionId, payment_input: input } }, paymentRecord, 'payment')
    },

    // void_payment: PUT /payments/{payment_id}/void, no other input.
    voidPayment(paymentId: string): Promise<CallResult<PaymentRecord>> {
      return call('void_payment', eps.voidPayment, { path: { payment_id: paymentId }, query: null, body: null }, paymentRecord, 'payment')
    },
  }
}

export type RecordPaymentAdapters = ReturnType<typeof createRecordPaymentAdapters>
