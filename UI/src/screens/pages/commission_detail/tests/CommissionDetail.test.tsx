// @vitest-environment jsdom
//
// Render tests of the page commission_detail (i5-screens.md, Step I5.4),
// with fake Routers: the first frame (UI-4); every ViewResult kind of its one
// operation loadCommissionDetail (get_commission + get_client): ok with every
// entry, ok without the optional entries, the client not found (get_client
// 404 is shown as ok by Services), an archived client; rejected 404 / 500 of
// either call, unreachable + retry, contract_violation. Reference links are
// text, never link elements. "Sửa", "Quay lại danh sách", the notice.
// From D3, the "Tiến độ" part (Routers of update_progress, its own hook): its
// first frame; every ViewResult kind of loadCommissionProgress (get_stage +
// get_stage_history: ok, rejected 404 / 500, unreachable + "Thử lại" of the
// part, contract_violation), each while the commission part stays shown;
// "Đổi giai đoạn" only once the part has loaded and the stage is not
// closed, never while it loads or after it failed; it opens stage_change
// with the id and the title; the notice "Đã đổi giai đoạn sang …".
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CommissionDetailView, ViewResult } from '../../../../logic/workflows/manage_commission/routers'
import type { CommissionProgressView } from '../../../../logic/workflows/update_progress/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeManageCommission, fakeUpdateProgress, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { CommissionDetail } from '../CommissionDetail'

type Loaded = ViewResult<CommissionDetailView>
type ProgressLoaded = ViewResult<CommissionProgressView>
const PROGRESS: CommissionProgressView = {
  stageText: 'Lên nét',
  updatedText: 'cập nhật lúc 08:05 28/09/2026',
  historyLines: ['Phác thảo → Lên nét · 08:05 28/09/2026 · Khách duyệt phác', 'Bắt đầu: Phác thảo · 10:00 27/09/2026'],
  noHistoryText: 'Chưa đổi giai đoạn lần nào',
  closed: false,
  closedText: null,
}
const PROGRESS_OK: ProgressLoaded = { kind: 'ok', view: PROGRESS }
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

function renderWith(results: Loaded[], notice: string | null = null, progress: ProgressLoaded[] = [PROGRESS_OK]) {
  const loadCommissionDetail = answers<[string], Loaded>(...results)
  const loadCommissionProgress = answers<[string], ProgressLoaded>(...progress)
  const navigate = vi.fn<Navigate>()
  const { container } = renderWithLogic(
    <CommissionDetail params={{ commission_id: ID }} navigate={navigate} notice={notice} />,
    fakeManageClient({}),
    fakeManageCommission({ loadCommissionDetail }),
    fakeUpdateProgress({ loadCommissionProgress }),
  )
  return { loadCommissionDetail, loadCommissionProgress, navigate, container }
}

