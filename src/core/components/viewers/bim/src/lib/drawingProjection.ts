// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'

import {
  defaultLayerColor,
  sortClassesByPriority,
} from './drawingLayers'

import type {
  DrawingLayerInfo} from './drawingLayers';

export const FONT_URL =
  'https://thatopen.github.io/engine_components/resources/fonts/PlusJakartaSans-Medium.ttf'

export const VISIBLE_LAYER = 'Visible'
export const HIDDEN_LAYER = 'Hidden'
export const ANNOTATIONS_LAYER = 'Annotations'

export interface DrawingViewportConfig {
  left: number
  right: number
  top: number
  bottom: number
  scale?: number
  name?: string
}

export interface DrawingConfig {
  /** Direction the drawing's "camera" looks. Top-down floorplan: (0,-1,0).
   *  North elevation: (0,0,-1). Etc. */
  orientation: THREE.Vector3
  /** World position of the drawing plane. */
  position: THREE.Vector3
  /** Depth captured from the plane along the orientation. */
  far: number
  viewport: DrawingViewportConfig
}

/**
 * Lazy, idempotent setup of `OBF.DrawingEditor` (font + source world).
 * Call before any drawing-projection work.
 */
export class DrawingEditorReady {
  private _fontLoaded = false
  private _editorSourceSet = false

  constructor(private components: OBC.Components) {}

  async ensure() {
    const editor = this.components.get(OBF.DrawingEditor)

    if (!this._fontLoaded) {
      try {
        await editor.fonts.load(FONT_URL)
      } catch (error) {
        console.warn('[drawingProjection] Font load failed:', error)
      }
      this._fontLoaded = true
    }

    if (!this._editorSourceSet) {
      const sourceWorld = this.components.get(CurrentWorld).world
      if (sourceWorld) {
        editor.setSource(sourceWorld)
        this._editorSourceSet = true
      }
    }
  }
}

/** Create a new TechnicalDrawing pre-configured with the standard
 *  visible/hidden/annotations layers + viewport. Caller still needs to
 *  add projection items (`addProjectionFromItems`). */
export function createDrawing(
  components: OBC.Components,
  config: DrawingConfig,
): OBC.TechnicalDrawing | null {
  const sourceWorld = components.get(CurrentWorld).world
  if (!sourceWorld) return null

  const techDrawings = components.get(OBC.TechnicalDrawings)
  const drawing = techDrawings.create(sourceWorld)
  drawing.orientTo(config.orientation.clone())
  drawing.three.position.copy(config.position)
  drawing.three.visible = false
  drawing.far = config.far

  drawing.layers.create(VISIBLE_LAYER, {
    material: new THREE.LineBasicMaterial({ color: 0x000000 }),
  })
  drawing.layers.create(HIDDEN_LAYER, {
    material: new THREE.LineDashedMaterial({
      color: 0x888888,
      dashSize: 0.2,
      gapSize: 0.1,
    }),
    visible: false,
  } as any)
  drawing.layers.create(ANNOTATIONS_LAYER, {
    material: new THREE.LineBasicMaterial({ color: 0x000000 }),
  })
  drawing.activeLayer = ANNOTATIONS_LAYER

  drawing.viewports.create({
    left: config.viewport.left,
    right: config.viewport.right,
    top: config.viewport.top,
    bottom: config.viewport.bottom,
    scale: config.viewport.scale ?? 100,
    name: config.viewport.name ?? 'Drawing',
  })

  return drawing
}

/** Force ProjectionGenerator off the WebGPU path (it silently returns 0
 *  edges when WebGPU is unavailable in the browser, which @thatopen
 *  components 3.4 hits). Idempotent. */
export function disableProjectorWebGPU(components: OBC.Components) {
  const projector = components.get(OBC.EdgeProjector)
  ;(projector as any).generator.useWebGPU = false
}

/** Patch a model's `getItemsGeometry` to give every entry a unique
 *  representationId. EdgeProjector at index.mjs:11228 uses
 *  `!geomData.representationId` to validate, so id=0 is incorrectly
 *  skipped — and the fragments worker for our models returns 0 for every
 *  entry. Idempotent per model via a flag on the model itself. */
