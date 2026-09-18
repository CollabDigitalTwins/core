// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { CameraController } from './CameraController'

/**
 * Mirrors the parts of OBC's ProjectionManager that decide whether an
 * orthographic switch actually happens — including its silent refusals.
 */
function makeCamera(navMode: string | null = 'Orbit') {
  const camera: any = {
    mode: navMode === null ? null : { id: navMode },
    controls: {
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
      minAzimuthAngle: -Infinity,
      maxAzimuthAngle: Infinity,
      mouseButtons: { left: 1, middle: 1, right: 1, wheel: 1 },
      touches: { one: 1, two: 1, three: 1 },
      distance: 10,
      getPosition: (v: THREE.Vector3) => v.set(0, 0, 0),
      getTarget: (v: THREE.Vector3) => v.set(0, 0, 0),
      setLookAt: vi.fn(() => Promise.resolve()),
    },
    projection: {
      current: 'Perspective' as 'Perspective' | 'Orthographic',
      set: vi.fn((next: string) => {
        // OBC bails silently, leaving `current` untouched, when no mode is set or it is FirstPerson.
        if (camera.mode === null || camera.mode.id === 'FirstPerson') return Promise.resolve()
        camera.projection.current = next
        return Promise.resolve()
      }),
    },
    set: vi.fn((mode: string) => { camera.mode = { id: mode } }),
  }
  return camera
}

const makeComponents = (camera: any) => ({
  get: () => ({ world: { camera } }),
}) as any

const frameTopDown = (camera: any) => {
  const controller = new CameraController(makeComponents(camera))
  controller.frame(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0), 50)
  return controller
}

describe('CameraController.frame', () => {
  it('switches the camera to orthographic', () => {
    const camera = makeCamera()
    frameTopDown(camera)
    expect(camera.projection.current).toBe('Orthographic')
  })

  it('leaves the navigation mode alone when orthographic already worked', () => {
    const camera = makeCamera('Orbit')
    frameTopDown(camera)
    expect(camera.set).not.toHaveBeenCalled()
  })

  it('escapes FirstPerson, which OBC silently refuses to make orthographic', () => {
    const camera = makeCamera('FirstPerson')
    frameTopDown(camera)
    expect(camera.projection.current).toBe('Orthographic')
  })

  it('warns instead of drawing a perspective plan when it cannot go orthographic', () => {
    const camera = makeCamera(null)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    frameTopDown(camera)

    expect(camera.projection.current).toBe('Perspective')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('still positions the camera along the view direction', () => {
    const camera = makeCamera()
    frameTopDown(camera)
    expect(camera.controls.setLookAt).toHaveBeenCalledWith(0, 50, 0, 0, 0, 0, true)
  })
})

describe('CameraController.unlock', () => {
  it('restores a navigation mode that frame had to change', () => {
    const camera = makeCamera('FirstPerson')
    const controller = new CameraController(makeComponents(camera))

    controller.lock(0)
    controller.frame(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0), 50)
    controller.unlock()

    expect(camera.mode.id).toBe('FirstPerson')
  })
})
