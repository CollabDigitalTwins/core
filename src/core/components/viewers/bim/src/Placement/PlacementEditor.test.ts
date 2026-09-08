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

import { PlacementEditor } from './PlacementEditor'
import { FULL_PLACEMENT, YAW_ONLY_PLACEMENT } from './placementTarget'

import type { PlacementGizmo } from './PlacementEditor'
import type { PlacementTarget } from './placementTarget'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'
import type { LoadedPointCloud } from '../../../shared/pointcloud/pointCloudRegistry'

function stubGizmo() {
  const gizmo: PlacementGizmo & { attached: THREE.Object3D | null; disposed: number; mode: string } = {
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

function stubTargets() {
  const entries = new Map<string, { root: THREE.Group; placement: PointCloudPlacement; commits: PointCloudPlacement[] }>()
  const refreshes = { count: 0 }

  const make = () => {
    const root = new THREE.Group()
    const placement = { ...DEFAULT_PLACEMENT }
    placementToMatrix(placement).decompose(root.position, root.quaternion, root.scale)
    return { root, placement, commits: [] as PointCloudPlacement[] }
  }

  for (const id of ['669', '670']) entries.set(id, make())

  const target = (id: string, capabilities = FULL_PLACEMENT, centre: THREE.Vector3 | null = null): PlacementTarget => ({
    id,
    name: `target ${id}`,
    capabilities,
    object: () => entries.get(id)?.root ?? null,
    read: () => entries.get(id)!.placement,
    apply: (placement) => {
      const entry = entries.get(id)
      if (!entry) return
      entry.placement = placement
      placementToMatrix(placement).decompose(entry.root.position, entry.root.quaternion, entry.root.scale)
      refreshes.count++
    },
    bounds: () => centre,
    commit: async (placement) => { entries.get(id)?.commits.push(placement) },
  })

  const detached = (): PlacementTarget => ({
    ...target('nope'),
    object: () => null,
  })

  return { refreshes, get: (id: string) => entries.get(id), target, detached }
}

function setUp(picked: THREE.Vector3 | null = null) {
  const gizmo = stubGizmo()
  const targets = stubTargets()
  const components = new OBC.Components()
  const coordinator = components.get(ViewModeCoordinator)
  const editor = components.get(PlacementEditor)
  const picks = { count: 0 }
  const handles = { '669': targets.target('669'), '670': targets.target('670') }
  editor.setup({
    world: {} as never,
    coordinator,
    createGizmo: () => gizmo,
    pickPoint: async () => { picks.count++; return picked },
  })
  const begin = (id: '669' | '670') => editor.begin(handles[id])
  return { editor, gizmo, targets, coordinator, picks, begin, handles }
}

describe('PlacementEditor', () => {
  it('attaches the gizmo to the cloud root and claims the exclusive slot', async () => {
    const { editor, gizmo, targets, begin } = setUp()

    await begin('669')

    expect(gizmo.attached).toBe(targets.get('669')?.root)
    expect(editor.activeId).toBe('669')
  })

  it('refuses a target whose object is not in the scene', async () => {
    const { editor, gizmo, targets } = setUp()

    await editor.begin(targets.detached())

    expect(gizmo.attached).toBeNull()
    expect(editor.activeId).toBeNull()
  })

  it('publishes the dragged transform and wakes the renderer', async () => {
    const { editor, gizmo, targets, begin } = setUp()
    const changed = vi.fn()
    editor.onChanged.add(changed)
    await begin('669')

    targets.get('669')!.root.position.set(1, 2, 3)
    gizmo.onChange?.()

    expect(editor.placement()?.position).toEqual([1, 2, 3])
    expect(targets.get('669')?.placement.position).toEqual([1, 2, 3])
    expect(changed).toHaveBeenCalled()
    expect(targets.refreshes.count).toBeGreaterThan(0)
  })

  it('moves the cloud when the numeric panel sets a placement', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')

    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [4, 0, 0] })

    expect(targets.get('669')?.root.position.x).toBe(4)
    expect(editor.placement()?.position).toEqual([4, 0, 0])
  })

  it('reverts to the placement it started from on cancel', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [9, 9, 9] })

    editor.cancel()

    expect(targets.get('669')?.root.position.toArray()).toEqual([0, 0, 0])
    expect(editor.activeId).toBeNull()
  })

  it('keeps the edit on accept', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [9, 9, 9] })

    editor.accept()

    expect(targets.get('669')?.root.position.toArray()).toEqual([9, 9, 9])
    expect(editor.activeId).toBeNull()
  })

  it('announces the committed placement on accept, so it can be persisted', async () => {
    const { editor, begin } = setUp()
    const committed = vi.fn()
    editor.onCommitted.add(committed)
    await begin('669')
    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [7, 0, 0] })

    editor.accept()

    expect(committed).toHaveBeenCalledWith(expect.objectContaining({ id: '669', placement: expect.objectContaining({ position: [7, 0, 0] }) }))
  })

  it('commits the reverted placement on cancel, so a revert is saved too', async () => {
    const { editor, begin } = setUp()
    const committed = vi.fn()
    await begin('669')
    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [7, 0, 0] })
    editor.onCommitted.add(committed)

    editor.cancel()

    expect(committed).toHaveBeenCalledWith(expect.objectContaining({ id: '669', placement: expect.objectContaining({ position: [0, 0, 0] }) }))
  })

  it('announces the end of a session with a null change', async () => {
    const { editor, begin } = setUp()
    const changed = vi.fn()
    await begin('669')
    editor.onChanged.add(changed)

    editor.accept()

    expect(changed).toHaveBeenLastCalledWith(null)
  })

  it('keeps the first cloud where the user left it when switching to another', async () => {
    const { editor, targets, gizmo, begin } = setUp()
    await begin('669')
    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [5, 0, 0] })

    await begin('670')

    expect(targets.get('669')?.root.position.x).toBe(5)
    expect(gizmo.attached).toBe(targets.get('670')?.root)
  })

  it('ends the session when another tool claims the viewer', async () => {
    const { editor, coordinator, gizmo, begin } = setUp()
    await begin('669')

    await coordinator.claim({ deactivate: () => {} })

    expect(gizmo.attached).toBeNull()
    expect(editor.activeId).toBeNull()
  })

  it('ends a live session when the world is set up again', async () => {
    const { editor, gizmo, targets, coordinator, begin } = setUp()
    await begin('669')

    editor.setup({ world: {} as never, coordinator, createGizmo: () => gizmo })

    expect(editor.activeId).toBeNull()
    expect(gizmo.attached).toBeNull()
  })

  it('disposes the gizmo it created', async () => {
    const { editor, gizmo, begin } = setUp()
    await begin('669')

    editor.dispose()

    expect(gizmo.disposed).toBe(1)
    expect(editor.activeId).toBeNull()
  })
})

