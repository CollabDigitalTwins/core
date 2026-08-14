// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { PLUGIN_EXTERNALS, PLUGIN_RUNTIME_SHIMS } from './runtimeShims'

describe('PLUGIN_RUNTIME_SHIMS', () => {
  it('lists exactly the eight specifiers the host publishes an import map for', () => {
    expect(PLUGIN_EXTERNALS).toEqual([
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@collabdt/core/plugins-sdk',
      '@collabdt/core/plugins-sdk/config',
      '@collabdt/core/plugins-sdk/messages',
      '@collabdt/core/plugins-sdk/store',
      '@collabdt/core/plugins-sdk/components',
    ])
  })

  it('never lists a library a duplicate copy of which crashes the app', () => {
    for (const banned of ['three', '@thatopen/components', 'maplibre-gl', 'lucide-react']) {
      expect(PLUGIN_EXTERNALS).not.toContain(banned)
    }
  })

  it('gives every shim a unique specifier, file and bridge key', () => {
    const unique = (values: string[]) => new Set(values).size === values.length

    expect(unique(PLUGIN_RUNTIME_SHIMS.map(s => s.specifier))).toBe(true)
    expect(unique(PLUGIN_RUNTIME_SHIMS.map(s => s.file))).toBe(true)
    expect(unique(PLUGIN_RUNTIME_SHIMS.map(s => s.bridge))).toBe(true)
  })

  it('gives every shim at least one named export, since an import map cannot rewrite a namespace', () => {
    for (const shim of PLUGIN_RUNTIME_SHIMS) {
      expect(shim.exports.length).toBeGreaterThan(0)
    }
  })
})