export function patchModelGeometryRepresentationIds(model: any) {
  if (model._floorplanGeometryPatched) return
  const original = model.getItemsGeometry.bind(model)
  let counter = 1
  model.getItemsGeometry = async (ids: number[]) => {
    const data = await original(ids)
    if (data && typeof data === 'object') {
      const arrays = Array.isArray(data) ? data : Object.values(data)
      for (const arr of arrays) {
        if (!Array.isArray(arr)) continue
        for (const g of arr) {
          if (
            g &&
            (g.representationId === 0 ||
              g.representationId == null ||
              g.representationId === '')
          ) {
            g.representationId = `cdt-rep-${counter++}`
          }
        }
      }
    }
    return data
  }
  model._floorplanGeometryPatched = true
}

/** Add the projection lines for the given item ids to a drawing. Lays
 *  them into the standard visible/hidden layers. */
export async function addItemsProjection(
  drawing: OBC.TechnicalDrawing,
  modelId: string,
  itemIds: number[],
): Promise<void> {
  if (itemIds.length === 0) return
  const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set(itemIds) }
  await drawing.addProjectionFromItems(modelIdMap, {
    layers: { visible: VISIBLE_LAYER, hidden: HIDDEN_LAYER },
  })
}

/**
 * Project items grouped by IFC class into per-class drawing layers. Each
 * class gets its own visible layer with a default color (cut classes black,
 * everything else mid-gray); the hidden side of every class shares the
 * standard `HIDDEN_LAYER`.
 *
 * Returns metadata used by the sidebar UI (visibility toggles + color
 * pickers) and the future DXF export. Skipping classes whose projection
 * fails — one broken class shouldn't strand the rest of the drawing.
 */
export async function addItemsProjectionByClass(
  drawing: OBC.TechnicalDrawing,
  modelId: string,
  itemIdsByClass: Map<string, number[]>,
  onClassDone?: (className: string) => void,
): Promise<DrawingLayerInfo[]> {
  const layers: DrawingLayerInfo[] = []
  for (const [className, ids] of itemIdsByClass) {
    if (ids.length === 0) continue
    const color = defaultLayerColor(className)
    if (!drawing.layers.has(className)) {
      drawing.layers.create(className, {
        material: new THREE.LineBasicMaterial({ color }),
      })
    }
    const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set(ids) }
    try {
      await drawing.addProjectionFromItems(modelIdMap, {
        layers: { visible: className, hidden: HIDDEN_LAYER },
      })
    } catch (error) {
      console.warn(
        `[drawingProjection] projection for ${className} failed:`,
        error,
      )
      continue
    }
    layers.push({
      className,
      layerName: className,
      visible: true,
      color,
      itemCount: ids.length,
    })
    onClassDone?.(className)
  }
  return layers
}

/**
 * Group a model's geometric item ids by IFC class. Optional `idFilter`
 * narrows the result to a specific subset (e.g. items in a single storey).
 */
export async function getItemIdsByClass(
  model: any,
  idFilter?: Set<number>,
): Promise<Map<string, number[]>> {
  const all = (await model.getItemsOfCategories([/^IFC/])) as Record<
    string,
    number[]
  >
  const result = new Map<string, number[]>()
  for (const [className, ids] of Object.entries(all)) {
    const filtered = idFilter ? ids.filter((id) => idFilter.has(id)) : ids
    if (filtered.length > 0) result.set(className, filtered)
  }
  // Walls, columns, slabs, curtain-walls render first so they appear early
  // during progressive projection; everything else follows.
  return sortClassesByPriority(result)
}

/**
 * Project items into per-IFC-class drawing layers using a SINGLE
 * EdgeProjector pass. The visibility culler then sees the union of all
 * meshes and classifies each edge against the full scene — so a wall in
 * front of a chair correctly hides the chair's edges, even though they
 * end up on different layers.
 *
 * Use this for elevation drawings, where the entire building depth is
 * visible. {@link addItemsProjectionByClass} stays appropriate for
 * floorplans, where the section clip already limits depth and the per-
 * class path is faster.
 *
 * Hidden edges are intentionally discarded — the elevation should only
 * show the lines of objects immediately visible to the camera.
 */
