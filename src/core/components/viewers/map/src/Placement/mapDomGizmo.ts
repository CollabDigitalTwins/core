// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Marker } from 'maplibre-gl'

import type { MapAnchor } from './mapPlacementGeo'
import type { PlacementGizmo } from '../../../shared/placement/placementCore'
import type * as maplibregl from 'maplibre-gl'

export interface MapDomGizmoSetup {
  map: maplibregl.Map
  anchor: () => MapAnchor
  onDragTo: (anchor: MapAnchor) => void
  element?: HTMLElement
}

/** Placement for a file with no geometry: the pin itself is the handle, so there is nothing to raycast. */
export function createMapDomGizmo({ map, anchor, onDragTo, element }: MapDomGizmoSetup): PlacementGizmo {
  let marker: maplibregl.Marker | null = null

  const detach = () => {
    marker?.remove()
    marker = null
  }

  const gizmo: PlacementGizmo = {
    attach() {
      detach()
      const start = anchor()
      marker = new Marker({ element, draggable: true })
        .setDraggable(true)
        .setLngLat([start.lng, start.lat])
        .addTo(map)

      marker.on('drag', () => {
        const at = marker?.getLngLat()
        if (!at) return
        onDragTo({ lng: at.lng, lat: at.lat, elevation: anchor().elevation })
        gizmo.onChange?.()
      })

      return true
    },

    detach,
    dispose: detach,
    setMode: () => {},
  }

  return gizmo
}
