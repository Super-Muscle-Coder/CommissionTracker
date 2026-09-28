import { defineConfig } from '@playwright/test'

// End-to-end tests of the interface layer, run through the real desktop app
// (npm run e2e). Not part of npm run check: check must run on a machine
// without the desktop layer. One test at a time: each launches Electron and a
// Python backend.
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  outputDir: '../../test-results',
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  reporter: [['list']],
})
