// Services of update_progress — i3-logic.md, Step I3.6: every CallResult kind
// maps to the right ViewResult, for every operation and each of its calls (an
// operation of several calls ends at the first call that is not ok, and the
// later calls are not made); every declared error code has a message (walked
// from the label tables of Configs, not listed by hand); each presentation
// decision of ui_decomposition.md D3 has a case, plus the cases the plan of
// session 20 (item 3) requires: grouping of the board (no entry → first
// stage; no empty group; order of list_stages, also when it is not the
// default order; unknown code; entry of a commission not listed), order in a
// group, updated_at null and an empty history, no current stage among the
// choices, a closed stage recognized by its kind (a fake catalog).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { CallResult, ResultMessages, ViewResult } from '../../../shared/results'
import type { UpdateProgressAdapters } from '../adapters'
import { UPDATE_PROGRESS_CONFIGS } from '../configs'
import type {
  CommissionList,
  CommissionListItem,
  CommissionProgressView,
  ProgressBoard,
  ProgressBoardView,
  ProgressHistory,
  ProgressState,
  StageChangeOutcomeView,
  StageChangeView,
  StageOptions,
} from '../entities'
import { createUpdateProgressServices } from '../services'

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
const cfg = UPDATE_PROGRESS_CONFIGS

const unused = () =>
  vi.fn(async () => {
    throw new Error('test: adapter not expected to be called')
  })

function fakeAdapters(over: Partial<UpdateProgressAdapters>): UpdateProgressAdapters {
  return {
    getStage: unused(),
    getStageHistory: unused(),
    changeStage: unused(),
    getBoard: unused(),
    listStages: unused(),
    listCommissions: unused(),
    ...over,
  }
}
const servicesOf = (over: Partial<UpdateProgressAdapters>) => createUpdateProgressServices(fakeAdapters(over), cfg, messages)
const answer = <T>(r: CallResult<T>) => vi.fn(async () => r)
const ok = <T>(data: T, label = 200): CallResult<T> => ({ kind: 'ok', label, data })
const declared = (label: number, code: string): CallResult<never> => ({ kind: 'declared_error', label, error: { code, message: 'x', details: null } })
const UNREACHABLE: CallResult<never> = { kind: 'unreachable', reason: 'refused' }
const VIOLATION: CallResult<never> = { kind: 'contract_violation', reason: 'bad body' }

let n = 0
const uuid = () => `00000000-0000-4000-8000-${(n += 1).toString(16).padStart(12, '0')}`

// The default stage_catalog of the contract, in its order.
const CATALOG: StageOptions = [
  { stage: 'queued', kind: 'active' },
  { stage: 'sketch', kind: 'active' },
  { stage: 'lineart', kind: 'active' },
  { stage: 'coloring', kind: 'active' },
  { stage: 'rendering', kind: 'active' },
  { stage: 'final_review', kind: 'active' },
  { stage: 'revision', kind: 'active' },
  { stage: 'completed', kind: 'active' },
  { stage: 'on_hold', kind: 'on_hold' },
  { stage: 'delivered', kind: 'finished' },
  { stage: 'cancelled', kind: 'cancelled' },
]

