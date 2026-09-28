// stylelint config of the interface layer — realizes R7 of iwca_theory.md §7:
// raw presentation values (colour codes, colour names, colour functions,
// absolute length units, durations) appear only in the token file. Every
// other style file refers to role tokens with var(--...).
//
// Style files may exist only in the kit zone: R10 forbids them in the screens
// zone (checked by eslint.config.js for imports and by scripts/check_layer.mjs
// for files), so the rules below apply to every style file of src/.
const R7 = {
  'color-no-hex': [true, { message: 'R7: no colour code outside src/kit/tokens/tokens.css; use a role token.' }],
  'color-named': ['never', { message: 'R7: no colour name outside src/kit/tokens/tokens.css; use a role token.' }],
  'function-disallowed-list': [
    ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix', 'light-dark'],
    { message: 'R7: no colour function outside src/kit/tokens/tokens.css; use a role token.' },
  ],
  'unit-disallowed-list': [
    ['px', 'cm', 'mm', 'q', 'in', 'pt', 'pc', 's', 'ms'],
    { message: 'R7: no absolute length or duration outside src/kit/tokens/tokens.css; use a role token.' },
  ],
}

const OFF = Object.fromEntries(Object.keys(R7).map((rule) => [rule, null]))

export default {
  rules: R7,
  overrides: [
    {
      // The only file allowed raw presentation values.
      files: ['src/kit/tokens/tokens.css'],
      rules: OFF,
    },
  ],
}
