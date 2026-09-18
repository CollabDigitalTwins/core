// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CurrentWorld } from '../CurrentWorld'
import { disposeDrawing } from '../lib/drawingProjection'
import { ViewModeCoordinator } from '../lib/ViewModeCoordinator'
import { ClippingPlanes } from '../tools/ClippingTool/ClippingPlanes'

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
vi.mock('../tools/ClippingTool/ClippingPlanes', () => ({
  ClippingPlanes: class ClippingPlanes {},
}))
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
  const planeHandlers: ((planes: { key: string }[]) => void)[] = []
  const clipping = {
    onChanged: {
      add(cb: (planes: { key: string }[]) => void) { planeHandlers.push(cb) },
      remove(cb: (planes: { key: string }[]) => void) {
        const at = planeHandlers.indexOf(cb)
        if (at >= 0) planeHandlers.splice(at, 1)
      },
    },
  }
  const components = {
    add() {},
    get(ctor: unknown) {
      if (ctor === OBC.FragmentsManager) return fragments
      if (ctor === OBF.DrawingEditor) return editor
      if (ctor === CurrentWorld) return { world }
      if (ctor === ViewModeCoordinator) return { claim: async () => {}, release() {} }
      if (ctor === ClippingPlanes) return clipping
      return {}
    },
  } as unknown as OBC.Components

  const tool = new ElevationsTool(components)
  const entry = makeEntry()
  ;(tool as unknown as { _entries: Map<string, ElevationEntry> })._entries.set(entry.id, entry)

  const states: ElevationLoadingState[] = []
  tool.onLoadingStateChanged.add((state) => states.push(state))

  return { tool, entry, states, editor, deleteHandlers, planeHandlers }
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

describe('ElevationsTool resetAll', () => {
  beforeEach(() => {
    vi.mocked(disposeDrawing).mockClear()
    spies.project.mockImplementation(async (entry: ElevationEntry) => {
      entry.drawing = { three: new THREE.Object3D(), layers: new Map() } as never
      entry.projected = true
    })
  })

  it('drops every drawing without unsubscribing', async () => {
    const { tool, entry, editor, deleteHandlers } = makeTool()
    await tool.activate(entry.id)
    await tool.generateLines(entry.id)
    const drawing = entry.drawing

    tool.resetAll()

    expect(tool.elevations).toEqual([])
    expect(tool.activeId).toBeNull()
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
    ;(tool as unknown as { _entries: Map<string, ElevationEntry> })._entries.set(next.id, next)
    await tool.activate(next.id)
    await tool.generateLines(next.id)

    expect(next.projected).toBe(true)
  })
})

describe('ElevationsTool custom entries', () => {
  beforeEach(() => {
    vi.mocked(disposeDrawing).mockClear()
    spies.project.mockClear()
    spies.project.mockImplementation(async (entry: ElevationEntry) => {
      entry.drawing = { three: new THREE.Object3D(), layers: new Map() } as never
      entry.projected = true
    })
  })

  const plane = (key: string) => ({
    key,
    normal: new THREE.Vector3(1, 0, 0),
    point: new THREE.Vector3(0, 4, 0),
  })

  it('adds an entry cut from a plane and announces it', () => {
    const { tool } = makeTool()
    const seen: ElevationEntry[][] = []
    tool.onElevationsChanged.add((entries) => seen.push(entries))

    const id = tool.addFromPlane(plane('plane-0'), 'Section 1')

    expect(id).not.toBeNull()
    const added = tool.elevations.find((entry) => entry.id === id)
    expect(added?.label).toBe('Section 1')
    expect(added?.planeKey).toBe('plane-0')
    expect(added?.modelId).toBe('model-1')
    expect(seen.at(-1)?.some((entry) => entry.id === id)).toBe(true)
  })

  it('previews without projecting, then projects on demand like any elevation', async () => {
    const { tool } = makeTool()
    const id = tool.addFromPlane(plane('plane-0'), 'Section 1')!

    await tool.activate(id)
    expect(spies.project).not.toHaveBeenCalled()

    await tool.generateLines(id)
    expect(spies.project).toHaveBeenCalledTimes(1)
  })

  it('disposes the drawing when its source plane is deleted', async () => {
    const { tool, planeHandlers } = makeTool()
    const id = tool.addFromPlane(plane('plane-0'), 'Section 1')!
    await tool.activate(id)
    await tool.generateLines(id)
    const drawing = tool.elevations.find((entry) => entry.id === id)?.drawing

    planeHandlers.forEach((notify) => notify([]))

    expect(tool.elevations.some((entry) => entry.id === id)).toBe(false)
    expect(vi.mocked(disposeDrawing)).toHaveBeenCalledWith(expect.anything(), drawing)
    expect(tool.activeId).toBeNull()
  })

  it('keeps entries whose plane is still there, and the cardinal ones too', () => {
    const { tool, entry, planeHandlers } = makeTool()
    const kept = tool.addFromPlane(plane('plane-0'), 'Section 1')!
    const dropped = tool.addFromPlane(plane('plane-1'), 'Section 2')!

    planeHandlers.forEach((notify) => notify([{ key: 'plane-0' }]))

    expect(tool.elevations.map((e) => e.id)).toContain(kept)
    expect(tool.elevations.map((e) => e.id)).toContain(entry.id)
    expect(tool.elevations.map((e) => e.id)).not.toContain(dropped)
  })

  it('drops a custom entry with the rest on resetAll', () => {
    const { tool } = makeTool()
    tool.addFromPlane(plane('plane-0'), 'Section 1')

    tool.resetAll()

    expect(tool.elevations).toEqual([])
  })
})