function commission(title: string, deadline: string | null, updatedAt = '2026-09-28T08:00:00+07:00', id = uuid()): CommissionListItem {
  return { commission_id: id, client_id: uuid(), title, agreed_price: { amount_minor: 1, currency: 'VND' }, deadline, updated_at: updatedAt }
}
const entry = (c: CommissionListItem, stage: string, kind: ProgressBoard[number]['stage_kind'] = 'active') => ({
  commission_id: c.commission_id,
  current_stage: stage,
  stage_kind: kind,
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('every declared error code has a message (walked from the label tables of Configs)', () => {
  const pairs = Object.entries(cfg.endpoints).flatMap(([endpoint, ep]) =>
    Object.values(ep.labels)
      .filter((v) => v !== 'ok')
      .map((code) => [endpoint, code] as const),
  )

  it('there are 10 (call, code) pairs', () => {
    expect(pairs).toHaveLength(10)
  })

  it.each(pairs)('%s %s', (endpoint, code) => {
    const message = cfg.errorMessages[endpoint]?.[code]
    expect(typeof message).toBe('string')
    expect((message as string).length).toBeGreaterThan(0)
  })
})

// --- progress_board -----------------------------------------------------------

describe('loadProgressBoard: list_stages, get_board, list_commissions — one operation', () => {
  const load = (stages: CallResult<StageOptions>, board: CallResult<ProgressBoard> | null, commissions: CallResult<CommissionList> | null) =>
    servicesOf({
      listStages: answer(stages),
      getBoard: board === null ? unused() : answer(board),
      listCommissions: commissions === null ? unused() : answer(commissions),
    }).loadProgressBoard()
  const view = (r: ViewResult<ProgressBoardView>) => (r as { view: ProgressBoardView }).view
  const titles = (v: ProgressBoardView) => v.groups.map((g) => [g.title, g.rows.map((r) => r.title)])

  it('list_stages unreachable → unreachable; get_board and list_commissions not called', async () => {
    expect(await load(UNREACHABLE, null, null)).toEqual({ kind: 'unreachable', message: messages.unreachable })
  })

  it('list_stages contract_violation → contract_violation; nothing else called', async () => {
    expect(await load(VIOLATION, null, null)).toEqual({ kind: 'contract_violation', message: messages.contractViolation })
  })

  it.each([
    ['get_board 500', declared(500, 'ERR_STORAGE_IO'), 'rejected'],
    ['get_board unreachable', UNREACHABLE, 'unreachable'],
    ['get_board contract_violation', VIOLATION, 'contract_violation'],
  ] as const)('%s → %s; list_commissions not called', async (_, board, kind) => {
    const r = await load(ok(CATALOG), board, null)
    expect(r.kind).toBe(kind)
    if (r.kind === 'rejected') {
      expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.getBoard.ERR_STORAGE_IO, fieldErrors: {} })
    }
  })

  it.each([
    ['list_commissions 500', declared(500, 'ERR_STORAGE_IO'), 'rejected'],
    ['list_commissions unreachable', UNREACHABLE, 'unreachable'],
    ['list_commissions contract_violation', VIOLATION, 'contract_violation'],
  ] as const)('%s → %s', async (_, commissions, kind) => {
    const r = await load(ok(CATALOG), ok([]), commissions)
    expect(r.kind).toBe(kind)
    if (r.kind === 'rejected') expect(r.message).toBe(cfg.errorMessages.listCommissions.ERR_STORAGE_IO)
  })

  it('no commission at all → isEmpty, no group', async () => {
    expect(view(await load(ok(CATALOG), ok([]), ok([])))).toEqual({ groups: [], isEmpty: true })
  })

  it('a commission with no entry in progress_board is in the group of the first stage', async () => {
    const a = commission('Chưa đặt', null)
    const v = view(await load(ok(CATALOG), ok([]), ok([a])))
    expect(v.isEmpty).toBe(false)
    expect(v.groups).toEqual([{ key: 'queued', title: 'Chờ bắt đầu (1)', rows: [{ commissionId: a.commission_id, title: 'Chưa đặt', detailText: 'Không có hạn' }] }])
  })

  it('groups follow list_stages; empty groups are left out; titles "<tên> (<số>)"', async () => {
    const a = commission('A', null)
    const b = commission('B', null)
    const c = commission('C', null)
    const d = commission('D', null)
    const board = [entry(a, 'delivered', 'finished'), entry(b, 'sketch'), entry(c, 'sketch')]
    const v = view(await load(ok(CATALOG), ok(board), ok([a, b, c, d])))
    expect(v.groups.map((g) => g.title)).toEqual(['Chờ bắt đầu (1)', 'Phác thảo (2)', 'Đã giao (1)'])
    expect(v.groups.map((g) => g.key)).toEqual(['queued', 'sketch', 'delivered'])
  })

  it('groups follow list_stages even when it is not the default order; the first stage is the first of list_stages', async () => {
    const reordered: StageOptions = [
      { stage: 'coloring', kind: 'active' },
      { stage: 'cancelled', kind: 'cancelled' },
      { stage: 'queued', kind: 'active' },
      { stage: 'sketch', kind: 'active' },
    ]
    const a = commission('A', null)
    const b = commission('B', null)
    const c = commission('C', null)
    const noEntry = commission('Chưa đặt', null)
    const board = [entry(a, 'sketch'), entry(b, 'queued'), entry(c, 'cancelled', 'cancelled')]
    const v = view(await load(ok(reordered), ok(board), ok([a, b, c, noEntry])))
    expect(titles(v)).toEqual([
      ['Tô màu (1)', ['Chưa đặt']],
      ['Đã hủy (1)', ['C']],
      ['Chờ bắt đầu (1)', ['B']],
      ['Phác thảo (1)', ['A']],
    ])
  })

  it('an entry whose stage is not in list_stages → a last group "Giai đoạn khác: <mã>", one per code, by code', async () => {
    const a = commission('A', null)
    const b = commission('B', null)
    const c = commission('C', null)
    const d = commission('D', null)
    const board = [entry(a, 'zzz_new'), entry(b, 'inking'), entry(c, 'sketch'), entry(d, 'inking')]
    const v = view(await load(ok(CATALOG), ok(board), ok([a, b, c, d])))
    expect(v.groups.map((g) => [g.key, g.title])).toEqual([
      ['sketch', 'Phác thảo (1)'],
      ['other:inking', 'Giai đoạn khác: inking (2)'],
      ['other:zzz_new', 'Giai đoạn khác: zzz_new (1)'],
    ])
  })

  it('a stage code with no Vietnamese name, but in list_stages, is shown as its code', async () => {
    const a = commission('A', null)
    const v = view(await load(ok([{ stage: 'inking', kind: 'active' }]), ok([entry(a, 'inking')]), ok([a])))
    expect(v.groups[0].title).toBe('inking (1)')
  })

  it('an entry of a commission missing from list_commissions is left out', async () => {
    const a = commission('A', null)
    const gone = commission('Gone', null)
    const v = view(await load(ok(CATALOG), ok([entry(a, 'sketch'), entry(gone, 'lineart')]), ok([a])))
    expect(titles(v)).toEqual([['Phác thảo (1)', ['A']]])
  })

  it('in a group: earliest deadline first, no deadline last; same deadline → most recently updated first, then commission_id', async () => {
    const late = commission('Hạn muộn', '2026-12-01')
    const early = commission('Hạn sớm', '2026-10-01')
    const none = commission('Không hạn', null)
    const sameOld = commission('Cùng hạn, sửa trước', '2026-11-01', '2026-09-28T08:00:00+07:00')
    const sameNew = commission('Cùng hạn, sửa sau', '2026-11-01', '2026-09-28T01:00:01Z') // 08:00:01 +07:00
    const tieB = commission('Trùng hết B', '2026-11-15', '2026-09-28T08:00:00+07:00', '00000000-0000-4000-8000-00000000000b')
    const tieA = commission('Trùng hết A', '2026-11-15', '2026-09-28T08:00:00+07:00', '00000000-0000-4000-8000-00000000000a')
    const all = [none, late, sameOld, tieB, early, sameNew, tieA]
    const v = view(await load(ok(CATALOG), ok(all.map((c) => entry(c, 'sketch'))), ok(all)))
    expect(v.groups[0].rows.map((r) => r.title)).toEqual([
      'Hạn sớm',
      'Cùng hạn, sửa sau',
      'Cùng hạn, sửa trước',
      'Trùng hết A',
      'Trùng hết B',
      'Hạn muộn',
      'Không hạn',
    ])
  })

  it('each row: the title and "Hạn giao dd/mm/yyyy" or "Không có hạn" (cut from the string, also in a negative time zone)', async () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    expect(new Date('2026-01-01').getDate()).toBe(31)
    const a = commission('A', '2026-01-01')
    const b = commission('B', null)
    const v = view(await load(ok(CATALOG), ok([]), ok([a, b])))
    expect(v.groups[0].rows).toEqual([
      { commissionId: a.commission_id, title: 'A', detailText: 'Hạn giao 01/01/2026' },
      { commissionId: b.commission_id, title: 'B', detailText: 'Không có hạn' },
    ])
  })

  it('calls list_stages, get_board, list_commissions in that order, once each', async () => {
    const order: string[] = []
    const s = servicesOf({
      listStages: vi.fn(async () => (order.push('list_stages'), ok(CATALOG))),
      getBoard: vi.fn(async () => (order.push('get_board'), ok([]))),
      listCommissions: vi.fn(async () => (order.push('list_commissions'), ok([]))),
    })
    await s.loadProgressBoard()
    expect(order).toEqual(['list_stages', 'get_board', 'list_commissions'])
  })
})

