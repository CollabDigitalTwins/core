// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ElevationProjector } from './ElevationProjector'

import type { ElevationEntry } from './types'

const createDrawing = vi.fn(() => null)

vi.mock('@thatopen/components', () => ({ FragmentsManager: class FragmentsManager {} }))
vi.mock('@thatopen/components-front', () => ({ DrawingEditor: class DrawingEditor {} }))
vi.mock('../../lib/drawingProjection', () => ({
  addItemsProjectionByClassOccluded: vi.fn(),
  createDrawing: (...args: unknown[]) => createDrawing(...(args as [])),
  disableProjectorWebGPU: vi.fn(),
  DrawingEditorReady: class DrawingEditorReady {
    ensure() { return Promise.resolve() }
  },
  getItemIdsByClass: vi.fn(),
  patchModelGeometryRepresentationIds: vi.fn(),
}))

function projectorFor() {
  const model = {
    box: new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 10, 5)),
    getItemsIdsWithGeometry: () => new Promise<number[]>(() => {}),
  }
  const components = {
    get: () => ({ list: new Map([['model-1', model]]), core: { update: vi.fn() } }),
  } as any
  const entry: ElevationEntry = {
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
  return { projector: new ElevationProjector(components), entry }
}

describe('ElevationProjector in-flight teardown', () => {
  beforeEach(() => createDrawing.mockReset())

  it('makes the drawing reachable from the entry before the first await', () => {
    const { projector, entry } = projectorFor()
    const drawing = { three: new THREE.Object3D(), layers: new Map() }
    createDrawing.mockReturnValue(drawing as never)

    void projector.project(entry)

    expect(entry.drawing).toBe(drawing)
    expect(entry.projected).toBe(false)
  })
})
