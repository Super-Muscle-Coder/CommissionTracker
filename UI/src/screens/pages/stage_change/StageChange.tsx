/**
 * Page stage_change (.design/ui_decomposition.md, "Chặng D3"): move one
 * commission to another stage, with a note. Page title "Đổi giai đoạn", the
 * commission's title under it (handed by commission_detail). Main action
 * "Lưu", with "Hủy", in the button row right under the titles (§7.2,
 * principle 7); after a rejected save the text cursor moves to the field in
 * error (principle 4). Moving to a stage that closes the commission is asked
 * first, inside the page (ConfirmPanel of the kit, never a dialog of the
 * system or the browser; principle 5); the focus then moves to "Xác nhận". A
 * commission already in a closed stage gets no form. Built with kit
 * components only, no style (R10). Every kind of every ViewResult is shown
 * (i5-screens.md, Step I5.2); the draft always stays as typed.
 */
import { useCallback } from 'react'
import {
  Button,
  ConfirmPanel,
  DescriptionList,
  EmptyState,
  Inline,
  InlineAlert,
  LoadingIndicator,
  Section,
  SelectField,
  Stack,
  TextArea,
} from '../../../kit'
import type { StageChangeOutcomeView, StageChangeView, ViewResult } from '../../../logic/workflows/update_progress/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useStageChange, type StageChangeState } from './use_stage_change'

export function StageChange({ params, navigate }: PageProps<'stage_change'>) {
  const commissionId = params.commission_id
  const onChanged = useCallback(
    (id: string, message: string) => navigate({ page: 'commission_detail', params: { commission_id: id } }, message),
    [navigate],
  )
  const form = useStageChange(commissionId, onChanged)
  const back = () => navigate({ page: 'commission_detail', params: { commission_id: commissionId } }, null)

  return (
    <Section title="Đổi giai đoạn" level="page" gap="md">
      <Section title={params.title} level="group" gap="md">
        {form.opening ? <LoadingIndicator label="Đang mở thông tin tiến độ…" /> : null}
        {form.opened === null ? null : <OpenedResult result={form.opened} form={form} onCancel={back} />}
      </Section>
    </Section>
  )
}

type OpenedResultProps = { result: ViewResult<StageChangeView>; form: StageChangeState; onCancel: () => void }

function OpenedResult({ result, form, onCancel }: OpenedResultProps) {
  switch (result.kind) {
    case 'ok':
      // Already in a closed stage: no form, only the way back.
      if (result.view.closed) {
        return (
          <Stack gap="md">
            <Inline gap="sm">
              <Button label="Quay lại" busyLabel="Quay lại" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
            </Inline>
            <EmptyState text={result.view.closedText ?? ''} action={null} />
          </Stack>
        )
      }
      return <FormBody view={result.view} form={form} onCancel={onCancel} />
    case 'rejected':
      // 404: "Không tìm thấy đơn hàng này.", with the way back.
      return (
        <Stack gap="md">
          <InlineAlert title="Không mở được đơn hàng" text={result.message} />
          <Inline gap="sm">
            <Button label="Quay lại" busyLabel="Quay lại" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
          </Inline>
        </Stack>
      )
    case 'unreachable':
      return (
        <Stack gap="md">
          <InlineAlert title="Không kết nối được" text={result.message} />
          <Inline gap="sm">
            <Button label="Thử lại" busyLabel="Đang mở…" busy={form.opening} disabled={false} variant="primary" onClick={form.reopen} />
            <Button label="Hủy" busyLabel="Hủy" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
          </Inline>
        </Stack>
      )
    case 'contract_violation':
      return (
        <Stack gap="md">
          <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
          <Inline gap="sm">
            <Button label="Hủy" busyLabel="Hủy" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
          </Inline>
        </Stack>
      )
    default:
      return assertNever(result)
  }
}

// What the last save left on the page: field errors, and whether a
// confirmation is waiting for an answer.
function savedState(saved: ViewResult<StageChangeOutcomeView> | null): { fieldErrors: Record<string, string>; asking: boolean } {
  if (saved === null) return { fieldErrors: {}, asking: false }
  switch (saved.kind) {
    case 'ok':
      switch (saved.view.outcome) {
        case 'needs_confirmation':
          return { fieldErrors: {}, asking: true }
        case 'changed':
          return { fieldErrors: {}, asking: false }
        default:
          return assertNever(saved.view)
      }
    case 'rejected':
      return { fieldErrors: saved.fieldErrors, asking: false }
    case 'unreachable':
    case 'contract_violation':
      return { fieldErrors: {}, asking: false }
    default:
      return assertNever(saved)
  }
}

function FormBody({ view, form, onCancel }: { view: StageChangeView; form: StageChangeState; onCancel: () => void }) {
  const { draft, saving, setField } = form
  const { fieldErrors, asking } = savedState(form.saved)
  // While the confirmation waits for an answer, the draft it is about cannot change.
  const locked = saving || asking
  return (
    <Stack gap="lg">
      {/* The button row right under the titles, main action first, as on every page (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Lưu" busyLabel="Đang lưu…" busy={saving && !asking} disabled={asking} variant="primary" onClick={() => form.save(false)} />
        <Button label="Hủy" busyLabel="Hủy" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
      </Inline>
      {form.saved === null ? null : <SaveResult result={form.saved} form={form} />}
      <DescriptionList label="Tiến độ hiện tại" items={[{ key: 'current', term: 'Giai đoạn hiện tại', details: [view.currentStageText] }]} />
      <SelectField
        id="stage-change-to"
        label="Giai đoạn mới"
        value={draft.toStage}
        options={view.choices}
        placeholder={view.chooseLabel}
        onChange={(v) => setField('toStage', v)}
        error={fieldErrors.to_stage ?? null}
        disabled={locked}
        // The only field that can be in error: it gets the text cursor once per save result (principle 4).
        focusRequest={'to_stage' in fieldErrors ? form.saveCount : 0}
      />
      <TextArea
        id="stage-change-note"
        label="Ghi chú"
        value={draft.note}
        onChange={(v) => setField('note', v)}
        error={fieldErrors.note ?? null}
        disabled={locked}
        focusRequest={0}
      />
    </Stack>
  )
}

// Result of "Lưu" or "Xác nhận". A changed stage moves to commission_detail
// (the hook hands it to the page); a closing stage waits for the answer to
// the confirmation; failures stay here, the draft kept, "Lưu" sends again.
function SaveResult({ result, form }: { result: ViewResult<StageChangeOutcomeView>; form: StageChangeState }) {
  switch (result.kind) {
    case 'ok':
      switch (result.view.outcome) {
        case 'needs_confirmation':
          return (
            <ConfirmPanel
              title="Xác nhận đổi giai đoạn"
              text={result.view.message}
              confirmLabel="Xác nhận"
              confirmBusyLabel="Đang lưu…"
              cancelLabel="Quay lại"
              busy={form.saving}
              onConfirm={() => form.save(true)}
              onCancel={form.dismiss}
            />
          )
        case 'changed':
          return null
        default:
          return assertNever(result.view)
      }
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
