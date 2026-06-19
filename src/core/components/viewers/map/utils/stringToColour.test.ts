// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { stringToColour, layerColorByName } from './stringToColour'

describe('stringToColour', () => {
  it('returns a 7-character hex string', () => {
    const result = stringToColour('roads')
    expect(result).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('is deterministic for the same input', () => {
    expect(stringToColour('roads')).toBe(stringToColour('roads'))
    expect(stringToColour('buildings')).toBe(stringToColour('buildings'))
  })

  it('produces different colors for different inputs (in general)', () => {
    // Not a hard guarantee — hash collisions can happen — but two clearly different
    // names should pick different palette indices.
    expect(stringToColour('roads')).not.toBe(stringToColour('buildings'))
  })

  it('returns the same color for an empty string', () => {
    // hash=0, index=0 → first palette entry. Just assert it's deterministic.
    expect(stringToColour('')).toBe(stringToColour(''))
  })

  it('"min" variant lightens the base color', () => {
    const base = stringToColour('roads')
    const min = stringToColour('roads', 'min')
    expect(min).not.toBe(base)
    // Lightened values should have higher RGB component sums.
    const sum = (hex: string) => Number.parseInt(hex.slice(1), 16)
    expect(sum(min)).toBeGreaterThan(sum(base))
  })

  it('"max" variant darkens the base color', () => {
    const base = stringToColour('roads')
    const max = stringToColour('roads', 'max')
    expect(max).not.toBe(base)
    const sum = (hex: string) => Number.parseInt(hex.slice(1), 16)
    expect(sum(max)).toBeLessThan(sum(base))
  })
})

describe('layerColorByName', () => {
  it('exposes color/nameColor/minColor/maxColor derived from the same name', () => {
    const colors = layerColorByName('parks')
    expect(colors.color).toBe(stringToColour('parks'))
    expect(colors.nameColor).toBe(stringToColour('parks'))
    expect(colors.minColor).toBe(stringToColour('parks', 'min'))
    expect(colors.maxColor).toBe(stringToColour('parks', 'max'))
  })
})
