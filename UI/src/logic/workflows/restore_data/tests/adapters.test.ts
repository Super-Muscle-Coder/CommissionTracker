// Adapters of restore_data — coverage matrix of i3-logic.md, Step I3.6, for the
// four calls of ui_decomposition.md "Chặng F" (api_contract.yaml 5.0.0), all form ipc:
//   get_restore_status   restore:status      200 { pending }       500
//   native_dialogs.open_file dialog:open-file 200 { canceled, path } (Promise rejected, off-shape answer)
//   request_restore      restore:prepare     200 pending_restore_record, 400, 404, 409, 424, 500, 503
//   cancel_restore       restore:cancel      200 { canceled }      500
// For each: every declared label with a valid body, a rejected Promise (unreachable),
// an undeclared label, a missing field, a wrong type, a code that does not match the
// label, extra fields dropped, and the argument it sends. Fake ipc_bridge only: this
// workflow has no http_client.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IpcBridge } from '../../../shared/resources'
import { createRestoreDataAdapters, type RestoreDataAdapters } from '../adapters'
import { RESTORE_DATA_CONFIGS } from '../configs'
import type { PendingRestoreRecord } from '../entities'

const cfg = RESTORE_DATA_CONFIGS
const RECORD: PendingRestoreRecord = {
  archive_path: 'D:\\Backups\\commission-tracker-manual-20261009-120000.ctbackup',
  archive_app_version: '0.1.0',
  archive_created_at: '2026-10-09T12:00:00+07:00',
  safety_backup_path: 'C:\\Users\\A\\AppData\\Roaming\\CommissionTracker\\safety-backups\\commission-tracker-pre_restore-20261009-130000.ctbackup',
  prepared_at: '2026-10-09T13:00:00+07:00',
}
const errorBody = (code: string) => ({ code, message: 'x', details: null })
const omit = <T extends object>(o: T, k: keyof T) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k))
const reply = (status: number, body: unknown) => ({ status, body })

function build(answer: () => Promise<unknown>) {
  const call = vi.fn<IpcBridge['call']>(async () => answer())
  const ipc: IpcBridge = { call }
  const adapters: RestoreDataAdapters = createRestoreDataAdapters(ipc, cfg)
  return { adapters, call }
}
const answering = (value: unknown) => build(async () => value)

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errorSpy.mockRestore()
})

describe('the configuration realizes the contract', () => {
  it('versions, addresses and the label table of each entry, line by line', () => {
    expect(cfg.contract).toEqual({ apiContract: '5.0.0', dataSchema: '10.0.1' })
    expect(cfg.ipc.getRestoreStatus).toEqual({ address: 'restore:status', labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } })
    expect(cfg.ipc.requestRestore).toEqual({
      address: 'restore:prepare',
      labels: {
        '200': 'ok',
        '400': 'ERR_VALIDATION',
        '404': 'ERR_NOT_FOUND',
        '409': 'ERR_INCOMPATIBLE_BACKUP',
        '424': 'ERR_STORAGE_IO',
        '500': 'ERR_STORAGE_IO',
        '503': 'ERR_SERVICE_UNAVAILABLE',
      },
    })
    expect(cfg.ipc.cancelRestore).toEqual({ address: 'restore:cancel', labels: { '200': 'ok', '500': 'ERR_STORAGE_IO' } })
    expect(cfg.dialogs.openFile).toEqual({ address: 'dialog:open-file', okLabel: 200 })
    expect(cfg.openFileFilters).toEqual([{ name: 'Bản sao lưu Commission Tracker', extensions: ['ctbackup'] }])
  })
})

