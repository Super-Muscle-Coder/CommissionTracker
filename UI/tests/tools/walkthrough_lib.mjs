// Shared by the walkthrough tools (npm run walkthrough:app, npm run
// walkthrough:backend) and the automated walkthrough (tests/e2e). Test tooling
// only: never part of the layer, never loaded by the renderer.
//
// The desktop app is started from Desktop/ with its test flags
// (Desktop/configs/desktop.json test_flags): a temporary data folder (never
// the real %APPDATA%) and, as backend script, the fixture
// tests/fixtures/switchable_backend.py run from Backend/ by the default
// interpreter. Sample data goes in through the backend's declared endpoints
// (api_contract.yaml 4.0.0, manage_client.create_client and
// set_client_archived): this tool is a test, not the layer.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const DESKTOP_ROOT = path.resolve(UI_ROOT, '..', 'Desktop')
export const BACKEND_ROOT = path.resolve(UI_ROOT, '..', 'Backend')
export const FIXTURE = path.join(UI_ROOT, 'tests', 'fixtures', 'switchable_backend.py')
export const SESSION_FILE = path.join(os.tmpdir(), 'ct-ui-walkthrough-session.json')

const CONTROL_FILE = 'switchable_backend.control'
const STATE_FILE = 'switchable_backend.state'

export const desktopConfig = JSON.parse(fs.readFileSync(path.join(DESKTOP_ROOT, 'configs', 'desktop.json'), 'utf8'))

// Who runs the walkthrough, as written in every run record (iWCA I6.3: the
// runner is always named). Taken from the environment variable
// CT_WALKTHROUGH_RUNNER, e.g. coding-agent@2026-09-28#1 or the Project
// Owner's name; 'unknown' when it is missing or blank. Never guessed.
export const RUNNER_VARIABLE = 'CT_WALKTHROUGH_RUNNER'
export function walkthroughRunner() {
  const value = (process.env[RUNNER_VARIABLE] ?? '').trim()
  return value === '' ? 'unknown' : value
}

// Where the evidence of a run (screenshots, run records) is written — the only
// place that decides it (UI-8 of .plan/open_issues.md). A named runner writes
// the evidence kept in git, UI/evidence/. Without CT_WALKTHROUGH_RUNNER (a
// regression run, e.g. by another layer's session) it goes to draft evidence
// under UI/test-results/, which git ignores, so committed evidence is never
// overwritten by a run nobody signed.
export function evidenceRoot() {
  return isEvidenceRun() ? path.join(UI_ROOT, 'evidence') : path.join(UI_ROOT, 'test-results', 'evidence')
}

// A run that writes the evidence kept in git: CT_WALKTHROUGH_RUNNER names the runner.
function isEvidenceRun() {
  return (process.env[RUNNER_VARIABLE] ?? '').trim() !== ''
}

// UI-18 (session 31): whether an automated run opens the app WITHOUT taking the
// foreground (the Desktop test flag --ct-test-show-inactive, DSK-18), so that it does
// not take the focus, and the keys, of the person using the machine. Yes for every
// regression run (no CT_WALKTHROUGH_RUNNER). No for a run that writes evidence: the
// images kept in UI/evidence must be taken under the conditions they were taken
// under so far, and a window without focus may draw its focus ring and its text
// caret differently. The manual tool walkthrough_app.mjs never asks for it either:
// there the window must appear in front of the person.
export function showInactiveForRun() {
  return !isEvidenceRun()
}

// The line the desktop Main logs on stderr when it shows the window without
// focus (Desktop/src/main.ts, checkpoint main-EXP-024). A test reads it to know
// the flag reached Main and took effect.
export const SHOW_INACTIVE_LOG_LINE = 'ready-to-show: showing the window without focus (test flag)'

// require('electron') from Node answers the path of the Electron binary.
export function electronBinary() {
  return createRequire(path.join(DESKTOP_ROOT, 'package.json'))('electron')
}

export function makeDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ct-ui-walkthrough-'))
}

