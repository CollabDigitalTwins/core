// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { sunDirection } from './solarPosition'
import { placeSun } from './sunRig'

import type * as OBC from '@thatopen/components'

const DEG = Math.PI / 180

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

export interface BimLighting {
    /** Directional "sun" strength. This is the light that casts the shadows. */
    sunIntensity: number
    /** Fill light. High values flatten the model and wash out both shadows and ambient occlusion. */
    ambientIntensity: number
    /** Compass bearing of the sun in degrees, 0 = +Z, increasing clockwise. */
    azimuth: number
    /** Height of the sun above the horizon in degrees. */
    elevation: number
    color: string
    /** Shadow-map edge length in texels. Higher is sharper and costs memory quadratically. */
    shadowResolution: number
}

/** A three-quarter architectural key light: strong sun, restrained fill, so contact shadows read. */
export const DEFAULT_BIM_LIGHTING: BimLighting = {
    sunIntensity: 2.6,
    ambientIntensity: 0.5,
    azimuth: 135,
    elevation: 45,
    color: '#ffffff',
    shadowResolution: 2048,
}

function sceneOf(world: OBC.World | null | undefined) {
    const scene = world?.scene as OBC.ShadowedScene | undefined
    if (!scene?.config?.directionalLight || !scene.config.ambientLight) return null
    return scene
}

/**
 * Writes the rig through `scene.config`, the only path that survives: the shadow recompute
 * re-derives the sun direction from the config and overwrites the light itself every time.
 */
export function applyBimLighting(
    world: OBC.World | null | undefined,
    lighting: BimLighting,
    bounds?: THREE.Box3 | null,
) {
    const scene = sceneOf(world)
    if (!scene) return

    scene.config.directionalLight.color = new THREE.Color(lighting.color)
    scene.config.directionalLight.intensity = lighting.sunIntensity
    scene.config.directionalLight.position = sunDirection(lighting.azimuth, lighting.elevation)
    scene.config.ambientLight.color = new THREE.Color('#ffffff')
    scene.config.ambientLight.intensity = lighting.ambientIntensity

    if (bounds) placeSun(world, bounds, lighting)

    // Draws are on demand, so without this the new sun sits there until the camera next moves.
    const renderer = world?.renderer as OnDemandRenderer | undefined
    if (renderer) renderer.needsUpdate = true
}

/** Re-frames the sun on the model, for when geometry arrives after the rig was last written. */
export function refreshSunPlacement(
    world: OBC.World | null | undefined,
    bounds: THREE.Box3 | null | undefined,
    lighting: BimLighting,
) {
    if (!bounds) return
    placeSun(world, bounds, lighting)
    const renderer = world?.renderer as OnDemandRenderer | undefined
    if (renderer) renderer.needsUpdate = true
}

function shadowResolutionOf(scene: OBC.ShadowedScene) {
    for (const [, light] of scene.directionalLights) return light.shadow.mapSize.width
    return DEFAULT_BIM_LIGHTING.shadowResolution
}

/** Reads the rig back off the scene so the panel opens on the real values, not the defaults. */
export function readBimLighting(world: OBC.World | null | undefined): BimLighting {
    const scene = sceneOf(world)
    if (!scene) return { ...DEFAULT_BIM_LIGHTING }

    const position = scene.config.directionalLight.position
    const horizontal = Math.hypot(position.x, position.z)
    const azimuth = horizontal === 0 ? DEFAULT_BIM_LIGHTING.azimuth
        : ((Math.atan2(position.x, -position.z) / DEG) + 360) % 360
    const elevation = horizontal === 0 && position.y === 0 ? DEFAULT_BIM_LIGHTING.elevation
        : Math.atan2(position.y, horizontal) / DEG

    return {
        sunIntensity: scene.config.directionalLight.intensity,
        ambientIntensity: scene.config.ambientLight.intensity,
        azimuth,
        elevation,
        color: `#${scene.config.directionalLight.color.getHexString()}`,
        shadowResolution: shadowResolutionOf(scene),
    }
}
