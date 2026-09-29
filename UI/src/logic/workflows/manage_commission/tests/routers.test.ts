// Routers of manage_commission — i3-logic.md, Step I3.6: every format error
// of every field → rejected input, Services not called; a valid draft → the
// commission_input Services gets. Plus the cases the plan of session 19
// requires: the example table of reading amounts (ui_decomposition.md D2),
// row by row, VND and USD; the round trip "shown in the form, read back";
// titles of Unicode whitespace; optional texts and links.
import { describe, expect, it, vi } from 'vitest'
import type { CallResult, ResultMessages, ViewResult } from '../../../shared/results'
import type { ManageCommissionAdapters } from '../adapters'
import { MANAGE_COMMISSION_CONFIGS } from '../configs'
import type { CommissionDetail, CommissionFormDraft, CommissionFormView, CommissionInput } from '../entities'
import { createManageCommissionRouters } from '../routers'
import { createManageCommissionServices, type ManageCommissionServices } from '../services'

const cfg = MANAGE_COMMISSION_CONFIGS
const rules = { limits: cfg.limits, currencyDecimals: cfg.currencyDecimals, formats: cfg.formats }
const KID = '7a1d2e3f-4b5c-4d6e-9f80-1a2b3c4d5e6f'
const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'

const DRAFT: CommissionFormDraft = {
  clientId: KID,
  title: 'Chân dung',
  commissionType: '',
  amount: '1500000',
  currency: 'VND',
  deadline: '',
  description: '',
  referenceLinks: '',
}

// Routers over fake Services: saveCommission records what it gets; rejectInput
// returns the field codes as they are (the words are Services' job, tested there).
function routersWithSpy() {
  const saveCommission = vi.fn(async (): Promise<ViewResult<{ commissionId: string; message: string }>> => ({ kind: 'ok', view: { commissionId: CID, message: 'm' } }))
  const rejectInput = vi.fn((fields: Record<string, string>): ViewResult<never> => ({
    kind: 'rejected',
    origin: 'input',
    code: 'INPUT_FORMAT',
    message: 'summary',
    fieldErrors: fields,
  }))
  const services = { saveCommission, rejectInput } as unknown as ManageCommissionServices
  return { saveCommission, rejectInput, routers: createManageCommissionRouters(services, rules) }
}

// Save a draft; answer what was sent (commission_input) or the field codes.
async function save(over: Partial<CommissionFormDraft>, mode: 'create' | 'edit' = 'create') {
  const { saveCommission, rejectInput, routers } = routersWithSpy()
  const r = await routers.saveCommission(mode === 'create' ? { mode } : { mode, commissionId: CID }, { ...DRAFT, ...over })
  if (saveCommission.mock.calls.length === 1) {
    expect(rejectInput).not.toHaveBeenCalled()
    return { sent: (saveCommission.mock.calls[0] as unknown as [unknown, CommissionInput])[1], errors: null }
  }
  expect(saveCommission).not.toHaveBeenCalled()
  return { sent: null, errors: (r as { fieldErrors: Record<string, string> }).fieldErrors }
}
const amountOf = async (amount: string, currency: string) => (await save({ amount, currency })).sent?.agreed_price.amount_minor ?? null
const amountError = async (amount: string, currency: string) => (await save({ amount, currency })).errors?.['agreed_price.amount_minor'] ?? null

describe('reading an amount — the example table of ui_decomposition.md D2, row by row', () => {
  it.each([
    ['1500000', 1500000],
    ['1.500.000', 1500000],
    ['1,500,000', 1500000],
  ])('VND %s → %s', async (typed, minor) => {
    expect(await amountOf(typed, 'VND')).toBe(minor)
  })

  it.each(['1,5', '1.50'])('VND %s → "Số tiền không hợp lệ" (not_integer)', async (typed) => {
    expect(await amountError(typed, 'VND')).toBe('not_integer')
  })

  it.each([
    ['12.5', 1250],
    ['12,50', 1250],
    ['1,250', 125000],
    ['1.250', 125000],
    ['1.250,5', 125050],
    ['12.505', 1250500],
  ])('USD %s → %s', async (typed, minor) => {
    expect(await amountOf(typed, 'USD')).toBe(minor)
  })

  it.each(['12.5055', '1.2345'])('USD %s → "Số tiền không hợp lệ" (not_integer)', async (typed) => {
    expect(await amountError(typed, 'USD')).toBe('not_integer')
  })
})

