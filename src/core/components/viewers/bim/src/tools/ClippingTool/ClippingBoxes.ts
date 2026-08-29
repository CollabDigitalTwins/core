// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import { CurrentWorld } from '../../CurrentWorld'
import { ndcFromPointer } from '../../lib/scenePicker'

import { boxClipPlanes, CLIP_BOX_FACES, fittedBox, handleCentre, helperShellSize, moveFace } from './clipBox'
import { CUT_STYLE, ensureCutStyle } from './cutStyle'

import type { ClipBoxFace } from './clipBox'

const HELPER_NAME = 'clip-box-helper'

/** Handle size as a fraction of the box's shortest side, so it stays grabbable at any scale. */
const HANDLE_SCALE = 0.06

const HANDLE_MIN_SIZE = 0.15

const BOX_COLOUR = 0x2563eb

/** Meshes the box draws for itself, kept out of the fit so it cannot chase its own bounds. */
interface BoxVisual {
  root: THREE.Group
  shell: THREE.LineSegments
  handles: Map<THREE.Object3D, ClipBoxFace>
}

/** A six-plane section box over the BIM scene, independent of {@link ClippingPlanes} — both write
 *  to the renderer's plane list and every active cut applies. Six inward planes rather than a
 *  shader box because three's clipping is already an intersection. */
export class ClippingBoxes extends OBC.Component implements OBC.Disposable {
  static readonly uuid = 'c02f7a95-8b41-4de3-9a6c-24f1b8e07d3a' as const

  enabled = true

  /** {@link OBC.Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event<string>()

  readonly onChanged = new OBC.Event<THREE.Box3 | null>()

  private _bounds: THREE.Box3 | null = null
  /** Stable instances, rewritten in place — the renderer, the styler and the cuts all hold them. */
  private _planes: THREE.Plane[] = []
  private _cuts: OBF.ClipEdges[] = []
  private _visual: BoxVisual | null = null
  private _setupWorld: OBC.World | null = null
  private _dragging: { face: ClipBoxFace; plane: THREE.Plane } | null = null
  private readonly _raycaster = new THREE.Raycaster()

  constructor(components: OBC.Components) {
    super(components)
    components.add(ClippingBoxes.uuid, this)
  }

  get active(): boolean {
    return this._bounds !== null
  }

  get bounds(): THREE.Box3 | null {
    return this._bounds?.clone() ?? null
  }

  /** Idempotent per world; safe to call from an effect. */
  setup(): void {
    const world = this.world
    if (!world || this._setupWorld === world) return
    this._setupWorld = world
    this.attachListeners(world)
  }

  /** Turns the box on around the current model, or off. Returns the state it settled in. */
  toggle(): boolean {
    if (this.active) {
      this.clear()
      return false
    }
    this.fitToScene()
    return this.active
  }

  fitToScene(): void {
    this.setBounds(fittedBox(this.sceneBounds()))
  }

  setBounds(bounds: THREE.Box3): void {
    this._bounds = bounds.clone()
    this.applyPlanes()
    this.syncVisual()
    this.onChanged.trigger(this.bounds)
  }

  /** Drags one face to `target`, the pure part of the pointer interaction. */
  dragFaceTo(face: ClipBoxFace, target: THREE.Vector3): void {
    if (!this._bounds) return
    this.setBounds(moveFace(this._bounds, face, target))
  }

  clear(): void {
    this.removePlanes()
    this.clearVisual()
    this._bounds = null
    this._dragging = null
    this.onChanged.trigger(null)
  }

  dispose(): void {
    try {
      this.clear()
      this.detachListeners()
    } catch (error) {
      console.warn('ClippingBoxes: teardown was incomplete', error)
    }

    this._setupWorld = null
    this.enabled = false
    this.onChanged.reset()
    this.onDisposed.trigger(ClippingBoxes.uuid)
    this.onDisposed.reset()
  }

  private get world(): OBC.World | null {
    return this.components.get(CurrentWorld).world
  }

  /** Everything in the scene except the box's own helper, which would grow the fit each time. */
  private sceneBounds(): THREE.Box3 {
    const scene = this.world?.scene.three
    const bounds = new THREE.Box3()
    if (!scene) return bounds

    for (const child of scene.children) {
      if (child.name === HELPER_NAME || !child.visible) continue
      bounds.union(new THREE.Box3().setFromObject(child))
    }
    return bounds
  }

