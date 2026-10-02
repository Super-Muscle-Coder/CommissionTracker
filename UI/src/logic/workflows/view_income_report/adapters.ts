/**
 * Adapters of the interface workflow view_income_report: one function per
 * endpoint called, each sending exactly one call through the http_client
 * resource and classifying the answer into a CallResult (i3-logic.md, Step
 * I3.3): get_income_report.
 */
import { z } from 'zod'
import type { HttpClient, HttpMethod } from '../../shared/resources'
import { assertNever } from '../../shared/results'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { ViewIncomeReportConfigs } from './configs'
import type { IncomePeriod, IncomeReport } from './entities'

const WORKFLOW = 'view_income_report'

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

// YYYY-MM-DD that names a day of the calendar (30 February and month 13 do
// not). A year below 1 does not exist for the backend either.
function isCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  return day <= daysInMonth
}

export function createViewIncomeReportAdapters(http: HttpClient, cfg: ViewIncomeReportConfigs) {
  // Minimum check of the body (Step I3.3): every committed field, primitive
  // types, formats.date (a real day) for the two dates, formats.timestamp for
  // generated_at, currency_code, month as YYYY-MM, refunded_minor >= 0, and
  // every integer a safe integer of JavaScript within the contract's range
  // (clause_a_common: ±(2^53−1)) — checked right after JSON parsing, the only
  // place a silently rounded integer can be caught. The order of currencies
  // and of by_month is not checked (the interface keeps it as received).
  // z.object drops extra fields.
  const date = z
    .string()
    .regex(cfg.formats.date, 'expected formats.date (YYYY-MM-DD)')
    .refine(isCalendarDate, 'expected a real calendar day')
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')
  const currencyCode = z.string().regex(cfg.formats.currencyCode, 'expected currency_code (ISO 4217 alphabetic code)')
  const month = z.string().regex(cfg.formats.month, 'expected a month as YYYY-MM')
  const safeInteger = z.number().refine(Number.isSafeInteger, 'expected an integer within ±(2^53−1)')
  // data_schema.yaml 9.0.2 view_income_report.output_guaranteed.income_report.
  const incomeReport: z.ZodType<IncomeReport> = z.object({
    period_from: date,
    period_to: date,
    currencies: z.array(
      z.object({
        currency: currencyCode,
        received_net_minor: safeInteger,
        refunded_minor: safeInteger.refine((v) => v >= 0, 'expected refunded_minor >= 0'),
        outstanding_minor: safeInteger,
        by_month: z.array(z.object({ month, received_net_minor: safeInteger })),
      }),
    ),
    generated_at: timestamp,
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

  // One call, classified by the four steps of i3-logic.md Step I3.3, in order.
  async function call<T>(
    name: string,
    ep: Endpoint,
    query: Record<string, string> | null,
    output: z.ZodType<T>,
    outputName: string,
  ): Promise<CallResult<T>> {
    const t = await http.send(ep.method, ep.path, { query, body: null })
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
    // get_income_report: GET /reports/income?period_from=…&period_to=… (both inputs on the query).
    getIncomeReport(period: IncomePeriod): Promise<CallResult<IncomeReport>> {
      return call(
        'get_income_report',
        cfg.endpoints.getIncomeReport,
        { period_from: period.period_from, period_to: period.period_to },
        incomeReport,
        'income_report',
      )
    },
  }
}

export type ViewIncomeReportAdapters = ReturnType<typeof createViewIncomeReportAdapters>
