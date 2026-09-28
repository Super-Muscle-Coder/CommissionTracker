// ESLint flat config of the interface layer.
//
// Realizes the dependency matrix R1–R14 of iwca_theory.md §7 by machine
// (i2-scaffold.md, Step I2.3). Each rule of the matrix is data (MATRIX below);
// each zone of files lists the matrix rules that apply to it; zone() merges
// them into ONE option list per ESLint rule key. Writing the same ESLint rule
// key twice for the same files makes the later block silently replace the
// earlier one (the trap described in i2-scaffold.md), so no key is ever
// written twice for a file.
//
// Zones are disjoint. The only exemption for test files is the one iWCA
// grants: tests play Main when they build a workflow, so they may import
// configuration values (R14); and, so that this exemption cannot be used to
// launder a value, no runtime file imports a test file (TEST_IMPORTS). R2 and
// the "no style file in screens" part of R10 are checked by
// scripts/check_layer.mjs. Patches after the audit of session 11: P1 (R13,
// comparisons with kind), P2 (R12, paths from a DOM object to the global
// object, with the local type-aware rule ct/no-host-global-object), P3
// (TEST_IMPORTS).
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// --- building blocks ------------------------------------------------------------

const imports = (group, message, allowTypeImports = false) => ({ group, message, allowTypeImports })
// A regex pattern, for "everything under X except Y": gitignore-style
// negation ('!…') cannot re-include a file whose parent folder is excluded,
// so it silently fails for nested exceptions (found by the bite evidence of R8).
const importsRegex = (regex, message, allowTypeImports = false) => ({ regex, message, allowTypeImports, caseSensitive: true })
const names = (list, message) => list.map((name) => ({ name, message }))
const syntax = (selector, message) => ({ selector, message })

const NETWORK = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']
const STORAGE = ['localStorage', 'sessionStorage', 'indexedDB', 'caches']
// Names that are, or hand back, the renderer's global object (where the
// preload script places the bridge). Reflect, Function and eval reach it (or
// any property of any object) by name, which no import or syntax rule can follow.
const HOST_GLOBAL_OBJECTS = ['window', 'globalThis', 'self', 'top', 'parent', 'frames', 'opener', 'process',
  'Reflect', 'Function', 'eval']
// Properties that lead from a DOM object to the global object (or read a
// property through a getter by name). The type-aware rule below also catches
// every other path by the type of the result (e.g. event.view).
const HOST_GLOBAL_PROPERTIES = 'defaultView|contentWindow|parentWindow|getOwnPropertyDescriptors?|__lookupGetter__'
const STYLE_FILES = ['**/*.css', '**/*.scss', '**/*.sass', '**/*.less']

// --- local type-aware rule (R12) -------------------------------------------------
// R12 forbids reading launch values from the host environment outside Main.
// Banning the names of the global object is not enough: a DOM object leads
// back to it (document.defaultView, event.view, iframe.contentWindow), found
// by the audit of session 11 (P2). This rule reports every expression whose
// TYPE is the global object, whatever path produced it. It needs type
// information (projectService, set for every .ts/.tsx file below).
const HOST_TYPE_NAMES = new Set(['Window', 'WindowProxy', 'AbstractView', 'globalThis'])
const hostGlobalObjectRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { host: 'R12: only Main reads launch values from the host environment; this expression is the global object ({{type}}).' },
  },
  create(context) {
    const services = context.sourceCode.parserServices
    if (!services || !services.program || !services.getTypeAtLocation) {
      throw new Error('ct/no-host-global-object needs type information (parserOptions.projectService)')
    }
    const checker = services.program.getTypeChecker()
    const isHost = (type) => {
      if (type.isUnion() || type.isIntersection()) return type.types.some(isHost)
      const names = [type.getSymbol()?.getName(), type.aliasSymbol?.getName()]
      return names.some((n) => n !== undefined && HOST_TYPE_NAMES.has(n)) || checker.typeToString(type) === 'typeof globalThis'
    }
    const check = (node) => {
      const type = services.getTypeAtLocation(node)
      if (isHost(type)) context.report({ node, messageId: 'host', data: { type: checker.typeToString(type) } })
    }
    return {
      MemberExpression: check,
      CallExpression: check,
      // Destructuring reads a property without a MemberExpression: const { view } = event.
      'ObjectPattern > Property': (node) => check(node.value),
    }
  },
}
const LOCAL_PLUGIN = { rules: { 'no-host-global-object': hostGlobalObjectRule } }

