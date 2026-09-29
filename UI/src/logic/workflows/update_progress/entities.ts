/**
 * Entities of the interface workflow update_progress: types only. Types at
 * the boundary keep the contract's field names (data_schema.yaml 8.0.1,
 * clause_b_backend.update_progress, and manage_commission for
 * commission_list). The commission types are this workflow's own
 * description of manage_commission's output, not the interface workflow
 * manage_commission's (R2; WCA: Entities are never shared).
 */

// Realizes clause_a_common.types.stage_kind: 'active' | 'on_hold' | 'finished' | 'cancelled'.
export type StageKind = 'active' | 'on_hold' | 'finished' | 'cancelled'

// Realizes one element of stage_options: object { stage: string, kind: stage_kind }.
export type StageOption = {
  stage: string
  kind: StageKind
}

// Realizes stage_options: list[StageOption] (ordered) — stage_catalog.
export type StageOptions = StageOption[]

// Realizes progress_state: object { commission_id: id, current_stage: string,
// stage_kind: stage_kind, updated_at: timestamp|null } — updated_at is null
// when no stage has been set yet (current_stage is then the first stage).
export type ProgressState = {
  commission_id: string
  current_stage: string
  stage_kind: StageKind
  updated_at: string | null
}

// Realizes clause_a_common.types.progress_entry_record: object {
// commission_id: id, current_stage: string, stage_kind: stage_kind }.
export type ProgressEntry = {
  commission_id: string
  current_stage: string
  stage_kind: StageKind
}

// Realizes progress_board: list[progress_entry_record] — one entry per
// commission that has had a stage set.
export type ProgressBoard = ProgressEntry[]

// Realizes one element of progress_history: object { from_stage:
// string|null, to_stage: string, note: string|null, changed_at: timestamp }.
export type ProgressHistoryEntry = {
  from_stage: string | null
  to_stage: string
  note: string | null
  changed_at: string
}

// Realizes progress_history: list[…] — oldest first.
export type ProgressHistory = ProgressHistoryEntry[]

// Realizes stage_change (sent): object { to_stage: string (a stage of
// stage_catalog), note: string|null }. Exactly these two fields.
export type StageChange = {
  to_stage: string
  note: string | null
}

// Realizes clause_a_common.types.money (checked, never shown here).
export type Money = {
  amount_minor: number
  currency: string
}

// Realizes one element of manage_commission's commission_list: object {
// commission_id: id, client_id: id, title: string, agreed_price: money,
// deadline: date|null, updated_at: timestamp }. This workflow shows only the
// title and the deadline (and sorts by updated_at), but every committed
// field is checked (i3-logic.md I3.3).
export type CommissionListItem = {
  commission_id: string
  client_id: string
  title: string
  agreed_price: Money
  deadline: string | null
  updated_at: string
}

export type CommissionList = CommissionListItem[]

// --- raw input from the page (what the user typed), handed to Routers ---------

export type StageChangeDraft = {
  // The chosen stage code ('' = "Chọn giai đoạn", nothing chosen).
  toStage: string
  note: string
}

// What a save of stage_change needs besides the draft: the commission, and
// the stages whose kind closes a commission (from the opened view), so
// Services decides whether to ask for confirmation without calling again.
export type StageChangeTarget = {
  commissionId: string
  closingStages: readonly string[]
}

// --- view models — the interface's own -----------------------------------------

// One commission of a group of the board: its title and one secondary line
// (the deadline).
export type BoardRowView = {
  commissionId: string
  title: string
  detailText: string
}

// One group of the board: a stage with at least one commission.
export type BoardGroupView = {
  key: string
  title: string
  rows: BoardRowView[]
}

// Groups in the order of list_stages, then the groups of unknown stages;
// isEmpty: there is no commission at all.
export type ProgressBoardView = {
  groups: BoardGroupView[]
  isEmpty: boolean
}

// The "Tiến độ" part of commission_detail.
export type CommissionProgressView = {
  // Name of the current stage.
  stageText: string
  // "cập nhật lúc <ngày giờ>" or "chưa cập nhật lần nào".
  updatedText: string
  // The history, newest first, one line each; [] when there is none.
  historyLines: string[]
  // Shown instead of the history lines when there are none.
  noHistoryText: string
  // The current stage is closed: no stage change any more.
  closed: boolean
  // "Đơn đang ở giai đoạn …, không đổi giai đoạn được nữa." when closed, else null.
  closedText: string | null
}

export type ChoiceView = { value: string; label: string }

// What stage_change opens with.
export type StageChangeView = {
  // Name of the current stage.
  currentStageText: string
  // The current stage is closed: no form, closedText instead.
  closed: boolean
  closedText: string | null
  // The stages that can be chosen, in the order of list_stages, without the current one.
  choices: ChoiceView[]
  // Label of the first choice of the list (nothing chosen).
  chooseLabel: string
  // What saving needs besides the draft.
  target: StageChangeTarget
  draft: StageChangeDraft
}

// Outcome of saving a stage change: either nothing was sent and the user
// must confirm first (a closed stage), or the stage was changed.
export type StageChangeOutcomeView =
  | { outcome: 'needs_confirmation'; message: string }
  | { outcome: 'changed'; commissionId: string; message: string }
