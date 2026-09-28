// @vitest-environment jsdom
//
// Render tests of the page client_form (i5-screens.md, Step I5.4), with fake
// Routers: every ViewResult kind of both operations —
// openClientForm (create: empty, no call to the backend; edit: ok,
// rejected 404 / 500, unreachable + retry, contract_violation) and
// saveClient (ok in both modes → client_detail with the notice; rejected
// input with field errors; rejected system 400 / 404 / 500; unreachable,
// then saving again; contract_violation) — the draft kept as typed, the busy
// "Lưu" button (no second call), contact rows, and where "Hủy" goes.
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ClientFormDraft,
  ClientFormTarget,
  ClientFormView,
  SavedClientView,
  ViewResult,
} from '../../../../logic/workflows/manage_client/routers'
import type { Navigate, PageParams } from '../../../navigation'
import { answers, fakeManageClient, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { ClientForm } from '../ClientForm'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
type Opened = ViewResult<ClientFormView>
type Saved = ViewResult<SavedClientView>

const SUGGESTIONS = ['email', 'facebook', 'instagram', 'discord', 'zalo', 'x']
const EMPTY: Opened = { kind: 'ok', view: { draft: { displayName: '', contacts: [], note: '' }, channelSuggestions: SUGGESTIONS } }
const STORED: Opened = {
  kind: 'ok',
  view: { draft: { displayName: 'Nguyễn Thu Hà', contacts: [{ channel: 'email', value: 'ha@example.com' }], note: 'Thích tông màu ấm' }, channelSuggestions: SUGGESTIONS },
}
const CREATE: PageParams['client_form'] = { mode: 'create' }
const EDIT: PageParams['client_form'] = { mode: 'edit', client_id: ID }
const rejected = (code: string, message: string) => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} }) as const

