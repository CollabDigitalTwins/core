"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Icons
import * as LR from 'lucide-react'
// Dependencies
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Badge, Button } from '../../../../components/ui/'
// Shadcn Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/ui/DropdownMenu'
import { usePermissions } from '../../../../store'

// Custom Components
import NestedFilter from './NestedFilter'

type FiltersProps = {
  datasets: any[]
  appliedFilters: {
    countrySubdivisions: string[]
    municipalities: string[]
    types: string[]
    sources: string[]
  }
  onFiltersChange: (filters: { countrySubdivisions: string[], municipalities: string[], types: string[], sources: string[] }) => void
}

export default function Filters({ datasets, appliedFilters, onFiltersChange }: FiltersProps) {
  // Translation
  const t = useTranslations('Filters')

  // Permissions
  const { ability } = usePermissions()

  // State to control which view is displayed
  const [content, setContent] = React.useState(true)
  const [label, setLabel] = React.useState('')

  const totalAppliedFilters = Object.values(appliedFilters).reduce((total, filterArray) => {
    return total + filterArray.length
  }, 0)

  const handleContent = (e: React.MouseEvent, label?: string) => {
    // Prevent default behavior and stop propagation
    e.stopPropagation()
    e.preventDefault()
    // Update content state
    setContent(!content)

    // Update label
    if (label) {
      setLabel(label)
    }

    // TODO: Update data source to propagate nested menu items
  }

  // Get unique values for each filter type from datasets
  const getUniqueValues = (field: string) => {
    const values = new Set<string>()
    const isSource = field === t('sourceLower')
    for (const dataset of datasets) {
      const value = isSource ? (dataset.portal?.name ?? dataset.publisher) : dataset[field]
      if (value && value !== '') {
        values.add(value)
      }
    }
    return [...values].sort()
  }

  const handleFilterChange = (filterType: string, selectedValues: string[]) => {
    const newFilters = { ...appliedFilters }

    switch (filterType) {
      case 'subdivision': {
        newFilters.countrySubdivisions = selectedValues

        break
      }
      case 'municipality': {
        newFilters.municipalities = selectedValues

        break
      }
      case 'type': {
        newFilters.types = selectedValues

        break
      }
      case 'source': {
        newFilters.sources = selectedValues

        break
      }
    // No default
    }

    onFiltersChange(newFilters)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="dropdown-menu-trigger"
            onClick={e => e.stopPropagation()}
            disabled={!ability.can('read', 'File')}
          >
            {totalAppliedFilters > 0
              ? <Badge variant="default" className="">{totalAppliedFilters}</Badge>
              : <LR.ListFilter />}

            <span>{t('filters')}</span>
          </Button>
        </DropdownMenuTrigger>

        {content

          ? (
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('filters')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { handleContent(e, t('countrySubdivisionLower')) }}
                >
                  {t('countrySubdivision')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { handleContent(e, t('municipalityLower')) }}
                >
                  {t('municipality')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { handleContent(e, t('typeLower')) }}
                >
                  {t('type')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { handleContent(e, t('sourceLower')) }}
                >
                  {t('source')}
                </DropdownMenuItem>

              </DropdownMenuContent>
            )

          : (
              <NestedFilter
                label={label}
                handleContent={handleContent}
                setContent={setContent}
                availableValues={getUniqueValues(label)}
                selectedValues={
                  label === t('countrySubdivisionLower')
                    ? appliedFilters.countrySubdivisions
                    : label === t('municipalityLower')
                      ? appliedFilters.municipalities
                      : label === t('typeLower')
                          ? appliedFilters.types
                          : label === t('sourceLower') ? appliedFilters.sources : []
                }
                onSelectionChange={selectedValues => handleFilterChange(label, selectedValues)}
              />
            )}
      </DropdownMenu>
    </>
  )
}
