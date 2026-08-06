// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { createUndoHistory } from '../../../../../../utils/undoHistory'
import { CurrentWorld } from '../../CurrentWorld'

import type { UndoHistory } from '../../../../../../utils/undoHistory'

/**
 * Size multiplier of the translucent square that represents a plane. The library
 * default of 5 draws a square wide enough to cover most of a building at normal
 * zoom. Auto-scale stays on, so this is a multiplier on camera distance rather
 * than a size in metres, and the square keeps its proportion to the arrow gizmo.
 */
const PLANE_SIZE = 1.5

const CLASSIFICATION = 'ClipperGroups'

/** Categories grouped for the cut. See the note in {@link ClippingPlanes.setup}. */
const CUT_GROUPS: Record<string, RegExp[]> = {
  Walls: [/WALL/],
  Slabs: [/SLAB/],
  Columns: [/COLUMN/],
  Doors: [/DOOR/],
  Curtains: [/PLATE/, /MEMBER/],
  Windows: [/WINDOW/],
}

/**
 * One clipping plane as this component sees it.
 *
 * The identity is `key`, not the OBC plane id: undoing a delete builds a new
 * `SimplePlane` with a new id, and the history entries close over the record so
 * they keep working across any number of delete/undo cycles.
 */
interface PlaneRecord {
  readonly key: string
  /** Points away from the camera it was created from, so the cut removes the near side. */
  readonly normal: THREE.Vector3
  /** Kept current as the plane is dragged, so a re-spawn lands where the user left it. */
  point: THREE.Vector3
  planeId: string | null
  plane: OBC.SimplePlane | null
  edges: OBF.ClipEdges | null
}

/**
 * Hides the translucent square without touching the arrow gizmo.
 *
 * `plane.visible` and `clipper.visible` would be the obvious route, but that
 * setter also hides `controls.getHelper()` and calls `toggleControls(false)`,
 * which detaches the drag listeners: the section could no longer be moved.
 */
function setSquareVisible(plane: OBC.SimplePlane, visible: boolean): void {
  plane.helper.traverse(child => {
    if (child instanceof THREE.Mesh) child.visible = visible
  })
}

/**
 * Owns every clipping plane in the BIM viewer: creation from the cursor,
 * deletion, the black cut fill, and an undo stack covering all of it.
 *
 * A component rather than a hook because the viewer binds CTRL+Z at the top of
 * the tree, where the toolbar's React state is out of reach — the same reason
 * {@link ElementAppearance} keeps its history here.
 */
export class ClippingPlanes extends OBC.Component implements OBC.Disposable {
  static readonly uuid = 'b7d3c418-5f26-4a91-8c07-1e94a2f6b3d5' as const

  enabled = true

  /** {@link OBC.Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event<string>()

  /**
   * Undo/redo steps for adding, deleting and moving planes. Toggling the squares
   * is deliberately out: it is a view state the tool drives, not a change.
   */
  readonly history: UndoHistory = createUndoHistory()

