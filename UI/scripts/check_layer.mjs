// Checks of the dependency matrix (iwca_theory.md §7) that ESLint and stylelint
// cannot express (i2-scaffold.md, Step I2.2). Run by `npm run check`.
//
//   ZONES  every file under src/ lies in a zone the lint config knows: Main
//          (src/main.tsx), configs/, logic/shared/, logic/workflows/<name>/,
//          kit/, screens/. A file outside every zone would escape every rule.
//   R2     a file of logic/workflows/<A>/ imports only files of <A>/ and
//          logic/shared/. Import strings are resolved to real paths: a glob on
//          the string cannot tell '../B/x' (another workflow) from
//          '../../shared/x' at different depths.
//   R10    no style file under src/screens/ (ESLint catches importing one;
//          this catches the file itself).
//
// Prints one line per violation and exits with code 1 if there is any.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const LAYER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(LAYER_ROOT, 'src')
const LOGIC_SHARED = path.join(SRC, 'logic', 'shared')
const LOGIC_WORKFLOWS = path.join(SRC, 'logic', 'workflows')
const SCREENS = path.join(SRC, 'screens')

const CODE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/
const STYLE_FILE = /\.(css|scss|sass|less|styl|pcss)$/

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const rel = (p) => path.relative(LAYER_ROOT, p).split(path.sep).join('/')
const inside = (p, dir) => p === dir || p.startsWith(dir + path.sep)

const violations = []
const files = walk(SRC)

// ZONES
const ZONE_DIRS = ['configs', 'logic/shared', 'logic/workflows', 'kit', 'screens'].map((d) => path.join(SRC, ...d.split('/')))
for (const file of files) {
  const inZone = file === path.join(SRC, 'main.tsx') || ZONE_DIRS.some((d) => inside(file, d))
  if (!inZone) violations.push(`ZONES ${rel(file)}: file outside every zone (main.tsx, configs/, logic/shared/, logic/workflows/<name>/, kit/, screens/).`)
  else if (path.dirname(file) === LOGIC_WORKFLOWS) violations.push(`ZONES ${rel(file)}: a file of logic/workflows/ must be inside a workflow folder.`)
}

// R2
for (const file of files) {
  if (!CODE_FILE.test(file) || !inside(file, LOGIC_WORKFLOWS) || path.dirname(file) === LOGIC_WORKFLOWS) continue
  const workflow = path.relative(LOGIC_WORKFLOWS, file).split(path.sep)[0]
  const workflowDir = path.join(LOGIC_WORKFLOWS, workflow)
  const info = ts.preProcessFile(fs.readFileSync(file, 'utf8'), true, true)
  for (const { fileName: spec } of info.importedFiles) {
    if (spec.startsWith('/') || /^[a-zA-Z]:/.test(spec)) {
      violations.push(`R2 ${rel(file)}: import '${spec}' is an absolute path; import only files of '${workflow}' and logic/shared by relative path.`)
      continue
    }
    if (!spec.startsWith('.')) continue // a package; R1 decides which packages are allowed
    const target = path.resolve(path.dirname(file), spec)
    if (!inside(target, workflowDir) && !inside(target, LOGIC_SHARED)) {
      violations.push(`R2 ${rel(file)}: import '${spec}' resolves to ${rel(target)}, outside workflow '${workflow}' and logic/shared. Another interface workflow is reached through Adapters, with an entry handed over by Main.`)
    }
  }
}

// R10
for (const file of files) {
  if (inside(file, SCREENS) && STYLE_FILE.test(file)) {
    violations.push(`R10 ${rel(file)}: the screens zone has no style file; lay out with kit layout components.`)
  }
}

if (violations.length > 0) {
  for (const v of violations) console.error(v)
  console.error(`check_layer: ${violations.length} violation(s).`)
  process.exit(1)
}
console.log(`check_layer: ${files.length} files under src/ checked (ZONES, R2, R10), no violation.`)
