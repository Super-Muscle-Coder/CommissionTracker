// Services of manage_commission — i3-logic.md, Step I3.6: every CallResult
// kind maps to the right ViewResult, for every operation and each of its
// calls (an operation of two calls ends at the first call that is not ok);
// every declared error code has a message (walked from the label tables of
// Configs, not listed by hand); each presentation decision of
// ui_decomposition.md D2 has a case: order of commissions, client names
// joined in, money, deadline (also in a negative time zone), dates, choice of
// clients and currencies, get_client 404 on the detail.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { CallResult, ResultMessages, ViewResult } from '../../../shared/results'
import type { ManageCommissionAdapters } from '../adapters'
import { MANAGE_COMMISSION_CONFIGS } from '../configs'
import type { ClientDetail, ClientList, CommissionDetail, CommissionFormView, CommissionList, CurrencyOptions, Money } from '../entities'
import { createManageCommissionServices } from '../services'

// The layer-level messages Main hands to every Services (R2: the workflow's
// tests bring their own instead of the layer configuration).
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
const cfg = MANAGE_COMMISSION_CONFIGS

const unused = () =>
  vi.fn(async () => {
    throw new Error('test: adapter not expected to be called')
  })

function fakeAdapters(over: Partial<ManageCommissionAdapters>): ManageCommissionAdapters {
  return {
    listCommissions: unused(),
    getCommission: unused(),
    createCommission: unused(),
    editCommission: unused(),
    listCurrencies: unused(),
    listClients: unused(),
    getClient: unused(),
    ...over,
  }
}
const servicesOf = (over: Partial<ManageCommissionAdapters>) => createManageCommissionServices(fakeAdapters(over), cfg, messages)
const answer = <T>(r: CallResult<T>) => vi.fn(async () => r)
const ok = <T>(data: T, label = 200): CallResult<T> => ({ kind: 'ok', label, data })
const declared = (label: number, code: string): CallResult<never> => ({ kind: 'declared_error', label, error: { code, message: 'x', details: null } })
const UNREACHABLE: CallResult<never> = { kind: 'unreachable', reason: 'refused' }
const VIOLATION: CallResult<never> = { kind: 'contract_violation', reason: 'bad body' }

let n = 0
const uuid = () => `00000000-0000-4000-8000-${(n += 1).toString(16).padStart(12, '0')}`
const client = (display_name: string, is_archived = false, client_id = uuid()) => ({ client_id, display_name, is_archived, updated_at: '2026-09-27T10:00:00+07:00' })
const item = (title: string, client_id: string, updated_at: string, agreed_price: Money = { amount_minor: 0, currency: 'VND' }, deadline: string | null = null) => ({
  commission_id: uuid(),
  client_id,
  title,
  agreed_price,
  deadline,
  updated_at,
})

const AN = client('An')
const ANH = client('Ánh')
const ZOE = client('Zoe')
const OLD = client('Hà', true)
const CLIENTS: ClientList = [ZOE, OLD, ANH, AN]
const DETAIL: CommissionDetail = {
  commission_id: '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b',
  client_id: AN.client_id,
  title: 'Chân dung bán thân',
  description: 'Nền xanh',
  commission_type: 'bán thân',
  agreed_price: { amount_minor: 1500000, currency: 'VND' },
  deadline: '2026-10-15',
  reference_links: ['https://example.com/a', 'https://example.com/b'],
  created_at: '2026-09-27T10:00:00+07:00',
  updated_at: '2026-09-28T08:30:15Z',
}
const CLIENT_DETAIL = (c: { client_id: string; display_name: string; is_archived: boolean }): ClientDetail => ({
  ...c,
  contacts: [],
  note: null,
  created_at: '2026-09-27T10:00:00+07:00',
  updated_at: '2026-09-27T10:00:00+07:00',
})
const dateTime = new Intl.DateTimeFormat('vi-VN', cfg.dateTimeFormat)

// The ViewResult of every failure kind of a call, as Services must give it.
const FAILURES: [string, CallResult<never>, ViewResult<never>][] = [
  ['unreachable', UNREACHABLE, { kind: 'unreachable', message: 'test: unreachable' }],
  ['contract_violation', VIOLATION, { kind: 'contract_violation', message: 'test: contract violation' }],
]

