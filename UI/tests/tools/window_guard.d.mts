import type { ElectronApplication } from '@playwright/test'

export type WindowRestore = { at: string; windowId: number; way: string; focusedAfter: boolean }
export declare function installRestoreGuard(app: ElectronApplication): Promise<string>
export declare function setRestoreGuardEnabled(app: ElectronApplication, enabled: boolean): Promise<void>
export declare function drainRestores(app: ElectronApplication): Promise<WindowRestore[]>
