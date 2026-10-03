// Automated run of the walkthrough of the page reminder_list
// (src/screens/pages/reminder_list/walkthrough.yaml, iWCA I6.3) on the real
// app, with the D6 reminder sample: the interface cannot make a reminder (only
// the desktop's reminder_ticker calls check_due), so seedReminderSample — test
// tooling — calls POST /reminders/checks once, after the minute of the digest
// has gone (it waits up to about a minute). Steps S1 → S5 follow each other in
// one app launch. Screenshots and the run record:
// <evidence>/walkthroughs/reminder_list/. The dates in the lines are those of
// the day of the run: the images change from day to day.
import { expect, test } from '@playwright/test'
import { d6ExpectedReminders, D6_TITLES, seedReminderSample, type ReminderSample } from '../tools/walkthrough_lib.mjs'
import {
  close,
  expectRemindersLoaded,
  goToReminders,
  launch,
  reloadReminders,
  reminderRows,
  setBackend,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'reminder_list'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/reminder_list_walkthrough.spec.ts')
const ACK_NOTICE = 'Đã đánh dấu đã xem.'

let l: Launched
let sample: ReminderSample

const button = (name: string) => l.page.getByRole('button', { name, exact: true })
const ackButtons = () => l.page.getByRole('list', { name: 'Nhắc việc đang chờ' }).getByRole('button', { name: 'Đã xem', exact: true })

test.describe.serial('walkthrough reminder_list', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
    sample = await seedReminderSample(l.baseUrl)
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — two reminders, oldest first, with their lines; the button row; the main line of the deadline reminder opens its commission', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await goToReminders(l.page, 'list')
      expect(await reminderRows(l.page)).toEqual(d6ExpectedReminders(sample))
      // The button row right under the title, main action first; each reminder has its "Đã xem" after the list's own buttons.
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual([
        'Cài đặt nhắc việc',
        'Tải lại',
        ...d6ExpectedReminders(sample).flatMap(([main, detail]) => [`${main}\n${detail}`, 'Đã xem']),
      ])
      await expect(l.page.getByText('Nhắc việc đến hạn sẽ hiện thành thông báo của Windows. Mọi nhắc việc chưa đánh dấu đã xem nằm ở đây.')).toBeVisible()
      await expect(ackButtons()).toHaveCount(2)
      await rec.screenshot(l.page, `${PAGE}-S1-list`)
      // The main line of the deadline reminder opens that commission.
      await l.page.getByRole('list', { name: 'Nhắc việc đang chờ' }).getByRole('button', { name: new RegExp(`^Sắp tới hạn giao: ${D6_TITLES.today}`) }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeVisible()
      await expect(l.page.getByRole('heading', { level: 3, name: D6_TITLES.today })).toBeVisible({ timeout: 30_000 })
    })
  })

  test('S2 — the main line of the periodic digest opens the commission list', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      await goToReminders(l.page, 'list')
      await l.page.getByRole('list', { name: 'Nhắc việc đang chờ' }).getByRole('button', { name: /^Tổng hợp định kỳ/ }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Đơn hàng', exact: true })).toBeVisible()
      await expect(l.page.getByRole('list', { name: 'Danh sách đơn hàng' }).getByRole('listitem').first()).toBeVisible({ timeout: 30_000 })
    })
  })

  test('S3 — the backend down: "Không kết nối được" with "Tải lại", the settings button still there, no list; running again, the same two reminders', async () => {
    await rec.step(l.page, 'S3', ['unreachable', 'ok'], async () => {
      await goToReminders(l.page, 'list')
      setBackend('down')
      await reloadReminders(l.page, 'unreachable')
      await expect(l.page.getByRole('alert')).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Cài đặt nhắc việc', 'Tải lại'])
      await rec.screenshot(l.page, `${PAGE}-S3-unreachable`)
      setBackend('up')
      await reloadReminders(l.page, 'list')
      expect(await reminderRows(l.page)).toEqual(d6ExpectedReminders(sample))
    })
  })

  test('S4 — "Đã xem" on the digest: asked of nobody, the notice, the reminder gone; the other stays', async () => {
    await rec.step(l.page, 'S4', ['ok'], async () => {
      await ackButtons().nth(1).click()
      await expect(l.page.getByRole('status').filter({ hasText: ACK_NOTICE })).toHaveCount(1, { timeout: 30_000 })
      await expect.poll(async () => (await reminderRows(l.page)).length, { timeout: 30_000 }).toBe(1)
      expect(await reminderRows(l.page)).toEqual([d6ExpectedReminders(sample)[0]])
      await expect(l.page.getByRole('alert')).toHaveCount(0)
      // No question was asked: no confirmation panel, no native dialog.
      await expect(l.page.getByRole('group', { name: /Xác nhận/ })).toHaveCount(0)
      await rec.screenshot(l.page, `${PAGE}-S4-acknowledged`)
    })
  })

  test('S5 — "Đã xem" on the last one: the empty state with "Cài đặt nhắc việc", which opens the settings (saved by the sample); "Hủy" comes back with no notice', async () => {
    await rec.step(l.page, 'S5', ['ok'], async () => {
      await ackButtons().first().click()
      await expect(l.page.getByText('Không có nhắc việc nào đang chờ.')).toBeVisible({ timeout: 30_000 })
      await expectRemindersLoaded(l.page, 'empty')
      await expect(l.page.getByRole('list', { name: 'Nhắc việc đang chờ' })).toHaveCount(0)
      await expect(button('Cài đặt nhắc việc')).toHaveCount(2)
      await rec.screenshot(l.page, `${PAGE}-S5-empty`)
      // The empty state's own button opens the settings.
      await button('Cài đặt nhắc việc').last().click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Cài đặt nhắc việc' })).toBeVisible()
      await expect(l.page.getByText(/^Lưu lần cuối lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/)).toBeVisible({ timeout: 30_000 })
      await button('Hủy').click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Nhắc việc', exact: true })).toBeVisible()
      await expectRemindersLoaded(l.page, 'empty')
      await expect(l.page.getByRole('status')).toHaveCount(0)
    })
  })

})
