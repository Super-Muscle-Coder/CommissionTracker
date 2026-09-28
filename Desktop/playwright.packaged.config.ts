import { defineConfig } from '@playwright/test'

// Tests of the packaged app (release/win-unpacked), run by "npm run
// test:packaged" after "npm run dist". Kept apart from "npm test", which runs
// the Main from source. One test at a time, as in playwright.config.ts.
export default defineConfig({
  testDir: './tests/packaged',
  testMatch: '**/*.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 180_000,
  reporter: [['list']],
})
