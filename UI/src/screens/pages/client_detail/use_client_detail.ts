/**
 * Screen hook of the page client_detail (i5-screens.md, Step I5.1): calls
 * Routers, holds the results, hands them to the page. It formats nothing and
 * chooses no message: Services did that.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArchivedClientView, ClientDetailView, ViewResult } from '../../../logic/workflows/manage_client/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

export type ClientDetailState = {
  // Latest detail: from opening the page, or the updated one Routers handed
  // back after archiving; null before the first one arrives.
  detail: ViewResult<ClientDetailView> | null
  loading: boolean
  // Load again (after "không kết nối được").
  reload: () => void
  // Latest result of archiving or unarchiving, as Routers returned it.
  archive: ViewResult<ArchivedClientView> | null
  archiving: boolean
  // Archive (true) or unarchive (false).
  setArchived: (archived: boolean) => void
}

export function useClientDetail(clientId: string): ClientDetailState {
  const { manageClient } = useLogic()
  const [detail, setDetail] = useState<ViewResult<ClientDetailView> | null>(null)
  // true from the first render: the page loads as soon as it opens (UI-4).
  const [loading, setLoading] = useState(true)
  const [archive, setArchive] = useState<ViewResult<ArchivedClientView> | null>(null)
  const [archiving, setArchiving] = useState(false)
  // Technical timing only: no second call of an operation while one runs, no
  // state update after the page is gone.
  const loadRunning = useRef(false)
  const archiveRunning = useRef(false)
  const mounted = useRef(false)

  // call
  const load = useCallback(async () => {
    if (loadRunning.current) return
    loadRunning.current = true
    setLoading(true)
    const r = await manageClient.loadClientDetail(clientId)
    loadRunning.current = false
    if (!mounted.current) return
    // hold
    setDetail(r)
    setLoading(false)
  }, [manageClient, clientId])

  // call
  const setArchived = useCallback(
    async (archived: boolean) => {
      if (archiveRunning.current) return
      archiveRunning.current = true
      setArchiving(true)
      const r = await manageClient.setClientArchived(clientId, archived)
      archiveRunning.current = false
      if (!mounted.current) return
      // hold: the result, and — when it is ok — the updated detail it carries.
      setArchive(r)
      switch (r.kind) {
        case 'ok':
          setDetail({ kind: 'ok', view: r.view.detail })
          break
        case 'rejected':
        case 'unreachable':
        case 'contract_violation':
          break
        default:
          assertNever(r)
      }
      setArchiving(false)
    },
    [manageClient, clientId],
  )

  // when: once when the page opens
  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  // hand over
  return { detail, loading, reload: () => void load(), archive, archiving, setArchived: (a) => void setArchived(a) }
}
