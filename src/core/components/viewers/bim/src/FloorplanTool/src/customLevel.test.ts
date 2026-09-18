// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { CUSTOM_LEVEL_ABOVE, CUSTOM_LEVEL_BELOW, cutVolumeFor, isCustomLevel, makeCustomLevel } from './customLevel'

import type { FloorplanEntry } from './types'

describe('makeCustomLevel', () => {
  it('produces an unprojected entry at the requested elevation', () => {
    const entry = makeCustomLevel('model-a', 4.2, 'Mezzanine')
    expect(entry.elevation).toBe(4.2)
    expect(entry.name).toBe('Mezzanine')
    expect(entry.projected).toBe(false)
    expect(entry.drawing).toBeNull()
    expect(entry.layers).toEqual([])
  })

  it('namespaces the id under the model so two models can each have one', () => {
    expect(makeCustomLevel('model-a', 0, 'A').id).toMatch(/^model-a::custom::/)
  })

  it('gives every custom level a distinct id', () => {
    expect(makeCustomLevel('m', 0, 'A').id).not.toBe(makeCustomLevel('m', 0, 'A').id)
  })

  it('carries no storey, so the projector falls back to the whole model', () => {
    expect(makeCustomLevel('m', 0, 'A').storeyLocalId).toBeUndefined()
  })

  it('carries its own cut depths rather than relying on the projector defaults', () => {
    const entry = makeCustomLevel('m', 0, 'A')
    expect(entry.above).toBe(CUSTOM_LEVEL_ABOVE)
    expect(entry.below).toBe(CUSTOM_LEVEL_BELOW)
  })
})

describe('isCustomLevel', () => {
  it('recognises an entry it made', () => {
    expect(isCustomLevel(makeCustomLevel('m', 0, 'A'))).toBe(true)
  })

  it('leaves a storey entry alone, including one whose model id says custom', () => {
    expect(isCustomLevel({ id: 'm::storey::3' })).toBe(false)
    expect(isCustomLevel({ id: 'custom::storey::3' })).toBe(false)
  })
})

describe('cutVolumeFor', () => {
  const entry = (patch: Partial<FloorplanEntry>) => ({ elevation: 10, ...patch }) as FloorplanEntry

  it('keeps the storey defaults for an entry that names no depths', () => {
    const cut = cutVolumeFor(entry({}))
    expect(cut.planeY).toBeCloseTo(11.5)
    expect(cut.cutY).toBeCloseTo(9.5)
  })

  it('spans the whole volume plus a margin, so the far plane never clips the cut short', () => {
    expect(cutVolumeFor(entry({})).far).toBeCloseTo(3)
  })

  it('reads the depths off the entry when it carries its own', () => {
    const cut = cutVolumeFor(entry({ above: 4, below: 1 }))
    expect(cut.planeY).toBeCloseTo(14)
    expect(cut.cutY).toBeCloseTo(9)
    expect(cut.far).toBeCloseTo(6)
  })

  it('derives far from the depths rather than leaving it at the old constant', () => {
    expect(cutVolumeFor(entry({ above: 10, below: 10 })).far).toBeGreaterThan(20)
  })

  it('treats a zero depth as a real value, not a missing one', () => {
    expect(cutVolumeFor(entry({ above: 0, below: 0 })).planeY).toBeCloseTo(10)
  })

  it('gives a custom level the depths it was built with', () => {
    const cut = cutVolumeFor(makeCustomLevel('m', 2, 'A'))
    expect(cut.planeY).toBeCloseTo(2 + CUSTOM_LEVEL_ABOVE)
    expect(cut.cutY).toBeCloseTo(2 - CUSTOM_LEVEL_BELOW)
  })
})
