// @vitest-environment jsdom
//
// Render tests of the page commission_form (i5-screens.md, Step I5.4), with
// fake Routers:
//   openCommissionForm — first frame (UI-4); create: empty, clients with the
//     "Chọn khách hàng" first choice, currencies with VND chosen; no active
//     client: the empty state and "Thêm khách hàng"; edit: filled in, the
//     currency not choosable, an archived client offered "(đã lưu trữ)";
//     rejected 404 / 500 of each call, unreachable + retry, contract_violation;
//   saveCommission — ok in both modes → commission_detail with the notice;
//     rejected input: errors at the fields, the draft kept, the cursor in the
//     first field in error (the client; the amount alone); rejected system
//     400 / 404 / 409 / 500 (clients offered again after it); unreachable,
//     then saving again; contract_violation; busy "Lưu".
// Plus: the button row under the title, where "Hủy" goes, the deadline field
// and its clear button, the kind-of-artwork suggestions.
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ClientChoicesView,
  CommissionFormDraft,
  CommissionFormTarget,
  CommissionFormView,
  SavedCommissionView,
  ViewResult,
} from '../../../../logic/workflows/manage_commission/routers'
import type { Navigate, PageParams } from '../../../navigation'
import { answers, fakeManageClient, fakeManageCommission, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { CommissionForm } from '../CommissionForm'

type Opened = ViewResult<CommissionFormView>
type Saved = ViewResult<SavedCommissionView>
type Reloaded = ViewResult<ClientChoicesView>

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const AN = '00000000-0000-4000-8000-000000000001'
const ANH = '00000000-0000-4000-8000-000000000002'
const HA = '00000000-0000-4000-8000-000000000003'
const SUGGESTIONS = ['bán thân', 'toàn thân', 'chibi', 'chân dung', 'minh họa']
const EMPTY_DRAFT: CommissionFormDraft = { clientId: '', title: '', commissionType: '', amount: '', currency: 'VND', deadline: '', description: '', referenceLinks: '' }
const CREATE_VIEW: CommissionFormView = {
  currencies: [
    { value: 'VND', label: 'VND' },
    { value: 'USD', label: 'USD' },
  ],
  currencyLocked: false,
  chooseClientLabel: 'Chọn khách hàng',
  clients: {
    choices: [
      { value: AN, label: 'An' },
      { value: ANH, label: 'Ánh' },
    ],
    clientId: '',
  },
  noActiveClient: false,
  keptClientId: null,
  commissionTypeSuggestions: SUGGESTIONS,
  draft: EMPTY_DRAFT,
}
const STORED_DRAFT: CommissionFormDraft = {
  clientId: HA,
  title: 'Chân dung bán thân',
  commissionType: 'bán thân',
  amount: '12,50',
  currency: 'USD',
  deadline: '2026-10-15',
  description: 'Nền xanh',
  referenceLinks: 'https://example.com/a\nhttps://example.com/b',
}
const EDIT_VIEW: CommissionFormView = {
  currencies: [{ value: 'USD', label: 'USD' }],
  currencyLocked: true,
  chooseClientLabel: 'Chọn khách hàng',
  clients: {
    choices: [
      { value: HA, label: 'Hà (đã lưu trữ)' },
      { value: AN, label: 'An' },
      { value: ANH, label: 'Ánh' },
    ],
    clientId: HA,
  },
  noActiveClient: false,
  keptClientId: HA,
  commissionTypeSuggestions: SUGGESTIONS,
  draft: STORED_DRAFT,
}
const CREATE: PageParams['commission_form'] = { mode: 'create' }
const EDIT: PageParams['commission_form'] = { mode: 'edit', commission_id: CID }
const rejected = (code: string, message: string) => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} }) as const
const inputRejected = (fieldErrors: Record<string, string>): Saved => ({ kind: 'rejected', origin: 'input', code: 'INPUT_FORMAT', message: 'Một số ô chưa đúng định dạng.', fieldErrors })

