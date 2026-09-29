/**
 * Page commission_detail (.design/ui_decomposition.md, "Chặng D2", and from D3
 * "Sửa trang commission_detail"): one commission and its client; main action
 * "Sửa" (opens commission_form in edit mode); back to the list. Reference
 * links are plain text, selectable and copyable, never opened: the desktop
 * app blocks navigation and the contract has no entry to open an outside
 * browser. From D3, a "Tiến độ" part under the commission's entries: the
 * current stage and the history, from the Routers of update_progress, with
 * its own hook, load and errors (a failure there leaves the commission part
 * as it is); the two parts are only placed side by side, never joined.
 * "Đổi giai đoạn" (secondary, after "Sửa") opens stage_change, only once the
 * part has loaded and the stage is not closed. No payment (D4). Built with
 * kit components only, no style (R10). Every kind of every ViewResult is
 * shown (i5-screens.md, Step I5.2).
 */
import { Button, DescriptionList, EmptyState, Inline, InlineAlert, LoadingIndicator, Section, Stack, SuccessNotice } from '../../../kit'
import type { CommissionDetailView, ViewResult } from '../../../logic/workflows/manage_commission/routers'
import type { CommissionProgressView } from '../../../logic/workflows/update_progress/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useCommissionDetail } from './use_commission_detail'
import { useCommissionProgress, type CommissionProgressState } from './use_commission_progress'

export function CommissionDetail({ params, navigate, notice }: PageProps<'commission_detail'>) {
  const commissionId = params.commission_id
  const { detail, loading, reload } = useCommissionDetail(commissionId)
  const progress = useCommissionProgress(commissionId)
  const back = () => navigate({ page: 'commission_list', params: null }, null)
  const edit = () => navigate({ page: 'commission_form', params: { mode: 'edit', commission_id: commissionId } }, null)
  const changeStage = (title: string) => navigate({ page: 'stage_change', params: { commission_id: commissionId, title } }, null)

  return (
    <Section title="Chi tiết đơn hàng" level="page" gap="md">
      {/* The notice handed over by the previous page ("Đã thêm đơn hàng.", "Đã lưu thay đổi.", "Đã đổi giai đoạn sang …"). */}
      {notice === null ? null : <SuccessNotice text={notice} />}
      {loading ? <LoadingIndicator label="Đang tải thông tin đơn hàng…" /> : null}
      {detail === null ? null : (
        <DetailResult result={detail} progress={progress} onEdit={edit} onChangeStage={changeStage} onBack={back} onRetry={reload} retrying={loading} />
      )}
    </Section>
  )
}

type DetailResultProps = {
  result: ViewResult<CommissionDetailView>
  progress: CommissionProgressState
  onEdit: () => void
  onChangeStage: (title: string) => void
  onBack: () => void
  onRetry: () => void
  retrying: boolean
}

// "Đổi giai đoạn" is offered only when the "Tiến độ" part has loaded (not
// while it loads or after it failed) and its stage is not closed (D3).
function stageCanChange(progress: CommissionProgressState): boolean {
  if (progress.loading || progress.progress === null) return false
  switch (progress.progress.kind) {
    case 'ok':
      return !progress.progress.view.closed
    case 'rejected':
    case 'unreachable':
    case 'contract_violation':
      return false
    default:
      return assertNever(progress.progress)
  }
}