// --- the matrix (iwca_theory.md §7) -----------------------------------------------

const MATRIX = {
  R1: {
    imports: [
      imports(['react', 'react/**', 'react-dom', 'react-dom/**', '@testing-library/**'],
        'R1: the logic zone must not depend on the UI library.'),
      imports(['**/kit', '**/kit/**', '**/screens', '**/screens/**', '**/main', '**/main.*'],
        'R1: the logic zone must not import the kit zone, the screens zone or Main.'),
    ],
    syntax: [
      syntax('JSXElement', 'R1: the logic zone must not contain JSX (it pulls in the UI library).'),
      syntax('JSXFragment', 'R1: the logic zone must not contain JSX (it pulls in the UI library).'),
    ],
  },
  R3: {
    imports: [imports(['**/workflows', '**/workflows/**'], 'R3: logic/shared must not import logic/workflows.')],
  },
  R4: {
    globals: names(['window', 'document', 'navigator', 'location', 'history'],
      'R4: the logic zone must not use host environment or browser APIs.'),
  },
  R5_network: {
    globals: names(NETWORK, 'R5: the bare network API is allowed only in the adapters of the foundation workflow scaffold_ui.'),
  },
  R5_storage: {
    globals: names(STORAGE, 'R5: local storage APIs are allowed only in an adapters file.'),
  },
  R6: {
    imports: [
      imports(['**/logic', '**/logic/**', '**/screens', '**/screens/**', '**/main', '**/main.*'],
        'R6: the kit zone must not import the logic zone, the screens zone or Main.'),
    ],
  },
  R7_kit: {
    syntax: [
      syntax("JSXAttribute[name.name='style']",
        'R7: no inline style in the kit; put style in the component CSS module, with role tokens only.'),
    ],
  },
  R8: {
    imports: [
      // Any path through a 'logic' folder, except exactly logic/workflows/<name>/routers.
      importsRegex('(^|/)logic($|/(?!workflows/[^/]+/routers$))',
        'R8: the screens zone may import from the logic zone only from logic/workflows/*/routers.'),
      importsRegex('(^|/)logic/workflows/[^/]+/routers$',
        'R8: the screens zone may import only TYPES from Routers; the Routers value comes from the context (useLogic).', true),
    ],
  },
  R9: {
    // Any path into the kit folder, except exactly kit/index (importing the folder itself is kit/index too).
    imports: [importsRegex('(^|/)kit/(?!index$)', 'R9: the screens zone imports the kit only through its public entry kit/index.')],
  },
  R10: {
    imports: [imports(STYLE_FILES, 'R10: the screens zone has no style file; lay out with kit layout components.')],
    syntax: [
      syntax("JSXAttribute[name.name='style']", 'R10: no style prop in the screens zone; use kit layout components with token names.'),
      syntax("JSXAttribute[name.name='className']", 'R10: no className prop in the screens zone; use kit layout components with token names.'),
      syntax("JSXOpeningElement[name.name='style']", 'R10: no <style> element in the screens zone.'),
    ],
  },
  R11: {
    globals: names([...NETWORK, ...STORAGE, 'window', 'document', 'navigator', 'location', 'history'],
      'R11: the screens zone must not use the network, IPC, local storage or host environment values; call Routers.'),
  },
  R12: {
    globals: names(HOST_GLOBAL_OBJECTS, 'R12: only Main reads launch values from the host environment.'),
    syntax: [
      syntax("MemberExpression[object.type='MetaProperty'][property.name='env']",
        'R12: only Main reads launch values from the host environment (no build-time environment variables).'),
      syntax(`MemberExpression[property.name=/^(${HOST_GLOBAL_PROPERTIES})$/]`,
        'R12: only Main reads launch values from the host environment (no path from a DOM object to the global object).'),
      syntax(`ObjectPattern > Property[key.name=/^(${HOST_GLOBAL_PROPERTIES})$/]`,
        'R12: only Main reads launch values from the host environment (no path from a DOM object to the global object).'),
    ],
    local: { 'ct/no-host-global-object': 'error' },
  },
  // R13: every branching on kind is exhaustive. switch-exhaustiveness-check
  // (baseline block below) only sees switch statements, so an if or a ?: on
  // kind escaped it (audit of session 11, P1); banning comparisons only still
  // let kind escape through a copy, a destructuring, a table lookup or
  // .includes (audit of session 12, Q1 / UI-1). So the property kind is READ
  // in exactly one place: as the discriminant of a switch
  // (SwitchStatement.discriminant), which switch-exhaustiveness-check then
  // holds to every kind, ending in assertNever. Every other read of a
  // property named kind — r.kind, r['kind'], r?.kind, const { kind } = r,
  // const { kind: k } = r, a destructured parameter — is forbidden. Writing
  // kind in an object literal or a type is not a read and stays allowed.
  // Applies to Transport.kind too. Test files are exempt (TEST_EXEMPT): they
  // assert on results (expect(r.kind).toBe(...)) and branch on nothing.
  // Limit (static analysis): a read through any, or through a key computed
  // at run time (r[k]), is not seen.
  R13: {
    syntax: [
      "MemberExpression[property.name='kind'][computed=false]:not(SwitchStatement > MemberExpression.discriminant)",
      "MemberExpression[computed=true][property.value='kind']:not(SwitchStatement > MemberExpression.discriminant)",
      "MemberExpression[computed=true][property.type='TemplateLiteral'][property.quasis.0.value.cooked='kind']",
      "ObjectPattern > Property[key.name='kind']",
      "ObjectPattern > Property[key.value='kind']",
    ].map((s) => syntax(s, 'R13: the property kind is read only as the discriminant of a switch that ends in assertNever (no copy, destructuring, lookup, includes or comparison).')),
  },
  R14: {
    imports: [
      imports(['**/configs', '**/configs/**', '**/configs.*'],
        'R14: only Main and tests import configuration VALUES; import the type only and receive the value from Main.', true),
    ],
  },
  // Support of R14 (and of every zone rule): test files are exempt from R14,
  // so a runtime file importing a test file would launder configuration values
  // through it (audit of session 11, P3). Runtime files import nothing from a
  // tests/ folder or a *.test.* file; test files may.
  TEST_IMPORTS: {
    imports: [
      importsRegex('(^|/)tests(/|$)', 'R14: a runtime file imports nothing from a tests/ folder.'),
      importsRegex('\\.test(\\.[^/]*)?$', 'R14: a runtime file imports nothing from a *.test.* file.'),
    ],
  },
  // Support of every import rule above (R1, R3, R6, R8, R9, R10, R14): the
  // import rules only see static import/export declarations, so a dynamic
  // import() would walk around all of them.
  STATIC_IMPORTS_ONLY: {
    syntax: [
      syntax('ImportExpression',
        'R1/R3/R6/R8/R9/R10/R14: no dynamic import() outside Main; the dependency matrix is checked on static imports only.'),
    ],
  },
}

