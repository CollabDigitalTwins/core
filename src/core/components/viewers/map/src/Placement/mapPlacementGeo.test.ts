// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { metresToAnchor, placementToRecord, recordToPlacement } from './mapPlacementGeo'

import type { MapAnchor } from './mapPlacementGeo'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const OTTAWA: MapAnchor = { lng: -75.695, lat: 45.424, elevation: 71.5 }
const EQUATOR: MapAnchor = { lng: 0, lat: 0, elevation: 0 }
const NORTH: MapAnchor = { lng: 18.0686, lat: 60, elevation: 12 }

const placement = (
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  scale = 1,
): PointCloudPlacement => ({ position, rotation, scale, sourceUp: 'y' })

describe('placementToRecord / recordToPlacement', () => {
  const cases: Array<[string, MapAnchor, PointCloudPlacement]> = [
    ['origin', OTTAWA, placement([0, 0, 0])],
    ['positive offsets', OTTAWA, placement([120.25, 14.5, 87.75], [0, 0.7853981633974483, 0], 2.5)],
    ['negative offsets', OTTAWA, placement([-200, -33.25, -145.5], [0, -1.2, 0], 0.4)],
    ['mixed zero components', EQUATOR, placement([0, 8, -60], [0, 3.1, 0], 1)],
    ['high latitude', NORTH, placement([175.5, -20, 90.125], [0, 2.4, 0], 1.75)],
  ]

  it.each(cases)('round-trips %s', (_name, anchor, original) => {
    const back = recordToPlacement(anchor, placementToRecord(anchor, original))

    original.position.forEach((expected, i) => expect(back.position[i]).toBeCloseTo(expected, 6))
    expect(back.scale).toBe(original.scale)
    expect(back.rotation[1]).toBeCloseTo(original.rotation[1], 12)
  })

  it('reports a scene-space east offset as an increase in longitude alone', () => {
    const record = placementToRecord(OTTAWA, placement([100, 0, 0]))

    expect(record.lng).toBeGreaterThan(OTTAWA.lng)
    expect(record.lat).toBeCloseTo(OTTAWA.lat, 12)
    expect(record.elevation).toBeCloseTo(OTTAWA.elevation, 12)
  })

  it('reports a scene-space +Z offset as a decrease in latitude', () => {
    const record = placementToRecord(OTTAWA, placement([0, 0, 100]))

    expect(record.lat).toBeLessThan(OTTAWA.lat)
    expect(record.lng).toBeCloseTo(OTTAWA.lng, 12)
  })

  it('reports a scene-space +Y offset as elevation only', () => {
    const record = placementToRecord(OTTAWA, placement([0, 50, 0]))

    expect(record.elevation).toBeCloseTo(OTTAWA.elevation + 50, 9)
    expect(record.lng).toBeCloseTo(OTTAWA.lng, 12)
    expect(record.lat).toBeCloseTo(OTTAWA.lat, 12)
  })

  it('moves about 1 / 111320 degrees of longitude per metre at the equator', () => {
    const record = placementToRecord(EQUATOR, placement([1, 0, 0]))

    // maplibre's mercator scale uses the mean-radius circumference, so it runs 0.1% above 1/111320
    expect(record.lng).toBeCloseTo(1 / 111320, 7)
  })

  it('converts yaw radians to degrees without flipping the sign', () => {
    expect(placementToRecord(OTTAWA, placement([0, 0, 0], [0, Math.PI / 2, 0])).rotation).toBeCloseTo(90, 9)
    expect(placementToRecord(OTTAWA, placement([0, 0, 0], [0, -Math.PI / 4, 0])).rotation).toBeCloseTo(-45, 9)
  })

  it('ignores pitch and roll and returns a yaw-only placement', () => {
    const record = placementToRecord(OTTAWA, placement([0, 0, 0], [0.5, Math.PI, 0.25]))
    const back = recordToPlacement(OTTAWA, record)

    expect(record.rotation).toBeCloseTo(180, 9)
    expect(back.rotation[0]).toBe(0)
    expect(back.rotation[2]).toBe(0)
    expect(back.rotation[1]).toBeCloseTo(Math.PI, 9)
  })

  it('returns a Y-up placement because the map scene is Y-up', () => {
    const back = recordToPlacement(OTTAWA, { ...OTTAWA, rotation: 0, scale: 1 })

    expect(back.sourceUp).toBe('y')
  })

  it('carries scale through unchanged', () => {
    expect(placementToRecord(OTTAWA, placement([0, 0, 0], [0, 0, 0], 3.25)).scale).toBe(3.25)
  })
})

describe('metresToAnchor', () => {
  it('agrees with the lng/lat/elevation a record would store', () => {
    const moved = metresToAnchor(OTTAWA, 40, 5, -25)
    const record = placementToRecord(OTTAWA, placement([40, 5, -25]))

    expect(moved.lng).toBeCloseTo(record.lng, 12)
    expect(moved.lat).toBeCloseTo(record.lat, 12)
    expect(moved.elevation).toBeCloseTo(record.elevation, 12)
  })

  it('leaves the anchor where it was for a zero move', () => {
    const moved = metresToAnchor(NORTH, 0, 0, 0)

    expect(moved.lng).toBeCloseTo(NORTH.lng, 12)
    expect(moved.lat).toBeCloseTo(NORTH.lat, 12)
    expect(moved.elevation).toBe(NORTH.elevation)
  })

  it('needs fewer metres per degree of longitude at latitude 60 than at the equator', () => {
    const north = metresToAnchor(NORTH, 1000, 0, 0)
    const equator = metresToAnchor(EQUATOR, 1000, 0, 0)

    expect(north.lng - NORTH.lng).toBeGreaterThan((equator.lng - EQUATOR.lng) * 1.9)
  })
})
