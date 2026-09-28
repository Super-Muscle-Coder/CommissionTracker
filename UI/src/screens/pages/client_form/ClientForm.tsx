/**
 * Page client_form (.design/ui_decomposition.md §5): add a client (mode
 * create) or edit one (mode edit). Main action "Lưu", with "Hủy", in the
 * button row right under the page title (§7.2, principle 7); "Hủy" goes back
 * to where the form was opened from. After a rejected save, the text cursor
 * moves to the first field in error (§7.2, principle 4). Built with kit components only, no style
 * (R10). Every kind of both ViewResults is shown (i5-screens.md, Step I5.2);
 * the draft always stays as typed.
 */
import { useCallback, type ReactNode } from 'react'
import { Button, FieldGroup, Inline, InlineAlert, LoadingIndicator, Section, Stack, TextArea, TextField } from '../../../kit'
import type { ClientFormView, SavedClientView, ViewResult } from '../../../logic/workflows/manage_client/routers'
import { assertNever } from '../../assert_never'
import type { PageProps, Route } from '../../navigation'
import { useClientForm, type ClientFormState } from './use_client_form'

export function ClientForm({ params, navigate }: PageProps<'client_form'>) {
  // Where "Hủy" goes, and where a saved client is shown.
  const backRoute: Route = params.mode === 'edit' ? { page: 'client_detail', params: { client_id: params.client_id } } : { page: 'client_list', params: null }
  const onSaved = useCallback(
    (view: SavedClientView) => navigate({ page: 'client_detail', params: { client_id: view.clientId } }, view.message),
    [navigate],
  )
  const form = useClientForm(params, onSaved)
  const cancel = () => navigate(backRoute, null)

  return (
    <Section title={params.mode === 'edit' ? 'Sửa khách hàng' : 'Thêm khách hàng'} level="page" gap="md">
      {form.opening ? <LoadingIndicator label="Đang mở thông tin khách hàng…" /> : null}
      {form.opened === null ? null : <OpenedResult result={form.opened} form={form} onCancel={cancel} />}
    </Section>
  )
}

function OpenedResult({ result, form, onCancel }: { result: ViewResult<ClientFormView>; form: ClientFormState; onCancel: () => void }) {
  const cancelButton = <Button label="Hủy" busyLabel="Hủy" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
  switch (result.kind) {
    case 'ok':
      return <FormBody suggestions={result.view.channelSuggestions} form={form} cancelButton={cancelButton} />
    case 'rejected':
      // 404 (edit mode): "Không tìm thấy khách hàng này.", with the way back.
      return (
        <Stack gap="md">
          <InlineAlert title="Không mở được khách hàng" text={result.message} />
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
function fieldErrorsOf(saved: ViewResult<SavedClientView> | null): Record<string, string> {
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

function FormBody({ suggestions, form, cancelButton }: { suggestions: readonly string[]; form: ClientFormState; cancelButton: ReactNode }) {
  const errors = fieldErrorsOf(form.saved)
  const error = (key: string) => errors[key] ?? null
  const { draft, saving } = form
  // The fields in the order they are on the screen: name, each contact row
  // (channel, then value), note. The first one with an error gets the text
  // cursor once per save result (§7.2, principle 4); the kit moves it.
  const fieldOrder = ['displayName', ...draft.contacts.flatMap((_, i) => [`contacts.${i}.channel`, `contacts.${i}.value`]), 'note']
  const firstError = fieldOrder.find((key) => key in errors) ?? null
  const focusRequest = (key: string) => (key === firstError ? form.saveCount : 0)
  return (
    <Stack gap="lg">
      {/* The button row right under the page title, main action first, as on every page (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Lưu" busyLabel="Đang lưu…" busy={saving} disabled={false} variant="primary" onClick={form.save} />
        {cancelButton}
      </Inline>
      {form.saved === null ? null : <SaveResult result={form.saved} />}
      <TextField
        id="client-display-name"
        label="Tên hiển thị"
        value={draft.displayName}
        onChange={form.setDisplayName}
        error={error('displayName')}
        disabled={saving}
        focusRequest={focusRequest('displayName')}
        suggestions={[]}
      />
      <FieldGroup legend="Liên hệ" gap="md">
        {draft.contacts.map((row, i) => (
          <Inline key={i} gap="sm">
            <TextField
              id={`client-contact-${i}-channel`}
              label={`Kênh ${i + 1}`}
              value={row.channel}
              onChange={(v) => form.setContact(i, 'channel', v)}
              error={error(`contacts.${i}.channel`)}
              disabled={saving}
              focusRequest={focusRequest(`contacts.${i}.channel`)}
              suggestions={suggestions}
            />
            <TextField
              id={`client-contact-${i}-value`}
              label={`Giá trị ${i + 1}`}
              value={row.value}
              onChange={(v) => form.setContact(i, 'value', v)}
              error={error(`contacts.${i}.value`)}
              disabled={saving}
              focusRequest={focusRequest(`contacts.${i}.value`)}
              suggestions={[]}
            />
            <Button label={`Bỏ liên hệ ${i + 1}`} busyLabel={`Bỏ liên hệ ${i + 1}`} busy={false} disabled={saving} variant="secondary" onClick={() => form.removeContact(i)} />
          </Inline>
        ))}
        <Button label="Thêm liên hệ" busyLabel="Thêm liên hệ" busy={false} disabled={saving} variant="secondary" onClick={form.addContact} />
      </FieldGroup>
      <TextArea id="client-note" label="Ghi chú" value={draft.note} onChange={form.setNote} error={error('note')} disabled={saving} focusRequest={focusRequest('note')} />
    </Stack>
  )
}

// Result of saving. ok moves to client_detail (the hook hands it to the page),
// so only failures stay on this page; the draft is kept and "Lưu" sends it again.
function SaveResult({ result }: { result: ViewResult<SavedClientView> }) {
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
