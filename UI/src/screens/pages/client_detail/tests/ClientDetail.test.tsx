// @vitest-environment jsdom
//
// Render tests of the page client_detail (i5-screens.md, Step I5.4), with
// fake Routers: every ViewResult kind of both operations —
// loadClientDetail (ok, rejected 404 / 500, unreachable + retry,
// contract_violation) and setClientArchived (ok archive / unarchive,
// rejected 400 / 404 / 500, unreachable + pressing again, contract_violation)
// — the busy archive button (no second call), the navigation actions, and
// the notice handed over by the previous page.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ArchivedClientView, ClientDetailView, ViewResult } from '../../../../logic/workflows/manage_client/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { ClientDetail } from '../ClientDetail'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
type Detail = ViewResult<ClientDetailView>
type Archived = ViewResult<ArchivedClientView>

const VIEW: ClientDetailView = {
  clientId: ID,
  name: 'Nguyễn Thu Hà',
  isArchived: false,
  statusText: 'Đang hoạt động',
  contactLines: ['facebook: fb.com/thuha', 'email: ha@example.com'],
  note: 'Thích tông màu ấm',
  createdText: '27/09/2026, 10:00',
  updatedText: '28/09/2026, 15:30',
}
const ARCHIVED_VIEW: ClientDetailView = { ...VIEW, isArchived: true, statusText: 'Đã lưu trữ' }
const OK: Detail = { kind: 'ok', view: VIEW }
const ARCHIVE_MSG = 'Đã lưu trữ. Khách này sẽ không có trong danh sách chọn khi tạo đơn mới; đơn cũ không bị ảnh hưởng.'
const rejected = (code: string, message: string) => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} }) as const

function renderWith(details: Detail[], archives: Archived[] = [], notice: string | null = null) {
  const loadClientDetail = answers<[string], Detail>(...details)
  const setClientArchived = answers<[string, boolean], Archived>(...archives)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(<ClientDetail params={{ client_id: ID }} navigate={navigate} notice={notice} />, fakeManageClient({ loadClientDetail, setClientArchived }))
  return { loadClientDetail, setClientArchived, navigate }
}

// [term, [detail lines]] of each entry of the description list, in order.
const entries = () =>
  [...screen.getByLabelText('Thông tin khách hàng').children].map((entry) => [
    within(entry as HTMLElement).getByRole('term').textContent,
    within(entry as HTMLElement).getAllByRole('definition').map((dd) => dd.textContent),
  ])

afterEach(() => {
  cleanup()
})

