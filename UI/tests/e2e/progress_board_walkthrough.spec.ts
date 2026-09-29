// Automated run of the walkthrough of the page progress_board
// (src/screens/pages/progress_board/walkthrough.yaml, iWCA I6.3) on the real
// app. S1 on an empty database; S2 → S4 in one launch with the D3 sample.
// Screenshots and the run record: <evidence>/walkthroughs/progress_board/
// (UI-8: UI/evidence when CT_WALKTHROUGH_RUNNER names the runner).
import { expect, test } from '@playwright/test'
import { D3_EXPECTED_BOARD, seedProgressSample } from '../tools/walkthrough_lib.mjs'
import { boardGroups, close, goToBoard, launch, reloadBoard, setBackend, walkthroughRecorder, type Launched } from './walkthrough_harness.js'

const PAGE = 'progress_board'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/progress_board_walkthrough.spec.ts')

// [label, aria-current] of the items of the navigation region.
async function navItems(l: Launched): Promise<[string, string | null][]> {
  const items = await l.page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button').all()
  return Promise.all(items.map(async (b) => [await b.innerText(), await b.getAttribute('aria-current')] as [string, string | null]))
}

test.describe.serial('walkthrough progress_board', () => {
  test.beforeAll(() => rec.reset())
  test.afterAll(() => rec.write())

  test('S1 — empty database: "Tiến độ" in the navigation, only "Tải lại", the empty state and its add button', async () => {
    const l = await launch({ seed: false })
    try {
      await rec.step(l.page, 'S1', ['ok'], async () => {
        await goToBoard(l.page, 'empty')
        expect(await navItems(l)).toEqual([
          ['Khách hàng', null],
          ['Đơn hàng', null],
          ['Tiến độ', 'page'],
        ])
        expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Tải lại', 'Thêm đơn hàng'])
        await rec.screenshot(l.page, `${PAGE}-S1-empty`)
        await l.page.getByRole('button', { name: 'Thêm đơn hàng' }).click()
        await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm đơn hàng' })).toBeVisible()
      })
    } finally {
      await close(l)
    }
  })

  test.describe.serial('with the D3 sample', () => {
    let l: Launched
    test.beforeAll(async () => {
      l = await launch({ seed: false })
      await seedProgressSample(l.baseUrl)
    })
    test.afterAll(async () => {
      await close(l)
    })

    test('S2 — groups in the order of the catalog, no empty group; in a group the earliest deadline first', async () => {
      await rec.step(l.page, 'S2', ['ok'], async () => {
        await goToBoard(l.page, 'board')
        // The order inside "Lên nét" is by deadline (01/10 before 15/10), never by time of writing.
        expect(await boardGroups(l.page)).toEqual(D3_EXPECTED_BOARD)
        await expect(l.page.getByRole('button', { name: 'Đổi giai đoạn' })).toHaveCount(0)
        expect((await navItems(l))[2]).toEqual(['Tiến độ', 'page'])
      })
    })

    test('S3 — pressing a commission opens its detail; "Đơn hàng" is current', async () => {
      await rec.step(l.page, 'S3', ['ok'], async () => {
        await l.page.getByRole('list', { name: 'Lên nét (2)' }).getByRole('button', { name: /^Chân dung bán thân/ }).click()
        await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeVisible()
        await expect(l.page.getByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeVisible()
        expect(await navItems(l)).toEqual([
          ['Khách hàng', null],
          ['Đơn hàng', 'page'],
          ['Tiến độ', null],
        ])
      })
    })

    test('S4 — backend unreachable, then running again: reload succeeds', async () => {
      await goToBoard(l.page, 'board')
      const before = await boardGroups(l.page)
      expect(before.length).toBeGreaterThan(0)
      await rec.step(l.page, 'S4', ['unreachable', 'ok'], async () => {
        setBackend('down')
        await reloadBoard(l.page, 'unreachable')
        const alert = l.page.getByRole('alert')
        await expect(alert).toContainText('Không kết nối được')
        await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
        await rec.screenshot(l.page, `${PAGE}-S4-unreachable`)
        setBackend('up')
        await reloadBoard(l.page, 'board')
        expect(await boardGroups(l.page)).toEqual(before)
      })
    })
  })
})