describe('PlacementEditor pivot', () => {
  const FAR = new THREE.Vector3(500_000, 4_000_000, 100)
  const yaw = (radians: number): PointCloudPlacement => ({
    ...DEFAULT_PLACEMENT,
    sourceUp: 'y',
    rotation: [0, radians, 0],
  })

  it('turns about the cloud origin until a pivot is chosen', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')

    editor.setPlacement(yaw(Math.PI / 4))

    expect(targets.get('669')?.placement.position).toEqual([0, 0, 0])
  })

  it('holds a chosen pivot still through a rotation', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    editor.setPlacement(yaw(Math.PI / 4))

    const placement = targets.get('669')?.placement as PointCloudPlacement
    const where = FAR.clone().applyMatrix4(placementToMatrix(placement))
    expect(where.distanceTo(FAR)).toBeLessThan(1e-6)
  })

  it('holds it still through a scale change', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    editor.setPlacement({ ...DEFAULT_PLACEMENT, sourceUp: 'y', scale: 3 })

    const placement = targets.get('669')?.placement as PointCloudPlacement
    const where = FAR.clone().applyMatrix4(placementToMatrix(placement))
    expect(where.distanceTo(FAR)).toBeLessThan(1e-6)
  })

  it('still moves the cloud plainly when the user drags position', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    editor.setPlacement({ ...DEFAULT_PLACEMENT, sourceUp: 'y', position: [5, 6, 7] })

    expect(targets.get('669')?.placement.position).toEqual([5, 6, 7])
  })

  it('goes back to the cloud origin when the pivot is cleared', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)
    editor.setPivot(null)

    editor.setPlacement(yaw(Math.PI / 4))

    expect(editor.pivot).toBeNull()
    expect(targets.get('669')?.placement.position).toEqual([0, 0, 0])
  })

  it('publishes the pivot, so the card can show one is set', async () => {
    const { editor, begin } = setUp()
    const changed = vi.fn()
    await begin('669')
    editor.onChanged.add(changed)

    editor.setPivot(FAR)

    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ pivot: expect.anything() }))
    expect(editor.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('hands out a copy, so a caller cannot move the pivot behind its back', async () => {
    const { editor, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    editor.pivot?.setScalar(0)

    expect(editor.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('takes the point under the cursor', async () => {
    const { editor, picks, begin } = setUp(FAR)
    await begin('669')

    expect(await editor.pickPivot()).toBe(true)
    expect(picks.count).toBe(1)
    expect(editor.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('keeps the pivot it had when the cursor is over nothing', async () => {
    const { editor, begin } = setUp(null)
    await begin('669')
    editor.setPivot(FAR)

    expect(await editor.pickPivot()).toBe(false)
    expect(editor.pivot?.toArray()).toEqual(FAR.toArray())
  })

  it('does not pick outside a session', async () => {
    const { editor, picks, begin } = setUp(FAR)

    expect(await editor.pickPivot()).toBe(false)
    expect(picks.count).toBe(0)
  })

  it('forgets the pivot when the session ends, so the next cloud starts clean', async () => {
    const { editor, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    editor.accept()
    await begin('669')

    expect(editor.pivot).toBeNull()
  })
})

describe('PlacementEditor pivot gizmo', () => {
  const FAR = new THREE.Vector3(500_000, 4_000_000, 100)

  it('keeps the handles on the cloud root until a pivot is chosen', async () => {
    const { editor, gizmo, targets, begin } = setUp()

    await begin('669')

    expect(gizmo.attached).toBe(targets.get('669')?.root)
  })

  it('moves the handles onto the picked point', async () => {
    const { editor, gizmo, begin } = setUp()
    await begin('669')

    editor.setPivot(FAR)

    expect(gizmo.attached).not.toBe(null)
    expect(gizmo.attached?.position.toArray()).toEqual(FAR.toArray())
  })

  it('puts the handles back on the cloud when the pivot is cleared', async () => {
    const { editor, gizmo, targets, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    editor.setPivot(null)

    expect(gizmo.attached).toBe(targets.get('669')?.root)
  })

  it('turns the cloud about the picked point when the handles are dragged', async () => {
    const { editor, gizmo, targets, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    const proxy = gizmo.attached as THREE.Object3D
    proxy.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0))
    gizmo.onChange?.()

    const placement = targets.get('669')?.placement as PointCloudPlacement
    const where = FAR.clone().applyMatrix4(placementToMatrix(placement))
    expect(where.distanceTo(FAR)).toBeLessThan(1e-6)
    expect(placement.rotation[1]).toBeCloseTo(Math.PI / 4)
  })

  it('takes the proxy out of the scene when the session ends', async () => {
    const { editor, gizmo, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)
    const proxy = gizmo.attached as THREE.Object3D

    editor.accept()

    expect(proxy.parent).toBeNull()
  })

  it('re-bases the proxy after a panel edit, so the next drag does not double-apply it', async () => {
    const { editor, gizmo, targets, begin } = setUp()
    await begin('669')
    editor.setPivot(FAR)

    editor.setPlacement({ ...DEFAULT_PLACEMENT, sourceUp: 'y', rotation: [0, Math.PI / 4, 0] })
    const proxy = gizmo.attached as THREE.Object3D
    expect(proxy.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0)

    proxy.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0))
    gizmo.onChange?.()

    const placement = targets.get('669')?.placement as PointCloudPlacement
    expect(placement.rotation[1]).toBeCloseTo(Math.PI / 2)
  })
})

describe('PlacementEditor gizmo mode', () => {
  const FAR = new THREE.Vector3(500_000, 4_000_000, 100)

  it('starts a session in move mode', async () => {
    const { editor, gizmo, begin } = setUp()

    await begin('669')

    expect(gizmo.mode).toBe('translate')
  })

  it('keeps the chosen mode when a pivot rebuilds the gizmo', async () => {
    const { editor, gizmo, begin } = setUp()
    await begin('669')
    editor.setMode('rotate')

    editor.setPivot(FAR)

    expect(gizmo.mode).toBe('rotate')
  })

  it('keeps it when the pivot is cleared again', async () => {
    const { editor, gizmo, begin } = setUp()
    await begin('669')
    editor.setMode('scale')
    editor.setPivot(FAR)

    editor.setPivot(null)

    expect(gizmo.mode).toBe('scale')
  })

  it('goes back to move for the next cloud, matching the card', async () => {
    const { editor, gizmo, begin } = setUp()
    await begin('669')
    editor.setMode('rotate')
    editor.accept()

    await begin('669')

    expect(gizmo.mode).toBe('translate')
  })
})

describe('PlacementEditor capabilities', () => {
  const full: PointCloudPlacement = {
    ...DEFAULT_PLACEMENT,
    rotation: [0.3, 0.7, 0.2],
    scale: 4,
  }

  it('stores only yaw for a target that cannot save pitch or roll', async () => {
    const { editor, targets } = setUp()
    await editor.begin(targets.target('669', YAW_ONLY_PLACEMENT))

    editor.setPlacement(full)

    expect(targets.get('669')?.placement.rotation).toEqual([0, 0.7, 0])
  })

  it('stores no scale for a target that cannot save one', async () => {
    const { editor, targets } = setUp()
    await editor.begin(targets.target('669', YAW_ONLY_PLACEMENT))

    editor.setPlacement(full)

    expect(targets.get('669')?.placement.scale).toBe(1)
  })

  it('keeps the full transform for a target that can save one', async () => {
    const { editor, targets } = setUp()
    await editor.begin(targets.target('669', FULL_PLACEMENT))

    editor.setPlacement(full)

    expect(targets.get('669')?.placement.rotation).toEqual([0.3, 0.7, 0.2])
    expect(targets.get('669')?.placement.scale).toBe(4)
  })

  it('publishes the capabilities, so the card can hide what cannot be saved', async () => {
    const { editor, targets } = setUp()
    const changed = vi.fn()
    editor.onChanged.add(changed)

    await editor.begin(targets.target('669', YAW_ONLY_PLACEMENT))

    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ capabilities: YAW_ONLY_PLACEMENT }))
  })
})

describe('PlacementEditor persistence', () => {
  it('hands the accepted placement to the target to store', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [7, 8, 9] })

    editor.accept()

    expect(targets.get('669')?.commits).toEqual([expect.objectContaining({ position: [7, 8, 9] })])
  })

  it('stores the reverted placement on cancel, so a revert is saved too', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')
    editor.setPlacement({ ...DEFAULT_PLACEMENT, position: [7, 8, 9] })

    editor.cancel()

    expect(targets.get('669')?.commits).toEqual([expect.objectContaining({ position: [0, 0, 0] })])
  })

  it('narrows what it stores to what the target can hold', async () => {
    const { editor, targets } = setUp()
    const yawOnly = targets.target('669', YAW_ONLY_PLACEMENT)
    await editor.begin(yawOnly)
    editor.setPlacement({ ...DEFAULT_PLACEMENT, rotation: [0.3, 0.7, 0.2], scale: 4 })

    editor.accept()

    expect(targets.get('669')?.commits[0]).toEqual(expect.objectContaining({ rotation: [0, 0.7, 0], scale: 1 }))
  })

  it('stores nothing when there was no session', () => {
    const { editor, targets } = setUp()

    editor.accept()

    expect(targets.get('669')?.commits).toEqual([])
  })
})

