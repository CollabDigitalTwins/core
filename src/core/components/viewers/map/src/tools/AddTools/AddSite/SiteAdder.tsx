"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { BoxSelect } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";
import { toast } from 'sonner'

import { useBuildings } from '../../../../../../../hooks/buildings/buildings'
import { useCreateSite } from '../../../../../../../hooks/sites/sites'
import { MapContext, useMapSitesContext } from '../../../../../../../store'
import { Input, Label } from '../../../../../../ui/'
import { AddItemDialog } from '../../../../../../ui/AddItemDialog'
import { Button } from '../../../../../../ui/Button'
import { polygonCentroid, filterPointsInRing } from '../../../MapLayers/src/SiteLayer/siteGeometry'

import { AssociateBuildingsDialog } from './AssociateBuildingsDialog'
import { persistDrawnSite } from './persistSite'

import type { Building } from '../../../../../../../types/dbTypes'
import type { CursorType } from '../../../../../../../types/global'

interface SiteAdderProps {
  isOpen?: boolean
  onCancel?: () => void
}

// A single, stable id so the instruction toast updates in place instead of stacking.
const DRAW_TOAST_ID = 'site-adder-draw'

export const SiteAdder = ({ isOpen = false, onCancel }: SiteAdderProps) => {
  // Translation
  const t = useTranslations('SiteAdder')

  // Translate with an English fallback. The translation messages for this
  // library live in the host app, so newer keys may not exist there yet —
  // `tf` keeps the tool usable (and translatable) in every host.
  const tf = React.useCallback(
    (key: string, fallback: string, values?: Record<string, string | number>) =>
      (t.has(key) ? t(key, values) : fallback),
    [t],
  )

  const [siteName, setSiteName] = React.useState<string>('')
  const [isDrawing, setIsDrawing] = React.useState<boolean>(false)
  const [drawingPoints, setDrawingPoints] = React.useState<[number, number][]>([])
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map!
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Persistence: create the DB site + upload its polygon geojson to minio, then
  // hand the polygon to the SiteLayer (via the MapSites store) for rendering.
  const { createSite } = useCreateSite()
  const { dispatch: mapSitesDispatch } = useMapSitesContext()

  // Database buildings (for detecting which fall inside a freshly drawn site).
  const { buildings, isLoading: buildingsLoading } = useBuildings()

  // A site that was just created and whose inside-buildings still need to be
  // detected. Held in state so detection re-runs once the buildings list loads.
  const [pendingDetection, setPendingDetection] = React.useState<
    { siteId: number, siteName: string, ring: [number, number][] } | null
  >(null)

  // When buildings are detected inside a freshly drawn site, prompt the user to
  // associate them (multi-select). Independent of the add-site dialog.
  const [associateState, setAssociateState] = React.useState<
    { siteId: number, siteName: string, buildings: Building[] } | null
  >(null)
  // A ref (not state) so all event-handler closures observe the live value and
  // a rapid second finish (double Enter / click + toast "Finish") can't create
  // a duplicate site before the first persist resolves.
  const isPersistingRef = React.useRef(false)

  // The committed points are mirrored in a ref so map / keyboard / toast
  // handlers always read the latest geometry without having to re-subscribe
  // on every click (which would otherwise drop fast double clicks).
  const drawingPointsRef = React.useRef<[number, number][]>([])

  // Added this to fix the issue of map not available.
  const hasMapApi = (
    mapInstance: unknown,
  ): mapInstance is maplibregl.Map => (
    Boolean(mapInstance)
    && typeof (mapInstance as maplibregl.Map).getSource === 'function'
    && typeof (mapInstance as maplibregl.Map).getLayer === 'function'
    && typeof (mapInstance as maplibregl.Map).addSource === 'function'
    && typeof (mapInstance as maplibregl.Map).addLayer === 'function'
    && typeof (mapInstance as maplibregl.Map).on === 'function'
    && typeof (mapInstance as maplibregl.Map).off === 'function'
  )

  const setCursor = (cursor: CursorType) => {
    if (!map) return
    if (map.getCanvas().style.cursor === cursor) return
    map.getCanvas().style.cursor = cursor
  }

  const getSource = () =>
    (map?.getSource('add-geojson') as maplibregl.GeoJSONSource | undefined)

  // Render the in-progress drawing: corner points, the connecting outline and
  // (once it can be closed) a translucent preview of the resulting polygon.
  // Created sites are rendered by SiteLayer, not here.
  const updateDrawingFeatures = (points: [number, number][]) => {
    const source = getSource()
    if (!source) return

    const closable = points.length >= 3
    const features: GeoJSON.Feature[] = []

    points.forEach((point, index) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: point },
        properties: {
          isDrawPoint: true,
          pointIndex: index,
          isFirstPoint: index === 0,
          // The first point turns green once a click on it would close the site.
          closable: closable && index === 0,
        },
      })
    })

    if (points.length > 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          // Close the loop visually so the user sees the final shape.
          coordinates: closable ? [...points, points[0]] : points,
        },
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

    source.setData({ type: 'FeatureCollection', features })
  }

  const commitPoints = (points: [number, number][]) => {
    drawingPointsRef.current = points
    setDrawingPoints(points)
    updateDrawingFeatures(points)
  }

  // Returns true when a click is close enough (in screen pixels, so it works at
  // any zoom level) to the first point to close the polygon.
  const isNearFirstPoint = (
    clickPoint: [number, number],
    points: [number, number][],
    pixelThreshold = 14,
  ): boolean => {
    if (!map || points.length < 3) return false
    const first = map.project(points[0])
    const click = map.project(clickPoint)
    return Math.hypot(first.x - click.x, first.y - click.y) <= pixelThreshold
  }

  // Remove the in-progress drawing features from the map.
  const clearDrawingFeatures = () => {
    const source = getSource()
    if (!source) return
    source.setData({ type: 'FeatureCollection', features: [] })
  }

  const resetDrawingState = () => {
    drawingPointsRef.current = []
    setDrawingPoints([])
    setIsDrawing(false)
    setCursor('')
    toast.dismiss(DRAW_TOAST_ID)
  }

  const startDrawing = () => {
    if (!hasMapApi(map) || !map.getSource('add-geojson')) {
      toast.error(tf('mapNotReady', 'The map is still loading. Please try again in a moment.'))
      return
    }
    drawingPointsRef.current = []
    setDrawingPoints([])
    setIsDrawing(true)
    setCursor('crosshair')
  }

  const undoLastPoint = () => {
    const points = drawingPointsRef.current
    if (points.length === 0) return
    commitPoints(points.slice(0, -1))
  }

  const cancelDrawing = () => {
    clearDrawingFeatures()
    resetDrawingState()
    toast.info(tf('drawCancelled', 'Site drawing cancelled.'))
  }

  const finishDrawing = async () => {
    if (isPersistingRef.current) return
    const points = drawingPointsRef.current
    if (points.length < 3) {
      toast.warning(tf('needThreePoints', 'Add at least 3 points before closing the site.'))
      return
    }
    const name = siteName.trim() || tf('unnamedSite', 'Unnamed Site')
    const ring = [...points]
    const centroid = polygonCentroid(ring)

    // Set synchronously before the first await so a second invocation bails.
    isPersistingRef.current = true
    const toastId = toast.loading(tf('savingSite', 'Saving site…'))
    try {
      const { siteId, assetId, fileId } = await persistDrawnSite({ name, ring, centroid, createSite })
      // Hand the polygon to SiteLayer for clickable, persistent rendering.
      mapSitesDispatch({
        type: 'SHOW_SITE',
        payload: { site: { id: siteId, name, ring, assetId, fileId } },
      })
      toast.success(tf('siteCreated', `Site "${name}" created.`, { name }), { id: toastId })
      clearDrawingFeatures()
      resetDrawingState()
      setSiteName('')
      isPersistingRef.current = false

      // Detect buildings inside the polygon (deferred to the effect below so it
      // still works if the buildings list hasn't finished loading yet).
      setPendingDetection({ siteId, siteName: name, ring })

      // Don't reopen the Add Site dialog — creation is finished.
      onCancel?.()
    }
    catch {
      toast.error(tf('siteCreateFailed', 'Failed to create the site. Please try again.'), { id: toastId })
      isPersistingRef.current = false
      // Keep the drawing so the user can retry finishing.
    }
  }

  // set up layer to add site
  React.useEffect(() => {
    if (!hasMapApi(map)) return
    // GeoJSON object to hold features
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
      type: 'FeatureCollection',
      features: [],
    }

    // Add source if it doesn't exist
    if (!map.getSource('add-geojson') && geojson) {
      map.addSource('add-geojson', {
        type: 'geojson',
        data: geojson,
      })
    }

    // Translucent preview of the polygon currently being drawn (added first so
    // the outline and points render on top of it).
    if (!map.getLayer('add-draw-fill')) {
      map.addLayer({
        id: 'add-draw-fill',
        type: 'fill',
        source: 'add-geojson',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2,
        },
        filter: ['all',
          ['in', '$type', 'Polygon'],
          ['==', 'isDrawPreview', true],
        ],
      })
    }

    // Add layers for points during drawing
    if (!map.getLayer('add-draw-points')) {
      map.addLayer({
        id: 'add-draw-points',
        type: 'circle',
        source: 'add-geojson',
        paint: {
          // The first point is emphasised (and turns green once closing is
          // possible) so it reads as "click here to close".
          'circle-radius': ['case', ['==', ['get', 'closable'], true], 8, 5],
          'circle-color': ['case', ['==', ['get', 'closable'], true], '#22c55e', '#ffffff'],
          'circle-stroke-width': 2,
          'circle-stroke-color': ['case', ['==', ['get', 'closable'], true], '#15803d', '#000000'],
        },
        filter: ['all',
          ['in', '$type', 'Point'],
          ['==', 'isDrawPoint', true],
        ],
      })
    }

    // Add layers for lines during drawing
    if (!map.getLayer('add-draw-lines')) {
      map.addLayer({
        id: 'add-draw-lines',
        type: 'line',
        source: 'add-geojson',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#fff',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
        },
        filter: ['all',
          ['in', '$type', 'LineString'],
          ['==', 'isDrawing', true],
        ],
      })
    }

  }, [map])

  // Map interaction while drawing: click to add a corner, click the first
  // corner to close. Bound only while drawing so normal map use is unaffected.
  React.useEffect(() => {
    if (!hasMapApi(map) || !isDrawing) return

    const clickHandler = (e: maplibregl.MapMouseEvent): void => {
      const clickPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      // Click near the first point to close the polygon.
      if (isNearFirstPoint(clickPoint, drawingPointsRef.current)) {
        finishDrawing()
        return
      }

      commitPoints([...drawingPointsRef.current, clickPoint])
    }

    const mouseMoveHandler = (): void => setCursor('crosshair')

    map.on('click', clickHandler)
    map.on('mousemove', mouseMoveHandler)

    return () => {
      map.off('click', clickHandler)
      map.off('mousemove', mouseMoveHandler)
    }

  }, [map, isDrawing])

  // Keyboard shortcuts while drawing: Enter finishes, Esc cancels, Backspace undoes.
  React.useEffect(() => {
    if (!isDrawing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); finishDrawing() }
      else if (e.key === 'Escape') { e.preventDefault(); cancelDrawing() }
      else if (e.key === 'Backspace') { e.preventDefault(); undoLastPoint() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)

  }, [isDrawing])

  // Persistent instruction / feedback toast that updates as points are added.
  React.useEffect(() => {
    if (!isDrawing) {
      toast.dismiss(DRAW_TOAST_ID)
      return
    }

    const count = drawingPoints.length
    const canFinish = count >= 3

    const title = canFinish
      ? tf('drawReadyTitle', 'Ready to finish your site')
      : tf('drawTitle', 'Draw your site')

    const description = canFinish
      ? tf(
        'drawReadyHint',
        `${count} points placed. Click the first point, press Enter, or tap Finish to close it. Backspace removes the last point, Esc cancels.`,
        { count },
      )
      : tf(
        'drawHint',
        `Click on the map to add each corner (${count} so far). Add at least 3 to form a site. Esc cancels.`,
        { count },
      )

    toast.info(title, {
      id: DRAW_TOAST_ID,
      description,
      duration: Infinity,
      action: canFinish
        ? { label: tf('finish', 'Finish'), onClick: () => finishDrawing() }
        : undefined,
      cancel: { label: tf('cancel', 'Cancel'), onClick: () => cancelDrawing() },
    })

  }, [isDrawing, drawingPoints.length])

  // If the tool is closed (e.g. the user switches tools) mid-draw, clean up.
  React.useEffect(() => {
    if (!isOpen && isDrawing) {
      clearDrawingFeatures()
      resetDrawingState()
    }

  }, [isOpen, isDrawing])

  // Dismiss the instruction toast if the component unmounts while drawing.
  React.useEffect(() => () => { toast.dismiss(DRAW_TOAST_ID) }, [])

  // After a site is created, detect the database buildings inside it and prompt
  // to associate them. Waits for the buildings list to load before deciding, so
  // a quick draw on a cold cache doesn't silently skip the prompt.
  React.useEffect(() => {
    if (!pendingDetection) return
    if (buildingsLoading && buildings.length === 0) return
    const inside = filterPointsInRing(pendingDetection.ring, buildings, b =>
      (typeof b.buildingLongitude === 'number' && typeof b.buildingLatitude === 'number')
        ? [b.buildingLongitude, b.buildingLatitude]
        : null)
    if (inside.length > 0) {
      setAssociateState({
        siteId: pendingDetection.siteId,
        siteName: pendingDetection.siteName,
        buildings: inside,
      })
    }
    setPendingDetection(null)
  }, [pendingDetection, buildings, buildingsLoading])

  // When drawing is active, hide the dialog so the map is fully interactive.
  // The component stays mounted so useEffect listeners remain active and the
  // instruction toast guides the user through finishing the polygon.
  if (isDrawing) return null

  return (
    <>
      {associateState && (
        <AssociateBuildingsDialog
          siteId={associateState.siteId}
          siteName={associateState.siteName}
          buildings={associateState.buildings}
          onClose={() => setAssociateState(null)}
        />
      )}
      <AddItemDialog
        open={isOpen}
        onOpenChange={open => !open && onCancel?.()}
        title={t('title')}
        icon={BoxSelect}
      >
      <div className="flex flex-col gap-3 pointer-events-auto">
        <div className="flex flex-col gap-2">
          <Label htmlFor="site-name">{t('nameLabel')}</Label>
          <Input
            id="site-name"
            ref={inputRef}
            type="text"
            placeholder={t('namePlaceholder')}
            value={siteName}
            onChange={e => setSiteName(e.target.value)}
          />
        </div>

        <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-1">
          <li>{tf('step1', 'Name your site (optional), then start drawing.')}</li>
          <li>{tf('step2', 'Click on the map to drop each corner.')}</li>
          <li>{tf('step3', 'Click the first corner (or press Enter) to close it.')}</li>
        </ol>

        <div className="flex gap-2">
          <Button onClick={startDrawing}>
            <BoxSelect className="size-4" />
            {t('startDrawing')}
          </Button>
        </div>
      </div>
      </AddItemDialog>
    </>
  )
}
