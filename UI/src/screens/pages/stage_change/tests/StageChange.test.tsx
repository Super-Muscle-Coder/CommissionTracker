// @vitest-environment jsdom
//
// Render tests of the page stage_change (i5-screens.md, Step I5.4), with fake
// Routers (ui_decomposition.md D3): the first frame (UI-4); every ViewResult
// kind of openStageChange (list_stages + get_stage: ok, ok already closed —
// no form —, rejected 404 / 500, unreachable + "Thử lại", contract_violation);
// every ViewResult kind of saveStageChange (change_stage 200 → the detail with
// the notice; rejected input — the field error at "Giai đoạn mới", the focus
// there, the draft kept —; rejected system 400 / 404 / 409 / 500, unreachable
// + send again, contract_violation); the in-page confirmation of a closing
// stage (shown for it, not for an ordinary stage; the focus on "Xác nhận";
// "Quay lại" sends nothing; "Xác nhận" sends exactly once). The panel is the
// kit's ConfirmPanel, inside the page; that no dialog of the system or
// browser exists is shown by a search of the source (I6, screens EVIDENCE).
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  StageChangeDraft,
  StageChangeOutcomeView,
  StageChangeTarget,
  StageChangeView,
  ViewResult,
} from '../../../../logic/workflows/update_progress/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeManageCommission, fakeUpdateProgress, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { StageChange } from '../StageChange'

type Opened = ViewResult<StageChangeView>
type Saved = ViewResult<StageChangeOutcomeView>
type SaveArgs = [StageChangeTarget, StageChangeDraft, boolean]
const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const TITLE = 'Chân dung bán thân'
const TARGET: StageChangeTarget = { commissionId: ID, closingStages: ['delivered', 'cancelled'] }
const VIEW: StageChangeView = {
  currentStageText: 'Phác thảo',
  closed: false,
  closedText: null,
  choices: [
    { value: 'queued', label: 'Chờ bắt đầu' },
    { value: 'lineart', label: 'Lên nét' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'cancelled', label: 'Đã hủy' },
  ],
  chooseLabel: 'Chọn giai đoạn',
  target: TARGET,
  draft: { toStage: '', note: '' },
}
const OPENED: Opened = { kind: 'ok', view: VIEW }
const CONFIRM_TEXT = 'Sau khi chuyển sang "Đã giao", đơn này không đổi giai đoạn được nữa.'
const ASK: Saved = { kind: 'ok', view: { outcome: 'needs_confirmation', message: CONFIRM_TEXT } }
const changed = (message: string): Saved => ({ kind: 'ok', view: { outcome: 'changed', commissionId: ID, message } })
const rejectedSystem = (code: string, message: string): Saved => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })

function renderWith(opened: Opened[], saved: Saved[] = []) {
  const openStageChange = answers<[string], Opened>(...opened)
  const saveStageChange = answers<SaveArgs, Saved>(...saved)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(
    <StageChange params={{ commission_id: ID, title: TITLE }} navigate={navigate} notice={null} />,
    fakeManageClient({}),
    fakeManageCommission({}),
    fakeUpdateProgress({ openStageChange, saveStageChange }),
  )
  return { openStageChange, saveStageChange, navigate }
}

const select = () => screen.getByLabelText('Giai đoạn mới') as HTMLSelectElement
const note = () => screen.getByLabelText('Ghi chú') as HTMLTextAreaElement
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const choose = (value: string) => fireEvent.change(select(), { target: { value } })
const errorOf = (el: HTMLElement) => {
  const id = el.getAttribute('aria-describedby')
  return id === null ? null : (el.ownerDocument.getElementById(id)?.textContent ?? null)
}
const isFocused = (el: Element) => el.matches(':focus')

afterEach(() => {
  cleanup()
})

