'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { useAppConfigContext } from '../store'
import { setGeocodingConfig } from '../components/viewers/map/utils/geocoding/config'

// Syncs geocoding runtime values from AppConfigContext into the geocoding
// module's mutable state. Must be called once in a client component that
// mounts before any geocoding request fires (e.g. Geocoder.tsx).
export function useGeocodingRuntimeConfig(): void {
  const { state: { runtimeConfig } } = useAppConfigContext()

  React.useEffect(() => {
    setGeocodingConfig({
      geocodeEarthApiKey: runtimeConfig.geocodeEarthApiKey,
      geocoderUrl: runtimeConfig.geocoderUrl,
      photonUrl: runtimeConfig.photonUrl,
      nominatimUrl: runtimeConfig.nominatimUrl,
    })
  }, [
    runtimeConfig.geocodeEarthApiKey,
    runtimeConfig.geocoderUrl,
    runtimeConfig.photonUrl,
    runtimeConfig.nominatimUrl,
  ])
}
