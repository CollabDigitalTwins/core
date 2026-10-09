// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PlanShapeEditor } from './PlanShapeEditor'

vi.mock('../../CurrentWorld', () => ({ CurrentWorld: class {} }))

const scene = new THREE.Scene()
const canvas = document.body.appendChild(document.createElement('canvas'))
Object.defineProperty(canvas, 'clientWidth', { value: 200 })
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect

const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100)
camera.position.set(0, 50, 0)
camera.up.set(0, 0, -1)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

const world = { scene: { three: scene }, renderer: { three: { domElement: canvas } }, camera: { three: camera } }
// The camera maps plan (x, z) in [-10, 10] onto the 200 px canvas: 10 px per metre.
const at = (x: number, z: number) => ({ clientX: 10 * (x + 10), clientY: 10 * (z + 10) })
const square = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }, { x: 0, z: 4 }]

function makeEditor() {
  const components = { get: () => ({ world, core: { update: vi.fn() } }) }
  return new PlanShapeEditor(components as never, { planY: () => 0, snapSegments: () => null })
}

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup'
const pointer = (type: PointerType, x: number, z: number, init: MouseEventInit = {}) =>
  canvas.dispatchEvent(new MouseEvent(type, { ...at(x, z), bubbles: true, button: 0, ...init }))
const drag = (from: [number, number], to: [number, number], init: MouseEventInit = {}) => {
  pointer('pointerdown', ...from, init)
  pointer('pointermove', ...to, init)
  pointer('pointerup', ...to, init)
}
const key = (name: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key: name, cancelable: true }))
const tidy = (points: { x: number; z: number }[] | null) =>
  points?.map(({ x, z }) => ({ x: Math.round(x * 1e6) / 1e6 + 0, z: Math.round(z * 1e6) / 1e6 + 0 }))

describe('PlanShapeEditor', () => {
  afterEach(() => scene.clear())

  it('drags a corner and keeps the shape on Enter', async () => {
    const editor = makeEditor()
    const done = editor.start(square)
    drag([4, 4], [6, 5])
    key('Enter')
    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 6, z: 5 }, { x: 0, z: 4 }])
  })

  it('drags an edge by both its ends', async () => {
    const editor = makeEditor()
    const done = editor.start(square)
    drag([2, 0], [2, -2])
    editor.commit()
    expect(tidy(await done)).toEqual([{ x: 0, z: -2 }, { x: 4, z: -2 }, { x: 4, z: 4 }, { x: 0, z: 4 }])
  })

  it('adds a corner on an edge with Ctrl and removes the selected one with Delete', async () => {
    const editor = makeEditor()
    const done = editor.start(square)
    pointer('pointerdown', 2, 0, { ctrlKey: true })
    pointer('pointerup', 2, 0)
    key('Delete')
    pointer('pointerdown', 2, 0, { ctrlKey: true })
    pointer('pointermove', 2, -1, { ctrlKey: true })
    pointer('pointerup', 2, -1)
    editor.commit()
    expect(tidy(await done)).toEqual([{ x: 0, z: 0 }, { x: 2, z: -1 }, { x: 4, z: 0 }, { x: 4, z: 4 }, { x: 0, z: 4 }])
  })

  it('adds a corner after the selected one with Ctrl on empty plan', async () => {
    const editor = makeEditor()
    const done = editor.start(square)
    pointer('pointerdown', 4, 0)
    pointer('pointerup', 4, 0)
    pointer('pointerdown', 6, 2, { ctrlKey: true })
    pointer('pointerup', 6, 2)
    editor.commit()
    expect(tidy(await done)?.[2]).toEqual({ x: 6, z: 2 })
  })

  it('resolves null on Esc and leaves presses off the shape to the camera', async () => {
    const editor = makeEditor()
    const camera = vi.fn()
    canvas.addEventListener('pointerdown', camera)
    const done = editor.start(square)
    pointer('pointerdown', 4, 4)
    pointer('pointerup', 4, 4)
    pointer('pointerdown', 8, 8)
    canvas.removeEventListener('pointerdown', camera)
    key('Escape')
    expect(await done).toBeNull()
    expect(camera).toHaveBeenCalledTimes(1)
  })
})
