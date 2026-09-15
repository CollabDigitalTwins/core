// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { arcOffset, CIRCUMFERENCE, MarkerProgressRing } from './MarkerProgressRing'

describe('arcOffset', () => {
  it('leaves the whole ring empty at nothing done', () => {
    expect(arcOffset(0)).toBeCloseTo(CIRCUMFERENCE)
  })

  it('closes the ring completely at 100', () => {
    expect(arcOffset(100)).toBeCloseTo(0)
  })

  it('fills the fraction the percentage asks for', () => {
    expect(arcOffset(25)).toBeCloseTo(CIRCUMFERENCE * 0.75)
    expect(arcOffset(60)).toBeCloseTo(CIRCUMFERENCE * 0.4)
  })

  it('draws a short spinning arc when the phase reports no percentage', () => {
    const offset = arcOffset(null)
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(CIRCUMFERENCE)
  })

  it('clamps a percentage outside 0-100 rather than overdrawing the arc', () => {
    expect(arcOffset(-20)).toBeCloseTo(CIRCUMFERENCE)
    expect(arcOffset(140)).toBeCloseTo(0)
  })
})

describe('MarkerProgressRing', () => {
  const ring = (container: HTMLElement) => container.querySelector('svg')!

  it('spins only while the progress is unknown', () => {
    const { container } = render(<MarkerProgressRing progress={null} />)
    expect(ring(container).getAttribute('class')).toContain('animate-spin')
  })

  it('stops spinning once a real percentage arrives, so the fill reads as progress', () => {
    const { container } = render(<MarkerProgressRing progress={40} />)
    expect(ring(container).getAttribute('class')).not.toContain('animate-spin')
  })
})
