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

/**
 * Exports a module has on purpose without a shim of its own, and why.
 *
 * An import map cannot rewrite a namespace, so each shim re-exports by name; a
 * name missing from the list is `undefined` in the plugin's import with nothing
 * to debug. Checking only that the shim promises nothing extra caught the wrong
 * half of that: add a hook to `sdk/config.ts` and forget the shim and everything
 * stayed green while the plugin's import was undefined at runtime — the same
 * shape as two defects this plan already produced.
 *
 * So the check runs both ways, and every unshimmed export has to be named here
 * with its reason. The barrel's components are handled separately below, since
 * listing eighteen of them would rot on the first change.
 */
const DELIBERATELY_UNSHIMMED: Record<string, Record<string, string>> = {
  '@collabdt/core/plugins-sdk': {
    PLUGIN_RUNTIME_SHIMS:
      'the shim registry itself. It describes the host\'s own plumbing and a plugin '
      + 'has no use for it; serving it would also let a plugin read the list it is '
      + 'confined by, which is the host\'s business.',
    PLUGIN_EXTERNALS:
      'derived from PLUGIN_RUNTIME_SHIMS, and the plugin\'s copy of that allowlist is '
      + 'the kit\'s build-time one, not a runtime import.',
  },
  '@collabdt/core/plugins-sdk/messages': {
    __lookupPluginMessage:
      'a test seam for the lookup that backs the two hooks, exported under a __ '
      + 'prefix precisely because it is not API.',
  },
}

/**
 * Type-only exports vanish at runtime, so they never appear here and never need a
 * shim: `PluginManifest`, `PluginStore` and the rest are the kit's to declare.
 */
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

    it(`re-exports everything "${specifier}" provides, or says why not`, async () => {
      const shim = PLUGIN_RUNTIME_SHIMS.find(entry => entry.specifier === specifier)
      const actual = await load()

      // The barrel re-exports every component, which reaches a plugin through
      // `plugins-sdk/components` instead. Read from that module rather than
      // restated, so adding a component needs no change here.
      const servedElsewhere = specifier === '@collabdt/core/plugins-sdk'
        ? Object.keys(await import('../sdk/components'))
        : []

      const explained = DELIBERATELY_UNSHIMMED[specifier] ?? {}

      const unexplained = Object.keys(actual).filter(name => (
        !shim!.exports.includes(name)
        && !servedElsewhere.includes(name)
        && !(name in explained)
      ))

      expect(unexplained).toEqual([])
    })
  }
})
