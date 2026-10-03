// Routers of send_reminder — i3-logic.md, Step I3.6: for each field of the
// form, each kind of format error that applies to its type is rejected
// (origin input) and nothing is sent to the backend; a valid draft is sent
// converted (reminder_settings_input, exactly the contract's fields). The cases
// the plan of session 27 (item 3) requires: every (empty, 0, -1, 1.5, abc, 2^53
// → error; 1 ok), at_time (9:00, 24:00, 12:60, empty → error; 00:00, 23:59 ok),
// unit "tuần" with no weekday, unit "ngày" sends weekday null, lead times (365
// days and 8760 hours ok; 366 days and 8761 hours error), duplicates (1 day and
// 24 hours → error at the later; 2 days and 24 hours ok), a part switched off
// still checked. Real Services over fake Adapters: "nothing is sent" is the
// edit_settings adapter not being called.
import { describe, expect, it, vi } from 'vitest'
import type { CallResult, ResultMessages } from '../../../shared/results'
import type { SendReminderAdapters } from '../adapters'
import { SEND_REMINDER_CONFIGS } from '../configs'
import type { ReminderSettings, ReminderSettingsDraft } from '../entities'
import { createSendReminderRouters } from '../routers'
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

const SAVED: CallResult<ReminderSettings> = {
  kind: 'ok',
  label: 200,
  data: {
    settings: { periodic: { enabled: false, every: 1, unit: 'days', at_time: '09:00', weekday: null }, deadline: { enabled: false, lead_times: [{ amount: 1, unit: 'days' }] } },
    updated_at: '2026-10-03T10:00:00+07:00',
  },
}

function build() {
  const editSettings = vi.fn(async (): Promise<CallResult<ReminderSettings>> => SAVED)
  const never = vi.fn(async () => {
    throw new Error('test: adapter not expected to be called')
  })
  const adapters: SendReminderAdapters = { listPending: never, acknowledge: never, getSettings: never, editSettings }
  const services = createSendReminderServices(adapters, cfg, messages)
  const routers = createSendReminderRouters(services, { limits: cfg.limits, formats: cfg.formats, periodicUnits: cfg.periodicUnits, leadUnits: cfg.leadUnits })
  return { routers, editSettings }
}

const DRAFT: ReminderSettingsDraft = {
  periodicEnabled: true,
  every: '2',
  periodicUnit: 'weeks',
  atTime: '09:30',
  weekday: '3',
  deadlineEnabled: true,
  leadTimes: [{ amount: '1', unit: 'days' }, { amount: '12', unit: 'hours' }],
}
const draft = (over: Partial<ReminderSettingsDraft> = {}): ReminderSettingsDraft => ({ ...DRAFT, ...over })
const withLeads = (...leads: [string, string][]) => draft({ leadTimes: leads.map(([amount, unit]) => ({ amount, unit })) })

// The errors of a rejected save, by field key; fails when it was not rejected or something was sent.
async function errorsOf(d: ReminderSettingsDraft): Promise<Record<string, string>> {
  const { routers, editSettings } = build()
  const r = await routers.saveSettings(d)
  expect(editSettings).not.toHaveBeenCalled()
  if (r.kind !== 'rejected') throw new Error(`test: expected rejected, got ${r.kind}`)
  expect(r).toMatchObject({ origin: 'input', code: 'INPUT_FORMAT' })
  return r.fieldErrors
}

// What was sent for a valid draft.
async function sentFor(d: ReminderSettingsDraft): Promise<unknown> {
  const { routers, editSettings } = build()
  const r = await routers.saveSettings(d)
  expect(r).toEqual({ kind: 'ok', view: { message: 'Đã lưu cài đặt nhắc việc.' } })
  expect(editSettings).toHaveBeenCalledTimes(1)
  return (editSettings.mock.calls as unknown as unknown[][])[0][0]
}

