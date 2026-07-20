// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { CurrentWorld } from '../CurrentWorld'

import type * as THREE from 'three'

/**
 * Slot-keyed wrapper around `OBC.Clipper`. Each slot name maps to a single
 * clip plane; `set(slot, …)` replaces any prior plane in that slot, and
 * `remove(slot)` / `removeAll()` clean up. Used by drawing-based view
 * tools that need a section clip and possibly a lower clip.
 *
 * Best-effort: a missing Clipper component (e.g. SimpleBimViewer) makes
 * every method a no-op rather than throwing.
 */
export class ClipController {
  private _slots = new Map<string, any>()

  constructor(private components: OBC.Components) {}

  set(slot: string, normal: THREE.Vector3, point: THREE.Vector3) {
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld) return
    const clipper = this._clipper()
    if (!clipper?.createFromNormalAndCoplanarPoint) return

    this.remove(slot)

    const handle = clipper.createFromNormalAndCoplanarPoint(
      sourceWorld,
      normal,
      point,
    )
    this._slots.set(slot, handle)
    this._hidePlaneVisual(clipper, handle)
  }

  remove(slot: string) {
    const handle = this._slots.get(slot)
    if (!handle) return
    this._delete(handle)
    this._slots.delete(slot)
  }

  removeAll() {
    for (const slot of [...this._slots.keys()]) this.remove(slot)
  }

  has(slot: string): boolean {
    return this._slots.has(slot)
  }

  private _delete(handle: any) {
    const sourceWorld = this.components.get(CurrentWorld).world
    if (!sourceWorld) return
    const clipper = this._clipper()
    if (!clipper) return
    try {
      void clipper.delete(sourceWorld, handle)
    } catch (e) {
      console.warn('[ClipController] clipper.delete failed:', e)
    }
  }

  private _clipper(): any {
    try {
      return this.components.get(OBC.Clipper)
    } catch {
      return null
    }
  }

  private _hidePlaneVisual(clipper: any, handle: any) {
    try {
      // Some OBC versions return the plane object directly; others return an
      // id keyed in `clipper.list`. Cover both shapes.
      const plane =
        handle && typeof handle === 'object' && 'visible' in handle
          ? handle
          : clipper?.list?.get?.(handle)
      if (plane) plane.visible = false
    } catch {
      // best-effort
    }
  }
}
