// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { betterPick, ndcFromPointer, pickNearest, SCENE_PICK_WINDOW_PX } from './scenePicker'

import type { ScenePickSource } from './scenePicker'

const camera = new THREE.PerspectiveCamera()
const ray = new THREE.Ray(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1))

const sourceAt = (...points: (THREE.Vector3 | null)[]): ScenePickSource => {
  const queue = [...points]
  return { pick: () => { const point = queue.shift() ?? null; return point ? { point } : null } }
}

describe('pickNearest', () => {
  it('returns nothing when no source hits', () => {
    expect(pickNearest([sourceAt(null), sourceAt(null)], ray, camera, SCENE_PICK_WINDOW_PX)).toBeNull()
  })

  it('returns nothing when there are no sources', () => {
    expect(pickNearest([], ray, camera, SCENE_PICK_WINDOW_PX)).toBeNull()
  })

  it('reports the hit with its distance from the ray origin', () => {
    const pick = pickNearest([sourceAt(new THREE.Vector3(0, 0, -4))], ray, camera, SCENE_PICK_WINDOW_PX)

    expect(pick?.point.toArray()).toEqual([0, 0, -4])
    expect(pick?.distance).toBeCloseTo(4)
  })

  it('takes the nearest across sources regardless of their order', () => {
    const near = new THREE.Vector3(0, 0, -2)
    const far = new THREE.Vector3(0, 0, -9)

    expect(pickNearest([sourceAt(far), sourceAt(near)], ray, camera, 17)?.point).toBe(near)
    expect(pickNearest([sourceAt(near), sourceAt(far)], ray, camera, 17)?.point).toBe(near)
  })

  it('passes the ray, camera and threshold through to every source', () => {
    const pick = vi.fn(() => null)

    pickNearest([{ pick }, { pick }], ray, camera, 23)

    expect(pick).toHaveBeenCalledTimes(2)
    expect(pick).toHaveBeenCalledWith(ray, camera, 23)
  })

  it('ignores a source that throws, so one bad engine cannot break measuring', () => {
    const throwing: ScenePickSource = { pick: () => { throw new Error('no gl') } }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })

    const pick = pickNearest([throwing, sourceAt(new THREE.Vector3(0, 0, -3))], ray, camera, 17)

    expect(pick?.distance).toBeCloseTo(3)
    warn.mockRestore()
  })
})

describe('betterPick', () => {
  const candidate = { point: new THREE.Vector3(0, 0, -3), distance: 3 }

  it('is nothing when there is no candidate', () => {
    expect(betterPick(null, null, ray)).toBeNull()
  })

  it('takes the candidate when nothing was picked', () => {
    expect(betterPick(null, candidate, ray)).toBe(candidate)
    expect(betterPick({ distance: 1 }, candidate, ray)).toBe(candidate)
  })

  it('takes the candidate when it sits in front of the existing pick', () => {
    expect(betterPick({ point: new THREE.Vector3(0, 0, -8), distance: 8 }, candidate, ray)).toBe(candidate)
  })

  it('keeps the existing pick when that is the nearer one', () => {
    expect(betterPick({ point: new THREE.Vector3(0, 0, -1), distance: 1 }, candidate, ray)).toBeNull()
  })

  it('keeps the existing pick when the two are the same depth', () => {
    expect(betterPick({ point: new THREE.Vector3(0, 0, -3), distance: 3 }, candidate, ray)).toBeNull()
  })

  it('measures the existing pick off the ray when it carries no distance', () => {
    expect(betterPick({ point: new THREE.Vector3(0, 0, -1) }, candidate, ray)).toBeNull()
    expect(betterPick({ point: new THREE.Vector3(0, 0, -8) }, candidate, ray)).toBe(candidate)
  })
})

describe('ndcFromPointer', () => {
  const rect = { left: 100, top: 50, width: 800, height: 400 }

  it('puts the centre of the viewport at the origin', () => {
    expect(ndcFromPointer(500, 250, rect)?.toArray()).toEqual([0, 0])
  })

  it('puts the corners at the unit square, y flipped for screen space', () => {
    expect(ndcFromPointer(100, 50, rect)?.toArray()).toEqual([-1, 1])
    expect(ndcFromPointer(900, 450, rect)?.toArray()).toEqual([1, -1])
  })

  it('reports nothing for a collapsed viewport rather than dividing by zero', () => {
    expect(ndcFromPointer(0, 0, { left: 0, top: 0, width: 0, height: 400 })).toBeNull()
    expect(ndcFromPointer(0, 0, { left: 0, top: 0, width: 800, height: 0 })).toBeNull()
  })
})
