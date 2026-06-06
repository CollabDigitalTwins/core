'use client'

import Map, { MapRef, NavigationControl } from 'react-map-gl/maplibre'
import React from 'react'

import maplibregl, { LngLatBoundsLike } from 'maplibre-gl'
import { useSearchParams } from 'next/navigation'

import { MapContext } from '../../../store'
import { resolveBounds } from './utils/validateBounds'

import { MapClickManager } from './utils/MapEventManager/MapClickManager'
import DatasetManagerMenu from './datasets/DatasetManager'
import { MapLegendHost } from './legends/MapLegendHost'
import { StatsOverlay } from '../../ui/stats'
import { MapHoverManager } from './utils/MapEventManager/MapHoverManager'
import { Organization } from '../../../types/dbTypes'
import { CurrentLocation } from '../../../types/map'
import { MapLayers } from './src/MapLayers'
import SettingsButton from '../../ui/SettingsButton'

const CANADA_DEFAULTS = {
  maxBounds: [-141.0, 41.6751050889, -52.6480987209, 83.23324] as LngLatBoundsLike,
  zoom: 3,
  lat: 56.415,
  long: -98.74,
} as const

const DEFAULT_MAP_STYLE = { name: 'Satellite', url: 'mapStyles/satellite.json' } as const

interface Props {
  width?: string
  height?: string
  organization: Organization
}