// Merge the matrix rules of a zone into one option list per ESLint rule key.
// A global or selector restricted by several matrix rules keeps every message.
//
// Import patterns go to two different rule keys, on purpose:
//   - forbidden outright (types included) → core 'no-restricted-imports',
//     which checks every import declaration, type-only ones included;
//   - forbidden for values only (R8 Routers, R14 configs) →
//     '@typescript-eslint/no-restricted-imports' with allowTypeImports.
// Both in the typescript-eslint rule would leak: a type-only import matching
// ANY allowTypeImports pattern is skipped by that rule before the other
// patterns are tried (found by the bite evidence of R3: an import type from
// a workflow's configs file escaped R3).
function zoneRules(ids) {
  const byName = new Map()
  const bySelector = new Map()
  const forbidden = []
  const valuesForbidden = []
  const local = {}
  for (const id of ids) {
    const rule = MATRIX[id]
    Object.assign(local, rule.local ?? {})
    for (const g of rule.globals ?? []) byName.set(g.name, [...(byName.get(g.name) ?? []), g.message])
    for (const s of rule.syntax ?? []) bySelector.set(s.selector, [...(bySelector.get(s.selector) ?? []), s.message])
    for (const { allowTypeImports, ...pattern } of rule.imports ?? []) {
      if (allowTypeImports) valuesForbidden.push({ ...pattern, allowTypeImports })
      else forbidden.push(pattern)
    }
  }
  return {
    'no-restricted-globals': ['error', ...[...byName].map(([name, m]) => ({ name, message: m.join(' | ') }))],
    'no-restricted-syntax': ['error', ...[...bySelector].map(([selector, m]) => ({ selector, message: m.join(' | ') }))],
    'no-restricted-imports': ['error', { patterns: forbidden }],
    '@typescript-eslint/no-restricted-imports': ['error', { patterns: valuesForbidden }],
    // 'off' when the zone has no rule that needs it: the rule is registered for
    // every .ts/.tsx file, so a zone must say whether it applies.
    'ct/no-host-global-object': local['ct/no-host-global-object'] ?? 'off',
  }
}

