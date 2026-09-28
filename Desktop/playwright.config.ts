import { defineConfig } from '@playwright/test'

// Layer-level tests of the desktop Main (Electron mode). Tests run one at a
// time: each one launches Electron and a Python backend, and some check that
// no Python process is left behind.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  // Tests of the packaged app: npm run test:packaged (playwright.packaged.config.ts).
  testIgnore: 'packaged/**',
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  reporter: [['list']],
})
