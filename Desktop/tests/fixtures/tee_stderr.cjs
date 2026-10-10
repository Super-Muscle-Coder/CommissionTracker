// Test-only: loaded into the Electron main process with NODE_OPTIONS=--require (set by
// launchMain in tests/helpers.ts). Copies everything the Main writes to stderr into the file
// named by CT_TEE_STDERR_FILE, from the very first line (DSK-27). Playwright's
// _electron.launch only lets a test see stderr from the moment launch() returns, so the
// first lines ("main started", often "backend started") were lost. The Main itself is
// not touched and never loads this file.
const fs = require('node:fs')

const target = process.env.CT_TEE_STDERR_FILE
if (target && process.type === 'browser') {
  const original = process.stderr.write.bind(process.stderr)
  process.stderr.write = (chunk, ...rest) => {
    try {
      fs.appendFileSync(target, chunk)
    } catch {
      // a lost copy only brings back the old behaviour
    }
    return original(chunk, ...rest)
  }
}
