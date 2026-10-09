/**
 * Routers of the interface workflow restore_data: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing the page does (.design/ui_decomposition.md, "Chặng F": page restore):
 * open the page, choose a file, prepare the restore, cancel the waiting one.
 * The page has no input field, so nothing is checked here: the file comes from
 * the dialog and is checked by the desktop (400, 404, 409).
 */
import type { ViewResult } from '../../shared/results'
import type { ChoiceView } from './entities'
import type { RestoreDataServices, RunOutcome } from './services'

export function createRestoreDataRouters(services: RestoreDataServices) {
  return {
    // Page restore, on opening: read what is waiting.
    loadStatus(): Promise<RunOutcome> {
      return services.loadStatus()
    },
    // "Chọn tệp sao lưu": the dialog, then the question for the page. replacesPending:
    // whether a restore is waiting now (the question then says this one replaces it).
    chooseArchive(replacesPending: boolean): Promise<ViewResult<ChoiceView>> {
      return services.chooseArchive(replacesPending)
    },
    // "Chuẩn bị khôi phục", once the question was answered yes.
    prepare(archivePath: string): Promise<RunOutcome> {
      return services.prepare(archivePath)
    },
    // "Hủy lần khôi phục đang chờ".
    cancel(): Promise<RunOutcome> {
      return services.cancel()
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type RestoreDataRouters = ReturnType<typeof createRestoreDataRouters>
export type { ViewResult } from '../../shared/results'
export type { ChoiceView, PendingEntry, PendingView, RunDone } from './entities'
export type { RunOutcome } from './services'
