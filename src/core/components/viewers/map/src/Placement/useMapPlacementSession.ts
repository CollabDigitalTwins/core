"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { PlacementCore } from '../../../shared/placement/placementCore'
import { TransformGizmo } from '../../../shared/placement/transformGizmo'
import { usePlacementState } from '../../../shared/placement/usePlacementState'

import { createMapDomGizmo } from './mapDomGizmo'

import type { MapGizmoLayerHandle } from './MapGizmoLayer'
import type { MapAnchor } from './mapPlacementGeo'
import type { ToolsActions } from '../../../../../store/Tools/reducer'
import type { PlacementCoordinator, PlacementGizmo, PlacementState } from '../../../shared/placement/placementCore'
import type { PlacementCapabilities } from '../../../shared/placement/placementTarget'
import type * as maplibregl from 'maplibre-gl'

/** A flat file moves and nothing else, so the map narrows what the shared classifier allows. */
export type MapCapabilities = PlacementCapabilities & { moveOnly?: boolean }

export interface MapGizmoFactoryDeps {
  layer: MapGizmoLayerHandle
  map: maplibregl.Map
  anchor: () => MapAnchor
  onDragTo: (anchor: MapAnchor) => void
  capabilities: () => MapCapabilities
}

export function createMapGizmoFactory(deps: MapGizmoFactoryDeps): () => PlacementGizmo {
  return () => (deps.capabilities().moveOnly
    ? createMapDomGizmo({ map: deps.map, anchor: deps.anchor, onDragTo: deps.onDragTo })
    : new TransformGizmo(deps.layer))
}

/** A write that never landed must not leave the map showing where the file would have gone. */
export function rollbackOnFailure(core: PlacementCore, restore: () => void): () => void {
  const listener = (state: PlacementState) => { if (state.ok === false) restore() }
  core.onCommitted.add(listener)
  return () => core.onCommitted.remove(listener)
}

/** The map allows one tool at a time, so a placement drops whatever the toolbar had active. */
export function mapToolCoordinator(dispatch: React.Dispatch<ToolsActions>): PlacementCoordinator {
  return {
    claim: () => dispatch({ type: 'CLEAR-TOOLS' }),
    release: () => {},
  }
}

export interface MapPlacementSession {
  core: PlacementCore
  state: PlacementState | null
}

export function useMapPlacementSession(layer: MapGizmoLayerHandle | null): MapPlacementSession {
  const core = React.useMemo(() => new PlacementCore(), [])
  React.useEffect(() => () => core.dispose(), [core])

  return { core, state: usePlacementState(layer ? core : null) }
}