function renderWith(params: PageParams['client_form'], opened: Opened[], saves: Saved[] = []) {
  const openClientForm = answers<[ClientFormTarget], Opened>(...opened)
  const saveClient = answers<[ClientFormTarget, ClientFormDraft], Saved>(...saves)
  const navigate = vi.fn<Navigate>()
  const { container } = renderWithLogic(<ClientForm params={params} navigate={navigate} notice={null} />, fakeManageClient({ openClientForm, saveClient }))
  return { openClientForm, saveClient, navigate, container }
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const type = (label: string, value: string) => fireEvent.change(field(label), { target: { value } })
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const isFocused = (el: Element) => el.matches(':focus')
// a comes before b in document order.
const before = (a: Element, b: Element) => (a.compareDocumentPosition(b) & a.DOCUMENT_POSITION_FOLLOWING) !== 0
const inputRejected = (fieldErrors: Record<string, string>): Saved => ({
  kind: 'rejected',
  origin: 'input',
  code: 'INPUT_FORMAT',
  message: 'Một số ô chưa đúng định dạng.',
  fieldErrors,
})

afterEach(() => {
  cleanup()
})

describe('page client_form — opening (openClientForm)', () => {
  it.each([
    ['create', CREATE],
    ['edit', EDIT],
  ] as const)('first frame (%s), before Routers answers: opening shown, no field, no button can be pressed (UI-4)', async (_mode, params) => {
    const open = pending<[ClientFormTarget], Opened>()
    const first = renderFirstCommit(<ClientForm params={params} navigate={vi.fn()} notice={null} />, fakeManageClient({ openClientForm: open.fn }))
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang mở thông tin khách hàng…'])
    expect(first.enabledButtons).toEqual([])
    expect(screen.queryByLabelText('Tên hiển thị')).toBeNull()
    await act(async () => open.release(params.mode === 'edit' ? STORED : EMPTY))
    expect(await screen.findByLabelText('Tên hiển thị')).toBeTruthy()
  })

  it('create: title "Thêm khách hàng", Routers asked with mode create, an empty form', async () => {
    const { openClientForm } = renderWith(CREATE, [EMPTY])
    expect(await screen.findByLabelText('Tên hiển thị')).toBeTruthy()
    expect(openClientForm).toHaveBeenCalledExactlyOnceWith({ mode: 'create' })
    expect(screen.getByRole('heading', { level: 2, name: 'Thêm khách hàng' })).toBeTruthy()
    expect(field('Tên hiển thị').value).toBe('')
    expect(field('Ghi chú').value).toBe('')
    expect(screen.queryByLabelText('Kênh 1')).toBeNull()
  })

  it('edit: title "Sửa khách hàng", Routers asked with the client id, the form filled in', async () => {
    const { openClientForm } = renderWith(EDIT, [STORED])
    expect(await screen.findByDisplayValue('Nguyễn Thu Hà')).toBeTruthy()
    expect(openClientForm).toHaveBeenCalledExactlyOnceWith({ mode: 'edit', clientId: ID })
    expect(screen.getByRole('heading', { level: 2, name: 'Sửa khách hàng' })).toBeTruthy()
    expect(field('Kênh 1').value).toBe('email')
    expect(field('Giá trị 1').value).toBe('ha@example.com')
    expect(field('Ghi chú').value).toBe('Thích tông màu ấm')
  })

  it('the channel field offers the suggestions', async () => {
    const { container } = renderWith(EDIT, [STORED])
    await screen.findByDisplayValue('Nguyễn Thu Hà')
    const list = container.querySelector(`datalist#${field('Kênh 1').getAttribute('list')}`)
    expect([...(list as HTMLElement).querySelectorAll('option')].map((o) => o.value)).toEqual(SUGGESTIONS)
  })

  it('edit, rejected 404 → "Không tìm thấy khách hàng này.", no form, "Hủy" goes back to the detail', async () => {
    const { navigate } = renderWith(EDIT, [rejected('ERR_NOT_FOUND', 'Không tìm thấy khách hàng này.')])
    expect((await screen.findByRole('alert')).textContent).toContain('Không tìm thấy khách hàng này.')
    expect(screen.queryByLabelText('Tên hiển thị')).toBeNull()
    press('Hủy')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_detail', params: { client_id: ID } }, null)
  })

  it('edit, rejected 500 → the message', async () => {
    renderWith(EDIT, [rejected('ERR_STORAGE_IO', 'Không đọc hoặc ghi được dữ liệu.')])
    expect((await screen.findByRole('alert')).textContent).toContain('Không đọc hoặc ghi được dữ liệu.')
  })

  it('edit, unreachable → the message; "Thử lại" asks Routers again and shows the form', async () => {
    const { openClientForm } = renderWith(EDIT, [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, STORED])
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được tới phần xử lý.')
    press('Thử lại')
    expect(await screen.findByDisplayValue('Nguyễn Thu Hà')).toBeTruthy()
    expect(openClientForm).toHaveBeenCalledTimes(2)
  })

  it('edit, contract_violation → the message, no form', async () => {
    renderWith(EDIT, [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByLabelText('Tên hiển thị')).toBeNull()
  })
})

describe('page client_form — the draft', () => {
  it('sends the draft exactly as typed (raw, untrimmed), with the rows added, edited and removed', async () => {
    const { saveClient } = renderWith(CREATE, [EMPTY], [{ kind: 'ok', view: { clientId: ID, message: 'Đã thêm khách hàng.' } }])
    await screen.findByLabelText('Tên hiển thị')
    type('Tên hiển thị', '  Bảo  ')
    press('Thêm liên hệ')
    press('Thêm liên hệ')
    press('Thêm liên hệ')
    type('Kênh 1', 'zalo')
    type('Giá trị 1', '0901')
    type('Kênh 2', 'x')
    type('Kênh 3', 'email')
    type('Giá trị 3', 'bao@b.vn')
    press('Bỏ liên hệ 2')
    expect(screen.queryByLabelText('Kênh 3')).toBeNull()
    type('Ghi chú', 'dòng 1\ndòng 2')
    press('Lưu')
    await vi.waitFor(() => expect(saveClient).toHaveBeenCalledTimes(1))
    expect(saveClient).toHaveBeenCalledExactlyOnceWith({ mode: 'create' }, {
      displayName: '  Bảo  ',
      contacts: [{ channel: 'zalo', value: '0901' }, { channel: 'email', value: 'bao@b.vn' }],
      note: 'dòng 1\ndòng 2',
    })
  })

  it('"Hủy" in create mode goes back to the list, and calls no Routers', async () => {
    const { navigate, saveClient } = renderWith(CREATE, [EMPTY])
    await screen.findByLabelText('Tên hiển thị')
    press('Hủy')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_list', params: null }, null)
    expect(saveClient).not.toHaveBeenCalled()
  })

  it('"Hủy" in edit mode goes back to the detail of that client', async () => {
    const { navigate } = renderWith(EDIT, [STORED])
    await screen.findByDisplayValue('Nguyễn Thu Hà')
    press('Hủy')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_detail', params: { client_id: ID } }, null)
  })
})

describe('page client_form — saving (saveClient)', () => {
  it('create, ok → client_detail of the new client, with "Đã thêm khách hàng."', async () => {
    const { saveClient, navigate } = renderWith(CREATE, [EMPTY], [{ kind: 'ok', view: { clientId: ID, message: 'Đã thêm khách hàng.' } }])
    await screen.findByLabelText('Tên hiển thị')
    type('Tên hiển thị', 'An')
    press('Lưu')
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(saveClient).toHaveBeenCalledWith({ mode: 'create' }, { displayName: 'An', contacts: [], note: '' })
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_detail', params: { client_id: ID } }, 'Đã thêm khách hàng.')
  })

  it('edit, ok → client_detail of that client, with "Đã lưu thay đổi."', async () => {
    const { saveClient, navigate } = renderWith(EDIT, [STORED], [{ kind: 'ok', view: { clientId: ID, message: 'Đã lưu thay đổi.' } }])
    await screen.findByDisplayValue('Nguyễn Thu Hà')
    press('Lưu')
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(saveClient).toHaveBeenCalledWith({ mode: 'edit', clientId: ID }, STORED.kind === 'ok' ? STORED.view.draft : null)
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'client_detail', params: { client_id: ID } }, 'Đã lưu thay đổi.')
  })

  it('rejected input → the summary, each field error at its field, the draft kept, no navigation', async () => {
    const { navigate, container } = renderWith(CREATE, [EMPTY], [
      {
        kind: 'rejected',
        origin: 'input',
        code: 'INPUT_FORMAT',
        message: 'Một số ô chưa đúng định dạng.',
        fieldErrors: { displayName: 'Nhập tên khách hàng.', 'contacts.0.value': 'Nhập thông tin liên hệ, hoặc bỏ hàng này.' },
      },
    ])
    await screen.findByLabelText('Tên hiển thị')
    press('Thêm liên hệ')
    type('Kênh 1', 'email')
    type('Ghi chú', 'ghi chú')
    press('Lưu')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain('Một số ô chưa đúng định dạng.')
    const nameField = field('Tên hiển thị')
    expect(nameField.getAttribute('aria-invalid')).toBe('true')
    const describedBy = (el: HTMLElement) => container.querySelector(`#${el.getAttribute('aria-describedby')}`)?.textContent
    expect(describedBy(nameField)).toBe('Nhập tên khách hàng.')
    const valueField = field('Giá trị 1')
    expect(describedBy(valueField)).toBe('Nhập thông tin liên hệ, hoặc bỏ hàng này.')
    expect(field('Kênh 1').getAttribute('aria-invalid')).toBe('false')
    expect(field('Kênh 1').value).toBe('email')
    expect(field('Ghi chú').value).toBe('ghi chú')
    expect(navigate).not.toHaveBeenCalled()
  })

  it.each([
    ['400 ERR_VALIDATION', CREATE, rejected('ERR_VALIDATION', 'Ứng dụng không nhận dữ liệu này.')],
    ['404 ERR_NOT_FOUND (edit)', EDIT, rejected('ERR_NOT_FOUND', 'Không tìm thấy khách hàng này.')],
    ['500 ERR_STORAGE_IO', CREATE, rejected('ERR_STORAGE_IO', 'Không đọc hoặc ghi được dữ liệu.')],
  ])('rejected system %s → one message at the top, no field error, the draft kept', async (_, params, result) => {
    const { navigate } = renderWith(params, [params.mode === 'edit' ? STORED : EMPTY], [result])
    await screen.findByLabelText('Tên hiển thị')
    type('Tên hiển thị', 'Tên mới')
    press('Lưu')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain(result.message)
    expect(field('Tên hiển thị').getAttribute('aria-invalid')).toBe('false')
    expect(field('Tên hiển thị').value).toBe('Tên mới')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('unreachable → the message, the draft kept; "Lưu" again sends the same draft and succeeds', async () => {
    const { saveClient, navigate } = renderWith(CREATE, [EMPTY], [
      { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' },
      { kind: 'ok', view: { clientId: ID, message: 'Đã thêm khách hàng.' } },
    ])
    await screen.findByLabelText('Tên hiển thị')
    type('Tên hiển thị', 'Chi')
    press('Lưu')
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được tới phần xử lý.')
    expect(field('Tên hiển thị').value).toBe('Chi')
    press('Lưu')
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(saveClient).toHaveBeenCalledTimes(2)
    expect(saveClient.mock.calls[1]).toEqual(saveClient.mock.calls[0])
  })

  it('contract_violation → the message, never shown as saved, no navigation', async () => {
    const { navigate } = renderWith(CREATE, [EMPTY], [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    await screen.findByLabelText('Tên hiển thị')
    type('Tên hiển thị', 'An')
    press('Lưu')
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('rejected system → no field is given the text cursor', async () => {
    renderWith(CREATE, [EMPTY], [rejected('ERR_VALIDATION', 'Ứng dụng không nhận dữ liệu này.')])
    await screen.findByLabelText('Tên hiển thị')
    type('Tên hiển thị', 'An')
    press('Lưu')
    await screen.findByRole('alert')
    // Let every effect of that result run before looking.
    await act(async () => {})
    expect(screen.getAllByRole('textbox').filter(isFocused)).toEqual([])
  })

  it('while saving: "Lưu" shows "Đang lưu…" and cannot be pressed, fields disabled; no second call', async () => {
    const save = pending<[ClientFormTarget, ClientFormDraft], Saved>()
    const navigate = vi.fn<Navigate>()
    renderWithLogic(
      <ClientForm params={CREATE} navigate={navigate} notice={null} />,
      fakeManageClient({ openClientForm: answers<[ClientFormTarget], Opened>(EMPTY), saveClient: save.fn }),
    )
    await screen.findByLabelText('Tên hiển thị')
    type('Tên hiển thị', 'An')
    press('Lưu')
    const busy = screen.getByRole('button', { name: 'Đang lưu…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    expect(field('Tên hiển thị').disabled).toBe(true)
    fireEvent.click(busy)
    expect(save.fn).toHaveBeenCalledTimes(1)
    await act(async () => save.release({ kind: 'ok', view: { clientId: ID, message: 'Đã thêm khách hàng.' } }))
    expect(navigate).toHaveBeenCalledTimes(1)
  })
})

describe('page client_form — button row and focus (§7.2, principles 4 and 7)', () => {
  it.each([
    ['create', CREATE],
    ['edit', EDIT],
  ] as const)('%s: "Lưu" then "Hủy" come right after the title, before the first field; a save message sits between them and the fields', async (_mode, params) => {
    renderWith(params, [params.mode === 'edit' ? STORED : EMPTY], [inputRejected({ displayName: 'Nhập tên khách hàng.' })])
    const name = await screen.findByLabelText('Tên hiển thị')
    const title = screen.getByRole('heading', { level: 2 })
    const save = screen.getByRole('button', { name: 'Lưu' })
    const cancel = screen.getByRole('button', { name: 'Hủy' })
    expect(before(title, save)).toBe(true)
    expect(before(save, cancel)).toBe(true)
    expect(before(cancel, name)).toBe(true)
    // Nothing can be pressed or typed between the title and "Lưu".
    const controls = [...screen.getAllByRole('button'), ...screen.getAllByRole('textbox')]
    expect(controls.filter((c) => c !== save && before(title, c) && before(c, save))).toEqual([])
    type('Tên hiển thị', '')
    press('Lưu')
    const alert = await screen.findByRole('alert')
    expect(before(cancel, alert)).toBe(true)
    expect(before(alert, field('Tên hiển thị'))).toBe(true)
  })

  it('rejected input with an error on the name (and on a contact) → the name field gets the text cursor', async () => {
    renderWith(CREATE, [EMPTY], [
      inputRejected({ displayName: 'Nhập tên khách hàng.', 'contacts.0.value': 'Nhập thông tin liên hệ, hoặc bỏ hàng này.' }),
    ])
    await screen.findByLabelText('Tên hiển thị')
    press('Thêm liên hệ')
    type('Kênh 1', 'email')
    press('Lưu')
    await screen.findByRole('alert')
    await vi.waitFor(() => expect(isFocused(field('Tên hiển thị'))).toBe(true))
    expect(screen.getAllByRole('textbox').filter(isFocused)).toHaveLength(1)
  })

  it('rejected input on the second contact row only → "Giá trị 2" gets the text cursor (screen order: channel before value, row by row)', async () => {
    renderWith(EDIT, [STORED], [
      inputRejected({ 'contacts.1.value': 'Nhập thông tin liên hệ, hoặc bỏ hàng này.', note: 'x' }),
    ])
    await screen.findByDisplayValue('Nguyễn Thu Hà')
    press('Thêm liên hệ')
    type('Kênh 2', 'zalo')
    press('Lưu')
    await screen.findByRole('alert')
    await vi.waitFor(() => expect(isFocused(field('Giá trị 2'))).toBe(true))
    expect(screen.getAllByRole('textbox').filter(isFocused)).toHaveLength(1)
  })

  it('each new rejection moves the cursor again, even to the same field', async () => {
    renderWith(CREATE, [EMPTY], [inputRejected({ displayName: 'Nhập tên khách hàng.' }), inputRejected({ displayName: 'Nhập tên khách hàng.' })])
    await screen.findByLabelText('Tên hiển thị')
    press('Lưu')
    await screen.findByRole('alert')
    await vi.waitFor(() => expect(isFocused(field('Tên hiển thị'))).toBe(true))
    field('Ghi chú').focus()
    expect(isFocused(field('Tên hiển thị'))).toBe(false)
    press('Lưu')
    await vi.waitFor(() => expect(isFocused(field('Tên hiển thị'))).toBe(true))
  })
})
