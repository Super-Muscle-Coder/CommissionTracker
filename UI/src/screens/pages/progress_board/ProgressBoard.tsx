/**
 * Page progress_board (.design/ui_decomposition.md, "Chặng D3"): every
 * commission, grouped by its current stage (groups and their order decided
 * by Services); pressing a commission opens commission_detail. No main action
 * of its own: the button row under the title holds only "Tải lại" (§7.2,
 * principle 7: the row is still there). No stage change here: that happens
 * on stage_change only. Built with kit components only, no style (R10).
 * Every kind of the ViewResult is shown (i5-screens.md, Step I5.2).
 */
import { Button, EmptyState, Inline, InlineAlert, ItemList, LoadingIndicator, Section, Stack } from '../../../kit'
import type { ProgressBoardView, ViewResult } from '../../../logic/workflows/update_progress/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useProgressBoard } from './use_progress_board'

export function ProgressBoard({ navigate }: PageProps<'progress_board'>) {
  const { result, loading, reload } = useProgressBoard()
  const add = () => navigate({ page: 'commission_form', params: { mode: 'create' } }, null)
  const open = (commissionId: string) => navigate({ page: 'commission_detail', params: { commission_id: commissionId } }, null)
  return (
    <Section title="Tiến độ" level="page" gap="md">
      <Inline gap="sm">
        <Button label="Tải lại" busyLabel="Đang tải…" busy={loading} disabled={false} variant="secondary" onClick={reload} />
      </Inline>
      {loading ? <LoadingIndicator label="Đang tải bảng tiến độ…" /> : null}
      {result === null ? null : <BoardResult result={result} onAdd={add} onOpen={open} />}
    </Section>
  )
}

function BoardResult({ result, onAdd, onOpen }: { result: ViewResult<ProgressBoardView>; onAdd: () => void; onOpen: (commissionId: string) => void }) {
  switch (result.kind) {
    case 'ok':
      // No commission at all: say so and offer the next step (§7.2, principle 6).
      if (result.view.isEmpty) return <EmptyState text="Chưa có đơn hàng nào." action={{ label: 'Thêm đơn hàng', onClick: onAdd }} />
      return (
        <Stack gap="lg">
          {result.view.groups.map((group) => (
            <Section key={group.key} title={group.title} level="group" gap="sm">
              <ItemList
                label={group.title}
                items={group.rows.map((row) => ({ key: row.commissionId, text: row.title, detail: row.detailText, action: null }))}
                emptyText=""
                onSelect={onOpen}
                onAction={null}
              />
            </Section>
          ))}
        </Stack>
      )
    case 'rejected':
      // No input on this page, so no field error to place: only origin 'system' happens.
      return <InlineAlert title="Không tải được bảng tiến độ" text={result.message} />
    case 'unreachable':
      // The reload button above repeats the same operation.
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
