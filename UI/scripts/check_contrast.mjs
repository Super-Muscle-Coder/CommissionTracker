// Contrast check of the token file (.design/ui_decomposition.md §7.1). Run by
// `npm run check`. Two groups of pairs:
//   text      text on its background, >= 4.5:1 (WCAG AA, normal text);
//   non-text  a part the user must see to use a control — field border,
//             focus ring, current navigation mark — against the colour right
//             next to it, >= 3:1 (WCAG 2.1, 1.4.11). Disabled controls are
//             exempt (WCAG), so no disabled state is listed. Decorative
//             borders of panels and lists are not in this group.
//
// Reads src/kit/tokens/tokens.css, resolves each role token through var() to
// its base value, and computes the WCAG 2.x contrast ratio of every pair
// below. A pair under its minimum, a token that does not exist, or a value
// that is not a #rgb / #rrggbb colour fails the check (exit code 1).
//
// Which colour is "right next to" a non-text part depends on the CSS (an
// outline drawn outside the control sits on what is around it; one drawn
// inside, with a negative offset, sits on the control). So each non-text pair
// also lists the CSS declarations that put the part there, and the check
// reads the kit's CSS modules to confirm them: if a component changes one of
// them, the pair no longer describes the real place and the check fails.
//
// A component that puts a text colour, or an interactive part, on a new
// background adds its pair here.
//
// UNLISTED TOKENS (R44-4). The pair lists above are typed by hand, so a
// component that switched to a colour token no pair mentions was never
// measured (a Caption in --color-action-text-disabled, about 3.2:1, passed).
// The check therefore also reads every CSS file of the kit and, for each
// declaration of `color` (text) and of `border*` / `outline*` (non-text) that
// uses a --color-* token, requires the token to be the foreground of a pair of
// the matching group above. Why this way: deriving the pairs from the CSS
// would need the background a rule paints, which depends on the parent; the
// token-level rule needs no such guess and still stops a token nobody measured.
// Limit: it holds the token, not the background it lands on (the pinned CSS
// declarations of the non-text pairs hold the places that matter).
//
// A declaration that must use an unlisted token is named in EXEMPT: file,
// rule, token and the reason. An exemption is for one rule of one file, never
// for a token everywhere, and an exemption that matches nothing fails too.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LAYER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TOKENS = path.join(LAYER_ROOT, 'src', 'kit', 'tokens', 'tokens.css')
const COMPONENTS = path.join(LAYER_ROOT, 'src', 'kit', 'components')
const MINIMUM = { text: 4.5, 'non-text': 3 }

// [text token, background token, where the kit uses this pair]
const TEXT_PAIRS = [
  ['--color-text', '--color-surface', 'body text and headings on the page (global.css, Section, TextField, TextArea, SelectField, DateField, DateTimeField and TimeField labels, CheckboxField label, FieldGroup legend)'],
  ['--color-text', '--color-surface-header', 'application title (AppFrame header)'],
  ['--color-text', '--color-surface-raised', 'NavMenu items, ItemList rows, DescriptionList details'],
  ['--color-text', '--color-surface-hover', 'hovered NavMenu item and ItemList row'],
  ['--color-text', '--color-surface-selected', 'current NavMenu item'],
  ['--color-text', '--color-surface-field', 'text typed or chosen in TextField, TextArea, SelectField, DateField, DateTimeField, TimeField'],
  ['--color-text', '--color-surface-danger', 'InlineAlert text, FatalMessage detail, ConfirmPanel text'],
  ['--color-text-muted', '--color-surface', 'Section group heading, LoadingIndicator, SelectField hint, Caption, label of a disabled CheckboxField'],
  ['--color-text-muted', '--color-surface-raised', 'DescriptionList terms, ItemList secondary line'],
  ['--color-text-muted', '--color-surface-hover', 'ItemList secondary line of a hovered row'],
  ['--color-text-muted', '--color-surface-muted', 'EmptyState text'],
  ['--color-text-muted', '--color-surface-field', 'text of a disabled TextField, TextArea, SelectField, DateField, DateTimeField, TimeField (while saving; the locked currency)'],
  ['--color-text-danger', '--color-surface', 'field error under a TextField, TextArea, SelectField, DateField, DateTimeField or TimeField'],
  ['--color-text-danger', '--color-surface-danger', 'InlineAlert title, FatalMessage title, ConfirmPanel title'],
  ['--color-text-success', '--color-surface-success', 'SuccessNotice'],
  ['--color-action-text', '--color-action', 'primary Button, ConfirmPanel confirm button'],
  ['--color-action-text', '--color-action-hover', 'primary Button, ConfirmPanel confirm button, hovered'],
  ['--color-action-secondary-text', '--color-action-secondary', 'secondary Button (also the action button of an ItemList row), ConfirmPanel cancel button'],
  ['--color-action-secondary-text', '--color-action-secondary-hover', 'secondary Button (also the action button of an ItemList row), ConfirmPanel cancel button, hovered'],
]

