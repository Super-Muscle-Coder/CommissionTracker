// Services of send_reminder — i3-logic.md, Step I3.6: every CallResult kind
// maps to the right ViewResult, for every operation; every declared error code
// has a message (walked from the label tables of Configs, not listed by hand);
// each presentation decision of ui_decomposition.md D6 has a case: the main and
// secondary line of each kind of reminder (a digest with `upcoming` empty and
// not empty), dates and times, lead times, weekdays, the order of the list,
// "Chưa lưu lần nào" / "Lưu lần cuối lúc …", the form draft and what a change of
// unit or a new row does to it, the words of each field error, and the 404 of
// acknowledge.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { CallResult, ResultMessages, ViewResult } from '../../../shared/results'
import type { SendReminderAdapters } from '../adapters'
import { SEND_REMINDER_CONFIGS } from '../configs'
import type { DeadlineReminder, DigestReminder, ReminderSettings, ReminderSettingsDraft } from '../entities'
import { createSendReminderServices } from '../services'

const messages: ResultMessages = {
  unreachable: 'test: unreachable',
  contractViolation: 'test: contract violation',
  inputSummary: 'test: input summary',
  input: {
    required: 'test: required',
    not_integer: 'test: not_integer',
    not_number: 'test: not_number',
    not_date: 'test: not_date',
    not_timestamp: 'test: not_timestamp',
    not_in_list: 'test: not_in_list',
    violates_type_constraint: 'test: violates_type_constraint',
  },
}
const cfg = SEND_REMINDER_CONFIGS

const unused = () =>
  vi.fn(async () => {
    throw new Error('test: adapter not expected to be called')
  })

function fakeAdapters(over: Partial<SendReminderAdapters>): SendReminderAdapters {
  return { listPending: unused(), acknowledge: unused(), getSettings: unused(), editSettings: unused(), ...over }
}
const servicesOf = (over: Partial<SendReminderAdapters>) => createSendReminderServices(fakeAdapters(over), cfg, messages)
const answer = <T>(r: CallResult<T>) => vi.fn(async () => r)
const ok = <T>(data: T, label = 200): CallResult<T> => ({ kind: 'ok', label, data })
const declared = (label: number, code: string): CallResult<never> => ({ kind: 'declared_error', label, error: { code, message: 'x', details: null } })
const UNREACHABLE: CallResult<never> = { kind: 'unreachable', reason: 'refused' }
const VIOLATION: CallResult<never> = { kind: 'contract_violation', reason: 'bad body' }

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
let n = 0
const uuid = () => `00000000-0000-4000-8000-${(n += 1).toString(16).padStart(12, '0')}`

const deadlineReminder = (over: Partial<DeadlineReminder> = {}): DeadlineReminder => ({
  notification_id: uuid(),
  kind: 'deadline',
  due_at: '2026-10-03T00:00:00+07:00',
  deadline_item: { commission_id: CID, title: 'Chân dung bán thân', deadline: '2026-10-03', lead: { amount: 1, unit: 'days' } },
  digest: null,
  ...over,
})
const digestReminder = (upcoming: { commission_id: string; title: string; deadline: string }[], openCount = 3, over: Partial<DigestReminder> = {}): DigestReminder => ({
  notification_id: uuid(),
  kind: 'periodic_digest',
  due_at: '2026-10-03T09:00:00+07:00',
  deadline_item: null,
  digest: { open_count: openCount, upcoming },
  ...over,
})

const SETTINGS_RECORD: ReminderSettings['settings'] = {
  periodic: { enabled: true, every: 2, unit: 'weeks', at_time: '09:30', weekday: 3 },
  deadline: { enabled: false, lead_times: [{ amount: 1, unit: 'days' }, { amount: 12, unit: 'hours' }] },
}

function viewOf<V>(r: ViewResult<V>): V {
  if (r.kind !== 'ok') throw new Error(`test: expected ok, got ${r.kind}`)
  return r.view
}

