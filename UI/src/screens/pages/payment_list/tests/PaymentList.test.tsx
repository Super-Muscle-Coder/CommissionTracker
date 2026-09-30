// @vitest-environment jsdom
//
// Render tests of the page payment_list (i5-screens.md, Step I5.4), with fake
// Routers: the first frame (UI-4); every ViewResult kind of its one loading
// operation loadPaymentList (get_balance + list_for_commission): ok with the
// balance and the payments, ok and empty (with the button), a voided payment
// (marked, no button), rejected 404 / 409 / 500, unreachable + "Tải lại",
// contract_violation; the button row ("Ghi khoản thanh toán" first, "Quay lại
// đơn hàng", "Tải lại"); the notice. The voiding (ui_decomposition.md D4, §7.2
// principle 5): "Hủy khoản này" asks first inside the page, the focus on
// "Xác nhận", nothing sent by "Quay lại", exactly one void_payment by
// "Xác nhận", the buttons disabled while it runs, every kind of its result
// (ok → the list read again; 404 and 409 → the message and the list read again;
// 500, unreachable, contract_violation → the message, the list as it was).
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentListView, VoidOutcomeView, ViewResult } from '../../../../logic/workflows/record_payment/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeRecordPayment, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { PaymentList } from '../PaymentList'

type Loaded = ViewResult<PaymentListView>
type Voided = ViewResult<VoidOutcomeView>

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const TITLE = 'Chân dung bán thân'
const P1 = '00000000-0000-4000-8000-000000000001'
const P2 = '00000000-0000-4000-8000-000000000002'
const P3 = '00000000-0000-4000-8000-000000000003'

const BALANCE = {
  lines: [
    { key: 'agreed', term: 'Giá thỏa thuận', text: '1.500.000 VND' },
    { key: 'received', term: 'Đã nhận', text: '500.000 VND' },
    { key: 'outstanding', term: 'Còn phải thu', text: '1.000.000 VND' },
  ],
}
const ROWS = [
  { paymentId: P1, text: 'Nhận tiền 500.000 VND · Tiền cọc', detailText: '08:30 28/09/2026 · Chuyển khoản', canVoid: true },
  { paymentId: P2, text: 'Hoàn tiền cho khách 100.000 VND · Khác', detailText: '09:00 27/09/2026 · MoMo · Nhầm · Đã hủy', canVoid: false },
  { paymentId: P3, text: 'Nhận tiền 100.000 VND · Tiền tip', detailText: '10:00 26/09/2026 · PayPal', canVoid: true },
]
const LIST_OK: Loaded = { kind: 'ok', view: { balance: BALANCE, rows: ROWS, isEmpty: false, emptyText: 'Chưa có khoản thanh toán nào' } }
const EMPTY_OK: Loaded = { kind: 'ok', view: { balance: BALANCE, rows: [], isEmpty: true, emptyText: 'Chưa có khoản thanh toán nào' } }
const AFTER_VOID: Loaded = {
  kind: 'ok',
  view: { balance: BALANCE, rows: [ROWS[0], { ...ROWS[2], canVoid: false, detailText: '10:00 26/09/2026 · PayPal · Đã hủy' }, ROWS[1]], isEmpty: false, emptyText: 'x' },
}
const NEEDS: Voided = { kind: 'ok', view: { outcome: 'needs_confirmation', message: 'Khoản đã hủy không khôi phục được. Số dư sẽ được tính lại không có khoản này.' } }
const VOIDED: Voided = { kind: 'ok', view: { outcome: 'voided', message: 'Đã hủy khoản thanh toán.' } }
const rejected = (code: string, message: string): Loaded => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
const rejectedVoid = (code: string, message: string): Voided => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })

function renderWith(lists: Loaded[], voids: Voided[] = [], notice: string | null = null) {
  const loadPaymentList = answers<[string], Loaded>(...lists)
  const voidPayment = answers<[string, boolean], Voided>(...voids)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(
    <PaymentList params={{ commission_id: ID, title: TITLE }} navigate={navigate} notice={notice} />,
    fakeManageClient({}),
    undefined,
    undefined,
    fakeRecordPayment({ loadPaymentList, voidPayment }),
  )
  return { loadPaymentList, voidPayment, navigate }
}

const buttonTexts = () => screen.getAllByRole('button').map((b) => b.textContent)
const voidButtons = () => screen.queryAllByRole('button', { name: 'Hủy khoản này' })
const panel = () => screen.queryByRole('group', { name: 'Xác nhận hủy khoản' })
// [term, details] of each entry of the balance.
function balanceEntries(): [string, string[]][] {
  const dl = screen.getByLabelText('Số dư đơn hàng')
  return [...dl.querySelectorAll(':scope > div')].map((d) => [d.querySelector('dt')?.textContent ?? '', [...d.querySelectorAll('dd')].map((x) => x.textContent ?? '')])
}
// The rows of the list as shown: the text of each item.
const rowTexts = () => within(screen.getByRole('list', { name: 'Danh sách khoản thanh toán' })).getAllByRole('listitem').map((li) => li.textContent)