// Arguments of the Electron binary: the desktop app, with the fixture as backend.
// showInactive (UI-18) adds the Desktop flag test_flags.show_inactive, read from
// Desktop/configs/desktop.json; it is off unless the caller asks.
export function launchArgs(dataDir, { noDialog, showInactive = false }) {
  const flags = desktopConfig.test_flags
  return [
    DESKTOP_ROOT,
    `${flags.data_dir}${dataDir}`,
    `${flags.backend_script}${FIXTURE}`,
    `${flags.backend_working_dir}${BACKEND_ROOT}`,
    ...(noDialog ? [flags.no_dialog] : []),
    ...(showInactive ? [flags.show_inactive] : []),
  ]
}

// The desktop Main logs "backend READY on port N" on stderr.
export function portFromLog(log) {
  const m = /backend READY on port (\d+)/.exec(log)
  return m === null ? null : Number(m[1])
}

export function baseUrlFor(port) {
  return `http://${desktopConfig.boundary.loopback_host}:${port}`
}

// Folder of CT_DB_FILE_PATH for this data folder (where the fixture reads its control file).
function dbFolder(dataDir) {
  return path.dirname(path.join(dataDir, ...desktopConfig.boundary.db_file_relative_to_app_data.split('/')))
}

export function writeSession(session) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2))
}

export function readSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`No running walkthrough app (${SESSION_FILE} is missing): start one with npm run walkthrough:app`)
  }
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
}

export function clearSession() {
  fs.rmSync(SESSION_FILE, { force: true })
}

// Switch the backend behind the running app off ('down') or on ('up'), and
// wait until the fixture reports the switch done.
export async function setBackend(dataDir, wanted, timeoutMs = 60_000) {
  if (wanted !== 'down' && wanted !== 'up') throw new Error(`expected down or up, got ${JSON.stringify(wanted)}`)
  const folder = dbFolder(dataDir)
  fs.writeFileSync(path.join(folder, CONTROL_FILE), wanted)
  const statePath = path.join(folder, STATE_FILE)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8').trim() : null
    if (state === wanted) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`the backend did not switch ${wanted} within ${timeoutMs} ms`)
}

// Sample data of the walkthroughs (client_list, client_detail, client_form):
// six names created in a jumbled order, one client with contacts and a note,
// and one archived client.
export const SAMPLE_ACTIVE = ['Zoe', 'Đức', 'An', 'Dung', 'Ánh', 'Bảo']
export const SAMPLE_DETAILED = {
  display_name: 'Nguyễn Thu Hà',
  contacts: [
    { channel: 'facebook', value: 'fb.com/thuha.art' },
    { channel: 'email', value: 'thuha@example.com' },
  ],
  note: 'Thích tông màu ấm. Giao file PSD.',
}
export const SAMPLE_ARCHIVED = ['Hà']
// What the list page must show (Vietnamese alphabetical order).
export const EXPECTED_ACTIVE = ['An', 'Ánh', 'Bảo', 'Dung', 'Đức', 'Nguyễn Thu Hà', 'Zoe']
export const EXPECTED_ARCHIVED = ['Hà']

