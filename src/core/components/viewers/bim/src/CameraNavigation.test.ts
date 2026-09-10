// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    handlers = new Set<(arg: T) => void>()
    add(handler: (arg: T) => void) { this.handlers.add(handler) }
    remove(handler: (arg: T) => void) { this.handlers.delete(handler) }
    trigger(arg?: T) { for (const handler of [...this.handlers]) handler(arg as T) }
    reset() { this.handlers.clear() }
  }
  class Component {
    constructor(public components: unknown) { }
  }
  class Components {
    private instances = new Map<string, unknown>()
    add(uuid: string, instance: unknown) { this.instances.set(uuid, instance) }
    get<T>(Ctor: { uuid: string; new(components: Components): T }): T {
      const existing = this.instances.get(Ctor.uuid)
      return (existing as T) ?? new Ctor(this)
    }
  }
  class OrthoPerspectiveCamera {}
  return { Component, Components, Event, OrthoPerspectiveCamera }
})

import { CameraNavigation, DEFAULT_MOVE_SPEED, MAX_MOVE_SPEED } from './CameraNavigation'
import { CurrentWorld } from './CurrentWorld'


function stubControls() {
  const position = new THREE.Vector3(0, 5, 0)
  const target = new THREE.Vector3(0, 5, -1)
  return {
    truckSpeed: 0,
    forward: vi.fn(),
    truck: vi.fn(),
    elevate: vi.fn(),
    setLookAt: vi.fn(),
    getPosition: (out: THREE.Vector3) => out.copy(position),
    getTarget: (out: THREE.Vector3) => out.copy(target),
    position,
    target,
  }
}

function harness({ projection = 'Perspective' }: { projection?: string } = {}) {
  const controls = stubControls()
  const setMode = vi.fn()
  // Built off the prototype so the component's `instanceof` guard passes.
  const camera = Object.assign(Object.create(OBC.OrthoPerspectiveCamera.prototype), {
    controls,
    projection: { current: projection },
    set: setMode,
  }) as OBC.OrthoPerspectiveCamera
  const renderer = { needsUpdate: false }
  const components = new OBC.Components()
  components.add(CurrentWorld.uuid, { world: { camera, renderer } } as never)

  const navigation = new CameraNavigation(components)
  return { navigation, setMode, controls, renderer }
}

let frames: (() => void)[] = []

beforeEach(() => {
  frames = []
  let handle = 0
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    frames.push(callback)
    return ++handle
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key }))
const release = (key: string) => window.dispatchEvent(new KeyboardEvent('keyup', { key }))

/** Runs one loop iteration with a fixed delta by controlling `performance.now`. */
function tick(elapsedMs = 16) {
  const pending = frames.pop()
  if (!pending) throw new Error('no frame scheduled')
  const now = performance.now()
  const clock = vi.spyOn(performance, 'now').mockReturnValue(now + elapsedMs)
  pending()
  clock.mockRestore()
}

describe('setMode', () => {
  it('delegates to the OBC camera and reports the new mode', () => {
    const { navigation, setMode } = harness()

    navigation.setMode('FirstPerson')

    expect(setMode).toHaveBeenCalledWith('FirstPerson')
    expect(navigation.mode).toBe('FirstPerson')
  })

  it('refuses first person under an orthographic lens', () => {
    const { navigation, setMode } = harness({ projection: 'Orthographic' })

    expect(navigation.canUse('FirstPerson')).toBe(false)
    navigation.setMode('FirstPerson')

    expect(setMode).not.toHaveBeenCalled()
    expect(navigation.mode).toBe('Orbit')
  })

  it('writes the move speed after the mode, since OBC overwrites truckSpeed on set', () => {
    const { navigation, controls, setMode } = harness()
    setMode.mockImplementation(() => { controls.truckSpeed = 50 })

    navigation.setMode('FirstPerson')

    expect(controls.truckSpeed).not.toBe(50)
    expect(controls.truckSpeed).toBeGreaterThan(0)
  })
})

describe('setMoveSpeed', () => {
  it('clamps out of range values', () => {
    const { navigation } = harness()

    navigation.setMoveSpeed(999)
    expect(navigation.state.moveSpeed).toBe(MAX_MOVE_SPEED)

    navigation.setMoveSpeed(Number.NaN)
    expect(navigation.state.moveSpeed).toBe(DEFAULT_MOVE_SPEED)
  })
})

