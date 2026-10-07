import type { ElectronApplication } from '@playwright/test'

export type FolderDialogReply = { kind: 'choose'; path: string } | { kind: 'cancel' } | { kind: 'throw' }
export declare function installFolderDialogStub(app: ElectronApplication): Promise<string>
export declare function setFolderDialogReply(app: ElectronApplication, reply: FolderDialogReply): Promise<void>
export declare function folderDialogCalls(app: ElectronApplication): Promise<number>
