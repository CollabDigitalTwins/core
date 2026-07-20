// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import type * as OBC from '@thatopen/components'
import { TransformControls } from 'three/examples/jsm/Addons.js'

export class GizmoController {
  private _controls: TransformControls | null = null
  private _helper: THREE.Object3D | null = null
  private _keydownHandler: ((event: KeyboardEvent) => void) | null = null
  private _world: OBC.World
  private _object: THREE.Object3D | null = null
  private _originalPosition = new THREE.Vector3()
  private _originalRotation = new THREE.Euler()
  private _originalScale = new THREE.Vector3()
  onAccept?: () => void
  onCancel?: () => void

  constructor(world: OBC.World) {
    this._world = world
  }

  attach(object: THREE.Object3D): boolean {
    if (!this._world?.camera?.three || !this._world?.renderer?.three.domElement) {
      console.warn('[GizmoController] World camera or renderer not available')
      return false
    }

    this.detach()

    // Snapshot original transform so ESC can restore it
    this._object = object
    this._originalPosition.copy(object.position)
    this._originalRotation.copy(object.rotation)
    this._originalScale.copy(object.scale)

    const controls = new TransformControls(
      this._world.camera.three,
      this._world.renderer.three.domElement,
    )
    controls.setMode('translate')
    controls.attach(object)

    // Freeze camera orbit while dragging
    controls.addEventListener('dragging-changed', (event: any) => {
      if (this._world?.camera?.controls) {
        this._world.camera.controls.enabled = !event.value
      }
    })

    // In Three.js r169+, TransformControls is no longer an Object3D.
    // Only the helper returned by getHelper() goes into the scene.
    const helper = controls.getHelper()
    this._world.scene.three.add(helper)

    this._controls = controls
    this._helper = helper

    // Keyboard shortcuts
    this._keydownHandler = (event: KeyboardEvent) => {
      if (!this._controls) return
      switch (event.key) {
        case 'g': case 'G': this._controls.setMode('translate'); break
        case 'r': case 'R': this._controls.setMode('rotate'); break
        case 's': case 'S': this._controls.setMode('scale'); break
        case 'Escape':
          this._revert()
          this.detach()
          this.onCancel?.()
          break
        case 'Enter':
          this.detach()
          this.onAccept?.()
          break
      }
    }
    document.addEventListener('keydown', this._keydownHandler)

    return true
  }

  detach(): void {
    if (this._helper) {
      this._world.scene.three.remove(this._helper)
      this._helper = null
    }
    if (this._controls) {
      this._controls.dispose()
      this._controls = null
    }
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler)
      this._keydownHandler = null
    }
    this._object = null
  }

  private _revert(): void {
    if (!this._object) return
    this._object.position.copy(this._originalPosition)
    this._object.rotation.copy(this._originalRotation)
    this._object.scale.copy(this._originalScale)
    this._object.updateMatrixWorld(true)
  }

  setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this._controls?.setMode(mode)
  }

  isAttached(): boolean {
    return this._controls !== null
  }

  dispose(): void {
    this.detach()
  }
}
