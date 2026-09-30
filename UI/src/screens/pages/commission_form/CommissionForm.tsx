/**
 * Page commission_form (.design/ui_decomposition.md, "Chặng D2"): add a
 * commission (mode create) or edit one (mode edit). Main action "Lưu", with
 * "Hủy", in the button row right under the page title (§7.2, principle 7);
 * "Hủy" goes back to where the form was opened from. After a rejected save,
 * the text cursor moves to the first field in error, in the order of the
 * fields on the screen (§7.2, principle 4). In edit mode the currency cannot
 * be chosen (fixed at creation). With no active client (create mode), an
 * empty state leads to adding a client. Built with kit components only, no
 * style (R10). Every kind of every ViewResult is shown (i5-screens.md, Step
 * I5.2); the draft always stays as typed.
 */
import { useCallback, type ReactNode } from 'react'
import {
  Button,
  DateField,
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
import type { ClientChoicesView, CommissionFormView, SavedCommissionView, ViewResult } from '../../../logic/workflows/manage_commission/routers'
import { assertNever } from '../../assert_never'
import type { Navigate, PageProps, Route } from '../../navigation'
import { useCommissionForm, type CommissionFormState } from './use_commission_form'

// The fields in the order they are on the screen, by the contract's field
// names that Routers keys its errors with (ui_decomposition.md D2, "Các ô").
const FIELD_ORDER = [
  'client_id',
  'title',
  'commission_type',
  'agreed_price.amount_minor',
  'agreed_price.currency',
  'deadline',
  'description',
  'reference_links',
] as const

export function CommissionForm({ params, navigate }: PageProps<'commission_form'>) {
  // Where "Hủy" goes, and where a saved commission is shown.
  const backRoute: Route =
    params.mode === 'edit' ? { page: 'commission_detail', params: { commission_id: params.commission_id } } : { page: 'commission_list', params: null }
  const onSaved = useCallback(
    (view: SavedCommissionView) => navigate({ page: 'commission_detail', params: { commission_id: view.commissionId } }, view.message),
    [navigate],
  )
  const form = useCommissionForm(params, onSaved)
  const cancel = () => navigate(backRoute, null)

  return (
    <Section title={params.mode === 'edit' ? 'Sửa đơn hàng' : 'Thêm đơn hàng'} level="page" gap="md">
      {form.opening ? <LoadingIndicator label="Đang mở thông tin đơn hàng…" /> : null}
      {form.opened === null ? null : <OpenedResult result={form.opened} form={form} onCancel={cancel} navigate={navigate} />}
    </Section>
  )
}

type OpenedResultProps = { result: ViewResult<CommissionFormView>; form: CommissionFormState; onCancel: () => void; navigate: Navigate }

function OpenedResult({ result, form, onCancel, navigate }: OpenedResultProps) {
  const cancelButton = <Button label="Hủy" busyLabel="Hủy" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
  switch (result.kind) {
    case 'ok':
      // No active client to create a commission for: the next step is adding one (§7.2, principle 6).
      if (result.view.noActiveClient) {
        return (
          <Stack gap="md">
            <Inline gap="sm">{cancelButton}</Inline>
            <EmptyState
              text="Chưa có khách hàng đang hoạt động. Thêm khách hàng trước khi tạo đơn."
              action={{ label: 'Thêm khách hàng', onClick: () => navigate({ page: 'client_form', params: { mode: 'create' } }, null) }}
            />
          </Stack>
        )
      }
      return <FormBody view={result.view} form={form} cancelButton={cancelButton} />
    case 'rejected':
      // 404 (edit mode): "Không tìm thấy đơn hàng này.", with the way back.
      return (
        <Stack gap="md">
          <InlineAlert title="Không mở được đơn hàng" text={result.message} />
          <Inline gap="sm">{cancelButton}</Inline>
        </Stack>
      )
    case 'unreachable':
      return (
        <Stack gap="md">
          <InlineAlert title="Không kết nối được" text={result.message} />
          <Inline gap="sm">
            <Button label="Thử lại" busyLabel="Đang mở…" busy={form.opening} disabled={false} variant="primary" onClick={form.reopen} />
            {cancelButton}
          </Inline>
        </Stack>
      )
    case 'contract_violation':
      return (
        <Stack gap="md">
          <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
          <Inline gap="sm">{cancelButton}</Inline>
        </Stack>
      )
    default:
      return assertNever(result)
  }
}

// Field errors of the last save: only a rejection carries them.
function fieldErrorsOf(saved: ViewResult<SavedCommissionView> | null): Record<string, string> {
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

function FormBody({ view, form, cancelButton }: { view: CommissionFormView; form: CommissionFormState; cancelButton: ReactNode }) {
  const errors = fieldErrorsOf(form.saved)
  const error = (key: string) => errors[key] ?? null
  const { draft, saving, setField } = form
  // The first field with an error gets the text cursor once per save result
  // (§7.2, principle 4); the kit moves it.
  const firstError = FIELD_ORDER.find((key) => key in errors) ?? null
  const focusRequest = (key: (typeof FIELD_ORDER)[number]) => (key === firstError ? form.saveCount : 0)
  const clients = form.clients ?? view.clients
  return (
    <Stack gap="lg">
      {/* The button row right under the page title, main action first, as on every page (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Lưu" busyLabel="Đang lưu…" busy={saving} disabled={false} variant="primary" onClick={form.save} />
        {cancelButton}
      </Inline>
      {form.saved === null ? null : <SaveResult result={form.saved} />}
      {form.clientsReload === null ? null : <ClientsReloadResult result={form.clientsReload} />}
      <SelectField
        id="commission-client"
        label="Khách hàng"
        value={draft.clientId}
        options={clients.choices}
        placeholder={view.chooseClientLabel}
        onChange={(v) => setField('clientId', v)}
        hint={null}
        error={error('client_id')}
        disabled={saving}
        focusRequest={focusRequest('client_id')}
      />
      <TextField
        id="commission-title"
        label="Tiêu đề"
        value={draft.title}
        onChange={(v) => setField('title', v)}
        error={error('title')}
        disabled={saving}
        focusRequest={focusRequest('title')}
        suggestions={[]}
      />
      <TextField
        id="commission-type"
        label="Loại tranh"
        value={draft.commissionType}
        onChange={(v) => setField('commissionType', v)}
        error={error('commission_type')}
        disabled={saving}
        focusRequest={focusRequest('commission_type')}
        suggestions={view.commissionTypeSuggestions}
      />
      <Inline gap="sm">
        <TextField
          id="commission-amount"
          label="Giá thỏa thuận"
          value={draft.amount}
          onChange={(v) => setField('amount', v)}
          error={error('agreed_price.amount_minor')}
          disabled={saving}
          focusRequest={focusRequest('agreed_price.amount_minor')}
          suggestions={[]}
        />
        {/* Edit mode: the currency is fixed at creation — shown, not choosable. */}
        <SelectField
          id="commission-currency"
          label="Đơn vị tiền"
          value={draft.currency}
          options={view.currencies}
          placeholder={null}
          onChange={(v) => setField('currency', v)}
          hint={null}
          error={error('agreed_price.currency')}
          disabled={saving || view.currencyLocked}
          focusRequest={focusRequest('agreed_price.currency')}
        />
      </Inline>
      <DateField
        id="commission-deadline"
        label="Hạn giao"
        value={draft.deadline}
        onChange={(v) => setField('deadline', v)}
        clearLabel="Xóa hạn giao"
        error={error('deadline')}
        disabled={saving}
        focusRequest={focusRequest('deadline')}
      />
      <TextArea
        id="commission-description"
        label="Mô tả"
        value={draft.description}
        onChange={(v) => setField('description', v)}
        error={error('description')}
        disabled={saving}
        focusRequest={focusRequest('description')}
      />
      <TextArea
        id="commission-links"
        label="Liên kết tham khảo (mỗi dòng một liên kết)"
        value={draft.referenceLinks}
        onChange={(v) => setField('referenceLinks', v)}
        error={error('reference_links')}
        disabled={saving}
        focusRequest={focusRequest('reference_links')}
      />
    </Stack>
  )
}

// Result of saving. ok moves to commission_detail (the hook hands it to the
// page), so only failures stay on this page; the draft is kept and "Lưu" sends it again.
function SaveResult({ result }: { result: ViewResult<SavedCommissionView> }) {
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

// Result of offering the clients again after a refused save. ok: the list of
// "Khách hàng" is updated, nothing more to say (the save message above says
// to choose again); a failure is said, and "Lưu" can still be pressed.
function ClientsReloadResult({ result }: { result: ViewResult<ClientChoicesView> }) {
  switch (result.kind) {
    case 'ok':
      return null
    case 'rejected':
      return <InlineAlert title="Không tải lại được danh sách khách hàng" text={result.message} />
    case 'unreachable':
      return <InlineAlert title="Không tải lại được danh sách khách hàng" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
