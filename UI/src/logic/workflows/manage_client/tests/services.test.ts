// Services of manage_client — i3-logic.md, Step I3.6: every CallResult kind
// maps to the right ViewResult, for every operation; every declared error
// code has a message (walked from the label tables of Configs, not listed by
// hand); each presentation decision (Vietnamese order, archived group, empty
// list, dates, contact lines, status, notices, field messages) has a case.
import { describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { CallResult, ResultMessages, ViewResult } from '../../../shared/results'
import type { ManageClientAdapters } from '../adapters'
import { MANAGE_CLIENT_CONFIGS } from '../configs'
import type { ClientDetail, ClientInput, ClientList } from '../entities'
import { createManageClientServices } from '../services'

// The layer-level messages Main hands to every Services. The test plays Main,
// but a workflow folder imports nothing outside itself and logic/shared (R2),
// so it brings its own ResultMessages instead of the layer configuration.
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
const cfg = MANAGE_CLIENT_CONFIGS

const unused = () => vi.fn(async () => {
  throw new Error('test: adapter not expected to be called')
})

function fakeAdapters(over: Partial<ManageClientAdapters>): ManageClientAdapters {
  return {
    listClients: unused(),
    getClient: unused(),
    createClient: unused(),
    editClient: unused(),
    setClientArchived: unused(),
    ...over,
  }
}
const servicesOf = (over: Partial<ManageClientAdapters>) => createManageClientServices(fakeAdapters(over), cfg, messages)
const listing = (r: CallResult<ClientList>) => servicesOf({ listClients: vi.fn(async () => r) })

let n = 0
function client(display_name: string, is_archived = false) {
  n += 1
  const hex = n.toString(16).padStart(12, '0')
  return { client_id: `00000000-0000-4000-8000-${hex}`, display_name, is_archived, updated_at: '2026-09-27T10:00:00+07:00' }
}
const names = (rows: { name: string }[]) => rows.map((r) => r.name)

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const DETAIL: ClientDetail = {
  client_id: ID,
  display_name: 'Nguyễn Thu Hà',
  contacts: [
    { channel: 'facebook', value: 'fb.com/thuha' },
    { channel: 'email', value: 'ha@example.com' },
  ],
  note: 'Thích tông màu ấm',
  is_archived: false,
  created_at: '2026-09-27T10:00:00+07:00',
  updated_at: '2026-09-28T08:30:15Z',
}
const INPUT: ClientInput = { display_name: 'Nguyễn Thu Hà', contacts: [], note: null }
// The expected text of a timestamp: same formatter the decision names, machine time zone.
const shown = (ts: string) => new Intl.DateTimeFormat(cfg.displayLocale, cfg.dateTimeFormat).format(new Date(ts))
const DETAIL_VIEW = {
  clientId: ID,
  name: 'Nguyễn Thu Hà',
  isArchived: false,
  statusText: 'Đang hoạt động',
  contactLines: ['facebook: fb.com/thuha', 'email: ha@example.com'],
  note: 'Thích tông màu ấm',
  createdText: shown(DETAIL.created_at),
  updatedText: shown(DETAIL.updated_at),
}

// The three kinds that are not ok, with the ViewResult each must become.
// ERR_STORAGE_IO (500) is declared by every endpoint of the workflow.
const FAILURES: [string, CallResult<never>, ViewResult<never>][] = [
  [
    'declared_error 500 ERR_STORAGE_IO',
    { kind: 'declared_error', label: 500, error: { code: 'ERR_STORAGE_IO', message: 'disk full', details: null } },
    { kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.ERR_STORAGE_IO, fieldErrors: {} },
  ],
  ['unreachable', { kind: 'unreachable', reason: 'fetch failed' }, { kind: 'unreachable', message: messages.unreachable }],
  ['contract_violation', { kind: 'contract_violation', reason: 'label 418' }, { kind: 'contract_violation', message: messages.contractViolation }],
]

describe('loadClientList — CallResult → ViewResult', () => {
  it('ok → ok with the view model', async () => {
    const a = client('An')
    const r = await listing({ kind: 'ok', label: 200, data: [a] }).loadClientList()
    expect(r).toEqual({ kind: 'ok', view: { active: [{ clientId: a.client_id, name: 'An' }], archived: [], isEmpty: false } })
  })

  it('ok with an empty list → ok, isEmpty (the empty state, not an error)', async () => {
    const r = await listing({ kind: 'ok', label: 200, data: [] }).loadClientList()
    expect(r).toEqual({ kind: 'ok', view: { active: [], archived: [], isEmpty: true } })
  })

  it('ok with archived clients only → not isEmpty', async () => {
    const r = await listing({ kind: 'ok', label: 200, data: [client('Hà', true)] }).loadClientList()
    expect(r).toEqual({ kind: 'ok', view: { active: [], archived: [expect.any(Object)], isEmpty: false } })
  })

  it('declared_error → rejected, origin system, code kept, message from Configs', async () => {
    const error = { code: 'ERR_STORAGE_IO', message: 'database is locked', details: null }
    const r = await listing({ kind: 'declared_error', label: 500, error }).loadClientList()
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.ERR_STORAGE_IO, fieldErrors: {} })
  })

  it('unreachable → unreachable with the layer message', async () => {
    const r = await listing({ kind: 'unreachable', reason: 'fetch failed' }).loadClientList()
    expect(r).toEqual({ kind: 'unreachable', message: messages.unreachable })
  })

  it('contract_violation → contract_violation with the layer message, no technical detail', async () => {
    const r = await listing({ kind: 'contract_violation', reason: 'label 404 is not declared' }).loadClientList()
    expect(r).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })
})