// The kit's input fields: each draws its border, error border and focus ring
// the same way, from the same selectors (.input, .inputError).
const FIELDS = [
  'TextField/TextField.module.css',
  'TextArea/TextArea.module.css',
  'SelectField/SelectField.module.css',
  'DateField/DateField.module.css',
  'DateTimeField/DateTimeField.module.css',
  'TimeField/TimeField.module.css',
]

// CSS declarations of the kit that decide where a non-text part is drawn:
// [CSS module under src/kit/components, selector, property, value].
const CSS = {
  fieldBorder: FIELDS.map((f) => [f, '.input', 'border', 'var(--border-width-panel) solid var(--color-border-field)']),
  fieldBackground: FIELDS.map((f) => [f, '.input', 'background', 'var(--color-surface-field)']),
  fieldErrorBorder: FIELDS.map((f) => [f, '.inputError', 'border-color', 'var(--color-border-field-danger)']),
  // Offset 0: the outline starts at the outer edge of the border and goes
  // outward, onto what is around the field.
  fieldRingOutside: FIELDS.flatMap((f) => [
    [f, '.input:focus-visible', 'outline', 'var(--border-width-focus) solid var(--color-focus-ring)'],
    [f, '.input:focus-visible', 'outline-offset', '0'],
    [f, '.inputError:focus-visible', 'outline-offset', '0'],
  ]),
  // CheckboxField: a positive offset too, so its ring sits on the page the
  // checkbox is on, not on the checkbox.
  checkboxRingOutside: [
    ['CheckboxField/CheckboxField.module.css', '.input:focus-visible', 'outline', 'var(--border-width-focus) solid var(--color-focus-ring)'],
    ['CheckboxField/CheckboxField.module.css', '.input:focus-visible', 'outline-offset', 'var(--border-width-focus)'],
  ],
  // Positive offset: a gap as wide as the ring separates it from the button,
  // so the ring touches only what is around the button — never the button
  // itself. This is why no pair "ring on --color-action" is listed: it would
  // be about 2.55:1, and the ring is not there.
  buttonRingOutside: [
    ['Button/Button.module.css', '.primary:focus-visible', 'outline', 'var(--border-width-focus) solid var(--color-focus-ring)'],
    ['Button/Button.module.css', '.primary:focus-visible', 'outline-offset', 'var(--border-width-focus)'],
    ['Button/Button.module.css', '.secondary:focus-visible', 'outline-offset', 'var(--border-width-focus)'],
  ],
  // ConfirmPanel's buttons: ring outside (positive offset, like Button), so
  // it sits on the panel's background, the danger surface.
  confirmPanelRingOutside: [
    ['ConfirmPanel/ConfirmPanel.module.css', '.confirm:focus-visible', 'outline', 'var(--border-width-focus) solid var(--color-focus-ring)'],
    ['ConfirmPanel/ConfirmPanel.module.css', '.confirm:focus-visible', 'outline-offset', 'var(--border-width-focus)'],
    ['ConfirmPanel/ConfirmPanel.module.css', '.cancel:focus-visible', 'outline-offset', 'var(--border-width-focus)'],
    ['ConfirmPanel/ConfirmPanel.module.css', '.panel', 'background', 'var(--color-surface-danger)'],
  ],
  // The list, and so the row that holds an action button, is drawn on the raised surface.
  itemListRowBackground: [['ItemList/ItemList.module.css', '.list', 'background', 'var(--color-surface-raised)']],
  emptyStateRingOutside: [
    ['EmptyState/EmptyState.module.css', '.action:focus-visible', 'outline-offset', 'var(--border-width-focus)'],
    ['EmptyState/EmptyState.module.css', '.empty', 'background', 'var(--color-surface-muted)'],
  ],
  // Negative offset: the ring is drawn inside the item, on its background.
  itemRingInside: [
    ['NavMenu/NavMenu.module.css', '.item:focus-visible', 'outline-offset', 'calc(-1 * var(--border-width-focus))'],
    ['NavMenu/NavMenu.module.css', '.current:focus-visible', 'outline-offset', 'calc(-1 * var(--border-width-focus))'],
    ['ItemList/ItemList.module.css', '.select:focus-visible', 'outline-offset', 'calc(-1 * var(--border-width-focus))'],
  ],
  navItemBackgrounds: [
    ['NavMenu/NavMenu.module.css', '.item', 'background', 'var(--color-surface-raised)'],
    ['NavMenu/NavMenu.module.css', '.item:hover', 'background', 'var(--color-surface-hover)'],
    ['NavMenu/NavMenu.module.css', '.current', 'background', 'var(--color-surface-selected)'],
    ['ItemList/ItemList.module.css', '.select', 'background', 'var(--color-surface-raised)'],
    ['ItemList/ItemList.module.css', '.select:hover', 'background', 'var(--color-surface-hover)'],
  ],
  // The current item is marked by its left border (and a heavier font), on
  // the item's own background inside and the navigation region outside.
  navCurrentMark: [
    ['NavMenu/NavMenu.module.css', '.current', 'border-left-color', 'var(--color-border-selected)'],
    ['NavMenu/NavMenu.module.css', '.current', 'background', 'var(--color-surface-selected)'],
    ['AppFrame/AppFrame.module.css', '.nav', 'background', 'var(--color-surface-raised)'],
  ],
}

