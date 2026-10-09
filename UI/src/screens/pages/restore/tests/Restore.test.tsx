// @vitest-environment jsdom
//
// Render tests of the page restore (i5-screens.md, Step I5.4), with fake Routers
// (ui_decomposition.md "Chặng F", plan of session 37, item 5): the first frame (the
// status is being read, nothing can be pressed); the title, the button row with the
// one main action, the fixed line; the status read ONCE on opening, with every result
// (nothing waiting, a restore waiting, 500, a rejected Promise, off the contract); the
// flow "choose a file, ask, prepare" (a cancel or a rejected dialog sends nothing, a
// chosen file sends nothing either and puts the question in the page with the focus on
// "Chuẩn bị khôi phục", "Quay lại" sends nothing, a confirmation prepares once); every
// result of prepare (200, 400, 404, 409, 424, 500, 503, a rejected Promise, off the
// contract) with the frame the way Services gave it back; cancel (no question, 200 true
// and false, 500, a rejected Promise, off the contract); one operation at a time. Never
// a call to anything but the four operations of the page, and none of them applies a restore.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChoiceView, PendingView, RunOutcome, ViewResult } from '../../../../logic/workflows/restore_data/routers'
import { fakeManageClient, fakeRestoreData, pending as held, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { Restore } from '../Restore'

const ARCHIVE = 'D:\\Backups\\commission-tracker-manual-20261009-120000.ctbackup'
const NOTE = 'Hãy đóng rồi mở lại ứng dụng để hoàn tất. Dữ liệu bạn nhập từ lúc chuẩn bị tới lúc mở lại sẽ không có trong dữ liệu sau khôi phục.'
const frameOf = (path: string, preparedAt: string): PendingView => ({
  state: 'pending',
  entries: [
    { key: 'archive_path', term: 'Tệp sao lưu', value: path },
    { key: 'archive_created_at', term: 'Bản sao lưu tạo lúc', value: '12:00 09/10/2026' },
    { key: 'prepared_at', term: 'Chuẩn bị lúc', value: preparedAt },
    { key: 'safety_backup_path', term: 'Bản sao lưu an toàn của dữ liệu trước khi khôi phục', value: 'C:\\data\\safety-backups\\pre-restore.ctbackup' },
  ],
  note: NOTE,
})
const FRAME = frameOf(ARCHIVE, '13:05 09/10/2026')
const OLD_FRAME = frameOf('E:\\Old\\older.ctbackup', '09:30 08/10/2026')
const NONE: PendingView = { state: 'none' }
const UNKNOWN: PendingView = { state: 'unknown' }

const done = (message: string | null, pendingView: PendingView): RunOutcome => ({ result: { kind: 'ok', view: { message } }, pending: pendingView })
const rejected = (code: string, message: string, pendingView: PendingView): RunOutcome => ({
  result: { kind: 'rejected', origin: 'system', code, message, fieldErrors: {} },
  pending: pendingView,
})
const violation = (pendingView: PendingView): RunOutcome => ({
  result: { kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi. Thao tác chưa được thực hiện.' },
  pending: pendingView,
})
const unreachable = (pendingView: PendingView): RunOutcome => ({
  result: { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.' },
  pending: pendingView,
})
const IPC_FAILED = 'Không liên lạc được với ứng dụng. Hãy đóng rồi mở lại ứng dụng.'

const QUESTION_TEXT = `Khôi phục từ tệp: ${ARCHIVE}\nKhi bạn đóng rồi mở lại ứng dụng, toàn bộ dữ liệu hiện tại sẽ được thay bằng dữ liệu trong tệp này.`
const chosen = (question: string = QUESTION_TEXT): ViewResult<ChoiceView> => ({ kind: 'ok', view: { outcome: 'chosen', path: ARCHIVE, question } })
const CANCELED: ViewResult<ChoiceView> = { kind: 'ok', view: { outcome: 'canceled' } }

type Fakes = {
  loadStatus: ReturnType<typeof vi.fn<() => Promise<RunOutcome>>>
  chooseArchive: ReturnType<typeof vi.fn<(replacesPending: boolean) => Promise<ViewResult<ChoiceView>>>>
  prepare: ReturnType<typeof vi.fn<(path: string) => Promise<RunOutcome>>>
  cancel: ReturnType<typeof vi.fn<() => Promise<RunOutcome>>>
}

// Routers that answer from the queues given; a call with nothing queued fails the test.
function routers(over: { status?: RunOutcome[]; choose?: ViewResult<ChoiceView>[]; prepare?: RunOutcome[]; cancel?: RunOutcome[] }): Fakes {
  const take = <T,>(name: string, queue: T[] | undefined) =>
    vi.fn(async (..._args: unknown[]): Promise<T> => {
      void _args
      const next = queue?.shift()
      if (next === undefined) throw new Error(`test: ${name} was not expected to be called (again)`)
      return next
    })
  return {
    loadStatus: take('loadStatus', over.status),
    chooseArchive: take('chooseArchive', over.choose),
    prepare: take('prepare', over.prepare),
    cancel: take('cancel', over.cancel),
  } as unknown as Fakes
}

function renderPage(fakes: Fakes) {
  return renderWithLogic(<Restore />, fakeManageClient({}), undefined, undefined, undefined, undefined, undefined, undefined, fakeRestoreData(fakes))
}

const CHOOSE = 'Chọn tệp sao lưu'
const CANCEL = 'Hủy lần khôi phục đang chờ'
const CONFIRM = 'Chuẩn bị khôi phục'
const BACK = 'Quay lại'
// A string name of Testing Library matches the whole accessible name, case included.
const btn = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const hasBtn = (name: string) => screen.queryByRole('button', { name }) !== null
const statusTexts = () => screen.queryAllByRole('status').map((e) => e.textContent)
const WAITING_LINE = 'Không có lần khôi phục nào đang chờ.'
const frameBox = () => screen.queryByRole('region', { name: 'Đang chờ khôi phục' })
const panel = () => screen.queryByRole('group', { name: 'Xác nhận chuẩn bị khôi phục' })

// Open the page and wait for the status to be read.
async function opened(fakes: Fakes) {
  const rendered = renderPage(fakes)
  await vi.waitFor(() => expect(statusTexts()).not.toContain('Đang đọc trạng thái khôi phục…'))
  return rendered
}

const isFocused = (el: Element) => el.matches(':focus')

// Choose a file (the dialog answers `chosen`) and wait for the question.
async function questionOpen() {
  fireEvent.click(btn(CHOOSE))
  await vi.waitFor(() => expect(panel()).not.toBeNull())
}

afterEach(() => {
  cleanup()
})

describe('Restore — the page as it opens', () => {
  it('first frame: loading, nothing called yet, no alert, and nothing can be pressed', () => {
    const fakes = routers({ status: [done(null, NONE)] })
    const first = renderFirstCommit(<Restore />, fakeManageClient({}), undefined, undefined, undefined, undefined, undefined, undefined, fakeRestoreData(fakes))
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang đọc trạng thái khôi phục…'])
    expect(first.enabledButtons).toEqual([])
  })

  it('reads the status once, and the buttons wait until the answer is in', async () => {
    const gate = held<[], RunOutcome>()
    const fakes = routers({})
    fakes.loadStatus = gate.fn as unknown as Fakes['loadStatus']
    renderPage(fakes)
    expect(gate.fn).toHaveBeenCalledTimes(1)
    expect(btn(CHOOSE).disabled).toBe(true)
    expect(statusTexts()).toEqual(['Đang đọc trạng thái khôi phục…'])
    await act(async () => gate.release(done(null, NONE)))
    expect(btn(CHOOSE).disabled).toBe(false)
    expect(statusTexts()).toEqual([])
    expect(gate.fn).toHaveBeenCalledTimes(1)
  })

  it('the title, the one main button right under it, then the fixed line', async () => {
    await opened(routers({ status: [done(null, NONE)] }))
    expect(screen.getByRole('heading', { level: 2, name: 'Khôi phục dữ liệu' })).toBeTruthy()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([CHOOSE])
    const line = screen.getByText('Khôi phục thay toàn bộ dữ liệu hiện tại bằng dữ liệu trong một tệp sao lưu. Việc thay diễn ra khi bạn đóng rồi mở lại ứng dụng.')
    expect(btn(CHOOSE).compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(panel()).toBeNull()
  })

  it('nothing waiting: the plain line, no frame, no "Hủy lần khôi phục đang chờ"', async () => {
    await opened(routers({ status: [done(null, NONE)] }))
    expect(screen.getByText(WAITING_LINE)).toBeTruthy()
    expect(frameBox()).toBeNull()
    expect(hasBtn(CANCEL)).toBe(false)
  })

  it('a restore waiting: the frame with its four lines and the closing sentence; "Hủy lần khôi phục đang chờ" after the main button', async () => {
    await opened(routers({ status: [done(null, FRAME)] }))
    const box = frameBox()
    if (box === null) throw new Error('test: the frame is missing')
    expect(within(box).getByRole('heading', { level: 3, name: 'Đang chờ khôi phục' })).toBeTruthy()
    const dl = within(box).getByLabelText('Lần khôi phục đang chờ')
    expect(within(dl).getAllByRole('term').map((e) => e.textContent)).toEqual([
      'Tệp sao lưu',
      'Bản sao lưu tạo lúc',
      'Chuẩn bị lúc',
      'Bản sao lưu an toàn của dữ liệu trước khi khôi phục',
    ])
    expect(within(dl).getAllByRole('definition').map((e) => e.textContent)).toEqual([
      ARCHIVE,
      '12:00 09/10/2026',
      '13:05 09/10/2026',
      'C:\\data\\safety-backups\\pre-restore.ctbackup',
    ])
    expect(within(box).getByText(NOTE)).toBeTruthy()
    expect(screen.queryByText(WAITING_LINE)).toBeNull()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([CHOOSE, CANCEL])
    expect(btn(CHOOSE).disabled).toBe(false)
    expect(btn(CANCEL).disabled).toBe(false)
  })

  it('a long path is shown whole, in one definition (the kit wraps it)', async () => {
    const long = `D:\\${'Thư mục rất dài '.repeat(15)}\\bản sao lưu.ctbackup`
    await opened(routers({ status: [done(null, frameOf(long, '13:05 09/10/2026'))] }))
    expect(within(screen.getByLabelText('Lần khôi phục đang chờ')).getAllByRole('definition')[0].textContent).toBe(long)
  })

  it('500 → an alert "Chưa đọc được trạng thái" with its words; no frame, no plain line; choosing a file is still possible; no cancel', async () => {
    await opened(routers({ status: [rejected('ERR_STORAGE_IO', 'Không đọc được trạng thái khôi phục. Hãy mở lại trang này.', UNKNOWN)] }))
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Chưa đọc được trạng thái')
    expect(alert.textContent).toContain('Không đọc được trạng thái khôi phục. Hãy mở lại trang này.')
    expect(frameBox()).toBeNull()
    expect(screen.queryByText(WAITING_LINE)).toBeNull()
    expect(btn(CHOOSE).disabled).toBe(false)
    expect(hasBtn(CANCEL)).toBe(false)
  })

  it('a rejected Promise → "Không liên lạc được với ứng dụng…", the page stays usable', async () => {
    await opened(routers({ status: [rejected('IPC_FAILED', IPC_FAILED, UNKNOWN)] }))
    expect(screen.getByRole('alert').textContent).toContain(IPC_FAILED)
    expect(btn(CHOOSE).disabled).toBe(false)
  })

  it('an answer off the contract → the layer sentence, never shown as a success', async () => {
    await opened(routers({ status: [violation(UNKNOWN)] }))
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(alert.textContent).toContain('Ứng dụng nhận được một phản hồi không mong đợi.')
    expect(screen.queryByText(WAITING_LINE)).toBeNull()
    expect(statusTexts()).toEqual([])
  })

  it('unreachable (a kind the workflow does not produce, shown all the same) → "Không kết nối được"', async () => {
    await opened(routers({ status: [unreachable(UNKNOWN)] }))
    expect(screen.getByRole('alert').textContent).toContain('Không kết nối được')
  })
})

describe('Restore — "Chọn tệp sao lưu"', () => {
  it('opens one dialog; the buttons wait while it is open; asked with "no restore waiting"', async () => {
    const gate = held<[boolean], ViewResult<ChoiceView>>()
    const fakes = routers({ status: [done(null, NONE)] })
    fakes.chooseArchive = gate.fn as unknown as Fakes['chooseArchive']
    await opened(fakes)
    fireEvent.click(btn(CHOOSE))
    expect(gate.fn).toHaveBeenCalledTimes(1)
    expect(gate.fn).toHaveBeenCalledWith(false)
    await vi.waitFor(() => expect(btn(CHOOSE).disabled).toBe(true))
    expect(btn(CHOOSE).getAttribute('aria-busy')).toBe('true')
    fireEvent.click(btn(CHOOSE))
    expect(gate.fn).toHaveBeenCalledTimes(1)
    await act(async () => gate.release(CANCELED))
    await vi.waitFor(() => expect(btn(CHOOSE).disabled).toBe(false))
    expect(gate.fn).toHaveBeenCalledTimes(1)
  })

  it('with a restore waiting the dialog is asked with "a restore waits", and the buttons of the row both wait', async () => {
    const gate = held<[boolean], ViewResult<ChoiceView>>()
    const fakes = routers({ status: [done(null, FRAME)] })
    fakes.chooseArchive = gate.fn as unknown as Fakes['chooseArchive']
    await opened(fakes)
    fireEvent.click(btn(CHOOSE))
    expect(gate.fn).toHaveBeenCalledWith(true)
    await vi.waitFor(() => expect(btn(CANCEL).disabled).toBe(true))
    await act(async () => gate.release(CANCELED))
  })

  it('the dialog cancelled: nothing changes (no question, no alert, no notice), the buttons are usable again, prepare is not called', async () => {
    const fakes = routers({ status: [done(null, FRAME)], choose: [CANCELED] })
    const { container } = await opened(fakes)
    const before = container.innerHTML
    fireEvent.click(btn(CHOOSE))
    await vi.waitFor(() => expect(fakes.chooseArchive).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(btn(CHOOSE).disabled).toBe(false))
    expect(panel()).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(statusTexts()).toEqual([])
    expect(container.innerHTML).toBe(before)
    expect(fakes.prepare).not.toHaveBeenCalled()
  })

  it('a cancel after a success keeps the earlier notice and frame', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen(), CANCELED], prepare: [done('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.', FRAME)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    await screen.findByText('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.')
    fireEvent.click(btn(CHOOSE))
    await vi.waitFor(() => expect(fakes.chooseArchive).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(btn(CHOOSE).disabled).toBe(false))
    expect(screen.getByText('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.')).toBeTruthy()
    expect(frameBox()).not.toBeNull()
  })

  it('the dialog could not open → an alert "Chưa chọn được tệp" with its own sentence; nothing is prepared; usable again', async () => {
    const fakes = routers({
      status: [done(null, NONE)],
      choose: [{ kind: 'rejected', origin: 'system', code: 'DIALOG_FAILED', message: 'Không mở được hộp thoại chọn tệp. Hãy thử lại.', fieldErrors: {} }],
    })
    await opened(fakes)
    fireEvent.click(btn(CHOOSE))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa chọn được tệp')
    expect(alert.textContent).toContain('Không mở được hộp thoại chọn tệp. Hãy thử lại.')
    expect(panel()).toBeNull()
    expect(fakes.prepare).not.toHaveBeenCalled()
    expect(btn(CHOOSE).disabled).toBe(false)
  })

  it('an answer of the dialog off the contract → the layer sentence; nothing is prepared', async () => {
    const fakes = routers({
      status: [done(null, NONE)],
      choose: [{ kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi. Thao tác chưa được thực hiện.' }],
    })
    await opened(fakes)
    fireEvent.click(btn(CHOOSE))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(panel()).toBeNull()
    expect(fakes.prepare).not.toHaveBeenCalled()
  })

  it('the dialog failing leaves the frame of the waiting restore as it was', async () => {
    const fakes = routers({
      status: [done(null, FRAME)],
      choose: [{ kind: 'rejected', origin: 'system', code: 'DIALOG_FAILED', message: 'Không mở được hộp thoại chọn tệp. Hãy thử lại.', fieldErrors: {} }],
    })
    await opened(fakes)
    fireEvent.click(btn(CHOOSE))
    await screen.findByRole('alert')
    expect(frameBox()).not.toBeNull()
    expect(hasBtn(CANCEL)).toBe(true)
  })
})

describe('Restore — the question in the page', () => {
  it('a chosen file sends nothing: the question appears inside the page, with its lines, a danger-free native group (no system dialog)', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()] })
    await opened(fakes)
    await questionOpen()
    const p = panel()
    if (p === null) throw new Error('test: the question is missing')
    expect(p.textContent).toContain(`Khôi phục từ tệp: ${ARCHIVE}`)
    expect(p.textContent).toContain('toàn bộ dữ liệu hiện tại sẽ được thay bằng dữ liệu trong tệp này')
    expect(fakes.prepare).not.toHaveBeenCalled()
    expect(fakes.cancel).not.toHaveBeenCalled()
    expect(fakes.loadStatus).toHaveBeenCalledTimes(1)
  })

  it('the focus moves to "Chuẩn bị khôi phục"; the two buttons of the row are disabled while the question is open', async () => {
    const fakes = routers({ status: [done(null, FRAME)], choose: [chosen()] })
    await opened(fakes)
    await questionOpen()
    // The kit moves the focus in a passive effect, after the commit that shows the question.
    await vi.waitFor(() => expect(isFocused(btn(CONFIRM))).toBe(true))
    expect(btn(CHOOSE).disabled).toBe(true)
    expect(btn(CANCEL).disabled).toBe(true)
    expect(btn(BACK).disabled).toBe(false)
    expect(btn(CONFIRM).disabled).toBe(false)
  })

  it('the text of the question is what Routers gave (the sentence about replacing is theirs to add)', async () => {
    const text = `Khôi phục từ tệp: ${ARCHIVE}\nKhi bạn đóng …\nLần khôi phục đang chờ sẽ được thay bằng lần này.`
    const fakes = routers({ status: [done(null, FRAME)], choose: [chosen(text)] })
    await opened(fakes)
    await questionOpen()
    expect(fakes.chooseArchive).toHaveBeenCalledWith(true)
    expect(panel()?.textContent).toContain('Lần khôi phục đang chờ sẽ được thay bằng lần này.')
  })

  it('no sentence about replacing when none waits (the page adds none of its own)', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()] })
    await opened(fakes)
    await questionOpen()
    expect(fakes.chooseArchive).toHaveBeenCalledWith(false)
    expect(panel()?.textContent).not.toContain('thay bằng lần này')
  })

  it('"Quay lại" closes the question and sends nothing; the buttons are usable again; nothing else changed', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(BACK))
    expect(panel()).toBeNull()
    expect(fakes.prepare).not.toHaveBeenCalled()
    expect(fakes.cancel).not.toHaveBeenCalled()
    expect(fakes.loadStatus).toHaveBeenCalledTimes(1)
    expect(btn(CHOOSE).disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(statusTexts()).toEqual([])
    expect(screen.getByText(WAITING_LINE)).toBeTruthy()
  })

  it('a new file can be chosen after "Quay lại": a second question', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen(), chosen('Khôi phục từ tệp: E:\\b.ctbackup')] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(BACK))
    await questionOpen()
    expect(panel()?.textContent).toContain('E:\\b.ctbackup')
    expect(fakes.chooseArchive).toHaveBeenCalledTimes(2)
    expect(fakes.prepare).not.toHaveBeenCalled()
  })
})

