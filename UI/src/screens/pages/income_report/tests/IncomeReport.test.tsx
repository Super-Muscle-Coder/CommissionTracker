// @vitest-environment jsdom
//
// Render tests of the page income_report (i5-screens.md, Step I5.4), with fake
// Routers: the first frame (UI-4) and the load when the page opens; the period
// the fields start with (from defaultPeriod) even when the first load fails;
// every ViewResult kind of its one operation viewIncomeReport
// (ui_decomposition.md D5): ok with two currencies in the order given, ok with
// an empty month list, ok with no currency (no button), a draft rejected by
// the format check (nothing sent by the real Routers; the report on screen is
// kept, the sentence is under the field, the text cursor goes to the first
// field in error), rejected by the backend (400, 409, 500: the old report is
// dropped), unreachable + "Xem báo cáo" again, contract_violation. The sub-line
// takes the period from the RESULT, not from the fields. Every label of the
// D5 table.
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { IncomePeriodDraft, IncomeReportView, ViewResult } from '../../../../logic/workflows/view_income_report/routers'
import { answers, fakeManageClient, fakeViewIncomeReport, pending, renderFirstCommit, renderWithLogic } from '../../../tests/fake_logic'
import { IncomeReport } from '../IncomeReport'

type Loaded = ViewResult<IncomeReportView>
const DEFAULT: IncomePeriodDraft = { periodFrom: '2026-01-01', periodTo: '2026-09-30' }

const EXPLANATION = 'Thực nhận đã trừ tiền hoàn, gồm cả tiền tip. Còn phải thu không phụ thuộc khoảng thời gian.'
const TERMS = ['Thực nhận trong kỳ', 'Đã hoàn cho khách trong kỳ', 'Còn phải thu (mọi đơn chưa hủy, tính tới lúc lập)']
const lines = (received: string, refunded: string, outstanding: string) => [
  { key: 'received', term: TERMS[0], text: received },
  { key: 'refunded', term: TERMS[1], text: refunded },
  { key: 'outstanding', term: TERMS[2], text: outstanding },
]
const REPORT: IncomeReportView = {
  periodText: 'Từ 01/01/2026 đến 30/09/2026 · Lập lúc 23:40 30/09/2026',
  sections: [
    {
      currency: 'USD',
      lines: lines('20,05 USD', '0,00 USD', '-7,55 USD'),
      explanation: EXPLANATION,
      months: [
        { key: '2026-08', term: 'Tháng 8/2026', text: '5,05 USD' },
        { key: '2026-09', term: 'Tháng 9/2026', text: '15,00 USD' },
      ],
      noMonthsText: 'Không có khoản thanh toán nào trong kỳ.',
    },
    {
      currency: 'VND',
      lines: lines('-500.000 VND', '500.000 VND', '6.000.000 VND'),
      explanation: EXPLANATION,
      months: [],
      noMonthsText: 'Không có khoản thanh toán nào trong kỳ.',
    },
  ],
  isEmpty: false,
  emptyText: 'Không có khoản thanh toán nào trong kỳ, và không có đơn nào còn phải thu.',
}
const EMPTY: IncomeReportView = { periodText: 'Từ 01/01/2025 đến 31/12/2025 · Lập lúc 23:40 30/09/2026', sections: [], isEmpty: true, emptyText: REPORT.emptyText }
const ok = (view: IncomeReportView): Loaded => ({ kind: 'ok', view })
const system = (code: string, message: string): Loaded => ({ kind: 'rejected', origin: 'system', code, message, fieldErrors: {} })
const badInput = (fieldErrors: Record<string, string>): Loaded => ({
  kind: 'rejected',
  origin: 'input',
  code: 'INPUT_FORMAT',
  message: 'Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.',
  fieldErrors,
})
const UNREACHABLE: Loaded = { kind: 'unreachable', message: 'Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.' }
const VIOLATION: Loaded = { kind: 'contract_violation', message: 'Ứng dụng nhận được một phản hồi không mong đợi. Thao tác chưa được thực hiện.' }

