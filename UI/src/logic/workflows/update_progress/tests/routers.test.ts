// Routers of update_progress — i3-logic.md, Step I3.6: for the one field with
// a format check (to_stage), each reason → rejected input and Services not
// called; a valid draft → Services called with the converted input. Plus the
// plan of session 20, item 3: a note of whitespace only (ASCII, U+00A0,
// U+3000) → null. The loading entries hand over to Services unchanged.
import { describe, expect, it, vi } from 'vitest'
import { INPUT_FORMAT_CODE } from '../../../shared/results'
import type { ResultMessages } from '../../../shared/results'
import type { UpdateProgressAdapters } from '../adapters'
import { UPDATE_PROGRESS_CONFIGS } from '../configs'
import { createUpdateProgressRouters } from '../routers'
import { createUpdateProgressServices, type UpdateProgressServices } from '../services'

const CID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const TARGET = { commissionId: CID, closingStages: ['delivered', 'cancelled'] }
const OK = { kind: 'ok' as const, view: { outcome: 'changed' as const, commissionId: CID, message: 'x' } }

function fakeServices() {
  const services = {
    loadProgressBoard: vi.fn(async () => ({ kind: 'ok' as const, view: { groups: [], isEmpty: true } })),
    loadCommissionProgress: vi.fn(async () => ({ kind: 'unreachable' as const, message: 'u' })),
    openStageChange: vi.fn(async () => ({ kind: 'unreachable' as const, message: 'u' })),
    saveStageChange: vi.fn(async () => OK),
    rejectInput: vi.fn((fields: Record<string, string>) => ({
      kind: 'rejected' as const,
      origin: 'input' as const,
      code: INPUT_FORMAT_CODE,
      message: 'summary',
      fieldErrors: fields,
    })),
  }
  return { services, routers: createUpdateProgressRouters(services as unknown as UpdateProgressServices) }
}

describe('saveStageChange: the format check of the draft', () => {
  it('no stage chosen → rejected input on to_stage ("required"); Services.saveStageChange not called', async () => {
    const { services, routers } = fakeServices()
    const r = await routers.saveStageChange(TARGET, { toStage: '', note: 'giữ nguyên' }, false)
    expect(services.rejectInput).toHaveBeenCalledExactlyOnceWith({ to_stage: 'required' })
    expect(services.saveStageChange).not.toHaveBeenCalled()
    expect(r).toMatchObject({ kind: 'rejected', origin: 'input', fieldErrors: { to_stage: 'required' } })
  })

  it('no stage chosen, even with "Xác nhận" (confirmed) → rejected input, nothing sent', async () => {
    const { services, routers } = fakeServices()
    await routers.saveStageChange(TARGET, { toStage: '', note: '' }, true)
    expect(services.saveStageChange).not.toHaveBeenCalled()
  })

  it('a stage chosen and a note → Services called with { to_stage, note } (note trimmed) and the confirmation flag', async () => {
    const { services, routers } = fakeServices()
    const r = await routers.saveStageChange(TARGET, { toStage: 'lineart', note: '  Khách duyệt phác \n' }, false)
    expect(services.saveStageChange).toHaveBeenCalledExactlyOnceWith(TARGET, { to_stage: 'lineart', note: 'Khách duyệt phác' }, false)
    expect(r).toBe(OK)
  })

  it('the confirmation flag is handed over as given', async () => {
    const { services, routers } = fakeServices()
    await routers.saveStageChange(TARGET, { toStage: 'delivered', note: '' }, true)
    expect(services.saveStageChange).toHaveBeenCalledExactlyOnceWith(TARGET, { to_stage: 'delivered', note: null }, true)
  })

  it.each([
    ['empty', ''],
    ['ASCII spaces, tab and new lines', ' \t\r\n  '],
    ['U+00A0 (no-break space)', '  '],
    ['U+3000 (ideographic space)', '　'],
    ['a mix with U+2003 and U+FEFF', '  ﻿ 　 '],
  ])('a note of whitespace only (%s) → null', async (_, note) => {
    const { services, routers } = fakeServices()
    await routers.saveStageChange(TARGET, { toStage: 'sketch', note }, false)
    expect(services.saveStageChange).toHaveBeenCalledExactlyOnceWith(TARGET, { to_stage: 'sketch', note: null }, false)
  })

  it('the input sent has exactly the two fields of stage_change', async () => {
    const { services, routers } = fakeServices()
    await routers.saveStageChange(TARGET, { toStage: 'sketch', note: 'x' }, false)
    const input = services.saveStageChange.mock.calls[0] as unknown[]
    expect(Object.keys(input[1] as object).sort()).toEqual(['note', 'to_stage'])
  })
})

describe('the loading entries hand over to Services', () => {
  it('loadProgressBoard, loadCommissionProgress(id), openStageChange(id)', async () => {
    const { services, routers } = fakeServices()
    await routers.loadProgressBoard()
    await routers.loadCommissionProgress(CID)
    await routers.openStageChange(CID)
    expect(services.loadProgressBoard).toHaveBeenCalledOnce()
    expect(services.loadCommissionProgress).toHaveBeenCalledExactlyOnceWith(CID)
    expect(services.openStageChange).toHaveBeenCalledExactlyOnceWith(CID)
  })
})

describe('with the real Services (fake Adapters): no stage chosen → the field message of Configs', () => {
  const messages: ResultMessages = {
    unreachable: 'u',
    contractViolation: 'c',
    inputSummary: 'Một số ô chưa đúng định dạng.',
    input: {
      required: 'r',
      not_integer: 'r',
      not_number: 'r',
      not_date: 'r',
      not_timestamp: 'r',
      not_in_list: 'r',
      violates_type_constraint: 'r',
    },
  }
  it('"Chọn giai đoạn mới."; change_stage never called', async () => {
    const changeStage = vi.fn()
    const services = createUpdateProgressServices({ changeStage } as unknown as UpdateProgressAdapters, UPDATE_PROGRESS_CONFIGS, messages)
    const r = await createUpdateProgressRouters(services).saveStageChange(TARGET, { toStage: '', note: '' }, false)
    expect(r).toEqual({ kind: 'rejected', origin: 'input', code: INPUT_FORMAT_CODE, message: 'Một số ô chưa đúng định dạng.', fieldErrors: { to_stage: 'Chọn giai đoạn mới.' } })
    expect(changeStage).not.toHaveBeenCalled()
  })
})