// [part token, adjacent colour token, where, CSS that puts the part there]
const NON_TEXT_PAIRS = [
  ['--color-border-field', '--color-surface-field', 'TextField, TextArea, SelectField, DateField, DateTimeField, TimeField border — inner edge, on the field', [...CSS.fieldBorder, ...CSS.fieldBackground]],
  ['--color-border-field', '--color-surface', 'TextField, TextArea, SelectField, DateField, DateTimeField, TimeField border — outer edge, on the page the form sits on', CSS.fieldBorder],
  ['--color-border-field-danger', '--color-surface-field', 'TextField, TextArea, SelectField, DateField, DateTimeField, TimeField border with an error — inner edge', [...CSS.fieldErrorBorder, ...CSS.fieldBackground]],
  ['--color-border-field-danger', '--color-surface', 'TextField, TextArea, SelectField, DateField, DateTimeField, TimeField border with an error — outer edge, on the page', CSS.fieldErrorBorder],
  ['--color-focus-ring', '--color-surface', 'focus ring of Button (also the DateField clear button), of CheckboxField and of TextField, TextArea, SelectField, DateField, DateTimeField, TimeField — drawn outside, on the page', [...CSS.buttonRingOutside, ...CSS.checkboxRingOutside, ...CSS.fieldRingOutside]],
  // The action button of an ItemList row is a Button: its ring sits outside it (positive offset), on the row, whose background is the list's.
  ['--color-focus-ring', '--color-surface-raised', 'focus ring of the action button of an ItemList row — drawn outside the button, on the row', [...CSS.buttonRingOutside, ...CSS.itemListRowBackground]],
  ['--color-focus-ring', '--color-surface-muted', 'focus ring of the EmptyState button — drawn outside, on the EmptyState box', CSS.emptyStateRingOutside],
  ['--color-focus-ring', '--color-surface-danger', 'focus ring of the ConfirmPanel buttons — drawn outside, on the panel', CSS.confirmPanelRingOutside],
  ['--color-focus-ring', '--color-surface-raised', 'focus ring of a NavMenu item, an ItemList row — drawn inside, on the item', [...CSS.itemRingInside, ...CSS.navItemBackgrounds]],
  ['--color-focus-ring', '--color-surface-hover', 'focus ring of a hovered NavMenu item or ItemList row — drawn inside', [...CSS.itemRingInside, ...CSS.navItemBackgrounds]],
  ['--color-focus-ring', '--color-surface-selected', 'focus ring of the current NavMenu item — drawn inside', [...CSS.itemRingInside, ...CSS.navItemBackgrounds]],
  ['--color-border-selected', '--color-surface-selected', 'mark of the current NavMenu item — on the item', CSS.navCurrentMark],
  ['--color-border-selected', '--color-surface-raised', 'mark of the current NavMenu item — on the navigation region', CSS.navCurrentMark],
]

