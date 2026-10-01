// Automated run of the walkthrough of the page income_report
// (src/screens/pages/income_report/walkthrough.yaml, iWCA I6.3) on the real
// app, with the D5 income sample (payments and a cancelled commission written
// through the backend's declared endpoints, every paid_at a fixed date). Steps
// S1 → S5 follow each other in one app launch. Screenshots and the run record:
// <evidence>/walkthroughs/income_report/. Every screenshot is taken after a
// FIXED period was typed (D5_PERIODS): the report of the default period
// changes with the day of the run, so it is checked for its structure only and
// never photographed.
import { expect, test } from '@playwright/test'
import { D5_PERIODS, seedIncomeSample } from '../tools/walkthrough_lib.mjs'
import {
  chooseIncomePeriod,
  close,
  dmy,
  expectIncomeLoaded,
  goToIncome,
  incomeCurrencies,
  incomeFrom,
  incomeLine,
  incomeMonths,
  incomeNumbers,
  incomeTo,
  launch,
  setBackend,
  viewIncome,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'income_report'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/income_report_walkthrough.spec.ts')
const TERMS = ['Thực nhận trong kỳ', 'Đã hoàn cho khách trong kỳ', 'Còn phải thu (mọi đơn chưa hủy, tính tới lúc lập)']
const EXPLANATION = 'Thực nhận đã trừ tiền hoàn, gồm cả tiền tip. Còn phải thu không phụ thuộc khoảng thời gian.'
const NO_PAYMENTS = 'Không có khoản thanh toán nào trong kỳ.'
const numbers = (received: string, refunded: string, outstanding: string): [string, string[]][] => [
  [TERMS[0], [received]],
  [TERMS[1], [refunded]],
  [TERMS[2], [outstanding]],
]
// The two "Còn phải thu" that do not depend on the period.
const OUTSTANDING = { USD: '-7,55 USD', VND: '6.000.000 VND' }

// The date of the machine, YYYY-MM-DD (the app builds its default from the same clock).
const localToday = () => {
  const d = new Date()
  return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let l: Launched
// How many GET /reports/income the renderer has sent since the app opened.
let sent = 0

const press = () => l.page.getByRole('button', { name: 'Xem báo cáo', exact: true }).click()

test.describe.serial('walkthrough income_report', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
    l.page.on('request', (r) => {
      if (r.url().includes('/reports/income')) sent += 1
    })
    await seedIncomeSample(l.baseUrl)
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — the page opens by itself on 1 January → today; then a fixed period of two months: two currencies, the numbers, the months', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      const before = localToday()
      await goToIncome(l.page)
      const after = localToday()
      expect(sent).toBe(1)
      // The button row is right under the title: "Xem báo cáo" first, above the fields; the other two buttons empty a field.
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Xem báo cáo', 'Xóa ngày bắt đầu', 'Xóa ngày kết thúc'])
      const y = async (locator: ReturnType<typeof incomeFrom>) => (await locator.boundingBox())?.y ?? Number.NaN
      expect(await y(l.page.getByRole('button', { name: 'Xem báo cáo', exact: true }))).toBeLessThan(await y(incomeFrom(l.page)))
      // The default period: 1 January of this year to today, by the machine's date.
      const from = await incomeFrom(l.page).inputValue()
      const to = await incomeTo(l.page).inputValue()
      expect([`${before.slice(0, 4)}-01-01`, `${after.slice(0, 4)}-01-01`]).toContain(from)
      expect([before, after]).toContain(to)
      // The sub-line names the period of the REPORT (the same one, here).
      await expect(incomeLine(l.page)).toContainText(`Từ ${dmy(from)} đến ${dmy(to)} · Lập lúc `)
      // Whatever the day, both currencies have a debt to show, and it does not depend on the period.
      expect(await incomeCurrencies(l.page)).toEqual(['USD', 'VND'])
      expect((await incomeNumbers(l.page, 'USD'))[2]).toEqual([TERMS[2], [OUTSTANDING.USD]])
      expect((await incomeNumbers(l.page, 'VND'))[2]).toEqual([TERMS[2], [OUTSTANDING.VND]])

      // A fixed period of two months (the screenshot of this step shows it).
      await viewIncome(l.page, D5_PERIODS.twoMonths)
      expect(sent).toBe(2)
      expect(await incomeCurrencies(l.page)).toEqual(['USD', 'VND'])
      expect(await incomeNumbers(l.page, 'USD')).toEqual(numbers('20,05 USD', '0,00 USD', '-7,55 USD'))
      expect(await incomeMonths(l.page, 'USD')).toEqual([
        ['Tháng 8/2026', ['5,05 USD']],
        ['Tháng 9/2026', ['15,00 USD']],
      ])
      // The cancelled commission's deposit is in "Thực nhận" (August) and its debt is not in "Còn phải thu".
      expect(await incomeNumbers(l.page, 'VND')).toEqual(numbers('5.100.000 VND', '500.000 VND', '6.000.000 VND'))
      expect(await incomeMonths(l.page, 'VND')).toEqual([
        ['Tháng 8/2026', ['500.000 VND']],
        ['Tháng 9/2026', ['4.600.000 VND']],
      ])
      await expect(l.page.getByText(EXPLANATION)).toHaveCount(2)
      await expect(l.page.getByText(NO_PAYMENTS)).toHaveCount(0)
      await expect(incomeLine(l.page)).toContainText('Từ 01/08/2026 đến 30/09/2026 · Lập lúc ')
    })
  })

  test('S2 — a narrower period: what happened in the period changes, "Còn phải thu" does not', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      const outstandingBefore = [(await incomeNumbers(l.page, 'USD'))[2], (await incomeNumbers(l.page, 'VND'))[2]]
      await viewIncome(l.page, D5_PERIODS.september)
      expect(await incomeNumbers(l.page, 'USD')).toEqual(numbers('15,00 USD', '0,00 USD', '-7,55 USD'))
      expect(await incomeMonths(l.page, 'USD')).toEqual([['Tháng 9/2026', ['15,00 USD']]])
      expect(await incomeNumbers(l.page, 'VND')).toEqual(numbers('4.600.000 VND', '500.000 VND', '6.000.000 VND'))
      expect(await incomeMonths(l.page, 'VND')).toEqual([['Tháng 9/2026', ['4.600.000 VND']]])
      expect([(await incomeNumbers(l.page, 'USD'))[2], (await incomeNumbers(l.page, 'VND'))[2]]).toEqual(outstandingBefore)
      await expect(incomeLine(l.page)).toContainText('Từ 01/09/2026 đến 30/09/2026 · Lập lúc ')
    })
  })

  test('S3 — a period with no payment: the currencies stay for their debt, with the sentence instead of the months; the sub-line follows the report, not the fields', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await viewIncome(l.page, D5_PERIODS.nothingPaid)
      expect(await incomeCurrencies(l.page)).toEqual(['USD', 'VND'])
      expect(await incomeNumbers(l.page, 'USD')).toEqual(numbers('0,00 USD', '0,00 USD', '-7,55 USD'))
      expect(await incomeNumbers(l.page, 'VND')).toEqual(numbers('0 VND', '0 VND', '6.000.000 VND'))
      expect(await incomeMonths(l.page, 'USD')).toEqual([])
      expect(await incomeMonths(l.page, 'VND')).toEqual([])
      await expect(l.page.getByText(NO_PAYMENTS)).toHaveCount(2)
      // Editing a field afterwards changes nothing that is shown, and sends nothing.
      const count = sent
      await incomeFrom(l.page).fill('2024-01-01')
      await expect(incomeLine(l.page)).toContainText('Từ 01/01/2025 đến 31/12/2025 · Lập lúc ')
      expect(sent).toBe(count)
      await rec.screenshot(l.page, `${PAGE}-S3-edited`)
    })
  })

  test('S4 — a period the page refuses: from after to, and an empty field; nothing is sent, the report stays, the cursor goes to the field', async () => {
    await rec.step(l.page, 'S4', ['rejected_input'], async () => {
      await viewIncome(l.page, D5_PERIODS.twoMonths)
      const line = await incomeLine(l.page).innerText()
      const count = sent
      // From after to: the sentence is under "Đến ngày", the cursor is there.
      await chooseIncomePeriod(l.page, ['2026-10-01', '2026-09-30'])
      await press()
      await expect(l.page.getByText('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')).toBeVisible()
      await expect(l.page.getByRole('alert')).toContainText('Chưa xem được báo cáo')
      await expect(incomeTo(l.page)).toBeFocused()
      await expect(incomeTo(l.page)).toHaveAttribute('aria-invalid', 'true')
      await expect(incomeFrom(l.page)).toHaveAttribute('aria-invalid', 'false')
      // The report of before is still there, untouched; the fields keep what was typed.
      expect(await incomeLine(l.page).innerText()).toBe(line)
      expect(await incomeCurrencies(l.page)).toEqual(['USD', 'VND'])
      expect(await incomeFrom(l.page).inputValue()).toBe('2026-10-01')
      expect(sent).toBe(count)
      await rec.screenshot(l.page, `${PAGE}-S4-from-after-to`)
      // An empty field: "Từ ngày" emptied by its button; the sentence is under it, the cursor is there.
      await chooseIncomePeriod(l.page, D5_PERIODS.twoMonths)
      await l.page.getByRole('button', { name: 'Xóa ngày bắt đầu' }).click()
      expect(await incomeFrom(l.page).inputValue()).toBe('')
      await press()
      await expect(l.page.getByText('Chọn ngày bắt đầu.')).toBeVisible()
      await expect(incomeFrom(l.page)).toBeFocused()
      expect(sent).toBe(count)
      await rec.screenshot(l.page, `${PAGE}-S4-empty-field`)
      // Both empty: the cursor goes to the first field on the screen.
      await l.page.getByRole('button', { name: 'Xóa ngày kết thúc' }).click()
      await press()
      await expect(l.page.getByText('Chọn ngày kết thúc.')).toBeVisible()
      await expect(incomeFrom(l.page)).toBeFocused()
      expect(sent).toBe(count)
      // Mending the fields and pressing again sends and clears the errors.
      await viewIncome(l.page, D5_PERIODS.twoMonths)
      await expect(l.page.getByText('Chọn ngày bắt đầu.')).toHaveCount(0)
      await expect(l.page.getByRole('alert')).toHaveCount(0)
      expect(sent).toBe(count + 1)
    })
  })

  test('S5 — the backend down: "Không kết nối được", the old report dropped; running again, "Xem báo cáo" gives the report', async () => {
    await rec.step(l.page, 'S5', ['unreachable', 'ok'], async () => {
      await chooseIncomePeriod(l.page, D5_PERIODS.twoMonths)
      setBackend('down')
      await press()
      await expect(l.page.getByRole('alert')).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(l.page.getByRole('alert')).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      // No old number beside the failure: not a section, not the sub-line.
      await expect(l.page.getByRole('main').getByRole('heading', { level: 3 })).toHaveCount(0)
      await expect(incomeLine(l.page)).toHaveCount(0)
      await expect(l.page.getByRole('status').filter({ hasText: 'Đang lập báo cáo' })).toHaveCount(0)
      expect(await incomeFrom(l.page).inputValue()).toBe(D5_PERIODS.twoMonths[0])
      await rec.screenshot(l.page, `${PAGE}-S5-unreachable`)
      setBackend('up')
      await press()
      await expectIncomeLoaded(l.page, D5_PERIODS.twoMonths)
      expect(await incomeNumbers(l.page, 'VND')).toEqual(numbers('5.100.000 VND', '500.000 VND', '6.000.000 VND'))
      expect(await incomeCurrencies(l.page)).toEqual(['USD', 'VND'])
    })
  })
})
