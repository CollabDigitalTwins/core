// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { toast } from 'sonner'

import { hasMapApi } from '../../../../utils/hasMapApi'

import { insertCorner, moveCorner, nearestCornerIndex, nearestEdgeIndex, removeCorner } from './ringEditing'
import { useMapToolSession } from './useMapToolSession'

import type { MapClickManager } from '../../../../utils/MapEventManager/MapClickManager'
import type { Ring } from '../../../MapLayers/src/SiteLayer/siteGeometry'
import type * as maplibregl from 'maplibre-gl'

const SOURCE_ID = 'add-geojson'
const CORNER_PIXEL_THRESHOLD = 14
const EDGE_PIXEL_THRESHOLD = 8

/** Toast and error strings, so each tool words its own shape. */
export interface PolygonDrawLabels {
  mapNotReady: string
  cancelled: string
  needThreePoints: string
  title: string
  readyTitle?: string
  hint: (count: number) => string
  readyHint?: (count: number) => string
  finish: string
  cancel: string
}

type Translate = (key: string, values?: { count: number }) => string

/** Labels for a tool whose i18n namespace carries the shared `draw*` keys. */
export const toolDrawLabels = (t: Translate): PolygonDrawLabels => ({
  mapNotReady: t('mapNotReady'),
  cancelled: t('drawCancelled'),
  needThreePoints: t('needThreePoints'),
  title: t('drawTitle'),
  readyTitle: t('drawReadyTitle'),
  hint: count => t('drawHint', { count }),
  readyHint: count => t('drawReadyHint', { count }),
  finish: t('finish'),
  cancel: t('cancel'),
})

/** Rejecting keeps the drawing on the map so the user can retry finishing. */
export type FinishPolygon = (ring: Ring) => Promise<void>

