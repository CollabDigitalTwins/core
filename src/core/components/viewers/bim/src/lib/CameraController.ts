// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { CameraNavigation } from '../CameraNavigation'
import { CurrentWorld } from '../CurrentWorld'

import { pumpCameraTransition } from './cameraTransition'

import type * as OBC from '@thatopen/components'

// camera-controls ACTION constants (avoid importing the package directly).
const ACTION_NONE = 0
const ACTION_TRUCK = 2
const ACTION_ZOOM = 32
const ACTION_TOUCH_TRUCK = 128
const ACTION_TOUCH_ZOOM_TRUCK = 65536

interface SavedControls {
  minPolarAngle: number
  maxPolarAngle: number
  minAzimuthAngle: number
  maxAzimuthAngle: number
  mouseButtons: any
  touches: any
  draggingSmoothTime: number
  dollyToCursor: boolean
}

// Pans and wheel zooms land on the frame they happen in, so the plan stays pinned under the cursor like CAD.
const PLAN_DRAGGING_SMOOTH_TIME = 0

/**
 * Camera lock for drawing tools: `lock()` snapshots pose, projection and limits and leaves only pan/zoom,
 * `frame()` aims an orthographic view along a direction, `unlock()` restores the snapshot.
 */
export class CameraController {
  private _saved: SavedControls | null = null
  private _savedPosition: THREE.Vector3 | null = null
  private _savedTarget: THREE.Vector3 | null = null
  private _savedProjection: 'Orthographic' | 'Perspective' | null = null
  private _savedNavMode: string | null = null
  private _leftButtonPans = true

  constructor(private components: OBC.Components) {}

  /** Snapshot pose + control limits, then disable rotation actions
   *  (only pan + zoom remain). Idempotent — safe to call again while
   *  already locked. Pass `lockPolar` to also pin the polar angle (e.g. 0
   *  for top-down so even programmatic moves stay flat). */
  lock(lockPolar?: number) {
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld?.camera?.controls) return
    if (this._saved) return
    const controls = sourceWorld.camera.controls as any

    this._saved = {
      minPolarAngle: controls.minPolarAngle,
      maxPolarAngle: controls.maxPolarAngle,
      minAzimuthAngle: controls.minAzimuthAngle,
      maxAzimuthAngle: controls.maxAzimuthAngle,
      mouseButtons: { ...controls.mouseButtons },
      touches: { ...controls.touches },
      draggingSmoothTime: controls.draggingSmoothTime,
      dollyToCursor: controls.dollyToCursor,
    }
    this._savedPosition = new THREE.Vector3()
    this._savedTarget = new THREE.Vector3()
    controls.getPosition(this._savedPosition)
    controls.getTarget(this._savedTarget)

    const camera = sourceWorld.camera as OBC.OrthoPerspectiveCamera
    try {
      this._savedProjection = (camera.projection as any).current ?? 'Perspective'
    } catch {
      this._savedProjection = 'Perspective'
    }