describe('readStatus — get_restore_status, restore:status', () => {
  it('calls restore:status with an empty object as the one argument, once', async () => {
    const { adapters, call } = answering(reply(200, { pending: null }))
    await adapters.readStatus()
    expect(call).toHaveBeenCalledTimes(1)
    expect(call.mock.calls[0]).toEqual(['restore:status', {}])
  })

  it('200 with nothing waiting → ok with pending null', async () => {
    const { adapters } = answering(reply(200, { pending: null }))
    expect(await adapters.readStatus()).toEqual({ kind: 'ok', label: 200, data: { pending: null } })
  })

  it('200 with a waiting restore → ok with the five fields of the record', async () => {
    const { adapters } = answering(reply(200, { pending: RECORD }))
    expect(await adapters.readStatus()).toEqual({ kind: 'ok', label: 200, data: { pending: RECORD } })
  })

  it('500 → declared_error ERR_STORAGE_IO, the error body unchanged', async () => {
    const { adapters } = answering(reply(500, errorBody('ERR_STORAGE_IO')))
    expect(await adapters.readStatus()).toEqual({ kind: 'declared_error', label: 500, error: errorBody('ERR_STORAGE_IO') })
  })

  it('a rejected Promise → unreachable, whatever the message', async () => {
    const { adapters } = build(() => Promise.reject(new Error("Error invoking remote method 'restore:status': Error: boom")))
    const r = await adapters.readStatus()
    expect(r.kind).toBe('unreachable')
    expect(r).toMatchObject({ reason: expect.stringContaining('boom') })
  })

  it('a rejection that is not an Error is still unreachable', async () => {
    const { adapters } = build(() => Promise.reject('refused'))
    expect(await adapters.readStatus()).toMatchObject({ kind: 'unreachable', reason: expect.stringContaining('refused') })
  })

  it.each([400, 404, 409, 424, 503])('label %i, which restore:status does not declare, → contract_violation', async (label) => {
    const { adapters } = answering(reply(label, { pending: null }))
    const r = await adapters.readStatus()
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining(`label ${label}`) })
  })

  it('404 with an error body is no more declared than a 404 with data', async () => {
    const { adapters } = answering(reply(404, errorBody('ERR_NOT_FOUND')))
    expect((await adapters.readStatus()).kind).toBe('contract_violation')
  })

  it('500 carrying another code → contract_violation', async () => {
    const { adapters } = answering(reply(500, errorBody('ERR_VALIDATION')))
    const r = await adapters.readStatus()
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining('ERR_VALIDATION') })
  })

  it.each([
    ['code missing', { message: 'x', details: null }],
    ['message missing', { code: 'ERR_STORAGE_IO', details: null }],
    ['details missing', { code: 'ERR_STORAGE_IO', message: 'x' }],
    ['code that is a number', { code: 500, message: 'x', details: null }],
    ['message that is a number', { code: 'ERR_STORAGE_IO', message: 5, details: null }],
    ['details that is a string', { code: 'ERR_STORAGE_IO', message: 'x', details: 'oops' }],
    ['details that is an array', { code: 'ERR_STORAGE_IO', message: 'x', details: [] }],
    ['no body at all', undefined],
    ['a null body', null],
    ['a body that is a string', 'ERR_STORAGE_IO'],
  ])('500 whose error_body has %s → contract_violation', async (_name, body) => {
    const { adapters } = answering(reply(500, body))
    expect((await adapters.readStatus()).kind).toBe('contract_violation')
  })

  it('an error body with details that is an object is accepted, and its shape is not read', async () => {
    const body = { code: 'ERR_STORAGE_IO', message: 'x', details: { anything: [1, 2, { deep: true }] } }
    const { adapters } = answering(reply(500, body))
    expect(await adapters.readStatus()).toEqual({ kind: 'declared_error', label: 500, error: body })
  })

  it('200 without the pending field → contract_violation', async () => {
    const { adapters } = answering(reply(200, {}))
    const r = await adapters.readStatus()
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining('pending') })
  })

  it.each(['archive_path', 'archive_app_version', 'archive_created_at', 'safety_backup_path', 'prepared_at'] as const)(
    '200 whose record lacks %s → contract_violation',
    async (field) => {
      const { adapters } = answering(reply(200, { pending: omit(RECORD, field) }))
      const r = await adapters.readStatus()
      expect(r.kind).toBe('contract_violation')
      expect(r).toMatchObject({ reason: expect.stringContaining(field) })
    },
  )

  it.each([
    ['an empty archive_path', { archive_path: '' }],
    ['an archive_path that is a number', { archive_path: 42 }],
    ['an empty safety_backup_path', { safety_backup_path: '' }],
    ['a safety_backup_path that is null', { safety_backup_path: null }],
    ['an archive_app_version that is a number', { archive_app_version: 1 }],
    ['an archive_created_at without an offset', { archive_created_at: '2026-10-09T12:00:00' }],
    ['an archive_created_at in another format', { archive_created_at: '09/10/2026 12:00' }],
    ['an archive_created_at that names no point in time', { archive_created_at: '2026-13-45T99:99:00+07:00' }],
    ['an archive_created_at that is not text', { archive_created_at: 20261009 }],
    ['an archive_created_at that is null', { archive_created_at: null }],
    ['a prepared_at without an offset', { prepared_at: '2026-10-09T13:00:00' }],
    ['a prepared_at in another format', { prepared_at: 'yesterday' }],
    ['a prepared_at that is null', { prepared_at: null }],
  ])('200 whose record has %s → contract_violation', async (_name, over) => {
    const { adapters } = answering(reply(200, { pending: { ...RECORD, ...over } }))
    expect((await adapters.readStatus()).kind).toBe('contract_violation')
  })

  it.each([
    ['a record that is a string', 'pending'],
    ['a record that is a number', 7],
    ['a record that is an array', [RECORD]],
    ['pending that is undefined', undefined],
    ['pending that is false', false],
  ])('200 with %s → contract_violation', async (_name, pending) => {
    const { adapters } = answering(reply(200, { pending }))
    expect((await adapters.readStatus()).kind).toBe('contract_violation')
  })

  it.each([null, 'text', 42, [], undefined])('200 whose body is %j → contract_violation', async (body) => {
    const { adapters } = answering(reply(200, body))
    expect((await adapters.readStatus()).kind).toBe('contract_violation')
  })

  it('extra fields, in the answer, the body and the record, are dropped; the answer is still ok', async () => {
    const { adapters } = answering({ status: 200, extra: 1, body: { pending: { ...RECORD, staged_db_path: 'C:\\x', more: true }, other: 2 } })
    expect(await adapters.readStatus()).toEqual({ kind: 'ok', label: 200, data: { pending: RECORD } })
  })
})