describe('every declared error code has a message (walked from the label tables of Configs)', () => {
  const pairs = Object.entries(cfg.endpoints).flatMap(([endpoint, ep]) =>
    Object.values(ep.labels)
      .filter((v) => v !== 'ok')
      .map((code) => [endpoint, code] as const),
  )
  it('covers the codes of all seven calls', () => {
    // 1 + 2 + 4 + 4 + 0 + 1 + 2 codes (list_commissions … get_client).
    expect(pairs.length).toBe(14)
  })
  it.each(pairs)('%s → %s has a message', (endpoint, code) => {
    expect(cfg.errorMessages[endpoint]?.[code]).toMatch(/\S/)
  })
})

describe('money (presentation decision; integer arithmetic only)', () => {
  const priceOf = async (agreed_price: Money) => {
    const r = await servicesOf({
      getCommission: answer(ok({ ...DETAIL, agreed_price })),
      getClient: answer(ok(CLIENT_DETAIL(AN))),
    }).loadCommissionDetail(DETAIL.commission_id)
    expect(r.kind).toBe('ok')
    return (r as { view: { priceText: string } }).view.priceText
  }
  it.each([
    [0, 'VND', '0 VND'],
    [1500000, 'VND', '1.500.000 VND'],
    [1250, 'USD', '12,50 USD'],
    [5, 'USD', '0,05 USD'],
    [0, 'USD', '0,00 USD'],
    [100, 'USD', '1,00 USD'],
    [999, 'VND', '999 VND'],
    [1000, 'VND', '1.000 VND'],
    [9007199254740991, 'VND', '9.007.199.254.740.991 VND'],
    [9007199254740991, 'USD', '90.071.992.547.409,91 USD'],
    [123456, 'EUR', '123456 EUR (đơn vị nhỏ nhất)'],
  ])('%s %s → %s', async (amount_minor, currency, text) => {
    expect(await priceOf({ amount_minor, currency })).toBe(text)
  })
})

describe('deadline (presentation decision: cut from the string, never through Date)', () => {
  // vi.stubEnv sets process.env.TZ, which Node applies at once to every Date
  // (and restores with unstubAllEnvs); src/ has no Node types, so no process here.
  afterEach(() => {
    vi.unstubAllEnvs()
  })
  const deadlineOf = async (deadline: string | null) => {
    const r = await servicesOf({
      getCommission: answer(ok({ ...DETAIL, deadline })),
      getClient: answer(ok(CLIENT_DETAIL(AN))),
    }).loadCommissionDetail(DETAIL.commission_id)
    expect(r.kind).toBe('ok')
    return (r as { view: { deadlineText: string } }).view.deadlineText
  }

  it('2026-01-01 → 01/01/2026 in a negative time zone (America/Los_Angeles), where new Date() would show 31/12/2025', async () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    // The time zone is really in force for this process: the naive way is a day off.
    expect(new Date('2026-01-01').getDate()).toBe(31)
    expect(await deadlineOf('2026-01-01')).toBe('01/01/2026')
    expect(await deadlineOf('2026-12-31')).toBe('31/12/2026')
  })

  it('2026-01-01 → 01/01/2026 in a positive time zone too (Asia/Ho_Chi_Minh)', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    expect(new Date('2026-01-01').getDate()).toBe(1)
    expect(await deadlineOf('2026-01-01')).toBe('01/01/2026')
  })

  it('no deadline → "Không có hạn"', async () => {
    expect(await deadlineOf(null)).toBe('Không có hạn')
  })
})

