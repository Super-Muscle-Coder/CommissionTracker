// @vitest-environment jsdom
//
// Render tests of the page commission_detail (i5-screens.md, Step I5.4),
// with fake Routers: the first frame (UI-4); every ViewResult kind of its one
// operation loadCommissionDetail (get_commission + get_client): ok with every
// entry, ok without the optional entries, the client not found (get_client
// 404 is shown as ok by Services), an archived client; rejected 404 / 500 of
// either call, unreachable + retry, contract_violation. Reference links are
// text, never link elements. "Sửa", "Quay lại danh sách", the notice.
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CommissionDetailView, ViewResult } from '../../../../logic/workflows/manage_commission/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeManageCommission, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { CommissionDetail } from '../CommissionDetail'

type Loaded = ViewResult<CommissionDetailView>
const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const VIEW: CommissionDetailView = {
  commissionId: ID,
  title: 'Chân dung bán thân',
  clientText: 'Nguyễn Thu Hà',
  commissionType: 'bán thân',
  priceText: '1.500.000 VND',
  deadlineText: '15/10/2026',
  description: 'Nền xanh, ánh sáng dịu',
  referenceLinks: ['https://example.com/ref-1', 'https://example.com/ref-2'],
  createdText: '10:00 27/09/2026',
  updatedText: '15:30 28/09/2026',
}
const rejected = (code: string, message: string): Loaded => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })

function renderWith(results: Loaded[], notice: string | null = null) {
  const loadCommissionDetail = answers<[string], Loaded>(...results)
  const navigate = vi.fn<Navigate>()
  const { container } = renderWithLogic(
    <CommissionDetail params={{ commission_id: ID }} navigate={navigate} notice={notice} />,
    fakeManageClient({}),
    fakeManageCommission({ loadCommissionDetail }),
  )
  return { loadCommissionDetail, navigate, container }
}

// [term, details] of each entry of the description list.
function entries(): [string, string[]][] {
  const dl = screen.getByLabelText('Thông tin đơn hàng')
  return [...dl.querySelectorAll(':scope > div')].map((d) => [d.querySelector('dt')?.textContent ?? '', [...d.querySelectorAll('dd')].map((x) => x.textContent ?? '')])
}

afterEach(() => {
  cleanup()
})

