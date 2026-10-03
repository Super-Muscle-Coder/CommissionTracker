/**
 * Adapters of the interface workflow send_reminder: one function per endpoint
 * called, each sending exactly one call through the http_client resource and
 * classifying the answer into a CallResult (i3-logic.md, Step I3.3):
 * list_pending, acknowledge, get_settings, edit_settings. check_due is not
 * here: only reminder_ticker calls it (api_contract.yaml 4.0.0).
 */
import { z } from 'zod'
import type { HttpClient, HttpMethod } from '../../shared/resources'
import { assertNever } from '../../shared/results'
import type { CallResult, ErrorBody } from '../../shared/results'
import type { SendReminderConfigs } from './configs'
import type { NotificationAck, PendingNotifications, ReminderSettings, ReminderSettingsRecord } from './entities'

const WORKFLOW = 'send_reminder'

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

export function createSendReminderAdapters(http: HttpClient, cfg: SendReminderConfigs) {
  // Minimum check of every body (Step I3.3): every committed field, primitive
  // types, null only where the contract says |null, the shape that goes with
  // each kind of reminder (a 'deadline' has deadline_item and no digest, a
  // 'periodic_digest' the opposite), formats.id, formats.timestamp,
  // formats.date (a real day), the closed lists of values, the rules of
  // reminder_settings_record, and every integer a safe integer of JavaScript
  // within the contract's range (clause_a_common: ±(2^53−1)) — checked right
  // after JSON parsing, the only place a silently rounded integer can be
  // caught. z.object drops extra fields.
  const id = z.string().regex(cfg.formats.id, 'expected formats.id (lowercase UUID v4)')
  const timestamp = z
    .string()
    .regex(cfg.formats.timestamp, 'expected formats.timestamp (ISO 8601 with UTC offset)')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'expected a real point in time')
  const date = z
    .string()
    .regex(cfg.formats.date, 'expected formats.date (YYYY-MM-DD)')
    .refine(isCalendarDate, 'expected a real calendar day')
  const safeInteger = z.number().refine(Number.isSafeInteger, 'expected an integer within ±(2^53−1)')
  const positiveInteger = safeInteger.refine((v) => v >= 1, 'expected an integer >= 1')
  // reminder_settings_record.deadline.lead_times[]. The bound of its duration is a rule of the list (below).
  const leadTime = z.object({ amount: positiveInteger, unit: z.enum(cfg.leadUnits) })
  const { leadTimes, weekday } = cfg.limits
  const hoursOf = (l: { amount: number; unit: string }) => (l.unit === 'days' ? l.amount * leadTimes.hoursPerDay : l.amount)
  // clause_a_common.types.reminder_settings_record, rule by rule.
  const settingsRecord: z.ZodType<ReminderSettingsRecord> = z
    .object({
      periodic: z.object({
        enabled: z.boolean(),
        every: positiveInteger,
        unit: z.enum(cfg.periodicUnits),
        at_time: z.string().regex(cfg.formats.atTime, 'expected HH:MM, 00:00..23:59'),
        weekday: safeInteger.nullable(),
      }),
      deadline: z.object({
        enabled: z.boolean(),
        lead_times: z.array(leadTime).min(leadTimes.min).max(leadTimes.max),
      }),
    })
    .superRefine((s, ctx) => {
      // weekday: 1..7 and required when unit = 'weeks'; null when unit = 'days'.
      const wd = s.periodic.weekday
      if (s.periodic.unit === 'weeks') {
        if (wd === null || wd < weekday.min || wd > weekday.max) ctx.addIssue({ code: 'custom', path: ['periodic', 'weekday'], message: `expected ${weekday.min}..${weekday.max} when unit is weeks` })
      } else if (wd !== null) {
        ctx.addIssue({ code: 'custom', path: ['periodic', 'weekday'], message: 'expected null when unit is days' })
      }
      // lead_times: each at most 365 days / 8760 hours; no two of the same duration.
      const seen = new Set<number>()
      s.deadline.lead_times.forEach((l, i) => {
        const hours = hoursOf(l)
        if (hours > leadTimes.maxHours) ctx.addIssue({ code: 'custom', path: ['deadline', 'lead_times', i, 'amount'], message: `expected at most ${leadTimes.maxDays} days / ${leadTimes.maxHours} hours` })
        if (seen.has(hours)) ctx.addIssue({ code: 'custom', path: ['deadline', 'lead_times', i], message: 'expected no two entries of the same duration' })
        seen.add(hours)
      })
    })
  // data_schema.yaml 9.0.2 send_reminder.output_guaranteed.reminder_settings.
  const reminderSettings: z.ZodType<ReminderSettings> = z.object({ settings: settingsRecord, updated_at: timestamp.nullable() })
  // clause_a_common.types.reminder_notification_record: one object per kind.
  const deadlineReminder = z.object({
    notification_id: id,
    kind: z.literal('deadline'),
    due_at: timestamp,
    deadline_item: z.object({ commission_id: id, title: z.string(), deadline: date, lead: leadTime }),
    digest: z.null(),
  })
  const digestReminder = z.object({
    notification_id: id,
    kind: z.literal('periodic_digest'),
    due_at: timestamp,
    deadline_item: z.null(),
    digest: z.object({
      open_count: safeInteger,
      upcoming: z.array(z.object({ commission_id: id, title: z.string(), deadline: date })),
    }),
  })
  // data_schema.yaml 9.0.2 send_reminder.output_guaranteed.pending_notifications.
  const pendingNotifications: z.ZodType<PendingNotifications> = z.array(z.discriminatedUnion('kind', [deadlineReminder, digestReminder]))
  // data_schema.yaml 9.0.2 send_reminder.output_guaranteed.notification_ack.
  const notificationAck: z.ZodType<NotificationAck> = z.object({ notification_id: id, acknowledged_at: timestamp })
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
    // list_pending: GET /reminders/pending, no input.
    listPending(): Promise<CallResult<PendingNotifications>> {
      return call('list_pending', eps.listPending, { path: {}, query: null, body: null }, pendingNotifications, 'pending_notifications')
    },

    // acknowledge: PUT /reminders/{notification_id}/ack, no other input.
    acknowledge(notificationId: string): Promise<CallResult<NotificationAck>> {
      return call('acknowledge', eps.acknowledge, { path: { notification_id: notificationId }, query: null, body: null }, notificationAck, 'notification_ack')
    },

    // get_settings: GET /reminders/settings, no input.
    getSettings(): Promise<CallResult<ReminderSettings>> {
      return call('get_settings', eps.getSettings, { path: {}, query: null, body: null }, reminderSettings, 'reminder_settings')
    },

    // edit_settings: PUT /reminders/settings, body { reminder_settings_input }.
    editSettings(input: ReminderSettingsRecord): Promise<CallResult<ReminderSettings>> {
      return call('edit_settings', eps.editSettings, { path: {}, query: null, body: { reminder_settings_input: input } }, reminderSettings, 'reminder_settings')
    },
  }
}

export type SendReminderAdapters = ReturnType<typeof createSendReminderAdapters>
