/**
 * Routers of the interface workflow backup_data: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing the page does (.design/ui_decomposition.md, "Chặng E": page backup):
 * "Tạo bản sao lưu". The page has no input field, so nothing is checked here:
 * the folder comes from the dialog and is checked by the backend (400).
 */
import type { ViewResult } from '../../shared/results'
import type { BackupRunView } from './entities'
import type { BackupDataServices } from './services'

export function createBackupDataRouters(services: BackupDataServices) {
  return {
    // Page backup: the whole flow (choose a folder, then create the archive).
    // onCreating is called once, when the archive starts being made.
    createBackup(onCreating: () => void): Promise<ViewResult<BackupRunView>> {
      return services.createBackup(onCreating)
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type BackupDataRouters = ReturnType<typeof createBackupDataRouters>
export type { ViewResult } from '../../shared/results'
export type { BackupResultEntry, BackupRunView } from './entities'