const TEST_FILES = ['**/tests/**', '**/*.test.{ts,tsx}']
// Matrix rules test files are exempt from: tests play Main when they build a
// workflow (R14), may import test helpers (TEST_IMPORTS), and assert on the
// kind of a result without branching on it (R13, since session 16: plan UI-1).
const TEST_EXEMPT = new Set(['R14', 'TEST_IMPORTS', 'R13'])

// Two blocks per zone: runtime files get every rule of the zone, and never
// import a test file; test files of the zone get the same rules except R14.
function zone(name, files, ids, ignores = []) {
  const runtime = [...ids, 'TEST_IMPORTS']
  return [
    { name: `zone:${name}`, files, ignores: [...ignores, ...TEST_FILES], rules: zoneRules(runtime) },
    {
      name: `zone:${name}:tests`,
      files: files.flatMap((f) => TEST_FILES.map((t) => [f, t])),
      ignores,
      rules: zoneRules(runtime.filter((id) => !TEST_EXEMPT.has(id))),
    },
  ]
}

const FOUNDATION_ADAPTERS = 'src/logic/workflows/scaffold_ui/adapters.ts'
const ANY_ADAPTERS = 'src/logic/workflows/*/adapters.ts'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'test-results', 'playwright-report', 'coverage', 'evidence']),

  // --- baseline -----------------------------------------------------------------
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { ct: LOCAL_PLUGIN },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // R13: every branching on the kind of a ViewResult or CallResult is
      // exhaustive. A default branch does not count as handling the missing
      // kinds; the last branch is assertNever (type never).
      '@typescript-eslint/switch-exhaustiveness-check': ['error', {
        considerDefaultExhaustiveForUnions: false,
        requireDefaultForNonUnion: false,
      }],
    },
  },
  { files: ['src/**/*.{ts,tsx}', 'tests/main/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
  { files: ['tests/e2e/**/*.ts', 'vite.config.ts'], languageOptions: { globals: globals.node } },

  // --- zones (disjoint) -------------------------------------------------------------
  // Main: reads the host environment (R12) and configuration values (R14).
  ...zone('main', ['src/main.tsx'], []),
  ...zone('configs', ['src/configs/**/*.{ts,tsx}'], ['R12', 'R14', 'STATIC_IMPORTS_ONLY']),
  ...zone('logic-shared', ['src/logic/shared/**/*.{ts,tsx}'],
    ['R1', 'R3', 'R4', 'R5_network', 'R5_storage', 'R12', 'R13', 'R14', 'STATIC_IMPORTS_ONLY']),
  // The one file allowed the bare network API (and, being an adapters file, storage).
  ...zone('logic-foundation-adapters', [FOUNDATION_ADAPTERS], ['R1', 'R4', 'R12', 'R13', 'R14', 'STATIC_IMPORTS_ONLY']),
  // Other adapters files: storage allowed, network not.
  ...zone('logic-adapters', [ANY_ADAPTERS],
    ['R1', 'R4', 'R5_network', 'R12', 'R13', 'R14', 'STATIC_IMPORTS_ONLY'], [FOUNDATION_ADAPTERS]),
  ...zone('logic-workflows', ['src/logic/workflows/**/*.{ts,tsx}'],
    ['R1', 'R4', 'R5_network', 'R5_storage', 'R12', 'R13', 'R14', 'STATIC_IMPORTS_ONLY'], [ANY_ADAPTERS]),
  ...zone('kit', ['src/kit/**/*.{ts,tsx}'], ['R6', 'R7_kit', 'R12', 'R14', 'STATIC_IMPORTS_ONLY']),
  ...zone('screens', ['src/screens/**/*.{ts,tsx}'],
    ['R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'STATIC_IMPORTS_ONLY']),
  // Layer-level tests (Main in jsdom, e2e through the desktop app).
  ...zone('layer-tests', ['tests/**/*.{ts,tsx}'], ['R12']),
])
