// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import {
  addDoorSwingsToDrawing,
  addItemsProjectionByClass,
  createDrawing,
  disableProjectorWebGPU,
  DrawingEditorReady,
  getItemIdsByClass,
  patchModelGeometryRepresentationIds,
} from '../../lib/drawingProjection'

import { getStoreyItemIds } from './utils'

import type { FloorplanEntry } from './types'

/**
 * Floorplan-flavor wrapper around the generic drawing primitives.
 * Owns: storey-id cache, lazy projection per FloorplanEntry, editor warmup.
 */
export class StoreyProjector {
  private _editorReady: DrawingEditorReady
  private _storeyIdCache = new Map<string, number[]>()

  constructor(private components: OBC.Components) {
    this._editorReady = new DrawingEditorReady(components)
  }

  ensureEditorReady() {
    return this._editorReady.ensure()
  }

  /** Lazy projection. After the first call for a given entry, the drawing
   *  is cached on the entry itself so subsequent activations are instant. */
  async project(entry: FloorplanEntry): Promise<void> {
    if (entry.drawing && entry.projected) return

    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(entry.modelId)
    if (!model) return

    const center = new THREE.Vector3()
    model.box.getCenter(center)

    // Cut plane sits 1.5 m above the floor; capture 2 m downward → volume
    // spans [elevation - 0.5, elevation + 1.5]. Anything under the slab is
    // visually masked by the opaque white slab + lower clip plane.
    const drawing = createDrawing(this.components, {
      orientation: new THREE.Vector3(0, -1, 0),
      position: new THREE.Vector3(center.x, entry.elevation + 1.5, center.z),
      far: 3,
      viewport: {
        left: -25,
        right: 25,
        top: 15,
        bottom: -15,
        scale: 100,
        name: `Floor Plan - ${entry.name}`,
      },
    })
    if (!drawing) return

    // Make the drawing visible BEFORE projection starts so lines appear
    // class-by-class as `addItemsProjectionByClass` walks the IFC classes —
    // otherwise the render loop only sees the full result at the end.
    drawing.three.visible = true

    const editor = this.components.get(OBF.DrawingEditor)
    editor.activeDrawing = drawing

    disableProjectorWebGPU(this.components)
    patchModelGeometryRepresentationIds(model)

    const allIdsWithGeometry: number[] = await model.getItemsIdsWithGeometry()
    const geomSet = new Set(allIdsWithGeometry)
    const storeyIds = await this.getCachedStoreyIds(
      entry.modelId,
      entry.storeyLocalId,
      model,
    )
    const storeyIdSet = new Set(storeyIds)
    // Restrict the per-class projection to items that (a) have geometry and
    // (b) belong to this storey (when storey ids resolved at all).
    const filterFn =
      storeyIds.length > 0
        ? (id: number) => geomSet.has(id) && storeyIdSet.has(id)
        : (id: number) => geomSet.has(id)
    const idFilter = new Set<number>()
    for (const id of allIdsWithGeometry) if (filterFn(id)) idFilter.add(id)

    if (idFilter.size === 0) {
      entry.drawing = drawing
      entry.projected = true
      entry.layers = []
      return
    }

    const itemIdsByClass = await getItemIdsByClass(model, idFilter)
    const layers = await addItemsProjectionByClass(
      drawing,
      entry.modelId,
      itemIdsByClass,
      // The BIM viewer renders on camera events, not continuously — request
      // an explicit render after each class so the user sees lines pop in
      // as each IFC class finishes projecting.
      () => { void fragments.core.update(true) },
    )
    // Iconic floor-plan swing arcs for doors. Best-effort: a model without
    // IFCDOOR items, or whose worker can't supply bboxes, falls through
    // silently. Runs after the main projection so the arcs sit on top.
    try {
      // const doorLayer = await addDoorSwingsToDrawing(
      //   drawing,
      //   model,
      //   idFilter,
      //   entry.elevation,
      // )
      // if (doorLayer) layers.push(doorLayer)
      void fragments.core.update(true)
    } catch (error) {
      console.warn('[StoreyProjector] door swings skipped:', error)
    }
    entry.drawing = drawing
    entry.projected = true
    entry.layers = layers
  }

  async getCachedStoreyIds(
    modelId: string,
    storeyLocalId: number,
    model: any,
  ): Promise<number[]> {
    const key = `${modelId}::${storeyLocalId}`
    const cached = this._storeyIdCache.get(key)
    if (cached) return cached
    const ids = await getStoreyItemIds(model, storeyLocalId)
    this._storeyIdCache.set(key, ids)
    return ids
  }

  invalidateForModel(modelId: string) {
    for (const key of [...this._storeyIdCache.keys()]) {
      if (key.startsWith(`${modelId}::`)) this._storeyIdCache.delete(key)
    }
  }
}
