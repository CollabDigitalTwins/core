'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";


// Utilities
import { MapContext } from '../../../../../store'


// Custom components
import { ShareToolSubmenu } from '../../../../ui/ShareFeature'
import { getMunicipalityAndProvince } from '../../utils/geocoder'
import { cameraSnapshot, labelsFromParams, toQueryString, withLocationParams } from '../../utils/urlLocation/locationParams'

import type { Tool } from '../../../../../types/tools'
import type { Map } from 'maplibre-gl'

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
      const camera = cameraSnapshot(map)
      const shareLocation = await getMunicipalityAndProvince(camera.lat.toFixed(7), camera.lng.toFixed(7), organizationCountry)

      const current = new URLSearchParams(window.location.search)
      const { country } = labelsFromParams(current)
      const params = withLocationParams(current, camera, { country, ...shareLocation })
      params.set('viewer', 'map')

      const shareUrl = `${origin}${pathname}?${toQueryString(params)}`
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