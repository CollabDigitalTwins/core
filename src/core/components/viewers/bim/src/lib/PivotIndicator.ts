// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'

import type * as OBC from '@thatopen/components'

const SEGMENTS = 16
const RINGS = 16
const SCREEN_FRACTION = 0.005
const COLOR = 0x73_ce_e2
const OPACITY = 0.8
const RENDER_ORDER = 999

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

/**
 * A small dot on the orbit target, drawn over everything and shown only while the camera is
 * moving, so the point the view turns about is visible during a drag.
 */
export class PivotIndicator {
    private readonly mesh: THREE.Mesh

    private controls: { addEventListener(t: string, h: () => void): void; removeEventListener(t: string, h: () => void): void } | null = null

    constructor(private components: OBC.Components) {
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, SEGMENTS, RINGS),
            new THREE.MeshBasicMaterial({
                color: COLOR,
                transparent: true,
                opacity: OPACITY,
                depthTest: false,
                toneMapped: false,
            }),
        )
        this.mesh.visible = false
        this.mesh.renderOrder = RENDER_ORDER
        this.mesh.castShadow = false
        this.mesh.receiveShadow = false
        this.mesh.frustumCulled = false
        // Sitting on the orbit centre puts it under the cursor, where it would eat every pick.
        this.mesh.raycast = () => undefined
    }

    /** Adds the sphere to the scene and starts following the camera. */
    attach() {
        const world = this.components.get(CurrentWorld).world
        const scene = world?.scene?.three
        const controls = world?.camera?.controls as PivotIndicator['controls']
        if (!scene || !controls || this.controls) return

        scene.add(this.mesh)
        this.controls = controls
        controls.addEventListener('control', this.onControl)
        controls.addEventListener('rest', this.onRest)
    }

    dispose() {
        this.controls?.removeEventListener('control', this.onControl)
        this.controls?.removeEventListener('rest', this.onRest)
        this.controls = null
        this.mesh.removeFromParent()
        this.mesh.geometry.dispose()
            ; (this.mesh.material as THREE.Material).dispose()
    }

    private readonly onControl = () => {
        this.mesh.visible = true
        this.track()
    }

    // `rest` fires after damping settles, so the sphere stays up for the whole coast-down.
    private readonly onRest = () => {
        this.mesh.visible = false
        this.requestFrame()
    }

    private track() {
        const world = this.components.get(CurrentWorld).world
        const controls = world?.camera?.controls as unknown as { getTarget(v: THREE.Vector3): void } | undefined
        const camera = world?.camera?.three as THREE.PerspectiveCamera | THREE.OrthographicCamera | undefined
        if (!controls || !camera) return

        controls.getTarget(this.mesh.position)
        this.mesh.scale.setScalar(this.radiusFor(camera))
        this.requestFrame()
    }

    // A fixed radius is a dot when zoomed out and swallows the model when zoomed in.
    private radiusFor(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
        const ortho = camera as THREE.OrthographicCamera
        if (typeof ortho.top === 'number' && typeof ortho.zoom === 'number' && ortho.isOrthographicCamera) {
            const height = (ortho.top - ortho.bottom) / (ortho.zoom || 1)
            return Math.max(height * SCREEN_FRACTION, 1e-4)
        }
        const distance = camera.position.distanceTo(this.mesh.position)
        return Math.max(distance * SCREEN_FRACTION, 1e-4)
    }

    private requestFrame() {
        const renderer = this.components.get(CurrentWorld).world?.renderer as OnDemandRenderer | undefined
        if (renderer) renderer.needsUpdate = true
    }
}
