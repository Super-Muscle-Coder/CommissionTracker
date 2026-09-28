/**
 * Page client_detail (.design/ui_decomposition.md §5): one client; main
 * action "Sửa" (opens client_form in edit mode); archive or unarchive (no
 * confirmation: it can be undone, §7.2 principle 5); back to the list. Built
 * with kit components only, no style (R10). Every kind of both ViewResults is
 * shown (i5-screens.md, Step I5.2).
 */
import { Button, DescriptionList, Inline, InlineAlert, LoadingIndicator, Section, Stack, SuccessNotice } from '../../../kit'
import type { ArchivedClientView, ClientDetailView, ViewResult } from '../../../logic/workflows/manage_client/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useClientDetail } from './use_client_detail'

export function ClientDetail({ params, navigate, notice }: PageProps<'client_detail'>) {
  const clientId = params.client_id
  const { detail, loading, reload, archive, archiving, setArchived } = useClientDetail(clientId)
  const back = () => navigate({ page: 'client_list', params: null }, null)
  const edit = () => navigate({ page: 'client_form', params: { mode: 'edit', client_id: clientId } }, null)

  return (
    <Section title="Chi tiết khách hàng" level="page" gap="md">
      {/* The notice handed over by the previous page, until this page has its own result. */}
      {notice === null || archive !== null ? null : <SuccessNotice text={notice} />}
      {loading ? <LoadingIndicator label="Đang tải thông tin khách hàng…" /> : null}
      {detail === null ? null : (
        <DetailResult
          result={detail}
          archive={archive}
          archiving={archiving}
          onEdit={edit}
          onArchive={setArchived}
          onBack={back}
          onRetry={reload}
          retrying={loading}
        />
      )}
    </Section>
  )
}

type DetailResultProps = {
  result: ViewResult<ClientDetailView>
  archive: ViewResult<ArchivedClientView> | null
  archiving: boolean
  onEdit: () => void
  onArchive: (archived: boolean) => void
  onBack: () => void
  onRetry: () => void
  retrying: boolean
}

function DetailResult({ result, archive, archiving, onEdit, onArchive, onBack, onRetry, retrying }: DetailResultProps) {
  const backButton = <Button label="Quay lại danh sách" busyLabel="Quay lại danh sách" busy={false} disabled={false} variant="secondary" onClick={onBack} />
  switch (result.kind) {
    case 'ok': {
      const v = result.view
      return (
        <Stack gap="md">
          <Section title={v.name} level="group" gap="md">
            <Inline gap="sm">
              <Button label="Sửa" busyLabel="Sửa" busy={false} disabled={archiving} variant="primary" onClick={onEdit} />
              {v.isArchived ? (
                <Button label="Bỏ lưu trữ" busyLabel="Đang bỏ lưu trữ…" busy={archiving} disabled={false} variant="secondary" onClick={() => onArchive(false)} />
              ) : (
                <Button label="Lưu trữ khách hàng" busyLabel="Đang lưu trữ…" busy={archiving} disabled={false} variant="secondary" onClick={() => onArchive(true)} />
              )}
              {backButton}
            </Inline>
            {archive === null ? null : <ArchiveResult result={archive} />}
            <DescriptionList
              label="Thông tin khách hàng"
              items={[
                { key: 'status', term: 'Trạng thái', details: [v.statusText] },
                ...(v.contactLines.length === 0 ? [] : [{ key: 'contacts', term: 'Liên hệ', details: v.contactLines }]),
                ...(v.note === null ? [] : [{ key: 'note', term: 'Ghi chú', details: [v.note] }]),
                { key: 'created', term: 'Ngày tạo', details: [v.createdText] },
                { key: 'updated', term: 'Sửa lần cuối', details: [v.updatedText] },
              ]}
            />
          </Section>
        </Stack>
      )
    }
    case 'rejected':
      // 404: "Không tìm thấy khách hàng này." (message from Services), with the way back.
      return (
        <Stack gap="md">
          <InlineAlert title="Không mở được khách hàng" text={result.message} />
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

// Result of archiving or unarchiving. The archive button above stays
// pressable, so after "không kết nối được" pressing it again repeats the operation.
function ArchiveResult({ result }: { result: ViewResult<ArchivedClientView> }) {
  switch (result.kind) {
    case 'ok':
      return <SuccessNotice text={result.view.message} />
    case 'rejected':
      return <InlineAlert title="Chưa đổi được trạng thái lưu trữ" text={result.message} />
    case 'unreachable':
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
