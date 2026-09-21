'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { MapContext, ToolsContext } from '../../../../../store'
import { PlacementPanel } from '../../../shared/placement/PlacementPanel'

import { createMapGizmoLayer, MAP_GIZMO_LAYER_ID } from './MapGizmoLayer'
import { mapCapabilitiesForFile } from './mapPlacementTarget'
import { createMapGizmoFactory, mapToolCoordinator, rollbackOnFailure, useMapPlacementSession } from './useMapPlacementSession'
import { useMapPlacementTarget } from './useMapPlacementTarget'

import type { MapAnchor } from './mapPlacementGeo'
import type { DbFile } from '../../../../../types/dbTypes'
import type { PlacementMode } from '../../../shared/placement/placementTarget'

const POSITION_LABELS = ['lng', 'lat', 'elev'] as const
const POSITION_STEPS: [number, number, number] = [0.000_01, 0.000_01, 0.1]
const POSITION_DECIMALS = 6

export interface MapPlacementHostProps {
  file: DbFile | null
  mode: PlacementMode
  is3D: boolean
  anchor: () => MapAnchor
  preview: (anchor: MapAnchor, rotation: number, scale: number) => void
  onRepaint: () => void
  onDone: () => void
}

export function MapPlacementHost({ file, mode, is3D, anchor, preview, onRepaint, onDone }: MapPlacementHostProps) {
  const t = useTranslations('Placement')
  const { state: mapState } = React.useContext(MapContext)
  const { state: toolsState, dispatch: toolsDispatch } = React.useContext(ToolsContext)
  const { map } = mapState.map
  const { currentToolId } = toolsState.tools

  const layerRef = React.useRef<ReturnType<typeof createMapGizmoLayer> | null>(null)
  const [layerReady, setLayerReady] = React.useState(false)
  const { targetFor } = useMapPlacementTarget()

  React.useEffect(() => {
    if (!map) return
    const layer = createMapGizmoLayer()
    layerRef.current = layer
    map.addLayer(layer)
    setLayerReady(true)

    return () => {
      if (map.getLayer(MAP_GIZMO_LAYER_ID)) map.removeLayer(MAP_GIZMO_LAYER_ID)
      layerRef.current = null
      setLayerReady(false)
    }
  }, [map])

  const { core, state } = useMapPlacementSession(layerReady ? layerRef.current : null)

  const live = React.useRef({ anchor, preview, onRepaint })
  live.current = { anchor, preview, onRepaint }

  const previewAndRepaint = React.useCallback((next: MapAnchor, rotation: number, scale: number) => {
    live.current.preview(next, rotation, scale)
    live.current.onRepaint()
  }, [])

  const readAnchor = React.useCallback(() => live.current.anchor(), [])
  const snapshot = React.useRef<MapAnchor | null>(null)

  React.useEffect(() => rollbackOnFailure(core, () => {
    if (snapshot.current) previewAndRepaint(snapshot.current, 0, 1)
  }), [core, previewAndRepaint])

  React.useEffect(() => {
    const layer = layerRef.current
    if (!file || !map || !layer || !layerReady) return

    snapshot.current = readAnchor()
    core.setup({
      coordinator: mapToolCoordinator(toolsDispatch),
      createGizmo: createMapGizmoFactory({
        layer,
        map,
        anchor: readAnchor,
        onDragTo: next => previewAndRepaint(next, 0, 1),
        capabilities: () => mapCapabilitiesForFile(file, is3D),
      }),
    })
    void core.begin(
      targetFor({ file, object: () => layer.subject(), anchor: readAnchor, preview: previewAndRepaint }),
      mode,
    )
  }, [file, mode, map, layerReady, core, readAnchor, previewAndRepaint, targetFor, is3D, toolsDispatch])

  // A toolbar tool taking the cursor ends the edit rather than fighting it for pointer events.
  React.useEffect(() => {
    if (currentToolId) core.deactivate()
  }, [currentToolId, core])

  const labels = React.useMemo(() => ({
    title: t('title'),
    position: t('position'),
    rotation: t('rotation'),
    yaw: t('yaw'),
    scale: t('scale'),
    translate: t('modeTranslate'),
    rotate: t('modeRotate'),
    reset: t('reset'),
    done: t('done'),
    centre: t('centre'),
    pickPivot: t('pickPivot'),
    pivotSet: t('pivotSet'),
    pivotOrigin: t('pivotOrigin'),
    unit_mm: t('unit_mm'),
    unit_cm: t('unit_cm'),
    unit_m: t('unit_m'),
    unit_in: t('unit_in'),
  }), [t])

  if (!file || !state) return null

  return (
    <PlacementPanel
      name={state.name}
      capabilities={state.capabilities}
      placement={state.placement}
      mode={state.mode}
      labels={labels}
      positionLabels={POSITION_LABELS}
      positionSteps={POSITION_STEPS}
      positionDecimals={POSITION_DECIMALS}
      allowPivot={false}
      onModeChange={next => core.setMode(next)}
      onPlacementChange={placement => core.setPlacement(placement)}
      onCentre={() => {}}
      onPickPivot={() => {}}
      onClearPivot={() => {}}
      hasPivot={false}
      onDone={() => { void core.accept(); onDone() }}
      onReset={() => { void core.cancel(); onDone() }}
    />
  )
}
