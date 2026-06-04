import { defineConfig } from 'vitest/config'

// Track B.1 (unit tests). Vitest is ESM-native (the package is `"type": "module"`),
// so it runs the TS sources directly via esbuild — no jest transform wiring needed.
// Scope to *.test.ts (pure logic, node env). Component tests (*.test.tsx, jsdom +
// Testing Library) come in Track B.2 and will get their own jsdom project/config.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
