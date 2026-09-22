// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMapDomGizmo } from './mapDomGizmo'

let marker: ReturnType<typeof createMarker>

function createMarker() {
  return {
    setLngLat: vi.fn().mockReturnThis(),
    setDraggable: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn().mockReturnThis(),
    getLngLat: vi.fn(() => ({ lng: -75.69, lat: 45.43 })),
  }
}

vi.mock('maplibre-gl', () => ({ Marker: vi.fn(function () { return marker }) }))

const setUp = () => {
  const onDragTo = vi.fn()
  const gizmo = createMapDomGizmo({
    map: {} as never,
    anchor: () => ({ lng: -75.695, lat: 45.42, elevation: 74 }),
    onDragTo,
  })
  return { gizmo, onDragTo }
}

describe('createMapDomGizmo', () => {
  beforeEach(() => {
    marker = createMarker()
  })
  it('puts a draggable marker on the map when it attaches', () => {
    const { gizmo } = setUp()

    expect(gizmo.attach(new THREE.Object3D())).toBe(true)
    expect(marker.setDraggable).toHaveBeenCalledWith(true)
    expect(marker.addTo).toHaveBeenCalled()
  })

  it('reports a drag as the anchor it landed on, keeping the elevation', () => {
    const { gizmo, onDragTo } = setUp()
    gizmo.attach(new THREE.Object3D())

    const onDrag = marker.on.mock.calls.find(([event]) => event === 'drag')?.[1] as () => void
    onDrag()

    expect(onDragTo).toHaveBeenCalledWith({ lng: -75.69, lat: 45.43, elevation: 74 })
  })

  it('removes the marker on detach and survives a second detach', () => {
    const { gizmo } = setUp()
    gizmo.attach(new THREE.Object3D())

    gizmo.detach()
    gizmo.detach()

    expect(marker.remove).toHaveBeenCalledTimes(1)
  })

  it('ignores a mode it cannot offer', () => {
    const { gizmo } = setUp()
    gizmo.attach(new THREE.Object3D())

    expect(() => gizmo.setMode('rotate')).not.toThrow()
  })

  it('tells the core about a drag so the panel follows', () => {
    const { gizmo } = setUp()
    const onChange = vi.fn()
    gizmo.attach(new THREE.Object3D())
    gizmo.onChange = onChange

    const onDrag = marker.on.mock.calls.find(([event]) => event === 'drag')?.[1] as () => void
    onDrag()

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
