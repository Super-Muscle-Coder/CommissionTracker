// Automated run of the walkthrough of the page commission_detail
// (src/screens/pages/commission_detail/walkthrough.yaml, iWCA I6.3) on the
// real app, with the D2 sample. Steps S1 → S4 follow each other in one app
// launch. Screenshots and the run record: <evidence>/walkthroughs/commission_detail/.
import { expect, test } from '@playwright/test'
import { seedCommissionSample } from '../tools/walkthrough_lib.mjs'
import { close, commissionEntries, goToCommissions, launch, openCommission, setBackend, walkthroughRecorder, type Launched } from './walkthrough_harness.js'

const PAGE = 'commission_detail'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/commission_detail_walkthrough.spec.ts')

let l: Launched

const terms = async () => (await commissionEntries(l.page)).map(([t]) => t)

test.describe.serial('walkthrough commission_detail', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
    await seedCommissionSample(l.baseUrl)
    await goToCommissions(l.page, 'list')
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — a commission with every entry; reference links are text, not links', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await openCommission(l.page, 'Chân dung bán thân')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeVisible()
      // The button row under the title: "Sửa" (main action) first.
      const buttons = l.page.getByRole('main').getByRole('button')
      expect(await buttons.allInnerTexts()).toEqual(['Sửa', 'Quay lại danh sách'])
      const entries = await commissionEntries(l.page)
      expect(entries.slice(0, 6)).toEqual([
        ['Khách hàng', ['Mai Anh']],
        ['Loại tranh', ['bán thân']],
        ['Giá thỏa thuận', ['1.500.000 VND']],
        ['Hạn giao', ['15/10/2026']],
        ['Mô tả', ['Nền xanh, ánh sáng dịu.']],
        ['Liên kết tham khảo', ['https://example.com/ref-1', 'https://example.com/ref-2']],
      ])
      expect(entries.slice(6).map(([t]) => t)).toEqual(['Ngày tạo', 'Sửa lần cuối'])
      // Plain text: no link element; the text can be selected (and so copied).
      await expect(l.page.locator('a')).toHaveCount(0)
      await expect(l.page.getByRole('link')).toHaveCount(0)
      const link = l.page.getByText('https://example.com/ref-1', { exact: true })
      await link.click({ clickCount: 3 })
      expect(await l.page.evaluate('String(getSelection())')).toContain('https://example.com/ref-1')
      // Pressing it opened nothing: still the same page.
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeVisible()
    })
  })

  test('S2 — an archived client, a deadline on 1 January (no day shift)', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      await l.page.getByRole('button', { name: 'Quay lại danh sách' }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Đơn hàng' })).toBeVisible()
      await openCommission(l.page, 'Minh họa bìa sách')
      const entries = await commissionEntries(l.page)
      expect(entries.slice(0, 4)).toEqual([
        ['Khách hàng', ['Lan Chi (đã lưu trữ)']],
        ['Loại tranh', ['minh họa']],
        ['Giá thỏa thuận', ['9.000.000 VND']],
        ['Hạn giao', ['01/01/2026']],
      ])
      expect(await terms()).toEqual(['Khách hàng', 'Loại tranh', 'Giá thỏa thuận', 'Hạn giao', 'Ngày tạo', 'Sửa lần cuối'])
    })
  })

  test('S3 — USD with decimals, no deadline, no optional entry; "Sửa" opens the form, "Hủy" comes back', async () => {
    await goToCommissions(l.page, 'list')
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await openCommission(l.page, 'Chibi đôi')
      expect((await commissionEntries(l.page)).slice(0, 3)).toEqual([
        ['Khách hàng', ['Quốc Bảo']],
        ['Giá thỏa thuận', ['12,50 USD']],
        ['Hạn giao', ['Không có hạn']],
      ])
      expect(await terms()).toEqual(['Khách hàng', 'Giá thỏa thuận', 'Hạn giao', 'Ngày tạo', 'Sửa lần cuối'])
      await l.page.getByRole('button', { name: 'Sửa' }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Sửa đơn hàng' })).toBeVisible()
      await expect(l.page.getByLabel('Tiêu đề', { exact: true })).toHaveValue('Chibi đôi')
      await expect(l.page.getByLabel('Giá thỏa thuận', { exact: true })).toHaveValue('12,50')
      await expect(l.page.getByLabel('Đơn vị tiền', { exact: true })).toBeDisabled()
      await expect(l.page.getByLabel('Đơn vị tiền', { exact: true })).toHaveValue('USD')
      await l.page.getByRole('button', { name: 'Hủy' }).click()
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chibi đôi' })).toBeVisible()
    })
  })

  test('S4 — the backend down: "Không kết nối được" with "Thử lại"; running again, the detail', async () => {
    await goToCommissions(l.page, 'list')
    await rec.step(l.page, 'S4', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await l.page.getByRole('list', { name: 'Danh sách đơn hàng' }).getByRole('button', { name: /^Chân dung bán thân/ }).click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      await expect(l.page.getByLabel('Thông tin đơn hàng')).toHaveCount(0)
      await expect(l.page.getByRole('button', { name: 'Thử lại' })).toBeEnabled()
      await expect(l.page.getByRole('button', { name: 'Quay lại danh sách' })).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S4-unreachable`)
      setBackend('up')
      await l.page.getByRole('button', { name: 'Thử lại' }).click()
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeVisible({ timeout: 30_000 })
      await expect(l.page.getByRole('alert')).toHaveCount(0)
      expect((await commissionEntries(l.page))[2]).toEqual(['Giá thỏa thuận', ['1.500.000 VND']])
    })
  })
})