// [term, details] of each entry of the "Tiến độ" part.
function progressEntries(): [string, string[]][] {
  const dl = screen.getByLabelText('Tiến độ đơn hàng')
  return [...dl.querySelectorAll(':scope > div')].map((d) => [d.querySelector('dt')?.textContent ?? '', [...d.querySelectorAll('dd')].map((x) => x.textContent ?? '')])
}
// The "Tiến độ" part (its region, named by its heading).
const progressPart = () => screen.getByRole('region', { name: 'Tiến độ' })
const buttonTexts = () => screen.getAllByRole('button').map((b) => b.textContent)

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
      fakeUpdateProgress({ loadCommissionProgress: answers<[string], ProgressLoaded>(PROGRESS_OK) }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải thông tin đơn hàng…'])
    expect(first.enabledButtons).toEqual([])
    await act(async () => load.release({ kind: 'ok', view: VIEW }))
    expect(await screen.findByRole('heading', { level: 3, name: VIEW.title })).toBeTruthy()
  })

  it('ok: Routers asked with the id; title; "Sửa" (main action), "Đổi giai đoạn", "Quay lại danh sách" under it; every entry in order', async () => {
    const { loadCommissionDetail, loadCommissionProgress } = renderWith([{ kind: 'ok', view: VIEW }])
    expect(await screen.findByRole('heading', { level: 3, name: 'Chân dung bán thân' })).toBeTruthy()
    await screen.findByRole('button', { name: 'Đổi giai đoạn' })
    expect(loadCommissionDetail).toHaveBeenCalledExactlyOnceWith(ID)
    expect(loadCommissionProgress).toHaveBeenCalledExactlyOnceWith(ID)
    expect(screen.getByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeTruthy()
    expect(buttonTexts()).toEqual(['Sửa', 'Đổi giai đoạn', 'Quay lại danh sách'])
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
    await screen.findByLabelText('Tiến độ đơn hàng')
    expect(screen.getByRole('status').textContent).toBe('Đã lưu thay đổi.')
  })

  it('the notice handed over by stage_change ("Đã đổi giai đoạn sang Lên nét.") is shown', async () => {
    renderWith([{ kind: 'ok', view: VIEW }], 'Đã đổi giai đoạn sang Lên nét.')
    await screen.findByLabelText('Tiến độ đơn hàng')
    expect(screen.getByRole('status').textContent).toBe('Đã đổi giai đoạn sang Lên nét.')
  })
})

