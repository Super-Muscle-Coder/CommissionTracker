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
import { afterEach, describe, expect, it, vi } from 'vitest'
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
import type { BalanceView, PaymentFormView, PaymentListView, SavedPaymentView } from '../../logic/workflows/record_payment/routers'
import type { RunOutcome } from '../../logic/workflows/restore_data/routers'
import type { PendingListView, SettingsFormView } from '../../logic/workflows/send_reminder/routers'
import type { ProgressBoardView } from '../../logic/workflows/update_progress/routers'
import type { IncomePeriodDraft, IncomeReportView } from '../../logic/workflows/view_income_report/routers'
import { AppRoot } from '../app_root'
import { NAVIGATION, START_PAGE, type Route } from '../navigation'
import {
  answers,
  fakeManageClient,
  fakeManageCommission,
  fakeRecordPayment,
  fakeRestoreData,
  fakeSendReminder,
  fakeUpdateProgress,
  fakeViewIncomeReport,
  renderWithLogic,
} from './fake_logic'

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
  // @ts-expect-error stage_change needs the title too
  { page: 'stage_change', params: { commission_id: ID } },
  // @ts-expect-error progress_board takes no parameter
  { page: 'progress_board', params: { commission_id: ID } },
  // @ts-expect-error payment_list needs the title too
  { page: 'payment_list', params: { commission_id: ID } },
  // @ts-expect-error payment_form needs commission_id, not client_id
  { page: 'payment_form', params: { client_id: ID, title: 'x' } },
  // @ts-expect-error income_report takes no parameter
  { page: 'income_report', params: { commission_id: ID } },
  // @ts-expect-error reminder_list takes no parameter
  { page: 'reminder_list', params: { commission_id: ID } },
  // @ts-expect-error reminder_settings takes no parameter
  { page: 'reminder_settings', params: { commission_id: ID } },
  // @ts-expect-error backup takes no parameter
  { page: 'backup', params: { commission_id: ID } },
  // @ts-expect-error restore takes no parameter
  { page: 'restore', params: { commission_id: ID } },
]

describe('navigation table', () => {
  it('has exactly the fifteen pages of ui_decomposition.md §5 (D1 to D6, E and F), and opens on client_list', () => {
    expect(Object.keys(NAVIGATION).sort()).toEqual([
      'backup',
      'client_detail',
      'client_form',
      'client_list',
      'commission_detail',
      'commission_form',
      'commission_list',
      'income_report',
      'payment_form',
      'payment_list',
      'progress_board',
      'reminder_list',
      'reminder_settings',
      'restore',
      'stage_change',
    ])
    expect(START_PAGE).toBe('client_list')
  })

  it('the navigation region lists "Khách hàng", "Đơn hàng", "Tiến độ", "Thu nhập", "Nhắc việc", "Sao lưu", then "Khôi phục"; D2 pages, stage_change and the payment pages belong to "Đơn hàng"', () => {
    const menu = (Object.keys(NAVIGATION) as (keyof typeof NAVIGATION)[]).flatMap((k) => {
      const m = NAVIGATION[k].menu
      return m === null ? [] : [m.label]
    })
    expect(menu).toEqual(['Khách hàng', 'Đơn hàng', 'Tiến độ', 'Thu nhập', 'Nhắc việc', 'Sao lưu', 'Khôi phục'])
    expect([
      NAVIGATION.commission_list.section,
      NAVIGATION.commission_detail.section,
      NAVIGATION.commission_form.section,
      NAVIGATION.stage_change.section,
      NAVIGATION.payment_list.section,
      NAVIGATION.payment_form.section,
    ]).toEqual(['commission_list', 'commission_list', 'commission_list', 'commission_list', 'commission_list', 'commission_list'])
    expect(NAVIGATION.progress_board.section).toBe('progress_board')
    expect(NAVIGATION.income_report.section).toBe('income_report')
    // The settings are a step of the reminder list: its item is the current one (D6).
    expect(NAVIGATION.reminder_list.section).toBe('reminder_list')
    expect(NAVIGATION.reminder_settings.section).toBe('reminder_list')
    expect(NAVIGATION.reminder_settings.menu).toBeNull()
  })
})

