// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    handlers = new Set<(arg: T) => void>()
    add(handler: (arg: T) => void) { this.handlers.add(handler) }
    remove(handler: (arg: T) => void) { this.handlers.delete(handler) }
    trigger(arg?: T) { for (const handler of [...this.handlers]) handler(arg as T) }
    reset() { this.handlers.clear() }
  }
  class Component { constructor(public components: unknown) { } }
  class Components {
    private instances = new Map<string, unknown>()
    add(uuid: string, instance: unknown) { this.instances.set(uuid, instance) }
    get<T>(Ctor: { uuid: string; new(components: Components): T }): T {
      return (this.instances.get(Ctor.uuid) as T) ?? new Ctor(this)
    }
  }
  return { Component, Components, Event }
})

import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'
import { placementToMatrix } from '../../../shared/pointcloud/pointCloudTransform'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'

import { PointCloudAlignment } from './PointCloudAlignment'

import type { AlignmentGizmo } from './PointCloudAlignment'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type { LoadedPointCloud } from '../../../shared/pointcloud/pointCloudRegistry'

function stubGizmo() {
  const gizmo: AlignmentGizmo & { attached: THREE.Object3D | null; disposed: number; mode: string } = {
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

function stubClouds() {
  const roots = new Map<string, LoadedPointCloud>()
  const refreshes = { count: 0 }

  const make = (id: string): LoadedPointCloud => {
    const root = new THREE.Group()
    const cloud = { id, root, octree: new THREE.Object3D(), placement: { ...DEFAULT_PLACEMENT } } as LoadedPointCloud
    placementToMatrix(cloud.placement).decompose(root.position, root.quaternion, root.scale)
    return cloud
  }

  for (const id of ['669', '670']) roots.set(id, make(id))

  return {
    refreshes,
    get: (id: string) => roots.get(id),
    setPlacement: (id: string, placement: PointCloudPlacement) => {
      const cloud = roots.get(id)
      if (!cloud) return
      cloud.placement = placement
      placementToMatrix(placement).decompose(cloud.root.position, cloud.root.quaternion, cloud.root.scale)
    },
    refresh: () => { refreshes.count++ },
  }
}

function setUp(picked: THREE.Vector3 | null = null) {
  const gizmo = stubGizmo()
  const clouds = stubClouds()
  const components = new OBC.Components()
  const coordinator = components.get(ViewModeCoordinator)
  const alignment = components.get(PointCloudAlignment)
  const picks = { count: 0 }
  alignment.setup({
    world: {} as never,
    clouds,
    coordinator,
    createGizmo: () => gizmo,
    pickPoint: async () => { picks.count++; return picked },
  })
  return { alignment, gizmo, clouds, coordinator, picks }
}

describe('PointCloudAlignment', () => {
  it('attaches the gizmo to the cloud root and claims the exclusive slot', async () => {
    const { alignment, gizmo, clouds } = setUp()

    await alignment.begin('669')

    expect(gizmo.attached).toBe(clouds.get('669')?.root)
    expect(alignment.activeId).toBe('669')
  })

  it('refuses an id it does not know', async () => {
    const { alignment, gizmo } = setUp()

    await alignment.begin('nope')

    expect(gizmo.attached).toBeNull()
    expect(alignment.activeId).toBeNull()
  })

  it('publishes the dragged transform and wakes the renderer', async () => {
    const { alignment, gizmo, clouds } = setUp()
    const changed = vi.fn()
    alignment.onChanged.add(changed)
    await alignment.begin('669')

    clouds.get('669')!.root.position.set(1, 2, 3)
    gizmo.onChange?.()

    expect(alignment.placement()?.position).toEqual([1, 2, 3])
    expect(clouds.get('669')?.placement.position).toEqual([1, 2, 3])
    expect(changed).toHaveBeenCalled()
    expect(clouds.refreshes.count).toBeGreaterThan(0)
  })

  it('moves the cloud when the numeric panel sets a placement', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')

    alignment.setPlacement({ ...DEFAULT_PLACEMENT, position: [4, 0, 0] })

    expect(clouds.get('669')?.root.position.x).toBe(4)
    expect(alignment.placement()?.position).toEqual([4, 0, 0])
  })

  it('reverts to the placement it started from on cancel', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPlacement({ ...DEFAULT_PLACEMENT, position: [9, 9, 9] })

    alignment.cancel()

    expect(clouds.get('669')?.root.position.toArray()).toEqual([0, 0, 0])
    expect(alignment.activeId).toBeNull()
  })

  it('keeps the edit on accept', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPlacement({ ...DEFAULT_PLACEMENT, position: [9, 9, 9] })

    alignment.accept()

    expect(clouds.get('669')?.root.position.toArray()).toEqual([9, 9, 9])
    expect(alignment.activeId).toBeNull()
  })

  it('announces the committed placement on accept, so it can be persisted', async () => {
    const { alignment } = setUp()
    const committed = vi.fn()
    alignment.onCommitted.add(committed)
    await alignment.begin('669')
    alignment.setPlacement({ ...DEFAULT_PLACEMENT, position: [7, 0, 0] })

    alignment.accept()

    expect(committed).toHaveBeenCalledWith(expect.objectContaining({ id: '669', placement: expect.objectContaining({ position: [7, 0, 0] }) }))
  })

  it('commits the reverted placement on cancel, so a revert is saved too', async () => {
    const { alignment } = setUp()
    const committed = vi.fn()
    await alignment.begin('669')
    alignment.setPlacement({ ...DEFAULT_PLACEMENT, position: [7, 0, 0] })
    alignment.onCommitted.add(committed)

    alignment.cancel()

    expect(committed).toHaveBeenCalledWith(expect.objectContaining({ id: '669', placement: expect.objectContaining({ position: [0, 0, 0] }) }))
  })

  it('announces the end of a session with a null change', async () => {
    const { alignment } = setUp()
    const changed = vi.fn()
    await alignment.begin('669')
    alignment.onChanged.add(changed)

    alignment.accept()

    expect(changed).toHaveBeenLastCalledWith(null)
  })

  it('keeps the first cloud where the user left it when switching to another', async () => {
    const { alignment, clouds, gizmo } = setUp()
    await alignment.begin('669')
    alignment.setPlacement({ ...DEFAULT_PLACEMENT, position: [5, 0, 0] })

    await alignment.begin('670')

    expect(clouds.get('669')?.root.position.x).toBe(5)
    expect(gizmo.attached).toBe(clouds.get('670')?.root)
  })

  it('ends the session when another tool claims the viewer', async () => {
    const { alignment, coordinator, gizmo } = setUp()
    await alignment.begin('669')

    await coordinator.claim({ deactivate: () => {} })

    expect(gizmo.attached).toBeNull()
    expect(alignment.activeId).toBeNull()
  })

  it('ends a live session when the world is set up again', async () => {
    const { alignment, gizmo, clouds, coordinator } = setUp()
    await alignment.begin('669')

    alignment.setup({ world: {} as never, clouds, coordinator, createGizmo: () => gizmo })

    expect(alignment.activeId).toBeNull()
    expect(gizmo.attached).toBeNull()
  })

  it('disposes the gizmo it created', async () => {
    const { alignment, gizmo } = setUp()
    await alignment.begin('669')

    alignment.dispose()

    expect(gizmo.disposed).toBe(1)
    expect(alignment.activeId).toBeNull()
  })
})

