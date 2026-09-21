// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MercatorCoordinate } from 'maplibre-gl'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMapGizmoLayer, MAP_GIZMO_LAYER_ID } from './MapGizmoLayer'

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof THREE>('three')
  return { ...actual, WebGLRenderer: vi.fn(function () { return { resetState: vi.fn(), render: vi.fn(), dispose: vi.fn() } }) }
})

const ANCHOR = { lng: -75.695, lat: 45.42, elevation: 0 }

const canvas = () => ({ getContext: () => ({}) }) as unknown as HTMLCanvasElement

function fakeMap() {
  return {
    getCanvas: vi.fn(canvas),
    triggerRepaint: vi.fn(),
    dragPan: { enable: vi.fn(), disable: vi.fn() },
    dragRotate: { enable: vi.fn(), disable: vi.fn() },
  }
}

describe('createMapGizmoLayer', () => {
  let map: ReturnType<typeof fakeMap>
  let layer: ReturnType<typeof createMapGizmoLayer>

  beforeEach(() => {
    map = fakeMap()
    layer = createMapGizmoLayer(() => ANCHOR)
    layer.onAdd(map as never, {} as WebGLRenderingContext)
  })

  it('is a 3d custom layer with a stable id', () => {
    expect(layer.id).toBe(MAP_GIZMO_LAYER_ID)
    expect(layer.type).toBe('custom')
    expect(layer.renderingMode).toBe('3d')
  })

  it('exposes the canvas, scene and camera the shared gizmo host needs', () => {
    expect(layer.domElement()).toBeTruthy()
    expect(layer.scene()).toBeInstanceOf(THREE.Object3D)
    expect(layer.camera()).toBeInstanceOf(THREE.PerspectiveCamera)
  })

  it('keeps the subject in the scene at the origin', () => {
    expect(layer.subject().position.toArray()).toEqual([0, 0, 0])
    expect(layer.subject().parent).toBe(layer.scene())
  })

  it('releases the map pan while a handle is dragged and restores it after', () => {
    layer.setDragging(true)
    expect(map.dragPan.disable).toHaveBeenCalled()
    expect(map.dragRotate.disable).toHaveBeenCalled()

    layer.setDragging(false)
    expect(map.dragPan.enable).toHaveBeenCalled()
    expect(map.dragRotate.enable).toHaveBeenCalled()
  })

  it('rebuilds the camera from the frame clip matrix before drawing', () => {
    const before = (layer.camera() as THREE.PerspectiveCamera).position.clone()
    const clip = new THREE.Matrix4().makePerspective(-1, 1, 1, -1, 1, 100)
    clip.multiply(new THREE.Matrix4().makeTranslation(0, 0, -20))

    layer.render({} as WebGLRenderingContext, { defaultProjectionData: { mainMatrix: clip.toArray() } })

    expect((layer.camera() as THREE.PerspectiveCamera).position.equals(before)).toBe(false)
  })

  it('drops the scene on removal', () => {
    layer.onRemove()
    expect(layer.scene()).toBeNull()
  })

  it('draws the scene origin where the anchor is, so the gizmo lands on the file', () => {
    const clip = new THREE.Matrix4().makePerspective(-1, 1, 1, -1, 1, 100)
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, -20))

    layer.render({} as WebGLRenderingContext, { defaultProjectionData: { mainMatrix: clip.toArray() } })

    const camera = layer.camera() as THREE.PerspectiveCamera
    const drawn = new THREE.Vector3(0, 0, 0)
      .applyMatrix4(camera.matrixWorldInverse)
      .applyMatrix4(camera.projectionMatrix)

    const merc = MercatorCoordinate.fromLngLat([ANCHOR.lng, ANCHOR.lat], ANCHOR.elevation)
    const expected = new THREE.Vector3(merc.x, merc.y, merc.z).applyMatrix4(clip)

    expect(drawn.distanceTo(expected)).toBeLessThan(1e-6)
  })

  it('measures the scene in metres, so a drag reads as metres east', () => {
    const clip = new THREE.Matrix4().makePerspective(-1, 1, 1, -1, 1, 100)
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, -20))

    layer.render({} as WebGLRenderingContext, { defaultProjectionData: { mainMatrix: clip.toArray() } })

    const camera = layer.camera() as THREE.PerspectiveCamera
    const drawn = new THREE.Vector3(100, 0, 0)
      .applyMatrix4(camera.matrixWorldInverse)
      .applyMatrix4(camera.projectionMatrix)

    const origin = MercatorCoordinate.fromLngLat([ANCHOR.lng, ANCHOR.lat], ANCHOR.elevation)
    const metre = origin.meterInMercatorCoordinateUnits()
    const expected = new THREE.Vector3(origin.x + 100 * metre, origin.y, origin.z).applyMatrix4(clip)

    expect(drawn.distanceTo(expected)).toBeLessThan(1e-6)
  })
})