describe('Restore — "Chuẩn bị khôi phục"', () => {
  it('prepares once with exactly the path that was chosen; while it runs the status says so and every button waits', async () => {
    const gate = held<[string], RunOutcome>()
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()] })
    fakes.prepare = gate.fn as unknown as Fakes['prepare']
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    expect(gate.fn).toHaveBeenCalledTimes(1)
    expect(gate.fn).toHaveBeenCalledWith(ARCHIVE)
    await vi.waitFor(() => expect(statusTexts()).toEqual(['Đang chuẩn bị khôi phục…']))
    expect(btn(CONFIRM).disabled).toBe(true)
    expect(btn(BACK).disabled).toBe(true)
    expect(btn(CHOOSE).disabled).toBe(true)
    fireEvent.click(btn(CONFIRM))
    expect(gate.fn).toHaveBeenCalledTimes(1)
    await act(async () => gate.release(done('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.', FRAME)))
    expect(statusTexts()).toEqual(['Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.'])
    expect(gate.fn).toHaveBeenCalledTimes(1)
  })

  it('200 → the notice, the question gone, the frame built from what came back (the status is not read again), "Hủy lần khôi phục đang chờ" appears', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()], prepare: [done('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.', FRAME)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    expect(await screen.findByText('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.')).toBeTruthy()
    expect(panel()).toBeNull()
    expect(statusTexts()).toEqual(['Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.'])
    expect(screen.queryByRole('alert')).toBeNull()
    expect(within(screen.getByLabelText('Lần khôi phục đang chờ')).getAllByRole('definition')[0].textContent).toBe(ARCHIVE)
    expect(screen.queryByText(WAITING_LINE)).toBeNull()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([CHOOSE, CANCEL])
    expect(btn(CHOOSE).disabled).toBe(false)
    expect(fakes.loadStatus).toHaveBeenCalledTimes(1)
  })

  const SENTENCES: [string, string, string][] = [
    ['400', 'ERR_VALIDATION', 'Không dùng được tệp này. Hãy chọn tệp khác.'],
    ['404', 'ERR_NOT_FOUND', 'Không tìm thấy tệp này. Có thể tệp đã bị chuyển hoặc xóa. Hãy chọn lại.'],
    ['409', 'ERR_INCOMPATIBLE_BACKUP', 'Tệp này không dùng được để khôi phục: có thể không phải bản sao lưu của Commission Tracker, đã bị hỏng, hoặc được tạo bởi phiên bản mới hơn của ứng dụng.'],
    ['424', 'ERR_STORAGE_IO', 'Không tạo được bản sao lưu an toàn của dữ liệu hiện tại, nên chưa chuẩn bị khôi phục. Hãy kiểm tra ổ đĩa còn chỗ trống rồi thử lại.'],
    ['500', 'ERR_STORAGE_IO', 'Không ghi được thông tin khôi phục, nên chưa chuẩn bị khôi phục. Hãy thử lại.'],
    ['503', 'ERR_SERVICE_UNAVAILABLE', 'Ứng dụng chưa đọc được tệp sao lưu vì phần xử lý dữ liệu không phản hồi. Hãy đóng rồi mở lại ứng dụng, rồi thử lại.'],
  ]
  it.each(SENTENCES)('%s → an alert "Chưa chuẩn bị được khôi phục" with its sentence; the question is gone; the buttons are usable; the frame is what Routers gave back (none)', async (_label, code, message) => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()], prepare: [rejected(code, message, NONE)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa chuẩn bị được khôi phục')
    expect(alert.textContent).toContain(message)
    expect(panel()).toBeNull()
    expect(btn(CHOOSE).disabled).toBe(false)
    expect(screen.getByText(WAITING_LINE)).toBeTruthy()
    expect(frameBox()).toBeNull()
    expect(statusTexts()).toEqual([])
  })

  it('a 400 that kept the old record: the frame shows that record, next to the failure', async () => {
    const fakes = routers({ status: [done(null, OLD_FRAME)], choose: [chosen()], prepare: [rejected('ERR_VALIDATION', 'Không dùng được tệp này. Hãy chọn tệp khác.', OLD_FRAME)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    await screen.findByRole('alert')
    expect(within(screen.getByLabelText('Lần khôi phục đang chờ')).getAllByRole('definition')[0].textContent).toBe('E:\\Old\\older.ctbackup')
    expect(hasBtn(CANCEL)).toBe(true)
  })

  it('a failure after which the status could not be read: the frame goes, the plain line is not claimed, the message of the failure stays', async () => {
    const fakes = routers({ status: [done(null, OLD_FRAME)], choose: [chosen()], prepare: [rejected('ERR_STORAGE_IO', 'Không ghi được thông tin khôi phục, nên chưa chuẩn bị khôi phục. Hãy thử lại.', UNKNOWN)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không ghi được thông tin khôi phục')
    expect(frameBox()).toBeNull()
    expect(screen.queryByText(WAITING_LINE)).toBeNull()
    expect(hasBtn(CANCEL)).toBe(false)
  })

  it('a rejected Promise → "Không liên lạc được với ứng dụng…"', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()], prepare: [rejected('IPC_FAILED', IPC_FAILED, NONE)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(IPC_FAILED)
    expect(btn(CHOOSE).disabled).toBe(false)
  })

  it('an answer off the contract → the layer sentence, never shown as a success', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()], prepare: [violation(NONE)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(screen.queryByText(/Đã chuẩn bị khôi phục/)).toBeNull()
    expect(statusTexts()).toEqual([])
  })

  it('unreachable (a kind the workflow does not produce, shown all the same) → "Không kết nối được"', async () => {
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()], prepare: [unreachable(NONE)] })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được')
  })

  it('a failure and then a success: the alert goes, the notice and the frame come', async () => {
    const fakes = routers({
      status: [done(null, NONE)],
      choose: [chosen(), chosen()],
      prepare: [rejected('ERR_VALIDATION', 'Không dùng được tệp này. Hãy chọn tệp khác.', NONE), done('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.', FRAME)],
    })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    await screen.findByRole('alert')
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    await screen.findByText('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(frameBox()).not.toBeNull()
  })

  it('a success and then a failure: the notice goes, the alert comes', async () => {
    const fakes = routers({
      status: [done(null, NONE)],
      choose: [chosen(), chosen()],
      prepare: [done('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.', FRAME), rejected('ERR_NOT_FOUND', 'Không tìm thấy tệp này. Có thể tệp đã bị chuyển hoặc xóa. Hãy chọn lại.', FRAME)],
    })
    await opened(fakes)
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    await screen.findByText('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.')
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    await screen.findByRole('alert')
    expect(screen.queryByText('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.')).toBeNull()
  })
})

