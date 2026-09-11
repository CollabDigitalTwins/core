// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MercatorCoordinate } from 'maplibre-gl'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { writeModelMatrix } from './modelMatrix'

import type { LngLatLike } from 'maplibre-gl'

const mercatorModelMatrix = (location: LngLatLike, altitude: number): THREE.Matrix4 => {
  const origin = MercatorCoordinate.fromLngLat(location, altitude)
  const meters = origin.meterInMercatorCoordinateUnits()

  return new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeScale(-meters, meters, meters))
}

describe('writeModelMatrix', () => {
  const cases: Array<[string, LngLatLike, number]> = [
    ['null island at ground level', [0, 0], 0],
    ['ottawa with elevation', [-75.695, 45.424], 71.5],
    ['high latitude', [18.0686, 69.6496], 0],
    ['southern hemisphere below sea level', [151.209, -33.868], -12],
  ]

  it.each(cases)('matches the mercator model transform for %s', (_name, location, altitude) => {
    const actual = writeModelMatrix(new THREE.Matrix4(), location, altitude)

    mercatorModelMatrix(location, altitude).elements.forEach((expected, i) => {
      expect(actual.elements[i]).toBeCloseTo(expected, 12)
    })
  })

  it('writes into the supplied matrix instead of allocating', () => {
    const out = new THREE.Matrix4()

    expect(writeModelMatrix(out, [0, 0], 0)).toBe(out)
  })
})
