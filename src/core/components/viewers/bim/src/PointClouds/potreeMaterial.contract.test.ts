// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { applyAppearance, applyRenderState, DEFAULT_APPEARANCE } from '../../../shared/pointcloud/pointCloudAppearance'

import { applyClippingPlanes } from './pointCloudClipping'

import type { PointCloudMaterialLike } from '../../../shared/pointcloud/pointCloudLoader'

async function realMaterial() {
  const { PointCloudMaterial } = await import('potree-core')
  const material = new PointCloudMaterial({ newFormat: true })
  return material as unknown as PointCloudMaterialLike & { vertexShader: string }
}

const defines = (material: { vertexShader: string }) =>
  material.vertexShader.split('\n').filter((line) => line.startsWith('#define'))

describe('potree-core material contract', () => {
  it('compiles the clipping block once planes are applied', async () => {
    const material = await realMaterial()

    applyClippingPlanes(material, [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)])

    expect(defines(material)).toContain('#define use_clip_plane')
    expect(defines(material)).toContain('#define clip_outside')
  })

  it('compiles the clipping block back out when the last plane goes', async () => {
    const material = await realMaterial()
    applyClippingPlanes(material, [new THREE.Plane()])

    applyClippingPlanes(material, [])

    expect(defines(material)).not.toContain('#define use_clip_plane')
  })

  it('turns the material transparent when the appearance asks for opacity', async () => {
    const material = await realMaterial()

    applyAppearance(material, { ...DEFAULT_APPEARANCE, opacity: 0.4 })

    expect(material.opacity).toBe(0.4)
    expect(material.transparent).toBe(true)
  })

  it('keeps a translucent cloud blending normally and behind the model', async () => {
    const material = await realMaterial()

    applyAppearance(material, { ...DEFAULT_APPEARANCE, opacity: 0.4 })

    expect(material.blending).toBe(THREE.NormalBlending)
    expect(material.depthTest).toBe(true)
  })

  it('leaves a fully opaque cloud opaque', async () => {
    const material = await realMaterial()

    applyAppearance(material, { ...DEFAULT_APPEARANCE, opacity: 1 })

    expect(material.transparent).toBe(false)
    expect(material.blending).toBe(THREE.NormalBlending)
  })

  it('a clipping change does not put a translucent cloud back into splat mode', async () => {
    const material = await realMaterial()
    applyAppearance(material, { ...DEFAULT_APPEARANCE, opacity: 0.4 })

    applyClippingPlanes(material, [new THREE.Plane()])
    applyRenderState(material, { ...DEFAULT_APPEARANCE, opacity: 0.4 })

    expect(material.blending).toBe(THREE.NormalBlending)
    expect(material.depthTest).toBe(true)
  })

  it('writes RGB colour through without an encoding conversion', async () => {
    const material = await realMaterial()

    applyAppearance(material, DEFAULT_APPEARANCE)

    expect(defines(material)).toContain('#define color_type_rgb')
    expect(defines(material)).toContain('#define input_color_encoding_sRGB')
    expect(defines(material)).toContain('#define output_color_encoding_sRGB')
  })
})
