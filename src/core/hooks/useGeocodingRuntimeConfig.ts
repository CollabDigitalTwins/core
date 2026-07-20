'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
// import { useAppConfigContext } from '../store'
import type { GeocodingRuntimeConfig } from '../components/viewers/map/utils/geocoding/config';
import { setGeocodingConfig } from '../components/viewers/map/utils/geocoding/config'

// Syncs geocoding runtime values into the geocoding module's mutable state.
// Must be called once in a client component before any geocoding request fires.
// When called without args, falls back to free public services (Photon + Nominatim).
export function useGeocodingRuntimeConfig(config?: GeocodingRuntimeConfig): void {
  React.useEffect(() => {
    setGeocodingConfig(config ?? {})
  }, [
    config?.geocodeEarthApiKey,
    config?.geocoderUrl,
    config?.photonUrl,
    config?.nominatimUrl,
  ])
}
