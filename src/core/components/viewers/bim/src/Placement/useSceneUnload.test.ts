// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

import { unloadFromScene } from './useSceneUnload'

import type { SceneUnloadDeps } from './useSceneUnload'
import type { DbFile } from '../../../../../types/dbTypes'

const file = { id: 7, name: 'tower.ifc' } as DbFile

function deps(overrides: Partial<SceneUnloadDeps> = {}) {
  const registry = { remove: vi.fn() }
  const modelManager = { remove: vi.fn() }
  const bimManager = { remove: vi.fn() }
  const spatial = { clearForModel: vi.fn() }
  const disposeModel = vi.fn().mockResolvedValue(undefined)

  const components = {
    get: vi.fn((token: { name?: string }) => {
      if (token.name === 'BimSceneObjects') return { registry }
      if (token.name === 'ModelManager') return modelManager
      if (token.name === 'BIMManager') return bimManager
      if (token.name === 'SpatialStructure') return spatial
      return null
    }),
  }

  const base: SceneUnloadDeps = {
    components: components as never,
    fragments: { core: { models: { list: new Map([['tower.ifc', { modelId: 'm1' }]]) }, disposeModel } } as never,
    splatIds: [],
    pointCloudIds: [],
    dispatch: vi.fn(),
    ...overrides,
  }

  return { base, registry, modelManager, bimManager, spatial, disposeModel }
}

describe('unloadFromScene', () => {
  it('removes an object from the scene registry', () => {
    const { base, registry } = deps()
    unloadFromScene(file, 'object', base)
    expect(registry.remove).toHaveBeenCalledWith('7')
  })

  it('toggles a visible splat off', () => {
    const { base } = deps({ splatIds: ['7'] })
    unloadFromScene(file, 'splat', base)
    expect(base.dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SPLAT', payload: { splatId: '7' } })
  })

  it('leaves an already hidden splat alone, so the toggle cannot switch it back on', () => {
    const { base } = deps({ splatIds: [] })
    unloadFromScene(file, 'splat', base)
    expect(base.dispatch).not.toHaveBeenCalled()
  })

  it('toggles a visible point cloud off', () => {
    const { base } = deps({ pointCloudIds: ['7'] })
    unloadFromScene(file, 'cloud', base)
    expect(base.dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: '7' } })
  })

  it('leaves an already hidden point cloud alone', () => {
    const { base } = deps({ pointCloudIds: [] })
    unloadFromScene(file, 'cloud', base)
    expect(base.dispatch).not.toHaveBeenCalled()
  })

  it('disposes a bim model everywhere it is registered', () => {
    const { base, modelManager, bimManager, spatial, disposeModel } = deps()
    unloadFromScene(file, 'model', base)
    expect(modelManager.remove).toHaveBeenCalledWith('7')
    expect(disposeModel).toHaveBeenCalledWith('m1')
    expect(bimManager.remove).toHaveBeenCalledWith('tower.ifc')
    expect(spatial.clearForModel).toHaveBeenCalledWith('tower.ifc')
  })

  it('still drops a bim model from the model manager when no fragment matches', () => {
    const { base, modelManager, disposeModel } = deps({
      fragments: { core: { models: { list: new Map() }, disposeModel: vi.fn() } } as never,
    })
    unloadFromScene(file, 'model', base)
    expect(modelManager.remove).toHaveBeenCalledWith('7')
    expect(disposeModel).not.toHaveBeenCalled()
  })

  it('does nothing without components rather than throwing at teardown', () => {
    const { base } = deps({ components: null })
    expect(() => unloadFromScene(file, 'object', base)).not.toThrow()
    expect(() => unloadFromScene(file, 'model', base)).not.toThrow()
  })

  it('survives a component registry that throws while the viewer tears down', () => {
    const throwing = { get: vi.fn(() => { throw new Error('disposed') }) }
    const { base } = deps({ components: throwing as never })
    expect(() => unloadFromScene(file, 'object', base)).not.toThrow()
    expect(() => unloadFromScene(file, 'model', base)).not.toThrow()
  })
})
