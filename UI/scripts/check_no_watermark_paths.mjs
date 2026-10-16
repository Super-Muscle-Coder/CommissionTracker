// Static check of the V1 scope (R44-2, UI-23). Run by `npm run check`.
//
// The interface of V1 has no screen for ownership profiles (CLAUDE.md section 5,
// .design/v1_scope.md 3.1): no page, no workflow, no call to the watermark
// endpoints, although the backend serves them. Until now only prose held that
// constraint. This script holds it by machine: it fails when any text file under
// src/ or tests/ contains one of the four forbidden address strings.
//
// There is NO exemption list. Comments, checkpoints and test files are scanned
// like code, so a file cannot name a forbidden address even to say it is absent;
// a comment points to this script instead. The script lives in scripts/, outside
// the two scanned folders, which is the only reason it can hold the strings.
//
// Reads files only. Prints one line per hit (file, line, string) and exits with
// code 1 if there is any.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LAYER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCANNED = ['src', 'tests']
const FORBIDDEN = ['/watermark-profiles', '/watermark-strengths', '/artworks', '/verifications']

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const hits = []
let scanned = 0
for (const root of SCANNED) {
  const dir = path.join(LAYER_ROOT, root)
  if (!fs.existsSync(dir)) continue
  for (const file of walk(dir)) {
    const buffer = fs.readFileSync(file)
    if (buffer.includes(0)) continue // binary file (an image, a database): no text to scan
    scanned += 1
    const rel = path.relative(LAYER_ROOT, file).split(path.sep).join('/')
    buffer.toString('utf8').split(/\r?\n/).forEach((text, index) => {
      for (const forbidden of FORBIDDEN) {
        if (text.includes(forbidden)) hits.push(`WATERMARK ${rel}:${index + 1}: contains "${forbidden}"`)
      }
    })
  }
}

if (hits.length > 0) {
  console.error(hits.join('\n'))
  console.error(
    `\n${hits.length} hit(s). V1 has no ownership-profile screen: the interface must not name or call these addresses (CLAUDE.md section 5, .design/v1_scope.md 3.1).`,
  )
  process.exit(1)
}
console.log(`check_no_watermark_paths: ${scanned} text files under src/ and tests/, none names a watermark address.`)
