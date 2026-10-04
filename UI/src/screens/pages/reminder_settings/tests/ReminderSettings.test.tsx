// @vitest-environment jsdom
//
// Render tests of the page reminder_settings (i5-screens.md, Step I5.4), with
// fake Routers: the first frame (UI-4); every ViewResult kind of opening
// (ok with the form, rejected 500, unreachable + "Thử lại", contract_violation)
// and of saving (ok → back to reminder_list with the notice; rejected input →
// the words beside each field and the text cursor on the first one in the order
// of the screen, nothing lost; rejected 400 and 500, unreachable,
// contract_violation → the message, the draft kept, "Lưu" again); the sub-line
// ("Chưa lưu lần nào…" / "Lưu lần cuối lúc …"); "Vào thứ" shown only for the
// unit "tuần"; "Thêm mốc nhắc" disabled at five rows and "Bỏ mốc này" at one;
// every field editable while its part is off; the button row.
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReminderSettingsDraft, SavedSettingsView, SettingsFormView, ViewResult } from '../../../../logic/workflows/send_reminder/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeSendReminder, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { ReminderSettings } from '../ReminderSettings'

type Opened = ViewResult<SettingsFormView>
type Saved = ViewResult<SavedSettingsView>

const DRAFT: ReminderSettingsDraft = {
  periodicEnabled: false,
  every: '1',
  periodicUnit: 'weeks',
  atTime: '09:00',
  weekday: '1',
  deadlineEnabled: false,
  leadTimes: [{ amount: '1', unit: 'days' }],
}
const view = (over: Partial<SettingsFormView> = {}, draft: Partial<ReminderSettingsDraft> = {}): SettingsFormView => ({
  subtitle: 'Chưa lưu lần nào, đang dùng cài đặt mặc định.',
  draft: { ...DRAFT, ...draft },
  periodicUnitChoices: [{ value: 'days', label: 'ngày' }, { value: 'weeks', label: 'tuần' }],
  weekdayChoices: ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'].map((label, i) => ({ value: String(i + 1), label })),
  leadUnitChoices: [{ value: 'hours', label: 'giờ' }, { value: 'days', label: 'ngày' }],
  weekdayUnit: 'weeks',
  leadTimeLimits: { min: 1, max: 5 },
  ...over,
})
const OPEN: Opened = { kind: 'ok', view: view() }
const SAVED: Saved = { kind: 'ok', view: { message: 'Đã lưu cài đặt nhắc việc.' } }
const rejectedInput = (fieldErrors: Record<string, string>): Saved => ({ kind: 'rejected', origin: 'input', code: 'INPUT_FORMAT', message: 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.', fieldErrors })

function renderWith(opens: Opened[], saves: Saved[] = []) {
  const openSettings = answers<[], Opened>(...opens)
  const saveSettings = answers<[ReminderSettingsDraft], Saved>(...saves)
  const sendReminder = fakeSendReminder({ openSettings, saveSettings })
  const navigate = vi.fn<Navigate>()
  renderWithLogic(<ReminderSettings params={null} navigate={navigate} notice={null} />, fakeManageClient({}), undefined, undefined, undefined, undefined, sendReminder)
  return { openSettings, saveSettings, navigate, sendReminder }
}

const field = (name: string) => screen.getByLabelText(name, { exact: true }) as HTMLInputElement
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } })
const buttons = (name: string) => screen.queryAllByRole('button', { name }) as HTMLButtonElement[]
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const isFocused = (el: Element) => el.matches(':focus')
const loaded = () => screen.findByRole('button', { name: 'Lưu' })

afterEach(() => {
  cleanup()
})

