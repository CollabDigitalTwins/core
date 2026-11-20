'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { useChangeViewer } from '../../../hooks/ui/useChangeViewer'
import { useMapViewer } from '../../../plugins/sdk/mapViewer'
import { AppConfigContext, ToolsContext, useMenusContext, usePermissions } from '../../../store'
import { switchLanguage } from '../../../utils/utils'
import { useSidebar } from '../../ui/Sidebar'
import { arcgisUrlDataset } from '../../viewers/map/datasets/src/urlSources'
import { useLatest } from '../useTourLayout'

import { demoHelloMap, toggleHelloMapControl } from './helloMapDemo'
import { focusTourCard, pickSuggestion, pressWhenShown, searchFor } from './platformHost'

import { CAMPUS_CAMERA, canReachCampus, demoMeasure } from './tourPlace'
import { useDatasetPort } from './useDatasetPort'
import { useMapStyleTour } from './useMapStyleTour'
import { createZoningDemo, createZoningMenuDemo, zoningAlreadyApplied } from './zoningDemo'

import type { LngLat } from './platformHost'
import type { PlatformTourActions } from './platformTourTypes'
import type { ViewerKey } from '../../../types/dbTypes'

const CONTACT_PAGE = 'https://collabdt.org/En/contact'
const DEMO_PLACE = 'Carleton University'
const DEMO_CAMERA = { center: [-75.6972, 45.3857] as LngLat, zoom: 16, pitch: 55, bearing: -20, speed: 1.2 }

/** The app-side effects the platform tours drive: switching pages, the side panel, the map camera. */
export function usePlatformTourActions(branch: PlatformTourActions['branch'], leave: PlatformTourActions['leave']): PlatformTourActions {
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
  const { mapStyles, setMapStyle, demoMapStyle } = useMapStyleTour()
  const geocoder = React.useContext(AppConfigContext).state.appConfig.organization?.geocoder === true
  const datasetPort = useDatasetPort()
  const demoZoning = React.useMemo(() => createZoningDemo(datasetPort, {
    load: url => arcgisUrlDataset(url),
    fly: () => map.current?.flyTo(CAMPUS_CAMERA),
  }), [datasetPort, map])
  const demoZoningMenu = React.useMemo(() => createZoningMenuDemo(datasetPort), [datasetPort])
  const inOttawa = React.useCallback(() => canReachCampus(map.current), [map])

  return React.useMemo(() => ({
    can: (action, subject) => ability.can(action, subject),
    inOttawa,
    canDemoSearch: () => geocoder,
    zoningApplied: () => zoningAlreadyApplied(datasetPort.applied()),
    branch,
    leave,
    openViewer,
    openPanel: () => {
      setOpenInfo(true)
      return () => setOpenInfo(false)
    },
    selectPanelTab: tab => dispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: tab } }),
    demoSearch: () => {
      const container = document.querySelector('[data-tour="viewer-search"]')
      let cancelPick = () => {}
      const cancelSearch = searchFor(container, DEMO_PLACE, () => {
        cancelPick = pickSuggestion(container, DEMO_PLACE, focusTourCard, () => {
          map.current?.flyTo(DEMO_CAMERA)
          focusTourCard()
        })
      })
      return () => {
        cancelSearch()
        cancelPick()
      }
    },
    demoMeasure: (kind, ottawa) => demoMeasure(map.current, kind, ottawa, () => toolsDispatch({ type: 'CLEAR-TOOLS' }), leave),
    pressControl: anchor => void pressWhenShown(anchor),
    openFeatureRequest: () => setFeatureRequestOpen(true),
    openContactPage: () => window.open(CONTACT_PAGE, '_blank'),
    switchLanguage: language => void switchLanguage(language, undefined, router),
    openBugReport: () => setBugReportOpen(true),
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    resetNorth: () => map.current?.resetNorthPitch(),
    mapStyles,
    setMapStyle,
    demoMapStyle,
    demoZoning,
    demoZoningMenu,
    demoHelloMap,
    toggleHelloMapControl,
  }), [demoZoning, demoZoningMenu, inOttawa, geocoder, datasetPort, ability, router, branch, leave, openViewer, setOpenInfo, dispatch, toolsDispatch, map, setFeatureRequestOpen, setBugReportOpen, mapStyles, setMapStyle, demoMapStyle])
}
