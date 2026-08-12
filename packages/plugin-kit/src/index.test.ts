// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { pluginPreset } from './preset'

import * as kit from './index'

// The preset's refusal messages tell an author to call `assertBundleImports()` themselves,
// and that advice was once unfollowable: the two path arguments it needs were not
// exported. This ties the message and the barrel together so they cannot drift apart.
function refusalMessage(override: Parameters<typeof pluginPreset>[0]): string {
  try {
    pluginPreset(override)
  } catch (error) {
    return (error as Error).message
  }

  throw new Error('pluginPreset accepted an override it is supposed to refuse')
}

describe('@collabdt/plugin-kit barrel', () => {
  it('exports what the preset\'s refusal messages tell an author to call', () => {
    const messages = [
      refusalMessage({ onSuccess: 'echo hi' }),
      refusalMessage({ external: [] }),
    ]

    for (const message of messages) {
      expect(message).toContain('assertBundleImports')
    }

    // Any one of the three missing leaves the advice above impossible to follow.
    expect(typeof kit.assertBundleImports).toBe('function')
    expect(typeof kit.PLUGIN_METAFILE).toBe('string')
    expect(typeof kit.PLUGIN_OUT_FILE).toBe('string')
  })

  it('exports the guard\'s parts, not only its entry point', () => {
    // Without these, an author writing a stricter or more forgiving post-build check has
    // to re-derive the metafile plumbing by hand.
    expect(typeof kit.collectExternalImports).toBe('function')
    expect(typeof kit.checkImports).toBe('function')
    expect(typeof kit.collectBundledPackages).toBe('function')
    expect(typeof kit.checkBundled).toBe('function')
    expect(typeof kit.canVerifyBundled).toBe('function')
  })
})
