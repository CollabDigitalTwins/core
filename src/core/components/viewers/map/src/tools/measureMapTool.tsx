"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from "react";
import * as turf from '@turf/turf'
import { useTranslations } from 'next-intl'

// Utilities
import { MapContext, ToolsContext } from '../../../../../store'
import type { CursorType } from '../../../../../types/global'
import type { Tool} from '../../../../../types/tools';
import { type ToolbarToolType } from '../../../../../types/tools'

// Shadcn components
import {
  DropdownMenuItem,
} from '../../../../ui/DropdownMenu'

// Icons
import * as LR from 'lucide-react'
import { ToolbarSubmenu } from '../../../../ToolbarSubmenu'
import { MapLayerClickPriority } from '../../utils/MapEventManager/MapClickManager'

interface MeasureToolProps {
  tool: Tool
}

export const MeasureMapTool: React.FC<MeasureToolProps> = ({ tool }) => {
  // Translation
  const t = useTranslations('MeasureMapTool')

  const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext)
  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)
  const { map, mapClickManager, dimensionsColour: dimensionLineColor  } = mapState.map;
  const [active, setActive] = React.useState(false)
  const [measureType, setMeasureType] = React.useState<'line' | 'area'>('line')
  const [distance, setDistance] = React.useState<number | null>(null)
  const [area, setArea] = React.useState<number | null>(null)

  const toolId = tool.id
  const { currentToolId } = toolsState.tools
  const setTools = (currentToolId: ToolbarToolType) => {
    toolsDispatch({
      type: 'SET-TOOL',
      payload: { currentToolId },
    })
  }

  const setCursor = (cursor: CursorType) => {
    mapDispatch({
      type: 'SET_CURSOR',
      payload: { cursor },
    })
  }

  const handleClearMeasurementTool = () => {
    // Clean cursor
    setCursor('')

    // Clear measurements
    clearMeasurements()

    // Deactivate tool
    setActive(false)
    setTools(null)
  }
  // Handle ESC key press to clean cursor and clear measurements
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active) {
        // Clean cursor
        setCursor('')

        // Clear measurements
        clearMeasurements()

        // Deactivate tool
        setActive(false)
        setTools(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [active])

  // Format distance based on size
  const formatDistance = (distanceInKm: number): string => {
    if (distanceInKm < 0.1) {
      // Less than 100m, show in meters
      const meters = Math.round(distanceInKm * 1000)
      return `${meters} m`
    }
    else if (distanceInKm < 10) {
      // Less than 10km, show in km with 2 decimal places
      return `${distanceInKm.toFixed(2)} km`
    }
    else {
      // 10km or more, show in km with 1 decimal place
      return `${distanceInKm.toFixed(1)} km`
    }
  }

  // Format area based on size
  const formatArea = (areaInSqKm: number): string => {
    if (areaInSqKm < 0.001) {
      // Less than 1000 sq meters, show in sq meters
      const sqMeters = Math.round(areaInSqKm * 1_000_000)
      return `${sqMeters} m²`
    }
    else if (areaInSqKm < 0.1) {
      // Less than 0.1 sq km, show in sq meters
      const sqMeters = Math.round(areaInSqKm * 1_000_000)
      return `${sqMeters} m²`
    }
    else if (areaInSqKm < 10) {
      // Less than 10 sq km, show with 2 decimal places
      return `${areaInSqKm.toFixed(2)} km²`
    }
    else {
      // 10 sq km or more, show with 1 decimal place
      return `${areaInSqKm.toFixed(1)} km²`
    }
  }

  // GeoJSON object to hold measurement features
  const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
    type: 'FeatureCollection',
    features: [],
  }

  React.useEffect(() => {
    if (!map) return

    // Wait for the map style to load before adding sources and layers
    const initializeMeasureTool = () => {
      // Add source if it doesn't exist
      if (!map.getSource('measure-geojson') && geojson) {
        map.addSource('measure-geojson', {
          type: 'geojson',
          data: geojson,
        })
      }

      // Add layers for points
      if (!map.getLayer('measure-points')) {
        map.addLayer({
          id: 'measure-points',
          type: 'circle',
          source: 'measure-geojson',
          paint: {
            'circle-radius': 5,
            'circle-color': dimensionLineColor || '#fff',
          },
          filter: ['in', '$type', 'Point'],
        })
      }

      // Add layers for lines
      if (!map.getLayer('measure-lines')) {
        map.addLayer({
          id: 'measure-lines',
          type: 'line',
          source: 'measure-geojson',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': dimensionLineColor || '#fff',
            'line-width': 2.5,
            'line-dasharray': [2, 2],
          },
          filter: ['in', '$type', 'LineString'],
        })
      }

      // Add layer for polygons (area measurement)
      if (!map.getLayer('measure-polygons')) {
        map.addLayer({
          id: 'measure-polygons',
          type: 'fill',
          source: 'measure-geojson',
          paint: {
            'fill-color': dimensionLineColor || '#fff',
            'fill-opacity': 0.1,
            'fill-outline-color': dimensionLineColor || '#fff',
          },
          filter: ['in', '$type', 'Polygon'],
        })
      }

      // Layer for polygon outline
      if (!map.getLayer('measure-polygon-outline')) {
        map.addLayer({
          id: 'measure-polygon-outline',
          type: 'line',
          source: 'measure-geojson',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': dimensionLineColor || '#fff',
            'line-width': 2.5,
            'line-dasharray': [2, 2],
          },
          filter: ['in', '$type', 'Polygon'],
        })
      }

      // Add layers for distance labels
      if (!map.getLayer('measure-distance-labels')) {
        map.addLayer({
          id: 'measure-distance-labels',
          type: 'symbol',
          source: 'measure-geojson',
          layout: {
            'text-field': ['get', 'distance'],
            'text-font': ['Inter'],
            'text-size': 14,
            'symbol-placement': 'line-center',
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#000',
            'text-halo-color': '#fff',
            'text-halo-width': 3,
            'text-halo-blur': 1,
          },
          filter: ['in', '$type', 'LineString'],
        })
      }

      // Add layers for area labels
      if (!map.getLayer('measure-area-labels')) {
        map.addLayer({
          id: 'measure-area-labels',
          type: 'symbol',
          source: 'measure-geojson',
          layout: {
            'text-field': ['get', 'area'],
            'text-font': ['Inter'],
            'text-size': 14,
            'text-offset': [0, 0],
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#000',
            'text-halo-color': '#fff',
            'text-halo-width': 3,
            'text-halo-blur': 1,
          },
          filter: ['in', '$type', 'Polygon'],
        })
      }
    }

    // Check if the map style is already loaded
    if (map.isStyleLoaded()) {
      initializeMeasureTool()
    }
    else {
      // Wait for the style to load
      map.once('styledata', initializeMeasureTool)
    }

    // Click handler for measurement
    const clickHandler = (e: maplibregl.MapMouseEvent): void => {
      // console.log("inside click handler",[e.lngLat.lng, e.lngLat.lat])
      if (!active) return

      const features = map.queryRenderedFeatures(e.point, {
        layers: ['measure-points'],
      })

      if (measureType === 'line') {
        // Line measurement

        // Remove the linestring from the group
        geojson.features = geojson.features.filter(feature =>
          feature.geometry.type !== 'LineString',
        )

        // If a feature was clicked, remove it from the map
        if (features.length > 0) {
          const id = features[0].properties?.id
          geojson.features = geojson.features.filter((point) => {
            return point.properties?.id !== id
          })
        }
        else {
          const point: GeoJSON.Feature<GeoJSON.Point> = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [e.lngLat.lng, e.lngLat.lat],
            },
            properties: {
              id: String(Date.now()),
            },
          }

          geojson.features.push(point)
        }

        // Get all points to create line
        const pointFeatures = geojson.features.filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> =>
          feature.geometry.type === 'Point',
        )

        if (pointFeatures.length > 1) {
          // Create linestring from points
          const lineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: pointFeatures.map(point => point.geometry.coordinates),
            },
            properties: {},
          }

          // Calculate distance in kilometers
          const calculatedDistance = turf.length(lineFeature)
          setDistance(calculatedDistance)

          // Add formatted distance as a property to display on the map
          lineFeature.properties = {
            distance: formatDistance(calculatedDistance),
          }

          geojson.features.push(lineFeature)
        }
        else {
          setDistance(null)
        }
      }
      else {
        // Area measurement

        // Remove any existing polygon features
        geojson.features = geojson.features.filter(feature =>
          feature.geometry.type !== 'Polygon',
        )

        // If a feature was clicked, remove it from the map
        if (features.length > 0) {
          const id = features[0].properties?.id
          geojson.features = geojson.features.filter((point) => {
            return point.properties?.id !== id
          })
        }
        else {
          const point: GeoJSON.Feature<GeoJSON.Point> = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [e.lngLat.lng, e.lngLat.lat],
            },
            properties: {
              id: String(Date.now()),
            },
          }

          geojson.features.push(point)
        }

        // Get all points to create polygon
        const pointFeatures = geojson.features.filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> =>
          feature.geometry.type === 'Point',
        )

        if (pointFeatures.length >= 3) {
          // Get coordinates from points
          const coordinates = pointFeatures.map(point => point.geometry.coordinates)

          // Close the polygon by adding the first point again
          const closedCoordinates = [...coordinates, coordinates[0]]

          // Create a new polygon feature
          const polygonFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [closedCoordinates],
            },
            properties: {},
          }

          // Calculate area in square kilometers
          const calculatedArea = turf.area(polygonFeature) / 1_000_000
          setArea(calculatedArea)

          // Add formatted area as a property to display on the map
          polygonFeature.properties = {
            area: formatArea(calculatedArea),
          }

          // Add the polygon to the features
          geojson.features.push(polygonFeature)
        }
        else {
          setArea(null)
        }
      }

      const source = map.getSource('measure-geojson')
      if (source && 'setData' in source) {
        (source as maplibregl.GeoJSONSource).setData(geojson)
      }
    }

    // Mousemove handler for cursor style
    const mousemoveHandler = (e: maplibregl.MapMouseEvent): void => {
      if (!active) return

      const features = map.queryRenderedFeatures(e.point, {
        layers: ['measure-points'],
      })
      // UI indicator for clicking/hovering a point on the map
      map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : 'crosshair'
    }

    if (active) mapClickManager.register('measure-tools', MapLayerClickPriority.ActiveTool, clickHandler)
    else mapClickManager.unregister('measure-tools')

    // Add map event listeners
    // map.on('click', clickHandler);
    // mapClickManager.register("measure-tools", MapLayerClickPriority.ActiveTool, clickHandler)
    map.on('mousemove', mousemoveHandler)

    // Clean up when the component unmounts
    return () => {
      try {
        map.off('click', clickHandler)
        mapClickManager?.unregister('measure-tools')
        map.off('mousemove', mousemoveHandler)
        map.getCanvas().style.cursor = ''

        geojson.features = []
        const source = map.getSource('measure-geojson')
        if (source && 'setData' in source) {
          (source as maplibregl.GeoJSONSource).setData(geojson)
        }
      } catch {
        // Map may have been destroyed before cleanup runs (e.g. during navigation)
      }

      setDistance(null)
      setArea(null)
    }
  }, [map, active, measureType])

  // Update layer colors when dimensionsColour changes
  React.useEffect(() => {
    if (!map) return

    const layerIds = [
      'measure-points',
      'measure-lines',
      'measure-polygons',
      'measure-polygon-outline',
      'measure-distance-labels',
      'measure-area-labels',
    ]

    // Check if layers exist before trying to update them
    const updateLayerColors = () => {
      if (map.getLayer('measure-points')) {
        map.setPaintProperty('measure-points', 'circle-color', dimensionLineColor || '#fff')
      }
      if (map.getLayer('measure-lines')) {
        map.setPaintProperty('measure-lines', 'line-color', dimensionLineColor || '#fff')
      }
      if (map.getLayer('measure-polygons')) {
        map.setPaintProperty('measure-polygons', 'fill-color', dimensionLineColor || '#fff')
        map.setPaintProperty('measure-polygons', 'fill-outline-color', dimensionLineColor || '#fff')
      }
      if (map.getLayer('measure-polygon-outline')) {
        map.setPaintProperty('measure-polygon-outline', 'line-color', dimensionLineColor || '#fff')
      }
      if (map.getLayer('measure-distance-labels')) {
        map.setPaintProperty('measure-distance-labels', 'text-color', '#000')
        map.setPaintProperty('measure-distance-labels', 'text-halo-color', '#fff')
        map.setPaintProperty('measure-distance-labels', 'text-halo-width', 3)
        map.setPaintProperty('measure-distance-labels', 'text-halo-blur', 1)
      }
      if (map.getLayer('measure-area-labels')) {
        map.setPaintProperty('measure-area-labels', 'text-color', '#000')
        map.setPaintProperty('measure-area-labels', 'text-halo-color', '#fff')
        map.setPaintProperty('measure-area-labels', 'text-halo-width', 3)
        map.setPaintProperty('measure-area-labels', 'text-halo-blur', 1)
      }
    }

    if (map.isStyleLoaded()) {
      updateLayerColors()
    }
  }, [map, dimensionLineColor])

  // Monitor active state changes
  React.useEffect(() => {
    if (active) {
      setCursor('crosshair')
    }
    else {
      setCursor('')
      setDistance(null)
      setArea(null)
    }
  }, [active])

  // When current tool changes
  React.useEffect(() => {
    setActive(currentToolId === toolId)
  }, [currentToolId])

  const handleMeasureTypeChange = (type: 'line' | 'area') => {
    // Clear current measurements
    if (map) {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }
      const source = map.getSource('measure-geojson')
      if (source && 'setData' in source) {
        (source as maplibregl.GeoJSONSource).setData(geojson)
      }
    }

    setMeasureType(type)
    setDistance(null)
    setArea(null)

    // If not active, activate the tool
    if (!active) {
      setActive(true)
      setTools(toolId)
    }
  }

  // Clear measurements function
  const clearMeasurements = () => {
    if (map) {
      // Create a completely new empty GeoJSON object
      const emptyGeojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
        type: 'FeatureCollection',
        features: [],
      }

      // Update the source data
      const source = map.getSource('measure-geojson')
      if (source && 'setData' in source) {
        (source as maplibregl.GeoJSONSource).setData(emptyGeojson)
      }

      // Reset state variables
      setDistance(null)
      setArea(null)
    }
  }

  return (
    <ToolbarSubmenu tool={tool}>
      <DropdownMenuItem onClick={() => handleMeasureTypeChange('line')}>
        <LR.Ruler />
        <span>{t('distance')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleMeasureTypeChange('area')}>
        <LR.Square />
        <span>{t('area')}</span>
      </DropdownMenuItem>
      {/* Clear measurements */}
      <DropdownMenuItem onClick={handleClearMeasurementTool}>
        <LR.X />
        <span>{t('clear')}</span>
      </DropdownMenuItem>
    </ToolbarSubmenu>
  )
}