describe('loadCommissionList (list_commissions, then list_clients)', () => {
  const commissions: CommissionList = [
    item('Cũ nhất', AN.client_id, '2026-09-01T10:00:00+07:00'),
    // Same instant as the next one, written with another offset: ordered by commission_id.
    item('Mới B', ZOE.client_id, '2026-09-28T03:00:00Z', { amount_minor: 1250, currency: 'USD' }, '2026-10-01'),
    item('Mới A', OLD.client_id, '2026-09-28T10:00:00+07:00'),
    item('Khách lạ', uuid(), '2026-09-10T10:00:00+07:00'),
  ]

  it('ok: most recently updated first, then by commission_id; client names joined in', async () => {
    const r = await servicesOf({ listCommissions: answer(ok(commissions)), listClients: answer(ok(CLIENTS)) }).loadCommissionList()
    expect(r).toEqual({
      kind: 'ok',
      view: {
        isEmpty: false,
        rows: [
          { commissionId: commissions[1].commission_id, title: 'Mới B', detailText: 'Zoe · 12,50 USD · Hạn giao 01/10/2026' },
          { commissionId: commissions[2].commission_id, title: 'Mới A', detailText: 'Hà · 0 VND · Không có hạn' },
          { commissionId: commissions[3].commission_id, title: 'Khách lạ', detailText: 'Không tìm thấy khách hàng · 0 VND · Không có hạn' },
          { commissionId: commissions[0].commission_id, title: 'Cũ nhất', detailText: 'An · 0 VND · Không có hạn' },
        ],
      },
    })
  })

  it('no commission → isEmpty', async () => {
    const r = await servicesOf({ listCommissions: answer(ok([])), listClients: answer(ok(CLIENTS)) }).loadCommissionList()
    expect(r).toEqual({ kind: 'ok', view: { rows: [], isEmpty: true } })
  })

  it('list_commissions 500 → rejected system with its message; list_clients not called', async () => {
    const listClients = unused()
    const r = await servicesOf({ listCommissions: answer(declared(500, 'ERR_STORAGE_IO')), listClients }).loadCommissionList()
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.listCommissions.ERR_STORAGE_IO, fieldErrors: {} })
    expect(listClients).not.toHaveBeenCalled()
  })

  it.each(FAILURES)('list_commissions %s → that result; list_clients not called', async (_, fail, view) => {
    const listClients = unused()
    expect(await servicesOf({ listCommissions: answer(fail), listClients }).loadCommissionList()).toEqual(view)
    expect(listClients).not.toHaveBeenCalled()
  })

  it('list_clients 500 → rejected system with the message of list_clients', async () => {
    const r = await servicesOf({ listCommissions: answer(ok(commissions)), listClients: answer(declared(500, 'ERR_STORAGE_IO')) }).loadCommissionList()
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.listClients.ERR_STORAGE_IO, fieldErrors: {} })
  })

  it.each(FAILURES)('list_clients %s → that result, no partial list', async (_, fail, view) => {
    expect(await servicesOf({ listCommissions: answer(ok(commissions)), listClients: answer(fail) }).loadCommissionList()).toEqual(view)
  })
})

describe('loadCommissionDetail (get_commission, then get_client)', () => {
  it('ok: every entry of the view; get_client called with the commission\'s client', async () => {
    const getClient = answer(ok(CLIENT_DETAIL(AN)))
    const r = await servicesOf({ getCommission: answer(ok(DETAIL)), getClient }).loadCommissionDetail(DETAIL.commission_id)
    expect(getClient).toHaveBeenCalledExactlyOnceWith(AN.client_id)
    expect(r).toEqual({
      kind: 'ok',
      view: {
        commissionId: DETAIL.commission_id,
        title: 'Chân dung bán thân',
        clientText: 'An',
        commissionType: 'bán thân',
        priceText: '1.500.000 VND',
        deadlineText: '15/10/2026',
        description: 'Nền xanh',
        referenceLinks: ['https://example.com/a', 'https://example.com/b'],
        createdText: dateTime.format(new Date('2026-09-27T10:00:00+07:00')),
        updatedText: dateTime.format(new Date('2026-09-28T08:30:15Z')),
      },
    })
  })

  it('an archived client → "<name> (đã lưu trữ)"; no type, description or link → null and []', async () => {
    const bare = { ...DETAIL, commission_type: null, description: null, reference_links: [] }
    const r = await servicesOf({ getCommission: answer(ok(bare)), getClient: answer(ok(CLIENT_DETAIL(OLD))) }).loadCommissionDetail(DETAIL.commission_id)
    expect(r.kind).toBe('ok')
    expect(r).toMatchObject({ view: { clientText: 'Hà (đã lưu trữ)', commissionType: null, description: null, referenceLinks: [] } })
  })

  it('get_client 404 is not an error: the client is shown as "Không tìm thấy khách hàng"', async () => {
    const r = await servicesOf({ getCommission: answer(ok(DETAIL)), getClient: answer(declared(404, 'ERR_NOT_FOUND')) }).loadCommissionDetail(DETAIL.commission_id)
    expect(r).toMatchObject({ kind: 'ok', view: { clientText: 'Không tìm thấy khách hàng', title: DETAIL.title } })
  })

  it.each([
    [404, 'ERR_NOT_FOUND'],
    [500, 'ERR_STORAGE_IO'],
  ])('get_commission %s → rejected with its message; get_client not called', async (label, code) => {
    const getClient = unused()
    const r = await servicesOf({ getCommission: answer(declared(label, code)), getClient }).loadCommissionDetail(DETAIL.commission_id)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code, message: cfg.errorMessages.getCommission[code], fieldErrors: {} })
    expect(cfg.errorMessages.getCommission.ERR_NOT_FOUND).toBe('Không tìm thấy đơn hàng này.')
    expect(getClient).not.toHaveBeenCalled()
  })

  it.each(FAILURES)('get_commission %s → that result', async (_, fail, view) => {
    expect(await servicesOf({ getCommission: answer(fail), getClient: unused() }).loadCommissionDetail(DETAIL.commission_id)).toEqual(view)
  })

  it('get_client 500 → rejected with the message of get_client', async () => {
    const r = await servicesOf({ getCommission: answer(ok(DETAIL)), getClient: answer(declared(500, 'ERR_STORAGE_IO')) }).loadCommissionDetail(DETAIL.commission_id)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.getClient.ERR_STORAGE_IO, fieldErrors: {} })
  })

  it.each(FAILURES)('get_client %s → that result (not a detail without its client)', async (_, fail, view) => {
    expect(await servicesOf({ getCommission: answer(ok(DETAIL)), getClient: answer(fail) }).loadCommissionDetail(DETAIL.commission_id)).toEqual(view)
  })
})

