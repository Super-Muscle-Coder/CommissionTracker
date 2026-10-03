/**
 * Entities of the interface workflow send_reminder: types only. Types at the
 * boundary keep the contract's field names (data_schema.yaml 9.0.2,
 * clause_a_common types and clause_b_backend.send_reminder).
 */

// Realizes reminder_settings_record.periodic.unit: 'days' | 'weeks'.
export type PeriodicUnit = 'days' | 'weeks'

// Realizes reminder_settings_record.deadline.lead_times[].unit: 'hours' | 'days'.
export type LeadUnit = 'hours' | 'days'

// Realizes reminder_settings_record.deadline.lead_times[]: object { amount:
// integer (>= 1), unit }.
export type LeadTime = {
  amount: number
  unit: LeadUnit
}

// Realizes clause_a_common.types.reminder_settings_record. Also the shape of
// reminder_settings_input (sent): exactly these fields, nothing more.
export type ReminderSettingsRecord = {
  periodic: {
    enabled: boolean
    every: number
    unit: PeriodicUnit
    // HH:MM, local time.
    at_time: string
    // ISO weekday 1..7, required when unit = 'weeks', null when unit = 'days'.
    weekday: number | null
  }
  deadline: {
    enabled: boolean
    // 1..5 entries.
    lead_times: LeadTime[]
  }
}

// Realizes reminder_settings: object { settings: reminder_settings_record,
// updated_at: timestamp|null } (null = defaults, never saved).
export type ReminderSettings = {
  settings: ReminderSettingsRecord
  updated_at: string | null
}

// Realizes reminder_notification_record.deadline_item.
export type DeadlineItem = {
  commission_id: string
  title: string
  deadline: string
  lead: LeadTime
}

// Realizes reminder_notification_record.digest.upcoming[].
export type DigestUpcoming = {
  commission_id: string
  title: string
  deadline: string
}

// Realizes reminder_notification_record.digest.
export type Digest = {
  open_count: number
  upcoming: DigestUpcoming[]
}

// Realizes clause_a_common.types.reminder_notification_record: object {
// notification_id: id, kind: 'periodic_digest' | 'deadline', due_at: timestamp,
// deadline_item: object|null (set when kind = 'deadline'), digest: object|null
// (set when kind = 'periodic_digest') }. Written as one case per kind, so the
// shape that goes with a kind is what the type says (Adapters checks it).
export type DeadlineReminder = {
  notification_id: string
  kind: 'deadline'
  due_at: string
  deadline_item: DeadlineItem
  digest: null
}
export type DigestReminder = {
  notification_id: string
  kind: 'periodic_digest'
  due_at: string
  deadline_item: null
  digest: Digest
}
export type ReminderNotificationRecord = DeadlineReminder | DigestReminder

// Realizes pending_notifications: list[reminder_notification_record] — every
// handed-out, unacknowledged reminder, oldest first.
export type PendingNotifications = ReminderNotificationRecord[]

// Realizes notification_ack: object { notification_id: id, acknowledged_at: timestamp }.
export type NotificationAck = {
  notification_id: string
  acknowledged_at: string
}

// --- raw input from the page (what the user typed), handed to Routers ---------

// One entry of "Mốc nhắc" as typed.
export type LeadTimeDraft = {
  // The number as typed.
  amount: string
  // The chosen unit: 'hours' or 'days'.
  unit: string
}

export type ReminderSettingsDraft = {
  periodicEnabled: boolean
  // "Mỗi": the number as typed.
  every: string
  // The chosen unit: 'days' or 'weeks'.
  periodicUnit: string
  // The value of the time input: HH:mm ('' = none).
  atTime: string
  // The chosen weekday as the ISO number written as text; '' = none chosen.
  weekday: string
  deadlineEnabled: boolean
  leadTimes: LeadTimeDraft[]
}

// --- view models — the interface's own -----------------------------------------

export type ChoiceView = { value: string; label: string }

// Where a click on the main line of a reminder goes (the page turns it into a
// navigation).
export type OpenTarget = { to: 'commission_detail'; commissionId: string } | { to: 'commission_list' }

// One reminder of the list.
export type PendingRowView = {
  notificationId: string
  // The main line.
  text: string
  // The secondary line.
  detailText: string
  open: OpenTarget
}

// What reminder_list shows.
export type PendingListView = {
  rows: PendingRowView[]
  isEmpty: boolean
  emptyText: string
}

// Outcome of "Đã xem".
export type AcknowledgedView = { message: string }

// What reminder_settings opens with.
export type SettingsFormView = {
  // "Chưa lưu lần nào, …" or "Lưu lần cuối lúc …".
  subtitle: string
  draft: ReminderSettingsDraft
  periodicUnitChoices: ChoiceView[]
  weekdayChoices: ChoiceView[]
  leadUnitChoices: ChoiceView[]
  // The unit of the cadence for which the weekday is asked (and sent).
  weekdayUnit: string
  // The number of entries of "Mốc nhắc" the page may hold ([CONTRACT] 1..5).
  leadTimeLimits: { min: number; max: number }
}

// Outcome of saving the settings.
export type SavedSettingsView = { message: string }
