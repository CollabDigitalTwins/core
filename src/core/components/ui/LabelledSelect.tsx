"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { cn } from '../../utils/utils'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select'

export interface LabelledSelectProps {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  className?: string
}

/** A compact Select with a muted caption above it; the caption is also the trigger's accessible name. */
export function LabelledSelect({ label, value, options, onChange, className }: LabelledSelectProps) {
  return (
    <label className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  )
}
