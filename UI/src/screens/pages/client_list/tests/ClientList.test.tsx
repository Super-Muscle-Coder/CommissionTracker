// @vitest-environment jsdom
//
// Render tests of the page client_list (i5-screens.md, Step I5.4), with fake
// Routers in the context: one case per ViewResult kind of the only Routers
// operation (loadClientList), contract_violation included (the walkthrough
// cannot cause it); the empty state with its add action; the reload button
// disabled while loading; reload after unreachable calls Routers again; the
// two navigation actions (add → client_form create, a client → client_detail
// with its id), which call no Routers.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClientListView, ViewResult } from '../../../../logic/workflows/manage_client/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { ClientList } from '../ClientList'

type Result = ViewResult<ClientListView>

function renderWith(...results: Result[]) {
  const loadClientList = answers<[], Result>(...results)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(<ClientList params={null} navigate={navigate} notice={null} />, fakeManageClient({ loadClientList }))
  return { loadClientList, navigate }
}

const OK: Result = {
  kind: 'ok',
  view: {
    active: [
      { clientId: 'c1', name: 'An' },
      { clientId: 'c2', name: 'Ánh' },
      { clientId: 'c3', name: 'Đức' },
    ],
    archived: [{ clientId: 'c4', name: 'Bảo' }],
    isEmpty: false,
  },
}

const listTexts = (name: string) =>
  within(screen.getByRole('list', { name })).getAllByRole('listitem').map((li) => li.textContent)

afterEach(() => {
  cleanup()
})

describe('page client_list', () => {
  it('loads once when it opens; ok → two groups in the order given by Services', async () => {
    const { loadClientList } = renderWith(OK)
    expect(await screen.findByRole('heading', { level: 3, name: 'Đang hoạt động' })).toBeTruthy()
    expect(loadClientList).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Khách hàng' })).toBeTruthy()
    expect(listTexts('Khách hàng đang hoạt động')).toEqual(['An', 'Ánh', 'Đức'])
    expect(screen.getByRole('heading', { level: 3, name: 'Đã lưu trữ' })).toBeTruthy()
    expect(listTexts('Khách hàng đã lưu trữ')).toEqual(['Bảo'])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('pressing a client (active or archived) opens client_detail with its id, no Routers call', async () => {
    const { loadClientList, navigate } = renderWith(OK)
    fireEvent.click(await screen.findByRole('button', { name: 'Ánh' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_detail', params: { client_id: 'c2' } }, null)
    fireEvent.click(screen.getByRole('button', { name: 'Bảo' }))
    expect(navigate).toHaveBeenLastCalledWith({ page: 'client_detail', params: { client_id: 'c4' } }, null)
    expect(loadClientList).toHaveBeenCalledTimes(1)
  })

  it('"Thêm khách hàng" (main action) opens client_form in create mode, no Routers call', async () => {
    const { loadClientList, navigate } = renderWith(OK)
    await screen.findByRole('heading', { level: 3, name: 'Đang hoạt động' })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm khách hàng' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_form', params: { mode: 'create' } }, null)
    expect(loadClientList).toHaveBeenCalledTimes(1)
  })

  it('ok with no client → "Chưa có khách hàng nào." with an add button, not an error', async () => {
    const { navigate } = renderWith({ kind: 'ok', view: { active: [], archived: [], isEmpty: true } })
    expect(await screen.findByText('Chưa có khách hàng nào.')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    // The main action at the top and the one of the empty state both open the form.
    const adds = screen.getAllByRole('button', { name: 'Thêm khách hàng' })
    expect(adds).toHaveLength(2)
    fireEvent.click(adds[1])
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_form', params: { mode: 'create' } }, null)
  })

  it('ok with archived clients only → empty active group, archived list shown', async () => {
    renderWith({ kind: 'ok', view: { active: [], archived: [{ clientId: 'c9', name: 'Zoe' }], isEmpty: false } })
    expect(await screen.findByText('Chưa có khách hàng nào đang hoạt động.')).toBeTruthy()
    expect(listTexts('Khách hàng đã lưu trữ')).toEqual(['Zoe'])
  })

  it('rejected (system, ERR_STORAGE_IO) → the message in an alert, no list', async () => {
    renderWith({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: 'Không đọc được dữ liệu.', fieldErrors: {} })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không tải được danh sách khách hàng')
    expect(alert.textContent).toContain('Không đọc được dữ liệu.')
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('unreachable → the message; reload calls Routers again and shows the list', async () => {
    const { loadClientList } = renderWith({ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, OK)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain('Không kết nối được tới phần xử lý.')

    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Đang hoạt động' })).toBeTruthy()
    expect(loadClientList).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(listTexts('Khách hàng đang hoạt động')).toEqual(['An', 'Ánh', 'Đức'])
  })

  it('contract_violation → the message, never shown as a success, no technical detail', async () => {
    renderWith({ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(alert.textContent).toContain('Ứng dụng nhận được một phản hồi không mong đợi.')
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByText('Đang hoạt động')).toBeNull()
  })

  it('first frame, before Routers answers: loading shown, "Tải lại" not pressable; only the add action (navigation) is (UI-4)', async () => {
    const load = pending<[], Result>()
    const first = renderFirstCommit(<ClientList params={null} navigate={vi.fn()} notice={null} />, fakeManageClient({ loadClientList: load.fn }))
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải danh sách khách hàng…'])
    // "Thêm khách hàng" only opens the form; nothing that calls the backend can be pressed.
    expect(first.enabledButtons).toEqual(['Thêm khách hàng'])
    expect(load.fn).toHaveBeenCalledTimes(1)
    await act(async () => load.release(OK))
  })

  it('while loading: reload disabled with its busy label, loading status shown; no second call', async () => {
    const load = pending<[], Result>()
    renderWithLogic(<ClientList params={null} navigate={vi.fn()} notice={null} />, fakeManageClient({ loadClientList: load.fn }))
    const busyButton = await screen.findByRole('button', { name: 'Đang tải…' })
    expect((busyButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('Đang tải danh sách khách hàng…')
    fireEvent.click(busyButton)
    expect(load.fn).toHaveBeenCalledTimes(1)

    await act(async () => load.release(OK))
    const button = screen.getByRole('button', { name: 'Tải lại' })
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('a notice handed over by navigation is shown', async () => {
    renderWithLogic(
      <ClientList params={null} navigate={vi.fn()} notice="Đã xong." />,
      fakeManageClient({ loadClientList: answers<[], Result>(OK) }),
    )
    await screen.findByRole('heading', { level: 3, name: 'Đang hoạt động' })
    expect(screen.getByRole('status').textContent).toBe('Đã xong.')
  })
})