  private _records = new Map<string, PlaneRecord>()
  private _keySeq = 0
  /** The world {@link setup} ran for, so it runs once rather than per double-click. */
  private _setupWorld: OBC.World | null = null
  private _squaresVisible = true
  private _dragOrigin: THREE.Vector3 | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(ClippingPlanes.uuid, this)
  }

  /**
   * Prepares the Clipper, the cut style and the drag listeners. Idempotent, and
   * cheap to call from an effect: everything here used to run on every
   * double-click, which re-registered the styling listener each time and left
   * orphan cut meshes behind.
   */
  setup(): void {
    const world = this.world
    if (!world || this._setupWorld === world) return
    this._setupWorld = world

    this.components.get(OBC.Raycasters).get(world)

    const styler = this.styler
    styler.world = world
    styler.styles.set('Black', {
      linesMaterial: new LineMaterial({
        color: 'black',
        linewidth: 2,
      }),
      fillsMaterial: new THREE.MeshBasicMaterial({
        color: 0x000000,
        // See the cap from both sides.
        side: THREE.DoubleSide,
      }),
    })

    // Nothing reads these groups yet: the style applied in `spawn` has no
    // classifier input, so it covers every item the plane cuts. They stay
    // because that is the plumbing a per-category cut style would need.
    const finder = this.components.get(OBC.ItemsFinder)
    const classifier = this.components.get(OBC.Classifier)
    for (const [group, categories] of Object.entries(CUT_GROUPS)) {
      finder.create(group, [{ categories }])
      classifier.setGroupQuery(CLASSIFICATION, group, { name: group })
    }

    const clipper = this.clipper
    clipper.enabled = true
    clipper.size = PLANE_SIZE

    clipper.onBeforeDrag.add(this.onBeforeDrag)
    clipper.onAfterDrag.add(this.onAfterDrag)
  }

  /**
   * Adds a plane on the face under the cursor.
   *
   * Silent when the cursor is off the model: the tool's instruction toast is
   * still on screen, and an error toast per missed double-click is noise.
   */
  async createAtCursor(): Promise<void> {
    const world = this.world
    if (!world) return

    const caster = this.components.get(OBC.Raycasters).get(world)

    // `items: []` restricts this to the GPU fragment pick, which reads the
    // front-most pixel under the cursor and honours the planes already in the
    // scene. Left to its default, `castRay` also CPU-raycasts everything in
    // `world.meshes` and keeps whichever hit is nearer — that lets helper meshes
    // win the comparison, and a CPU hit carries a raw geometric face normal with
    // no back-face flip, so the plane could end up cutting the opposite
    // half-space. Between them, that was the "it picks the face behind" report.
    const hit = await caster.castRay({ items: [] })
    const hitNormal = hit?.normal
    if (!hit?.point || !hitNormal) return

    const point = hit.point.clone()

    // The plane normal has to point away from the camera, so the cut always
    // takes what sits between the camera and the clicked face. The pick shader
    // already returns a world-space, front-facing normal; unlike
    // `Clipper.getWorldNormal` this does not re-apply the object's matrix on top,
    // which would skew the normal on a rotated model.
    const cameraPosition = new THREE.Vector3()
    world.camera.three.getWorldPosition(cameraPosition)
    const normal = hitNormal.clone().normalize()
    if (normal.dot(point.clone().sub(cameraPosition)) < 0) normal.negate()

    const record: PlaneRecord = {
      key: `plane-${this._keySeq++}`,
      normal,
      point,
      planeId: null,
      plane: null,
      edges: null,
    }

    if (!this.spawn(record)) return

    this.history.push({
      label: 'Add clipping plane',
      undo: () => this.despawn(record),
      redo: () => {
        this.spawn(record)
      },
    })
  }

  /** Removes the plane under the cursor, if the cursor is over one. */
  deleteAtCursor(): void {
    const world = this.world
    if (!world) return

    // `Clipper.pickPlane` is private, and it would only hand back the plane. The
    // pick happens here so the record — the identity undo closes over — is known.
    // Hidden squares stay pickable: three's raycaster does not test `visible`.
    const owners = new Map<THREE.Object3D, PlaneRecord>()
    for (const candidate of this._records.values()) {
      if (!candidate.plane) continue
      for (const mesh of candidate.plane.meshes) owners.set(mesh, candidate)
    }
    if (owners.size === 0) return

    const hit = this.components.get(OBC.Raycasters).get(world).castRayToObjects([...owners.keys()])
    if (!hit) return

    const record = owners.get(hit.object)
    if (!record) return

    this.despawn(record)
    this.history.push({
      label: 'Delete clipping plane',
      undo: () => {
        this.spawn(record)
      },
      redo: () => this.despawn(record),
    })
  }

  /** Removes every plane, as one undo step. */
  deleteAll(): void {
    const records = [...this._records.values()]
    if (records.length === 0) return

    for (const record of records) this.despawn(record)

    this.history.push({
      label: 'Delete all clipping planes',
      undo: () => {
        for (const record of records) this.spawn(record)
      },
      redo: () => {
        for (const record of records) this.despawn(record)
      },
    })
  }

  /**
   * Shows or hides the translucent squares. The arrow gizmos stay either way, so
   * leaving creation mode does not cost the user the ability to drag a section.
   */
  setSquaresVisible(visible: boolean): void {
    this._squaresVisible = visible
    for (const record of this._records.values()) {
      if (record.plane) setSquareVisible(record.plane, visible)
    }
  }

  /** Steps back one plane change. Resolves false when there is nothing to undo. */
  undo(): Promise<boolean> {
    return this.history.undo()
  }

  /** Re-applies the plane change that was just undone. */
  redo(): Promise<boolean> {
    return this.history.redo()
  }

  /** {@link OBC.Disposable.dispose} */
  dispose(): void {
    if (this._setupWorld) {
      const clipper = this.clipper
      clipper.onBeforeDrag.remove(this.onBeforeDrag)
      clipper.onAfterDrag.remove(this.onAfterDrag)
    }
    // The planes themselves belong to the Clipper, which OBC disposes on its own.
    // Deleting them here would fight that teardown for no gain.
    this._records.clear()
    this.history.clear()
    this._setupWorld = null
    this._dragOrigin = null
    this.onDisposed.trigger(ClippingPlanes.uuid)
    this.onDisposed.reset()
  }

  private get world(): OBC.World | null {
    return this.components.get(CurrentWorld).world
  }

  private get clipper(): OBC.Clipper {
    return this.components.get(OBC.Clipper)
  }

  private get styler(): OBF.ClipStyler {
    return this.components.get(OBF.ClipStyler)
  }

  /** Builds the OBC plane and its cut for a record. False when there is no world. */
  private spawn(record: PlaneRecord): boolean {
    const world = this.world
    if (!world) return false

    // Cloned because `SimplePlane` keeps the vectors it is handed by reference.
    const id = this.clipper.createFromNormalAndCoplanarPoint(
      world,
      record.normal.clone(),
      record.point.clone(),
    )
    const plane = this.clipper.list.get(id)
    if (!plane) return false

    // `createFromNormalAndCoplanarPoint` skips the `clipper.size` that the
    // mouse-driven `create()` applies, so the square would come out at the
    // library default.
    plane.size = PLANE_SIZE
    if (!this._squaresVisible) setSquareVisible(plane, false)

    record.planeId = id
    record.plane = plane
    // Once per plane. `link` defaults to true, which refreshes the cut when a
    // drag ends and disposes it with the plane, so nothing here has to track it.
    record.edges = this.styler.createFromClipping(id, {
      items: { All: { style: 'Black' } },
    })

    this._records.set(record.key, record)
    return true
  }

  private despawn(record: PlaneRecord): void {
    const { planeId } = record
    record.planeId = null
    record.plane = null
    record.edges = null
    this._records.delete(record.key)
    // Clipper's own `onBeforeDelete` disposes the plane, drops it from the
    // renderer, and the linked cut goes with it.
    if (planeId) this.clipper.list.delete(planeId)
  }

  private onBeforeDrag = (plane: OBC.SimplePlane) => {
    this._dragOrigin = plane.helper.position.clone()
  }

  private onAfterDrag = (plane: OBC.SimplePlane) => {
    const from = this._dragOrigin
    this._dragOrigin = null
    if (!from) return

    const record = [...this._records.values()].find(candidate => candidate.plane === plane)
    if (!record) return

    const to = plane.helper.position.clone()
    // A click on the arrow that moves nothing is not a change.
    if (to.distanceToSquared(from) < 1e-8) return

    record.point = to
    this.history.push({
      label: 'Move clipping plane',
      undo: () => this.moveTo(record, from),
      redo: () => this.moveTo(record, to),
    })
  }

  /**
   * Moves a plane to a point already on its normal.
   *
   * Deliberately not `setFromNormalAndCoplanarPoint`: that path calls `reset()`
   * and re-derives the orientation with `lookAt`, which is more than a slide
   * along the normal needs.
   */
  private moveTo(record: PlaneRecord, point: THREE.Vector3): void {
    record.point = point.clone()

    const { plane } = record
    if (!plane) return

    plane.helper.position.copy(point)
    plane.helper.updateMatrix()
    plane.update()
    void record.edges?.update()
  }
}
