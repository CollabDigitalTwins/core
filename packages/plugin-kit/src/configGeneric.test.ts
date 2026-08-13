// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// The ambient declarations are what a plugin typechecks against, so a signature that has
// drifted from core's real one is invisible here until someone writes the usage core's own
// worked example uses. The sibling checks assert the exported *names* match; nothing
// asserted the shapes, and `usePluginConfig` had silently lost its type parameter.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const ambient = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'types/sdkModules.d.ts'),
  'utf8',
)

describe('the ambient usePluginConfig declaration', () => {
  it('is generic, so a plugin can type its own config as hello-map does', () => {
    expect(ambient).toMatch(/export function usePluginConfig<\s*T extends Record<string, unknown>/)
  })

  it('defaults the type parameter, so a bare call still works', () => {
    expect(ambient).toMatch(/=\s*Record<string, unknown>,?\s*>\(\):\s*T/)
  })
})
