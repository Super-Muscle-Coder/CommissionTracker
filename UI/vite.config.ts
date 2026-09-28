/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static build only: no dev server, no hot reload, no public/ folder.
// The build is served by the desktop Main under app://commission-tracker/,
// so every URL in it must be relative (base './').
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    // Logic zone tests run without a DOM; a test that needs one says so
    // with a `// @vitest-environment jsdom` comment.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/main/**/*.test.{ts,tsx}'],
  },
})
