// @vitest-environment jsdom
//
// Render tests of the page backup (i5-screens.md, Step I5.4), with fake Routers:
// the first frame (nothing called, no result frame, no status); the title, the
// button row with the one main action, the fixed line; every result of the one
// operation createBackup (ui_decomposition.md "Chặng E"): created (the notice and
// the frame of three lines), cancelled (nothing changes), the dialog rejected,
// 400, 500, unreachable, contract_violation (each an alert, and the frame of an
// earlier press is gone); one press = one flow, even pressed twice in a row; the
// button waits during the dialog and during the creation; "Đang tạo bản sao
// lưu…" shows only once the folder is chosen (onCreating); a second success
// replaces the frame. Never a call to prepare_restore: the page has no such operation.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BackupRunView, ViewResult } from '../../../../logic/workflows/backup_data/routers'
import { fakeBackupData, fakeManageClient, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { Backup } from '../Backup'

type Run = ViewResult<BackupRunView>

const created = (path: string, size: string, at: string): Run => ({
  kind: 'ok',
  view: {
    outcome: 'created',
    message: 'Đã tạo bản sao lưu.',
    entries: [
      { key: 'file', term: 'Tệp', value: path },
      { key: 'size', term: 'Dung lượng', value: size },
      { key: 'created_at', term: 'Tạo lúc', value: at },
    ],
  },
})
const FIRST = created('D:\\Backups\\a.ctbackup', '12,4 KB', '17:00 07/10/2026')
const SECOND = created('D:\\Backups\\a-2.ctbackup', '3,0 MB', '17:05 07/10/2026')
const CANCELED: Run = { kind: 'ok', view: { outcome: 'canceled' } }
const rejected = (code: string, message: string): Run => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })

// A createBackup that answers the queued results in order, calling onCreating first
// when the result is one that comes after a folder was chosen.
function flow(...results: Run[]) {
  const queue = [...results]
  return vi.fn(async (onCreating: () => void): Promise<Run> => {
    const next = queue.shift()
    if (next === undefined) throw new Error('test: no more results queued')
    const choseFolder = next.kind !== 'ok' ? next.kind !== 'contract_violation' && !(next.kind === 'rejected' && next.code === 'DIALOG_FAILED') : next.view.outcome === 'created'
    if (choseFolder) onCreating()
    return next
  })
}

function renderPage(createBackup: (onCreating: () => void) => Promise<Run>) {
  renderWithLogic(<Backup />, fakeManageClient({}), undefined, undefined, undefined, undefined, undefined, fakeBackupData({ createBackup }))
}

const press = () => fireEvent.click(screen.getByRole('button', { name: 'Tạo bản sao lưu' }))
const button = () => screen.getByRole('button', { name: 'Tạo bản sao lưu' }) as HTMLButtonElement
const frame = () => screen.queryByLabelText('Bản sao lưu vừa tạo')
const statusTexts = () => screen.queryAllByRole('status').map((e) => e.textContent)

afterEach(() => {
  cleanup()
})

