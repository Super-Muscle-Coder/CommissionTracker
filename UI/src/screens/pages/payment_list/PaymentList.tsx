/**
 * Page payment_list (.design/ui_decomposition.md, "Chặng D4"): the balance
 * and every payment of one commission, voided ones included. Page title
 * "Thanh toán", the commission's title under it (handed by commission_detail).
 * Main action "Ghi khoản thanh toán" (opens payment_form), then "Quay lại đơn
 * hàng", then "Tải lại", in the button row right under the titles (§7.2,
 * principle 7). Each payment not voided has "Hủy khoản này": pressing it asks
 * first, inside the page (ConfirmPanel of the kit, never a dialog of the
 * system or the browser; principle 5), and the focus moves to "Xác nhận". Built
 * with kit components only, no style (R10). Every kind of every ViewResult is
 * shown (i5-screens.md, Step I5.2).
 */
import {
  Button,
  ConfirmPanel,
  DescriptionList,
  EmptyState,
  Inline,
  InlineAlert,
  ItemList,
  LoadingIndicator,
  Section,
  Stack,
  SuccessNotice,
} from '../../../kit'
import type { PaymentListView, VoidOutcomeView, ViewResult } from '../../../logic/workflows/record_payment/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { usePaymentList, type PaymentListState } from './use_payment_list'

export function PaymentList({ params, navigate, notice }: PageProps<'payment_list'>) {
  const commissionId = params.commission_id
  const state = usePaymentList(commissionId)
  const back = () => navigate({ page: 'commission_detail', params: { commission_id: commissionId } }, null)
  const record = () => navigate({ page: 'payment_form', params: { commission_id: commissionId, title: params.title } }, null)

  return (
    <Section title="Thanh toán" level="page" gap="md">
      <Section title={params.title} level="group" gap="md">
        {/* The button row right under the titles, main action first (§7.2, principle 7). */}
        <Inline gap="sm">
          {state.list !== null && canRecord(state.list) ? (
            <Button label="Ghi khoản thanh toán" busyLabel="Ghi khoản thanh toán" busy={false} disabled={false} variant="primary" onClick={record} />
          ) : null}
          <Button label="Quay lại đơn hàng" busyLabel="Quay lại đơn hàng" busy={false} disabled={false} variant="secondary" onClick={back} />
          <Button label="Tải lại" busyLabel="Đang tải…" busy={state.loading} disabled={false} variant="secondary" onClick={state.reload} />
        </Inline>
        {/* The notice handed over by the previous page ("Đã ghi khoản thanh toán."). */}
        {notice === null ? null : <SuccessNotice text={notice} />}
        {state.voided === null ? null : <VoidedResult result={state.voided} />}
        {state.question === null ? null : <Question state={state} />}
        {state.loading ? <LoadingIndicator label="Đang tải các khoản thanh toán…" /> : null}
        {state.list === null ? null : <ListResult result={state.list} state={state} onRecord={record} />}
      </Section>
    </Section>
  )
}

// "Ghi khoản thanh toán" is offered only when the page has loaded and shows the payments.
function canRecord(list: ViewResult<PaymentListView>): boolean {
  switch (list.kind) {
    case 'ok':
      return true
    case 'rejected':
    case 'unreachable':
    case 'contract_violation':
      return false
    default:
      return assertNever(list)
  }
}

type ListResultProps = { result: ViewResult<PaymentListView>; state: PaymentListState; onRecord: () => void }

function ListResult({ result, state, onRecord }: ListResultProps) {
  switch (result.kind) {
    case 'ok': {
      const v = result.view
      return (
        <Stack gap="md">
          <DescriptionList label="Số dư đơn hàng" items={v.balance.lines.map((l) => ({ key: l.key, term: l.term, details: [l.text] }))} />
          {v.isEmpty ? (
            <EmptyState text={v.emptyText} action={{ label: 'Ghi khoản thanh toán', onClick: onRecord }} />
          ) : (
            <ItemList
              label="Danh sách khoản thanh toán"
              items={v.rows.map((row) => ({
                key: row.paymentId,
                text: row.text,
                detail: row.detailText,
                // While a question waits for its answer, or a voiding runs, the other buttons wait too.
                action: row.canVoid ? { label: 'Hủy khoản này', disabled: state.voiding || state.question !== null } : null,
              }))}
              emptyText={v.emptyText}
              onSelect={null}
              onAction={state.askVoid}
            />
          )}
        </Stack>
      )
    }
    case 'rejected':
      // 404: "Không tìm thấy đơn hàng này."; 409: the balance is beyond the range; 500.
      return <InlineAlert title="Không tải được các khoản thanh toán" text={result.message} />
    case 'unreachable':
      // "Tải lại" above repeats the same operation.
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}

// The question of "Hủy khoản này" while it waits: Services said the payment
// is not voided until confirmed (ok needs_confirmation).
function Question({ state }: { state: PaymentListState }) {
  const question = state.question
  if (question === null) return null
  const r = question.result
  switch (r.kind) {
    case 'ok':
      switch (r.view.outcome) {
        case 'needs_confirmation':
          return (
            <ConfirmPanel
              title="Xác nhận hủy khoản"
              text={r.view.message}
              confirmLabel="Xác nhận"
              confirmBusyLabel="Đang hủy…"
              cancelLabel="Quay lại"
              busy={state.voiding}
              onConfirm={state.confirmVoid}
              onCancel={state.dismissVoid}
            />
          )
        case 'voided':
          return null
        default:
          return assertNever(r.view)
      }
    case 'rejected':
    case 'unreachable':
    case 'contract_violation':
      return null
    default:
      return assertNever(r)
  }
}

// Result of a confirmed voiding: ok says it, and the list is read again (the
// hook); a failure is said, and the list stays as it was.
function VoidedResult({ result }: { result: ViewResult<VoidOutcomeView> }) {
  switch (result.kind) {
    case 'ok':
      switch (result.view.outcome) {
        case 'voided':
          return <SuccessNotice text={result.view.message} />
        case 'needs_confirmation':
          return null
        default:
          return assertNever(result.view)
      }
    case 'rejected':
      return <InlineAlert title="Chưa hủy được khoản này" text={result.message} />
    case 'unreachable':
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