describe('pickArchive — native_dialogs.open_file', () => {
  it('calls dialog:open-file with the one argument { filters: [ctbackup], once }', async () => {
    const { adapters, call } = answering(reply(200, { canceled: true, path: null }))
    await adapters.pickArchive()
    expect(call).toHaveBeenCalledTimes(1)
    expect(call.mock.calls[0]).toEqual(['dialog:open-file', { filters: [{ name: 'Bản sao lưu Commission Tracker', extensions: ['ctbackup'] }] }])
  })

  it('a file chosen → ok with the path', async () => {
    const { adapters } = answering(reply(200, { canceled: false, path: 'D:\\Backups\\a.ctbackup' }))
    expect(await adapters.pickArchive()).toEqual({ kind: 'ok', label: 200, data: { canceled: false, path: 'D:\\Backups\\a.ctbackup' } })
  })

  it('the dialog cancelled → ok with canceled true and no path', async () => {
    const { adapters } = answering(reply(200, { canceled: true, path: null }))
    expect(await adapters.pickArchive()).toEqual({ kind: 'ok', label: 200, data: { canceled: true, path: null } })
  })

  it('extra fields of the answer are dropped, and the answer is still ok', async () => {
    const { adapters } = answering({ status: 200, body: { canceled: false, path: 'C:\\x', extra: 1 }, more: true })
    expect(await adapters.pickArchive()).toEqual({ kind: 'ok', label: 200, data: { canceled: false, path: 'C:\\x' } })
  })

  it('a rejected Promise → unreachable, whatever the message', async () => {
    const boom = new Error("Error invoking remote method 'dialog:open-file': Error: boom")
    const { adapters } = build(() => Promise.reject(boom))
    const r = await adapters.pickArchive()
    expect(r.kind).toBe('unreachable')
    expect(r).toMatchObject({ reason: expect.stringContaining('boom') })
  })

  it('a rejection that is not an Error is still unreachable', async () => {
    const { adapters } = build(() => Promise.reject('refused'))
    expect(await adapters.pickArchive()).toMatchObject({ kind: 'unreachable', reason: expect.stringContaining('refused') })
  })

  const OFF_THE_CONTRACT: [string, unknown][] = [
    ['canceled true with a path', reply(200, { canceled: true, path: 'C:\\x' })],
    ['canceled false with path null', reply(200, { canceled: false, path: null })],
    ['canceled false with an empty path', reply(200, { canceled: false, path: '' })],
    ['canceled that is not a boolean', reply(200, { canceled: 'yes', path: 'C:\\x' })],
    ['a path that is not a string', reply(200, { canceled: false, path: 42 })],
    ['canceled missing', reply(200, { path: 'C:\\x' })],
    ['path missing on a cancel', reply(200, { canceled: true })],
    ['no body', { status: 200 }],
    ['a null body', reply(200, null)],
    ['a body that is not an object', reply(200, 'C:\\x')],
    ['status 400', reply(400, { canceled: true, path: null })],
    ['status 500 with an error body', reply(500, errorBody('ERR_STORAGE_IO'))],
    ['status missing', { body: { canceled: true, path: null } }],
    ['status that is a string', reply('200' as unknown as number, { canceled: true, path: null })],
    ['an empty object', {}],
    ['a string', 'C:\\x'],
    ['null', null],
    ['a number', 42],
    ['undefined', undefined],
    ['an array', [{ status: 200 }]],
  ]
  it.each(OFF_THE_CONTRACT)('%s → contract_violation', async (_name, answer) => {
    const { adapters } = answering(answer)
    const r = await adapters.pickArchive()
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining('dialog:open-file') })
  })
})

