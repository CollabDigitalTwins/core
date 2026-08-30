// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { DEFAULT_BIM_LIGHTING } from './bimLighting'
import { placeSun } from './sunRig'

import type * as OBC from '@thatopen/components'

function makeWorld() {
    const light = new THREE.DirectionalLight()
    const scene = { directionalLights: new Map([['a', light]]) }
    return { world: { scene } as unknown as OBC.World, light }
}

const BUILDING = new THREE.Box3(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 8, 10))

describe('placeSun', () => {
    it('puts the sun outside the model instead of one unit from the origin', () => {
        const { world, light } = makeWorld()

        placeSun(world, BUILDING, DEFAULT_BIM_LIGHTING)

        const centre = BUILDING.getCenter(new THREE.Vector3())
        expect(light.position.distanceTo(centre)).toBeGreaterThan(BUILDING.getSize(new THREE.Vector3()).length())
    })

    it('clears the roof even when the sun is near the horizon', () => {
        const { world, light } = makeWorld()

        placeSun(world, BUILDING, { ...DEFAULT_BIM_LIGHTING, elevation: 3 })

        expect(light.position.y).toBeGreaterThan(BUILDING.max.y)
    })

    it('aims the light at the middle of the model', () => {
        const { world, light } = makeWorld()

        placeSun(world, BUILDING, DEFAULT_BIM_LIGHTING)

        expect(light.target.position.distanceTo(BUILDING.getCenter(new THREE.Vector3()))).toBeCloseTo(0)
    })

    it('frames the shadow camera on the model, so the whole thing is inside the map', () => {
        const { world, light } = makeWorld()

        placeSun(world, BUILDING, DEFAULT_BIM_LIGHTING)

        const radius = BUILDING.getSize(new THREE.Vector3()).length() / 2
        const camera = light.shadow.camera
        expect(camera.right).toBeCloseTo(radius)
        expect(camera.left).toBeCloseTo(-radius)
        expect(camera.far).toBeGreaterThan(light.position.distanceTo(BUILDING.getCenter(new THREE.Vector3())))
        expect(camera.near).toBeGreaterThan(0)
    })

    it('keeps the sun on the requested bearing', () => {
        const { world, light } = makeWorld()
        const centre = BUILDING.getCenter(new THREE.Vector3())

        placeSun(world, BUILDING, { ...DEFAULT_BIM_LIGHTING, azimuth: 90, elevation: 30 })

        const offset = light.position.clone().sub(centre)
        expect(Math.atan2(offset.x, offset.z) * 180 / Math.PI).toBeCloseTo(90)
    })

    it('does nothing without bounds, rather than parking the sun at the origin', () => {
        const { world, light } = makeWorld()
        const before = light.position.clone()

        placeSun(world, null, DEFAULT_BIM_LIGHTING)
        placeSun(world, new THREE.Box3(), DEFAULT_BIM_LIGHTING)

        expect(light.position.equals(before)).toBe(true)
    })
})
