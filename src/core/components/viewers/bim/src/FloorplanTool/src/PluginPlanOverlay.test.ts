// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { PluginPlanOverlay } from './PluginPlanOverlay'

const scene = new THREE.Scene()
const canvas = document.body.appendChild(document.createElement('canvas'))
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100)
camera.position.set(0, 20, 0)
camera.up.set(0, 0, -1)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

vi.mock('../../CurrentWorld', () => ({ CurrentWorld: class {} }))
vi.mock('../../tools/AddToBim/src/FileMarkerUtils', () => ({ initializeCSS2DRenderer: vi.fn() }))

function makeOverlay(isBusy = () => false) {
  const world = { scene: { three: scene }, renderer: { three: { domElement: canvas } }, camera: { three: camera } }
  const components = { get: () => ({ world, core: { update: vi.fn() } }) }
  return new PluginPlanOverlay(components as never, isBusy)
}

// 10 px per metre, with plan (0, 0) at the canvas centre.
const at = (x: number, z: number) => ({ clientX: 10 * (x + 10), clientY: 10 * (z + 10), bubbles: true })
const fire = (type: string, x: number, z: number) => canvas.dispatchEvent(new MouseEvent(type, at(x, z)))
const fillOf = () => (layers()[0].children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material

const square = { id: 'a', points: [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }, { x: 0, z: 2 }], fill: 0xff0000, label: 'Room A' }

const layers = () => scene.children.filter(child => child.name.startsWith('plugin-plan-overlay:'))

describe('PluginPlanOverlay', () => {
  it('keeps one layer per plugin, hidden until a plan opens', () => {
    const overlay = makeOverlay()
    overlay.set('alpha', [square])
    overlay.set('beta', [square])

    expect(layers()).toHaveLength(2)
    expect(layers().every(layer => !layer.visible)).toBe(true)

    overlay.show(4.5)
    expect(layers().every(layer => layer.visible && layer.position.y === 4.5)).toBe(true)
    overlay.clearAll()
  })

  it('replaces a plugin\'s shapes without touching another plugin\'s', () => {
    const overlay = makeOverlay()
    overlay.set('alpha', [square])
    overlay.set('beta', [square])
    expect(layers()).toHaveLength(2)

    overlay.set('alpha', [])

    expect(layers().map(layer => layer.name)).toEqual(['plugin-plan-overlay:beta'])
    overlay.clear('beta')
    expect(layers()).toHaveLength(0)
  })

  it('brightens a clickable shape under the pointer, shows a pointer cursor and reports clicks', () => {
    const onShapeClick = vi.fn()
    const overlay = makeOverlay()
    overlay.set('alpha', [square], { onShapeClick })
    overlay.show(0)
    canvas.style.cursor = 'grab'

    fire('pointermove', 1, 1)
    expect(canvas.style.cursor).toBe('pointer')
    expect(fillOf().opacity).toBeGreaterThan(0.45)
    fire('pointerdown', 1, 1)
    fire('click', 1, 1)
    expect(onShapeClick).toHaveBeenCalledWith('a')

    fire('pointermove', 5, 5)
    expect(canvas.style.cursor).toBe('grab')
    expect(fillOf().opacity).toBe(0.45)
    overlay.hide()
    overlay.clearAll()
  })

  it('ignores a click that ends a pan, and any click while a sketch owns the pointer', () => {
    const onShapeClick = vi.fn()
    let busy = false
    const overlay = makeOverlay(() => busy)
    overlay.set('alpha', [square], { onShapeClick })
    overlay.show(0)

    fire('pointerdown', 5, 5)
    fire('click', 1, 1)
    busy = true
    fire('pointerdown', 1, 1)
    fire('click', 1, 1)
    expect(onShapeClick).not.toHaveBeenCalled()
    overlay.hide()
    overlay.clearAll()
  })

  it('skips shapes with fewer than three points', () => {
    const overlay = makeOverlay()
    overlay.set('alpha', [{ ...square, points: square.points.slice(0, 2) }])

    expect(layers()[0].children).toHaveLength(0)
    overlay.clearAll()
  })

  it('reports the spaces every owner replaces, and announces each change', () => {
    const overlay = makeOverlay()
    const changed = vi.fn()
    overlay.onReplacedSpacesChanged.add(changed)

    overlay.set('alpha', [square], { replacesSpaces: { m: new Set([1, 2]) } })
    overlay.set('beta', [square], { replacesSpaces: { m: new Set([3]), other: new Set([9]) } })
    expect([...overlay.replacedSpaces('m')].sort()).toEqual([1, 2, 3])

    overlay.clear('alpha')
    expect([...overlay.replacedSpaces('m')]).toEqual([3])
    expect(changed).toHaveBeenCalledTimes(3)

    overlay.clearAll()
    expect(overlay.replacedSpaces('m').size).toBe(0)
  })

  it('hides the spaces an overlay replaces even when it draws no shapes', () => {
    const overlay = makeOverlay()

    overlay.set('alpha', [], { replacesSpaces: { m: new Set([1]) } })

    expect([...overlay.replacedSpaces('m')]).toEqual([1])
    overlay.clearAll()
  })
})
