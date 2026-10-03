/**
 * Page reminder_settings (.design/ui_decomposition.md, "Chặng D6"): the
 * settings of the periodic reminder and of the reminder before a deadline.
 * Page title "Cài đặt nhắc việc"; under it the button row: main action "Lưu",
 * then "Hủy" (back to reminder_list; §7.2, principle 7); then the line saying
 * whether the settings were ever saved. "Vào thứ" is shown only for the unit
 * "tuần". Every field stays editable while its part is switched off (the
 * contract asks every field to be valid either way). After a rejected save the
 * text cursor moves to the first field in error, in the order of the screen
 * (principle 4). Built with kit components only, no style (R10). Every kind of
 * every ViewResult is shown (i5-screens.md, Step I5.2); the draft always stays
 * as typed.
 */
import { useCallback } from 'react'
import {
  Button,
  Caption,
  CheckboxField,
  FieldGroup,
  Inline,
  InlineAlert,
  LoadingIndicator,
  Section,
  SelectField,
  Stack,
  TextField,
  TimeField,
} from '../../../kit'
import type { SavedSettingsView, SettingsFormView, ViewResult } from '../../../logic/workflows/send_reminder/routers'
import { assertNever } from '../../assert_never'
import type { PageProps } from '../../navigation'
import { useReminderSettings, type ReminderSettingsState } from './use_reminder_settings'

const PERIODIC_FIELDS = ['periodic.every', 'periodic.unit', 'periodic.at_time', 'periodic.weekday'] as const

// The keys of the errors of a lead time row, in the order of its fields on the
// screen: the number, the unit, and the rule of the list (a duplicate), which
// is shown under the number.
const leadKeys = (i: number) => [`deadline.lead_times.${i}.amount`, `deadline.lead_times.${i}.unit`, `deadline.lead_times.${i}`] as const

export function ReminderSettings({ navigate }: PageProps<'reminder_settings'>) {
  // Where "Hủy" goes, and where saved settings are shown.
  const toList = useCallback((notice: string | null) => navigate({ page: 'reminder_list', params: null }, notice), [navigate])
  const onSaved = useCallback((view: SavedSettingsView) => toList(view.message), [toList])
  const form = useReminderSettings(onSaved)
  const cancel = () => toList(null)

  return (
    <Section title="Cài đặt nhắc việc" level="page" gap="md">
      {form.opening ? <LoadingIndicator label="Đang mở cài đặt nhắc việc…" /> : null}
      {form.opened === null ? null : <OpenedResult result={form.opened} form={form} onCancel={cancel} />}
    </Section>
  )
}

type OpenedResultProps = { result: ViewResult<SettingsFormView>; form: ReminderSettingsState; onCancel: () => void }

function OpenedResult({ result, form, onCancel }: OpenedResultProps) {
  const back = <Button label="Quay lại" busyLabel="Quay lại" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
  switch (result.kind) {
    case 'ok':
      return <FormBody view={result.view} form={form} onCancel={onCancel} />
    case 'rejected':
      // 500: the settings cannot be read.
      return (
        <Stack gap="md">
          <InlineAlert title="Không mở được cài đặt" text={result.message} />
          <Inline gap="sm">{back}</Inline>
        </Stack>
      )
    case 'unreachable':
      return (
        <Stack gap="md">
          <InlineAlert title="Không kết nối được" text={result.message} />
          <Inline gap="sm">
            <Button label="Thử lại" busyLabel="Đang mở…" busy={form.opening} disabled={false} variant="primary" onClick={form.reopen} />
            {back}
          </Inline>
        </Stack>
      )
    case 'contract_violation':
      return (
        <Stack gap="md">
          <InlineAlert title="Có lỗi không mong đợi" text={result.message} />
          <Inline gap="sm">{back}</Inline>
        </Stack>
      )
    default:
      return assertNever(result)
  }
}

// Field errors of the last save: only a rejection carries them.
function fieldErrorsOf(saved: ViewResult<SavedSettingsView> | null): Record<string, string> {
  if (saved === null) return {}
  switch (saved.kind) {
    case 'rejected':
      return saved.fieldErrors
    case 'ok':
    case 'unreachable':
    case 'contract_violation':
      return {}
    default:
      return assertNever(saved)
  }
}

