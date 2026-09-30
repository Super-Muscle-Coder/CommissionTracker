// Automated run of the walkthrough of the page stage_change
// (src/screens/pages/stage_change/walkthrough.yaml, iWCA I6.3) on the real
// app, with the D3 sample. Steps S1 → S5 follow each other in one app
// launch, on "Chibi đôi" (no stage set). Screenshots and the run record:
// <evidence>/walkthroughs/stage_change/.
import { expect, test, type Locator } from '@playwright/test'
import { seedProgressSample } from '../tools/walkthrough_lib.mjs'
import {
  close,
  expectProgressLoaded,
  goToCommissions,
  launch,
  openCommission,
  openStageChange,
  progressEntries,
  setBackend,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'stage_change'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/stage_change_walkthrough.spec.ts')
const TITLE = 'Chibi đôi'
const INPUT_SUMMARY = 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.'
const CONFIRM_TEXT = 'Sau khi chuyển sang "Đã giao", đơn này không đổi giai đoạn được nữa.'

let l: Launched

const field = (label: string) => l.page.getByLabel(label, { exact: true })
const button = (name: string) => l.page.getByRole('button', { name, exact: true })
const panel = () => l.page.getByRole('group', { name: 'Xác nhận đổi giai đoạn' })
// The error message tied to a field (aria-describedby).
async function errorOf(label: string): Promise<string | null> {
  const id = await field(label).getAttribute('aria-describedby')
  return id === null ? null : l.page.locator(`[id="${id}"]`).innerText()
}
// The detail of "Chibi đôi", with its "Tiến độ" part loaded.
async function toDetail(): Promise<void> {
  await goToCommissions(l.page, 'list')
  await openCommission(l.page, TITLE)
  await expectProgressLoaded(l.page)
}
// Back on the detail after a change: the notice, and the part loaded.
async function expectChanged(notice: string, stage: string): Promise<void> {
  await expect(l.page.getByRole('heading', { level: 3, name: TITLE })).toBeVisible({ timeout: 30_000 })
  await expect(l.page.getByRole('status').filter({ hasText: notice })).toHaveCount(1)
  await expectProgressLoaded(l.page)
  expect((await progressEntries(l.page))[0][1][0]).toBe(stage)
}
// The button row ("Lưu" first, then "Hủy") is right under the titles, above the first field.
async function expectButtonRowFirst(): Promise<void> {
  const top = async (loc: Locator) => (await loc.boundingBox())?.y ?? Number.NaN
  const title = await top(l.page.getByRole('heading', { level: 3, name: TITLE }))
  const save = await top(button('Lưu'))
  expect(title).toBeLessThan(save)
  expect(save).toBe(await top(button('Hủy')))
  expect(save).toBeLessThan(await top(field('Giai đoạn mới')))
}

test.describe.serial('walkthrough stage_change', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: false })
    await seedProgressSample(l.baseUrl)
    await toDetail()
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — the page; "Lưu" with no stage chosen: rejected input, the focus on "Giai đoạn mới", nothing sent', async () => {
    await rec.step(l.page, 'S1', ['rejected_input'], async () => {
      await openStageChange(l.page)
      await expect(l.page.getByRole('heading', { level: 3, name: TITLE })).toBeVisible()
      await expectButtonRowFirst()
      expect(await l.page.getByLabel('Tiến độ hiện tại').locator('dd').allInnerTexts()).toEqual(['Chờ bắt đầu'])
      await expect(field('Giai đoạn mới').locator('option')).toHaveText([
        'Chọn giai đoạn',
        'Phác thảo',
        'Lên nét',
        'Tô màu',
        'Hoàn thiện chi tiết',
        'Duyệt lần cuối',
        'Sửa theo yêu cầu',
        'Đã vẽ xong',
        'Tạm dừng',
        'Đã giao',
        'Đã hủy',
      ])
      await button('Lưu').click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Chưa lưu được')
      await expect(alert).toContainText(INPUT_SUMMARY)
      expect(await errorOf('Giai đoạn mới')).toBe('Chọn giai đoạn mới.')
      await expect(field('Giai đoạn mới')).toBeFocused()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Đổi giai đoạn' })).toBeVisible()
    })
  })

  test('S2 — an ordinary stage with a note: saved at once, no confirmation; the detail shows it', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      await field('Giai đoạn mới').selectOption({ label: 'Phác thảo' })
      await field('Ghi chú').fill('Bắt đầu phác')
      await button('Lưu').click()
      await expectChanged('Đã đổi giai đoạn sang Phác thảo.', 'Phác thảo')
      await expect(panel()).toHaveCount(0)
      const entries = await progressEntries(l.page)
      expect(entries[0][1][1]).toMatch(/^cập nhật lúc /)
      expect(entries[1][0]).toBe('Lịch sử')
      expect(entries[1][1]).toHaveLength(1)
      expect(entries[1][1][0]).toMatch(/^Bắt đầu: Phác thảo · .+ · Bắt đầu phác$/)
      await expect(button('Đổi giai đoạn')).toBeVisible()
    })
  })

  test('S3 — a closing stage asks first, inside the page; "Quay lại" sends nothing', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await openStageChange(l.page)
      await field('Giai đoạn mới').selectOption({ label: 'Đã giao' })
      await button('Lưu').click()
      await expect(panel()).toBeVisible()
      await expect(panel()).toContainText(CONFIRM_TEXT)
      await expect(button('Xác nhận')).toBeFocused()
      await expect(field('Giai đoạn mới')).toBeDisabled()
      await expect(field('Ghi chú')).toBeDisabled()
      await expect(button('Lưu')).toBeDisabled()
      await rec.screenshot(l.page, `${PAGE}-S3-confirm`)
      await button('Quay lại').click()
      await expect(panel()).toHaveCount(0)
      expect(await field('Giai đoạn mới').locator('option:checked').innerText()).toBe('Đã giao')
      await button('Hủy').click()
      await expect(l.page.getByRole('heading', { level: 3, name: TITLE })).toBeVisible()
      await expectProgressLoaded(l.page)
      expect((await progressEntries(l.page))[0][1][0]).toBe('Phác thảo')
    })
  })

  test('S4 — saving while the backend is down: the draft stays; saved once it runs again', async () => {
    await openStageChange(l.page)
    await field('Giai đoạn mới').selectOption({ label: 'Lên nét' })
    await rec.step(l.page, 'S4', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await button('Lưu').click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Đổi giai đoạn' })).toBeVisible()
      expect(await field('Giai đoạn mới').locator('option:checked').innerText()).toBe('Lên nét')
      await expect(button('Lưu')).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S4-unreachable`)
      setBackend('up')
      await button('Lưu').click()
      await expectChanged('Đã đổi giai đoạn sang Lên nét.', 'Lên nét')
    })
  })

  test('S5 — "Đã giao" through the confirmation; then no "Đổi giai đoạn" on the detail', async () => {
    await rec.step(l.page, 'S5', ['ok'], async () => {
      await openStageChange(l.page)
      await field('Giai đoạn mới').selectOption({ label: 'Đã giao' })
      await field('Ghi chú').fill('Giao file cuối')
      await button('Lưu').click()
      await expect(panel()).toBeVisible()
      await button('Xác nhận').click()
      await expectChanged('Đã đổi giai đoạn sang Đã giao.', 'Đã giao')
      await expect(l.page.getByRole('region', { name: 'Tiến độ' })).toContainText('Đơn đang ở giai đoạn "Đã giao", không đổi giai đoạn được nữa.')
      await expect(button('Đổi giai đoạn')).toHaveCount(0)
      // From D4 the row also has "Thanh toán", always there.
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Sửa', 'Thanh toán', 'Quay lại danh sách'])
    })
  })
})
