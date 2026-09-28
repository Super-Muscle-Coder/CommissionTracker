// Automated run of the walkthrough of the page client_list
// (src/screens/pages/client_list/walkthrough.yaml, iWCA I6.3) on the real app.
// Steps S1 → S5, each on its own app launch as the walkthrough's setup says.
// Screenshots and the run record: UI/evidence/walkthroughs/client_list/
// (tests/e2e/walkthrough_harness.ts; runner from CT_WALKTHROUGH_RUNNER).
import { expect, test, type Page } from '@playwright/test'
import { EXPECTED_ACTIVE, EXPECTED_ARCHIVED } from '../tools/walkthrough_lib.mjs'
import { close, detailEntries, launch, listTexts, reloadList, setBackend, walkthroughRecorder } from './walkthrough_harness.js'

const PAGE = 'client_list'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/client_list_walkthrough.spec.ts')

async function expectSampleList(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 3, name: 'Đang hoạt động' })).toBeVisible()
  expect(await listTexts(page, 'Khách hàng đang hoạt động')).toEqual(EXPECTED_ACTIVE)
  expect(await listTexts(page, 'Khách hàng đã lưu trữ')).toEqual(EXPECTED_ARCHIVED)
  await expect(page.getByRole('alert')).toHaveCount(0)
}

test.describe.serial('walkthrough client_list', () => {
  test.beforeAll(() => rec.reset())
  test.afterAll(() => rec.write())

  test('S1 — sample data: Vietnamese order, archived group apart, navigation item current', async () => {
    const l = await launch({ seed: true })
    try {
      await rec.step(l.page, 'S1', ['ok'], async () => {
        await reloadList(l.page, 'list')
        await expectSampleList(l.page)
        const item = l.page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Khách hàng' })
        await expect(item).toHaveAttribute('aria-current', 'page')
      })
    } finally {
      await close(l)
    }
  })

  test('S2 — empty database: empty state with its add button, which opens the form', async () => {
    const l = await launch({ seed: false })
    try {
      await rec.step(l.page, 'S2', ['ok'], async () => {
        await expect(l.page.getByText('Chưa có khách hàng nào.')).toBeVisible()
        await expect(l.page.getByRole('list', { name: /^Khách hàng/ })).toHaveCount(0)
        await expect(l.page.getByRole('alert')).toHaveCount(0)
        const adds = l.page.getByRole('button', { name: 'Thêm khách hàng' })
        await expect(adds).toHaveCount(2)
        await rec.screenshot(l.page, `${PAGE}-S2-empty`)
        await adds.nth(1).click()
        await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm khách hàng' })).toBeVisible()
        await expect(l.page.getByLabel('Tên hiển thị')).toHaveValue('')
      })
    } finally {
      await close(l)
    }
  })

  test('S3 — backend unreachable, then running again: reload succeeds', async () => {
    const l = await launch({ seed: true })
    try {
      await reloadList(l.page, 'list')
      await expectSampleList(l.page)
      await rec.step(l.page, 'S3', ['unreachable', 'ok'], async () => {
        setBackend('down')
        await reloadList(l.page, 'unreachable')
        const alert = l.page.getByRole('alert')
        await expect(alert).toContainText('Không kết nối được')
        await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
        await expect(l.page.getByRole('list', { name: 'Khách hàng đang hoạt động' })).toHaveCount(0)
        await rec.screenshot(l.page, `${PAGE}-S3-unreachable`)
        setBackend('up')
        await reloadList(l.page, 'list')
        await expectSampleList(l.page)
      })
    } finally {
      await close(l)
    }
  })

  test('S4 — "Thêm khách hàng" opens an empty form', async () => {
    const l = await launch({ seed: true })
    try {
      await reloadList(l.page, 'list')
      await rec.step(l.page, 'S4', ['ok'], async () => {
        await l.page.getByRole('button', { name: 'Thêm khách hàng' }).click()
        await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm khách hàng' })).toBeVisible()
        await expect(l.page.getByLabel('Tên hiển thị')).toHaveValue('')
        await expect(l.page.getByLabel('Kênh 1')).toHaveCount(0)
        await expect(l.page.getByLabel('Ghi chú')).toHaveValue('')
        await expect(l.page.getByRole('button', { name: 'Lưu' })).toBeEnabled()
        await expect(l.page.getByRole('button', { name: 'Hủy' })).toBeEnabled()
      })
    } finally {
      await close(l)
    }
  })

  test('S5 — pressing a client opens its detail', async () => {
    const l = await launch({ seed: true })
    try {
      await reloadList(l.page, 'list')
      await rec.step(l.page, 'S5', ['ok'], async () => {
        await l.page.getByRole('button', { name: 'Nguyễn Thu Hà' }).click()
        await expect(l.page.getByRole('heading', { level: 3, name: 'Nguyễn Thu Hà' })).toBeVisible()
        const entries = await detailEntries(l.page)
        expect(entries.slice(0, 3)).toEqual([
          ['Trạng thái', ['Đang hoạt động']],
          ['Liên hệ', ['facebook: fb.com/thuha.art', 'email: thuha@example.com']],
          ['Ghi chú', ['Thích tông màu ấm. Giao file PSD.']],
        ])
        expect(entries.map(([term]: [string, string[]]) => term).slice(3)).toEqual(['Ngày tạo', 'Sửa lần cuối'])
      })
    } finally {
      await close(l)
    }
  })
})
