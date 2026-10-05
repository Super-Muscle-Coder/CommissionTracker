// Measurement tool for DSK-17 (plan of desktop session 30, task 2): does a
// Windows toast shown by Electron 44.4.5 appear, and does it need an
// Application User Model ID, when the app runs from source. Test tooling only:
// not the Main, not a spec of npm test. It shows ONE toast and logs, as one JSON
// line per event on stdout, isSupported() and the events show, failed, click,
// close of that toast. Nothing is written outside a temporary user-data folder.
//
// Run (from Desktop/):
//   node_modules\electron\dist\electron.exe tests\tools\toast_probe_main.cjs [--aumid=<id>] [--label=<text>] [--seconds=<n>]
// Without --aumid the probe does not call app.setAppUserModelId.
const { app, Notification } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const opt = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit === undefined ? fallback : hit.slice(name.length + 3)
}
const aumid = opt('aumid', null)
const label = opt('label', aumid === null ? 'without AUMID' : `AUMID ${aumid}`)
const seconds = Number(opt('seconds', '12'))
const emit = (event, extra = {}) => process.stdout.write(`${JSON.stringify({ at: new Date().toISOString(), label, event, ...extra })}\n`)

app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ct-toast-probe-')))
if (aumid !== null) app.setAppUserModelId(aumid)

app.whenReady().then(() => {
  emit('ready', { isSupported: Notification.isSupported(), aumidSet: aumid, appName: app.getName(), isPackaged: app.isPackaged })
  const toast = new Notification({ title: `Thử thông báo (${label})`, body: 'Đây là thông báo thử của Commission Tracker; bấm vào để thử sự kiện click.' })
  for (const name of ['show', 'click', 'close']) toast.on(name, () => emit(name))
  toast.on('failed', (_event, error) => emit('failed', { error }))
  toast.show()
  emit('show() called')
  setTimeout(() => {
    emit('done')
    app.exit(0)
  }, seconds * 1000)
})
