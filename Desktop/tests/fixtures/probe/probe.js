// Probe page of the desktop layer tests: shows what the renderer receives
// from the preload script and whether it can read a backend response.
// Every error is shown, never swallowed.
'use strict'

const BRIDGE_NAME = 'commissionTracker' // data_schema.yaml shared_values.renderer_bridge

function show(id, text) {
  document.getElementById(id).textContent = text
}

function addError(text) {
  const el = document.getElementById('error')
  el.textContent = (el.textContent ? el.textContent + '\n' : '') + text
}

async function runProbe() {
  document.getElementById('done').hidden = true
  show('error', '')
  show('origin', location.origin)

  const bridge = window[BRIDGE_NAME]
  if (bridge === undefined) {
    show('bridge', 'missing')
    addError('window.' + BRIDGE_NAME + ' is not defined')
    document.getElementById('done').hidden = false
    return
  }
  show(
    'bridge',
    JSON.stringify({
      keys: Object.keys(bridge),
      frozen: Object.isFrozen(bridge),
      invoke: typeof bridge.invoke,
      nodeRequire: typeof window.require,
      nodeProcess: typeof window.process,
    }),
  )
  show('backend-base-url', String(bridge.backendBaseUrl))

  try {
    const response = await fetch(bridge.backendBaseUrl + '/clients')
    show('status', String(response.status))
    show('body', await response.text())
  } catch (err) {
    show('status', 'no response')
    addError('fetch failed: ' + (err && err.message ? err.message : String(err)))
  }
  document.getElementById('done').hidden = false
}

// "Chọn thư mục": the answer (or the rejection) of the native folder dialog,
// shown as it arrives.
document.getElementById('pick-folder').addEventListener('click', async () => {
  show('pick-folder-answer', '(waiting for the dialog)')
  try {
    const answer = await window[BRIDGE_NAME].invoke('dialog:pick-folder', {})
    show('pick-folder-answer', JSON.stringify(answer))
  } catch (err) {
    show('pick-folder-answer', 'rejected: ' + (err && err.message ? err.message : String(err)))
  }
})

// Calls an ipc address and shows the answer (or the rejection) in the given element.
async function callAndShow(id, address, argument) {
  show(id, '(waiting)')
  try {
    const answer = await window[BRIDGE_NAME].invoke(address, argument)
    show(id, JSON.stringify(answer))
    return answer
  } catch (err) {
    show(id, 'rejected: ' + (err && err.message ? err.message : String(err)))
    return null
  }
}

// "Chọn tệp sao lưu": the file dialog with a .ctbackup filter; the chosen path
// is kept for "Chuẩn bị khôi phục".
let chosenArchivePath = null
document.getElementById('open-file').addEventListener('click', async () => {
  const answer = await callAndShow('open-file-answer', 'dialog:open-file', {
    filters: [{ name: 'Tệp sao lưu Commission Tracker', extensions: ['ctbackup'] }],
  })
  chosenArchivePath = answer && answer.body && answer.body.path ? answer.body.path : null
})
document.getElementById('restore-prepare').addEventListener('click', () => {
  if (chosenArchivePath === null) {
    show('restore-prepare-answer', '(choose a backup file first)')
    return
  }
  callAndShow('restore-prepare-answer', 'restore:prepare', { archive_path: chosenArchivePath })
})
document.getElementById('restore-status').addEventListener('click', () => {
  callAndShow('restore-status-answer', 'restore:status', {})
})
document.getElementById('restore-cancel').addEventListener('click', () => {
  callAndShow('restore-cancel-answer', 'restore:cancel', {})
})

window.addEventListener('error', (event) => addError('error: ' + event.message))
window.addEventListener('unhandledrejection', (event) => addError('unhandled rejection: ' + String(event.reason)))
document.getElementById('rerun').addEventListener('click', () => {
  runProbe()
})
runProbe()
