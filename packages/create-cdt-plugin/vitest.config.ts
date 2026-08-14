// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { defineConfig } from 'vitest/config'

// Vitest's config search walks up past this package's own package.json and picks up
// core-local's root vitest.config.ts, whose setupFiles path then resolves against this
// package's cwd instead of the root's and fails to resolve. This package is published
// standalone and scaffolds files rather than rendering components, so it gets its own
// minimal config rather than depending on the root one.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