export function MapViewer({ width = '100%', height = '100%', organization  }: Props) {

  const searchParams = useSearchParams()

  // Add state to track if map is loaded
  const [isMapLoaded, setIsMapLoaded] = React.useState(false)

  const viewState = React.useMemo(() => {
    return searchParams.size === 0
      ? {
          zoom: organization.zoom ?? CANADA_DEFAULTS.zoom,
          bearing: organization.bearing ?? 0,
          pitch: organization.pitch ?? 0,
          longitude: organization.long ?? CANADA_DEFAULTS.long,
          latitude: organization.lat ?? CANADA_DEFAULTS.lat,
        }
      : {
          latitude: searchParams.has('lat') ? Number.parseFloat(searchParams.get('lat')) : organization.lat ?? CANADA_DEFAULTS.lat,
          longitude: searchParams.has('lng') ? Number.parseFloat(searchParams.get('lng')) : organization.long ?? CANADA_DEFAULTS.long,
          bearing: searchParams.has('bearing') ? Number.parseFloat(searchParams.get('bearing')) : organization.bearing ?? 0,
          pitch: searchParams.has('pitch') ? Number.parseFloat(searchParams.get('pitch')) : organization.pitch ?? 0,
          zoom: searchParams.has('zoom') ? Number.parseFloat(searchParams.get('zoom')) : organization.zoom ?? CANADA_DEFAULTS.zoom,
        }
  }, [searchParams, organization])

  // Memoize the inline style object that gets passed to <Map> for a stable prop identity.
  const mapContainerStyle = React.useMemo(
    () => ({ width, height, backgroundColor: 'black' }),
    [width, height],
  )

  // Adaptive pixel ratio. A hardcoded 2 doubled fragment-shader cost on 1× DPR
  // desktops for zero visual gain; capping at 2 keeps phones (DPR 3-4) effective.
  const pixelRatio = React.useMemo(
    () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
    [],
  )

  const mapRef = React.useRef<MapRef>(null)
  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)

  const handleMapLoad = () => {
    const map = mapRef.current.getMap()

    // Only dispatch SET_MAP after map is fully loaded
    if (mapRef.current) {
      mapDispatch({
        type: 'SET_MAP',
        payload: { map },
      })
    }
    // initilize a new click manager
    const mapClickManager = new MapClickManager(map)
    mapDispatch({
      type: 'ADD_MAP_CLICK_MANAGER',
      payload: { mapClickManager },
    })

    const mapHoverManager = new MapHoverManager(map)
    mapDispatch({
      type: 'ADD_MAP_HOVER_MANAGER',
      payload: { mapHoverManager },
    })

    // update current Location with URL params or fallback to theme location
    const updatedLocation: CurrentLocation = {
      // Then override with URL params (this ensures URL params take precedence)
      lat: searchParams.has('lat') ? Number.parseFloat(searchParams.get('lat')) : organization.lat ?? CANADA_DEFAULTS.lat,
      lng: searchParams.has('lng') ? Number.parseFloat(searchParams.get('lng')) : organization.long ?? CANADA_DEFAULTS.long,
      bearing: searchParams.has('bearing') ? Number.parseFloat(searchParams.get('bearing')) : organization.bearing ?? 0,
      pitch: searchParams.has('pitch') ? Number.parseFloat(searchParams.get('pitch')) : organization.pitch ?? 0,
      zoom: searchParams.has('zoom') ? Number.parseFloat(searchParams.get('zoom')) : organization.zoom ?? CANADA_DEFAULTS.zoom,
      // Add location details from URL params if available
      countrySubdivision: searchParams.has('countrySubdivision') ? searchParams.get('countrySubdivision') : (organization.countrySubdivision ?? ''),
      municipality: searchParams.has('municipality') ? searchParams.get('municipality') : (organization.municipality ?? ''),
      address: searchParams.has('address') ? searchParams.get('address') : '', // organization.address,
      site: searchParams.has('site') ? searchParams.get('site') : String(organization.locationSiteId ?? ''),
      id: String(organization.id),
    }

    mapDispatch({
      type: 'UPDATE_LOCATION',
      payload: { currentLocation: updatedLocation },
    })

    // Set map as loaded after all dispatches are complete
    setIsMapLoaded(true)
  }

  // Enable the perf HUD by appending ?debug=1 to the URL. Never reaches
  // production users unless they explicitly opt in.
  const isDebug = searchParams.get('debug') === '1'

  // useCallback so the onDblClick prop identity is stable across renders of
  // MapViewer; a new function each render caused react-map-gl to detach/re-attach
  // the listener. The console.log is gated behind a dev-mode check.
  const onDblClick = React.useCallback((e) => {
    if (process.env.NODE_ENV === 'production') return
    const { lng, lat } = e.lngLat
    const elevation = mapRef.current?.queryTerrainElevation([lng, lat]) || 0
    const coordinates = { lng, lat, elevation, zoom: mapRef.current?.getZoom() }
    console.log('📍 Map coordinates:', coordinates)
  }, [])

  const mapStyle = mapState?.map.mapStyle ?? DEFAULT_MAP_STYLE;

  return (
    <>
      <Map
        id="map-component"
        mapStyle={ mapStyle.url}
        mapLib={maplibregl}
        onLoad={handleMapLoad}
        ref={mapRef}
        style={mapContainerStyle}
        initialViewState={viewState}
        maxPitch={60}
        minZoom={organization?.minZoom ?? CANADA_DEFAULTS.zoom}
        maxBounds={resolveBounds(organization?.maxBounds, CANADA_DEFAULTS.maxBounds)}
        projection="globe"
        doubleClickZoom={false}
        onDblClick={onDblClick}
        pixelRatio={pixelRatio}
      >
        <NavigationControl visualizePitch />
        <SettingsButton /> 
        {isMapLoaded
          && (
            <>
              <MapLayers />
              {/* Bottom-left stack: legend above the layers/styling card, gap auto-managed by flex. */}
              <div className="absolute bottom-[10px] left-3 z-10 flex flex-col gap-2 pointer-events-none">
                {/* Portal slot for on-map WMS time controls; display:contents so an
                    empty slot adds no flex item / gap, but a mounted control stacks
                    above the legend + dataset-manager cards. */}
                <div id="wms-time-slot" style={{ display: 'contents' }} />
                <MapLegendHost />
                <DatasetManagerMenu />
              </div>
            </>
          )}
      </Map>
      <StatsOverlay mapRef={mapRef} enabled={isDebug} />
    </>

  )
}
