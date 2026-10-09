// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { footprintFor, worldTriangles } from '../../lib/spaceOverlay'

import { outlineFromTriangles, trianglesArea } from './footprintOutline'

import type { PlanPoint } from './planPointer'
import type { ModelIdMap } from '../../lib/bimTree'
import type * as THREE from 'three'

/** An element's floor outline in world plan coordinates, read from its lowest flat face. */
export interface PlanFootprint {
  modelId: string
  localId: number
  outline: PlanPoint[]
  /** Square metres. */
  area: number
  centroid: PlanPoint
  /** World height of the footprint, for matching it to a storey. */
  elevation: number
}

const identity = (point: THREE.Vector3) => point

export async function readPlanFootprints(
  components: OBC.Components,
  items: ModelIdMap,
): Promise<PlanFootprint[]> {
  const fragments = components.get(OBC.FragmentsManager)
  const results = await Promise.all(
    Object.entries(items).map(([modelId, ids]) => readModelFootprints(fragments, modelId, [...ids])),
  )
  return results.flat()
}

async function readModelFootprints(
  fragments: OBC.FragmentsManager,
  modelId: string,
  localIds: number[],
): Promise<PlanFootprint[]> {
  const model = fragments.list.get(modelId)
  if (!model || localIds.length === 0) return []

  const [geometries, boxes] = await Promise.all([
    model.getItemsGeometry(localIds),
    model.getBoxes(localIds),
  ])
  const modelMatrix = model.object?.matrixWorld

  return localIds.flatMap((localId, index) => {
    const box = boxes?.[index] ?? null
    const footprint = footprintFor(worldTriangles(geometries?.[index], modelMatrix), identity, box)
    if (!footprint) return []
    const outline = outlineFromTriangles(footprint.triangles)
    if (outline.length < 3) return []
    return [{
      modelId,
      localId,
      outline,
      area: trianglesArea(footprint.triangles),
      centroid: { x: footprint.centroid.x, z: footprint.centroid.y },
      elevation: box?.min.y ?? 0,
    }]
  })
}
