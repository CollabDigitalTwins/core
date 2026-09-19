// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { pickSceneObject } from '../Placement/pickSceneObject'
import { BimPointClouds } from '../PointClouds'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'

import { ndcFromPointer, SCENE_PICK_WINDOW_PX } from './scenePicker'

import type { CloudHit, FragmentHit, ObjectHit, SplatHit } from '../Placement/resolveViewportTarget'

export interface PointerHits {
  fragment: FragmentHit | null
  object: ObjectHit | null
  splat: SplatHit | null
  cloud: CloudHit | null
}

interface RaycastParams {
  camera: THREE.Camera
  mouse: THREE.Vector2
  dom: HTMLElement
}

type ModelList = Map<string, { raycast(params: RaycastParams): Promise<{ distance: number, localId: number } | null> }>

/** Everything under the cursor, each source failing independently. Null when the view cannot raycast. */
export async function pickAtPointer(
  components: OBC.Components,
  world: OBC.World,
  canvas: HTMLElement,
  clientX: number,
  clientY: number,
): Promise<PointerHits | null> {
  const camera = world.camera.three
  const ndc = ndcFromPointer(clientX, clientY, canvas.getBoundingClientRect())
  if (!ndc) return null

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)

  return {
    fragment: await pickFragment(components, world, clientX, clientY),
    object: pickObject(components, raycaster),
    splat: pickSplat(components, raycaster.ray, camera),
    cloud: pickCloud(components, raycaster.ray, camera),
  }
}

/** The nearest model hit, with its local id. Exported as the seam a test can drive without WebGL. */
export async function nearestFragmentHit(
  list: ModelList,
  params: RaycastParams,
): Promise<FragmentHit | null> {
  const hits = await Promise.all(
    [...list.entries()].map(async ([modelId, model]) => {
      const result = await model.raycast(params)
      return result ? { modelId, distance: result.distance, localId: result.localId } : null
    }),
  )

  let nearest: FragmentHit | null = null
  for (const hit of hits) {
    if (!hit) continue
    if (!nearest || hit.distance < nearest.distance) nearest = hit
  }
  return nearest
}

async function pickFragment(
  components: OBC.Components,
  world: OBC.World,
  clientX: number,
  clientY: number,
): Promise<FragmentHit | null> {
  try {
    const dom = world.renderer?.three.domElement
    if (!dom) return null
    const list = components.get(OBC.FragmentsManager).list as unknown as ModelList
    return await nearestFragmentHit(list, {
      camera: world.camera.three,
      mouse: new THREE.Vector2(clientX, clientY),
      dom,
    })
  }
  catch { return null }
}

function pickObject(components: OBC.Components, raycaster: THREE.Raycaster): ObjectHit | null {
  try {
    return pickSceneObject(components.get(BimSceneObjects).registry?.list() ?? [], raycaster)
  }
  catch { return null }
}

function pickSplat(components: OBC.Components, ray: THREE.Ray, camera: THREE.Camera): SplatHit | null {
  try {
    return components.get(BimSplats).pickWithId(ray, camera, SCENE_PICK_WINDOW_PX)
  }
  catch { return null }
}

function pickCloud(components: OBC.Components, ray: THREE.Ray, camera: THREE.Camera): CloudHit | null {
  try {
    return components.get(BimPointClouds).pickWithId(ray, camera, SCENE_PICK_WINDOW_PX)
  }
  catch { return null }
}