describe('walking', () => {
  it('ignores keys outside first person', () => {
    const { navigation, controls } = harness()

    press('w')
    expect(frames).toHaveLength(0)
    expect(controls.forward).not.toHaveBeenCalled()
    navigation.dispose()
  })

  it('moves forward while a key is held and stops on release', () => {
    const { navigation, controls, renderer } = harness()
    navigation.setMode('FirstPerson')

    press('w')
    tick()
    expect(controls.forward).toHaveBeenCalledOnce()
    expect(controls.forward.mock.calls[0][0]).toBeGreaterThan(0)
    expect(renderer.needsUpdate).toBe(true)

    release('w')
    renderer.needsUpdate = false
    tick()
    expect(controls.forward).toHaveBeenCalledOnce()
    expect(renderer.needsUpdate).toBe(false)
    navigation.dispose()
  })

  it('maps arrows the same way as wasd and strafes sideways', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')

    press('ArrowDown')
    press('ArrowRight')
    tick()

    expect(controls.forward.mock.calls[0][0]).toBeLessThan(0)
    expect(controls.truck.mock.calls[0][0]).toBeGreaterThan(0)
    navigation.dispose()
  })

  it('does not walk while a field has focus', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    press('w')
    tick()

    expect(controls.forward).not.toHaveBeenCalled()
    input.remove()
    navigation.dispose()
  })

  it('caps the step so a backgrounded tab cannot teleport the camera', () => {
    const { navigation, controls } = harness()
    navigation.setMoveSpeed(10)
    navigation.setMode('FirstPerson')

    press('w')
    tick(60_000)

    expect(controls.forward.mock.calls[0][0]).toBeLessThan(1)
    navigation.dispose()
  })

  it('releases held keys when the window loses focus', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')

    press('w')
    window.dispatchEvent(new Event('blur'))
    tick()

    expect(controls.forward).not.toHaveBeenCalled()
    navigation.dispose()
  })
})

describe('elevation lock', () => {
  it('holds the height captured when the lock engaged', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')
    navigation.setLockElevation(true)

    tick()
    expect(controls.setLookAt).not.toHaveBeenCalled()

    controls.position.y = 12
    tick()

    expect(controls.setLookAt).toHaveBeenCalledWith(0, 5, 0, 0, 5, -1, false)
    navigation.dispose()
  })

  it('corrects the drift a walk introduces rather than being skipped by it', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')
    navigation.setLockElevation(true)
    tick()

    controls.forward.mockImplementation(() => { controls.position.y = 9 })
    press('w')
    tick()

    expect(controls.forward).toHaveBeenCalledOnce()
    expect(controls.setLookAt).toHaveBeenCalledOnce()
    navigation.dispose()
  })

  it('does nothing while unlocked', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')

    controls.position.y = 99
    tick()

    expect(controls.setLookAt).not.toHaveBeenCalled()
    navigation.dispose()
  })
})

describe('vertical movement', () => {
  it('maps q and e to down and up', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')

    press('e')
    tick()
    expect(controls.elevate.mock.calls[0][0]).toBeGreaterThan(0)
    release('e')

    press('q')
    tick()
    expect(controls.elevate.mock.calls[1][0]).toBeLessThan(0)
    navigation.dispose()
  })

  it('re-bases the lock so deliberate vertical input is not cancelled by it', () => {
    const { navigation, controls } = harness()
    navigation.setMode('FirstPerson')
    navigation.setLockElevation(true)
    tick()

    // Real `elevate` raises the target with the camera, so the stub must too.
    controls.elevate.mockImplementation((rise: number) => {
      controls.position.y += rise
      controls.target.y += rise
    })
    press('e')
    tick()

    expect(controls.setLookAt).not.toHaveBeenCalled()
    expect(controls.position.y).toBeGreaterThan(5)
    navigation.dispose()
  })
})

describe('setElevation', () => {
  it('pans the camera and its target to the requested height', () => {
    const { navigation, controls } = harness()

    navigation.setElevation(20)

    expect(controls.setLookAt).toHaveBeenCalledWith(0, 20, 0, 0, 20, -1, false)
    navigation.dispose()
  })

  it('reads the current height back in metres', () => {
    const { navigation, controls } = harness()

    controls.position.y = 7.5
    expect(navigation.elevation).toBe(7.5)
    navigation.dispose()
  })

  it('ignores a value that is not a number', () => {
    const { navigation, controls } = harness()

    navigation.setElevation(Number.NaN)

    expect(controls.setLookAt).not.toHaveBeenCalled()
    navigation.dispose()
  })

  it('announces the new height so the field can follow the camera', () => {
    const { navigation } = harness()
    const heard: number[] = []
    navigation.onElevationChanged.add((metres) => heard.push(metres))

    navigation.setElevation(15)

    expect(heard).toEqual([15])
    navigation.dispose()
  })
})
