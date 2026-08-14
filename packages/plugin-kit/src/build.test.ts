// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { execFile } from 'node:child_process'
import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { beforeAll, describe, expect, it } from 'vitest'

import { PLUGIN_EXTERNALS } from './externals'
import {
  canVerifyBundled,
  collectBundledPackages,
  collectExternalImports,
  type Metafile,
} from './importGuard'
import { PLUGIN_METAFILE, PLUGIN_OUT_FILE } from './preset'

// The only test in this package that runs a real build. The rest check the pieces in
// isolation, which proves nothing about tsup writing the metafile where the guard looks,
// esbuild keying the output the way the guard reads it, the types surviving into `dist`,
// or a failing guard turning into a failing build.
//
// Its prerequisites are gitignored build products (the fixtures' dependencies and this
// package's own `dist`), so each test checks for what it needs and fails naming the
// command to run. Skipping would be worse: a capstone that quietly does not run is the
// same failure as one that passes without proving anything.

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

// `npx` given a package it cannot find locally goes to the network or fails with
// something that reads like a bug in the kit. Checked through tsup, which every fixture
// build needs.
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

/** Everything a rejected execFile captured: tsup reports on stderr and tsc on stdout. */
function outputOf(failure: unknown): string {
  const withStreams = failure as { stdout?: unknown; stderr?: unknown; message?: unknown }

  return [withStreams.stdout, withStreams.stderr, withStreams.message]
    .filter((part): part is string => typeof part === 'string')
    .join('\n')
    .trim()
}

/** The metafile a fixture's last build wrote, as the guard reads it. */
async function metafileOf(name: string): Promise<Metafile> {
  return JSON.parse(await readFile(join(fixture(name), PLUGIN_METAFILE), 'utf8')) as Metafile
}

describe('a plugin built with pluginPreset', () => {
  beforeAll(async () => {
    await requireKitBuilt()
    await requireFixtureInstalled('clean-plugin')

    await run('npx', ['tsup'], { cwd: fixture('clean-plugin'), shell: true })
  }, 180_000)

  it('emits exactly one JS file, with no sibling chunk to import', async () => {
    const files = (await readdir(cleanDist)).filter(name => name.endsWith('.js'))

    // The host serves dist/index.js and nothing beside it, so a second chunk would 404 in
    // the browser rather than merely bloat the output.
    expect(files).toEqual(['index.js'])

    // Read from the metafile rather than by matching `from "…"` in the emitted source:
    // that regex missed `import 'x'` and `import('x')` and matched text inside string
    // literals. The assertion below is the one the guard does not make — that no chunk of
    // the plugin's own code was split out.
    const imports = (await metafileOf('clean-plugin')).outputs[PLUGIN_OUT_FILE].imports ?? []

    expect(imports.filter(entry => !entry.external)).toEqual([])
  })

  it('imports nothing outside the allowlist, read from the build\'s own metafile', async () => {
    const specifiers = collectExternalImports(await metafileOf('clean-plugin'), PLUGIN_OUT_FILE)

    // A plugin that imported nothing would pass the loop below vacuously.
    expect(specifiers.length).toBeGreaterThan(0)

    for (const specifier of specifiers) {
      expect(PLUGIN_EXTERNALS).toContain(specifier)
    }
  })

  it('inlines nothing, and says so from a layout the scan can read', async () => {
    // A correctly written plugin leaves every host library external, so `inputs` here is
    // exactly ["src/index.tsx"] with no node_modules path in it. That shape has to come
    // out verifiable *and* clean — treating it as suspicious would fail every
    // well-written plugin.
    const metafile = await metafileOf('clean-plugin')

    expect(canVerifyBundled(metafile)).toEqual({ verifiable: true })
    expect(collectBundledPackages(metafile)).toEqual([])
  })

  it('writes the metafile at the path and output key the import guard reads', async () => {
    // Both constants are imported, not restated: a copy of the literals here would keep
    // asserting the old string after someone changed the real one, and a wrong value
    // makes the guard throw on every build or never run at all.
    const metafile = JSON.parse(
      await readFile(join(fixture('clean-plugin'), PLUGIN_METAFILE), 'utf8'),
    ) as { outputs: Record<string, unknown> }

    // Forward slashes and relative to the plugin root, on Windows as on POSIX.
    expect(Object.keys(metafile.outputs)).toContain(PLUGIN_OUT_FILE)
  })

  it('typechecks against the kit as published, not as it sits in src', async () => {
    // `ambientTypes.test.ts` checks the ambient declarations where they are written; this
    // checks them where a plugin author meets them, resolved out of `dist` through the
    // package's `exports` map. The gap is real: those declarations reach `dist` only via
    // `scripts/shipAmbientTypes.mjs`, which `npm run build` runs and a bare `tsup` does
    // not, and built the wrong way every other test here still passes while the plugin's
    // SDK imports are TS2307. Hence the refusal to run without them — a red test blaming
    // the fixture would send the reader to the wrong file.
    await requirePresent(
      join(packageRoot, 'dist/types/sdkModules.d.ts'),
      'The kit has no built dist/types/sdkModules.d.ts, which is what a plugin\'s ' +
      '`@collabdt/core/plugins-sdk/*` imports typecheck against. Run:\n\n' +
      '  cd packages/plugin-kit && npm run build\n\n' +
      'A bare `tsup` is not enough. Those declarations reach dist only through ' +
      'scripts/shipAmbientTypes.mjs, which the build script runs and tsup does not.',
    )

    // tsc writes diagnostics to stdout, which execFile's rejection message drops, so a
    // failure here would otherwise say only "Command failed".
    const failure = await run('npx', ['tsc', '--noEmit'], { cwd: fixture('clean-plugin'), shell: true })
      .then(() => '')
      .catch((error: unknown) => outputOf(error))

    expect(failure).toBe('')
  }, 180_000)

  it('fails the build when the plugin imports three', async () => {
    await requireKitBuilt()
    await requireFixtureInstalled('dirty-plugin')

    // Without `three` genuinely installed, esbuild fails on resolution long before the
    // guard runs: the build is red either way, but for a reason that proves nothing.
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

    // The guard's own wording, not merely a non-zero exit: a bare /three/ cannot separate
    // "the guard rejected an inlined three.js" from "esbuild could not find three",
    // because the resolution error quotes the specifier back at you too.
    expect(output).toMatch(/Forbidden libraries bundled instead of left external/)
    expect(output).toMatch(/three/)
    expect(output).not.toMatch(/Could not resolve/)

    // The same conclusion from the metafile that build just wrote — the only place here
    // where the package-name extraction meets a path a real installer produced rather
    // than one a test author typed. tsup writes it before `onSuccess` runs, so it exists
    // despite the failure above.
    const metafile = await metafileOf('dirty-plugin')

    expect(canVerifyBundled(metafile)).toEqual({ verifiable: true })
    expect(collectBundledPackages(metafile)).toContain('three')
  }, 180_000)
})
