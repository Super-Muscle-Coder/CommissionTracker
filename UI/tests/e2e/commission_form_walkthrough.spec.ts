// Automated run of the walkthrough of the page commission_form
// (src/screens/pages/commission_form/walkthrough.yaml, iWCA I6.3) on the real
// app, with the D2 sample. Steps S1 → S7 follow each other in one app launch,
// as the walkthrough's precondition says. Screenshots and the run record:
// <evidence>/walkthroughs/commission_form/ (runner from CT_WALKTHROUGH_RUNNER).
import { expect, test, type Locator } from '@playwright/test'
import { seedCommissionSample } from '../tools/walkthrough_lib.mjs'
import {
  close,
  commissionEntries,
  commissionRows,
  goToCommissions,
  goToList,
  launch,
  openCommission,
  setBackend,
  walkthroughRecorder,
  type Launched,
} from './walkthrough_harness.js'

const PAGE = 'commission_form'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/commission_form_walkthrough.spec.ts')
const INPUT_SUMMARY = 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.'
const LINKS = 'Liên kết tham khảo (mỗi dòng một liên kết)'

let l: Launched

const field = (label: string) => l.page.getByLabel(label, { exact: true })
const press = (name: string) => l.page.getByRole('button', { name, exact: true }).click()
// Type into a field with suggestions, then close the suggestion list (Escape),
// as a user would: an open native suggestion popup blocks Electron screenshots (kit-EXP-008).
async function fillSuggested(label: string, value: string): Promise<void> {
  await field(label).fill(value)
  await field(label).press('Escape')
}
// The error message tied to a field (aria-describedby).
async function errorOf(label: string): Promise<string | null> {
  const id = await field(label).getAttribute('aria-describedby')
  return id === null ? null : l.page.locator(`[id="${id}"]`).innerText()
}
// The button row ("Lưu" first, then "Hủy") is right under the page title,
// above the first field, on the real screen (§7.2, principle 7).
async function expectButtonRowFirst(): Promise<void> {
  const top = async (loc: Locator) => (await loc.boundingBox())?.y ?? Number.NaN
  const title = await top(l.page.getByRole('heading', { level: 2 }))
  const save = await top(l.page.getByRole('button', { name: 'Lưu', exact: true }))
  const cancel = await top(l.page.getByRole('button', { name: 'Hủy', exact: true }))
  const client = await top(field('Khách hàng'))
  expect(title).toBeLessThan(save)
  expect(save).toBe(cancel)
  expect(save).toBeLessThan(client)
}
// A native control follows the dark theme: color-scheme dark (Chromium then
// draws its popups — option list, date picker — dark too), the field's dark
// background, light text.
async function expectDarkControl(id: string): Promise<void> {
  // An expression run in the page (this file has no DOM types, as main_layout.spec.ts).
  const style: unknown = await l.page.evaluate(
    `(() => { const s = getComputedStyle(document.getElementById(${JSON.stringify(id)})); return { scheme: s.colorScheme, background: s.backgroundColor, color: s.color } })()`,
  )
  expect(style).toEqual({ scheme: 'dark', background: 'rgb(45, 45, 45)', color: 'rgb(230, 230, 230)' })
}

