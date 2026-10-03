// Adapters of send_reminder — coverage matrix of i3-logic.md, Step I3.6, for the
// four calls of ui_decomposition.md D6 (api_contract.yaml 4.0.0):
//   list_pending   GET /reminders/pending          200 ok, 500
//   acknowledge    PUT /reminders/{id}/ack         200 ok, 404, 500
//   get_settings   GET /reminders/settings         200 ok, 500
//   edit_settings  PUT /reminders/settings         200 ok, 400, 500
// Every declared label, unreachable, an undeclared label, a missing field, a
// wrong type, a wrong code, an integer outside the safe range, extra fields
// dropped, one bad element of a list; and the request each one sends (method,
// path, query, body keyed by input name — endpoint_forms.http). Plus: the shape
// that goes with each kind of reminder, the closed lists of values, the rules of
// reminder_settings_record, formats.timestamp and formats.date. check_due is not
// among the calls: the interface never calls it. Fake http_client.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, Transport } from '../../../shared/resources'
import type { CallResult } from '../../../shared/results'
import { createSendReminderAdapters, type SendReminderAdapters } from '../adapters'
import { SEND_REMINDER_CONFIGS } from '../configs'
import type { DeadlineReminder, DigestReminder, NotificationAck, ReminderSettings, ReminderSettingsRecord } from '../entities'

const NID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const CID = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const DEADLINE: DeadlineReminder = {
  notification_id: NID,
  kind: 'deadline',
  due_at: '2026-10-03T00:00:00+07:00',
  deadline_item: { commission_id: CID, title: 'Chân dung', deadline: '2026-10-03', lead: { amount: 1, unit: 'days' } },
  digest: null,
}
const DIGEST: DigestReminder = {
  notification_id: '00000000-0000-4000-8000-000000000002',
  kind: 'periodic_digest',
  due_at: '2026-10-03T09:00:00+07:00',
  deadline_item: null,
  digest: { open_count: 3, upcoming: [{ commission_id: CID, title: 'Chân dung', deadline: '2026-10-03' }] },
}
const ACK: NotificationAck = { notification_id: NID, acknowledged_at: '2026-10-03T10:00:00+07:00' }
const SETTINGS_RECORD: ReminderSettingsRecord = {
  periodic: { enabled: true, every: 2, unit: 'weeks', at_time: '09:30', weekday: 3 },
  deadline: { enabled: true, lead_times: [{ amount: 1, unit: 'days' }, { amount: 12, unit: 'hours' }] },
}
const SETTINGS: ReminderSettings = { settings: SETTINGS_RECORD, updated_at: '2026-10-03T08:00:00+07:00' }
const errorBody = (code: string) => ({ code, message: 'x', details: null })

type Case = {
  name: string
  call: (a: SendReminderAdapters) => Promise<CallResult<unknown>>
  request: [string, string, { query: Record<string, string> | null; body: unknown }]
  ok: number
  // A valid body of the ok label, and that body with one committed field missing / wrongly typed.
  body: unknown
  missingField: unknown
  wrongType: unknown
  errors: Record<number, string>
  undeclared: number
  // A body with an integer outside ±(2^53−1); null when the output has no integer.
  unsafeInteger: unknown | null
  // A list output: the valid body with one element of the wrong shape.
  badElement: unknown | null
}

const omit = <T extends object>(o: T, k: keyof T) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k))

