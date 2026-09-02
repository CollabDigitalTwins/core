// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { SUBDIVISION_LINE_WIDTH } from './index'

const countZoomRefs = (node: unknown): number => {
  if (!Array.isArray(node)) return 0
  if (node.length === 1 && node[0] === 'zoom') return 1
  return node.reduce((total: number, child) => total + countZoomRefs(child), 0)
}

describe('SUBDIVISION_LINE_WIDTH', () => {
  it('spends its single allowed zoom curve on the top-level interpolate', () => {
    const [operator, interpolation, input] = SUBDIVISION_LINE_WIDTH
    expect(operator).toBe('interpolate')
    expect(interpolation).toEqual(['linear'])
    expect(input).toEqual(['zoom'])
    expect(countZoomRefs(SUBDIVISION_LINE_WIDTH)).toBe(1)
  })

  it('branches on hover per stop rather than nesting a second zoom curve', () => {
    const stops = SUBDIVISION_LINE_WIDTH.slice(3)
    expect(stops).toHaveLength(10)

    for (let i = 0; i < stops.length; i += 2) {
      expect(typeof stops[i]).toBe('number')
      const [operator, condition, hovered, resting] = stops[i + 1] as unknown as unknown[]
      expect(operator).toBe('case')
      expect(condition).toEqual(['boolean', ['feature-state', 'hover'], false])
      expect(typeof hovered).toBe('number')
      expect(typeof resting).toBe('number')
      expect(hovered as number).toBeGreaterThanOrEqual(resting as number)
    }
  })

  it('keeps zoom stops ascending, as interpolate requires', () => {
    const zooms = SUBDIVISION_LINE_WIDTH.slice(3).filter((_, i) => i % 2 === 0) as number[]
    expect(zooms).toEqual([...zooms].sort((a, b) => a - b))
  })
})
