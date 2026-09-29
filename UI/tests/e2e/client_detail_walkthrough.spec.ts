// Automated run of the walkthrough of the page client_detail
// (src/screens/pages/client_detail/walkthrough.yaml, iWCA I6.3) on the real
// app. Steps S1 → S6 follow each other in one app launch, as the
// walkthrough's precondition says. Screenshots and the run record:
// UI/evidence/walkthroughs/client_detail/ (runner from CT_WALKTHROUGH_RUNNER).
import { expect, test } from '@playwright/test'
import { SAMPLE_DETAILED } from '../tools/walkthrough_lib.mjs'
import { close, detailEntries, launch, listTexts, reloadList, setBackend, walkthroughRecorder, type Launched } from './walkthrough_harness.js'

const PAGE = 'client_detail'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/client_detail_walkthrough.spec.ts')
const NAME = SAMPLE_DETAILED.display_name
const ARCHIVED_MSG = 'Đã lưu trữ. Khách này sẽ không có trong danh sách chọn khi tạo đơn mới; đơn cũ không bị ảnh hưởng.'
const UNARCHIVED_MSG = 'Đã bỏ lưu trữ. Khách này lại có trong danh sách chọn khi tạo đơn mới.'
// Vietnamese date and time: day/month/year and hour:minute.
const DATE_TIME = /^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$|^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/

let l: Launched

test.describe.serial('walkthrough client_detail', () => {
  test.beforeAll(async () => {
    rec.reset()
    l = await launch({ seed: true })
    await reloadList(l.page, 'list')
  })
  test.afterAll(async () => {
    rec.write()
    await close(l)
  })

  test('S1 — the detail of a client with contacts and a note', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await l.page.getByRole('button', { name: NAME }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết khách hàng' })).toBeVisible()
      await expect(l.page.getByRole('heading', { level: 3, name: NAME })).toBeVisible()
      const entries = await detailEntries(l.page)
      expect(entries.slice(0, 3)).toEqual([
        ['Trạng thái', ['Đang hoạt động']],
        ['Liên hệ', ['facebook: fb.com/thuha.art', 'email: thuha@example.com']],
        ['Ghi chú', ['Thích tông màu ấm. Giao file PSD.']],
      ])
      expect(entries[3][0]).toBe('Ngày tạo')
      expect(entries[3][1][0]).toMatch(DATE_TIME)
      expect(entries[4][0]).toBe('Sửa lần cuối')
      expect(entries[4][1][0]).toMatch(DATE_TIME)
      for (const name of ['Sửa', 'Lưu trữ khách hàng', 'Quay lại danh sách']) {
        await expect(l.page.getByRole('button', { name })).toBeEnabled()
      }
      await expect(l.page.getByRole('alert')).toHaveCount(0)
    })
  })

  test('S2 — archive: no confirmation, the message says what it changes', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      await l.page.getByRole('button', { name: 'Lưu trữ khách hàng' }).click()
      await expect(l.page.getByRole('status').filter({ hasText: ARCHIVED_MSG })).toHaveCount(1)
      await expect(l.page.getByRole('button', { name: 'Bỏ lưu trữ' })).toBeEnabled()
      expect((await detailEntries(l.page))[0]).toEqual(['Trạng thái', ['Đã lưu trữ']])
    })
  })

  test('S3 — unarchive', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await l.page.getByRole('button', { name: 'Bỏ lưu trữ' }).click()
      await expect(l.page.getByRole('status').filter({ hasText: UNARCHIVED_MSG })).toHaveCount(1)
      await expect(l.page.getByRole('button', { name: 'Lưu trữ khách hàng' })).toBeEnabled()
      expect((await detailEntries(l.page))[0]).toEqual(['Trạng thái', ['Đang hoạt động']])
    })
  })

  test('S4 — archive while the backend is down, then again when it runs', async () => {
    await rec.step(l.page, 'S4', ['unreachable', 'ok'], async () => {
      setBackend('down')
      await l.page.getByRole('button', { name: 'Lưu trữ khách hàng' }).click()
      const alert = l.page.getByRole('alert')
      await expect(alert).toContainText('Không kết nối được')
      await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
      expect((await detailEntries(l.page))[0]).toEqual(['Trạng thái', ['Đang hoạt động']])
      await expect(l.page.getByRole('button', { name: 'Lưu trữ khách hàng' })).toBeEnabled()
      await rec.screenshot(l.page, `${PAGE}-S4-unreachable`)
      setBackend('up')
      await l.page.getByRole('button', { name: 'Lưu trữ khách hàng' }).click()
      await expect(l.page.getByRole('status').filter({ hasText: ARCHIVED_MSG })).toHaveCount(1)
      await expect(l.page.getByRole('alert')).toHaveCount(0)
      expect((await detailEntries(l.page))[0]).toEqual(['Trạng thái', ['Đã lưu trữ']])
    })
  })

  test('S5 — back to the list: the client is now in the archived group', async () => {
    await rec.step(l.page, 'S5', ['ok'], async () => {
      await l.page.getByRole('button', { name: 'Quay lại danh sách' }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Khách hàng' })).toBeVisible()
      await expect(l.page.getByRole('heading', { level: 3, name: 'Đã lưu trữ' })).toBeVisible()
      expect(await listTexts(l.page, 'Khách hàng đã lưu trữ')).toEqual(['Hà', NAME])
      expect(await listTexts(l.page, 'Khách hàng đang hoạt động')).not.toContain(NAME)
    })
  })

  test('S6 — "Sửa" opens the form filled with the stored client', async () => {
    await l.page.getByRole('button', { name: NAME }).click()
    await expect(l.page.getByRole('heading', { level: 3, name: NAME })).toBeVisible()
    await rec.step(l.page, 'S6', ['ok'], async () => {
      await l.page.getByRole('button', { name: 'Sửa' }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Sửa khách hàng' })).toBeVisible()
      await expect(l.page.getByLabel('Tên hiển thị')).toHaveValue(NAME)
      await expect(l.page.getByLabel('Kênh 1')).toHaveValue('facebook')
      await expect(l.page.getByLabel('Giá trị 1')).toHaveValue('fb.com/thuha.art')
      await expect(l.page.getByLabel('Kênh 2')).toHaveValue('email')
      await expect(l.page.getByLabel('Giá trị 2')).toHaveValue('thuha@example.com')
      await expect(l.page.getByLabel('Ghi chú')).toHaveValue('Thích tông màu ấm. Giao file PSD.')
    })
  })
})
