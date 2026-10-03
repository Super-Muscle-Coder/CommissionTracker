// Automated run of the walkthrough of the page reminder_settings
// (src/screens/pages/reminder_settings/walkthrough.yaml, iWCA I6.3) on the real
// app, on an empty data folder (the settings were never saved: "Chưa lưu lần
// nào"; the reminder_list spec saves them through its sample, so it cannot share
// this launch). Steps S1 → S5 follow each other in one app launch. Screenshots
// and the run record: <evidence>/walkthroughs/reminder_settings/. "Lưu lần cuối
// lúc …" carries the time of the run: that image changes every run.
import { expect, test, type Locator } from '@playwright/test'
import {
  close,
  expectRemindersLoaded,
  expectSettingsLoaded,
  goToReminders,
  launch,
  openReminderSettings,
  setBackend,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'reminder_settings'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/reminder_settings_walkthrough.spec.ts')
const INPUT_SUMMARY = 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.'
const NOTICE = 'Đã lưu cài đặt nhắc việc.'
const SAVED_AT = /^Lưu lần cuối lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/

let l: Launched

const field = (label: string) => l.page.getByLabel(label, { exact: true })
const button = (name: string) => l.page.getByRole('button', { name, exact: true })
// The error message tied to a field.
async function errorOf(label: string): Promise<string | null> {
  const ids = ((await field(label).getAttribute('aria-describedby')) ?? '').split(' ').filter((s) => s !== '')
  if (ids.length === 0) return null
  return l.page.locator(`[id="${ids[ids.length - 1]}"]`).innerText()
}
// Back on reminder_list after a save: the notice, once, and the list loaded (empty: nothing was made).
async function expectSaved(): Promise<void> {
  await expect(l.page.getByRole('heading', { level: 2, name: 'Nhắc việc', exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(l.page.getByRole('status').filter({ hasText: NOTICE })).toHaveCount(1)
  await expectRemindersLoaded(l.page, 'empty')
}
// Open the settings from the list through the navigation region.
async function toSettings(): Promise<void> {
  await goToReminders(l.page, 'empty')
  await openReminderSettings(l.page)
}
// The button row ("Lưu" first, then "Hủy") is right under the title, above the first field.
async function expectButtonRowFirst(): Promise<void> {
  const top = async (loc: Locator) => (await loc.boundingBox())?.y ?? Number.NaN
  const heading = await top(l.page.getByRole('heading', { level: 2, name: 'Cài đặt nhắc việc' }))
  const save = await top(button('Lưu'))
  expect(heading).toBeLessThan(save)
  expect(save).toBe(await top(button('Hủy')))
  expect(save).toBeLessThan(await top(field('Bật nhắc định kỳ')))
}

test.describe.serial('walkthrough reminder_settings', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — never saved: the defaults, "Chưa lưu lần nào"; the button row; one row of "Mốc nhắc" that cannot be removed', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await toSettings()
      await expect(l.page.getByText('Chưa lưu lần nào, đang dùng cài đặt mặc định.')).toBeVisible()
      await expectButtonRowFirst()
      await expect(field('Bật nhắc định kỳ')).not.toBeChecked()
      await expect(field('Mỗi')).toHaveValue('1')
      await expect(field('Đơn vị chu kỳ')).toHaveValue('weeks')
      await expect(field('Đơn vị chu kỳ').locator('option')).toHaveText(['ngày', 'tuần'])
      await expect(field('Vào lúc')).toHaveValue('09:00')
      await expect(field('Vào thứ')).toHaveValue('1')
      await expect(field('Vào thứ').locator('option')).toHaveText(['Chọn thứ', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'])
      await expect(l.page.getByText('Mỗi lần lưu cài đặt, chu kỳ nhắc định kỳ được tính lại từ lúc lưu.')).toBeVisible()
      await expect(field('Bật nhắc trước hạn giao')).not.toBeChecked()
      await expect(field('Mốc nhắc 1: số')).toHaveValue('1')
      await expect(field('Mốc nhắc 1: đơn vị')).toHaveValue('days')
      await expect(field('Mốc nhắc 1: đơn vị').locator('option')).toHaveText(['giờ', 'ngày'])
      await expect(button('Bỏ mốc này')).toBeDisabled()
      await expect(button('Thêm mốc nhắc')).toBeEnabled()
      await expect(l.page.getByText('Hạn giao tính tới hết ngày đó. Một ngày là 24 giờ.')).toBeVisible()
      // Every field is editable while its part is off.
      for (const label of ['Mỗi', 'Đơn vị chu kỳ', 'Vào lúc', 'Vào thứ', 'Mốc nhắc 1: số', 'Mốc nhắc 1: đơn vị']) await expect(field(label)).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S1-defaults`)
    })
  })

  test('S2 — "Vào thứ" goes with the unit "tuần"; weekly on a Thursday at 08:15, a second lead of 12 hours; saved: the list with the notice; reopened: the values and "Lưu lần cuối lúc …"', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      // The unit "ngày" takes "Vào thứ" away; "tuần" brings it back as Thứ Hai.
      await field('Đơn vị chu kỳ').selectOption({ label: 'ngày' })
      await expect(field('Vào thứ')).toHaveCount(0)
      await field('Đơn vị chu kỳ').selectOption({ label: 'tuần' })
      await expect(field('Vào thứ')).toHaveValue('1')
      await field('Bật nhắc định kỳ').check()
      await field('Mỗi').fill('2')
      await field('Vào lúc').fill('08:15')
      await field('Vào thứ').selectOption({ label: 'Thứ Năm' })
      await field('Bật nhắc trước hạn giao').check()
      // "1 ngày" is there already: the new row starts with its number empty.
      await button('Thêm mốc nhắc').click()
      await expect(field('Mốc nhắc 2: số')).toHaveValue('')
      await field('Mốc nhắc 2: số').fill('12')
      await field('Mốc nhắc 2: đơn vị').selectOption({ label: 'giờ' })
      await button('Lưu').click()
      await expectSaved()
      // Reopened: the saved values, and when.
      await openReminderSettings(l.page)
      await expect(l.page.getByText(SAVED_AT)).toBeVisible()
      await expect(l.page.getByText('Chưa lưu lần nào')).toHaveCount(0)
      await expect(field('Bật nhắc định kỳ')).toBeChecked()
      await expect(field('Mỗi')).toHaveValue('2')
      await expect(field('Đơn vị chu kỳ')).toHaveValue('weeks')
      await expect(field('Vào lúc')).toHaveValue('08:15')
      await expect(field('Vào thứ')).toHaveValue('4')
      await expect(field('Bật nhắc trước hạn giao')).toBeChecked()
      await expect(field('Mốc nhắc 1: số')).toHaveValue('1')
      await expect(field('Mốc nhắc 1: đơn vị')).toHaveValue('days')
      await expect(field('Mốc nhắc 2: số')).toHaveValue('12')
      await expect(field('Mốc nhắc 2: đơn vị')).toHaveValue('hours')
      await expect(button('Bỏ mốc này')).toHaveCount(2)
      await expect(button('Bỏ mốc này').first()).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S2-saved`)
    })
  })

  test('S3 — the unit "ngày": "Vào thứ" disappears; "Hủy" saves nothing: reopened, still weekly', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await field('Đơn vị chu kỳ').selectOption({ label: 'ngày' })
      await expect(field('Vào thứ')).toHaveCount(0)
      await rec.screenshot(l.page, `${PAGE}-S3-days`)
      await button('Hủy').click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Nhắc việc', exact: true })).toBeVisible()
      await expectRemindersLoaded(l.page, 'empty')
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await openReminderSettings(l.page)
      await expect(field('Đơn vị chu kỳ')).toHaveValue('weeks')
      await expect(field('Vào thứ')).toHaveValue('4')
    })
  })

  test('S4 — "Mỗi" empty or 0; two leads of the same length ("1 ngày" and "24 giờ"); 366 days: refused beside the field, nothing sent, the text cursor on the first', async () => {
    await rec.step(l.page, 'S4', ['rejected_input'], async () => {
      // 1. "Mỗi" empty.
      await field('Mỗi').fill('')
      await button('Lưu').click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Chưa lưu được')
      await expect(alert).toContainText(INPUT_SUMMARY)
      expect(await errorOf('Mỗi')).toBe('Nhập số ngày hoặc số tuần')
      await expect(field('Mỗi')).toBeFocused()
      expect(await errorOf('Mốc nhắc 1: số')).toBeNull()
      // 2. "Mỗi" 0, and "24 giờ" next to "1 ngày".
      await field('Mỗi').fill('0')
      await field('Mốc nhắc 2: số').fill('24')
      await button('Lưu').click()
      await expect.poll(() => errorOf('Mỗi')).toBe('Nhập một số nguyên từ 1 trở lên')
      expect(await errorOf('Mốc nhắc 2: số')).toBe('Mốc nhắc này trùng với một mốc khác')
      expect(await errorOf('Mốc nhắc 1: số')).toBeNull()
      await expect(field('Mỗi')).toBeFocused()
      await expect(field('Mốc nhắc 2: số')).toHaveValue('24')
      // 3. 366 days: too long. "Mỗi" is put right first, so the first error is the lead.
      await field('Mỗi').fill('2')
      await field('Mốc nhắc 2: số').fill('366')
      await field('Mốc nhắc 2: đơn vị').selectOption({ label: 'ngày' })
      await button('Lưu').click()
      await expect.poll(() => errorOf('Mốc nhắc 2: số')).toBe('Mốc nhắc tối đa 365 ngày (8760 giờ)')
      expect(await errorOf('Mỗi')).toBeNull()
      await expect(field('Mốc nhắc 2: số')).toBeFocused()
      await rec.screenshot(l.page, `${PAGE}-S4-errors`)
      // Nothing was saved: leaving and reopening shows the S2 values.
      await button('Hủy').click()
      await expectRemindersLoaded(l.page, 'empty')
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await openReminderSettings(l.page)
      await expect(field('Mỗi')).toHaveValue('2')
      await expect(field('Mốc nhắc 2: số')).toHaveValue('12')
      await expect(field('Mốc nhắc 2: đơn vị')).toHaveValue('hours')
    })
  })

  test('S5 — saving while the backend is down: the draft stays; saved once it runs again', async () => {
    await field('Mỗi').fill('3')
    await rec.step(l.page, 'S5', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await button('Lưu').click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Cài đặt nhắc việc' })).toBeVisible()
      await expect(field('Mỗi')).toHaveValue('3')
      await expect(field('Mốc nhắc 2: số')).toHaveValue('12')
      await expect(button('Lưu')).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S5-unreachable`)
      setBackend('up')
      await button('Lưu').click()
      await expectSaved()
      await openReminderSettings(l.page)
      await expect(field('Mỗi')).toHaveValue('3')
      await expectSettingsLoaded(l.page)
    })
  })
})
