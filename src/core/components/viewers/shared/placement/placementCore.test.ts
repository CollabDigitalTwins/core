// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, it, expect, vi } from 'vitest'

import { DEFAULT_PLACEMENT } from '../pointcloud/pointCloudPlacement'
import { placementToMatrix } from '../pointcloud/pointCloudTransform'

import { PlacementCore } from './placementCore'
import { FULL_PLACEMENT } from './placementTarget'

import type { PlacementGizmo, PlacementState } from './placementCore'
import type { PlacementTarget } from './placementTarget'
import type { PointCloudPlacement } from '../pointcloud/pointCloudPlacement'

function stubGizmo() {
  const gizmo: PlacementGizmo & { attached: THREE.Object3D | null, disposed: number, mode: string } = {
    attached: null,
    disposed: 0,
    mode: 'translate',
    attach(object) { gizmo.attached = object; return true },
    detach() { gizmo.attached = null },
    dispose() { gizmo.disposed++; gizmo.attached = null },
    setMode(mode) { gizmo.mode = mode },
  }
  return gizmo
}

function stubTarget(id = '1') {
  const root = new THREE.Group()
  let placement: PointCloudPlacement = { ...DEFAULT_PLACEMENT }
  placementToMatrix(placement).decompose(root.position, root.quaternion, root.scale)
  const commits: PointCloudPlacement[] = []

  const target: PlacementTarget = {
    id,
    name: `target ${id}`,
    capabilities: FULL_PLACEMENT,
    object: () => root,
    read: () => placement,
    apply: (next) => {
      placement = next
      placementToMatrix(next).decompose(root.position, root.quaternion, root.scale)
    },
    bounds: () => null,
    commit: async (next) => { commits.push(next) },
  }
  return { target, commits, root }
}

describe('PlacementCore without a coordinator', () => {
  it('begins an edit and attaches the gizmo', async () => {
    const gizmo = stubGizmo()
    const core = new PlacementCore()
    core.setup({ createGizmo: () => gizmo })
    const { target, root } = stubTarget()

    expect(await core.begin(target, 'rotate')).toBe(true)
    expect(core.activeId).toBe('1')
    expect(core.mode).toBe('rotate')
    expect(gizmo.attached).toBe(root)
  })

  it('refuses a target with no object', async () => {
    const core = new PlacementCore()
    core.setup({ createGizmo: stubGizmo })
    const { target } = stubTarget()

    expect(await core.begin({ ...target, object: () => null })).toBe(false)
    expect(core.activeId).toBeNull()
  })

  it('commits a changed placement and clears the session', async () => {
    const core = new PlacementCore()
    core.setup({ createGizmo: stubGizmo })
    const { target, commits } = stubTarget()

    await core.begin(target)
    core.setPlacement({ ...DEFAULT_PLACEMENT, position: [4, 0, 2] })
    await core.accept()

    expect(commits).toHaveLength(1)
    expect(commits[0].position).toEqual([4, 0, 2])
    expect(core.activeId).toBeNull()
  })

  it('writes nothing when the placement did not move', async () => {
    const core = new PlacementCore()
    core.setup({ createGizmo: stubGizmo })
    const { target, commits } = stubTarget()

    await core.begin(target)
    await core.accept()

    expect(commits).toEqual([])
  })

  it('restores the snapshot on cancel', async () => {
    const core = new PlacementCore()
    core.setup({ createGizmo: stubGizmo })
    const { target, commits } = stubTarget()

    await core.begin(target)
    core.setPlacement({ ...DEFAULT_PLACEMENT, position: [9, 9, 9] })
    await core.cancel()

    expect(target.read().position).toEqual(DEFAULT_PLACEMENT.position)
    expect(commits).toEqual([])
  })

  it('publishes every change through the injected event', async () => {
    const core = new PlacementCore()
    core.setup({ createGizmo: stubGizmo })
    const seen: (PlacementState | null)[] = []
    core.onChanged.add(state => seen.push(state))
    const { target } = stubTarget()

    await core.begin(target)
    core.setMode('scale')
    await core.accept()

    expect(seen.at(-1)).toBeNull()
    expect(seen.some(s => s?.mode === 'scale')).toBe(true)
  })

  it('reports a failed write instead of claiming a save', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const core = new PlacementCore()
    core.setup({ createGizmo: stubGizmo })
    const committed: PlacementState[] = []
    core.onCommitted.add(state => committed.push(state))
    const { target } = stubTarget()

    await core.begin({ ...target, commit: async () => { throw new Error('offline') } })
    core.setPlacement({ ...DEFAULT_PLACEMENT, position: [1, 0, 0] })
    await core.accept()

    expect(committed).toHaveLength(1)
    expect(committed[0].ok).toBe(false)
    warn.mockRestore()
  })

  it('claims and releases a coordinator when one is supplied', async () => {
    const claim = vi.fn()
    const release = vi.fn()
    const core = new PlacementCore()
    core.setup({ createGizmo: stubGizmo, coordinator: { claim, release } })
    const { target } = stubTarget()

    await core.begin(target)
    expect(claim).toHaveBeenCalledWith(core)
    await core.accept()
    expect(release).toHaveBeenCalledWith(core)
  })
})
