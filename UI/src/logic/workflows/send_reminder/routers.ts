/**
 * Routers of the interface workflow send_reminder: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing a page does (.design/ui_decomposition.md, "Chặng D6": pages
 * reminder_list and reminder_settings).
 */
import type { InputFormatCode, ViewResult } from '../../shared/results'
import type { SendReminderConfigs } from './configs'
import type {
  AcknowledgedView,
  PendingListView,
  ReminderSettingsDraft,
  ReminderSettingsRecord,
  SavedSettingsView,
  SettingsFormView,
} from './entities'
import type { SendReminderServices } from './services'

// The Configs values Routers checks with, handed over by Main (R14).
export type SendReminderRules = Pick<SendReminderConfigs, 'limits' | 'formats' | 'periodicUnits' | 'leadUnits'>

// A string of digits without leading zeros ("0" for zero).
const withoutLeadingZeros = (digits: string) => digits.replace(/^0+(?=[0-9])/, '')

// a <= b for two strings of digits without leading zeros: an integer
// comparison done on the digits, so no number is ever rounded.
const notAbove = (a: string, b: string) => a.length < b.length || (a.length === b.length && a <= b)

type NumberRead = { ok: true; value: number } | { ok: false; code: InputFormatCode }

type Errors = Record<string, InputFormatCode>

