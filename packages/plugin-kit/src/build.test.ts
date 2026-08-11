// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { execFile } from 'node:child_process'
import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { beforeAll, describe, expect, it } from 'vitest'

import { PLUGIN_EXTERNALS } from './externals'
import { PLUGIN_METAFILE, PLUGIN_OUT_FILE } from './preset'

/**
 * The only test in this package that runs a real build. Everything else checks the
 * pieces in isolation: the preset returns the right object, the guard rejects the
 * right metafile. None of that proves tsup writes the metafile where the guard
 * looks, that esbuild keys the output the way the guard reads it, that the types
 * survive the trip into `dist`, or that a failing guard actually turns into a
 * failing build. Two fixture plugins are built for real here, one that should pass
 * and one that must not.
 *
 * Running it needs two things a clean checkout does not have, because both are
 * gitignored build products: the fixtures' dependencies, and this package's own
 * `dist` (which the fixtures import through `"@collabdt/plugin-kit": "file:../.."`).
 * Nothing installs or builds them on your behalf, so every test here checks for
 * what it needs first and fails naming the command to run. Skipping instead would
 * be worse than useless: a capstone that quietly does not run is the same failure
 * as a capstone that passes without proving anything.
 */

const run = promisify(execFile)

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = (name: string) => join(packageRoot, 'fixtures', name)

const cleanDist = join(fixture('clean-plugin'), 'dist')

/** `access`, but the failure is the instruction rather than an ENOENT. */
async function requirePresent(path: string, remedy: string): Promise<void> {
  try {
    await access(path)
  } catch {
    throw new Error(`${remedy}\n\n(missing: ${path})`)
  }
}

/**
 * Fixture `node_modules/` is gitignored, and `npx` given a package it cannot find
 * locally goes to the network or fails with something that reads like a bug in the
 * kit. Checked by the presence of tsup, which every fixture build needs.
 */
function requireFixtureInstalled(name: string): Promise<void> {
  return requirePresent(
    join(fixture(name), 'node_modules/tsup/package.json'),
    `The ${name} fixture has no dependencies installed, so the build below would not ` +
    `be a build of this kit. Run:\n\n  cd packages/plugin-kit/fixtures/${name} && npm install`,
  )
}

/** The `dist` the fixtures import. A missing entry point is a resolution error, not a finding. */
function requireKitBuilt(): Promise<void> {
  return requirePresent(
    join(packageRoot, 'dist/index.js'),
    'The kit is not built, so the fixtures cannot resolve `@collabdt/plugin-kit` at all. ' +
    'Run:\n\n  cd packages/plugin-kit && npm run build',
  )
}

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
    await requireKitBuilt()
    await requireFixtureInstalled('clean-plugin')

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
    // Both constants are imported, not restated. They are the values `preset.ts`
    // hands `assertBundleImports`, and they were originally derived from reading
    // tsup's source; get either wrong and the guard throws "could not find
    // dist/index.js in the metafile" on every build, or worse, never runs. A copy
    // of the literals here would keep asserting the old string after someone
    // changed the real one.
    const metafile = JSON.parse(
      await readFile(join(fixture('clean-plugin'), PLUGIN_METAFILE), 'utf8'),
    ) as { outputs: Record<string, unknown> }

    // Forward slashes and relative to the plugin root, on Windows as on POSIX.
    expect(Object.keys(metafile.outputs)).toContain(PLUGIN_OUT_FILE)
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
    // Which is why this refuses to run without them rather than reporting them as
    // the plugin's fault: the whole point is to catch a kit built the wrong way,
    // and a red test blaming the fixture would send the reader to the wrong file.
    await requirePresent(
      join(packageRoot, 'dist/types/sdkModules.d.ts'),
      'The kit has no built dist/types/sdkModules.d.ts, which is what a plugin\'s ' +
      '`@collabdt/core/plugins-sdk/*` imports typecheck against. Run:\n\n' +
      '  cd packages/plugin-kit && npm run build\n\n' +
      'A bare `tsup` is not enough. Those declarations reach dist only through ' +
      'scripts/shipAmbientTypes.mjs, which the build script runs and tsup does not.',
    )

    // tsc writes diagnostics to stdout, which execFile's rejection message drops.
    // Surfaced by hand so a failure here names the offending import rather than
    // saying only "Command failed".
    const failure = await run('npx', ['tsc', '--noEmit'], { cwd: fixture('clean-plugin'), shell: true })
      .then(() => '')
      .catch((error: unknown) => outputOf(error))

    expect(failure).toBe('')
  }, 180_000)

  it('fails the build when the plugin imports three', async () => {
    await requireKitBuilt()
    await requireFixtureInstalled('dirty-plugin')

    // `three` is a real dependency of the dirty fixture and is genuinely installed.
    // Without it esbuild would fail on resolution long before the guard ran, the
    // build would still be red, and this test would prove nothing but that esbuild
    // cannot resolve a missing package. Checked rather than assumed.
    await requirePresent(
      join(fixture('dirty-plugin'), 'node_modules/three/package.json'),
      'The dirty fixture does not have three installed, so the build below would fail on ' +
      'module resolution before the import guard ever ran and this test would prove only ' +
      'that esbuild cannot find a missing package. Run:\n\n' +
      '  cd packages/plugin-kit/fixtures/dirty-plugin && npm install',
    )

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
