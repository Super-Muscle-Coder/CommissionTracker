/**
 * Page payment_form (.design/ui_decomposition.md, "Chặng D4"): record one
 * payment received or refunded for a commission. Page title "Ghi khoản thanh
 * toán", the commission's title under it (handed by payment_list). Main action
 * "Lưu", with "Hủy", in the button row right under the titles (§7.2,
 * principle 7); "Hủy" goes back to payment_list. After a rejected save, the
 * text cursor moves to the first field in error, in the order of the fields
 * on the screen (principle 4). The currency of the payment is the
 * commission's and cannot be chosen; a currency the interface does not know
 * gets no form. Built with kit components only, no style (R10). Every kind of
 * every ViewResult is shown (i5-screens.md, Step I5.2); the draft always stays
 * as typed.
 */
import { useCallback } from 'react'
import {
  Button,
  DateTimeField,
  EmptyState,
  Inline,
  InlineAlert,
  LoadingIndicator,
  Section,
  SelectField,
  Stack,
  TextArea,
  TextField,
} from '../../../kit'
import type { PaymentFormView, SavedPaymentView, ViewResult } from '../../../logic/workflows/record_payment/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { usePaymentForm, type PaymentFormState } from './use_payment_form'

// The fields in the order they are on the screen, by the contract's field
// names that Routers keys its errors with (ui_decomposition.md D4, "Các ô").
const FIELD_ORDER = ['direction', 'kind', 'amount.amount_minor', 'method', 'paid_at', 'note'] as const

export function PaymentForm({ params, navigate }: PageProps<'payment_form'>) {
  const commissionId = params.commission_id
  // Where "Hủy" goes, and where a saved payment is shown.
  const toList = useCallback(
    (notice: string | null) => navigate({ page: 'payment_list', params: { commission_id: commissionId, title: params.title } }, notice),
    [navigate, commissionId, params.title],
  )
  const onSaved = useCallback((view: SavedPaymentView) => toList(view.message), [toList])
  const form = usePaymentForm(commissionId, onSaved)
  const cancel = () => toList(null)

  return (
    <Section title="Ghi khoản thanh toán" level="page" gap="md">
      <Section title={params.title} level="group" gap="md">
        {form.opening ? <LoadingIndicator label="Đang mở thông tin đơn hàng…" /> : null}
        {form.opened === null ? null : <OpenedResult result={form.opened} form={form} onCancel={cancel} />}
      </Section>
    </Section>
  )
}

type OpenedResultProps = { result: ViewResult<PaymentFormView>; form: PaymentFormState; onCancel: () => void }

function OpenedResult({ result, form, onCancel }: OpenedResultProps) {
  const back = <Button label="Quay lại" busyLabel="Quay lại" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
  switch (result.kind) {
    case 'ok':
      // A currency the interface does not know: no form, only the way back.
      if (!result.view.supported) {
        return (
          <Stack gap="md">
            <Inline gap="sm">{back}</Inline>
            <EmptyState text={result.view.unsupportedText} action={null} />
          </Stack>
        )
      }
      return <FormBody view={result.view} form={form} onCancel={onCancel} />
    case 'rejected':
      // 404: "Không tìm thấy đơn hàng này.", with the way back.
      return (
        <Stack gap="md">
          <InlineAlert title="Không mở được đơn hàng" text={result.message} />
          <Inline gap="sm">{back}</Inline>
        </Stack>
      )
    case 'unreachable':
      return (
        <Stack gap="md">
          <InlineAlert title="Không kết nối được" text={result.message} />
          <Inline gap="sm">
            <Button label="Thử lại" busyLabel="Đang mở…" busy={form.opening} disabled={false} variant="primary" onClick={form.reopen} />
            {back}
          </Inline>
        </Stack>
      )
    case 'contract_violation':
      return (
        <Stack gap="md">
          <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
          <Inline gap="sm">{back}</Inline>
        </Stack>
      )
    default:
      return assertNever(result)
  }
}