describe('page client_detail — opening (loadClientDetail)', () => {
  it('first frame, before Routers answers: loading shown, no button can be pressed (UI-4)', async () => {
    const load = pending<[string], Detail>()
    const first = renderFirstCommit(
      <ClientDetail params={{ client_id: ID }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({ loadClientDetail: load.fn }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải thông tin khách hàng…'])
    expect(first.enabledButtons).toEqual([])
    expect(load.fn).toHaveBeenCalledExactlyOnceWith(ID)
    await act(async () => load.release(OK))
  })

  it('calls Routers once with the client id of its parameters; ok → name, status, contacts, note, dates', async () => {
    const { loadClientDetail } = renderWith([OK])
    expect(await screen.findByRole('heading', { level: 3, name: 'Nguyễn Thu Hà' })).toBeTruthy()
    expect(loadClientDetail).toHaveBeenCalledExactlyOnceWith(ID)
    expect(entries()).toEqual([
      ['Trạng thái', ['Đang hoạt động']],
      ['Liên hệ', ['facebook: fb.com/thuha', 'email: ha@example.com']],
      ['Ghi chú', ['Thích tông màu ấm']],
      ['Ngày tạo', ['27/09/2026, 10:00']],
      ['Sửa lần cuối', ['28/09/2026, 15:30']],
    ])
    expect(screen.getByRole('button', { name: 'Sửa' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lưu trữ khách hàng' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('no note and no contact → no "Ghi chú" and no "Liên hệ" entry', async () => {
    renderWith([{ kind: 'ok', view: { ...VIEW, note: null, contactLines: [] } }])
    await screen.findByRole('heading', { level: 3, name: 'Nguyễn Thu Hà' })
    expect(entries().map(([term]) => term)).toEqual(['Trạng thái', 'Ngày tạo', 'Sửa lần cuối'])
  })

  it('an archived client offers "Bỏ lưu trữ" instead', async () => {
    renderWith([{ kind: 'ok', view: ARCHIVED_VIEW }])
    expect(await screen.findByRole('button', { name: 'Bỏ lưu trữ' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lưu trữ khách hàng' })).toBeNull()
  })

  it('rejected 404 → "Không tìm thấy khách hàng này." with the way back to the list', async () => {
    const { navigate } = renderWith([rejected('ERR_NOT_FOUND', 'Không tìm thấy khách hàng này.')])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không tìm thấy khách hàng này.')
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_list', params: null }, null)
  })

  it('rejected 500 ERR_STORAGE_IO → the message in an alert', async () => {
    renderWith([rejected('ERR_STORAGE_IO', 'Không đọc hoặc ghi được dữ liệu.')])
    expect((await screen.findByRole('alert')).textContent).toContain('Không đọc hoặc ghi được dữ liệu.')
  })

  it('unreachable → the message; "Thử lại" calls Routers again and shows the client', async () => {
    const { loadClientDetail } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, OK])
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được tới phần xử lý.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Nguyễn Thu Hà' })).toBeTruthy()
    expect(loadClientDetail).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('contract_violation → the message, nothing shown as loaded', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
  })
})

describe('page client_detail — navigation', () => {
  it('"Sửa" (main action) opens client_form in edit mode with this client id', async () => {
    const { navigate } = renderWith([OK])
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_form', params: { mode: 'edit', client_id: ID } }, null)
  })

  it('"Quay lại danh sách" opens client_list', async () => {
    const { navigate } = renderWith([OK])
    fireEvent.click(await screen.findByRole('button', { name: 'Quay lại danh sách' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_list', params: null }, null)
  })

  it('the notice handed over by the previous page is shown until this page has its own result', async () => {
    renderWith([OK], [{ kind: 'ok', view: { detail: ARCHIVED_VIEW, message: ARCHIVE_MSG } }], 'Đã lưu thay đổi.')
    await screen.findByRole('heading', { level: 3, name: 'Nguyễn Thu Hà' })
    expect(screen.getByRole('status').textContent).toBe('Đã lưu thay đổi.')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu trữ khách hàng' }))
    await screen.findByRole('button', { name: 'Bỏ lưu trữ' })
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toEqual([ARCHIVE_MSG])
  })
})

describe('page client_detail — archiving (setClientArchived)', () => {
  it('archive ok → Routers(id, true), the message saying what it changes, status and button updated, no reload', async () => {
    const { loadClientDetail, setClientArchived } = renderWith([OK], [{ kind: 'ok', view: { detail: ARCHIVED_VIEW, message: ARCHIVE_MSG } }])
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ khách hàng' }))
    expect(await screen.findByRole('button', { name: 'Bỏ lưu trữ' })).toBeTruthy()
    expect(setClientArchived).toHaveBeenCalledExactlyOnceWith(ID, true)
    expect(screen.getByRole('status').textContent).toBe(ARCHIVE_MSG)
    expect(entries()[0]).toEqual(['Trạng thái', ['Đã lưu trữ']])
    expect(loadClientDetail).toHaveBeenCalledTimes(1)
  })

  it('unarchive ok → Routers(id, false), status "Đang hoạt động"', async () => {
    const { setClientArchived } = renderWith([{ kind: 'ok', view: ARCHIVED_VIEW }], [{ kind: 'ok', view: { detail: VIEW, message: 'Đã bỏ lưu trữ.' } }])
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ lưu trữ' }))
    expect(await screen.findByRole('button', { name: 'Lưu trữ khách hàng' })).toBeTruthy()
    expect(setClientArchived).toHaveBeenCalledExactlyOnceWith(ID, false)
    expect(screen.getByRole('status').textContent).toBe('Đã bỏ lưu trữ.')
    expect(entries()[0]).toEqual(['Trạng thái', ['Đang hoạt động']])
  })

  it.each([
    ['400 ERR_VALIDATION', rejected('ERR_VALIDATION', 'Ứng dụng không nhận dữ liệu này.')],
    ['404 ERR_NOT_FOUND', rejected('ERR_NOT_FOUND', 'Không tìm thấy khách hàng này.')],
    ['500 ERR_STORAGE_IO', rejected('ERR_STORAGE_IO', 'Không đọc hoặc ghi được dữ liệu.')],
  ])('rejected %s → the message in an alert, the client still shown as it was', async (_, result) => {
    renderWith([OK], [result])
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ khách hàng' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa đổi được trạng thái lưu trữ')
    expect(alert.textContent).toContain(result.message)
    expect(entries()[0]).toEqual(['Trạng thái', ['Đang hoạt động']])
  })

  it('unreachable → the message; pressing the button again repeats the operation and succeeds', async () => {
    const { setClientArchived } = renderWith(
      [OK],
      [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, { kind: 'ok', view: { detail: ARCHIVED_VIEW, message: ARCHIVE_MSG } }],
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ khách hàng' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được tới phần xử lý.')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu trữ khách hàng' }))
    expect(await screen.findByRole('button', { name: 'Bỏ lưu trữ' })).toBeTruthy()
    expect(setClientArchived).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('contract_violation → the message, never shown as archived', async () => {
    renderWith([OK], [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ khách hàng' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByText(ARCHIVE_MSG)).toBeNull()
    expect(entries()[0]).toEqual(['Trạng thái', ['Đang hoạt động']])
  })

  it('while archiving: the button shows its busy label and cannot be pressed; no second call', async () => {
    const archive = pending<[string, boolean], Archived>()
    renderWithLogic(
      <ClientDetail params={{ client_id: ID }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({ loadClientDetail: answers<[string], Detail>(OK), setClientArchived: archive.fn }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ khách hàng' }))
    const busy = screen.getByRole('button', { name: 'Đang lưu trữ…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(busy)
    expect(archive.fn).toHaveBeenCalledTimes(1)
    await act(async () => archive.release({ kind: 'ok', view: { detail: ARCHIVED_VIEW, message: ARCHIVE_MSG } }))
    expect(screen.getByRole('button', { name: 'Bỏ lưu trữ' })).toBeTruthy()
  })
})
