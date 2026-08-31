// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { DEFAULT_APPEARANCE, applyAppearance, normalizeAppearance } from './pointCloudAppearance'

import type { PointCloudMaterialLike } from './pointCloudLoader'

function stubMaterial(): PointCloudMaterialLike {
  return {
    size: 0,
    minSize: 0,
    maxSize: 0,
    pointSizeType: 9,
    pointColorType: 9,
    shape: 9,
    inputColorEncoding: 1,
    outputColorEncoding: 0,
    opacity: 1,
    transparent: false,
    blending: 0,
    depthTest: true,
    clippingPlanes: [],
    clipMode: 0,
    needsUpdate: false,
    syncClippingPlanes: () => {},
    updateShaderSource: () => {},
  }
}

describe('applyAppearance', () => {
  it('maps the named size type and shape onto the shader enums', () => {
    const material = stubMaterial()

    applyAppearance(material, { ...DEFAULT_APPEARANCE, sizeType: 'adaptive', shape: 'circle' })

    expect(material.pointSizeType).toBe(2)
    expect(material.shape).toBe(1)
    expect(material.pointColorType).toBe(0)
    expect(material.needsUpdate).toBe(true)
  })

  it('keeps the colour encodings matched so RGB is written through untouched', () => {
    const material = stubMaterial()

    applyAppearance(material, DEFAULT_APPEARANCE)

    expect(material.outputColorEncoding).toBe(material.inputColorEncoding)
  })
})

describe('applyAppearance opacity', () => {
  it('writes the opacity through to the material', () => {
    const material = stubMaterial()

    applyAppearance(material, { ...DEFAULT_APPEARANCE, opacity: 0.4 })

    expect(material.opacity).toBe(0.4)
  })
})

describe('normalizeAppearance', () => {
  it('applies a partial patch on top of the current appearance', () => {
    const next = normalizeAppearance(DEFAULT_APPEARANCE, { shape: 'square' })

    expect(next.shape).toBe('square')
    expect(next.size).toBe(DEFAULT_APPEARANCE.size)
  })

  it('clamps a budget the renderer could not survive', () => {
    expect(normalizeAppearance(DEFAULT_APPEARANCE, { pointBudget: 1e12 }).pointBudget).toBe(20_000_000)
    expect(normalizeAppearance(DEFAULT_APPEARANCE, { pointBudget: 1 }).pointBudget).toBe(100_000)
  })

  it('never lets the max point size fall below the min', () => {
    const next = normalizeAppearance(DEFAULT_APPEARANCE, { minSize: 20, maxSize: 5 })

    expect(next.maxSize).toBe(20)
  })

  it('ignores a size type or shape it does not know', () => {
    const next = normalizeAppearance(DEFAULT_APPEARANCE, { sizeType: 'wobbly' as never, shape: 'blob' as never })

    expect(next.sizeType).toBe(DEFAULT_APPEARANCE.sizeType)
    expect(next.shape).toBe(DEFAULT_APPEARANCE.shape)
  })

  it('allows a fully hidden cloud and rejects anything past fully opaque', () => {
    expect(normalizeAppearance(DEFAULT_APPEARANCE, { opacity: 0 }).opacity).toBe(0)
    expect(normalizeAppearance(DEFAULT_APPEARANCE, { opacity: 5 }).opacity).toBe(1)
  })

  it('falls back to the current value for a non-finite number', () => {
    const next = normalizeAppearance(DEFAULT_APPEARANCE, { size: Number.NaN })

    expect(next.size).toBe(DEFAULT_APPEARANCE.size)
  })
})
