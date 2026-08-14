// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  // No `dts`: this package is a bin, not a library. Nothing imports its types.
  dts: false,
  clean: true,
  target: 'es2022',
  platform: 'node',
  // `bin` entries are executed directly, so the shebang has to survive the build.
  banner: { js: '#!/usr/bin/env node' },
})
