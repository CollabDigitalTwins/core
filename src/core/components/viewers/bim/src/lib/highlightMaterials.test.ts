// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { HIGHLIGHT_COLOR, HOVER_OPACITY, SELECTED_OPACITY, hoverMaterial, selectedMaterial } from './highlightMaterials'

describe('highlight materials', () => {
  it('draws the selected overlay over the geometry it covers', () => {
    const material = selectedMaterial() as never as { depthTest: boolean, opacity: number, color: { getHex(): number } }
    expect(material.depthTest).toBe(false)
    expect(material.opacity).toBe(SELECTED_OPACITY)
    expect(material.color.getHex()).toBe(HIGHLIGHT_COLOR)
  })

  it('draws hover fainter than selected', () => {
    expect(HOVER_OPACITY).toBeLessThan(SELECTED_OPACITY)
    expect((hoverMaterial() as never as { opacity: number }).opacity).toBe(HOVER_OPACITY)
  })

  it('hands out an instance per caller, since disposal is per consumer', () => {
    expect(selectedMaterial()).not.toBe(selectedMaterial())
  })
})
