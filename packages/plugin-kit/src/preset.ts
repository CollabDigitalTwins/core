// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import { PLUGIN_EXTERNALS } from './externals'
import { assertBundleImports } from './importGuard'

import type { Options } from 'tsup'

const OUT_DIR = 'dist'
// The two paths the guard is handed, both read out of tsup's source: esbuild keys the
// output relative to the plugin root and forward-slashed even on Windows, and tsup 8.5.1
// writes `dist/metafile-${format}.json` for our fixed esm format. Get either wrong and
// the guard throws on every build instead of checking one, so they are exported for
// `build.test.ts` to pin against a real fixture build rather than against copies.
export const PLUGIN_OUT_FILE = `${OUT_DIR}/index.js`
export const PLUGIN_METAFILE = `${OUT_DIR}/metafile-esm.json`

// A brace glob, not a fixed name: tsup globs an array `entry`, and a plain
// 'src/index.ts' left every JSX plugin dead on arrival with "Cannot find src/index.ts".
const ENTRY = 'src/index.{ts,tsx}'

// The tsup configuration a CDT plugin needs.
//
// `splitting: false` and a single entry are a delivery contract, not a preference: the
// host serves exactly one file per plugin, so a sibling chunk import would 404 in the
// browser. It is also why plain `tsc` cannot be used — it emits one file per module.
export function pluginPreset(overrides: Partial<Options> = {}): Options {
  if (overrides.splitting === true) {
    throw new Error(
      'A CDT plugin must build to a single file: the host serves only dist/index.js, ' +
      'so a code-split chunk would 404 in the browser. Remove `splitting: true`.',
    )
  }

  if (overrides.format !== undefined) {
    // `Options.format` is `Format[] | Format`, so a bare `format: 'esm'` is legitimate
    // input. Normalise first, or that shape reads as three single-character entries.
    const formats = Array.isArray(overrides.format) ? overrides.format : [overrides.format]

    if (!(formats.length === 1 && formats[0] === 'esm')) {
      throw new Error(
        'A CDT plugin must be ESM. The browser imports it directly and resolves its ' +
        'bare specifiers through the host import map. Remove the `format` override.',
      )
    }
  }

  if ('outDir' in overrides || 'entry' in overrides) {
    throw new Error(
      'A CDT plugin builds to dist/index.js from src/index.ts or src/index.tsx. The host serves that ' +
      'exact path and nothing else, so `outDir` and `entry` are fixed by the delivery ' +
      'contract rather than by preference.',
    )
  }

  // `onSuccess` runs the guard and `external` is what it checks against, so overriding
  // either switches the guard off silently — the build would still pass. Refuse loudly.
  if ('onSuccess' in overrides) {
    throw new Error(
      'Overriding `onSuccess` would switch off the CDT plugin import guard, which is ' +
      'what stops a plugin bundling a second copy of React or three.js. If you need ' +
      'your own post-build step, call assertBundleImports() from it.',
    )
  }

  if ('external' in overrides) {
    throw new Error(
      'Overriding `external` would switch off the CDT plugin import guard by changing ' +
      'what it checks against. The allowlist is fixed by what the host publishes a shim ' +
      'for; a plugin cannot widen it. If you need your own post-build step, call ' +
      'assertBundleImports() from it.',
    )
  }

  return {
    entry: [ENTRY],
    format: ['esm'],
    outDir: OUT_DIR,
    splitting: false,
    treeshake: true,
    clean: true,
    target: 'es2022',
    metafile: true,
    external: [...PLUGIN_EXTERNALS],
    esbuildOptions(options) {
      options.jsx = 'automatic'
    },
    async onSuccess() {
      await assertBundleImports(PLUGIN_METAFILE, PLUGIN_OUT_FILE)
    },
    ...overrides,
  }
}
