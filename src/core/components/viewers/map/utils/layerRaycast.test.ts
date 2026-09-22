// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { hitTestLayerScene, ndcOfEvent } from './layerRaycast'

function sceneWithBoxAt(x: number) {
  const scene = new THREE.Scene()
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial())
  box.position.set(x, 0, 0)
  box.updateMatrixWorld(true)
  scene.add(box)
  return scene
}

/** A camera whose projectionMatrix is the combined VP*M a custom layer writes each frame. */
function layerCamera() {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  camera.projectionMatrix.multiply(camera.matrixWorldInverse)
  return camera
}

describe('hitTestLayerScene', () => {
  it('hits what the pointer is over', () => {
    expect(hitTestLayerScene(layerCamera(), sceneWithBoxAt(0), 0, 0)).toBe(true)
  })

  it('misses when the pointer is off the object', () => {
    expect(hitTestLayerScene(layerCamera(), sceneWithBoxAt(0), 0.95, 0.95)).toBe(false)
  })

  it('misses an empty scene rather than claiming a hit', () => {
    expect(hitTestLayerScene(layerCamera(), new THREE.Scene(), 0, 0)).toBe(false)
  })

  it('answers false when the layer has not drawn a frame yet', () => {
    expect(hitTestLayerScene(null, sceneWithBoxAt(0), 0, 0)).toBe(false)
    expect(hitTestLayerScene(layerCamera(), null, 0, 0)).toBe(false)
  })
})

describe('ndcOfEvent', () => {
  it('puts the centre of the canvas at the origin', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 } as DOMRect

    expect(ndcOfEvent({ clientX: 100, clientY: 50 }, rect)).toEqual({ ndcX: 0, ndcY: 0 })
  })

  it('reads the top-left corner as (-1, 1), y up', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 } as DOMRect

    expect(ndcOfEvent({ clientX: 0, clientY: 0 }, rect)).toEqual({ ndcX: -1, ndcY: 1 })
  })

  it('accounts for a canvas that does not start at the page origin', () => {
    const rect = { left: 40, top: 20, width: 200, height: 100 } as DOMRect

    expect(ndcOfEvent({ clientX: 140, clientY: 70 }, rect)).toEqual({ ndcX: 0, ndcY: 0 })
  })
})
