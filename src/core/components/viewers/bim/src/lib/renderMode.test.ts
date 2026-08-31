// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBF from '@thatopen/components-front'
import { describe, expect, it, vi } from 'vitest'

import { applyRenderMode, enablePostproduction, readRenderMode } from './renderMode'

import type * as OBC from '@thatopen/components'

function makeWorld(options: { postproductionThrows?: boolean } = {}) {
    const postproduction = { enabled: false, style: OBF.PostproductionAspect.COLOR }
    const light = { shadow: { needsUpdate: false } }
    const scene = {
        shadowsEnabled: true,
        updateShadows: vi.fn().mockResolvedValue(undefined),
        directionalLights: new Map([['a', light]]),
    }
    const renderer = {
        three: { shadowMap: { enabled: false } },
        turnOffOnManualMode: true,
        get postproduction() {
            if (options.postproductionThrows) throw new Error('Renderer not initialized yet with a world!')
            return postproduction
        },
    }
    return { world: { scene, renderer } as unknown as OBC.World, scene, renderer, postproduction, light }
}

describe('applyRenderMode', () => {
    it('turns shadows and the ambient-occlusion style on together', () => {
        const { world, scene, renderer, postproduction } = makeWorld()
        scene.shadowsEnabled = false

        applyRenderMode(world, 'Shadowed')

        expect(postproduction.style).toBe(OBF.PostproductionAspect.COLOR_SHADOWS)
        expect(scene.shadowsEnabled).toBe(true)
        expect(renderer.three.shadowMap.enabled).toBe(true)
    })

    it('turns them off together', () => {
        const { world, scene, renderer, postproduction } = makeWorld()

        applyRenderMode(world, 'Basic')

        expect(postproduction.style).toBe(OBF.PostproductionAspect.COLOR)
        expect(scene.shadowsEnabled).toBe(false)
        expect(renderer.three.shadowMap.enabled).toBe(false)
    })

    it('takes the composer out of the picture for Basic, so colours are untouched', () => {
        const { world, postproduction, renderer } = makeWorld()
        postproduction.enabled = true

        applyRenderMode(world, 'Basic')

        expect(postproduction.enabled).toBe(false)
        // Without this the renderer restores `enabled` from its own flag on the next draw.
        expect(renderer.turnOffOnManualMode).toBe(false)
    })

    it('puts the composer back for Shadowed', () => {
        const { world, postproduction, renderer } = makeWorld()

        applyRenderMode(world, 'Shadowed')

        expect(postproduction.enabled).toBe(true)
        expect(renderer.turnOffOnManualMode).toBe(true)
    })

    it('still applies the scene and renderer state when the composer is unavailable', () => {
        const { world, scene, renderer } = makeWorld({ postproductionThrows: true })

        applyRenderMode(world, 'Basic')

        expect(scene.shadowsEnabled).toBe(false)
        expect(renderer.three.shadowMap.enabled).toBe(false)
    })

    it('marks the shadow map stale, so the caller can re-place the sun', () => {
        const { world, light } = makeWorld()

        applyRenderMode(world, 'Shadowed')

        expect(light.shadow.needsUpdate).toBe(true)
    })

    it('is a no-op without a world', () => {
        expect(() => applyRenderMode(null, 'Shadowed')).not.toThrow()
    })
})

describe('enablePostproduction', () => {
    it('turns the composer on without choosing a style', () => {
        const { world, postproduction } = makeWorld()

        enablePostproduction(world)

        expect(postproduction.enabled).toBe(true)
        expect(postproduction.style).toBe(OBF.PostproductionAspect.COLOR)
    })

    it('survives a renderer that is not bound to a world yet', () => {
        const { world } = makeWorld({ postproductionThrows: true })

        expect(() => enablePostproduction(world)).not.toThrow()
    })
})

describe('readRenderMode', () => {
    it('reports the mode the scene is actually in', () => {
        const { world, scene } = makeWorld()

        expect(readRenderMode(world)).toBe('Shadowed')
        scene.shadowsEnabled = false
        expect(readRenderMode(world)).toBe('Basic')
    })

    it('falls back to Shadowed without a world', () => {
        expect(readRenderMode(null)).toBe('Shadowed')
    })
})