  private applyPlanes(): void {
    const renderer = this.world?.renderer
    if (!renderer || !this._bounds) return

    const wanted = boxClipPlanes(this._bounds)

    if (this._planes.length === 0) {
      this._planes = wanted
      for (const plane of this._planes) renderer.setPlane(true, plane)
      this.styleCuts()
    } else {
      this._planes.forEach((plane, index) => plane.copy(wanted[index]))
    }

    renderer.updateClippingPlanes()
    for (const cut of this._cuts) void cut.update()
  }

  /** The black cap the section planes already draw, so a boxed model reads the same way. */
  private styleCuts(): void {
    const world = this.world
    if (!world) return

    const styler = this.components.get(OBF.ClipStyler)
    styler.world = world
    ensureCutStyle(styler)

    for (const plane of this._planes) {
      const cut = styler.create(plane, { items: { All: { style: CUT_STYLE } } })
      // The setter is what adds the cap to the scene; ClipEdges start hidden.
      cut.visible = true
      this._cuts.push(cut)
    }
  }

  private removePlanes(): void {
    for (const cut of this._cuts) cut.dispose()
    this._cuts = []

    const renderer = this.world?.renderer
    if (!renderer || this._planes.length === 0) return

    for (const plane of this._planes) renderer.setPlane(false, plane)
    this._planes = []
    renderer.updateClippingPlanes()
  }

  /** Builds the helper on first use, then only moves it — a face drag must not rebuild geometry. */
  private syncVisual(): void {
    const scene = this.world?.scene.three
    if (!scene || !this._bounds) return

    const visual = this._visual ?? this.buildVisual(scene)
    const shellSize = helperShellSize(this._bounds)

    visual.shell.position.copy(this._bounds.getCenter(new THREE.Vector3()))
    visual.shell.scale.copy(shellSize)

    const handleSize = Math.max(Math.min(shellSize.x, shellSize.y, shellSize.z) * HANDLE_SCALE, HANDLE_MIN_SIZE)
    for (const [handle, face] of visual.handles) {
      handle.position.copy(handleCentre(this._bounds, face, handleSize))
      handle.scale.setScalar(handleSize)
    }
  }

  private buildVisual(scene: THREE.Object3D): BoxVisual {
    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: BOX_COLOUR }),
    )

    const root = new THREE.Group()
    root.name = HELPER_NAME
    root.add(shell)

    const handles = new Map<THREE.Object3D, ClipBoxFace>()
    for (const face of CLIP_BOX_FACES) {
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: BOX_COLOUR, depthTest: false, transparent: true, opacity: 0.9 }),
      )
      handle.renderOrder = 10
      root.add(handle)
      handles.set(handle, face)
    }

    scene.add(root)

    const visual = { root, shell, handles }
    this._visual = visual
    return visual
  }

  private clearVisual(): void {
    const visual = this._visual
    if (!visual) return

    visual.root.removeFromParent()
    visual.root.traverse((child) => {
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.Material | undefined
      material?.dispose()
    })
    this._visual = null
  }

  private attachListeners(world: OBC.World): void {
    const target = world.renderer?.three.domElement
    if (!target) return

    target.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
  }

  private detachListeners(): void {
    const target = this._setupWorld?.renderer?.three.domElement
    target?.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    const visual = this._visual
    const camera = this.pointerCamera(event)
    if (!visual || !camera) return

    const hit = this._raycaster.intersectObjects([...visual.handles.keys()], false)[0]
    const face = hit && visual.handles.get(hit.object)
    if (!face) return

    // The drag plane faces the camera through the handle, so the cursor tracks it at any angle.
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate()
    this._dragging = { face, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point) }

    this.setCameraControls(false)
    event.preventDefault()
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const dragging = this._dragging
    if (!dragging || !this.pointerCamera(event)) return

    const target = this._raycaster.ray.intersectPlane(dragging.plane, new THREE.Vector3())
    if (!target) return

    this.dragFaceTo(dragging.face, target)
  }

  private readonly onPointerUp = () => {
    if (!this._dragging) return
    this._dragging = null
    this.setCameraControls(true)
  }

  /** Points the shared raycaster at the cursor and hands back the camera it used. */
  private pointerCamera(event: PointerEvent): THREE.Camera | null {
    const world = this.world
    const canvas = world?.renderer?.three.domElement
    const camera = world?.camera.three
    if (!canvas || !camera) return null

    const ndc = ndcFromPointer(event.clientX, event.clientY, canvas.getBoundingClientRect())
    if (!ndc) return null

    this._raycaster.setFromCamera(ndc, camera)
    return camera
  }

  private setCameraControls(enabled: boolean): void {
    const controls = (this.world?.camera as unknown as { controls?: { enabled: boolean } })?.controls
    if (controls) controls.enabled = enabled
  }
}
