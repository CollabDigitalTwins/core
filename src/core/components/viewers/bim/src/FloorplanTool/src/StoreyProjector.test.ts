// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StoreyProjector } from './StoreyProjector'
import { storeyLowerClipY } from './utils'

import type { FloorplanEntry } from './types'

const createDrawing = vi.fn(() => null)

vi.mock('@thatopen/components', () => ({ FragmentsManager: class FragmentsManager {} }))
vi.mock('@thatopen/components-front', () => ({ DrawingEditor: class DrawingEditor {} }))
vi.mock('../../CurrentWorld', () => ({ CurrentWorld: class CurrentWorld {} }))
vi.mock('../../lib/spaceOverlay', () => ({ addSpacesToDrawing: vi.fn() }))
vi.mock('../../tools/AddToBim/src/FileMarkerUtils', () => ({
  initializeCSS2DRenderer: vi.fn(),
}))
vi.mock('../../lib/drawingProjection', () => ({
  addDoorSwingsToDrawing: vi.fn(),
  addItemsProjectionByClass: vi.fn(),
  createDrawing: (...args: unknown[]) => createDrawing(...(args as [])),
  disableProjectorWebGPU: vi.fn(),
  DrawingEditorReady: class DrawingEditorReady {
    ensure() { return Promise.resolve() }
  },
  getItemIdsByClass: vi.fn(),
  patchModelGeometryRepresentationIds: vi.fn(),
}))

function projectorFor(elevation: number) {
  const model = {
    box: new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 10, 5)),
    getItemsIdsWithGeometry: () => new Promise<number[]>(() => {}),
  }
  const components = {
    get: () => ({ list: new Map([['model-1', model]]), core: { update: vi.fn() } }),
  } as any
  const entry: FloorplanEntry = {
    id: 'model-1::L1',
    name: 'L1',
    elevation,
    storeyLocalId: 1,
    modelId: 'model-1',
    drawing: null,
    projected: false,
    layers: [],
  }
  return { projector: new StoreyProjector(components), entry }
}

describe('StoreyProjector cut volume', () => {
  beforeEach(() => createDrawing.mockClear())

  it.each([0, 3.2, -4.5])(
    'bottoms the captured volume out at the lower clip plane (elevation %s)',
    async (elevation) => {
      const { projector, entry } = projectorFor(elevation)

      await projector.project(entry)

      const config = createDrawing.mock.calls[0][1] as {
        position: THREE.Vector3
        far: number
      }
      expect(config.position.y - config.far).toBeCloseTo(storeyLowerClipY(elevation), 6)
    },
  )
})

describe('StoreyProjector in-flight teardown', () => {
  beforeEach(() => createDrawing.mockReset())

  it('makes the drawing reachable from the entry before the first await', () => {
    const { projector, entry } = projectorFor(0)
    const drawing = { three: new THREE.Object3D(), layers: new Map() }
    createDrawing.mockReturnValue(drawing as never)

    void projector.project(entry)

    expect(entry.drawing).toBe(drawing)
    expect(entry.projected).toBe(false)
  })
})
