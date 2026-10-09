// Types of walkthrough_lib.mjs, for the Playwright spec (TypeScript).
export declare const UI_ROOT: string
export declare const DESKTOP_ROOT: string
export declare const BACKEND_ROOT: string
export declare const FIXTURE: string
export declare const SESSION_FILE: string
export declare const desktopConfig: {
  boundary: { loopback_host: string; ui_origin: string; db_file_relative_to_app_data: string }
  renderer: { root_dir: string }
  test_flags: Record<string, string>
}
export declare const RUNNER_VARIABLE: string
export declare function walkthroughRunner(): string
export declare function evidenceRoot(): string
export declare function electronBinary(): string
export declare function makeDataDir(): string
export declare function launchArgs(dataDir: string, options: { noDialog: boolean; showInactive?: boolean }): string[]
export declare function showInactiveForRun(): boolean
export declare const SHOW_INACTIVE_LOG_LINE: string
export declare function portFromLog(log: string): number | null
export declare function baseUrlFor(port: number): string
export type WalkthroughSession = { dataDir: string; baseUrl: string; pid: number | null }
export declare function writeSession(session: WalkthroughSession): void
export declare function readSession(): WalkthroughSession
export declare function clearSession(): void
export declare function setBackend(dataDir: string, wanted: 'down' | 'up', timeoutMs?: number): Promise<void>
export declare const SAMPLE_ACTIVE: string[]
export declare const SAMPLE_DETAILED: { display_name: string; contacts: { channel: string; value: string }[]; note: string }
export declare const SAMPLE_ARCHIVED: string[]
export declare const EXPECTED_ACTIVE: string[]
export declare const EXPECTED_ARCHIVED: string[]
export declare function seedSampleData(baseUrl: string): Promise<void>
export declare const AFTER_LAST_WRITE_MS: number
export declare function setStage(baseUrl: string, commissionId: string, toStage: string, note: string | null): Promise<unknown>
export declare const D3_EXTRA: {
  title: string
  commission_type: string | null
  agreed_price: { amount_minor: number; currency: string }
  deadline: string | null
  description: string | null
  reference_links: string[]
}
export declare const D3_NOTES: { lineart: string; delivered: string }
export declare const D3_EXPECTED_BOARD: [string, [string, string][]][]
export declare function seedProgressSample(
  baseUrl: string,
): Promise<{ clients: Record<D2Key, string>; commissions: Record<D2Key | 'extra', string> }>
type D2Key = 'full' | 'usd' | 'archived'
export declare const D2_CLIENTS: Record<D2Key, string>
export declare const D2_COMMISSIONS: Record<
  D2Key,
  {
    client: D2Key
    title: string
    commission_type: string | null
    agreed_price: { amount_minor: number; currency: string }
    deadline: string | null
    description: string | null
    reference_links: string[]
  }
>
export declare const D2_EXPECTED_LIST: [string, string][]
export declare function seedCommissionSample(baseUrl: string): Promise<{ clients: Record<D2Key, string>; commissions: Record<D2Key, string> }>
export type PaymentInputSample = {
  direction: 'incoming' | 'refund'
  kind: 'deposit' | 'milestone' | 'final' | 'tip' | 'other'
  amount: { amount_minor: number; currency: string }
  method: string
  paid_at: string
  note: string | null
}
export declare function recordPayment(baseUrl: string, commissionId: string, paymentInput: PaymentInputSample): Promise<{ payment_id: string }>
export declare function voidPayment(baseUrl: string, paymentId: string): Promise<unknown>
export declare const D4_PAYMENTS: Record<'deposit' | 'milestone' | 'tip' | 'refund' | 'mistaken' | 'overpaid', PaymentInputSample>
export declare function seedPaymentSample(baseUrl: string): Promise<{ clients: Record<D2Key, string>; commissions: Record<D2Key, string> }>
export declare function seedIncomeSample(baseUrl: string): Promise<{ clients: Record<D2Key, string>; commissions: Record<D2Key | 'cancelled', string> }>
export declare const D5_PAYMENTS: Record<'cancelledDeposit' | 'usdAugust', PaymentInputSample>
export declare const D5_CANCELLED: { title: string; agreed_price: { amount_minor: number; currency: string } }
export declare const D5_PERIODS: { twoMonths: [string, string]; september: [string, string]; nothingPaid: [string, string] }
export declare const D6_TITLES: Record<'today' | 'past' | 'none', string>
export declare const localDate: (d: Date) => string
export declare const dmy: (iso: string) => string
export type ReminderSample = {
  client: string
  commissions: Record<'today' | 'past' | 'none', string>
  today: string
  digestTime: string
  digestDate: string
}
export declare function seedReminderSample(baseUrl: string, options?: { beforeCheck?: () => Promise<void> }): Promise<ReminderSample>
export declare function d6ExpectedReminders(sample: ReminderSample): [string, string][]
export declare function makeBackupDir(): string
export type RestoreStaging = {
  archive_path: string
  is_valid: boolean
  is_compatible: boolean
  app_version: string | null
  created_at: string | null
  reason: string | null
  staged_db_path: string | null
}
export declare function prepareRestore(baseUrl: string, archivePath: string): Promise<RestoreStaging>
export declare function dbFolder(dataDir: string): string
export declare function createClient(baseUrl: string, displayName: string): Promise<{ client_id: string }>
export declare function createBackupFile(baseUrl: string, destinationDir: string): Promise<string>
export declare function clientNames(baseUrl: string): Promise<string[]>
export declare const KEPT_FILE: string
export declare function resetFixtureControl(dataDir: string): void