describe('page commission_detail, part "Tiến độ" (D3)', () => {
  it('its first frame, the commission shown and the part still loading: its own loading status, no "Đổi giai đoạn"', async () => {
    const progress = pending<[string], ProgressLoaded>()
    renderWithLogic(
      <CommissionDetail params={{ commission_id: ID }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      fakeManageCommission({ loadCommissionDetail: answers<[string], Loaded>({ kind: 'ok', view: VIEW }) }),
      fakeUpdateProgress({ loadCommissionProgress: progress.fn }),
    )
    await screen.findByRole('heading', { level: 3, name: VIEW.title })
    expect(within(progressPart()).getByRole('status').textContent).toBe('Đang tải tiến độ…')
    expect(buttonTexts()).toEqual(['Sửa', 'Quay lại danh sách'])
    expect(progress.fn).toHaveBeenCalledExactlyOnceWith(ID)
    await act(async () => progress.release(PROGRESS_OK))
    expect(await screen.findByRole('button', { name: 'Đổi giai đoạn' })).toBeTruthy()
    expect(within(progressPart()).queryByRole('status')).toBeNull()
  })

  it('ok: "Giai đoạn hiện tại" (name, when) and "Lịch sử", newest first, below the commission entries', async () => {
    renderWith([{ kind: 'ok', view: VIEW }])
    await screen.findByLabelText('Tiến độ đơn hàng')
    expect(progressEntries()).toEqual([
      ['Giai đoạn hiện tại', ['Lên nét', 'cập nhật lúc 08:05 28/09/2026']],
      ['Lịch sử', ['Phác thảo → Lên nét · 08:05 28/09/2026 · Khách duyệt phác', 'Bắt đầu: Phác thảo · 10:00 27/09/2026']],
    ])
    // The part comes after the commission's entries.
    const info = screen.getByLabelText('Thông tin đơn hàng')
    expect(info.compareDocumentPosition(progressPart()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('never set: "chưa cập nhật lần nào", "Chưa đổi giai đoạn lần nào"; "Đổi giai đoạn" offered', async () => {
    renderWith([{ kind: 'ok', view: VIEW }], null, [
      { kind: 'ok', view: { ...PROGRESS, stageText: 'Chờ bắt đầu', updatedText: 'chưa cập nhật lần nào', historyLines: [] } },
    ])
    await screen.findByLabelText('Tiến độ đơn hàng')
    expect(progressEntries()).toEqual([
      ['Giai đoạn hiện tại', ['Chờ bắt đầu', 'chưa cập nhật lần nào']],
      ['Lịch sử', ['Chưa đổi giai đoạn lần nào']],
    ])
    expect(screen.getByRole('button', { name: 'Đổi giai đoạn' })).toBeTruthy()
  })

  it('a closed stage: no "Đổi giai đoạn"; the part says the commission cannot change stage any more', async () => {
    const closedText = 'Đơn đang ở giai đoạn "Đã giao", không đổi giai đoạn được nữa.'
    renderWith([{ kind: 'ok', view: VIEW }], null, [{ kind: 'ok', view: { ...PROGRESS, stageText: 'Đã giao', closed: true, closedText } }])
    await screen.findByLabelText('Tiến độ đơn hàng')
    expect(within(progressPart()).getByText(closedText)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Đổi giai đoạn' })).toBeNull()
    expect(buttonTexts()).toEqual(['Sửa', 'Quay lại danh sách'])
  })

  it('"Đổi giai đoạn" opens stage_change with the id and the title of the commission', async () => {
    const { navigate } = renderWith([{ kind: 'ok', view: VIEW }])
    fireEvent.click(await screen.findByRole('button', { name: 'Đổi giai đoạn' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'stage_change', params: { commission_id: ID, title: 'Chân dung bán thân' } }, null)
  })

  it.each([
    ['get_stage 404', { kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.', fieldErrors: {} }, 'Không tải được tiến độ', 'Không tìm thấy đơn hàng này.'],
    ['get_stage_history 500', { kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: 'Không đọc được dữ liệu tiến độ trên máy.', fieldErrors: {} }, 'Không tải được tiến độ', 'Không đọc được dữ liệu tiến độ trên máy.'],
    ['unreachable', { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, 'Không kết nối được', 'Không kết nối được tới phần xử lý.'],
    ['contract_violation', { kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }, 'Có lỗi không mong đợi', 'Ứng dụng nhận được một phản hồi không mong đợi.'],
  ] as [string, ProgressLoaded, string, string][])(
    '%s → the error inside the part, its own "Thử lại"; the commission part stays; no "Đổi giai đoạn"',
    async (_, failed, title, message) => {
      renderWith([{ kind: 'ok', view: VIEW }], null, [failed])
      const alert = await within(await screen.findByRole('region', { name: 'Tiến độ' })).findByRole('alert')
      expect(alert.textContent).toContain(title)
      expect(alert.textContent).toContain(message)
      expect(within(progressPart()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Thử lại'])
      // The commission part is untouched.
      expect(screen.getByRole('heading', { level: 3, name: VIEW.title })).toBeTruthy()
      expect(screen.getByLabelText('Thông tin đơn hàng')).toBeTruthy()
      expect(screen.queryByLabelText('Tiến độ đơn hàng')).toBeNull()
      expect(buttonTexts()).toEqual(['Sửa', 'Quay lại danh sách', 'Thử lại'])
    },
  )

  it('"Thử lại" of the part loads the part again only; then "Đổi giai đoạn" is offered', async () => {
    const { loadCommissionDetail, loadCommissionProgress } = renderWith([{ kind: 'ok', view: VIEW }], null, [
      { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' },
      PROGRESS_OK,
    ])
    await within(await screen.findByRole('region', { name: 'Tiến độ' })).findByRole('alert')
    fireEvent.click(within(progressPart()).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByLabelText('Tiến độ đơn hàng')).toBeTruthy()
    expect(loadCommissionProgress).toHaveBeenCalledTimes(2)
    expect(loadCommissionProgress).toHaveBeenLastCalledWith(ID)
    expect(loadCommissionDetail).toHaveBeenCalledOnce()
    expect(buttonTexts()).toEqual(['Sửa', 'Đổi giai đoạn', 'Quay lại danh sách'])
  })

  it('the commission part failing does not show the part (nothing to place it under)', async () => {
    renderWith([rejected('ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.')])
    await screen.findByRole('alert')
    expect(screen.queryByRole('region', { name: 'Tiến độ' })).toBeNull()
  })
})