function renderWith(results: Loaded[]) {
  const viewIncomeReport = answers<[IncomePeriodDraft], Loaded>(...results)
  renderWithLogic(<IncomeReport />, fakeManageClient({}), undefined, undefined, undefined, fakeViewIncomeReport({ viewIncomeReport }))
  return { viewIncomeReport }
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const isFocused = (el: Element) => el.matches(':focus')
const press = () => fireEvent.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
const choose = (label: string, value: string) => fireEvent.change(field(label), { target: { value } })
// The h3 headings (one per currency) in the order shown.
const sections = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
const loaded = () => screen.findByRole('heading', { level: 3, name: 'USD' })

afterEach(() => {
  cleanup()
})

describe('page income_report — opening', () => {
  it('first frame, before Routers answers: loading shown, "Xem báo cáo" cannot be pressed, the fields already hold the default period (UI-4)', async () => {
    const load = pending<[IncomePeriodDraft], Loaded>()
    const first = renderFirstCommit(<IncomeReport />, fakeManageClient({}), undefined, undefined, undefined, fakeViewIncomeReport({ viewIncomeReport: load.fn }))
    expect(first.routersCalled).toBe(false)
    expect(first.statuses).toEqual(['Đang lập báo cáo…'])
    // Only the two buttons that empty a field (both have a date): the main action is busy.
    expect(first.enabledButtons).toEqual(['Xóa ngày bắt đầu', 'Xóa ngày kết thúc'])
    expect(field('Từ ngày').value).toBe('2026-01-01')
    expect(field('Đến ngày').value).toBe('2026-09-30')
    await act(async () => load.release(ok(REPORT)))
    await loaded()
  })

  it('the report of the default period loads by itself, once, with the draft as the page opened with it', async () => {
    const { viewIncomeReport } = renderWith([ok(REPORT)])
    await loaded()
    expect(viewIncomeReport).toHaveBeenCalledExactlyOnceWith(DEFAULT)
  })

  it('every label of the page: title, the button row holding only "Xem báo cáo", the two date fields', async () => {
    renderWith([ok(REPORT)])
    await loaded()
    expect(screen.getByRole('heading', { level: 2, name: 'Thu nhập' })).toBeTruthy()
    const main = screen.getByRole('button', { name: 'Xem báo cáo' })
    // The row right under the title holds nothing else (no "Tải lại").
    expect(main.parentElement?.children.length).toBe(1)
    expect(screen.queryByRole('button', { name: 'Tải lại' })).toBeNull()
    expect(field('Từ ngày').type).toBe('date')
    expect(field('Đến ngày').type).toBe('date')
    expect(screen.getByRole('button', { name: 'Xóa ngày bắt đầu' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xóa ngày kết thúc' })).toBeTruthy()
  })

  it('the first load fails: the fields still hold the default period, "Xem báo cáo" tries again with it', async () => {
    const { viewIncomeReport } = renderWith([system('ERR_STORAGE_IO', 'Không đọc được dữ liệu thu nhập trên máy.'), ok(REPORT)])
    expect((await screen.findByRole('alert')).textContent).toContain('Không đọc được dữ liệu thu nhập trên máy.')
    expect(field('Từ ngày').value).toBe('2026-01-01')
    expect(field('Đến ngày').value).toBe('2026-09-30')
    press()
    await loaded()
    expect(viewIncomeReport).toHaveBeenCalledTimes(2)
    expect(viewIncomeReport).toHaveBeenLastCalledWith(DEFAULT)
  })
})

describe('page income_report — the report', () => {
  it('ok: one section per currency in the order given, the three numbers with their terms, the fixed explanation, the month list', async () => {
    renderWith([ok(REPORT)])
    await loaded()
    expect(sections()).toEqual(['USD', 'VND'])
    const dl = (name: string) => Array.from(screen.getByLabelText(name).querySelectorAll('div')).map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent])
    expect(dl('Tổng hợp USD')).toEqual([
      [TERMS[0], '20,05 USD'],
      [TERMS[1], '0,00 USD'],
      [TERMS[2], '-7,55 USD'],
    ])
    expect(dl('Tổng hợp VND')).toEqual([
      [TERMS[0], '-500.000 VND'],
      [TERMS[1], '500.000 VND'],
      [TERMS[2], '6.000.000 VND'],
    ])
    expect(dl('Thực nhận theo tháng, USD')).toEqual([
      ['Tháng 8/2026', '5,05 USD'],
      ['Tháng 9/2026', '15,00 USD'],
    ])
    expect(screen.getAllByText(EXPLANATION)).toHaveLength(2)
  })

  it('by_month empty: the sentence takes the place of the month list; the three numbers stay', async () => {
    renderWith([ok(REPORT)])
    await loaded()
    expect(screen.getByText('Không có khoản thanh toán nào trong kỳ.')).toBeTruthy()
    expect(screen.queryByLabelText('Thực nhận theo tháng, VND')).toBeNull()
    expect(screen.getByLabelText('Thực nhận theo tháng, USD')).toBeTruthy()
    expect(screen.getByLabelText('Tổng hợp VND').textContent).toContain('6.000.000 VND')
  })

  it('the sub-line shows the period and the time of the RESULT; editing the fields afterwards does not change it', async () => {
    renderWith([ok(REPORT)])
    await loaded()
    expect(screen.getByText(REPORT.periodText)).toBeTruthy()
    choose('Từ ngày', '2020-03-04')
    choose('Đến ngày', '2020-03-05')
    expect(field('Từ ngày').value).toBe('2020-03-04')
    expect(screen.getByText(REPORT.periodText)).toBeTruthy()
    expect(screen.queryByText(/04\/03\/2020/)).toBeNull()
  })

  it('currencies empty: the empty state with its sentence and the period, and no button of its own', async () => {
    renderWith([ok(EMPTY)])
    await screen.findByText(EMPTY.emptyText)
    expect(screen.getByText(EMPTY.periodText)).toBeTruthy()
    expect(screen.queryAllByRole('heading', { level: 3 })).toEqual([])
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Xem báo cáo', 'Xóa ngày bắt đầu', 'Xóa ngày kết thúc'])
  })

  it('"Xem báo cáo" sends the fields as they are and replaces the report with the new one', async () => {
    const { viewIncomeReport } = renderWith([ok(REPORT), ok(EMPTY)])
    await loaded()
    choose('Từ ngày', '2025-01-01')
    choose('Đến ngày', '2025-12-31')
    press()
    await screen.findByText(EMPTY.emptyText)
    expect(viewIncomeReport).toHaveBeenCalledTimes(2)
    expect(viewIncomeReport).toHaveBeenLastCalledWith({ periodFrom: '2025-01-01', periodTo: '2025-12-31' })
    expect(screen.queryByRole('heading', { level: 3, name: 'USD' })).toBeNull()
    expect(screen.getByText(EMPTY.periodText)).toBeTruthy()
  })

  it('while a report loads: "Xem báo cáo" is busy and cannot be pressed twice, the old report stays', async () => {
    const first = answers<[IncomePeriodDraft], Loaded>(ok(REPORT))
    const second = pending<[IncomePeriodDraft], Loaded>()
    let calls = 0
    const viewIncomeReport = (d: IncomePeriodDraft) => (calls++ === 0 ? first(d) : second.fn(d))
    renderWithLogic(<IncomeReport />, fakeManageClient({}), undefined, undefined, undefined, fakeViewIncomeReport({ viewIncomeReport }))
    await loaded()
    press()
    const busy = await screen.findByRole('button', { name: 'Đang lập báo cáo…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(busy)
    expect(second.fn).toHaveBeenCalledOnce()
    // The old report is still there next to the loading message.
    expect(screen.getByRole('heading', { level: 3, name: 'USD' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Đang lập báo cáo…')
    await act(async () => second.release(ok(EMPTY)))
    await screen.findByText(EMPTY.emptyText)
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('page income_report — a draft the format check rejects', () => {
  it('the sentence appears under the field, the alert says the draft was not sent, the report on screen stays, the draft stays as chosen', async () => {
    renderWith([ok(REPORT), badInput({ period_to: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' })])
    await loaded()
    choose('Từ ngày', '2026-10-01')
    press()
    expect((await screen.findByRole('alert')).textContent).toContain('Một số ô chưa đúng định dạng. Vui lòng kiểm tra lại.')
    expect(screen.getByText('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')).toBeTruthy()
    expect(field('Đến ngày').getAttribute('aria-invalid')).toBe('true')
    expect(field('Từ ngày').getAttribute('aria-invalid')).toBe('false')
    // The old report is untouched (the draft was not a load).
    expect(sections()).toEqual(['USD', 'VND'])
    expect(screen.getByText(REPORT.periodText)).toBeTruthy()
    expect(field('Từ ngày').value).toBe('2026-10-01')
  })

  it('the text cursor goes to the field in error; with both in error, to the first on the screen ("Từ ngày")', async () => {
    renderWith([ok(REPORT), badInput({ period_to: 'Chọn ngày kết thúc.' }), badInput({ period_from: 'Chọn ngày bắt đầu.', period_to: 'Chọn ngày kết thúc.' })])
    await loaded()
    press()
    await waitFor(() => expect(isFocused(field('Đến ngày'))).toBe(true))
    press()
    await waitFor(() => expect(isFocused(field('Từ ngày'))).toBe(true))
  })

  it('a second rejection brings the cursor back to the field even after the user left it', async () => {
    renderWith([ok(REPORT), badInput({ period_from: 'Chọn ngày bắt đầu.' }), badInput({ period_from: 'Chọn ngày bắt đầu.' })])
    await loaded()
    press()
    await waitFor(() => expect(isFocused(field('Từ ngày'))).toBe(true))
    field('Từ ngày').blur()
    expect(isFocused(field('Từ ngày'))).toBe(false)
    press()
    await waitFor(() => expect(isFocused(field('Từ ngày'))).toBe(true))
  })

  it('an accepted press afterwards removes the alert and the sentences', async () => {
    renderWith([ok(REPORT), badInput({ period_from: 'Chọn ngày bắt đầu.' }), ok(EMPTY)])
    await loaded()
    press()
    await screen.findByText('Chọn ngày bắt đầu.')
    press()
    await screen.findByText(EMPTY.emptyText)
    expect(screen.queryByText('Chọn ngày bắt đầu.')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(field('Từ ngày').getAttribute('aria-invalid')).toBe('false')
  })

  it('"Xóa ngày bắt đầu" empties the field (and only that one); the button then goes away', async () => {
    renderWith([ok(REPORT)])
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa ngày bắt đầu' }))
    expect(field('Từ ngày').value).toBe('')
    expect(field('Đến ngày').value).toBe('2026-09-30')
    expect(screen.queryByRole('button', { name: 'Xóa ngày bắt đầu' })).toBeNull()
  })

  it('a rejected draft at the very first load (not possible with the default, but shown all the same) does not block the page', async () => {
    renderWith([badInput({ period_from: 'Ngày không hợp lệ.' })])
    expect((await screen.findByRole('alert')).textContent).toContain('Một số ô chưa đúng định dạng.')
    expect(screen.getByText('Ngày không hợp lệ.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Xem báo cáo' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('page income_report — a report that cannot be read is dropped', () => {
  it.each([
    ['400', system('ERR_VALIDATION', 'Máy chủ không nhận khoảng thời gian này.'), 'Máy chủ không nhận khoảng thời gian này.'],
    ['409', system('ERR_OUT_OF_RANGE', 'Tổng thu nhập vượt giới hạn tính toán, không lập được báo cáo.'), 'Tổng thu nhập vượt giới hạn tính toán, không lập được báo cáo.'],
    ['500', system('ERR_STORAGE_IO', 'Không đọc được dữ liệu thu nhập trên máy. Vui lòng thử lại; nếu lỗi vẫn còn, hãy khởi động lại ứng dụng.'), 'Không đọc được dữ liệu thu nhập trên máy.'],
  ])('rejected by the backend (%s): the message, and no old number next to it', async (_label, failure, text) => {
    renderWith([ok(REPORT), failure])
    await loaded()
    press()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không lập được báo cáo')
    expect(alert.textContent).toContain(text)
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.queryByText(REPORT.periodText)).toBeNull()
    expect(screen.queryByText('20,05 USD')).toBeNull()
  })

  it('400 and 409 give two different sentences on the page', async () => {
    renderWith([system('ERR_VALIDATION', 'Máy chủ không nhận khoảng thời gian này.'), system('ERR_OUT_OF_RANGE', 'Tổng thu nhập vượt giới hạn tính toán, không lập được báo cáo.')])
    const first = (await screen.findByRole('alert')).textContent
    press()
    await waitFor(() => expect(screen.getByRole('alert').textContent).not.toBe(first))
    expect(screen.getByRole('alert').textContent).toContain('vượt giới hạn tính toán')
  })

  it('unreachable: the message, the old report dropped, and "Xem báo cáo" tries again with the same draft', async () => {
    const { viewIncomeReport } = renderWith([ok(REPORT), UNREACHABLE, ok(REPORT)])
    await loaded()
    choose('Đến ngày', '2026-09-15')
    press()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Không kết nối được')
    expect(alert.textContent).toContain(UNREACHABLE.kind === 'unreachable' ? UNREACHABLE.message : '')
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(field('Đến ngày').value).toBe('2026-09-15')
    press()
    await loaded()
    expect(viewIncomeReport).toHaveBeenCalledTimes(3)
    expect(viewIncomeReport).toHaveBeenLastCalledWith({ periodFrom: '2026-01-01', periodTo: '2026-09-15' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('contract_violation: the message, never a number, never "Lập lúc"', async () => {
    renderWith([ok(REPORT), VIOLATION])
    await loaded()
    press()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Có lỗi không mong đợi')
    expect(alert.textContent).toContain('Ứng dụng nhận được một phản hồi không mong đợi.')
    expect(screen.queryByText(/Lập lúc/)).toBeNull()
    expect(screen.queryByText('20,05 USD')).toBeNull()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('the page has no notice, no confirmation and no dialog of the system', async () => {
    renderWith([ok(REPORT)])
    await loaded()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).toBeNull()
  })
})
