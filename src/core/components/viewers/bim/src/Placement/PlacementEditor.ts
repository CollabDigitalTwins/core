// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { PlacementCore } from '../../../shared/placement/placementCore'
import { GizmoController } from '../../utils/GizmoController'
import { pickNearest, SCENE_PICK_WINDOW_PX } from '../lib/scenePicker'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'

import type { PlacementGizmo, PlacementState } from '../../../shared/placement/placementCore'
import type { PlacementEvent } from '../../../shared/placement/placementEvent'
import type { PlacementTarget, PlacementCapabilities, PlacementMode } from '../../../shared/placement/placementTarget'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type { ScenePickSource } from '../lib/scenePicker'
import type { ExclusiveViewTool } from '../lib/ViewModeCoordinator'

export type { PlacementGizmo, PlacementState } from '../../../shared/placement/placementCore'
export type { PlacementMode } from '../../../shared/placement/placementTarget'

export interface PlacementEditorSetup {
  world: OBC.World
  coordinator?: ViewModeCoordinator
  createGizmo?: () => PlacementGizmo
  /** Extra pick sources for the pivot, e.g. point clouds the raycaster cannot see. */
  pickSources?: () => Iterable<ScenePickSource>
  /** Resolves the world point under the cursor. Injected so a session tests without WebGL. */
  pickPoint?: () => Promise<THREE.Vector3 | null>
}

/**
 * The BIM viewer's placement editor: a `PlacementCore` wired to an OBC world, which supplies the
 * raycast the pivot picker needs and the coordinator that keeps one tool on the viewer at a time.
 */
export class PlacementEditor extends OBC.Component implements OBC.Disposable, ExclusiveViewTool {
  static uuid = 'd47b9e2a-3f61-4c8d-b0a5-6e91c72f4d18' as const

  enabled = true

  private readonly core = new PlacementCore(<T,>() => new OBC.Event<T>() as PlacementEvent<T>)

  readonly onChanged = this.core.onChanged as OBC.Event<PlacementState | null>
  readonly onCommitted = this.core.onCommitted as OBC.Event<PlacementState>
  readonly onDisposed = new OBC.Event()

  private pickSources: (() => Iterable<ScenePickSource>) | null = null
  /** Sources that register themselves, so a second kind of object cannot clobber the first. */
  private readonly registeredPickSources = new Set<ScenePickSource>()
  private world: OBC.World | null = null

  constructor(components: OBC.Components) {
    super(components)
    components.add(PlacementEditor.uuid, this)
  }

  setup(config: PlacementEditorSetup) {
    this.world = config.world
    this.pickSources = config.pickSources ?? (() => [])
    this.core.setup({
      coordinator: config.coordinator ?? this.components.get(ViewModeCoordinator),
      createGizmo: config.createGizmo ?? (() => new GizmoController(config.world)),
      pickPoint: config.pickPoint ?? (() => this.pickWorldPointOnDoubleClick()),
    })
  }

  registerPickSource(source: ScenePickSource) {
    this.registeredPickSources.add(source)
  }

  unregisterPickSource(source: ScenePickSource) {
    this.registeredPickSources.delete(source)
  }

  get activeId(): string | null { return this.core.activeId }

  get activeTarget(): PlacementTarget | null { return this.core.activeTarget }

  get mode(): PlacementMode { return this.core.mode }

  get capabilities(): PlacementCapabilities | null { return this.core.capabilities }

  get pivot(): THREE.Vector3 | null { return this.core.pivot }

  placement(): PointCloudPlacement | null { return this.core.placement() }

  setPivot(point: THREE.Vector3 | null) { this.core.setPivot(point) }

  pickPivot(): Promise<boolean> { return this.core.pickPivot() }

  begin(target: PlacementTarget, mode: PlacementMode = 'translate'): Promise<boolean> {
    return this.core.begin(target, mode)
  }

  setMode(mode: PlacementMode) { this.core.setMode(mode) }

  setPlacement(placement: PointCloudPlacement) { this.core.setPlacement(placement) }

  centreOnOrigin() { this.core.centreOnOrigin() }

  accept(): Promise<void> { return this.core.accept() }

  cancel(): Promise<void> { return this.core.cancel() }

  /** {@link ExclusiveViewTool} — another tool took the viewer, so keep the edit and let go. */
  deactivate() { this.core.deactivate() }

  dispose() {
    this.core.dispose()
    this.onDisposed.trigger()
    this.onDisposed.reset()
  }

  private pickWorldPointOnDoubleClick(): Promise<THREE.Vector3 | null> {
    const canvas = this.world?.renderer?.three.domElement
    if (!canvas) return Promise.resolve(null)

    const restoreCursor = canvas.style.cursor
    canvas.style.cursor = 'crosshair'

    return new Promise((resolve) => {
      const done = (point: THREE.Vector3 | null) => {
        canvas.style.cursor = restoreCursor
        canvas.removeEventListener('dblclick', onDoubleClick)
        window.removeEventListener('keydown', onKeyDown)
        resolve(point)
      }
      const onDoubleClick = () => { void this.castAtCursor().then(done) }
      const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') done(null) }

      canvas.addEventListener('dblclick', onDoubleClick)
      window.addEventListener('keydown', onKeyDown)
    })
  }

  /** Nearest of the fragment snap and any extra pick source under the cursor. */
  private async castAtCursor(): Promise<THREE.Vector3 | null> {
    const world = this.world
    if (!world) return null

    const caster = this.components.get(OBC.Raycasters).get(world)
    const camera = world.camera.three

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(caster.mouse.position, camera)
    const sources = [...(this.pickSources?.() ?? []), ...this.registeredPickSources]
    const sceneHit = pickNearest(sources, raycaster.ray, camera, SCENE_PICK_WINDOW_PX)

    const fragmentHit = (await caster.castRay({ items: [] }))?.point ?? null
    if (!sceneHit) return fragmentHit
    if (!fragmentHit) return sceneHit.point

    return raycaster.ray.origin.distanceTo(fragmentHit) <= sceneHit.distance ? fragmentHit : sceneHit.point
  }
}
