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

/** pick_folder has no input (api_contract.yaml), so its argument is an empty
 * object ({}), or undefined (a call without argument means the same). Anything
 * else is refused; the contract has no 400 label for this entry. */
export function argumentRefusal(argument: unknown): string | null {
  if (argument === undefined) return null
  if (typeof argument === 'object' && argument !== null && !Array.isArray(argument) && Object.keys(argument).length === 0) return null
  return 'the argument is not an empty object'
}