test.describe.serial('walkthrough commission_form', () => {
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

  test('S1 — create with every optional field and a USD amount with decimals: saved, then the detail', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await press('Thêm đơn hàng')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm đơn hàng' })).toBeVisible()
      await expect(field('Khách hàng').locator('option')).toHaveText(['Chọn khách hàng', 'Mai Anh', 'Quốc Bảo'])
      await expectButtonRowFirst()
      await expect(field('Đơn vị tiền')).toHaveValue('VND')
      await expect(field('Đơn vị tiền').locator('option')).toHaveText(['VND', 'USD'])
      const listId = await field('Loại tranh').getAttribute('list')
      const options = await l.page.locator(`datalist[id="${listId}"] option`).all()
      expect(await Promise.all(options.map((o) => o.getAttribute('value')))).toEqual([
        'bán thân',
        'toàn thân',
        'chibi',
        'chân dung',
        'minh họa',
      ])
      await field('Khách hàng').selectOption({ label: 'Quốc Bảo' })
      await field('Tiêu đề').fill('Tranh nhóm ba người')
      await fillSuggested('Loại tranh', 'toàn thân')
      await field('Giá thỏa thuận').fill('45,5')
      await field('Đơn vị tiền').selectOption('USD')
      await field('Hạn giao').fill('2026-11-30')
      await expect(l.page.getByRole('button', { name: 'Xóa hạn giao' })).toBeVisible()
      await field('Mô tả').fill('Ba nhân vật, nền đơn giản.')
      await field(LINKS).fill('https://example.com/x\n\nhttps://example.com/y')
      // The native select and date field follow the dark theme (plan item 4).
      await expectDarkControl('commission-client')
      await expectDarkControl('commission-currency')
      await expectDarkControl('commission-deadline')
      await rec.screenshot(l.page, `${PAGE}-S1-filled`)
      await press('Lưu')
      await expect(l.page.getByRole('heading', { level: 3, name: 'Tranh nhóm ba người' })).toBeVisible()
      await expect(l.page.getByRole('status')).toHaveText('Đã thêm đơn hàng.')
      expect((await commissionEntries(l.page)).slice(0, 6)).toEqual([
        ['Khách hàng', ['Quốc Bảo']],
        ['Loại tranh', ['toàn thân']],
        ['Giá thỏa thuận', ['45,50 USD']],
        ['Hạn giao', ['30/11/2026']],
        ['Mô tả', ['Ba nhân vật, nền đơn giản.']],
        ['Liên kết tham khảo', ['https://example.com/x', 'https://example.com/y']],
      ])
    })
  })

  test('S2 — create, rejected input: a title of spaces, an amount written wrong; nothing created', async () => {
    await goToCommissions(l.page, 'list')
    const before = await commissionRows(l.page)
    // The comparison after "Hủy" must not pass on an empty list (UI-4).
    expect(before.length).toBe(4)
    // Found by its title, not by its place: this step checks nothing about
    // the order of the list (commission_list S2 does), UI-9.
    expect(before.filter(([title]) => title === 'Tranh nhóm ba người')).toHaveLength(1)
    await rec.step(l.page, 'S2', ['rejected_input'], async () => {
      await press('Thêm đơn hàng')
      await field('Khách hàng').selectOption({ label: 'Mai Anh' })
      await field('Tiêu đề').fill('   ')
      await field('Giá thỏa thuận').fill('1,5')
      await field('Mô tả').fill('giữ nguyên')
      await press('Lưu')
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Chưa lưu được')
      await expect(alert).toContainText(INPUT_SUMMARY)
      expect(await errorOf('Tiêu đề')).toBe('Nhập tiêu đề đơn hàng.')
      expect(await errorOf('Giá thỏa thuận')).toBe('Số tiền không hợp lệ.')
      expect(await errorOf('Khách hàng')).toBeNull()
      // The text cursor is in the first field in error.
      await expect(field('Tiêu đề')).toBeFocused()
      await expect(field('Khách hàng')).toHaveValue(/.+/)
      expect(await field('Khách hàng').locator('option:checked').innerText()).toBe('Mai Anh')
      await expect(field('Giá thỏa thuận')).toHaveValue('1,5')
      await expect(field('Mô tả')).toHaveValue('giữ nguyên')
      await rec.screenshot(l.page, `${PAGE}-S2-errors`)
      await press('Hủy')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Đơn hàng' })).toBeVisible()
      await expect(l.page.getByRole('list', { name: 'Danh sách đơn hàng' }).getByRole('listitem').first()).toBeVisible()
      expect(await commissionRows(l.page)).toEqual(before)
    })
  })

  test('S3 — edit: the currency fixed, the deadline cleared, a new amount: saved', async () => {
    await goToCommissions(l.page, 'list')
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await openCommission(l.page, 'Chân dung bán thân')
      await press('Sửa')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Sửa đơn hàng' })).toBeVisible()
      await expect(field('Tiêu đề')).toHaveValue('Chân dung bán thân')
      expect(await field('Khách hàng').locator('option:checked').innerText()).toBe('Mai Anh')
      await expect(field('Giá thỏa thuận')).toHaveValue('1.500.000')
      await expect(field('Đơn vị tiền')).toBeDisabled()
      await expect(field('Đơn vị tiền')).toHaveValue('VND')
      await expect(field('Hạn giao')).toHaveValue('2026-10-15')
      await expectButtonRowFirst()
      await field('Giá thỏa thuận').fill('2.000.000')
      await press('Xóa hạn giao')
      await expect(field('Hạn giao')).toHaveValue('')
      await expect(l.page.getByRole('button', { name: 'Xóa hạn giao' })).toHaveCount(0)
      await press('Lưu')
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeVisible()
      await expect(l.page.getByRole('status')).toHaveText('Đã lưu thay đổi.')
      expect((await commissionEntries(l.page)).slice(2, 4)).toEqual([
        ['Giá thỏa thuận', ['2.000.000 VND']],
        ['Hạn giao', ['Không có hạn']],
      ])
    })
  })

  test('S4 — edit, rejected input: an amount of letters; nothing saved', async () => {
    await rec.step(l.page, 'S4', ['rejected_input'], async () => {
      await press('Sửa')
      await expect(field('Giá thỏa thuận')).toHaveValue('2.000.000')
      await field('Giá thỏa thuận').fill('hai triệu')
      await press('Lưu')
      await expect(l.page.getByRole('alert')).toContainText('Chưa lưu được')
      expect(await errorOf('Giá thỏa thuận')).toBe('Số tiền không hợp lệ.')
      await expect(field('Giá thỏa thuận')).toBeFocused()
      await expect(field('Giá thỏa thuận')).toHaveValue('hai triệu')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Sửa đơn hàng' })).toBeVisible()
      await rec.screenshot(l.page, `${PAGE}-S4-errors`)
      await press('Hủy')
      await expect(l.page.getByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeVisible()
      expect((await commissionEntries(l.page))[2]).toEqual(['Giá thỏa thuận', ['2.000.000 VND']])
    })
  })

  test('S5 — edit a commission of an archived client: the client is kept', async () => {
    await goToCommissions(l.page, 'list')
    await rec.step(l.page, 'S5', ['ok'], async () => {
      await openCommission(l.page, 'Minh họa bìa sách')
      await press('Sửa')
      await expect(field('Tiêu đề')).toHaveValue('Minh họa bìa sách')
      expect(await field('Khách hàng').locator('option:checked').innerText()).toBe('Lan Chi (đã lưu trữ)')
      await field('Tiêu đề').fill('Minh họa bìa sách (bản 2)')
      await press('Lưu')
      await expect(l.page.getByRole('heading', { level: 3, name: 'Minh họa bìa sách (bản 2)' })).toBeVisible()
      await expect(l.page.getByRole('status')).toHaveText('Đã lưu thay đổi.')
      expect((await commissionEntries(l.page))[0]).toEqual(['Khách hàng', ['Lan Chi (đã lưu trữ)']])
    })
  })

  test('S6 — create while the backend is down: the draft stays; saved once it runs again', async () => {
    await goToCommissions(l.page, 'list')
    await press('Thêm đơn hàng')
    await field('Khách hàng').selectOption({ label: 'Mai Anh' })
    await field('Tiêu đề').fill('Phác thảo nhân vật')
    await field('Giá thỏa thuận').fill('300.000')
    await rec.step(l.page, 'S6', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await press('Lưu')
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Không kết nối được', { timeout: 30_000 })
      await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm đơn hàng' })).toBeVisible()
      expect(await field('Khách hàng').locator('option:checked').innerText()).toBe('Mai Anh')
      await expect(field('Tiêu đề')).toHaveValue('Phác thảo nhân vật')
      await expect(field('Giá thỏa thuận')).toHaveValue('300.000')
      await expect(l.page.getByRole('button', { name: 'Lưu', exact: true })).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S6-unreachable`)
      setBackend('up')
      await press('Lưu')
      await expect(l.page.getByRole('heading', { level: 3, name: 'Phác thảo nhân vật' })).toBeVisible({ timeout: 30_000 })
      await expect(l.page.getByRole('status')).toHaveText('Đã thêm đơn hàng.')
      await rec.screenshot(l.page, `${PAGE}-S6-saved`)
      await press('Quay lại danh sách')
      await expect(l.page.getByRole('list', { name: 'Danh sách đơn hàng' }).getByRole('listitem').first()).toBeVisible()
      await expect(l.page.getByRole('status')).toHaveCount(0)
      expect((await commissionRows(l.page)).filter(([title]) => title === 'Phác thảo nhân vật')).toHaveLength(1)
    })
  })

  test('S7 — no active client: the empty state instead of the form, and "Thêm khách hàng"', async () => {
    // Setup, on the pages of D1: archive the two active clients of the D2 sample.
    for (const name of ['Mai Anh', 'Quốc Bảo']) {
      await goToList(l.page)
      await l.page.getByRole('button', { name, exact: true }).click()
      await expect(l.page.getByRole('heading', { level: 3, name })).toBeVisible()
      await press('Lưu trữ khách hàng')
      await expect(l.page.getByRole('status')).toContainText('Đã lưu trữ.')
    }
    await goToCommissions(l.page, 'list')
    await rec.step(l.page, 'S7', ['ok'], async () => {
      await press('Thêm đơn hàng')
      await expect(l.page.getByText('Chưa có khách hàng đang hoạt động. Thêm khách hàng trước khi tạo đơn.')).toBeVisible()
      await expect(field('Tiêu đề')).toHaveCount(0)
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Hủy', 'Thêm khách hàng'])
      await rec.screenshot(l.page, `${PAGE}-S7-empty`)
      await press('Thêm khách hàng')
      await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm khách hàng' })).toBeVisible()
      await expect(field('Tên hiển thị')).toHaveValue('')
    })
  })
})
