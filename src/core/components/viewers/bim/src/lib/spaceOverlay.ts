// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

import type { DrawingLayerInfo } from './drawingLayers'
import type * as OBC from '@thatopen/components'

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
const MIN_CROSS_PIECE = 1e-6

export interface SpaceOverlayHandle {
  /** Number of spaces drawn. */
  count: number
  setVisible: (visible: boolean) => void
  /** Recolours the fill. Any call is a deliberate colour, which hides the X that marks an unstyled room. */
  setColor: (color: number) => void
  /** Hides these rooms' fill, X and tag, and shows every other room. */
  setHidden: (localIds: ReadonlySet<number>) => void
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
export function worldTriangles(
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

/** The solid's lowest flat face flattened into the drawing, or its world box when it has no flat base. */
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

/** The parts of the segment `from`–`to` inside the footprint's triangles, as line-segment vertices. */
export function clipSegmentToFootprint(from: THREE.Vector2, to: THREE.Vector2, triangles: readonly number[]): number[] {
  const out: number[] = []
  const dx = to.x - from.x
  const dz = to.y - from.y
  for (let offset = 0; offset < triangles.length; offset += 9) {
    const range = segmentRangeInTriangle(from, dx, dz, triangles, offset)
    if (!range) continue
    const [start, end] = range
    out.push(from.x + dx * start, 0, from.y + dz * start, from.x + dx * end, 0, from.y + dz * end)
  }
  return out
}

function segmentRangeInTriangle(
  from: THREE.Vector2,
  dx: number,
  dz: number,
  triangles: readonly number[],
  offset: number,
): [number, number] | null {
  const xs = [triangles[offset], triangles[offset + 3], triangles[offset + 6]]
  const zs = [triangles[offset + 2], triangles[offset + 5], triangles[offset + 8]]
  const winding = Math.sign((xs[1] - xs[0]) * (zs[2] - zs[0]) - (zs[1] - zs[0]) * (xs[2] - xs[0]))
  if (winding === 0) return null

  let start = 0
  let end = 1
  for (let k = 0; k < 3; k++) {
    const edgeX = xs[(k + 1) % 3] - xs[k]
    const edgeZ = zs[(k + 1) % 3] - zs[k]
    const insideAtStart = winding * (edgeX * (from.y - zs[k]) - edgeZ * (from.x - xs[k]))
    const insideRate = winding * (edgeX * dz - edgeZ * dx)
    if (insideRate === 0) {
      if (insideAtStart < 0) return null
      continue
    }
    const crossing = -insideAtStart / insideRate
    if (insideRate > 0) start = Math.max(start, crossing)
    else end = Math.min(end, crossing)
  }
  return end - start > MIN_CROSS_PIECE ? [start, end] : null
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

  // CSS2DObject already centres the tag on the point from its own `center`, so no transform is set here.
  const tag = new CSS2DObject(element)
  tag.position.set(position.x, 0, position.y)
  return tag
}

function positionGeometry(vertices: readonly number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(vertices), 3))
  return geometry
}

/**
 * Attaches one storey's room overlay, visible: a bottom-face fill, an X clipped to the footprint and a name tag,
 * since a projected space is only a box outline. Null when the storey has no spaces.
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
    // Spaces reach the storey through IfcRelAggregates, which the storey filter does not query, so match by elevation.
    if (Math.abs(box.min.y - storeyY) > STOREY_Y_TOLERANCE) continue
    spaceIds.push(id)
    boxById.set(id, box)
  }
  if (spaceIds.length === 0) return null

  const [spaceGeometries, itemsData] = await Promise.all([
    model.getItemsGeometry(spaceIds),
    model.getItemsData(spaceIds, {
      attributesDefault: false,
      attributes: ['Name', 'LongName'],
    }),
  ])

  const modelMatrix = model.object?.matrixWorld as THREE.Matrix4 | undefined
  const group = new THREE.Group()
  group.name = SPACES_LAYER
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: DEFAULT_SPACE_COLOR,
    transparent: true,
    opacity: FILL_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const crossMaterial = new THREE.LineBasicMaterial({
    color: DEFAULT_SPACE_COLOR,
    transparent: true,
    opacity: 0.9,
  })
  const rooms = new Map<number, THREE.Group>()
  const geometries: THREE.BufferGeometry[] = []
  const tags: CSS2DObject[] = []

  drawing.three.updateWorldMatrix(true, false)
  const toLocal: ToDrawingLocal = (point) => drawing.three.worldToLocal(point.clone())

  for (const [index, id] of spaceIds.entries()) {
    const triangles = worldTriangles(spaceGeometries?.[index], modelMatrix)
    const footprint = footprintFor(triangles, toLocal, boxById.get(id) ?? null)
    if (!footprint) continue

    const { min, max, triangles: base } = footprint
    const fillGeometry = positionGeometry(base)
    const crossGeometry = positionGeometry([
      ...clipSegmentToFootprint(min, max, base),
      ...clipSegmentToFootprint(new THREE.Vector2(min.x, max.y), new THREE.Vector2(max.x, min.y), base),
    ])
    geometries.push(fillGeometry, crossGeometry)

    const fill = new THREE.Mesh(fillGeometry, fillMaterial)
    fill.renderOrder = FILL_RENDER_ORDER
    const cross = new THREE.LineSegments(crossGeometry, crossMaterial)
    cross.renderOrder = CROSS_RENDER_ORDER
    const tag = makeNameTag(readSpaceName(itemsData?.[index], id), footprint.centroid)
    tags.push(tag)

    const room = new THREE.Group()
    room.add(fill, cross, tag)
    rooms.set(id, room)
    group.add(room)
  }

  if (rooms.size === 0) {
    fillMaterial.dispose()
    crossMaterial.dispose()
    return null
  }

  drawing.three.add(group)

  const handle: SpaceOverlayHandle = {
    count: rooms.size,
    setVisible: (visible: boolean) => { group.visible = visible },
    setColor: (color: number) => {
      fillMaterial.color.setHex(color)
      fillMaterial.needsUpdate = true
      // The name tag stays: it is information rather than styling.
      crossMaterial.visible = false
    },
    setHidden: (localIds: ReadonlySet<number>) => {
      for (const [id, room] of rooms) room.visible = !localIds.has(id)
    },
    dispose: () => {
      group.removeFromParent()
      for (const tag of tags) tag.removeFromParent()
      for (const geometry of geometries) geometry.dispose()
      fillMaterial.dispose()
      crossMaterial.dispose()
    },
  }

  const layer: DrawingLayerInfo = {
    className: SPACES_LAYER,
    layerName: SPACES_LAYER,
    visible: true,
    color: DEFAULT_SPACE_COLOR,
    itemCount: handle.count,
    displayKey: 'DrawingLayers.spaces',
  }

  return { layer, handle }
}
