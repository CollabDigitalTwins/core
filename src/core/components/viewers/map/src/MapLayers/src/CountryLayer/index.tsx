"use client"

import * as React from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import type { MapMouseEvent } from 'maplibre-gl'
import { MapContext } from '../../../../../../../store/Map/context'
import { useAppConfigContext } from '../../../../../../../store/AppConfig/context'
import { useSearchParams, useRouter } from 'next/navigation'

const ARCGIS_BASE = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Administrative_Divisions/FeatureServer/0/query'
const DEFAULT_BORDER_COLOR = '#73cee2'

function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

const buildSubdivisionUrl = (countryCode: string) => {
  const params = new URLSearchParams({
    outFields: 'NAME,ISO_CC,ISO_CODE,ADMINTYPE',
    where: `ISO_CC='${countryCode}'`,
    f: 'geojson',
  })
  return `${ARCGIS_BASE}?${params.toString()}`
}

export const CountryLayer = () => {
  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)
  const { map, currentLocation } = mapState.map
  const { state: appConfigState } = useAppConfigContext()
  const organization = appConfigState.appConfig.organization
  const searchParams = useSearchParams()
  const router = useRouter()
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  const countryCode = (organization?.country || 'CA').toUpperCase()
  const borderColor = hexToRgba((organization?.mainColor as string) || DEFAULT_BORDER_COLOR, 0.3)
  const subdivisionUrl = buildSubdivisionUrl(countryCode)

  // If the org already has a fixed subdivision or municipality, lock them in and skip hover
  const orgHasLocation = !!(organization?.countrySubdivision || organization?.municipality)

  // When org has fixed location values, push them into currentLocation once
  React.useEffect(() => {
    if (!orgHasLocation) return
    mapDispatch({
      type: 'UPDATE_LOCATION',
      payload: {
        currentLocation: {
          ...(currentLocation ?? {}),
          countrySubdivision: organization?.countrySubdivision ?? currentLocation?.countrySubdivision,
          municipality: organization?.municipality ?? currentLocation?.municipality,
        } as any,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgHasLocation])

  React.useEffect(() => {
    if (orgHasLocation) return
    if (!(map && currentLocation)) return

    const currentCountrySubdivision = currentLocation.countrySubdivision || null
    const currentMunicipality = currentLocation.municipality || null

    function onMouseMove(e: MapMouseEvent) {
      if (!map.isStyleLoaded()) return

      if (debounceRef.current) clearTimeout(debounceRef.current)

      const eventPoint = e.point

      debounceRef.current = setTimeout(() => {
        const features = map.queryRenderedFeatures(eventPoint, {
          layers: ['admin-subdivisions-fill'],
        })

        // if (features.length > 0) {
        //   console.group('[CountryLayer] hover')
        //   features.forEach(f => console.log(f.properties))
        //   console.groupEnd()
        // }

        let newCountrySubdivision = null

        if (features.length > 0) {
          const f = features[0]
          const isoCC = f.properties?.ISO_CC
          const isoCode = f.properties?.ISO_CODE
          // Build "CA-ON" from ISO_CC "CA" + ISO_CODE "CAON" → strip prefix to get "ON"
          if (isoCC && isoCode && isoCode.startsWith(isoCC)) {
            newCountrySubdivision = `${isoCC}-${isoCode.slice(isoCC.length)}`
          } else {
            newCountrySubdivision = (isoCode || f.properties?.NAME || null) as string | null
          }
        }

        const finalCountrySubdivision = newCountrySubdivision || currentCountrySubdivision

        if (finalCountrySubdivision !== currentCountrySubdivision) {
          mapDispatch({
            type: 'UPDATE_LOCATION',
            payload: {
              currentLocation: {
                ...currentLocation,
                countrySubdivision: finalCountrySubdivision,
                municipality: currentMunicipality,
              },
            },
          })

          const params = new URLSearchParams(searchParams.toString())
          params.set('countrySubdivision', finalCountrySubdivision || '')
          router.replace(`?${params.toString()}`, { scroll: false })
        }
      }, 300)
    }

    if (map.isStyleLoaded()) {
      map.on('mousemove', onMouseMove)
    } else {
      map.once('styledata', () => {
        map.on('mousemove', onMouseMove)
      })
    }

    return () => {
      map.off('mousemove', onMouseMove)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [map, mapDispatch, currentLocation, searchParams, router])

  if (orgHasLocation) return null

  return (
    <Source
      id="admin-subdivisions-source"
      type="geojson"
      data={subdivisionUrl}
    >
      {/* Visible subdivision boundaries */}
      <Layer
        id="admin-subdivisions-line"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': borderColor,
          // 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 6, 3, 12, 4],
          'line-width': 2,
        }}
      />

      {/* Invisible fill for hit detection */}
      <Layer
        id="admin-subdivisions-fill"
        type="fill"
        paint={{ 'fill-color': 'transparent', 'fill-opacity': 0 }}
      />
    </Source>
  )
}
