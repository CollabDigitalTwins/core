// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { PLUGIN_RUNTIME_SHIMS } from './runtimeShims'

/**
 * Maps each SDK specifier to the real module, so the shim's declared exports can
 * be checked against what the module actually provides. React's own shims are
 * not checked here: they are validated against the installed React, which is a
 * different concern and moves on upgrade.
 */
const SDK_MODULES: Record<string, () => Promise<Record<string, unknown>>> = {
  '@collabdt/core/plugins-sdk': () => import('../sdk/index'),
  '@collabdt/core/plugins-sdk/config': () => import('../sdk/config'),
  '@collabdt/core/plugins-sdk/messages': () => import('../sdk/messages'),
  '@collabdt/core/plugins-sdk/store': () => import('../sdk/store'),
  '@collabdt/core/plugins-sdk/components': () => import('../sdk/components'),
}

describe('shim export lists', () => {
  it('covers every SDK specifier that has a shim', () => {
    const sdkShims = PLUGIN_RUNTIME_SHIMS
      .filter(shim => shim.specifier.startsWith('@collabdt/core/'))
      .map(shim => shim.specifier)

    expect(sdkShims.sort()).toEqual(Object.keys(SDK_MODULES).sort())
  })

  for (const [specifier, load] of Object.entries(SDK_MODULES)) {
    it(`only re-exports names that "${specifier}" actually provides`, async () => {
      const shim = PLUGIN_RUNTIME_SHIMS.find(entry => entry.specifier === specifier)
      const actual = await load()

      const missing = shim!.exports.filter(name => !(name in actual))

      expect(missing).toEqual([])
    })
  }
})
