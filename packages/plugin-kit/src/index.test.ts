// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { pluginPreset } from './preset'

import * as kit from './index'

/**
 * The preset refuses an `onSuccess` or `external` override and tells the author to
 * call `assertBundleImports()` from their own post-build step instead. That advice
 * was unfollowable: the two path arguments the call needs were not exported, so a
 * reader who took it got a resolution error from the package that had just told
 * them to do it. This ties the message and the barrel together so they cannot drift
 * apart again.
 */
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

    // The function and both of its required arguments. Any one of the three
    // missing leaves the advice above impossible to follow.
    expect(typeof kit.assertBundleImports).toBe('function')
    expect(typeof kit.PLUGIN_METAFILE).toBe('string')
    expect(typeof kit.PLUGIN_OUT_FILE).toBe('string')
  })

  it('exports the guard\'s parts, not only its entry point', () => {
    // A stricter or more forgiving post-build check is built from these; without
    // them an author's only choice is to re-derive the metafile plumbing by hand.
    expect(typeof kit.collectExternalImports).toBe('function')
    expect(typeof kit.checkImports).toBe('function')
    expect(typeof kit.collectBundledPackages).toBe('function')
    expect(typeof kit.checkBundled).toBe('function')
    expect(typeof kit.canVerifyBundled).toBe('function')
  })
})
