/**
 * Page restore (.design/ui_decomposition.md, "Chặng F"): chooses a backup file and
 * prepares a restore, which the desktop applies the next time the app opens; shows
 * and cancels the restore that is waiting. Page title "Khôi phục dữ liệu"; under it
 * the button row with the one main action "Chọn tệp sao lưu" (§7.2, principles 1
 * and 7) and, only when a restore waits, the secondary "Hủy lần khôi phục đang
 * chờ"; then the fixed line saying what a restore does.
 *
 * Choosing a file sends nothing: it puts a question in the page (ConfirmPanel of
 * the kit, never a dialog of the system or the browser; §7.2, principle 5: a
 * restore replaces all the data) and the focus moves to "Chuẩn bị khôi phục".
 * Cancelling the waiting restore asks nothing: it changes no data and a restore
 * can be prepared again at any time. Built with kit components only, no style
 * (R10). Every kind of every ViewResult is shown (i5-screens.md, Step I5.2). The
 * page never applies a restore and has no way to: the desktop does, at the next
 * start. It knows no second path of the restore calls (api_contract.yaml 5.0.0).
 */
import { Button, Caption, ConfirmPanel, DescriptionList, Inline, InlineAlert, LoadingIndicator, Section, Stack, SuccessNotice } from '../../../kit'
import type { PendingView, ViewResult, RunDone } from '../../../logic/workflows/restore_data/routers'
import { assertNever } from '../../assert_never'
import { useRestore, type RestoreOperation } from './use_restore'

// The title of the alert for what failed, by the operation that produced it (§7.2, principle 4).
const FAILED_TITLE: Record<RestoreOperation, string> = {
  status: 'Chưa đọc được trạng thái',
  choose: 'Chưa chọn được tệp',
  prepare: 'Chưa chuẩn bị được khôi phục',
  cancel: 'Chưa hủy được lần khôi phục',
}

export function Restore() {
  const state = useRestore()
  const running = state.opening || state.choosing || state.preparing || state.canceling
  // The buttons of the row wait for any operation, and while the question is open.
  const locked = running || state.question !== null

  return (
    <Section title="Khôi phục dữ liệu" level="page" gap="md">
      {/* The button row right under the title: the one main action first (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Chọn tệp sao lưu" busyLabel="Chọn tệp sao lưu" busy={state.choosing} disabled={locked} variant="primary" onClick={state.choose} />
        {state.pending.state === 'pending' ? (
          <Button
            label="Hủy lần khôi phục đang chờ"
            busyLabel="Hủy lần khôi phục đang chờ"
            busy={state.canceling}
            disabled={locked}
            variant="secondary"
            onClick={state.cancel}
          />
        ) : null}
      </Inline>
      <Caption text="Khôi phục thay toàn bộ dữ liệu hiện tại bằng dữ liệu trong một tệp sao lưu. Việc thay diễn ra khi bạn đóng rồi mở lại ứng dụng." />
      {state.opening ? <LoadingIndicator label="Đang đọc trạng thái khôi phục…" /> : null}
      {state.preparing ? <LoadingIndicator label="Đang chuẩn bị khôi phục…" /> : null}
      {state.canceling ? <LoadingIndicator label="Đang hủy lần khôi phục đang chờ…" /> : null}
      {state.question === null ? null : (
        <ConfirmPanel
          title="Xác nhận chuẩn bị khôi phục"
          text={state.question.text}
          confirmLabel="Chuẩn bị khôi phục"
          confirmBusyLabel="Chuẩn bị khôi phục"
          cancelLabel="Quay lại"
          busy={state.preparing}
          onConfirm={state.confirm}
          onCancel={state.dismiss}
        />
      )}
      {state.result === null ? null : <RunResult operation={state.result.operation} result={state.result.result} />}
      <Waiting pending={state.pending} />
    </Section>
  )
}

// The result of the latest operation: the notice, nothing for a plain read that went well, or the failure.
function RunResult({ operation, result }: { operation: RestoreOperation; result: ViewResult<RunDone> }) {
  switch (result.kind) {
    case 'ok':
      return result.view.message === null ? null : <SuccessNotice text={result.view.message} />
    case 'rejected':
      // A declared error, the desktop that does not answer, or the file dialog that could not be opened.
      return <InlineAlert title={FAILED_TITLE[operation]} text={result.message} />
    case 'unreachable':
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}

// What is waiting: the frame, the plain line when nothing is, or nothing when the page does not know.
function Waiting({ pending }: { pending: PendingView }) {
  switch (pending.state) {
    case 'pending':
      return (
        <Section title="Đang chờ khôi phục" level="group" gap="sm">
          <Stack gap="sm">
            <DescriptionList label="Lần khôi phục đang chờ" items={pending.entries.map((e) => ({ key: e.key, term: e.term, details: [e.value] }))} />
            <Caption text={pending.note} />
          </Stack>
        </Section>
      )
    case 'none':
      return <Caption text="Không có lần khôi phục nào đang chờ." />
    case 'unknown':
      return null
    default:
      return assertNever(pending)
  }
}
