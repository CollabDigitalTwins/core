// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { fromEsriColour, normaliseColour } from './colourUtils'

describe('normaliseColour', () => {
  it('accepts hex and CSS colour functions as they are', () => {
    expect(normaliseColour('#ff0000')).toBe('#ff0000')
    expect(normaliseColour('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)')
    expect(normaliseColour('hsla(120, 50%, 50%, 0.5)')).toBe('hsla(120, 50%, 50%, 0.5)')
  })

  it('turns a bare r,g,b triplet into rgb()', () => {
    expect(normaliseColour('255, 128,0')).toBe('rgb(255, 128, 0)')
    expect(normaliseColour('256,0,0')).toBeNull()
  })

  it('rejects non-colours', () => {
    expect(normaliseColour('#12345')).toBeNull()
    expect(normaliseColour('Tennis')).toBeNull()
    expect(normaliseColour(42)).toBeNull()
  })
})

describe('fromEsriColour', () => {
  it('reads an Esri [r,g,b,a] colour', () => {
    expect(fromEsriColour([255, 0, 0, 128])).toEqual({ colour: '#ff0000', opacity: 128 / 255 })
    expect(fromEsriColour([0, 0, 255])).toEqual({ colour: '#0000ff', opacity: 1 })
    expect(fromEsriColour(null)).toBeNull()
  })
})
