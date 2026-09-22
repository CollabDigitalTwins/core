// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DISMISSING_MAP_EVENTS, SETTLE_MS, useMapContextMenu } from './useMapContextMenu'

import type * as maplibregl from 'maplibre-gl'

function fakeMap() {
  const handlers = new Map<string, Set<() => void>>()
  const map = {
    on: vi.fn((event: string, handler: () => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    }),
    off: vi.fn((event: string, handler: () => void) => { handlers.get(event)?.delete(handler) }),
  }
  return { map: map as unknown as maplibregl.Map, fire: (event: string) => handlers.get(event)?.forEach(fn => fn()), handlers }
}

const open = (result: { current: ReturnType<typeof useMapContextMenu<{ id: number }>> }, id: number) =>
  act(() => { result.current.open({ x: 10, y: 10, item: { id } }) })

describe('useMapContextMenu', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('holds what was opened until something closes it', () => {
    const { map } = fakeMap()
    const { result } = renderHook(() => useMapContextMenu<{ id: number }>(map))

    open(result, 1)

    expect(result.current.menu?.item.id).toBe(1)
  })

  it('closes when the map is panned, orbited, zoomed or clicked', () => {
    for (const event of DISMISSING_MAP_EVENTS) {
      const { map, fire } = fakeMap()
      const { result } = renderHook(() => useMapContextMenu<{ id: number }>(map))
      open(result, 1)
      act(() => { vi.advanceTimersByTime(SETTLE_MS) })

      act(() => { fire(event) })

      expect(result.current.menu, `${event} should dismiss the menu`).toBeNull()
    }
  })

  it('survives the gesture that opened it: a right-press that nudges the map still leaves a menu', () => {
    const { map, fire } = fakeMap()
    const { result } = renderHook(() => useMapContextMenu<{ id: number }>(map))

    open(result, 1)
    act(() => { fire('rotatestart') })

    expect(result.current.menu?.item.id).toBe(1)
  })

  it('closes the menu another layer had open, so only one is ever on screen', () => {
    const { map } = fakeMap()
    const files = renderHook(() => useMapContextMenu<{ id: number }>(map))
    const models = renderHook(() => useMapContextMenu<{ id: number }>(map))

    open(files.result, 1)
    open(models.result, 2)

    expect(files.result.current.menu).toBeNull()
    expect(models.result.current.menu?.item.id).toBe(2)
  })

  it('stops listening once unmounted, so a dead menu cannot be reopened', () => {
    const { map, handlers } = fakeMap()
    const { unmount } = renderHook(() => useMapContextMenu<{ id: number }>(map))

    unmount()

    expect([...handlers.values()].every(set => set.size === 0)).toBe(true)
  })
})
