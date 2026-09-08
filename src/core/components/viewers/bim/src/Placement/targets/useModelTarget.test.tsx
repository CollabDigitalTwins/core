// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_PLACEMENT } from '../../../../shared/pointcloud/pointCloudPlacement'

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

function setUp() {
  const object = new THREE.Group()
  const file = { id: 12, name: 'tower.frag' } as DbFile
  const { result } = renderHook(() => useModelTarget())
  const target = result.current.targetFor(file, () => object)
  return { target, file, object, result }
}

beforeEach(() => {
  fileHooks.keyedTo.length = 0
  fileHooks.updateFile.mockReset()
  fileHooks.updateFile.mockResolvedValue({})
})

describe('useModelTarget', () => {
  it('keys the mutation to the file being placed', async () => {
    setUp()

    await waitFor(() => expect(fileHooks.keyedTo.at(-1)).toBe(12))
  })

  it('commits position and yaw as typed columns', async () => {
    const { target } = setUp()

    await act(() => target.commit({ ...DEFAULT_PLACEMENT, position: [1, 2, 3], rotation: [0, 0.5, 0] }))

    expect(fileHooks.updateFile).toHaveBeenCalledWith({ x: 1, y: 2, z: 3, bimRotation: 0.5 })
  })

  it('keeps the in-memory file in step, so the row does not flicker', async () => {
    const { target, file } = setUp()

    await act(() => target.commit({ ...DEFAULT_PLACEMENT, position: [4, 5, 6] }))

    expect(file.x).toBe(4)
    expect(file.z).toBe(6)
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
})
