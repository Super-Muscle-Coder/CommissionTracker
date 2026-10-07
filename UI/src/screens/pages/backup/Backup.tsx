/**
 * Page backup (.design/ui_decomposition.md, "Chặng E"): makes one backup file
 * of all the app's data, in a folder the artist chooses. Page title "Sao lưu
 * dữ liệu"; under it the button row with the one main action "Tạo bản sao lưu"
 * (§7.2, principles 1 and 7), then the fixed line saying what a backup is and
 * where to keep it. The press runs a flow of two steps (the folder dialog of
 * the desktop, then the archive); the button waits for the whole flow, so a
 * second press cannot open a second dialog. No question is asked first: making
 * a backup overwrites nothing (the backend never replaces a file) and changes
 * no data, so it is not the kind of act §7.2 principle 5 asks to confirm.
 * Built with kit components only, no style (R10). Every kind of every
 * ViewResult is shown (i5-screens.md, Step I5.2). This page never prepares a
 * restore: only restore_data does (api_contract.yaml 4.0.0).
 */
import { Button, Caption, DescriptionList, InlineAlert, Inline, LoadingIndicator, Section, Stack, SuccessNotice } from '../../../kit'
import { assertNever } from '../../assert_never'
import { useBackup, type ShownResult } from './use_backup'

export function Backup() {
  const state = useBackup()

  return (
    <Section title="Sao lưu dữ liệu" level="page" gap="md">
      {/* The button row right under the title: the one main action (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Tạo bản sao lưu" busyLabel="Tạo bản sao lưu" busy={state.running} disabled={false} variant="primary" onClick={state.start} />
      </Inline>
      <Caption text="Bản sao lưu là một tệp chứa toàn bộ dữ liệu của ứng dụng. Nên lưu ở ổ đĩa khác hoặc ổ USB, để vẫn còn dữ liệu nếu máy hỏng." />
      {state.creating ? <LoadingIndicator label="Đang tạo bản sao lưu…" /> : null}
      {state.result === null ? null : <RunResult result={state.result} />}
    </Section>
  )
}

// The result of the latest press: the notice and the frame of three lines, or the failure.
function RunResult({ result }: { result: ShownResult }) {
  switch (result.kind) {
    case 'ok':
      return (
        <Stack gap="md">
          <SuccessNotice text={result.view.message} />
          <DescriptionList label="Bản sao lưu vừa tạo" items={result.view.entries.map((e) => ({ key: e.key, term: e.term, details: [e.value] }))} />
        </Stack>
      )
    case 'rejected':
      // 400, 500, or the folder dialog that could not be opened.
      return <InlineAlert title="Chưa tạo được bản sao lưu" text={result.message} />
    case 'unreachable':
      return <InlineAlert title="Không kết nối được" text={result.message} />
    case 'contract_violation':
      return <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
    default:
      return assertNever(result)
  }
}