describe('loadClientDetail', () => {
  it('calls get_client with the id; ok → the detail view', async () => {
    const getClient = vi.fn(async () => ({ kind: 'ok', label: 200, data: DETAIL }) as CallResult<ClientDetail>)
    expect(await servicesOf({ getClient }).loadClientDetail(ID)).toEqual({ kind: 'ok', view: DETAIL_VIEW })
    expect(getClient).toHaveBeenCalledExactlyOnceWith(ID)
  })

  it('declared_error 404 ERR_NOT_FOUND → rejected with "Không tìm thấy khách hàng này."', async () => {
    const error = { code: 'ERR_NOT_FOUND', message: 'no such client', details: null }
    const r = await servicesOf({ getClient: vi.fn(async () => ({ kind: 'declared_error', label: 404, error }) as CallResult<ClientDetail>) }).loadClientDetail(ID)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy khách hàng này.', fieldErrors: {} })
  })

  it.each(FAILURES)('%s → its ViewResult', async (_, result, expected) => {
    const r = await servicesOf({ getClient: vi.fn(async () => result) }).loadClientDetail(ID)
    expect(r).toEqual(expected)
  })
})

describe('openClientForm', () => {
  it('create → ok with an empty draft and the channel suggestions, no call', async () => {
    const services = servicesOf({})
    expect(await services.openClientForm({ mode: 'create' })).toEqual({
      kind: 'ok',
      view: { draft: { displayName: '', contacts: [], note: '' }, channelSuggestions: ['email', 'facebook', 'instagram', 'discord', 'zalo', 'x'] },
    })
  })

  it('edit → get_client, ok → the stored client as a draft (note null → empty text)', async () => {
    const getClient = vi.fn(async () => ({ kind: 'ok', label: 200, data: { ...DETAIL, note: null } }) as CallResult<ClientDetail>)
    const r = await servicesOf({ getClient }).openClientForm({ mode: 'edit', clientId: ID })
    expect(r).toEqual({
      kind: 'ok',
      view: {
        draft: { displayName: 'Nguyễn Thu Hà', contacts: DETAIL.contacts, note: '' },
        channelSuggestions: cfg.channelSuggestions,
      },
    })
    expect(getClient).toHaveBeenCalledExactlyOnceWith(ID)
  })

  it.each(FAILURES)('edit, %s → its ViewResult', async (_, result, expected) => {
    const r = await servicesOf({ getClient: vi.fn(async () => result) }).openClientForm({ mode: 'edit', clientId: ID })
    expect(r).toEqual(expected)
  })
})

