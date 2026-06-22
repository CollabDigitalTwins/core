// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import type { Dataset } from '../../../../../types/datasetTypes'
import type { OpenDataPortal } from '../../../../../types/dbTypes'
import { fetchArcGISDatasets } from './arcGISDatasets'
import { fetchCkanDatasets } from './ckanDatasets'
import { fetchOpenDataSoftDatasets } from './opendatasoftDatasets'
import { fetchSocrataDatasets } from './socrataDatasets'
import { fetchLocalDatasets } from './localDatasets'

type Options = {
  rowsPerPage?: number
}

// Client-side fallback when the API route is unavailable
async function fetchDatasetsDirectly(portal: OpenDataPortal, rowsPerPage = 25): Promise<Dataset[]> {
  switch (portal.dataManagementSystem) {
    case 'Arcgis':
      return fetchArcGISDatasets(portal, rowsPerPage)
    case 'Ckan':
      return fetchCkanDatasets(portal)
    case 'Opendatasoft':
      return fetchOpenDataSoftDatasets(portal)
    case 'Socrata':
      return fetchSocrataDatasets(portal)
    case 'Other':
      return fetchLocalDatasets(portal)
    default:
      return []
  }
}

// Fetch a single portal via the server-side API (which has memcache)
async function fetchPortalViaAPI(portal: OpenDataPortal, rowsPerPage: number): Promise<Dataset[]> {
  try {
    const response = await fetch('/api/datasets/portals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portals: [portal], rowsPerPage }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.datasets ?? []
  }
  catch (error) {
    console.warn(`[useDatasetsForPortals] API failed for "${portal.name}", falling back to direct fetch:`, error)
    return fetchDatasetsDirectly(portal, rowsPerPage)
  }
}

/**
 * Fetches datasets for a list of portals, streaming results to the UI as each
 * portal completes. Each portal is fetched in parallel — no waiting for the
 * slowest one before anything appears.
 */
export function useDatasetsForPortals(portals?: OpenDataPortal[], options?: Options) {
  const rowsPerPage = options?.rowsPerPage ?? 25

  const [datasets, setDatasets] = React.useState<Dataset[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isError, setIsError] = React.useState<any>(null)

  // Stable key — only re-fetch when the portal list or page size actually changes
  const key = React.useMemo(
    () => portals?.map(p => p.id ?? `${p.name}:${p.apiUrl}`).sort().join(',') ?? '',
    [portals],
  )

  React.useEffect(() => {
    if (!portals || portals.length === 0) {
      setDatasets([])
      setIsLoading(false)
      setIsError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setDatasets([])
    setIsError(null)

    // One async fetch per portal, all running in parallel.
    // Each one updates the shared state as soon as it resolves.
    // IMPORTANT: We fetch directly client-side (not via the API route) because
    // NextResponse.json() serialises with JSON.stringify which silently strips
    // the getFeatures / getFields / getFeaturesData closures from dataset objects.
    const promises = portals.map(async (portal) => {
      try {
        const portalDatasets = await fetchDatasetsDirectly(portal, rowsPerPage)
        if (!cancelled && portalDatasets.length > 0) {
          setDatasets(prev => [...prev, ...portalDatasets])
        }
      }
      catch (err) {
        console.error(`[useDatasetsForPortals] Failed to fetch portal "${portal.name}":`, err)
      }
    })

    Promise.allSettled(promises).finally(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, rowsPerPage])

  return {
    datasets,
    isLoading,
    isValidating: isLoading,
    isError,
    mutate: () => {},
  }
}
