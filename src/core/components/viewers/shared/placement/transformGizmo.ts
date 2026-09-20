// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { TransformControls } from 'three/examples/jsm/Addons.js'

import type { PlacementGizmo } from './placementCore'
import type { PlacementMode } from './placementTarget'

/** What a viewer must supply for the shared gizmo to draw and drag in its scene. */
export interface TransformGizmoHost {
  camera(): THREE.Camera | null
  domElement(): HTMLElement | null
  scene(): THREE.Object3D | null
  setDragging(dragging: boolean): void
  onAttached?(controls: TransformControls): void
}

export class TransformGizmo implements PlacementGizmo {
  private _controls: TransformControls | null = null
  private _helper: THREE.Object3D | null = null
  private _keydownHandler: ((event: KeyboardEvent) => void) | null = null
  private _host: TransformGizmoHost
  private _object: THREE.Object3D | null = null
  private _originalPosition = new THREE.Vector3()
  private _originalRotation = new THREE.Euler()
  private _originalScale = new THREE.Vector3()
  onAccept?: () => void
  onCancel?: () => void
  onChange?: () => void

  constructor(host: TransformGizmoHost) {
    this._host = host
  }

  attach(object: THREE.Object3D): boolean {
    const camera = this._host.camera()
    const domElement = this._host.domElement()
    const scene = this._host.scene()
    if (!camera || !domElement || !scene) {
      console.warn('[TransformGizmo] Camera, renderer or scene not available')
      return false
    }

    this.detach()

    this._object = object
    this._originalPosition.copy(object.position)
    this._originalRotation.copy(object.rotation)
    this._originalScale.copy(object.scale)

    const controls = new TransformControls(camera, domElement)
    controls.setMode('translate')
    controls.attach(object)

    controls.addEventListener('dragging-changed', (event: { value: boolean }) => {
      this._host.setDragging(Boolean(event.value))
    })

    controls.addEventListener('objectChange', () => { this.onChange?.() })

    // r169+: TransformControls is not an Object3D; only getHelper() goes into the scene.
    const helper = controls.getHelper()
    scene.add(helper)

    this._controls = controls
    this._helper = helper

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

    this._host.onAttached?.(controls)

    return true
  }

  detach(): void {
    const scene = this._host.scene()
    if (this._helper) {
      scene?.remove(this._helper)
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

  setMode(mode: PlacementMode): void {
    this._controls?.setMode(mode)
  }

  isAttached(): boolean {
    return this._controls !== null
  }

  dispose(): void {
    this.detach()
  }
}
