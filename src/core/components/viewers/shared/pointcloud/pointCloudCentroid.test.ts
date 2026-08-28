// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { centroidOrBoxCentre, placementCentredOn, weightedCentroid } from './pointCloudCentroid'
import { DEFAULT_PLACEMENT } from './pointCloudPlacement'

const node = (numPoints: number, min: number, max: number) => ({
  numPoints,
  boundingBox: new THREE.Box3(new THREE.Vector3(min, min, min), new THREE.Vector3(max, max, max)),
})

describe('weightedCentroid', () => {
  it('is the centre of a single node', () => {
    expect(weightedCentroid([node(100, 0, 10)])?.toArray()).toEqual([5, 5, 5])
  })

  it('leans towards where the points actually are', () => {
    const centroid = weightedCentroid([node(1000, 0, 2), node(1000, 8, 10)])

    expect(centroid?.x).toBeCloseTo(5)
  })

  it('is not dragged by a stray node holding almost no points', () => {
    const centroid = weightedCentroid([node(1_000_000, 0, 10), node(3, 900, 1000)])

    expect(centroid?.x).toBeLessThan(10)
  })

  it('is nothing when no node carries points yet', () => {
    expect(weightedCentroid([])).toBeNull()
    expect(weightedCentroid([node(0, 0, 10)])).toBeNull()
  })

  it('skips nodes with no usable box rather than counting them as the origin', () => {
    const centroid = weightedCentroid([{ numPoints: 500 }, { numPoints: 500, boundingBox: new THREE.Box3() }, node(500, 0, 10)])

    expect(centroid?.toArray()).toEqual([5, 5, 5])
  })
})

describe('centroidOrBoxCentre', () => {
  it('prefers the weighted centroid', () => {
    const box = new THREE.Box3(new THREE.Vector3(-100, -100, -100), new THREE.Vector3(100, 100, 100))

    expect(centroidOrBoxCentre([node(100, 0, 10)], box)?.toArray()).toEqual([5, 5, 5])
  })

  it('falls back to the box before anything has streamed in', () => {
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 4, 4))

    expect(centroidOrBoxCentre([], box)?.toArray()).toEqual([2, 2, 2])
  })

  it('is nothing when there is no box either', () => {
    expect(centroidOrBoxCentre([], undefined)).toBeNull()
    expect(centroidOrBoxCentre([], new THREE.Box3())).toBeNull()
  })
})

describe('placementCentredOn', () => {
  it('shifts the position so the centre lands on the origin', () => {
    const placement = { ...DEFAULT_PLACEMENT, position: [0, 0, 0] as [number, number, number] }

    const centred = placementCentredOn(placement, new THREE.Vector3(500, 20, -300))

    expect(centred.position).toEqual([-500, -20, 300])
  })

  it('accounts for where the cloud already sits', () => {
    const placement = { ...DEFAULT_PLACEMENT, position: [10, 10, 10] as [number, number, number] }

    const centred = placementCentredOn(placement, new THREE.Vector3(510, 30, -290))

    expect(centred.position).toEqual([-500, -20, 300])
  })

  it('leaves rotation, scale and up axis alone', () => {
    const placement = {
      position: [1, 2, 3] as [number, number, number],
      rotation: [0.1, 0.2, 0.3] as [number, number, number],
      scale: 2,
      sourceUp: 'z' as const,
    }

    const centred = placementCentredOn(placement, new THREE.Vector3(5, 5, 5))

    expect(centred.rotation).toEqual(placement.rotation)
    expect(centred.scale).toBe(2)
    expect(centred.sourceUp).toBe('z')
  })

  it('is a no-op for a cloud already centred', () => {
    const placement = { ...DEFAULT_PLACEMENT, position: [7, 0, 0] as [number, number, number] }

    expect(placementCentredOn(placement, new THREE.Vector3(0, 0, 0)).position).toEqual([7, 0, 0])
  })
})
