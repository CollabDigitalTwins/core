// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { CurrentWorld } from '../../CurrentWorld'
import { ndcFromPointer } from '../../lib/scenePicker'

import { rayToPlaneY } from './planPointer'

import type { PlanPoint } from './planPointer'

export interface ClientPoint {
  clientX: number
  clientY: number
}

/** Where the pointer lands on the horizontal plane `y = planY`, or null when the camera looks along it. */
export function clientToPlan(camera: THREE.Camera, canvas: HTMLElement, pointer: ClientPoint, planY: number): PlanPoint | null {
  const ndc = ndcFromPointer(pointer.clientX, pointer.clientY, canvas.getBoundingClientRect())
  if (!ndc) return null
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  return rayToPlaneY(raycaster.ray.origin, raycaster.ray.direction, planY)
}

/** Drawn over the plan regardless of depth, so the 3D underlay never hides it. */
export function overlayLineMaterial(color: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true })
}

export function pixelDistance(a: ClientPoint, b: ClientPoint): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

/** The BIM renderer draws on demand, so scene-only changes have to ask for a frame. */
export function requestPlanRender(components: OBC.Components): void {
  try {
    const renderer = components.get(CurrentWorld).world?.renderer as { needsUpdate?: boolean } | undefined
    if (renderer) renderer.needsUpdate = true
    void components.get(OBC.FragmentsManager).core.update(true)
  } catch {
    // FragmentsManager not initialised yet.
  }
}
