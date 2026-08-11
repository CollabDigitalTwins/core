// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { execFile } from 'node:child_process'
import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { beforeAll, describe, expect, it } from 'vitest'

import { PLUGIN_EXTERNALS } from './externals'

/**
 * The only test in this package that runs a real build. Everything else checks the
 * pieces in isolation: the preset returns the right object, the guard rejects the
 * right metafile. None of that proves tsup writes the metafile where the guard
 * looks, that esbuild keys the output the way the guard reads it, that the types
 * survive the trip into `dist`, or that a failing guard actually turns into a
 * failing build. Two fixture plugins are built for real here, one that should pass
 * and one that must not.
 *
 * The fixtures resolve the kit through `"@collabdt/plugin-kit": "file:../.."`, so
 * `npm run build` has to have run in this package first — `dist` is what they
 * import.
 */

const run = promisify(execFile)
const fixture = (name: string) => join(process.cwd(), 'fixtures', name)

const cleanDist = join(fixture('clean-plugin'), 'dist')

/**
 * Everything a rejected execFile captured, without asserting on the shape of the
 * rejection. tsup reports through stderr and tsc through stdout, so both are read.
 */
function outputOf(failure: unknown): string {
  const withStreams = failure as { stdout?: unknown; stderr?: unknown; message?: unknown }

  return [withStreams.stdout, withStreams.stderr, withStreams.message]
    .filter((part): part is string => typeof part === 'string')
    .join('\n')
    .trim()
}

describe('a plugin built with pluginPreset', () => {
  beforeAll(async () => {
    await run('npx', ['tsup'], { cwd: fixture('clean-plugin'), shell: true })
  }, 180_000)

  it('emits exactly one JS file whose every import is on the allowlist', async () => {
    const files = (await readdir(cleanDist)).filter(name => name.endsWith('.js'))

    // The host serves dist/index.js and nothing beside it, so a second chunk would
    // 404 in the browser rather than merely bloat the output.
    expect(files).toEqual(['index.js'])

    const source = await readFile(join(cleanDist, 'index.js'), 'utf8')
    const specifiers = [...source.matchAll(/from\s*["']([^"']+)["']/g)].map(m => m[1])

    expect(specifiers.length).toBeGreaterThan(0)

    for (const specifier of specifiers) {
      expect(PLUGIN_EXTERNALS).toContain(specifier)
    }
  })

  it('writes the metafile at the path and output key the import guard reads', async () => {
    // These two constants are what `preset.ts` hands `assertBundleImports`. They
    // were originally derived from reading tsup's source; get either wrong and the
    // guard throws "could not find dist/index.js in the metafile" on every build,
    // or worse, never runs. Pinned here against a real build.
    const metafile = JSON.parse(
      await readFile(join(cleanDist, 'metafile-esm.json'), 'utf8'),
    ) as { outputs: Record<string, unknown> }

    // Forward slashes and relative to the plugin root, on Windows as on POSIX.
    expect(Object.keys(metafile.outputs)).toContain('dist/index.js')
  })

  it('typechecks against the kit as published, not as it sits in src', async () => {
    // `ambientTypes.test.ts` checks the ambient declarations where they are written.
    // This checks them where a plugin author meets them: resolved out of `dist`
    // through the package's `exports` map, by a plugin that imports
    // `@collabdt/core/plugins-sdk/*` and never installs `@collabdt/core`.
    //
    // The gap is real, not theoretical. Those declarations reach `dist` only via
    // `scripts/shipAmbientTypes.mjs`, which `npm run build` runs and a bare `tsup`
    // does not. Built the wrong way, the kit resolves, the fixture builds, every
    // other test here passes, and the plugin's SDK imports are TS2307.
    //
    // tsc writes diagnostics to stdout, which execFile's rejection message drops.
    // Surfaced by hand so a failure here names the offending import rather than
    // saying only "Command failed".
    const failure = await run('npx', ['tsc', '--noEmit'], { cwd: fixture('clean-plugin'), shell: true })
      .then(() => '')
      .catch((error: unknown) => outputOf(error))

    expect(failure).toBe('')
  }, 180_000)

  it('fails the build when the plugin imports three', async () => {
    // `three` is a real dependency of the dirty fixture and is genuinely installed.
    // Without it esbuild would fail on resolution long before the guard ran, the
    // build would still be red, and this test would prove nothing but that esbuild
    // cannot resolve a missing package. Checked rather than assumed.
    await expect(access(join(fixture('dirty-plugin'), 'node_modules/three/package.json')))
      .resolves.toBeUndefined()

    const failure = await run('npx', ['tsup'], { cwd: fixture('dirty-plugin'), shell: true })
      .then(() => null)
      .catch((error: unknown) => error)

    expect(failure).not.toBeNull()

    const output = outputOf(failure)

    // The guard's own wording, not merely a non-zero exit: that is what separates
    // "the import guard rejected an inlined three.js" from "esbuild could not find
    // three", which is the failure this fixture exists to avoid mistaking for it.
    // A bare /three/ would not tell them apart — esbuild's resolution error quotes
    // the specifier back at you, so it matches too.
    expect(output).toMatch(/Forbidden libraries bundled instead of left external/)
    expect(output).toMatch(/three/)
    expect(output).not.toMatch(/Could not resolve/)
  }, 180_000)
})
