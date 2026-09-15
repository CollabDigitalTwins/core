// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@thatopen/components', () => {
  class Event<T> {
    trigger(_arg?: T) {}
  }
  class Component { constructor(public components: unknown) {} }
  return { Component, Event }
})

import { BimSplats } from './index'

import type { LoadedSplat } from '../../../shared/splat/splatRegistry'

// Only the appearance bookkeeping is under test; nothing here touches Spark or WebGL.
const splats = () => {
  const component = Object.create(BimSplats.prototype) as BimSplats
  Object.assign(component, {
    appearances: new Map(),
    highlights: new Map(),
    localBounds: new Map(),
    onAppearanceChanged: { trigger: vi.fn() },
    get: () => undefined,
    refresh: () => {},
  })
  return component
}

describe('BimSplats.setHighlight', () => {
  it('reports the user tint, not the highlight, while highlighted', () => {
    const component = splats()
    component.setAppearance('7', { recolor: '#ff0000' })

    component.setHighlight('7', 'selected')

    expect(component.appearanceOf('7').recolor).toBe('#ff0000')
    expect(component.highlightOf('7')).toBe('selected')
  })

  it('restores the user tint when the highlight clears', () => {
    const component = splats()
    component.setAppearance('7', { recolor: '#ff0000' })

    component.setHighlight('7', 'hover')
    component.setHighlight('7', 'none')

    expect(component.appearanceOf('7').recolor).toBe('#ff0000')
    expect(component.highlightOf('7')).toBe('none')
  })

  it('keeps a tint the user changes mid-highlight', () => {
    const component = splats()
    component.setHighlight('7', 'selected')

    component.setAppearance('7', { recolor: '#00ff00' })
    component.setHighlight('7', 'none')

    expect(component.appearanceOf('7').recolor).toBe('#00ff00')
  })

  it('leaves opacity alone, so a ghosted splat stays ghosted', () => {
    const component = splats()
    component.setGhosted('7', true)

    component.setHighlight('7', 'selected')

    expect(component.isGhosted('7')).toBe(true)
  })

  it('forgets a highlight when the world tears down, so a reused id starts clean', () => {
    const component = splats()
    Object.assign(component, {
      frameHandle: 0,
      onChanged: { reset: () => {} },
      onSettingsChanged: { reset: () => {} },
      onDisposed: { trigger: () => {}, reset: () => {} },
    })
    component.onAppearanceChanged.reset = () => {}
    component.setHighlight('7', 'selected')

    component.dispose()

    expect(component.highlightOf('7')).toBe('none')
  })
})

// Spark's SplatMesh has no geometry, so bounds come from splat centres, not Box3.setFromObject.
type FakeSplat = LoadedSplat & { boundingBoxCalls: () => number }

const fakeSplat = (
  id: string,
  centers: THREE.Vector3[],
  matrixWorld = new THREE.Matrix4(),
  rootMatrixWorld: THREE.Matrix4 = matrixWorld,
): FakeSplat => {
  let calls = 0
  return {
    id,
    root: { updateMatrixWorld: vi.fn(), matrixWorld: rootMatrixWorld },
    mesh: {
      getBoundingBox: () => {
        calls++
        return new THREE.Box3().setFromPoints(centers)
      },
      matrixWorld,
      opacity: 1,
      maxSh: 3,
      recolor: { set: vi.fn() },
    },
    boundingBoxCalls: () => calls,
  } as unknown as FakeSplat
}

const boundsComponent = (registryMap: Map<string, LoadedSplat> = new Map()) => {
  const component = Object.create(BimSplats.prototype) as BimSplats
  Object.assign(component, {
    appearances: new Map(),
    highlights: new Map(),
    localBounds: new Map(),
    onAppearanceChanged: { trigger: vi.fn() },
    onChanged: { trigger: vi.fn() },
    refresh: () => {},
    registry: {
      add: vi.fn(async (id: string) => registryMap.get(id)),
      remove: vi.fn((id: string) => registryMap.delete(id)),
      get: (id: string) => registryMap.get(id),
      list: () => [...registryMap.values()],
    },
  })
  return component
}

describe('BimSplats.boundsOf', () => {
  it('reports nothing for a splat it does not hold', () => {
    const component = boundsComponent()

    expect(component.boundsOf('nope')).toBeNull()
  })

  it('returns null for a splat with zero splats loaded, instead of an empty box', () => {
    const map = new Map<string, LoadedSplat>([['a', fakeSplat('a', [])]])

    expect(boundsComponent(map).boundsOf('a')).toBeNull()
  })

  it('transforms the splat centres by the placement, not just their local extent', () => {
    const matrixWorld = new THREE.Matrix4().compose(
      new THREE.Vector3(10, 0, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(2, 2, 2),
    )
    const splat = fakeSplat('a', [new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)], matrixWorld)
    const map = new Map<string, LoadedSplat>([['a', splat]])

    const box = boundsComponent(map).boundsOf('a') as THREE.Box3

    expect(box.min.toArray()).toEqual([8, -2, -2])
    expect(box.max.toArray()).toEqual([12, 2, 2])
  })

  it('transforms by the mesh world matrix, not the root, because upFix rotates between them', () => {
    const meshMatrixWorld = new THREE.Matrix4().compose(
      new THREE.Vector3(10, 0, 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)),
      new THREE.Vector3(1, 1, 1),
    )
    const rootMatrixWorld = new THREE.Matrix4()
    const splat = fakeSplat(
      'a',
      [new THREE.Vector3(0, 0, 1), new THREE.Vector3(2, 1, 3)],
      meshMatrixWorld,
      rootMatrixWorld,
    )
    const map = new Map<string, LoadedSplat>([['a', splat]])

    const box = boundsComponent(map).boundsOf('a') as THREE.Box3

    expect(box.min.toArray().map((n: number) => Math.round(n))).toEqual([8, 0, -3])
    expect(box.max.toArray().map((n: number) => Math.round(n))).toEqual([10, 1, -1])
  })

  it('iterates the splat once, then serves the cached box on later calls', () => {
    const splat = fakeSplat('a', [new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)])
    const map = new Map<string, LoadedSplat>([['a', splat]])
    const component = boundsComponent(map)

    component.boundsOf('a')
    component.boundsOf('a')

    expect((splat as unknown as FakeSplat).boundingBoxCalls()).toBe(1)
  })

  it('drops the cached box when the splat is reloaded', async () => {
    const map = new Map<string, LoadedSplat>([['a', fakeSplat('a', [new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)])]])
    const component = boundsComponent(map)
    component.boundsOf('a')

    const reloaded = fakeSplat('a', [new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5)])
    map.set('a', reloaded)
    await component.add('a')

    const box = component.boundsOf('a') as THREE.Box3
    expect(box.max.toArray()).toEqual([5, 5, 5])
    expect((reloaded as unknown as FakeSplat).boundingBoxCalls()).toBe(1)
  })

  it('drops the cached box when the splat is removed', () => {
    const map = new Map<string, LoadedSplat>([['a', fakeSplat('a', [new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)])]])
    const component = boundsComponent(map)
    component.boundsOf('a')

    component.remove('a')
    const reloaded = fakeSplat('a', [new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5)])
    map.set('a', reloaded)

    const box = component.boundsOf('a') as THREE.Box3
    expect(box.max.toArray()).toEqual([5, 5, 5])
  })
})
