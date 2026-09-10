// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../../../../hooks/files/files', () => ({
  useFile: () => ({ updateFile: vi.fn(() => Promise.resolve()) }),
}))

vi.mock('../../../../Placement/usePlacementSession', () => ({
  usePlacementSession: () => null,
}))

// jsdom can't load @thatopen/components here; the hook only uses these as bimComponents.get() keys.
vi.mock('../../../../ModelManager', () => ({ ModelManager: class {} }))
vi.mock('../../../../DXFLoader', () => ({ DXFManager: class {} }))
vi.mock('../../../../Highlighter', () => ({ Highlighter: class {} }))
vi.mock('../../../../CurrentWorld', () => ({ CurrentWorld: class {} }))
vi.mock('../../../../Cursor', () => ({ Cursor: class {} }))
vi.mock('../../../../Placement/PlacementEditor', () => ({ PlacementEditor: class {} }))
vi.mock('../../../../SceneObjects', () => ({ BimSceneObjects: class {} }))

import { BimContext } from '../../../../../../../../store/BIM/context'
import { CurrentWorld } from '../../../../CurrentWorld'
import { Cursor } from '../../../../Cursor'
import { ModelManager } from '../../../../ModelManager'
import { BimSceneObjects } from '../../../../SceneObjects'

import { usePlaceableFileRows } from './usePlaceableFileRows'

import type { DbFile } from '../../../../../../../../types/dbTypes'

const added: ((entry: unknown) => void)[] = []
const registry = {
  add: vi.fn(), remove: vi.fn(), clear: vi.fn(), setVisible: vi.fn(), resetForBuilding: vi.fn(),
  get: vi.fn(() => undefined), has: vi.fn(() => false),
  onAdded: vi.fn((cb: (entry: unknown) => void) => { added.push(cb); return () => undefined }),
  onRemoved: vi.fn(() => () => undefined),
}

// Everything but the scene registry is unregistered, matching what a bare viewer exposes.
const bimComponents = {
  get: (ctor: unknown) => {
    if (ctor === BimSceneObjects) return { registry }
    throw new Error('not registered')
  },
}

const file = (partial: Partial<DbFile>): DbFile => ({ id: 1, name: 'm.glb', extension: 'glb', ...partial }) as DbFile

function wrapper({ children }: { children: React.ReactNode }) {
  const value = { state: { bim: { bimComponents, fragments: null, world: null } }, dispatch: vi.fn() }
  return <BimContext.Provider value={value as any}>{children}</BimContext.Provider>
}

const options = {
  files: [] as DbFile[],
  buildingId: 7,
  isPlaceable: (extension?: string | null) => extension === 'glb',
  placeHint: (name: string) => `place ${name}`,
}

const modelLoad = vi.fn(async () => ({ model: { position: { copy: vi.fn() } } }))

// A viewer with a world and a model loader, which click-to-place needs to reach the scene.
const placingComponents = {
  get: (ctor: unknown) => {
    if (ctor === BimSceneObjects) return { registry }
    if (ctor === ModelManager) return { load: modelLoad, getClips: () => [] }
    if (ctor === CurrentWorld) return { world: { camera: { three: {} }, renderer: { three: { domElement: document.createElement('canvas') } } } }
    if (ctor === Cursor) return { cursor: '' }
    throw new Error('not registered')
  },
}

function placingWrapper({ children }: { children: React.ReactNode }) {
  const value = { state: { bim: { bimComponents: placingComponents, fragments: null, world: null } }, dispatch: vi.fn() }
  return <BimContext.Provider value={value as any}>{children}</BimContext.Provider>
}

describe('usePlaceableFileRows', () => {
  it('resolves the scene registry from BIM components without crashing when rows are empty', () => {
    const { result } = renderHook(() => usePlaceableFileRows(options), { wrapper })
    expect(result.current.rows).toEqual([])
    expect(result.current.registry).toBe(registry)
  })

  it('flips a row visible when the registry reports the object arrived', async () => {
    const { result } = renderHook(() => usePlaceableFileRows(options), { wrapper })

    act(() => { result.current.setRows([file({})]) })

    added.at(-1)?.({ fileId: '1', kind: 'model' })

    await waitFor(() => expect(result.current.rows[0].isVisible).toBe(true))
  })

  it('lists the files it is given, so a section need not sync them itself', async () => {
    const given = [file({ id: 2, name: 'b.dae', extension: 'dae' }), file({ id: 1, name: 'a.glb' })]
    const { result } = renderHook(() => usePlaceableFileRows({ ...options, files: given }), { wrapper })

    await waitFor(() => expect(result.current.rows.map(row => row.name)).toEqual(['a.glb', 'b.dae']))
  })

  it.each(['glb', 'dae'])('double-click places an unplaced .%s into the scene', async (extension) => {
    modelLoad.mockClear()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ presignedUrl: 'u' }) })))
    const placed = file({ id: 9, name: `m.${extension}`, extension })
    const { result } = renderHook(
      () => usePlaceableFileRows({ ...options, files: [placed] }),
      { wrapper: placingWrapper },
    )

    act(() => { result.current.handleMove(placed) })
    await act(async () => { document.dispatchEvent(new MouseEvent('dblclick')) })

    await waitFor(() => expect(modelLoad).toHaveBeenCalledWith('u', '9', `m.${extension}`, expect.anything()))
  })

  it('ignores a marker entry, since it has no file to report visibility for', async () => {
    const { result } = renderHook(() => usePlaceableFileRows(options), { wrapper })

    act(() => { result.current.setRows([file({})]) })

    added.at(-1)?.({ fileId: null, kind: 'marker' })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(result.current.rows[0].isVisible).toBeUndefined()
  })
})