describe('prepare — request_restore, restore:prepare', () => {
  const PATH = 'D:\\Backups\\a.ctbackup'

  it('calls restore:prepare with exactly { archive_path } as the one argument, once', async () => {
    const { adapters, call } = answering(reply(200, RECORD))
    await adapters.prepare(PATH)
    expect(call).toHaveBeenCalledTimes(1)
    expect(call.mock.calls[0]).toEqual(['restore:prepare', { archive_path: PATH }])
  })

  it('a path with spaces, accents and a trailing backslash goes through untouched', async () => {
    const path = 'E:\\Sao lưu\\Tranh của Ánh\\a.ctbackup'
    const { adapters, call } = answering(reply(200, RECORD))
    await adapters.prepare(path)
    expect(call.mock.calls[0][1]).toEqual({ archive_path: path })
  })

  it('200 → ok with the five fields of the record', async () => {
    const { adapters } = answering(reply(200, RECORD))
    expect(await adapters.prepare(PATH)).toEqual({ kind: 'ok', label: 200, data: RECORD })
  })

  it.each([
    [400, 'ERR_VALIDATION'],
    [404, 'ERR_NOT_FOUND'],
    [409, 'ERR_INCOMPATIBLE_BACKUP'],
    [424, 'ERR_STORAGE_IO'],
    [500, 'ERR_STORAGE_IO'],
    [503, 'ERR_SERVICE_UNAVAILABLE'],
  ])('%i → declared_error %s, the error body unchanged', async (label, code) => {
    const { adapters } = answering(reply(label, errorBody(code)))
    expect(await adapters.prepare(PATH)).toEqual({ kind: 'declared_error', label, error: errorBody(code) })
  })

  it('a rejected Promise → unreachable', async () => {
    const { adapters } = build(() => Promise.reject(new Error('refused')))
    expect(await adapters.prepare(PATH)).toMatchObject({ kind: 'unreachable', reason: expect.stringContaining('refused') })
  })

  it.each([201, 202, 401, 403, 408, 422, 502, 504])('label %i, which restore:prepare does not declare, → contract_violation', async (label) => {
    const { adapters } = answering(reply(label, RECORD))
    const r = await adapters.prepare(PATH)
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining(`label ${label}`) })
  })

  it.each([
    [409, 'ERR_STORAGE_IO'],
    [409, 'ERR_VALIDATION'],
    [400, 'ERR_INCOMPATIBLE_BACKUP'],
    [404, 'ERR_VALIDATION'],
    [424, 'ERR_SERVICE_UNAVAILABLE'],
    [500, 'ERR_NOT_FOUND'],
    [503, 'ERR_STORAGE_IO'],
    [400, 'ERR_RESTORE_FAILED'],
  ])('%i carrying the code %s, which is not the code declared for that label → contract_violation', async (label, code) => {
    const { adapters } = answering(reply(label, errorBody(code)))
    const r = await adapters.prepare(PATH)
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining(code) })
  })

  it.each(['code', 'message', 'details'] as const)('a 409 whose error_body lacks %s → contract_violation', async (field) => {
    const { adapters } = answering(reply(409, omit(errorBody('ERR_INCOMPATIBLE_BACKUP'), field)))
    expect((await adapters.prepare(PATH)).kind).toBe('contract_violation')
  })

  it.each(['archive_path', 'archive_app_version', 'archive_created_at', 'safety_backup_path', 'prepared_at'] as const)(
    '200 without %s → contract_violation',
    async (field) => {
      const { adapters } = answering(reply(200, omit(RECORD, field)))
      const r = await adapters.prepare(PATH)
      expect(r.kind).toBe('contract_violation')
      expect(r).toMatchObject({ reason: expect.stringContaining(field) })
    },
  )

  it.each([
    ['an empty archive_path', { archive_path: '' }],
    ['an empty safety_backup_path', { safety_backup_path: '' }],
    ['an archive_app_version that is a number', { archive_app_version: 1 }],
    ['an archive_created_at without an offset', { archive_created_at: '2026-10-09T12:00:00' }],
    ['a prepared_at that names no point in time', { prepared_at: '2026-02-31T99:00:00+07:00' }],
    ['a prepared_at that is not text', { prepared_at: 1760000000 }],
  ])('200 with %s → contract_violation', async (_name, over) => {
    const { adapters } = answering(reply(200, { ...RECORD, ...over }))
    expect((await adapters.prepare(PATH)).kind).toBe('contract_violation')
  })

  it.each([null, 'text', 42, [RECORD], undefined])('200 whose body is %j → contract_violation', async (body) => {
    const { adapters } = answering(reply(200, body))
    expect((await adapters.prepare(PATH)).kind).toBe('contract_violation')
  })

  it('extra fields of a 200 are dropped (the staged path never reaches the page), and the answer is still ok', async () => {
    const { adapters } = answering(reply(200, { ...RECORD, staged_db_path: 'C:\\x', extra: 'x' }))
    expect(await adapters.prepare(PATH)).toEqual({ kind: 'ok', label: 200, data: RECORD })
  })
})