describe('openCommissionForm — create (list_clients, then list_currencies)', () => {
  const open = (clients: CallResult<ClientList>, currencies: CallResult<CurrencyOptions>) =>
    servicesOf({ listClients: answer(clients), listCurrencies: answer(currencies) }).openCommissionForm({ mode: 'create' })

  it('ok: active clients only, Vietnamese order; currencies known to the table; VND first chosen; empty draft', async () => {
    const r = await open(ok(CLIENTS), ok(['USD', 'EUR', 'VND']))
    expect(r).toEqual({
      kind: 'ok',
      view: {
        currencies: [
          { value: 'USD', label: 'USD' },
          { value: 'VND', label: 'VND' },
        ],
        currencyLocked: false,
        chooseClientLabel: 'Chọn khách hàng',
        clients: {
          choices: [
            { value: AN.client_id, label: 'An' },
            { value: ANH.client_id, label: 'Ánh' },
            { value: ZOE.client_id, label: 'Zoe' },
          ],
          clientId: '',
        },
        noActiveClient: false,
        keptClientId: null,
        commissionTypeSuggestions: ['bán thân', 'toàn thân', 'chibi', 'chân dung', 'minh họa'],
        draft: { clientId: '', title: '', commissionType: '', amount: '', currency: 'VND', deadline: '', description: '', referenceLinks: '' },
      },
    })
  })

  it('no VND offered → the first known currency is chosen', async () => {
    expect(await open(ok(CLIENTS), ok(['EUR', 'USD']))).toMatchObject({ view: { draft: { currency: 'USD' }, currencies: [{ value: 'USD', label: 'USD' }] } })
  })

  it('no active client (only archived ones) → noActiveClient', async () => {
    expect(await open(ok([OLD]), ok(['VND']))).toMatchObject({ kind: 'ok', view: { noActiveClient: true, clients: { choices: [], clientId: '' } } })
  })

  it('list_clients 500 → rejected; list_currencies not called', async () => {
    const listCurrencies = unused()
    const r = await servicesOf({ listClients: answer(declared(500, 'ERR_STORAGE_IO')), listCurrencies }).openCommissionForm({ mode: 'create' })
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.listClients.ERR_STORAGE_IO, fieldErrors: {} })
    expect(listCurrencies).not.toHaveBeenCalled()
  })

  it.each(FAILURES)('list_clients %s → that result', async (_, fail, view) => {
    expect(await servicesOf({ listClients: answer(fail), listCurrencies: unused() }).openCommissionForm({ mode: 'create' })).toEqual(view)
  })

  it.each(FAILURES)('list_currencies %s → that result', async (_, fail, view) => {
    expect(await open(ok(CLIENTS), fail)).toEqual(view)
  })
})

