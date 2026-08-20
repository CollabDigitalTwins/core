// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import { resolvePluginIcon } from './pluginIcon'

describe('resolvePluginIcon', () => {
  it('resolves a lucide icon named as a string', () => {
    expect(resolvePluginIcon('Ruler')).toBe(LR.Ruler)
  })

  it('passes a component through unchanged', () => {
    expect(resolvePluginIcon(LR.Wrench)).toBe(LR.Wrench)
  })

  it('falls back to a placeholder rather than crashing on an unknown name', () => {
    expect(resolvePluginIcon('NotAnIcon')).toBe(LR.Puzzle)
  })

  // The manifest field is optional, so the Plugins page asks for this name by default.
  it('resolves the puzzle piece the manifest default names', () => {
    expect(resolvePluginIcon('Puzzle')).toBe(LR.Puzzle)
  })
})
