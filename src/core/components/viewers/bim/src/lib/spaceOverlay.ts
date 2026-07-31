// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

import type { DrawingLayerInfo } from './drawingLayers'
import type * as OBC from '@thatopen/components'

/**
 * Room (IFCSPACE) overlay for floorplans.
 *
 * Spaces cannot go through the normal per-class edge projection: they are
 * volumetric solids, so projecting them yields the outline of a box rather than
 * the room graphic drafters expect. Instead this builds, per space:
 *
 * - a translucent fill from the solid's **bottom face**, which is the true
 *   footprint (a bounding rectangle would be wrong for any L-shaped room),
 * - an X across the footprint's extent, the conventional "this is a room"
 *   marker, shown only while the layer is at its default colour,
 * - a name tag at the footprint centroid.
 *
 * Spaces are also missing from the projection for a second reason: they hang
 * off the storey through `IfcRelAggregates`, not the
 * `IfcRelContainedInSpatialStructure` relation the storey filter queries, so
 * they never reach `idFilter`. This module selects them by elevation instead,
 * the same way door swings are matched to a storey.
 */

export const SPACES_LAYER = 'Spaces'

/** Light blue, matching the convention in most authoring software. */
export const DEFAULT_SPACE_COLOR = 0x8e_c9_e3

const FILL_OPACITY = 0.35
/** A space's base should sit at the storey elevation; tolerate sloped floors. */
const STOREY_Y_TOLERANCE = 1
/** Vertical spread still counted as part of the flat bottom face. */
const BOTTOM_FACE_EPSILON = 0.02
/** Keeps the fill and X behind the projected linework. */
const FILL_RENDER_ORDER = -20
const CROSS_RENDER_ORDER = -19

export interface SpaceOverlayHandle {
  /** Number of spaces drawn. */
  count: number
  setVisible: (visible: boolean) => void
  /**
   * Recolour the fill. Any call counts as a user choice, which hides the X —
   * the cross reads as "unstyled room", so it stops making sense once the room
   * carries a deliberate colour.
   */
  setColor: (color: number) => void
  dispose: () => void
}

export interface SpaceFootprint {
  /** Triangles of the bottom face, in drawing-local space (y = 0). */
  triangles: number[]
  min: THREE.Vector2
  max: THREE.Vector2
  centroid: THREE.Vector2
}

/** Maps a world-space point into the drawing's local frame. */
export type ToDrawingLocal = (point: THREE.Vector3) => THREE.Vector3

/** World-space triangles of one item, with its transform and the model's applied. */
function worldTriangles(
  meshes: readonly any[] | undefined,
  modelMatrix: THREE.Matrix4 | undefined,
): number[] {
  const out: number[] = []
  if (!meshes) return out

  for (const data of meshes) {
    const { positions, indices } = data ?? {}
    if (!positions || !indices) continue

    const matrix = new THREE.Matrix4()
    if (modelMatrix) matrix.copy(modelMatrix)
    if (data.transform) matrix.multiply(data.transform)

    const vertex = new THREE.Vector3()
    for (let i = 0; i < indices.length; i += 3) {
      for (let corner = 0; corner < 3; corner++) {
        const index = indices[i + corner] * 3
        vertex
          .set(positions[index], positions[index + 1], positions[index + 2])
          .applyMatrix4(matrix)
        out.push(vertex.x, vertex.y, vertex.z)
      }
    }
  }
  return out
}

/**
 * Keep the triangles lying on the solid's lowest horizontal plane and flatten
 * them into the drawing. Falls back to the world bounding box when the solid
 * has no flat base (a sloped or malformed space).
 */
