// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as OBC from '@thatopen/components'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { highlighterState, FILES, targetForCalls, translators } = vi.hoisted(() => ({
  highlighterState: {
    elementsListeners: [] as Array<(ids: number[]) => void>,
    clearedListeners: [] as Array<() => void>,
    selectedElement: [] as number[],
    selectedItems: {} as Record<string, Set<number>>,
  },
  FILES: [
    { id: 10, name: 'a.splat', extension: 'splat', uploadedAt: '2026-01-01T00:00:00Z', sizeBytes: 193_200_000 },
    { id: 20, name: 'b.splat', extension: 'splat', uploadedAt: '2026-01-01T00:00:00Z' },
    { id: 40, name: 'mesh.glb', extension: 'glb', uploadedAt: '2026-01-01T00:00:00Z' },
    { id: 50, name: 'building.frag', extension: 'frag', uploadedAt: '2026-01-01T00:00:00Z' },
  ],
  targetForCalls: { count: 0 },
  translators: new Map<string, (key: string) => string>(),
}))

/** Mirrors useSplatTarget/useModelTarget: targetFor sets state and returns a fresh object each call. */
function useFakeTarget() {
  const [, setMovingId] = React.useState<number | null>(null)
  const targetFor = React.useCallback((file: { id: number, name: string }) => {
    targetForCalls.count += 1
    setMovingId(file.id)
    return {
      id: String(file.id),
      name: file.name,
      capabilities: { rotation: 'yaw' as const, scale: true },
      object: () => null,
      read: () => ({ position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: 1, sourceUp: 'y' as const }),
      apply: () => {},
      bounds: () => null,
      commit: async () => {},
    }
  }, [])
  return { targetFor, clearMoving: () => setMovingId(null) }
}

vi.mock('@thatopen/components', () => ({ FragmentsManager: class {} }))
vi.mock('next-intl', () => ({
  useTranslations: (namespace = '') => {
    if (!translators.has(namespace)) translators.set(namespace, (key: string) => key)
    return translators.get(namespace)!
  },
}))
vi.mock('../Highlighter', () => ({ Highlighter: class {} }))
vi.mock('../IDSManager', () => ({ IDSManager: class {} }))
vi.mock('../Splats', () => ({ BimSplats: class {} }))
vi.mock('../SceneObjects', () => ({ BimSceneObjects: class {} }))
vi.mock('../Placement/PlacementEditor', () => ({ PlacementEditor: class {} }))
vi.mock('../Placement/usePlacementSession', () => ({ usePlacementSession: () => null }))
vi.mock('../Placement/targets/useSplatTarget', () => ({ useSplatTarget: () => useFakeTarget() }))
vi.mock('../Placement/targets/useModelTarget', () => ({ useModelTarget: () => useFakeTarget() }))
vi.mock('../../../../../hooks/files/files', () => ({
  useFilesByBuildingId: () => ({ files: FILES }),
  useFile: () => ({ updateFile: vi.fn(async () => {}) }),
}))

import { BimContext, BuildingsContext, ToolsContext } from '../../../../../store'

import { Highlighter } from '../Highlighter'
import { BimSceneObjects } from '../SceneObjects'
import { BimSplats } from '../Splats'

import { PropertiesMenu } from './index'

type FileSceneSelection = { kind: 'object' | 'splat', fileId: string } | null

function makeBimComponents() {
  const highlighterInstance = {
    onElementsSelected: {
      add: (listener: (ids: number[]) => void) => highlighterState.elementsListeners.push(listener),
      remove: (listener: (ids: number[]) => void) => {
        const index = highlighterState.elementsListeners.indexOf(listener)
        if (index >= 0) highlighterState.elementsListeners.splice(index, 1)
      },
    },
    onSelectionCleared: {
      add: (listener: () => void) => highlighterState.clearedListeners.push(listener),
      remove: (listener: () => void) => {
        const index = highlighterState.clearedListeners.indexOf(listener)
        if (index >= 0) highlighterState.clearedListeners.splice(index, 1)
      },
    },
    get selectedElement() { return highlighterState.selectedElement },
    get selectedItems() { return highlighterState.selectedItems },
    clearSelection: () => {},
  }

  return {
    get: (ctor: unknown) => {
      if (ctor === Highlighter) return highlighterInstance
      if (ctor === BimSplats) return {}
      if (ctor === BimSceneObjects) return { registry: { get: () => undefined } }
      if (ctor === OBC.FragmentsManager) return { core: { models: { list: new Map() } } }
      throw new Error('not registered')
    },
  }
}

