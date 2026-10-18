// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { LayerGeometryType } from '../../../../../../../../types/datasetTypes'
import type { GeometryFamily } from '../../../../../utils/styleExpressions'
import type { Feature, FeatureCollection } from 'geojson'

export interface GeometryGroup {
  family: GeometryFamily
  featureCollection: FeatureCollection
}

/** Draw order: polygons sit beneath lines, and lines beneath points. */
const DRAW_ORDER: GeometryFamily[] = ['polygons', 'lines', 'points']

const FAMILY_BY_GEOMETRY_TYPE: Partial<Record<string, GeometryFamily>> = {
  Point: 'points',
  MultiPoint: 'points',
  LineString: 'lines',
  MultiLineString: 'lines',
  Polygon: 'polygons',
  MultiPolygon: 'polygons',
}

export const LAYER_TYPE_BY_FAMILY: Record<GeometryFamily, LayerGeometryType> = {
  points: 'circle',
  lines: 'line',
  polygons: 'fill',
}

/** The family a GeoJSON geometry type draws as, or undefined for one that cannot be drawn. */
export function geometryFamilyOf(geometryType: string | undefined): GeometryFamily | undefined {
  return geometryType ? FAMILY_BY_GEOMETRY_TYPE[geometryType] : undefined
}

/** One group per geometry family present, in draw order; undrawable geometries such as GeometryCollection are skipped. */
export function groupFeaturesByGeometry(featureCollection: FeatureCollection): GeometryGroup[] {
  const byFamily = new Map<GeometryFamily, Feature[]>()

  for (const feature of featureCollection.features) {
    const family = geometryFamilyOf(feature?.geometry?.type)
    if (!family) continue

    const existing = byFamily.get(family)
    if (existing) existing.push(feature)
    else byFamily.set(family, [feature])
  }

  return DRAW_ORDER.flatMap((family) => {
    const features = byFamily.get(family)
    if (!features) return []
    return [{
      family,
      featureCollection: { ...featureCollection, type: 'FeatureCollection' as const, features },
    }]
  })
}
