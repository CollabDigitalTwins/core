// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/map.ts',
    'src/types/bim.ts',
    'src/types/pointcloud.ts',
    'src/types/legend.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
  // The viewer libraries are type-only devDependencies of this package. Leaving
  // them external keeps their declarations as `import('…')` references in the
  // emitted .d.ts instead of inlining them, which is what lets a map plugin
  // typecheck without the BIM library installed.
  external: ['tsup', 'react', 'maplibre-gl', '@thatopen/components'],
})
