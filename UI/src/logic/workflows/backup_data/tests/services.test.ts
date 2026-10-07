// Services of backup_data — i3-logic.md, Step I3.6, and the plan of session 34
// (item 4): every CallResult kind of both calls maps to the right ViewResult; the
// flow of two steps (a cancel sends nothing and says nothing; a rejected dialog
// sends nothing and says its own sentence; a chosen folder is used once, with its
// exact path); every declared error code of create_backup has a message (walked
// from the label table of Configs, not listed by hand); the size of the archive in
// the five cases of the plan and the choice of rounding; the time of creation; the
// three lines of the result frame; onCreating called exactly when step 2 starts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CallResult, ResultMessages } from '../../../shared/results'
import type { BackupDataAdapters } from '../adapters'
import { BACKUP_DATA_CONFIGS } from '../configs'
import type { BackupArchiveRecord, FolderChoice } from '../entities'
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
const cfg = BACKUP_DATA_CONFIGS

const ARCHIVE: BackupArchiveRecord = {
  archive_path: 'D:\\Backups\\commission-tracker-20261007-170000.ctbackup',
  app_version: '0.1.0',
  size_bytes: 12698,
  sha256: 'a'.repeat(64),
  created_at: '2026-10-07T17:00:00+07:00',
}
const CHOSEN: CallResult<FolderChoice> = { kind: 'ok', label: 200, data: { canceled: false, path: 'D:\\Backups' } }
const CANCELED: CallResult<FolderChoice> = { kind: 'ok', label: 200, data: { canceled: true, path: null } }
const created = (over: Partial<BackupArchiveRecord> = {}): CallResult<BackupArchiveRecord> => ({ kind: 'ok', label: 201, data: { ...ARCHIVE, ...over } })
const declared = (label: number, code: string): CallResult<never> => ({ kind: 'declared_error', label, error: { code, message: 'x', details: null } })
const UNREACHABLE: CallResult<never> = { kind: 'unreachable', reason: 'refused' }
const VIOLATION: CallResult<never> = { kind: 'contract_violation', reason: 'bad body' }

function build(pick: CallResult<FolderChoice>, create: CallResult<BackupArchiveRecord> | null = null) {
  const pickFolder = vi.fn(async () => pick)
  const createBackup = vi.fn<BackupDataAdapters['createBackup']>(async () => {
    if (create === null) throw new Error('test: createBackup was not expected to be called')
    return create
  })
  const adapters: BackupDataAdapters = { pickFolder, createBackup }
  const onCreating = vi.fn()
  return { services: createBackupDataServices(adapters, cfg, messages), pickFolder, createBackup, onCreating }
}