interface HarnessApi { setSceneSelection: (next: FileSceneSelection) => void }

function Harness({ api, initialSceneSelection = null }: { api: HarnessApi, initialSceneSelection?: FileSceneSelection }) {
  const [sceneSelection, setSceneSelection] = React.useState<FileSceneSelection>(initialSceneSelection)
  api.setSceneSelection = setSceneSelection

  const bimComponents = React.useMemo(() => makeBimComponents(), [])
  const bimValue = React.useMemo(() => ({ state: { bim: { bimComponents, sceneSelection } }, dispatch: vi.fn() }), [bimComponents, sceneSelection])
  const toolsValue = React.useMemo(() => ({ state: { tools: { currentToolId: null } }, dispatch: vi.fn() }), [])
  const buildingsValue = React.useMemo(() => ({
    state: { buildings: { buildings: [], building: { id: 7 } } }, dispatch: vi.fn(), compareItems: [],
  }), [])

  return (
    <BimContext.Provider value={bimValue as any}>
      <ToolsContext.Provider value={toolsValue as any}>
        <BuildingsContext.Provider value={buildingsValue as any}>
          <PropertiesMenu />
        </BuildingsContext.Provider>
      </ToolsContext.Provider>
    </BimContext.Provider>
  )
}

afterEach(() => {
  highlighterState.elementsListeners = []
  highlighterState.clearedListeners = []
  highlighterState.selectedElement = []
  highlighterState.selectedItems = {}
  targetForCalls.count = 0
})

describe('PropertiesMenu selection wiring', () => {
  it('does not lose an already-open panel to a stale close timer when a new selection lands mid-close', () => {
    vi.useFakeTimers()
    try {
      const api = {} as HarnessApi
      render(<Harness api={api} initialSceneSelection={{ kind: 'splat', fileId: '10' }} />)
      expect(screen.getByText('a.splat')).toBeInTheDocument()

      act(() => {
        for (const listener of [...highlighterState.clearedListeners]) listener()
        api.setSceneSelection({ kind: 'splat', fileId: '20' })
      })

      expect(screen.getByText('b.splat')).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(300) })

      expect(screen.getByText('b.splat')).toBeInTheDocument()
      expect(screen.queryByText('a.splat')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders a splat selection without a render-loop crash', () => {
    const api = {} as HarnessApi
    render(<Harness api={api} />)

    act(() => { api.setSceneSelection({ kind: 'splat', fileId: '10' }) })

    expect(screen.getByText('a.splat')).toBeInTheDocument()
    expect(targetForCalls.count).toBe(1)
  })

  it('shows file identity values without running them through the BIM numeric formatter', () => {
    const api = {} as HarnessApi
    render(<Harness api={api} />)

    act(() => { api.setSceneSelection({ kind: 'splat', fileId: '10' }) })

    expect(screen.getByText('193.2 MB')).toBeInTheDocument()
    expect(screen.getByText(new Date('2026-01-01T00:00:00Z').toLocaleString())).toBeInTheDocument()
  })

  it('renders an object selection without a render-loop crash', () => {
    const api = {} as HarnessApi
    render(<Harness api={api} />)

    act(() => { api.setSceneSelection({ kind: 'object', fileId: '40' }) })

    expect(screen.getByText('mesh.glb')).toBeInTheDocument()
    expect(targetForCalls.count).toBe(1)
  })

  it('renders a BIM element selection without a render-loop crash', async () => {
    highlighterState.selectedItems = { 'building.frag': new Set([1]) }
    const api = {} as HarnessApi
    render(<Harness api={api} />)

    await act(async () => {
      for (const listener of [...highlighterState.elementsListeners]) listener([1])
    })

    await waitFor(() => expect(targetForCalls.count).toBe(1))
  })

  it('does not rebuild the target when the panel re-renders without a new selection', () => {
    const api = {} as HarnessApi
    render(<Harness api={api} />)

    act(() => { api.setSceneSelection({ kind: 'splat', fileId: '10' }) })
    expect(targetForCalls.count).toBe(1)

    fireEvent.click(screen.getByText('identity'))

    expect(targetForCalls.count).toBe(1)
  })
})