describe('reading an amount — limits and wrong writings', () => {
  it('9007199254740991 VND (2^53−1) is accepted, exactly', async () => {
    expect(await amountOf('9007199254740991', 'VND')).toBe(9007199254740991)
    expect(await amountOf('9.007.199.254.740.991', 'VND')).toBe(9007199254740991)
  })

  it('90.071.992.547.409,91 USD is accepted: 9007199254740991 cents', async () => {
    expect(await amountOf('90.071.992.547.409,91', 'USD')).toBe(9007199254740991)
  })

  it.each([
    ['9007199254740992', 'VND'],
    ['99999999999999999999', 'VND'],
    ['90.071.992.547.409,92', 'USD'],
    ['90071992547410', 'USD'],
  ])('%s %s (above 2^53−1) → "Số tiền quá lớn" (violates_type_constraint)', async (typed, currency) => {
    expect(await amountError(typed, currency)).toBe('violates_type_constraint')
  })

  it.each(['-1', '-1.500', '−5', 'abc', '12a', 'một triệu', '1e6', '.5', ',50', '1..5', '1.', '+5', '0x10'])(
    '"%s" → not_integer (minus sign, letters, not starting with a digit…)',
    async (typed) => {
      expect(await amountError(typed, 'VND')).toBe('not_integer')
      expect(await amountError(typed, 'USD')).toBe('not_integer')
    },
  )

  it.each(['', '   ', ' 　\t'])('"%s" (empty, only whitespace) → required ("Nhập giá thỏa thuận")', async (typed) => {
    expect(await amountError(typed, 'VND')).toBe('required')
  })

  it('spaces at both ends and inside are removed; 0 is a valid price', async () => {
    expect(await amountOf(' 1 500 000 ', 'VND')).toBe(1500000)
    expect(await amountOf('0', 'VND')).toBe(0)
    expect(await amountOf('0,00', 'USD')).toBe(0)
    expect(await amountOf('007', 'VND')).toBe(7)
  })

  it('USD 12 (no fraction) → 1200; USD 12,5 → 1250', async () => {
    expect(await amountOf('12', 'USD')).toBe(1200)
    expect(await amountOf('12,5', 'USD')).toBe(1250)
  })
})

describe('round trip: the amount shown in the edit form reads back to the same amount_minor', () => {
  const stored = (amount_minor: number, currency: string): CommissionDetail => ({
    commission_id: CID,
    client_id: KID,
    title: 'Chân dung',
    description: null,
    commission_type: null,
    agreed_price: { amount_minor, currency },
    deadline: null,
    reference_links: [],
    created_at: '2026-09-27T10:00:00+07:00',
    updated_at: '2026-09-28T08:30:15Z',
  })
  const messages = { input: {} } as ResultMessages

  it.each([
    [0, 'VND', '0'],
    [0, 'USD', '0,00'],
    [1500000, 'VND', '1.500.000'],
    [1250, 'USD', '12,50'],
    [5, 'USD', '0,05'],
    [125050, 'USD', '1.250,50'],
    [9007199254740991, 'VND', '9.007.199.254.740.991'],
    [9007199254740991, 'USD', '90.071.992.547.409,91'],
  ])('%s %s → shown "%s" → read back, sent with the same currency, untouched', async (minor, currency, shown) => {
    const editCommission = vi.fn(async (): Promise<CallResult<CommissionDetail>> => ({ kind: 'ok', label: 200, data: stored(minor, currency) }))
    const adapters = {
      getCommission: vi.fn(async (): Promise<CallResult<CommissionDetail>> => ({ kind: 'ok', label: 200, data: stored(minor, currency) })),
      listClients: vi.fn(async () => ({ kind: 'ok' as const, label: 200, data: [] })),
      editCommission,
    } as unknown as ManageCommissionAdapters
    const routers = createManageCommissionRouters(createManageCommissionServices(adapters, cfg, messages), rules)
    const target = { mode: 'edit' as const, commissionId: CID }
    const opened = await routers.openCommissionForm(target)
    expect(opened.kind).toBe('ok')
    const draft = (opened as { view: CommissionFormView }).view.draft
    expect(draft.amount).toBe(shown)
    // The user touches nothing: the same amount and the same (old) currency are sent.
    expect((await routers.saveCommission(target, draft)).kind).toBe('ok')
    expect(editCommission).toHaveBeenCalledOnce()
    const sent = (editCommission.mock.calls[0] as unknown as [string, CommissionInput])[1]
    expect(sent.agreed_price).toEqual({ amount_minor: minor, currency })
  })

  it('edit sends the old currency when only the amount changes', async () => {
    const r = await save({ amount: '20,00', currency: 'USD' }, 'edit')
    expect(r.sent?.agreed_price).toEqual({ amount_minor: 2000, currency: 'USD' })
  })
})

