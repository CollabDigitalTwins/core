'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { Map } from 'maplibre-gl'

// Utilities
import { MapContext } from '../../../../../store'
import { Tool } from '../../../../../types/tools'

// Custom components
import { ShareToolSubmenu } from '../../../../ui/ShareFeature'
import { getMunicipalityAndProvince } from '../../utils/geocoder'

interface ShareToolProps {
  tool: Tool
}

export const ShareMapTool: React.FC<ShareToolProps> = ({ tool }) => {
  const { state: mapState } = React.useContext(MapContext)
  const { map, organizationCountry } = mapState.map as { map: Map | null, organizationCountry?: string }

  const constructShareUrl = async (): Promise<string> => {
    const origin = window.location.origin
    const pathname = window.location.pathname

    if (map == null) {
      return origin + pathname
    }
    else {
      // get map info
      const latitude = map.getCenter().lat.toFixed(7)
      const longitude = map.getCenter().lng.toFixed(7)

      const shareLocation = await getMunicipalityAndProvince(latitude, longitude, organizationCountry)

      const params = new URLSearchParams({
        viewer: 'map',
        lat: latitude,
        lng: longitude,
        zoom: map.getZoom().toFixed(3),
        bearing: map.getBearing().toFixed(1),
        pitch: map.getPitch().toFixed(1),
        municipality: shareLocation.municipality,
        countrySubdivision: shareLocation.countrySubdivision,
      })

      const shareUrl = `${origin}${pathname}?${params.toString()}`
      return shareUrl
    }
  }

  return (
    <ShareToolSubmenu
      tool={tool}
      constructShareUrl={constructShareUrl}
      translationKey="ShareTool"
      dialogTitleKey="map"
    />
  )
}