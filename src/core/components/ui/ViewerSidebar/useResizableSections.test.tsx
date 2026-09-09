// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { useResizableSections } from './useResizableSections'

type Id = 'a' | 'b' | 'c' | 'd'

const IDS: readonly Id[] = ['a', 'b', 'c', 'd']
const DEFAULT_WEIGHTS: Record<Id, number> = { a: 25, b: 25, c: 25, d: 25 }
const MIN_WEIGHTS: Record<Id, number> = { a: 10, b: 10, c: 10, d: 10 }
const ALL_OPEN: Record<Id, boolean> = { a: true, b: true, c: true, d: true }

function Harness({ open }: { open: Record<Id, boolean> }) {
  const { layoutRef, gridTemplateRows, weights, separatorAfter, beginResize } = useResizableSections({
    ids: IDS,
    defaultWeights: DEFAULT_WEIGHTS,
    minWeights: MIN_WEIGHTS,
    open,
  })

  return (
    <div ref={layoutRef} data-testid="layout" style={{ gridTemplateRows }}>
      <div data-testid="weights">{JSON.stringify(weights)}</div>
      {IDS.map(id => (
        <React.Fragment key={id}>
          <div>{id}</div>
          {separatorAfter(id) && (
            <div role="separator" aria-label={id} onPointerDown={beginResize(id)} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function stubClientHeight(element: HTMLElement, value: number) {
  Object.defineProperty(element, 'clientHeight', { value, configurable: true })
}

// jsdom has no Pointer Events capture implementation; beginResize needs a no-op.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => undefined
}

// jsdom has no PointerEvent constructor; fireEvent.pointer* needs one that carries clientY/pointerId.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
    }
  }
  // @ts-expect-error jsdom has no native PointerEvent to satisfy the lib.dom type
  window.PointerEvent = PointerEventPolyfill
}

function readWeights(): Record<Id, number> {
  return JSON.parse(screen.getByTestId('weights').textContent ?? '{}')
}

function drag(separatorLabel: Id, deltaY: number) {
  const separator = screen.getByRole('separator', { name: separatorLabel })
  fireEvent.pointerDown(separator, { clientY: 0, pointerId: 1 })
  fireEvent.pointerMove(window, { clientY: deltaY })
  fireEvent.pointerUp(window)
}

describe('useResizableSections', () => {
  it('interleaves three separator rows for four equal-weight open sections', () => {
    render(<Harness open={ALL_OPEN} />)
    const layout = screen.getByTestId('layout')
    expect(layout.style.gridTemplateRows).toBe('25fr 8px 25fr 8px 25fr 8px 25fr')
  })

  it('renders a collapsed row as auto with no adjacent separator when it is last-open', () => {
    render(<Harness open={{ ...ALL_OPEN, d: false }} />)
    const layout = screen.getByTestId('layout')
    expect(layout.style.gridTemplateRows).toBe('25fr 8px 25fr 8px 25fr auto')
    expect(screen.queryByRole('separator', { name: 'c' })).toBeNull()
  })

  it('separatorAfter is false for the last open section and for a collapsed one', () => {
    render(<Harness open={{ ...ALL_OPEN, b: false }} />)
    expect(screen.queryByRole('separator', { name: 'd' })).toBeNull()
    expect(screen.queryByRole('separator', { name: 'b' })).toBeNull()
  })

  it('a drag after the first section changes only its pair, leaving the rest untouched', () => {
    render(<Harness open={ALL_OPEN} />)
    stubClientHeight(screen.getByTestId('layout'), 424)

    drag('a', 20)

    const weights = readWeights()
    expect(weights.a).not.toBe(DEFAULT_WEIGHTS.a)
    expect(weights.a + weights.b).toBe(DEFAULT_WEIGHTS.a + DEFAULT_WEIGHTS.b)
    expect(weights.c).toBe(DEFAULT_WEIGHTS.c)
    expect(weights.d).toBe(DEFAULT_WEIGHTS.d)
  })

  it('clamps the drag at minWeights on both sides of the pair', () => {
    render(<Harness open={ALL_OPEN} />)
    stubClientHeight(screen.getByTestId('layout'), 424)

    drag('a', 10000)
    const grown = readWeights()
    expect(grown.a).toBe(DEFAULT_WEIGHTS.a + DEFAULT_WEIGHTS.b - MIN_WEIGHTS.b)
    expect(grown.b).toBe(MIN_WEIGHTS.b)

    drag('a', -10000)
    const shrunk = readWeights()
    expect(shrunk.a).toBe(MIN_WEIGHTS.a)
    expect(shrunk.b).toBe(DEFAULT_WEIGHTS.a + DEFAULT_WEIGHTS.b - MIN_WEIGHTS.a)
  })

  it('restores a section weight it had before it was collapsed', () => {
    const { rerender } = render(<Harness open={ALL_OPEN} />)
    stubClientHeight(screen.getByTestId('layout'), 424)
    drag('a', 20)
    const dragged = readWeights()

    rerender(<Harness open={{ ...ALL_OPEN, a: false }} />)
    rerender(<Harness open={ALL_OPEN} />)

    expect(readWeights()).toEqual(dragged)
  })
})