// --- commission_detail, part "Tiến độ" ----------------------------------------

describe('loadCommissionProgress: get_stage, get_stage_history — one operation', () => {
  const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
  const state = (over: Partial<ProgressState>): ProgressState => ({ commission_id: CID, current_stage: 'lineart', stage_kind: 'active', updated_at: '2026-09-28T01:05:00Z', ...over })
  const load = (s: CallResult<ProgressState>, h: CallResult<ProgressHistory> | null) =>
    servicesOf({ getStage: answer(s), getStageHistory: h === null ? unused() : answer(h) }).loadCommissionProgress(CID)
  const view = (r: ViewResult<CommissionProgressView>) => (r as { view: CommissionProgressView }).view

  it.each([
    ['get_stage 404', declared(404, 'ERR_NOT_FOUND'), { kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.', fieldErrors: {} }],
    ['get_stage 500', declared(500, 'ERR_STORAGE_IO'), { kind: 'rejected', origin: 'system', code: 'ERR_STORAGE_IO', message: cfg.errorMessages.getStage.ERR_STORAGE_IO, fieldErrors: {} }],
    ['get_stage unreachable', UNREACHABLE, { kind: 'unreachable', message: messages.unreachable }],
    ['get_stage contract_violation', VIOLATION, { kind: 'contract_violation', message: messages.contractViolation }],
  ] as const)('%s → its ViewResult; get_stage_history not called', async (_, s, expected) => {
    expect(await load(s, null)).toEqual(expected)
  })

  it.each([
    ['get_stage_history 404', declared(404, 'ERR_NOT_FOUND'), 'rejected'],
    ['get_stage_history 500', declared(500, 'ERR_STORAGE_IO'), 'rejected'],
    ['get_stage_history unreachable', UNREACHABLE, 'unreachable'],
    ['get_stage_history contract_violation', VIOLATION, 'contract_violation'],
  ] as const)('%s → %s', async (_, h, kind) => {
    expect((await load(ok(state({})), h)).kind).toBe(kind)
  })

  it('updated_at null and an empty history: "chưa cập nhật lần nào", no line, "Chưa đổi giai đoạn lần nào"', async () => {
    const v = view(await load(ok(state({ current_stage: 'queued', updated_at: null })), ok([])))
    expect(v).toEqual({
      stageText: 'Chờ bắt đầu',
      updatedText: 'chưa cập nhật lần nào',
      historyLines: [],
      noHistoryText: 'Chưa đổi giai đoạn lần nào',
      closed: false,
      closedText: null,
    })
  })

  it('the current stage with "cập nhật lúc <ngày giờ>" in the machine\'s time zone, Vietnamese format', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    const v = view(await load(ok(state({})), ok([])))
    expect(v.stageText).toBe('Lên nét')
    expect(v.updatedText).toBe('cập nhật lúc 08:05 28/09/2026')
  })

  it('history newest first; "Bắt đầu: <đến>" for the first change; "<từ> → <đến>"; date and time; the note when there is one', async () => {
    vi.stubEnv('TZ', 'Asia/Ho_Chi_Minh')
    const history: ProgressHistory = [
      { from_stage: null, to_stage: 'sketch', note: null, changed_at: '2026-09-27T03:00:00Z' },
      { from_stage: 'sketch', to_stage: 'lineart', note: 'Khách duyệt phác', changed_at: '2026-09-28T01:05:00Z' },
      { from_stage: 'lineart', to_stage: 'inking', note: null, changed_at: '2026-09-28T02:00:00Z' },
    ]
    expect(view(await load(ok(state({})), ok(history))).historyLines).toEqual([
      'Lên nét → inking · 09:00 28/09/2026',
      'Phác thảo → Lên nét · 08:05 28/09/2026 · Khách duyệt phác',
      'Bắt đầu: Phác thảo · 10:00 27/09/2026',
    ])
  })

  it.each([
    ['delivered', 'finished', 'Đơn đang ở giai đoạn "Đã giao", không đổi giai đoạn được nữa.'],
    ['cancelled', 'cancelled', 'Đơn đang ở giai đoạn "Đã hủy", không đổi giai đoạn được nữa.'],
  ] as const)('%s (kind %s) is closed', async (stage, kind, text) => {
    const v = view(await load(ok(state({ current_stage: stage, stage_kind: kind })), ok([])))
    expect(v.closed).toBe(true)
    expect(v.closedText).toBe(text)
  })

  it.each([
    ['on_hold', 'on_hold'],
    ['completed', 'active'],
  ] as const)('%s (kind %s) is not closed', async (stage, kind) => {
    const v = view(await load(ok(state({ current_stage: stage, stage_kind: kind })), ok([])))
    expect(v.closed).toBe(false)
    expect(v.closedText).toBeNull()
  })

  it('closed is read from the kind, not the code: a stage "archived" of kind finished is closed, "delivered" of kind active is not', async () => {
    expect(view(await load(ok(state({ current_stage: 'archived', stage_kind: 'finished' })), ok([]))).closed).toBe(true)
    expect(view(await load(ok(state({ current_stage: 'delivered', stage_kind: 'active' })), ok([]))).closed).toBe(false)
  })
})

// --- stage_change --------------------------------------------------------------

describe('openStageChange: list_stages, get_stage — one operation', () => {
  const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
  const state = (over: Partial<ProgressState>): ProgressState => ({ commission_id: CID, current_stage: 'sketch', stage_kind: 'active', updated_at: null, ...over })
  const open = (stages: CallResult<StageOptions>, s: CallResult<ProgressState> | null) =>
    servicesOf({ listStages: answer(stages), getStage: s === null ? unused() : answer(s) }).openStageChange(CID)
  const view = (r: ViewResult<StageChangeView>) => (r as { view: StageChangeView }).view

  it.each([
    ['list_stages unreachable', UNREACHABLE, 'unreachable'],
    ['list_stages contract_violation', VIOLATION, 'contract_violation'],
  ] as const)('%s → %s; get_stage not called', async (_, stages, kind) => {
    expect((await open(stages, null)).kind).toBe(kind)
  })

  it.each([
    ['get_stage 404', declared(404, 'ERR_NOT_FOUND'), 'rejected'],
    ['get_stage 500', declared(500, 'ERR_STORAGE_IO'), 'rejected'],
    ['get_stage unreachable', UNREACHABLE, 'unreachable'],
    ['get_stage contract_violation', VIOLATION, 'contract_violation'],
  ] as const)('%s → %s', async (_, s, kind) => {
    const r = await open(ok(CATALOG), s)
    expect(r.kind).toBe(kind)
  })

  it('get_stage 404 → "Không tìm thấy đơn hàng này."', async () => {
    const r = await open(ok(CATALOG), declared(404, 'ERR_NOT_FOUND'))
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code: 'ERR_NOT_FOUND', message: 'Không tìm thấy đơn hàng này.', fieldErrors: {} })
  })

  it('choices: every stage of list_stages in its order, without the current one; an empty draft', async () => {
    const v = view(await open(ok(CATALOG), ok(state({}))))
    expect(v.currentStageText).toBe('Phác thảo')
    expect(v.choices.map((c) => c.value)).toEqual(CATALOG.map((s) => s.stage).filter((s) => s !== 'sketch'))
    expect(v.choices).not.toContainEqual(expect.objectContaining({ value: 'sketch' }))
    expect(v.choices[0]).toEqual({ value: 'queued', label: 'Chờ bắt đầu' })
    expect(v.chooseLabel).toBe('Chọn giai đoạn')
    expect(v.draft).toEqual({ toStage: '', note: '' })
    expect(v.closed).toBe(false)
    expect(v.closedText).toBeNull()
  })

  it('a commission with no stage set (queued, updated_at null): queued is not offered', async () => {
    const v = view(await open(ok(CATALOG), ok(state({ current_stage: 'queued' }))))
    expect(v.choices.map((c) => c.value)).not.toContain('queued')
    expect(v.choices).toHaveLength(10)
  })

  it('closing stages by kind (default catalog): delivered and cancelled', async () => {
    const v = view(await open(ok(CATALOG), ok(state({}))))
    expect(v.target).toEqual({ commissionId: CID, closingStages: ['delivered', 'cancelled'] })
  })

  it('closing stages by kind, not code: a fake catalog whose finished stage is "shipped", and "delivered" active', async () => {
    const fake: StageOptions = [
      { stage: 'todo', kind: 'active' },
      { stage: 'delivered', kind: 'active' },
      { stage: 'shipped', kind: 'finished' },
      { stage: 'dropped', kind: 'cancelled' },
      { stage: 'paused', kind: 'on_hold' },
    ]
    const v = view(await open(ok(fake), ok(state({ current_stage: 'todo' }))))
    expect(v.target.closingStages).toEqual(['shipped', 'dropped'])
    expect(v.choices).toEqual([
      { value: 'delivered', label: 'Đã giao' },
      { value: 'shipped', label: 'shipped' },
      { value: 'dropped', label: 'dropped' },
      { value: 'paused', label: 'paused' },
    ])
  })

  it('the current stage closed (kind finished) → closed, with its text', async () => {
    const v = view(await open(ok(CATALOG), ok(state({ current_stage: 'delivered', stage_kind: 'finished' }))))
    expect(v.closed).toBe(true)
    expect(v.closedText).toBe('Đơn đang ở giai đoạn "Đã giao", không đổi giai đoạn được nữa.')
  })
})

