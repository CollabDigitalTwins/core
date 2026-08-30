// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { CurrentWorld } from './CurrentWorld'
import { modelBounds } from './lib/modelBounds'
import { ndcFromPointer } from './lib/scenePicker'
import { nearestSampleToTime, sampleNearestRay, sunPathPoints, sunPathSamples } from './lib/sunPath'
import { ShadowEnroller } from './ShadowEnroller'

import type { SunPathSample } from './lib/sunPath'

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

const DOME_FRACTION = 1.1
const MARKER_FRACTION = 0.0275
const TUBE_FRACTION = 0.003
const GRAB_RADIUS_PX = 20
const ARC_COLOR = 0xff9500
const MARKER_COLOR = 0xffe066

/**
 * Draws the sun's track for the chosen day at the chosen place, with a marker that can be
 * dragged along it to scrub the time of day.
 */
export class SunPath extends OBC.Component implements OBC.Disposable {
    static readonly uuid = '7d3c1f88-4b06-4d9e-9a52-1c0f7b6e2d31' as const

    readonly onDisposed = new OBC.Event()

    /** Minutes past local midnight, as the marker is dragged. */
    readonly onTimeChanged = new OBC.Event<number>()

    enabled = false

    private readonly group = new THREE.Group()

    private line: THREE.Mesh | null = null

    private marker: THREE.Mesh | null = null

    private samples: SunPathSample[] = []

    private points: THREE.Vector3[] = []

    private day = { isoDate: '', latitude: 0, longitude: 0, northOffset: 0 }

    private minutes = 0

    private dragging = false

    private canvas: HTMLCanvasElement | null = null

    constructor(components: OBC.Components) {
        super(components)
        components.add(SunPath.uuid, this)
        this.group.visible = false
    }

    setVisible(visible: boolean) {
        this.enabled = visible
        this.group.visible = visible
        if (visible) this.rebuild()
        this.requestFrame()
    }

    setDay(isoDate: string, latitude: number, longitude: number, northOffset = 0) {
        this.day = { isoDate, latitude, longitude, northOffset }
        if (this.enabled) this.rebuild()
    }

    setTime(minutes: number) {
        this.minutes = minutes
        this.placeMarker()
        this.requestFrame()
    }

    dispose() {
        this.unbind()
        this.clear()
        this.group.removeFromParent()
        this.onTimeChanged.reset()
        this.onDisposed.trigger()
        this.onDisposed.reset()
    }

    private get world() {
        return this.components.get(CurrentWorld).world
    }

    private rebuild() {
        const scene = this.world?.scene as OBC.ShadowedScene | undefined
        if (!scene || !this.day.isoDate) return

        this.clear()
        if (!this.group.parent) scene.three.add(this.group)

        // The arc sits on the model box; the scene graph under-reports streamed fragment tiles.
        const box = modelBounds(this.components)
        if (!box) return
        const centre = box.getCenter(new THREE.Vector3())
        const radius = box.getSize(new THREE.Vector3()).length() / 2

        this.samples = sunPathSamples(this.day.isoDate, this.day.latitude, this.day.longitude)
        this.points = sunPathPoints(this.samples, radius * DOME_FRACTION, centre, this.day.northOffset)
        if (this.points.length < 2) return

        const curve = new THREE.CatmullRomCurve3(this.points)
        this.line = new THREE.Mesh(
            new THREE.TubeGeometry(curve, this.points.length * 2, radius * TUBE_FRACTION, 8, false),
            new THREE.MeshBasicMaterial({ color: ARC_COLOR, depthTest: false, toneMapped: false }),
        )
        this.line.renderOrder = 998

        this.marker = new THREE.Mesh(
            new THREE.SphereGeometry(radius * MARKER_FRACTION, 20, 14),
            new THREE.MeshBasicMaterial({ color: MARKER_COLOR, depthTest: false, toneMapped: false }),
        )
        this.marker.renderOrder = 999

        this.group.add(this.line, this.marker)
        this.components.get(ShadowEnroller).excludeFromShadows(this.group)
        this.placeMarker()
        this.bind()
        this.requestFrame()
    }

    private placeMarker() {
        if (!this.marker || !this.points.length) return
        const sample = nearestSampleToTime(this.samples, this.minutes)
        const index = sample ? this.samples.indexOf(sample) : -1
        if (index >= 0) this.marker.position.copy(this.points[index])
    }

    private bind() {
        const canvas = (this.world?.renderer as OBC.BaseRenderer & { three: THREE.WebGLRenderer })
            ?.three?.domElement ?? null
        if (!canvas || canvas === this.canvas) return
        this.unbind()
        this.canvas = canvas
        canvas.addEventListener('pointerdown', this.onPointerDown)
        window.addEventListener('pointermove', this.onPointerMove)
        window.addEventListener('pointerup', this.onPointerUp)
    }

    private unbind() {
        this.canvas?.removeEventListener('pointerdown', this.onPointerDown)
        window.removeEventListener('pointermove', this.onPointerMove)
        window.removeEventListener('pointerup', this.onPointerUp)
        this.canvas = null
    }

    private readonly onPointerDown = (event: PointerEvent) => {
        if (!this.enabled || !this.marker || !this.canvas) return
        if (!this.isOverMarker(event)) return

        this.dragging = true
        this.setControls(false)
        event.preventDefault()
        event.stopPropagation()
    }

    private readonly onPointerMove = (event: PointerEvent) => {
        if (!this.dragging) return
        const ray = this.rayFrom(event)
        const sample = ray && sampleNearestRay(this.samples, this.points, ray)
        if (!sample) return

        this.minutes = sample.minutes
        this.placeMarker()
        this.onTimeChanged.trigger(sample.minutes)
        this.requestFrame()
    }

    private readonly onPointerUp = () => {
        if (!this.dragging) return
        this.dragging = false
        this.setControls(true)
    }

    private isOverMarker(event: PointerEvent) {
        const camera = this.world?.camera.three as THREE.Camera | undefined
        if (!camera || !this.marker || !this.canvas) return false

        const rect = this.canvas.getBoundingClientRect()
        const projected = this.marker.position.clone().project(camera)
        const x = (projected.x + 1) / 2 * rect.width
        const y = (1 - projected.y) / 2 * rect.height
        return Math.hypot(x - (event.clientX - rect.left), y - (event.clientY - rect.top)) <= GRAB_RADIUS_PX
    }

    private rayFrom(event: PointerEvent) {
        const camera = this.world?.camera.three as THREE.Camera | undefined
        if (!camera || !this.canvas) return null

        const rect = this.canvas.getBoundingClientRect()
        const ndc = ndcFromPointer(event.clientX, event.clientY, rect)
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera)
        return raycaster.ray
    }

    private setControls(active: boolean) {
        const controls = (this.world?.camera as unknown as { controls?: { enabled: boolean } })?.controls
        if (controls) controls.enabled = active
    }

    private clear() {
        for (const child of [this.line, this.marker]) {
            if (!child) continue
            child.removeFromParent()
            child.geometry.dispose()
                ; (child.material as THREE.Material).dispose()
        }
        this.line = null
        this.marker = null
    }

    private requestFrame() {
        const renderer = this.world?.renderer as OnDemandRenderer | undefined
        if (renderer) renderer.needsUpdate = true
    }
}
