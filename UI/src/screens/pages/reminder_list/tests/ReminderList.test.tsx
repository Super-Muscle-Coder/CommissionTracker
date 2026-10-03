// @vitest-environment jsdom
//
// Render tests of the page reminder_list (i5-screens.md, Step I5.4), with fake
// Routers: the first frame (UI-4); every ViewResult kind of its loading
// operation loadPending: ok with both kinds of reminder (their lines, the
// order given), ok and empty (with the button), rejected 500, unreachable +
// "Tải lại", contract_violation; the button row ("Cài đặt nhắc việc" first,
// "Tải lại"); the fixed line and the notice; the main line of a reminder opens
// its commission or the commission list; "Đã xem" (ui_decomposition.md D6,
// §7.2 principle 5: no question): one acknowledge, every "Đã xem" disabled
// while it runs, every kind of its result (ok → the list read again and the
// notice; 404 → the message and the list read again; 500, unreachable,
// contract_violation → the message, the list as it was).
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AcknowledgedView, PendingListView, ViewResult } from '../../../../logic/workflows/send_reminder/routers'
import type { Navigate } from '../../../navigation'
import { answers, fakeManageClient, fakeSendReminder, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { ReminderList } from '../ReminderList'

type Loaded = ViewResult<PendingListView>
type Acked = ViewResult<AcknowledgedView>

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const N1 = '00000000-0000-4000-8000-000000000001'
const N2 = '00000000-0000-4000-8000-000000000002'

const ROWS = [
  {
    notificationId: N1,
    text: 'Sắp tới hạn giao: Chân dung bán thân',
    detailText: 'Hạn giao 03/10/2026 · nhắc trước 1 ngày · đến hạn lúc 00:00 03/10/2026',
    open: { to: 'commission_detail', commissionId: CID } as const,
  },
  {
    notificationId: N2,
    text: 'Tổng hợp định kỳ: 3 đơn đang mở',
    detailText: '2 đơn có hạn giao · đến hạn lúc 09:00 03/10/2026 · sớm nhất: Minh họa bìa sách (01/01/2026)',
    open: { to: 'commission_list' } as const,
  },
]
const LIST_OK: Loaded = { kind: 'ok', view: { rows: ROWS, isEmpty: false, emptyText: 'Không có nhắc việc nào đang chờ.' } }
const AFTER_ONE: Loaded = { kind: 'ok', view: { rows: [ROWS[1]], isEmpty: false, emptyText: 'x' } }
const EMPTY_OK: Loaded = { kind: 'ok', view: { rows: [], isEmpty: true, emptyText: 'Không có nhắc việc nào đang chờ.' } }
const ACKED: Acked = { kind: 'ok', view: { message: 'Đã đánh dấu đã xem.' } }
const rejected = (code: string, message: string): Loaded => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
const rejectedAck = (code: string, message: string): Acked => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })

function renderWith(lists: Loaded[], acks: Acked[] = [], notice: string | null = null) {
  const loadPending = answers<[], Loaded>(...lists)
  const acknowledge = answers<[string], Acked>(...acks)
  const navigate = vi.fn<Navigate>()
  renderWithLogic(
    <ReminderList params={null} navigate={navigate} notice={notice} />,
    fakeManageClient({}),
    undefined,
    undefined,
    undefined,
    undefined,
    fakeSendReminder({ loadPending, acknowledge }),
  )
  return { loadPending, acknowledge, navigate }
}

const ackButtons = () => screen.queryAllByRole('button', { name: 'Đã xem' })
const items = () => within(screen.getByRole('list', { name: 'Nhắc việc đang chờ' })).getAllByRole('listitem')
const statusTexts = () => screen.queryAllByRole('status').map((e) => e.textContent)

afterEach(() => {
  cleanup()
})

