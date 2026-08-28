// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPotreeEngine, pointCloudMaterial } from './pointCloudLoader'

const loadPointCloud = vi.fn()

vi.mock('potree-core', () => ({
  Potree: class {
    pointBudget = 0
    loadPointCloud = loadPointCloud
    updatePointClouds = () => ({ numVisiblePoints: 0, exceededMaxLoadsToGPU: false })
  },
}))

function stubOctree() {
  return {
    material: {
      size: 0,
      minSize: 0,
      maxSize: 0,
      pointSizeType: 0,
      pointColorType: 9,
      shape: 0,
      inputColorEncoding: 1,
      outputColorEncoding: 0,
      clippingPlanes: null,
      needsUpdate: false,
    },
  }
}

describe('createPotreeEngine', () => {
  beforeEach(() => {
    loadPointCloud.mockReset()
  })

  it('leaves the shader colour encodings matched so RGB is written through untouched', async () => {
    const octree = stubOctree()
    loadPointCloud.mockResolvedValue(octree)

    const loaded = await createPotreeEngine().load('metadata.json', 'https://pc/1/')
    const material = pointCloudMaterial(loaded)

    expect(material.outputColorEncoding).toBe(material.inputColorEncoding)
  })

  it('applies the RGB, adaptive, circular default style', async () => {
    loadPointCloud.mockResolvedValue(stubOctree())

    const material = pointCloudMaterial(await createPotreeEngine().load('metadata.json', 'https://pc/1/'))

    expect(material.pointColorType).toBe(0)
    expect(material.pointSizeType).toBe(2)
    expect(material.shape).toBe(1)
    expect(material.needsUpdate).toBe(true)
  })
})
