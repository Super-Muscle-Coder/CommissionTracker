// @vitest-environment jsdom
//
// Render tests of the page payment_form (i5-screens.md, Step I5.4), with fake
// Routers: the first frame (UI-4); every ViewResult kind of opening
// (openPaymentForm: get_balance) — ok with the form, ok with a currency the
// interface does not support (no form), rejected 404 / 409 / 500, unreachable
// + "Thử lại", contract_violation; the fields in order, the currency of the
// commission shown and not choosable, the hint under "Khoản", the button row
// ("Lưu", "Hủy") before the first field; every ViewResult kind of saving
// (savePayment: ok → payment_list with the notice; rejected input with the
// error at the right field, the draft kept, and the text cursor on the first
// field in error; rejected system 400 / 404 / 409 / 422 / 500; unreachable +
// save again with the same draft; contract_violation; busy while saving).
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentFormDraft, PaymentFormView, SavedPaymentView, ViewResult } from '../../../../logic/workflows/record_payment/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeRecordPayment, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { PaymentForm } from '../PaymentForm'

type Opened = ViewResult<PaymentFormView>
type Saved = ViewResult<SavedPaymentView>

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const TITLE = 'Chân dung bán thân'
const DRAFT: PaymentFormDraft = { direction: 'incoming', paymentKind: '', amount: '', method: '', paidAtLocal: '2026-09-30T14:05', note: '' }
const FORM: Opened = {
  kind: 'ok',
  view: {
    supported: true,
    target: { commissionId: ID, currency: 'USD' },
    currencyText: 'USD',
    directionChoices: [
      { value: 'incoming', label: 'Nhận tiền' },
      { value: 'refund', label: 'Hoàn tiền cho khách' },
    ],
    kindChoices: [
      { value: 'deposit', label: 'Tiền cọc' },
      { value: 'milestone', label: 'Thanh toán theo đợt' },
      { value: 'final', label: 'Thanh toán cuối' },
      { value: 'tip', label: 'Tiền tip' },
      { value: 'other', label: 'Khác' },
    ],
    chooseKindLabel: 'Chọn khoản',
    methodSuggestions: ['Chuyển khoản', 'MoMo', 'PayPal', 'Tiền mặt'],
    draft: DRAFT,
  },
}
const SAVED: Saved = { kind: 'ok', view: { commissionId: ID, message: 'Đã ghi khoản thanh toán.' } }
const rejectedOpen = (code: string, message: string): Opened => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
const rejectedSave = (code: string, message: string): Saved => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
const rejectedInput = (fieldErrors: Record<string, string>): Saved => ({ kind: 'rejected', origin: 'input', code: 'INPUT_FORMAT', message: 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.', fieldErrors })

function renderWith(opens: Opened[], saves: Saved[] = []) {
  const openPaymentForm = answers<[string], Opened>(...opens)
  const savePayment = answers<[{ commissionId: string; currency: string }, PaymentFormDraft], Saved>(...saves)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(
    <PaymentForm params={{ commission_id: ID, title: TITLE }} navigate={navigate} notice={null} />,
    fakeManageClient({}),
    undefined,
    undefined,
    fakeRecordPayment({ openPaymentForm, savePayment }),
  )
  return { openPaymentForm, savePayment, navigate }
}

const field = (label: string) => screen.getByLabelText(label, { exact: true }) as HTMLInputElement
const errorOf = (label: string): string | null => {
  const id = field(label).getAttribute('aria-describedby')
  if (id === null) return null
  // The describedby of "Khoản" may also point at its hint: the error is the last one named.
  const last = id.split(' ').at(-1) as string
  return field(label).ownerDocument.getElementById(last)?.textContent ?? null
}
const isFocused = (el: Element) => el.matches(':focus')
const buttonTexts = () => screen.getAllByRole('button').map((b) => b.textContent)
const type = (label: string, value: string) => fireEvent.change(field(label), { target: { value } })

afterEach(() => {
  cleanup()
})

describe('page payment_form: opening', () => {
  it('first frame, before Routers answers: loading shown, no field and no button (UI-4)', async () => {
    const load = pending<[string], Opened>()
    const first = renderFirstCommit(
      <PaymentForm params={{ commission_id: ID, title: TITLE }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      fakeRecordPayment({ openPaymentForm: load.fn }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang mở thông tin đơn hàng…'])
    expect(first.enabledButtons).toEqual([])
    expect(screen.queryByLabelText('Số tiền')).toBeNull()
    await act(async () => load.release(FORM))
    expect(await screen.findByLabelText('Số tiền')).toBeTruthy()
  })

  it('ok: Routers asked with the id; the titles; the button row ("Lưu" first, "Hủy") before the first field; the six fields in order', async () => {
    const { openPaymentForm } = renderWith([FORM])
    await screen.findByLabelText('Số tiền')
    expect(openPaymentForm).toHaveBeenCalledExactlyOnceWith(ID)
    expect(screen.getByRole('heading', { level: 2, name: 'Ghi khoản thanh toán' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: TITLE })).toBeTruthy()
    expect(buttonTexts()).toEqual(['Lưu', 'Hủy'])
    const save = screen.getByRole('button', { name: 'Lưu' })
    const first = field('Loại giao dịch')
    expect(save.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const order = ['Loại giao dịch', 'Khoản', 'Số tiền', 'Đơn vị tiền', 'Phương thức', 'Ngày giờ nhận tiền', 'Ghi chú'].map(field)
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('the defaults of the view: "Nhận tiền", nothing chosen in "Khoản" ("Chọn khoản" first), the default date and time; the choices in order', async () => {
    renderWith([FORM])
    await screen.findByLabelText('Số tiền')
    expect(field('Loại giao dịch').value).toBe('incoming')
    expect([...field('Loại giao dịch').querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Nhận tiền', 'Hoàn tiền cho khách'])
    expect(field('Khoản').value).toBe('')
    expect([...field('Khoản').querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      'Chọn khoản',
      'Tiền cọc',
      'Thanh toán theo đợt',
      'Thanh toán cuối',
      'Tiền tip',
      'Khác',
    ])
    expect(field('Số tiền').value).toBe('')
    expect(field('Ngày giờ nhận tiền').value).toBe('2026-09-30T14:05')
    expect(field('Ngày giờ nhận tiền').type).toBe('datetime-local')
    expect(field('Ghi chú').value).toBe('')
  })

  it('a line of help under "Khoản": "Tiền tip không làm giảm số còn phải thu.", tied to the select', async () => {
    renderWith([FORM])
    await screen.findByLabelText('Số tiền')
    const hint = screen.getByText('Tiền tip không làm giảm số còn phải thu.')
    expect(field('Khoản').getAttribute('aria-describedby')).toBe(hint.id)
    // Right under the select.
    expect(field('Khoản').compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the currency of the commission is shown next to the amount and cannot be chosen', async () => {
    renderWith([FORM])
    await screen.findByLabelText('Số tiền')
    const currency = field('Đơn vị tiền')
    expect(currency.value).toBe('USD')
    expect((currency as unknown as HTMLSelectElement).disabled).toBe(true)
    expect([...currency.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['USD'])
  })

  it('the method offers the suggestions (a datalist), and is free text', async () => {
    renderWith([FORM])
    await screen.findByLabelText('Số tiền')
    const listId = field('Phương thức').getAttribute('list')
    expect(listId).not.toBeNull()
    const options = [...(field('Phương thức').ownerDocument.getElementById(listId as string)?.querySelectorAll('option') ?? [])].map((o) => o.getAttribute('value'))
    expect(options).toEqual(['Chuyển khoản', 'MoMo', 'PayPal', 'Tiền mặt'])
  })

  it('a currency the interface does not know: no form, the words, only the way back; Routers is not asked to save', async () => {
    const { navigate, savePayment } = renderWith([{ kind: 'ok', view: { supported: false, unsupportedText: 'Đơn vị tiền EUR chưa được hỗ trợ ở giao diện.' } }])
    await screen.findByText('Đơn vị tiền EUR chưa được hỗ trợ ở giao diện.')
    expect(screen.queryByLabelText('Số tiền')).toBeNull()
    expect(buttonTexts()).toEqual(['Quay lại'])
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'payment_list', params: { commission_id: ID, title: TITLE } }, null)
    expect(savePayment).not.toHaveBeenCalled()
  })

  it.each([
    ['get_balance 404', 'ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.'],
    ['get_balance 409 (out of range)', 'ERR_OUT_OF_RANGE', 'Số dư của đơn này vượt giới hạn tính toán.'],
    ['get_balance 500', 'ERR_STORAGE_IO', 'Không đọc được dữ liệu thanh toán trên máy.'],
  ])('rejected (%s) → "Không mở được đơn hàng", the message, no form, and the way back', async (_, code, message) => {
    const { navigate } = renderWith([rejectedOpen(code, message)])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không mở được đơn hàng')
    expect(alert.textContent).toContain(message)
    expect(screen.queryByLabelText('Số tiền')).toBeNull()
    expect(buttonTexts()).toEqual(['Quay lại'])
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'payment_list', params: { commission_id: ID, title: TITLE } }, null)
  })

  it('unreachable → the message; "Thử lại" opens again and shows the form', async () => {
    const { openPaymentForm } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, FORM])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain('Không kết nối được tới phần xử lý.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByLabelText('Số tiền')).toBeTruthy()
    expect(openPaymentForm).toHaveBeenCalledTimes(2)
  })

  it('contract_violation → "Có lỗi không mong đợi", never the form', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByLabelText('Số tiền')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
  })

  it('"Hủy" goes back to payment_list with the id and the title, and no notice', async () => {
    const { navigate } = renderWith([FORM])
    fireEvent.click(await screen.findByRole('button', { name: 'Hủy' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'payment_list', params: { commission_id: ID, title: TITLE } }, null)
  })
})

// Fill the form the way a person would.
function fill() {
  type('Loại giao dịch', 'refund')
  type('Khoản', 'tip')
  type('Số tiền', '12,50')
  type('Phương thức', 'PayPal')
  type('Ngày giờ nhận tiền', '2026-09-28T08:30')
  type('Ghi chú', 'Đợt hai')
}
const TYPED: PaymentFormDraft = { direction: 'refund', paymentKind: 'tip', amount: '12,50', method: 'PayPal', paidAtLocal: '2026-09-28T08:30', note: 'Đợt hai' }

describe('page payment_form: saving', () => {
  it('"Lưu" sends the draft exactly as typed (raw), with the target of the opened form; ok → payment_list with the notice', async () => {
    const { savePayment, navigate } = renderWith([FORM], [SAVED])
    await screen.findByLabelText('Số tiền')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce())
    expect(savePayment).toHaveBeenCalledExactlyOnceWith({ commissionId: ID, currency: 'USD' }, TYPED)
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'payment_list', params: { commission_id: ID, title: TITLE } }, 'Đã ghi khoản thanh toán.')
  })

  it('rejected input: the error under the right fields, the draft kept as typed, the summary above; the text cursor on the first field in error', async () => {
    renderWith([FORM], [rejectedInput({ kind: 'Chọn khoản thanh toán.', 'amount.amount_minor': 'Số tiền phải lớn hơn 0.', method: 'Nhập phương thức thanh toán.' })])
    await screen.findByLabelText('Số tiền')
    type('Số tiền', '0')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain('Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.')
    expect(errorOf('Khoản')).toBe('Chọn khoản thanh toán.')
    expect(errorOf('Số tiền')).toBe('Số tiền phải lớn hơn 0.')
    expect(errorOf('Phương thức')).toBe('Nhập phương thức thanh toán.')
    expect(errorOf('Loại giao dịch')).toBeNull()
    expect(errorOf('Ngày giờ nhận tiền')).toBeNull()
    expect(field('Số tiền').value).toBe('0')
    // The first field in the order on the screen: "Khoản".
    await waitFor(() => expect(isFocused(field('Khoản'))).toBe(true))
  })

  it.each([
    [{ 'amount.amount_minor': 'Số tiền không hợp lệ.' }, 'Số tiền'],
    [{ method: 'Nhập phương thức thanh toán.' }, 'Phương thức'],
    [{ paid_at: 'Chọn ngày giờ nhận tiền.' }, 'Ngày giờ nhận tiền'],
    [{ direction: 'Chọn loại giao dịch.', kind: 'Chọn khoản thanh toán.' }, 'Loại giao dịch'],
  ])('the text cursor goes to the first field in error: %j → %s', async (errors, label) => {
    renderWith([FORM], [rejectedInput(errors)])
    await screen.findByLabelText('Số tiền')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    await screen.findByRole('alert')
    await waitFor(() => expect(isFocused(field(label))).toBe(true))
  })

  it('a second rejection moves the text cursor back to the field in error', async () => {
    renderWith([FORM], [rejectedInput({ 'amount.amount_minor': 'Số tiền không hợp lệ.' }), rejectedInput({ 'amount.amount_minor': 'Số tiền không hợp lệ.' })])
    await screen.findByLabelText('Số tiền')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(isFocused(field('Số tiền'))).toBe(true))
    field('Ghi chú').focus()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(isFocused(field('Số tiền'))).toBe(true))
  })

  it.each([
    ['400', 'ERR_VALIDATION', 'Máy chủ không nhận dữ liệu này. Vui lòng kiểm tra lại các ô rồi lưu lại.'],
    ['404', 'ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.'],
    ['409 (out of range)', 'ERR_OUT_OF_RANGE', 'Không ghi được: với khoản này, số dư của đơn vượt giới hạn tính toán.'],
    ['422 (currency mismatch)', 'ERR_CURRENCY_MISMATCH', 'Đơn vị tiền không khớp với đơn hàng.'],
    ['500', 'ERR_STORAGE_IO', 'Không ghi được dữ liệu thanh toán trên máy.'],
  ])('rejected system (%s) → "Chưa lưu được" with the message; the draft kept; no field has the text cursor; no navigation', async (_, code, message) => {
    const { navigate } = renderWith([FORM], [rejectedSave(code, message)])
    await screen.findByLabelText('Số tiền')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain(message)
    expect(field('Số tiền').value).toBe('12,50')
    expect(field('Phương thức').value).toBe('PayPal')
    expect(field('Khoản').value).toBe('tip')
    expect(field('Ghi chú').value).toBe('Đợt hai')
    expect(navigate).not.toHaveBeenCalled()
    await act(async () => {})
    expect(isFocused(field('Số tiền'))).toBe(false)
    expect(errorOf('Số tiền')).toBeNull()
  })

  it('unreachable → the message, the draft kept; "Lưu" sends the very same draft again', async () => {
    const { savePayment, navigate } = renderWith([FORM], [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, SAVED])
    await screen.findByLabelText('Số tiền')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain('Không kết nối được tới phần xử lý.')
    expect(field('Số tiền').value).toBe('12,50')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce())
    expect(savePayment).toHaveBeenCalledTimes(2)
    expect(savePayment.mock.calls[1]).toEqual(savePayment.mock.calls[0])
    expect(savePayment.mock.calls[1][1]).toEqual(TYPED)
  })

  it('contract_violation → "Có lỗi không mong đợi", never as if saved; the draft kept; no navigation', async () => {
    const { navigate } = renderWith([FORM], [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    await screen.findByLabelText('Số tiền')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByText('Đã ghi khoản thanh toán.')).toBeNull()
    expect(field('Số tiền').value).toBe('12,50')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('while saving: "Lưu" is busy and every field disabled; a second press sends nothing', async () => {
    const saving = pending<[{ commissionId: string; currency: string }, PaymentFormDraft], Saved>()
    renderWithLogic(
      <PaymentForm params={{ commission_id: ID, title: TITLE }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      fakeRecordPayment({ openPaymentForm: answers<[string], Opened>(FORM), savePayment: saving.fn }),
    )
    await screen.findByLabelText('Số tiền')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const busy = await screen.findByRole('button', { name: 'Đang lưu…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    for (const label of ['Loại giao dịch', 'Khoản', 'Số tiền', 'Phương thức', 'Ngày giờ nhận tiền', 'Ghi chú']) {
      expect((field(label) as HTMLInputElement).disabled).toBe(true)
    }
    fireEvent.click(busy)
    expect(saving.fn).toHaveBeenCalledOnce()
    await act(async () => saving.release(rejectedSave('ERR_STORAGE_IO', 'x')))
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
