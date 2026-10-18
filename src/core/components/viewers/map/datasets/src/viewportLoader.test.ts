// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { featureCollection, FULL_LOAD_LIMIT, fileIndexLoader, viewportLoader, VIEWPORT_MIN_ZOOM } from './viewportLoader'
import { tileBounds, tilesCovering, TILE_ZOOM } from './viewportTiles'

import type { Feature, FeatureCollection } from 'geojson'

const point = (id: number): Feature => ({ type: 'Feature', id, geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} })
const ottawa: [number, number, number, number] = [-75.75, 45.38, -75.65, 45.45]
let keySeed = 0

function source(total: number | null) {
  return {
    cacheKey: `test-${++keySeed}`,
    countFeatures: vi.fn(async () => total),
    fetchAll: vi.fn(async () => featureCollection([point(1), point(2)])),
    fetchBbox: vi.fn(async () => featureCollection([point(1), point(3)])),
  }
}

describe('viewportLoader', () => {
  it('loads a small dataset whole even when a view is given', async () => {
    const small = source(10)
    const result = await viewportLoader(small)({ bbox: ottawa, zoom: 14 })
    expect((result as FeatureCollection).features).toHaveLength(2)
    expect(small.fetchBbox).not.toHaveBeenCalled()
  })

  it('loads a large dataset whole when zoomed out past the tile level', async () => {
    const large = source(FULL_LOAD_LIMIT + 1)
    const result = await viewportLoader(large)({ bbox: ottawa, zoom: VIEWPORT_MIN_ZOOM - 1 })
    expect((result as FeatureCollection).features).toHaveLength(2)
    expect((large.fetchAll.mock.calls[0] as unknown[])[0]).toBe(FULL_LOAD_LIMIT + 1)
    expect(large.fetchBbox).not.toHaveBeenCalled()
  })

  it('loads a dataset of unknown size whole when zoomed out', async () => {
    const unknown = source(null)
    const result = await viewportLoader(unknown)({ bbox: ottawa, zoom: 3 })
    expect((result as FeatureCollection).features).toHaveLength(2)
    expect(unknown.fetchBbox).not.toHaveBeenCalled()
  })

  it('serves every later view from the whole dataset once it is loaded', async () => {
    const large = source(FULL_LOAD_LIMIT + 1)
    const load = viewportLoader(large)
    await load({ bbox: ottawa, zoom: 5 })
    const result = await load({ bbox: ottawa, zoom: 14 })
    expect((result as FeatureCollection).features).toHaveLength(2)
    expect(large.fetchBbox).not.toHaveBeenCalled()
  })

  it('loads a large dataset per tile and drops features repeated across tiles', async () => {
    const large = source(FULL_LOAD_LIMIT + 1)
    const tiles = tilesCovering(ottawa) ?? []
    const result = await viewportLoader(large)({ bbox: ottawa, zoom: 14 })
    expect(large.fetchBbox).toHaveBeenCalledTimes(tiles.length)
    expect((result as FeatureCollection).features.map(feature => feature.id).sort()).toEqual([1, 3])
  })

  it('reuses cached tiles on the next pan', async () => {
    const large = source(FULL_LOAD_LIMIT + 1)
    const load = viewportLoader(large)
    await load({ bbox: ottawa, zoom: 14 })
    const calls = large.fetchBbox.mock.calls.length
    await load({ bbox: ottawa, zoom: 15 })
    expect(large.fetchBbox.mock.calls.length).toBe(calls)
  })
})

describe('viewportLoader progress', () => {
  it('hands the listener to a whole load', async () => {
    const small = source(10)
    const onProgress = vi.fn()
    await viewportLoader(small)({ bbox: ottawa, zoom: 14, onProgress })
    expect(small.fetchAll).toHaveBeenCalledWith(10, undefined, onProgress, undefined)
  })

  it('reports the counted total before the first page arrives', async () => {
    const small = source(10)
    const onProgress = vi.fn()
    await viewportLoader(small)({ onProgress })
    expect(onProgress).toHaveBeenNthCalledWith(1, { featureCount: 0, totalFeatureCount: 10, fraction: 0 })
  })

  it('reports the share of tiles loaded', async () => {
    const large = source(FULL_LOAD_LIMIT + 1)
    const onProgress = vi.fn()
    await viewportLoader(large)({ bbox: ottawa, zoom: 14, onProgress })
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ fraction: 1 }))
  })
})

