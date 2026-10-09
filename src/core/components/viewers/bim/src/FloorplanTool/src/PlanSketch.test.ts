// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PlanSketch } from './PlanSketch'

import type { SketchHost } from './PlanSketch'

vi.mock('../../CurrentWorld', () => ({ CurrentWorld: class {} }))

const scene = new THREE.Scene()
const canvas = document.body.appendChild(document.createElement('canvas'))
Object.defineProperty(canvas, 'clientWidth', { value: 200 })
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect

const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100)
camera.position.set(0, 20, 0)
camera.up.set(0, 0, -1)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

const world = { scene: { three: scene }, renderer: { three: { domElement: canvas } }, camera: { three: camera } }

// The camera maps plan (x, z) in [-10, 10] onto the 200 px canvas, so a snap radius is 1.2 m.
const at = (x: number, z: number) => ({ clientX: 10 * (x + 10), clientY: 10 * (z + 10) })

function makeSketch(segments: number[] | null = null) {
  const host: SketchHost = {
    planY: () => 0,
    snapSegments: () => (segments ? new Float32Array(segments) : null),
    setLeftButtonPans: vi.fn(),
  }
  const components = { get: () => ({ world, core: { update: vi.fn() } }) }
  return { sketch: new PlanSketch(components as never, host), host }
}

const click = (x: number, z: number) => canvas.dispatchEvent(new MouseEvent('click', { ...at(x, z), bubbles: true }))
const move = (x: number, z: number) => canvas.dispatchEvent(new MouseEvent('mousemove', { ...at(x, z), bubbles: true }))
const pointer = (type: 'pointerdown' | 'pointerup', x: number, z: number) =>
  canvas.dispatchEvent(new MouseEvent(type, { ...at(x, z), bubbles: true, button: 0 }))
const drag = (from: [number, number], to: [number, number]) => {
  pointer('pointerdown', ...from)
  move(...to)
  pointer('pointerup', ...to)
  click(...to)
}
const key = (type: 'keydown' | 'keyup', name: string) => {
  const event = new KeyboardEvent(type, { key: name, cancelable: true })
  window.dispatchEvent(event)
  return event
}
const tidy = (points: { x: number; z: number }[] | null) =>
  points?.map(({ x, z }) => ({ x: Math.round(x * 1e6) / 1e6 + 0, z: Math.round(z * 1e6) / 1e6 + 0 }))
const snapGlyph = () => scene.getObjectByName('plan-sketch-snap')
const previewPointCount = () => {
  const preview = scene.getObjectByName('plan-sketch-preview') as THREE.Line | undefined
  return preview?.geometry.getAttribute('position')?.count ?? 0
}

