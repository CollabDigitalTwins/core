// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertBundleImports,
  canVerifyBundled,
  checkBundled,
  checkImports,
  collectBundledPackages,
  collectExternalImports,
} from './importGuard'

// Input paths in the shapes the package managers actually emit: the flat-npm ones copied
// from a real metafile the dirty fixture's build wrote, the pnpm and Yarn Berry ones
// because npm cannot produce those layouts and so no fixture here can. They stop the
// guard being tested against paths invented to match its own regex, which is how it came
// to read the *first* `node_modules` segment instead of the last and call an inlined
// three.js clean.
const FLAT_NPM_THREE = 'node_modules/three/build/three.module.js'
const PNPM_THREE = 'node_modules/.pnpm/three@0.180.0/node_modules/three/build/three.module.js'
const PNPM_SCOPED =
  'node_modules/.pnpm/@thatopen+components@3.4.0/node_modules/@thatopen/components/dist/index.js'
const TRANSITIVE_THREE = 'node_modules/some-dep/node_modules/three/index.js'
const YARN_ZIP_THREE =
  '../../.yarn/cache/three-npm-0.180.0-9f1c2e4a71-8.zip/node_modules/three/build/three.module.js'

const metafile = {
  outputs: {
    'dist/index.js': {
      imports: [
        { path: 'react', kind: 'import-statement', external: true },
        { path: '@collabdt/core/plugins-sdk/components', kind: 'import-statement', external: true },
        { path: './chunk-abc.js', kind: 'import-statement' },
      ],
    },
  },
}

describe('collectExternalImports', () => {
  it('returns only the external imports of the named output', () => {
    expect(collectExternalImports(metafile, 'dist/index.js')).toEqual([
      'react',
      '@collabdt/core/plugins-sdk/components',
    ])
  })

  it('throws when the output is absent, rather than silently passing', () => {
    expect(() => collectExternalImports(metafile, 'dist/missing.js')).toThrow(
      /dist\/missing\.js/,
    )
  })
})

describe('checkImports', () => {
  it('accepts the allowlist', () => {
    expect(checkImports(['react', '@collabdt/core/plugins-sdk'])).toEqual([])
  })

  it('rejects a forbidden library', () => {
    expect(checkImports(['react', 'three'])).toEqual(['three'])
  })

  it('rejects anything not on the allowlist, not merely the known-forbidden set', () => {
    expect(checkImports(['lodash'])).toEqual(['lodash'])
  })

  it('rejects a subpath of an allowed package that has no shim', () => {
    expect(checkImports(['@collabdt/core/plugins-sdk/nope'])).toEqual([
      '@collabdt/core/plugins-sdk/nope',
    ])
  })
})

/** The metafile slice these functions read, built from input paths alone. */
const inputsOf = (...paths: string[]) => ({
  outputs: {},
  inputs: Object.fromEntries(paths.map(path => [path, {}])),
})

describe('collectBundledPackages', () => {
  it('extracts a plain package under a flat npm layout', () => {
    expect(collectBundledPackages(inputsOf(FLAT_NPM_THREE))).toEqual(['three'])
  })

  it('extracts a scoped package under a flat npm layout', () => {
    expect(
      collectBundledPackages(inputsOf('node_modules/@thatopen/components/dist/index.js')),
    ).toEqual(['@thatopen/components'])
  })

  it('names the package, not `.pnpm`, under a pnpm store layout', () => {
    // The leftmost segment here is `.pnpm`; stopping at it is what let an inlined
    // three.js through.
    expect(collectBundledPackages(inputsOf(PNPM_THREE))).toEqual(['three'])
  })

  it('extracts a scoped package under a pnpm store layout', () => {
    expect(collectBundledPackages(inputsOf(PNPM_SCOPED))).toEqual(['@thatopen/components'])
  })

  it('names the inner package, not its parent, for a transitive install', () => {
    expect(collectBundledPackages(inputsOf(TRANSITIVE_THREE))).toEqual(['three'])
  })

  it('names the package inside a Yarn Berry zip', () => {
    expect(collectBundledPackages(inputsOf(YARN_ZIP_THREE))).toEqual(['three'])
  })

  it('returns each package once when several of its files were bundled', () => {
    expect(
      collectBundledPackages(inputsOf(FLAT_NPM_THREE, 'node_modules/three/src/Three.js')),
    ).toEqual(['three'])
  })

  it('returns [] when inputs is absent', () => {
    expect(collectBundledPackages({ outputs: {} })).toEqual([])
  })

  it('returns [] when every input is the plugin\'s own source', () => {
    expect(collectBundledPackages(inputsOf('src/index.tsx'))).toEqual([])
  })
})

