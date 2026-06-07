import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest is ESM-native (the package is `"type": "module"`). *.test.ts run in the
// node env (pure logic); *.test.tsx are component tests that opt into jsdom via a
// per-file `// @vitest-environment jsdom` pragma + Testing Library. The React
// plugin provides the JSX transform; vitest.setup.ts registers jest-dom matchers.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
