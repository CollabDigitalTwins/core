// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { allFulfilledOrThrow, withConcurrencyLimit } from '../../../../../utils/concurrency'

import { HOUR_MS } from './cache'
import { cachedFeatures } from './featureStore'
import { throwIfAborted } from './http'
import { tileBounds, tileKey, tilesCovering, TILE_ZOOM, type Tile } from './viewportTiles'

import type { Dataset, LoadedFeatures, ProgressListener } from '../../../../../types/datasetTypes'
import type { FlatBounds } from '../../utils/validateBounds'
import type { Feature } from 'geojson'

export const FULL_LOAD_LIMIT = 50_000
export const VIEWPORT_MIN_ZOOM = TILE_ZOOM
const TILE_CONCURRENCY = 6

const OVERVIEW_ZOOMS = [5, 8, VIEWPORT_MIN_ZOOM]
const DETAILED_ZOOM = 16

interface ViewportSource {
  cacheKey: string
  countFeatures: () => Promise<number | null>
  fetchAll: (total: number | null, tolerance?: number, onProgress?: ProgressListener, signal?: AbortSignal) => Promise<LoadedFeatures>
  fetchBbox: (bbox: FlatBounds, tolerance?: number, signal?: AbortSignal) => Promise<LoadedFeatures>
  simplifies?: () => Promise<boolean>
  ttlMs?: number
}

// The width of one 256px tile pixel at `zoom`, in degrees of longitude.
function pixelDegrees(zoom: number): number {
  return 360 / (256 * 2 ** zoom)
}

const overviewZoom = (zoom: number) => OVERVIEW_ZOOMS.find(level => zoom < level) ?? VIEWPORT_MIN_ZOOM

export function featureCollection(features: Feature[], truncatedAt?: number): LoadedFeatures {
  return truncatedAt === undefined ? { type: 'FeatureCollection', features } : { type: 'FeatureCollection', features, truncatedAt }
}

/** `features` from a paged fetch, marked truncated at the number of items fetched when the pages ran past the cap. */
export function pagedCollection(features: Feature[], { items, truncated }: { items: unknown[]; truncated: boolean }): LoadedFeatures {
  return featureCollection(features, truncated ? items.length : undefined)
}

function mergeTiles(tiles: LoadedFeatures[]): LoadedFeatures {
  const seen = new Set<string | number>()
  const features = tiles.flatMap(tile => tile.features).filter((feature) => {
    if (feature.id === undefined) return true
    if (seen.has(feature.id)) return false
    seen.add(feature.id)
    return true
  })
  const truncated = tiles.find(tile => tile.truncatedAt !== undefined)
  return featureCollection(features, truncated?.truncatedAt)
}

// Cached tiles come back as the same objects, so an unchanged view can return the previous merge and skip a re-render.
function memoisedMerge(): (tiles: LoadedFeatures[]) => LoadedFeatures {
  let lastTiles: LoadedFeatures[] = []
  let lastMerged: LoadedFeatures | undefined
  return (tiles) => {
    if (lastMerged && tiles.length === lastTiles.length && tiles.every((tile, i) => tile === lastTiles[i])) return lastMerged
    lastTiles = tiles
    lastMerged = mergeTiles(tiles)
    return lastMerged
  }
}

interface TileRequest {
  tiles: Tile[]
  ttlMs: number
  merge: (tiles: LoadedFeatures[]) => LoadedFeatures
  tolerance?: number
  onProgress?: ProgressListener
  signal?: AbortSignal
}

function tiledFeatures(source: ViewportSource, { tiles, ttlMs, merge, tolerance, onProgress, signal }: TileRequest) {
  const suffix = tolerance === undefined ? '' : ':detailed'
  let done = 0
  const reportTile = (tile: LoadedFeatures) => onProgress?.({ fraction: ++done / tiles.length, featureCount: tile.features.length })
  return withConcurrencyLimit(tiles, TILE_CONCURRENCY, tile =>
    cachedFeatures(`${source.cacheKey}:${tileKey(tile)}${suffix}`, ttlMs, () => source.fetchBbox(tileBounds(tile), tolerance, signal), signal),
  reportTile).then(loaded => merge(allFulfilledOrThrow(loaded)))
}

/** A `getFeatures` that loads small or zoomed-out datasets whole and large ones per fixed tile of the view, caching each. */
export function viewportLoader(source: ViewportSource): Dataset['getFeatures'] {
  const ttlMs = source.ttlMs ?? HOUR_MS
  let total: Promise<number | null> | undefined
  let simplifies: Promise<boolean> | undefined
  const merge = memoisedMerge()
  let wholeLoaded = false

  const loadWhole = async (count: number | null, onProgress?: ProgressListener, signal?: AbortSignal) => {
    const whole = await cachedFeatures(`${source.cacheKey}:all`, ttlMs, () => source.fetchAll(count, undefined, onProgress, signal), signal)
    wholeLoaded = true
    return whole
  }

  const loadOverview = (count: number | null, zoom: number, onProgress?: ProgressListener, signal?: AbortSignal) => {
    const level = overviewZoom(zoom)
    return cachedFeatures(`${source.cacheKey}:overview-z${level}`, ttlMs, () => source.fetchAll(count, pixelDegrees(level), onProgress, signal), signal)
  }

  const countOnce = async () => {
    total ??= source.countFeatures().catch(() => null)
    const count = await total
    if (count === null) total = undefined
    return count
  }

  return async (options) => {
    simplifies ??= source.simplifies?.().catch(() => false) ?? Promise.resolve(false)
    const [count, simplified] = await Promise.all([countOnce(), simplifies])
    if (count !== null) options?.onProgress?.({ featureCount: 0, totalFeatureCount: count, fraction: 0 })
    const tiles = options?.bbox && (options.zoom ?? 0) >= VIEWPORT_MIN_ZOOM ? tilesCovering(options.bbox) : null
    const onProgress = options?.onProgress
    const signal = options?.signal
    if (simplified) {
      return tiles
        ? tiledFeatures(source, { tiles, ttlMs, merge, tolerance: pixelDegrees(DETAILED_ZOOM), onProgress, signal })
        : loadOverview(count, options?.zoom ?? 0, onProgress, signal)
    }
    const fitsWhole = count !== null && count <= FULL_LOAD_LIMIT
    if (wholeLoaded || fitsWhole || !tiles) return loadWhole(count, onProgress, signal)
    return tiledFeatures(source, { tiles, ttlMs, merge, onProgress, signal })
  }
}

/** A `getFeatures` over a source downloaded whole and indexed locally: all of it when small or zoomed out, else the view. */
export function fileIndexLoader(countFeatures: (onProgress?: ProgressListener) => Promise<number>, slice: (bbox?: FlatBounds) => Promise<Feature[]>): Dataset['getFeatures'] {
  let whole: Promise<LoadedFeatures> | undefined
  return async (options) => {
    const count = await countFeatures(options?.onProgress)
    throwIfAborted(options?.signal)
    if (!options?.bbox || count <= FULL_LOAD_LIMIT || (options.zoom ?? 0) < VIEWPORT_MIN_ZOOM) {
      whole ??= slice().then(features => featureCollection(features), (error: unknown) => {
        whole = undefined
        throw error
      })
      return whole
    }
    const features = await slice(options.bbox)
    throwIfAborted(options.signal)
    return featureCollection(features)
  }
}
