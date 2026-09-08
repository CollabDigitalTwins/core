'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../ui/Select'

export const ALL_MODELS = '__all__'

interface Props {
  models: { id: string; label: string }[]
  value: string
  onChange: (value: string) => void
  allLabel: string
}

/** Narrows a drawing list to one model, so several buildings do not read as one set of levels. */
export function DrawingModelFilter({ models, value, onChange, allLabel }: Props) {
  if (models.length < 2) return null

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-6 w-auto max-w-[11rem] gap-1 border-none px-1 text-xs shadow-none focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_MODELS} className="text-xs">{allLabel}</SelectItem>
        {models.map(model => (
          <SelectItem key={model.id} value={model.id} className="text-xs">{model.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
