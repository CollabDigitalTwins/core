// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { PlacementCore } from '../../../shared/placement/placementCore'
import { SCALABLE_OBJECT_PLACEMENT } from '../../../shared/placement/placementTarget'

import { createMapGizmoFactory, mapToolCoordinator, rollbackOnFailure } from './useMapPlacementSession'

import type { PlacementTarget } from '../../../shared/placement/placementTarget'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const root = new THREE.Object3D()

const targetFor = (capabilities = SCALABLE_OBJECT_PLACEMENT): PlacementTarget => {
  let placement: PointCloudPlacement = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1, sourceUp: 'y' }
  return {
    id: '7',
    name: 'tower.glb',
    capabilities,
    object: () => root,
    read: () => placement,
    apply: vi.fn((next: PointCloudPlacement) => { placement = next }),
    bounds: () => null,
    commit: vi.fn().mockResolvedValue(undefined),
  }
}

const deps = () => ({
  layer: { subject: () => root, camera: () => null, domElement: () => null, scene: () => null, setDragging: vi.fn() },
  map: {} as never,
  anchor: () => ({ lng: 0, lat: 0, elevation: 0 }),
  onDragTo: vi.fn(),
  capabilities: () => SCALABLE_OBJECT_PLACEMENT,
})

describe('createMapGizmoFactory', () => {
  it('builds a WebGL gizmo for a target that can rotate', () => {
    const gizmo = createMapGizmoFactory(deps())()
    expect(typeof gizmo.setMode).toBe('function')
    expect((gizmo as { isAttached?: () => boolean }).isAttached).toBeTypeOf('function')
  })

  it('builds the DOM gizmo for a move-only target', () => {
    const gizmo = createMapGizmoFactory({ ...deps(), capabilities: () => ({ rotation: 'yaw' as const, scale: false, moveOnly: true }) })()
    expect((gizmo as { isAttached?: () => boolean }).isAttached).toBeUndefined()
  })
})

describe('mapToolCoordinator', () => {
  it('drops whatever tool is active when a placement claims the viewer', () => {
    const dispatch = vi.fn()

    void mapToolCoordinator(dispatch).claim({ deactivate: vi.fn() })

    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR-TOOLS' })
  })

  it('leaves the toolbar alone when the placement lets go', () => {
    const dispatch = vi.fn()

    mapToolCoordinator(dispatch).release({ deactivate: vi.fn() })

    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('rollbackOnFailure', () => {
  it('restores the preview when the commit did not reach storage', async () => {
    const core = new PlacementCore()
    const restore = vi.fn()
    const stop = rollbackOnFailure(core, restore)

    const target = targetFor()
    target.commit = vi.fn().mockRejectedValue(new Error('offline'))
    core.setup({ createGizmo: () => ({ attach: () => true, detach: vi.fn(), dispose: vi.fn(), setMode: vi.fn() }) })
    await core.begin(target, 'translate')
    core.setPlacement({ position: [5, 0, 0], rotation: [0, 0, 0], scale: 1, sourceUp: 'y' })
    await core.accept()

    expect(restore).toHaveBeenCalledTimes(1)
    stop()
  })

  it('leaves the preview alone when the commit succeeded', async () => {
    const core = new PlacementCore()
    const restore = vi.fn()
    const stop = rollbackOnFailure(core, restore)

    core.setup({ createGizmo: () => ({ attach: () => true, detach: vi.fn(), dispose: vi.fn(), setMode: vi.fn() }) })
    await core.begin(targetFor(), 'translate')
    core.setPlacement({ position: [5, 0, 0], rotation: [0, 0, 0], scale: 1, sourceUp: 'y' })
    await core.accept()

    expect(restore).not.toHaveBeenCalled()
    stop()
  })
})
