// DSK-17: the cross-cutting reminder_ticker and the Application User Model ID.
// Parts: (A) the toast text (pure functions); (B) the ticker alone against a
// small in-process server (timeout, stop); (C) the whole Main with a fake
// backend (tests/fixtures/fake_backend_reminders.py): errors, toasts, no
// overlap, stop before the backend; (D) the whole Main with the real backend:
// a due reminder shows, is not acknowledged by the ticker, and one that fell due
// while the app was closed shows at the first check. Every run uses a temporary
// data folder and no dialogs, and a short ticker interval (test flag).
import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as path from 'node:path'
import { ReminderTicker, type Toast } from '../src/cross_cutting/reminder_ticker/reminder_ticker'
import { buildToastText, formatDate, readNotification, type ToastTextConfig } from '../src/cross_cutting/reminder_ticker/toast_text'
import { config, LAYER_ROOT, launchMain, type LogCollector, mainArgs, PROBE_ROOT, stillAlive, processTree, tempDataDir, waitForExit } from './helpers'

const TEXT: ToastTextConfig = config.reminder_ticker.toast
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// --- (A) toast text -------------------------------------------------------------

function deadlineElement(overrides: Record<string, unknown> = {}) {
  return {
    notification_id: 'n1',
    kind: 'deadline',
    due_at: '2026-10-04T00:00:00+07:00',
    deadline_item: { commission_id: 'c1', title: 'Tranh hạn hôm nay', deadline: '2026-10-04', lead: { amount: 1, unit: 'days' } },
    digest: null,
    ...overrides,
  }
}

function digestElement(upcoming: unknown[], openCount = 3) {
  return { notification_id: 'n2', kind: 'periodic_digest', due_at: '2026-10-04T09:00:00+07:00', deadline_item: null, digest: { open_count: openCount, upcoming } }
}

function textOf(raw: unknown) {
  const read = readNotification(raw)
  if (!read.ok) throw new Error(`not readable: ${read.reason}`)
  return buildToastText(TEXT, read.notification)
}

test('A1. text of a deadline reminder, lead in days and in hours; the date is cut from the string', () => {
  expect(textOf(deadlineElement())).toEqual({ title: 'Sắp tới hạn giao: Tranh hạn hôm nay', body: 'Hạn giao 04/10/2026 · nhắc trước 1 ngày' })
  const hours = deadlineElement({
    deadline_item: { commission_id: 'c1', title: 'Chibi đôi', deadline: '2026-12-31', lead: { amount: 6, unit: 'hours' } },
  })
  expect(textOf(hours)).toEqual({ title: 'Sắp tới hạn giao: Chibi đôi', body: 'Hạn giao 31/12/2026 · nhắc trước 6 giờ' })
  expect(formatDate('2026-01-02')).toBe('02/01/2026')
  expect(formatDate('02/01/2026')).toBeNull()
})

test('A2. text of a digest, with and without upcoming; braces in a title stay as they are', () => {
  const upcoming = [
    { commission_id: 'c2', title: 'Minh họa bìa sách', deadline: '2026-01-01' },
    { commission_id: 'c1', title: 'Tranh hạn hôm nay', deadline: '2026-10-04' },
  ]
  expect(textOf(digestElement(upcoming))).toEqual({
    title: 'Tổng hợp định kỳ: 3 đơn đang mở',
    body: '2 đơn có hạn giao · sớm nhất: Minh họa bìa sách (01/01/2026)',
  })
  expect(textOf(digestElement([], 2))).toEqual({ title: 'Tổng hợp định kỳ: 2 đơn đang mở', body: '0 đơn có hạn giao' })
  const braces = deadlineElement({ deadline_item: { commission_id: 'c1', title: '{date} {unit}', deadline: '2026-10-04', lead: { amount: 1, unit: 'days' } } })
  expect(textOf(braces).title).toBe('Sắp tới hạn giao: {date} {unit}')
})

