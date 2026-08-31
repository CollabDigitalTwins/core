// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { CurrentWorld } from './CurrentWorld'
import { cameraLimitsFor } from './lib/cameraLimits'
import { modelBounds } from './lib/modelBounds'

import type { CameraLimits as Limits } from './lib/cameraLimits'

const APPLY_DELAY_MS = 250

interface DollyControls {
    minDistance: number
    maxDistance: number
    dollyToCursor: boolean
}

/**
 * Scales the camera's dolly and clipping limits to whatever is loaded, so the model cannot be
 * lost past the far plane and zooming in never stalls against a shrinking dolly step.
 */
export class CameraLimits extends OBC.Component implements OBC.Disposable {
    static readonly uuid = '2b6f0ac1-91cd-4d0e-8f77-4c8b1e5a9d02' as const

    readonly onDisposed = new OBC.Event()

    enabled = true

    private handle: ReturnType<typeof setTimeout> | null = null

    constructor(components: OBC.Components) {
        super(components)
        components.add(CameraLimits.uuid, this)

        const fragments = components.get(OBC.FragmentsManager)
        fragments.list.onItemSet.add(this.schedule)
        fragments.list.onItemDeleted.add(this.schedule)
    }

    /** Recomputes from the current model bounds. Safe to call before anything has loaded. */
    apply() {
        if (!this.enabled) return
        const world = this.components.get(CurrentWorld).world
        const camera = world?.camera as OBC.OrthoPerspectiveCamera | undefined
        if (!camera) return

        const bounds = modelBounds(this.components)
        const radius = bounds ? bounds.getSize(new THREE.Vector3()).length() / 2 : null
        const limits = cameraLimitsFor(radius)

        this.applyToControls(camera, limits)
        this.applyToLens(camera, limits)
    }

    dispose() {
        if (this.handle) clearTimeout(this.handle)
        this.handle = null
        const fragments = this.components.get(OBC.FragmentsManager)
        fragments.list.onItemSet.remove(this.schedule)
        fragments.list.onItemDeleted.remove(this.schedule)
        this.onDisposed.trigger()
        this.onDisposed.reset()
    }

    private readonly schedule = () => {
        if (this.handle) clearTimeout(this.handle)
        this.handle = setTimeout(() => {
            this.handle = null
            this.apply()
        }, APPLY_DELAY_MS)
    }

    private applyToControls(camera: OBC.OrthoPerspectiveCamera, limits: Limits) {
        const controls = camera.controls as unknown as DollyControls | undefined
        if (!controls) return

        controls.minDistance = limits.minDistance
        controls.maxDistance = limits.maxDistance
        // Re-asserted, not trusted: OBC sets it once at construction and this re-runs per load.
        controls.dollyToCursor = true
    }

    private applyToLens(camera: OBC.OrthoPerspectiveCamera, limits: Limits) {
        for (const lens of this.lensesOf(camera)) {
            lens.near = limits.near
            lens.far = limits.far
            lens.updateProjectionMatrix()
        }
    }

    // Both projections are kept alive and swapped, so limits have to land on each of them.
    private lensesOf(camera: OBC.OrthoPerspectiveCamera) {
        const candidates = [
            camera.three,
            (camera as unknown as { threePersp?: THREE.Camera }).threePersp,
            (camera as unknown as { threeOrtho?: THREE.Camera }).threeOrtho,
        ]
        const lenses: (THREE.PerspectiveCamera | THREE.OrthographicCamera)[] = []
        for (const candidate of candidates) {
            const lens = candidate as THREE.PerspectiveCamera | THREE.OrthographicCamera | undefined
            if (lens && typeof lens.updateProjectionMatrix === 'function' && !lenses.includes(lens)) {
                lenses.push(lens)
            }
        }
        return lenses
    }
}
