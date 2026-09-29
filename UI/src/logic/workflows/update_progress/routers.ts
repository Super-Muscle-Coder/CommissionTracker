/**
 * Routers of the interface workflow update_progress: the only entry of the
 * workflow for the screens zone (i3-logic.md, Step I3.5). One operation per
 * thing a page does (.design/ui_decomposition.md, "Chặng D3": pages
 * progress_board, stage_change, and the "Tiến độ" part of commission_detail).
 */
import type { InputFormatCode, ViewResult } from '../../shared/results'
import type {
  CommissionProgressView,
  ProgressBoardView,
  StageChange,
  StageChangeDraft,
  StageChangeOutcomeView,
  StageChangeTarget,
  StageChangeView,
} from './entities'
import type { UpdateProgressServices } from './services'

// Format check and conversion of the stage_change draft, before anything is
// sent (ui_decomposition.md D3, page stage_change). Rule copied from the
// contract (data_schema.yaml 8.0.1 stage_change: to_stage is a string, a
// stage of stage_catalog): a stage chosen → else 'required' (it can only be
// chosen from list_stages). Rule of the interface only [UI-ONLY]: the note is
// trimmed (String.prototype.trim: ASCII spaces, U+00A0, U+3000, U+FEFF…);
// empty once trimmed → null. Field keys are the contract's field names.
function readDraft(draft: StageChangeDraft): { ok: true; input: StageChange } | { ok: false; errors: Record<string, InputFormatCode> } {
  if (draft.toStage === '') return { ok: false, errors: { to_stage: 'required' } }
  const note = draft.note.trim()
  return { ok: true, input: { to_stage: draft.toStage, note: note === '' ? null : note } }
}

export function createUpdateProgressRouters(services: UpdateProgressServices) {
  return {
    // Page progress_board: load (or reload) the board — stages, board, commissions.
    loadProgressBoard(): Promise<ViewResult<ProgressBoardView>> {
      return services.loadProgressBoard()
    },

    // Page commission_detail, part "Tiến độ": the current stage and the history.
    loadCommissionProgress(commissionId: string): Promise<ViewResult<CommissionProgressView>> {
      return services.loadCommissionProgress(commissionId)
    },

    // Page stage_change: what the form opens with (stages and the current stage).
    openStageChange(commissionId: string): Promise<ViewResult<StageChangeView>> {
      return services.openStageChange(commissionId)
    },

    // Page stage_change: "Lưu" (confirmed = false) or "Xác nhận" (confirmed =
    // true). Nothing is sent when the draft fails the format check; the page
    // keeps the draft as typed. target: from the opened view.
    async saveStageChange(target: StageChangeTarget, draft: StageChangeDraft, confirmed: boolean): Promise<ViewResult<StageChangeOutcomeView>> {
      const read = readDraft(draft)
      if (!read.ok) return services.rejectInput(read.errors)
      return services.saveStageChange(target, read.input, confirmed)
    },
  }
}

// Every type the screens zone needs — taken from here only (R8).
export type UpdateProgressRouters = ReturnType<typeof createUpdateProgressRouters>
export type { ViewResult } from '../../shared/results'
export type {
  BoardGroupView,
  BoardRowView,
  ChoiceView,
  CommissionProgressView,
  ProgressBoardView,
  StageChangeDraft,
  StageChangeOutcomeView,
  StageChangeTarget,
  StageChangeView,
} from './entities'