// Rules of a CSS module: [{ selectors, declarations: Map(property → value) }].
const cssCache = new Map()
function cssRules(file) {
  if (!cssCache.has(file)) {
    const css = fs.readFileSync(path.join(COMPONENTS, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = []
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const declarations = new Map()
      for (const d of m[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)) declarations.set(d[1], d[2].trim().replace(/\s+/g, ' '))
      rules.push({ selectors: m[1].split(',').map((s) => s.trim()), declarations })
    }
    cssCache.set(file, rules)
  }
  return cssCache.get(file)
}

// The value the selector ends up with for the property is the expected one:
// the last rule listing that selector and setting the property wins (the
// kit's module selectors are single classes with pseudo-classes, so equal
// specificity, and source order decides). Returns an error message, or null.
function checkCss([file, selector, property, value]) {
  let rules
  try {
    rules = cssRules(file)
  } catch (e) {
    return `cannot read ${file}: ${e.message}`
  }
  const set = rules.filter((r) => r.selectors.includes(selector) && r.declarations.has(property)).map((r) => r.declarations.get(property))
  if (set.length === 0) return `${file} ${selector} does not set ${property} (expected ${value})`
  const last = set[set.length - 1]
  if (last !== value) return `${file} ${selector} ends with ${property}: ${last} (expected ${value})`
  return null
}

// Declarations allowed to use a colour token that has no pair. [CSS file under
// src/kit, the selectors of the rule joined by ', ', token, reason]. WCAG 2.1
// 1.4.3 and 1.4.11 exempt inactive components, and 1.4.11 asks contrast only of
// the parts a user needs to see to operate a control, so the decorative
// borders of panels and lists, and a button border equal to its own fill, are
// not measured (ui_decomposition.md section 7.1).
const EXEMPT = [
  ['components/Button/Button.module.css', '.primary:disabled, .secondary:disabled', '--color-action-text-disabled', 'text of a disabled button: an inactive component is exempt (WCAG 2.1 1.4.3)'],
  ['components/ConfirmPanel/ConfirmPanel.module.css', '.confirm:disabled, .cancel:disabled', '--color-action-text-disabled', 'text of a disabled button: an inactive component is exempt (WCAG 2.1 1.4.3)'],
  ['components/AppFrame/AppFrame.module.css', '.header', '--color-border', 'decorative border of a panel, list or divider: not a part needed to operate a control (header note)'],
  ['components/AppFrame/AppFrame.module.css', '.nav', '--color-border', 'decorative border of a panel, list or divider: not a part needed to operate a control (header note)'],
  ['components/Button/Button.module.css', '.primary', '--color-action', 'border of the primary button, equal to its own fill: it adds no edge that needs contrast'],
  ['components/Button/Button.module.css', '.primary:hover:not(:disabled)', '--color-action-hover', 'border of the primary button, equal to its own fill: it adds no edge that needs contrast'],
  ['components/Button/Button.module.css', '.secondary', '--color-border', 'border of a secondary button: the button is found by its text and fill; kept out of the non-text group (header note)'],
  ['components/Button/Button.module.css', '.primary:disabled, .secondary:disabled', '--color-action-disabled', 'border of a disabled button: an inactive component is exempt (WCAG 2.1 1.4.11)'],
  ['components/ConfirmPanel/ConfirmPanel.module.css', '.panel', '--color-border-danger', 'decorative border of a notice panel: its text carries the message'],
  ['components/ConfirmPanel/ConfirmPanel.module.css', '.confirm', '--color-action', 'border of the primary button, equal to its own fill: it adds no edge that needs contrast'],
  ['components/ConfirmPanel/ConfirmPanel.module.css', '.confirm:hover:not(:disabled)', '--color-action-hover', 'border of the primary button, equal to its own fill: it adds no edge that needs contrast'],
  ['components/ConfirmPanel/ConfirmPanel.module.css', '.cancel', '--color-border', 'border of a secondary button: the button is found by its text and fill; kept out of the non-text group (header note)'],
  ['components/ConfirmPanel/ConfirmPanel.module.css', '.confirm:disabled, .cancel:disabled', '--color-action-disabled', 'border of a disabled button: an inactive component is exempt (WCAG 2.1 1.4.11)'],
  ['components/DescriptionList/DescriptionList.module.css', '.list', '--color-border', 'decorative border of a panel, list or divider: not a part needed to operate a control (header note)'],
  ['components/DescriptionList/DescriptionList.module.css', '.entry + .entry', '--color-border', 'decorative border of a panel, list or divider: not a part needed to operate a control (header note)'],
  ['components/EmptyState/EmptyState.module.css', '.empty', '--color-border', 'decorative border of a panel, list or divider: not a part needed to operate a control (header note)'],
  ['components/EmptyState/EmptyState.module.css', '.action', '--color-border', 'border of a secondary button: the button is found by its text and fill; kept out of the non-text group (header note)'],
  ['components/FatalMessage/FatalMessage.module.css', '.panel', '--color-border-danger', 'decorative border of a notice panel: its text carries the message'],
  ['components/InlineAlert/InlineAlert.module.css', '.alert', '--color-border-danger', 'decorative border of a notice panel: its text carries the message'],
  ['components/ItemList/ItemList.module.css', '.list', '--color-border', 'decorative border of a panel, list or divider: not a part needed to operate a control (header note)'],
  ['components/ItemList/ItemList.module.css', '.item + .item', '--color-border', 'decorative border of a panel, list or divider: not a part needed to operate a control (header note)'],
  ['components/SuccessNotice/SuccessNotice.module.css', '.notice', '--color-border-success', 'decorative border of a notice panel: its text carries the message'],
]

const PAIRS = [
  ...TEXT_PAIRS.map(([fg, bg, usedBy]) => ({ group: 'text', fg, bg, usedBy, css: [] })),
  ...NON_TEXT_PAIRS.map(([fg, bg, usedBy, css]) => ({ group: 'non-text', fg, bg, usedBy, css })),
]

function readTokens(file) {
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = new Map()
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens.set(m[1], m[2].trim())
  return tokens
}

function resolve(tokens, name, seen = []) {
  if (!tokens.has(name)) throw new Error(`token ${name} is not defined in tokens.css`)
  if (seen.includes(name)) throw new Error(`token ${name} refers to itself (${[...seen, name].join(' -> ')})`)
  const value = tokens.get(name)
  const ref = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(value)
  return ref === null ? value : resolve(tokens, ref[1], [...seen, name])
}

function rgb(value, name) {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  if (short !== null) return short.slice(1).map((h) => parseInt(h + h, 16))
  if (long !== null) return long.slice(1).map((h) => parseInt(h, 16))
  throw new Error(`token ${name} resolves to ${JSON.stringify(value)}, not a #rgb or #rrggbb colour`)
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const tokens = readTokens(TOKENS)
const failures = []
for (const { group, fg: fgToken, bg: bgToken, usedBy, css } of PAIRS) {
  const minimum = MINIMUM[group]
  const tag = `[${group} >= ${minimum}:1]`.padEnd(18)
  try {
    const fg = resolve(tokens, fgToken)
    const bg = resolve(tokens, bgToken)
    const r = ratio(rgb(fg, fgToken), rgb(bg, bgToken))
    const line = `${tag}${r.toFixed(2).padStart(6)}:1  ${fgToken} (${fg}) on ${bgToken} (${bg}) — ${usedBy}`
    const cssErrors = css.map(checkCss).filter((m) => m !== null)
    if (r < minimum) failures.push(`below ${line}`)
    else if (cssErrors.length > 0) failures.push(`place ${line}\n        the CSS no longer puts it there: ${cssErrors.join('; ')}`)
    else console.log(`ok    ${line}`)
  } catch (e) {
    failures.push(`error ${tag}${fgToken} on ${bgToken}: ${e.message}`)
  }
}

// --- unlisted tokens (R44-4) --------------------------------------------------
const KIT_ROOT = path.join(LAYER_ROOT, 'src', 'kit')
function kitCssFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...kitCssFiles(full))
    else if (entry.name.endsWith('.css') && full !== TOKENS) out.push(full)
  }
  return out
}

