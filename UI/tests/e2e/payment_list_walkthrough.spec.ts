// Automated run of the walkthrough of the page payment_list
// (src/screens/pages/payment_list/walkthrough.yaml, iWCA I6.3) on the real
// app, with the D4 payment sample (payments written through the backend's
// declared endpoints). Steps S1 → S5 follow each other in one app launch.
// Screenshots and the run record: <evidence>/walkthroughs/payment_list/.
import { expect, test } from '@playwright/test'
import { D4_PAYMENTS, seedPaymentSample } from '../tools/walkthrough_lib.mjs'
import {
  balanceEntries,
  close,
  expectPaymentsLoaded,
  goToPaymentsOf,
  launch,
  paymentRows,
  reloadPayments,
  setBackend,
  shownAt,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'payment_list'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/payment_list_walkthrough.spec.ts')
const CONFIRM_TEXT = 'Khoản đã hủy không khôi phục được. Số dư sẽ được tính lại không có khoản này.'

let l: Launched

const button = (name: string) => l.page.getByRole('button', { name, exact: true })
const panel = () => l.page.getByRole('group', { name: 'Xác nhận hủy khoản' })
const focused = (locator: ReturnType<typeof button>) => expect(locator).toBeFocused()

test.describe.serial('walkthrough payment_list', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
    await seedPaymentSample(l.baseUrl)
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — a commission with no payment: the balance, the empty state with its button; the way to the form and back', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await goToPaymentsOf(l.page, 'Chân dung bán thân')
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeVisible()
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['1.500.000 VND']],
        ['Đã nhận', ['0 VND']],
        ['Còn phải thu', ['1.500.000 VND']],
      ])
      await expect(l.page.getByText('Chưa có khoản thanh toán nào')).toBeVisible()
      await expect(l.page.getByRole('list', { name: 'Danh sách khoản thanh toán' })).toHaveCount(0)
      // The button row under the titles: "Ghi khoản thanh toán" (main action) first; the empty state repeats it.
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Ghi khoản thanh toán', 'Quay lại đơn hàng', 'Tải lại', 'Ghi khoản thanh toán'])
      const top = async (name: string) => (await button(name).first().boundingBox())?.y ?? Number.NaN
      expect(await top('Ghi khoản thanh toán')).toBeLessThan((await l.page.getByLabel('Số dư đơn hàng').boundingBox())?.y ?? Number.NaN)
      // The empty state's button opens the form; "Hủy" comes back here, with no notice.
      await l.page.getByRole('main').getByRole('button', { name: 'Ghi khoản thanh toán' }).last().click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Ghi khoản thanh toán' })).toBeVisible()
      await expect(l.page.getByLabel('Số tiền', { exact: true })).toBeVisible({ timeout: 30_000 })
      await button('Hủy').click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thanh toán', exact: true })).toBeVisible()
      await expectPaymentsLoaded(l.page)
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await expect(l.page.getByText('Chưa có khoản thanh toán nào')).toBeVisible()
      // "Quay lại đơn hàng" returns to the commission.
      await button('Quay lại đơn hàng').click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeVisible()
    })
  })

  test('S2 — five payments, newest first by paid_at; a refund and a tip named as such; a voided payment marked and with no button; the balance', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      await goToPaymentsOf(l.page, 'Minh họa bìa sách')
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['9.000.000 VND']],
        ['Đã nhận', ['4.600.000 VND']],
        ['Còn phải thu', ['4.500.000 VND']],
      ])
      expect(await paymentRows(l.page)).toEqual([
        ['Nhận tiền 250.000 VND · Khác', `${shownAt(D4_PAYMENTS.mistaken.paid_at)} · MoMo · Nhập nhầm · Đã hủy`, false],
        ['Hoàn tiền cho khách 500.000 VND · Khác', `${shownAt(D4_PAYMENTS.refund.paid_at)} · Chuyển khoản · Hoàn một phần`, true],
        ['Nhận tiền 100.000 VND · Tiền tip', `${shownAt(D4_PAYMENTS.tip.paid_at)} · Tiền mặt`, true],
        ['Nhận tiền 2.000.000 VND · Thanh toán theo đợt', `${shownAt(D4_PAYMENTS.milestone.paid_at)} · MoMo · Đợt hai`, true],
        ['Nhận tiền 3.000.000 VND · Tiền cọc', `${shownAt(D4_PAYMENTS.deposit.paid_at)} · Chuyển khoản`, true],
      ])
    })
  })

  test('S3 — "Hủy khoản này" asks inside the page; "Quay lại" sends nothing; "Xác nhận" voids it and the balance is worked out again', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      const before = await paymentRows(l.page)
      // The tip (third row): ask.
      await l.page.getByRole('list', { name: 'Danh sách khoản thanh toán' }).getByRole('listitem').nth(2).getByRole('button', { name: 'Hủy khoản này' }).click()
      await expect(panel()).toBeVisible()
      await expect(panel()).toContainText(CONFIRM_TEXT)
      await focused(button('Xác nhận'))
      // While the question waits, the other "Hủy khoản này" wait too.
      for (const b of await l.page.getByRole('button', { name: 'Hủy khoản này' }).all()) await expect(b).toBeDisabled()
      await rec.screenshot(l.page, `${PAGE}-S3-confirm`)
      // "Quay lại": nothing is sent — the list and the balance are as they were.
      await button('Quay lại').click()
      await expect(panel()).toHaveCount(0)
      expect(await paymentRows(l.page)).toEqual(before)
      expect((await balanceEntries(l.page))[1]).toEqual(['Đã nhận', ['4.600.000 VND']])
      await expect(l.page.getByRole('alert')).toHaveCount(0)
      // Ask again and confirm: exactly one voiding.
      await l.page.getByRole('list', { name: 'Danh sách khoản thanh toán' }).getByRole('listitem').nth(2).getByRole('button', { name: 'Hủy khoản này' }).click()
      await expect(panel()).toBeVisible()
      await button('Xác nhận').click()
      await expect(l.page.getByRole('status').filter({ hasText: 'Đã hủy khoản thanh toán.' })).toHaveCount(1, { timeout: 30_000 })
      await expect(panel()).toHaveCount(0)
      await expectPaymentsLoaded(l.page)
      // The tip is now voided (marked, no button); a tip never changed what is owed, so only "Đã nhận" moved.
      await expect
        .poll(async () => (await paymentRows(l.page))[2], { timeout: 30_000 })
        .toEqual(['Nhận tiền 100.000 VND · Tiền tip', `${shownAt(D4_PAYMENTS.tip.paid_at)} · Tiền mặt · Đã hủy`, false])
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['9.000.000 VND']],
        ['Đã nhận', ['4.500.000 VND']],
        ['Còn phải thu', ['4.500.000 VND']],
      ])
      expect((await paymentRows(l.page)).map(([, , canVoid]) => canVoid)).toEqual([false, true, false, true, true])
    })
  })

  test('S4 — an overpaid commission: "Đã thu dư 2,50 USD", the amounts with their decimals', async () => {
    await rec.step(l.page, 'S4', ['ok'], async () => {
      await button('Quay lại đơn hàng').click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeVisible()
      await goToPaymentsOf(l.page, 'Chibi đôi')
      expect(await balanceEntries(l.page)).toEqual([
        ['Giá thỏa thuận', ['12,50 USD']],
        ['Đã nhận', ['15,00 USD']],
        ['Còn phải thu', ['Đã thu dư 2,50 USD']],
      ])
      expect(await paymentRows(l.page)).toEqual([['Nhận tiền 15,00 USD · Thanh toán cuối', `${shownAt(D4_PAYMENTS.overpaid.paid_at)} · PayPal`, true]])
    })
  })

  test('S5 — the backend down: "Không kết nối được" with "Tải lại", no "Ghi khoản thanh toán"; running again, the list', async () => {
    await rec.step(l.page, 'S5', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await reloadPayments(l.page, 'unreachable')
      await expect(l.page.getByRole('alert')).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Quay lại đơn hàng', 'Tải lại'])
      await expect(l.page.getByRole('list', { name: 'Danh sách khoản thanh toán' })).toHaveCount(0)
      await rec.screenshot(l.page, `${PAGE}-S5-unreachable`)
      setBackend('up')
      await reloadPayments(l.page, 'list')
      expect((await balanceEntries(l.page))[2]).toEqual(['Còn phải thu', ['Đã thu dư 2,50 USD']])
      expect(await paymentRows(l.page)).toHaveLength(1)
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Ghi khoản thanh toán', 'Quay lại đơn hàng', 'Tải lại', 'Hủy khoản này'])
    })
  })
})