function FormBody({ view, form, onCancel }: { view: SettingsFormView; form: ReminderSettingsState; onCancel: () => void }) {
  const errors = fieldErrorsOf(form.saved)
  const { draft, saving, setField } = form
  const rows = draft.leadTimes
  // The first field with an error gets the text cursor once per save result
  // (§7.2, principle 4); the kit moves it.
  const order: string[] = [...PERIODIC_FIELDS, ...rows.flatMap((_, i) => leadKeys(i))]
  const firstError = order.find((key) => key in errors) ?? null
  const focusRequest = (...keys: readonly string[]) => (firstError !== null && keys.includes(firstError) ? form.saveCount : 0)
  const error = (key: string) => errors[key] ?? null
  return (
    <Stack gap="lg">
      {/* The button row right under the title, main action first, as on every page (§7.2, principle 7). */}
      <Inline gap="sm">
        <Button label="Lưu" busyLabel="Đang lưu…" busy={saving} disabled={false} variant="primary" onClick={form.save} />
        <Button label="Hủy" busyLabel="Hủy" busy={false} disabled={false} variant="secondary" onClick={onCancel} />
      </Inline>
      <Caption text={view.subtitle} />
      {form.saved === null ? null : <SaveResult result={form.saved} />}
      <Section title="Nhắc định kỳ" level="group" gap="md">
        <CheckboxField id="reminder-periodic-enabled" label="Bật nhắc định kỳ" checked={draft.periodicEnabled} onChange={(v) => setField('periodicEnabled', v)} disabled={saving} />
        <Inline gap="md">
          <TextField
            id="reminder-periodic-every"
            label="Mỗi"
            value={draft.every}
            onChange={(v) => setField('every', v)}
            error={error('periodic.every')}
            disabled={saving}
            focusRequest={focusRequest('periodic.every')}
            suggestions={[]}
          />
          <SelectField
            id="reminder-periodic-unit"
            label="Đơn vị chu kỳ"
            value={draft.periodicUnit}
            options={view.periodicUnitChoices}
            placeholder={null}
            onChange={form.setPeriodicUnit}
            hint={null}
            error={error('periodic.unit')}
            disabled={saving}
            focusRequest={focusRequest('periodic.unit')}
          />
        </Inline>
        <TimeField
          id="reminder-periodic-at-time"
          label="Vào lúc"
          value={draft.atTime}
          onChange={(v) => setField('atTime', v)}
          error={error('periodic.at_time')}
          disabled={saving}
          focusRequest={focusRequest('periodic.at_time')}
        />
        {draft.periodicUnit === view.weekdayUnit ? (
          <SelectField
            id="reminder-periodic-weekday"
            label="Vào thứ"
            value={draft.weekday}
            options={view.weekdayChoices}
            placeholder="Chọn thứ"
            onChange={(v) => setField('weekday', v)}
            hint={null}
            error={error('periodic.weekday')}
            disabled={saving}
            focusRequest={focusRequest('periodic.weekday')}
          />
        ) : null}
        <Caption text="Mỗi lần lưu cài đặt, chu kỳ nhắc định kỳ được tính lại từ lúc lưu." />
      </Section>
      <Section title="Nhắc trước hạn giao" level="group" gap="md">
        <CheckboxField id="reminder-deadline-enabled" label="Bật nhắc trước hạn giao" checked={draft.deadlineEnabled} onChange={(v) => setField('deadlineEnabled', v)} disabled={saving} />
        <FieldGroup legend="Mốc nhắc" gap="md">
          {rows.map((row, i) => (
            // Rows have no identity of their own: a row is its place in the list.
            <Inline key={i} gap="md">
              <TextField
                id={`reminder-lead-${i}-amount`}
                label={`Mốc nhắc ${i + 1}: số`}
                value={row.amount}
                onChange={(v) => form.setLeadTime(i, 'amount', v)}
                error={error(leadKeys(i)[0]) ?? error(leadKeys(i)[2])}
                disabled={saving}
                focusRequest={focusRequest(leadKeys(i)[0], leadKeys(i)[2])}
                suggestions={[]}
              />
              <SelectField
                id={`reminder-lead-${i}-unit`}
                label={`Mốc nhắc ${i + 1}: đơn vị`}
                value={row.unit}
                options={view.leadUnitChoices}
                placeholder={null}
                onChange={(v) => form.setLeadTime(i, 'unit', v)}
                hint={null}
                error={error(leadKeys(i)[1])}
                disabled={saving}
                focusRequest={focusRequest(leadKeys(i)[1])}
              />
              <Button
                label="Bỏ mốc này"
                busyLabel="Bỏ mốc này"
                busy={false}
                disabled={saving || rows.length <= view.leadTimeLimits.min}
                variant="secondary"
                onClick={() => form.removeLeadTime(i)}
              />
            </Inline>
          ))}
          <Inline gap="sm">
            <Button
              label="Thêm mốc nhắc"
              busyLabel="Thêm mốc nhắc"
              busy={false}
              disabled={saving || rows.length >= view.leadTimeLimits.max}
              variant="secondary"
              onClick={form.addLeadTime}
            />
          </Inline>
        </FieldGroup>
        <Caption text="Hạn giao tính tới hết ngày đó. Một ngày là 24 giờ." />
      </Section>
    </Stack>
  )
}

// Result of saving. ok moves to reminder_list (the hook hands it to the page),
// so only failures stay on this page; the draft is kept and "Lưu" sends it again.
function SaveResult({ result }: { result: ViewResult<SavedSettingsView> }) {
  switch (result.kind) {
    case 'ok':
      return null
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
