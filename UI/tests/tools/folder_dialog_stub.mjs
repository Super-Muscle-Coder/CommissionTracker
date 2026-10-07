// Chặng E (session 34): the test tooling replaces the folder dialog of the desktop
// app, so that an automated run (e2e, and the run that writes evidence) never opens
// a real dialog and never needs a person. Test tooling only: never part of the
// layer, never loaded by the renderer; no change to UI/src or Desktop/, no flag.
//
// How (measured in session 34, item 2 of the plan; the Desktop did the same in
// native_dialogs-EXP-003): dialog.showOpenDialog is a writable property of the
// `dialog` object of the Electron MAIN process, and the compiled handler of
// dialog:pick-folder reads it at call time. electronApp.evaluate assigns a function
// to it, which answers by the reply set from the test (mode) and counts its calls.
// The replacement is made once per app. Only the dialog:pick-folder handler uses
// showOpenDialog, so nothing else is affected.
//
// Replies: choose a folder (the folder must be a temporary folder of the run, never
// one in UI/, in %APPDATA% or in a folder of the person), cancel, or throw (the
// rejection a failing dialog gives: Electron wraps the text, so no page may depend on it).

export async function installFolderDialogStub(app) {
  return app.evaluate(({ dialog }) => {
    const g = globalThis
    if (g.__ctFolderDialog !== undefined) return 'already'
    g.__ctFolderDialog = { reply: { kind: 'cancel' }, calls: 0 }
    dialog.showOpenDialog = async () => {
      const state = g.__ctFolderDialog
      state.calls += 1
      if (state.reply.kind === 'throw') throw new Error('folder dialog stub: thrown on purpose')
      if (state.reply.kind === 'cancel') return { canceled: true, filePaths: [] }
      return { canceled: false, filePaths: [state.reply.path] }
    }
    return 'installed'
  })
}

// reply: { kind: 'choose', path } | { kind: 'cancel' } | { kind: 'throw' }
export async function setFolderDialogReply(app, reply) {
  await app.evaluate((_electron, wanted) => {
    globalThis.__ctFolderDialog.reply = wanted
  }, reply)
}

// How many times the dialog has been "opened" (the replacement called) since installation.
export async function folderDialogCalls(app) {
  return app.evaluate(() => globalThis.__ctFolderDialog.calls)
}
