// Test helper of the screens zone: fake Routers in the LogicContext, the way
// Main hands the real ones (i5-screens.md, Step I5.4). Test tooling only.
import { render, screen } from '@testing-library/react'
import { useLayoutEffect, type ReactNode } from 'react'
import { vi } from 'vitest'
import type { BackupDataRouters } from '../../logic/workflows/backup_data/routers'
import type { ManageClientRouters } from '../../logic/workflows/manage_client/routers'
import type { ManageCommissionRouters } from '../../logic/workflows/manage_commission/routers'
import type { RecordPaymentRouters } from '../../logic/workflows/record_payment/routers'
import type { RestoreDataRouters } from '../../logic/workflows/restore_data/routers'
import type { SendReminderRouters } from '../../logic/workflows/send_reminder/routers'
import type { UpdateProgressRouters } from '../../logic/workflows/update_progress/routers'
import type { ViewIncomeReportRouters } from '../../logic/workflows/view_income_report/routers'
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

// defaultPeriod is a plain synchronous operation, not a call that fails when
// unexpected: every page that opens income_report asks it once.
export function fakeViewIncomeReport(over: Partial<ViewIncomeReportRouters>): ViewIncomeReportRouters {
  return {
    defaultPeriod: vi.fn(() => ({ periodFrom: '2026-01-01', periodTo: '2026-09-30' })),
    viewIncomeReport: unexpected('viewIncomeReport'),
    ...over,
  }
}

// The three operations that only reshape the draft are plain synchronous ones
// (like defaultPeriod), with the behaviour Services gives them (D6): the
// weekday follows the unit, a new row is empty, a row goes.
export function fakeSendReminder(over: Partial<SendReminderRouters>): SendReminderRouters {
  return {
    loadPending: unexpected('loadPending'),
    acknowledge: unexpected('acknowledge'),
    openSettings: unexpected('openSettings'),
    saveSettings: unexpected('saveSettings'),
    changePeriodicUnit: vi.fn((d, unit) => ({ ...d, periodicUnit: unit, weekday: unit === 'weeks' ? (d.weekday === '' ? '1' : d.weekday) : '' })),
    addLeadTime: vi.fn((d) => ({ ...d, leadTimes: [...d.leadTimes, { amount: '', unit: 'days' }] })),
    removeLeadTime: vi.fn((d, index) => ({ ...d, leadTimes: d.leadTimes.filter((_row: unknown, i: number) => i !== index) })),
    // UI-13: the errors bound to a row of "Mốc nhắc" go once the rows change.
    dropLeadTimeErrors: vi.fn((saved) =>
      saved.kind === 'rejected' ? { ...saved, fieldErrors: Object.fromEntries(Object.entries(saved.fieldErrors).filter(([f]) => !f.startsWith('deadline.lead_times'))) } : saved,
    ),
    ...over,
  }
}

export function fakeBackupData(over: Partial<BackupDataRouters>): BackupDataRouters {
  return {
    createBackup: unexpected('createBackup'),
    ...over,
  }
}

export function fakeRestoreData(over: Partial<RestoreDataRouters>): RestoreDataRouters {
  return {
    loadStatus: unexpected('loadStatus'),
    chooseArchive: unexpected('chooseArchive'),
    prepare: unexpected('prepare'),
    cancel: unexpected('cancel'),
    ...over,
  }
}

// Every Routers of the context; a workflow the test does not give fails on any call.
function logicOf(
  manageClient: ManageClientRouters,
  manageCommission: ManageCommissionRouters | undefined,
  updateProgress: UpdateProgressRouters | undefined,
  recordPayment: RecordPaymentRouters | undefined,
  viewIncomeReport: ViewIncomeReportRouters | undefined,
  sendReminder: SendReminderRouters | undefined,
  backupData: BackupDataRouters | undefined,
  restoreData: RestoreDataRouters | undefined,
): LogicRouters {
  return {
    manageClient,
    manageCommission: manageCommission ?? fakeManageCommission({}),
    updateProgress: updateProgress ?? fakeUpdateProgress({}),
    recordPayment: recordPayment ?? fakeRecordPayment({}),
    viewIncomeReport: viewIncomeReport ?? fakeViewIncomeReport({}),
    sendReminder: sendReminder ?? fakeSendReminder({}),
    backupData: backupData ?? fakeBackupData({}),
    restoreData: restoreData ?? fakeRestoreData({}),
  }
}

export function renderWithLogic(
  ui: ReactNode,
  manageClient: ManageClientRouters,
  manageCommission?: ManageCommissionRouters,
  updateProgress?: UpdateProgressRouters,
  recordPayment?: RecordPaymentRouters,
  viewIncomeReport?: ViewIncomeReportRouters,
  sendReminder?: SendReminderRouters,
  backupData?: BackupDataRouters,
  restoreData?: RestoreDataRouters,
) {
  return render(
    <LogicContext.Provider value={logicOf(manageClient, manageCommission, updateProgress, recordPayment, viewIncomeReport, sendReminder, backupData, restoreData)}>
      {ui}
    </LogicContext.Provider>,
  )
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
  viewIncomeReport?: ViewIncomeReportRouters,
  sendReminder?: SendReminderRouters,
  backupData?: BackupDataRouters,
  restoreData?: RestoreDataRouters,
): FirstCommit {
  let seen: FirstCommit | null = null
  const logic = logicOf(manageClient, manageCommission, updateProgress, recordPayment, viewIncomeReport, sendReminder, backupData, restoreData)
  const calls = () =>
    [
      ...Object.values(logic.manageClient),
      ...Object.values(logic.manageCommission),
      ...Object.values(logic.updateProgress),
      ...Object.values(logic.recordPayment),
      ...Object.values(logic.backupData),
      ...Object.values(logic.restoreData),
      // The operations that reshape the draft or its errors are synchronous and not calls that load: not counted.
      ...Object.entries(logic.sendReminder)
        .filter(([name]) => !['changePeriodicUnit', 'addLeadTime', 'removeLeadTime', 'dropLeadTimeErrors'].includes(name))
        .map(([, fn]) => fn),
      // defaultPeriod is a synchronous read the page makes while it renders (its first draft), not a call that loads: not counted.
      ...Object.entries(logic.viewIncomeReport)
        .filter(([name]) => name !== 'defaultPeriod')
        .map(([, fn]) => fn),
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
