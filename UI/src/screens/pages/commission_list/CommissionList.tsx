/**
 * Page commission_list (.design/ui_decomposition.md, "Chặng D2"): the list
 * of commissions; its main action "Thêm đơn hàng" opens commission_form
 * (create); pressing a commission opens commission_detail. Built with kit
 * components only, no style (R10). Every kind of the ViewResult is shown
 * (i5-screens.md, Step I5.2).
 */
import { Button, EmptyState, Inline, InlineAlert, ItemList, LoadingIndicator, Section, SuccessNotice } from '../../../kit'
import type { CommissionListView, ViewResult } from '../../../logic/workflows/manage_commission/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useCommissionList } from './use_commission_list'

export function CommissionList({ navigate, notice }: PageProps<'commission_list'>) {
  const { result, loading, reload } = useCommissionList()
  const add = () => navigate({ page: 'commission_form', params: { mode: 'create' } }, null)
  const open = (commissionId: string) => navigate({ page: 'commission_detail', params: { commission_id: commissionId } }, null)
  return (
    <Section title="Đơn hàng" level="page" gap="md">
      <Inline gap="sm">
        <Button label="Thêm đơn hàng" busyLabel="Thêm đơn hàng" busy={false} disabled={false} variant="primary" onClick={add} />
        <Button label="Tải lại" busyLabel="Đang tải…" busy={loading} disabled={false} variant="secondary" onClick={reload} />
      </Inline>
      {notice === null ? null : <SuccessNotice text={notice} />}
      {loading ? <LoadingIndicator label="Đang tải danh sách đơn hàng…" /> : null}
      {result === null ? null : <CommissionListResult result={result} onAdd={add} onOpen={open} />}
    </Section>
  )
}

function CommissionListResult({ result, onAdd, onOpen }: { result: ViewResult<CommissionListView>; onAdd: () => void; onOpen: (commissionId: string) => void }) {
  switch (result.kind) {
    case 'ok':
      // No commission at all: say so and offer the next step (§7.2, principle 6).
      if (result.view.isEmpty) return <EmptyState text="Chưa có đơn hàng nào." action={{ label: 'Thêm đơn hàng', onClick: onAdd }} />
      return (
        <ItemList
          label="Danh sách đơn hàng"
          items={result.view.rows.map((row) => ({ key: row.commissionId, text: row.title, detail: row.detailText }))}
          emptyText="Chưa có đơn hàng nào."
          onSelect={onOpen}
        />
      )
    case 'rejected':
      // No input on this page, so no field error to place: only origin 'system' happens.
      return <InlineAlert title="Không tải được danh sách đơn hàng" text={result.message} />
    case 'unreachable':
      // The reload button above repeats the same operation.
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