// Dates are shown in the machine's time zone: fixed here.
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('every declared error code has a message (walked from the label tables of Configs)', () => {
  const pairs = Object.entries(cfg.endpoints).flatMap(([endpoint, ep]) =>
    Object.values(ep.labels)
      .filter((v) => v !== 'ok')
      .map((code) => [endpoint, code] as const),
  )

  it('there are 6 (call, code) pairs', () => {
    expect(pairs).toHaveLength(6)
  })

  it.each(pairs)('%s %s', (endpoint, code) => {
    const message = cfg.errorMessages[endpoint]?.[code]
    expect(typeof message).toBe('string')
    expect((message as string).length).toBeGreaterThan(0)
  })
})

describe('every kind of CallResult becomes the right ViewResult, for every operation', () => {
  const ACK = { notification_id: CID, acknowledged_at: '2026-10-03T10:00:00+07:00' }
  const SETTINGS: ReminderSettings = { settings: SETTINGS_RECORD, updated_at: null }
  const operations: [string, (a: Partial<SendReminderAdapters>) => Promise<ViewResult<unknown>>, Partial<SendReminderAdapters>, Partial<SendReminderAdapters>, number[]][] = [
    ['loadPending', (a) => servicesOf(a).loadPending(), { listPending: answer(ok([])) }, { listPending: answer(UNREACHABLE) }, [500]],
    ['acknowledge', (a) => servicesOf(a).acknowledge(CID), { acknowledge: answer(ok(ACK)) }, { acknowledge: answer(UNREACHABLE) }, [404, 500]],
    ['openSettings', (a) => servicesOf(a).openSettings(), { getSettings: answer(ok(SETTINGS)) }, { getSettings: answer(UNREACHABLE) }, [500]],
    ['saveSettings', (a) => servicesOf(a).saveSettings(SETTINGS_RECORD), { editSettings: answer(ok(SETTINGS)) }, { editSettings: answer(UNREACHABLE) }, [400, 500]],
  ]
  const callOf = (name: string) => ({ loadPending: 'listPending', acknowledge: 'acknowledge', openSettings: 'getSettings', saveSettings: 'editSettings' })[name] as keyof SendReminderAdapters

  it.each(operations)('%s: ok', async (_name, run, okAdapters) => {
    expect((await run(okAdapters)).kind).toBe('ok')
  })

  it.each(operations)('%s: unreachable', async (_name, run, _ok, unreachableAdapters) => {
    expect(await run(unreachableAdapters)).toEqual({ kind: 'unreachable', message: messages.unreachable })
  })

  it.each(operations)('%s: contract_violation', async (name, run) => {
    expect(await run({ [callOf(name)]: answer(VIOLATION) })).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })

  it.each(operations)('%s: each declared error is rejected, system, with the code and the message of that call', async (name, run, _ok, _un, labels) => {
    const endpoint = Object.keys(cfg.endpoints).find((k) => k === callOf(name)) as keyof typeof cfg.endpoints
    for (const label of labels) {
      const code = cfg.endpoints[endpoint].labels[String(label)]
      const r = await run({ [callOf(name)]: answer(declared(label, code)) })
      expect(r).toEqual({ kind: 'rejected', origin: 'system', code, message: cfg.errorMessages[endpoint][code], fieldErrors: {} })
    }
  })

  it('the 404 of acknowledge says the reminder is no longer in the list', async () => {
    const r = await servicesOf({ acknowledge: answer(declared(404, 'ERR_NOT_FOUND')) }).acknowledge(CID)
    expect(r).toMatchObject({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Nhắc việc này không còn trong danh sách.' })
  })

  it('the 400 of edit_settings says the server did not accept the settings', async () => {
    const r = await servicesOf({ editSettings: answer(declared(400, 'ERR_VALIDATION')) }).saveSettings(SETTINGS_RECORD)
    expect(r).toMatchObject({ kind: 'rejected', origin: 'system', code: 'ERR_VALIDATION', message: 'Máy chủ không nhận cài đặt này. Vui lòng kiểm tra lại các ô rồi lưu lại.' })
  })

  it('acknowledge calls the adapter once with the id; saveSettings sends the record it was given', async () => {
    const acknowledge = answer(ok(ACK))
    await servicesOf({ acknowledge }).acknowledge(CID)
    expect(acknowledge).toHaveBeenCalledExactlyOnceWith(CID)
    const editSettings = answer(ok(SETTINGS))
    await servicesOf({ editSettings }).saveSettings(SETTINGS_RECORD)
    expect(editSettings).toHaveBeenCalledExactlyOnceWith(SETTINGS_RECORD)
  })

  it('"Đã xem" asks no question: ok on the first call, with the notice', async () => {
    const acknowledge = answer(ok(ACK))
    expect(await servicesOf({ acknowledge }).acknowledge(CID)).toEqual({ kind: 'ok', view: { message: 'Đã đánh dấu đã xem.' } })
    expect(acknowledge).toHaveBeenCalledTimes(1)
  })

  it('saving: ok with the notice "Đã lưu cài đặt nhắc việc."', async () => {
    expect(await servicesOf({ editSettings: answer(ok(SETTINGS)) }).saveSettings(SETTINGS_RECORD)).toEqual({ kind: 'ok', view: { message: 'Đã lưu cài đặt nhắc việc.' } })
  })
})

describe('reminder_list: the lines of each kind of reminder', () => {
  const load = async (list: (DeadlineReminder | DigestReminder)[]) => viewOf(await servicesOf({ listPending: answer(ok(list)) }).loadPending())

  it('a deadline reminder: main "Sắp tới hạn giao: <title>", secondary with the deadline, the lead and the due time; opens its commission', async () => {
    const d = deadlineReminder()
    const v = await load([d])
    expect(v.rows).toEqual([
      {
        notificationId: d.notification_id,
        text: 'Sắp tới hạn giao: Chân dung bán thân',
        detailText: 'Hạn giao 03/10/2026 · nhắc trước 1 ngày · đến hạn lúc 00:00 03/10/2026',
        open: { to: 'commission_detail', commissionId: CID },
      },
    ])
    expect(v.isEmpty).toBe(false)
  })

  it('the lead is "<amount> giờ" for hours', async () => {
    const d = deadlineReminder({ deadline_item: { commission_id: CID, title: 'T', deadline: '2026-12-31', lead: { amount: 12, unit: 'hours' } }, due_at: '2026-12-31T12:00:00+07:00' })
    expect((await load([d])).rows[0].detailText).toBe('Hạn giao 31/12/2026 · nhắc trước 12 giờ · đến hạn lúc 12:00 31/12/2026')
  })

  it('a digest with deadlines: main with the count; secondary with the number of commissions with a deadline, the due time, the earliest (the first of upcoming); opens the commission list', async () => {
    const d = digestReminder(
      [
        { commission_id: CID, title: 'Minh họa bìa sách', deadline: '2026-01-01' },
        { commission_id: uuid(), title: 'Chibi đôi', deadline: '2026-11-20' },
      ],
      5,
    )
    expect((await load([d])).rows).toEqual([
      {
        notificationId: d.notification_id,
        text: 'Tổng hợp định kỳ: 5 đơn đang mở',
        detailText: '2 đơn có hạn giao · đến hạn lúc 09:00 03/10/2026 · sớm nhất: Minh họa bìa sách (01/01/2026)',
        open: { to: 'commission_list' },
      },
    ])
  })

  it('a digest with `upcoming` empty: no "sớm nhất" part', async () => {
    const [row] = (await load([digestReminder([], 2)])).rows
    expect(row.text).toBe('Tổng hợp định kỳ: 2 đơn đang mở')
    expect(row.detailText).toBe('0 đơn có hạn giao · đến hạn lúc 09:00 03/10/2026')
  })

  it('the order the contract gives is kept (nothing is sorted)', async () => {
    const a = deadlineReminder({ due_at: '2026-10-05T00:00:00+07:00' })
    const b = digestReminder([], 1, { due_at: '2026-10-01T09:00:00+07:00' })
    const c = deadlineReminder({ due_at: '2026-10-03T00:00:00+07:00' })
    expect((await load([a, b, c])).rows.map((r) => r.notificationId)).toEqual([a.notification_id, b.notification_id, c.notification_id])
  })

  it('an empty list: the words', async () => {
    expect(await load([])).toEqual({ rows: [], isEmpty: true, emptyText: 'Không có nhắc việc nào đang chờ.' })
  })

  it('the time is shown in the time zone of the machine', async () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    const d = deadlineReminder({ due_at: '2026-10-03T00:00:00+07:00' })
    expect((await load([d])).rows[0].detailText).toContain('đến hạn lúc 10:00 02/10/2026')
  })
})

describe('reminder_settings: opening', () => {
  const open = async (s: ReminderSettings) => viewOf(await servicesOf({ getSettings: answer(ok(s)) }).openSettings())

  it('never saved: "Chưa lưu lần nào, đang dùng cài đặt mặc định."', async () => {
    expect((await open({ settings: SETTINGS_RECORD, updated_at: null })).subtitle).toBe('Chưa lưu lần nào, đang dùng cài đặt mặc định.')
  })

  it('saved: "Lưu lần cuối lúc HH:mm dd/mm/yyyy"', async () => {
    expect((await open({ settings: SETTINGS_RECORD, updated_at: '2026-10-03T08:05:30+07:00' })).subtitle).toBe('Lưu lần cuối lúc 08:05 03/10/2026')
  })

  it('the draft is the settings as text, the weekday as its number', async () => {
    expect((await open({ settings: SETTINGS_RECORD, updated_at: null })).draft).toEqual({
      periodicEnabled: true,
      every: '2',
      periodicUnit: 'weeks',
      atTime: '09:30',
      weekday: '3',
      deadlineEnabled: false,
      leadTimes: [
        { amount: '1', unit: 'days' },
        { amount: '12', unit: 'hours' },
      ],
    })
  })

  it('unit days, weekday null: the weekday of the draft is empty', async () => {
    const v = await open({ settings: { ...SETTINGS_RECORD, periodic: { ...SETTINGS_RECORD.periodic, unit: 'days', weekday: null } }, updated_at: null })
    expect(v.draft.periodicUnit).toBe('days')
    expect(v.draft.weekday).toBe('')
  })

  it('the choices: units of the cadence, the seven weekdays in order, units of a lead time; limits 1..5; the unit the weekday goes with', async () => {
    const v = await open({ settings: SETTINGS_RECORD, updated_at: null })
    expect(v.periodicUnitChoices).toEqual([
      { value: 'days', label: 'ngày' },
      { value: 'weeks', label: 'tuần' },
    ])
    expect(v.weekdayChoices).toEqual([
      { value: '1', label: 'Thứ Hai' },
      { value: '2', label: 'Thứ Ba' },
      { value: '3', label: 'Thứ Tư' },
      { value: '4', label: 'Thứ Năm' },
      { value: '5', label: 'Thứ Sáu' },
      { value: '6', label: 'Thứ Bảy' },
      { value: '7', label: 'Chủ nhật' },
    ])
    expect(v.leadUnitChoices).toEqual([
      { value: 'hours', label: 'giờ' },
      { value: 'days', label: 'ngày' },
    ])
    expect(v.leadTimeLimits).toEqual({ min: 1, max: 5 })
    expect(v.weekdayUnit).toBe('weeks')
  })
})

describe('reminder_settings: what a change does to the draft', () => {
  const services = servicesOf({})
  const draft = (over: Partial<ReminderSettingsDraft> = {}): ReminderSettingsDraft => ({
    periodicEnabled: true,
    every: '1',
    periodicUnit: 'days',
    atTime: '09:00',
    weekday: '',
    deadlineEnabled: true,
    leadTimes: [{ amount: '1', unit: 'days' }],
    ...over,
  })

  it('unit → "tuần" with no weekday chosen: Thứ Hai', () => {
    expect(services.changePeriodicUnit(draft(), 'weeks')).toEqual(draft({ periodicUnit: 'weeks', weekday: '1' }))
  })

  it('unit → "tuần" with a weekday already chosen: kept', () => {
    expect(services.changePeriodicUnit(draft({ periodicUnit: 'days', weekday: '5' }), 'weeks').weekday).toBe('5')
  })

  it('unit → "ngày": the weekday is dropped', () => {
    expect(services.changePeriodicUnit(draft({ periodicUnit: 'weeks', weekday: '5' }), 'days')).toEqual(draft({ periodicUnit: 'days', weekday: '' }))
  })

  it('a new row is "1 ngày" when no row has that length yet', () => {
    expect(services.addLeadTime(draft({ leadTimes: [{ amount: '12', unit: 'hours' }] })).leadTimes).toEqual([
      { amount: '12', unit: 'hours' },
      { amount: '1', unit: 'days' },
    ])
    expect(services.addLeadTime(draft({ leadTimes: [{ amount: '2', unit: 'days' }] })).leadTimes[1]).toEqual({ amount: '1', unit: 'days' })
  })

  it('a new row has its number empty when "1 ngày" is there already, in either unit', () => {
    expect(services.addLeadTime(draft()).leadTimes[1]).toEqual({ amount: '', unit: 'days' })
    expect(services.addLeadTime(draft({ leadTimes: [{ amount: '24', unit: 'hours' }] })).leadTimes[1]).toEqual({ amount: '', unit: 'days' })
  })

  it('a row is never added past five, and never removed below one', () => {
    const five = draft({ leadTimes: [1, 2, 3, 4, 5].map((a) => ({ amount: String(a), unit: 'hours' })) })
    expect(services.addLeadTime(five)).toEqual(five)
    expect(services.removeLeadTime(draft(), 0)).toEqual(draft())
  })

  it('removing a row keeps the others in order', () => {
    const three = draft({ leadTimes: [{ amount: '1', unit: 'days' }, { amount: '2', unit: 'hours' }, { amount: '3', unit: 'hours' }] })
    expect(services.removeLeadTime(three, 1).leadTimes).toEqual([{ amount: '1', unit: 'days' }, { amount: '3', unit: 'hours' }])
  })
})

describe('the words of each field error (rejectInput)', () => {
  const services = servicesOf({})
  const rejected = (fields: Parameters<typeof services.rejectInput>[0]) => {
    const r = services.rejectInput(fields)
    if (r.kind !== 'rejected') throw new Error('test: expected rejected')
    return r
  }

  it('is rejected with origin input, the format code, and the summary of the layer', () => {
    const r = rejected({ 'periodic.every': 'required' })
    expect(r).toMatchObject({ kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: 'test: input summary' })
  })

  it('every: empty, not an integer, zero or negative', () => {
    expect(rejected({ 'periodic.every': 'required' }).fieldErrors).toEqual({ 'periodic.every': 'Nhập số ngày hoặc số tuần' })
    expect(rejected({ 'periodic.every': 'not_integer' }).fieldErrors).toEqual({ 'periodic.every': 'Nhập một số nguyên từ 1 trở lên' })
    expect(rejected({ 'periodic.every': 'violates_type_constraint' }).fieldErrors).toEqual({ 'periodic.every': 'Nhập một số nguyên từ 1 trở lên' })
  })

  it('at_time and weekday', () => {
    expect(rejected({ 'periodic.at_time': 'required' }).fieldErrors['periodic.at_time']).toBe('Chọn giờ nhắc')
    expect(rejected({ 'periodic.at_time': 'not_timestamp' }).fieldErrors['periodic.at_time']).toBe('Chọn giờ nhắc')
    expect(rejected({ 'periodic.weekday': 'required' }).fieldErrors['periodic.weekday']).toBe('Chọn thứ trong tuần')
  })

  it('a lead amount: the index is left out of the key the words are looked up by, the key of the answer keeps it', () => {
    const r = rejected({ 'deadline.lead_times.2.amount': 'violates_type_constraint', 'deadline.lead_times.0.amount': 'not_integer', 'deadline.lead_times.1.amount': 'required' })
    expect(r.fieldErrors).toEqual({
      'deadline.lead_times.2.amount': 'Mốc nhắc tối đa 365 ngày (8760 giờ)',
      'deadline.lead_times.0.amount': 'Nhập một số nguyên từ 1 trở lên',
      'deadline.lead_times.1.amount': 'Nhập thời gian nhắc trước',
    })
  })

  it('two lead times of the same length: the later one is told', () => {
    expect(rejected({ 'deadline.lead_times.1': 'violates_type_constraint' }).fieldErrors).toEqual({ 'deadline.lead_times.1': 'Mốc nhắc này trùng với một mốc khác' })
  })

  it('a pair the workflow does not word falls back to the words of the layer', () => {
    expect(rejected({ 'deadline.lead_times': 'required' }).fieldErrors).toEqual({ 'deadline.lead_times': 'test: required' })
  })
})