test('A3. elements of the wrong shape are not readable (missing id, unknown kind, null field of the kind, bad date, bad lead)', () => {
  const bad: unknown[] = [
    null,
    'text',
    [],
    deadlineElement({ notification_id: undefined }),
    deadlineElement({ notification_id: '' }),
    deadlineElement({ kind: 'weekly' }),
    deadlineElement({ kind: undefined }),
    deadlineElement({ deadline_item: null }),
    deadlineElement({ deadline_item: { commission_id: 'c1', title: 'x', deadline: '4/10/2026', lead: { amount: 1, unit: 'days' } } }),
    deadlineElement({ deadline_item: { commission_id: 'c1', title: 'x', deadline: '2026-10-04', lead: { amount: 1.5, unit: 'days' } } }),
    deadlineElement({ deadline_item: { commission_id: 'c1', title: 'x', deadline: '2026-10-04', lead: { amount: 1, unit: 'weeks' } } }),
    { ...digestElement([]), digest: null },
    digestElement([{ title: 'x' }]),
    { ...digestElement([]), digest: { open_count: '3', upcoming: [] } },
  ]
  for (const raw of bad) expect(readNotification(raw), JSON.stringify(raw)).toMatchObject({ ok: false })
})

test('A4. the Application User Model ID in desktop.json is the appId of electron-builder.yml', () => {
  const yml = fs.readFileSync(path.join(LAYER_ROOT, 'electron-builder.yml'), 'utf8')
  const appId = /^appId:\s*(\S+)\s*$/m.exec(yml)?.[1]
  expect(appId).toBe('com.commissiontracker.desktop')
  expect(config.app.app_user_model_id).toBe(appId)
})

// --- (B) the ticker alone ---------------------------------------------------------

interface LocalServer {
  baseUrl: string
  calls: () => number
  close: () => Promise<void>
}

/** A server whose POST /reminders/checks answers after delayMs with `body`. */
async function localServer(delayMs: number, body: unknown): Promise<LocalServer> {
  let calls = 0
  const server = http.createServer((req, res) => {
    req.resume()
    calls++
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }, delayMs)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as { port: number }).port
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    calls: () => calls,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

test('B1. a call that gets no answer in time is logged as failed and tried again at the next beat', async () => {
  const server = await localServer(60_000, [])
  const lines: string[] = []
  const ticker = new ReminderTicker({
    backendBaseUrl: server.baseUrl,
    config: { interval_ms: 250, request_timeout_ms: 300, toast: TEXT },
    showToast: () => lines.push('TOAST'),
    log: (m) => lines.push(m),
  })
  try {
    ticker.start()
    await sleep(1800)
  } finally {
    await ticker.stop()
    await server.close()
  }
  console.log(lines.join('\n'))
  expect(lines.filter((l) => /no answer within 300 ms/.test(l)).length).toBeGreaterThanOrEqual(2)
  expect(server.calls()).toBeGreaterThanOrEqual(2)
  expect(lines).not.toContain('TOAST')
})

test('B2. stop() while a call is running: its answer is dropped, no toast, and stop returns promptly', async () => {
  const server = await localServer(1500, [deadlineElement()])
  const toasts: Toast[] = []
  const lines: string[] = []
  const ticker = new ReminderTicker({
    backendBaseUrl: server.baseUrl,
    config: { interval_ms: 60_000, request_timeout_ms: 10_000, toast: TEXT },
    showToast: (t) => toasts.push(t),
    log: (m) => lines.push(m),
  })
  ticker.start()
  await sleep(300)
  expect(server.calls()).toBe(1)
  const began = Date.now()
  await ticker.stop()
  const tookMs = Date.now() - began
  await sleep(2000)
  await server.close()
  console.log(`stop took ${tookMs} ms; log: ${JSON.stringify(lines)}`)
  expect(tookMs).toBeLessThan(1000)
  expect(toasts).toEqual([])
  expect(lines.some((l) => /reminder toast:/.test(l))).toBe(false)
  expect(lines.at(-1)).toBe('reminder ticker stopped')
  expect(server.calls()).toBe(1)
})

// --- (C) the Main with a fake backend ---------------------------------------------

function fakeArgs(dataDir: string, intervalMs: number) {
  return mainArgs({ dataDir, rendererRoot: PROBE_ROOT, fakeBackend: 'fake_backend_reminders.py', reminderIntervalMs: intervalMs })
}

const toastLines = (log: LogCollector) => log.lines(/\[desktop-main\] reminder toast: /).map((l) => JSON.parse(l.replace(/^.*reminder toast: /, '')))

async function closeCleanly(app: Awaited<ReturnType<typeof launchMain>>['app'], log: LogCollector): Promise<void> {
  const launcher = await log.waitFor(/backend started \(pid (\d+)\)/)
  const tree = processTree(Number(launcher[1]))
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
}