afterEach(() => {
  cleanup()
})

describe('page payment_list: opening', () => {
  it('first frame, before Routers answers: loading shown; only "Quay lại đơn hàng" can be pressed (UI-4)', async () => {
    const load = pending<[string], Loaded>()
    const first = renderFirstCommit(
      <PaymentList params={{ commission_id: ID, title: TITLE }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      fakeRecordPayment({ loadPaymentList: load.fn }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải các khoản thanh toán…'])
    expect(first.enabledButtons).toEqual(['Quay lại đơn hàng'])
    await act(async () => load.release(LIST_OK))
    expect(await screen.findByLabelText('Số dư đơn hàng')).toBeTruthy()
  })

  it('ok: Routers asked with the id; titles; the button row right under them; the balance; the payments in the order given', async () => {
    const { loadPaymentList } = renderWith([LIST_OK])
    await screen.findByLabelText('Số dư đơn hàng')
    expect(loadPaymentList).toHaveBeenCalledExactlyOnceWith(ID)
    expect(screen.getByRole('heading', { level: 2, name: 'Thanh toán' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: TITLE })).toBeTruthy()
    // "Ghi khoản thanh toán" (main action) first, then "Quay lại đơn hàng", "Tải lại"; then the buttons of the rows.
    expect(buttonTexts()).toEqual(['Ghi khoản thanh toán', 'Quay lại đơn hàng', 'Tải lại', 'Hủy khoản này', 'Hủy khoản này'])
    expect(balanceEntries()).toEqual([
      ['Giá thỏa thuận', ['1.500.000 VND']],
      ['Đã nhận', ['500.000 VND']],
      ['Còn phải thu', ['1.000.000 VND']],
    ])
    expect(rowTexts()).toEqual([
      'Nhận tiền 500.000 VND · Tiền cọc 08:30 28/09/2026 · Chuyển khoản' + 'Hủy khoản này',
      'Hoàn tiền cho khách 100.000 VND · Khác 09:00 27/09/2026 · MoMo · Nhầm · Đã hủy',
      'Nhận tiền 100.000 VND · Tiền tip 10:00 26/09/2026 · PayPal' + 'Hủy khoản này',
    ])
  })

  it('a voided payment stays in the list, marked "Đã hủy", and has no "Hủy khoản này"', async () => {
    renderWith([LIST_OK])
    await screen.findByLabelText('Số dư đơn hàng')
    const items = within(screen.getByRole('list', { name: 'Danh sách khoản thanh toán' })).getAllByRole('listitem')
    expect(items[1].textContent).toContain('Đã hủy')
    expect(within(items[1]).queryByRole('button')).toBeNull()
    expect(within(items[0]).getByRole('button', { name: 'Hủy khoản này' })).toBeTruthy()
    expect(voidButtons()).toHaveLength(2)
  })

  it('an empty list: the words, and a button "Ghi khoản thanh toán" in the empty state as well as in the row; the balance still shown', async () => {
    const { navigate } = renderWith([EMPTY_OK])
    await screen.findByText('Chưa có khoản thanh toán nào')
    expect(screen.getByLabelText('Số dư đơn hàng')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Danh sách khoản thanh toán' })).toBeNull()
    const record = screen.getAllByRole('button', { name: 'Ghi khoản thanh toán' })
    expect(record).toHaveLength(2)
    fireEvent.click(record[1])
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'payment_form', params: { commission_id: ID, title: TITLE } }, null)
  })

  it('"Ghi khoản thanh toán" opens payment_form with the id and the title; "Quay lại đơn hàng" opens commission_detail', async () => {
    const { navigate } = renderWith([LIST_OK])
    fireEvent.click(await screen.findByRole('button', { name: 'Ghi khoản thanh toán' }))
    expect(navigate).toHaveBeenLastCalledWith({ page: 'payment_form', params: { commission_id: ID, title: TITLE } }, null)
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại đơn hàng' }))
    expect(navigate).toHaveBeenLastCalledWith({ page: 'commission_detail', params: { commission_id: ID } }, null)
  })

  it('the notice handed over by payment_form ("Đã ghi khoản thanh toán.") is shown', async () => {
    renderWith([LIST_OK], [], 'Đã ghi khoản thanh toán.')
    await screen.findByLabelText('Số dư đơn hàng')
    expect(screen.getByRole('status').textContent).toBe('Đã ghi khoản thanh toán.')
  })

  it.each([
    ['get_balance 404', 'ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.'],
    ['get_balance 409 (out of range)', 'ERR_OUT_OF_RANGE', 'Số dư của đơn này vượt giới hạn tính toán.'],
    ['list_for_commission 500', 'ERR_STORAGE_IO', 'Không đọc được dữ liệu thanh toán trên máy.'],
  ])('rejected (%s) → "Không tải được các khoản thanh toán", the message; no balance, no list, no "Ghi khoản thanh toán"; the way back and "Tải lại" stay', async (_, code, message) => {
    const { navigate } = renderWith([rejected(code, message)])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không tải được các khoản thanh toán')
    expect(alert.textContent).toContain(message)
    expect(screen.queryByLabelText('Số dư đơn hàng')).toBeNull()
    expect(buttonTexts()).toEqual(['Quay lại đơn hàng', 'Tải lại'])
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại đơn hàng' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: ID } }, null)
  })

  it('unreachable → the message; "Tải lại" asks Routers again and shows the list', async () => {
    const { loadPaymentList } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, LIST_OK])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain('Không kết nối được tới phần xử lý.')
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(await screen.findByLabelText('Số dư đơn hàng')).toBeTruthy()
    expect(loadPaymentList).toHaveBeenCalledTimes(2)
    expect(loadPaymentList).toHaveBeenLastCalledWith(ID)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('contract_violation → "Có lỗi không mong đợi", never the balance or the list', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(alert.textContent).toContain('Ứng dụng nhận được một phản hồi không mong đợi.')
    expect(screen.queryByLabelText('Số dư đơn hàng')).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ghi khoản thanh toán' })).toBeNull()
  })

  it('"Tải lại" while loading is busy and cannot be pressed twice', async () => {
    const load = pending<[string], Loaded>()
    renderWithLogic(
      <PaymentList params={{ commission_id: ID, title: TITLE }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      fakeRecordPayment({ loadPaymentList: load.fn }),
    )
    const button = screen.getByRole('button', { name: 'Đang tải…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(load.fn).toHaveBeenCalledOnce()
    await act(async () => load.release(LIST_OK))
  })
})

describe('page payment_list: voiding a payment (§7.2, principle 5)', () => {
  it('"Hủy khoản này" asks first, inside the page: Routers is asked with confirmed = false; the words of the consequence; the focus on "Xác nhận"; nothing is voided', async () => {
    const { voidPayment } = renderWith([LIST_OK], [NEEDS])
    await screen.findByLabelText('Số dư đơn hàng')
    expect(panel()).toBeNull()
    fireEvent.click(voidButtons()[0])
    const shown = await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })
    expect(voidPayment).toHaveBeenCalledExactlyOnceWith(P1, false)
    expect(shown.textContent).toContain('Khoản đã hủy không khôi phục được. Số dư sẽ được tính lại không có khoản này.')
    expect(within(shown).getAllByRole('button').map((b) => b.textContent)).toEqual(['Xác nhận', 'Quay lại'])
    await waitFor(() => expect(within(shown).getByRole('button', { name: 'Xác nhận' }).matches(':focus')).toBe(true))
    expect(screen.queryByText('Đã hủy khoản thanh toán.')).toBeNull()
  })

  it('while the question waits, the other "Hủy khoản này" wait too (the question is about one payment)', async () => {
    renderWith([LIST_OK], [NEEDS])
    await screen.findByLabelText('Số dư đơn hàng')
    fireEvent.click(voidButtons()[0])
    await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })
    expect(voidButtons().every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('"Quay lại" closes the question and sends nothing: Routers was asked once (confirmed = false), never with true; the buttons are back', async () => {
    const { voidPayment, loadPaymentList } = renderWith([LIST_OK], [NEEDS])
    await screen.findByLabelText('Số dư đơn hàng')
    fireEvent.click(voidButtons()[0])
    const shown = await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })
    fireEvent.click(within(shown).getByRole('button', { name: 'Quay lại' }))
    expect(panel()).toBeNull()
    expect(voidPayment).toHaveBeenCalledExactlyOnceWith(P1, false)
    expect(loadPaymentList).toHaveBeenCalledOnce()
    expect(voidButtons().every((b) => !(b as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('"Xác nhận" sends exactly once (confirmed = true) for the payment of the question; the buttons are disabled while it runs; then the notice, and the list read again', async () => {
    const voiding = pending<[string, boolean], Voided>()
    const loadPaymentList = answers<[string], Loaded>(LIST_OK, AFTER_VOID)
    const voidPayment = vi.fn<(id: string, confirmed: boolean) => Promise<Voided>>((_id, confirmed) => (confirmed ? voiding.fn(_id, confirmed) : Promise.resolve(NEEDS)))
    renderWithLogic(
      <PaymentList params={{ commission_id: ID, title: TITLE }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      fakeRecordPayment({ loadPaymentList, voidPayment }),
    )
    await screen.findByLabelText('Số dư đơn hàng')
    fireEvent.click(voidButtons()[1])
    const shown = await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })
    fireEvent.click(within(shown).getByRole('button', { name: 'Xác nhận' }))
    // Running: both buttons of the question and every "Hủy khoản này" cannot be pressed; a second press sends nothing.
    const busy = await within(screen.getByRole('group', { name: 'Xác nhận hủy khoản' })).findByRole('button', { name: 'Đang hủy…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    expect((within(screen.getByRole('group', { name: 'Xác nhận hủy khoản' })).getByRole('button', { name: 'Quay lại' }) as HTMLButtonElement).disabled).toBe(true)
    expect(voidButtons().every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    fireEvent.click(busy)
    expect(voiding.fn).toHaveBeenCalledExactlyOnceWith(P3, true)
    await act(async () => voiding.release(VOIDED))
    await waitFor(() => expect(loadPaymentList).toHaveBeenCalledTimes(2))
    expect(voidPayment.mock.calls).toEqual([
      [P3, false],
      [P3, true],
    ])
    // The list is being read again, so more than one status may be on screen: look for the notice among them.
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toContain('Đã hủy khoản thanh toán.')
    await waitFor(() => expect(voidButtons()).toHaveLength(1))
    expect(panel()).toBeNull()
    expect(rowTexts().at(-1)).toContain('Đã hủy')
  })

  it.each([
    ['404', 'ERR_NOT_FOUND', 'Không tìm thấy khoản thanh toán này.'],
    ['409', 'ERR_CONFLICT', 'Khoản này đã được hủy trước đó.'],
  ])('void_payment %s → "Chưa hủy được khoản này" with the message; the list is read again', async (_, code, message) => {
    const { loadPaymentList } = renderWith([LIST_OK, AFTER_VOID], [NEEDS, rejectedVoid(code, message)])
    await screen.findByLabelText('Số dư đơn hàng')
    fireEvent.click(voidButtons()[0])
    fireEvent.click(await within(await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })).findByRole('button', { name: 'Xác nhận' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa hủy được khoản này')
    expect(alert.textContent).toContain(message)
    await waitFor(() => expect(loadPaymentList).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(voidButtons()).toHaveLength(1))
    expect(panel()).toBeNull()
  })

  it.each([
    ['500', rejectedVoid('ERR_STORAGE_IO', 'Không ghi được dữ liệu thanh toán trên máy.'), 'Chưa hủy được khoản này', 'Không ghi được dữ liệu thanh toán trên máy.'],
    ['unreachable', { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' } as Voided, 'Không kết nối được', 'Không kết nối được tới phần xử lý.'],
    ['contract_violation', { kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' } as Voided, 'Có lỗi không mong đợi', 'Ứng dụng nhận được một phản hồi không mong đợi.'],
  ])('void_payment %s → the message; the list stays exactly as it was', async (_, failed, title, message) => {
    const { loadPaymentList } = renderWith([LIST_OK, rejected('ERR_STORAGE_IO', 'la la')], [NEEDS, failed])
    await screen.findByLabelText('Số dư đơn hàng')
    const before = rowTexts()
    fireEvent.click(voidButtons()[0])
    fireEvent.click(await within(await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })).findByRole('button', { name: 'Xác nhận' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(title)
    expect(alert.textContent).toContain(message)
    // A refused voiding (500) reads the list again quietly: its failure changes nothing on screen.
    await act(async () => {})
    expect(rowTexts()).toEqual(before)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByLabelText('Số dư đơn hàng')).toBeTruthy()
    // The buttons are back; the payment can be tried again.
    expect(voidButtons().every((b) => !(b as HTMLButtonElement).disabled)).toBe(true)
    // Only a refusal of the backend (500) reads again; not an unreachable or a violated contract.
    expect(loadPaymentList.mock.calls.length).toBe(_ === '500' ? 2 : 1)
  })

  it('asking again after a result clears the old result', async () => {
    renderWith([LIST_OK, AFTER_VOID], [NEEDS, rejectedVoid('ERR_CONFLICT', 'Khoản này đã được hủy trước đó.'), NEEDS])
    await screen.findByLabelText('Số dư đơn hàng')
    fireEvent.click(voidButtons()[0])
    fireEvent.click(await within(await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })).findByRole('button', { name: 'Xác nhận' }))
    await screen.findByRole('alert')
    await waitFor(() => expect(voidButtons()).toHaveLength(1))
    fireEvent.click(voidButtons()[0])
    await screen.findByRole('group', { name: 'Xác nhận hủy khoản' })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
