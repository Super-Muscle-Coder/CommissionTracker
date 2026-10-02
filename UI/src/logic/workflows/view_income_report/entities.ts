/**
 * Entities of the interface workflow view_income_report: types only. Types at
 * the boundary keep the contract's field names (data_schema.yaml 9.0.2,
 * view_income_report.output_guaranteed.income_report).
 */

// Realizes income_report.currencies[].by_month[]: object { month: string
// (YYYY-MM), received_net_minor: integer }.
export type IncomeMonth = {
  month: string
  received_net_minor: number
}

// Realizes income_report.currencies[]: object { currency: currency_code,
// received_net_minor, refunded_minor (>= 0), outstanding_minor (sign kept),
// by_month }.
export type IncomeCurrency = {
  currency: string
  received_net_minor: number
  refunded_minor: number
  outstanding_minor: number
  by_month: IncomeMonth[]
}

// Realizes income_report: object { period_from: date, period_to: date,
// currencies, generated_at: timestamp }.
export type IncomeReport = {
  period_from: string
  period_to: string
  currencies: IncomeCurrency[]
  generated_at: string
}

// What is sent: the two inputs of get_income_report, both formats.date.
export type IncomePeriod = {
  period_from: string
  period_to: string
}

// The clock Main hands to Services (D5: "bây giờ" comes from one place, so a
// test can fix the instant).
export type Now = () => Date

// --- raw input from the page (what the user chose), handed to Routers ---------

// The values of the two date inputs: YYYY-MM-DD, or '' for none.
export type IncomePeriodDraft = {
  periodFrom: string
  periodTo: string
}

// --- view models — the interface's own -----------------------------------------

// One line "term → text": a number, or a month of the month list.
export type IncomeLineView = { key: string; term: string; text: string }

// What is shown for one currency.
export type CurrencySectionView = {
  // The currency code, the heading of the section.
  currency: string
  // "Thực nhận trong kỳ", "Đã hoàn cho khách trong kỳ", "Còn phải thu (…)".
  lines: IncomeLineView[]
  // The fixed line under the three numbers.
  explanation: string
  // One line per month of by_month, oldest first as received; empty when the
  // currency has no payment in the period.
  months: IncomeLineView[]
  // Shown instead of the month list when it is empty.
  noMonthsText: string
}

// What income_report shows once a report is read.
export type IncomeReportView = {
  // "Từ dd/mm/yyyy đến dd/mm/yyyy · Lập lúc HH:mm dd/mm/yyyy" — the period is
  // the report's own, not the one typed.
  periodText: string
  // One section per currency, in the order received.
  sections: CurrencySectionView[]
  // No currency at all.
  isEmpty: boolean
  emptyText: string
}