describe('page reminder_settings: opening', () => {
  it('first frame, before Routers answers: loading shown; no button yet (UI-4)', async () => {
    const open = pending<[], Opened>()
    const first = renderFirstCommit(
      <ReminderSettings params={null} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      undefined,
      undefined,
      fakeSendReminder({ openSettings: open.fn }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang mở cài đặt nhắc việc…'])
    expect(first.enabledButtons).toEqual([])
    await act(async () => open.release(OPEN))
    await loaded()
  })

  it('ok: Routers asked once; the title, then the button row ("Lưu" first, "Hủy"), the sub-line, the two parts', async () => {
    const { openSettings } = renderWith([OPEN])
    await loaded()
    expect(openSettings).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Cài đặt nhắc việc' })).toBeTruthy()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Lưu', 'Hủy', 'Bỏ mốc này', 'Thêm mốc nhắc'])
    expect(screen.getByText('Chưa lưu lần nào, đang dùng cài đặt mặc định.')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Nhắc định kỳ' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Nhắc trước hạn giao' })).toBeTruthy()
    expect(screen.getByText('Mỗi lần lưu cài đặt, chu kỳ nhắc định kỳ được tính lại từ lúc lưu.')).toBeTruthy()
    expect(screen.getByText('Hạn giao tính tới hết ngày đó. Một ngày là 24 giờ.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('the sub-line says when the settings were last saved', async () => {
    renderWith([{ kind: 'ok', view: view({ subtitle: 'Lưu lần cuối lúc 08:05 03/10/2026' }) }])
    await loaded()
    expect(screen.getByText('Lưu lần cuối lúc 08:05 03/10/2026')).toBeTruthy()
    expect(screen.queryByText(/Chưa lưu lần nào/)).toBeNull()
  })

  it('the fields hold the draft Services gave', async () => {
    renderWith([{ kind: 'ok', view: view({}, { periodicEnabled: true, every: '2', periodicUnit: 'weeks', atTime: '09:30', weekday: '3', deadlineEnabled: true, leadTimes: [{ amount: '1', unit: 'days' }, { amount: '12', unit: 'hours' }] }) }])
    await loaded()
    expect(field('Bật nhắc định kỳ').checked).toBe(true)
    expect(field('Mỗi').value).toBe('2')
    expect(field('Đơn vị chu kỳ').value).toBe('weeks')
    expect(field('Vào lúc').value).toBe('09:30')
    expect(field('Vào thứ').value).toBe('3')
    expect(field('Bật nhắc trước hạn giao').checked).toBe(true)
    expect(field('Mốc nhắc 1: số').value).toBe('1')
    expect(field('Mốc nhắc 1: đơn vị').value).toBe('days')
    expect(field('Mốc nhắc 2: số').value).toBe('12')
    expect(field('Mốc nhắc 2: đơn vị').value).toBe('hours')
  })

  it('the time field is a native time input; the switches are checkboxes', async () => {
    renderWith([OPEN])
    await loaded()
    expect(field('Vào lúc').type).toBe('time')
    expect(field('Bật nhắc định kỳ').type).toBe('checkbox')
    expect(field('Bật nhắc trước hạn giao').type).toBe('checkbox')
  })

  it('every field is editable while its part is switched off', async () => {
    renderWith([OPEN])
    await loaded()
    expect(field('Bật nhắc định kỳ').checked).toBe(false)
    for (const name of ['Mỗi', 'Đơn vị chu kỳ', 'Vào lúc', 'Vào thứ', 'Mốc nhắc 1: số', 'Mốc nhắc 1: đơn vị']) expect(field(name).disabled).toBe(false)
    type('Mỗi', '5')
    expect(field('Mỗi').value).toBe('5')
  })

  it('"Hủy" goes back to reminder_list with no notice', async () => {
    const { navigate } = renderWith([OPEN])
    await loaded()
    press('Hủy')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'reminder_list', params: null }, null)
  })

  it('rejected 500: the message and the way back; no form', async () => {
    const { navigate } = renderWith([{ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: 'Không đọc được cài đặt nhắc việc trên máy.', fieldErrors: {} }])
    expect((await screen.findByRole('alert')).textContent).toContain('Không đọc được cài đặt nhắc việc trên máy.')
    expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
    press('Quay lại')
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'reminder_list', params: null }, null)
  })

  it('unreachable: "Không kết nối được" with "Thử lại", which opens again and shows the form', async () => {
    const { openSettings } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.' }, OPEN])
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được')
    expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
    press('Thử lại')
    await loaded()
    expect(openSettings).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('contract_violation: "Có lỗi không mong đợi" and the way back; no form', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeTruthy()
  })
})