describe('Backup — the page as it opens', () => {
  it('first frame: nothing called, no status, no alert, no result frame; only the one button can be pressed', () => {
    const createBackup = flow()
    const first = renderFirstCommit(
      <Backup />,
      fakeManageClient({}),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      fakeBackupData({ createBackup }),
    )
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual([])
    expect(first.enabledButtons).toEqual(['Tạo bản sao lưu'])
    expect(createBackup).not.toHaveBeenCalled()
  })

  it('the title, the one main button right under it, then the fixed line', () => {
    renderPage(flow())
    expect(screen.getByRole('heading', { level: 2, name: 'Sao lưu dữ liệu' })).toBeTruthy()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Tạo bản sao lưu'])
    const line = screen.getByText('Bản sao lưu là một tệp chứa toàn bộ dữ liệu của ứng dụng. Nên lưu ở ổ đĩa khác hoặc ổ USB, để vẫn còn dữ liệu nếu máy hỏng.')
    // Under the button row (document order): the button comes first.
    expect(button().compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(frame()).toBeNull()
  })

  it('no question is asked: a press goes straight to the flow (no confirmation panel)', async () => {
    const createBackup = flow(FIRST)
    renderPage(createBackup)
    press()
    await screen.findByText('Đã tạo bản sao lưu.')
    expect(screen.queryByRole('group', { name: /Xác nhận/ })).toBeNull()
    expect(createBackup).toHaveBeenCalledTimes(1)
  })
})

describe('Backup — results', () => {
  it('created: the notice and a frame with "Tệp", "Dung lượng", "Tạo lúc" and their values, in that order', async () => {
    renderPage(flow(FIRST))
    press()
    expect(await screen.findByText('Đã tạo bản sao lưu.')).toBeTruthy()
    const dl = screen.getByLabelText('Bản sao lưu vừa tạo')
    expect(within(dl).getAllByRole('term').map((e) => e.textContent)).toEqual(['Tệp', 'Dung lượng', 'Tạo lúc'])
    expect(within(dl).getAllByRole('definition').map((e) => e.textContent)).toEqual(['D:\\Backups\\a.ctbackup', '12,4 KB', '17:00 07/10/2026'])
    expect(statusTexts()).toEqual(['Đã tạo bản sao lưu.'])
    expect(screen.queryByRole('alert')).toBeNull()
    // Nothing of the technical record is shown.
    expect(screen.queryByText(/sha256/i)).toBeNull()
  })

  it('a long path is shown whole, in one definition (the kit wraps it)', async () => {
    const long = `D:\\${'Thư mục rất dài '.repeat(15)}\\bản sao lưu.ctbackup`
    renderPage(flow(created(long, '1,0 KB', '17:00 07/10/2026')))
    press()
    await screen.findByText('Đã tạo bản sao lưu.')
    expect(within(screen.getByLabelText('Bản sao lưu vừa tạo')).getAllByRole('definition')[0].textContent).toBe(long)
  })

  it('cancelled on a fresh page: nothing appears, the button is usable again', async () => {
    const createBackup = flow(CANCELED)
    renderPage(createBackup)
    press()
    await vi.waitFor(() => expect(createBackup).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(button().disabled).toBe(false))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(frame()).toBeNull()
  })

  it('cancelled after a success: the page keeps the earlier notice and frame untouched', async () => {
    renderPage(flow(FIRST, CANCELED))
    press()
    await screen.findByText('Đã tạo bản sao lưu.')
    await vi.waitFor(() => expect(button().disabled).toBe(false))
    press()
    await vi.waitFor(() => expect(button().disabled).toBe(true))
    await vi.waitFor(() => expect(button().disabled).toBe(false))
    expect(screen.getByText('Đã tạo bản sao lưu.')).toBeTruthy()
    expect(within(screen.getByLabelText('Bản sao lưu vừa tạo')).getAllByRole('definition')[0].textContent).toBe('D:\\Backups\\a.ctbackup')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each([
    ['the dialog could not open', rejected('DIALOG_FAILED', 'Không mở được hộp thoại chọn thư mục. Hãy thử lại.'), 'Chưa tạo được bản sao lưu', 'Không mở được hộp thoại chọn thư mục. Hãy thử lại.'],
    ['400', rejected('ERR_VALIDATION', 'Không dùng được thư mục này. Hãy chọn thư mục khác.'), 'Chưa tạo được bản sao lưu', 'Không dùng được thư mục này. Hãy chọn thư mục khác.'],
    ['500', rejected('ERR_STORAGE_IO', 'Không ghi được tệp sao lưu vào thư mục này. Hãy chọn thư mục khác, hoặc kiểm tra ổ đĩa còn chỗ trống.'), 'Chưa tạo được bản sao lưu', 'Không ghi được tệp sao lưu vào thư mục này. Hãy chọn thư mục khác, hoặc kiểm tra ổ đĩa còn chỗ trống.'],
    ['unreachable', { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.' } as Run, 'Không kết nối được', 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.'],
    ['contract_violation', { kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi. Thao tác chưa được thực hiện.' } as Run, 'Có lỗi không mong đợi', 'Ứng dụng nhận được một phản hồi không mong đợi. Thao tác chưa được thực hiện.'],
  ])('%s → an alert with its own words, and the frame of an earlier press is gone', async (_name, result, title, text) => {
    renderPage(flow(FIRST, result))
    press()
    await screen.findByText('Đã tạo bản sao lưu.')
    await vi.waitFor(() => expect(button().disabled).toBe(false))
    press()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(title)
    expect(alert.textContent).toContain(text)
    expect(frame()).toBeNull()
    expect(screen.queryByText('Đã tạo bản sao lưu.')).toBeNull()
    expect(button().disabled).toBe(false)
  })

  it('a second success replaces the frame and the failure of the press before', async () => {
    renderPage(flow(rejected('ERR_VALIDATION', 'Không dùng được thư mục này. Hãy chọn thư mục khác.'), FIRST, SECOND))
    press()
    await screen.findByRole('alert')
    await vi.waitFor(() => expect(button().disabled).toBe(false))
    press()
    await screen.findByText('Đã tạo bản sao lưu.')
    expect(screen.queryByRole('alert')).toBeNull()
    await vi.waitFor(() => expect(button().disabled).toBe(false))
    press()
    await vi.waitFor(() => expect(within(screen.getByLabelText('Bản sao lưu vừa tạo')).getAllByRole('definition')[0].textContent).toBe('D:\\Backups\\a-2.ctbackup'))
    expect(within(screen.getByLabelText('Bản sao lưu vừa tạo')).getAllByRole('definition').map((e) => e.textContent)).toEqual(['D:\\Backups\\a-2.ctbackup', '3,0 MB', '17:05 07/10/2026'])
    expect(screen.getAllByLabelText('Bản sao lưu vừa tạo')).toHaveLength(1)
    expect(statusTexts()).toEqual(['Đã tạo bản sao lưu.'])
  })
})

describe('Backup — one flow at a time', () => {
  it('two presses in a row make one flow', async () => {
    const gate = pending<[() => void], Run>()
    renderPage(gate.fn)
    const b = button()
    fireEvent.click(b)
    fireEvent.click(b)
    expect(gate.fn).toHaveBeenCalledTimes(1)
    await act(async () => {
      gate.release(CANCELED)
    })
    await vi.waitFor(() => expect(button().disabled).toBe(false))
    expect(gate.fn).toHaveBeenCalledTimes(1)
  })

  it('the button waits while the dialog is open (no "Đang tạo…" yet) and while the archive is made', async () => {
    let onCreating: () => void = () => {}
    let finish: (r: Run) => void = () => {}
    const createBackup = vi.fn(
      (cb: () => void) =>
        new Promise<Run>((resolve) => {
          onCreating = cb
          finish = resolve
        }),
    )
    renderPage(createBackup)
    press()
    // The dialog is open: the button waits, nothing says "creating" yet.
    await vi.waitFor(() => expect(button().disabled).toBe(true))
    expect(button().getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByText('Đang tạo bản sao lưu…')).toBeNull()
    // The folder was chosen: the archive is being made.
    act(() => onCreating())
    expect(await screen.findByText('Đang tạo bản sao lưu…')).toBeTruthy()
    expect(statusTexts()).toEqual(['Đang tạo bản sao lưu…'])
    expect(button().disabled).toBe(true)
    // Done.
    await act(async () => finish(FIRST))
    expect(screen.queryByText('Đang tạo bản sao lưu…')).toBeNull()
    expect(await screen.findByText('Đã tạo bản sao lưu.')).toBeTruthy()
    expect(button().disabled).toBe(false)
  })

  it('a flow that ends in a failure frees the button too', async () => {
    renderPage(flow(rejected('ERR_STORAGE_IO', 'x')))
    press()
    await screen.findByRole('alert')
    expect(button().disabled).toBe(false)
  })

  it('the page is left while the flow runs: the late answer changes nothing and throws nothing', async () => {
    const gate = pending<[() => void], Run>()
    const { unmount } = renderPageWithUnmount(gate.fn)
    press()
    unmount()
    await act(async () => {
      gate.release(FIRST)
    })
    expect(screen.queryByText('Đã tạo bản sao lưu.')).toBeNull()
  })
})

function renderPageWithUnmount(createBackup: (onCreating: () => void) => Promise<Run>) {
  return renderWithLogic(<Backup />, fakeManageClient({}), undefined, undefined, undefined, undefined, undefined, fakeBackupData({ createBackup }))
}