export function footprintFor(
  triangles: number[],
  toLocal: ToDrawingLocal,
  fallbackBox: THREE.Box3 | null,
): SpaceFootprint | null {
  let minY = Number.POSITIVE_INFINITY
  for (let i = 1; i < triangles.length; i += 3) {
    if (triangles[i] < minY) minY = triangles[i]
  }

  const kept: number[] = []
  const min = new THREE.Vector2(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
  const max = new THREE.Vector2(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
  let sumX = 0
  let sumZ = 0
  let vertexCount = 0

  if (Number.isFinite(minY)) {
    for (let i = 0; i < triangles.length; i += 9) {
      const onBase =
        Math.abs(triangles[i + 1] - minY) <= BOTTOM_FACE_EPSILON &&
        Math.abs(triangles[i + 4] - minY) <= BOTTOM_FACE_EPSILON &&
        Math.abs(triangles[i + 7] - minY) <= BOTTOM_FACE_EPSILON
      if (!onBase) continue

      for (let corner = 0; corner < 3; corner++) {
        const offset = i + corner * 3
        const local = toLocal(
          new THREE.Vector3(
            triangles[offset],
            triangles[offset + 1],
            triangles[offset + 2],
          ),
        )
        kept.push(local.x, 0, local.z)
        min.x = Math.min(min.x, local.x)
        min.y = Math.min(min.y, local.z)
        max.x = Math.max(max.x, local.x)
        max.y = Math.max(max.y, local.z)
        sumX += local.x
        sumZ += local.z
        vertexCount++
      }
    }
  }

  if (kept.length === 0) {
    if (!fallbackBox || fallbackBox.isEmpty()) return null
    const corners = [
      new THREE.Vector3(fallbackBox.min.x, fallbackBox.min.y, fallbackBox.min.z),
      new THREE.Vector3(fallbackBox.max.x, fallbackBox.min.y, fallbackBox.min.z),
      new THREE.Vector3(fallbackBox.max.x, fallbackBox.min.y, fallbackBox.max.z),
      new THREE.Vector3(fallbackBox.min.x, fallbackBox.min.y, fallbackBox.max.z),
    ].map(corner => toLocal(corner))

    for (const [a, b, c] of [
      [corners[0], corners[1], corners[2]],
      [corners[0], corners[2], corners[3]],
    ]) {
      kept.push(a.x, 0, a.z, b.x, 0, b.z, c.x, 0, c.z)
    }
    for (const corner of corners) {
      min.x = Math.min(min.x, corner.x)
      min.y = Math.min(min.y, corner.z)
      max.x = Math.max(max.x, corner.x)
      max.y = Math.max(max.y, corner.z)
      sumX += corner.x
      sumZ += corner.z
      vertexCount++
    }
  }

  if (vertexCount === 0) return null

  return {
    triangles: kept,
    min,
    max,
    centroid: new THREE.Vector2(sumX / vertexCount, sumZ / vertexCount),
  }
}

function readSpaceName(data: any, fallback: number): string {
  const candidates = [data?.Name?.value, data?.LongName?.value]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return `Space ${fallback}`
}

function makeNameTag(text: string, position: THREE.Vector2): CSS2DObject {
  const element = document.createElement('div')
  element.className = 'cdt-space-tag'
  element.textContent = text
  element.style.cssText = [
    'padding:1px 4px',
    'border-radius:3px',
    'font-size:14px',
    'font-weight:500',
    'line-height:1.2',
    'white-space:nowrap',
    'color:#1f2937',
    'background:rgba(255,255,255,0.75)',
    'pointer-events:none',
  ].join(';')

  // CSS2DObject writes its own transform from `center` (0.5, 0.5 by default),
  // which already centres the tag on the point — do not set one here.
  const tag = new CSS2DObject(element)
  tag.position.set(position.x, 0, position.y)
  return tag
}

/**
 * Build the Spaces overlay for one storey and attach it to the drawing.
 *
 * Returns null when the storey has no spaces. The layer starts hidden: room
 * fills cover the linework underneath, so they are opt-in rather than something
 * the user has to turn off on every plan.
 */
export async function addSpacesToDrawing(
  drawing: OBC.TechnicalDrawing,
  model: any,
  storeyY: number,
): Promise<{ layer: DrawingLayerInfo; handle: SpaceOverlayHandle } | null> {
  const spaceMap = (await model.getItemsOfCategories([/^IFCSPACE$/])) as Record<
    string,
    number[]
  >
  const allSpaceIds = Object.values(spaceMap ?? {}).flat() as number[]
  if (allSpaceIds.length === 0) return null

  const boxes: THREE.Box3[] = await model.getBoxes(allSpaceIds)
  const spaceIds: number[] = []
  const boxById = new Map<number, THREE.Box3>()
  for (const [index, id] of allSpaceIds.entries()) {
    const box = boxes?.[index]
    if (!box || box.isEmpty()) continue
    // Spaces reach the storey through IfcRelAggregates, which the storey filter
    // does not query, so match them by elevation instead.
    if (Math.abs(box.min.y - storeyY) > STOREY_Y_TOLERANCE) continue
    spaceIds.push(id)
    boxById.set(id, box)
  }
  if (spaceIds.length === 0) return null

  const [geometries, itemsData] = await Promise.all([
    model.getItemsGeometry(spaceIds),
    model.getItemsData(spaceIds, {
      attributesDefault: false,
      attributes: ['Name', 'LongName'],
    }),
  ])

  const modelMatrix = model.object?.matrixWorld as THREE.Matrix4 | undefined
  const fillVerts: number[] = []
  const crossVerts: number[] = []
  const tags: CSS2DObject[] = []

  drawing.three.updateWorldMatrix(true, false)
  const toLocal: ToDrawingLocal = (point) => drawing.three.worldToLocal(point.clone())

  for (const [index, id] of spaceIds.entries()) {
    const triangles = worldTriangles(geometries?.[index], modelMatrix)
    const footprint = footprintFor(triangles, toLocal, boxById.get(id) ?? null)
    if (!footprint) continue

    fillVerts.push(...footprint.triangles)

    // X from corner to corner of the footprint's extent.
    const { min, max } = footprint
    crossVerts.push(
      min.x, 0, min.y, max.x, 0, max.y,
      min.x, 0, max.y, max.x, 0, min.y,
    )

    tags.push(makeNameTag(readSpaceName(itemsData?.[index], id), footprint.centroid))
  }

  if (fillVerts.length === 0) return null

  const group = new THREE.Group()
  group.name = SPACES_LAYER
  group.visible = false

  const fillMaterial = new THREE.MeshBasicMaterial({
    color: DEFAULT_SPACE_COLOR,
    transparent: true,
    opacity: FILL_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const fillGeometry = new THREE.BufferGeometry()
  fillGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(new Float32Array(fillVerts), 3),
  )
  const fill = new THREE.Mesh(fillGeometry, fillMaterial)
  fill.renderOrder = FILL_RENDER_ORDER
  group.add(fill)

  const crossMaterial = new THREE.LineBasicMaterial({
    color: DEFAULT_SPACE_COLOR,
    transparent: true,
    opacity: 0.9,
  })
  const crossGeometry = new THREE.BufferGeometry()
  crossGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(new Float32Array(crossVerts), 3),
  )
  const cross = new THREE.LineSegments(crossGeometry, crossMaterial)
  cross.renderOrder = CROSS_RENDER_ORDER
  group.add(cross)

  for (const tag of tags) group.add(tag)

  drawing.three.add(group)

  const handle: SpaceOverlayHandle = {
    count: tags.length,
    setVisible: (visible: boolean) => { group.visible = visible },
    setColor: (color: number) => {
      fillMaterial.color.setHex(color)
      fillMaterial.needsUpdate = true
      // A deliberate colour replaces the default room graphic; the name tag
      // stays, since that is information rather than styling.
      cross.visible = false
    },
    dispose: () => {
      group.removeFromParent()
      for (const tag of tags) tag.removeFromParent()
      fillGeometry.dispose()
      crossGeometry.dispose()
      fillMaterial.dispose()
      crossMaterial.dispose()
    },
  }

  const layer: DrawingLayerInfo = {
    className: SPACES_LAYER,
    layerName: SPACES_LAYER,
    visible: false,
    color: DEFAULT_SPACE_COLOR,
    itemCount: handle.count,
    displayKey: 'DrawingLayers.spaces',
  }

  return { layer, handle }
}
