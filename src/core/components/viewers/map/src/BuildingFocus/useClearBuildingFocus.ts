// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { DatasetsContext, MapContext, MenusContext } from '../../../../../store'
import { ViewerNames } from '../../../../../types/'
import { shouldIgnoreEscape } from '../../../../../utils/escapeGuard'

import { FOCUS_DATASET_ID, useBuildingFocus } from './useBuildingFocus'

export function useClearBuildingFocus(): void {
  const { state: menusState } = React.useContext(MenusContext)
  const { state: mapState } = React.useContext(MapContext)
  const { state: datasetsState } = React.useContext(DatasetsContext)
  const { clear, hasFocus } = useBuildingFocus()
  const mapClickManager = mapState.map.mapClickManager
  const active = menusState.menus.currentViewer === ViewerNames.map && hasFocus
  const focusDatasetOnMap = datasetsState.datasets.addedDatasets.some(dataset => dataset.id === FOCUS_DATASET_ID)

  React.useEffect(() => {
    if (hasFocus && !focusDatasetOnMap) clear()
  }, [hasFocus, focusDatasetOnMap, clear])

  React.useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !shouldIgnoreEscape(event)) clear()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, clear])

  React.useEffect(() => {
    if (!active || !mapClickManager) return
    return mapClickManager.onEmptyClick(clear)
  }, [active, mapClickManager, clear])
}
