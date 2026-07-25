'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../utils/utils'
import { Button } from '../Button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../Command'
import { Popover, PopoverContent, PopoverTrigger } from '../Popover'

function supportedZones(): string[] {
  // Intl.supportedValuesOf is a runtime API not yet in this TS lib target; guard + narrow.
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  try {
    if (typeof intl.supportedValuesOf === 'function') return intl.supportedValuesOf('timeZone')
  } catch {
    // fall through
  }
  return ['UTC']
}

export function TimeZoneSelect({
  value,
  onChange,
  placeholder = 'Select timezone',
}: {
  value: string
  onChange: (zone: string) => void
  placeholder?: string
}): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const zones = React.useMemo(supportedZones, [])
  const options = React.useMemo(() => (zones.includes(value) ? zones : [value, ...zones]), [zones, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[240px] justify-between">
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {options.map(zone => (
                <CommandItem
                  key={zone}
                  value={zone}
                  onSelect={() => { onChange(zone); setOpen(false) }}
                >
                  <Check className={cn('mr-2 h-4 w-4', zone === value ? 'opacity-100' : 'opacity-0')} />
                  {zone}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
