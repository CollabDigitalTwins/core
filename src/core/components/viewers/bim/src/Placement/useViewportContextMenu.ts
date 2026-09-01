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

import { resolveViewportTarget } from './resolveViewportTarget'

import type { FragmentHit, ObjectHit, ViewportTarget } from './resolveViewportTarget'
import type { DbFile } from '../../../../../types/dbTypes'

export interface ViewportMenuState extends ViewportTarget {
  x: number
  y: number
}

/**
 * One `contextmenu` owner for the canvas: picks whatever placeable thing is under the cursor and
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

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      const { clientX, clientY } = event

      void resolveAtPointer(components, world, canvas, clientX, clientY, filesRef.current)
        .then((target) => setMenu(target ? { ...target, x: clientX, y: clientY } : null))
    }

    canvas.addEventListener('contextmenu', onContextMenu)
    return () => canvas.removeEventListener('contextmenu', onContextMenu)
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

// Loaded 3D objects are plain scene meshes, invisible to both the fragment and the cloud pick.
function pickObject(components: OBC.Components, raycaster: THREE.Raycaster): ObjectHit | null {
  try {
    let nearest: ObjectHit | null = null

    const consider = (name: string, object: THREE.Object3D) => {
      const hit = raycaster.intersectObject(object, true)[0]
      if (!hit) return
      if (!nearest || hit.distance < nearest.distance) nearest = { name, distance: hit.distance }
    }

    for (const { name, model } of components.get(ModelManager).getAllModels()) consider(name, model)
    for (const group of dxfGroups(components)) consider(group.name, group)

    return nearest
  }
  catch {
    return null
  }
}

// A DXF is a named group parented straight to the scene; its name is the file id.
function dxfGroups(components: OBC.Components): THREE.Object3D[] {
  const scene = components.get(CurrentWorld).world?.scene?.three
  if (!scene) return []
  return scene.children.filter((child) => /^\d+$/.test(child.name))
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
