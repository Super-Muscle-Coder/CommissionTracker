// npm run walkthrough:backend -- down|up
//
// Switches off (down) or on (up) the backend behind the app started by
// npm run walkthrough:app (or by the automated walkthrough), through the
// control file of the fixture tests/fixtures/switchable_backend.py. Waits
// until the switch is done. Test tooling only.
import { readSession, setBackend } from './walkthrough_lib.mjs'

const wanted = process.argv[2]
if (wanted !== 'down' && wanted !== 'up') {
  console.error('usage: npm run walkthrough:backend -- down|up')
  process.exit(2)
}

const session = readSession()
await setBackend(session.dataDir, wanted)
console.log(`walkthrough:backend: backend is ${wanted} (${session.baseUrl}).`)
