// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import {
  addItemsProjectionByClassOccluded,
  createDrawing,
  disableProjectorWebGPU,
  DrawingEditorReady,
  getItemIdsByClass,
  patchModelGeometryRepresentationIds,
} from '../../lib/drawingProjection'

import type {
  ElevationDirection,
  ElevationEntry,
} from './types'

/** Margin (m) added to the drawing plane offset and to the viewport so
 *  the building silhouette doesn't get clipped at the edges. */
const ELEVATION_PLANE_OFFSET = 2
const ELEVATION_VIEWPORT_PADDING = 1

const DIRECTION_VIEW_VECTOR: Record<ElevationDirection, THREE.Vector3> = {
  // North elevation: camera north of the building, looking south.
  north: new THREE.Vector3(0, 0, -1),
  south: new THREE.Vector3(0, 0, 1),
  east: new THREE.Vector3(-1, 0, 0),
  west: new THREE.Vector3(1, 0, 0),
}

const DIRECTIONS: ElevationDirection[] = ['north', 'south', 'east', 'west']

/**
 * Builds and projects elevation drawings (N / S / E / W) for each loaded
 * model using the same TechnicalDrawing + DrawingEditor pipeline as
 * FloorplanTool's StoreyProjector. Each entry gets its own drawing,
 * lazily projected on first activation.
 */
export class ElevationProjector {
  private _editorReady: DrawingEditorReady

  constructor(private components: OBC.Components) {
    this._editorReady = new DrawingEditorReady(components)
  }

  ensureEditorReady() {
    return this._editorReady.ensure()
  }

  /** Generate four entries (N/S/E/W) for the given model from its
   *  bounding box. Drawings are NOT projected yet — that's lazy on first
   *  activate. */
  buildEntries(modelId: string, modelBox: THREE.Box3): ElevationEntry[] {
    if (modelBox.isEmpty()) return []

    const center = new THREE.Vector3()
    modelBox.getCenter(center)
    const size = new THREE.Vector3()
    modelBox.getSize(size)
    const halfX = size.x / 2 + ELEVATION_VIEWPORT_PADDING
    const halfY = size.y / 2 + ELEVATION_VIEWPORT_PADDING
    const halfZ = size.z / 2 + ELEVATION_VIEWPORT_PADDING

    return DIRECTIONS.map((direction) => {
      const view = DIRECTION_VIEW_VECTOR[direction]
      // Place the drawing plane just OUTSIDE the model along -view (i.e.
      // on the camera side) so far-plane is positive into the building.
      const offsetMag =
        Math.abs(view.x) * (size.x / 2) +
        Math.abs(view.y) * (size.y / 2) +
        Math.abs(view.z) * (size.z / 2) +
        ELEVATION_PLANE_OFFSET
      const position = center
        .clone()
        .sub(view.clone().multiplyScalar(offsetMag))

      // 2D viewport: in the plane perpendicular to `view`. For N/S that's
      // X (horizontal) × Y (vertical); for E/W that's Z (horizontal) × Y.
      const horizontalIsX = direction === 'north' || direction === 'south'
      const horizontalHalf = horizontalIsX ? halfX : halfZ
      const verticalHalf = halfY

      // Building depth captured by the projection (one full depth + margin).
      const depth =
        Math.abs(view.x) * size.x +
        Math.abs(view.y) * size.y +
        Math.abs(view.z) * size.z
      const far = depth + 2 * ELEVATION_PLANE_OFFSET

      return {
        id: `${modelId}::elev::${direction}`,
        direction,
        modelId,
        position,
        viewDirection: view.clone(),
        viewport: {
          left: -horizontalHalf,
          right: horizontalHalf,
          top: verticalHalf,
          bottom: -verticalHalf,
        },
        far,
        modelBox: modelBox.clone(),
        drawing: null,
        projected: false,
        layers: [],
      }
    })
  }

  /** Lazy projection. After the first call for a given entry, the drawing
   *  is cached on the entry itself so subsequent activations are instant. */
  async project(entry: ElevationEntry): Promise<void> {
    if (entry.drawing && entry.projected) return

    const fragments = this.components.get(OBC.FragmentsManager)
    const model = fragments.list.get(entry.modelId)
    if (!model) return

    const drawing = createDrawing(this.components, {
      orientation: entry.viewDirection.clone(),
      position: entry.position.clone(),
      far: entry.far,
      viewport: {
        ...entry.viewport,
        scale: 100,
        name: `Elevation - ${entry.direction}`,
      },
    })
    if (!drawing) return

    const editor = this.components.get(OBF.DrawingEditor)
    editor.activeDrawing = drawing

    disableProjectorWebGPU(this.components)
    patchModelGeometryRepresentationIds(model)

    const ids: number[] = await model.getItemsIdsWithGeometry()
    if (ids.length === 0) {
      entry.drawing = drawing
      entry.projected = true
      entry.layers = []
      return
    }

    const idFilter = new Set(ids)
    const itemIdsByClass = await getItemIdsByClass(model, idFilter)
    // Single-pass projection so the visibility culler sees the whole scene
    // and back-of-building edges that are occluded by something in front
    // get classified as hidden (and dropped). Per-class projection would
    // compute occlusion only within each class, leaving back walls visible.
    const layers = await addItemsProjectionByClassOccluded(
      drawing,
      this.components,
      entry.modelId,
      itemIdsByClass,
    )
    entry.drawing = drawing
    entry.projected = true
    entry.layers = layers
  }
}
