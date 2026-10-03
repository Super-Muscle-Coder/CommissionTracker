/**
 * Screen hook of the page reminder_list (i5-screens.md, Step I5.1): calls
 * Routers, holds the results, hands them to the page. It checks nothing and
 * decides nothing: Services decides every message. The hook only decides WHEN
 * to call again (after "Đã xem" the list is read again).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AcknowledgedView, PendingListView, ViewResult } from '../../../logic/workflows/send_reminder/routers'
import { assertNever } from '../../assert_never'
import { useLogic } from '../../logic_context'

export type ReminderListState = {
  // Latest result (the reminders waiting); null before the first one arrives.
  list: ViewResult<PendingListView> | null
  loading: boolean
  // Load again ("Tải lại", "Thử lại").
  reload: () => void
  // "Đã xem" on one reminder.
  acknowledge: (notificationId: string) => void
  // An acknowledge is running: no second one, and every "Đã xem" waits.
  acknowledging: boolean
  // Latest result of "Đã xem"; null if none since the page opened.
  acknowledged: ViewResult<AcknowledgedView> | null
}

export function useReminderList(): ReminderListState {
  const { sendReminder } = useLogic()
  const [list, setList] = useState<ViewResult<PendingListView> | null>(null)
  // true from the first render: the page loads as soon as it opens (UI-4).
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState(false)
  const [acknowledged, setAcknowledged] = useState<ViewResult<AcknowledgedView> | null>(null)
  // Technical timing only: no second call while one runs, no state update
  // after the page is gone.
  const running = useRef(false)
  const ackRunning = useRef(false)
  const mounted = useRef(false)

  // call
  const load = useCallback(async () => {
    if (running.current) return
    running.current = true
    setLoading(true)
    const r = await sendReminder.loadPending()
    running.current = false
    if (!mounted.current) return
    // hold
    setList(r)
    setLoading(false)
  }, [sendReminder])

  // call — after an acknowledgement the backend refused (the reminder is gone,
  // or a storage error), the list is read again without replacing what is
  // shown by a failure: the latest good list stays if this reading fails too
  // (D6: "danh sách giữ nguyên").
  const refreshQuietly = useCallback(async () => {
    if (running.current) return
    running.current = true
    const r = await sendReminder.loadPending()
    running.current = false
    if (!mounted.current) return
    switch (r.kind) {
      case 'ok':
        // hold
        setList(r)
        break
      case 'rejected':
      case 'unreachable':
      case 'contract_violation':
        break
      default:
        assertNever(r)
    }
  }, [sendReminder])

  // call — sent once: a second press while it runs is ignored.
  const acknowledge = useCallback(
    async (notificationId: string) => {
      if (ackRunning.current) return
      ackRunning.current = true
      setAcknowledging(true)
      const r = await sendReminder.acknowledge(notificationId)
      ackRunning.current = false
      if (!mounted.current) return
      // hold
      setAcknowledged(r)
      setAcknowledging(false)
      // when: the backend answered — read the list again.
      switch (r.kind) {
        case 'ok':
          await load()
          break
        case 'rejected':
          await refreshQuietly()
          break
        case 'unreachable':
        case 'contract_violation':
          break
        default:
          assertNever(r)
      }
    },
    [sendReminder, load, refreshQuietly],
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
  return { list, loading, reload: () => void load(), acknowledge: (id) => void acknowledge(id), acknowledging, acknowledged }
}