export async function addItemsProjectionByClassOccluded(
  drawing: OBC.TechnicalDrawing,
  components: OBC.Components,
  modelId: string,
  itemIdsByClass: Map<string, number[]>,
): Promise<DrawingLayerInfo[]> {
  const world = components.get(CurrentWorld).world
  if (!world) return []

  // Build flat id set + reverse map (localId → className) so we can bin the
  // resulting line segments by their source class.
  const allIds = new Set<number>()
  const idToClass = new Map<number, string>()
  for (const [className, ids] of itemIdsByClass) {
    for (const id of ids) {
      allIds.add(id)
      idToClass.set(id, className)
    }
  }
  if (allIds.size === 0) return []

  const projector = components.get(OBC.EdgeProjector)
  ;(projector as any).generator.useWebGPU = false

  // Mirror the projection-direction + near/far plane setup that
  // `TechnicalDrawing.addProjectionFromItems` uses internally — see
  // node_modules/@thatopen/components/dist/index.mjs::addProjectionFromItems.
  const savedDir = projector.projectionDirection.clone()
  const savedNear = projector.nearPlane
  const savedFar = projector.farPlane
  let result: OBC.EdgeProjectionResult
  try {
    drawing.three.updateWorldMatrix(true, false)
    const projDir = new THREE.Vector3(0, -1, 0)
      .transformDirection(drawing.three.matrixWorld)
      .normalize()
    projector.projectionDirection.copy(projDir)
    const rotMat = new THREE.Matrix4().makeRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        projDir,
        new THREE.Vector3(0, -1, 0),
      ),
    )
    const planeY = new THREE.Vector3()
      .setFromMatrixPosition(drawing.three.matrixWorld)
      .applyMatrix4(rotMat).y
    projector.farPlane = planeY
    projector.nearPlane = planeY - drawing.far

    const modelIdMap: OBC.ModelIdMap = { [modelId]: allIds }
    result = await projector.get(modelIdMap, world)
  } finally {
    projector.projectionDirection.copy(savedDir)
    projector.nearPlane = savedNear
    projector.farPlane = savedFar
  }

  // Pre-create empty layers so the panel UI lists every class even if its
  // edges all ended up occluded (count = 0 for hidden classes).
  for (const className of itemIdsByClass.keys()) {
    if (!drawing.layers.has(className)) {
      drawing.layers.create(className, {
        material: new THREE.LineBasicMaterial({
          color: defaultLayerColor(className),
        }),
      })
    }
  }

  return splitVisibleByClass(drawing, result, idToClass, itemIdsByClass)
}

/** Walk the per-vertex `group` attribute of `result.visible`, look up the
 *  IFC class of the source item, and emit one `LineSegments` per class
 *  (transformed into drawing-local space and assigned to its layer). */
function splitVisibleByClass(
  drawing: OBC.TechnicalDrawing,
  result: OBC.EdgeProjectionResult,
  idToClass: Map<number, string>,
  itemIdsByClass: Map<string, number[]>,
): DrawingLayerInfo[] {
  const visibleGeom = result.visible
  const positionsAttr = visibleGeom.getAttribute('position') as
    | THREE.BufferAttribute
    | undefined
  const groupAttr = visibleGeom.getAttribute('group') as
    | THREE.BufferAttribute
    | undefined
  if (!positionsAttr) return []

  const buf = new Map<string, number[]>()
  const items = new Map<string, Set<number>>()
  for (const className of itemIdsByClass.keys()) {
    buf.set(className, [])
    items.set(className, new Set())
  }

  if (!groupAttr) return [] // No group info — can't bin.

  const positionArr = positionsAttr.array as Float32Array
  const groupArr = groupAttr.array as ArrayLike<number>
  const vertexCount = positionsAttr.count

  // Each line segment = 2 consecutive vertices that share a group index
  // (see ProjectedEdgeCollector::toLineGeometry in OBC's bundle).
  for (let i = 0; i < vertexCount; i += 2) {
    const groupIndex = Number(groupArr[i])
    const groupInfo = result.groups[groupIndex]
    if (!groupInfo) continue
    const className = idToClass.get(groupInfo.localId)
    if (!className) continue
    const verts = buf.get(className)
    if (!verts) continue
    const start = i * 3
    verts.push(
      positionArr[start],
      positionArr[start + 1],
      positionArr[start + 2],
      positionArr[start + 3],
      positionArr[start + 4],
      positionArr[start + 5],
    )
    items.get(className)!.add(groupInfo.localId)
  }

  const layers: DrawingLayerInfo[] = []
  for (const [className, verts] of buf) {
    if (verts.length === 0) continue
    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(verts), 3),
    )
    // Wrap in LineSegments at world origin so toDrawingSpace transforms the
    // (already world-space) positions into the drawing's local XZ plane.
    const sourceLine = new THREE.LineSegments(geom)
    const projected = OBC.TechnicalDrawing.toDrawingSpace(sourceLine, drawing)
    drawing.addProjectionLines(projected, className)
    layers.push({
      className,
      layerName: className,
      visible: true,
      color: defaultLayerColor(className),
      itemCount: items.get(className)!.size,
    })
  }
  return layers
}

