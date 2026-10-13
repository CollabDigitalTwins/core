// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { toast } from 'sonner'

import { hasMapApi } from '../../../../utils/hasMapApi'

import { useMapToolSession } from './useMapToolSession'

import type { MapClickManager } from '../../../../utils/MapEventManager/MapClickManager'
import type { Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'
import type * as maplibregl from 'maplibre-gl'

const SOURCE_ID = 'add-geojson'
const CLOSE_PIXEL_THRESHOLD = 14

/** Toast and error strings, so each tool words its own shape. */
export interface PolygonDrawLabels {
  mapNotReady: string
  cancelled: string
  needThreePoints: string
  title: string
  readyTitle: string
  hint: (count: number) => string
  readyHint: (count: number) => string
  finish: string
  cancel: string
}

/** Rejecting keeps the drawing on the map so the user can retry finishing. */
export type FinishPolygon = (ring: Ring) => Promise<void>

function drawingFeatures(points: Ring): GeoJSON.FeatureCollection {
  const closable = points.length >= 3
  const features: GeoJSON.Feature[] = points.map((point, index) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: point },
    properties: { isDrawPoint: true, closable: closable && index === 0 },
  }))

  if (points.length > 1) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: closable ? [...points, points[0]] : points },
      properties: { isDrawing: true },
    })
  }

  if (closable) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
      properties: { isDrawPreview: true },
    })
  }

  return { type: 'FeatureCollection', features }
}

function addDrawingLayers(map: maplibregl.Map) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }

  if (!map.getLayer('add-draw-fill')) {
    map.addLayer({
      id: 'add-draw-fill',
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.2 },
      filter: ['all', ['in', '$type', 'Polygon'], ['==', 'isDrawPreview', true]],
    })
  }

  if (!map.getLayer('add-draw-points')) {
    map.addLayer({
      id: 'add-draw-points',
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['case', ['==', ['get', 'closable'], true], 8, 5],
        'circle-color': ['case', ['==', ['get', 'closable'], true], '#22c55e', '#ffffff'],
        'circle-stroke-width': 2,
        'circle-stroke-color': ['case', ['==', ['get', 'closable'], true], '#15803d', '#000000'],
      },
      filter: ['all', ['in', '$type', 'Point'], ['==', 'isDrawPoint', true]],
    })
  }

  if (!map.getLayer('add-draw-lines')) {
    map.addLayer({
      id: 'add-draw-lines',
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#fff', 'line-width': 2.5, 'line-dasharray': [2, 2] },
      filter: ['all', ['in', '$type', 'LineString'], ['==', 'isDrawing', true]],
    })
  }
}

/**
 * Click-to-place polygon drawing: Enter or the first corner finishes, Esc cancels, Backspace undoes.
 * A drawing in progress stops when `enabled` turns false.
 */
export function usePolygonDraw({ map, mapClickManager, enabled, toastId, labels, onFinish }: {
  map: maplibregl.Map | null | undefined
  mapClickManager?: MapClickManager | null
  enabled: boolean
  toastId: string
  labels: PolygonDrawLabels
  onFinish: FinishPolygon
}) {
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [pointCount, setPointCount] = React.useState(0)
  const pointsRef = React.useRef<Ring>([])
  const finishingRef = React.useRef(false)
  const latest = React.useRef({ labels, onFinish })
  latest.current = { labels, onFinish }

  const commit = React.useCallback((points: Ring) => {
    pointsRef.current = points
    setPointCount(points.length)
    void (map?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined)?.setData(drawingFeatures(points))
  }, [map])

  const stop = React.useCallback(() => {
    commit([])
    setIsDrawing(false)
    toast.dismiss(toastId)
  }, [commit, toastId])

  const start = React.useCallback(() => {
    if (!hasMapApi(map)) {
      toast.error(latest.current.labels.mapNotReady)
      return
    }
    addDrawingLayers(map)
    commit([])
    setIsDrawing(true)
  }, [map, commit])

  const cancel = React.useCallback(() => {
    stop()
    toast.info(latest.current.labels.cancelled)
  }, [stop])

  const finish = React.useCallback(async () => {
    if (finishingRef.current) return
    const ring = [...pointsRef.current]
    if (ring.length < 3) {
      toast.warning(latest.current.labels.needThreePoints)
      return
    }
    finishingRef.current = true
    try {
      await latest.current.onFinish(ring)
      stop()
    }
    catch {
      // The caller reports the failure; the corners stay so the user can finish again.
    }
    finally {
      finishingRef.current = false
    }
  }, [stop])

  const isNearFirstPoint = (point: [number, number]) => {
    const points = pointsRef.current
    if (!map || points.length < 3) return false
    const first = map.project(points[0])
    const click = map.project(point)
    return Math.hypot(first.x - click.x, first.y - click.y) <= CLOSE_PIXEL_THRESHOLD
  }

  useMapToolSession({
    map,
    mapClickManager,
    active: isDrawing,
    cursor: 'crosshair',
    onClick: (e) => {
      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      if (isNearFirstPoint(point)) void finish()
      else commit([...pointsRef.current, point])
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter') { e.preventDefault(); void finish() }
      else if (e.key === 'Escape') { e.preventDefault(); cancel() }
      else if (e.key === 'Backspace') { e.preventDefault(); commit(pointsRef.current.slice(0, -1)) }
    },
  })

  React.useEffect(() => {
    if (!enabled && isDrawing) stop()
  }, [enabled, isDrawing, stop])

  React.useEffect(() => {
    if (!isDrawing) {
      toast.dismiss(toastId)
      return
    }
    const { labels: text } = latest.current
    const canFinish = pointCount >= 3
    toast.info(canFinish ? text.readyTitle : text.title, {
      id: toastId,
      description: canFinish ? text.readyHint(pointCount) : text.hint(pointCount),
      duration: Infinity,
      action: canFinish ? { label: text.finish, onClick: () => { void finish() } } : undefined,
      cancel: { label: text.cancel, onClick: cancel },
    })
  }, [isDrawing, pointCount, toastId, finish, cancel])

  React.useEffect(() => () => { toast.dismiss(toastId) }, [toastId])

  return { isDrawing, start }
}
