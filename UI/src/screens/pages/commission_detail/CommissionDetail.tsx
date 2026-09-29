/**
 * Page commission_detail (.design/ui_decomposition.md, "Chặng D2"): one
 * commission and its client; main action "Sửa" (opens commission_form in edit
 * mode); back to the list. Reference links are plain text, selectable and
 * copyable, never opened: the desktop app blocks navigation and the contract
 * has no entry to open an outside browser. No progress stage (D3), no
 * payment (D4). Built with kit components only, no style (R10). Every kind
 * of the ViewResult is shown (i5-screens.md, Step I5.2).
 */
import { Button, DescriptionList, Inline, InlineAlert, LoadingIndicator, Section, Stack, SuccessNotice } from '../../../kit'
import type { CommissionDetailView, ViewResult } from '../../../logic/workflows/manage_commission/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useCommissionDetail } from './use_commission_detail'

export function CommissionDetail({ params, navigate, notice }: PageProps<'commission_detail'>) {
  const commissionId = params.commission_id
  const { detail, loading, reload } = useCommissionDetail(commissionId)
  const back = () => navigate({ page: 'commission_list', params: null }, null)
  const edit = () => navigate({ page: 'commission_form', params: { mode: 'edit', commission_id: commissionId } }, null)

  return (
    <Section title="Chi tiết đơn hàng" level="page" gap="md">
      {/* The notice handed over by the previous page ("Đã thêm đơn hàng.", "Đã lưu thay đổi."). */}
      {notice === null ? null : <SuccessNotice text={notice} />}
      {loading ? <LoadingIndicator label="Đang tải thông tin đơn hàng…" /> : null}
      {detail === null ? null : <DetailResult result={detail} onEdit={edit} onBack={back} onRetry={reload} retrying={loading} />}
    </Section>
  )
}

type DetailResultProps = {
  result: ViewResult<CommissionDetailView>
  onEdit: () => void
  onBack: () => void
  onRetry: () => void
  retrying: boolean
}

function DetailResult({ result, onEdit, onBack, onRetry, retrying }: DetailResultProps) {
  const backButton = <Button label="Quay lại danh sách" busyLabel="Quay lại danh sách" busy={false} disabled={false} variant="secondary" onClick={onBack} />
  switch (result.kind) {
    case 'ok': {
      const v = result.view
      return (
        <Section title={v.title} level="group" gap="md">
          <Inline gap="sm">
            <Button label="Sửa" busyLabel="Sửa" busy={false} disabled={false} variant="primary" onClick={onEdit} />
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
