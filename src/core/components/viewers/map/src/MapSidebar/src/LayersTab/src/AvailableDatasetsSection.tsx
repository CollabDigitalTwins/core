'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { DatasetsContext } from '../../../../../../../../store'
import { Button } from '../../../../../../../ui/Button'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'

import type { Dataset } from '../../../../../../../../types/datasetTypes'

interface DatasetRowProps {
  dataset: Dataset
  isFavourite: boolean
  onFavourite: (dataset: Dataset) => void
  onApply: (dataset: Dataset) => void
}

function DatasetRow({ dataset, isFavourite, onFavourite, onApply }: DatasetRowProps) {
  return (
    <div className="flex items-center gap-1 py-1 hover:bg-accent/30 rounded-md px-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => onFavourite(dataset)}
        title={isFavourite ? 'Unfavourite' : 'Favourite'}
      >
        <LR.Star
          className="h-3.5 w-3.5"
          color={isFavourite ? 'hsl(var(--chart-5))' : 'currentColor'}
          fill={isFavourite ? 'hsl(var(--chart-5))' : 'none'}
        />
      </Button>
      <span className="flex-1 min-w-0 text-sm truncate" title={dataset.name}>
        {dataset.name.replaceAll('_', ' ')}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => onApply(dataset)}
        title="Add to map"
      >
        <LR.Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

interface DatasetListProps {
  datasets: Dataset[]
  query: string
  favourites: Dataset[]
  onFavourite: (dataset: Dataset) => void
  onApply: (dataset: Dataset) => void
  emptyLabel: string
}

function DatasetList({ datasets, query, favourites, onFavourite, onApply, emptyLabel }: DatasetListProps) {
  const filtered = React.useMemo(() => {
    if (!query.trim()) return datasets
    const q = query.toLowerCase()
    return datasets.filter(d => d.name?.toLowerCase().includes(q))
  }, [datasets, query])

  if (filtered.length === 0) {
    return <div className="text-xs text-muted-foreground px-1 py-2">{emptyLabel}</div>
  }

  return (
    <div className="space-y-0.5">
      {filtered.map(dataset => (
        <DatasetRow
          key={dataset.id ?? dataset.name}
          dataset={dataset}
          isFavourite={favourites.some(f => f.name === dataset.name)}
          onFavourite={onFavourite}
          onApply={onApply}
        />
      ))}
    </div>
  )
}

interface AvailableDatasetsSectionProps {
  query: string
  allDatasets: Dataset[]
  nationalDatasets: Dataset[]
  subdivisionDatasets: Dataset[]
  municipalDatasets: Dataset[]
  organizationalDatasets: Dataset[]
  liveDatasets: Dataset[]
  showMunicipal: boolean
  favourites: Dataset[]
  onFavouriteToggle: (dataset: Dataset) => void
}

export function AvailableDatasetsSection({
  query,
  allDatasets,
  nationalDatasets,
  subdivisionDatasets,
  municipalDatasets,
  organizationalDatasets,
  liveDatasets,
  showMunicipal,
  favourites,
  onFavouriteToggle,
}: AvailableDatasetsSectionProps) {
  const t = useTranslations('LayersTab')
  const { state: datasetState, dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { addedDatasets } = datasetState.datasets

  const isApplied = React.useCallback(
    (dataset: Dataset) => addedDatasets.some(d => d.name === dataset.name),
    [addedDatasets],
  )

  const onApply = React.useCallback((dataset: Dataset) => {
    datasetDispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset } })
  }, [datasetDispatch])

  const notApplied = React.useCallback(
    (list: Dataset[]) => list.filter(d => !isApplied(d)),
    [isApplied],
  )

  const favouriteList = React.useMemo(() => notApplied(favourites), [favourites, notApplied])
  const organizationalList = React.useMemo(() => notApplied(organizationalDatasets), [organizationalDatasets, notApplied])
  const allList = React.useMemo(() => notApplied(allDatasets), [allDatasets, notApplied])
  const nationalList = React.useMemo(() => notApplied(nationalDatasets), [nationalDatasets, notApplied])
  const subdivisionList = React.useMemo(() => notApplied(subdivisionDatasets), [subdivisionDatasets, notApplied])
  const municipalList = React.useMemo(() => notApplied(municipalDatasets), [municipalDatasets, notApplied])
  const liveList = React.useMemo(() => notApplied(liveDatasets), [liveDatasets, notApplied])

  const emptyLabel = t('noDatasets')

  return (
    <div className="space-y-2">
      <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('availableDatasetsTitle')}
      </div>

      <CollapsibleSection
        title={t('favouritesTitle')}
        icon={LR.Star}
        itemCount={favouriteList.length}
        defaultOpen={false}
      >
        <DatasetList
          datasets={favouriteList}
          query={query}
          favourites={favourites}
          onFavourite={onFavouriteToggle}
          onApply={onApply}
          emptyLabel={emptyLabel}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={t('organizationalTitle')}
        icon={LR.Building}
        itemCount={organizationalList.length}
        defaultOpen={false}
      >
        <DatasetList
          datasets={organizationalList}
          query={query}
          favourites={favourites}
          onFavourite={onFavouriteToggle}
          onApply={onApply}
          emptyLabel={emptyLabel}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={t('allTitle')}
        icon={LR.Database}
        itemCount={allList.length}
        defaultOpen={false}
      >
        <DatasetList
          datasets={allList}
          query={query}
          favourites={favourites}
          onFavourite={onFavouriteToggle}
          onApply={onApply}
          emptyLabel={emptyLabel}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={t('nationalTitle')}
        icon={LR.Flag}
        itemCount={nationalList.length}
        defaultOpen={false}
      >
        <DatasetList
          datasets={nationalList}
          query={query}
          favourites={favourites}
          onFavourite={onFavouriteToggle}
          onApply={onApply}
          emptyLabel={emptyLabel}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={t('subdivisionTitle')}
        icon={LR.Map}
        itemCount={subdivisionList.length}
        defaultOpen={false}
      >
        <DatasetList
          datasets={subdivisionList}
          query={query}
          favourites={favourites}
          onFavourite={onFavouriteToggle}
          onApply={onApply}
          emptyLabel={emptyLabel}
        />
      </CollapsibleSection>

      {showMunicipal && (
        <CollapsibleSection
          title={t('municipalTitle')}
          icon={LR.Building2}
          itemCount={municipalList.length}
          defaultOpen={false}
        >
          <DatasetList
            datasets={municipalList}
            query={query}
            favourites={favourites}
            onFavourite={onFavouriteToggle}
            onApply={onApply}
            emptyLabel={emptyLabel}
          />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title={t('liveDataTitle')}
        icon={LR.Radio}
        itemCount={liveList.length}
        defaultOpen={false}
      >
        <DatasetList
          datasets={liveList}
          query={query}
          favourites={favourites}
          onFavourite={onFavouriteToggle}
          onApply={onApply}
          emptyLabel={emptyLabel}
        />
      </CollapsibleSection>
    </div>
  )
}