// Field errors of the last save: only a rejection carries them.
function fieldErrorsOf(saved: ViewResult<SavedPaymentView> | null): Record<string, string> {
  if (saved === null) return {}
  switch (saved.kind) {
    case 'rejected':
      return saved.fieldErrors
    case 'ok':
    case 'unreachable':
    case 'contract_violation':
      return {}
    default:
      return assertNever(saved)
  }
}

type SupportedView = Extract<PaymentFormView, { supported: true }>

function FormBody({ view, form, onCancel }: { view: SupportedView; form: PaymentFormState; onCancel: () => void }) {
  const errors = fieldErrorsOf(form.saved)
  const error = (field: string) => errors[field] ?? null
  const { draft, saving, setField } = form
  // The first field with an error gets the text cursor once per save result
  // (§7.2, principle 4); the kit moves it.
  const firstError = FIELD_ORDER.find((field) => field in errors) ?? null
  const focusRequest = (field: (typeof FIELD_ORDER)[number]) => (field === firstError ? form.saveCount : 0)
  return (
    <Stack gap="lg">
      {/* The button row right under the titles, main action first, as on every page (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Lưu" busyLabel="Đang lưu…" busy={saving} disabled={false} variant="primary" onClick={form.save} />
        <Button label="Hủy" busyLabel="Hủy" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
      </Inline>
      {form.saved === null ? null : <SaveResult result={form.saved} />}
      <SelectField
        id="payment-direction"
        label="Loại giao dịch"
        value={draft.direction}
        options={view.directionChoices}
        placeholder={null}
        onChange={(v) => setField('direction', v)}
        hint={null}
        error={error('direction')}
        disabled={saving}
        focusRequest={focusRequest('direction')}
      />
      <SelectField
        id="payment-kind"
        label="Khoản"
        value={draft.paymentKind}
        options={view.kindChoices}
        placeholder={view.chooseKindLabel}
        onChange={(v) => setField('paymentKind', v)}
        hint="Tiền tip không làm giảm số còn phải thu."
        error={error('kind')}
        disabled={saving}
        focusRequest={focusRequest('kind')}
      />
      <Inline gap="sm">
        <TextField
          id="payment-amount"
          label="Số tiền"
          value={draft.amount}
          onChange={(v) => setField('amount', v)}
          error={error('amount.amount_minor')}
          disabled={saving}
          focusRequest={focusRequest('amount.amount_minor')}
          suggestions={[]}
        />
        {/* The currency is the commission's: shown, not choosable. */}
        <SelectField
          id="payment-currency"
          label="Đơn vị tiền"
          value={view.currencyText}
          options={[{ value: view.currencyText, label: view.currencyText }]}
          placeholder={null}
          onChange={() => {}}
          hint={null}
          error={null}
          disabled
          focusRequest={0}
        />
      </Inline>
      <TextField
        id="payment-method"
        label="Phương thức"
        value={draft.method}
        onChange={(v) => setField('method', v)}
        error={error('method')}
        disabled={saving}
        focusRequest={focusRequest('method')}
        suggestions={view.methodSuggestions}
      />
      <DateTimeField
        id="payment-paid-at"
        label="Ngày giờ nhận tiền"
        value={draft.paidAtLocal}
        onChange={(v) => setField('paidAtLocal', v)}
        error={error('paid_at')}
        disabled={saving}
        focusRequest={focusRequest('paid_at')}
      />
      <TextArea
        id="payment-note"
        label="Ghi chú"
        value={draft.note}
        onChange={(v) => setField('note', v)}
        error={error('note')}
        disabled={saving}
        focusRequest={focusRequest('note')}
      />
    </Stack>
  )
}

// Result of saving. ok moves to payment_list (the hook hands it to the
// page), so only failures stay on this page; the draft is kept and "Lưu"
// sends it again.
function SaveResult({ result }: { result: ViewResult<SavedPaymentView> }) {
  switch (result.kind) {
    case 'ok':
      return null
    case 'rejected':
      return <InlineAlert title="Chưa lưu được" text={result.message} />
    case 'unreachable':
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
