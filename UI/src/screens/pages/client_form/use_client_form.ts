/**
 * Screen hook of the page client_form (i5-screens.md, Step I5.1): calls
 * Routers, holds the draft (raw, exactly as typed) and the results, hands
 * them to the page. It checks nothing and converts nothing: Routers checks
 * and converts the draft when saving; Services chooses every message.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ClientFormDraft,
  ClientFormTarget,
  ClientFormView,
  ContactDraft,
  SavedClientView,
  ViewResult,
} from '../../../logic/workflows/manage_client/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'
import type { PageParams } from '../../navigation'

export type ClientFormState = {
  // Result of opening the form (empty form, or the stored client); null before it arrives.
  opened: ViewResult<ClientFormView> | null
  opening: boolean
  // Open again (after "không kết nối được").
  reopen: () => void
  draft: ClientFormDraft
  setDisplayName: (value: string) => void
  setNote: (value: string) => void
  setContact: (row: number, field: keyof ContactDraft, value: string) => void
  addContact: () => void
  removeContact: (row: number) => void
  // Latest result of saving, as Routers returned it (kept while the user fixes the draft).
  saved: ViewResult<SavedClientView> | null
  // How many save results have arrived: a new number for each one, so the
  // page can ask the kit for the focus once per result (never 0 after one).
  saveCount: number
  saving: boolean
  save: () => void
}

const EMPTY_DRAFT: ClientFormDraft = { displayName: '', contacts: [], note: '' }

// params of the page → the target Routers takes (same meaning, Routers' names).
function targetOf(params: PageParams['client_form']): ClientFormTarget {
  switch (params.mode) {
    case 'create':
      return { mode: 'create' }
    case 'edit':
      return { mode: 'edit', clientId: params.client_id }
    default:
      return assertNever(params)
  }
}

export function useClientForm(params: PageParams['client_form'], onSaved: (view: SavedClientView) => void): ClientFormState {
  const { manageClient } = useLogic()
  const target = useMemo(() => targetOf(params), [params])
  const [opened, setOpened] = useState<ViewResult<ClientFormView> | null>(null)
  // true from the first render: the form opens as soon as the page does (UI-4).
  const [opening, setOpening] = useState(true)
  const [draft, setDraft] = useState<ClientFormDraft>(EMPTY_DRAFT)
  const [saved, setSaved] = useState<ViewResult<SavedClientView> | null>(null)
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
    const r = await manageClient.openClientForm(target)
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
  }, [manageClient, target])

  // call — the draft is sent as typed; it stays as typed whatever the result.
  const save = useCallback(async () => {
    if (saveRunning.current) return
    saveRunning.current = true
    setSaving(true)
    const r = await manageClient.saveClient(target, draft)
    saveRunning.current = false
    if (!mounted.current) return
    // hold, then hand over: a saved client goes to the page (which navigates).
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
  }, [manageClient, target, draft, onSaved])

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void open()
    return () => {
      mounted.current = false
    }
  }, [open])

  // hold: edits of the draft. Adding or removing a row shifts the rows, so
  // the field errors of the last save (keyed by row) no longer match: they are dropped.
  const setContact = (row: number, field: keyof ContactDraft, value: string) =>
    setDraft((d) => ({ ...d, contacts: d.contacts.map((c, i) => (i === row ? { ...c, [field]: value } : c)) }))
  const addContact = () => {
    setSaved(null)
    setDraft((d) => ({ ...d, contacts: [...d.contacts, { channel: '', value: '' }] }))
  }
  const removeContact = (row: number) => {
    setSaved(null)
    setDraft((d) => ({ ...d, contacts: d.contacts.filter((_, i) => i !== row) }))
  }

  // hand over
  return {
    opened,
    opening,
    reopen: () => void open(),
    draft,
    setDisplayName: (value) => setDraft((d) => ({ ...d, displayName: value })),
    setNote: (value) => setDraft((d) => ({ ...d, note: value })),
    setContact,
    addContact,
    removeContact,
    saved,
    saveCount,
    saving,
    save: () => void save(),
  }
}
