// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarkerProgressRing, OVERHANG } from './MarkerProgressRing'

describe('MarkerProgressRing', () => {
  const ring = (container: HTMLElement) => container.querySelector('svg')!

  it('spins only while the progress is unknown', () => {
    const { container } = render(<MarkerProgressRing progress={null} />)
    expect(ring(container).getAttribute('class')).toContain('animate-spin')
  })

  it('stops spinning once a real percentage arrives, so the fill reads as progress', () => {
    const { container } = render(<MarkerProgressRing progress={40} />)
    expect(ring(container).getAttribute('class') ?? '').not.toContain('animate-spin')
  })
})

describe('MarkerProgressRing geometry', () => {
  const ring = (container: HTMLElement) => container.querySelector('svg')!

  it('sizes and places itself inline, because a consumer build may not ship our utility classes', () => {
    const { container } = render(<MarkerProgressRing progress={40} />)
    const { style } = ring(container)

    expect(style.position).toBe('absolute')
    expect(style.width).toBe(`calc(100% + ${OVERHANG * 2}px)`)
    expect(style.height).toBe(`calc(100% + ${OVERHANG * 2}px)`)
    expect(style.top).toBe(`${-OVERHANG}px`)
    expect(style.left).toBe(`${-OVERHANG}px`)
  })
})

