// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../../../../hooks/files/files', () => ({
  useFile: () => ({ updateFile: vi.fn() }),
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

  it('ignores a marker entry, since it has no file to report visibility for', async () => {
    const { result } = renderHook(() => usePlaceableFileRows(options), { wrapper })

    act(() => { result.current.setRows([file({})]) })

    added.at(-1)?.({ fileId: null, kind: 'marker' })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(result.current.rows[0].isVisible).toBeUndefined()
  })
})