describe('saveStageChange', () => {
  const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
  const target = { commissionId: CID, closingStages: ['delivered', 'cancelled'] }
  const outcome = (r: ViewResult<StageChangeOutcomeView>) => (r as { view: StageChangeOutcomeView }).view

  it('a closing stage, not confirmed → needs_confirmation with the warning; nothing sent', async () => {
    const s = servicesOf({})
    expect(outcome(await s.saveStageChange(target, { to_stage: 'delivered', note: null }, false))).toEqual({
      outcome: 'needs_confirmation',
      message: 'Sau khi chuyển sang "Đã giao", đơn này không đổi giai đoạn được nữa.',
    })
  })

  it('a closing stage, confirmed → change_stage sent once; changed, "Đã đổi giai đoạn sang <tên>."', async () => {
    const changeStage = answer(ok({ commission_id: CID, current_stage: 'cancelled', stage_kind: 'cancelled' as const, updated_at: '2026-09-28T01:05:00Z' }))
    const r = await servicesOf({ changeStage }).saveStageChange(target, { to_stage: 'cancelled', note: 'Khách hủy' }, true)
    expect(changeStage).toHaveBeenCalledExactlyOnceWith(CID, { to_stage: 'cancelled', note: 'Khách hủy' })
    expect(outcome(r)).toEqual({ outcome: 'changed', commissionId: CID, message: 'Đã đổi giai đoạn sang Đã hủy.' })
  })

  it('a stage that does not close → sent at once, without confirmation', async () => {
    const changeStage = answer(ok({ commission_id: CID, current_stage: 'lineart', stage_kind: 'active' as const, updated_at: '2026-09-28T01:05:00Z' }))
    const r = await servicesOf({ changeStage }).saveStageChange(target, { to_stage: 'lineart', note: null }, false)
    expect(changeStage).toHaveBeenCalledOnce()
    expect(outcome(r)).toEqual({ outcome: 'changed', commissionId: CID, message: 'Đã đổi giai đoạn sang Lên nét.' })
  })

  it.each(Object.entries(cfg.endpoints.changeStage.labels).filter(([, v]) => v !== 'ok'))('change_stage %s → rejected system with its message', async (label, code) => {
    const r = await servicesOf({ changeStage: answer(declared(Number(label), code)) }).saveStageChange(target, { to_stage: 'lineart', note: null }, false)
    expect(r).toEqual({ kind: 'rejected', origin: 'system', code, message: cfg.errorMessages.changeStage[code], fieldErrors: {} })
  })

  it('change_stage 409 → "Không đổi được giai đoạn: … Hãy mở lại trang."', async () => {
    const r = await servicesOf({ changeStage: answer(declared(409, 'ERR_INVALID_TRANSITION')) }).saveStageChange(target, { to_stage: 'lineart', note: null }, false)
    expect((r as { message: string }).message).toBe('Không đổi được giai đoạn: đơn đã được đổi sang giai đoạn khác hoặc đã khép lại. Hãy mở lại trang.')
  })

  it.each([
    ['unreachable', UNREACHABLE, { kind: 'unreachable', message: messages.unreachable }],
    ['contract_violation', VIOLATION, { kind: 'contract_violation', message: messages.contractViolation }],
  ] as const)('change_stage %s → %s', async (_, r, expected) => {
    expect(await servicesOf({ changeStage: answer(r) }).saveStageChange(target, { to_stage: 'lineart', note: null }, true)).toEqual(expected)
  })
})

describe('rejectInput', () => {
  it('to_stage required → "Chọn giai đoạn mới."; code INPUT_FORMAT', () => {
    expect(servicesOf({}).rejectInput({ to_stage: 'required' })).toEqual({
      kind: 'rejected',
      origin: 'input',
      code: INPUT_FORMAT_CODE,
      message: messages.inputSummary,
      fieldErrors: { to_stage: 'Chọn giai đoạn mới.' },
    })
  })

  it('a pair with no message of its own falls back to the layer message', () => {
    expect(servicesOf({}).rejectInput({ note: 'not_in_list' })).toMatchObject({ fieldErrors: { note: messages.input.not_in_list } })
  })
})
