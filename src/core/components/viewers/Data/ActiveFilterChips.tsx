"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'

import type { FilterState } from '../../../types/global'

type ActiveFilterChipsProps = {
  activeFilters: FilterState[]
  onRemove: (id: number, value?: string) => void
  onClearAll: () => void
  fieldLabel?: (field: string) => string
  valueLabel?: (field: string, value: string) => string
}

type Chip = { id: number; value?: string; text: string }

const formatValue = (value: FilterState['value'] | FilterState['secondValue']) =>
  value instanceof Date ? value.toLocaleDateString() : String(value)

const identity = (_field: string, value: string) => value

function toChips(
  activeFilters: FilterState[],
  fieldLabel: (field: string) => string,
  valueLabel: (field: string, value: string) => string,
): Chip[] {
  return activeFilters.flatMap(({ id, field, value, secondValue }) => {
    const label = fieldLabel(field)
    if (Array.isArray(value)) {
      return value.map(item => ({ id, value: item, text: `${label}: ${valueLabel(field, item)}` }))
    }
    const range = secondValue == null ? formatValue(value) : `${formatValue(value)} – ${formatValue(secondValue)}`
    return [{ id, text: `${label}: ${valueLabel(field, range)}` }]
  })
}

/** Removable chips for the filters applied to a data table, with a Clear all action. */
export default function ActiveFilterChips({
  activeFilters,
  onRemove,
  onClearAll,
  fieldLabel = field => field,
  valueLabel = identity,
}: ActiveFilterChipsProps) {
  const t = useTranslations('HeaderButtons')
  const chips = toChips(activeFilters, fieldLabel, valueLabel)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(chip => (
        <Badge key={`${chip.id}:${chip.value ?? ''}`} variant="secondary" className="gap-1 pr-1 font-normal">
          <span>{chip.text}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 rounded-full hover:bg-transparent"
            aria-label={t('removeFilter', { label: chip.text })}
            onClick={() => onRemove(chip.id, chip.value)}
          >
            <LR.X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <Button variant="link" size="sm" className="h-auto px-1 text-muted-foreground" onClick={onClearAll}>
        {t('clearAll')}
      </Button>
    </div>
  )
}