describe('page reminder_settings: "Vào thứ" and the unit of the cadence', () => {
  it('shown for "tuần", hidden for "ngày"', async () => {
    renderWith([{ kind: 'ok', view: view({}, { periodicUnit: 'days', weekday: '' }) }])
    await loaded()
    expect(screen.queryByLabelText('Vào thứ', { exact: true })).toBeNull()
  })

  it('changing the unit asks Services (through Routers): to "ngày" the field goes, to "tuần" it comes back as "Thứ Hai"', async () => {
    const { sendReminder } = renderWith([OPEN])
    await loaded()
    expect(field('Vào thứ').value).toBe('1')
    type('Vào thứ', '5')
    type('Đơn vị chu kỳ', 'days')
    expect(sendReminder.changePeriodicUnit).toHaveBeenLastCalledWith(expect.objectContaining({ weekday: '5' }), 'days')
    expect(screen.queryByLabelText('Vào thứ', { exact: true })).toBeNull()
    type('Đơn vị chu kỳ', 'weeks')
    expect(field('Vào thứ').value).toBe('1')
    expect(within(field('Vào thứ')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Chọn thứ', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'])
  })
})

describe('page reminder_settings: the rows of "Mốc nhắc"', () => {
  const rowsDraft = (n: number): Partial<ReminderSettingsDraft> => ({ leadTimes: Array.from({ length: n }, (_, i) => ({ amount: String(i + 1), unit: 'hours' })) })

  it('"Bỏ mốc này" is disabled with one row; "Thêm mốc nhắc" is enabled', async () => {
    renderWith([OPEN])
    await loaded()
    expect(buttons('Bỏ mốc này').map((b) => b.disabled)).toEqual([true])
    expect(buttons('Thêm mốc nhắc')[0].disabled).toBe(false)
  })

  it('"Thêm mốc nhắc" adds a row (asking Services); at five rows it is disabled and "Bỏ mốc này" is enabled on every row', async () => {
    const { sendReminder } = renderWith([OPEN])
    await loaded()
    for (let i = 0; i < 4; i += 1) press('Thêm mốc nhắc')
    expect(sendReminder.addLeadTime).toHaveBeenCalledTimes(4)
    expect(buttons('Bỏ mốc này')).toHaveLength(5)
    expect(buttons('Bỏ mốc này').every((b) => !b.disabled)).toBe(true)
    expect(buttons('Thêm mốc nhắc')[0].disabled).toBe(true)
    expect(field('Mốc nhắc 5: số')).toBeTruthy()
    expect(screen.queryByLabelText('Mốc nhắc 6: số')).toBeNull()
  })

  it('five rows from the start: "Thêm mốc nhắc" disabled', async () => {
    renderWith([{ kind: 'ok', view: view({}, rowsDraft(5)) }])
    await loaded()
    expect(buttons('Thêm mốc nhắc')[0].disabled).toBe(true)
  })

  it('"Bỏ mốc này" removes that row and keeps the others as they were typed', async () => {
    const { sendReminder } = renderWith([{ kind: 'ok', view: view({}, rowsDraft(3)) }])
    await loaded()
    type('Mốc nhắc 3: số', '77')
    fireEvent.click(buttons('Bỏ mốc này')[1])
    expect(sendReminder.removeLeadTime).toHaveBeenCalledWith(expect.anything(), 1)
    expect(buttons('Bỏ mốc này')).toHaveLength(2)
    expect(field('Mốc nhắc 1: số').value).toBe('1')
    expect(field('Mốc nhắc 2: số').value).toBe('77')
  })

  it('a row has its number and its unit editable', async () => {
    renderWith([OPEN])
    await loaded()
    type('Mốc nhắc 1: số', '12')
    type('Mốc nhắc 1: đơn vị', 'hours')
    expect(field('Mốc nhắc 1: số').value).toBe('12')
    expect(field('Mốc nhắc 1: đơn vị').value).toBe('hours')
  })
})

