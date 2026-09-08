// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_PLACEMENT } from '../../../../shared/pointcloud/pointCloudPlacement'
import { PLACEMENT_VERSION } from '../../PointClouds/pointCloudPlacementStore'

import { usePointCloudTarget } from './usePointCloudTarget'

import type { DbFile } from '../../../../../../types/dbTypes'
import type { PointCloudPlacement } from '../../../../shared/pointcloud/pointCloudPlacement'

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
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { name?: string }) => `${key}:${values?.name ?? ''}`,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const PLACED: PointCloudPlacement = { ...DEFAULT_PLACEMENT, position: [4, 5, 6], scale: 2 }

const clouds = {
  get: () => ({ id: '669', root: new THREE.Group(), placement: { ...DEFAULT_PLACEMENT } }),
  setPlacement: vi.fn(),
  refresh: vi.fn(),
  worldCentroid: () => null,
}

function setUp(file: Partial<DbFile> = { id: 669, name: 'basement scan' }) {
  const { result } = renderHook(() => usePointCloudTarget())
  const target = result.current.targetFor(file as DbFile, clouds as never)
  return { result, target, file: file as DbFile }
}

beforeEach(() => {
  fileHooks.keyedTo.length = 0
  fileHooks.updateFile.mockReset()
  fileHooks.updateFile.mockResolvedValue({})
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

describe('usePointCloudTarget', () => {
  it('keys the mutation to the cloud being placed', async () => {
    setUp()

    await waitFor(() => expect(fileHooks.keyedTo.at(-1)).toBe(669))
  })

  it('writes the committed placement to the file', async () => {
    const { target } = setUp()

    await act(() => target.commit({ ...PLACED }))

    expect(fileHooks.updateFile).toHaveBeenCalledWith({
      pointCloudTransform: { version: PLACEMENT_VERSION, ...PLACED },
    })
  })

  it('writes nothing when the committed placement matches what is stored', async () => {
    const stored = { id: 669, name: 'scan', pointCloudTransform: { version: PLACEMENT_VERSION, ...PLACED } }
    const { target } = setUp(stored)

    await act(() => target.commit({ ...PLACED }))

    expect(fileHooks.updateFile).not.toHaveBeenCalled()
  })

  it('survives a rejected write', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })
    fileHooks.updateFile.mockRejectedValueOnce(new Error('offline'))
    const { target } = setUp()

    await act(() => target.commit({ ...PLACED }))

    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('tells the user the placement was saved, naming the cloud', async () => {
    const { target } = setUp()

    await act(() => target.commit({ ...PLACED }))

    expect(toast.success).toHaveBeenCalledWith('saved:basement scan')
  })

  it('tells the user when the placement could not be saved', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })
    fileHooks.updateFile.mockRejectedValueOnce(new Error('offline'))
    const { target } = setUp()

    await act(() => target.commit({ ...PLACED }))

    expect(toast.error).toHaveBeenCalledWith('saveFailed:basement scan')
    warn.mockRestore()
  })

  it('stays quiet when the placement did not actually change', async () => {
    const stored = { id: 669, name: 'scan', pointCloudTransform: { version: PLACEMENT_VERSION, ...PLACED } }
    const { target } = setUp(stored)

    await act(() => target.commit({ ...PLACED }))

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('keeps the in-memory file in step, so the row does not flicker before the refetch', async () => {
    const { target, file } = setUp()

    await act(() => target.commit({ ...PLACED }))

    expect(file.pointCloudTransform).toEqual({ version: PLACEMENT_VERSION, ...PLACED })
  })
})