describe('cancel — cancel_restore, restore:cancel', () => {
  it('calls restore:cancel with an empty object as the one argument, once', async () => {
    const { adapters, call } = answering(reply(200, { canceled: true }))
    await adapters.cancel()
    expect(call).toHaveBeenCalledTimes(1)
    expect(call.mock.calls[0]).toEqual(['restore:cancel', {}])
  })

  it.each([true, false])('200 with canceled %s → ok', async (canceled) => {
    const { adapters } = answering(reply(200, { canceled }))
    expect(await adapters.cancel()).toEqual({ kind: 'ok', label: 200, data: { canceled } })
  })

  it('500 → declared_error ERR_STORAGE_IO, the error body unchanged', async () => {
    const { adapters } = answering(reply(500, errorBody('ERR_STORAGE_IO')))
    expect(await adapters.cancel()).toEqual({ kind: 'declared_error', label: 500, error: errorBody('ERR_STORAGE_IO') })
  })

  it('a rejected Promise → unreachable', async () => {
    const { adapters } = build(() => Promise.reject(new Error('refused')))
    expect(await adapters.cancel()).toMatchObject({ kind: 'unreachable', reason: expect.stringContaining('refused') })
  })

  it.each([400, 404, 409, 424, 503])('label %i, which restore:cancel does not declare, → contract_violation', async (label) => {
    const { adapters } = answering(reply(label, { canceled: true }))
    expect((await adapters.cancel()).kind).toBe('contract_violation')
  })

  it('500 carrying another code → contract_violation', async () => {
    const { adapters } = answering(reply(500, errorBody('ERR_SERVICE_UNAVAILABLE')))
    expect((await adapters.cancel()).kind).toBe('contract_violation')
  })

  it.each([
    ['canceled that is a string', { canceled: 'true' }],
    ['canceled that is 1', { canceled: 1 }],
    ['canceled that is null', { canceled: null }],
    ['canceled missing', {}],
    ['a body that is null', null],
    ['a body that is a string', 'true'],
    ['a body that is an array', [true]],
    ['no body', undefined],
  ])('200 with %s → contract_violation', async (_name, body) => {
    const { adapters } = answering(reply(200, body))
    expect((await adapters.cancel()).kind).toBe('contract_violation')
  })

  it('extra fields of a 200 are dropped, and the answer is still ok', async () => {
    const { adapters } = answering({ status: 200, body: { canceled: true, removed: 'restore-pending.json' }, other: 1 })
    expect(await adapters.cancel()).toEqual({ kind: 'ok', label: 200, data: { canceled: true } })
  })
})

describe('every answer must be the object { status, body }', () => {
  it.each([
    ['an empty object', {}],
    ['a string', 'ok'],
    ['null', null],
    ['a number', 200],
    ['undefined', undefined],
    ['an array', [200, {}]],
    ['status that is a string', { status: '200', body: { pending: null } }],
    ['status missing', { body: { pending: null } }],
    ['body missing', { status: 200 }],
  ])('%s → contract_violation, for the three restore calls', async (_name, answer) => {
    const { adapters } = answering(answer)
    expect((await adapters.readStatus()).kind).toBe('contract_violation')
    expect((await adapters.prepare('D:\\a.ctbackup')).kind).toBe('contract_violation')
    expect((await adapters.cancel()).kind).toBe('contract_violation')
  })

  it('a contract violation and an unreachable call are written to the diagnostic channel', async () => {
    const violating = answering(reply(200, {}))
    await violating.adapters.readStatus()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[restore_data] contract violation'))
    errorSpy.mockClear()
    const rejected = build(() => Promise.reject(new Error('x')))
    await rejected.adapters.cancel()
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[restore_data] unreachable'))
  })
})
