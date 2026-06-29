// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { uploadToPresignedUrl } from '../../../tools/AddTools/AddFile/utils/uploadToPresignedURLS'

export type Ring = [number, number][]

/** Area-weighted centroid of a polygon ring; used to place a single label. */
export const polygonCentroid = (pts: Ring): [number, number] => {
  let x = 0, y = 0, area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    const cross = x0 * y1 - x1 * y0
    area += cross
    x += (x0 + x1) * cross
    y += (y0 + y1) * cross
  }
  area *= 0.5
  if (area === 0) {
    const n = pts.length || 1
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]
  }
  return [x / (6 * area), y / (6 * area)]
}

/** Bounding box of a ring as [[minLng, minLat], [maxLng, maxLat]]. */
export const ringBounds = (ring: Ring): [[number, number], [number, number]] => {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }
  return [[minLng, minLat], [maxLng, maxLat]]
}

/** Shortest distance from point (px,py) to the segment (ax,ay)-(bx,by). */
export const pointToSegmentDistance = (
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number => {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Build the GeoJSON FeatureCollection stored in minio for a site polygon. */
export const ringToFeatureCollection = (ring: Ring, name: string): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
      properties: { type: 'site', name },
    },
  ],
})

/**
 * Extract the outer ring (open, no repeated closing point) from a stored
 * GeoJSON value, accepting a FeatureCollection, Feature, or bare geometry.
 */
export const ringFromGeoJson = (geo: any): Ring | null => {
  const geometry = (() => {
    if (!geo) return null
    if (geo.type === 'FeatureCollection') {
      const f = (geo.features ?? []).find(
        (feat: any) => feat?.geometry?.type === 'Polygon' || feat?.geometry?.type === 'MultiPolygon',
      )
      return f?.geometry ?? null
    }
    if (geo.type === 'Feature') return geo.geometry ?? null
    return geo
  })()

  if (!geometry) return null

  let coords: any
  if (geometry.type === 'Polygon') coords = geometry.coordinates?.[0]
  else if (geometry.type === 'MultiPolygon') coords = geometry.coordinates?.[0]?.[0]
  if (!Array.isArray(coords) || coords.length < 3) return null

  const ring: Ring = coords.map((c: number[]) => [c[0], c[1]] as [number, number])
  // Drop the closing point if it duplicates the first.
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (ring.length > 1 && first[0] === last[0] && first[1] === last[1]) ring.pop()
  return ring
}

/**
 * (Over)write a site's GeoJSON object in minio under the given asset key.
 * Mirrors the presigned-upload flow used by FileAdder/DatasetAdder.
 */
export const uploadGeoJsonToAsset = async (
  assetId: string,
  ring: Ring,
  name: string,
): Promise<void> => {
  const fc = ringToFeatureCollection(ring, name)
  const file = new File([JSON.stringify(fc)], `${name || 'site'}.geojson`, {
    type: 'application/geo+json',
  })
  const presRes = await fetch(`/api/presigned-url-upload?asset=${encodeURIComponent(assetId)}`)
  if (!presRes.ok) throw new Error('Failed to get an upload URL')
  const { presignedUrl } = await presRes.json()
  await uploadToPresignedUrl(presignedUrl, file)
}