describe('openCommissionForm — edit (get_commission, then list_clients)', () => {
  const open = (commission: CallResult<CommissionDetail>, clients: CallResult<ClientList>) =>
    servicesOf({ getCommission: answer(commission), listClients: answer(clients) }).openCommissionForm({ mode: 'edit', commissionId: DETAIL.commission_id })

  it('ok: the draft from the stored commission, amount written as shown without the code; currency locked', async () => {
    const r = await open(ok(DETAIL), ok(CLIENTS))
    expect(r).toMatchObject({
      kind: 'ok',
      view: {
        currencies: [{ value: 'VND', label: 'VND' }],
        currencyLocked: true,
        keptClientId: AN.client_id,
        noActiveClient: false,
        clients: { clientId: AN.client_id },
        draft: {
          clientId: AN.client_id,
          title: 'Chân dung bán thân',
          commissionType: 'bán thân',
          amount: '1.500.000',
          currency: 'VND',
          deadline: '2026-10-15',
          description: 'Nền xanh',
          referenceLinks: 'https://example.com/a\nhttps://example.com/b',
        },
      },
    })
  })

  it('nulls become empty fields; USD 1250 → "12,50"', async () => {
    const r = await open(ok({ ...DETAIL, commission_type: null, description: null, deadline: null, reference_links: [], agreed_price: { amount_minor: 1250, currency: 'USD' } }), ok(CLIENTS))
    expect(r).toMatchObject({ view: { draft: { commissionType: '', description: '', deadline: '', referenceLinks: '', amount: '12,50', currency: 'USD' } } })
  })

  it('the commission\'s client archived → offered first as "<name> (đã lưu trữ)", chosen', async () => {
    const r = await open(ok({ ...DETAIL, client_id: OLD.client_id }), ok(CLIENTS))
    expect(r).toMatchObject({
      view: {
        clients: {
          choices: [
            { value: OLD.client_id, label: 'Hà (đã lưu trữ)' },
            { value: AN.client_id, label: 'An' },
            { value: ANH.client_id, label: 'Ánh' },
            { value: ZOE.client_id, label: 'Zoe' },
          ],
          clientId: OLD.client_id,
        },
      },
    })
  })

  it('the commission\'s client no longer listed → still offered and chosen, marked', async () => {
    const gone = uuid()
    const r = await open(ok({ ...DETAIL, client_id: gone }), ok(CLIENTS))
    const clients = (r as { view: CommissionFormView }).view.clients
    expect(clients.clientId).toBe(gone)
    expect(clients.choices[0]).toEqual({ value: gone, label: 'Không tìm thấy khách hàng (đã lưu trữ)' })
    expect(clients.choices).toHaveLength(4)
  })

  it('get_commission 404 → rejected "Không tìm thấy đơn hàng này."; list_clients not called', async () => {
    const listClients = unused()
    const r = await servicesOf({ getCommission: answer(declared(404, 'ERR_NOT_FOUND')), listClients }).openCommissionForm({ mode: 'edit', commissionId: 'x' })
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.', fieldErrors: {} })
    expect(listClients).not.toHaveBeenCalled()
  })

  it.each(FAILURES)('get_commission %s → that result', async (_, fail, view) => {
    expect(await servicesOf({ getCommission: answer(fail), listClients: unused() }).openCommissionForm({ mode: 'edit', commissionId: 'x' })).toEqual(view)
  })

  it.each(FAILURES)('list_clients %s → that result', async (_, fail, view) => {
    expect(await open(ok(DETAIL), fail)).toEqual(view)
  })

  it('list_clients 500 → rejected with the message of list_clients', async () => {
    expect(await open(ok(DETAIL), declared(500, 'ERR_STORAGE_IO'))).toMatchObject({ kind: 'rejected', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.listClients.ERR_STORAGE_IO })
  })
})