describe('page reminder_list: opening', () => {
  it('first frame, before Routers answers: loading shown; only "Cài đặt nhắc việc" can be pressed (UI-4)', async () => {
    const load = pending<[], Loaded>()
    const first = renderFirstCommit(
      <ReminderList params={null} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      undefined,
      undefined,
      fakeSendReminder({ loadPending: load.fn }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang tải nhắc việc…'])
    expect(first.enabledButtons).toEqual(['Cài đặt nhắc việc'])
    await act(async () => load.release(LIST_OK))
    expect(await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })).toBeTruthy()
  })

  it('ok: Routers asked once; the title, the button row under it, the fixed line, then both kinds of reminder in the order given', async () => {
    const { loadPending } = renderWith([LIST_OK])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    expect(loadPending).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Nhắc việc' })).toBeTruthy()
    // "Cài đặt nhắc việc" (main action) first, then "Tải lại"; then the main line and "Đã xem" of each reminder.
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Cài đặt nhắc việc',
      'Tải lại',
      `${ROWS[0].text} ${ROWS[0].detailText}`,
      'Đã xem',
      `${ROWS[1].text} ${ROWS[1].detailText}`,
      'Đã xem',
    ])
    expect(screen.getByText('Nhắc việc đến hạn sẽ hiện thành thông báo của Windows. Mọi nhắc việc chưa đánh dấu đã xem nằm ở đây.')).toBeTruthy()
    expect(items().map((li) => li.textContent)).toEqual([`${ROWS[0].text} ${ROWS[0].detailText}Đã xem`, `${ROWS[1].text} ${ROWS[1].detailText}Đã xem`])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('the deadline reminder: its two lines as given', async () => {
    renderWith([LIST_OK])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    expect(items()[0].textContent).toContain('Sắp tới hạn giao: Chân dung bán thân')
    expect(items()[0].textContent).toContain('Hạn giao 03/10/2026 · nhắc trước 1 ngày · đến hạn lúc 00:00 03/10/2026')
  })

  it('the periodic digest: its two lines as given', async () => {
    renderWith([LIST_OK])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    expect(items()[1].textContent).toContain('Tổng hợp định kỳ: 3 đơn đang mở')
    expect(items()[1].textContent).toContain('2 đơn có hạn giao · đến hạn lúc 09:00 03/10/2026 · sớm nhất: Minh họa bìa sách (01/01/2026)')
  })

  it('an empty list: the words and a button "Cài đặt nhắc việc" in the empty state as well as in the row', async () => {
    const { navigate } = renderWith([EMPTY_OK])
    await screen.findByText('Không có nhắc việc nào đang chờ.')
    expect(screen.queryByRole('list', { name: 'Nhắc việc đang chờ' })).toBeNull()
    const settings = screen.getAllByRole('button', { name: 'Cài đặt nhắc việc' })
    expect(settings).toHaveLength(2)
    fireEvent.click(settings[1])
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'reminder_settings', params: null }, null)
  })

  it('"Cài đặt nhắc việc" opens reminder_settings', async () => {
    const { navigate } = renderWith([LIST_OK])
    fireEvent.click(await screen.findByRole('button', { name: 'Cài đặt nhắc việc' }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'reminder_settings', params: null }, null)
  })

  it('the notice handed over by reminder_settings is shown', async () => {
    renderWith([LIST_OK], [], 'Đã lưu cài đặt nhắc việc.')
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    expect(statusTexts()).toEqual(['Đã lưu cài đặt nhắc việc.'])
  })

  it('"Tải lại" asks Routers again and shows the new list', async () => {
    const { loadPending } = renderWith([LIST_OK, AFTER_ONE])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(loadPending).toHaveBeenCalledTimes(2)
  })
})

