// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'
import useSWR, { useSWRConfig } from 'swr'

import { DatasetGroup } from '../../../../../types/dbTypes'

import { mapServiceDataset } from './mapServices'
import { arcgisUrlDataset } from './urlSources'

import type { Dataset, MapServiceDescriptor } from '../../../../../types/datasetTypes'

const FAVOURITES_ENDPOINT = '/api/datasets/favourites'

type FavouriteSnapshot = { mapService: MapServiceDescriptor } | { arcgisUrl: string }

interface SavedFavourite {
  datasetKey: string
  name: string
  snapshot: FavouriteSnapshot | null
}

interface FavouritesResponse {
  favourites: SavedFavourite[]
}

const NO_FAVOURITES: FavouritesResponse = { favourites: [] }

/** A key that survives reloads, or null for a session-only dataset that cannot be found again. */
export function favouriteKey(dataset: Dataset): string | null {
  if (dataset.id?.startsWith('local-')) return null
  if (!dataset.portal && dataset.mapService) {
    const { kind, url, layer } = dataset.mapService
    return `service:${kind}:${url}:${layer ?? ''}`
  }
  return [dataset.dataManagementSystem, dataset.portal?.id ?? 'none', dataset.id ?? dataset.name].join(':')
}

/** What a dataset with no portal needs to be rebuilt after a reload. */
export function favouriteSnapshot(dataset: Dataset): FavouriteSnapshot | undefined {
  if (dataset.portal) return undefined
  if (dataset.mapService) return { mapService: dataset.mapService }
  if (dataset.id?.startsWith('url-arcgis:') && dataset.url) return { arcgisUrl: dataset.url }
  return undefined
}

async function fromSnapshot({ name, snapshot }: SavedFavourite): Promise<Dataset | null> {
  if (!snapshot) return null
  if ('mapService' in snapshot) return mapServiceDataset(snapshot.mapService, { name, group: DatasetGroup.Organizational, publisher: 'Local / URL' })
  return arcgisUrlDataset(snapshot.arcgisUrl).catch(() => null)
}

async function readFavourites(url: string): Promise<FavouritesResponse> {
  const response = await fetch(url)
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) return NO_FAVOURITES
  return response.json() as Promise<FavouritesResponse>
}

async function writeFavourite(dataset: Dataset, key: string, add: boolean) {
  const response = add
    ? await fetch(FAVOURITES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetKey: key, name: dataset.name, snapshot: favouriteSnapshot(dataset) }),
    })
    : await fetch(`${FAVOURITES_ENDPOINT}/${encodeURIComponent(key)}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) throw new Error(`Saving the favourite failed: HTTP ${response.status}`)
}

function useSnapshotDatasets(saved: SavedFavourite[], knownKeys: Set<string>): Dataset[] {
  const [rebuilt, setRebuilt] = React.useState<Dataset[]>([])
  const missing = React.useMemo(() => saved.filter(favourite => favourite.snapshot && !knownKeys.has(favourite.datasetKey)), [saved, knownKeys])
  const missingKeys = missing.map(favourite => favourite.datasetKey).sort().join('\n')
  React.useEffect(() => {
    let cancelled = false
    void Promise.all(missing.map(fromSnapshot)).then((datasets) => {
      if (!cancelled) setRebuilt(datasets.filter((dataset): dataset is Dataset => dataset !== null))
    })
    return () => { cancelled = true }
  }, [missingKeys])
  return rebuilt
}

/** The signed-in user's saved datasets among `candidates`, plus saved services rebuilt from their snapshots. */
export function useDatasetFavourites(candidates: Dataset[]) {
  const t = useTranslations('Datasets')
  const { cache } = useSWRConfig()
  const { data = NO_FAVOURITES, mutate } = useSWR<FavouritesResponse>(FAVOURITES_ENDPOINT, readFavourites, { revalidateOnFocus: false })
  const savedKeys = React.useMemo(() => new Set(data.favourites.map(favourite => favourite.datasetKey)), [data])
  const candidateKeys = React.useMemo(() => new Set(candidates.map(favouriteKey).filter((key): key is string => key !== null)), [candidates])
  const rebuilt = useSnapshotDatasets(data.favourites, candidateKeys)

  const isFavourite = React.useCallback((dataset: Dataset) => {
    const key = favouriteKey(dataset)
    return key !== null && savedKeys.has(key)
  }, [savedKeys])

  const favourites = React.useMemo(() => [...candidates.filter(isFavourite), ...rebuilt], [candidates, isFavourite, rebuilt])

  const toggleFavourite = React.useCallback((dataset: Dataset) => {
    const key = favouriteKey(dataset)
    if (!key) return
    const current = (cache.get(FAVOURITES_ENDPOINT)?.data as FavouritesResponse | undefined) ?? NO_FAVOURITES
    const add = !current.favourites.some(favourite => favourite.datasetKey === key)
    const next: FavouritesResponse = {
      favourites: add
        ? [...current.favourites, { datasetKey: key, name: dataset.name, snapshot: favouriteSnapshot(dataset) ?? null }]
        : current.favourites.filter(favourite => favourite.datasetKey !== key),
    }
    mutate(async () => {
      await writeFavourite(dataset, key, add)
      return next
    }, { optimisticData: next, rollbackOnError: true, revalidate: false }).catch(() => toast.error(t('favouriteSaveFailed')))
  }, [cache, mutate, t])

  return { favourites, isFavourite, toggleFavourite }
}
