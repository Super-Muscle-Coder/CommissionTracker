// UI-11, step (4) of .plan/open_issues.md (decision A of the Project Owner,
// 2026-10-03): the test tooling restores the main window of the Electron app
// whenever it is minimized, and records every restore. Test tooling only: never
// part of the layer, never loaded by the renderer; no change to UI/src or Desktop/.
//
// Why: a minimized Electron window has no frames to draw, so a Playwright command
// that waits for one (a screenshot, or a click that waits for the page to be
// stable) waits until its timeout (UI-11 data of sessions 25 and 27). The person
// using the machine may minimize the window at any moment while e2e runs.
//
// How: one listener of the 'minimize' event of every BrowserWindow, installed in
// the Electron MAIN process (electronApp.evaluate), so it covers EVERY operation
// of the test and not only the screenshot command; it does not depend on the
// Playwright side being responsive. Source: Electron 44.4.5, electron.d.ts
// (the version installed in Desktop/): BrowserWindow event 'minimize' ("Emitted
// when the window is minimized", line 2268) and BrowserWindow.restore()
// ("Restores the window from minimized state to its previous state", line 3153),
// isMinimized() (line 3036). A window already minimized when the listener goes
// in has emitted its event already: it is checked once at installation.
// Only restore(): no focus(), no moveTop(), no setAlwaysOnTop(), no resize.
// The restore is called from setImmediate, out of the event handler itself.
//
// Every restore is kept in globalThis.__ctRestoreGuard.restores (main process);
// drainRestores() hands them to the Node side and empties the list.

const READ_LIMIT_MS = 3_000

function within(ms, promise) {
  let timer
  const late = new Promise((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms)
  })
  return Promise.race([promise.catch((e) => `error(${e instanceof Error ? e.message.slice(0, 80) : String(e)})`), late]).finally(() => clearTimeout(timer))
}

// Install the listener (once per app) and check the windows that exist now.
export async function installRestoreGuard(app) {
  return app.evaluate(({ app: electronApp, BrowserWindow }) => {
    const g = globalThis
    if (g.__ctRestoreGuard !== undefined) return 'already'
    const state = { restores: [], disabled: false }
    g.__ctRestoreGuard = state
    const restoreIfMinimized = (w) => {
      setImmediate(() => {
        if (state.disabled || w.isDestroyed() || !w.isMinimized()) return
        w.restore()
        state.restores.push({ at: new Date().toISOString(), windowId: w.id })
      })
    }
    const attach = (w) => {
      w.on('minimize', () => restoreIfMinimized(w))
      // Minimized before the listener went in: its event is gone.
      if (w.isMinimized()) restoreIfMinimized(w)
    }
    for (const w of BrowserWindow.getAllWindows()) attach(w)
    electronApp.on('browser-window-created', (_event, w) => attach(w))
    return 'installed'
  })
}

// Switch the restore off or on (the "bite" of the probe: the same run without the mechanism).
export function setRestoreGuardEnabled(app, enabled) {
  return app.evaluate((_electron, on) => {
    globalThis.__ctRestoreGuard.disabled = !on
  }, enabled)
}

// The restores since the last drain: [{ at, windowId }] ([] when none, or when the
// main process did not answer in time: the read is never allowed to hang a test).
export async function drainRestores(app) {
  const read = await within(
    READ_LIMIT_MS,
    app.evaluate(() => {
      const s = globalThis.__ctRestoreGuard
      if (s === undefined) return []
      return s.restores.splice(0, s.restores.length)
    }),
  )
  return Array.isArray(read) ? read : []
}
