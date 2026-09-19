// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CurrentWorld } from '../CurrentWorld'
import { disposeDrawing } from '../lib/drawingProjection'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'

import { FloorplanTool } from './index'

import type { FloorplanEntry, FloorplanLoadingState } from './index'

const spies = vi.hoisted(() => ({
  apply: vi.fn(async (_entry: unknown, onStage?: (stage: string) => void) => {
    onStage?.('fill')
  }),
  project: vi.fn(),
}))

vi.mock('@thatopen/components', () => {
  class Event<T> {
    private _cbs: ((value: T) => void)[] = []
    add(cb: (value: T) => void) { this._cbs.push(cb) }
    remove(cb: (value: T) => void) { this._cbs = this._cbs.filter((c) => c !== cb) }
    trigger(value: T) { for (const cb of this._cbs) cb(value) }
  }
  return {
    Component: class Component {
      constructor(public components: unknown) {}
    },
    Event,
    FragmentsManager: class FragmentsManager {},
  }
})
vi.mock('@thatopen/components-front', () => ({ DrawingEditor: class DrawingEditor {} }))
vi.mock('../CurrentWorld', () => ({ CurrentWorld: class CurrentWorld {} }))
vi.mock('../lib/ViewModeCoordinator', () => ({ ViewModeCoordinator: class ViewModeCoordinator {} }))
vi.mock('../lib/CameraController', () => ({
  CameraController: class CameraController {
    lock() {} unlock() {} frame() {} rotateTo() {}
  },
}))
vi.mock('../lib/ChromeController', () => ({
  ChromeController: class ChromeController {
    applyLighting() {} applyDrawingBackground() {} setCursor() {}
    disableHighlighter() {} hideGizmo() {} hideSceneContent() {}
    restoreCursor() {} restoreHighlighter() {} showGizmo() {}
    removeLighting() {} restoreBackground() {} restoreSceneContent() {}
  },
}))
vi.mock('../lib/ClipController', () => ({
  ClipController: class ClipController { set() {} removeAll() {} },
}))
vi.mock('../lib/GridController', () => ({
  GridController: class GridController { hide() {} restore() {} setGrid() {} },
}))
vi.mock('../lib/drawingLayers', () => ({ CUT_CLASSES: new Set(), FILL_CLASSES: new Set() }))
vi.mock('../lib/drawingProjection', () => ({ disposeDrawing: vi.fn() }))
vi.mock('../lib/spaceOverlay', () => ({ SPACES_LAYER: 'SPACES' }))
vi.mock('./src/FloorplanRenderer', () => ({
  FloorplanRenderer: class FloorplanRenderer {
    apply = spies.apply
    async restore() {}
    invalidateForEntry() {}
    invalidateForModel() {}
  },
}))
vi.mock('./src/StoreyProjector', () => ({
  StoreyProjector: class StoreyProjector {
    project = spies.project
    async ensureEditorReady() {}
    async getCachedStoreyIds() { return [] }
    invalidateForModel() {}
  },
}))

function makeEntry(): FloorplanEntry {
  return {
    id: 'model-1::L1',
    name: 'L1',
    elevation: 3,
    storeyLocalId: 1,
    modelId: 'model-1',
    drawing: null,
    projected: false,
    layers: [],
  }
}

function makeTool() {
  const model = { box: new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 10, 5)) }
  const deleteHandlers: ((modelId: string) => void)[] = []
  const fragments = {
    list: Object.assign(new Map([['model-1', model]]), {
      onItemDeleted: {
        add(cb: (modelId: string) => void) { deleteHandlers.push(cb) },
        remove(cb: (modelId: string) => void) {
          const at = deleteHandlers.indexOf(cb)
          if (at >= 0) deleteHandlers.splice(at, 1)
        },
      },
    }),
    core: { onModelLoaded: { add() {} }, update: vi.fn() },
  }
  const editor = { activeDrawing: null as unknown }
  const world = { camera: { controls: { fitToBox: vi.fn(async () => {}) } } }
  const components = {
    add() {},
    get(ctor: unknown) {
      if (ctor === OBC.FragmentsManager) return fragments
      if (ctor === OBF.DrawingEditor) return editor
      if (ctor === CurrentWorld) return { world }
      if (ctor === ViewModeCoordinator) return { claim: async () => {}, release() {} }
      return {}
    },
  } as unknown as OBC.Components

  const tool = new FloorplanTool(components)
  const entry = makeEntry()
  ;(tool as unknown as { _entries: Map<string, FloorplanEntry> })._entries.set(entry.id, entry)

  const states: FloorplanLoadingState[] = []
  tool.onGenerationStateChanged.add((state) => states.push(state))

  return { tool, entry, states, editor, deleteHandlers }
}

