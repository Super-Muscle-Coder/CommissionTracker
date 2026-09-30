// Automated run of the walkthrough of the page payment_form
// (src/screens/pages/payment_form/walkthrough.yaml, iWCA I6.3) on the real
// app, with the D2 sample (three commissions, no payment): every payment of
// the steps is written through the interface. Steps S1 → S6 follow each other
// in one app launch. Screenshots and the run record:
// <evidence>/walkthroughs/payment_form/.
import { expect, test, type Locator } from '@playwright/test'
import { seedCommissionSample } from '../tools/walkthrough_lib.mjs'
import {
  balanceEntries,
  close,
  expectPaymentsLoaded,
  goToPaymentsOf,
  launch,
  paymentRows,
  setBackend,
  shownAt,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'payment_form'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/payment_form_walkthrough.spec.ts')
const INPUT_SUMMARY = 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.'
const NOTICE = 'Đã ghi khoản thanh toán.'

let l: Launched

const field = (label: string) => l.page.getByLabel(label, { exact: true })
const button = (name: string) => l.page.getByRole('button', { name, exact: true })
// The error message tied to a field (aria-describedby names the hint of "Khoản" first, then its error).
async function errorOf(label: string): Promise<string | null> {
  const ids = ((await field(label).getAttribute('aria-describedby')) ?? '').split(' ').filter((s) => s !== '')
  if (ids.length === 0) return null
  return l.page.locator(`[id="${ids[ids.length - 1]}"]`).innerText()
}
// Open payment_form of a commission from its payments page.
async function toForm(title: string): Promise<void> {
  await goToPaymentsOf(l.page, title)
  await button('Ghi khoản thanh toán').first().click()
  await expect(l.page.getByRole('heading', { level: 2, name: 'Ghi khoản thanh toán' })).toBeVisible()
  await expect(field('Số tiền')).toBeVisible({ timeout: 30_000 })
  await expect(l.page.getByRole('status')).toHaveCount(0)
}
// Back on payment_list after a save: the notice, once, and the list loaded.
async function expectSaved(): Promise<void> {
  await expect(l.page.getByRole('heading', { level: 2, name: 'Thanh toán', exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(l.page.getByRole('status').filter({ hasText: NOTICE })).toHaveCount(1)
  await expectPaymentsLoaded(l.page)
}
// A method typed into a field with suggestions: Escape closes the native list, as a person would (kit-EXP-008).
async function typeMethod(value: string): Promise<void> {
  await field('Phương thức').fill(value)
  await field('Phương thức').press('Escape')
}
// The button row ("Lưu" first, then "Hủy") is right under the titles, above the first field.
async function expectButtonRowFirst(title: string): Promise<void> {
  const top = async (loc: Locator) => (await loc.boundingBox())?.y ?? Number.NaN
  const heading = await top(l.page.getByRole('heading', { level: 3, name: title }))
  const save = await top(button('Lưu'))
  expect(heading).toBeLessThan(save)
  expect(save).toBe(await top(button('Hủy')))
  expect(save).toBeLessThan(await top(field('Loại giao dịch')))
}

test.describe.serial('walkthrough payment_form', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
    await seedCommissionSample(l.baseUrl)
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — the form; "Lưu" with nothing chosen, amount 0 and a blank method: rejected input, nothing sent; "Hủy" back to the list', async () => {
    await rec.step(l.page, 'S1', ['rejected_input'], async () => {
      await toForm('Chân dung bán thân')
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeVisible()
      await expectButtonRowFirst('Chân dung bán thân')
      // What the form opens with.
      await expect(field('Loại giao dịch')).toHaveValue('incoming')
      await expect(field('Loại giao dịch').locator('option')).toHaveText(['Nhận tiền', 'Hoàn tiền cho khách'])
      await expect(field('Khoản')).toHaveValue('')
      await expect(field('Khoản').locator('option')).toHaveText(['Chọn khoản', 'Tiền cọc', 'Thanh toán theo đợt', 'Thanh toán cuối', 'Tiền tip', 'Khác'])
      await expect(l.page.getByText('Tiền tip không làm giảm số còn phải thu.')).toBeVisible()
      // The currency of the commission: shown next to the amount, not choosable.
      await expect(field('Đơn vị tiền')).toHaveValue('VND')
      await expect(field('Đơn vị tiền')).toBeDisabled()
      // The date and time: this very minute, in the machine's time zone.
      const opened = await field('Ngày giờ nhận tiền').inputValue()
      expect(opened).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(Math.abs(Date.now() - new Date(opened).getTime())).toBeLessThan(5 * 60_000)
      // 1. Nothing typed: the kind, the amount and the method are asked for.
      await button('Lưu').click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Chưa lưu được')
      await expect(alert).toContainText(INPUT_SUMMARY)
      expect(await errorOf('Khoản')).toBe('Chọn khoản thanh toán.')
      expect(await errorOf('Số tiền')).toBe('Nhập số tiền.')
      expect(await errorOf('Phương thức')).toBe('Nhập phương thức thanh toán.')
      expect(await errorOf('Ngày giờ nhận tiền')).toBeNull()
      await expect(field('Khoản')).toBeFocused()
      // 2. An amount of 0, a method of white space only, no date and time: still refused, in their words.
      await field('Số tiền').fill('0')
      await typeMethod('   ')
      await field('Ngày giờ nhận tiền').fill('')
      await button('Lưu').click()
      await expect.poll(() => errorOf('Số tiền')).toBe('Số tiền phải lớn hơn 0.')
      expect(await errorOf('Phương thức')).toBe('Nhập phương thức thanh toán.')
      expect(await errorOf('Ngày giờ nhận tiền')).toBe('Chọn ngày giờ nhận tiền.')
      expect(await errorOf('Khoản')).toBe('Chọn khoản thanh toán.')
      await expect(field('Khoản')).toBeFocused()
      await expect(field('Số tiền')).toHaveValue('0')
      // Press on the page title first: a native list or picker still open over a field would hold the screenshot (kit-EXP-008; run 5 of session 22 timed out here).
      await l.page.getByRole('heading', { level: 2, name: 'Ghi khoản thanh toán' }).click()
      await rec.screenshot(l.page, `${PAGE}-S1-errors`)
      // "Hủy": back to the list, no notice, and nothing was recorded.
      await button('Hủy').click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thanh toán', exact: true })).toBeVisible()
      await expectPaymentsLoaded(l.page)
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await expect(l.page.getByText('Chưa có khoản thanh toán nào')).toBeVisible()
    })
  })

  test('S2 — a deposit of 500.000 VND: saved, the list with the notice, the balance moved', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      await button('Ghi khoản thanh toán').first().click()
      await expect(field('Số tiền')).toBeVisible({ timeout: 30_000 })
      await field('Khoản').selectOption({ label: 'Tiền cọc' })
      await field('Số tiền').fill('500.000')
      await typeMethod('Chuyển khoản')
      await field('Ngày giờ nhận tiền').fill('2026-09-10T09:00')
      await button('Lưu').click()
      await expectSaved()
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['1.500.000 VND']],
        ['Đã nhận', ['500.000 VND']],
        ['Còn phải thu', ['1.000.000 VND']],
      ])
      expect(await paymentRows(l.page)).toEqual([['Nhận tiền 500.000 VND · Tiền cọc', `${shownAt('2026-09-10T09:00:00')} · Chuyển khoản`, true]])
    })
  })

  test('S3 — a tip of 50.000 VND with a note: what is still owed does not go down', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await button('Ghi khoản thanh toán').first().click()
      await expect(field('Số tiền')).toBeVisible({ timeout: 30_000 })
      await field('Khoản').selectOption({ label: 'Tiền tip' })
      await field('Số tiền').fill('50000')
      await typeMethod('Tiền mặt')
      await field('Ngày giờ nhận tiền').fill('2026-09-11T09:00')
      await field('Ghi chú').fill('Khách boa')
      await button('Lưu').click()
      await expectSaved()
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['1.500.000 VND']],
        ['Đã nhận', ['550.000 VND']],
        ['Còn phải thu', ['1.000.000 VND']],
      ])
      expect((await paymentRows(l.page))[0]).toEqual(['Nhận tiền 50.000 VND · Tiền tip', `${shownAt('2026-09-11T09:00:00')} · Tiền mặt · Khách boa`, true])
    })
  })

  test('S4 — a refund of 20.000 VND: shown as such; received goes down and what is owed goes up', async () => {
    await rec.step(l.page, 'S4', ['ok'], async () => {
      await button('Ghi khoản thanh toán').first().click()
      await expect(field('Số tiền')).toBeVisible({ timeout: 30_000 })
      await field('Loại giao dịch').selectOption({ label: 'Hoàn tiền cho khách' })
      await field('Khoản').selectOption({ label: 'Khác' })
      await field('Số tiền').fill('20.000')
      await typeMethod('Chuyển khoản')
      await field('Ngày giờ nhận tiền').fill('2026-09-12T09:00')
      await button('Lưu').click()
      await expectSaved()
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['1.500.000 VND']],
        ['Đã nhận', ['530.000 VND']],
        ['Còn phải thu', ['1.020.000 VND']],
      ])
      const rows = await paymentRows(l.page)
      expect(rows.map(([main]) => main)).toEqual(['Hoàn tiền cho khách 20.000 VND · Khác', 'Nhận tiền 50.000 VND · Tiền tip', 'Nhận tiền 500.000 VND · Tiền cọc'])
    })
  })

  test('S5 — a USD commission: the amount with decimals, the date and time left at its default', async () => {
    await rec.step(l.page, 'S5', ['ok'], async () => {
      await button('Quay lại đơn hàng').click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeVisible()
      await toForm('Chibi đôi')
      await expect(field('Đơn vị tiền')).toHaveValue('USD')
      await expect(field('Đơn vị tiền')).toBeDisabled()
      const opened = await field('Ngày giờ nhận tiền').inputValue()
      await field('Khoản').selectOption({ label: 'Tiền cọc' })
      await field('Số tiền').fill('5,05')
      await typeMethod('PayPal')
      await button('Lưu').click()
      await expectSaved()
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['12,50 USD']],
        ['Đã nhận', ['5,05 USD']],
        ['Còn phải thu', ['7,45 USD']],
      ])
      // The default date and time was kept as it was: the machine's wall clock of that minute.
      expect(await paymentRows(l.page)).toEqual([['Nhận tiền 5,05 USD · Tiền cọc', `${shownAt(`${opened}:00`)} · PayPal`, true]])
    })
  })

  test('S6 — saving while the backend is down: the draft stays; saved once it runs again; the rest paid: "Đã thu đủ"', async () => {
    await button('Ghi khoản thanh toán').first().click()
    await expect(field('Số tiền')).toBeVisible({ timeout: 30_000 })
    await field('Khoản').selectOption({ label: 'Thanh toán cuối' })
    await field('Số tiền').fill('7,45')
    await typeMethod('PayPal')
    // A date in the future is allowed (the contract does not forbid it), and it puts this payment first in the list, whatever minute it is.
    await field('Ngày giờ nhận tiền').fill('2099-01-01T00:00')
    await rec.step(l.page, 'S6', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await button('Lưu').click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Ghi khoản thanh toán' })).toBeVisible()
      await expect(field('Số tiền')).toHaveValue('7,45')
      await expect(field('Phương thức')).toHaveValue('PayPal')
      await expect(field('Khoản')).toHaveValue('final')
      await expect(button('Lưu')).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S6-unreachable`)
      setBackend('up')
      await button('Lưu').click()
      await expectSaved()
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['12,50 USD']],
        ['Đã nhận', ['12,50 USD']],
        ['Còn phải thu', ['Đã thu đủ']],
      ])
      expect((await paymentRows(l.page))[0][0]).toBe('Nhận tiền 7,45 USD · Thanh toán cuối')
    })
  })
})
