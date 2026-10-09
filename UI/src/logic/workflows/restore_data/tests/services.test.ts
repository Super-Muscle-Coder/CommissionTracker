// Services of restore_data — i3-logic.md, Step I3.6, and the plan of session 37
// (item 3): every CallResult kind of the four calls maps to the right ViewResult; every
// declared error LABEL of every call has a message (walked from the label tables of
// Configs, not listed by hand); the flow "choose a file, ask, prepare" (a cancel or a
// rejected dialog sends nothing; a chosen file calls nothing: the question is the page's
// to put and answer); the status is read again after every prepare or cancel that did
// not succeed — exactly once — and never after one that did; the message of the failed
// call stays, the second read only changes the frame; a 400 that keeps the old record
// shows that record; the frame's four lines, the closing sentence, the two instants.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CallResult, ResultMessages } from '../../../shared/results'
import type { RestoreDataAdapters } from '../adapters'
import { RESTORE_DATA_CONFIGS } from '../configs'
import type { FileChoice, PendingRestoreRecord, RestoreCancellation, RestoreStatusRecord } from '../entities'
import { createRestoreDataServices } from '../services'

const messages: ResultMessages = {
  unreachable: 'test: unreachable',
  contractViolation: 'test: contract violation',
  inputSummary: 'test: input summary',
  input: {
    required: 'test: required',
    not_integer: 'test: not_integer',
    not_number: 'test: not_number',
    not_date: 'test: not_date',
    not_timestamp: 'test: not_timestamp',
    not_in_list: 'test: not_in_list',
    violates_type_constraint: 'test: violates_type_constraint',
  },
}
const cfg = RESTORE_DATA_CONFIGS

const RECORD: PendingRestoreRecord = {
  archive_path: 'D:\\Backups\\commission-tracker-manual-20261009-120000.ctbackup',
  archive_app_version: '0.1.0',
  archive_created_at: '2026-10-09T12:00:00+07:00',
  safety_backup_path: 'C:\\Users\\A\\AppData\\Roaming\\CommissionTracker\\safety-backups\\commission-tracker-pre_restore-20261009-130000.ctbackup',
  prepared_at: '2026-10-09T13:05:00+07:00',
}
const OTHER_RECORD: PendingRestoreRecord = { ...RECORD, archive_path: 'E:\\Old\\older.ctbackup', prepared_at: '2026-10-08T09:30:00+07:00' }

const okStatus = (pending: PendingRestoreRecord | null): CallResult<RestoreStatusRecord> => ({ kind: 'ok', label: 200, data: { pending } })
const okRecord = (r: PendingRestoreRecord = RECORD): CallResult<PendingRestoreRecord> => ({ kind: 'ok', label: 200, data: r })
const okCancel = (canceled: boolean): CallResult<RestoreCancellation> => ({ kind: 'ok', label: 200, data: { canceled } })
const CHOSEN: CallResult<FileChoice> = { kind: 'ok', label: 200, data: { canceled: false, path: 'D:\\Backups\\a.ctbackup' } }
const CANCELED: CallResult<FileChoice> = { kind: 'ok', label: 200, data: { canceled: true, path: null } }
const declared = (label: number, code: string): CallResult<never> => ({ kind: 'declared_error', label, error: { code, message: 'x', details: null } })
const UNREACHABLE: CallResult<never> = { kind: 'unreachable', reason: 'refused' }
const VIOLATION: CallResult<never> = { kind: 'contract_violation', reason: 'bad body' }

