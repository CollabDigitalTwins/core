"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Input, Label } from '../../../../../../ui/'
import * as React from "react";
import { MapContext } from '../../../../../../../store'
import { CursorType } from '../../../../../../../types/global'
import { Button } from '../../../../../../ui/Button'
import { AddItemDialog } from '../../../../../../ui/AddItemDialog'
import { BoxSelect } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface SiteAdderProps {
  isOpen?: boolean
  onCancel?: () => void
}

export const SiteAdder = ({ isOpen = false, onCancel }: SiteAdderProps) => {
  // Translation
  const t = useTranslations('SiteAdder')

  const [siteName, setSiteName] = React.useState<string>('')
  const [isDrawing, setIsDrawing] = React.useState<boolean>(false)
  const [drawingPoints, setDrawingPoints] = React.useState<[number, number][]>([])
  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map!
  const inputRef = React.useRef<HTMLInputElement>(null)

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

  const updateDrawingFeatures = (points: [number, number][]) => {
    if (!map) return

    const source = map.getSource('add-geojson') as maplibregl.GeoJSONSource
    if (!source) return

    const features: GeoJSON.Feature[] = []

    // Add points
    for (const [index, point] of points.entries()) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point,
        },
        properties: {
          isDrawPoint: true,
          pointIndex: index,
        },
      })
    }

    // Add connecting lines if we have more than one point
    if (points.length > 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: points,
        },
        properties: {
          isDrawing: true,
        },
      })
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    })
  }

  const addSite = (points: [number, number][]) => {
    if (!map || points.length < 3) return

    const source = map.getSource('add-geojson') as maplibregl.GeoJSONSource
    if (!source) return

    // Close the polygon by adding the first point at the end
    const closedPoints = [...points, points[0]]

    const siteFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [closedPoints],
      },
      properties: {
        type: 'site',
        name: siteName || 'Unnamed Site',
        id: Date.now().toString(),
      },
    }

    // Get existing features (sites only, not drawing features)
    const existingData = source._data as GeoJSON.FeatureCollection
    const existingSites = existingData.features.filter(f =>
      f.properties?.type === 'site',
    )

    // Add the new site
    source.setData({
      type: 'FeatureCollection',
      features: [...existingSites, siteFeature],
    })
  }

  const isPointNearExisting = (clickPoint: [number, number], existingPoints: [number, number][], threshold = 0.0001): number => {
    for (const [i, existingPoint] of existingPoints.entries()) {
      const distance = Math.sqrt(
        Math.pow(clickPoint[0] - existingPoint[0], 2)
        + Math.pow(clickPoint[1] - existingPoint[1], 2),
      )
      if (distance < threshold) {
        return i
      }
    }
    return -1
  }

  const startDrawing = () => {
    setIsDrawing(true)
    setDrawingPoints([])
    setCursor('crosshair')
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    setDrawingPoints([])
    setCursor(null)

    // Clear drawing features
    const source = map?.getSource('add-geojson') as maplibregl.GeoJSONSource
    if (source) {
      const existingData = source._data as GeoJSON.FeatureCollection
      const existingSites = existingData.features.filter(f =>
        f.properties?.type === 'site',
      )
      source.setData({
        type: 'FeatureCollection',
        features: existingSites,
      })
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

    // Add layers for points during drawing
    if (!map.getLayer('add-draw-points')) {
      map.addLayer({
        id: 'add-draw-points',
        type: 'circle',
        source: 'add-geojson',
        paint: {
          'circle-radius': 5,
          'circle-color': '#fff',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#000',
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

    // Add layer for sites (2D polygons)
    if (!map.getLayer('add-sites')) {
      map.addLayer({
        id: 'add-sites',
        type: 'fill',
        source: 'add-geojson',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.5,
        },
        filter: ['all',
          ['in', '$type', 'Polygon'],
          ['==', 'type', 'site'],
        ],
      })
    }

    // Layer for site outlines
    if (!map.getLayer('add-site-outline')) {
      map.addLayer({
        id: 'add-site-outline',
        type: 'line',
        source: 'add-geojson',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#1c4587',
          'line-width': 2,
        },
        filter: ['all',
          ['in', '$type', 'Polygon'],
          ['==', 'type', 'site'],
        ],
      })
    }
    // Add labels for features
    if (!map.getLayer('add-labels')) {
      map.addLayer({
        id: 'add-labels',
        type: 'symbol',
        source: 'add-geojson',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Inter'],
          'text-size': 12,
          'text-offset': [0, -1.5],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 1,
        },
      })
    }
  }, [map])

  React.useEffect(() => {
    if (!hasMapApi(map)) return

    const clickHandler = (e: maplibregl.MapMouseEvent): void => {
      if (!isDrawing) return

      const clickPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      // Check if clicking near an existing point to close the polygon
      const nearPointIndex = isPointNearExisting(clickPoint, drawingPoints)

      if (nearPointIndex !== -1 && drawingPoints.length >= 3) {
        // Close the polygon by creating a site
        addSite(drawingPoints)
        stopDrawing()
        setSiteName('')
      }
      else {
        // Add new point
        const newPoints = [...drawingPoints, clickPoint]
        setDrawingPoints(newPoints)
        updateDrawingFeatures(newPoints)
      }
    }

    const mouseMoveHandler = (e: maplibregl.MapMouseEvent): void => {
      if (isDrawing) setCursor('crosshair')
      else setCursor(null)
    }

    // Add event listeners
    map.on('click', clickHandler)
    map.on('mousemove', mouseMoveHandler)

    return () => {
      map.off('click', clickHandler)
      map.off('mousemove', mouseMoveHandler)
    }
  }, [map, isDrawing, drawingPoints, siteName])

  // When drawing is active, hide the dialog so the map is fully interactive.
  // The component stays mounted so useEffect listeners remain active.
  if (isDrawing) return null

  return (
    <AddItemDialog
      open={isOpen}
      onOpenChange={open => !open && onCancel?.()}
      title={t('title')}
      icon={BoxSelect}
    >
      <div className="flex flex-col gap-2 pointer-events-auto">
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

        <div className="flex gap-2">
          <Button onClick={startDrawing}>
            {t('startDrawing')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('startDrawingClick')}
        </p>
      </div>
    </AddItemDialog>
  )
}