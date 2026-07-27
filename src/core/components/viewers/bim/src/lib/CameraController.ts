// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'

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
}

/**
 * Camera lock used by drawing-based view tools (FloorplanTool,
 * ElevationsTool). `lock()` snapshots the current pose + projection +
 * control limits and disables rotation so only pan/zoom remain. `frame()`
 * positions the camera orthographically along an arbitrary view direction
 * (top-down for floorplans, side-on for elevations). `unlock()` restores
 * the snapshot.
 */
export class CameraController {
  private _saved: SavedControls | null = null
  private _savedPosition: THREE.Vector3 | null = null
  private _savedTarget: THREE.Vector3 | null = null
  private _savedProjection: 'Orthographic' | 'Perspective' | null = null

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
    controls.mouseButtons.left = ACTION_TRUCK
    controls.mouseButtons.middle = ACTION_NONE
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

    // Restore projection BEFORE pose so the orthographic frustum doesn't
    // fight the new perspective look-at.
    const camera = sourceWorld.camera as OBC.OrthoPerspectiveCamera
    if (this._savedProjection) {
      try {
        void camera.projection.set(this._savedProjection)
      } catch {
        // ignore
      }
    }

    controls.minPolarAngle = saved.minPolarAngle
    controls.maxPolarAngle = saved.maxPolarAngle
    controls.minAzimuthAngle = saved.minAzimuthAngle
    controls.maxAzimuthAngle = saved.maxAzimuthAngle
    Object.assign(controls.mouseButtons, saved.mouseButtons)
    Object.assign(controls.touches, saved.touches)

    if (this._savedPosition && this._savedTarget) {
      const p = this._savedPosition
      const t = this._savedTarget
      void controls.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, true)
    }

    this._reset()
  }

  /**
   * Frame an orthographic view of `target` looking along `viewDirection`.
   * The camera is placed at `target − viewDirection × span`.
   *
   * `viewDirection` is the direction the camera looks:
   *   (0, -1, 0) → top-down (floorplan)
   *   (0, 0, -1) → looking south (north elevation)
   *   (0, 0,  1) → looking north (south elevation)
   *   (-1, 0, 0) → looking west (east elevation)
   *   ( 1, 0, 0) → looking east (west elevation)
   */
  frame(target: THREE.Vector3, viewDirection: THREE.Vector3, span: number) {
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld?.camera?.controls) return
    const camera = sourceWorld.camera as OBC.OrthoPerspectiveCamera

    try {
      void camera.projection.set('Orthographic')
    } catch {
      // already ortho
    }

    const dir = viewDirection.clone().normalize()
    const camPos = target.clone().sub(dir.multiplyScalar(span))

    void sourceWorld.camera.controls.setLookAt(
      camPos.x,
      camPos.y,
      camPos.z,
      target.x,
      target.y,
      target.z,
      true,
    )
  }

  private _reset() {
    this._saved = null
    this._savedPosition = null
    this._savedTarget = null
    this._savedProjection = null
  }
}
