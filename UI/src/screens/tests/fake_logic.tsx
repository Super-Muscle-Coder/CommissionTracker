// Test helper of the screens zone: fake Routers in the LogicContext, the way
// Main hands the real ones (i5-screens.md, Step I5.4). Test tooling only.
import { render, screen } from '@testing-library/react'
import { useLayoutEffect, type ReactNode } from 'react'
import { vi } from 'vitest'
import type { ManageClientRouters } from '../../logic/workflows/manage_client/routers'
import type { ManageCommissionRouters } from '../../logic/workflows/manage_commission/routers'
import type { RecordPaymentRouters } from '../../logic/workflows/record_payment/routers'
import type { UpdateProgressRouters } from '../../logic/workflows/update_progress/routers'
import { LogicContext, type LogicRouters } from '../logic_context'

// A Routers operation answering the queued results in order; a call with
// nothing left fails the test (an unexpected call).
export function answers<A extends unknown[], R>(...results: R[]) {
  const queue = [...results]
  return vi.fn(async (..._args: A): Promise<R> => {
    void _args
    const next = queue.shift()
    if (next === undefined) throw new Error('test: no more results queued')
    return next
  })
}

// A Routers operation whose answer the test releases by hand (to see the
// page while the operation runs).
export function pending<A extends unknown[], R>() {
  let release: (r: R) => void = () => {}
  const fn = vi.fn(
    (..._args: A) =>
      new Promise<R>((resolve) => {
        void _args
        release = resolve
      }),
  )
  return { fn, release: (r: R) => release(r) }
}

const unexpected = (name: string) =>
  vi.fn(async () => {
    throw new Error(`test: ${name} was not expected to be called`)
  })

export function fakeManageClient(over: Partial<ManageClientRouters>): ManageClientRouters {
  return {
    loadClientList: unexpected('loadClientList'),
    loadClientDetail: unexpected('loadClientDetail'),
    openClientForm: unexpected('openClientForm'),
    saveClient: unexpected('saveClient'),
    setClientArchived: unexpected('setClientArchived'),
    ...over,
  }
}

export function fakeManageCommission(over: Partial<ManageCommissionRouters>): ManageCommissionRouters {
  return {
    loadCommissionList: unexpected('loadCommissionList'),
    loadCommissionDetail: unexpected('loadCommissionDetail'),
    openCommissionForm: unexpected('openCommissionForm'),
    saveCommission: unexpected('saveCommission'),
    reloadClientChoices: unexpected('reloadClientChoices'),
    ...over,
  }
}

export function fakeUpdateProgress(over: Partial<UpdateProgressRouters>): UpdateProgressRouters {
  return {
    loadProgressBoard: unexpected('loadProgressBoard'),
    loadCommissionProgress: unexpected('loadCommissionProgress'),
    openStageChange: unexpected('openStageChange'),
    saveStageChange: unexpected('saveStageChange'),
    ...over,
  }
}

export function fakeRecordPayment(over: Partial<RecordPaymentRouters>): RecordPaymentRouters {
  return {
    loadCommissionBalance: unexpected('loadCommissionBalance'),
    loadPaymentList: unexpected('loadPaymentList'),
    openPaymentForm: unexpected('openPaymentForm'),
    savePayment: unexpected('savePayment'),
    voidPayment: unexpected('voidPayment'),
    ...over,
  }
}

// Every Routers of the context; a workflow the test does not give fails on any call.
function logicOf(
  manageClient: ManageClientRouters,
  manageCommission: ManageCommissionRouters | undefined,
  updateProgress: UpdateProgressRouters | undefined,
  recordPayment: RecordPaymentRouters | undefined,
): LogicRouters {
  return {
    manageClient,
    manageCommission: manageCommission ?? fakeManageCommission({}),
    updateProgress: updateProgress ?? fakeUpdateProgress({}),
    recordPayment: recordPayment ?? fakeRecordPayment({}),
  }
}

export function renderWithLogic(
  ui: ReactNode,
  manageClient: ManageClientRouters,
  manageCommission?: ManageCommissionRouters,
  updateProgress?: UpdateProgressRouters,
  recordPayment?: RecordPaymentRouters,
) {
  return render(<LogicContext.Provider value={logicOf(manageClient, manageCommission, updateProgress, recordPayment)}>{ui}</LogicContext.Provider>)
}

// What the page shows at its very first commit (UI-4): the status messages,
// and the buttons that can be pressed.
export type FirstCommit = { statuses: string[]; enabledButtons: string[]; routersCalled: boolean }

// Renders the page and records the DOM of its first commit. render() runs
// inside act(), which also runs the effects that start loading, so looking
// after render() cannot tell the first frame from the next. The probe, a
// sibling rendered after the page, reads the DOM in its layout effect: the
// page is committed, and its passive effects (the call to Routers) have not
// run yet.
export function renderFirstCommit(
  ui: ReactNode,
  manageClient: ManageClientRouters,
  manageCommission?: ManageCommissionRouters,
  updateProgress?: UpdateProgressRouters,
  recordPayment?: RecordPaymentRouters,
): FirstCommit {
  let seen: FirstCommit | null = null
  const logic = logicOf(manageClient, manageCommission, updateProgress, recordPayment)
  const calls = () =>
    [
      ...Object.values(logic.manageClient),
      ...Object.values(logic.manageCommission),
      ...Object.values(logic.updateProgress),
      ...Object.values(logic.recordPayment),
    ].some((fn) => vi.isMockFunction(fn) && fn.mock.calls.length > 0)
  function Probe() {
    useLayoutEffect(() => {
      seen = {
        statuses: screen.queryAllByRole('status').map((e) => e.textContent ?? ''),
        enabledButtons: screen
          .queryAllByRole('button')
          .filter((b) => !(b as HTMLButtonElement).disabled)
          .map((b) => b.textContent ?? ''),
        routersCalled: calls(),
      }
    }, [])
    return null
  }
  render(
    <LogicContext.Provider value={logic}>
      {ui}
      <Probe />
    </LogicContext.Provider>,
  )
  if (seen === null) throw new Error('test: the first commit was not seen')
  return seen
}
