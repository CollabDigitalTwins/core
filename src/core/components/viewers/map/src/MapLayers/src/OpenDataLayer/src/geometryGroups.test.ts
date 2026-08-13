// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { groupFeaturesByGeometry } from './geometryGroups'

import type { Feature, FeatureCollection } from 'geojson'

function fc(...features: Feature[]): FeatureCollection {
  return { type: 'FeatureCollection', features }
}

const point: Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: [0, 0] },
}

const multiPoint: Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] },
}

const line: Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
}

const multiLine: Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] },
}

const polygon: Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
}

const multiPolygon: Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] },
}

describe('groupFeaturesByGeometry', () => {
  it('keeps every geometry family present in a mixed collection', () => {
    const groups = groupFeaturesByGeometry(fc(polygon, line, point))
    expect(groups.map(g => g.kind).sort()).toEqual(['lines', 'points', 'polygons'])
  })

  it('does not let the first feature decide the whole collection', () => {
    const polygonFirst = groupFeaturesByGeometry(fc(polygon, point))
    const pointFirst = groupFeaturesByGeometry(fc(point, polygon))
    expect(polygonFirst.map(g => g.kind).sort()).toEqual(pointFirst.map(g => g.kind).sort())
  })

  it('puts each feature in its own group', () => {
    const groups = groupFeaturesByGeometry(fc(polygon, line, point))
    const points = groups.find(g => g.kind === 'points')
    expect(points?.featureCollection.features).toEqual([point])
  })

  it('groups multi-geometries with their single counterparts', () => {
    const groups = groupFeaturesByGeometry(fc(point, multiPoint, line, multiLine, polygon, multiPolygon))
    expect(groups).toHaveLength(3)
    for (const group of groups) {
      expect(group.featureCollection.features).toHaveLength(2)
    }
  })

  it('returns a single group for a collection of one family', () => {
    const groups = groupFeaturesByGeometry(fc(polygon, polygon))
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe('polygons')
    expect(groups[0].featureCollection.features).toHaveLength(2)
  })

  it('returns no groups for an empty collection', () => {
    expect(groupFeaturesByGeometry(fc())).toEqual([])
  })

  it('ignores features with no geometry rather than throwing', () => {
    const noGeometry = { type: 'Feature', properties: {}, geometry: null } as unknown as Feature
    const groups = groupFeaturesByGeometry(fc(noGeometry, point))
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe('points')
  })

  it('ignores geometry types it cannot draw, such as GeometryCollection', () => {
    const collection = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'GeometryCollection', geometries: [] },
    } as unknown as Feature
    const groups = groupFeaturesByGeometry(fc(collection, point))
    expect(groups.map(g => g.kind)).toEqual(['points'])
  })

  it('orders groups so polygons draw beneath lines and points', () => {
    const groups = groupFeaturesByGeometry(fc(point, line, polygon))
    expect(groups.map(g => g.kind)).toEqual(['polygons', 'lines', 'points'])
  })

  it('carries the collection-level properties onto each group', () => {
    const source: FeatureCollection = {
      type: 'FeatureCollection',
      bbox: [0, 0, 1, 1],
      features: [polygon, point],
    }
    const groups = groupFeaturesByGeometry(source)
    for (const group of groups) {
      expect(group.featureCollection.bbox).toEqual([0, 0, 1, 1])
      expect(group.featureCollection.type).toBe('FeatureCollection')
    }
  })
})
