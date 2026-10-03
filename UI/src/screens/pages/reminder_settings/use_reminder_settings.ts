/**
 * Screen hook of the page reminder_settings (i5-screens.md, Step I5.1): calls
 * Routers, holds the draft (raw, exactly as typed) and the results, hands them
 * to the page. It checks nothing and decides nothing: Routers checks the draft;
 * Services decides what the form opens with, what a change of unit or a new
 * row does to the draft, and every message.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReminderSettingsDraft, SavedSettingsView, SettingsFormView, ViewResult } from '../../../logic/workflows/send_reminder/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

export type ReminderSettingsState = {
  // Result of opening the page; null before it arrives.
  opened: ViewResult<SettingsFormView> | null
  opening: boolean
  // Open again (after "không kết nối được").
  reopen: () => void
  draft: ReminderSettingsDraft
  // An edit of one field of the draft that moves no other field.
  setField: <K extends 'periodicEnabled' | 'every' | 'atTime' | 'weekday' | 'deadlineEnabled'>(field: K, value: ReminderSettingsDraft[K]) => void
  // The unit of the cadence: Services decides what goes with it (the weekday).
  setPeriodicUnit: (unit: string) => void
  setLeadTime: (index: number, field: 'amount' | 'unit', value: string) => void
  addLeadTime: () => void
  removeLeadTime: (index: number) => void
  // Latest result of "Lưu", as Routers returned it; null if none.
  saved: ViewResult<SavedSettingsView> | null
  // How many save results have arrived: a new number for each one, so the
  // page can ask the kit for the focus once per result (never 0 after one).
  saveCount: number
  saving: boolean
  save: () => void
}

const EMPTY_DRAFT: ReminderSettingsDraft = { periodicEnabled: false, every: '', periodicUnit: '', atTime: '', weekday: '', deadlineEnabled: false, leadTimes: [] }

export function useReminderSettings(onSaved: (view: SavedSettingsView) => void): ReminderSettingsState {
  const { sendReminder } = useLogic()
  const [opened, setOpened] = useState<ViewResult<SettingsFormView> | null>(null)
  // true from the first render: the page opens as soon as it is shown (UI-4).
  const [opening, setOpening] = useState(true)
  const [draft, setDraft] = useState<ReminderSettingsDraft>(EMPTY_DRAFT)
  const [saved, setSaved] = useState<ViewResult<SavedSettingsView> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveCount, setSaveCount] = useState(0)
  // Technical timing only: no second call while one runs, no state update
  // after the page is gone.
  const openRunning = useRef(false)
  const saveRunning = useRef(false)
  const mounted = useRef(false)

  // call
  const open = useCallback(async () => {
    if (openRunning.current) return
    openRunning.current = true
    setOpening(true)
    const r = await sendReminder.openSettings()
    openRunning.current = false
    if (!mounted.current) return
    // hold: the result, and — when it is ok — the draft it starts from.
    setOpened(r)
    switch (r.kind) {
      case 'ok':
        setDraft(r.view.draft)
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
    setOpening(false)
  }, [sendReminder])

  // call — the draft is sent as typed; it stays as typed whatever the result.
  const save = useCallback(async () => {
    if (saveRunning.current || opened === null) return
    switch (opened.kind) {
      case 'ok': {
        saveRunning.current = true
        setSaving(true)
        const r = await sendReminder.saveSettings(draft)
        saveRunning.current = false
        if (!mounted.current) return
        // hold, then hand over: saved settings go to the page (which navigates).
        setSaved(r)
        setSaveCount((n) => n + 1)
        setSaving(false)
        switch (r.kind) {
          case 'ok':
            onSaved(r.view)
            break
          case 'rejected':
          case 'unreachable':
          case 'contract_violation':
            break
          default:
            assertNever(r)
        }
        break
      }
      // No form is shown unless the page opened: nothing to send.
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(opened)
    }
  }, [sendReminder, opened, draft, onSaved])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void open()
    return () => {
      mounted.current = false
    }
  }, [open])

  // hand over
  return {
    opened,
    opening,
    reopen: () => void open(),
    draft,
    // hold: edits of the draft.
    setField: (field, value) => setDraft((d) => ({ ...d, [field]: value })),
    setPeriodicUnit: (unit) => setDraft((d) => sendReminder.changePeriodicUnit(d, unit)),
    setLeadTime: (index, field, value) =>
      setDraft((d) => ({ ...d, leadTimes: d.leadTimes.map((row, i) => (i === index ? { ...row, [field]: value } : row)) })),
    addLeadTime: () => setDraft((d) => sendReminder.addLeadTime(d)),
    removeLeadTime: (index) => setDraft((d) => sendReminder.removeLeadTime(d, index)),
    saved,
    saveCount,
    saving,
    save: () => void save(),
  }
}
