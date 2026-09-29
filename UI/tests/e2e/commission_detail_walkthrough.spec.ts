// Automated run of the walkthrough of the page commission_detail
// (src/screens/pages/commission_detail/walkthrough.yaml, iWCA I6.3) on the
// real app, with the D2 sample. Steps S1 → S5 follow each other in one app
// launch; from D3 they also check the "Tiến độ" part (S1, S4, S5).
// Screenshots and the run record: <evidence>/walkthroughs/commission_detail/.
import { expect, test } from '@playwright/test'
import { D3_NOTES, seedCommissionSample, setStage } from '../tools/walkthrough_lib.mjs'
import {
  close,
  commissionEntries,
  expectProgressLoaded,
  goToCommissions,
  launch,
  openCommission,
  progressEntries,
  setBackend,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'commission_detail'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/commission_detail_walkthrough.spec.ts')

let l: Launched
let sample: Awaited<ReturnType<typeof seedCommissionSample>>

const terms = async () => (await commissionEntries(l.page)).map(([t]) => t)

test.describe.serial('walkthrough commission_detail', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
    sample = await seedCommissionSample(l.baseUrl)
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
      // The button row under the title: "Sửa" (main action) first; "Đổi giai
      // đoạn" once the "Tiến độ" part has loaded (D3) — read from the content.
      await expectProgressLoaded(l.page)
      const buttons = l.page.getByRole('main').getByRole('button')
      expect(await buttons.allInnerTexts()).toEqual(['Sửa', 'Đổi giai đoạn', 'Quay lại danh sách'])
      expect(await progressEntries(l.page)).toEqual([
        ['Giai đoạn hiện tại', ['Chờ bắt đầu', 'chưa cập nhật lần nào']],
        ['Lịch sử', ['Chưa đổi giai đoạn lần nào']],
      ])
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
      expect((await commissionEntries(l.page))[2]).toEqual(['Giá thỏa thuận', ['1.500.000 VND']])
      // The "Tiến độ" part loads on its own: its load failed while the backend
      // was down, so it shows its own error and its own "Thử lại" (D3).
      const part = l.page.getByRole('region', { name: 'Tiến độ' })
      const partAlert = part.getByRole('alert')
      await expect(partAlert).toContainText('Không kết nối được')
      await expect(l.page.getByRole('alert')).toHaveCount(1)
      await expect(l.page.getByRole('button', { name: 'Đổi giai đoạn' })).toHaveCount(0)
      await rec.screenshot(l.page, `${PAGE}-S4-progress-unreachable`)
      await part.getByRole('button', { name: 'Thử lại' }).click()
      await expectProgressLoaded(l.page)
      await expect(l.page.getByRole('alert')).toHaveCount(0)
      expect((await progressEntries(l.page))[0]).toEqual(['Giai đoạn hiện tại', ['Chờ bắt đầu', 'chưa cập nhật lần nào']])
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Sửa', 'Đổi giai đoạn', 'Quay lại danh sách'])
      expect((await commissionEntries(l.page))[2]).toEqual(['Giá thỏa thuận', ['1.500.000 VND']])
    })
  })

  test('S5 — a commission in a closed stage: its stage and history; no "Đổi giai đoạn"', async () => {
    // Setup outside the interface: "Minh họa bìa sách" moved to "delivered" through the backend's declared endpoint.
    await setStage(l.baseUrl, sample.commissions.archived, 'delivered', D3_NOTES.delivered)
    await goToCommissions(l.page, 'list')
    await rec.step(l.page, 'S5', ['ok'], async () => {
      await openCommission(l.page, 'Minh họa bìa sách')
      await expectProgressLoaded(l.page)
      const entries = await progressEntries(l.page)
      expect(entries[0][1][0]).toBe('Đã giao')
      expect(entries[0][1][1]).toMatch(/^cập nhật lúc /)
      expect(entries[1][1]).toHaveLength(1)
      expect(entries[1][1][0]).toMatch(/^Bắt đầu: Đã giao · .+ · Đã gửi file cuối$/)
      await expect(l.page.getByRole('region', { name: 'Tiến độ' })).toContainText('Đơn đang ở giai đoạn "Đã giao", không đổi giai đoạn được nữa.')
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Sửa', 'Quay lại danh sách'])
    })
  })
})