describe('FloorplanTool activation split', () => {
  beforeEach(() => {
    spies.apply.mockClear()
    spies.project.mockClear()
    spies.project.mockImplementation(async (entry: FloorplanEntry) => {
      entry.drawing = { three: new THREE.Object3D(), layers: new Map() } as never
      entry.projected = true
    })
  })

  it('finishes activation without projecting any lines', async () => {
    const { tool, entry, states } = makeTool()

    await tool.activate(entry.id)

    expect(spies.apply).toHaveBeenCalledTimes(1)
    expect(spies.project).not.toHaveBeenCalled()
    expect(entry.projected).toBe(false)
    expect(states.at(-1)).toEqual({ isLoading: false, stage: 'done' })
  })

  it('projects only when generateLines is called, reporting the project stage', async () => {
    const { tool, entry, states } = makeTool()

    await tool.activate(entry.id)
    states.length = 0
    await tool.generateLines(entry.id)

    expect(spies.project).toHaveBeenCalledTimes(1)
    expect(entry.projected).toBe(true)
    expect(states[0]).toEqual({ isLoading: true, stage: 'project' })
    expect(states.at(-1)).toEqual({ isLoading: false, stage: 'done' })
  })

  it('shows an already-projected entry without projecting it again', async () => {
    const { tool, entry } = makeTool()
    entry.drawing = { three: new THREE.Object3D(), layers: new Map() } as never
    entry.projected = true

    await tool.activate(entry.id)

    expect(spies.project).not.toHaveBeenCalled()
    expect((entry.drawing as unknown as { three: THREE.Object3D }).three.visible).toBe(true)
  })

  it('ignores generateLines for an entry that is not active', async () => {
    const { tool, entry } = makeTool()

    await tool.generateLines(entry.id)

    expect(spies.project).not.toHaveBeenCalled()
  })
})

describe('FloorplanTool resetAll', () => {
  beforeEach(() => {
    vi.mocked(disposeDrawing).mockClear()
    spies.project.mockImplementation(async (entry: FloorplanEntry) => {
      entry.drawing = { three: new THREE.Object3D(), layers: new Map() } as never
      entry.projected = true
    })
  })

  it('drops every drawing and resets north without unsubscribing', async () => {
    const { tool, entry, editor, deleteHandlers } = makeTool()
    await tool.activate(entry.id)
    await tool.generateLines(entry.id)
    tool.setNorthAngle(45)
    const drawing = entry.drawing

    tool.resetAll()

    expect(tool.drawings).toEqual([])
    expect(tool.activeDrawingId).toBeNull()
    expect(tool.northAngle).toBe(0)
    expect(editor.activeDrawing).toBeNull()
    expect(vi.mocked(disposeDrawing)).toHaveBeenCalledWith(expect.anything(), drawing)
    expect(deleteHandlers).toHaveLength(1)
  })

  it('still projects for the next building after a reset', async () => {
    const { tool, entry } = makeTool()
    await tool.activate(entry.id)
    await tool.generateLines(entry.id)

    tool.resetAll()

    const next = makeEntry()
    ;(tool as unknown as { _entries: Map<string, FloorplanEntry> })._entries.set(next.id, next)
    await tool.activate(next.id)
    await tool.generateLines(next.id)

    expect(next.projected).toBe(true)
  })
})
