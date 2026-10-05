/**
 * Text of a reminder toast: presentation only (api_contract.yaml
 * cross_cutting.reminder_ticker). Pure functions, no Electron, no I/O.
 *
 * Own entity of the ticker: the shape of one element of check_due's
 * new_notifications (data_schema.yaml types.reminder_notification_record),
 * read by hand. The ticker checks only what it needs to build the text; it
 * does not re-check any business rule of send_reminder.
 */

/** Wording, from configs/desktop.json (reminder_ticker.toast). Placeholders
 * are written {name}. */
export interface ToastTextConfig {
  deadline_title: string
  deadline_body: string
  unit_days: string
  unit_hours: string
  digest_title: string
  digest_body: string
  digest_earliest: string
}

export interface DatedItem {
  title: string
  /** Date as the contract writes it, YYYY-MM-DD. */
  deadline: string
}

export type ReminderNotification =
  | { kind: 'deadline'; notificationId: string; title: string; deadline: string; leadAmount: number; leadUnit: 'hours' | 'days' }
  | { kind: 'periodic_digest'; notificationId: string; openCount: number; upcoming: DatedItem[] }

export type ReadResult = { ok: true; notification: ReminderNotification } | { ok: false; reason: string }

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

/** dd/mm/yyyy cut from the YYYY-MM-DD string: no Date object, so no time zone
 * can move the day. Null when the string is not a date. */
export function formatDate(deadline: string): string | null {
  const match = DATE_PATTERN.exec(deadline)
  return match === null ? null : `${match[3]}/${match[2]}/${match[1]}`
}

/** Replaces each {name} of the template once; the inserted values are not
 * scanned again, so a title that contains braces stays as it is. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole)
}

function readDated(raw: unknown): DatedItem | null {
  if (!isRecord(raw) || typeof raw.title !== 'string' || typeof raw.deadline !== 'string' || formatDate(raw.deadline) === null) return null
  return { title: raw.title, deadline: raw.deadline }
}

/** One element of the check_due answer, or why it cannot be shown. */
export function readNotification(raw: unknown): ReadResult {
  if (!isRecord(raw)) return { ok: false, reason: 'not an object' }
  const notificationId = raw.notification_id
  if (typeof notificationId !== 'string' || notificationId === '') return { ok: false, reason: 'notification_id is missing' }
  if (raw.kind === 'deadline') {
    const item = raw.deadline_item
    if (!isRecord(item)) return { ok: false, reason: 'kind deadline without deadline_item' }
    const dated = readDated(item)
    const lead = item.lead
    if (dated === null) return { ok: false, reason: 'deadline_item has no title or no date' }
    if (!isRecord(lead) || !isCount(lead.amount) || (lead.unit !== 'hours' && lead.unit !== 'days')) {
      return { ok: false, reason: 'deadline_item.lead is malformed' }
    }
    return { ok: true, notification: { kind: 'deadline', notificationId, ...dated, leadAmount: lead.amount, leadUnit: lead.unit } }
  }
  if (raw.kind === 'periodic_digest') {
    const digest = raw.digest
    if (!isRecord(digest)) return { ok: false, reason: 'kind periodic_digest without digest' }
    if (!isCount(digest.open_count) || !Array.isArray(digest.upcoming)) return { ok: false, reason: 'digest is malformed' }
    const upcoming: DatedItem[] = []
    for (const entry of digest.upcoming) {
      const dated = readDated(entry)
      if (dated === null) return { ok: false, reason: 'a digest.upcoming element is malformed' }
      upcoming.push(dated)
    }
    return { ok: true, notification: { kind: 'periodic_digest', notificationId, openCount: digest.open_count, upcoming } }
  }
  return { ok: false, reason: `unknown kind ${JSON.stringify(raw.kind)}` }
}

/** Title and body of the toast, the same wording as the reminder_list page. */
export function buildToastText(text: ToastTextConfig, notification: ReminderNotification): { title: string; body: string } {
  if (notification.kind === 'deadline') {
    const unit = notification.leadUnit === 'days' ? text.unit_days : text.unit_hours
    return {
      title: fill(text.deadline_title, { title: notification.title }),
      body: fill(text.deadline_body, {
        date: formatDate(notification.deadline) ?? notification.deadline,
        amount: String(notification.leadAmount),
        unit,
      }),
    }
  }
  const first = notification.upcoming[0]
  const earliest =
    first === undefined ? '' : fill(text.digest_earliest, { title: first.title, date: formatDate(first.deadline) ?? first.deadline })
  return {
    title: fill(text.digest_title, { open_count: String(notification.openCount) }),
    body: fill(text.digest_body, { count: String(notification.upcoming.length) }) + earliest,
  }
}