describe('PlacementEditor centre on origin', () => {
  it('moves the target so its own centre sits on the world origin', async () => {
    const { editor, targets } = setUp()
    await editor.begin(targets.target('669', FULL_PLACEMENT, new THREE.Vector3(10, 0, -4)))

    editor.centreOnOrigin()

    expect(targets.get('669')?.placement.position).toEqual([-10, 0, 4])
  })

  it('does nothing for a target that cannot report its bounds', async () => {
    const { editor, targets, begin } = setUp()
    await begin('669')

    editor.centreOnOrigin()

    expect(targets.get('669')?.placement.position).toEqual([0, 0, 0])
  })
})

describe('PlacementEditor opening mode', () => {
  it('starts in the mode the caller asked for, not the one attach resets to', async () => {
    const { editor, gizmo, handles } = setUp()

    await editor.begin(handles['669'], 'rotate')

    expect(gizmo.mode).toBe('rotate')
  })

  it('opens in scale when asked', async () => {
    const { editor, gizmo, handles } = setUp()

    await editor.begin(handles['669'], 'scale')

    expect(gizmo.mode).toBe('scale')
  })

  it('still defaults to move', async () => {
    const { editor, gizmo, begin } = setUp()

    await begin('669')

    expect(gizmo.mode).toBe('translate')
  })

  it('publishes the mode, so the card cannot disagree with the gizmo', async () => {
    const { editor, handles } = setUp()
    const changed = vi.fn()
    editor.onChanged.add(changed)

    await editor.begin(handles['669'], 'rotate')

    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ mode: 'rotate' }))
  })

  it('publishes a later mode change too', async () => {
    const { editor, begin } = setUp()
    await begin('669')
    const changed = vi.fn()
    editor.onChanged.add(changed)

    editor.setMode('scale')

    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ mode: 'scale' }))
  })

  it('keeps the asked-for mode when a pivot rebuilds the gizmo', async () => {
    const { editor, gizmo, handles } = setUp()
    await editor.begin(handles['669'], 'rotate')

    editor.setPivot(new THREE.Vector3(1, 2, 3))

    expect(gizmo.mode).toBe('rotate')
  })
})

describe('PlacementEditor proportional scaling', () => {
  it('follows a Y-handle drag, which the gizmo writes to that axis alone', async () => {
    const { editor, gizmo, targets, begin } = setUp()
    await begin('669')
    editor.setMode('scale')

    const root = gizmo.attached as THREE.Object3D
    root.scale.set(1, 3, 1)
    gizmo.onChange?.()

    expect(targets.get('669')?.placement.scale).toBe(3)
  })

  it('follows a Z-handle drag too', async () => {
    const { editor, gizmo, targets, begin } = setUp()
    await begin('669')
    editor.setMode('scale')

    const root = gizmo.attached as THREE.Object3D
    root.scale.set(1, 1, 0.5)
    gizmo.onChange?.()

    expect(targets.get('669')?.placement.scale).toBe(0.5)
  })

  it('leaves the object uniformly scaled, never stretched on one axis', async () => {
    const { gizmo, targets, begin } = setUp()
    await begin('669')

    const root = gizmo.attached as THREE.Object3D
    root.scale.set(1, 4, 1)
    gizmo.onChange?.()

    const scaled = targets.get('669')!.root.scale
    expect([scaled.x, scaled.y, scaled.z]).toEqual([4, 4, 4])
  })
})
