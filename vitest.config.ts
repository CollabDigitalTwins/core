import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// Vitest is ESM-native (the package is `"type": "module"`). *.test.ts run in the
// node env (pure logic); *.test.tsx are component tests that opt into jsdom via a
// per-file `// @vitest-environment jsdom` pragma + Testing Library. The React
// plugin provides the JSX transform; vitest.setup.ts registers jest-dom matchers.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // The `paths` in tsconfig.json, restated because vitest does not read them. A
    // compiled-in plugin imports the SDK by the specifier a standalone plugin uses,
    // so without these every plugin test fails at import time.
    alias: [
      { find: /^@collabdt\/core\/plugins-sdk$/, replacement: here('./src/core/plugins/sdk/index.ts') },
      { find: /^@collabdt\/core\/plugins-sdk\//, replacement: here('./src/core/plugins/sdk/') },
      { find: /^@collabdt\/plugin-kit\/types\//, replacement: here('./packages/plugin-kit/src/types/') },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