async function call(baseUrl, method, pathname, body, expectedStatus) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${pathname}: expected ${expectedStatus}, got ${response.status} ${text}`)
  }
  return JSON.parse(text)
}

// The backend writes updated_at (and changed_at) to the second. Every seed
// function that writes commissions or stages waits this long after its LAST
// write, so that every write a walkthrough makes next is strictly newer than
// the sample (UI-9 of .plan/open_issues.md): two writes in the same second
// have an order that depends on two random ids.
export const AFTER_LAST_WRITE_MS = 1100
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Sample data of the D2 walkthroughs (commission_list, commission_detail,
// commission_form), with clients of their own — never those of the D1 sample:
// three clients; three commissions, created more than a second apart so that
// "most recently updated first" is a fixed order (the backend writes
// updated_at to the second); then "Lan Chi" is archived (her commission keeps
// her, which the contract allows). Ends AFTER_LAST_WRITE_MS after the last
// commission write (UI-9).
export const D2_CLIENTS = { full: 'Mai Anh', usd: 'Quốc Bảo', archived: 'Lan Chi' }
export const D2_COMMISSIONS = {
  full: {
    client: 'full',
    title: 'Chân dung bán thân',
    commission_type: 'bán thân',
    agreed_price: { amount_minor: 1500000, currency: 'VND' },
    deadline: '2026-10-15',
    description: 'Nền xanh, ánh sáng dịu.',
    reference_links: ['https://example.com/ref-1', 'https://example.com/ref-2'],
  },
  usd: {
    client: 'usd',
    title: 'Chibi đôi',
    commission_type: null,
    agreed_price: { amount_minor: 1250, currency: 'USD' },
    deadline: null,
    description: null,
    reference_links: [],
  },
  archived: {
    client: 'archived',
    title: 'Minh họa bìa sách',
    commission_type: 'minh họa',
    agreed_price: { amount_minor: 9000000, currency: 'VND' },
    deadline: '2026-01-01',
    description: null,
    reference_links: [],
  },
}
// What the list page must show, most recently updated first: [title, secondary line].
export const D2_EXPECTED_LIST = [
  ['Minh họa bìa sách', 'Lan Chi · 9.000.000 VND · Hạn giao 01/01/2026'],
  ['Chibi đôi', 'Quốc Bảo · 12,50 USD · Không có hạn'],
  ['Chân dung bán thân', 'Mai Anh · 1.500.000 VND · Hạn giao 15/10/2026'],
]

export async function seedCommissionSample(baseUrl) {
  const clients = {}
  for (const [key, name] of Object.entries(D2_CLIENTS)) {
    clients[key] = (await call(baseUrl, 'POST', '/clients', { client_input: { display_name: name, contacts: [], note: null } }, 201)).client_id
  }
  const ids = {}
  for (const [key, c] of Object.entries(D2_COMMISSIONS)) {
    // More than a second between two commissions: their order in the list is fixed.
    if (Object.keys(ids).length > 0) await pause(AFTER_LAST_WRITE_MS)
    // create_commission: POST /commissions, body { commission_input } (endpoint_forms.http).
    const { client, ...rest } = c
    ids[key] = (await call(baseUrl, 'POST', '/commissions', { commission_input: { client_id: clients[client], ...rest } }, 201)).commission_id
  }
  await call(baseUrl, 'PUT', `/clients/${clients.archived}/archived`, { is_archived: true }, 200)
  // UI-9: a commission the walkthrough saves next is never in the second of the last sample one.
  await pause(AFTER_LAST_WRITE_MS)
  return { clients, commissions: ids }
}

// change_stage: PUT /commissions/{commission_id}/stage, body { stage_change }
// (api_contract.yaml 4.0.0 update_progress; endpoint_forms.http).
export async function setStage(baseUrl, commissionId, toStage, note) {
  return call(baseUrl, 'PUT', `/commissions/${commissionId}/stage`, { stage_change: { to_stage: toStage, note } }, 200)
}

// Sample data of the D3 walkthroughs (progress_board, stage_change): the D2
// sample, one more commission, and stages set through the backend's declared
// endpoint:
//   "Chân dung bán thân" — sketch, then lineart (two history lines, more than
//     a second apart: changed_at is written to the second);
//   "Phác thảo nhân vật" (new, Mai Anh, deadline 01/10/2026) — lineart;
//   "Minh họa bìa sách" — delivered (a closed stage);
//   "Chibi đôi" — never set (the first stage, "Chờ bắt đầu").
// Ends AFTER_LAST_WRITE_MS after its last write (UI-9).
export const D3_EXTRA = {
  title: 'Phác thảo nhân vật',
  commission_type: null,
  agreed_price: { amount_minor: 300000, currency: 'VND' },
  deadline: '2026-10-01',
  description: null,
  reference_links: [],
}
export const D3_NOTES = { lineart: 'Khách duyệt phác thảo', delivered: 'Đã gửi file cuối' }
// What the board must show: [group heading, [title, secondary line] of each commission].
export const D3_EXPECTED_BOARD = [
  ['Chờ bắt đầu (1)', [['Chibi đôi', 'Không có hạn']]],
  [
    'Lên nét (2)',
    [
      ['Phác thảo nhân vật', 'Hạn giao 01/10/2026'],
      ['Chân dung bán thân', 'Hạn giao 15/10/2026'],
    ],
  ],
  ['Đã giao (1)', [['Minh họa bìa sách', 'Hạn giao 01/01/2026']]],
]

export async function seedProgressSample(baseUrl) {
  const sample = await seedCommissionSample(baseUrl)
  const extra = (await call(baseUrl, 'POST', '/commissions', { commission_input: { client_id: sample.clients.full, ...D3_EXTRA } }, 201)).commission_id
  await setStage(baseUrl, sample.commissions.full, 'sketch', null)
  await setStage(baseUrl, sample.commissions.archived, 'delivered', D3_NOTES.delivered)
  await setStage(baseUrl, extra, 'lineart', null)
  // Two changes of one commission more than a second apart: their history order is fixed.
  await pause(AFTER_LAST_WRITE_MS)
  await setStage(baseUrl, sample.commissions.full, 'lineart', D3_NOTES.lineart)
  // UI-9: a stage the walkthrough changes next is never in the second of the last sample one.
  await pause(AFTER_LAST_WRITE_MS)
  return { ...sample, commissions: { ...sample.commissions, extra } }
}

// record: POST /payments, body { commission_id, payment_input }; void_payment:
// PUT /payments/{payment_id}/void (api_contract.yaml 4.0.0 record_payment;
// endpoint_forms.http).
export async function recordPayment(baseUrl, commissionId, paymentInput) {
  return call(baseUrl, 'POST', '/payments', { commission_id: commissionId, payment_input: paymentInput }, 201)
}
export async function voidPayment(baseUrl, paymentId) {
  const response = await fetch(`${baseUrl}/payments/${paymentId}/void`, { method: 'PUT' })
  const text = await response.text()
  if (response.status !== 200) throw new Error(`PUT /payments/${paymentId}/void: expected 200, got ${response.status} ${text}`)
  return JSON.parse(text)
}

// Sample data of the D4 walkthrough payment_list (and the manual run
// npm run walkthrough:app -- --payments): the D2 sample (three commissions,
// none of them touched by the interface yet), and payments written through the
// backend's declared endpoints:
//   "Minh họa bìa sách" (9.000.000 VND) — five payments whose paid_at are far
//     apart (the list is sorted by paid_at, newest first, never by the time of
//     writing): a deposit of 3.000.000 (2026-09-01), a milestone of 2.000.000
//     (2026-09-10), a tip of 100.000 (2026-09-12), a refund of 500.000
//     (2026-09-15), and one of 250.000 (2026-09-20) that is then voided;
//     balance: received 4.600.000, still owed 4.500.000 (a tip never changes
//     what is owed; the voided payment counts for nothing);
//   "Chibi đôi" (12,50 USD) — one final payment of 15,00 USD: overpaid,
//     "Đã thu dư 2,50 USD";
//   "Chân dung bán thân" (1.500.000 VND) — no payment (the empty state).
// paid_at carries the +07:00 offset; the interface shows it in the machine's
// time zone, so the walkthrough computes what it expects with the same Intl
// call. Ends AFTER_LAST_WRITE_MS after the last write (UI-9), though the order
// of the payments never depends on the time they were written.
const pay = (direction, kind, amountMinor, currency, method, paidAt, note) => ({
  direction,
  kind,
  amount: { amount_minor: amountMinor, currency },
  method,
  paid_at: paidAt,
  note,
})
export const D4_PAYMENTS = {
  deposit: pay('incoming', 'deposit', 3000000, 'VND', 'Chuyển khoản', '2026-09-01T09:00:00+07:00', null),
  milestone: pay('incoming', 'milestone', 2000000, 'VND', 'MoMo', '2026-09-10T10:30:00+07:00', 'Đợt hai'),
  tip: pay('incoming', 'tip', 100000, 'VND', 'Tiền mặt', '2026-09-12T08:00:00+07:00', null),
  refund: pay('refund', 'other', 500000, 'VND', 'Chuyển khoản', '2026-09-15T16:45:00+07:00', 'Hoàn một phần'),
  mistaken: pay('incoming', 'other', 250000, 'VND', 'MoMo', '2026-09-20T12:00:00+07:00', 'Nhập nhầm'),
  overpaid: pay('incoming', 'final', 1500, 'USD', 'PayPal', '2026-09-05T20:15:00+07:00', null),
}

export async function seedPaymentSample(baseUrl) {
  const sample = await seedCommissionSample(baseUrl)
  const book = sample.commissions.archived
  await recordPayment(baseUrl, book, D4_PAYMENTS.deposit)
  await recordPayment(baseUrl, book, D4_PAYMENTS.milestone)
  await recordPayment(baseUrl, book, D4_PAYMENTS.tip)
  await recordPayment(baseUrl, book, D4_PAYMENTS.refund)
  const mistaken = await recordPayment(baseUrl, book, D4_PAYMENTS.mistaken)
  await voidPayment(baseUrl, mistaken.payment_id)
  await recordPayment(baseUrl, sample.commissions.usd, D4_PAYMENTS.overpaid)
  await pause(AFTER_LAST_WRITE_MS)
  return sample
}

// Sample data of the D5 walkthrough income_report (and the manual run npm run
// walkthrough:app -- --income): the D4 sample kept as it is (three commissions;
// on "Minh họa bìa sách" a deposit, a milestone, a tip, a refund and a voided
// payment, all in September 2026; on "Chibi đôi" a 15,00 USD payment in
// September 2026; "Chân dung bán thân" with no payment), plus what the income
// report needs to show its rules (ui_decomposition.md D5, "Luật phủ"):
//   - a second month: a deposit of 5,05 USD on "Chibi đôi" (2026-08-10), so USD
//     has a decimal amount in two months and the commission is overpaid
//     (12,50 USD agreed, 20,05 USD received: outstanding −7,55 USD);
//   - a cancelled commission with money received: "Bìa truyện (đã hủy)"
//     (2.000.000 VND) with a deposit of 500.000 VND (2026-08-20), then set to
//     'cancelled' through change_stage — its payment counts in "Thực nhận", its
//     debt (1.500.000 VND) does not count in "Còn phải thu".
// A commission owing money with no payment in a period: "Chân dung bán thân".
// Every paid_at is a fixed date, so the numbers never depend on the day the run
// happens. The numbers the report must give (checked against the real backend):
//   2026-08-01 .. 2026-09-30  USD 20,05 / 0,00 / −7,55; months 5,05 and 15,00
//                             VND 5.100.000 / 500.000 / 6.000.000; months 500.000 and 4.600.000
//   2026-09-01 .. 2026-09-30  USD 15,00 / 0,00 / −7,55; VND 4.600.000 / 500.000 / 6.000.000
//   2025-01-01 .. 2025-12-31  nothing paid: USD 0,00 / 0,00 / −7,55; VND 0 / 0 / 6.000.000
// Ends AFTER_LAST_WRITE_MS after the last write (UI-9).
export const D5_CANCELLED = {
  title: 'Bìa truyện (đã hủy)',
  commission_type: null,
  agreed_price: { amount_minor: 2000000, currency: 'VND' },
  deadline: null,
  description: null,
  reference_links: [],
}
export const D5_PAYMENTS = {
  cancelledDeposit: pay('incoming', 'deposit', 500000, 'VND', 'Chuyển khoản', '2026-08-20T09:30:00+07:00', 'Cọc trước khi hủy'),
  usdAugust: pay('incoming', 'deposit', 505, 'USD', 'PayPal', '2026-08-10T21:00:00+07:00', null),
}
// The three fixed periods of the walkthrough: [period_from, period_to].
export const D5_PERIODS = {
  twoMonths: ['2026-08-01', '2026-09-30'],
  september: ['2026-09-01', '2026-09-30'],
  nothingPaid: ['2025-01-01', '2025-12-31'],
}

export async function seedIncomeSample(baseUrl) {
  const sample = await seedPaymentSample(baseUrl)
  const cancelled = (await call(baseUrl, 'POST', '/commissions', { commission_input: { client_id: sample.clients.full, ...D5_CANCELLED } }, 201)).commission_id
  await recordPayment(baseUrl, cancelled, D5_PAYMENTS.cancelledDeposit)
  await recordPayment(baseUrl, sample.commissions.usd, D5_PAYMENTS.usdAugust)
  await setStage(baseUrl, cancelled, 'cancelled', 'Khách hủy')
  // UI-9: a write the walkthrough makes next is never in the second of the last sample one.
  await pause(AFTER_LAST_WRITE_MS)
  return { ...sample, commissions: { ...sample.commissions, cancelled } }
}

// Sample data of the D6 walkthrough reminder_list (and the manual run npm run
// walkthrough:app -- --reminders): reminders cannot be made by the interface
// (only the desktop's reminder_ticker calls check_due, api_contract.yaml 4.0.0),
// so THIS TOOL — a test, not the layer — calls POST /reminders/checks once. What it
// then asserts is the LIST OF REMINDERS WAITING (GET /reminders/pending), not what
// its own call returned (UI-15): the contract hands each due reminder out once, so
// when the ticker of the desktop exists it may receive one or both first, and the
// waiting list has both whoever received them.
//   - one client, three commissions: "Tranh hạn hôm nay" (deadline TODAY by the
//     machine's date), "Minh họa bìa sách" (deadline 2026-01-01, long past) and
//     "Chibi đôi" (no deadline); none has a stage, so all three are open;
//   - the settings are saved with both kinds on: a reminder 1 day before a
//     deadline, and a digest every day at the minute after next (HH:MM of
//     now + 3 s, rounded up to the minute);
//   - once that minute has gone, check_due is called: it produces the deadline
//     reminder (due 00:00 today: the deadline ends at 00:00 tomorrow, minus 24
//     hours) and the digest (due at that minute), oldest first — unless another
//     caller (the ticker) received them first; either way both are in the waiting
//     list, which is what the sample checks. The digest takes between 4 and 64
//     seconds to exist (less than 70).
// What the list must show (D6_EXPECTED_REMINDERS): the deadline reminder, then
// the digest "3 đơn đang mở", "2 đơn có hạn giao", earliest "Minh họa bìa
// sách (01/01/2026)". The date of the run is in the lines (today, the due
// times): the evidence images change from day to day. Settings saved here
// restart the digest's cadence, so a spec that wants "Chưa lưu lần nào" must
// not use this sample.
export const D6_TITLES = { today: 'Tranh hạn hôm nay', past: 'Minh họa bìa sách', none: 'Chibi đôi' }
const two = (n) => String(n).padStart(2, '0')
export const localDate = (d) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
export const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export async function seedReminderSample(baseUrl, options = {}) {
  // Close to midnight "today" would change under the sample's feet: wait it out.
  const now0 = new Date()
  const midnight = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate() + 1).getTime()
  if (midnight - now0.getTime() < 120_000) await pause(midnight - now0.getTime() + 2000)

  const client = (await call(baseUrl, 'POST', '/clients', { client_input: { display_name: 'Mai Anh', contacts: [], note: null } }, 201)).client_id
  const today = localDate(new Date())
  const make = async (title, deadline) =>
    (await call(baseUrl, 'POST', '/commissions', {
      commission_input: { client_id: client, title, commission_type: null, agreed_price: { amount_minor: 1500000, currency: 'VND' }, deadline, description: null, reference_links: [] },
    }, 201)).commission_id
  const commissions = {
    today: await make(D6_TITLES.today, today),
    past: await make(D6_TITLES.past, '2026-01-01'),
    none: await make(D6_TITLES.none, null),
  }

  // The minute after next: at least 3 seconds away, so the first occurrence is at or after the saving.
  const target = new Date(Math.ceil((Date.now() + 3000) / 60000) * 60000)
  const digestTime = `${two(target.getHours())}:${two(target.getMinutes())}`
  await call(baseUrl, 'PUT', '/reminders/settings', {
    reminder_settings_input: {
      periodic: { enabled: true, every: 1, unit: 'days', at_time: digestTime, weekday: null },
      deadline: { enabled: true, lead_times: [{ amount: 1, unit: 'days' }] },
    },
  }, 200)
  // The check must come after the digest's minute (the backend's clock is this machine's).
  await pause(Math.max(0, target.getTime() + 1500 - Date.now()))
  // UI-15: the desktop's reminder_ticker also calls check_due, and the contract hands
  // each due reminder out ONCE: this call may find two, one or none, according to
  // who called first. `beforeCheck` lets a test play the ticker (a call made just before).
  if (options.beforeCheck !== undefined) await options.beforeCheck()
  await call(baseUrl, 'POST', '/reminders/checks', undefined, 200)
  // What the sample guarantees is the list of reminders WAITING, which holds both until
  // they are acknowledged, whoever received them: exactly the deadline reminder, then the digest.
  const pending = await call(baseUrl, 'GET', '/reminders/pending', undefined, 200)
  const [first, second] = pending
  const wanted =
    pending.length === 2 &&
    first.kind === 'deadline' &&
    first.deadline_item.commission_id === commissions.today &&
    first.deadline_item.title === D6_TITLES.today &&
    first.deadline_item.deadline === today &&
    first.deadline_item.lead.amount === 1 &&
    first.deadline_item.lead.unit === 'days' &&
    second.kind === 'periodic_digest' &&
    second.digest.open_count === 3 &&
    second.digest.upcoming.length === 2 &&
    second.digest.upcoming[0].title === D6_TITLES.past &&
    second.digest.upcoming[0].deadline === '2026-01-01'
  if (!wanted) throw new Error(`the pending list is not the two reminders of the sample: ${JSON.stringify(pending)}`)
  // The date of the digest: the minute's own day (it may differ from "today" only past midnight, which is waited out above).
  return { client, commissions, today, digestTime, digestDate: localDate(target) }
}

// What reminder_list shows for the sample above: [main line, secondary line].
export function d6ExpectedReminders(sample) {
  const day = dmy(sample.today)
  return [
    [`Sắp tới hạn giao: ${D6_TITLES.today}`, `Hạn giao ${day} · nhắc trước 1 ngày · đến hạn lúc 00:00 ${day}`],
    ['Tổng hợp định kỳ: 3 đơn đang mở', `2 đơn có hạn giao · đến hạn lúc ${sample.digestTime} ${dmy(sample.digestDate)} · sớm nhất: ${D6_TITLES.past} (01/01/2026)`],
  ]
}

export async function seedSampleData(baseUrl) {
  // create_client: POST /clients, input [client_input]. endpoint_forms.http:
  // a JSON body whose keys are the input NAMES, so { client_input: {...} }.
  const create = (clientInput) => call(baseUrl, 'POST', '/clients', { client_input: clientInput }, 201)
  const plain = (name) => ({ display_name: name, contacts: [], note: null })
  for (const name of SAMPLE_ACTIVE) await create(plain(name))
  await create(SAMPLE_DETAILED)
  for (const name of SAMPLE_ARCHIVED) {
    const created = await create(plain(name))
    // set_client_archived: PUT /clients/{client_id}/archived, body { is_archived }.
    await call(baseUrl, 'PUT', `/clients/${created.client_id}/archived`, { is_archived: true }, 200)
  }
}

// --- Chặng E: backup ----------------------------------------------------------------

// A temporary folder for the backup files of one run, next to the temporary data
// folder (both under the system temp folder) and never in UI/, in %APPDATA% or in
// a folder of the person. The caller removes it, as it removes the data folder.
export function makeBackupDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ct-ui-backup-'))
}

// prepare_restore (POST /backups/restore-preparations, input archive_path): called
// from test tooling ONLY, to prove that a file made from the interface is one the
// backend accepts (the criterion of stage E). The interface never calls it: only
// restore_data does (api_contract.yaml 4.0.0). The staging file it makes lies in the
// temporary data folder. Answers the 200 body; any other label throws.
export async function prepareRestore(baseUrl, archivePath) {
  return call(baseUrl, 'POST', '/backups/restore-preparations', { archive_path: archivePath }, 200)
}