describe('page reminder_settings: saving', () => {
  it('sends the draft exactly as typed, once; ok goes to reminder_list with the notice', async () => {
    const { saveSettings, navigate } = renderWith([OPEN], [SAVED])
    await loaded()
    fireEvent.click(field('Bật nhắc định kỳ'))
    type('Mỗi', '2')
    type('Vào lúc', '07:45')
    type('Vào thứ', '5')
    fireEvent.click(field('Bật nhắc trước hạn giao'))
    press('Thêm mốc nhắc')
    type('Mốc nhắc 2: số', '12')
    type('Mốc nhắc 2: đơn vị', 'hours')
    press('Lưu')
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(saveSettings).toHaveBeenCalledExactlyOnceWith({
      periodicEnabled: true,
      every: '2',
      periodicUnit: 'weeks',
      atTime: '07:45',
      weekday: '5',
      deadlineEnabled: true,
      leadTimes: [{ amount: '1', unit: 'days' }, { amount: '12', unit: 'hours' }],
    })
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'reminder_list', params: null }, 'Đã lưu cài đặt nhắc việc.')
  })

  it('while it runs, "Lưu" is busy and the fields and rows are disabled; a second press sends nothing', async () => {
    const save = pending<[ReminderSettingsDraft], Saved>()
    renderWithLogic(
      <ReminderSettings params={null} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      undefined,
      undefined,
      fakeSendReminder({ openSettings: answers<[], Opened>(OPEN), saveSettings: save.fn }),
    )
    await loaded()
    press('Lưu')
    await waitFor(() => expect(save.fn).toHaveBeenCalledTimes(1))
    expect((screen.getByRole('button', { name: 'Đang lưu…' }) as HTMLButtonElement).disabled).toBe(true)
    expect(field('Mỗi').disabled).toBe(true)
    expect(buttons('Thêm mốc nhắc')[0].disabled).toBe(true)
    expect(buttons('Bỏ mốc này').every((b) => b.disabled)).toBe(true)
    await act(async () => save.release(rejectedInput({})))
    expect(save.fn).toHaveBeenCalledTimes(1)
    expect(field('Mỗi').disabled).toBe(false)
  })

  it('rejected input: the words beside the fields, the summary, the draft kept, the text cursor on the first field in the order of the screen', async () => {
    const { saveSettings } = renderWith([OPEN], [rejectedInput({ 'periodic.at_time': 'Chọn giờ nhắc', 'periodic.every': 'Nhập số ngày hoặc số tuần', 'deadline.lead_times.0.amount': 'Mốc nhắc tối đa 365 ngày (8760 giờ)' })])
    await loaded()
    type('Mỗi', '')
    type('Vào lúc', '')
    type('Mốc nhắc 1: số', '999')
    press('Lưu')
    expect((await screen.findByRole('alert')).textContent).toContain('Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.')
    expect(saveSettings).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Nhập số ngày hoặc số tuần')).toBeTruthy()
    expect(screen.getByText('Chọn giờ nhắc')).toBeTruthy()
    expect(screen.getByText('Mốc nhắc tối đa 365 ngày (8760 giờ)')).toBeTruthy()
    expect(field('Mỗi').getAttribute('aria-invalid')).toBe('true')
    expect(field('Mốc nhắc 1: số').getAttribute('aria-invalid')).toBe('true')
    expect(field('Mốc nhắc 1: số').value).toBe('999')
    await waitFor(() => expect(isFocused(field('Mỗi'))).toBe(true))
  })

  it('the first error in the order of the screen is where the cursor goes: the time before the rows, the weekday after the time', async () => {
    renderWith([OPEN], [rejectedInput({ 'deadline.lead_times.0.amount': 'a', 'periodic.weekday': 'Chọn thứ trong tuần', 'periodic.at_time': 'Chọn giờ nhắc' })])
    await loaded()
    press('Lưu')
    await screen.findByRole('alert')
    await waitFor(() => expect(isFocused(field('Vào lúc'))).toBe(true))
  })

  it('an error on a row\'s unit, and a duplicate shown under its number', async () => {
    renderWith([{ kind: 'ok', view: view({}, { leadTimes: [{ amount: '1', unit: 'days' }, { amount: '24', unit: 'hours' }] }) }], [rejectedInput({ 'deadline.lead_times.1': 'Mốc nhắc này trùng với một mốc khác' })])
    await loaded()
    press('Lưu')
    await screen.findByRole('alert')
    expect(screen.getByText('Mốc nhắc này trùng với một mốc khác')).toBeTruthy()
    expect(field('Mốc nhắc 2: số').getAttribute('aria-invalid')).toBe('true')
    expect(field('Mốc nhắc 1: số').getAttribute('aria-invalid')).toBe('false')
    await waitFor(() => expect(isFocused(field('Mốc nhắc 2: số'))).toBe(true))
  })

  // UI-13: the error of a row is bound to its place in the list; once a row is
  // added or removed the places move, so the errors of rows are not shown any more.
  const DUPLICATE = 'Mốc nhắc này trùng với một mốc khác'
  const THREE_ROWS = { leadTimes: [{ amount: '1', unit: 'days' }, { amount: '24', unit: 'hours' }, { amount: '5', unit: 'days' }] }

  it('UI-13: the duplicate of row 2 is shown; row 1 is removed; the sentence is under no row (the other errors and the summary stay)', async () => {
    renderWith(
      [{ kind: 'ok', view: view({}, THREE_ROWS) }],
      [rejectedInput({ 'deadline.lead_times.1': DUPLICATE, 'periodic.every': 'Nhập số ngày hoặc số tuần' })],
    )
    await loaded()
    press('Lưu')
    await screen.findByRole('alert')
    expect(screen.getAllByText(DUPLICATE)).toHaveLength(1)
    expect(field('Mốc nhắc 2: số').getAttribute('aria-invalid')).toBe('true')
    fireEvent.click(buttons('Bỏ mốc này')[0])
    expect(buttons('Bỏ mốc này')).toHaveLength(2)
    expect(field('Mốc nhắc 1: số').value).toBe('24')
    expect(field('Mốc nhắc 2: số').value).toBe('5')
    expect(screen.queryByText(DUPLICATE)).toBeNull()
    expect(field('Mốc nhắc 1: số').getAttribute('aria-invalid')).toBe('false')
    expect(field('Mốc nhắc 2: số').getAttribute('aria-invalid')).toBe('false')
    // What does not belong to a row stays: the cadence's error and the summary of the last save.
    expect(screen.getByText('Nhập số ngày hoặc số tuần')).toBeTruthy()
    expect(field('Mỗi').getAttribute('aria-invalid')).toBe('true')
    expect((screen.getByRole('alert')).textContent).toContain('Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.')
  })

  it('UI-13: adding a row also hides the errors of rows', async () => {
    renderWith([{ kind: 'ok', view: view({}, THREE_ROWS) }], [rejectedInput({ 'deadline.lead_times.1': DUPLICATE })])
    await loaded()
    press('Lưu')
    await screen.findByRole('alert')
    expect(screen.getAllByText(DUPLICATE)).toHaveLength(1)
    press('Thêm mốc nhắc')
    expect(buttons('Bỏ mốc này')).toHaveLength(4)
    expect(screen.queryByText(DUPLICATE)).toBeNull()
  })

  it('a second rejection asks for the cursor again', async () => {
    renderWith([OPEN], [rejectedInput({ 'periodic.every': 'Nhập số ngày hoặc số tuần' }), rejectedInput({ 'periodic.every': 'Nhập số ngày hoặc số tuần' })])
    await loaded()
    press('Lưu')
    await waitFor(() => expect(isFocused(field('Mỗi'))).toBe(true))
    field('Vào lúc').focus()
    press('Lưu')
    await waitFor(() => expect(isFocused(field('Mỗi'))).toBe(true))
  })

  it.each([
    ['rejected 400', { kind: 'rejected', origin: 'system', code: 'ERR_VALIDATION', message: 'Máy chủ không nhận cài đặt này. Vui lòng kiểm tra lại các ô rồi lưu lại.', fieldErrors: {} } as Saved, 'Máy chủ không nhận cài đặt này'],
    ['rejected 500', { kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: 'Không ghi được cài đặt nhắc việc trên máy.', fieldErrors: {} } as Saved, 'Không ghi được cài đặt nhắc việc trên máy.'],
    ['unreachable', { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.' } as Saved, 'Không kết nối được'],
    ['contract_violation', { kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' } as Saved, 'Có lỗi không mong đợi'],
  ])('%s: the message, the draft kept, and "Lưu" sends it again', async (_name, first, text) => {
    const { saveSettings, navigate } = renderWith([OPEN], [first, SAVED])
    await loaded()
    type('Mỗi', '4')
    press('Lưu')
    expect((await screen.findByRole('alert')).textContent).toContain(text)
    expect(field('Mỗi').value).toBe('4')
    expect(navigate).not.toHaveBeenCalled()
    press('Lưu')
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(saveSettings).toHaveBeenCalledTimes(2)
    expect(saveSettings.mock.calls[1][0].every).toBe('4')
  })
})