describe('AppRoot', () => {
  it('opens client_list inside main_layout, with the navigation region: "Khách hàng" marked current', async () => {
    renderWithLogic(<AppRoot />, fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST) }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Khách hàng' })).toBeTruthy()
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    const items = within(nav).getAllByRole('button')
    expect(items.map((b) => b.textContent)).toEqual(['Khách hàng', 'Đơn hàng', 'Tiến độ', 'Thu nhập', 'Nhắc việc', 'Sao lưu', 'Khôi phục'])
    expect(items[0].getAttribute('aria-current')).toBe('page')
    expect(items[1].getAttribute('aria-current')).toBeNull()
    expect(items[2].getAttribute('aria-current')).toBeNull()
    expect(items[3].getAttribute('aria-current')).toBeNull()
    expect(items[4].getAttribute('aria-current')).toBeNull()
    expect(items[5].getAttribute('aria-current')).toBeNull()
    expect(items[6].getAttribute('aria-current')).toBeNull()
  })

  it('"Khôi phục" opens restore, the seventh item, marked current; the six older items keep their places', async () => {
    const loadStatus = answers<[], RunOutcome>({ result: { kind: 'ok', view: { message: null } }, pending: { state: 'none' } })
    renderWithLogic(
      <AppRoot />,
      fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST) }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      fakeRestoreData({ loadStatus }),
    )
    await screen.findByRole('heading', { level: 2, name: 'Khách hàng' })
    const nav = () => within(screen.getByRole('navigation', { name: 'Điều hướng chính' }))
    fireEvent.click(nav().getByRole('button', { name: 'Khôi phục' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Khôi phục dữ liệu' })).toBeTruthy()
    expect(await screen.findByText('Không có lần khôi phục nào đang chờ.')).toBeTruthy()
    expect(nav().getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-current')])).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', null],
      ['Tiến độ', null],
      ['Thu nhập', null],
      ['Nhắc việc', null],
      ['Sao lưu', null],
      ['Khôi phục', 'page'],
    ])
    expect(loadStatus).toHaveBeenCalledTimes(1)
  })

  it('"Tiến độ" opens progress_board, marked current; a commission of the board → its detail, "Đơn hàng" current', async () => {
    const loadProgressBoard = answers<[], ViewResult<ProgressBoardView>>({
      kind: 'ok',
      view: { groups: [{ key: 'sketch', title: 'Phác thảo (1)', rows: [{ commissionId: CID, title: 'Chân dung', detailText: 'Không có hạn' }] }], isEmpty: false },
    })
    const loadCommissionDetail = answers<[string], ViewResult<CommissionDetailView>>({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.', fieldErrors: {} })
    renderWithLogic(
      <AppRoot />,
      fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST) }),
      fakeManageCommission({ loadCommissionDetail }),
      // The detail's "Tiến độ" and "Thanh toán" parts load too; they never answer here (their own tests cover them).
      fakeUpdateProgress({ loadProgressBoard, loadCommissionProgress: () => new Promise(() => {}) }),
      fakeRecordPayment({ loadCommissionBalance: () => new Promise(() => {}) }),
    )
    await screen.findByRole('button', { name: 'An' })
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Tiến độ' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Tiến độ' })).toBeTruthy()
    const current = () => within(screen.getByRole('navigation')).getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-current')])
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', null],
      ['Tiến độ', 'page'],
      ['Thu nhập', null],
      ['Nhắc việc', null],
      ['Sao lưu', null],
      ['Khôi phục', null],
    ])
    fireEvent.click(await screen.findByRole('button', { name: /^Chân dung/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeTruthy()
    expect(loadCommissionDetail).toHaveBeenCalledExactlyOnceWith(CID)
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', 'page'],
      ['Tiến độ', null],
      ['Thu nhập', null],
      ['Nhắc việc', null],
      ['Sao lưu', null],
      ['Khôi phục', null],
    ])
  })

  it('"Đơn hàng" opens commission_list, marked current; a commission → its detail, "Đơn hàng" still current', async () => {
    const loadCommissionList = answers<[], ViewResult<CommissionListView>>({
      kind: 'ok',
      view: { rows: [{ commissionId: CID, title: 'Chân dung', detailText: 'An · 1.500.000 VND · Không có hạn' }], isEmpty: false },
    })
    const loadCommissionDetail = answers<[string], ViewResult<CommissionDetailView>>({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.', fieldErrors: {} })
    renderWithLogic(
      <AppRoot />,
      fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST) }),
      fakeManageCommission({ loadCommissionList, loadCommissionDetail }),
      // The detail's "Tiến độ" and "Thanh toán" parts load too; they never answer here (their own tests cover them).
      fakeUpdateProgress({ loadCommissionProgress: () => new Promise(() => {}) }),
      fakeRecordPayment({ loadCommissionBalance: () => new Promise(() => {}) }),
    )
    await screen.findByRole('button', { name: 'An' })
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Đơn hàng' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Đơn hàng' })).toBeTruthy()
    const current = () => within(screen.getByRole('navigation')).getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-current')])
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', 'page'],
      ['Tiến độ', null],
      ['Thu nhập', null],
      ['Nhắc việc', null],
      ['Sao lưu', null],
      ['Khôi phục', null],
    ])
    fireEvent.click(await screen.findByRole('button', { name: /^Chân dung/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeTruthy()
    expect(loadCommissionDetail).toHaveBeenCalledExactlyOnceWith(CID)
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', 'page'],
      ['Tiến độ', null],
      ['Thu nhập', null],
      ['Nhắc việc', null],
      ['Sao lưu', null],
      ['Khôi phục', null],
    ])
  })

  it('"Thu nhập" opens income_report, marked current, the other four not; the report loads once; leaving it marks the item it goes to', async () => {
    const viewIncomeReport = answers<[IncomePeriodDraft], ViewResult<IncomeReportView>>({
      kind: 'ok',
      view: { periodText: 'Từ 01/01/2026 đến 30/09/2026 · Lập lúc 10:00 30/09/2026', sections: [], isEmpty: true, emptyText: 'Không có gì' },
    })
    renderWithLogic(
      <AppRoot />,
      fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST, LIST) }),
      undefined,
      undefined,
      undefined,
      fakeViewIncomeReport({ viewIncomeReport }),
    )
    await screen.findByRole('button', { name: 'An' })
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Thu nhập' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Thu nhập' })).toBeTruthy()
    const current = () => within(screen.getByRole('navigation')).getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-current')])
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', null],
      ['Tiến độ', null],
      ['Thu nhập', 'page'],
      ['Nhắc việc', null],
      ['Sao lưu', null],
      ['Khôi phục', null],
    ])
    await screen.findByText('Không có gì')
    expect(viewIncomeReport).toHaveBeenCalledExactlyOnceWith({ periodFrom: '2026-01-01', periodTo: '2026-09-30' })
    // The page has no notice: nothing to write, nothing to confirm.
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Khách hàng' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Khách hàng' })).toBeTruthy()
    expect(current()[3]).toEqual(['Thu nhập', null])
  })

  it('D6: "Nhắc việc" → reminder_list (marked current) → "Cài đặt nhắc việc" → reminder_settings (still marked) → saved → reminder_list with the notice, once; "Hủy" → reminder_list with none', async () => {
    const EMPTY: ViewResult<PendingListView> = { kind: 'ok', view: { rows: [], isEmpty: true, emptyText: 'Không có nhắc việc nào đang chờ.' } }
    const FORM_VIEW: ViewResult<SettingsFormView> = {
      kind: 'ok',
      view: {
        subtitle: 'Chưa lưu lần nào, đang dùng cài đặt mặc định.',
        draft: { periodicEnabled: false, every: '1', periodicUnit: 'days', atTime: '09:00', weekday: '', deadlineEnabled: false, leadTimes: [{ amount: '1', unit: 'days' }] },
        periodicUnitChoices: [{ value: 'days', label: 'ngày' }],
        weekdayChoices: [],
        leadUnitChoices: [{ value: 'days', label: 'ngày' }],
        weekdayUnit: 'weeks',
        leadTimeLimits: { min: 1, max: 5 },
      },
    }
    const loadPending = answers<[], ViewResult<PendingListView>>(EMPTY, EMPTY, EMPTY)
    const openSettings = answers<[], ViewResult<SettingsFormView>>(FORM_VIEW, FORM_VIEW)
    const saveSettings = answers<[unknown], ViewResult<{ message: string }>>({ kind: 'ok', view: { message: 'Đã lưu cài đặt nhắc việc.' } })
    renderWithLogic(
      <AppRoot />,
      fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST, LIST) }),
      undefined,
      undefined,
      undefined,
      undefined,
      fakeSendReminder({ loadPending, openSettings, saveSettings }),
    )
    await screen.findByRole('button', { name: 'An' })
    const current = () => within(screen.getByRole('navigation')).getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-current')])
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Nhắc việc' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Nhắc việc' })).toBeTruthy()
    await screen.findByText('Không có nhắc việc nào đang chờ.')
    expect(current()).toEqual([
      ['Khách hàng', null],
      ['Đơn hàng', null],
      ['Tiến độ', null],
      ['Thu nhập', null],
      ['Nhắc việc', 'page'],
      ['Sao lưu', null],
      ['Khôi phục', null],
    ])
    // The way to the settings: the item "Nhắc việc" stays the current one.
    fireEvent.click(screen.getAllByRole('button', { name: 'Cài đặt nhắc việc' })[0])
    expect(await screen.findByRole('heading', { level: 2, name: 'Cài đặt nhắc việc' })).toBeTruthy()
    await screen.findByRole('button', { name: 'Lưu' })
    expect(current()[4]).toEqual(['Nhắc việc', 'page'])
    // "Hủy": back with no notice.
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    await screen.findByText('Không có nhắc việc nào đang chờ.')
    expect(screen.queryByRole('status')).toBeNull()
    // Save: back with the notice, shown once.
    fireEvent.click(screen.getAllByRole('button', { name: 'Cài đặt nhắc việc' })[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu' }))
    expect(await screen.findByText('Đã lưu cài đặt nhắc việc.')).toBeTruthy()
    // The notice comes from the navigation itself and shows as soon as reminder_list is built; the
    // third read of the list is made by an effect that runs after it (UI-19, same kind as
    // screens-EXP-012): wait for that call instead of asserting right after the notice. Still three.
    await vi.waitFor(() => expect(loadPending).toHaveBeenCalledTimes(3))
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Khách hàng' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Khách hàng' })).toBeTruthy()
    expect(screen.queryByText('Đã lưu cài đặt nhắc việc.')).toBeNull()
  })

  it('D4: detail → "Thanh toán" → payment_list → "Ghi khoản thanh toán" → payment_form → saved → payment_list with the notice, once; "Đơn hàng" current throughout', async () => {
    const title = 'Chân dung'
    const BALANCE: BalanceView = { lines: [{ key: 'agreed', term: 'Giá thỏa thuận', text: '1.500.000 VND' }] }
    const EMPTY_LIST: ViewResult<PaymentListView> = { kind: 'ok', view: { balance: BALANCE, rows: [], isEmpty: true, emptyText: 'Chưa có khoản thanh toán nào' } }
    const FORM_VIEW: ViewResult<PaymentFormView> = {
      kind: 'ok',
      view: {
        supported: true,
        target: { commissionId: CID, currency: 'VND' },
        currencyText: 'VND',
        directionChoices: [{ value: 'incoming', label: 'Nhận tiền' }],
        kindChoices: [{ value: 'deposit', label: 'Tiền cọc' }],
        chooseKindLabel: 'Chọn khoản',
        methodSuggestions: [],
        draft: { direction: 'incoming', paymentKind: 'deposit', amount: '1000', method: 'MoMo', paidAtLocal: '2026-09-30T10:00', note: '' },
      },
    }
    const DETAIL_VIEW: ViewResult<CommissionDetailView> = {
      kind: 'ok',
      view: {
        commissionId: CID,
        title,
        clientText: 'An',
        commissionType: null,
        priceText: '1.500.000 VND',
        deadlineText: 'Không có hạn',
        description: null,
        referenceLinks: [],
        createdText: 'a',
        updatedText: 'b',
      },
    }
    const loadPaymentList = answers<[string], ViewResult<PaymentListView>>(EMPTY_LIST, EMPTY_LIST)
    const openPaymentForm = answers<[string], ViewResult<PaymentFormView>>(FORM_VIEW)
    const savePayment = answers<[unknown, unknown], ViewResult<SavedPaymentView>>({ kind: 'ok', view: { commissionId: CID, message: 'Đã ghi khoản thanh toán.' } })
    const loadCommissionList = answers<[], ViewResult<CommissionListView>>({
      kind: 'ok',
      view: { rows: [{ commissionId: CID, title, detailText: 'An · 1.500.000 VND · Không có hạn' }], isEmpty: false },
    })
    renderWithLogic(
      <AppRoot />,
      fakeManageClient({ loadClientList: answers<[], ViewResult<ClientListView>>(LIST) }),
      // The detail is opened twice (from the list, then back from payment_list).
      fakeManageCommission({ loadCommissionList, loadCommissionDetail: answers<[string], ViewResult<CommissionDetailView>>(DETAIL_VIEW, DETAIL_VIEW) }),
      fakeUpdateProgress({ loadCommissionProgress: () => new Promise(() => {}) }),
      fakeRecordPayment({
        loadCommissionBalance: answers<[string], ViewResult<BalanceView>>({ kind: 'ok', view: BALANCE }, { kind: 'ok', view: BALANCE }),
        loadPaymentList,
        openPaymentForm,
        savePayment,
      }),
    )
    const current = () => within(screen.getByRole('navigation')).getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page').map((b) => b.textContent)
    await screen.findByRole('button', { name: 'An' })
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Đơn hàng' }))
    fireEvent.click(await screen.findByRole('button', { name: /^Chân dung/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Thanh toán' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Thanh toán' })).toBeTruthy()
    expect(loadPaymentList).toHaveBeenCalledExactlyOnceWith(CID)
    expect(screen.getByRole('heading', { level: 3, name: title })).toBeTruthy()
    expect(current()).toEqual(['Đơn hàng'])
    // The list is empty: the button is in the row and in the empty state; the one of the row is first.
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ghi khoản thanh toán' }))[0])
    expect(await screen.findByRole('heading', { level: 2, name: 'Ghi khoản thanh toán' })).toBeTruthy()
    expect(openPaymentForm).toHaveBeenCalledExactlyOnceWith(CID)
    expect(current()).toEqual(['Đơn hàng'])
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Thanh toán' })).toBeTruthy()
    expect(savePayment).toHaveBeenCalledOnce()
    // The notice shows on the destination page, once.
    expect((await screen.findByRole('status')).textContent).toBe('Đã ghi khoản thanh toán.')
    expect(loadPaymentList).toHaveBeenCalledTimes(2)
    fireEvent.click(await screen.findByRole('button', { name: 'Quay lại đơn hàng' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Chi tiết đơn hàng' })).toBeTruthy()
    expect(screen.queryByText('Đã ghi khoản thanh toán.')).toBeNull()
    expect(current()).toEqual(['Đơn hàng'])
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
