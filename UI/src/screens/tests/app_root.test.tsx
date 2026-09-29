// @vitest-environment jsdom
//
// Navigation of the screens zone (plan of session 16, item 4;
// ui_decomposition.md §5 "Điều hướng giữa các trang khách hàng"), on the real
// pages with fake Routers: the start page; the fixed navigation region,
// generated from the table, with the current item marked; parameters reach
// the destination page; a notice shows once, on its destination only; a
// wrong parameter is a compile error (checked by tsc -b: each wrong route
// below carries an expect-error directive, and tsc fails on an unused one).
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  ClientDetailView,
  ClientFormDraft,
  ClientFormTarget,
  ClientFormView,
  ClientListView,
  SavedClientView,
  ViewResult,
} from '../../logic/workflows/manage_client/routers'
import type { CommissionDetailView, CommissionListView } from '../../logic/workflows/manage_commission/routers'
import { AppRoot } from '../app_root'
import { NAVIGATION, START_PAGE, type Route } from '../navigation'
import { answers, fakeManageClient, fakeManageCommission, renderWithLogic } from './fake_logic'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const CID = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const LIST: ViewResult<ClientListView> = { kind: 'ok', view: { active: [{ clientId: ID, name: 'An' }], archived: [], isEmpty: false } }
const DETAIL: ViewResult<ClientDetailView> = {
  kind: 'ok',
  view: { clientId: ID, name: 'An', isArchived: false, statusText: 'Đang hoạt động', contactLines: [], note: null, createdText: 'a', updatedText: 'b' },
}
const FORM: ViewResult<ClientFormView> = { kind: 'ok', view: { draft: { displayName: 'An', contacts: [], note: '' }, channelSuggestions: [] } }
const SAVED: ViewResult<SavedClientView> = { kind: 'ok', view: { clientId: ID, message: 'Đã lưu thay đổi.' } }

afterEach(() => {
  cleanup()
})

// Compile-time checks: a page opened with the parameters of another page, or none.
export const WRONG_ROUTES: Route[] = [
  // @ts-expect-error client_detail needs client_id
  { page: 'client_detail', params: null },
  // @ts-expect-error client_form in edit mode needs client_id
  { page: 'client_form', params: { mode: 'edit' } },
  // @ts-expect-error client_list takes no parameter
  { page: 'client_list', params: { client_id: ID } },
  // @ts-expect-error mode is create or edit
  { page: 'client_form', params: { mode: 'delete', client_id: ID } },
  // @ts-expect-error commission_detail needs commission_id, not client_id
  { page: 'commission_detail', params: { client_id: ID } },
  // @ts-expect-error commission_form in edit mode needs commission_id
  { page: 'commission_form', params: { mode: 'edit' } },
  // @ts-expect-error commission_list takes no parameter
  { page: 'commission_list', params: { commission_id: ID } },
]

describe('navigation table', () => {
  it('has exactly the six pages of ui_decomposition.md §5 (D1 and D2), and opens on client_list', () => {
    expect(Object.keys(NAVIGATION).sort()).toEqual(['client_detail', 'client_form', 'client_list', 'commission_detail', 'commission_form', 'commission_list'])
    expect(START_PAGE).toBe('client_list')
  })

  it('the navigation region lists "Khách hàng", then "Đơn hàng"; D2 pages belong to "Đơn hàng"', () => {
    const menu = (Object.keys(NAVIGATION) as (keyof typeof NAVIGATION)[]).flatMap((k) => {
      const m = NAVIGATION[k].menu
      return m === null ? [] : [m.label]
    })
    expect(menu).toEqual(['Khách hàng', 'Đơn hàng'])
    expect([NAVIGATION.commission_list.section, NAVIGATION.commission_detail.section, NAVIGATION.commission_form.section]).toEqual([
      'commission_list',
      'commission_list',
      'commission_list',
    ])
  })
})

describe('AppRoot', () => {
  it('opens client_list inside main_layout, with the navigation region: "Khách hàng" marked current', async () => {
    renderWithLogic(<AppRoot />, fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST) }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Khách hàng' })).toBeTruthy()
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    const items = within(nav).getAllByRole('button')
    expect(items.map((b) => b.textContent)).toEqual(['Khách hàng', 'Đơn hàng'])
    expect(items[0].getAttribute('aria-current')).toBe('page')
    expect(items[1].getAttribute('aria-current')).toBeNull()
  })

  it('"Đơn hàng" opens commission_list, marked current; a commission → its detail, "Đơn hàng" still current', async () => {
    const loadCommissionList = answers<[], ViewResult<CommissionListView>>({
      kind: 'ok',
      view: { rows: [{ commissionId: CID, title: 'Chân dung', detailText: 'An · 1.500.000 VND · Không có hạn' }], isEmpty: false },
    })
    const loadCommissionDetail = answers<[string], ViewResult<CommissionDetailView>>({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.', fieldErrors: {} })
    renderWithLogic(<AppRoot />, fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST) }), fakeManageCommission({ loadCommissionList, loadCommissionDetail }))
    await screen.findByRole('button', { name: 'An' })
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Đơn hàng' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Đơn hàng' })).toBeTruthy()
    const current = () => within(screen.getByRole('navigation')).getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-current')])
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', 'page'],
    ])
    fireEvent.click(await screen.findByRole('button', { name: /^Chân dung/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeTruthy()
    expect(loadCommissionDetail).toHaveBeenCalledExactlyOnceWith(CID)
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', 'page'],
    ])
  })

  it('a client → client_detail with its id (item still current); "Sửa" → client_form edit; saved → detail with the notice, once', async () => {
    const loadClientDetail = answers<[string], ViewResult<ClientDetailView>>(DETAIL, DETAIL)
    const openClientForm = answers<[ClientFormTarget], ViewResult<ClientFormView>>(FORM)
    const saveClient = answers<[ClientFormTarget, ClientFormDraft], ViewResult<SavedClientView>>(SAVED)
    const loadClientList = answers<[], ViewResult<ClientListView>>(LIST, LIST)
    renderWithLogic(<AppRoot />, fakeManageClient({ loadClientList, loadClientDetail, openClientForm, saveClient }))

    fireEvent.click(await screen.findByRole('button', { name: 'An' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Chi tiết khách hàng' })).toBeTruthy()
    expect(loadClientDetail).toHaveBeenCalledWith(ID)
    expect(within(screen.getByRole('navigation')).getByRole('button', { name: 'Khách hàng' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('status')).toBeNull()

    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Sửa khách hàng' })).toBeTruthy()
    expect(openClientForm).toHaveBeenCalledExactlyOnceWith({ mode: 'edit', clientId: ID })

    fireEvent.click(await screen.findByRole('button', { name: 'Lưu' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Chi tiết khách hàng' })).toBeTruthy()
    // The notice shows on the destination page…
    expect((await screen.findByRole('status')).textContent).toBe('Đã lưu thay đổi.')
    expect(loadClientDetail).toHaveBeenCalledTimes(2)

    // …once: the next navigation (here the navigation region) does not carry it.
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Khách hàng' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Khách hàng' })).toBeTruthy()
    await screen.findByRole('button', { name: 'An' })
    expect(screen.queryByText('Đã lưu thay đổi.')).toBeNull()
    expect(loadClientList).toHaveBeenCalledTimes(2)
  })
})
