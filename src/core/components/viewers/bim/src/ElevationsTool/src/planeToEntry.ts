// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'

import type { ElevationDirection, ElevationEntry } from './types'
import type { ClippingPlaneInfo } from '../../tools/ClippingTool/ClippingPlanes'

/** Margin (m) added around the framed box and past its far side. */
const CUSTOM_VIEWPORT_PADDING = 1
const CUSTOM_DEPTH_MARGIN = 2

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const FALLBACK_UP = new THREE.Vector3(0, 0, -1)

const DIRECTION_VIEW_VECTOR: Record<ElevationDirection, THREE.Vector3> = {
  north: new THREE.Vector3(0, 0, -1),
  south: new THREE.Vector3(0, 0, 1),
  east: new THREE.Vector3(-1, 0, 0),
  west: new THREE.Vector3(1, 0, 0),
}

function nearestDirection(view: THREE.Vector3): ElevationDirection {
  let best: ElevationDirection = 'north'
  let bestDot = -Infinity
  for (const [direction, vector] of Object.entries(DIRECTION_VIEW_VECTOR)) {
    const dot = view.dot(vector)
    if (dot > bestDot) {
      bestDot = dot
      best = direction as ElevationDirection
    }
  }
  return best
}

function upFor(view: THREE.Vector3): THREE.Vector3 {
  const seed = Math.abs(view.dot(WORLD_UP)) > 0.999 ? FALLBACK_UP : WORLD_UP
  return seed.clone().addScaledVector(view, -seed.dot(view)).normalize()
}

function corners(box: THREE.Box3): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z))
    }
  }
  return out
}

/**
 * Turns a clipping plane into an unprojected elevation entry: its normal
 * becomes the view direction, its point the drawing plane, framed on the box.
 */
export function planeToEntry(
  plane: ClippingPlaneInfo,
  modelId: string,
  modelBox: THREE.Box3,
  label: string,
): ElevationEntry {
  const view = plane.normal.clone().normalize()
  const up = upFor(view)
  const right = view.clone().cross(up).normalize()
  const position = plane.point.clone()

  let left = Infinity
  let bottom = Infinity
  let rightEdge = -Infinity
  let top = -Infinity
  let depth = 0
  for (const corner of corners(modelBox)) {
    const offset = corner.sub(position)
    const x = offset.dot(right)
    const y = offset.dot(up)
    left = Math.min(left, x)
    rightEdge = Math.max(rightEdge, x)
    bottom = Math.min(bottom, y)
    top = Math.max(top, y)
    depth = Math.max(depth, offset.dot(view))
  }

  return {
    id: `${modelId}::custom::${plane.key}`,
    direction: nearestDirection(view),
    label,
    planeKey: plane.key,
    modelId,
    position,
    viewDirection: view,
    viewport: {
      left: left - CUSTOM_VIEWPORT_PADDING,
      right: rightEdge + CUSTOM_VIEWPORT_PADDING,
      top: top + CUSTOM_VIEWPORT_PADDING,
      bottom: bottom - CUSTOM_VIEWPORT_PADDING,
    },
    far: Math.max(depth, 0) + CUSTOM_DEPTH_MARGIN,
    modelBox: modelBox.clone(),
    drawing: null,
    projected: false,
    layers: [],
  }
}
