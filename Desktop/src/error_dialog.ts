/**
 * Text of the Main's error dialog: choosing the sentence and filling in the
 * paths. Presentation only (WCA section 5): the Main decides when the dialog is
 * shown, this file decides nothing about the data. No Electron import, so tests
 * can load it. Wording is in configs/desktop.json (main.error_dialog).
 */

/** The three values of `details.rollback_stage` of ERR_RESTORE_FAILED, as
 * API Contract 6.2.0 declares them in the `meaning` of that code (clause_a_common.error_codes).
 * Declared here, by the Main, because the Main reads the key; restore_data's own
 * RollbackStage in its Entities is the workflow's side of the same contract and
 * is not shared (WCA: two sides, one contract, no shared code). */
export type RollbackStage = 'start' | 'move_failed_aside' | 'move_back'

/** configs/desktop.json main.error_dialog. */
export interface ErrorDialogText {
  startup_summary: string
  running_summary: string
  /** One sentence per job of step 8 that can fail (DSK-26, f_restore.md section 3,
   * 9a-9c). {previous_database_path} and {db_file_path} are filled in. */
  restore_failed_summaries: Record<RollbackStage, string>
  detail_label: string
}

/** What the Main knows about a failed restore, taken from the `details` of
 * ERR_RESTORE_FAILED plus the live database path. */
export interface RestoreFailureContext {
  rollbackStage: string | null
  previousDatabasePath: string | null
  dbFilePath: string
}

/** When the failure happened: before the window finished loading ('startup'),
 * after the app was up ('running'), or when applying a pending restore failed
 * and the previous database could not be put back ('restore_failed'). Picks the
 * sentence. */
export type FailurePhase = 'startup' | 'running' | 'restore_failed'

const STAGES: readonly RollbackStage[] = ['move_failed_aside', 'move_back', 'start']

/** The context from error_body.details; a field of the wrong type is null. */
export function restoreFailureContext(details: unknown, dbFilePath: string): RestoreFailureContext {
  const record = typeof details === 'object' && details !== null ? (details as Record<string, unknown>) : {}
  const stage = record.rollback_stage
  const previous = record.previous_database_path
  return {
    rollbackStage: typeof stage === 'string' ? stage : null,
    previousDatabasePath: typeof previous === 'string' ? previous : null,
    dbFilePath,
  }
}

function fill(sentence: string, values: Record<string, string>): string {
  let text = sentence
  // split/join, not replace: a path may contain "$&" or similar.
  for (const [key, value] of Object.entries(values)) text = text.split(`{${key}}`).join(value)
  return text
}

/** The sentence of a failed restore. An unknown or missing stage (or a stage
 * that needs a path which is missing) gets the start-up sentence, which claims
 * nothing about where the data is. */
function restoreSummary(text: ErrorDialogText, context: RestoreFailureContext | undefined): string {
  if (context === undefined) return text.startup_summary
  const stage = STAGES.find((s) => s === context.rollbackStage)
  if (stage === undefined) return text.startup_summary
  if (stage !== 'start' && context.previousDatabasePath === null) return text.startup_summary
  return fill(text.restore_failed_summaries[stage], {
    previous_database_path: context.previousDatabasePath ?? '',
    db_file_path: context.dbFilePath,
  })
}

/** Text of the error dialog: a Vietnamese sentence first, the technical message
 * (the one logged after "FATAL:") after it. */
export function buildErrorDialog(
  title: string,
  text: ErrorDialogText,
  phase: FailurePhase,
  detail: string,
  restore?: RestoreFailureContext,
): { title: string; content: string } {
  const summary = phase === 'startup' ? text.startup_summary : phase === 'running' ? text.running_summary : restoreSummary(text, restore)
  return { title, content: `${summary}\n\n${text.detail_label}\n${detail}` }
}