function drawingFeatures(points: Ring, hoveredIndex: number): GeoJSON.FeatureCollection {
  const closable = points.length >= 3
  const features: GeoJSON.Feature[] = points.map((point, index) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: point },
    properties: { isDrawPoint: true, closable: closable && index === 0, hovered: index === hoveredIndex },
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
        'circle-radius': ['case', ['==', ['get', 'closable'], true], 8, ['==', ['get', 'hovered'], true], 7, 5],
        'circle-color': ['case', ['==', ['get', 'closable'], true], '#22c55e', ['==', ['get', 'hovered'], true], '#3b82f6', '#ffffff'],
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
 * Click-to-place polygon drawing: Enter or the first corner finishes, Esc cancels. Corners drag,
 * Ctrl+click on an edge inserts one, Delete removes the hovered corner or else the last one.
 */
export function usePolygonDraw({ map, mapClickManager, enabled, toastId, labels, onFinish, onCancel }: {
  map: maplibregl.Map | null | undefined
  mapClickManager?: MapClickManager | null
  enabled: boolean
  toastId: string
  labels: PolygonDrawLabels
  onFinish: FinishPolygon
  onCancel?: () => void
}) {
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [isFinishing, setIsFinishing] = React.useState(false)
  const [pointCount, setPointCount] = React.useState(0)
  const [hoveredIndex, setHoveredIndex] = React.useState(-1)
  const [draggingIndex, setDraggingIndex] = React.useState(-1)
  const pointsRef = React.useRef<Ring>([])
  const hoveredRef = React.useRef(-1)
  const draggedRef = React.useRef(false)
  const finishingRef = React.useRef(false)
  const latest = React.useRef({ labels, onFinish, onCancel })
  latest.current = { labels, onFinish, onCancel }

  const render = React.useCallback(() => {
    const source = map?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    void source?.setData(drawingFeatures(pointsRef.current, hoveredRef.current))
  }, [map])

  const hover = React.useCallback((index: number) => {
    if (hoveredRef.current === index) return
    hoveredRef.current = index
    setHoveredIndex(index)
    render()
  }, [render])

  const commit = React.useCallback((points: Ring) => {
    pointsRef.current = points
    if (hoveredRef.current >= points.length) {
      hoveredRef.current = -1
      setHoveredIndex(-1)
    }
    setPointCount(points.length)
    render()
  }, [render])

  const stop = React.useCallback(() => {
    hover(-1)
    setDraggingIndex(-1)
    commit([])
    setIsDrawing(false)
    toast.dismiss(toastId)
  }, [commit, hover, toastId])

  const start = React.useCallback((initialRing: Ring = []): boolean => {
    if (!hasMapApi(map)) {
      toast.error(latest.current.labels.mapNotReady)
      return false
    }
    addDrawingLayers(map)
    commit([...initialRing])
    setIsDrawing(true)
    return true
  }, [map, commit])

  const cancel = React.useCallback(() => {
    stop()
    toast.info(latest.current.labels.cancelled)
    latest.current.onCancel?.()
  }, [stop])

  const finish = React.useCallback(async () => {
    if (finishingRef.current) return
    const ring = [...pointsRef.current]
    if (ring.length < 3) {
      toast.warning(latest.current.labels.needThreePoints)
      return
    }
    finishingRef.current = true
    setIsFinishing(true)
    try {
      await latest.current.onFinish(ring)
      stop()
    }
    catch {
      // onFinish reports its own failure.
    }
    finally {
      finishingRef.current = false
      setIsFinishing(false)
    }
  }, [stop])

  const screenCorners = () => (map ? pointsRef.current.map(point => map.project(point)) : [])
  const cornerAt = (e: maplibregl.MapMouseEvent) => nearestCornerIndex(screenCorners(), e.point, CORNER_PIXEL_THRESHOLD)
  const lngLatOf = (e: maplibregl.MapMouseEvent): [number, number] => [e.lngLat.lng, e.lngLat.lat]

  const removeHoveredOrLast = () => {
    const points = pointsRef.current
    const index = hoveredRef.current >= 0 ? hoveredRef.current : points.length - 1
    if (index >= 0) commit(removeCorner(points, index))
  }

  const placeCorner = (e: maplibregl.MapMouseEvent) => {
    const points = pointsRef.current
    const corner = cornerAt(e)
    if (corner === 0 && points.length >= 3) {
      void finish()
      return
    }
    if (corner >= 0) return
    const splitsEdge = e.originalEvent.ctrlKey || e.originalEvent.metaKey
    const edge = splitsEdge ? nearestEdgeIndex(screenCorners(), e.point, EDGE_PIXEL_THRESHOLD) : -1
    commit(edge >= 0 ? insertCorner(points, edge, lngLatOf(e)) : [...points, lngLatOf(e)])
  }

  useMapToolSession({
    map,
    mapClickManager,
    active: isDrawing && !isFinishing,
    cursor: draggingIndex >= 0 ? 'grabbing' : hoveredIndex >= 0 ? 'grab' : 'crosshair',
    onMouseDown: (e) => {
      const index = cornerAt(e)
      if (index < 0) return
      e.preventDefault()
      draggedRef.current = false
      setDraggingIndex(index)
    },
    onMouseMove: (e) => {
      const dragging = draggingIndex >= 0 && e.originalEvent.buttons !== 0
      if (!dragging) {
        if (draggingIndex >= 0) setDraggingIndex(-1)
        hover(cornerAt(e))
        return
      }
      draggedRef.current = true
      commit(moveCorner(pointsRef.current, draggingIndex, lngLatOf(e)))
    },
    onMouseUp: () => setDraggingIndex(-1),
    onClick: (e) => {
      if (draggedRef.current) draggedRef.current = false
      else placeCorner(e)
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter') { e.preventDefault(); void finish() }
      else if (e.key === 'Escape') { e.preventDefault(); cancel() }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeHoveredOrLast() }
    },
  })

  React.useEffect(() => {
    if (!enabled && isDrawing) stop()
  }, [enabled, isDrawing, stop])

  React.useEffect(() => {
    if (!isDrawing || isFinishing) {
      toast.dismiss(toastId)
      return
    }
    const { labels: text } = latest.current
    const canFinish = pointCount >= 3
    const title = canFinish ? text.readyTitle ?? text.title : text.title
    const hint = canFinish ? text.readyHint ?? text.hint : text.hint
    toast.info(title, {
      id: toastId,
      description: hint(pointCount),
      duration: Infinity,
      action: canFinish ? { label: text.finish, onClick: () => { void finish() } } : undefined,
      cancel: { label: text.cancel, onClick: cancel },
    })
  }, [isDrawing, isFinishing, pointCount, toastId, finish, cancel])

  React.useEffect(() => () => { toast.dismiss(toastId) }, [toastId])

  return { isDrawing, start }
}