const textTokens = new Set(TEXT_PAIRS.map(([fg]) => fg))
const partTokens = new Set(NON_TEXT_PAIRS.map(([fg]) => fg))
const groupOf = (property) => (property === 'color' ? 'text' : /^(border|outline)(-[a-z]+)*$/.test(property) ? 'non-text' : null)
const usedExemptions = new Set()
let declarationsChecked = 0
for (const file of kitCssFiles(KIT_ROOT)) {
  const rel = path.relative(KIT_ROOT, file).split(path.sep).join('/')
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim()).join(', ')
    for (const d of m[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)) {
      const group = groupOf(d[1])
      if (group === null) continue
      for (const t of d[2].matchAll(/var\(\s*(--color-[a-z0-9-]+)\s*\)/g)) {
        declarationsChecked += 1
        const token = t[1]
        if ((group === 'text' ? textTokens : partTokens).has(token)) continue
        const exemption = EXEMPT.findIndex(([f, s, k]) => f === rel && s === selectors && k === token)
        if (exemption !== -1) {
          usedExemptions.add(exemption)
          continue
        }
        failures.push(
          `unlisted ${rel} ${selectors} { ${d[1]}: ${d[2].trim()} }: ${token} is the foreground of no ${group} pair; add its pair to ${group === 'text' ? 'TEXT_PAIRS' : 'NON_TEXT_PAIRS'}, or list an exemption with a reason`,
        )
      }
    }
  }
}
EXEMPT.forEach(([file, selectors, token], index) => {
  if (!usedExemptions.has(index)) failures.push(`stale exemption ${file} ${selectors} ${token}: no declaration matches it any more; remove it`)
})

const count = (group) => PAIRS.filter((p) => p.group === group).length
if (failures.length > 0) {
  for (const f of failures) console.error(f)
  console.error(`check_contrast: ${failures.length} failure(s) (${PAIRS.length} pairs checked; text >= ${MINIMUM.text}:1, non-text >= ${MINIMUM['non-text']}:1).`)
  process.exit(1)
}
console.log(
  `check_contrast: ${count('text')} text pairs >= ${MINIMUM.text}:1 and ${count('non-text')} non-text pairs >= ${MINIMUM['non-text']}:1 checked, all pass; ${declarationsChecked} colour declarations of the kit CSS have a pair or one of ${EXEMPT.length} exemptions.`,
)
