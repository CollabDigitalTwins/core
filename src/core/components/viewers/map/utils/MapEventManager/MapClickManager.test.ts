// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MapClickManager, MapLayerClickPriority, MAX_POPUP_ENTRIES } from './MapClickManager'

import type { PopupEntry } from '../../../../../types/map'

const event = { point: { x: 0, y: 0 } } as never

function makeMap(hitLayerIds: string[]) {
  const listeners: ((e: unknown) => void)[] = []
  return {
    listeners,
    on: (_: string, fn: (e: unknown) => void) => listeners.push(fn),
    off: vi.fn(),
    queryRenderedFeatures: () => hitLayerIds.map(id => ({ layer: { id } })),
    click: () => listeners.forEach(fn => fn(event)),
  }
}

function entry(id: string, layerId: string, priority: number): PopupEntry {
  return { id, layerId, priority, title: id, coordinates: [0, 0], render: () => null }
}

describe('MapClickManager', () => {
  let published: PopupEntry[][]

  beforeEach(() => {
    published = []
  })

  function managerFor(hitLayerIds: string[]) {
    const map = makeMap(hitLayerIds)
    const manager = new MapClickManager(map as never)
    manager.onPopupStack(entries => published.push(entries))
    return { map, manager }
  }

  it('collects entries from every hit resolver instead of stopping at the first', () => {
    const { map, manager } = managerFor(['open-data', 'buildings'])
    manager.register('buildings', MapLayerClickPriority.BuildingLayersClickPriority, () => [
      entry('b1', 'buildings', MapLayerClickPriority.BuildingLayersClickPriority),
    ])
    manager.register('open-data', MapLayerClickPriority.OpenDataLayerClickPriority, () => [
      entry('o1', 'open-data', MapLayerClickPriority.OpenDataLayerClickPriority),
    ])

    map.click()

    expect(published.at(-1)?.map(e => e.id)).toEqual(['o1', 'b1'])
  })

  it('orders by priority descending and breaks ties on registration order', () => {
    const { map, manager } = managerFor(['sensors', 'comments'])
    manager.register('comments', MapLayerClickPriority.CommentLayersClickPriority, () => [
      entry('c1', 'comments', MapLayerClickPriority.CommentLayersClickPriority),
    ])
    manager.register('sensors', MapLayerClickPriority.CommentLayersClickPriority, () => [
      entry('s1', 'sensors', MapLayerClickPriority.CommentLayersClickPriority),
    ])

    map.click()

    expect(published.at(-1)?.map(e => e.id)).toEqual(['c1', 's1'])
  })

  it('deduplicates by entry id when one resolver is registered under several layers', () => {
    const { map, manager } = managerFor(['od-fill', 'od-line'])
    const resolve = () => [entry('shared', 'od', MapLayerClickPriority.OpenDataLayerClickPriority)]
    manager.register('od-fill', MapLayerClickPriority.OpenDataLayerClickPriority, resolve)
    manager.register('od-line', MapLayerClickPriority.OpenDataLayerClickPriority, resolve)

    map.click()

    expect(published.at(-1)).toHaveLength(1)
  })

  it('caps the stack', () => {
    const ids = Array.from({ length: MAX_POPUP_ENTRIES + 5 }, (_, i) => `f${i}`)
    const { map, manager } = managerFor(['dense'])
    manager.register('dense', MapLayerClickPriority.OpenDataLayerClickPriority, () =>
      ids.map(id => entry(id, 'dense', MapLayerClickPriority.OpenDataLayerClickPriority)),
    )

    map.click()

    expect(published.at(-1)).toHaveLength(MAX_POPUP_ENTRIES)
  })

  it('publishes an empty stack when nothing was hit', () => {
    const { map, manager } = managerFor([])
    manager.register('buildings', MapLayerClickPriority.BuildingLayersClickPriority, () => [
      entry('b1', 'buildings', MapLayerClickPriority.BuildingLayersClickPriority),
    ])

    map.click()

    expect(published.at(-1)).toEqual([])
  })

  it('an active tool short-circuits and yields no entries', () => {
    const { map, manager } = managerFor(['buildings'])
    const tool = vi.fn()
    manager.register('buildings', MapLayerClickPriority.BuildingLayersClickPriority, () => [
      entry('b1', 'buildings', MapLayerClickPriority.BuildingLayersClickPriority),
    ])
    manager.registerLegacy('measure-tools', MapLayerClickPriority.ActiveTool, tool)

    map.click()

    expect(tool).toHaveBeenCalledOnce()
    expect(published).toEqual([])
  })

  it('unregister removes a handler', () => {
    const { map, manager } = managerFor(['buildings'])
    manager.register('buildings', MapLayerClickPriority.BuildingLayersClickPriority, () => [
      entry('b1', 'buildings', MapLayerClickPriority.BuildingLayersClickPriority),
    ])
    manager.unregister('buildings')

    map.click()

    expect(published.at(-1)).toEqual([])
  })

  describe('legacy bridge', () => {
    it('an unmigrated layer still consumes the click exclusively', () => {
      const { map, manager } = managerFor(['bim', 'buildings'])
      const legacy = vi.fn()
      manager.registerLegacy('bim', MapLayerClickPriority.BimModelLayerPriority, legacy)
      manager.register('buildings', MapLayerClickPriority.BuildingLayersClickPriority, () => [
        entry('b1', 'buildings', MapLayerClickPriority.BuildingLayersClickPriority),
      ])

      map.click()

      expect(legacy).toHaveBeenCalledOnce()
      expect(published.at(-1)).toEqual([])
    })

    it('a lower-priority unmigrated layer stays silent once a resolver has contributed', () => {
      const { map, manager } = managerFor(['site', 'buildings'])
      const legacy = vi.fn()
      manager.register('buildings', MapLayerClickPriority.BuildingLayersClickPriority, () => [
        entry('b1', 'buildings', MapLayerClickPriority.BuildingLayersClickPriority),
      ])
      manager.registerLegacy('site', MapLayerClickPriority.SiteLayerClickPriority, legacy)

      map.click()

      expect(legacy).not.toHaveBeenCalled()
      expect(published.at(-1)?.map(e => e.id)).toEqual(['b1'])
    })
  })
})
