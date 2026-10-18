// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { runInNewContext } from 'node:vm'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { featuresInBounds, GeoJsonFileIndex, indexFeatureBounds, WORKER_SOURCE } from './geojsonFileIndex'

import type { Feature } from 'geojson'

const features: Feature[] = [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.7, 45.4] }, properties: { name: 'Ottawa' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-73.6, 45.5], [-73.5, 45.5], [-73.5, 45.6], [-73.6, 45.5]]] }, properties: { name: 'Montreal' } },
  { type: 'Feature', geometry: null, properties: { name: 'Nowhere' } },
]
const nearOttawa: [number, number, number, number] = [-76, 45, -75, 46]

afterEach(() => vi.unstubAllGlobals())

describe('feature bounds index', () => {
  it('records each feature extent and NaN for missing geometry', () => {
    const bounds = indexFeatureBounds(features)
    expect(Array.from(bounds.slice(0, 8))).toEqual([-75.7, 45.4, -75.7, 45.4, -73.6, 45.5, -73.5, 45.6])
    expect(Number.isNaN(bounds[8])).toBe(true)
  })

  it('returns only the features touching the box', () => {
    expect(featuresInBounds(features, indexFeatureBounds(features), nearOttawa).map(f => f.properties?.name)).toEqual(['Ottawa'])
  })
})

describe('GeoJsonFileIndex without workers', () => {
  it('downloads once, trying the next URL when the first fails, and answers slices', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('CORS'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ type: 'FeatureCollection', features })))
    vi.stubGlobal('fetch', fetchMock)
    const index = new GeoJsonFileIndex(['https://direct/x.geojson', 'https://proxy/x.geojson'])
    expect(await index.load()).toBe(3)
    expect((await index.slice(nearOttawa)).map(f => f.properties?.name)).toEqual(['Ottawa'])
    expect(await index.slice()).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports download progress to whoever is waiting on the load', async () => {
    const body = JSON.stringify({ type: 'FeatureCollection', features })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { headers: { 'content-length': String(body.length) } })))
    const reports: Array<{ bytes?: number; fraction?: number }> = []
    await new GeoJsonFileIndex(['https://direct/x.geojson']).load(progress => reports.push(progress))
    expect(reports.at(-1)).toMatchObject({ bytes: body.length, fraction: 1 })
  })
})

describe('worker source', () => {
  it('runs on its own: loads, then answers a bbox slice', async () => {
    const replies: unknown[] = []
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ type: 'FeatureCollection', features })))
    const scope = { postMessage: (reply: unknown) => replies.push(reply), fetch: fetchMock, TransformStream, Response, onmessage: undefined }
    const onmessage = runInNewContext(`${WORKER_SOURCE}; onmessage`, scope) as (event: { data: unknown }) => Promise<void>
    await onmessage({ data: { type: 'load', id: 1, urls: ['https://x/f.geojson'] } })
    await onmessage({ data: { type: 'slice', id: 2, bbox: nearOttawa } })
    expect(replies.at(-2)).toEqual({ id: 1, count: 3 })
    expect((replies.at(-1) as { features: Feature[] }).features.map(f => f.properties?.name)).toEqual(['Ottawa'])
  })

  it('posts download progress before the count', async () => {
    const replies: Array<Record<string, unknown>> = []
    const body = JSON.stringify({ type: 'FeatureCollection', features })
    const fetchMock = vi.fn(async () => new Response(body, { headers: { 'content-length': String(body.length) } }))
    const scope = { postMessage: (reply: Record<string, unknown>) => replies.push(reply), fetch: fetchMock, TransformStream, Response, onmessage: undefined }
    const onmessage = runInNewContext(`${WORKER_SOURCE}; onmessage`, scope) as (event: { data: unknown }) => Promise<void>
    await onmessage({ data: { type: 'load', id: 1, urls: ['https://x/f.geojson'] } })
    expect(replies.at(-2)).toEqual({ id: 1, progress: true, bytes: body.length, total: body.length })
    expect(replies.at(-1)).toEqual({ id: 1, count: 3 })
  })
})
