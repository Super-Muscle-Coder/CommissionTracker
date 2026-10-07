// Adapters of backup_data — coverage matrix of i3-logic.md, Step I3.6, for the
// two calls of ui_decomposition.md "Chặng E" (api_contract.yaml 4.0.0):
//   pick_folder   ipc  dialog:pick-folder   200 { canceled, path }   (Promise rejected, off-shape answer)
//   create_backup http POST /backups        201 ok, 400, 500
// create_backup: every declared label, unreachable, an undeclared label, a
// missing field, a wrong type, a wrong code, an integer outside the safe range,
// extra fields dropped; and the request it sends (method, path, body keyed by
// input name, purpose always 'manual'). pick_folder: the two valid answers, a
// rejected Promise, and every way the answer can leave the contract. prepare_restore
// is not among the calls: the interface never calls it. Fake http_client and ipc_bridge.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpClient, IpcBridge, Transport } from '../../../shared/resources'
import { createBackupDataAdapters, type BackupDataAdapters } from '../adapters'
import { BACKUP_DATA_CONFIGS } from '../configs'
import type { BackupArchiveRecord } from '../entities'

const cfg = BACKUP_DATA_CONFIGS
const ARCHIVE: BackupArchiveRecord = {
  archive_path: 'D:\\Backups\\commission-tracker-20261007-170000.ctbackup',
  app_version: '0.1.0',
  size_bytes: 12698,
  sha256: 'a'.repeat(64),
  created_at: '2026-10-07T17:00:00+07:00',
}
const errorBody = (code: string) => ({ code, message: 'x', details: null })
const omit = <T extends object>(o: T, k: keyof T) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k))

function build(transport: Transport | (() => Promise<Transport>), ipcAnswer: () => Promise<unknown> = async () => ({ status: 200, body: { canceled: true, path: null } })) {
  const send = vi.fn(async (): Promise<Transport> => (typeof transport === 'function' ? transport() : transport))
  const call = vi.fn<IpcBridge['call']>(async () => ipcAnswer())
  const http: HttpClient = { send }
  const ipc: IpcBridge = { call }
  const adapters: BackupDataAdapters = createBackupDataAdapters(http, ipc, cfg)
  return { adapters, send, call }
}
const response = (label: number, body: unknown): Transport => ({ kind: 'response', label, body })

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errorSpy.mockRestore()
})

describe('pickFolder — native_dialogs.pick_folder through ipc_bridge', () => {
  it('calls dialog:pick-folder with an empty object as the one argument', async () => {
    const { adapters, call } = build(response(200, null))
    await adapters.pickFolder()
    expect(call).toHaveBeenCalledTimes(1)
    expect(call.mock.calls[0]).toEqual(['dialog:pick-folder', {}])
  })

  it('a folder chosen → ok with the path', async () => {
    const { adapters } = build(response(200, null), async () => ({ status: 200, body: { canceled: false, path: 'C:\\x' } }))
    expect(await adapters.pickFolder()).toEqual({ kind: 'ok', label: 200, data: { canceled: false, path: 'C:\\x' } })
  })

  it('the dialog cancelled → ok with canceled true and no path', async () => {
    const { adapters } = build(response(200, null), async () => ({ status: 200, body: { canceled: true, path: null } }))
    expect(await adapters.pickFolder()).toEqual({ kind: 'ok', label: 200, data: { canceled: true, path: null } })
  })

  it('extra fields of the answer are dropped, and the answer is still ok', async () => {
    const { adapters } = build(response(200, null), async () => ({ status: 200, body: { canceled: false, path: 'C:\\x', extra: 1 }, more: true }))
    expect(await adapters.pickFolder()).toEqual({ kind: 'ok', label: 200, data: { canceled: false, path: 'C:\\x' } })
  })

  it('a rejected Promise → unreachable, whatever the message, and nothing else is sent', async () => {
    const boom = new Error("Error invoking remote method 'dialog:pick-folder': Error: boom")
    const { adapters, send } = build(response(200, null), () => Promise.reject(boom))
    const r = await adapters.pickFolder()
    expect(r.kind).toBe('unreachable')
    expect(r).toMatchObject({ reason: expect.stringContaining('boom') })
    expect(send).not.toHaveBeenCalled()
  })

  it('a rejection that is not an Error is still unreachable', async () => {
    const { adapters } = build(response(200, null), () => Promise.reject('refused'))
    const r = await adapters.pickFolder()
    expect(r).toMatchObject({ kind: 'unreachable', reason: expect.stringContaining('refused') })
  })

  const OFF_THE_CONTRACT: [string, unknown][] = [
    ['canceled true with a path', { status: 200, body: { canceled: true, path: 'C:\\x' } }],
    ['canceled false with path null', { status: 200, body: { canceled: false, path: null } }],
    ['canceled false with an empty path', { status: 200, body: { canceled: false, path: '' } }],
    ['canceled that is not a boolean', { status: 200, body: { canceled: 'yes', path: 'C:\\x' } }],
    ['a path that is not a string', { status: 200, body: { canceled: false, path: 42 } }],
    ['canceled missing', { status: 200, body: { path: 'C:\\x' } }],
    ['path missing on a cancel', { status: 200, body: { canceled: true } }],
    ['no body', { status: 200 }],
    ['a null body', { status: 200, body: null }],
    ['a body that is not an object', { status: 200, body: 'C:\\x' }],
    ['status 400', { status: 400, body: { canceled: true, path: null } }],
    ['status 500 with an error body', { status: 500, body: errorBody('ERR_STORAGE_IO') }],
    ['status missing', { body: { canceled: true, path: null } }],
    ['status that is a string', { status: '200', body: { canceled: true, path: null } }],
    ['an empty object', {}],
    ['a string', 'C:\\x'],
    ['null', null],
    ['a number', 42],
    ['undefined', undefined],
    ['an array', [{ status: 200 }]],
  ]
  it.each(OFF_THE_CONTRACT)('%s → contract_violation', async (_name, answer) => {
    const { adapters } = build(response(200, null), async () => answer)
    const r = await adapters.pickFolder()
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining('dialog:pick-folder') })
  })
})

