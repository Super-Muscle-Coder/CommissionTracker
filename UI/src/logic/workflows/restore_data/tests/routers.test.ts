// Routers of restore_data — i3-logic.md, Step I3.5 and I3.6: the four operations the
// page uses (open, choose a file, prepare, cancel) hand their arguments on and answer
// what Services answers; real Services over fake Adapters, so the whole flow of the
// page is seen from its entry. The flow of the plan, item 3: a cancelled dialog and a
// rejected one never call prepare; a chosen file does not call it either, until the
// page confirms; "Quay lại" is the page's and calls nothing; a confirmation calls
// prepare exactly once, with exactly the path chosen. The page has no input field, so
// there is no format check here and no rejectInput.
import { describe, expect, it, vi } from 'vitest'
import type { CallResult, ResultMessages } from '../../../shared/results'
import type { RestoreDataAdapters } from '../adapters'
import { RESTORE_DATA_CONFIGS } from '../configs'
import type { FileChoice, PendingRestoreRecord, RestoreCancellation, RestoreStatusRecord } from '../entities'
import { createRestoreDataRouters } from '../routers'
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

const RECORD: PendingRestoreRecord = {
  archive_path: 'D:\\Backups\\a.ctbackup',
  archive_app_version: '0.1.0',
  archive_created_at: '2026-10-09T12:00:00+07:00',
  safety_backup_path: 'C:\\data\\safety-backups\\s.ctbackup',
  prepared_at: '2026-10-09T13:05:00+07:00',
}

function build(over: {
  pick?: CallResult<FileChoice>
  prepare?: CallResult<PendingRestoreRecord>
  cancel?: CallResult<RestoreCancellation>
  status?: CallResult<RestoreStatusRecord>
}) {
  const none = (name: string) => async (): Promise<never> => {
    throw new Error(`test: ${name} was not expected to be called`)
  }
  const readStatus = vi.fn<RestoreDataAdapters['readStatus']>(over.status === undefined ? none('readStatus') : async () => over.status as CallResult<RestoreStatusRecord>)
  const pickArchive = vi.fn<RestoreDataAdapters['pickArchive']>(over.pick === undefined ? none('pickArchive') : async () => over.pick as CallResult<FileChoice>)
  const prepare = vi.fn<RestoreDataAdapters['prepare']>(over.prepare === undefined ? none('prepare') : async () => over.prepare as CallResult<PendingRestoreRecord>)
  const cancel = vi.fn<RestoreDataAdapters['cancel']>(over.cancel === undefined ? none('cancel') : async () => over.cancel as CallResult<RestoreCancellation>)
  const adapters: RestoreDataAdapters = { readStatus, pickArchive, prepare, cancel }
  const routers = createRestoreDataRouters(createRestoreDataServices(adapters, RESTORE_DATA_CONFIGS, messages))
  return { routers, readStatus, pickArchive, prepare, cancel }
}

describe('loadStatus', () => {
  it('reads the status once and answers what Services answers', async () => {
    const { routers, readStatus } = build({ status: { kind: 'ok', label: 200, data: { pending: null } } })
    expect(await routers.loadStatus()).toEqual({ result: { kind: 'ok', view: { message: null } }, pending: { state: 'none' } })
    expect(readStatus).toHaveBeenCalledTimes(1)
  })
})

