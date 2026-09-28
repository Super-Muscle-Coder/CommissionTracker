// Routers of manage_client — i3-logic.md, Step I3.6. The format check of the
// form draft (ui_decomposition.md §5, page client_form): every rule rejects
// with origin input and Services is NOT called; a valid draft reaches
// Services converted (trimmed, empty rows dropped, empty note → null). The
// other operations take no typed input: they reach Services unchanged.
import { describe, expect, it, vi } from 'vitest'
import type { InputFormatCode, ViewResult } from '../../../shared/results'
import { MANAGE_CLIENT_CONFIGS } from '../configs'
import type { ClientFormDraft, ClientFormTarget, ClientListView, SavedClientView } from '../entities'
import { createManageClientRouters } from '../routers'
import type { ManageClientServices } from '../services'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const SAVED: ViewResult<SavedClientView> = { kind: 'ok', view: { clientId: ID, message: 'saved' } }
const LIST: ViewResult<ClientListView> = { kind: 'ok', view: { active: [], archived: [], isEmpty: true } }
const REJECTED: ViewResult<never> = { kind: 'rejected', origin: 'input', code: 'INPUT_FORMAT', message: 'x', fieldErrors: {} }

function setup() {
  const services: ManageClientServices = {
    loadClientList: vi.fn(async () => LIST),
    loadClientDetail: vi.fn(),
    openClientForm: vi.fn(),
    saveClient: vi.fn(async () => SAVED),
    setClientArchived: vi.fn(),
    rejectInput: vi.fn(() => REJECTED),
  }
  return { services, routers: createManageClientRouters(services, MANAGE_CLIENT_CONFIGS.limits) }
}

const draft = (over: Partial<ClientFormDraft>): ClientFormDraft => ({ displayName: 'An', contacts: [], note: '', ...over })
const CREATE: ClientFormTarget = { mode: 'create' }

async function expectRejected(d: ClientFormDraft, fields: Record<string, InputFormatCode>) {
  const { services, routers } = setup()
  expect(await routers.saveClient(CREATE, d)).toBe(REJECTED)
  expect(services.rejectInput).toHaveBeenCalledExactlyOnceWith(fields)
  expect(services.saveClient).not.toHaveBeenCalled()
}

async function expectSent(target: ClientFormTarget, d: ClientFormDraft, input: unknown) {
  const { services, routers } = setup()
  expect(await routers.saveClient(target, d)).toBe(SAVED)
  expect(services.saveClient).toHaveBeenCalledExactlyOnceWith(target, input)
  expect(services.rejectInput).not.toHaveBeenCalled()
}

describe('saveClient — display name', () => {
  it('empty → required', () => expectRejected(draft({ displayName: '' }), { displayName: 'required' }))

  it('only spaces → required (trimmed first)', () => expectRejected(draft({ displayName: '   \t ' }), { displayName: 'required' }))

  // Data Schema 7.0.0: display_name is not blank (formats.not_blank), whatever
  // the whitespace: no-break space U+00A0, ideographic space U+3000, tab, line breaks.
  it.each([
    ['U+00A0 no-break spaces', '  '],
    ['U+3000 ideographic space', '　'],
    ['tabs and line breaks', '\t\n\r\t'],
    ['a mix of Unicode spaces', '   　﻿ '],
  ])('only whitespace (%s) → required, nothing sent', (_what, name) => expectRejected(draft({ displayName: name }), { displayName: 'required' }))

  it('a name with a no-break space inside is sent (trimmed only at both ends)', () =>
    expectSent(CREATE, draft({ displayName: ' Ánh Hồng ' }), { display_name: 'Ánh Hồng', contacts: [], note: null }))

  it('exactly 120 Vietnamese characters with diacritics → sent', () => {
    const name = 'Nguyễn Thị Ánh Hồng '.repeat(6) // 20 × 6 = 120 code points, before trimming
    const trimmed = name.trim() // 119: trailing space removed
    const exact = `${trimmed}ệ`
    expect([...exact].length).toBe(120)
    return expectSent(CREATE, draft({ displayName: exact }), { display_name: exact, contacts: [], note: null })
  })

  it('121 Vietnamese characters → violates_type_constraint', () => {
    const name = `${'ờ'.repeat(120)}a`
    expect([...name].length).toBe(121)
    return expectRejected(draft({ displayName: name }), { displayName: 'violates_type_constraint' })
  })

  it('counts code points, not UTF-16 units: 119 letters + one emoji (121 units) is 120 characters → sent', () => {
    const name = `${'ư'.repeat(119)}😀`
    expect(name.length).toBe(121)
    return expectSent(CREATE, draft({ displayName: name }), { display_name: name, contacts: [], note: null })
  })

  it('spaces around the name are removed before sending', () =>
    expectSent(CREATE, draft({ displayName: '  Bảo  ' }), { display_name: 'Bảo', contacts: [], note: null }))

  it('a name used by another client is allowed (the contract does not forbid it)', () =>
    expectSent(CREATE, draft({ displayName: 'An' }), { display_name: 'An', contacts: [], note: null }))
})

