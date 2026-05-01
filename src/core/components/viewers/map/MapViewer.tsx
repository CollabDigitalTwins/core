'use client'

import Map, { MapRef, NavigationControl } from 'react-map-gl/maplibre'
import React from 'react'

import maplibregl, { LngLatBoundsLike } from 'maplibre-gl'
import { useSearchParams } from 'next/navigation'

import { MapContext } from '../../../store'
import { resolveBounds } from './utils/validateBounds'

import { MapClickManager } from './utils/MapEventManager/MapClickManager'
import DatasetManagerMenu from './datasets/DatasetManager'
import { StatsOverlay } from '../../ui/stats'
import { MapHoverManager } from './utils/MapEventManager/MapHoverManager'
import { Organization } from '../../../types/dbTypes'
import { CurrentLocation } from '../../../types/map'
import { MapLayers } from './src/MapLayers'
import SettingsButton from '../../ui/SettingsButton'

interface Props {
  width?: string
  height?: string
  organization: Organization
}

export function MapViewer({ width = '100%', height = '100%', organization  }: Props) {

  const searchParams = useSearchParams()

  // Add state to track if map is loaded
  const [isMapLoaded, setIsMapLoaded] = React.useState(false)

    const canada = {
    maxBounds: [-141.0, 41.6751050889, -52.6480987209, 83.23324],
    zoom: 3,
    lat: 56.415,
    long: -98.74,
  }

  const viewState = searchParams.size === 0
    ? {
        zoom: organization.zoom ?? canada.zoom,
        bearing: organization.bearing ?? 0,
        pitch: organization.pitch ?? 0,
        longitude: organization.long ?? canada.long,
        latitude: organization.lat ?? canada.lat,
      }
    : {
        latitude: searchParams.has('lat') ? Number.parseFloat(searchParams.get('lat')) : organization.lat ?? canada.lat,
        longitude: searchParams.has('lng') ? Number.parseFloat(searchParams.get('lng')) : organization.long ?? canada.long,
        bearing: searchParams.has('bearing') ? Number.parseFloat(searchParams.get('bearing')) : organization.bearing ?? 0,
        pitch: searchParams.has('pitch') ? Number.parseFloat(searchParams.get('pitch')) : organization.pitch ?? 0,
        zoom: searchParams.has('zoom') ? Number.parseFloat(searchParams.get('zoom')) : organization.zoom ?? canada.zoom,
      }

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
      lat: searchParams.has('lat') ? Number.parseFloat(searchParams.get('lat')) : organization.lat ?? canada.lat,
      lng: searchParams.has('lng') ? Number.parseFloat(searchParams.get('lng')) : organization.long ?? canada.long,
      bearing: searchParams.has('bearing') ? Number.parseFloat(searchParams.get('bearing')) : organization.bearing ?? 0,
      pitch: searchParams.has('pitch') ? Number.parseFloat(searchParams.get('pitch')) : organization.pitch ?? 0,
      zoom: searchParams.has('zoom') ? Number.parseFloat(searchParams.get('zoom')) : organization.zoom ?? canada.zoom,
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

  // enable to this show stat
  const DEBUG = false

  const onDblClick = (e) => {
    const { lng, lat } = e.lngLat
    const elevation = mapRef.current?.queryTerrainElevation([lng, lat]) || 0
    const coordinates = { lng, lat, elevation, zoom: mapRef.current?.getZoom() }
    console.log('📍 Map coordinates:', coordinates)
  }

  const mapStyle = mapState?.map.mapStyle ?? { name: 'Satellite', url: 'mapStyles/satellite.json' };

  return (
    <>
      <Map
        id="map-component"
        mapStyle={ mapStyle.url}
        mapLib={maplibregl}
        onLoad={handleMapLoad}
        ref={mapRef}
        style={{
          width,
          height,
          backgroundColor: 'black',
        }}
        initialViewState={viewState}
        maxPitch={60}
        minZoom={organization?.minZoom ?? canada.zoom}
        maxBounds={resolveBounds(organization?.maxBounds, canada.maxBounds as LngLatBoundsLike)}
        projection="globe"
        doubleClickZoom={false}
        onDblClick={onDblClick}
        pixelRatio={2} 
      >
        <NavigationControl visualizePitch />
        <SettingsButton /> 
        {isMapLoaded
          && (
            <>
              <MapLayers />
              <DatasetManagerMenu />
            </>
          )}
      </Map>
      {/* <StatsOverlay mapRef={mapRef} enabled={DEBUG} /> */}
    </>

  )
}
