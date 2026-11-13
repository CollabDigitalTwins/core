// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { DatasetsContext, MapContext, MenusContext } from '../../../../../store'
import { ViewerNames } from '../../../../../types/'
import { fitBuildingsBounds } from '../../utils/fitBuildingsBounds'
import { createBuildingsDataset } from '../MapLayers/src/BuildingLayers/src/databaseBuildings'

import type { Building } from '../../../../../types/dbTypes'

export const FOCUS_DATASET_ID = 'building_focus'

interface FocusOptions {
  name: string
  fly: 'single' | 'fit'
}

export function useBuildingFocus() {
  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)
  const { dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { map, focusedBuildings } = mapState.map
  const hasFocus = focusedBuildings.length > 0

  const removeFocusDataset = React.useCallback(() => {
    datasetDispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: FOCUS_DATASET_ID } })
  }, [datasetDispatch])

  const focus = React.useCallback((buildings: Building[], { name, fly }: FocusOptions) => {
    if (buildings.length === 0) return
    removeFocusDataset()
    const dataset = { ...createBuildingsDataset(buildings, name), id: FOCUS_DATASET_ID }
    datasetDispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset } })
    mapDispatch({ type: 'SET_FOCUSED_BUILDINGS', payload: { focusedBuildings: buildings } })
    menusDispatch({ type: 'SET_VIEWER', payload: { currentViewer: ViewerNames.map } })
    if (!map) return
    if (fly === 'fit') {
      fitBuildingsBounds(buildings, map)
      return
    }
    const [{ buildingLongitude, buildingLatitude }] = buildings
    map.flyTo({ center: [buildingLongitude, buildingLatitude], zoom: 18, duration: 1000 })
  }, [removeFocusDataset, datasetDispatch, mapDispatch, menusDispatch, map])

  const clear = React.useCallback(() => {
    if (!hasFocus) return
    removeFocusDataset()
    mapDispatch({ type: 'SET_FOCUSED_BUILDINGS', payload: { focusedBuildings: [] } })
  }, [hasFocus, removeFocusDataset, mapDispatch])

  return { focus, clear, hasFocus }
}
