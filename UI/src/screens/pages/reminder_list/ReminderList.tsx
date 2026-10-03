/**
 * Page reminder_list (.design/ui_decomposition.md, "Chặng D6"): the reminders
 * waiting, oldest first. Page title "Nhắc việc"; under it the button row (main
 * action "Cài đặt nhắc việc", then "Tải lại"; §7.2, principle 7), then the
 * fixed line saying where reminders come from. Each reminder has "Đã xem",
 * which sends at once with no question (nothing is lost by it; principle 5
 * asks for confirmation only for what is hard to undo and has consequences);
 * pressing the main line of a reminder opens its commission, or the commission
 * list for the periodic digest. Built with kit components only, no style
 * (R10). Every kind of every ViewResult is shown (i5-screens.md, Step I5.2).
 * This page never asks the backend whether a reminder is due: only the
 * desktop's reminder_ticker does (api_contract.yaml 4.0.0).
 */
import { Button, Caption, EmptyState, Inline, InlineAlert, ItemList, LoadingIndicator, Section, Stack, SuccessNotice } from '../../../kit'
import type { AcknowledgedView, OpenTarget, PendingListView, ViewResult } from '../../../logic/workflows/send_reminder/routers'
import { assertNever } from '../../assert_never'
import type { Navigate, PageProps } from '../../navigation'
import { useReminderList, type ReminderListState } from './use_reminder_list'

export function ReminderList({ navigate, notice }: PageProps<'reminder_list'>) {
  const state = useReminderList()
  const toSettings = () => navigate({ page: 'reminder_settings', params: null }, null)

  return (
    <Section title="Nhắc việc" level="page" gap="md">
      {/* The button row right under the title, main action first (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Cài đặt nhắc việc" busyLabel="Cài đặt nhắc việc" busy={false} disabled={false} variant="primary" onClick={toSettings} />
        <Button label="Tải lại" busyLabel="Đang tải…" busy={state.loading} disabled={false} variant="secondary" onClick={state.reload} />
      </Inline>
      <Caption text="Nhắc việc đến hạn sẽ hiện thành thông báo của Windows. Mọi nhắc việc chưa đánh dấu đã xem nằm ở đây." />
      {/* The notice handed over by the previous page ("Đã lưu cài đặt nhắc việc."). */}
      {notice === null ? null : <SuccessNotice text={notice} />}
      {state.acknowledged === null ? null : <AcknowledgedResult result={state.acknowledged} />}
      {state.loading ? <LoadingIndicator label="Đang tải nhắc việc…" /> : null}
      {state.list === null ? null : <ListResult result={state.list} state={state} navigate={navigate} onSettings={toSettings} />}
    </Section>
  )
}

type ListResultProps = { result: ViewResult<PendingListView>; state: ReminderListState; navigate: Navigate; onSettings: () => void }

function ListResult({ result, state, navigate, onSettings }: ListResultProps) {
  switch (result.kind) {
    case 'ok': {
      const v = result.view
      if (v.isEmpty) return <EmptyState text={v.emptyText} action={{ label: 'Cài đặt nhắc việc', onClick: onSettings }} />
      const open = (key: string) => {
        const row = v.rows.find((r) => r.notificationId === key)
        if (row !== undefined) go(row.open, navigate)
      }
      return (
        <Stack gap="md">
          <ItemList
            label="Nhắc việc đang chờ"
            items={v.rows.map((row) => ({
              key: row.notificationId,
              text: row.text,
              detail: row.detailText,
              // While one acknowledgement runs, every "Đã xem" waits.
              action: { label: 'Đã xem', disabled: state.acknowledging },
            }))}
            emptyText={v.emptyText}
            onSelect={open}
            onAction={state.acknowledge}
          />
        </Stack>
      )
    }
    case 'rejected':
      // 500: the reminders cannot be read.
      return <InlineAlert title="Không tải được nhắc việc" text={result.message} />
    case 'unreachable':
      // "Tải lại" above repeats the same operation.
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}

// The main line of a reminder: its commission, or the commission list.
function go(target: OpenTarget, navigate: Navigate): void {
  switch (target.to) {
    case 'commission_detail':
      navigate({ page: 'commission_detail', params: { commission_id: target.commissionId } }, null)
      break
    case 'commission_list':
      navigate({ page: 'commission_list', params: null }, null)
      break
    default:
      assertNever(target)
  }
}

// Result of "Đã xem": ok says it (and the list is read again by the hook); a
// failure is said, and the list stays as it was.
function AcknowledgedResult({ result }: { result: ViewResult<AcknowledgedView> }) {
  switch (result.kind) {
    case 'ok':
      return <SuccessNotice text={result.view.message} />
    case 'rejected':
      return <InlineAlert title="Chưa đánh dấu được" text={result.message} />
    case 'unreachable':
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
