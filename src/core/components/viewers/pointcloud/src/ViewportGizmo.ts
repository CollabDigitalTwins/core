// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewportGizmo as ThreeViewportGizmo } from 'three-viewport-gizmo'
import * as THREE from 'three'

// ⚠️⚠️⚠️ The gizmo will now only serve as a visual orientation indicator and won't respond to clicks.
export class ViewportGizmo {
  private _enabled = false
  private _animationId: number | null = null

  get enabled(): boolean {
    return this._enabled
  }

  set enabled(value: boolean) {
    this._enabled = value
    // Update pointer events on the gizmo DOM element
    const gizmoDom = (this.gizmo as any)?.domElement
    if (gizmoDom) {
      gizmoDom.style.pointerEvents = this._enabled ? 'auto' : 'none'
    }
  }

  private _labels = {
    top: 'TOP',
    right: 'RIGHT',
    bottom: 'BOTTOM',
    left: 'LEFT',
    front: 'FRONT',
    back: 'BACK'
  }

  setLabels(labels: {
    top: string
    right: string
    bottom: string
    left: string
    front: string
    back: string
  }) {
    this._labels = labels
    // If gizmo is already created, recreate it with new labels
    if (this.gizmo) {
      this.remove()
      this.add()
    }
  }

  private viewer: any | null = null
  private gizmo: ThreeViewportGizmo | null = null

  constructor(viewer: any) {
    this.viewer = viewer
  }

  add() {
    if (this.viewer && this.viewer.renderer && this.viewer.scene.getActiveCamera()) {
      const gizmoConfig = this.getGizmoConfig()
      const camera = this.viewer.scene.getActiveCamera()
      this.gizmo = new ThreeViewportGizmo(
        camera,
        this.viewer.renderer,
        gizmoConfig,
      )

      if (this.gizmo) {
        // Store references to event handlers for proper cleanup
        const startHandler = () => {
          if (this.viewer?.controls) {
            this.viewer.controls.enabled = false
          }
        }

        const endHandler = () => {
          if (this.viewer?.controls) {
            this.viewer.controls.enabled = true
          }
        }

        const changeHandler = () => {
          if (this.viewer?.controls && camera) {
            const position = camera.position.toArray() as [number, number, number]
            this.viewer.controls.setPosition?.(...position)
          }
        }
        // Store handlers on the gizmo for cleanup
        ;(this.gizmo as any)._startHandler = startHandler
        ;(this.gizmo as any)._endHandler = endHandler
        ;(this.gizmo as any)._changeHandler = changeHandler

        // Add event listeners
        ;(this.gizmo as any).addEventListener('start', startHandler)
        ;(this.gizmo as any).addEventListener('end', endHandler)
        ;(this.gizmo as any).addEventListener('change', changeHandler)

        // Set initial target
        if (this.viewer.scene.view.position) {
          this.gizmo.target.copy(this.viewer.scene.view.position)
        }

        // Set initial pointer events based on enabled state
        const gizmoDom = (this.gizmo as any).domElement
        if (gizmoDom) {
          // Disable clicking - only show as visual indicator
          gizmoDom.style.pointerEvents = 'none'
          }

        // Start animation loop
        this.startAnimationLoop()
      } else {
        console.error('[ViewportGizmo] Gizmo creation failed');
      }
    } else {
      console.error('[ViewportGizmo] Cannot add gizmo - missing viewer, renderer, or camera');
    }
  }

  private startAnimationLoop() {
    const animate = () => {
      if (this.gizmo && this._enabled && this.viewer) {
        // Update target from viewer
        const target = this.viewer.scene?.view?.position
        if (target) {
          this.gizmo.target.copy(target)
        }

        // Update and render the gizmo
        this.gizmo.update()
        this.gizmo.render()
      }

      this._animationId = requestAnimationFrame(animate)
    }

    animate()
  }

  private stopAnimationLoop() {
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId)
      this._animationId = null
    }
  }

  remove() {
    // Stop animation loop
    this.stopAnimationLoop()

    if (this.gizmo) {
      // Store references to the actual event listener functions for proper cleanup
      const gizmoStartHandler = (this.gizmo as any)._startHandler
      const gizmoEndHandler = (this.gizmo as any)._endHandler
      const gizmoChangeHandler = (this.gizmo as any)._changeHandler

      // Remove all event listeners if they exist
      if (gizmoStartHandler) {
        ;(this.gizmo as any).removeEventListener('start', gizmoStartHandler)
      }
      if (gizmoEndHandler) {
        ;(this.gizmo as any).removeEventListener('end', gizmoEndHandler)
      }
      if (gizmoChangeHandler) {
        ;(this.gizmo as any).removeEventListener('change', gizmoChangeHandler)
      }

      // Remove the DOM element from the document
      const gizmoElement = (this.gizmo as any).domElement
      if (gizmoElement && gizmoElement.parentNode) {
        gizmoElement.remove()
      }

      // Dispose of the gizmo
      if (this.gizmo.dispose) {
        this.gizmo.dispose()
      }

      // Remove all references
      this.gizmo = null
    }
  }

  dispose() {
    // Use remove for cleanup
    this.remove()
  }

  render() {
    if (this.gizmo && this.enabled) {
      this.gizmo.render()
    }
  }

  update() {
    if (this.gizmo && this.enabled) {
      this.gizmo.update()
    }
  }

  private getGizmoConfig() {
    return {
      size: 75,
      placement: 'top-right' as const,
      type: 'cube' as const,
      top: { label: this._labels.top },
      right: { label: this._labels.right },
      bottom: { label: this._labels.bottom },
      left: { label: this._labels.left },
      front: { label: this._labels.front },
      back: { label: this._labels.back },
    }
  }
}