describe('page commission_detail', () => {
  it('first frame, before Routers answers: loading shown, no button can be pressed (UI-4)', async () => {
    const load = pending<[string], Loaded>()
    const first = renderFirstCommit(
      <CommissionDetail params={{ commission_id: ID }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      fakeManageCommission({ loadCommissionDetail: load.fn }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải thông tin đơn hàng…'])
    expect(first.enabledButtons).toEqual([])
    await act(async () => load.release({ kind: 'ok', view: VIEW }))
    expect(await screen.findByRole('heading', { level: 3, name: VIEW.title })).toBeTruthy()
  })

  it('ok: Routers asked with the id; title; "Sửa" (main action) then "Quay lại danh sách" under it; every entry in order', async () => {
    const { loadCommissionDetail } = renderWith([{ kind: 'ok', view: VIEW }])
    expect(await screen.findByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeTruthy()
    expect(loadCommissionDetail).toHaveBeenCalledExactlyOnceWith(ID)
    expect(screen.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeTruthy()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Sửa', 'Quay lại danh sách'])
    expect(entries()).toEqual([
      ['Khách hàng', ['Nguyễn Thu Hà']],
      ['Loại tranh', ['bán thân']],
      ['Giá thỏa thuận', ['1.500.000 VND']],
      ['Hạn giao', ['15/10/2026']],
      ['Mô tả', ['Nền xanh, ánh sáng dịu']],
      ['Liên kết tham khảo', ['https://example.com/ref-1', 'https://example.com/ref-2']],
      ['Ngày tạo', ['10:00 27/09/2026']],
      ['Sửa lần cuối', ['15:30 28/09/2026']],
    ])
  })

  it('reference links are plain text: no link element, nothing to open', async () => {
    const { container } = renderWith([{ kind: 'ok', view: VIEW }])
    await screen.findByText('https://example.com/ref-1')
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('https://example.com/ref-1').tagName).toBe('DD')
  })

  it('no type, no description, no link → those entries are not shown; "Không có hạn"', async () => {
    renderWith([{ kind: 'ok', view: { ...VIEW, commissionType: null, description: null, referenceLinks: [], deadlineText: 'Không có hạn' } }])
    await screen.findByRole('heading', { level: 3, name: VIEW.title })
    expect(entries().map(([t]) => t)).toEqual(['Khách hàng', 'Giá thỏa thuận', 'Hạn giao', 'Ngày tạo', 'Sửa lần cuối'])
    expect(entries()[2]).toEqual(['Hạn giao', ['Không có hạn']])
  })

  it('the client not found (get_client 404) or archived: shown as Services wrote it, no alert', async () => {
    renderWith([{ kind: 'ok', view: { ...VIEW, clientText: 'Không tìm thấy khách hàng' } }])
    await screen.findByRole('heading', { level: 3, name: VIEW.title })
    expect(entries()[0]).toEqual(['Khách hàng', ['Không tìm thấy khách hàng']])
    expect(screen.queryByRole('alert')).toBeNull()
    cleanup()
    renderWith([{ kind: 'ok', view: { ...VIEW, clientText: 'Hà (đã lưu trữ)' } }])
    await screen.findByRole('heading', { level: 3, name: VIEW.title })
    expect(entries()[0]).toEqual(['Khách hàng', ['Hà (đã lưu trữ)']])
  })

  it('"Sửa" opens commission_form in edit mode; "Quay lại danh sách" opens commission_list', async () => {
    const { navigate } = renderWith([{ kind: 'ok', view: VIEW }])
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
    expect(navigate).toHaveBeenLastCalledWith({ page: 'commission_form', params: { mode: 'edit', commission_id: ID } }, null)
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }))
    expect(navigate).toHaveBeenLastCalledWith({ page: 'commission_list', params: null }, null)
  })

  it.each([
    ['get_commission 404', 'ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.'],
    ['get_commission 500', 'ERR_STORAGE_IO', 'Không đọc được dữ liệu đơn hàng trên máy.'],
    ['get_client 500', 'ERR_STORAGE_IO', 'Không đọc được dữ liệu khách hàng trên máy.'],
  ])('rejected (%s) → "Không mở được đơn hàng", the message, and only the way back', async (_, code, message) => {
    const { navigate } = renderWith([rejected(code, message)])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không mở được đơn hàng')
    expect(alert.textContent).toContain(message)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Quay lại danh sách'])
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_list', params: null }, null)
  })

  it('unreachable → the message; "Thử lại" asks Routers again and shows the commission', async () => {
    const { loadCommissionDetail } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, { kind: 'ok', view: VIEW }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain('Không kết nối được tới phần xử lý.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { level: 3, name: VIEW.title })).toBeTruthy()
    expect(loadCommissionDetail).toHaveBeenCalledTimes(2)
    expect(loadCommissionDetail).toHaveBeenLastCalledWith(ID)
  })

  it('contract_violation → "Có lỗi không mong đợi", never the commission', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(alert.textContent).toContain('Ứng dụng nhận được một phản hồi không mong đợi.')
    expect(screen.queryByLabelText('Thông tin đơn hàng')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
  })

  it('the notice handed over by the form ("Đã lưu thay đổi.") is shown', async () => {
    renderWith([{ kind: 'ok', view: VIEW }], 'Đã lưu thay đổi.')
    await screen.findByRole('heading', { level: 3, name: VIEW.title })
    expect(screen.getByRole('status').textContent).toBe('Đã lưu thay đổi.')
  })
})