describe('a valid draft is sent converted, with exactly the fields of reminder_settings_input', () => {
  it('weeks with a weekday, two lead times', async () => {
    expect(await sentFor(DRAFT)).toEqual({
      periodic: { enabled: true, every: 2, unit: 'weeks', at_time: '09:30', weekday: 3 },
      deadline: { enabled: true, lead_times: [{ amount: 1, unit: 'days' }, { amount: 12, unit: 'hours' }] },
    })
  })

  it('unit "ngày" sends weekday null, whatever the draft still holds', async () => {
    const sent = (await sentFor(draft({ periodicUnit: 'days', weekday: '' }))) as { periodic: { weekday: unknown } }
    expect(sent.periodic.weekday).toBeNull()
    const stale = (await sentFor(draft({ periodicUnit: 'days', weekday: '4' }))) as { periodic: { weekday: unknown } }
    expect(stale.periodic.weekday).toBeNull()
  })

  it('numbers are trimmed and leading zeros dropped; the switches are sent as they are', async () => {
    const sent = (await sentFor(draft({ every: ' 007 ', periodicEnabled: false, deadlineEnabled: false }))) as {
      periodic: { every: number; enabled: boolean }
      deadline: { enabled: boolean }
    }
    expect(sent.periodic.every).toBe(7)
    expect(sent.periodic.enabled).toBe(false)
    expect(sent.deadline.enabled).toBe(false)
  })

  it('the five fields of periodic and the two of deadline, nothing more', async () => {
    const sent = (await sentFor(DRAFT)) as { periodic: object; deadline: object }
    expect(Object.keys(sent).sort()).toEqual(['deadline', 'periodic'])
    expect(Object.keys(sent.periodic).sort()).toEqual(['at_time', 'enabled', 'every', 'unit', 'weekday'])
    expect(Object.keys(sent.deadline).sort()).toEqual(['enabled', 'lead_times'])
  })
})

describe('every ("Mỗi")', () => {
  it.each([['1'], ['0001'], [' 3 '], ['9007199254740991']])('%j is accepted', async (every) => {
    await sentFor(draft({ every }))
  })

  it('empty → required, "Nhập số ngày hoặc số tuần"', async () => {
    expect(await errorsOf(draft({ every: '' }))).toEqual({ 'periodic.every': 'Nhập số ngày hoặc số tuần' })
    expect(await errorsOf(draft({ every: '   ' }))).toEqual({ 'periodic.every': 'Nhập số ngày hoặc số tuần' })
  })

  it.each([['0'], ['-1'], ['1.5'], ['abc'], ['1e3'], ['+1'], ['1 2'], ['9007199254740992'], ['99999999999999999999']])('%j → "Nhập một số nguyên từ 1 trở lên"', async (every) => {
    expect(await errorsOf(draft({ every }))).toEqual({ 'periodic.every': 'Nhập một số nguyên từ 1 trở lên' })
  })
})

describe('at_time ("Vào lúc")', () => {
  it.each([['00:00'], ['23:59'], ['09:05'], ['12:30']])('%s is accepted and sent as is', async (atTime) => {
    expect(((await sentFor(draft({ atTime }))) as { periodic: { at_time: string } }).periodic.at_time).toBe(atTime)
  })

  it.each([[''], ['9:00'], ['24:00'], ['12:60'], ['09:00:00'], ['ab:cd']])('%j → "Chọn giờ nhắc"', async (atTime) => {
    expect(await errorsOf(draft({ atTime }))).toEqual({ 'periodic.at_time': 'Chọn giờ nhắc' })
  })
})

describe('weekday ("Vào thứ")', () => {
  it('unit "tuần" with no weekday chosen → "Chọn thứ trong tuần"', async () => {
    expect(await errorsOf(draft({ weekday: '' }))).toEqual({ 'periodic.weekday': 'Chọn thứ trong tuần' })
  })

  it.each([['0'], ['8'], ['x']])('unit "tuần" with weekday %j → "Chọn thứ trong tuần"', async (weekday) => {
    expect(await errorsOf(draft({ weekday }))).toEqual({ 'periodic.weekday': 'Chọn thứ trong tuần' })
  })

  it.each([['1', 1], ['7', 7]])('weekday %s is sent as the number %i', async (weekday, expected) => {
    expect(((await sentFor(draft({ weekday }))) as { periodic: { weekday: number } }).periodic.weekday).toBe(expected)
  })

  it('unit "ngày" asks no weekday', async () => {
    await sentFor(draft({ periodicUnit: 'days', weekday: '' }))
  })

  it('a unit outside the list or none → an error on the unit', async () => {
    expect(await errorsOf(draft({ periodicUnit: '' }))).toEqual({ 'periodic.unit': 'Chọn ngày hoặc tuần' })
    expect(await errorsOf(draft({ periodicUnit: 'months' }))).toEqual({ 'periodic.unit': 'Chọn ngày hoặc tuần trong danh sách' })
  })
})

