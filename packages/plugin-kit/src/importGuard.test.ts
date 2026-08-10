// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertBundleImports,
  checkBundled,
  checkImports,
  collectBundledPackages,
  collectExternalImports,
} from './importGuard'

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

describe('collectBundledPackages', () => {
  it('extracts a plain package from a nested path', () => {
    const metafile = {
      outputs: {},
      inputs: {
        'node_modules/three/build/three.module.js': {},
      },
    }

    expect(collectBundledPackages(metafile)).toEqual(['three'])
  })

  it('extracts a scoped package correctly', () => {
    const metafile = {
      outputs: {},
      inputs: {
        'node_modules/@thatopen/components/dist/index.js': {},
      },
    }

    expect(collectBundledPackages(metafile)).toEqual(['@thatopen/components'])
  })

  it('returns each package once when several of its files were bundled', () => {
    const metafile = {
      outputs: {},
      inputs: {
        'node_modules/three/build/three.module.js': {},
        'node_modules/three/src/Three.js': {},
      },
    }

    expect(collectBundledPackages(metafile)).toEqual(['three'])
  })

  it('returns [] when inputs is absent', () => {
    expect(collectBundledPackages({ outputs: {} })).toEqual([])
  })

  it('returns [] when inputs has no node_modules paths', () => {
    const metafile = {
      outputs: {},
      inputs: {
        'src/index.ts': {},
      },
    }

    expect(collectBundledPackages(metafile)).toEqual([])
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

describe('assertBundleImports', () => {
  it('surfaces both an offending external import and a bundled forbidden package in one error', async () => {
    const metafile = {
      outputs: {
        'dist/index.js': {
          imports: [{ path: 'lodash', kind: 'import-statement', external: true }],
        },
      },
      inputs: {
        'node_modules/three/build/three.module.js': {},
      },
    }

    const dir = await mkdtemp(join(tmpdir(), 'plugin-kit-'))
    const metafilePath = join(dir, 'meta.json')

    try {
      await writeFile(metafilePath, JSON.stringify(metafile))

      let error: Error | undefined
      try {
        await assertBundleImports(metafilePath, 'dist/index.js')
      } catch (thrown) {
        error = thrown as Error
      }

      expect(error).toBeDefined()
      expect(error?.message).toMatch(/lodash/)
      expect(error?.message).toMatch(/three/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
