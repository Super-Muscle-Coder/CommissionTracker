// @vitest-environment jsdom
//
// Render tests of the page progress_board (i5-screens.md, Step I5.4), with
// fake Routers: the first frame (UI-4); every ViewResult kind of its one
// operation loadProgressBoard (list_stages + get_board + list_commissions,
// ui_decomposition.md D3): ok with groups in the order Services gave, ok
// empty (the empty state and "Thêm đơn hàng"), rejected 500 of get_board or
// list_commissions, unreachable + "Tải lại", contract_violation. The button
// row holds only "Tải lại"; pressing a commission opens its detail. No stage
// change on this page.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProgressBoardView, ViewResult } from '../../../../logic/workflows/update_progress/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeManageCommission, fakeUpdateProgress, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { ProgressBoard } from '../ProgressBoard'

type Loaded = ViewResult<ProgressBoardView>
const A = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const B = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const C = '0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d'
const BOARD: ProgressBoardView = {
  groups: [
    {
      key: 'sketch',
      title: 'Phác thảo (2)',
      rows: [
        { commissionId: A, title: 'Chân dung bán thân', detailText: 'Hạn giao 15/10/2026' },
        { commissionId: B, title: 'Chibi đôi', detailText: 'Không có hạn' },
      ],
    },
    { key: 'delivered', title: 'Đã giao (1)', rows: [{ commissionId: C, title: 'Minh họa bìa sách', detailText: 'Hạn giao 01/01/2026' }] },
    { key: 'other:inking', title: 'Giai đoạn khác: inking (1)', rows: [{ commissionId: '00000000-0000-4000-8000-000000000001', title: 'Đơn lạ', detailText: 'Không có hạn' }] },
  ],
  isEmpty: false,
}
const rejected = (code: string, message: string): Loaded => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })

function renderWith(results: Loaded[]) {
  const loadProgressBoard = answers<[], Loaded>(...results)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(<ProgressBoard params={null} navigate={navigate} notice={null} />, fakeManageClient({}), fakeManageCommission({}), fakeUpdateProgress({ loadProgressBoard }))
  return { loadProgressBoard, navigate }
}

// [group heading, [row texts]] in the order shown.
function groups(): [string, string[]][] {
  return screen.getAllByRole('heading', { level: 3 }).map((h) => {
    const list = screen.getByRole('list', { name: h.textContent ?? '' })
    return [h.textContent ?? '', within(list).getAllByRole('button').map((b) => b.textContent ?? '')]
  })
}

afterEach(() => {
  cleanup()
})

describe('page progress_board', () => {
  it('first frame, before Routers answers: loading shown, no button can be pressed (UI-4)', async () => {
    const load = pending<[], Loaded>()
    const first = renderFirstCommit(<ProgressBoard params={null} navigate={vi.fn()} notice={null} />, fakeManageClient({}), fakeManageCommission({}), fakeUpdateProgress({ loadProgressBoard: load.fn }))
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải bảng tiến độ…'])
    expect(first.enabledButtons).toEqual([])
    await act(async () => load.release({ kind: 'ok', view: BOARD }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Phác thảo (2)' })).toBeTruthy()
  })

  it('ok: title "Tiến độ"; the button row holds only "Tải lại"; groups and their commissions in the order given', async () => {
    const { loadProgressBoard } = renderWith([{ kind: 'ok', view: BOARD }])
    expect(await screen.findByRole('heading', { level: 3, name: 'Phác thảo (2)' })).toBeTruthy()
    expect(loadProgressBoard).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { level: 2, name: 'Tiến độ' })).toBeTruthy()
    expect(groups()).toEqual([
      ['Phác thảo (2)', ['Chân dung bán thân Hạn giao 15/10/2026', 'Chibi đôi Không có hạn']],
      ['Đã giao (1)', ['Minh họa bìa sách Hạn giao 01/01/2026']],
      ['Giai đoạn khác: inking (1)', ['Đơn lạ Không có hạn']],
    ])
    // The only button outside the lists: "Tải lại" (no main action of its own; no stage change here).
    const outside = screen.getAllByRole('button').filter((b) => b.closest('ul') === null)
    expect(outside.map((b) => b.textContent)).toEqual(['Tải lại'])
    expect(screen.queryByRole('button', { name: 'Đổi giai đoạn' })).toBeNull()
  })

  it('pressing a commission opens its detail', async () => {
    const { navigate } = renderWith([{ kind: 'ok', view: BOARD }])
    fireEvent.click(await screen.findByRole('button', { name: /^Chibi đôi/ }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: B } }, null)
  })

  it('no commission at all → "Chưa có đơn hàng nào." and "Thêm đơn hàng" (opens commission_form create)', async () => {
    const { navigate } = renderWith([{ kind: 'ok', view: { groups: [], isEmpty: true } }])
    expect(await screen.findByText('Chưa có đơn hàng nào.')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm đơn hàng' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_form', params: { mode: 'create' } }, null)
  })

  it.each([
    ['get_board 500', 'Không đọc được dữ liệu tiến độ trên máy.'],
    ['list_commissions 500', 'Không đọc được dữ liệu đơn hàng trên máy.'],
  ])('rejected (%s) → "Không tải được bảng tiến độ" and the message; no list', async (_, message) => {
    renderWith([rejected('ERR_STORAGE_IO', message)])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không tải được bảng tiến độ')
    expect(alert.textContent).toContain(message)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('unreachable → the message; "Tải lại" asks Routers again and shows the board', async () => {
    const { loadProgressBoard } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, { kind: 'ok', view: BOARD }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain('Không kết nối được tới phần xử lý.')
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Phác thảo (2)' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(loadProgressBoard).toHaveBeenCalledTimes(2)
  })

  it('contract_violation → "Có lỗi không mong đợi", never a board', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(alert.textContent).toContain('Ứng dụng nhận được một phản hồi không mong đợi.')
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('while reloading, "Tải lại" is busy and cannot be pressed twice', async () => {
    const load = pending<[], Loaded>()
    renderWithLogic(<ProgressBoard params={null} navigate={vi.fn()} notice={null} />, fakeManageClient({}), fakeManageCommission({}), fakeUpdateProgress({ loadProgressBoard: load.fn }))
    const busy = screen.getByRole('button', { name: 'Đang tải…' }) as HTMLButtonElement
    expect(busy.disabled).toBe(true)
    fireEvent.click(busy)
    expect(load.fn).toHaveBeenCalledOnce()
    await act(async () => load.release({ kind: 'ok', view: BOARD }))
  })
})