describe('Restore — "Hủy lần khôi phục đang chờ"', () => {
  it('asks no question: one press calls cancel once; while it runs the status says so and every button waits', async () => {
    const gate = held<[], RunOutcome>()
    const fakes = routers({ status: [done(null, FRAME)] })
    fakes.cancel = gate.fn as unknown as Fakes['cancel']
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    expect(panel()).toBeNull()
    expect(screen.queryByRole('group')).toBeNull()
    expect(gate.fn).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(statusTexts()).toEqual(['Đang hủy lần khôi phục đang chờ…']))
    expect(btn(CANCEL).disabled).toBe(true)
    expect(btn(CANCEL).getAttribute('aria-busy')).toBe('true')
    expect(btn(CHOOSE).disabled).toBe(true)
    fireEvent.click(btn(CANCEL))
    expect(gate.fn).toHaveBeenCalledTimes(1)
    await act(async () => gate.release(done('Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.', NONE)))
    expect(gate.fn).toHaveBeenCalledTimes(1)
  })

  it('canceled true → the notice, the frame goes, the plain line shows, no "Hủy…" button', async () => {
    const fakes = routers({ status: [done(null, FRAME)], cancel: [done('Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.', NONE)] })
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    expect(await screen.findByText('Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.')).toBeTruthy()
    expect(frameBox()).toBeNull()
    expect(hasBtn(CANCEL)).toBe(false)
    expect(screen.getByText(WAITING_LINE)).toBeTruthy()
    expect(btn(CHOOSE).disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('canceled false → "Không còn lần khôi phục nào đang chờ.", the frame goes', async () => {
    const fakes = routers({ status: [done(null, FRAME)], cancel: [done('Không còn lần khôi phục nào đang chờ.', NONE)] })
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    expect(await screen.findByText('Không còn lần khôi phục nào đang chờ.')).toBeTruthy()
    expect(frameBox()).toBeNull()
  })

  it('500 → an alert "Chưa hủy được lần khôi phục"; the frame is what Routers gave back after reading again (still waiting)', async () => {
    const fakes = routers({ status: [done(null, FRAME)], cancel: [rejected('ERR_STORAGE_IO', 'Không hủy được lần khôi phục đang chờ. Hãy thử lại.', FRAME)] })
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chưa hủy được lần khôi phục')
    expect(alert.textContent).toContain('Không hủy được lần khôi phục đang chờ. Hãy thử lại.')
    expect(frameBox()).not.toBeNull()
    expect(btn(CANCEL).disabled).toBe(false)
    expect(btn(CHOOSE).disabled).toBe(false)
  })

  it('a rejected Promise → "Không liên lạc được với ứng dụng…", then the frame the second read gave', async () => {
    const fakes = routers({ status: [done(null, FRAME)], cancel: [rejected('IPC_FAILED', IPC_FAILED, UNKNOWN)] })
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    expect((await screen.findByRole('alert')).textContent).toContain(IPC_FAILED)
    expect(frameBox()).toBeNull()
    expect(screen.queryByText(WAITING_LINE)).toBeNull()
  })

  it('an answer off the contract → the layer sentence', async () => {
    const fakes = routers({ status: [done(null, FRAME)], cancel: [violation(FRAME)] })
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    expect((await screen.findByRole('alert')).textContent).toContain('Có lỗi không mong đợi')
    expect(frameBox()).not.toBeNull()
  })

  it('unreachable (a kind the workflow does not produce, shown all the same) → "Không kết nối được"', async () => {
    const fakes = routers({ status: [done(null, FRAME)], cancel: [unreachable(FRAME)] })
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    expect((await screen.findByRole('alert')).textContent).toContain('Không kết nối được')
  })

  it('after a cancel a restore can be prepared again: the page asks "nothing waits"', async () => {
    const fakes = routers({ status: [done(null, FRAME)], cancel: [done('Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.', NONE)], choose: [chosen()] })
    await opened(fakes)
    fireEvent.click(btn(CANCEL))
    await screen.findByText('Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.')
    await questionOpen()
    expect(fakes.chooseArchive).toHaveBeenCalledWith(false)
  })
})

describe('Restore — leaving the page', () => {
  it('the page is left while the status is read: the late answer changes nothing and throws nothing', async () => {
    const gate = held<[], RunOutcome>()
    const fakes = routers({})
    fakes.loadStatus = gate.fn as unknown as Fakes['loadStatus']
    const { unmount } = renderPage(fakes)
    unmount()
    await act(async () => gate.release(done(null, FRAME)))
    expect(screen.queryByText(WAITING_LINE)).toBeNull()
    expect(frameBox()).toBeNull()
  })

  it('the page is left while a restore is prepared: the late answer changes nothing and throws nothing', async () => {
    const gate = held<[string], RunOutcome>()
    const fakes = routers({ status: [done(null, NONE)], choose: [chosen()] })
    fakes.prepare = gate.fn as unknown as Fakes['prepare']
    renderPage(fakes)
    await vi.waitFor(() => expect(statusTexts()).toEqual([]))
    await questionOpen()
    fireEvent.click(btn(CONFIRM))
    cleanup()
    await act(async () => gate.release(done('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.', FRAME)))
    expect(screen.queryByText('Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.')).toBeNull()
  })
})
