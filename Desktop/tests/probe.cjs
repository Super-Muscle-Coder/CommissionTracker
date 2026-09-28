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

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-desktop-probe-'))
const args = [
  layerRoot,
  `${config.test_flags.renderer_root}${path.join(__dirname, 'fixtures', 'probe')}`,
  `${config.test_flags.data_dir}${dataDir}`,
]
console.log(`probe: temporary data folder ${dataDir}`)
const child = spawn(electronBinary, args, { cwd: layerRoot, stdio: 'inherit' })
child.on('exit', (code) => {
  console.log(`probe: app exited with code ${code}`)
  process.exitCode = code === null ? 1 : code
})
