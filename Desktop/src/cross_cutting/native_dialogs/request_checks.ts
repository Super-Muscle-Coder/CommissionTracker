/**
 * Pure checks of native_dialogs on an incoming ipc call. No Electron import:
 * the Main side gathers the facts (is the sender the main window, what is the
 * frame's URL) and these functions only judge them, so they are tested alone.
 */

export interface SenderFacts {
  /** The call comes from the web contents of the Main's window. */
  senderIsMainWindow: boolean
  /** URL of the frame that sent the call; null when Electron gives no frame. */
  frameUrl: string | null
}

/** Node's URL gives origin "null" for non-special schemes such as app:, so
 * the origin is rebuilt from protocol and host (as the Main does). */
export function originOfUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

/** Why the call must be refused, or null when it is accepted: only the main
 * window's frame whose origin is shared_values.ui_origin may call. */
export function senderRefusal(facts: SenderFacts, uiOrigin: string): string | null {
  if (!facts.senderIsMainWindow) return 'the sender is not the main window'
  if (facts.frameUrl === null) return 'the sending frame is unknown'
  const origin = originOfUrl(facts.frameUrl)
  if (origin !== uiOrigin) return `the sending frame's origin is ${origin === null ? 'unreadable' : origin}, not ${uiOrigin}`
  return null
}

/** api_contract.yaml open_file input: list[object { name: string, extensions: list[string] }]. */
export interface FileFilter {
  name: string
  extensions: string[]
}

export type OpenFileArgument = { ok: true; filters: FileFilter[] | null } | { ok: false; reason: string }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** open_file takes { filters }, where filters is null or a list of
 * { name, extensions }. {} and no argument mean "no filter", as for
 * pick_folder. Any other shape is refused (the contract has no 400 label for
 * this entry). */
export function openFileArgument(argument: unknown): OpenFileArgument {
  if (argument === undefined) return { ok: true, filters: null }
  if (!isPlainObject(argument)) return { ok: false, reason: 'the argument is not an object' }
  const keys = Object.keys(argument)
  if (keys.some((key) => key !== 'filters')) return { ok: false, reason: 'the argument has a key other than filters' }
  const filters = argument.filters
  if (filters === undefined || filters === null) return { ok: true, filters: null }
  if (!Array.isArray(filters)) return { ok: false, reason: 'filters is not null or a list' }
  for (const filter of filters as unknown[]) {
    if (!isPlainObject(filter)) return { ok: false, reason: 'a filter is not an object' }
    if (Object.keys(filter).some((key) => key !== 'name' && key !== 'extensions')) return { ok: false, reason: 'a filter has a key other than name and extensions' }
    if (typeof filter.name !== 'string') return { ok: false, reason: 'a filter name is not a string' }
    if (!Array.isArray(filter.extensions) || !(filter.extensions as unknown[]).every((e) => typeof e === 'string')) {
      return { ok: false, reason: 'a filter extensions is not a list of strings' }
    }
  }
  return { ok: true, filters: filters as FileFilter[] }
}

/** pick_folder has no input (api_contract.yaml), so its argument is an empty
 * object ({}), or undefined (a call without argument means the same). Anything
 * else is refused; the contract has no 400 label for this entry. */
export function argumentRefusal(argument: unknown): string | null {
  if (argument === undefined) return null
  if (typeof argument === 'object' && argument !== null && !Array.isArray(argument) && Object.keys(argument).length === 0) return null
  return 'the argument is not an empty object'
}
