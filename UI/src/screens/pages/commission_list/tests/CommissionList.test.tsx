// @vitest-environment jsdom
//
// Render tests of the page commission_list (i5-screens.md, Step I5.4), with
// fake Routers: the first frame (UI-4); every ViewResult kind of its one
// operation loadCommissionList (list_commissions + list_clients): ok with
// rows (title, and the secondary line), ok empty with its add button,
// rejected 500 of either call, unreachable + reload, contract_violation;
// "Thêm đơn hàng" and pressing a commission navigate; the notice.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CommissionListView, ViewResult } from '../../../../logic/workflows/manage_commission/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeManageCommission, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { CommissionList } from '../CommissionList'

type Listed = ViewResult<CommissionListView>
const A = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const B = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const LIST: Listed = {
  kind: 'ok',
  view: {
    isEmpty: false,
    rows: [
      { commissionId: A, title: 'Chân dung bán thân', detailText: 'An · 1.500.000 VND · Hạn giao 15/10/2026' },
      { commissionId: B, title: 'Chibi đôi', detailText: 'Không tìm thấy khách hàng · 12,50 USD · Không có hạn' },
    ],
  },
}
const rejected = (code: string, message: string): Listed => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })

function renderWith(results: Listed[], notice: string | null = null) {
  const loadCommissionList = answers<[], Listed>(...results)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(<CommissionList params={null} navigate={navigate} notice={notice} />, fakeManageClient({}), fakeManageCommission({ loadCommissionList }))
  return { loadCommissionList, navigate }
}
const rowTexts = () => within(screen.getByRole('list', { name: 'Danh sách đơn hàng' })).getAllByRole('listitem').map((li) => li.textContent)

afterEach(() => {
  cleanup()
})

describe('page commission_list', () => {
  it('first frame, before Routers answers: loading shown, only "Thêm đơn hàng" can be pressed (UI-4)', async () => {
    const load = pending<[], Listed>()
    const first = renderFirstCommit(<CommissionList params={null} navigate={vi.fn()} notice={null} />, fakeManageClient({}), fakeManageCommission({ loadCommissionList: load.fn }))
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải danh sách đơn hàng…'])
    expect(first.enabledButtons).toEqual(['Thêm đơn hàng'])
    await act(async () => load.release(LIST))
    expect(await screen.findByRole('list', { name: 'Danh sách đơn hàng' })).toBeTruthy()
  })

  it('title "Đơn hàng"; the button row right under it: "Thêm đơn hàng" (main action) first, then "Tải lại"', async () => {
    renderWith([LIST])
    await screen.findByRole('list', { name: 'Danh sách đơn hàng' })
    const heading = screen.getByRole('heading', { level: 2, name: 'Đơn hàng' })
    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    expect(buttons.slice(0, 2)).toEqual(['Thêm đơn hàng', 'Tải lại'])
    expect(heading.compareDocumentPosition(screen.getByRole('button', { name: 'Thêm đơn hàng' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thêm đơn hàng' }).className).not.toBe(screen.getByRole('button', { name: 'Tải lại' }).className)
  })

  it('ok: each commission is its title and one secondary line (client, price, deadline), in the order given', async () => {
    renderWith([LIST])
    await screen.findByRole('list', { name: 'Danh sách đơn hàng' })
    expect(rowTexts()).toEqual([
      'Chân dung bán thân An · 1.500.000 VND · Hạn giao 15/10/2026',
      'Chibi đôi Không tìm thấy khách hàng · 12,50 USD · Không có hạn',
    ])
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('pressing a commission opens commission_detail with its id', async () => {
    const { navigate } = renderWith([LIST])
    fireEvent.click(await screen.findByRole('button', { name: /^Chibi đôi/ }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: B } }, null)
  })

  it('"Thêm đơn hàng" opens commission_form in create mode', async () => {
    const { navigate } = renderWith([LIST])
    await screen.findByRole('list', { name: 'Danh sách đơn hàng' })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm đơn hàng' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_form', params: { mode: 'create' } }, null)
  })

  it('ok with no commission: "Chưa có đơn hàng nào." and an add button that opens the form — not an error', async () => {
    const { navigate } = renderWith([{ kind: 'ok', view: { rows: [], isEmpty: true } }])
    expect(await screen.findByText('Chưa có đơn hàng nào.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    const adds = screen.getAllByRole('button', { name: 'Thêm đơn hàng' })
    expect(adds).toHaveLength(2)
    fireEvent.click(adds[1])
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_form', params: { mode: 'create' } }, null)
  })

  it.each([
    ['list_commissions 500', 'Không đọc được dữ liệu đơn hàng trên máy.'],
    ['list_clients 500', 'Không đọc được danh sách khách hàng trên máy.'],
  ])('rejected (%s) → "Không tải được danh sách đơn hàng" and the message, no list', async (_, message) => {
    renderWith([rejected('ERR_STORAGE_IO', message)])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không tải được danh sách đơn hàng')
    expect(alert.textContent).toContain(message)
    expect(screen.queryByRole('list', { name: 'Danh sách đơn hàng' })).toBeNull()
  })

  it('unreachable → "Không kết nối được" and the message; "Tải lại" asks Routers again and shows the list', async () => {
    const { loadCommissionList } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, LIST])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain('Không kết nối được tới phần xử lý.')
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(await screen.findByRole('list', { name: 'Danh sách đơn hàng' })).toBeTruthy()
    expect(loadCommissionList).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('contract_violation → "Có lỗi không mong đợi" and the message, never a list', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(alert.textContent).toContain('Ứng dụng nhận được một phản hồi không mong đợi.')
    expect(screen.queryByRole('list', { name: 'Danh sách đơn hàng' })).toBeNull()
  })

  it('while reloading: "Tải lại" is busy and a second press does not call Routers again', async () => {
    const reload = pending<[], Listed>()
    const loadCommissionList = vi.fn().mockResolvedValueOnce(LIST).mockImplementation(reload.fn)
    renderWithLogic(<CommissionList params={null} navigate={vi.fn()} notice={null} />, fakeManageClient({}), fakeManageCommission({ loadCommissionList }))
    await screen.findByRole('list', { name: 'Danh sách đơn hàng' })
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    const busy = await screen.findByRole('button', { name: 'Đang tải…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(busy)
    expect(loadCommissionList).toHaveBeenCalledTimes(2)
    await act(async () => reload.release(LIST))
  })

  it('a notice handed over by the previous page is shown', async () => {
    renderWith([LIST], 'Đã thêm đơn hàng.')
    expect((await screen.findByRole('status')).textContent).toBe('Đã thêm đơn hàng.')
  })
})