describe('canVerifyBundled', () => {
  it('can verify a bundle whose inputs are all the plugin\'s own source', () => {
    // The exact inputs the clean fixture's real build produces. An empty package list
    // here means "inlined nothing", not "a layout the scan cannot read".
    expect(canVerifyBundled(inputsOf('src/index.tsx'))).toEqual({ verifiable: true })
  })

  it('can verify every node_modules layout it knows how to name', () => {
    expect(
      canVerifyBundled(inputsOf(
        'src/index.tsx', FLAT_NPM_THREE, PNPM_THREE, PNPM_SCOPED, TRANSITIVE_THREE, YARN_ZIP_THREE,
      )),
    ).toEqual({ verifiable: true })
  })

  it('refuses to call a metafile with no inputs clean', () => {
    // esbuild lists at least the entry point, so an empty list means the metafile is not
    // the one this build wrote — and returning [] would read as "inlined nothing".
    const verdict = canVerifyBundled({ outputs: {} })

    expect(verdict.verifiable).toBe(false)
    expect(verdict.verifiable === false && verdict.reason).toMatch(/no inputs/)
  })

  it('refuses to call a bundle clean when a module cannot be attributed to a package', () => {
    // The Yarn PnP case: a dependency reached through a resolver whose paths carry no
    // node_modules segment. The rule keys off "outside the plugin and outside any
    // node_modules" rather than a guessed vendor path, because either way the guard
    // cannot name what it is looking at.
    const verdict = canVerifyBundled(inputsOf('src/index.tsx', '/virtual/store/three/three.js'))

    expect(verdict.verifiable).toBe(false)
    expect(verdict.verifiable === false && verdict.reason).toMatch(/\/virtual\/store\/three\/three\.js/)
  })

  it('treats a Windows absolute path outside the plugin as unattributable too', () => {
    const verdict = canVerifyBundled(inputsOf('C:/store/three/three.js'))

    expect(verdict.verifiable).toBe(false)
  })
})

describe('checkBundled', () => {
  it('rejects three', () => {
    expect(checkBundled(['three'])).toEqual(['three'])
  })

  it('rejects react', () => {
    expect(checkBundled(['react'])).toEqual(['react'])
  })

  it('accepts an ordinary bundled utility', () => {
    expect(checkBundled(['date-fns'])).toEqual([])
  })
})

/** Runs the assertion over a metafile written to a real temp file, as it is used. */
async function assertOver(metafile: unknown): Promise<Error | undefined> {
  const dir = await mkdtemp(join(tmpdir(), 'plugin-kit-'))
  const metafilePath = join(dir, 'meta.json')

  try {
    await writeFile(metafilePath, JSON.stringify(metafile))
    await assertBundleImports(metafilePath, 'dist/index.js')
    return undefined
  } catch (thrown) {
    return thrown as Error
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe('assertBundleImports', () => {
  it('surfaces both an offending external import and a bundled forbidden package in one error', async () => {
    const error = await assertOver({
      outputs: {
        'dist/index.js': {
          imports: [{ path: 'lodash', kind: 'import-statement', external: true }],
        },
      },
      inputs: { [FLAT_NPM_THREE]: {} },
    })

    expect(error).toBeDefined()
    expect(error?.message).toMatch(/lodash/)
    expect(error?.message).toMatch(/three/)
  })

  it('rejects an inlined three.js under a pnpm layout, where the old check saw `.pnpm`', async () => {
    const error = await assertOver({
      outputs: { 'dist/index.js': { imports: [] } },
      inputs: { 'src/index.tsx': {}, [PNPM_THREE]: {} },
    })

    expect(error).toBeDefined()
    expect(error?.message).toMatch(/Forbidden libraries bundled instead of left external/)
    expect(error?.message).toMatch(/three/)
  })

  it('fails the build when it cannot tell what was inlined, rather than passing', async () => {
    const error = await assertOver({
      outputs: { 'dist/index.js': { imports: [] } },
      inputs: { 'src/index.tsx': {}, '/virtual/store/three/three.js': {} },
    })

    expect(error).toBeDefined()
    expect(error?.message).toMatch(/Cannot check what this bundle inlined/)
  })

  it('passes a bundle that imports only allowed specifiers and inlines nothing', async () => {
    const error = await assertOver({
      outputs: {
        'dist/index.js': {
          imports: [{ path: 'react', kind: 'import-statement', external: true }],
        },
      },
      inputs: { 'src/index.tsx': {} },
    })

    expect(error).toBeUndefined()
  })
})