describe('page reminder_list: the main line opens what the reminder is about', () => {
  it('a deadline reminder opens commission_detail with its commission', async () => {
    const { navigate } = renderWith([LIST_OK])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(within(items()[0]).getByRole('button', { name: new RegExp(`^${ROWS[0].text}`) }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_detail', params: { commission_id: CID } }, null)
  })

  it('a periodic digest opens commission_list', async () => {
    const { navigate } = renderWith([LIST_OK])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(within(items()[1]).getByRole('button', { name: new RegExp(`^${ROWS[1].text}`) }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ page: 'commission_list', params: null }, null)
  })

  it('"Đã xem" does not open anything', async () => {
    const { navigate } = renderWith([LIST_OK, AFTER_ONE], [ACKED])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[0])
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('page reminder_list: "Đã xem"', () => {
  it('sends one acknowledge with the id of that reminder, at once (no question), then reads the list again and says so', async () => {
    const { acknowledge, loadPending } = renderWith([LIST_OK, AFTER_ONE], [ACKED])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[0])
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(acknowledge).toHaveBeenCalledExactlyOnceWith(N1)
    expect(loadPending).toHaveBeenCalledTimes(2)
    expect(items()[0].textContent).toContain('Tổng hợp định kỳ')
    expect(statusTexts()).toEqual(['Đã đánh dấu đã xem.'])
    // No question: no group, no confirmation button.
    expect(screen.queryByRole('group')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).toBeNull()
  })

  it('the second reminder is acknowledged with its own id', async () => {
    const { acknowledge } = renderWith([LIST_OK, AFTER_ONE], [ACKED])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[1])
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(acknowledge).toHaveBeenCalledExactlyOnceWith(N2)
  })

  it('while it runs, every "Đã xem" is disabled, and a second press sends nothing', async () => {
    const ack = pending<[string], Acked>()
    const loadPending = answers<[], Loaded>(LIST_OK, AFTER_ONE)
    renderWithLogic(
      <ReminderList params={null} navigate={vi.fn()} notice={null} />,
      fakeManageClient({}),
      undefined,
      undefined,
      undefined,
      undefined,
      fakeSendReminder({ loadPending, acknowledge: ack.fn }),
    )
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[0])
    await waitFor(() => expect(ack.fn).toHaveBeenCalledTimes(1))
    for (const b of ackButtons()) expect((b as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(ackButtons()[1])
    expect(ack.fn).toHaveBeenCalledTimes(1)
    await act(async () => ack.release(ACKED))
    await waitFor(() => expect(items()).toHaveLength(1))
    for (const b of ackButtons()) expect((b as HTMLButtonElement).disabled).toBe(false)
  })

  it('404: the message, and the list read again (the reminder is gone)', async () => {
    const { loadPending } = renderWith([LIST_OK, AFTER_ONE], [rejectedAck('ERR_NOT_FOUND', 'Nhắc việc này không còn trong danh sách.')])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[0])
    expect((await screen.findByRole('alert')).textContent).toContain('Nhắc việc này không còn trong danh sách.')
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(loadPending).toHaveBeenCalledTimes(2)
  })

  it('500: the message, the list as it was (a second reading that fails changes nothing)', async () => {
    renderWith([LIST_OK, rejected('ERR_STORAGE_IO', 'no')], [rejectedAck('ERR_STORAGE_IO', 'Không ghi được dữ liệu nhắc việc trên máy.')])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[0])
    expect((await screen.findByRole('alert')).textContent).toContain('Không ghi được dữ liệu nhắc việc trên máy.')
    expect(items()).toHaveLength(2)
    expect(statusTexts()).toEqual([])
  })

  it('unreachable: "Không kết nối được", the list as it was, no second reading', async () => {
    const { loadPending } = renderWith([LIST_OK], [{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.' }])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[0])
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được')
    expect(items()).toHaveLength(2)
    expect(loadPending).toHaveBeenCalledTimes(1)
  })

  it('contract_violation: the message, the list as it was', async () => {
    renderWith([LIST_OK], [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    fireEvent.click(ackButtons()[0])
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(items()).toHaveLength(2)
  })
})

describe('page reminder_list: the other results of loading', () => {
  it('rejected 500: the message; no list, no empty state', async () => {
    renderWith([rejected('ERR_STORAGE_IO', 'Không đọc được danh sách nhắc việc trên máy.')])
    expect((await screen.findByRole('alert')).textContent).toContain('Không đọc được danh sách nhắc việc trên máy.')
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByText('Không có nhắc việc nào đang chờ.')).toBeNull()
  })

  it('unreachable: "Không kết nối được", and "Tải lại" runs the same operation; the list comes back', async () => {
    const { loadPending } = renderWith([{ kind: 'unreachable', message: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.' }, LIST_OK])
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được')
    expect(screen.queryByRole('list')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    await screen.findByRole('list', { name: 'Nhắc việc đang chờ' })
    expect(loadPending).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('contract_violation: "Có lỗi không mong đợi", no list', async () => {
    renderWith([{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi.' }])
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByRole('list')).toBeNull()
  })
})
