// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { sunDirection } from './solarPosition'

import type { BimLighting } from './bimLighting'
import type * as OBC from '@thatopen/components'

const DISTANCE_FACTOR = 3
const CLEARANCE_FACTOR = 0.25
const MIN_VERTICAL = 0.05
const NORMAL_BIAS_FRACTION = 0.002
const BIAS = -0.0005

/**
 * Puts the sun outside the model and aims it at the centre, then frames the shadow camera on the
 * same box. `ShadowedScene` otherwise parks the light near the viewer, which lands it indoors.
 */
export function placeSun(
    world: OBC.World | null | undefined,
    bounds: THREE.Box3 | null | undefined,
    lighting: BimLighting,
) {
    const scene = world?.scene as OBC.ShadowedScene | undefined
    if (!scene || !bounds || bounds.isEmpty()) return

    const centre = bounds.getCenter(new THREE.Vector3())
    const radius = bounds.getSize(new THREE.Vector3()).length() / 2
    if (!Number.isFinite(radius) || radius <= 0) return

    const direction = sunDirection(lighting.azimuth, lighting.elevation)
    const clearance = bounds.max.y - centre.y + radius * CLEARANCE_FACTOR
    const distance = Math.max(radius * DISTANCE_FACTOR, clearance / Math.max(direction.y, MIN_VERTICAL))

    for (const [, light] of scene.directionalLights) {
        light.target.position.copy(centre)
        light.target.updateMatrixWorld()
        light.position.copy(centre).addScaledVector(direction, distance)
        light.updateMatrixWorld()

        const camera = light.shadow.camera
        camera.left = -radius
        camera.right = radius
        camera.top = radius
        camera.bottom = -radius
        camera.near = Math.max(distance - radius * 2, 0.1)
        camera.far = distance + radius * 2
        camera.updateProjectionMatrix()

        // Without a normal offset, faces turned away from the sun self-shadow into stripes.
        light.shadow.normalBias = radius * NORMAL_BIAS_FRACTION
        light.shadow.bias = BIAS

        if (light.shadow.mapSize.width !== lighting.shadowResolution) {
            light.shadow.mapSize.setScalar(lighting.shadowResolution)
            // The map is allocated at the old size, so it has to be dropped for the change to land.
            light.shadow.map?.dispose()
            light.shadow.map = null
        }
        light.shadow.needsUpdate = true
    }
}