describe('title (commission_input.title: string (1..200 characters, not blank))', () => {
  it.each([
    ['ASCII spaces', '   '],
    ['tab and newline', '\t\n '],
    ['U+00A0', '  '],
    ['U+3000', '　'],
    ['a mix of Unicode spaces', '  　﻿'],
    ['empty', ''],
  ])('%s only → required ("Nhập tiêu đề đơn hàng")', async (_, title) => {
    expect((await save({ title })).errors).toEqual({ title: 'required' })
  })

  it('exactly 200 characters with Vietnamese diacritics (code points) → sent', async () => {
    const title = 'ệ'.repeat(200)
    expect((await save({ title })).sent?.title).toBe(title)
  })

  it('201 characters → violates_type_constraint', async () => {
    expect((await save({ title: 'ệ'.repeat(201) })).errors).toEqual({ title: 'violates_type_constraint' })
  })

  it('199 characters plus an emoji (201 UTF-16 units, 200 code points) → sent', async () => {
    const title = `${'a'.repeat(199)}😀`
    expect(title.length).toBe(201)
    expect((await save({ title })).sent?.title).toBe(title)
  })

  it('trimmed before it is sent', async () => {
    expect((await save({ title: '  Chân dung 　' })).sent?.title).toBe('Chân dung')
  })
})

describe('client, currency, deadline, optional texts, links', () => {
  it('no client chosen → client_id required', async () => {
    expect((await save({ clientId: '' })).errors).toEqual({ client_id: 'required' })
  })

  it('no currency → agreed_price.currency required', async () => {
    expect((await save({ currency: '' })).errors).toMatchObject({ 'agreed_price.currency': 'required' })
  })

  it('a deadline that is not YYYY-MM-DD → not_date; empty → null', async () => {
    expect((await save({ deadline: '15/10/2026' })).errors).toEqual({ deadline: 'not_date' })
    expect((await save({ deadline: '' })).sent?.deadline).toBeNull()
    expect((await save({ deadline: '2026-10-15' })).sent?.deadline).toBe('2026-10-15')
  })

  it('"Loại tranh", "Mô tả" of whitespace only → null; otherwise trimmed', async () => {
    const empty = await save({ commissionType: '   ', description: '\n\t ' })
    expect(empty.sent?.commission_type).toBeNull()
    expect(empty.sent?.description).toBeNull()
    const full = await save({ commissionType: ' chibi ', description: ' Nền xanh\nhai dòng ' })
    expect(full.sent?.commission_type).toBe('chibi')
    expect(full.sent?.description).toBe('Nền xanh\nhai dòng')
  })

  it('links: one per line, trimmed; empty and whitespace-only lines dropped; none → []', async () => {
    const links = await save({ referenceLinks: ' https://a.example \n\n   \r\nhttps://b.example \n' })
    expect(links.sent?.reference_links).toEqual(['https://a.example', 'https://b.example'])
    expect((await save({ referenceLinks: '' })).sent?.reference_links).toEqual([])
    expect((await save({ referenceLinks: '\n \n' })).sent?.reference_links).toEqual([])
    // No URL check: the contract says list[string].
    expect((await save({ referenceLinks: 'không phải url' })).sent?.reference_links).toEqual(['không phải url'])
  })

  it('a valid draft → exactly the seven fields of commission_input', async () => {
    const r = await save({ amount: '12,50', currency: 'USD', deadline: '2026-10-15', commissionType: 'chibi' })
    expect(r.sent).toEqual({
      client_id: KID,
      title: 'Chân dung',
      description: null,
      commission_type: 'chibi',
      agreed_price: { amount_minor: 1250, currency: 'USD' },
      deadline: '2026-10-15',
      reference_links: [],
    })
    expect(Object.keys(r.sent ?? {}).sort()).toEqual(['agreed_price', 'client_id', 'commission_type', 'deadline', 'description', 'reference_links', 'title'])
  })

  it('several errors at once are all reported, Services not called', async () => {
    expect((await save({ clientId: '', title: ' ', amount: 'x', deadline: 'hôm nay' })).errors).toEqual({
      client_id: 'required',
      title: 'required',
      'agreed_price.amount_minor': 'not_integer',
      deadline: 'not_date',
    })
  })
})

describe('operations without typed input go straight to Services', () => {
  it('load list, load detail, open form, reload choices', async () => {
    const services = {
      loadCommissionList: vi.fn(async () => 'list'),
      loadCommissionDetail: vi.fn(async () => 'detail'),
      openCommissionForm: vi.fn(async () => 'form'),
      reloadClientChoices: vi.fn(async () => 'choices'),
    } as unknown as ManageCommissionServices
    const routers = createManageCommissionRouters(services, rules)
    expect(await routers.loadCommissionList()).toBe('list')
    expect(await routers.loadCommissionDetail(CID)).toBe('detail')
    expect(services.loadCommissionDetail).toHaveBeenCalledWith(CID)
    expect(await routers.openCommissionForm({ mode: 'create' })).toBe('form')
    expect(await routers.reloadClientChoices(null, KID)).toBe('choices')
    expect(services.reloadClientChoices).toHaveBeenCalledWith(null, KID)
  })
})
