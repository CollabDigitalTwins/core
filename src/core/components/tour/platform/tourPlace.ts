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
const NARROW_WIDTH = 768
const CARD_SHARE_OF_HEIGHT = 0.45

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

function measureCoordsAround(kind: MeasureKind, center: LngLat): LngLat[] {
  const [dLng, dLat] = [center[0] - CAMPUS_CAMERA.center[0], center[1] - CAMPUS_CAMERA.center[1]]
  return CAMPUS_MEASURES[kind].map(([lng, lat]): LngLat => [lng + dLng, lat + dLat])
}

const boundsOf = (coords: LngLat[]): [LngLat, LngLat] => {
  const lngs = coords.map(([lng]) => lng)
  const lats = coords.map(([, lat]) => lat)
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

function frameCampus(map: MapLibreMap, coords: LngLat[]) {
  if (window.innerWidth >= NARROW_WIDTH) return void map.flyTo(CAMPUS_CAMERA)
  const padding = { top: 72, left: 24, right: 24, bottom: Math.round(window.innerHeight * CARD_SHARE_OF_HEIGHT) }
  map.fitBounds(boundsOf(coords), { padding, duration: CAMPUS_CAMERA.duration })
}

/** The map point in the middle of what a left-hand overlay, such as the side panel, leaves in view. */
export function uncoveredCentre(map: MapLibreMap, cover: Element | null) {
  const box = map.getContainer().getBoundingClientRect()
  const coverRight = cover?.getBoundingClientRect().right ?? box.left
  const left = coverRight > box.left && coverRight < box.right ? coverRight : box.left
  return map.unproject([(left + box.right) / 2 - box.left, box.height / 2])
}

const clickMap = (map: MapLibreMap, lngLat: LngLat) =>
  map.fire('click', { lngLat: { lng: lngLat[0], lat: lngLat[1] }, point: map.project(lngLat) })

/** Clicks a measurement onto the map: on the campus after flying there, else around the current centre; returns a stop. */
export function demoMeasure(map: MapLibreMap | null, kind: MeasureKind, onCampus: boolean, stopTool: () => void, leave: () => void = () => {}): () => void {
  if (!map) return () => {}
  const { lng, lat } = map.getCenter()
  const coords = onCampus ? CAMPUS_MEASURES[kind] : measureCoordsAround(kind, [lng, lat])
  if (onCampus) frameCampus(map, coords)
  setToolOpen('map-measure', true)
  const stopWatching = onClosed(() => openToolPanel('map-measure'), leave)
  const removeRegion = anchorMapRegion(map, coords, MEASURE_REGION)
  let cancelPress = () => {}
  const pickKind = () => {
    stopWatching()
    cancelPress = pressWhenShown(`measure-${kind}`)
  }
  const cancelTimeline = runTimeline([
    [onCampus ? CAMPUS_CAMERA.duration : 0, pickKind],
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
