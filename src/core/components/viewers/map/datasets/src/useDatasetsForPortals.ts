// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { fetchArcGISDatasets } from './arcGISDatasets'
import { fetchCkanDatasets } from './ckanDatasets'
import { fetchLocalDatasets } from './localDatasets'
import { fetchOpenDataSoftDatasets } from './opendatasoftDatasets'
import { fetchSocrataDatasets } from './socrataDatasets'
import { useUnavailableDatasetFilter } from './unavailableDatasets'

import type { Dataset, DatasetListener } from '../../../../../types/datasetTypes'
import type { OpenDataPortal } from '../../../../../types/dbTypes'

const FLUSH_INTERVAL_MS = 200

function fetchPortalDatasets(portal: OpenDataPortal, onDatasets: DatasetListener): Promise<Dataset[]> {
  switch (portal.dataManagementSystem) {
    case 'Arcgis':
      return fetchArcGISDatasets(portal, onDatasets)
    case 'Ckan':
      return fetchCkanDatasets(portal, onDatasets)
    case 'Opendatasoft':
      return fetchOpenDataSoftDatasets(portal, onDatasets)
    case 'Socrata':
      return fetchSocrataDatasets(portal, onDatasets)
    case 'Other':
      return fetchLocalDatasets(portal)
    default:
      return Promise.resolve([])
  }
}

/** Datasets for a list of portals, fetched in parallel and shown in batches as each portal discovers them. */
export function useDatasetsForPortals(portals?: OpenDataPortal[]) {
  const [datasets, setDatasets] = React.useState<Dataset[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const isUnavailable = useUnavailableDatasetFilter()

  // Stable key — only re-fetch when the portal list actually changes
  const key = React.useMemo(
    () => portals?.map(p => p.id ?? `${p.name}:${p.apiUrl}`).sort().join(',') ?? '',
    [portals],
  )

  React.useEffect(() => {
    if (!portals || portals.length === 0) {
      setDatasets([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    let flushTimer: ReturnType<typeof setTimeout> | undefined
    let pending: Dataset[] = []
    const seen = new Set<Dataset>()
    setIsLoading(true)
    setDatasets([])

    const flush = () => {
      clearTimeout(flushTimer)
      flushTimer = undefined
      if (cancelled || pending.length === 0) return
      const batch = pending
      pending = []
      setDatasets(prev => [...prev, ...batch])
    }

    const receive: DatasetListener = (batch) => {
      const fresh = batch.filter(dataset => !seen.has(dataset))
      if (fresh.length === 0) return
      fresh.forEach(dataset => seen.add(dataset))
      pending.push(...fresh)
      flushTimer ??= setTimeout(flush, FLUSH_INTERVAL_MS)
    }

    // Fetched in the browser: JSON from an API route would strip the getFeatures/getFields closures.
    const promises = portals.map(async (portal) => {
      try {
        receive(await fetchPortalDatasets(portal, receive))
      }
      catch (err) {
        console.error(`[useDatasetsForPortals] Failed to fetch portal "${portal.name}":`, err)
      }
    })

    void Promise.allSettled(promises).finally(() => {
      flush()
      if (!cancelled) setIsLoading(false)
    })

    return () => {
      cancelled = true
      clearTimeout(flushTimer)
    }

  }, [key])

  const available = React.useMemo(() => datasets.filter(dataset => !isUnavailable(dataset)), [datasets, isUnavailable])
  return { datasets: available, isLoading }
}
