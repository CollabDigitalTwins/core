'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { useChangeViewer } from '../../../hooks/ui/useChangeViewer'
import { useMapViewer } from '../../../plugins/sdk/mapViewer'
import { ToolsContext, useMenusContext, usePermissions } from '../../../store'
import { switchLanguage } from '../../../utils/utils'
import { useSidebar } from '../../ui/Sidebar'
import { useLatest } from '../useTourLayout'

import { anchorMapRegion, MEASURE_REGION, pressWhenShown, runTimeline, searchFor, setToolOpen } from './platformHost'

import type { LngLat } from './platformHost'
import type { MeasureKind, PlatformTourActions } from './platformTourTypes'
import type { ViewerKey } from '../../../types/dbTypes'
import type { Map as MapLibreMap } from 'maplibre-gl'

const TEAM_EMAIL = 'mailto:info@collabdt.org'
const DEMO_PLACE = 'Carleton University'
const DEMO_CAMERA = { center: [-75.6972, 45.3857] as LngLat, zoom: 16, pitch: 55, bearing: -20, speed: 1.2 }
const CAMPUS_CAMERA = { center: [-75.6960, 45.3842] as LngLat, zoom: 15.4, pitch: 0, bearing: 0, duration: 1500 }

const CAMPUS_MEASURES: Record<MeasureKind, LngLat[]> = {
  distance: [[-75.6968, 45.3888], [-75.6970, 45.3853], [-75.6950, 45.3818], [-75.6925, 45.3790]],
  area: [[-75.6990, 45.3870], [-75.6945, 45.3870], [-75.6940, 45.3835], [-75.6992, 45.3835]],
}

const MEASURE_CLICK_GAP_MS = 700

const clickMap = (map: MapLibreMap, lngLat: LngLat) =>
  map.fire('click', { lngLat: { lng: lngLat[0], lat: lngLat[1] }, point: map.project(lngLat) })

function demoMeasure(map: MapLibreMap | null, kind: MeasureKind, stopTool: () => void): () => void {
  if (!map) return () => {}
  const coords = CAMPUS_MEASURES[kind]
  map.flyTo(CAMPUS_CAMERA)
  setToolOpen('map-measure', true)
  const removeRegion = anchorMapRegion(map, coords, MEASURE_REGION)
  let cancelPress = () => {}
  const cancelTimeline = runTimeline([
    [CAMPUS_CAMERA.duration, () => { cancelPress = pressWhenShown(`measure-${kind}`) }],
    ...coords.map((coord): [number, () => void] => [MEASURE_CLICK_GAP_MS, () => clickMap(map, coord)]),
  ])
  return () => {
    cancelTimeline()
    cancelPress()
    removeRegion()
    stopTool()
  }
}

/** The app-side effects the platform tours drive: switching pages, the side panel, the map camera. */
export function usePlatformTourActions(branch: PlatformTourActions['branch']): PlatformTourActions {
  const changeViewer = useChangeViewer()
  const { state: menus } = useMenusContext()
  const currentViewer = useLatest(menus.menus.currentViewer)
  const { setOpenInfo, setFeatureRequestOpen, setBugReportOpen } = useSidebar()
  const { dispatch } = useMenusContext()
  const openViewer = React.useCallback((viewer: ViewerKey) => {
    if (currentViewer.current !== viewer) changeViewer(viewer)
  }, [currentViewer, changeViewer])
  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)
  const { ability } = usePermissions()
  const router = useRouter()
  const map = useLatest(useMapViewer().map)

  return React.useMemo(() => ({
    can: (action, subject) => ability.can(action, subject),
    branch,
    openViewer,
    openPanel: () => {
      setOpenInfo(true)
      return () => setOpenInfo(false)
    },
    selectPanelTab: tab => dispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: tab } }),
    demoSearch: () => searchFor(document.querySelector('[data-tour="viewer-search"]'), DEMO_PLACE, () => map.current?.flyTo(DEMO_CAMERA)),
    demoMeasure: kind => demoMeasure(map.current, kind, () => toolsDispatch({ type: 'CLEAR-TOOLS' })),
    pressControl: anchor => void pressWhenShown(anchor),
    openFeatureRequest: () => setFeatureRequestOpen(true),
    emailTeam: () => window.location.assign(TEAM_EMAIL),
    switchLanguage: language => void switchLanguage(language, undefined, router),
    openBugReport: () => setBugReportOpen(true),
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    resetNorth: () => map.current?.resetNorthPitch(),
  }), [ability, router, branch, openViewer, setOpenInfo, dispatch, toolsDispatch, map, setFeatureRequestOpen, setBugReportOpen])
}
