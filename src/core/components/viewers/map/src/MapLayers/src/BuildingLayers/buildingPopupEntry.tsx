// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

'use client'

import * as React from 'react'

import { MapLayerClickPriority } from '../../../../utils/MapEventManager/MapClickManager'
import MapFeaturePopoverMenu from '../../../MapFeaturePopoverMenu'

import type { PopupEntry } from '../../../../../../../types/map'
import type { MapGeoJSONFeature } from 'maplibre-gl'

/** A footprint's entry in the map's popup stack, opening the building popover for `feature`. */
export const buildingPopupEntry = ({ layerId, key, title, coordinates, feature, onClose }: {
  layerId: string
  key: string
  title: string
  coordinates: [number, number]
  feature: MapGeoJSONFeature
  onClose: () => void
}): PopupEntry => ({
  id: `${layerId}:${key}`,
  layerId,
  priority: MapLayerClickPriority.BuildingLayersClickPriority,
  title,
  coordinates,
  render: header => <MapFeaturePopoverMenu header={header} feature={feature} onCloseAction={onClose} />,
})