describe('saveClient', () => {
  it('create → create_client with the input; ok → new id and "Đã thêm khách hàng."', async () => {
    const createClient = vi.fn(async () => ({ kind: 'ok', label: 201, data: DETAIL }) as CallResult<ClientDetail>)
    expect(await servicesOf({ createClient }).saveClient({ mode: 'create' }, INPUT)).toEqual({ kind: 'ok', view: { clientId: ID, message: 'Đã thêm khách hàng.' } })
    expect(createClient).toHaveBeenCalledExactlyOnceWith(INPUT)
  })

  it('edit → edit_client with id and input; ok → "Đã lưu thay đổi."', async () => {
    const editClient = vi.fn(async () => ({ kind: 'ok', label: 200, data: DETAIL }) as CallResult<ClientDetail>)
    expect(await servicesOf({ editClient }).saveClient({ mode: 'edit', clientId: ID }, INPUT)).toEqual({ kind: 'ok', view: { clientId: ID, message: 'Đã lưu thay đổi.' } })
    expect(editClient).toHaveBeenCalledExactlyOnceWith(ID, INPUT)
  })

  it('declared_error 400 ERR_VALIDATION → rejected, system, the general message (details not read)', async () => {
    const error = { code: 'ERR_VALIDATION', message: 'display_name too long', details: { loc: ['display_name'] } }
    const r = await servicesOf({ createClient: vi.fn(async () => ({ kind: 'declared_error', label: 400, error }) as CallResult<ClientDetail>) }).saveClient({ mode: 'create' }, INPUT)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_VALIDATION', message: cfg.errorMessages.ERR_VALIDATION, fieldErrors: {} })
  })

  it.each(FAILURES)('create, %s → its ViewResult', async (_, result, expected) => {
    expect(await servicesOf({ createClient: vi.fn(async () => result) }).saveClient({ mode: 'create' }, INPUT)).toEqual(expected)
  })

  it.each(FAILURES)('edit, %s → its ViewResult', async (_, result, expected) => {
    expect(await servicesOf({ editClient: vi.fn(async () => result) }).saveClient({ mode: 'edit', clientId: ID }, INPUT)).toEqual(expected)
  })
})

describe('setClientArchived', () => {
  it('archive → set_client_archived(id, true); ok → updated detail and the message saying what it changes', async () => {
    const setClientArchived = vi.fn(async () => ({ kind: 'ok', label: 200, data: { ...DETAIL, is_archived: true } }) as CallResult<ClientDetail>)
    const r = await servicesOf({ setClientArchived }).setClientArchived(ID, true)
    expect(r).toEqual({
      kind: 'ok',
      view: {
        detail: { ...DETAIL_VIEW, isArchived: true, statusText: 'Đã lưu trữ' },
        message: 'Đã lưu trữ. Khách này sẽ không có trong danh sách chọn khi tạo đơn mới; đơn cũ không bị ảnh hưởng.',
      },
    })
    expect(setClientArchived).toHaveBeenCalledExactlyOnceWith(ID, true)
  })

  it('unarchive → ok → "Đã bỏ lưu trữ…" and status "Đang hoạt động"', async () => {
    const setClientArchived = vi.fn(async () => ({ kind: 'ok', label: 200, data: DETAIL }) as CallResult<ClientDetail>)
    const r = await servicesOf({ setClientArchived }).setClientArchived(ID, false)
    expect(r).toEqual({ kind: 'ok', view: { detail: DETAIL_VIEW, message: cfg.notices.unarchived } })
    expect(setClientArchived).toHaveBeenCalledExactlyOnceWith(ID, false)
  })

  it.each(FAILURES)('%s → its ViewResult', async (_, result, expected) => {
    expect(await servicesOf({ setClientArchived: vi.fn(async () => result) }).setClientArchived(ID, true)).toEqual(expected)
  })
})

describe('messages for declared error codes', () => {
  it('every error code declared in the label tables of Configs has a non-empty message', () => {
    const codes = Object.values(cfg.endpoints)
      .flatMap((ep) => Object.values(ep.labels))
      .filter((label) => label !== 'ok')
    expect(new Set(codes)).toEqual(new Set(['ERR_STORAGE_IO', 'ERR_NOT_FOUND', 'ERR_VALIDATION']))
    for (const code of codes) {
      expect(cfg.errorMessages[code], `message for ${code}`).toEqual(expect.stringMatching(/\S/))
    }
  })
})

