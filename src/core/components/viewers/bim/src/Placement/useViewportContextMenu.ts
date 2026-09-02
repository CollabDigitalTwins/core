'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as React from 'react'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import { ndcFromPointer, SCENE_PICK_WINDOW_PX } from '../lib/scenePicker'
import { ModelManager } from '../ModelManager'
import { BimPointClouds } from '../PointClouds'
import { BimSceneObjects } from '../SceneObjects'

import { RIGHT_BUTTON, beginPress, opensMenu, trackPress, withinViewport } from './contextMenuGesture'
import { pickSceneObject } from './pickSceneObject'
import { resolveViewportTarget } from './resolveViewportTarget'

import type { RightPress } from './contextMenuGesture'
import type { FragmentHit, ObjectHit, ViewportTarget } from './resolveViewportTarget'
import type { DbFile } from '../../../../../types/dbTypes'

export interface ViewportMenuState extends ViewportTarget {
  x: number
  y: number
  /** Only a loaded object knows whether it animates; no extension can say. */
  animated: boolean
}

/**
 * One right-button owner for the canvas: picks whatever placeable thing is under the cursor and
 * says where to draw its menu. There can only be one owner, or two menus open at once.
 */
export function useViewportContextMenu(
  components: OBC.Components | null,
  files: DbFile[],
): { menu: ViewportMenuState | null; close: () => void } {
  const [menu, setMenu] = React.useState<ViewportMenuState | null>(null)
  const close = React.useCallback(() => setMenu(null), [])

  const filesRef = React.useRef(files)
  React.useEffect(() => { filesRef.current = files }, [files])

  React.useEffect(() => {
    if (!components) return
    const world = components.get(CurrentWorld).world
    const canvas = world?.renderer?.three.domElement
    if (!world || !canvas) return

    // The right button also trucks the camera, so the menu waits for a press that never moved.
    let press: RightPress | null = null

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== RIGHT_BUTTON) return
      press = beginPress(event.clientX, event.clientY)
      setMenu(null)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (press) press = trackPress(press, event.clientX, event.clientY)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== RIGHT_BUTTON) return
      const finished = press
      press = null
      if (!opensMenu(finished)) return

      const { x, y } = finished as RightPress
      void resolveAtPointer(components, world, canvas, x, y, filesRef.current)
        .then((target) => setMenu(target
          ? { ...target, x, y, animated: isAnimated(components, target) }
          : null))
    }

    const onPointerCancel = () => { press = null }

    // Marker overlays sit above the canvas and are not its descendants, so a canvas listener misses them.
    const suppressNativeMenu = (event: MouseEvent) => {
      if (withinViewport(canvas.getBoundingClientRect(), event.clientX, event.clientY)) {
        event.preventDefault()
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('contextmenu', suppressNativeMenu, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('contextmenu', suppressNativeMenu, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [components])

  return { menu, close }
}

async function resolveAtPointer(
  components: OBC.Components,
  world: OBC.World,
  canvas: HTMLElement,
  clientX: number,
  clientY: number,
  files: DbFile[],
) {
  const camera = world.camera.three
  const ndc = ndcFromPointer(clientX, clientY, canvas.getBoundingClientRect())
  if (!ndc) return null

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)

  const cloud = pickCloud(components, raycaster.ray, camera)
  const object = pickObject(components, raycaster)
  const fragment = await nearestFragment(components, world, clientX, clientY)

  return resolveViewportTarget({ files, fragment, cloud, object })
}

// Loaded objects are plain scene meshes, invisible to both the fragment and the cloud pick.
function pickObject(components: OBC.Components, raycaster: THREE.Raycaster): ObjectHit | null {
  try {
    return pickSceneObject(components.get(BimSceneObjects).registry?.list() ?? [], raycaster)
  }
  catch {
    return null
  }
}

function isAnimated(components: OBC.Components, target: ViewportTarget): boolean {
  if (target.kind !== 'object') return false
  try {
    return components.get(ModelManager).getClips(String(target.file.id)).length > 0
  }
  catch {
    return false
  }
}

function pickCloud(components: OBC.Components, ray: THREE.Ray, camera: THREE.Camera) {
  try {
    return components.get(BimPointClouds).pickWithId(ray, camera, SCENE_PICK_WINDOW_PX)
  }
  catch {
    return null
  }
}

// Mirrors Highlighter._nearestHit: only a per-model raycast says which model was hit.
async function nearestFragment(
  components: OBC.Components,
  world: OBC.World,
  clientX: number,
  clientY: number,
): Promise<FragmentHit | null> {
  try {
    const fragments = components.get(OBC.FragmentsManager)
    const dom = world.renderer?.three.domElement
    if (!dom) return null

    const params = { camera: world.camera.three, mouse: new THREE.Vector2(clientX, clientY), dom }
    const hits = await Promise.all(
      [...fragments.list.entries()].map(async ([modelId, model]) => {
        const result = await model.raycast(params)
        return result ? { modelId, distance: result.distance as number } : null
      }),
    )

    let nearest: FragmentHit | null = null
    for (const hit of hits) {
      if (!hit) continue
      if (!nearest || hit.distance < nearest.distance) nearest = hit
    }
    return nearest
  }
  catch {
    return null
  }
}
