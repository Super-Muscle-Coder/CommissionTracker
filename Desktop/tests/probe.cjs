// npm run probe: start the app with the probe page (tests/fixtures/probe) and
// a fresh temporary data folder, so the Project Owner can see the real origin,
// the bridge and a GET /clients answer. Dialogs are shown as in a normal run.
// Never touches the real %APPDATA%/CommissionTracker/data.db.
'use strict'

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const layerRoot = path.resolve(__dirname, '..')
const config = JSON.parse(fs.readFileSync(path.join(layerRoot, 'configs', 'desktop.json'), 'utf8'))
const electronBinary = require('electron')

// npm run probe -- --data-dir <folder>: keep that folder between runs, so a restore
// prepared in one run is applied by the next (desktop session 36). Without the
// option every run gets a fresh temporary folder. Either way the folder is passed
// as --ct-test-data-dir, so the real %APPDATA%/CommissionTracker is never used.
const optionIndex = process.argv.indexOf('--data-dir')
let dataDir
if (optionIndex >= 0) {
  const given = process.argv[optionIndex + 1]
  if (given === undefined || given === '' || given.startsWith('--')) {
    console.error('probe: --data-dir needs a folder path')
    process.exit(2)
  }
  dataDir = path.resolve(given)
  fs.mkdirSync(dataDir, { recursive: true })
} else {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-desktop-probe-'))
}
const args = [
  layerRoot,
  `${config.test_flags.renderer_root}${path.join(__dirname, 'fixtures', 'probe')}`,
  `${config.test_flags.data_dir}${dataDir}`,
]
console.log(`probe: ${optionIndex >= 0 ? 'kept' : 'temporary'} data folder ${dataDir}`)
const child = spawn(electronBinary, args, { cwd: layerRoot, stdio: 'inherit' })
child.on('exit', (code) => {
  console.log(`probe: app exited with code ${code}`)
  process.exitCode = code === null ? 1 : code
})