    if (lockPolar !== undefined) {
      controls.minPolarAngle = lockPolar
      controls.maxPolarAngle = lockPolar
    }
    controls.draggingSmoothTime = PLAN_DRAGGING_SMOOTH_TIME
    controls.dollyToCursor = true
    this._leftButtonPans = true
    this._applyDrawingButtons(controls)
  }

  /** While a drawing tool takes left clicks, only the middle button pans. No-op unless locked. */
  setLeftButtonPans(pans: boolean) {
    const controls = this.components.get(CurrentWorld).world?.camera?.controls as any
    if (!this._saved || !controls) return
    this._leftButtonPans = pans
    this._applyDrawingButtons(controls)
  }

  // Middle-drag always pans, as in CAD; OBC's orthographic switch rebinds it to zoom, so this re-runs after it.
  private _applyDrawingButtons(controls: any) {
    controls.mouseButtons.left = this._leftButtonPans ? ACTION_TRUCK : ACTION_NONE
    controls.mouseButtons.middle = ACTION_TRUCK
    controls.mouseButtons.right = ACTION_NONE
    controls.mouseButtons.wheel = ACTION_ZOOM
    controls.touches.one = ACTION_TOUCH_TRUCK
    controls.touches.two = ACTION_TOUCH_ZOOM_TRUCK
    controls.touches.three = ACTION_TOUCH_TRUCK
  }

  /** Restore the snapshot taken in `lock`. No-op if `lock` was never called
   *  (defensive against double-deactivate). */
  unlock() {
    if (!this._saved) return
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld?.camera?.controls) {
      this._reset()
      return
    }
    const controls = sourceWorld.camera.controls as any
    const saved = this._saved

    // Projection goes back before pose, or the orthographic frustum fights the perspective look-at.
    const camera = sourceWorld.camera as OBC.OrthoPerspectiveCamera
    // First Person refuses to run under an orthographic lens, so the mode can only go back after it.
    if (this._savedProjection) {
      try {
        void Promise.resolve(camera.projection.set(this._savedProjection))
          .then(() => this._restoreNavMode(camera))
          .catch(() => undefined)
      } catch {
        this._restoreNavMode(camera)
      }
    } else {
      this._restoreNavMode(camera)
    }

    controls.minPolarAngle = saved.minPolarAngle
    controls.maxPolarAngle = saved.maxPolarAngle
    controls.minAzimuthAngle = saved.minAzimuthAngle
    controls.maxAzimuthAngle = saved.maxAzimuthAngle
    Object.assign(controls.mouseButtons, saved.mouseButtons)
    Object.assign(controls.touches, saved.touches)
    controls.draggingSmoothTime = saved.draggingSmoothTime
    controls.dollyToCursor = saved.dollyToCursor

    if (this._savedPosition && this._savedTarget) {
      const p = this._savedPosition
      const t = this._savedTarget
      void pumpCameraTransition(this.components, controls.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, true))
    }

    this._reset()
  }

  /** Orthographic view of `target` from `span` back along `viewDirection`, e.g. (0, -1, 0) for a plan. */
  frame(target: THREE.Vector3, viewDirection: THREE.Vector3, span: number) {
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld?.camera?.controls) return
    const camera = sourceWorld.camera as OBC.OrthoPerspectiveCamera

    this._forceOrthographic(camera)
    if (this._saved) this._applyDrawingButtons(sourceWorld.camera.controls)

    const dir = viewDirection.clone().normalize()
    const camPos = target.clone().sub(dir.multiplyScalar(span))

    void pumpCameraTransition(this.components, sourceWorld.camera.controls.setLookAt(
      camPos.x,
      camPos.y,
      camPos.z,
      target.x,
      target.y,
      target.z,
      true,
    ))
  }

  // OBC refuses an orthographic switch silently, leaving a perspective plan the model cannot line up under.
  private _forceOrthographic(camera: OBC.OrthoPerspectiveCamera) {
    if (this._isOrtho(camera)) return
    this._trySetOrtho(camera)
    if (this._isOrtho(camera)) return

    // First Person and an orthographic lens each refuse the other, so the mode moves first — via its owner, or its walk loop survives.
    const navigation = this._navigation()
    if (navigation && navigation.mode !== 'Orbit') {
      this._savedNavMode = navigation.mode
      navigation.setMode('Orbit')
      this._trySetOrtho(camera)
    } else if (!navigation && (camera as any).mode?.id === 'FirstPerson') {
      this._savedNavMode = 'FirstPerson'
      try { (camera as any).set('Orbit') } catch { /* mode not registered on this camera */ }
      this._trySetOrtho(camera)
    }
    if (this._isOrtho(camera)) return

    console.warn('[CameraController] Could not switch to an orthographic projection; the drawing view will not line up with the model.')
  }

  private _isOrtho(camera: OBC.OrthoPerspectiveCamera) {
    return (camera as any).projection?.current === 'Orthographic'
  }

  // `set` resolves asynchronously but applies the orthographic swap before it returns.
  private _trySetOrtho(camera: OBC.OrthoPerspectiveCamera) {
    try { void (camera as any).projection.set('Orthographic') } catch { /* no world or renderer yet */ }
  }

  // Not every host registers it — SimpleBimViewer has no navigation component.
  private _navigation(): { mode: string; setMode: (mode: any) => void } | null {
    try {
      const navigation = this.components.get(CameraNavigation) as any
      return typeof navigation?.setMode === 'function' ? navigation : null
    } catch { return null }
  }

  private _restoreNavMode(camera: OBC.OrthoPerspectiveCamera) {
    const mode = this._savedNavMode
    if (!mode) return
    this._savedNavMode = null

    const navigation = this._navigation()
    if (navigation) { navigation.setMode(mode); return }
    try { (camera as any).set(mode) } catch { /* mode no longer registered */ }
  }

  private _reset() {
    this._saved = null
    this._savedPosition = null
    this._savedTarget = null
    this._savedProjection = null
  }
}
