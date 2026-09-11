// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MercatorCoordinate } from 'maplibre-gl'
import * as THREE from 'three'

import type { LngLatLike } from 'maplibre-gl'

const MODEL_ROTATION = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2)

const _scale = new THREE.Vector3()

/**
 * Model-to-mercator matrix for a three.js custom layer: real-world metres scaled
 * into mercator units, then Z-up model space rotated into the map's frame.
 */
export function writeModelMatrix(out: THREE.Matrix4, location: LngLatLike, altitude: number): THREE.Matrix4 {
  const origin = MercatorCoordinate.fromLngLat(location, altitude)
  const meters = origin.meterInMercatorCoordinateUnits()

  return out
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(_scale.set(meters, -meters, meters))
    .multiply(MODEL_ROTATION)
}
