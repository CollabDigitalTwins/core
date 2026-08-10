// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { checkImports, collectExternalImports } from './importGuard'

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
