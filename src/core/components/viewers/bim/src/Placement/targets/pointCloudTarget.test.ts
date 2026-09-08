// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_PLACEMENT } from '../../../../shared/pointcloud/pointCloudPlacement'
import { PLACEMENT_VERSION } from '../../PointClouds/pointCloudPlacementStore'

import { pointCloudTarget } from './pointCloudTarget'

import type { PointCloudPlacement } from '../../../../shared/pointcloud/pointCloudPlacement'

function stubClouds(placement: PointCloudPlacement = { ...DEFAULT_PLACEMENT }) {
  const root = new THREE.Group()
  const state = { placement, refreshes: 0, centroid: new THREE.Vector3(1, 2, 3) }

  return {
    state,
    root,
    get: (id: string) => (id === '669' ? { id, root, placement: state.placement } : undefined),
    setPlacement: (_id: string, next: PointCloudPlacement) => { state.placement = next },
    refresh: () => { state.refreshes++ },
    worldCentroid: () => state.centroid,
  }
}

describe('pointCloudTarget', () => {
  it('can save a full transform, because the JSON blob holds one', () => {
    const clouds = stubClouds()
    const target = pointCloudTarget({ id: '669', name: 'scan', clouds: clouds as never, updateFile: vi.fn() })

    expect(target.capabilities).toEqual({ rotation: 'full', scale: true })
  })

  it('reads the placement the registry holds', () => {
    const clouds = stubClouds({ ...DEFAULT_PLACEMENT, position: [4, 5, 6] })
    const target = pointCloudTarget({ id: '669', name: 'scan', clouds: clouds as never, updateFile: vi.fn() })

    expect(target.read().position).toEqual([4, 5, 6])
  })

  it('moves the cloud and refreshes the renderer on apply', () => {
    const clouds = stubClouds()
    const target = pointCloudTarget({ id: '669', name: 'scan', clouds: clouds as never, updateFile: vi.fn() })

    target.apply({ ...DEFAULT_PLACEMENT, position: [7, 0, 0] })

    expect(clouds.state.placement.position).toEqual([7, 0, 0])
    expect(clouds.state.refreshes).toBeGreaterThan(0)
  })

  it('offers the cloud root as the gizmo target', () => {
    const clouds = stubClouds()
    const target = pointCloudTarget({ id: '669', name: 'scan', clouds: clouds as never, updateFile: vi.fn() })

    expect(target.object()).toBe(clouds.root)
  })

  it('has no object for a cloud that is not loaded', () => {
    const clouds = stubClouds()
    const target = pointCloudTarget({ id: 'gone', name: 'scan', clouds: clouds as never, updateFile: vi.fn() })

    expect(target.object()).toBeNull()
  })

  it('centres on the cloud centroid', () => {
    const clouds = stubClouds()
    const target = pointCloudTarget({ id: '669', name: 'scan', clouds: clouds as never, updateFile: vi.fn() })

    expect(target.bounds()?.toArray()).toEqual([1, 2, 3])
  })

  it('commits the versioned transform blob', async () => {
    const clouds = stubClouds()
    const updateFile = vi.fn().mockResolvedValue(undefined)
    const target = pointCloudTarget({ id: '669', name: 'scan', clouds: clouds as never, updateFile })

    await target.commit({ ...DEFAULT_PLACEMENT, position: [1, 1, 1], scale: 2 })

    expect(updateFile).toHaveBeenCalledWith({
      pointCloudTransform: expect.objectContaining({
        version: PLACEMENT_VERSION,
        position: [1, 1, 1],
        scale: 2,
      }),
    })
  })
  it('skips the write when nothing actually moved', async () => {
    const clouds = stubClouds()
    const updateFile = vi.fn().mockResolvedValue(undefined)
    const stored = { ...DEFAULT_PLACEMENT, position: [1, 1, 1] as [number, number, number] }
    const target = pointCloudTarget({
      id: '669', name: 'scan', clouds: clouds as never, updateFile, storedPlacement: () => stored,
    })

    await target.commit({ ...stored })

    expect(updateFile).not.toHaveBeenCalled()
  })

  it('writes when the placement differs from what is stored', async () => {
    const clouds = stubClouds()
    const updateFile = vi.fn().mockResolvedValue(undefined)
    const target = pointCloudTarget({
      id: '669', name: 'scan', clouds: clouds as never, updateFile,
      storedPlacement: () => ({ ...DEFAULT_PLACEMENT }),
    })

    await target.commit({ ...DEFAULT_PLACEMENT, position: [2, 0, 0] })

    expect(updateFile).toHaveBeenCalled()
  })
})