const CASES: Case[] = [
  {
    name: 'list_pending',
    call: (a) => a.listPending(),
    request: ['GET', '/reminders/pending', { query: null, body: null }],
    ok: 200,
    body: [DEADLINE, DIGEST],
    missingField: [omit(DEADLINE, 'due_at')],
    wrongType: [{ ...DEADLINE, notification_id: 'not-an-id' }],
    errors: { 500: 'ERR_STORAGE_IO' },
    undeclared: 404,
    unsafeInteger: [{ ...DIGEST, digest: { open_count: 9007199254740992, upcoming: [] } }],
    badElement: [DEADLINE, { ...DEADLINE, deadline_item: null }],
  },
  {
    name: 'acknowledge',
    call: (a) => a.acknowledge(NID),
    request: ['PUT', `/reminders/${NID}/ack`, { query: null, body: null }],
    ok: 200,
    body: ACK,
    missingField: omit(ACK, 'acknowledged_at'),
    wrongType: { ...ACK, acknowledged_at: 5 },
    errors: { 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' },
    undeclared: 400,
    unsafeInteger: null,
    badElement: null,
  },
  {
    name: 'get_settings',
    call: (a) => a.getSettings(),
    request: ['GET', '/reminders/settings', { query: null, body: null }],
    ok: 200,
    body: SETTINGS,
    missingField: omit(SETTINGS, 'settings'),
    wrongType: { ...SETTINGS, settings: { ...SETTINGS_RECORD, periodic: { ...SETTINGS_RECORD.periodic, enabled: 'yes' } } },
    errors: { 500: 'ERR_STORAGE_IO' },
    undeclared: 404,
    unsafeInteger: { ...SETTINGS, settings: { ...SETTINGS_RECORD, periodic: { ...SETTINGS_RECORD.periodic, every: 9007199254740992 } } },
    badElement: null,
  },
  {
    name: 'edit_settings',
    call: (a) => a.editSettings(SETTINGS_RECORD),
    request: ['PUT', '/reminders/settings', { query: null, body: { reminder_settings_input: SETTINGS_RECORD } }],
    ok: 200,
    body: SETTINGS,
    missingField: omit(SETTINGS, 'updated_at'),
    wrongType: { ...SETTINGS, updated_at: 'yesterday' },
    errors: { 400: 'ERR_VALIDATION', 500: 'ERR_STORAGE_IO' },
    undeclared: 404,
    unsafeInteger: { ...SETTINGS, settings: { ...SETTINGS_RECORD, deadline: { enabled: true, lead_times: [{ amount: 9007199254740992, unit: 'hours' }] } } },
    badElement: null,
  },
]

function adaptersAnswering(t: Transport) {
  const send = vi.fn<HttpClient['send']>(async () => t)
  return { send, adapters: createSendReminderAdapters({ send }, SEND_REMINDER_CONFIGS) }
}
const respond = (label: number, body: unknown): Transport => ({ kind: 'response', label, body })

let consoleError: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  consoleError.mockRestore()
})

describe('label tables of Configs match api_contract.yaml 4.0.0 line by line', () => {
  it('has exactly the declared labels of each call, and no check_due', () => {
    const tables = Object.fromEntries(Object.entries(SEND_REMINDER_CONFIGS.endpoints).map(([k, ep]) => [k, [ep.method, ep.path, ep.labels]]))
    expect(tables).toEqual({
      listPending: ['GET', '/reminders/pending', { 200: 'ok', 500: 'ERR_STORAGE_IO' }],
      acknowledge: ['PUT', '/reminders/{notification_id}/ack', { 200: 'ok', 404: 'ERR_NOT_FOUND', 500: 'ERR_STORAGE_IO' }],
      getSettings: ['GET', '/reminders/settings', { 200: 'ok', 500: 'ERR_STORAGE_IO' }],
      editSettings: ['PUT', '/reminders/settings', { 200: 'ok', 400: 'ERR_VALIDATION', 500: 'ERR_STORAGE_IO' }],
    })
    expect(JSON.stringify(SEND_REMINDER_CONFIGS.endpoints)).not.toContain('/reminders/checks')
  })

  it('Configs name Data Schema 9.0.2 and API Contract 4.0.0', () => {
    expect(SEND_REMINDER_CONFIGS.contract).toEqual({ apiContract: '4.0.0', dataSchema: '9.0.2' })
  })
})

