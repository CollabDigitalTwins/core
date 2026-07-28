// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
// The hover guard schedules through `window.setTimeout`, which the default node env lacks.

/**
 * Teardown regression tests. These cover the crash seen when leaving the BIM viewer for the map:
 * an "Oops, something went wrong!" boundary plus `TypeError: Cannot read properties of null
 * (reading 'dispose')`, `Error: No camera initialized!` and a null-renderer read from the culler.
 *
 * The behaviour of `@thatopen/components` that makes this happen, verified against the installed
 * bundle and reproduced by the stubs below:
 *
 * - `Components.dispose()` iterates its component list and sets `component.enabled = false`
 *   *unconditionally and first*, then calls `dispose()` only when `isDisposeable()` is true, where
 *   that predicate is `'dispose' in this && 'onDisposed' in this`. The loop has no try/catch, and
 *   `FragmentsManager` is deliberately held back to last — so one throw skips it entirely.
 * - `World.dispose()` sets `isDisposing = true`, then nulls `_scene`, `_camera` and `_renderer`.
 *   `get camera()` and `get scene()` *throw* when null; `get renderer()` returns null. That makes
 *   `renderer` the only safe probe for a torn-down world.
 * - `Disposer.disposeGeometryAndMaterials()` ends with `item.geometry = null` and
 *   `item.material = []`, so meshes the world owned come back with a null geometry.
 */

import * as THREE from 'three'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    handlers = new Set<(arg: T) => void>()
    add(handler: (arg: T) => void) { this.handlers.add(handler) }
    remove(handler: (arg: T) => void) { this.handlers.delete(handler) }
    trigger(arg: T) { for (const handler of [...this.handlers]) handler(arg) }
    reset() { this.handlers.clear() }
  }
  class Component {
    constructor(public components: unknown) { }
    // Mirrors OBC's real predicate, so `isDisposeable()` below is a faithful check.
    isDisposeable = () => 'dispose' in this && 'onDisposed' in this
  }
  class OrthoPerspectiveCamera { three = new THREE.PerspectiveCamera() }
  class FragmentsManager { }
  return { Component, Event, OrthoPerspectiveCamera, FragmentsManager }
})

vi.mock('@thatopen/components-front', () => ({ Hoverer: class { enabled = true } }))
vi.mock('../CurrentWorld', () => ({ CurrentWorld: class { } }))

const OBC = await import('@thatopen/components')
const { CurrentWorld } = await import('../CurrentWorld')
const { Highlighter } = await import('./index')

/** An element that records its listeners, standing in for the renderer's canvas. */
function makeCanvas() {
  const listeners = new Map<string, Set<(event: unknown) => void>>()
  return {
    listeners,
    count: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
    fire: (type: string, event: unknown) => { for (const handler of [...listeners.get(type) ?? []]) handler(event) },
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(handler)
    },
    removeEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners.get(type)?.delete(handler)
    },
  }
}

/** The stub camera above takes no constructor args, unlike the real OBC class it stands in for. */
const StubCamera = OBC.OrthoPerspectiveCamera as unknown as
  new () => InstanceType<typeof OBC.OrthoPerspectiveCamera>

/** A world that reproduces OBC's post-dispose shape: throwing getters, null renderer. */
function makeWorld(canvas: ReturnType<typeof makeCanvas>) {
  const sceneRoot = new THREE.Group()
  const camera = new StubCamera()
  const state = { torn: false, cameraReads: 0 }
  const world = {
    sceneRoot,
    state,
    isDisposing: false,
    renderer: { three: { domElement: canvas, clippingPlanes: [] } } as unknown,
    get scene() {
      if (state.torn) throw new Error('No scene initialized!')
      return { three: sceneRoot }
    },
    get camera() {
      state.cameraReads += 1
      if (state.torn) throw new Error('No camera initialized!')
      return camera
    },
    /** What `World.dispose()` leaves behind. */
    tearDown() {
      state.torn = true
      world.isDisposing = true
      world.renderer = null
    },
  }
  return world
}

function makeHighlighter() {
  const canvas = makeCanvas()
  const world = makeWorld(canvas)
  const fragments = { list: new Map<string, unknown>() }
  const components = {
    add: vi.fn(),
    get: (token: unknown) => {
      if (token === CurrentWorld) return { world }
      if (token === OBC.FragmentsManager) return fragments
      return { enabled: true }
    },
  }
  const highlighter = new Highlighter(components as never)
  return { highlighter, world, canvas, fragments }
}

/** Adds a hover mesh, then nulls its geometry exactly as OBC's `Disposer` does. */
function addHoverMeshAlreadyReleasedByTheWorld(highlighter: unknown) {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
  const hovered = (highlighter as { _hoveredMeshes: Set<THREE.Mesh> })._hoveredMeshes
  hovered.add(mesh)
  ;(mesh as unknown as { geometry: null }).geometry = null
  ;(mesh as unknown as { material: [] }).material = []
  return mesh
}

describe('Highlighter teardown', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('is disposeable, so Components.dispose() calls dispose() instead of only setting enabled', () => {
    const { highlighter } = makeHighlighter()
    // Without `onDisposed` this predicate is false and OBC silently skips the component.
    expect('dispose' in highlighter && 'onDisposed' in highlighter).toBe(true)
    expect(highlighter.isDisposeable()).toBe(true)
  })

  it('survives `enabled = false` when the world already nulled the hover mesh geometry', () => {
    const { highlighter, world } = makeHighlighter()
    addHoverMeshAlreadyReleasedByTheWorld(highlighter)
    world.tearDown()

    // Exactly what Components.dispose() does first, for every component, unguarded.
    expect(() => { highlighter.enabled = false }).not.toThrow()
  })

  it('dispose() completes against a torn-down world', () => {
    const { highlighter, world } = makeHighlighter()
    addHoverMeshAlreadyReleasedByTheWorld(highlighter)
    world.tearDown()

    expect(() => highlighter.dispose()).not.toThrow()
  })

  it('dispose() detaches canvas listeners even though world.renderer is already null', () => {
    const { highlighter, world, canvas } = makeHighlighter()
    expect(canvas.count()).toBeGreaterThan(0)

    world.tearDown()
    highlighter.dispose()

    // Listeners must come off the element they were attached to, not off whatever the world
    // still exposes — a disposed world exposes nothing.
    expect(canvas.count()).toBe(0)
  })

  it('cancels the queued hover raycast before anything else in dispose() can fail', () => {
    const { highlighter, world, canvas } = makeHighlighter()
    addHoverMeshAlreadyReleasedByTheWorld(highlighter)
    canvas.fire('mousemove', { clientX: 10, clientY: 10 })

    highlighter.dispose()
    world.tearDown()
    const readsBefore = world.state.cameraReads

    // The 50ms hover guard has to be cancelled *first*. Pre-fix, `dispose()` threw on the nulled
    // hover geometry before reaching its `clearTimeout`, leaving the timer to fire against a
    // disposed world and read the throwing `camera` getter as an unhandled rejection.
    vi.runAllTimers()

    expect(world.state.cameraReads).toBe(readsBefore)
  })

  it('a hover raycast that outlives the world resolves to no hit instead of throwing', async () => {
    const { highlighter, world } = makeHighlighter()
    world.tearDown()

    const nearestHit = (highlighter as unknown as {
      _nearestHit: (x: number, y: number) => Promise<unknown>
    })._nearestHit.bind(highlighter)

    await expect(nearestHit(10, 10)).resolves.toBeNull()
  })
})
