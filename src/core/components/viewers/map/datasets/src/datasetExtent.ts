// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { bbox } from '@turf/turf'

import { isRasterDataset } from './mapServices'

import type { Dataset } from '../../../../../types/datasetTypes'
import type { BBox } from 'geojson'
import type { Map as MaplibreMap } from 'maplibre-gl'

const FIT_DURATION_MS = 800
const FIT_PADDING_PX = 48

/** Raster services have no features, and viewport-loaded datasets are too large to fetch whole. */
export function canZoomToDataset(dataset: Dataset): boolean {
  return !isRasterDataset(dataset) && !dataset.viewport && typeof dataset.getFeatures === 'function'
}

export function fitDatasetBbox(map: MaplibreMap, [west, south, east, north]: BBox): void {
  map.fitBounds([[west, south], [east, north]], { padding: FIT_PADDING_PX, duration: FIT_DURATION_MS })
}

export async function zoomToDataset(map: MaplibreMap, dataset: Dataset): Promise<void> {
  const extent = bbox(await dataset.getFeatures())
  if (extent.every(Number.isFinite)) fitDatasetBbox(map, extent)
}