function renderWith(params: PageParams['commission_form'], opened: Opened[], saves: Saved[] = [], reloads: Reloaded[] = []) {
  const openCommissionForm = answers<[CommissionFormTarget], Opened>(...opened)
  const saveCommission = answers<[CommissionFormTarget, CommissionFormDraft], Saved>(...saves)
  const reloadClientChoices = answers<[string | null, string], Reloaded>(...reloads)
  const navigate = vi.fn<Navigate>()
  const { container } = renderWithLogic(
    <CommissionForm params={params} navigate={navigate} notice={null} />,
    fakeManageClient({}),
    fakeManageCommission({ openCommissionForm, saveCommission, reloadClientChoices }),
  )
  return { openCommissionForm, saveCommission, reloadClientChoices, navigate, container }
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement
const type = (label: string, value: string) => fireEvent.change(field(label), { target: { value } })
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const optionTexts = (label: string) => [...select(label).options].map((o) => o.textContent)
const isFocused = (el: Element) => el.matches(':focus')
const errorOf = (label: string) => {
  const input = field(label)
  const id = input.getAttribute('aria-describedby')
  return id === null ? null : (input.ownerDocument.getElementById(id)?.textContent ?? null)
}
const FIELD_LABELS = ['Khách hàng', 'Tiêu đề', 'Loại tranh', 'Giá thỏa thuận', 'Đơn vị tiền', 'Hạn giao', 'Mô tả', 'Liên kết tham khảo (mỗi dòng một liên kết)']
// a comes before b in document order.
const before = (a: Element, b: Element) => (a.compareDocumentPosition(b) & a.DOCUMENT_POSITION_FOLLOWING) !== 0

afterEach(() => {
  cleanup()
})

describe('page commission_form — opening (openCommissionForm)', () => {
  it.each([
    ['create', CREATE],
    ['edit', EDIT],
  ] as const)('first frame (%s), before Routers answers: opening shown, no field, no button can be pressed (UI-4)', async (_mode, params) => {
    const open = pending<[CommissionFormTarget], Opened>()
    const first = renderFirstCommit(<CommissionForm params={params} navigate={vi.fn()} notice={null} />, fakeManageClient({}), fakeManageCommission({ openCommissionForm: open.fn }))
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang mở thông tin đơn hàng…'])
    expect(first.enabledButtons).toEqual([])
    expect(screen.queryByLabelText('Tiêu đề')).toBeNull()
    await act(async () => open.release({ kind: 'ok', view: params.mode === 'edit' ? EDIT_VIEW : CREATE_VIEW }))
    expect(await screen.findByLabelText('Tiêu đề')).toBeTruthy()
  })

  it('create: title "Thêm đơn hàng"; the seven fields in order; clients with "Chọn khách hàng" first; VND chosen and choosable', async () => {
    const { openCommissionForm, container } = renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }])
    expect(await screen.findByLabelText('Tiêu đề')).toBeTruthy()
    expect(openCommissionForm).toHaveBeenCalledExactlyOnceWith({ mode: 'create' })
    expect(screen.getByRole('heading', { level: 2, name: 'Thêm đơn hàng' })).toBeTruthy()
    const labels = [...container.querySelectorAll('label')].map((l) => l.textContent)
    expect(labels).toEqual(['Khách hàng', 'Tiêu đề', 'Loại tranh', 'Giá thỏa thuận', 'Đơn vị tiền', 'Hạn giao', 'Mô tả', 'Liên kết tham khảo (mỗi dòng một liên kết)'])
    expect(optionTexts('Khách hàng')).toEqual(['Chọn khách hàng', 'An', 'Ánh'])
    expect(select('Khách hàng').value).toBe('')
    expect(optionTexts('Đơn vị tiền')).toEqual(['VND', 'USD'])
    expect(select('Đơn vị tiền').value).toBe('VND')
    expect(select('Đơn vị tiền').disabled).toBe(false)
    expect(field('Hạn giao').type).toBe('date')
    expect(field('Hạn giao').value).toBe('')
    // No date: nothing to clear.
    expect(screen.queryByRole('button', { name: 'Xóa hạn giao' })).toBeNull()
  })

  it('the button row right under the title: "Lưu" (main action) then "Hủy", before the first field', async () => {
    renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }])
    await screen.findByLabelText('Tiêu đề')
    const buttons = screen.getAllByRole('button')
    expect(buttons.slice(0, 2).map((b) => b.textContent)).toEqual(['Lưu', 'Hủy'])
    expect(before(screen.getByRole('heading', { level: 2 }), buttons[0])).toBe(true)
    expect(before(buttons[1], select('Khách hàng'))).toBe(true)
  })

  it('"Loại tranh" offers the suggestions', async () => {
    const { container } = renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }])
    await screen.findByLabelText('Loại tranh')
    const list = container.querySelector(`datalist#${field('Loại tranh').getAttribute('list')}`)
    expect([...(list as HTMLElement).querySelectorAll('option')].map((o) => o.value)).toEqual(SUGGESTIONS)
  })

  it('create with no active client: the empty state and "Thêm khách hàng" (opens client_form create) instead of the form', async () => {
    const { navigate } = renderWith(CREATE, [{ kind: 'ok', view: { ...CREATE_VIEW, noActiveClient: true, clients: { choices: [], clientId: '' } } }])
    expect(await screen.findByText('Chưa có khách hàng đang hoạt động. Thêm khách hàng trước khi tạo đơn.')).toBeTruthy()
    expect(screen.queryByLabelText('Tiêu đề')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
    press('Thêm khách hàng')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_form', params: { mode: 'create' } }, null)
    press('Hủy')
    expect(navigate).toHaveBeenLastCalledWith({ page: 'commission_list', params: null }, null)
  })

  it('edit: title "Sửa đơn hàng", Routers asked with the id, every field filled in; the archived client offered and chosen', async () => {
    const { openCommissionForm } = renderWith(EDIT, [{ kind: 'ok', view: EDIT_VIEW }])
    expect(await screen.findByDisplayValue('Chân dung bán thân')).toBeTruthy()
    expect(openCommissionForm).toHaveBeenCalledExactlyOnceWith({ mode: 'edit', commissionId: CID })
    expect(screen.getByRole('heading', { level: 2, name: 'Sửa đơn hàng' })).toBeTruthy()
    expect(optionTexts('Khách hàng')).toEqual(['Chọn khách hàng', 'Hà (đã lưu trữ)', 'An', 'Ánh'])
    expect(select('Khách hàng').value).toBe(HA)
    expect(select('Khách hàng').selectedOptions[0].textContent).toBe('Hà (đã lưu trữ)')
    expect(field('Loại tranh').value).toBe('bán thân')
    expect(field('Giá thỏa thuận').value).toBe('12,50')
    expect(field('Hạn giao').value).toBe('2026-10-15')
    expect(field('Mô tả').value).toBe('Nền xanh')
    expect(field('Liên kết tham khảo (mỗi dòng một liên kết)').value).toBe('https://example.com/a\nhttps://example.com/b')
  })

  it('edit: the currency cannot be chosen — shown, disabled, only the stored one', async () => {
    renderWith(EDIT, [{ kind: 'ok', view: EDIT_VIEW }])
    await screen.findByDisplayValue('Chân dung bán thân')
    expect(select('Đơn vị tiền').disabled).toBe(true)
    expect(optionTexts('Đơn vị tiền')).toEqual(['USD'])
    expect(select('Đơn vị tiền').value).toBe('USD')
  })

  it.each([
    ['get_commission 404', 'ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.'],
    ['get_commission 500', 'ERR_STORAGE_IO', 'Không đọc được dữ liệu đơn hàng trên máy.'],
    ['list_clients 500', 'ERR_STORAGE_IO', 'Không đọc được danh sách khách hàng trên máy.'],
  ])('edit, rejected (%s) → "Không mở được đơn hàng", the message, no form; "Hủy" back to the detail', async (_, code, message) => {
    const { navigate } = renderWith(EDIT, [rejected(code, message)])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không mở được đơn hàng')
    expect(alert.textContent).toContain(message)
    expect(screen.queryByLabelText('Tiêu đề')).toBeNull()
    press('Hủy')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: CID } }, null)
  })

  it('create, rejected (list_clients 500) → the message; "Hủy" back to the list', async () => {
    const { navigate } = renderWith(CREATE, [rejected('ERR_STORAGE_IO', 'Không đọc được danh sách khách hàng trên máy.')])
    expect((await screen.findByRole('alert')).textContent).toContain('Không đọc được danh sách khách hàng trên máy.')
    press('Hủy')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_list', params: null }, null)
  })

  it('unreachable → the message; "Thử lại" asks Routers again and shows the form', async () => {
    const { openCommissionForm } = renderWith(CREATE, [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, { kind: 'ok', view: CREATE_VIEW }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    press('Thử lại')
    expect(await screen.findByLabelText('Tiêu đề')).toBeTruthy()
    expect(openCommissionForm).toHaveBeenCalledTimes(2)
  })

  it('contract_violation → "Có lỗi không mong đợi", no form', async () => {
    renderWith(EDIT, [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByLabelText('Tiêu đề')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
  })
})

describe('page commission_form — the draft', () => {
  it('every field is sent to Routers exactly as typed or chosen', async () => {
    const { saveCommission } = renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }], [{ kind: 'ok', view: { commissionId: CID, message: 'Đã thêm đơn hàng.' } }])
    await screen.findByLabelText('Tiêu đề')
    fireEvent.change(select('Khách hàng'), { target: { value: ANH } })
    type('Tiêu đề', '  Chibi đôi ')
    type('Loại tranh', 'chibi')
    type('Giá thỏa thuận', '1.250,5')
    fireEvent.change(select('Đơn vị tiền'), { target: { value: 'USD' } })
    type('Hạn giao', '2026-12-24')
    type('Mô tả', 'Hai nhân vật')
    type('Liên kết tham khảo (mỗi dòng một liên kết)', 'https://a.example\n\nhttps://b.example')
    press('Lưu')
    await waitFor(() => expect(saveCommission).toHaveBeenCalledOnce())
    expect(saveCommission).toHaveBeenCalledWith(
      { mode: 'create' },
      {
        clientId: ANH,
        title: '  Chibi đôi ',
        commissionType: 'chibi',
        amount: '1.250,5',
        currency: 'USD',
        deadline: '2026-12-24',
        description: 'Hai nhân vật',
        referenceLinks: 'https://a.example\n\nhttps://b.example',
      },
    )
  })

  it('"Xóa hạn giao" empties the deadline (back to no deadline), and disappears', async () => {
    renderWith(EDIT, [{ kind: 'ok', view: EDIT_VIEW }])
    await screen.findByDisplayValue('Chân dung bán thân')
    press('Xóa hạn giao')
    expect(field('Hạn giao').value).toBe('')
    expect(screen.queryByRole('button', { name: 'Xóa hạn giao' })).toBeNull()
  })

  it('"Hủy": create → commission_list; edit → commission_detail', async () => {
    const created = renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }])
    await screen.findByLabelText('Tiêu đề')
    press('Hủy')
    expect(created.navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_list', params: null }, null)
    cleanup()
    const edited = renderWith(EDIT, [{ kind: 'ok', view: EDIT_VIEW }])
    await screen.findByDisplayValue('Chân dung bán thân')
    press('Hủy')
    expect(edited.navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: CID } }, null)
  })
})

