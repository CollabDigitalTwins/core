// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { SplatRegistry, splatRootName } from './splatRegistry'

import type { SplatEngine } from './splatLoader'
import type { SplatPlacement } from './splatUpAxis'
import type { SplatMesh } from '@sparkjsdev/spark'

const fakeMesh = () => {
  const mesh = new THREE.Object3D() as unknown as SplatMesh
  const dispose = vi.fn()
  ;(mesh as unknown as { dispose: () => void }).dispose = dispose
  return { mesh, dispose }
}

const setup = (overrides: { resolve?: SplatEngine['load'] } = {}) => {
  const scene = new THREE.Group()
  const meshDisposals: ReturnType<typeof vi.fn>[] = []
  const load = overrides.resolve ?? vi.fn(async () => {
    const { mesh, dispose } = fakeMesh()
    meshDisposals.push(dispose)
    return mesh
  })
  const disposeEngine = vi.fn()
  const engine: SplatEngine = {
    attach: vi.fn(),
    load,
    configure: vi.fn(),
    settings: vi.fn(() => null),
    material: vi.fn(() => null),
    dispose: disposeEngine,
  }
  const source = { resolve: vi.fn(async (id: string) => ({ url: `https://x.test/${id}.spz`, name: `splat ${id}` })) }
  return {
    scene,
    engine,
    source,
    load,
    disposeEngine,
    meshDisposals,
    registry: new SplatRegistry({ scene, engine, source }),
  }
}

const placement = (partial: Partial<SplatPlacement> = {}): SplatPlacement => ({
  position: [1, 2, 3],
  rotation: [0, 0, 0],
  scale: 2,
  sourceUp: 'y',
  ...partial,
})

describe('add', () => {
  it('puts a named root carrying the mesh into the scene', async () => {
    const { registry, scene } = setup()

    const loaded = await registry.add('7')

    expect(scene.children).toContain(loaded.root)
    expect(loaded.root.name).toBe(splatRootName('7'))
    expect(loaded.name).toBe('splat 7')
  })

  it('applies the placement to the root', async () => {
    const { registry } = setup()

    const loaded = await registry.add('7', placement())

    expect(loaded.root.position.toArray()).toEqual([1, 2, 3])
    expect(loaded.root.scale.x).toBeCloseTo(2)
  })

  it('loads a given splat once even when asked twice concurrently', async () => {
    const { registry, load, scene } = setup()

    const [first, second] = await Promise.all([registry.add('7'), registry.add('7')])

    expect(first).toBe(second)
    expect(load).toHaveBeenCalledTimes(1)
    expect(scene.children).toHaveLength(1)
  })

  it('lets a later add retry after a failed load', async () => {
    const retryLoad = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(fakeMesh().mesh)
    const { registry } = setup({ resolve: retryLoad as unknown as SplatEngine['load'] })

    await expect(registry.add('7')).rejects.toThrow('offline')
    await expect(registry.add('7')).resolves.toBeDefined()
  })
})

describe('setPlacement', () => {
  it('moves the root and re-levels the up fix', async () => {
    const { registry } = setup()
    await registry.add('7')

    registry.setPlacement('7', placement({ position: [5, 0, 0], sourceUp: 'z' }))
    const loaded = registry.get('7')!

    expect(loaded.root.position.x).toBeCloseTo(5)
    expect(loaded.placement.sourceUp).toBe('z')
    expect(loaded.root.children[0].quaternion.x).toBeCloseTo(-Math.sqrt(0.5))
  })

  it('ignores an unknown id', () => {
    const { registry } = setup()
    expect(() => registry.setPlacement('nope', placement())).not.toThrow()
  })
})

describe('setVisible', () => {
  it('hides and shows the root', async () => {
    const { registry } = setup()
    await registry.add('7')

    registry.setVisible('7', false)
    expect(registry.get('7')!.root.visible).toBe(false)

    registry.setVisible('7', true)
    expect(registry.get('7')!.root.visible).toBe(true)
  })
})

describe('remove', () => {
  it('detaches the root and frees the mesh', async () => {
    const { registry, scene, meshDisposals } = setup()
    const loaded = await registry.add('7')

    registry.remove('7')

    expect(scene.children).not.toContain(loaded.root)
    expect(meshDisposals[0]).toHaveBeenCalledTimes(1)
    expect(registry.get('7')).toBeUndefined()
  })
})

describe('dispose', () => {
  it('frees every splat and the engine behind them', async () => {
    const { registry, disposeEngine, scene, meshDisposals } = setup()
    await registry.add('7')
    await registry.add('8')

    registry.dispose()

    expect(scene.children).toHaveLength(0)
    expect(registry.list()).toHaveLength(0)
    for (const dispose of meshDisposals) expect(dispose).toHaveBeenCalledTimes(1)
    expect(disposeEngine).toHaveBeenCalledTimes(1)
  })
})
