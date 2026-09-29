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
export declare function launchArgs(dataDir: string, options: { noDialog: boolean }): string[]
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
