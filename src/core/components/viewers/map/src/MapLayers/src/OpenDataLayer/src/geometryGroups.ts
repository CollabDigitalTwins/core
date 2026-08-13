// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Feature, FeatureCollection } from 'geojson'

/**
 * The three geometry families the map can draw. MapLibre needs a different
 * layer type for each, so a collection holding more than one family needs more
 * than one layer — see {@link groupFeaturesByGeometry}.
 */
export type GeometryKind = 'polygons' | 'lines' | 'points'

export interface GeometryGroup {
  kind: GeometryKind
  featureCollection: FeatureCollection
}

/** Draw order: polygons sit beneath lines, and lines beneath points. */
const DRAW_ORDER: GeometryKind[] = ['polygons', 'lines', 'points']

const KIND_BY_GEOMETRY_TYPE: Record<string, GeometryKind> = {
  Point: 'points',
  MultiPoint: 'points',
  LineString: 'lines',
  MultiLineString: 'lines',
  Polygon: 'polygons',
  MultiPolygon: 'polygons',
}

/**
 * Split a collection into one group per geometry family present.
 *
 * The renderer used to read `features[0].geometry.type` and draw the whole
 * collection that way, so a file mixing polygons with points or lines lost
 * everything that did not match its first feature — silently, with no error.
 * Grouping first means each family gets its own layer.
 *
 * Features with no geometry, and geometry types the map cannot draw (such as
 * GeometryCollection), are left out rather than throwing.
 *
 * Groups come back in draw order, and each keeps any collection-level fields
 * (`bbox` and friends) from the source.
 */
export function groupFeaturesByGeometry(featureCollection: FeatureCollection): GeometryGroup[] {
  const byKind = new Map<GeometryKind, Feature[]>()

  for (const feature of featureCollection.features) {
    const geometryType = feature?.geometry?.type
    if (!geometryType) continue

    const kind = KIND_BY_GEOMETRY_TYPE[geometryType]
    if (!kind) continue

    const existing = byKind.get(kind)
    if (existing) existing.push(feature)
    else byKind.set(kind, [feature])
  }

  return DRAW_ORDER.flatMap((kind) => {
    const features = byKind.get(kind)
    if (!features) return []
    return [{
      kind,
      featureCollection: { ...featureCollection, type: 'FeatureCollection' as const, features },
    }]
  })
}
