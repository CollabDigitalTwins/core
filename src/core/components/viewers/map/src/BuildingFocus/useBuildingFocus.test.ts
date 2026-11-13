// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FOCUS_DATASET_ID, useBuildingFocus } from './useBuildingFocus'

const { datasetDispatch, mapDispatch, menusDispatch, focused, flyTo, fitBuildingsBounds } = vi.hoisted(() => ({
  datasetDispatch: vi.fn(),
  mapDispatch: vi.fn(),
  menusDispatch: vi.fn(),
  focused: { value: [] as unknown[] },
  flyTo: vi.fn(),
  fitBuildingsBounds: vi.fn(),
}))

vi.mock('../../../../../store', () => ({
  DatasetsContext: React.createContext({ dispatch: datasetDispatch }),
  MenusContext: React.createContext({ dispatch: menusDispatch }),
  MapContext: React.createContext({ state: { map: { map: { flyTo }, get focusedBuildings() { return focused.value } } }, dispatch: mapDispatch }),
}))
vi.mock('../MapLayers/src/BuildingLayers/src/databaseBuildings', () => ({
  createBuildingsDataset: (_b: unknown[], name: string) => ({ id: 'database_buildings', name }),
}))
vi.mock('../../utils/fitBuildingsBounds', () => ({ fitBuildingsBounds }))

const building = { id: 1, buildingLongitude: -75, buildingLatitude: 45 } as never

describe('useBuildingFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    focused.value = []
  })

  it('focus twice dispatches one REMOVE then ADD with the same dataset id', () => {
    const { result } = renderHook(() => useBuildingFocus())
    result.current.focus([building], { name: 'B', fly: 'single' })
    result.current.focus([building], { name: 'B', fly: 'single' })

    const types = datasetDispatch.mock.calls.map(([a]) => a.type)
    expect(types).toEqual(['REMOVE_DATASET_FROM_MAP', 'ADD_DATASET_TO_MAP', 'REMOVE_DATASET_FROM_MAP', 'ADD_DATASET_TO_MAP'])
    const added = datasetDispatch.mock.calls.filter(([a]) => a.type === 'ADD_DATASET_TO_MAP').map(([a]) => a.payload.dataset.id)
    expect(added).toEqual([FOCUS_DATASET_ID, FOCUS_DATASET_ID])
    expect(mapDispatch).toHaveBeenCalledWith({ type: 'SET_FOCUSED_BUILDINGS', payload: { focusedBuildings: [building] } })
    expect(flyTo).toHaveBeenCalledWith({ center: [-75, 45], zoom: 18, duration: 1000 })
  })

  it('fit mode fits bounds instead of flying', () => {
    const { result } = renderHook(() => useBuildingFocus())
    result.current.focus([building], { name: 'B', fly: 'fit' })
    expect(fitBuildingsBounds).toHaveBeenCalled()
    expect(flyTo).not.toHaveBeenCalled()
  })

  it('focus on an empty list does nothing', () => {
    const { result } = renderHook(() => useBuildingFocus())
    result.current.focus([], { name: 'B', fly: 'single' })
    expect(datasetDispatch).not.toHaveBeenCalled()
    expect(flyTo).not.toHaveBeenCalled()
  })

  it('clear is a no-op when nothing is focused', () => {
    const { result } = renderHook(() => useBuildingFocus())
    result.current.clear()
    expect(datasetDispatch).not.toHaveBeenCalled()
    expect(mapDispatch).not.toHaveBeenCalled()
  })

  it('clear removes the focus dataset and empties focusedBuildings', () => {
    focused.value = [building]
    const { result } = renderHook(() => useBuildingFocus())
    result.current.clear()
    expect(datasetDispatch).toHaveBeenCalledWith({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: FOCUS_DATASET_ID } })
    expect(mapDispatch).toHaveBeenCalledWith({ type: 'SET_FOCUSED_BUILDINGS', payload: { focusedBuildings: [] } })
  })
})
