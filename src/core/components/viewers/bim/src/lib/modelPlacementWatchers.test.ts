// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { ModelPlacementWatchers, placementChange } from './modelPlacementWatchers'

const placed = (x: number, z: number, yaw = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1))

describe('placementChange', () => {
  it('moves plan points with a moved model', () => {
    const change = placementChange('m', placed(0, 0), placed(3, -2))
    expect(change.rotated).toBe(false)
    const point = change.mapPoint({ x: 1, z: 1 })
    expect(point.x).toBeCloseTo(4)
    expect(point.z).toBeCloseTo(-1)
  })

  it('turns plan points about the model origin with a turned model', () => {
    const change = placementChange('m', placed(5, 5), placed(5, 5, Math.PI / 2))
    expect(change.rotated).toBe(true)
    const point = change.mapPoint({ x: 6, z: 5 })
    expect(point.x).toBeCloseTo(5)
    expect(point.z).toBeCloseTo(4)
  })
})

describe('ModelPlacementWatchers', () => {
  const watchers = () => new ModelPlacementWatchers(new OBC.Components())

  it('turns without asking when no plugin has data on the model', async () => {
    const registry = watchers()
    const ask = vi.fn(async () => false)
    registry.setTurnConfirmer(ask)
    registry.watch({ turnWarning: () => null, onPlacementChanged: vi.fn() })

    expect(await registry.confirmTurn('m')).toBe(true)
    expect(ask).not.toHaveBeenCalled()
  })

  it('asks with every plugin warning and honours the answer', async () => {
    const registry = watchers()
    const ask = vi.fn(async () => false)
    registry.setTurnConfirmer(ask)
    registry.watch({ turnWarning: () => '3 spaces', onPlacementChanged: vi.fn() })

    expect(await registry.confirmTurn('Tower')).toBe(false)
    expect(ask).toHaveBeenCalledWith({ modelName: 'Tower', warnings: ['3 spaces'] })
  })

  it('tells watchers about a change until they stop watching', async () => {
    const registry = watchers()
    const onPlacementChanged = vi.fn()
    const stop = registry.watch({ turnWarning: () => null, onPlacementChanged })

    await registry.notify('m', placed(0, 0), placed(1, 0))
    stop()
    await registry.notify('m', placed(1, 0), placed(2, 0))

    expect(onPlacementChanged).toHaveBeenCalledOnce()
  })
})
