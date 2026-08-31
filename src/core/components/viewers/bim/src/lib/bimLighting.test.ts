// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { applyBimLighting, DEFAULT_BIM_LIGHTING, readBimLighting } from './bimLighting'

import type * as OBC from '@thatopen/components'

function makeWorld() {
    const config = {
        directionalLight: { color: new THREE.Color('#ffffff'), intensity: 1.5, position: new THREE.Vector3() },
        ambientLight: { color: new THREE.Color('#ffffff'), intensity: 1.5 },
    }
    const light = { shadow: { mapSize: { width: 1024 } } }
    const scene = {
        config,
        shadowsEnabled: true,
        updateShadows: vi.fn().mockResolvedValue(undefined),
        directionalLights: new Map([['a', light]]),
    }
    const renderer = { needsUpdate: false }
    return { world: { scene, renderer } as unknown as OBC.World, scene, config, renderer }
}

describe('applyBimLighting', () => {
    it('writes the rig through the scene config, which the shadow recompute reads', () => {
        const { world, config } = makeWorld()

        applyBimLighting(world, { ...DEFAULT_BIM_LIGHTING, sunIntensity: 3, ambientIntensity: 0.2 })

        expect(config.directionalLight.intensity).toBe(3)
        expect(config.ambientLight.intensity).toBe(0.2)
        expect(config.directionalLight.position.length()).toBeCloseTo(1)
    })

    it('asks the on-demand renderer to repaint, or the new sun never shows', () => {
        const { world, renderer } = makeWorld()

        applyBimLighting(world, DEFAULT_BIM_LIGHTING)

        expect(renderer.needsUpdate).toBe(true)
    })

    it('leaves the expensive shadow recompute to its own call', () => {
        const { world, scene } = makeWorld()

        applyBimLighting(world, DEFAULT_BIM_LIGHTING)

        expect(scene.updateShadows).not.toHaveBeenCalled()
    })

    it('is a no-op without a world', () => {
        expect(() => applyBimLighting(null, DEFAULT_BIM_LIGHTING)).not.toThrow()
    })
})

describe('readBimLighting', () => {
    it('round-trips what applyBimLighting wrote', () => {
        const { world } = makeWorld()
        const rig = { sunIntensity: 2, ambientIntensity: 0.3, azimuth: 217, elevation: 33, color: '#ffeecc', shadowResolution: 1024 }

        applyBimLighting(world, rig)
        const read = readBimLighting(world)

        expect(read.sunIntensity).toBe(2)
        expect(read.ambientIntensity).toBe(0.3)
        expect(read.azimuth).toBeCloseTo(217)
        expect(read.elevation).toBeCloseTo(33)
        expect(read.color).toBe('#ffeecc')
    })

    it('falls back to the default rig without a world', () => {
        expect(readBimLighting(null)).toEqual(DEFAULT_BIM_LIGHTING)
    })
})