describe('saveClient — contacts', () => {
  it('a row empty in both fields is dropped, not an error', () =>
    expectSent(
      CREATE,
      draft({ contacts: [{ channel: '', value: '  ' }, { channel: ' email ', value: ' a@b.vn ' }, { channel: '', value: '' }] }),
      { display_name: 'An', contacts: [{ channel: 'email', value: 'a@b.vn' }], note: null },
    ))

  it('a row with only the channel → required on that row value, by its row index', () =>
    expectRejected(draft({ contacts: [{ channel: 'email', value: 'a@b.vn' }, { channel: 'zalo', value: ' ' }] }), { 'contacts.1.value': 'required' }))

  it('channel or value made only of Unicode whitespace → required on that field (not blank, Data Schema 7.0.0)', () =>
    expectRejected(draft({ contacts: [{ channel: ' ', value: 'a@b.vn' }, { channel: 'zalo', value: '　\t' }] }), {
      'contacts.0.channel': 'required',
      'contacts.1.value': 'required',
    }))

  it('a row with only the value → required on that row channel', () =>
    expectRejected(draft({ contacts: [{ channel: '', value: '0901 234 567' }] }), { 'contacts.0.channel': 'required' }))

  it('every error at once: name and two rows', () =>
    expectRejected(
      draft({ displayName: ' ', contacts: [{ channel: 'x', value: '' }, { channel: '', value: '' }, { channel: '', value: 'y' }] }),
      { displayName: 'required', 'contacts.0.value': 'required', 'contacts.2.channel': 'required' },
    ))

  it('no limit on the number of contacts (the contract sets none)', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ channel: 'email', value: `k${i}@b.vn` }))
    return expectSent(CREATE, draft({ contacts: rows }), { display_name: 'An', contacts: rows, note: null })
  })
})

describe('saveClient — note', () => {
  it('empty or only spaces → null', () => expectSent(CREATE, draft({ note: ' \n ' }), { display_name: 'An', contacts: [], note: null }))

  it('text → trimmed text, inner lines kept', () =>
    expectSent(CREATE, draft({ note: '  dòng 1\ndòng 2  ' }), { display_name: 'An', contacts: [], note: 'dòng 1\ndòng 2' }))
})

describe('saveClient — target', () => {
  it('edit mode passes the target (with the client id) to Services', () =>
    expectSent({ mode: 'edit', clientId: ID }, draft({}), { display_name: 'An', contacts: [], note: null }))
})

describe('operations without typed input reach Services unchanged', () => {
  it('loadClientList', async () => {
    const { services, routers } = setup()
    await routers.loadClientList()
    expect(services.loadClientList).toHaveBeenCalledExactlyOnceWith()
  })

  it('loadClientDetail, openClientForm, setClientArchived', async () => {
    const { services, routers } = setup()
    await routers.loadClientDetail(ID)
    await routers.openClientForm({ mode: 'edit', clientId: ID })
    await routers.setClientArchived(ID, true)
    expect(services.loadClientDetail).toHaveBeenCalledExactlyOnceWith(ID)
    expect(services.openClientForm).toHaveBeenCalledExactlyOnceWith({ mode: 'edit', clientId: ID })
    expect(services.setClientArchived).toHaveBeenCalledExactlyOnceWith(ID, true)
    expect(services.rejectInput).not.toHaveBeenCalled()
  })
})
