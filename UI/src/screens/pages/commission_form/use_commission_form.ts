/**
 * Screen hook of the page commission_form (i5-screens.md, Step I5.1): calls
 * Routers, holds the draft (raw, exactly as typed) and the results, hands
 * them to the page. It checks nothing and converts nothing: Routers checks
 * and converts the draft when saving; Services formats every value and
 * chooses every message, and decides which clients are offered.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ClientChoicesView,
  CommissionFormDraft,
  CommissionFormTarget,
  CommissionFormView,
  SavedCommissionView,
  ViewResult,
} from '../../../logic/workflows/manage_commission/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'
import type { PageParams } from '../../navigation'

export type CommissionFormState = {
  // Result of opening the form; null before it arrives.
  opened: ViewResult<CommissionFormView> | null
  opening: boolean
  // Open again (after "không kết nối được").
  reopen: () => void
  draft: CommissionFormDraft
  setField: (field: keyof CommissionFormDraft, value: string) => void
  // The clients offered: from opening the form, then from the latest reload.
  clients: ClientChoicesView | null
  // Latest reload of the clients (after a save the backend refused); null if none.
  clientsReload: ViewResult<ClientChoicesView> | null
  // Latest result of saving, as Routers returned it (kept while the user fixes the draft).
  saved: ViewResult<SavedCommissionView> | null
  // How many save results have arrived: a new number for each one, so the
  // page can ask the kit for the focus once per result (never 0 after one).
  saveCount: number
  saving: boolean
  save: () => void
}

const EMPTY_DRAFT: CommissionFormDraft = {
  clientId: '',
  title: '',
  commissionType: '',
  amount: '',
  currency: '',
  deadline: '',
  description: '',
  referenceLinks: '',
}

// params of the page → the target Routers takes (same meaning, Routers' names).
function targetOf(params: PageParams['commission_form']): CommissionFormTarget {
  switch (params.mode) {
    case 'create':
      return { mode: 'create' }
    case 'edit':
      return { mode: 'edit', commissionId: params.commission_id }
    default:
      return assertNever(params)
  }
}

export function useCommissionForm(params: PageParams['commission_form'], onSaved: (view: SavedCommissionView) => void): CommissionFormState {
  const { manageCommission } = useLogic()
  const target = useMemo(() => targetOf(params), [params])
  const [opened, setOpened] = useState<ViewResult<CommissionFormView> | null>(null)
  // true from the first render: the form opens as soon as the page does (UI-4).
  const [opening, setOpening] = useState(true)
  const [draft, setDraft] = useState<CommissionFormDraft>(EMPTY_DRAFT)
  const [clients, setClients] = useState<ClientChoicesView | null>(null)
  // The commission's own client (edit mode), handed back when reloading the clients.
  const [keptClientId, setKeptClientId] = useState<string | null>(null)
  const [clientsReload, setClientsReload] = useState<ViewResult<ClientChoicesView> | null>(null)
  const [saved, setSaved] = useState<ViewResult<SavedCommissionView> | null>(null)
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
    const r = await manageCommission.openCommissionForm(target)
    openRunning.current = false
    if (!mounted.current) return
    // hold: the result, and — when it is ok — the draft and clients it starts from.
    setOpened(r)
    switch (r.kind) {
      case 'ok':
        setDraft(r.view.draft)
        setClients(r.view.clients)
        setKeptClientId(r.view.keptClientId)
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
    setOpening(false)
  }, [manageCommission, target])

  // call — the clients offered again; Routers says which one stays chosen.
  const reloadClients = useCallback(
    async (chosenClientId: string) => {
      const r = await manageCommission.reloadClientChoices(keptClientId, chosenClientId)
      if (!mounted.current) return
      // hold
      setClientsReload(r)
      switch (r.kind) {
        case 'ok':
          setClients(r.view)
          setDraft((d) => ({ ...d, clientId: r.view.clientId }))
          break
        case 'rejected':
        case 'unreachable':
        case 'contract_violation':
          break
        default:
          assertNever(r)
      }
    },
    [manageCommission, keptClientId],
  )

  // call — the draft is sent as typed; it stays as typed whatever the result.
  const save = useCallback(async () => {
    if (saveRunning.current) return
    saveRunning.current = true
    setSaving(true)
    setClientsReload(null)
    const r = await manageCommission.saveCommission(target, draft)
    saveRunning.current = false
    if (!mounted.current) return
    // hold, then hand over: a saved commission goes to the page (which navigates).
    setSaved(r)
    setSaveCount((n) => n + 1)
    setSaving(false)
    switch (r.kind) {
      case 'ok':
        onSaved(r.view)
        break
      case 'rejected':
        // when: after the backend refused the save (e.g. the chosen client was
        // archived meanwhile, 409, or is gone, 404), offer the clients again.
        if (r.origin === 'system') void reloadClients(draft.clientId)
        break
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
  }, [manageCommission, target, draft, onSaved, reloadClients])

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
    // hold: an edit of the draft.
    setField: (field, value) => setDraft((d) => ({ ...d, [field]: value })),
    clients,
    clientsReload,
    saved,
    saveCount,
    saving,
    save: () => void save(),
  }
}
