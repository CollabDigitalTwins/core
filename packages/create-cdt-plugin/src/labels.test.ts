// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SURFACE_LABELS } from './labels'
import { SURFACES } from './options'

describe('SURFACE_LABELS', () => {
  // It went stale silently once: four surfaces had no row and prompted as `undefined`.
  it('covers every surface, and nothing that is not one', () => {
    expect(Object.keys(SURFACE_LABELS).sort()).toEqual([...SURFACES].sort())
  })

  for (const surface of SURFACES) {
    it(`gives ${surface} a label and a description`, () => {
      const { label, description } = SURFACE_LABELS[surface]

      expect(label.length).toBeGreaterThan(0)
      expect(description.length).toBeGreaterThan(0)
    })
  }

  it('names the place rather than restating the capability id', () => {
    for (const surface of SURFACES) {
      expect(SURFACE_LABELS[surface].label).not.toContain('.')
    }
  })

  it('keeps every label distinct, so two rows never read the same', () => {
    const labels = SURFACES.map(surface => SURFACE_LABELS[surface].label)

    expect(new Set(labels).size).toBe(labels.length)
  })
})