function DetailResult({ result, progress, onEdit, onChangeStage, onBack, onRetry, retrying }: DetailResultProps) {
  const backButton = <Button label="Quay lại danh sách" busyLabel="Quay lại danh sách" busy={false} disabled={false} variant="secondary" onClick={onBack} />
  switch (result.kind) {
    case 'ok': {
      const v = result.view
      return (
        <Section title={v.title} level="group" gap="md">
          <Inline gap="sm">
            <Button label="Sửa" busyLabel="Sửa" busy={false} disabled={false} variant="primary" onClick={onEdit} />
            {stageCanChange(progress) ? (
              <Button label="Đổi giai đoạn" busyLabel="Đổi giai đoạn" busy={false} disabled={false} variant="secondary" onClick={() => onChangeStage(v.title)} />
            ) : null}
            {backButton}
          </Inline>
          <DescriptionList
            label="Thông tin đơn hàng"
            items={[
              { key: 'client', term: 'Khách hàng', details: [v.clientText] },
              ...(v.commissionType === null ? [] : [{ key: 'type', term: 'Loại tranh', details: [v.commissionType] }]),
              { key: 'price', term: 'Giá thỏa thuận', details: [v.priceText] },
              { key: 'deadline', term: 'Hạn giao', details: [v.deadlineText] },
              ...(v.description === null ? [] : [{ key: 'description', term: 'Mô tả', details: [v.description] }]),
              ...(v.referenceLinks.length === 0 ? [] : [{ key: 'links', term: 'Liên kết tham khảo', details: v.referenceLinks }]),
              { key: 'created', term: 'Ngày tạo', details: [v.createdText] },
              { key: 'updated', term: 'Sửa lần cuối', details: [v.updatedText] },
            ]}
          />
          <ProgressPart state={progress} />
        </Section>
      )
    }
    case 'rejected':
      // 404: "Không tìm thấy đơn hàng này." (message from Services), with the way back.
      return (
        <Stack gap="md">
          <InlineAlert title="Không mở được đơn hàng" text={result.message} />
          <Inline gap="sm">{backButton}</Inline>
        </Stack>
      )
    case 'unreachable':
      return (
        <Stack gap="md">
          <InlineAlert title="Không kết nối được" text={result.message} />
          <Inline gap="sm">
            <Button label="Thử lại" busyLabel="Đang tải…" busy={retrying} disabled={false} variant="primary" onClick={onRetry} />
            {backButton}
          </Inline>
        </Stack>
      )
    case 'contract_violation':
      return (
        <Stack gap="md">
          <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
          <Inline gap="sm">{backButton}</Inline>
        </Stack>
      )
    default:
      return assertNever(result)
  }
}

// The "Tiến độ" part: loaded on its own; its errors stay inside it, with its
// own "Thử lại" (D3: 404, 500, unreachable, contract violation).
function ProgressPart({ state }: { state: CommissionProgressState }) {
  return (
    <Section title="Tiến độ" level="group" gap="sm">
      {state.loading ? <LoadingIndicator label="Đang tải tiến độ…" /> : null}
      {state.progress === null ? null : <ProgressResult result={state.progress} onRetry={state.reload} retrying={state.loading} />}
    </Section>
  )
}

function ProgressResult({ result, onRetry, retrying }: { result: ViewResult<CommissionProgressView>; onRetry: () => void; retrying: boolean }) {
  const retry = (
    <Inline gap="sm">
      <Button label="Thử lại" busyLabel="Đang tải…" busy={retrying} disabled={false} variant="secondary" onClick={onRetry} />
    </Inline>
  )
  switch (result.kind) {
    case 'ok': {
      const p = result.view
      return (
        <Stack gap="sm">
          <DescriptionList
            label="Tiến độ đơn hàng"
            items={[
              { key: 'stage', term: 'Giai đoạn hiện tại', details: [p.stageText, p.updatedText] },
              { key: 'history', term: 'Lịch sử', details: p.historyLines.length === 0 ? [p.noHistoryText] : p.historyLines },
            ]}
          />
          {p.closedText === null ? null : <EmptyState text={p.closedText} action={null} />}
        </Stack>
      )
    }
    case 'rejected':
      return (
        <Stack gap="sm">
          <InlineAlert title="Không tải được tiến độ" text={result.message} />
          {retry}
        </Stack>
      )
    case 'unreachable':
      return (
        <Stack gap="sm">
          <InlineAlert title="Không kết nối được" text={result.message} />
          {retry}
        </Stack>
      )
    case 'contract_violation':
      return (
        <Stack gap="sm">
          <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
          {retry}
        </Stack>
      )
    default:
      return assertNever(result)
  }
}