describe('createBackup — create_backup, POST /backups', () => {
  it('sends the request: method, path, no query, body keyed by the input name, purpose manual', async () => {
    const { adapters, send } = build(response(201, ARCHIVE))
    await adapters.createBackup('D:\\Backups')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]).toEqual(['POST', '/backups', { query: null, body: { backup_request: { destination_dir: 'D:\\Backups', purpose: 'manual' } } }])
  })

  it('201 → ok with the archive, every field', async () => {
    const { adapters } = build(response(201, ARCHIVE))
    expect(await adapters.createBackup('D:\\Backups')).toEqual({ kind: 'ok', label: 201, data: ARCHIVE })
  })

  it('size_bytes 0 is a valid size (an integer >= 0)', async () => {
    const { adapters } = build(response(201, { ...ARCHIVE, size_bytes: 0 }))
    expect(await adapters.createBackup('D:\\Backups')).toMatchObject({ kind: 'ok', data: { size_bytes: 0 } })
  })

  it.each([
    [400, 'ERR_VALIDATION'],
    [500, 'ERR_STORAGE_IO'],
  ])('%i → declared_error %s, the error body unchanged', async (label, code) => {
    const { adapters } = build(response(label, errorBody(code)))
    expect(await adapters.createBackup('D:\\Backups')).toEqual({ kind: 'declared_error', label, error: errorBody(code) })
  })

  it('unreachable → unreachable', async () => {
    const { adapters } = build({ kind: 'unreachable', reason: 'refused' })
    expect(await adapters.createBackup('D:\\Backups')).toEqual({ kind: 'unreachable', reason: 'refused' })
  })

  it.each([200, 404, 409, 503])('label %i, which the contract does not declare → contract_violation', async (label) => {
    const { adapters } = build(response(label, ARCHIVE))
    const r = await adapters.createBackup('D:\\Backups')
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining(`label ${label}`) })
  })

  it.each(['archive_path', 'app_version', 'size_bytes', 'sha256', 'created_at'] as const)('201 without %s → contract_violation', async (field) => {
    const { adapters } = build(response(201, omit(ARCHIVE, field)))
    const r = await adapters.createBackup('D:\\Backups')
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining(field) })
  })

  it.each([
    ['archive_path that is a number', { archive_path: 42 }],
    ['an empty archive_path', { archive_path: '' }],
    ['app_version that is a number', { app_version: 1 }],
    ['sha256 that is a number', { sha256: 1 }],
    ['size_bytes that is a string', { size_bytes: '12698' }],
    ['a negative size_bytes', { size_bytes: -1 }],
    ['a size_bytes that is not an integer', { size_bytes: 1.5 }],
    ['a size_bytes above 2^53−1', { size_bytes: 9007199254740992 }],
    ['created_at that is not text', { created_at: 20261007 }],
    ['created_at without an offset', { created_at: '2026-10-07T17:00:00' }],
    ['created_at in another format', { created_at: '07/10/2026 17:00' }],
    ['created_at that names no point in time', { created_at: '2026-13-45T99:99:00+07:00' }],
  ])('201 with %s → contract_violation', async (_name, over) => {
    const { adapters } = build(response(201, { ...ARCHIVE, ...over }))
    expect((await adapters.createBackup('D:\\Backups')).kind).toBe('contract_violation')
  })

  it.each([null, 'text', 42, [ARCHIVE]])('201 whose body is %j → contract_violation', async (body) => {
    const { adapters } = build(response(201, body))
    expect((await adapters.createBackup('D:\\Backups')).kind).toBe('contract_violation')
  })

  it('400 carrying another declared code → contract_violation', async () => {
    const { adapters } = build(response(400, errorBody('ERR_STORAGE_IO')))
    const r = await adapters.createBackup('D:\\Backups')
    expect(r.kind).toBe('contract_violation')
    expect(r).toMatchObject({ reason: expect.stringContaining('ERR_STORAGE_IO') })
  })

  it('500 whose body is not an error body → contract_violation', async () => {
    const { adapters } = build(response(500, { oops: true }))
    expect((await adapters.createBackup('D:\\Backups')).kind).toBe('contract_violation')
  })

  it('extra fields of a 201 are dropped, and the answer is still ok', async () => {
    const { adapters } = build(response(201, { ...ARCHIVE, extra: 'x' }))
    const r = await adapters.createBackup('D:\\Backups')
    expect(r).toEqual({ kind: 'ok', label: 201, data: ARCHIVE })
  })
})
