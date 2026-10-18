// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { arcOffset, CIRCUMFERENCE, ProgressRing, RING_STROKE, VIEWBOX } from './ProgressRing'

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

describe('ProgressRing', () => {
  const ring = (container: HTMLElement) => container.querySelector('svg')!

  it('traces a circle whose stroke edge sits flush with the viewBox edge', () => {
    const { container } = render(<ProgressRing progress={40} />)
    const radius = Number(ring(container).querySelector('circle')!.getAttribute('r'))
    expect(radius + RING_STROKE / 2).toBeCloseTo(VIEWBOX / 2, 9)
  })

  it('turns the arc to start at the top without a utility class', () => {
    const { container } = render(<ProgressRing progress={40} />)
    expect(ring(container).style.transform).toContain('rotate(-90deg)')
  })

  it('spins only while the progress is unknown', () => {
    const spinning = render(<ProgressRing progress={null} />)
    expect(ring(spinning.container).getAttribute('class')).toContain('animate-spin')
    const filling = render(<ProgressRing progress={40} />)
    expect(ring(filling.container).getAttribute('class')).not.toContain('animate-spin')
  })

  it('is announced as a progressbar only when it has a label', () => {
    render(<ProgressRing progress={40} label="Loading" />)
    expect(screen.getByRole('progressbar', { name: 'Loading' }).getAttribute('aria-valuenow')).toBe('40')
    const unlabelled = render(<ProgressRing progress={40} />)
    expect(ring(unlabelled.container).getAttribute('aria-hidden')).toBe('true')
  })

  it('prints the percent beside a determinate ring when asked, but not beside a spinning one', () => {
    render(<ProgressRing progress={42.4} showPercent />)
    expect(screen.getByText('42%')).toBeTruthy()
    const { container } = render(<ProgressRing progress={null} showPercent />)
    expect(container.textContent).toBe('')
  })

  it('draws the arc in the tone of the surface it sits on', () => {
    const { container } = render(<ProgressRing progress={40} tone="onPrimary" />)
    const arc = ring(container).querySelectorAll('circle')[1]
    expect(arc.getAttribute('class')).toBe('stroke-primary-foreground')
  })
})