export function disposeDrawing(
  components: OBC.Components,
  drawing: OBC.TechnicalDrawing | null,
) {
  if (!drawing) return
  try {
    const techDrawings = components.get(OBC.TechnicalDrawings)
    techDrawings.list.delete(drawing.uuid)
  } catch {
    // best-effort
  }
}

export const DOOR_SWING_LAYER = 'Door Swings'
const DOOR_SWING_COLOR = 0x666666
const DOOR_SWING_SEGMENTS = 16
const DOOR_STOREY_Y_TOLERANCE = 0.6

/**
 * Add a quarter-circle swing arc for every IFCDOOR in `idFilter` whose
 * bbox sits at the active storey's elevation. Returns a `DrawingLayerInfo`
 * for the new `Door Swings` layer (or null if no doors qualified), so the
 * caller can append it to the sidebar's toggleable layer list.
 *
 * The arc radius matches the door's widest horizontal dimension;
 * orientation is inferred from the bbox — the larger horizontal extent
 * is the door width direction, the smaller is wall thickness.
 *
 * Best-effort: missing bbox or implausibly-sized doors are skipped silently.
 */
export async function addDoorSwingsToDrawing(
  drawing: OBC.TechnicalDrawing,
  model: any,
  idFilter: Set<number> | null,
  storeyY: number,
): Promise<DrawingLayerInfo | null> {
  const doorMap = (await model.getItemsOfCategories([/IFCDOOR/])) as Record<
    string,
    number[]
  >
  let doorIds = Object.values(doorMap).flat() as number[]
  if (idFilter) doorIds = doorIds.filter((id) => idFilter.has(id))
  if (doorIds.length === 0) return null

  // Fetch boxes (world-space AABB, used for size + Y filter) and geometry
  // (per-item transform, used to recover REAL orientation — bboxes can't,
  // which is why doors in curved walls or at non-axis-aligned angles get
  // mis-oriented swings).
  const boxes: THREE.Box3[] = await model.getBoxes(doorIds)
  if (!boxes || boxes.length === 0) return null
  const geomDataPerDoor = await model.getItemsGeometry(doorIds)

  if (!drawing.layers.has(DOOR_SWING_LAYER)) {
    drawing.layers.create(DOOR_SWING_LAYER, {
      material: new THREE.LineBasicMaterial({ color: DOOR_SWING_COLOR }),
    })
  }

  const modelMatrix = model.object?.matrixWorld as THREE.Matrix4 | undefined
  const verts: number[] = []
  let drawnCount = 0
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    if (!box || box.isEmpty()) continue
    // `model.getBoxes` already applies `model.object.matrixWorld` internally
    // (BoxManager.getAllBoxes in @thatopen/fragments). Don't double-transform.
    const worldBox = box
    // Storey-Y filter: a door's bottom should sit at the active storey's
    // elevation. Filters out doors that leak through from upper storeys.
    if (Math.abs(worldBox.min.y - storeyY) > DOOR_STOREY_Y_TOLERANCE) continue
    const size = new THREE.Vector3()
    worldBox.getSize(size)
    // Tighter sanity range — a typical leaf door is 0.7-1.2 m; >2.5 m is
    // almost certainly a stacked / double-swing / wall-segment bbox.
    const bboxWidth = Math.max(size.x, size.z)
    if (bboxWidth < 0.6 || bboxWidth > 2.5) continue
    const center = new THREE.Vector3()
    worldBox.getCenter(center)

    // Recover the door's actual orientation from its geometry transform.
    // `geomData.transform` is the local-to-model matrix; combine with
    // `model.object.matrixWorld` (which `getBoxes` already applied to the
    // bbox) to get the world-space transform. The first column of that
    // matrix is the door's local +X axis in world space — for IFC doors
    // that's the width direction along the wall.
    const itemMeshes = geomDataPerDoor?.[i]
    const localTransform: THREE.Matrix4 | undefined = itemMeshes?.[0]?.transform
    let widthDir: THREE.Vector3
    let swingDir: THREE.Vector3
    if (localTransform) {
      const worldTransform = new THREE.Matrix4()
      if (modelMatrix) worldTransform.copy(modelMatrix)
      worldTransform.multiply(localTransform)
      // Local +X in world space, projected to the horizontal plane.
      widthDir = new THREE.Vector3()
        .setFromMatrixColumn(worldTransform, 0)
        .setY(0)
      if (widthDir.lengthSq() < 1e-6) {
        // Degenerate — door's local X points straight up. Fall back to bbox.
        widthDir = size.x >= size.z
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 0, 1)
      } else {
        widthDir.normalize()
      }
      // Swing direction = 90° rotation of width in the horizontal plane.
      swingDir = new THREE.Vector3(-widthDir.z, 0, widthDir.x)
    } else {
      // No transform available — fall back to the original bbox heuristic
      // (correct for axis-aligned doors, wrong for angled ones).
      const widthAlongX = size.x >= size.z
      widthDir = widthAlongX
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 0, 1)
      swingDir = widthAlongX
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(1, 0, 0)
    }

    // Door width = bbox extent projected onto widthDir. Use abs since the
    // signed projection of (size.x, size.z) along widthDir can be negative.
    const width = Math.abs(size.x * widthDir.x) + Math.abs(size.z * widthDir.z)
    if (width < 0.6 || width > 2.5) continue

    // Hinge sits at one end of the door. Step backward along widthDir by
    // half the width from the center.
    const hinge = new THREE.Vector3()
      .copy(center)
      .addScaledVector(widthDir, -width / 2)

    // Build quarter-arc from angle 0 (closed-door end) → π/2 (perpendicular).
    // `prev` MUST reset per door so segments don't leak between doors.
    let prev: THREE.Vector3 | null = null
    for (let s = 0; s <= DOOR_SWING_SEGMENTS; s++) {
      const t = (s / DOOR_SWING_SEGMENTS) * (Math.PI / 2)
      const point = new THREE.Vector3()
        .copy(hinge)
        .addScaledVector(widthDir, Math.cos(t) * width)
        .addScaledVector(swingDir, Math.sin(t) * width)
      if (prev) {
        verts.push(prev.x, prev.y, prev.z, point.x, point.y, point.z)
      }
      prev = point
    }
    // Straight edge from hinge to swing endpoint (the open-door line).
    const open = new THREE.Vector3()
      .copy(hinge)
      .addScaledVector(swingDir, width)
    verts.push(hinge.x, hinge.y, hinge.z, open.x, open.y, open.z)
    drawnCount++
  }

  if (verts.length === 0) return null

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(new Float32Array(verts), 3),
  )
  const sourceLine = new THREE.LineSegments(geometry)
  const projected = OBC.TechnicalDrawing.toDrawingSpace(sourceLine, drawing)
  drawing.addProjectionLines(projected, DOOR_SWING_LAYER)
  return {
    className: DOOR_SWING_LAYER,
    layerName: DOOR_SWING_LAYER,
    visible: true,
    color: DOOR_SWING_COLOR,
    itemCount: drawnCount,
    displayKey: 'DrawingLayers.doorSwings',
  }
}
