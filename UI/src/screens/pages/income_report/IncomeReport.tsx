/**
 * Page income_report (.design/ui_decomposition.md, "Chặng D5"): the income of
 * a period, one section per currency. Page title "Thu nhập". The button row
 * right under the title holds only "Xem báo cáo" (the main action, also the
 * way to load again; §7.2, principle 7); the two date fields follow. The
 * report of the default period loads when the page opens. A draft that fails
 * the format check sends nothing, puts the text cursor on the first field in
 * error (principle 4), and leaves the report on the screen; a report that
 * cannot be read is dropped, so an old number never stands next to a new
 * failure. Read-only: no notice, no confirmation. Built with kit components
 * only, no style (R10). Every kind of the ViewResult is shown (i5-screens.md,
 * Step I5.2).
 */
import { Button, Caption, DateField, DescriptionList, EmptyState, Inline, InlineAlert, LoadingIndicator, Section, Stack } from '../../../kit'
import type { IncomeReportView, ViewResult } from '../../../logic/workflows/view_income_report/routers'
import { assertNever } from '../../assert_never'
import { useIncomeReport } from './use_income_report'

// The fields in the order they are on the screen, by the contract's input
// names that Routers keys its errors with (ui_decomposition.md D5).
const FIELD_ORDER = ['period_from', 'period_to'] as const

export function IncomeReport() {
  const state = useIncomeReport()
  const { draft, setField, rejection } = state
  const errors = rejection === null ? {} : rejection.fieldErrors
  // The first field with an error gets the text cursor once per rejection; the kit moves it.
  const firstError = FIELD_ORDER.find((field) => field in errors) ?? null
  const focusRequest = (field: (typeof FIELD_ORDER)[number]) => (field === firstError ? state.rejectionCount : 0)

  return (
    <Section title="Thu nhập" level="page" gap="md">
      {/* The button row right under the title (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Xem báo cáo" busyLabel="Đang lập báo cáo…" busy={state.loading} disabled={false} variant="primary" onClick={state.view} />
      </Inline>
      {rejection === null ? null : <InlineAlert title="Chưa xem được báo cáo" text={rejection.message} />}
      <Inline gap="md">
        <DateField
          id="income-period-from"
          label="Từ ngày"
          value={draft.periodFrom}
          onChange={(v) => setField('periodFrom', v)}
          clearLabel="Xóa ngày bắt đầu"
          error={errors.period_from ?? null}
          disabled={false}
          focusRequest={focusRequest('period_from')}
        />
        <DateField
          id="income-period-to"
          label="Đến ngày"
          value={draft.periodTo}
          onChange={(v) => setField('periodTo', v)}
          clearLabel="Xóa ngày kết thúc"
          error={errors.period_to ?? null}
          disabled={false}
          focusRequest={focusRequest('period_to')}
        />
      </Inline>
      {state.loading ? <LoadingIndicator label="Đang lập báo cáo…" /> : null}
      {state.report === null ? null : <ReportResult result={state.report} />}
    </Section>
  )
}

function ReportResult({ result }: { result: ViewResult<IncomeReportView> }) {
  switch (result.kind) {
    case 'ok':
      return <ReportBody view={result.view} />
    case 'rejected':
      // 400 and 409 of the backend (a rejected draft never gets here); 500.
      return <InlineAlert title="Không lập được báo cáo" text={result.message} />
    case 'unreachable':
      // "Xem báo cáo" above repeats the same operation.
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}

function ReportBody({ view }: { view: IncomeReportView }) {
  return (
    <Stack gap="lg">
      {/* The period and the time are the report's own, not the fields' (they may have been edited since). */}
      <Caption text={view.periodText} />
      {view.isEmpty ? (
        // Nothing to do next on this page: no action (a report has no next step here).
        <EmptyState text={view.emptyText} action={null} />
      ) : (
        view.sections.map((section) => (
          <Section key={section.currency} title={section.currency} level="group" gap="sm">
            <DescriptionList label={`Tổng hợp ${section.currency}`} items={section.lines.map((l) => ({ key: l.key, term: l.term, details: [l.text] }))} />
            <Caption text={section.explanation} />
            {section.months.length === 0 ? (
              <EmptyState text={section.noMonthsText} action={null} />
            ) : (
              <DescriptionList label={`Thực nhận theo tháng, ${section.currency}`} items={section.months.map((m) => ({ key: m.key, term: m.term, details: [m.text] }))} />
            )}
          </Section>
        ))
      )}
    </Stack>
  )
}