// "HH:mm dd/mm/yyyy" of an instant in the machine's time zone, as the app shows it.
const shownAt = (iso: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

type Answers = {
  status?: CallResult<RestoreStatusRecord>[]
  pick?: CallResult<FileChoice>
  prepare?: CallResult<PendingRestoreRecord>
  cancel?: CallResult<RestoreCancellation>
}

// Adapters that answer from the queue given; a call with nothing queued fails the test.
function build(answers: Answers) {
  const queue = [...(answers.status ?? [])]
  const readStatus = vi.fn<RestoreDataAdapters['readStatus']>(async () => {
    const next = queue.shift()
    if (next === undefined) throw new Error('test: readStatus was not expected to be called (again)')
    return next
  })
  const pickArchive = vi.fn<RestoreDataAdapters['pickArchive']>(async () => {
    if (answers.pick === undefined) throw new Error('test: pickArchive was not expected to be called')
    return answers.pick
  })
  const prepare = vi.fn<RestoreDataAdapters['prepare']>(async () => {
    if (answers.prepare === undefined) throw new Error('test: prepare was not expected to be called')
    return answers.prepare
  })
  const cancel = vi.fn<RestoreDataAdapters['cancel']>(async () => {
    if (answers.cancel === undefined) throw new Error('test: cancel was not expected to be called')
    return answers.cancel
  })
  const adapters: RestoreDataAdapters = { readStatus, pickArchive, prepare, cancel }
  return { services: createRestoreDataServices(adapters, cfg, messages), readStatus, pickArchive, prepare, cancel }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('loadStatus — on opening', () => {
  it('nothing waiting → ok with no message, and the state "none"', async () => {
    const { services, readStatus } = build({ status: [okStatus(null)] })
    expect(await services.loadStatus()).toEqual({ result: { kind: 'ok', view: { message: null } }, pending: { state: 'none' } })
    expect(readStatus).toHaveBeenCalledTimes(1)
  })

  it('a restore waiting → the frame: four lines in order and the closing sentence', async () => {
    const { services } = build({ status: [okStatus(RECORD)] })
    const r = await services.loadStatus()
    expect(r.result).toEqual({ kind: 'ok', view: { message: null } })
    expect(r.pending).toEqual({
      state: 'pending',
      entries: [
        { key: 'archive_path', term: 'Tệp sao lưu', value: RECORD.archive_path },
        { key: 'archive_created_at', term: 'Bản sao lưu tạo lúc', value: shownAt(RECORD.archive_created_at) },
        { key: 'prepared_at', term: 'Chuẩn bị lúc', value: shownAt(RECORD.prepared_at) },
        { key: 'safety_backup_path', term: 'Bản sao lưu an toàn của dữ liệu trước khi khôi phục', value: RECORD.safety_backup_path },
      ],
      note: 'Hãy đóng rồi mở lại ứng dụng để hoàn tất. Dữ liệu bạn nhập từ lúc chuẩn bị tới lúc mở lại sẽ không có trong dữ liệu sau khôi phục.',
    })
  })

  it('the two instants are "HH:mm dd/mm/yyyy" in the machine\'s time zone, and the app version is not shown', async () => {
    const { services } = build({ status: [okStatus(RECORD)] })
    const { pending } = await services.loadStatus()
    if (pending.state !== 'pending') throw new Error('test: expected a frame')
    for (const e of pending.entries.filter((x) => x.key.endsWith('_at'))) expect(e.value).toMatch(/^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/)
    expect(JSON.stringify(pending)).not.toContain(RECORD.archive_app_version)
  })

  it('both paths are shown as they came, with nothing cut', async () => {
    const long = `D:\\${'Thư mục rất dài '.repeat(20)}\\bản sao lưu.ctbackup`
    const { services } = build({ status: [okStatus({ ...RECORD, archive_path: long, safety_backup_path: long + '2' })] })
    const { pending } = await services.loadStatus()
    if (pending.state !== 'pending') throw new Error('test: expected a frame')
    expect(pending.entries[0].value).toBe(long)
    expect(pending.entries[3].value).toBe(long + '2')
  })

  it('500 → "Không đọc được trạng thái khôi phục. Hãy mở lại trang này." (rejected, system), state unknown, no second read', async () => {
    const { services, readStatus } = build({ status: [declared(500, 'ERR_STORAGE_IO')] })
    expect(await services.loadStatus()).toEqual({
      result: { kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: 'Không đọc được trạng thái khôi phục. Hãy mở lại trang này.', fieldErrors: {} },
      pending: { state: 'unknown' },
    })
    expect(readStatus).toHaveBeenCalledTimes(1)
  })

  it('a rejected Promise → "Không liên lạc được với ứng dụng. Hãy đóng rồi mở lại ứng dụng." under the code of the interface', async () => {
    const { services } = build({ status: [UNREACHABLE] })
    expect(await services.loadStatus()).toEqual({
      result: { kind: 'rejected', origin: 'system', code: 'IPC_FAILED', message: 'Không liên lạc được với ứng dụng. Hãy đóng rồi mở lại ứng dụng.', fieldErrors: {} },
      pending: { state: 'unknown' },
    })
  })

  it('an answer off the contract → the layer sentence, state unknown', async () => {
    const { services } = build({ status: [VIOLATION] })
    expect(await services.loadStatus()).toEqual({ result: { kind: 'contract_violation', message: messages.contractViolation }, pending: { state: 'unknown' } })
  })
})

describe('chooseArchive — the dialog, then the question', () => {
  it('a file chosen → nothing is prepared: the page gets the path and the question', async () => {
    const { services, pickArchive, prepare, readStatus, cancel } = build({ pick: CHOSEN })
    const r = await services.chooseArchive(false)
    expect(pickArchive).toHaveBeenCalledTimes(1)
    expect(prepare).not.toHaveBeenCalled()
    expect(readStatus).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(r).toEqual({
      kind: 'ok',
      view: {
        outcome: 'chosen',
        path: 'D:\\Backups\\a.ctbackup',
        question:
          'Khôi phục từ tệp: D:\\Backups\\a.ctbackup\n' +
          'Khi bạn đóng rồi mở lại ứng dụng, toàn bộ dữ liệu hiện tại sẽ được thay bằng dữ liệu trong tệp này. Trước đó, ứng dụng tạo một bản sao lưu an toàn của dữ liệu hiện tại. Dữ liệu bạn nhập sau bước này sẽ không có trong dữ liệu sau khôi phục.',
      },
    })
  })

  it('with a restore waiting, the question adds "Lần khôi phục đang chờ sẽ được thay bằng lần này." as its last line', async () => {
    const { services } = build({ pick: CHOSEN })
    const r = await services.chooseArchive(true)
    if (r.kind !== 'ok' || r.view.outcome !== 'chosen') throw new Error('test: expected a chosen view')
    const lines = r.view.question.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[2]).toBe('Lần khôi phục đang chờ sẽ được thay bằng lần này.')
  })

  it('without one waiting, the sentence about replacing is absent', async () => {
    const { services } = build({ pick: CHOSEN })
    const r = await services.chooseArchive(false)
    if (r.kind !== 'ok' || r.view.outcome !== 'chosen') throw new Error('test: expected a chosen view')
    expect(r.view.question).not.toContain('thay bằng lần này')
  })

  it('the path goes through untouched: spaces, accents, a long path', async () => {
    const path = `E:\\Sao lưu\\${'Tranh của Ánh '.repeat(25)}\\bản.ctbackup`
    const { services } = build({ pick: { kind: 'ok', label: 200, data: { canceled: false, path } } })
    const r = await services.chooseArchive(false)
    if (r.kind !== 'ok' || r.view.outcome !== 'chosen') throw new Error('test: expected a chosen view')
    expect(r.view.path).toBe(path)
    expect(r.view.question.split('\n')[0]).toBe(`Khôi phục từ tệp: ${path}`)
  })

  it('the dialog cancelled → { outcome: canceled }: nothing is sent, nothing is said', async () => {
    const { services, prepare, readStatus } = build({ pick: CANCELED })
    expect(await services.chooseArchive(true)).toEqual({ kind: 'ok', view: { outcome: 'canceled' } })
    expect(prepare).not.toHaveBeenCalled()
    expect(readStatus).not.toHaveBeenCalled()
  })

  it('the dialog rejected → its own sentence (not "không kết nối được"), nothing is sent', async () => {
    const { services, prepare } = build({ pick: UNREACHABLE })
    expect(await services.chooseArchive(false)).toEqual({
      kind: 'rejected',
      origin: 'system',
      code: cfg.dialogFailure.code,
      message: 'Không mở được hộp thoại chọn tệp. Hãy thử lại.',
      fieldErrors: {},
    })
    expect(prepare).not.toHaveBeenCalled()
  })

  it('an answer of the dialog off the contract → the layer sentence, nothing is sent', async () => {
    const { services, prepare } = build({ pick: VIOLATION })
    expect(await services.chooseArchive(false)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
    expect(prepare).not.toHaveBeenCalled()
  })

  it('a declared error from the dialog cannot happen; if it does, it is a contract violation', async () => {
    const { services, prepare } = build({ pick: declared(400, 'ERR_VALIDATION') })
    expect(await services.chooseArchive(false)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
    expect(prepare).not.toHaveBeenCalled()
  })
})

describe('prepare — restore:prepare', () => {
  it('200 → the notice, and the frame built from the record that came back, with no second read', async () => {
    const { services, prepare, readStatus } = build({ prepare: okRecord() })
    const r = await services.prepare('D:\\Backups\\a.ctbackup')
    expect(prepare).toHaveBeenCalledTimes(1)
    expect(prepare).toHaveBeenCalledWith('D:\\Backups\\a.ctbackup')
    expect(readStatus).not.toHaveBeenCalled()
    expect(r.result).toEqual({ kind: 'ok', view: { message: 'Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.' } })
    expect(r.pending).toMatchObject({ state: 'pending' })
    if (r.pending.state !== 'pending') throw new Error('test: expected a frame')
    expect(r.pending.entries[0]).toEqual({ key: 'archive_path', term: 'Tệp sao lưu', value: RECORD.archive_path })
    expect(r.pending.entries[2]).toEqual({ key: 'prepared_at', term: 'Chuẩn bị lúc', value: shownAt(RECORD.prepared_at) })
  })

  // [label, code, message]: the seven sentences of the specification.
  const SENTENCES: [number, string, string][] = [
    [400, 'ERR_VALIDATION', 'Không dùng được tệp này. Hãy chọn tệp khác.'],
    [404, 'ERR_NOT_FOUND', 'Không tìm thấy tệp này. Có thể tệp đã bị chuyển hoặc xóa. Hãy chọn lại.'],
    [
      409,
      'ERR_INCOMPATIBLE_BACKUP',
      'Tệp này không dùng được để khôi phục: có thể không phải bản sao lưu của Commission Tracker, đã bị hỏng, hoặc được tạo bởi phiên bản mới hơn của ứng dụng.',
    ],
    [424, 'ERR_STORAGE_IO', 'Không tạo được bản sao lưu an toàn của dữ liệu hiện tại, nên chưa chuẩn bị khôi phục. Hãy kiểm tra ổ đĩa còn chỗ trống rồi thử lại.'],
    [500, 'ERR_STORAGE_IO', 'Không ghi được thông tin khôi phục, nên chưa chuẩn bị khôi phục. Hãy thử lại.'],
    [503, 'ERR_SERVICE_UNAVAILABLE', 'Ứng dụng chưa đọc được tệp sao lưu vì phần xử lý dữ liệu không phản hồi. Hãy đóng rồi mở lại ứng dụng, rồi thử lại.'],
  ]
  it.each(SENTENCES)('%i → the sentence of the specification (rejected, system, code %s); the status is read again once', async (label, code, message) => {
    const { services, readStatus } = build({ prepare: declared(label, code), status: [okStatus(null)] })
    const r = await services.prepare('D:\\a.ctbackup')
    expect(r.result).toEqual({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
    expect(readStatus).toHaveBeenCalledTimes(1)
    expect(r.pending).toEqual({ state: 'none' })
  })

  it('a rejected Promise → "Không liên lạc được với ứng dụng…", then the status is read again once', async () => {
    const { services, readStatus } = build({ prepare: UNREACHABLE, status: [okStatus(null)] })
    const r = await services.prepare('D:\\a.ctbackup')
    expect(r.result).toEqual({ kind: 'rejected', origin: 'system', code: 'IPC_FAILED', message: 'Không liên lạc được với ứng dụng. Hãy đóng rồi mở lại ứng dụng.', fieldErrors: {} })
    expect(readStatus).toHaveBeenCalledTimes(1)
  })

  it('an answer off the contract → the layer sentence, then the status is read again once', async () => {
    const { services, readStatus } = build({ prepare: VIOLATION, status: [okStatus(null)] })
    const r = await services.prepare('D:\\a.ctbackup')
    expect(r.result).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
    expect(readStatus).toHaveBeenCalledTimes(1)
  })

  it('a 400 that kept the old record: the second read finds it and the frame shows that record', async () => {
    const { services } = build({ prepare: declared(400, 'ERR_VALIDATION'), status: [okStatus(OTHER_RECORD)] })
    const r = await services.prepare('relative.ctbackup')
    expect(r.result).toMatchObject({ kind: 'rejected', code: 'ERR_VALIDATION', message: 'Không dùng được tệp này. Hãy chọn tệp khác.' })
    if (r.pending.state !== 'pending') throw new Error('test: expected the old record to be shown')
    expect(r.pending.entries[0].value).toBe('E:\\Old\\older.ctbackup')
    expect(r.pending.entries[2].value).toBe(shownAt('2026-10-08T09:30:00+07:00'))
  })

  it('a failure with nothing waiting afterwards: the state is "none"', async () => {
    const { services } = build({ prepare: declared(409, 'ERR_INCOMPATIBLE_BACKUP'), status: [okStatus(null)] })
    expect((await services.prepare('D:\\a.ctbackup')).pending).toEqual({ state: 'none' })
  })

  it.each([
    ['500', declared(500, 'ERR_STORAGE_IO')],
    ['a rejected Promise', UNREACHABLE],
    ['an answer off the contract', VIOLATION],
  ])('the second read fails too (%s): the frame is hidden (state unknown), and the message of the FIRST failure stays', async (_name, again) => {
    const { services, readStatus } = build({ prepare: declared(424, 'ERR_STORAGE_IO'), status: [again as CallResult<RestoreStatusRecord>] })
    const r = await services.prepare('D:\\a.ctbackup')
    expect(readStatus).toHaveBeenCalledTimes(1)
    expect(r.pending).toEqual({ state: 'unknown' })
    expect(r.result).toMatchObject({
      kind: 'rejected',
      code: 'ERR_STORAGE_IO',
      message: 'Không tạo được bản sao lưu an toàn của dữ liệu hiện tại, nên chưa chuẩn bị khôi phục. Hãy kiểm tra ổ đĩa còn chỗ trống rồi thử lại.',
    })
  })
})

describe('cancel — restore:cancel', () => {
  it('200 with canceled true → "Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.", the frame goes, no second read', async () => {
    const { services, readStatus } = build({ cancel: okCancel(true) })
    expect(await services.cancel()).toEqual({
      result: { kind: 'ok', view: { message: 'Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.' } },
      pending: { state: 'none' },
    })
    expect(readStatus).not.toHaveBeenCalled()
  })

  it('200 with canceled false → "Không còn lần khôi phục nào đang chờ.", the frame goes, no second read', async () => {
    const { services, readStatus } = build({ cancel: okCancel(false) })
    expect(await services.cancel()).toEqual({
      result: { kind: 'ok', view: { message: 'Không còn lần khôi phục nào đang chờ.' } },
      pending: { state: 'none' },
    })
    expect(readStatus).not.toHaveBeenCalled()
  })

  it('500 → "Không hủy được lần khôi phục đang chờ. Hãy thử lại.", then the status is read again once; the record still waiting stays in the frame', async () => {
    const { services, readStatus } = build({ cancel: declared(500, 'ERR_STORAGE_IO'), status: [okStatus(RECORD)] })
    const r = await services.cancel()
    expect(r.result).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: 'Không hủy được lần khôi phục đang chờ. Hãy thử lại.', fieldErrors: {} })
    expect(readStatus).toHaveBeenCalledTimes(1)
    expect(r.pending).toMatchObject({ state: 'pending' })
  })

  it('a rejected Promise → the sentence of the desktop not answering, then a second read', async () => {
    const { services, readStatus } = build({ cancel: UNREACHABLE, status: [okStatus(RECORD)] })
    const r = await services.cancel()
    expect(r.result).toMatchObject({ kind: 'rejected', code: 'IPC_FAILED' })
    expect(readStatus).toHaveBeenCalledTimes(1)
  })

  it('an answer off the contract → the layer sentence, then a second read', async () => {
    const { services, readStatus } = build({ cancel: VIOLATION, status: [okStatus(null)] })
    const r = await services.cancel()
    expect(r.result).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
    expect(readStatus).toHaveBeenCalledTimes(1)
    expect(r.pending).toEqual({ state: 'none' })
  })

  it('the second read fails too: the frame is hidden (unknown) and the first message stays', async () => {
    const { services } = build({ cancel: declared(500, 'ERR_STORAGE_IO'), status: [UNREACHABLE] })
    const r = await services.cancel()
    expect(r.pending).toEqual({ state: 'unknown' })
    expect(r.result).toMatchObject({ kind: 'rejected', message: 'Không hủy được lần khôi phục đang chờ. Hãy thử lại.' })
  })
})

describe('every declared error label of every call has a message of its own (walked from the label tables)', () => {
  // [endpoint key of Configs.ipc, how to run it with a declared error of a given label and code]
  const RUNNERS = {
    getRestoreStatus: (label: number, code: string) => build({ status: [declared(label, code)] }).services.loadStatus(),
    requestRestore: (label: number, code: string) => build({ prepare: declared(label, code), status: [okStatus(null)] }).services.prepare('D:\\a.ctbackup'),
    cancelRestore: (label: number, code: string) => build({ cancel: declared(label, code), status: [okStatus(null)] }).services.cancel(),
  } as const

  it('the three endpoints of Configs are the three that are walked', () => {
    expect(Object.keys(cfg.ipc).sort()).toEqual(Object.keys(RUNNERS).sort())
    expect(Object.keys(cfg.errorMessages).sort()).toEqual(Object.keys(RUNNERS).sort())
  })

  for (const key of Object.keys(RUNNERS) as (keyof typeof RUNNERS)[]) {
    it(`${key}: each label declared with a code has a non-empty message, and Services uses exactly that one`, async () => {
      const labels = Object.entries(cfg.ipc[key].labels).filter(([, v]) => v !== 'ok')
      expect(labels.length).toBeGreaterThan(0)
      // No message for a label the contract does not declare, and one for each that it does.
      expect(Object.keys(cfg.errorMessages[key]).sort()).toEqual(labels.map(([l]) => l).sort())
      for (const [label, code] of labels) {
        const message = cfg.errorMessages[key][label]
        expect(message, `${key} ${label}`).toBeTruthy()
        const r = await RUNNERS[key](Number(label), code)
        expect(r.result, `${key} ${label}`).toEqual({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
      }
    })
  }

  it('labels 424 and 500 of restore:prepare share a code and say different things', () => {
    expect(cfg.ipc.requestRestore.labels['424']).toBe(cfg.ipc.requestRestore.labels['500'])
    expect(cfg.errorMessages.requestRestore['424']).not.toBe(cfg.errorMessages.requestRestore['500'])
  })
})
