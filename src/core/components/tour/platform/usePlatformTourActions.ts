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
import { findAnchor } from '../hostTargets'
import { useLatest } from '../useTourLayout'

import { demoHelloMap, toggleHelloMapControl } from './helloMapDemo'
import { holdDemo } from './liveDemo'
import { createCommentDemo, createSensorDemo } from './placeDemo'
import { pressWhenShown, searchAndPick } from './platformHost'
import { CAMPUS_CAMERA, canReachCampus, demoMeasure, uncoveredCentre } from './tourPlace'
import { useDatasetPort } from './useDatasetPort'
import { useCommentPort, useSensorPort } from './useMapItemPorts'
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
  const { state: menus, dispatch } = useMenusContext()
  const currentViewer = useLatest(menus.menus.currentViewer)
  const { setOpenInfo, setFeatureRequestOpen, setBugReportOpen, isMobile, setOpenMobile } = useSidebar()
  const openViewer = React.useCallback((viewer: ViewerKey) => {
    if (currentViewer.current !== viewer) changeViewer(viewer)
  }, [currentViewer, changeViewer])
  const { dispatch: toolsDispatch } = React.useContext(ToolsContext)
  const { ability } = usePermissions()
  const router = useRouter()
  const mapInstance = useMapViewer().map
  const map = useLatest(mapInstance)
  const { mapStyles, setMapStyle, demoMapStyle } = useMapStyleTour()
  const geocoder = React.useContext(AppConfigContext).state.appConfig.organization?.geocoder === true
  const datasetPort = useDatasetPort()
  const demoZoning = React.useMemo(() => createZoningDemo(datasetPort, {
    load: url => arcgisUrlDataset(url),
    fly: () => map.current?.flyTo(CAMPUS_CAMERA),
  }), [datasetPort, map])
  const demoZoningMenu = React.useMemo(() => createZoningMenuDemo(datasetPort), [datasetPort])
  const inOttawa = React.useCallback(() => canReachCampus(mapInstance), [mapInstance])
  const placeAtCentre = React.useCallback(() => {
    const current = map.current
    if (!current) return
    const lngLat = uncoveredCentre(current, findAnchor('viewer-panel'))
    current.fire('dblclick', { lngLat, point: current.project(lngLat) })
  }, [map])
  const openMenu = React.useCallback(() => {
    if (!isMobile) return () => {}
    const release = holdDemo('sidebar-sheet', () => () => setOpenMobile(false))
    setOpenMobile(true)
    return release
  }, [isMobile, setOpenMobile])
  const afterClosingMenu = React.useCallback((open: () => void) => () => {
    if (isMobile) setOpenMobile(false)
    open()
  }, [isMobile, setOpenMobile])
  const commentPort = useCommentPort(placeAtCentre)
  const sensorPort = useSensorPort(placeAtCentre)
  const demoComment = React.useMemo(() => createCommentDemo(commentPort), [commentPort])
  const demoSensor = React.useMemo(() => createSensorDemo(sensorPort), [sensorPort])

  return React.useMemo(() => ({
    can: (action, subject) => ability.can(action, subject),
    inOttawa,
    isMobile: () => isMobile,
    canDemoSearch: () => geocoder,
    zoningApplied: () => zoningAlreadyApplied(datasetPort.applied()),
    branch,
    leave,
    openViewer,
    openMenu,
    openPanel: () => {
      setOpenInfo(true)
      return () => setOpenInfo(false)
    },
    selectPanelTab: tab => dispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: tab } }),
    demoSearch: () => searchAndPick(document.querySelector('[data-tour="viewer-search"]'), DEMO_PLACE, () => map.current?.flyTo(DEMO_CAMERA)),
    demoMeasure: (kind, ottawa) => demoMeasure(map.current, kind, ottawa, () => toolsDispatch({ type: 'CLEAR-TOOLS' }), leave),
    pressControl: anchor => void pressWhenShown(anchor),
    openFeatureRequest: afterClosingMenu(() => setFeatureRequestOpen(true)),
    openContactPage: () => window.open(CONTACT_PAGE, '_blank'),
    switchLanguage: language => void switchLanguage(language, undefined, router),
    openBugReport: afterClosingMenu(() => setBugReportOpen(true)),
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
    sensorTypesExist: () => sensorPort.typeIds().length > 0,
    demoComment,
    demoSensor,
  }), [demoComment, demoSensor, sensorPort, demoZoning, demoZoningMenu, inOttawa, isMobile, openMenu, afterClosingMenu, geocoder, datasetPort, ability, router, branch, leave, openViewer, setOpenInfo, dispatch, toolsDispatch, map, setFeatureRequestOpen, setBugReportOpen, mapStyles, setMapStyle, demoMapStyle])
}
