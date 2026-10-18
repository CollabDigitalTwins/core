"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Badge, Button } from '../../../../components/ui/'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/ui/DropdownMenu'
import { usePermissions } from '../../../../store'

import NestedFilter from './NestedFilter'
import {
  activeFilterCount,
  DATASET_FILTER_KEYS,
  EMPTY_FILTERS,
  filterOptions,
  withoutFilterValue,
  type DatasetFilterKey,
  type DatasetFilters,
} from './src/datasetFilters'

import type { Dataset } from '../../../../types/datasetTypes'

type FiltersProps = {
  datasets: Dataset[]
  appliedFilters: DatasetFilters
  onFiltersChange: (filters: DatasetFilters) => void
}

const TITLE_KEY: Record<DatasetFilterKey, 'countrySubdivision' | 'municipality' | 'type' | 'source'> = {
  countrySubdivisions: 'countrySubdivision',
  municipalities: 'municipality',
  types: 'type',
  sources: 'source',
}

export default function Filters({ datasets, appliedFilters, onFiltersChange }: FiltersProps) {
  const t = useTranslations('Filters')
  const { ability } = usePermissions()
  const [openKey, setOpenKey] = React.useState<DatasetFilterKey | null>(null)
  const totalApplied = activeFilterCount(appliedFilters)
  const canRead = ability.can('read', 'File')

  const openNested = (event: React.MouseEvent, key: DatasetFilterKey) => {
    event.stopPropagation()
    event.preventDefault()
    setOpenKey(key)
  }

  const backToCategories = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    setOpenKey(null)
  }

  const activeValues = DATASET_FILTER_KEYS.flatMap(key => appliedFilters[key].map(value => ({ key, value })))

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="dropdown-menu-trigger" onClick={event => event.stopPropagation()} disabled={!canRead}>
            {totalApplied > 0 ? <Badge variant="default">{totalApplied}</Badge> : <LR.ListFilter />}
            <span>{t('filters')}</span>
          </Button>
        </DropdownMenuTrigger>

        {openKey === null
          ? (
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>{t('filters')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DATASET_FILTER_KEYS.map(key => (
                  <DropdownMenuItem key={key} onClick={event => openNested(event, key)} className="justify-between gap-4">
                    {t(TITLE_KEY[key])}
                    {appliedFilters[key].length > 0 && <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-xs">{appliedFilters[key].length}</Badge>}
                  </DropdownMenuItem>
                ))}
                {activeValues.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t('active')}</DropdownMenuLabel>
                    {activeValues.map(({ key, value }) => (
                      <DropdownMenuItem
                        key={`${key}:${value}`}
                        aria-label={t('removeFilter', { value })}
                        onSelect={event => event.preventDefault()}
                        onClick={() => onFiltersChange(withoutFilterValue(appliedFilters, key, value))}
                        className="justify-between gap-4"
                      >
                        <span className="truncate">{value}</span>
                        <LR.X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onFiltersChange(EMPTY_FILTERS)} className="gap-2 text-destructive">
                      <LR.X className="h-4 w-4" aria-hidden />
                      {t('clearAll')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            )
          : (
              <NestedFilter
                label={t(TITLE_KEY[openKey])}
                handleContent={backToCategories}
                setContent={() => setOpenKey(null)}
                availableValues={filterOptions(datasets, openKey, appliedFilters[openKey])}
                selectedValues={appliedFilters[openKey]}
                onSelectionChange={selected => onFiltersChange({ ...appliedFilters, [openKey]: selected })}
              />
            )}
      </DropdownMenu>
      {totalApplied > 0 && (
        <Button variant="ghost" size="icon" aria-label={t('clearAll')} title={t('clearAll')} onClick={() => onFiltersChange(EMPTY_FILTERS)} className="h-9 w-9">
          <LR.X className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  )
}