describe('page stage_change: opening', () => {
  it('first frame, before Routers answers: loading shown, no button can be pressed (UI-4)', async () => {
    const open = pending<[string], Opened>()
    const first = renderFirstCommit(
      <StageChange params={{ commission_id: ID, title: TITLE }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      fakeManageCommission({}),
      fakeUpdateProgress({ openStageChange: open.fn }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang mở thông tin tiến độ…'])
    expect(first.enabledButtons).toEqual([])
    await act(async () => open.release(OPENED))
    expect(await screen.findByLabelText('Giai đoạn mới')).toBeTruthy()
  })

  it('ok: "Đổi giai đoạn", the title of the commission under it; "Lưu" then "Hủy" above the fields; current stage; the choices', async () => {
    const { openStageChange } = renderWith([OPENED])
    await screen.findByLabelText('Giai đoạn mới')
    expect(openStageChange).toHaveBeenCalledExactlyOnceWith(ID)
    expect(screen.getByRole('heading', { level: 2, name: 'Đổi giai đoạn' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: TITLE })).toBeTruthy()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Lưu', 'Hủy'])
    const save = button('Lưu')
    expect(save.compareDocumentPosition(select()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByLabelText('Tiến độ hiện tại').textContent).toBe('Giai đoạn hiện tạiPhác thảo')
    expect([...select().options].map((o) => o.textContent)).toEqual(['Chọn giai đoạn', 'Chờ bắt đầu', 'Lên nét', 'Đã giao', 'Đã hủy'])
    expect(select().value).toBe('')
    expect(note().value).toBe('')
  })

  it('"Hủy" goes back to commission_detail', async () => {
    const { navigate } = renderWith([OPENED])
    await screen.findByLabelText('Giai đoạn mới')
    fireEvent.click(button('Hủy'))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: ID } }, null)
  })

  it('already in a closed stage: no form; the text; only "Quay lại" (to commission_detail)', async () => {
    const closedText = 'Đơn đang ở giai đoạn "Đã giao", không đổi giai đoạn được nữa.'
    const { navigate } = renderWith([{ kind: 'ok', view: { ...VIEW, currentStageText: 'Đã giao', closed: true, closedText } }])
    expect(await screen.findByText(closedText)).toBeTruthy()
    expect(screen.queryByLabelText('Giai đoạn mới')).toBeNull()
    expect(screen.queryByLabelText('Ghi chú')).toBeNull()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Quay lại'])
    fireEvent.click(button('Quay lại'))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: ID } }, null)
  })

  it.each([
    ['get_stage 404', 'ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.'],
    ['get_stage 500', 'ERR_STORAGE_IO', 'Không đọc được dữ liệu tiến độ trên máy.'],
  ])('rejected (%s) → "Không mở được đơn hàng", the message, no form, "Quay lại"', async (_, code, message) => {
    const { navigate } = renderWith([{ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không mở được đơn hàng')
    expect(alert.textContent).toContain(message)
    expect(screen.queryByLabelText('Giai đoạn mới')).toBeNull()
    fireEvent.click(button('Quay lại'))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: ID } }, null)
  })

  it('unreachable → the message; "Thử lại" opens again and shows the form', async () => {
    const { openStageChange } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, OPENED])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    fireEvent.click(button('Thử lại'))
    expect(await screen.findByLabelText('Giai đoạn mới')).toBeTruthy()
    expect(openStageChange).toHaveBeenCalledTimes(2)
  })

  it('contract_violation → "Có lỗi không mong đợi", no form', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByLabelText('Giai đoạn mới')).toBeNull()
  })
})

