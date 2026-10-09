// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { CurrentWorld } from '../CurrentWorld'

import { pickModelEdge, planEdge } from './pickModelEdge'

import type * as OBC from '@thatopen/components'
import type * as FRAGS from '@thatopen/fragments'

vi.mock('@thatopen/components-front', () => ({ Hoverer: class Hoverer {} }))
vi.mock('@thatopen/fragments', () => ({ SnappingClass: { POINT: 0, LINE: 1, FACE: 2 } }))
vi.mock('../CurrentWorld', () => ({ CurrentWorld: class CurrentWorld {} }))
vi.mock('../FloorplanTool/src/planScene', () => ({ requestPlanRender: vi.fn() }))

const LINE = 1

function setUp(hit: { p1: THREE.Vector3, p2: THREE.Vector3 } | null) {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  const scene = new THREE.Scene()
  const hoverer = { enabled: true }
  const world = { renderer: { three: { domElement: canvas } }, camera: { three: new THREE.PerspectiveCamera() }, scene: { three: scene } }
  const components = {
    get: (ctor: unknown) => (ctor === CurrentWorld ? { world } : hoverer),
  } as unknown as OBC.Components
  const raycastWithSnapping = vi.fn(async () => (hit
    ? [{ snappingClass: LINE, snappedEdgeP1: hit.p1, snappedEdgeP2: hit.p2 }]
    : null))
  const model = { raycastWithSnapping } as unknown as FRAGS.FragmentsModel
  return { canvas, scene, hoverer, components, model, raycastWithSnapping }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function pointer(canvas: HTMLCanvasElement, type: string, x: number, y: number) {
  const init = { bubbles: true, clientX: x, clientY: y, button: 0 }
  canvas.dispatchEvent(new MouseEvent(type, init))
}

describe('planEdge', () => {
  it('keeps the plan footprint of a sloped or level edge', () => {
    expect(planEdge(new THREE.Vector3(1, 0, 2), new THREE.Vector3(4, 3, 6))).toEqual([{ x: 1, z: 2 }, { x: 4, z: 6 }])
  })

  it('has nothing to offer for a vertical edge', () => {
    expect(planEdge(new THREE.Vector3(1, 0, 2), new THREE.Vector3(1, 3, 2))).toBeNull()
  })
})

describe('pickModelEdge', () => {
  it('resolves the edge under the cursor on click and cleans up after itself', async () => {
    const { canvas, scene, hoverer, components, model, raycastWithSnapping } = setUp({
      p1: new THREE.Vector3(0, 1, 0), p2: new THREE.Vector3(2, 1, 1),
    })
    const picked = pickModelEdge(components, model)
    expect(hoverer.enabled).toBe(false)

    pointer(canvas, 'pointermove', 10, 10)
    await flush()
    pointer(canvas, 'pointerdown', 10, 10)
    pointer(canvas, 'click', 10, 10)

    await expect(picked).resolves.toEqual([{ x: 0, z: 0 }, { x: 2, z: 1 }])
    expect(raycastWithSnapping).toHaveBeenCalledWith(expect.objectContaining({ snappingClasses: [LINE] }))
    expect(scene.children).toHaveLength(0)
    expect(hoverer.enabled).toBe(true)
  })

  it('treats a drag as orbiting, not a pick', async () => {
    const { canvas, components, model } = setUp({ p1: new THREE.Vector3(0, 0, 0), p2: new THREE.Vector3(1, 0, 0) })
    let settled = false
    void pickModelEdge(components, model).then(() => { settled = true })

    pointer(canvas, 'pointermove', 10, 10)
    await flush()
    pointer(canvas, 'pointerdown', 10, 10)
    pointer(canvas, 'click', 60, 10)
    await flush()

    expect(settled).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  })

  it('resolves null on Escape', async () => {
    const { components, model } = setUp(null)
    const picked = pickModelEdge(components, model)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await expect(picked).resolves.toBeNull()
  })
})
