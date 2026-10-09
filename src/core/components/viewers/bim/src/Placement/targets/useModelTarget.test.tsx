// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BimContext } from '../../../../../../store/BIM/context'
import { DEFAULT_PLACEMENT } from '../../../../shared/pointcloud/pointCloudPlacement'
import { ModelPlacementWatchers } from '../../lib/modelPlacementWatchers'

import { useModelTarget } from './useModelTarget'

import type { DbFile } from '../../../../../../types/dbTypes'

const fileHooks = {
  keyedTo: [] as (number | null)[],
  updateFile: vi.fn(),
}

vi.mock('../../../../../../hooks/files/files', () => ({
  useFile: (id: number | null) => {
    fileHooks.keyedTo.push(id)
    return { updateFile: fileHooks.updateFile }
  },
}))

vi.mock('../../FloorplanTool', () => ({ FloorplanTool: class {} }))
vi.mock('../../lib/modelPlacementWatchers', () => ({ ModelPlacementWatchers: class {} }))

const floorplan = { refreshModel: vi.fn() }
const watchers = { notify: vi.fn(), confirmTurn: vi.fn() }

function setUp() {
  const object = new THREE.Group()
  const file = { id: 12, name: 'tower.frag' } as DbFile
  const bimComponents = { get: (key: unknown) => (key === ModelPlacementWatchers ? watchers : floorplan) }
  const value = { state: { bim: { bimComponents } }, dispatch: () => null } as any
  const wrapper = ({ children }: React.PropsWithChildren) => <BimContext.Provider value={value}>{children}</BimContext.Provider>
  const { result } = renderHook(() => useModelTarget(), { wrapper })
  const target = result.current.targetFor(file, () => object)
  return { target, file, object, result }
}

beforeEach(() => {
  fileHooks.keyedTo.length = 0
  fileHooks.updateFile.mockReset()
  fileHooks.updateFile.mockResolvedValue({})
  floorplan.refreshModel.mockReset()
  watchers.notify.mockReset()
  watchers.confirmTurn.mockReset()
  watchers.confirmTurn.mockResolvedValue(true)
})

describe('useModelTarget', () => {
  it('keys the mutation to the file being placed', async () => {
    setUp()

    await waitFor(() => expect(fileHooks.keyedTo.at(-1)).toBe(12))
  })

  it('commits position and yaw as typed columns', async () => {
    const { target } = setUp()

    await act(() => target.commit({ ...DEFAULT_PLACEMENT, position: [1, 2, 3], rotation: [0, 0.5, 0] }))

    expect(fileHooks.updateFile).toHaveBeenCalledWith({ fileTransformX: 1, fileTransformY: 2, fileTransformZ: 3, fileRotationY: 0.5 })
  })

  it('keeps the in-memory file in step, so the row does not flicker', async () => {
    const { target, file } = setUp()

    await act(() => target.commit({ ...DEFAULT_PLACEMENT, position: [4, 5, 6] }))

    expect(file.fileTransformX).toBe(4)
    expect(file.fileTransformZ).toBe(6)
  })

  it('drives the object it was given', () => {
    const { target, object } = setUp()

    target.apply({ ...DEFAULT_PLACEMENT, position: [7, 0, 0] })

    expect(object.position.x).toBe(7)
  })

  it('cannot save a scale, because there is no column for one', () => {
    const { target } = setUp()

    expect(target.capabilities).toEqual({ rotation: 'yaw', scale: false })
  })

  it('re-projects the floorplans once a turn is saved, so the room overlay follows the model', async () => {
    const { target } = setUp()
    const turned = { ...DEFAULT_PLACEMENT, rotation: [0, 0.5, 0] as [number, number, number] }

    target.apply(turned)
    await act(() => target.commit(turned))

    expect(floorplan.refreshModel).toHaveBeenCalledWith('tower.frag')
  })

  it('reports each commit from where the last one left the model, not from where placing began', async () => {
    const { target } = setUp()

    for (const x of [1, 3]) {
      const moved = { ...DEFAULT_PLACEMENT, position: [x, 0, 0] as [number, number, number] }
      target.apply(moved)
      await act(() => target.commit(moved))
    }

    const [, before, after] = watchers.notify.mock.calls[1] as [string, THREE.Matrix4, THREE.Matrix4]
    expect(new THREE.Vector3().setFromMatrixPosition(before).x).toBe(1)
    expect(new THREE.Vector3().setFromMatrixPosition(after).x).toBe(3)
  })
})
