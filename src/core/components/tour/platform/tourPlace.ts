// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { anchorMapRegion, MEASURE_REGION, onClosed, openToolPanel, pressWhenShown, runTimeline, setToolOpen } from './platformHost'

import type { LngLat } from './platformHost'
import type { MeasureKind } from './platformTourTypes'
import type { Map as MapLibreMap } from 'maplibre-gl'

export const CAMPUS_CAMERA = { center: [-75.6960, 45.3842] as LngLat, zoom: 15.4, pitch: 0, bearing: 0, duration: 1500 }

const CAMPUS_MEASURES: Record<MeasureKind, LngLat[]> = {
  distance: [[-75.6968, 45.3888], [-75.6970, 45.3853], [-75.6950, 45.3818], [-75.6925, 45.3790]],
  area: [[-75.6990, 45.3870], [-75.6945, 45.3870], [-75.6940, 45.3835], [-75.6992, 45.3835]],
}

const CAMPUS_MIN_MAX_ZOOM = 15
const MEASURE_CLICK_GAP_MS = 700

interface ReachableMap {
  getMaxBounds: () => { contains: (lngLat: [number, number]) => boolean } | null
  getMaxZoom: () => number
  getMinZoom: () => number
}

/** Whether the map's max bounds and zoom limits let the tour fly to the Carleton campus. */
export function canReachCampus(map: ReachableMap | null): boolean {
  if (!map) return false
  const bounds = map.getMaxBounds()
  return (!bounds || bounds.contains(CAMPUS_CAMERA.center))
    && map.getMaxZoom() >= CAMPUS_MIN_MAX_ZOOM
    && map.getMinZoom() <= CAMPUS_CAMERA.zoom
}

export function measureCoordsAround(kind: MeasureKind, center: LngLat): LngLat[] {
  const [dLng, dLat] = [center[0] - CAMPUS_CAMERA.center[0], center[1] - CAMPUS_CAMERA.center[1]]
  return CAMPUS_MEASURES[kind].map(([lng, lat]): LngLat => [lng + dLng, lat + dLat])
}

const clickMap = (map: MapLibreMap, lngLat: LngLat) =>
  map.fire('click', { lngLat: { lng: lngLat[0], lat: lngLat[1] }, point: map.project(lngLat) })

/** Clicks a measurement onto the map: on the campus after flying there, else around the current centre; returns a stop. */
export function demoMeasure(map: MapLibreMap | null, kind: MeasureKind, onCampus: boolean, stopTool: () => void, leave: () => void = () => {}): () => void {
  if (!map) return () => {}
  const { lng, lat } = map.getCenter()
  const coords = onCampus ? CAMPUS_MEASURES[kind] : measureCoordsAround(kind, [lng, lat])
  if (onCampus) map.flyTo(CAMPUS_CAMERA)
  setToolOpen('map-measure', true)
  const stopWatching = onClosed(() => openToolPanel('map-measure'), leave)
  const removeRegion = anchorMapRegion(map, coords, MEASURE_REGION)
  let cancelPress = () => {}
  const cancelTimeline = runTimeline([
    [onCampus ? CAMPUS_CAMERA.duration : 0, () => { cancelPress = pressWhenShown(`measure-${kind}`) }],
    ...coords.map((coord): [number, () => void] => [MEASURE_CLICK_GAP_MS, () => clickMap(map, coord)]),
  ])
  return () => {
    stopWatching()
    cancelTimeline()
    cancelPress()
    removeRegion()
    stopTool()
  }
}
