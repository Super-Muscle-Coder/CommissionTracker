// Automated run of the walkthrough of the page commission_list
// (src/screens/pages/commission_list/walkthrough.yaml, iWCA I6.3) on the real
// app. S1 on an empty database; S2 → S4 in one launch with the D2 sample
// (clients and commissions of its own, never the D1 sample). Screenshots and
// the run record: <evidence>/walkthroughs/commission_list/ (UI-8: UI/evidence
// when CT_WALKTHROUGH_RUNNER names the runner).
import { expect, test } from '@playwright/test'
import { D2_EXPECTED_LIST, seedCommissionSample } from '../tools/walkthrough_lib.mjs'
import { close, commissionRows, goToCommissions, launch, reloadCommissions, setBackend, walkthroughRecorder, type Launched } from './walkthrough_harness.js'

const PAGE = 'commission_list'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/commission_list_walkthrough.spec.ts')

// [label, aria-current] of the items of the navigation region.
async function navItems(l: Launched): Promise<[string, string | null][]> {
  const items = await l.page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button').all()
  return Promise.all(items.map(async (b) => [await b.innerText(), await b.getAttribute('aria-current')] as [string, string | null]))
}

test.describe.serial('walkthrough commission_list', () => {
  test.beforeAll(() => rec.reset())
  test.afterAll(() => rec.write())

  test('S1 — empty database: "Đơn hàng" in the navigation, the empty state and its add button', async () => {
    const l = await launch({ seed: false })
    try {
      await rec.step(l.page, 'S1', ['ok'], async () => {
        await goToCommissions(l.page, 'empty')
        expect(await navItems(l)).toEqual([
          ['Khách hàng', null],
          ['Đơn hàng', 'page'],
          // From D3, "Tiến độ" after "Đơn hàng"; the places of the first two never change.
          ['Tiến độ', null],
          ['Thu nhập', null],
          ['Nhắc việc', null],
          ['Sao lưu', null],
          ['Khôi phục', null],
        ])
        const adds = l.page.getByRole('button', { name: 'Thêm đơn hàng' })
        await expect(adds).toHaveCount(2)
        await expect(l.page.getByRole('list', { name: 'Danh sách đơn hàng' })).toHaveCount(0)
        await rec.screenshot(l.page, `${PAGE}-S1-empty`)
        await adds.nth(1).click()
        await expect(l.page.getByRole('heading', { level: 2, name: 'Thêm đơn hàng' })).toBeVisible()
      })
    } finally {
      await close(l)
    }
  })

  test.describe.serial('with the D2 sample', () => {
    let l: Launched
    test.beforeAll(async () => {
      l = await launch({ seed: false })
      await seedCommissionSample(l.baseUrl)
    })
    test.afterAll(async () => {
      await close(l)
    })

    test('S2 — the commissions, most recently updated first, each with its secondary line', async () => {
      await rec.step(l.page, 'S2', ['ok'], async () => {
        await goToCommissions(l.page, 'list')
        // Deliberately checks the order ("most recently updated first"): the
        // sample's commissions are written more than a second apart
        // (seedCommissionSample, AFTER_LAST_WRITE_MS), since the backend writes
        // updated_at to the second (UI-9).
        expect(await commissionRows(l.page)).toEqual(D2_EXPECTED_LIST)
        expect((await navItems(l))[1]).toEqual(['Đơn hàng', 'page'])
      })
    })

    test('S3 — backend unreachable, then running again: reload succeeds', async () => {
      const before = await commissionRows(l.page)
      expect(before.length).toBeGreaterThan(0)
      await rec.step(l.page, 'S3', ['unreachable', 'ok'], async () => {
        setBackend('down')
        await reloadCommissions(l.page, 'unreachable')
        const alert = l.page.getByRole('alert')
        await expect(alert).toContainText('Không kết nối được')
        await expect(alert).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.')
        await rec.screenshot(l.page, `${PAGE}-S3-unreachable`)
        setBackend('up')
        await reloadCommissions(l.page, 'list')
        expect(await commissionRows(l.page)).toEqual(before)
      })
    })

    test('S4 — pressing a commission opens its detail', async () => {
      await rec.step(l.page, 'S4', ['ok'], async () => {
        await l.page.getByRole('list', { name: 'Danh sách đơn hàng' }).getByRole('button', { name: /^Chibi đôi/ }).click()
        await expect(l.page.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeVisible()
        await expect(l.page.getByRole('heading', { level: 3, name: 'Chibi đôi' })).toBeVisible()
        expect((await navItems(l))[1]).toEqual(['Đơn hàng', 'page'])
      })
    })
  })
})
