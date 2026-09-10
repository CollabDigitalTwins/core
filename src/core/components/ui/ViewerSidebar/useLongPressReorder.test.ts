// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLongPressReorder } from './useLongPressReorder'

const IDS = ['a', 'b', 'c', 'd'] as const
type Id = (typeof IDS)[number]

const BANDS: Record<Id, { top: number; bottom: number }> = {
  a: { top: 0, bottom: 100 },
  b: { top: 100, bottom: 200 },
  c: { top: 200, bottom: 300 },
  d: { top: 300, bottom: 400 },
}

function setup(onReorder = vi.fn()) {
  const view = renderHook(() =>
    useLongPressReorder<Id>({ ids: IDS, onReorder, measure: id => BANDS[id] }),
  )
  return { view, onReorder }
}

function pointerEvent(clientY: number) {
  return {
    clientY,
    pointerId: 1,
    preventDefault: vi.fn(),
    currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
  } as unknown as React.PointerEvent<HTMLElement>
}

function press(view: ReturnType<typeof setup>['view'], id: Id, clientY: number) {
  act(() => { view.result.current.handlersFor(id).onPointerDown(pointerEvent(clientY)) })
}

function hold() {
  act(() => { vi.advanceTimersByTime(400) })
}

function movePointer(clientY: number) {
  act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientY })) })
}

function release() {
  act(() => { window.dispatchEvent(new MouseEvent('pointerup')) })
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useLongPressReorder', () => {
  it('reports the given order when idle', () => {
    const { view } = setup()
    expect(view.result.current.order).toEqual(['a', 'b', 'c', 'd'])
    expect(view.result.current.activeId).toBeNull()
  })

  it('does not start a reorder when the press is released before the hold', () => {
    const { view, onReorder } = setup()
    press(view, 'b', 150)
    act(() => { vi.advanceTimersByTime(200) })
    release()
    expect(view.result.current.activeId).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('starts a reorder once the press is held', () => {
    const { view } = setup()
    press(view, 'b', 150)
    hold()
    expect(view.result.current.activeId).toBe('b')
  })

  it('cancels the press when the pointer moves before the hold', () => {
    const { view } = setup()
    press(view, 'b', 150)
    movePointer(180)
    hold()
    expect(view.result.current.activeId).toBeNull()
  })

  it('moves the held section into the band the pointer is over', () => {
    const { view } = setup()
    press(view, 'b', 150)
    hold()
    movePointer(350)
    expect(view.result.current.order).toEqual(['a', 'c', 'd', 'b'])
  })

  it('commits the new order on release', () => {
    const { view, onReorder } = setup()
    press(view, 'b', 150)
    hold()
    movePointer(50)
    release()
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c', 'd'])
    expect(view.result.current.activeId).toBeNull()
  })

  it('does not commit an order the drag left unchanged', () => {
    const { view, onReorder } = setup()
    press(view, 'b', 150)
    hold()
    movePointer(150)
    release()
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('reverts without committing when Escape is pressed mid-drag', () => {
    const { view, onReorder } = setup()
    press(view, 'b', 150)
    hold()
    movePointer(350)
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(view.result.current.order).toEqual(['a', 'b', 'c', 'd'])
    expect(view.result.current.activeId).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('moves a section a slot down on Alt+ArrowDown', () => {
    const { view, onReorder } = setup()
    act(() => {
      view.result.current.handlersFor('a').onKeyDown({
        key: 'ArrowDown', altKey: true, preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLElement>)
    })
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c', 'd'])
  })

  it('leaves the last section alone on Alt+ArrowDown', () => {
    const { view, onReorder } = setup()
    act(() => {
      view.result.current.handlersFor('d').onKeyDown({
        key: 'ArrowDown', altKey: true, preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLElement>)
    })
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('swallows the click that ends a completed hold', () => {
    const { view } = setup()
    press(view, 'b', 150)
    hold()
    release()

    const preventDefault = vi.fn()
    const click = { preventDefault, stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLElement>
    act(() => { view.result.current.handlersFor('b').onClick(click) })
    expect(preventDefault).toHaveBeenCalled()
  })

  it('lets the click through when the press was too short to reorder', () => {
    const { view } = setup()
    press(view, 'b', 150)
    act(() => { vi.advanceTimersByTime(200) })
    release()

    const preventDefault = vi.fn()
    const click = { preventDefault, stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLElement>
    act(() => { view.result.current.handlersFor('b').onClick(click) })
    expect(preventDefault).not.toHaveBeenCalled()
  })
})
