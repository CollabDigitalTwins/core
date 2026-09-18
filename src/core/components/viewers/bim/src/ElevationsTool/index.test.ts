// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CurrentWorld } from '../CurrentWorld'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'

import { ElevationsTool } from './index'

import type { ElevationEntry, ElevationLoadingState } from './index'

const spies = vi.hoisted(() => ({
  apply: vi.fn(
    async (
      _key: string,
      _resolve: unknown,
      onStage?: (stage: string) => void,
    ) => {
      onStage?.('cull')
    },
  ),
  restore: vi.fn(async () => {}),
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
vi.mock('../lib/drawingProjection', () => ({ disposeDrawing: vi.fn() }))
vi.mock('../lib/CategoryHighlighter', () => ({
  CategoryHighlighter: class CategoryHighlighter {
    apply = spies.apply
    restore = spies.restore
    invalidateForEntry() {}
    invalidateForModel() {}
  },
}))
vi.mock('./src/ElevationProjector', () => ({
  ElevationProjector: class ElevationProjector {
    project = spies.project
    async ensureEditorReady() {}
    buildEntries() { return [] }
  },
}))

function makeEntry(): ElevationEntry {
  return {
    id: 'model-1::elev::north',
    direction: 'north',
    modelId: 'model-1',
    position: new THREE.Vector3(0, 5, 12),
    viewDirection: new THREE.Vector3(0, 0, -1),
    viewport: { left: -6, right: 6, top: 6, bottom: -6 },
    far: 14,
    modelBox: new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 10, 5)),
    drawing: null,
    projected: false,
    layers: [],
  }
}

function makeTool() {
  const model = { box: new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 10, 5)) }
  const fragments = {
    list: Object.assign(new Map([['model-1', model]]), {
      onItemDeleted: { add() {}, remove() {} },
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

  const tool = new ElevationsTool(components)
  const entry = makeEntry()
  ;(tool as unknown as { _entries: Map<string, ElevationEntry> })._entries.set(entry.id, entry)

  const states: ElevationLoadingState[] = []
  tool.onLoadingStateChanged.add((state) => states.push(state))

  return { tool, entry, states, editor }
}

describe('ElevationsTool activation split', () => {
  beforeEach(() => {
    spies.apply.mockClear()
    spies.restore.mockClear()
    spies.project.mockClear()
    spies.project.mockImplementation(async (entry: ElevationEntry) => {
      entry.drawing = { three: new THREE.Object3D(), layers: new Map() } as never
      entry.projected = true
    })
  })

  it('finishes activation without projecting any lines', async () => {
    const { tool, entry, states } = makeTool()

    await tool.activate(entry.id)

    expect(spies.project).not.toHaveBeenCalled()
    expect(entry.projected).toBe(false)
    expect(states.at(-1)).toEqual({ isLoading: false, stage: 'done' })
  })

  it('leaves the model visible as the preview of an unprojected elevation', async () => {
    const { tool, entry } = makeTool()

    await tool.activate(entry.id)

    expect(spies.apply).not.toHaveBeenCalled()
    expect(spies.restore).toHaveBeenCalledTimes(1)
  })

  it('culls and projects only when generateLines is called', async () => {
    const { tool, entry, states } = makeTool()

    await tool.activate(entry.id)
    states.length = 0
    await tool.generateLines(entry.id)

    expect(spies.apply).toHaveBeenCalledTimes(1)
    expect(spies.project).toHaveBeenCalledTimes(1)
    expect(entry.projected).toBe(true)
    expect(states.some((s) => s.stage === 'project')).toBe(true)
    expect(states.at(-1)).toEqual({ isLoading: false, stage: 'done' })
  })

  it('shows an already-projected entry without projecting it again', async () => {
    const { tool, entry } = makeTool()
    entry.drawing = { three: new THREE.Object3D(), layers: new Map() } as never
    entry.projected = true

    await tool.activate(entry.id)

    expect(spies.apply).toHaveBeenCalledTimes(1)
    expect(spies.project).not.toHaveBeenCalled()
    expect((entry.drawing as unknown as { three: THREE.Object3D }).three.visible).toBe(true)
  })

  it('ignores generateLines for an entry that is not active', async () => {
    const { tool, entry } = makeTool()

    await tool.generateLines(entry.id)

    expect(spies.project).not.toHaveBeenCalled()
  })
})
