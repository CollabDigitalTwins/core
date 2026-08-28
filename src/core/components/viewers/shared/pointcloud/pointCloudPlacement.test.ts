// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { DEFAULT_PLACEMENT, parsePlacement } from './pointCloudPlacement'

describe('parsePlacement', () => {
  it('returns the default placement when there is nothing stored', () => {
    expect(parsePlacement(undefined)).toEqual(DEFAULT_PLACEMENT)
  })

  it('reads back a stored placement', () => {
    const stored = {
      position: [1.5, -2, 3],
      rotation: [0, Math.PI / 2, 0],
      scale: 2,
      sourceUp: 'y',
    }

    expect(parsePlacement(stored)).toEqual({
      position: [1.5, -2, 3],
      rotation: [0, Math.PI / 2, 0],
      scale: 2,
      sourceUp: 'y',
    })
  })

  it('falls back to defaults for fields that are absent', () => {
    expect(parsePlacement({ scale: 3 })).toEqual({ ...DEFAULT_PLACEMENT, scale: 3 })
  })

  it('rejects a position carrying a non-finite number', () => {
    expect(parsePlacement({ position: [1, Number.NaN, 3] }).position).toEqual([0, 0, 0])
  })

  it('rejects a position that is not a triple', () => {
    expect(parsePlacement({ position: [1, 2] }).position).toEqual([0, 0, 0])
  })

  it('rejects a non-positive scale', () => {
    expect(parsePlacement({ scale: 0 }).scale).toBe(1)
    expect(parsePlacement({ scale: -2 }).scale).toBe(1)
  })

  it('rejects an unknown source up axis', () => {
    expect(parsePlacement({ sourceUp: 'x' }).sourceUp).toBe('z')
  })

  it('ignores a stored value that is not an object', () => {
    expect(parsePlacement('nonsense')).toEqual(DEFAULT_PLACEMENT)
    expect(parsePlacement(42)).toEqual(DEFAULT_PLACEMENT)
  })
})