describe('PointCloudAlignment pivot', () => {
  const FAR = new THREE.Vector3(500_000, 4_000_000, 100)
  const yaw = (radians: number): PointCloudPlacement => ({
    ...DEFAULT_PLACEMENT,
    sourceUp: 'y',
    rotation: [0, radians, 0],
  })

  it('turns about the cloud origin until a pivot is chosen', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')

    alignment.setPlacement(yaw(Math.PI / 4))

    expect(clouds.get('669')?.placement.position).toEqual([0, 0, 0])
  })

  it('holds a chosen pivot still through a rotation', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    alignment.setPlacement(yaw(Math.PI / 4))

    const placement = clouds.get('669')?.placement as PointCloudPlacement
    const where = FAR.clone().applyMatrix4(placementToMatrix(placement))
    expect(where.distanceTo(FAR)).toBeLessThan(1e-6)
  })

  it('holds it still through a scale change', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    alignment.setPlacement({ ...DEFAULT_PLACEMENT, sourceUp: 'y', scale: 3 })

    const placement = clouds.get('669')?.placement as PointCloudPlacement
    const where = FAR.clone().applyMatrix4(placementToMatrix(placement))
    expect(where.distanceTo(FAR)).toBeLessThan(1e-6)
  })

  it('still moves the cloud plainly when the user drags position', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    alignment.setPlacement({ ...DEFAULT_PLACEMENT, sourceUp: 'y', position: [5, 6, 7] })

    expect(clouds.get('669')?.placement.position).toEqual([5, 6, 7])
  })

  it('goes back to the cloud origin when the pivot is cleared', async () => {
    const { alignment, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)
    alignment.setPivot(null)

    alignment.setPlacement(yaw(Math.PI / 4))

    expect(alignment.pivot).toBeNull()
    expect(clouds.get('669')?.placement.position).toEqual([0, 0, 0])
  })

  it('publishes the pivot, so the card can show one is set', async () => {
    const { alignment } = setUp()
    const changed = vi.fn()
    await alignment.begin('669')
    alignment.onChanged.add(changed)

    alignment.setPivot(FAR)

    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ pivot: expect.anything() }))
    expect(alignment.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('hands out a copy, so a caller cannot move the pivot behind its back', async () => {
    const { alignment } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    alignment.pivot?.setScalar(0)

    expect(alignment.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('takes the point under the cursor', async () => {
    const { alignment, picks } = setUp(FAR)
    await alignment.begin('669')

    expect(await alignment.pickPivot()).toBe(true)
    expect(picks.count).toBe(1)
    expect(alignment.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('keeps the pivot it had when the cursor is over nothing', async () => {
    const { alignment } = setUp(null)
    await alignment.begin('669')
    alignment.setPivot(FAR)

    expect(await alignment.pickPivot()).toBe(false)
    expect(alignment.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('does not pick outside a session', async () => {
    const { alignment, picks } = setUp(FAR)

    expect(await alignment.pickPivot()).toBe(false)
    expect(picks.count).toBe(0)
  })

  it('forgets the pivot when the session ends, so the next cloud starts clean', async () => {
    const { alignment } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    alignment.accept()
    await alignment.begin('669')

    expect(alignment.pivot).toBeNull()
  })
})

describe('PointCloudAlignment pivot gizmo', () => {
  const FAR = new THREE.Vector3(500_000, 4_000_000, 100)

  it('keeps the handles on the cloud root until a pivot is chosen', async () => {
    const { alignment, gizmo, clouds } = setUp()

    await alignment.begin('669')

    expect(gizmo.attached).toBe(clouds.get('669')?.root)
  })

  it('moves the handles onto the picked point', async () => {
    const { alignment, gizmo } = setUp()
    await alignment.begin('669')

    alignment.setPivot(FAR)

    expect(gizmo.attached).not.toBe(null)
    expect(gizmo.attached?.position.toArray()).toEqual(FAR.toArray())
  })

  it('puts the handles back on the cloud when the pivot is cleared', async () => {
    const { alignment, gizmo, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    alignment.setPivot(null)

    expect(gizmo.attached).toBe(clouds.get('669')?.root)
  })

  it('turns the cloud about the picked point when the handles are dragged', async () => {
    const { alignment, gizmo, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    const proxy = gizmo.attached as THREE.Object3D
    proxy.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0))
    gizmo.onChange?.()

    const placement = clouds.get('669')?.placement as PointCloudPlacement
    const where = FAR.clone().applyMatrix4(placementToMatrix(placement))
    expect(where.distanceTo(FAR)).toBeLessThan(1e-6)
    expect(placement.rotation[1]).toBeCloseTo(Math.PI / 4)
  })

  it('takes the proxy out of the scene when the session ends', async () => {
    const { alignment, gizmo } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)
    const proxy = gizmo.attached as THREE.Object3D

    alignment.accept()

    expect(proxy.parent).toBeNull()
  })

  it('re-bases the proxy after a panel edit, so the next drag does not double-apply it', async () => {
    const { alignment, gizmo, clouds } = setUp()
    await alignment.begin('669')
    alignment.setPivot(FAR)

    alignment.setPlacement({ ...DEFAULT_PLACEMENT, sourceUp: 'y', rotation: [0, Math.PI / 4, 0] })
    const proxy = gizmo.attached as THREE.Object3D
    expect(proxy.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0)

    proxy.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0))
    gizmo.onChange?.()

    const placement = clouds.get('669')?.placement as PointCloudPlacement
    expect(placement.rotation[1]).toBeCloseTo(Math.PI / 2)
  })
})

describe('PointCloudAlignment gizmo mode', () => {
  const FAR = new THREE.Vector3(500_000, 4_000_000, 100)

  it('starts a session in move mode', async () => {
    const { alignment, gizmo } = setUp()

    await alignment.begin('669')

    expect(gizmo.mode).toBe('translate')
  })

  it('keeps the chosen mode when a pivot rebuilds the gizmo', async () => {
    const { alignment, gizmo } = setUp()
    await alignment.begin('669')
    alignment.setMode('rotate')

    alignment.setPivot(FAR)

    expect(gizmo.mode).toBe('rotate')
  })

  it('keeps it when the pivot is cleared again', async () => {
    const { alignment, gizmo } = setUp()
    await alignment.begin('669')
    alignment.setMode('scale')
    alignment.setPivot(FAR)

    alignment.setPivot(null)

    expect(gizmo.mode).toBe('scale')
  })

  it('goes back to move for the next cloud, matching the card', async () => {
    const { alignment, gizmo } = setUp()
    await alignment.begin('669')
    alignment.setMode('rotate')
    alignment.accept()

    await alignment.begin('669')

    expect(gizmo.mode).toBe('translate')
  })
})