test('C1. a failing check (HTTP 500, wrong shape, not JSON) is logged, shows nothing, the app keeps running and closes with code 0', async () => {
  const { app, log } = await launchMain(fakeArgs(tempDataDir(), 400), { CT_FAKE_CHECKS: 'http500,badshape,notjson,ok' })
  await app.firstWindow()
  await log.waitFor(/reminder check #4 failed|check #4 end/, 30_000)
  await sleep(500)
  console.log(log.text)
  expect(log.lines(/reminder check #1 failed: HTTP 500 .*ERR_STORAGE_IO/)).toHaveLength(1)
  expect(log.lines(/reminder check #2 failed: the answer is not a list/)).toHaveLength(1)
  expect(log.lines(/reminder check #3 failed: the answer is not JSON/)).toHaveLength(1)
  expect(toastLines(log)).toEqual([])
  expect(log.text).not.toMatch(/FATAL/)
  expect(app.windows()).toHaveLength(1)
  await closeCleanly(app, log)
})

test('C2. the toasts of one answer: in the order returned, a malformed element skipped and logged, the others shown', async () => {
  const { app, log } = await launchMain(fakeArgs(tempDataDir(), 60_000), { CT_FAKE_CHECKS: 'mixed' })
  await app.firstWindow()
  await log.waitFor(/reminder toast: .*n-digest-1/, 30_000)
  console.log(log.text)
  expect(toastLines(log)).toEqual([
    { notification_id: 'n-deadline-1', title: 'Sắp tới hạn giao: Tranh hạn hôm nay', body: 'Hạn giao 04/10/2026 · nhắc trước 1 ngày' },
    {
      notification_id: 'n-digest-1',
      title: 'Tổng hợp định kỳ: 3 đơn đang mở',
      body: '2 đơn có hạn giao · sớm nhất: Minh họa bìa sách (01/01/2026)',
    },
  ])
  expect(log.lines(/skipped a malformed notification \(kind deadline without deadline_item\)/)).toHaveLength(1)
  // The toast of each element reports show or failed (measured, not asserted: it depends on the system's notification settings).
  console.log(`toast events: ${JSON.stringify(log.lines(/reminder toast n-/))}`)
  await closeCleanly(app, log)
})

test('C3. no two checks at once: a slow answer makes the next beats wait', async () => {
  const { app, log } = await launchMain(fakeArgs(tempDataDir(), 500), { CT_FAKE_CHECKS: 'slow:2500' })
  await app.firstWindow()
  await log.waitFor(/check #2 end/, 40_000)
  console.log(log.text)
  const inFlight = log.lines(/fake backend: check #\d+ start/).map((l) => Number(/in flight: (\d+)/.exec(l)?.[1]))
  console.log(`MEASURED in flight at each start: ${JSON.stringify(inFlight)}`)
  expect(inFlight.length).toBeGreaterThanOrEqual(2)
  expect(inFlight.every((n) => n === 1)).toBe(true)
  expect(log.lines(/reminder check skipped: the previous one has not finished/).length).toBeGreaterThanOrEqual(1)
  await closeCleanly(app, log)
})

test('C4. the ticker stops before the backend, and no call is made after it', async () => {
  const { app, log } = await launchMain(fakeArgs(tempDataDir(), 300), { CT_FAKE_CHECKS: 'ok' })
  await app.firstWindow()
  await log.waitFor(/check #3 end/, 30_000)
  await closeCleanly(app, log)
  console.log(log.text)
  const lines = log.text.split(/\r?\n/)
  const stoppedAt = lines.findIndex((l) => /reminder ticker stopped/.test(l))
  const backendStopAt = lines.findIndex((l) => /stopping backend \(pid \d+\): closing its standard input/.test(l))
  expect(stoppedAt).toBeGreaterThan(-1)
  expect(backendStopAt).toBeGreaterThan(-1)
  expect(stoppedAt).toBeLessThan(backendStopAt)
  expect(lines.slice(stoppedAt).filter((l) => /fake backend: check #\d+ start/.test(l))).toEqual([])
  expect(log.lines(/reminder ticker stopped/)).toHaveLength(1)
})

// --- (D) the Main with the real backend -------------------------------------------

async function call<T = unknown>(baseUrl: string, method: string, route: string, body: unknown, expected: number): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const text = await response.text()
  if (response.status !== expected) throw new Error(`${method} ${route}: expected ${expected}, got ${response.status} ${text}`)
  return JSON.parse(text) as T
}

interface PendingReminder {
  notification_id: string
  kind: string
  deadline_item: { commission_id: string }
}

const two = (n: number) => String(n).padStart(2, '0')
const localDate = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`

/** One client, one commission with its deadline today, and the deadline
 * reminder switched on ("1 day before"): due since 00:00 today, so it is due at
 * the next check. A day that changes under the test's feet is waited out. */
async function seedDueDeadline(baseUrl: string, title: string): Promise<{ today: string; commissionId: string }> {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  if (midnight - now.getTime() < 120_000) await sleep(midnight - now.getTime() + 2000)
  const today = localDate(new Date())
  const client = (await call<{ client_id: string }>(baseUrl, 'POST', '/clients', { client_input: { display_name: 'Mai Anh', contacts: [], note: null } }, 201))
    .client_id
  const commissionId = (
    await call<{ commission_id: string }>(
      baseUrl,
      'POST',
      '/commissions',
      {
        commission_input: {
          client_id: client,
          title,
          commission_type: null,
          agreed_price: { amount_minor: 1500000, currency: 'VND' },
          deadline: today,
          description: null,
          reference_links: [],
        },
      },
      201,
    )
  ).commission_id
  await call(
    baseUrl,
    'PUT',
    '/reminders/settings',
    {
      reminder_settings_input: {
        periodic: { enabled: false, every: 1, unit: 'weeks', at_time: '09:00', weekday: 1 },
        deadline: { enabled: true, lead_times: [{ amount: 1, unit: 'days' }] },
      },
    },
    200,
  )
  return { today, commissionId }
}

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

test('D1. real backend: a due deadline reminder shows with the exact text, and stays pending (the ticker does not acknowledge)', async () => {
  const title = 'Tranh thử nhắc việc'
  const dataDir = tempDataDir()
  const { app, log } = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT, reminderIntervalMs: 700 }))
  await app.firstWindow()
  const baseUrl = `http://127.0.0.1:${(await log.waitFor(/backend READY on port (\d+)/))[1]}`
  const { today, commissionId } = await seedDueDeadline(baseUrl, title)
  await log.waitFor(new RegExp(`reminder toast: .*${title}`), 30_000)
  await sleep(2500) // several more beats: it must not show again
  console.log(log.text)
  const toasts = toastLines(log)
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toMatchObject({ title: `Sắp tới hạn giao: ${title}`, body: `Hạn giao ${dmy(today)} · nhắc trước 1 ngày` })
  const pending = await call<PendingReminder[]>(baseUrl, 'GET', '/reminders/pending', undefined, 200)
  expect(pending).toHaveLength(1)
  expect(pending[0]).toMatchObject({ notification_id: toasts[0].notification_id, kind: 'deadline' })
  expect(pending[0].deadline_item.commission_id).toBe(commissionId)
  expect(log.text).not.toMatch(/\/ack|FATAL/)
  await closeCleanly(app, log)
})

test('D2. the first check runs at once: a reminder that fell due while the app was closed shows without waiting a beat', async () => {
  const title = 'Tranh nhắc lúc đóng app'
  const dataDir = tempDataDir()
  // Run 1 (long beat: only its first check runs, before the data exists): create the data, close.
  const first = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT, reminderIntervalMs: 600_000 }))
  await first.app.firstWindow()
  const baseUrl = `http://127.0.0.1:${(await first.log.waitFor(/backend READY on port (\d+)/))[1]}`
  // The first check must have ended (before the data exists), not only started: on a slow
  // machine it could otherwise run after the data is created and show the toast in run 1.
  await first.log.waitFor(/reminder check #1: \d+ notification\(s\)/, 30_000)
  await seedDueDeadline(baseUrl, title)
  expect(toastLines(first.log)).toEqual([])
  await closeCleanly(first.app, first.log)

  // Run 2: the same data folder, a beat of ten minutes; the toast must come from the first check.
  const second = await launchMain(mainArgs({ dataDir, rendererRoot: PROBE_ROOT, reminderIntervalMs: 600_000 }))
  const began = Date.now()
  await second.app.firstWindow()
  await second.log.waitFor(new RegExp(`reminder toast: .*${title}`), 20_000)
  console.log(`first toast ${Date.now() - began} ms after the window opened; beat is 600000 ms`)
  expect(toastLines(second.log)).toHaveLength(1)
  await closeCleanly(second.app, second.log)
})
