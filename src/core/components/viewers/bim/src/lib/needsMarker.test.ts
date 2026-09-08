// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { MIN_PICKABLE_PX, needsMarker } from './needsMarker'

function camera() {
  const perspective = new THREE.PerspectiveCamera(60, 1, 0.1, 5000)
  perspective.position.set(0, 0, 10)
  perspective.lookAt(0, 0, 0)
  perspective.updateMatrixWorld(true)
  perspective.updateProjectionMatrix()
  return perspective
}

function boxOfSize(size: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size))
  mesh.updateMatrixWorld(true)
  return mesh
}

describe('needsMarker', () => {
  it('needs no marker for something big enough to right-click', () => {
    expect(needsMarker(boxOfSize(5), camera(), 800)).toBe(false)
  })

  it('needs a marker for something too small to hit', () => {
    expect(needsMarker(boxOfSize(0.002), camera(), 800)).toBe(true)
  })

  it('needs a marker for an object with no extent at all', () => {
    expect(needsMarker(new THREE.Group(), camera(), 800)).toBe(true)
  })

  it('needs a marker once the camera is far enough away', () => {
    const far = camera()
    far.position.set(0, 0, 20_000)
    far.updateMatrixWorld(true)

    expect(needsMarker(boxOfSize(1), far, 800)).toBe(true)
  })

  it('stops needing one as the camera closes in', () => {
    const near = camera()
    near.position.set(0, 0, 3)
    near.updateMatrixWorld(true)

    expect(needsMarker(boxOfSize(1), near, 800)).toBe(false)
  })

  it('scales with the viewport, so a small window does not hide the marker', () => {
    const object = boxOfSize(0.05)

    expect(needsMarker(object, camera(), 100)).toBe(true)
  })

  it('exposes the threshold it uses, so callers can reason about it', () => {
    expect(MIN_PICKABLE_PX).toBeGreaterThan(0)
  })
})
