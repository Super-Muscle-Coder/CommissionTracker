// Routers of backup_data — i3-logic.md, Step I3.5 and I3.6: the one operation the
// page uses, "Tạo bản sao lưu", hands the page's onCreating on to Services and
// answers what Services answers; real Services over fake Adapters, so the whole
// flow of the page is seen from its entry: a cancel sends nothing, a chosen
// folder is used once with its exact path and the purpose manual (checked at the
// http boundary by the Adapters test), a second press while Services is running
// is the page's guard, not Routers'. The page has no input field, so there is no
// format check here and no rejectInput.
import { describe, expect, it, vi } from 'vitest'
import type { CallResult, ResultMessages } from '../../../shared/results'
import type { BackupDataAdapters } from '../adapters'
import { BACKUP_DATA_CONFIGS } from '../configs'
import type { BackupArchiveRecord, FolderChoice } from '../entities'
import { createBackupDataRouters } from '../routers'
import { createBackupDataServices } from '../services'

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

const ARCHIVE: BackupArchiveRecord = {
  archive_path: 'D:\\Backups\\commission-tracker-20261007-170000.ctbackup',
  app_version: '0.1.0',
  size_bytes: 2048,
  sha256: 'b'.repeat(64),
  created_at: '2026-10-07T17:00:00+07:00',
}

function build(pick: CallResult<FolderChoice>, create: CallResult<BackupArchiveRecord>) {
  const pickFolder = vi.fn(async () => pick)
  const createBackup = vi.fn<BackupDataAdapters['createBackup']>(async () => create)
  const adapters: BackupDataAdapters = { pickFolder, createBackup }
  const routers = createBackupDataRouters(createBackupDataServices(adapters, BACKUP_DATA_CONFIGS, messages))
  return { routers, pickFolder, createBackup }
}

describe('createBackup', () => {
  it('a chosen folder: onCreating once, create_backup once with that path, the created view', async () => {
    const { routers, createBackup } = build(
      { kind: 'ok', label: 200, data: { canceled: false, path: 'D:\\Backups' } },
      { kind: 'ok', label: 201, data: ARCHIVE },
    )
    const onCreating = vi.fn()
    const r = await routers.createBackup(onCreating)
    expect(onCreating).toHaveBeenCalledTimes(1)
    expect(createBackup).toHaveBeenCalledTimes(1)
    expect(createBackup).toHaveBeenCalledWith('D:\\Backups')
    expect(r).toMatchObject({ kind: 'ok', view: { outcome: 'created', message: 'Đã tạo bản sao lưu.' } })
  })

  it('a cancel: nothing is created, onCreating is not called, the page is told "canceled"', async () => {
    const { routers, createBackup } = build({ kind: 'ok', label: 200, data: { canceled: true, path: null } }, { kind: 'ok', label: 201, data: ARCHIVE })
    const onCreating = vi.fn()
    expect(await routers.createBackup(onCreating)).toEqual({ kind: 'ok', view: { outcome: 'canceled' } })
    expect(createBackup).not.toHaveBeenCalled()
    expect(onCreating).not.toHaveBeenCalled()
  })

  it('two presses in a row make two flows (the page is what stops the second): each asks the dialog', async () => {
    const { routers, pickFolder } = build({ kind: 'ok', label: 200, data: { canceled: true, path: null } }, { kind: 'ok', label: 201, data: ARCHIVE })
    await routers.createBackup(vi.fn())
    await routers.createBackup(vi.fn())
    expect(pickFolder).toHaveBeenCalledTimes(2)
  })
})