// "HH:mm dd/mm/yyyy" of an instant in the machine's time zone, as the app shows it.
const shownAt = (iso: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

describe('the flow of two steps', () => {
  it('a folder chosen → create_backup once, with exactly that path, then the result', async () => {
    const { services, pickFolder, createBackup, onCreating } = build(CHOSEN, created())
    const r = await services.createBackup(onCreating)
    expect(pickFolder).toHaveBeenCalledTimes(1)
    expect(createBackup).toHaveBeenCalledTimes(1)
    expect(createBackup).toHaveBeenCalledWith('D:\\Backups')
    expect(r.kind).toBe('ok')
  })

  it('a path with spaces, accents and a trailing backslash goes through untouched', async () => {
    const path = 'E:\\Sao lưu\\Tranh của Ánh\\'
    const { services, createBackup, onCreating } = build({ kind: 'ok', label: 200, data: { canceled: false, path } }, created())
    await services.createBackup(onCreating)
    expect(createBackup).toHaveBeenCalledWith(path)
  })

  it('the dialog cancelled → nothing is sent, nothing is said: { outcome: canceled }', async () => {
    const { services, createBackup, onCreating } = build(CANCELED)
    const r = await services.createBackup(onCreating)
    expect(r).toEqual({ kind: 'ok', view: { outcome: 'canceled' } })
    expect(createBackup).not.toHaveBeenCalled()
    expect(onCreating).not.toHaveBeenCalled()
  })

  it('the dialog rejected → its own sentence (not "không kết nối được"), nothing is sent', async () => {
    const { services, createBackup, onCreating } = build(UNREACHABLE)
    const r = await services.createBackup(onCreating)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: cfg.dialogFailure.code, message: 'Không mở được hộp thoại chọn thư mục. Hãy thử lại.', fieldErrors: {} })
    expect(createBackup).not.toHaveBeenCalled()
    expect(onCreating).not.toHaveBeenCalled()
  })

  it('an answer of the dialog off the contract → the layer sentence, nothing is sent', async () => {
    const { services, createBackup, onCreating } = build(VIOLATION)
    expect(await services.createBackup(onCreating)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
    expect(createBackup).not.toHaveBeenCalled()
    expect(onCreating).not.toHaveBeenCalled()
  })

  it('a declared error from the dialog cannot happen; if it does, it is a contract violation and nothing is sent', async () => {
    const { services, createBackup, onCreating } = build(declared(400, 'ERR_VALIDATION'))
    expect(await services.createBackup(onCreating)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
    expect(createBackup).not.toHaveBeenCalled()
  })

  it('onCreating is called once, after the folder is chosen and before create_backup answers', async () => {
    const order: string[] = []
    const pickFolder = vi.fn(async () => {
      order.push('pick')
      return CHOSEN
    })
    const createBackup = vi.fn(async () => {
      order.push('create')
      return created()
    })
    const services = createBackupDataServices({ pickFolder, createBackup }, cfg, messages)
    await services.createBackup(() => order.push('creating'))
    expect(order).toEqual(['pick', 'creating', 'create'])
  })

  it('onCreating is still called when create_backup then fails', async () => {
    const { services, onCreating } = build(CHOSEN, declared(500, 'ERR_STORAGE_IO'))
    await services.createBackup(onCreating)
    expect(onCreating).toHaveBeenCalledTimes(1)
  })
})

describe('create_backup answers', () => {
  it('201 → the notice and the three lines of the frame, in order', async () => {
    const { services, onCreating } = build(CHOSEN, created())
    const r = await services.createBackup(onCreating)
    expect(r).toEqual({
      kind: 'ok',
      view: {
        outcome: 'created',
        message: 'Đã tạo bản sao lưu.',
        entries: [
          { key: 'file', term: 'Tệp', value: ARCHIVE.archive_path },
          { key: 'size', term: 'Dung lượng', value: '12,4 KB' },
          { key: 'created_at', term: 'Tạo lúc', value: shownAt(ARCHIVE.created_at) },
        ],
      },
    })
  })

  it('the time of creation is "HH:mm dd/mm/yyyy" in the machine\'s time zone', async () => {
    const { services, onCreating } = build(CHOSEN, created({ created_at: '2026-10-07T17:05:09+07:00' }))
    const r = await services.createBackup(onCreating)
    if (r.kind !== 'ok' || r.view.outcome !== 'created') throw new Error('test: expected a created view')
    const text = r.view.entries[2].value
    expect(text).toMatch(/^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/)
    expect(text).toBe(shownAt('2026-10-07T17:05:09+07:00'))
  })

  it('the path is shown as it came, with nothing cut', async () => {
    const long = `D:\\${'Thư mục rất dài '.repeat(20)}\\bản sao lưu.ctbackup`
    const { services, onCreating } = build(CHOSEN, created({ archive_path: long }))
    const r = await services.createBackup(onCreating)
    if (r.kind !== 'ok' || r.view.outcome !== 'created') throw new Error('test: expected a created view')
    expect(r.view.entries[0].value).toBe(long)
  })

  it('400 → "Không dùng được thư mục này. Hãy chọn thư mục khác." (rejected, system)', async () => {
    const { services, onCreating } = build(CHOSEN, declared(400, 'ERR_VALIDATION'))
    expect(await services.createBackup(onCreating)).toEqual({
      kind: 'rejected',
      origin: 'system',
      code: 'ERR_VALIDATION',
      message: 'Không dùng được thư mục này. Hãy chọn thư mục khác.',
      fieldErrors: {},
    })
  })

  it('500 → "Không ghi được tệp sao lưu vào thư mục này. …" (rejected, system)', async () => {
    const { services, onCreating } = build(CHOSEN, declared(500, 'ERR_STORAGE_IO'))
    expect(await services.createBackup(onCreating)).toEqual({
      kind: 'rejected',
      origin: 'system',
      code: 'ERR_STORAGE_IO',
      message: 'Không ghi được tệp sao lưu vào thư mục này. Hãy chọn thư mục khác, hoặc kiểm tra ổ đĩa còn chỗ trống.',
      fieldErrors: {},
    })
  })

  it('unreachable → the layer sentence', async () => {
    const { services, onCreating } = build(CHOSEN, UNREACHABLE)
    expect(await services.createBackup(onCreating)).toEqual({ kind: 'unreachable', message: messages.unreachable })
  })

  it('contract_violation → the layer sentence', async () => {
    const { services, onCreating } = build(CHOSEN, VIOLATION)
    expect(await services.createBackup(onCreating)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })

  it('every declared error code of create_backup has a message of its own (walked from the label table)', async () => {
    const codes = Object.values(cfg.endpoints.createBackup.labels).filter((v) => v !== 'ok')
    expect(codes.sort()).toEqual(['ERR_STORAGE_IO', 'ERR_VALIDATION'])
    for (const code of codes) {
      const { services, onCreating } = build(CHOSEN, declared(400, code))
      const r = await services.createBackup(onCreating)
      if (r.kind !== 'rejected') throw new Error(`test: expected a rejection for ${code}`)
      expect(r.message, code).not.toBe('')
      expect(r.message, code).toBe(cfg.errorMessages.createBackup[code])
    }
  })
})

describe('the size of the archive (rounded to the nearest tenth, a tie going up; decimal comma)', () => {
  // [bytes, text]. Five cases of the plan, then the boundaries and the roundings.
  const SIZES: [number, string][] = [
    [0, '0 byte'],
    [1023, '1023 byte'],
    [1024, '1,0 KB'],
    [1048575, '1024,0 KB'],
    [1048576, '1,0 MB'],
    [1, '1 byte'],
    [12698, '12,4 KB'],
    [1536, '1,5 KB'],
    // 256 / 1024 = 0.25: a tie, which goes up.
    [256 + 1024, '1,3 KB'],
    // 1.04 KB rounds down to 1,0; 1.06 KB rounds up to 1,1.
    [1065, '1,0 KB'],
    [1086, '1,1 KB'],
    [3 * 1048576, '3,0 MB'],
    [3.25 * 1048576, '3,3 MB'],
    [Math.round(12.4 * 1048576), '12,4 MB'],
    [2 ** 30, '1024,0 MB'],
    [Number.MAX_SAFE_INTEGER, `${(Number.MAX_SAFE_INTEGER / 1048576).toFixed(1).replace('.', ',')} MB`],
  ]
  it.each(SIZES)('%d bytes → %s', async (bytes, text) => {
    const { services, onCreating } = build(CHOSEN, created({ size_bytes: bytes }))
    const r = await services.createBackup(onCreating)
    if (r.kind !== 'ok' || r.view.outcome !== 'created') throw new Error('test: expected a created view')
    expect(r.view.entries[1]).toEqual({ key: 'size', term: 'Dung lượng', value: text })
  })

  it('the unit is chosen from the bytes before rounding: 1048575 stays KB', async () => {
    const { services, onCreating } = build(CHOSEN, created({ size_bytes: 1048575 }))
    const r = await services.createBackup(onCreating)
    if (r.kind !== 'ok' || r.view.outcome !== 'created') throw new Error('test: expected a created view')
    expect(r.view.entries[1].value).toBe('1024,0 KB')
  })
})

describe('the configuration realizes the decisions of the contract and the specification', () => {
  it('the contract versions and the fixed purpose', () => {
    expect(cfg.contract).toEqual({ apiContract: '4.0.0', dataSchema: '9.0.3' })
    expect(cfg.purpose).toBe('manual')
    expect(cfg.dialogs.pickFolder.address).toBe('dialog:pick-folder')
    expect(cfg.endpoints.createBackup).toMatchObject({ method: 'POST', path: '/backups' })
    expect(cfg.endpoints.createBackup.labels).toEqual({ '201': 'ok', '400': 'ERR_VALIDATION', '500': 'ERR_STORAGE_IO' })
  })
})

// A test that makes sure no fake outlives its test.
beforeEach(() => {
  vi.useRealTimers()
})
afterEach(() => {
  vi.restoreAllMocks()
})