describe('lead times ("Mốc nhắc")', () => {
  it('365 days and 8760 hours are accepted', async () => {
    await sentFor(withLeads(['365', 'days']))
    await sentFor(withLeads(['8760', 'hours']))
  })

  it('366 days and 8761 hours → "Mốc nhắc tối đa 365 ngày (8760 giờ)", on that row', async () => {
    expect(await errorsOf(withLeads(['366', 'days']))).toEqual({ 'deadline.lead_times.0.amount': 'Mốc nhắc tối đa 365 ngày (8760 giờ)' })
    expect(await errorsOf(withLeads(['1', 'days'], ['8761', 'hours']))).toEqual({ 'deadline.lead_times.1.amount': 'Mốc nhắc tối đa 365 ngày (8760 giờ)' })
    expect(await errorsOf(withLeads(['99999999999', 'hours']))).toEqual({ 'deadline.lead_times.0.amount': 'Mốc nhắc tối đa 365 ngày (8760 giờ)' })
    // Above 2^53−1 it is no integer the contract holds: the other words.
    expect(await errorsOf(withLeads(['9007199254740992', 'hours']))).toEqual({ 'deadline.lead_times.0.amount': 'Nhập một số nguyên từ 1 trở lên' })
  })

  it('empty → "Nhập thời gian nhắc trước"; 0, -1, 1.5, abc → "Nhập một số nguyên từ 1 trở lên"', async () => {
    expect(await errorsOf(withLeads(['', 'days']))).toEqual({ 'deadline.lead_times.0.amount': 'Nhập thời gian nhắc trước' })
    for (const amount of ['0', '-1', '1.5', 'abc']) {
      expect(await errorsOf(withLeads(['1', 'days'], [amount, 'hours']))).toEqual({ 'deadline.lead_times.1.amount': 'Nhập một số nguyên từ 1 trở lên' })
    }
  })

  it('"1 ngày" with "24 giờ" → the later one is told it duplicates another', async () => {
    expect(await errorsOf(withLeads(['1', 'days'], ['24', 'hours']))).toEqual({ 'deadline.lead_times.1': 'Mốc nhắc này trùng với một mốc khác' })
    expect(await errorsOf(withLeads(['24', 'hours'], ['1', 'days']))).toEqual({ 'deadline.lead_times.1': 'Mốc nhắc này trùng với một mốc khác' })
    expect(await errorsOf(withLeads(['3', 'hours'], ['5', 'hours'], ['3', 'hours']))).toEqual({ 'deadline.lead_times.2': 'Mốc nhắc này trùng với một mốc khác' })
  })

  it('"2 ngày" with "24 giờ" are different lengths: accepted, sent in the order given', async () => {
    const sent = (await sentFor(withLeads(['2', 'days'], ['24', 'hours']))) as { deadline: { lead_times: unknown } }
    expect(sent.deadline.lead_times).toEqual([{ amount: 2, unit: 'days' }, { amount: 24, unit: 'hours' }])
  })

  it('five rows are accepted; none or six are errors on the list', async () => {
    await sentFor(withLeads(['1', 'hours'], ['2', 'hours'], ['3', 'hours'], ['4', 'hours'], ['5', 'hours']))
    expect(Object.keys(await errorsOf(draft({ leadTimes: [] })))).toEqual(['deadline.lead_times'])
    const six = [1, 2, 3, 4, 5, 6].map((a) => ({ amount: String(a), unit: 'hours' }))
    expect(Object.keys(await errorsOf(draft({ leadTimes: six })))).toEqual(['deadline.lead_times'])
  })

  it('a unit outside the list → an error on that row\'s unit', async () => {
    expect(await errorsOf(withLeads(['1', '']))).toEqual({ 'deadline.lead_times.0.unit': 'Chọn giờ hoặc ngày' })
    expect(await errorsOf(withLeads(['1', 'weeks']))).toEqual({ 'deadline.lead_times.0.unit': 'Chọn giờ hoặc ngày trong danh sách' })
  })
})

