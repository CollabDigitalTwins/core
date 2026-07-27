// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { readableTextColour, relativeLuminance } from './colourUtils'

describe('relativeLuminance', () => {
  it('spans 0 to 1 between black and white', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('weights green above red above blue', () => {
    const red = relativeLuminance('#ff0000') as number
    const green = relativeLuminance('#00ff00') as number
    const blue = relativeLuminance('#0000ff') as number
    expect(green).toBeGreaterThan(red)
    expect(red).toBeGreaterThan(blue)
  })

  it('is null for an unparseable colour', () => {
    expect(relativeLuminance('not a colour')).toBeNull()
  })
})

describe('readableTextColour', () => {
  it('puts white on dark backgrounds and black on light ones', () => {
    expect(readableTextColour('#000000')).toBe('#ffffff')
    expect(readableTextColour('#ffffff')).toBe('#000000')
  })

  it('handles the ends of a typical value ramp', () => {
    // The default palette's dark red is the only one of these dark enough to want white text;
    // blue-500 measures 0.216, above the equal-contrast threshold, so black wins there.
    expect(readableTextColour('#B91C1C')).toBe('#ffffff')
    expect(readableTextColour('#3B82F6')).toBe('#000000')
    expect(readableTextColour('#F8FAFC')).toBe('#000000')
  })

  it('falls back to black for an unparseable colour', () => {
    expect(readableTextColour('hsl(var(--muted))')).toBe('#000000')
  })
})
