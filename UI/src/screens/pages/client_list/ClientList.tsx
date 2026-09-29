/**
 * Page client_list (.design/ui_decomposition.md §5): the client list; its
 * main action "Thêm khách hàng" opens client_form (create); pressing a client
 * opens client_detail. Built with kit components only, no style (R10). Every
 * kind of the ViewResult is shown (i5-screens.md, Step I5.2).
 */
import { Button, EmptyState, InlineAlert, Inline, ItemList, LoadingIndicator, Section, Stack, SuccessNotice } from '../../../kit'
import type { ClientListView, ClientRowView, ViewResult } from '../../../logic/workflows/manage_client/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useClientList } from './use_client_list'

export function ClientList({ navigate, notice }: PageProps<'client_list'>) {
  const { result, loading, reload } = useClientList()
  const add = () => navigate({ page: 'client_form', params: { mode: 'create' } }, null)
  const open = (clientId: string) => navigate({ page: 'client_detail', params: { client_id: clientId } }, null)
  return (
    <Section title="Khách hàng" level="page" gap="md">
      <Inline gap="sm">
        <Button label="Thêm khách hàng" busyLabel="Thêm khách hàng" busy={false} disabled={false} variant="primary" onClick={add} />
        <Button label="Tải lại" busyLabel="Đang tải…" busy={loading} disabled={false} variant="secondary" onClick={reload} />
      </Inline>
      {notice === null ? null : <SuccessNotice text={notice} />}
      {loading ? <LoadingIndicator label="Đang tải danh sách khách hàng…" /> : null}
      {result === null ? null : <ClientListResult result={result} onAdd={add} onOpen={open} />}
    </Section>
  )
}

const toItems = (rows: ClientRowView[]) => rows.map((row) => ({ key: row.clientId, text: row.name, detail: null }))

function ClientListResult({ result, onAdd, onOpen }: { result: ViewResult<ClientListView>; onAdd: () => void; onOpen: (clientId: string) => void }) {
  switch (result.kind) {
    case 'ok':
      // No client at all: say so and offer the next step (§7.2, principle 6).
      if (result.view.isEmpty) return <EmptyState text="Chưa có khách hàng nào." action={{ label: 'Thêm khách hàng', onClick: onAdd }} />
      return (
        <Stack gap="lg">
          <Section title="Đang hoạt động" level="group" gap="sm">
            <ItemList label="Khách hàng đang hoạt động" items={toItems(result.view.active)} emptyText="Chưa có khách hàng nào đang hoạt động." onSelect={onOpen} />
          </Section>
          <Section title="Đã lưu trữ" level="group" gap="sm">
            <ItemList label="Khách hàng đã lưu trữ" items={toItems(result.view.archived)} emptyText="Không có khách hàng nào đã lưu trữ." onSelect={onOpen} />
          </Section>
        </Stack>
      )
    case 'rejected':
      // No input on this page, so no field error to place: only origin 'system' happens.
      return <InlineAlert title="Không tải được danh sách khách hàng" text={result.message} />
    case 'unreachable':
      // The reload button above repeats the same operation.
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