describe('a part switched off is checked all the same (the contract asks every field valid)', () => {
  it('periodic off with "Mỗi" empty → error', async () => {
    expect(await errorsOf(draft({ periodicEnabled: false, every: '' }))).toEqual({ 'periodic.every': 'Nhập số ngày hoặc số tuần' })
  })

  it('periodic off with a bad time and no weekday → both errors', async () => {
    expect(Object.keys(await errorsOf(draft({ periodicEnabled: false, atTime: '', weekday: '' }))).sort()).toEqual(['periodic.at_time', 'periodic.weekday'])
  })

  it('deadline off with a duplicate or a lead too long → error', async () => {
    expect(await errorsOf(draft({ deadlineEnabled: false, leadTimes: [{ amount: '1', unit: 'days' }, { amount: '24', unit: 'hours' }] }))).toEqual({
      'deadline.lead_times.1': 'Mốc nhắc này trùng với một mốc khác',
    })
    expect(await errorsOf(draft({ deadlineEnabled: false, leadTimes: [{ amount: '400', unit: 'days' }] }))).toEqual({ 'deadline.lead_times.0.amount': 'Mốc nhắc tối đa 365 ngày (8760 giờ)' })
  })

  it('errors of several fields come together, each on its own key', async () => {
    const errors = await errorsOf(draft({ every: '0', atTime: '24:00', weekday: '', leadTimes: [{ amount: '', unit: 'days' }, { amount: '1', unit: 'days' }, { amount: '24', unit: 'hours' }] }))
    expect(Object.keys(errors).sort()).toEqual(['deadline.lead_times.0.amount', 'deadline.lead_times.2', 'periodic.at_time', 'periodic.every', 'periodic.weekday'])
  })
})

describe('the other operations go straight to Services', () => {
  it('loadPending, acknowledge and openSettings make one adapter call each', async () => {
    const listPending = vi.fn(async (): Promise<CallResult<never[]>> => ({ kind: 'ok', label: 200, data: [] }))
    const acknowledge = vi.fn(async (): Promise<CallResult<never>> => ({ kind: 'unreachable', reason: 'x' }))
    const getSettings = vi.fn(async (): Promise<CallResult<never>> => ({ kind: 'unreachable', reason: 'x' }))
    const never = vi.fn(async () => {
      throw new Error('test: not expected')
    })
    const services = createSendReminderServices({ listPending, acknowledge, getSettings, editSettings: never } as unknown as SendReminderAdapters, cfg, messages)
    const routers = createSendReminderRouters(services, { limits: cfg.limits, formats: cfg.formats, periodicUnits: cfg.periodicUnits, leadUnits: cfg.leadUnits })
    expect((await routers.loadPending()).kind).toBe('ok')
    expect((await routers.acknowledge('id-1')).kind).toBe('unreachable')
    expect((await routers.openSettings()).kind).toBe('unreachable')
    expect(listPending).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledExactlyOnceWith('id-1')
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(never).not.toHaveBeenCalled()
  })

  it('the draft operations are those of Services (no call)', () => {
    const { routers } = build()
    expect(routers.changePeriodicUnit(DRAFT, 'days').weekday).toBe('')
    expect(routers.addLeadTime(draft({ leadTimes: [{ amount: '1', unit: 'days' }] })).leadTimes).toHaveLength(2)
    expect(routers.removeLeadTime(DRAFT, 0).leadTimes).toEqual([{ amount: '12', unit: 'hours' }])
  })
})