describe('viewportLoader cancellation', () => {
  it('hands the caller signal to a whole load', async () => {
    const small = source(10)
    const { signal } = new AbortController()
    await viewportLoader(small)({ signal })
    expect(small.fetchAll).toHaveBeenCalledWith(10, undefined, undefined, signal)
  })

  it('hands the caller signal to every tile', async () => {
    const large = source(FULL_LOAD_LIMIT + 1)
    const { signal } = new AbortController()
    await viewportLoader(large)({ bbox: ottawa, zoom: 14, signal })
    expect(large.fetchBbox.mock.calls.every(call => (call as unknown[])[2] === signal)).toBe(true)
  })
})

describe('viewportLoader over a source that simplifies geometry', () => {
  const simplifying = (total: number) => ({ ...source(total), simplifies: async () => true })

  it('loads a simplified overview whole when zoomed out, once per detail level', async () => {
    const lines = simplifying(10)
    const load = viewportLoader(lines)
    await load({ bbox: ottawa, zoom: 3 })
    await load({ bbox: ottawa, zoom: 4 })
    await load({ bbox: ottawa, zoom: 9 })
    const tolerances = lines.fetchAll.mock.calls.map(call => (call as unknown[])[1] as number)
    expect(tolerances).toHaveLength(2)
    expect(tolerances[0]).toBeGreaterThan(tolerances[1])
    expect(lines.fetchBbox).not.toHaveBeenCalled()
  })

  it('fetches detailed tiles once zoomed in, however few features it has', async () => {
    const lines = simplifying(10)
    const load = viewportLoader(lines)
    await load({ bbox: ottawa, zoom: 9 })
    await load({ bbox: ottawa, zoom: 14 })
    const overview = (lines.fetchAll.mock.calls[0] as unknown[])[1] as number
    expect(lines.fetchBbox).toHaveBeenCalledTimes(tilesCovering(ottawa)?.length ?? 0)
    expect((lines.fetchBbox.mock.calls[0] as unknown[])[1]).toBeLessThan(overview)
  })
})

describe('fileIndexLoader', () => {
  it('slices by view only once the source is too big to draw whole', async () => {
    const slice = vi.fn(async () => [point(1)])
    await fileIndexLoader(async () => FULL_LOAD_LIMIT + 1, slice)({ bbox: ottawa, zoom: 14 })
    expect(slice).toHaveBeenCalledWith(ottawa)
    await fileIndexLoader(async () => 5, slice)({ bbox: ottawa, zoom: 14 })
    expect(slice).toHaveBeenLastCalledWith()
  })

  it('passes the listener to the whole-file count', async () => {
    const count = vi.fn(async () => 3)
    const onProgress = vi.fn()
    await fileIndexLoader(count, async () => [point(1)])({ onProgress })
    expect(count).toHaveBeenCalledWith(onProgress)
  })

  it('draws a large source whole when zoomed out past the tile level', async () => {
    const slice = vi.fn(async () => [point(1)])
    const result = await fileIndexLoader(async () => FULL_LOAD_LIMIT + 1, slice)({ bbox: ottawa, zoom: VIEWPORT_MIN_ZOOM - 1 })
    expect(slice).toHaveBeenCalledWith()
    expect((result as FeatureCollection).features).toHaveLength(1)
  })
})

describe('viewport tiles', () => {
  it('covers a view with fixed-zoom tiles whose bounds contain it', () => {
    const tiles = tilesCovering(ottawa) ?? []
    expect(tiles.every(tile => tile.z === TILE_ZOOM)).toBe(true)
    const bounds = tiles.map(tileBounds)
    expect(Math.min(...bounds.map(b => b[0]))).toBeLessThanOrEqual(ottawa[0])
    expect(Math.max(...bounds.map(b => b[3]))).toBeGreaterThanOrEqual(ottawa[3])
  })

  it('refuses a view that would need too many tiles', () => {
    expect(tilesCovering([-140, 40, -50, 70])).toBeNull()
  })
})