describe('presentation decisions', () => {
  it('sorts names in Vietnamese alphabetical order, not in the backend casefold order', async () => {
    // Hand-written list in the order the backend answers (Python casefold,
    // code point order: "á" U+00E1 and "đ" U+0111 come after "z").
    const casefoldOrder = ['An', 'Bảo', 'Dung', 'Zoe', 'Ánh', 'Đức'].map((name) => client(name))
    const r = await listing({ kind: 'ok', label: 200, data: casefoldOrder }).loadClientList()
    expect(r).toEqual({ kind: 'ok', view: { active: expect.any(Array), archived: [], isEmpty: false } })
    const view = (r as { view: { active: { name: string }[] } }).view
    expect(names(view.active)).toEqual(['An', 'Ánh', 'Bảo', 'Dung', 'Đức', 'Zoe'])
  })

  it('splits archived clients into their own group, each group sorted', async () => {
    const data = [client('Zoe'), client('Đức', true), client('An'), client('Bảo', true), client('Ánh')]
    const r = await listing({ kind: 'ok', label: 200, data }).loadClientList()
    expect(r).toEqual({
      kind: 'ok',
      view: {
        active: ['An', 'Ánh', 'Zoe'].map((name) => ({ clientId: expect.any(String), name })),
        archived: ['Bảo', 'Đức'].map((name) => ({ clientId: expect.any(String), name })),
        isEmpty: false,
      },
    })
  })

  it('keeps clients with the same name, in a stable order by id', async () => {
    const first = client('An')
    const second = client('An')
    const r = await listing({ kind: 'ok', label: 200, data: [second, first] }).loadClientList()
    expect(r).toEqual({
      kind: 'ok',
      view: { active: [{ clientId: first.client_id, name: 'An' }, { clientId: second.client_id, name: 'An' }], archived: [], isEmpty: false },
    })
  })

  it('shows dates in the Vietnamese format, day before month, with the time', async () => {
    const r = await servicesOf({ getClient: vi.fn(async () => ({ kind: 'ok', label: 200, data: DETAIL }) as CallResult<ClientDetail>) }).loadClientDetail(ID)
    const view = (r as { view: { createdText: string } }).view
    expect(view.createdText).toMatch(/\d{2}\/\d{2}\/2026/)
    expect(view.createdText).toMatch(/\d{2}:\d{2}/)
  })

  it('no note → note null (the page shows no note entry)', async () => {
    const r = await servicesOf({ getClient: vi.fn(async () => ({ kind: 'ok', label: 200, data: { ...DETAIL, note: null, contacts: [] } }) as CallResult<ClientDetail>) }).loadClientDetail(ID)
    expect(r).toEqual({ kind: 'ok', view: { ...DETAIL_VIEW, note: null, contactLines: [] } })
  })
})

describe('rejectInput', () => {
  it('builds rejected, origin input, INPUT_FORMAT, with the layer summary', () => {
    expect(servicesOf({}).rejectInput({ note: 'required' })).toEqual({
      kind: 'rejected',
      origin: 'input',
      code: INPUT_FORMAT_CODE,
      message: messages.inputSummary,
      fieldErrors: { note: messages.input.required },
    })
  })

  it('uses the workflow message of a field when it has one, for every row of the contacts', () => {
    const r = servicesOf({}).rejectInput({
      displayName: 'violates_type_constraint',
      'contacts.0.value': 'required',
      'contacts.12.channel': 'required',
    })
    expect(r).toEqual({
      kind: 'rejected',
      origin: 'input',
      code: INPUT_FORMAT_CODE,
      message: messages.inputSummary,
      fieldErrors: {
        displayName: 'Tên khách hàng dài tối đa 120 ký tự.',
        'contacts.0.value': 'Nhập thông tin liên hệ, hoặc bỏ hàng này.',
        'contacts.12.channel': 'Nhập kênh liên hệ, hoặc bỏ hàng này.',
      },
    })
    expect(servicesOf({}).rejectInput({ displayName: 'required' })).toEqual(
      expect.objectContaining({ fieldErrors: { displayName: 'Nhập tên khách hàng.' } }),
    )
  })
})
