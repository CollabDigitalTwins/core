// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { FULL_PLACEMENT, SCALABLE_OBJECT_PLACEMENT, YAW_ONLY_PLACEMENT, narrowPlacement } from './placementTarget'

import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const placement: PointCloudPlacement = {
  position: [1, 2, 3],
  rotation: [0.4, 0.5, 0.6],
  scale: 2.5,
  sourceUp: 'z',
}

describe('narrowPlacement', () => {
  it('passes a full-capability placement through untouched', () => {
    expect(narrowPlacement(placement, FULL_PLACEMENT)).toEqual(placement)
  })

  it('drops pitch and roll a yaw-only target could not store', () => {
    const narrowed = narrowPlacement(placement, YAW_ONLY_PLACEMENT)

    expect(narrowed.rotation).toEqual([0, 0.5, 0])
  })

  it('drops a scale a yaw-only target could not store', () => {
    expect(narrowPlacement(placement, YAW_ONLY_PLACEMENT).scale).toBe(1)
  })

  it('keeps position for every capability set', () => {
    expect(narrowPlacement(placement, YAW_ONLY_PLACEMENT).position).toEqual([1, 2, 3])
  })

  it('keeps the source up axis, which is not a user control', () => {
    expect(narrowPlacement(placement, YAW_ONLY_PLACEMENT).sourceUp).toBe('z')
  })

  it('narrows scale independently of rotation', () => {
    const narrowed = narrowPlacement(placement, { rotation: 'full', scale: false })

    expect(narrowed.rotation).toEqual([0.4, 0.5, 0.6])
    expect(narrowed.scale).toBe(1)
  })

  it('does not mutate the placement it was given', () => {
    const original = { ...placement, rotation: [0.4, 0.5, 0.6] as [number, number, number] }
    narrowPlacement(original, YAW_ONLY_PLACEMENT)

    expect(original.rotation).toEqual([0.4, 0.5, 0.6])
    expect(original.scale).toBe(2.5)
  })
})

describe('narrowPlacement for a scalable object', () => {
  it('keeps the scale a GLB is allowed to set', () => {
    expect(narrowPlacement(placement, SCALABLE_OBJECT_PLACEMENT).scale).toBe(2.5)
  })

  it('still drops pitch and roll, which have no column', () => {
    expect(narrowPlacement(placement, SCALABLE_OBJECT_PLACEMENT).rotation).toEqual([0, 0.5, 0])
  })
})