describe('saveCommission', () => {
  const INPUT = { client_id: AN.client_id, title: 't', description: null, commission_type: null, agreed_price: { amount_minor: 1, currency: 'VND' }, deadline: null, reference_links: [] }

  it('create ok → the new id and "Đã thêm đơn hàng."', async () => {
    const createCommission = answer(ok(DETAIL, 201))
    const r = await servicesOf({ createCommission }).saveCommission({ mode: 'create' }, INPUT)
    expect(createCommission).toHaveBeenCalledExactlyOnceWith(INPUT)
    expect(r).toEqual({ kind: 'ok', view: { commissionId: DETAIL.commission_id, message: 'Đã thêm đơn hàng.' } })
  })

  it('edit ok → "Đã lưu thay đổi."', async () => {
    const editCommission = answer(ok(DETAIL))
    const r = await servicesOf({ editCommission }).saveCommission({ mode: 'edit', commissionId: DETAIL.commission_id }, INPUT)
    expect(editCommission).toHaveBeenCalledExactlyOnceWith(DETAIL.commission_id, INPUT)
    expect(r).toEqual({ kind: 'ok', view: { commissionId: DETAIL.commission_id, message: 'Đã lưu thay đổi.' } })
  })

  it.each([
    [400, 'ERR_VALIDATION', 'Máy chủ không nhận dữ liệu này. Vui lòng kiểm tra lại các ô rồi lưu lại.'],
    [404, 'ERR_NOT_FOUND', 'Không tìm thấy khách hàng đã chọn. Hãy chọn lại.'],
    [409, 'ERR_CONFLICT', 'Khách hàng đã chọn đã được lưu trữ. Hãy chọn khách khác.'],
    [500, 'ERR_STORAGE_IO', cfg.errorMessages.createCommission.ERR_STORAGE_IO],
  ])('create %s → rejected with the words of the spec', async (label, code, message) => {
    const r = await servicesOf({ createCommission: answer(declared(label, code)) }).saveCommission({ mode: 'create' }, INPUT)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
  })

  it('edit 404 → "Không tìm thấy đơn hàng hoặc khách hàng đã chọn."', async () => {
    const r = await servicesOf({ editCommission: answer(declared(404, 'ERR_NOT_FOUND')) }).saveCommission({ mode: 'edit', commissionId: 'x' }, INPUT)
    expect(r).toMatchObject({ kind: 'rejected', message: 'Không tìm thấy đơn hàng hoặc khách hàng đã chọn.' })
  })

  it.each(FAILURES)('create %s → that result', async (_, fail, view) => {
    expect(await servicesOf({ createCommission: answer(fail) }).saveCommission({ mode: 'create' }, INPUT)).toEqual(view)
  })

  it.each(FAILURES)('edit %s → that result', async (_, fail, view) => {
    expect(await servicesOf({ editCommission: answer(fail) }).saveCommission({ mode: 'edit', commissionId: 'x' }, INPUT)).toEqual(view)
  })
})

describe('reloadClientChoices (list_clients)', () => {
  it('the chosen client still active → kept chosen', async () => {
    const r = await servicesOf({ listClients: answer(ok(CLIENTS)) }).reloadClientChoices(null, ZOE.client_id)
    expect(r).toMatchObject({ kind: 'ok', view: { clientId: ZOE.client_id } })
  })

  it('the chosen client now archived → not offered, nothing chosen', async () => {
    const r = await servicesOf({ listClients: answer(ok([AN, { ...ZOE, is_archived: true }])) }).reloadClientChoices(null, ZOE.client_id)
    expect(r).toEqual({ kind: 'ok', view: { choices: [{ value: AN.client_id, label: 'An' }], clientId: '' } })
  })

  it('edit mode: the commission\'s own archived client stays offered', async () => {
    const r = await servicesOf({ listClients: answer(ok(CLIENTS)) }).reloadClientChoices(OLD.client_id, OLD.client_id)
    expect(r).toMatchObject({ view: { clientId: OLD.client_id, choices: [{ value: OLD.client_id, label: 'Hà (đã lưu trữ)' }, {}, {}, {}] } })
  })

  it.each(FAILURES)('%s → that result', async (_, fail, view) => {
    expect(await servicesOf({ listClients: answer(fail) }).reloadClientChoices(null, '')).toEqual(view)
  })
})

describe('rejectInput', () => {
  it('the workflow\'s own message per field and reason, else the layer\'s', () => {
    const r = createManageCommissionServices(fakeAdapters({}), cfg, messages).rejectInput({
      client_id: 'required',
      title: 'required',
      'agreed_price.amount_minor': 'violates_type_constraint',
      deadline: 'not_date',
      reference_links: 'required',
    })
    expect(r).toEqual({
      kind: 'rejected',
      origin: 'input',
      code: INPUT_FORMAT_CODE,
      message: 'test: input summary',
      fieldErrors: {
        client_id: 'Chọn khách hàng.',
        title: 'Nhập tiêu đề đơn hàng.',
        'agreed_price.amount_minor': 'Số tiền quá lớn.',
        deadline: 'Chọn một ngày hợp lệ, hoặc xóa hạn giao.',
        reference_links: 'test: required',
      },
    })
  })
})