describe('page commission_form — saving (saveCommission)', () => {
  it('create ok → commission_detail of the new commission, with "Đã thêm đơn hàng."', async () => {
    const { navigate } = renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }], [{ kind: 'ok', view: { commissionId: CID, message: 'Đã thêm đơn hàng.' } }])
    await screen.findByLabelText('Tiêu đề')
    press('Lưu')
    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: CID } }, 'Đã thêm đơn hàng.'))
  })

  it('edit ok → commission_detail with "Đã lưu thay đổi."; the untouched draft (old currency) is what was sent', async () => {
    const { navigate, saveCommission } = renderWith(EDIT, [{ kind: 'ok', view: EDIT_VIEW }], [{ kind: 'ok', view: { commissionId: CID, message: 'Đã lưu thay đổi.' } }])
    await screen.findByDisplayValue('Chân dung bán thân')
    press('Lưu')
    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: CID } }, 'Đã lưu thay đổi.'))
    expect(saveCommission).toHaveBeenCalledExactlyOnceWith({ mode: 'edit', commissionId: CID }, STORED_DRAFT)
  })

  it('rejected input: summary under the buttons, each message at its field, the draft kept, the cursor in "Khách hàng" (first in error)', async () => {
    const { reloadClientChoices } = renderWith(
      CREATE,
      [{ kind: 'ok', view: CREATE_VIEW }],
      [inputRejected({ client_id: 'Chọn khách hàng.', title: 'Nhập tiêu đề đơn hàng.', 'agreed_price.amount_minor': 'Số tiền không hợp lệ.' })],
    )
    await screen.findByLabelText('Tiêu đề')
    type('Tiêu đề', '   ')
    type('Giá thỏa thuận', '1,5')
    type('Mô tả', 'giữ nguyên')
    press('Lưu')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain('Một số ô chưa đúng định dạng.')
    expect(before(screen.getByRole('button', { name: 'Hủy' }), alert)).toBe(true)
    expect(before(alert, select('Khách hàng'))).toBe(true)
    expect(errorOf('Khách hàng')).toBe('Chọn khách hàng.')
    expect(errorOf('Tiêu đề')).toBe('Nhập tiêu đề đơn hàng.')
    expect(errorOf('Giá thỏa thuận')).toBe('Số tiền không hợp lệ.')
    expect(errorOf('Mô tả')).toBeNull()
    expect(field('Tiêu đề').value).toBe('   ')
    expect(field('Giá thỏa thuận').value).toBe('1,5')
    expect(field('Mô tả').value).toBe('giữ nguyên')
    await waitFor(() => expect(isFocused(select('Khách hàng'))).toBe(true))
    // A rejection of the input is not the backend's: the clients are not reloaded.
    expect(reloadClientChoices).not.toHaveBeenCalled()
  })

  it('rejected input on the amount only: the cursor goes to "Giá thỏa thuận"', async () => {
    renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }], [inputRejected({ 'agreed_price.amount_minor': 'Số tiền quá lớn.' })])
    await screen.findByLabelText('Tiêu đề')
    fireEvent.change(select('Khách hàng'), { target: { value: AN } })
    type('Tiêu đề', 'Chân dung')
    type('Giá thỏa thuận', '99999999999999999999')
    press('Lưu')
    await screen.findByRole('alert')
    expect(errorOf('Giá thỏa thuận')).toBe('Số tiền quá lớn.')
    await waitFor(() => expect(isFocused(field('Giá thỏa thuận'))).toBe(true))
    expect(isFocused(select('Khách hàng'))).toBe(false)
    expect(select('Khách hàng').value).toBe(AN)
  })

  it('rejected input on the deadline: the message at "Hạn giao", the cursor there', async () => {
    renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }], [inputRejected({ deadline: 'Chọn một ngày hợp lệ, hoặc xóa hạn giao.' })])
    await screen.findByLabelText('Tiêu đề')
    press('Lưu')
    await screen.findByRole('alert')
    expect(errorOf('Hạn giao')).toBe('Chọn một ngày hợp lệ, hoặc xóa hạn giao.')
    await waitFor(() => expect(isFocused(field('Hạn giao'))).toBe(true))
  })

  it.each([
    ['400', 'ERR_VALIDATION', 'Máy chủ không nhận dữ liệu này. Vui lòng kiểm tra lại các ô rồi lưu lại.'],
    ['404', 'ERR_NOT_FOUND', 'Không tìm thấy khách hàng đã chọn. Hãy chọn lại.'],
    ['409', 'ERR_CONFLICT', 'Khách hàng đã chọn đã được lưu trữ. Hãy chọn khách khác.'],
    ['500', 'ERR_STORAGE_IO', 'Không ghi được dữ liệu đơn hàng trên máy.'],
  ])('create, rejected system %s → the message, the draft kept, no field focused; the clients are offered again', async (_, code, message) => {
    const reload: Reloaded = { kind: 'ok', view: { choices: [{ value: ANH, label: 'Ánh' }], clientId: '' } }
    const { reloadClientChoices } = renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }], [rejected(code, message)], [reload])
    await screen.findByLabelText('Tiêu đề')
    fireEvent.change(select('Khách hàng'), { target: { value: AN } })
    type('Tiêu đề', 'Chân dung')
    press('Lưu')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain(message)
    await waitFor(() => expect(reloadClientChoices).toHaveBeenCalledExactlyOnceWith(null, AN))
    // The reloaded clients: An is no longer offered, so nothing is chosen.
    await waitFor(() => expect(optionTexts('Khách hàng')).toEqual(['Chọn khách hàng', 'Ánh']))
    expect(select('Khách hàng').value).toBe('')
    expect(field('Tiêu đề').value).toBe('Chân dung')
    // A system rejection has no field error: no field gets the cursor.
    await act(async () => {})
    expect(FIELD_LABELS.filter((l) => isFocused(field(l)))).toEqual([])
  })

  it('edit, rejected 404 → "Không tìm thấy đơn hàng hoặc khách hàng đã chọn."; the reload keeps the commission\'s own client', async () => {
    const { reloadClientChoices } = renderWith(EDIT, [{ kind: 'ok', view: EDIT_VIEW }], [rejected('ERR_NOT_FOUND', 'Không tìm thấy đơn hàng hoặc khách hàng đã chọn.')], [{ kind: 'ok', view: EDIT_VIEW.clients }])
    await screen.findByDisplayValue('Chân dung bán thân')
    press('Lưu')
    expect((await screen.findByRole('alert')).textContent).toContain('Không tìm thấy đơn hàng hoặc khách hàng đã chọn.')
    await waitFor(() => expect(reloadClientChoices).toHaveBeenCalledExactlyOnceWith(HA, HA))
    expect(select('Khách hàng').value).toBe(HA)
  })

  it('the clients cannot be offered again (unreachable) → said in its own alert; the draft kept', async () => {
    renderWith(
      CREATE,
      [{ kind: 'ok', view: CREATE_VIEW }],
      [rejected('ERR_CONFLICT', 'Khách hàng đã chọn đã được lưu trữ. Hãy chọn khách khác.')],
      [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }],
    )
    await screen.findByLabelText('Tiêu đề')
    fireEvent.change(select('Khách hàng'), { target: { value: AN } })
    press('Lưu')
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2))
    const [save, reload] = screen.getAllByRole('alert')
    expect(save.textContent).toContain('Khách hàng đã chọn đã được lưu trữ.')
    expect(reload.textContent).toContain('Không tải lại được danh sách khách hàng')
    expect(reload.textContent).toContain('Không kết nối được tới phần xử lý.')
    expect(select('Khách hàng').value).toBe(AN)
  })

  it('unreachable → the message, the draft kept; "Lưu" again sends the same draft', async () => {
    const { saveCommission, navigate } = renderWith(
      CREATE,
      [{ kind: 'ok', view: CREATE_VIEW }],
      [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, { kind: 'ok', view: { commissionId: CID, message: 'Đã thêm đơn hàng.' } }],
    )
    await screen.findByLabelText('Tiêu đề')
    fireEvent.change(select('Khách hàng'), { target: { value: AN } })
    type('Tiêu đề', 'Chân dung')
    type('Giá thỏa thuận', '500.000')
    press('Lưu')
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được')
    expect(field('Tiêu đề').value).toBe('Chân dung')
    press('Lưu')
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce())
    expect(saveCommission).toHaveBeenCalledTimes(2)
    expect(saveCommission.mock.calls[1]).toEqual(saveCommission.mock.calls[0])
  })

  it('contract_violation → "Có lỗi không mong đợi", never a navigation', async () => {
    const { navigate } = renderWith(CREATE, [{ kind: 'ok', view: CREATE_VIEW }], [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    await screen.findByLabelText('Tiêu đề')
    press('Lưu')
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('while saving: "Lưu" is busy and every field disabled; a second press does not call Routers again', async () => {
    const save = pending<[CommissionFormTarget, CommissionFormDraft], Saved>()
    renderWithLogic(
      <CommissionForm params={CREATE} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      fakeManageCommission({ openCommissionForm: answers<[CommissionFormTarget], Opened>({ kind: 'ok', view: CREATE_VIEW }), saveCommission: save.fn }),
    )
    await screen.findByLabelText('Tiêu đề')
    press('Lưu')
    const busy = await screen.findByRole('button', { name: 'Đang lưu…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    expect(field('Tiêu đề').disabled).toBe(true)
    expect(select('Khách hàng').disabled).toBe(true)
    fireEvent.click(busy)
    expect(save.fn).toHaveBeenCalledOnce()
    await act(async () => save.release({ kind: 'contract_violation', message: 'x' }))
  })
})
