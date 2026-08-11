// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Options } from 'tsup'

import { PLUGIN_EXTERNALS } from './externals'
import { assertBundleImports } from './importGuard'

const OUT_DIR = 'dist'
/**
 * The bundle, as esbuild keys it inside the metafile: relative to the plugin root
 * and forward-slashed even on Windows. Exported so `build.test.ts` can pin the
 * value the guard is actually handed instead of a copy of the same literal, which
 * would keep passing after someone changed this one.
 */
export const PLUGIN_OUT_FILE = `${OUT_DIR}/index.js`
// tsup globs an array `entry`, so this has to match the extension a plugin author
// actually uses. A plain 'src/index.ts' matches only that exact name, which left
// every JSX plugin dead on arrival with "Cannot find src/index.ts" — including one
// written against the `jsx: 'automatic'` setting this same preset configures below.
const ENTRY = 'src/index.{ts,tsx}'
// tsup 8.5.1 writes `dist/metafile-${format}.json`. Our format is fixed to esm,
// so this is `dist/metafile-esm.json`, and esbuild keys the output inside it as
// `dist/index.js` — relative to the plugin root and forward-slashed even on
// Windows. Both were read out of tsup's source first and are now pinned against a
// real fixture build in `build.test.ts`; get either wrong and the guard throws on
// every build instead of checking one. Exported for the same reason as
// `PLUGIN_OUT_FILE`.
export const PLUGIN_METAFILE = `${OUT_DIR}/metafile-esm.json`

/**
 * The tsup configuration a CDT plugin needs.
 *
 * `splitting: false` and a single entry are not preferences. The host serves
 * exactly one file per plugin, so a sibling chunk import from the bundle would
 * 404 in the browser. That is also why plain `tsc` cannot be used here: it emits
 * one file per module.
 *
 * `onSuccess` runs the import guard. Marking the host's modules external is only
 * half the contract; the other half is importing nothing else, and without this
 * check a stray `import 'three'` either inlines a second copy of the library or
 * dies at load with a message that points at the plugin rather than the cause.
 */
export function pluginPreset(overrides: Partial<Options> = {}): Options {
  if (overrides.splitting === true) {
    throw new Error(
      'A CDT plugin must build to a single file: the host serves only dist/index.js, ' +
      'so a code-split chunk would 404 in the browser. Remove `splitting: true`.',
    )
  }

  if (overrides.format !== undefined) {
    // `Options.format` is typed `Format[] | Format`, so a bare string such as
    // `format: 'esm'` is legitimate input, not an array. Normalise before
    // checking length/contents so that valid shape does not get misread as
    // three single-character entries.
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

  // `onSuccess` runs the guard and `external` is what the guard checks against.
  // Overriding either would switch off the one thing this preset exists to do,
  // and silently: the build would still pass. Refuse loudly instead.
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
