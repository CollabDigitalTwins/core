// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBF from '@thatopen/components-front'

import type * as OBC from '@thatopen/components'
import type * as THREE from 'three'


export type RenderModeName = 'Shadowed' | 'Basic'

type OnDemandRenderer = OBF.PostproductionRenderer & { needsUpdate: boolean }

interface ShadowedWorld {
    scene: OBC.ShadowedScene
    renderer: OnDemandRenderer
}

function asShadowedWorld(world: OBC.World | null | undefined): ShadowedWorld | null {
    const scene = world?.scene as OBC.ShadowedScene | undefined
    const renderer = world?.renderer as OnDemandRenderer | undefined
    if (!scene || !renderer) return null
    if (!('shadowsEnabled' in scene) || !('postproduction' in renderer)) return null
    return { scene, renderer }
}

// The getter throws until the renderer has been bound to a world, which is not observable otherwise.
function postproductionOf(renderer: OBF.PostproductionRenderer) {
    try {
        return renderer.postproduction
    } catch {
        return null
    }
}

/** Turns the effect composer on. Style, and therefore what it draws, is owned by `applyRenderMode`. */
export function enablePostproduction(world: OBC.World | null | undefined) {
    const target = asShadowedWorld(world)
    if (!target) return
    // Assigning `enabled` is what builds the composer and its passes; style is dropped before that.
    const postproduction = postproductionOf(target.renderer)
    if (!postproduction) return
    postproduction.enabled = true
    postproduction.excludedObjectsEnabled = true
}

/** Keeps a material out of the effect composer, so helpers do not pick up ambient occlusion. */
export function excludeFromPostproduction(
    world: OBC.World | null | undefined,
    material: THREE.Material,
) {
    const target = asShadowedWorld(world)
    if (!target) return
    const postproduction = postproductionOf(target.renderer)
    postproduction?.excludedObjectsPass.addExcludedMaterial(material)
}

/** Applies a render mode end to end: composer style, scene shadows and the renderer's shadow map. */
export function applyRenderMode(world: OBC.World | null | undefined, mode: RenderModeName) {
    const target = asShadowedWorld(world)
    if (!target) return

    const shadowed = mode === 'Shadowed'
    const postproduction = postproductionOf(target.renderer)
    if (postproduction) {
        postproduction.style = shadowed
            ? OBF.PostproductionAspect.COLOR_SHADOWS
            : OBF.PostproductionAspect.COLOR
        // Manual-mode draws restore `enabled` from a private flag unless this is off first.
        target.renderer.turnOffOnManualMode = shadowed
        postproduction.enabled = shadowed
    }

    target.scene.shadowsEnabled = shadowed
    target.renderer.three.shadowMap.enabled = shadowed

    // Re-arming castShadow is not enough on its own; the caller re-places the sun afterwards.
    for (const [, light] of target.scene.directionalLights) light.shadow.needsUpdate = true

    // Draws are on demand: without this the switch only shows up once the user next moves the camera.
    target.renderer.needsUpdate = true
}

/** Reads the mode back off the renderer, so UI state starts reconciled instead of assumed. */
export function readRenderMode(world: OBC.World | null | undefined): RenderModeName {
    const target = asShadowedWorld(world)
    if (!target) return 'Shadowed'
    return target.scene.shadowsEnabled ? 'Shadowed' : 'Basic'
}
