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

window.addEventListener('error', (event) => addError('error: ' + event.message))
window.addEventListener('unhandledrejection', (event) => addError('unhandled rejection: ' + String(event.reason)))
document.getElementById('rerun').addEventListener('click', () => {
  runProbe()
})
runProbe()