describe('PlanSketch', () => {
  afterEach(() => scene.clear())

  it('takes the left button for drawing and hands it back to panning', async () => {
    const { sketch, host } = makeSketch()
    const done = sketch.start('polygon')
    expect(host.setLeftButtonPans).toHaveBeenLastCalledWith(false)

    sketch.cancel()
    expect(await done).toBeNull()
    expect(host.setLeftButtonPans).toHaveBeenLastCalledWith(true)
  })

  it('does not add a corner for the first click of a double-click', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('polygon')
    click(0, 0)
    click(4, 0)
    click(4, 4)
    click(4.1, 4)
    canvas.dispatchEvent(new MouseEvent('dblclick', { ...at(4.1, 4), bubbles: true }))

    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }])
  })

  it('pans instead of placing points while Space is held', async () => {
    const { sketch, host } = makeSketch()
    const done = sketch.start('segment')
    expect(key('keydown', ' ').defaultPrevented).toBe(true)
    expect(host.setLeftButtonPans).toHaveBeenLastCalledWith(true)
    click(0, 0)

    key('keyup', ' ')
    expect(host.setLeftButtonPans).toHaveBeenLastCalledWith(false)
    click(1, 0)
    click(5, 0)

    expect(tidy(await done)).toEqual([{ x: 1, z: 0 }, { x: 5, z: 0 }])
  })

  it('consumes Enter so a focused button cannot restart the sketch', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('polygon')
    click(0, 0)
    click(4, 0)
    click(4, 4)

    expect(key('keydown', 'Enter').defaultPrevented).toBe(true)
    expect(await done).toHaveLength(3)
  })

  it('removes the last corner on Backspace', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('polygon')
    click(0, 0)
    click(4, 0)
    click(9, 9)
    key('keydown', 'Backspace')
    click(4, 4)
    key('keydown', 'Enter')

    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }])
  })

  it('shows the snap glyph only on a snapped point, and snaps to the corner', async () => {
    const { sketch } = makeSketch([3, 3, 8, 3])
    const done = sketch.start('rectangle')

    move(-5, -5)
    expect(snapGlyph()?.visible).toBe(false)
    move(3.5, 3.5)
    expect(snapGlyph()?.visible).toBe(true)

    click(0, 0)
    click(3.5, 3.5)
    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 3 }, { x: 0, z: 3 }])
  })

  it('places a point exactly where clicked while Alt is held', async () => {
    const { sketch } = makeSketch([-5, 3, 5, 3])
    const done = sketch.start('segment')
    canvas.dispatchEvent(new MouseEvent('mousemove', { ...at(0, 3.4), bubbles: true, altKey: true }))
    click(0, 3.4)
    canvas.dispatchEvent(new MouseEvent('mousemove', { ...at(0, -4), bubbles: true }))
    click(0, -4)
    expect(tidy(await done)).toEqual([{ x: 0, z: 3.4 }, { x: 0, z: -4 }])
  })

  it('snaps a corner onto a wall line between its ends', async () => {
    const { sketch } = makeSketch([-5, 3, 5, 3])
    const done = sketch.start('segment')
    click(0, 3.4)
    click(0, -4)
    expect(tidy(await done)).toEqual([{ x: 0, z: 3 }, { x: 0, z: -4 }])
  })

  it('draws the outline through every placed corner, not just the first', () => {
    const { sketch } = makeSketch()
    void sketch.start('polygon')
    move(0, 0)
    click(0, 0)
    click(4, 0)
    move(4, 4)
    expect(previewPointCount()).toBe(4)
    sketch.cancel()
  })

  it('draws with the system crosshair cursor and restores the previous one after', () => {
    const { sketch } = makeSketch()
    canvas.style.cursor = 'grab'
    void sketch.start('polygon')
    expect(canvas.style.cursor).toBe('crosshair')
    sketch.cancel()
    expect(canvas.style.cursor).toBe('grab')
  })

  it('keeps its clicks from reaching other canvas tools such as selection', () => {
    const selection = vi.fn()
    canvas.addEventListener('click', selection)
    const { sketch } = makeSketch()
    void sketch.start('polygon')
    click(0, 0)
    sketch.cancel()
    click(0, 0)
    canvas.removeEventListener('click', selection)
    expect(selection).toHaveBeenCalledTimes(1)
  })

  it('closes a polygon on right-click, like Enter', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('polygon')
    click(0, 0)
    click(4, 0)
    click(4, 4)
    canvas.dispatchEvent(new MouseEvent('contextmenu', { ...at(4, 4), bubbles: true, cancelable: true }))
    expect(await done).toHaveLength(3)
  })

  it('draws a rectangle by dragging from one corner to the other', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('rectangle')
    drag([0, 0], [4, 3])
    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }, { x: 0, z: 3 }])
  })

  it('anchors the rectangle at the press and rubber-bands it while dragging', () => {
    const { sketch } = makeSketch()
    void sketch.start('rectangle')
    pointer('pointerdown', 0, 0)
    move(4, 3)
    expect(previewPointCount()).toBe(5)
    sketch.cancel()
  })

  it('treats a press without movement as a plain click', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('segment')
    pointer('pointerdown', 0, 0)
    pointer('pointerup', 0, 0)
    click(0, 0)
    click(5, 0)
    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 5, z: 0 }])
  })

  it('adds a polygon edge per drag', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('polygon')
    drag([0, 0], [4, 0])
    click(4, 4)
    key('keydown', 'Enter')
    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }])
  })

  it('cancels on Escape', async () => {
    const { sketch } = makeSketch()
    const done = sketch.start('polygon')
    click(0, 0)
    key('keydown', 'Escape')
    expect(await done).toBeNull()
  })
})
