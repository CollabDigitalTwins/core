// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import { CurrentWorld } from '../../CurrentWorld'
import {
  addItemsProjectionByClassOccluded,
  createDrawing,
  disableProjectorWebGPU,
  DrawingEditorReady,
  getItemIdsByClass,
  patchModelGeometryRepresentationIds,
} from '../../lib/drawingProjection'

import { addSpacesToDrawing } from '../../lib/spaceOverlay'
import { initializeCSS2DRenderer } from '../../tools/AddToBim/src/FileMarkerUtils'

import { FLOORPLAN_FILL_CATEGORIES } from './types'
import { getStoreyItemIds, planLineClasses, STOREY_CUT_DEPTH, storeyCutPlaneY } from './utils'

import type { FloorplanEntry } from './types'

/** Projects storey plans lazily, caching each storey's item ids and the drawing on its entry. */
export class StoreyProjector {
  private _editorReady: DrawingEditorReady
  private _storeyIdCache = new Map<string, number[]>()

  constructor(private components: OBC.Components) {
    this._editorReady = new DrawingEditorReady(components)
  }

  ensureEditorReady() {
    return this._editorReady.ensure()
  }

  async project(entry: FloorplanEntry): Promise<void> {
    if (entry.drawing && entry.projected) return

    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(entry.modelId)
    if (!model) return

    const center = new THREE.Vector3()
    model.box.getCenter(center)

    // The captured volume must bottom out at the lower clip plane, or the storey below is drawn too.
    const drawing = createDrawing(this.components, {
      orientation: new THREE.Vector3(0, -1, 0),
      position: new THREE.Vector3(center.x, storeyCutPlaneY(entry.elevation), center.z),
      far: STOREY_CUT_DEPTH,
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
    // Reachable from the entry before the first await, so a teardown mid-projection can still dispose it.
    entry.drawing = drawing

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
    const filterFn =
      storeyIds.length > 0
        ? (id: number) => geomSet.has(id) && storeyIdSet.has(id)
        : (id: number) => geomSet.has(id)
    const idFilter = new Set<number>()
    for (const id of allIdsWithGeometry) if (filterFn(id)) idFilter.add(id)

    if (idFilter.size === 0) {
      entry.projected = true
      entry.layers = []
      return
    }

    const itemIdsByClass = planLineClasses(await getItemIdsByClass(model, idFilter))
    // Floors hide what hangs beneath them but draw no edges of their own, since joints between slab pieces read as walls.
    const floorIds = Object.values(await model.getItemsOfCategories(FLOORPLAN_FILL_CATEGORIES)).flat() as number[]
    const layers = await addItemsProjectionByClassOccluded(
      drawing,
      this.components,
      entry.modelId,
      itemIdsByClass,
      floorIds.filter(id => geomSet.has(id)),
    )
    // Spaces are solids that hang off the storey by aggregation, so the class projection would miss or box them.
    try {
      const spaces = await addSpacesToDrawing(drawing, model, entry.elevation)
      if (spaces) {
        const world = this.components.get(CurrentWorld).world
        if (world) initializeCSS2DRenderer(world)
        entry.spaces = spaces.handle
        layers.push(spaces.layer)
      }
    } catch (error) {
      console.warn('[StoreyProjector] space overlay skipped:', error)
    }

    void fragments.core.update(true)
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