describe('page stage_change: saving', () => {
  it('an ordinary stage: sent at once (confirmed = false), no confirmation; 200 → commission_detail with the notice', async () => {
    const { saveStageChange, navigate } = renderWith([OPENED], [changed('Đã đổi giai đoạn sang Lên nét.')])
    await screen.findByLabelText('Giai đoạn mới')
    choose('lineart')
    fireEvent.change(note(), { target: { value: 'Khách duyệt phác' } })
    fireEvent.click(button('Lưu'))
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(saveStageChange).toHaveBeenCalledExactlyOnceWith(TARGET, { toStage: 'lineart', note: 'Khách duyệt phác' }, false)
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: ID } }, 'Đã đổi giai đoạn sang Lên nét.')
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).toBeNull()
  })

  it('rejected input (no stage chosen): the error at "Giai đoạn mới", the focus there, the note kept, nothing else', async () => {
    const input: Saved = { kind: 'rejected', origin: 'input', code: 'INPUT_FORMAT', message: 'Một số ô chưa đúng định dạng.', fieldErrors: { to_stage: 'Chọn giai đoạn mới.' } }
    const { saveStageChange, navigate } = renderWith([OPENED], [input])
    await screen.findByLabelText('Giai đoạn mới')
    fireEvent.change(note(), { target: { value: 'giữ nguyên' } })
    fireEvent.click(button('Lưu'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain('Một số ô chưa đúng định dạng.')
    expect(errorOf(select())).toBe('Chọn giai đoạn mới.')
    expect(isFocused(select())).toBe(true)
    expect(note().value).toBe('giữ nguyên')
    expect(saveStageChange).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })

  it.each([
    ['400', 'ERR_VALIDATION', 'Máy chủ không nhận dữ liệu này.'],
    ['404', 'ERR_NOT_FOUND', 'Không tìm thấy đơn hàng này.'],
    ['409', 'ERR_INVALID_TRANSITION', 'Không đổi được giai đoạn: đơn đã được đổi sang giai đoạn khác hoặc đã khép lại. Hãy mở lại trang.'],
    ['500', 'ERR_STORAGE_IO', 'Không ghi được dữ liệu tiến độ trên máy.'],
  ])('change_stage %s → "Chưa lưu được", the message; the draft kept; no reload', async (_, code, message) => {
    const { saveStageChange, openStageChange, navigate } = renderWith([OPENED], [rejectedSystem(code, message)])
    await screen.findByLabelText('Giai đoạn mới')
    choose('lineart')
    fireEvent.change(note(), { target: { value: 'ghi chú' } })
    fireEvent.click(button('Lưu'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa lưu được')
    expect(alert.textContent).toContain(message)
    expect(select().value).toBe('lineart')
    expect(note().value).toBe('ghi chú')
    expect(saveStageChange).toHaveBeenCalledOnce()
    expect(openStageChange).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('unreachable → the message, the draft kept; "Lưu" sends the same draft again', async () => {
    const { saveStageChange, navigate } = renderWith([OPENED], [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý.' }, changed('Đã đổi giai đoạn sang Lên nét.')])
    await screen.findByLabelText('Giai đoạn mới')
    choose('lineart')
    fireEvent.click(button('Lưu'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(select().value).toBe('lineart')
    expect(button('Lưu').disabled).toBe(false)
    fireEvent.click(button('Lưu'))
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(saveStageChange).toHaveBeenCalledTimes(2)
    expect(saveStageChange).toHaveBeenLastCalledWith(TARGET, { toStage: 'lineart', note: '' }, false)
  })

  it('contract_violation → "Có lỗi không mong đợi"; never shown as done', async () => {
    const { navigate } = renderWith([OPENED], [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    await screen.findByLabelText('Giai đoạn mới')
    choose('lineart')
    fireEvent.click(button('Lưu'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('while saving, "Lưu" is busy and cannot send twice', async () => {
    const save = pending<SaveArgs, Saved>()
    renderWithLogic(
      <StageChange params={{ commission_id: ID, title: TITLE }} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      fakeManageCommission({}),
      fakeUpdateProgress({ openStageChange: answers<[string], Opened>(OPENED), saveStageChange: save.fn }),
    )
    await screen.findByLabelText('Giai đoạn mới')
    choose('lineart')
    fireEvent.click(button('Lưu'))
    const busy = button('Đang lưu…')
    expect(busy.disabled).toBe(true)
    fireEvent.click(busy)
    expect(save.fn).toHaveBeenCalledOnce()
    await act(async () => save.release(changed('x')))
  })
})

describe('page stage_change: the in-page confirmation of a closing stage', () => {
  it('shown for a closing stage: the warning, "Xác nhận" and "Quay lại"; the focus on "Xác nhận"; nothing sent yet', async () => {
    const { saveStageChange, navigate } = renderWith([OPENED], [ASK])
    await screen.findByLabelText('Giai đoạn mới')
    choose('delivered')
    fireEvent.click(button('Lưu'))
    const panel = await screen.findByRole('group', { name: 'Xác nhận đổi giai đoạn' })
    expect(panel.textContent).toContain(CONFIRM_TEXT)
    expect(isFocused(button('Xác nhận'))).toBe(true)
    // Services answered "needs confirmation" (confirmed = false): change_stage has not been sent.
    expect(saveStageChange).toHaveBeenCalledExactlyOnceWith(TARGET, { toStage: 'delivered', note: '' }, false)
    expect(navigate).not.toHaveBeenCalled()
    // While it waits for an answer, the draft it is about cannot change, and "Lưu" cannot be pressed.
    expect(select().disabled).toBe(true)
    expect(note().disabled).toBe(true)
    expect(button('Lưu').disabled).toBe(true)
  })

  it('not shown for an ordinary stage', async () => {
    renderWith([OPENED], [changed('Đã đổi giai đoạn sang Lên nét.')])
    await screen.findByLabelText('Giai đoạn mới')
    choose('lineart')
    fireEvent.click(button('Lưu'))
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Đang lưu…' })).toBeNull())
    expect(screen.queryByRole('group', { name: 'Xác nhận đổi giai đoạn' })).toBeNull()
  })

  it('"Quay lại" closes it, sends nothing, keeps the draft; the form can be used again', async () => {
    const { saveStageChange, navigate } = renderWith([OPENED], [ASK])
    await screen.findByLabelText('Giai đoạn mới')
    choose('delivered')
    fireEvent.change(note(), { target: { value: 'Giao file cuối' } })
    fireEvent.click(button('Lưu'))
    await screen.findByRole('group', { name: 'Xác nhận đổi giai đoạn' })
    fireEvent.click(button('Quay lại'))
    expect(screen.queryByRole('group', { name: 'Xác nhận đổi giai đoạn' })).toBeNull()
    expect(saveStageChange).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
    expect(select().value).toBe('delivered')
    expect(note().value).toBe('Giao file cuối')
    expect(select().disabled).toBe(false)
    expect(button('Lưu').disabled).toBe(false)
  })

  it('"Xác nhận" sends exactly once (confirmed = true), busy meanwhile; then commission_detail with the notice', async () => {
    const save = pending<SaveArgs, Saved>()
    const saveStageChange = vi.fn(async (...args: SaveArgs): Promise<Saved> => (args[2] ? save.fn(...args) : ASK))
    const navigate = vi.fn<Navigate>()
    renderWithLogic(
      <StageChange params={{ commission_id: ID, title: TITLE }} navigate={navigate} notice={null} />,
      fakeManageClient({}),
      fakeManageCommission({}),
      fakeUpdateProgress({ openStageChange: answers<[string], Opened>(OPENED), saveStageChange }),
    )
    await screen.findByLabelText('Giai đoạn mới')
    choose('delivered')
    fireEvent.click(button('Lưu'))
    await screen.findByRole('group', { name: 'Xác nhận đổi giai đoạn' })
    fireEvent.click(button('Xác nhận'))
    const busy = await screen.findByRole('button', { name: 'Đang lưu…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    expect(button('Quay lại').disabled).toBe(true)
    expect(button('Lưu').disabled).toBe(true)
    fireEvent.click(busy)
    expect(save.fn).toHaveBeenCalledExactlyOnceWith(TARGET, { toStage: 'delivered', note: '' }, true)
    await act(async () => save.release(changed('Đã đổi giai đoạn sang Đã giao.')))
    expect(saveStageChange).toHaveBeenCalledTimes(2)
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: ID } }, 'Đã đổi giai đoạn sang Đã giao.')
  })

  it('"Xác nhận" refused by the backend (409) → the panel closes, "Chưa lưu được" with the message', async () => {
    const message = 'Không đổi được giai đoạn: đơn đã được đổi sang giai đoạn khác hoặc đã khép lại. Hãy mở lại trang.'
    renderWith([OPENED], [ASK, rejectedSystem('ERR_INVALID_TRANSITION', message)])
    await screen.findByLabelText('Giai đoạn mới')
    choose('cancelled')
    fireEvent.click(button('Lưu'))
    await screen.findByRole('group', { name: 'Xác nhận đổi giai đoạn' })
    fireEvent.click(button('Xác nhận'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(message)
    expect(screen.queryByRole('group', { name: 'Xác nhận đổi giai đoạn' })).toBeNull()
  })
})
