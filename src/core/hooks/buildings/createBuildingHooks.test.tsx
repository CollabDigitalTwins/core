// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import useSWR, { SWRConfig } from 'swr'
import { describe, expect, it, vi } from 'vitest'

import { createBuildingHooks } from './createBuildingHooks'

import type { BuildingAssociations, BuildingRemoval } from '../../types/dbTypes'
import type { ApiAdapter } from '../ports/apiAdapter'

const removal: BuildingRemoval = { buildingId: 7, buildingDeleted: true, transferredTo: 9, files: 2, sensors: 1, comments: 3 }
const associations: BuildingAssociations = { files: 2, sensors: 1, comments: 3 }

// The hooks revalidate through SWR's global mutate, so the tests share its default cache.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ dedupingInterval: 0 }}>{children}</SWRConfig>
)

describe('useRemoveBuilding', () => {
  it('calls adapter.removeBuilding and revalidates buildings', async () => {
    const getBuildings = vi.fn().mockResolvedValue([])
    const getBuilding = vi.fn().mockResolvedValue(null)
    const removeBuilding = vi.fn().mockResolvedValue(removal)
    const hooks = createBuildingHooks({ getBuildings, getBuilding, removeBuilding } as unknown as ApiAdapter)

    const { result } = renderHook(() => ({ list: hooks.useBuildings(), target: hooks.useBuilding(9), remove: hooks.useRemoveBuilding() }), { wrapper })
    await waitFor(() => expect(getBuilding).toHaveBeenCalledTimes(1))

    let outcome: BuildingRemoval | undefined
    await act(async () => {
      outcome = await result.current.remove.removeBuilding(7, { transferToBuildingId: 9 })
    })

    expect(removeBuilding).toHaveBeenCalledWith(7, { transferToBuildingId: 9 })
    expect(outcome).toEqual(removal)
    await waitFor(() => expect(getBuildings).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(getBuilding).toHaveBeenCalledTimes(2))
  })

  it('revalidates the removed building itself', async () => {
    const getBuilding = vi.fn().mockResolvedValue(null)
    const removeBuilding = vi.fn().mockResolvedValue({ ...removal, transferredTo: null })
    const hooks = createBuildingHooks({ getBuildings: vi.fn().mockResolvedValue([]), getBuilding, removeBuilding } as unknown as ApiAdapter)

    const { result } = renderHook(() => ({ removed: hooks.useBuilding(7), remove: hooks.useRemoveBuilding() }), { wrapper })
    await waitFor(() => expect(getBuilding).toHaveBeenCalledTimes(1))

    await act(async () => { await result.current.remove.removeBuilding(7) })

    await waitFor(() => expect(getBuilding).toHaveBeenCalledTimes(2))
    expect(getBuilding).toHaveBeenLastCalledWith(7)
  })

  it("revalidates the lists that held the building's files, sensors and comments", async () => {
    const listFilesByBuilding = vi.fn().mockResolvedValue([])
    const getSensorsByBuilding = vi.fn().mockResolvedValue([])
    const getCommentsByBuilding = vi.fn().mockResolvedValue([])
    const removeBuilding = vi.fn().mockResolvedValue(removal)
    const hooks = createBuildingHooks({ removeBuilding } as unknown as ApiAdapter)

    const { result } = renderHook(() => {
      useSWR(['filesByBuilding', 7, ''], () => listFilesByBuilding())
      useSWR(['sensors', 'building', 7], () => getSensorsByBuilding())
      useSWR(['comments', 'building', 7], () => getCommentsByBuilding())
      return hooks.useRemoveBuilding()
    }, { wrapper })
    await waitFor(() => expect(getCommentsByBuilding).toHaveBeenCalledTimes(1))

    await act(async () => { await result.current.removeBuilding(7) })

    await waitFor(() => expect(listFilesByBuilding).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(getSensorsByBuilding).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(getCommentsByBuilding).toHaveBeenCalledTimes(2))
  })
})

describe('useBuildingAssociations', () => {
  it('loads the counts for a building and stays idle without one', async () => {
    const getBuildingAssociations = vi.fn().mockResolvedValue(associations)
    const hooks = createBuildingHooks({ getBuildingAssociations } as unknown as ApiAdapter)

    const idle = renderHook(() => hooks.useBuildingAssociations(null), { wrapper })
    expect(idle.result.current.associations).toBeNull()
    expect(getBuildingAssociations).not.toHaveBeenCalled()

    const { result } = renderHook(() => hooks.useBuildingAssociations(7), { wrapper })
    await waitFor(() => expect(result.current.associations).toEqual(associations))
    expect(getBuildingAssociations).toHaveBeenCalledWith(7)
  })
})
