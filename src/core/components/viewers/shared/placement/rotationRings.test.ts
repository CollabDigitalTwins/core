// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { completeRotationRings, FULL_TURN } from './rotationRings'

const ring = (arc: number) => new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.0075, 3, 64, arc))

describe('completeRotationRings', () => {
  it('closes a half ring into a full circle', () => {
    const root = new THREE.Object3D().add(ring(Math.PI))

    completeRotationRings(root)

    const geometry = (root.children[0] as THREE.Mesh).geometry as THREE.TorusGeometry
    expect(geometry.parameters.arc).toBeCloseTo(FULL_TURN, 9)
  })

  it('keeps the radius and thickness the gizmo was drawn with', () => {
    const root = new THREE.Object3D().add(ring(Math.PI))

    completeRotationRings(root)

    const { radius, tube } = ((root.children[0] as THREE.Mesh).geometry as THREE.TorusGeometry).parameters
    expect(radius).toBe(0.5)
    expect(tube).toBe(0.0075)
  })

  it('leaves a ring that is already whole alone, so the picker torus is untouched', () => {
    const whole = ring(FULL_TURN)
    const before = whole.geometry
    completeRotationRings(new THREE.Object3D().add(whole))

    expect(whole.geometry).toBe(before)
  })

  it('leaves the plane the ring was drawn in', () => {
    const half = ring(Math.PI)
    half.geometry.rotateY(Math.PI / 2)
    half.geometry.rotateX(Math.PI / 2)
    const spanBefore = new THREE.Box3().setFromBufferAttribute(half.geometry.attributes.position as THREE.BufferAttribute)

    completeRotationRings(new THREE.Object3D().add(half))

    const spanAfter = new THREE.Box3().setFromBufferAttribute(half.geometry.attributes.position as THREE.BufferAttribute)
    expect(spanAfter.max.y - spanAfter.min.y).toBeCloseTo(spanBefore.max.y - spanBefore.min.y, 3)
  })
})
