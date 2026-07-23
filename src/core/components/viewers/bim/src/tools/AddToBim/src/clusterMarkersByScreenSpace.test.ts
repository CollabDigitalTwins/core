// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, it, expect, beforeEach } from 'vitest'

import { clusterMarkersByScreenSpace } from './clusterMarkersByScreenSpace'

const W = 800
const H = 800

function makeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 1000)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0) // looks down -z toward the origin
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  return camera
}

describe('clusterMarkersByScreenSpace', () => {
  let camera: THREE.PerspectiveCamera

  beforeEach(() => {
    camera = makeCamera()
  })

  it('returns nothing for an empty input', () => {
    const { clusters, singles } = clusterMarkersByScreenSpace([], camera, W, H)
    expect(clusters).toEqual([])
    expect(singles).toEqual([])
  })

  it('groups markers that project to the same screen point into one cluster', () => {
    const items = [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: 0, y: 0, z: 0 },
      { id: 3, x: 0, y: 0, z: 0 },
    ]
    const { clusters, singles } = clusterMarkersByScreenSpace(items, camera, W, H)
    expect(singles).toEqual([])
    expect(clusters).toHaveLength(1)
    expect(clusters[0].members.map((m) => m.id)).toEqual([1, 2, 3])
    // Key is derived from sorted member ids
    expect(clusters[0].key).toBe('1-2-3')
  })

  it('keeps well-separated markers as singles', () => {
    const items = [
      { id: 1, x: -4, y: 0, z: 0 },
      { id: 2, x: 4, y: 0, z: 0 },
    ]
    const { clusters, singles } = clusterMarkersByScreenSpace(items, camera, W, H)
    expect(clusters).toEqual([])
    expect(singles.map((s) => s.id).sort()).toEqual([1, 2])
  })

  it('treats markers behind the camera as singles (not clustered)', () => {
    const items = [
      { id: 1, x: 0, y: 0, z: 0 },   // in front
      { id: 2, x: 0, y: 0, z: 20 },  // behind the camera (camera at z=10 facing -z)
    ]
    const { clusters, singles } = clusterMarkersByScreenSpace(items, camera, W, H)
    expect(clusters).toEqual([])
    expect(singles.map((s) => s.id).sort()).toEqual([1, 2])
  })

  it('ignores items without complete 3D coordinates', () => {
    const items = [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: null, y: 0, z: 0 },
      { id: 3, x: 0, y: undefined, z: 0 },
    ]
    const { clusters, singles } = clusterMarkersByScreenSpace(items as any, camera, W, H)
    expect(clusters).toEqual([])
    expect(singles.map((s) => s.id)).toEqual([1])
  })

  it('computes the world center as the average of member positions', () => {
    const items = [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: 0.01, y: 0.02, z: 0 },
    ]
    const { clusters } = clusterMarkersByScreenSpace(items, camera, W, H)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].worldCenter.x).toBeCloseTo(0.005)
    expect(clusters[0].worldCenter.y).toBeCloseTo(0.01)
    expect(clusters[0].worldCenter.z).toBeCloseTo(0)
  })
})
