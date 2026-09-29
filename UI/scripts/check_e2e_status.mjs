// Static check of the e2e specs (UI-10). Run by `npm run check`.
//
//   STATUS  in tests/e2e/**/*.ts, a text assertion (toHaveText, toContainText)
//           must not be called directly on getByRole('status') left unfiltered:
//           a page can hold several role="status" regions at once (the notice
//           of the page change, a part's "Đang tải…"), and an unfiltered
//           locator then fails in strict mode depending on how far loading is.
//           A locator narrowed with .filter(...) or a `name` option is not the
//           direct argument of expect(...), or has a second argument, so it
//           passes. toHaveCount is not a text assertion and is not checked.
//
// Reads files only. Prints one line per violation and exits with code 1 if
// there is any.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const LAYER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const E2E = path.join(LAYER_ROOT, 'tests', 'e2e')
const TEXT_ASSERTIONS = new Set(['toHaveText', 'toContainText'])

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const isStatusRole = (node) =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  node.expression.name.text === 'getByRole' &&
  node.arguments.length === 1 &&
  ts.isStringLiteralLike(node.arguments[0]) &&
  node.arguments[0].text === 'status'

// The matcher's receiver is expect(<arg>), possibly through .not / .soft.
function expectArgument(receiver) {
  let node = receiver
  while (ts.isPropertyAccessExpression(node)) node = node.expression
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'expect') return node.arguments[0]
  return null
}

const violations = []
for (const file of walk(E2E)) {
  if (!/\.ts$/.test(file)) continue
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && TEXT_ASSERTIONS.has(node.expression.name.text)) {
      const subject = expectArgument(node.expression.expression)
      if (subject && isStatusRole(subject)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart())
        const rel = path.relative(LAYER_ROOT, file).split(path.sep).join('/')
        violations.push(
          `STATUS ${rel}:${line + 1}: ${node.expression.name.text} on getByRole('status') without a filter; a page may have several status regions. Narrow it: getByRole('status').filter({ hasText: '…' }) and assert toHaveCount(1).`,
        )
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

if (violations.length > 0) {
  for (const v of violations) console.error(v)
  process.exit(1)
}
console.log('check_e2e_status: no unfiltered text assertion on getByRole(\'status\').')
