// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BimContext } from '../../../../../store/BIM/context'

import { useBimPointCloudOpacity } from './useBimPointCloudOpacity'

/** Stands in for BimPointClouds, keeping the one rule that matters: ghost *is* an opacity. */
const { component } = vi.hoisted(() => {
  const opacityHandlers = new Set<(next: unknown) => void>()
  const appearanceHandlers = new Set<(next: unknown) => void>()
  return {
    component: {
      opacities: new Map<string, number>(),
      opacityOf: (id: string) => component.opacities.get(id) ?? 1,
      isGhosted: (id: string) => component.opacityOf(id) < 1,
      setOpacity: (id: string, opacity: number) => {
        component.opacities.set(id, opacity)
        for (const fn of [...opacityHandlers]) fn({ id, opacity })
      },
      setGhosted: (id: string, ghosted: boolean) => component.setOpacity(id, ghosted ? 0.5 : 1),
      onOpacityChanged: {
        add: (fn: (next: unknown) => void) => opacityHandlers.add(fn),
        remove: (fn: (next: unknown) => void) => opacityHandlers.delete(fn),
      },
      onAppearanceChanged: {
        add: (fn: (next: unknown) => void) => appearanceHandlers.add(fn),
        remove: (fn: (next: unknown) => void) => appearanceHandlers.delete(fn),
      },
      opacityHandlers,
      appearanceHandlers,
    },
  }
})

vi.mock('./index', () => ({ BimPointClouds: class {} }))

let readers: ReturnType<typeof useBimPointCloudOpacity>

function Probe() {
  const opacity = useBimPointCloudOpacity()
  readers = opacity
  return (
    <span data-testid="state">
      {`${Math.round(opacity.opacityOf('669') * 100)}|${opacity.isGhosted('669') ? 'ghost' : 'solid'}`}
    </span>
  )
}

function renderProbe(bimComponents: unknown = { get: () => component }) {
  return render(
    <BimContext.Provider value={{ state: { bim: { bimComponents } }, dispatch: vi.fn() } as never}>
      <Probe />
    </BimContext.Provider>,
  )
}

const shown = () => screen.getByTestId('state').textContent

afterEach(() => {
  component.opacities.clear()
  component.opacityHandlers.clear()
  component.appearanceHandlers.clear()
})

describe('useBimPointCloudOpacity', () => {
  it('reads the current opacity', () => {
    component.opacities.set('669', 0.25)

    renderProbe()

    expect(shown()).toBe('25|ghost')
  })

  it('shows the ghost as an opacity, which is the whole point of one value', () => {
    renderProbe()
    expect(shown()).toBe('100|solid')

    act(() => { readers.setGhosted('669', true) })

    expect(shown()).toBe('50|ghost')
  })

  it('reports a slider-dimmed cloud as ghosted, so the sidebar agrees with the settings', () => {
    renderProbe()

    act(() => { readers.setOpacity('669', 0.3) })

    expect(shown()).toBe('30|ghost')
  })

  it('goes back to solid when the ghost is switched off', () => {
    renderProbe()
    act(() => { readers.setGhosted('669', true) })

    act(() => { readers.setGhosted('669', false) })

    expect(shown()).toBe('100|solid')
  })

  it('hands out fresh readers after a change, so a memoising caller cannot show a stale value', () => {
    renderProbe()
    const before = readers.opacityOf

    act(() => { readers.setOpacity('669', 0.4) })

    expect(readers.opacityOf).not.toBe(before)
  })

  it('keeps the readers stable while nothing changes, so memoised rows are not rebuilt', () => {
    const { rerender } = renderProbe()
    const before = readers.opacityOf

    rerender(
      <BimContext.Provider value={{ state: { bim: { bimComponents: { get: () => component } } }, dispatch: vi.fn() } as never}>
        <Probe />
      </BimContext.Provider>,
    )

    expect(readers.opacityOf).toBe(before)
  })

  it('unsubscribes on unmount', () => {
    const view = renderProbe()
    expect(component.opacityHandlers.size).toBe(1)

    view.unmount()

    expect(component.opacityHandlers.size).toBe(0)
    expect(component.appearanceHandlers.size).toBe(0)
  })

  it('is inert before the viewer exists', () => {
    renderProbe(null)

    expect(shown()).toBe('100|solid')
    expect(() => readers.setGhosted('669', true)).not.toThrow()
  })
})
