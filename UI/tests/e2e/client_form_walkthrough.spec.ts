// Automated run of the walkthrough of the page client_form
// (src/screens/pages/client_form/walkthrough.yaml, iWCA I6.3) on the real
// app. Steps S1 → S5 follow each other in one app launch, as the
// walkthrough's precondition says. Screenshots and the run record:
// UI/evidence/walkthroughs/client_form/ (runner from CT_WALKTHROUGH_RUNNER).
import { expect, test } from '@playwright/test'
import {
  close,
  detailEntries,
  expectListLoaded,
  goToList,
  launch,
  listTexts,
  reloadList,
  setBackend,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'client_form'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/client_form_walkthrough.spec.ts')
const INPUT_SUMMARY = 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.'

let l: Launched

const field = (label: string) => l.page.getByLabel(label, { exact: true })
// Type into a channel field, then close its suggestion list (Escape), as a
// user would: an open native suggestion popup blocks Electron screenshots.
async function fillChannel(label: string, value: string): Promise<void> {
  await field(label).fill(value)
  await field(label).press('Escape')
}
// The button row ("Lưu" first, then "Hủy") is right under the page title,
// above the first field, on the real screen (§7.2, principle 7).
async function expectButtonRowFirst(): Promise<void> {
  const top = async (loc: ReturnType<typeof field>) => (await loc.boundingBox())?.y ?? Number.NaN
  const title = await top(l.page.getByRole('heading', { level: 2 }))
  const save = await top(l.page.getByRole('button', { name: 'Lưu', exact: true }))
  const cancel = await top(l.page.getByRole('button', { name: 'Hủy' }))
  const name = await top(field('Tên hiển thị'))
  expect(title).toBeLessThan(save)
  expect(save).toBe(cancel)
  expect(save).toBeLessThan(name)
  expect(await l.page.getByRole('button', { name: 'Lưu', exact: true }).isVisible()).toBe(true)
}
// The error message tied to a field (aria-describedby).
async function errorOf(label: string): Promise<string | null> {
  const id = await field(label).getAttribute('aria-describedby')
  return id === null ? null : l.page.locator(`[id="${id}"]`).innerText()
}

test.describe.serial('walkthrough client_form', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: true })
    await reloadList(l.page, 'list')
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — create: saved, then the detail with "Đã thêm khách hàng."', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await l.page.getByRole('button', { name: 'Thêm khách hàng' }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm khách hàng' })).toBeVisible()
      await expectButtonRowFirst()
      await field('Tên hiển thị').fill('Chi Mai')
      await l.page.getByRole('button', { name: 'Thêm liên hệ' }).click()
      // The channel field offers the suggestions (a datalist).
      const listId = await field('Kênh 1').getAttribute('list')
      const options = await l.page.locator(`datalist[id="${listId}"] option`).all()
      expect(await Promise.all(options.map((o) => o.getAttribute('value')))).toEqual([
        'email', 'facebook', 'instagram', 'discord', 'zalo', 'x',
      ])
      await fillChannel('Kênh 1', 'instagram')
      await field('Giá trị 1').fill('@chimai.draws')
      await field('Ghi chú').fill('Khách quen')
      await l.page.getByRole('button', { name: 'Lưu', exact: true }).click()
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chi Mai' })).toBeVisible()
      await expect(l.page.getByRole('status').filter({ hasText: 'Đã thêm khách hàng.' })).toHaveCount(1)
      const entries = await detailEntries(l.page)
      expect(entries.slice(0, 3)).toEqual([
        ['Trạng thái', ['Đang hoạt động']],
        ['Liên hệ', ['instagram: @chimai.draws']],
        ['Ghi chú', ['Khách quen']],
      ])
    })
  })

  test('S2 — create, rejected input: errors at the fields, what was typed kept, nothing created', async () => {
    await goToList(l.page)
    const before = await listTexts(l.page, 'Khách hàng đang hoạt động')
    // The comparison after "Hủy" must not pass on an empty list (UI-4).
    expect(before.length).toBeGreaterThan(0)
    expect(before).toContain('Chi Mai')
    await rec.step(l.page, 'S2', ['rejected_input'], async () => {
      await l.page.getByRole('button', { name: 'Thêm khách hàng' }).click()
      await field('Tên hiển thị').fill('   ')
      await l.page.getByRole('button', { name: 'Thêm liên hệ' }).click()
      await fillChannel('Kênh 1', 'zalo')
      await field('Ghi chú').fill('ghi chú thử')
      await l.page.getByRole('button', { name: 'Lưu', exact: true }).click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Chưa lưu được')
      await expect(alert).toContainText(INPUT_SUMMARY)
      expect(await errorOf('Tên hiển thị')).toBe('Nhập tên khách hàng.')
      // The text cursor is in the first field in error (the name, above the contact row).
      await expect(field('Tên hiển thị')).toBeFocused()
      expect(await errorOf('Giá trị 1')).toBe('Nhập thông tin liên hệ, hoặc bỏ hàng này.')
      expect(await errorOf('Kênh 1')).toBeNull()
      await expect(field('Kênh 1')).toHaveValue('zalo')
      await expect(field('Ghi chú')).toHaveValue('ghi chú thử')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm khách hàng' })).toBeVisible()
      await rec.screenshot(l.page, `${PAGE}-S2-errors`)
      await l.page.getByRole('button', { name: 'Hủy' }).click()
      await expectListLoaded(l.page)
      expect(await listTexts(l.page, 'Khách hàng đang hoạt động')).toEqual(before)
    })
  })

  test('S3 — edit: saved, then the detail with "Đã lưu thay đổi."', async () => {
    await goToList(l.page)
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await l.page.getByRole('button', { name: 'An', exact: true }).click()
      await l.page.getByRole('button', { name: 'Sửa' }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Sửa khách hàng' })).toBeVisible()
      await expect(field('Tên hiển thị')).toHaveValue('An')
      await expectButtonRowFirst()
      await field('Tên hiển thị').fill('An Nhiên')
      await l.page.getByRole('button', { name: 'Thêm liên hệ' }).click()
      await fillChannel('Kênh 1', 'email')
      await field('Giá trị 1').fill('an@example.com')
      await l.page.getByRole('button', { name: 'Lưu', exact: true }).click()
      await expect(l.page.getByRole('heading', { level: 3, name: 'An Nhiên' })).toBeVisible()
      await expect(l.page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi.' })).toHaveCount(1)
      expect((await detailEntries(l.page))[1]).toEqual(['Liên hệ', ['email: an@example.com']])
    })
  })

  test('S4 — edit, rejected input: empty name, the contact row kept, nothing saved', async () => {
    await rec.step(l.page, 'S4', ['rejected_input'], async () => {
      await l.page.getByRole('button', { name: 'Sửa' }).click()
      await expect(field('Tên hiển thị')).toHaveValue('An Nhiên')
      await field('Tên hiển thị').fill('')
      await l.page.getByRole('button', { name: 'Lưu', exact: true }).click()
      await expect(l.page.getByRole('alert')).toContainText('Chưa lưu được')
      expect(await errorOf('Tên hiển thị')).toBe('Nhập tên khách hàng.')
      await expect(field('Tên hiển thị')).toBeFocused()
      await expect(field('Kênh 1')).toHaveValue('email')
      await expect(field('Giá trị 1')).toHaveValue('an@example.com')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Sửa khách hàng' })).toBeVisible()
      await rec.screenshot(l.page, `${PAGE}-S4-errors`)
      await l.page.getByRole('button', { name: 'Hủy' }).click()
      await expect(l.page.getByRole('heading', { level: 3, name: 'An Nhiên' })).toBeVisible()
    })
  })

  test('S5 — create while the backend is down: the draft stays; saved once it runs again', async () => {
    await goToList(l.page)
    await l.page.getByRole('button', { name: 'Thêm khách hàng' }).click()
    await field('Tên hiển thị').fill('Dạ Thảo')
    await l.page.getByRole('button', { name: 'Thêm liên hệ' }).click()
    await fillChannel('Kênh 1', 'discord')
    await field('Giá trị 1').fill('dathao#1234')
    await rec.step(l.page, 'S5', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await l.page.getByRole('button', { name: 'Lưu', exact: true }).click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Không kết nối được')
      await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm khách hàng' })).toBeVisible()
      await expect(field('Tên hiển thị')).toHaveValue('Dạ Thảo')
      await expect(field('Kênh 1')).toHaveValue('discord')
      await expect(field('Giá trị 1')).toHaveValue('dathao#1234')
      await expect(l.page.getByRole('button', { name: 'Lưu', exact: true })).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S5-unreachable`)
      setBackend('up')
      await l.page.getByRole('button', { name: 'Lưu', exact: true }).click()
      await expect(l.page.getByRole('heading', { level: 3, name: 'Dạ Thảo' })).toBeVisible()
      await expect(l.page.getByRole('status').filter({ hasText: 'Đã thêm khách hàng.' })).toHaveCount(1)
      await rec.screenshot(l.page, `${PAGE}-S5-saved`)
      await l.page.getByRole('button', { name: 'Quay lại danh sách' }).click()
      await expectListLoaded(l.page)
      expect((await listTexts(l.page, 'Khách hàng đang hoạt động')).filter((n: string) => n === 'Dạ Thảo')).toHaveLength(1)
    })
  })
})
