// ESLint flat config (CommonJS: the layer has no "type": "module").
const js = require('@eslint/js')
const globals = require('globals')
const tseslint = require('typescript-eslint')
const { defineConfig, globalIgnores } = require('eslint/config')

module.exports = defineConfig([
  globalIgnores(['dist', 'node_modules', 'test-results', 'playwright-report', 'obj', 'packaging/cache', 'packaging/stage', 'release']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    // Packaging scripts (ES modules run by Node at build time).
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    // Probe page: plain browser script loaded by the test renderer.
    files: ['tests/fixtures/probe/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
])