export function createSendReminderRouters(services: SendReminderServices, rules: SendReminderRules) {
  const { leadTimes, weekday } = rules.limits

  // Reads a whole number as typed (ui_decomposition.md D6, "Kiểm trước khi
  // gửi"). That it is an integer >= 1 and within ±(2^53−1) is the contract
  // (reminder_settings_record: every, lead_times[].amount); the way of writing
  // it is [UI-ONLY]. Done on the string of digits only — never through a
  // floating-point number. Reasons: 'required' (empty), 'not_integer' (not
  // written as an integer, or above 2^53−1: outside the safe range),
  // 'violates_type_constraint' (zero or negative: ">= 1").
  function readPositiveInteger(raw: string): NumberRead {
    const s = raw.trim()
    if (s === '') return { ok: false, code: 'required' }
    if (!/^-?[0-9]+$/.test(s)) return { ok: false, code: 'not_integer' }
    const digits = withoutLeadingZeros(s.replace('-', ''))
    // Above 2^53−1: outside the range every integer of the contract lies in.
    if (!notAbove(digits, rules.limits.maxSafeInteger)) return { ok: false, code: 'not_integer' }
    if (s.startsWith('-') || digits === '0') return { ok: false, code: 'violates_type_constraint' }
    // At most 2^53−1, so Number() holds it exactly.
    return { ok: true, value: Number(digits) }
  }

  // Format check and conversion of the form draft, before anything is sent
  // (ui_decomposition.md D6, page reminder_settings). Every rule is copied from
  // the contract (data_schema.yaml 9.0.2 types.reminder_settings_record) and
  // applies to the whole draft whether a part is switched on or not, since the
  // contract asks for every field to be valid either way:
  //   - periodic.every: an integer >= 1;
  //   - periodic.unit: 'days' or 'weeks';
  //   - periodic.at_time: HH:MM, 00:00..23:59;
  //   - periodic.weekday: 1..7 and required when unit = 'weeks'; null when 'days';
  //   - deadline.lead_times: 1..5 entries; each amount an integer >= 1, at most
  //     365 days / 8760 hours (1 day = 24 hours); each unit 'hours' or 'days';
  //     no two entries of the same duration.
  // Field keys are the contract's field paths; the index of a lead time is its
  // place in the list; a duplicate is keyed on the later entry as a whole
  // ('deadline.lead_times.<i>'), every other lead time error on its field.
  function readDraft(draft: ReminderSettingsDraft): { ok: true; input: ReminderSettingsRecord } | { ok: false; errors: Errors } {
    const errors: Errors = {}
    const fail = (field: string, code: InputFormatCode) => {
      errors[field] = code
    }

    const every = readPositiveInteger(draft.every)
    if (!every.ok) fail('periodic.every', every.code)

    const periodicUnit = rules.periodicUnits.find((u) => u === draft.periodicUnit)
    if (draft.periodicUnit === '') fail('periodic.unit', 'required')
    else if (periodicUnit === undefined) fail('periodic.unit', 'not_in_list')

    const atTime = draft.atTime.trim()
    if (atTime === '') fail('periodic.at_time', 'required')
    else if (!rules.formats.atTime.test(atTime)) fail('periodic.at_time', 'not_timestamp')

    // The weekday goes with the unit: read only for 'weeks', null for 'days'.
    let weekdayValue: number | null = null
    if (periodicUnit === 'weeks') {
      const w = draft.weekday.trim()
      if (w === '') fail('periodic.weekday', 'required')
      else if (!/^[0-9]$/.test(w) || Number(w) < weekday.min || Number(w) > weekday.max) fail('periodic.weekday', 'not_in_list')
      else weekdayValue = Number(w)
    }

    if (draft.leadTimes.length < leadTimes.min) fail('deadline.lead_times', 'required')
    else if (draft.leadTimes.length > leadTimes.max) fail('deadline.lead_times', 'not_in_list')

    const leads: { amount: number; unit: (typeof rules.leadUnits)[number] }[] = []
    const seenHours = new Set<number>()
    draft.leadTimes.forEach((row, i) => {
      const unit = rules.leadUnits.find((u) => u === row.unit)
      if (row.unit === '') fail(`deadline.lead_times.${i}.unit`, 'required')
      else if (unit === undefined) fail(`deadline.lead_times.${i}.unit`, 'not_in_list')
      const amount = readPositiveInteger(row.amount)
      if (!amount.ok) {
        // For an amount, 'violates_type_constraint' is kept for the upper bound (365 days / 8760
        // hours), so zero and negative are told as 'not_integer' (their words: "Nhập một số nguyên từ 1 trở lên").
        fail(`deadline.lead_times.${i}.amount`, amount.code === 'violates_type_constraint' ? 'not_integer' : amount.code)
        return
      }
      if (unit === undefined) return
      // At most 365 days = 8760 hours: an amount above 8760 is too long in either unit.
      const hours = unit === 'days' ? amount.value * leadTimes.hoursPerDay : amount.value
      if (amount.value > leadTimes.maxHours || hours > leadTimes.maxHours) {
        fail(`deadline.lead_times.${i}.amount`, 'violates_type_constraint')
        return
      }
      // No two entries of the same length: the later one is the one in error.
      if (seenHours.has(hours)) fail(`deadline.lead_times.${i}`, 'violates_type_constraint')
      seenHours.add(hours)
      leads.push({ amount: amount.value, unit })
    })

    if (Object.keys(errors).length > 0 || !every.ok || periodicUnit === undefined) return { ok: false, errors }
    return {
      ok: true,
      input: {
        periodic: { enabled: draft.periodicEnabled, every: every.value, unit: periodicUnit, at_time: atTime, weekday: weekdayValue },
        deadline: { enabled: draft.deadlineEnabled, lead_times: leads },
      },
    }
  }

  return {
    // Page reminder_list: load (or reload) the reminders waiting.
    loadPending(): Promise<ViewResult<PendingListView>> {
      return services.loadPending()
    },

    // Page reminder_list: "Đã xem" on one reminder.
    acknowledge(notificationId: string): Promise<ViewResult<AcknowledgedView>> {
      return services.acknowledge(notificationId)
    },

    // Page reminder_settings: what the form opens with.
    openSettings(): Promise<ViewResult<SettingsFormView>> {
      return services.openSettings()
    },

    // Page reminder_settings: save. Nothing is sent when the draft fails the
    // format check; the page keeps the draft as typed.
    async saveSettings(draft: ReminderSettingsDraft): Promise<ViewResult<SavedSettingsView>> {
      const read = readDraft(draft)
      if (!read.ok) return services.rejectInput(read.errors)
      return services.saveSettings(read.input)
    },

    // Page reminder_settings: the draft after a change that moves other fields
    // with it (pure: no call).
    changePeriodicUnit(draft: ReminderSettingsDraft, unit: string): ReminderSettingsDraft {
      return services.changePeriodicUnit(draft, unit)
    },
    addLeadTime(draft: ReminderSettingsDraft): ReminderSettingsDraft {
      return services.addLeadTime(draft)
    },
    removeLeadTime(draft: ReminderSettingsDraft, index: number): ReminderSettingsDraft {
      return services.removeLeadTime(draft, index)
    },
    // Page reminder_settings: the last save result once the rows of "Mốc nhắc"
    // have changed (pure: no call): the errors bound to a row are gone (UI-13).
    dropLeadTimeErrors(saved: ViewResult<SavedSettingsView>): ViewResult<SavedSettingsView> {
      return services.dropLeadTimeErrors(saved)
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type SendReminderRouters = ReturnType<typeof createSendReminderRouters>
export type { ViewResult } from '../../shared/results'
export type {
  AcknowledgedView,
  ChoiceView,
  LeadTimeDraft,
  OpenTarget,
  PendingListView,
  PendingRowView,
  ReminderSettingsDraft,
  SavedSettingsView,
  SettingsFormView,
} from './entities'
