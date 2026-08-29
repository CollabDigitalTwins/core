// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  applyClippingPlanes,
  CLIP_MODE_DISABLED,
  CLIP_MODE_OUTSIDE,
  MAX_CLIP_PLANES,
} from './pointCloudClipping'

import type { PointCloudMaterialLike } from '../../../shared/pointcloud/pointCloudLoader'

type TestMaterial = PointCloudMaterialLike & { rebuilds: { synced: number; rebuilt: number } }

function stubMaterial(): TestMaterial {
  const material: TestMaterial = {
    rebuilds: { synced: 0, rebuilt: 0 },
    size: 1,
    minSize: 2,
    maxSize: 12,
    pointSizeType: 2,
    pointColorType: 0,
    shape: 1,
    inputColorEncoding: 1,
    outputColorEncoding: 1,
    opacity: 1,
    transparent: false,
    blending: 0,
    depthTest: true,
    clippingPlanes: [new THREE.Plane()],
    clipMode: CLIP_MODE_OUTSIDE,
    needsUpdate: false,
    syncClippingPlanes: () => { material.rebuilds.synced++ },
    updateShaderSource: () => { material.rebuilds.rebuilt++ },
  }
  return material
}

function planes(count: number) {
  return Array.from({ length: count }, (_, index) => new THREE.Plane(new THREE.Vector3(0, 1, 0), index))
}

describe('applyClippingPlanes', () => {
  it('turns clipping off when no planes are active', () => {
    const material = stubMaterial()

    applyClippingPlanes(material, [])

    expect(material.clippingPlanes).toEqual([])
    expect(material.clipMode).toBe(CLIP_MODE_DISABLED)
  })

  it('passes world planes straight through', () => {
    const material = stubMaterial()
    const active = planes(2)

    applyClippingPlanes(material, active)

    expect(material.clippingPlanes).toEqual(active)
    expect(material.clipMode).toBe(CLIP_MODE_OUTSIDE)
  })

  it('never hands the shader more planes than its uniform array holds', () => {
    const material = stubMaterial()

    applyClippingPlanes(material, planes(MAX_CLIP_PLANES + 5))

    expect(material.clippingPlanes).toHaveLength(MAX_CLIP_PLANES)
  })

  it('rebuilds the shader after the plane count lands, not before', () => {
    const material = stubMaterial()

    applyClippingPlanes(material, planes(1))

    expect(material.rebuilds.synced).toBe(1)
    expect(material.rebuilds.rebuilt).toBe(1)
  })

  it('copies the list so a later renderer mutation cannot reach the shader', () => {
    const material = stubMaterial()
    const active = planes(1)

    applyClippingPlanes(material, active)
    active.push(new THREE.Plane())

    expect(material.clippingPlanes).toHaveLength(1)
  })
})