describe('chooseArchive', () => {
  it('a chosen file: the dialog once, and prepare is NOT called', async () => {
    const { routers, pickArchive, prepare } = build({ pick: { kind: 'ok', label: 200, data: { canceled: false, path: 'D:\\x.ctbackup' } } })
    const r = await routers.chooseArchive(false)
    expect(pickArchive).toHaveBeenCalledTimes(1)
    expect(prepare).not.toHaveBeenCalled()
    expect(r).toMatchObject({ kind: 'ok', view: { outcome: 'chosen', path: 'D:\\x.ctbackup' } })
  })

  it('a cancel: prepare is not called, the page is told "canceled"', async () => {
    const { routers, prepare } = build({ pick: { kind: 'ok', label: 200, data: { canceled: true, path: null } } })
    expect(await routers.chooseArchive(true)).toEqual({ kind: 'ok', view: { outcome: 'canceled' } })
    expect(prepare).not.toHaveBeenCalled()
  })

  it('a rejected dialog: prepare is not called', async () => {
    const { routers, prepare } = build({ pick: { kind: 'unreachable', reason: 'boom' } })
    expect(await routers.chooseArchive(false)).toMatchObject({ kind: 'rejected', code: 'DIALOG_FAILED' })
    expect(prepare).not.toHaveBeenCalled()
  })

  it('replacesPending is handed on: the question mentions the replacement only then', async () => {
    const { routers } = build({ pick: { kind: 'ok', label: 200, data: { canceled: false, path: 'D:\\x.ctbackup' } } })
    const withOne = await routers.chooseArchive(true)
    const without = await routers.chooseArchive(false)
    if (withOne.kind !== 'ok' || withOne.view.outcome !== 'chosen' || without.kind !== 'ok' || without.view.outcome !== 'chosen') throw new Error('test: expected chosen views')
    expect(withOne.view.question).toContain('Lần khôi phục đang chờ sẽ được thay bằng lần này.')
    expect(without.view.question).not.toContain('Lần khôi phục đang chờ sẽ được thay bằng lần này.')
  })

  it('two presses in a row make two dialogs (the page is what stops the second)', async () => {
    const { routers, pickArchive } = build({ pick: { kind: 'ok', label: 200, data: { canceled: true, path: null } } })
    await routers.chooseArchive(false)
    await routers.chooseArchive(false)
    expect(pickArchive).toHaveBeenCalledTimes(2)
  })
})

describe('the whole flow: choose, ask, confirm', () => {
  it('choosing calls nothing but the dialog; "Quay lại" (the page dropping the question) calls nothing at all; the confirmation calls prepare once with exactly the path', async () => {
    const path = 'D:\\Sao lưu\\Tranh của Ánh\\a.ctbackup'
    const { routers, pickArchive, prepare, readStatus, cancel } = build({ pick: { kind: 'ok', label: 200, data: { canceled: false, path } }, prepare: { kind: 'ok', label: 200, data: RECORD } })
    const chosen = await routers.chooseArchive(false)
    if (chosen.kind !== 'ok' || chosen.view.outcome !== 'chosen') throw new Error('test: expected a chosen view')
    // The question is on the page: nothing has been sent. ("Quay lại" has no operation
    // of Routers: the page only drops the question, so nothing is called either.)
    expect([pickArchive.mock.calls.length, prepare.mock.calls.length, readStatus.mock.calls.length, cancel.mock.calls.length]).toEqual([1, 0, 0, 0])
    // The confirmation.
    const done = await routers.prepare(chosen.view.path)
    expect(prepare).toHaveBeenCalledTimes(1)
    expect(prepare).toHaveBeenCalledWith(path)
    expect(readStatus).not.toHaveBeenCalled()
    expect(done.result).toMatchObject({ kind: 'ok' })
    expect(done.pending).toMatchObject({ state: 'pending' })
  })
})

describe('prepare', () => {
  it.each([
    ['400', { kind: 'declared_error', label: 400, error: { code: 'ERR_VALIDATION', message: 'x', details: null } } as CallResult<never>],
    ['a rejected Promise', { kind: 'unreachable', reason: 'refused' } as CallResult<never>],
    ['an answer off the contract', { kind: 'contract_violation', reason: 'bad' } as CallResult<never>],
  ])('%s: the status is read again once; 200: not at all (see the 200 test above)', async (_name, failure) => {
    const { routers, readStatus } = build({ prepare: failure, status: { kind: 'ok', label: 200, data: { pending: RECORD } } })
    const r = await routers.prepare('D:\\a.ctbackup')
    expect(readStatus).toHaveBeenCalledTimes(1)
    expect(r.pending).toMatchObject({ state: 'pending' })
    expect(r.result.kind).not.toBe('ok')
  })
})

describe('cancel', () => {
  it('canceled: one call, no second read, nothing waits afterwards', async () => {
    const { routers, cancel, readStatus } = build({ cancel: { kind: 'ok', label: 200, data: { canceled: true } } })
    expect(await routers.cancel()).toMatchObject({ result: { kind: 'ok' }, pending: { state: 'none' } })
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(readStatus).not.toHaveBeenCalled()
  })
})