describe.each(CASES)('$name', (c) => {
  it('sends the declared method and path, the query, the body keyed by input name', async () => {
    const { send, adapters } = adaptersAnswering(respond(c.ok, c.body))
    await c.call(adapters)
    expect(send).toHaveBeenCalledExactlyOnceWith(...c.request)
  })

  it(`label ${c.ok} with a valid body → ok, the data as checked`, async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.body))
    expect(await c.call(adapters)).toEqual({ kind: 'ok', label: c.ok, data: c.body })
  })

  it.each(Object.entries(c.errors))('label %s with its declared code → declared_error, body untouched', async (label, code) => {
    const body = { code, message: 'Something failed', details: { field: 'x' } }
    const { adapters } = adaptersAnswering(respond(Number(label), body))
    expect(await c.call(adapters)).toEqual({ kind: 'declared_error', label: Number(label), error: body })
  })

  it.each(Object.entries(c.errors))('label %s with another code → contract_violation', async (label, code) => {
    const other = code === 'ERR_CONFLICT' ? 'ERR_OUT_OF_RANGE' : 'ERR_CONFLICT'
    const { adapters } = adaptersAnswering(respond(Number(label), errorBody(other)))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it.each(Object.entries(c.errors))('label %s with a body that is not error_body → contract_violation', async (label) => {
    const { adapters } = adaptersAnswering(respond(Number(label), { code: 'ERR_STORAGE_IO', details: 'no' }))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('no response → unreachable, the reason logged', async () => {
    const { adapters } = adaptersAnswering({ kind: 'unreachable', reason: 'connection refused' })
    expect(await c.call(adapters)).toEqual({ kind: 'unreachable', reason: 'connection refused' })
    expect(consoleError).toHaveBeenCalledWith('[send_reminder] unreachable: connection refused')
  })

  it(`undeclared label ${c.undeclared} → contract_violation, the reason logged`, async () => {
    const { adapters } = adaptersAnswering(respond(c.undeclared, errorBody('ERR_VALIDATION')))
    const r = await c.call(adapters)
    expect(r.kind).toBe('contract_violation')
    expect(consoleError).toHaveBeenCalledWith(`[send_reminder] contract violation: label ${c.undeclared} is not declared for ${c.name}`)
  })

  it('an empty body on the ok label → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, null))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('a committed field missing → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.missingField))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  it('a field of the wrong type → contract_violation', async () => {
    const { adapters } = adaptersAnswering(respond(c.ok, c.wrongType))
    expect((await c.call(adapters)).kind).toBe('contract_violation')
  })

  if (c.unsafeInteger !== null) {
    it('an integer outside ±(2^53−1) → contract_violation', async () => {
      const { adapters } = adaptersAnswering(respond(c.ok, c.unsafeInteger))
      expect((await c.call(adapters)).kind).toBe('contract_violation')
      expect(String(consoleError.mock.calls.at(-1)?.[0])).toContain('expected an integer within ±(2^53−1)')
    })
  }

  if (c.badElement !== null) {
    it('a list with exactly one element of the wrong shape → contract_violation', async () => {
      const { adapters } = adaptersAnswering(respond(c.ok, c.badElement))
      expect((await c.call(adapters)).kind).toBe('contract_violation')
    })
  }

  it('extra fields are dropped, not rejected', async () => {
    const withExtra = Array.isArray(c.body)
      ? c.body.map((x) => (typeof x === 'object' && x !== null ? { ...x, extra_field: 1 } : x))
      : { ...(c.body as object), extra_field: 1 }
    const { adapters } = adaptersAnswering(respond(c.ok, withExtra))
    expect(await c.call(adapters)).toEqual({ kind: 'ok', label: c.ok, data: c.body })
  })
})

describe('reminders: the shape that goes with each kind, values, formats', () => {
  const pending = (body: unknown) => adaptersAnswering(respond(200, body)).adapters.listPending()
  const violated = async (body: unknown) => expect((await pending([body])).kind).toBe('contract_violation')

  it('an empty list is ok', async () => {
    expect(await pending([])).toEqual({ kind: 'ok', label: 200, data: [] })
  })

  it('a deadline reminder without deadline_item, or with a digest → contract_violation', async () => {
    await violated({ ...DEADLINE, deadline_item: null })
    await violated({ ...DEADLINE, digest: DIGEST.digest })
  })

  it('a periodic digest without digest, or with a deadline_item → contract_violation', async () => {
    await violated({ ...DIGEST, digest: null })
    await violated({ ...DIGEST, deadline_item: DEADLINE.deadline_item })
  })

  it('a kind outside the two values → contract_violation', async () => {
    await violated({ ...DEADLINE, kind: 'weekly' })
    await violated({ ...DEADLINE, kind: 'Deadline' })
  })

  it('a digest with an empty upcoming list is ok', async () => {
    expect((await pending([{ ...DIGEST, digest: { open_count: 1, upcoming: [] } }])).kind).toBe('ok')
  })

  it('a lead unit outside hours and days → contract_violation', async () => {
    await violated({ ...DEADLINE, deadline_item: { ...DEADLINE.deadline_item, lead: { amount: 1, unit: 'weeks' } } })
  })

  it.each(['2026-10-03T00:00:00+07:00', '2026-10-03T00:00Z', '2026-10-02T17:00:00.5+00:00'])('due_at %s is a timestamp', async (due_at) => {
    expect((await pending([{ ...DEADLINE, due_at }])).kind).toBe('ok')
  })

  it.each(['2026-10-03', '2026-10-03T00:00:00', '03/10/2026 00:00', '2026-13-03T00:00:00+07:00', ''])('due_at %j is not a timestamp → contract_violation', async (due_at) => {
    await violated({ ...DEADLINE, due_at })
  })

  it.each(['2026-02-30', '2026-13-01', '03/10/2026', '2026-10-03T00:00:00+07:00', '2026-10-3'])('deadline %j is not a date → contract_violation', async (deadline) => {
    await violated({ ...DEADLINE, deadline_item: { ...DEADLINE.deadline_item, deadline } })
    await violated({ ...DIGEST, digest: { open_count: 1, upcoming: [{ commission_id: CID, title: 't', deadline }] } })
  })

  it('acknowledged_at must be a timestamp', async () => {
    const { adapters } = adaptersAnswering(respond(200, { ...ACK, acknowledged_at: '2026-10-03' }))
    expect((await adapters.acknowledge(NID)).kind).toBe('contract_violation')
  })

  it('the id of the notification is put in the path, URL-encoded', async () => {
    const { send, adapters } = adaptersAnswering(respond(200, ACK))
    await adapters.acknowledge('a b/c')
    expect(send.mock.calls[0][1]).toBe('/reminders/a%20b%2Fc/ack')
  })
})

describe('reminder_settings_record, rule by rule (a violation of any is a contract_violation)', () => {
  const settings = (record: unknown, updated_at: string | null = null) => adaptersAnswering(respond(200, { settings: record, updated_at })).adapters.getSettings()
  const withPeriodic = (p: Partial<ReminderSettingsRecord['periodic']>): ReminderSettingsRecord => ({ ...SETTINGS_RECORD, periodic: { ...SETTINGS_RECORD.periodic, ...p } })
  const withLeads = (lead_times: unknown): unknown => ({ ...SETTINGS_RECORD, deadline: { enabled: false, lead_times } })

  it('never saved: updated_at null is ok, with the defaults of the contract', async () => {
    const defaults: ReminderSettingsRecord = {
      periodic: { enabled: false, every: 1, unit: 'weeks', at_time: '09:00', weekday: 1 },
      deadline: { enabled: false, lead_times: [{ amount: 1, unit: 'days' }] },
    }
    expect(await settings(defaults)).toEqual({ kind: 'ok', label: 200, data: { settings: defaults, updated_at: null } })
  })

  it('weekday null with unit days is ok; weekday 1..7 with unit weeks is ok', async () => {
    expect((await settings(withPeriodic({ unit: 'days', weekday: null }))).kind).toBe('ok')
    for (const weekday of [1, 2, 3, 4, 5, 6, 7]) expect((await settings(withPeriodic({ unit: 'weeks', weekday }))).kind).toBe('ok')
  })

  it('weekday null with unit weeks, a weekday with unit days, weekday 0 or 8 → contract_violation', async () => {
    expect((await settings(withPeriodic({ unit: 'weeks', weekday: null }))).kind).toBe('contract_violation')
    expect((await settings(withPeriodic({ unit: 'days', weekday: 3 }))).kind).toBe('contract_violation')
    expect((await settings(withPeriodic({ unit: 'weeks', weekday: 0 }))).kind).toBe('contract_violation')
    expect((await settings(withPeriodic({ unit: 'weeks', weekday: 8 }))).kind).toBe('contract_violation')
  })

  it('every must be an integer >= 1', async () => {
    expect((await settings(withPeriodic({ every: 1 }))).kind).toBe('ok')
    for (const every of [0, -1, 1.5]) expect((await settings(withPeriodic({ every }))).kind).toBe('contract_violation')
  })

  it('a unit outside the two lists → contract_violation', async () => {
    expect((await settings({ ...SETTINGS_RECORD, periodic: { ...SETTINGS_RECORD.periodic, unit: 'months' } })).kind).toBe('contract_violation')
  })

  it.each(['00:00', '23:59', '09:05'])('at_time %s is ok', async (at_time) => {
    expect((await settings(withPeriodic({ at_time }))).kind).toBe('ok')
  })

  it.each(['9:00', '24:00', '12:60', '', '09:00:00', '9am'])('at_time %j → contract_violation', async (at_time) => {
    expect((await settings(withPeriodic({ at_time }))).kind).toBe('contract_violation')
  })

  it('1..5 lead times: none and six → contract_violation', async () => {
    expect((await settings(withLeads([]))).kind).toBe('contract_violation')
    const six = [1, 2, 3, 4, 5, 6].map((amount) => ({ amount, unit: 'days' }))
    expect((await settings(withLeads(six))).kind).toBe('contract_violation')
    expect((await settings(withLeads(six.slice(0, 5)))).kind).toBe('ok')
  })

  it('at most 365 days / 8760 hours: the limit is ok, one more is not', async () => {
    expect((await settings(withLeads([{ amount: 365, unit: 'days' }]))).kind).toBe('ok')
    expect((await settings(withLeads([{ amount: 8760, unit: 'hours' }]))).kind).toBe('ok')
    expect((await settings(withLeads([{ amount: 366, unit: 'days' }]))).kind).toBe('contract_violation')
    expect((await settings(withLeads([{ amount: 8761, unit: 'hours' }]))).kind).toBe('contract_violation')
  })

  it('no two lead times of the same duration (1 day = 24 hours)', async () => {
    expect((await settings(withLeads([{ amount: 1, unit: 'days' }, { amount: 24, unit: 'hours' }]))).kind).toBe('contract_violation')
    expect((await settings(withLeads([{ amount: 3, unit: 'hours' }, { amount: 3, unit: 'hours' }]))).kind).toBe('contract_violation')
    expect((await settings(withLeads([{ amount: 2, unit: 'days' }, { amount: 24, unit: 'hours' }]))).kind).toBe('ok')
  })

  it('a lead amount of 0, negative or fractional → contract_violation', async () => {
    for (const amount of [0, -1, 1.5]) expect((await settings(withLeads([{ amount, unit: 'hours' }]))).kind).toBe('contract_violation')
  })

  it('a lead time without amount or unit → contract_violation', async () => {
    expect((await settings(withLeads([{ unit: 'days' }]))).kind).toBe('contract_violation')
    expect((await settings(withLeads([{ amount: 1 }]))).kind).toBe('contract_violation')
  })
})
