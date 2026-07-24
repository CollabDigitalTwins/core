'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '../../ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../ui/Command'
import { cn } from '../../../utils/utils'

interface Country {
  name: string
  alpha2Code: string
}

interface Subdivision {
  code: string
  name: string
}

const COUNTRIES_API = 'https://www.apicountries.com/countries'

export default function CountrySubdivisionFields() {
  const [countries, setCountries] = useState<Country[]>([])
  const [countriesError, setCountriesError] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [country, setCountry] = useState<Country | null>(null)

  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([])
  const [subdivisionsLoading, setSubdivisionsLoading] = useState(false)
  const [subdivisionsError, setSubdivisionsError] = useState(false)
  const [subdivisionOpen, setSubdivisionOpen] = useState(false)
  const [subdivision, setSubdivision] = useState<Subdivision | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(COUNTRIES_API)
      .then((res) => res.json())
      .then((list: Country[]) => {
        if (cancelled) return
        setCountries([...list].sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => { if (!cancelled) setCountriesError(true) })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setSubdivision(null)
    setSubdivisions([])
    setSubdivisionsError(false)

    if (!country) return

    let cancelled = false
    setSubdivisionsLoading(true)

    fetch(`/api/setup/subdivisions/${country.alpha2Code}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch subdivisions')
        return res.json()
      })
      .then((list: Subdivision[]) => { if (!cancelled) setSubdivisions(list) })
      .catch(() => { if (!cancelled) setSubdivisionsError(true) })
      .finally(() => { if (!cancelled) setSubdivisionsLoading(false) })

    return () => { cancelled = true }
  }, [country])

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <input type="hidden" name="country" value={country?.alpha2Code ?? ''} />
      <input type="hidden" name="countrySubdivision" value={subdivision?.code ?? ''} />

      {/* Country */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Country</label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              className="justify-between font-normal"
            >
              <span className="truncate">{country ? country.name : 'Select a country'}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandList>
                <CommandEmpty>
                  {countriesError ? 'Failed to load countries.' : 'No country found.'}
                </CommandEmpty>
                <CommandGroup>
                  {country && (
                    <CommandItem
                      value="__clear_country__"
                      onSelect={() => { setCountry(null); setCountryOpen(false) }}
                      className="text-muted-foreground"
                    >
                      Clear selection
                    </CommandItem>
                  )}
                  {countries.map((c) => (
                    <CommandItem
                      key={c.alpha2Code}
                      value={c.name}
                      onSelect={() => { setCountry(c); setCountryOpen(false) }}
                    >
                      <Check className={cn('h-4 w-4', country?.alpha2Code === c.alpha2Code ? 'opacity-100' : 'opacity-0')} />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">Optional. Leave blank for a global instance.</p>
      </div>

      {/* Country Subdivision */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Country Subdivision</label>
        <Popover open={subdivisionOpen} onOpenChange={setSubdivisionOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={subdivisionOpen}
              disabled={!country || subdivisionsLoading}
              className="justify-between font-normal"
            >
              <span className="truncate">
                {subdivision ? subdivision.name : subdivisionsLoading ? 'Loading...' : 'Select a subdivision'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search provinces/states..." />
              <CommandList>
                <CommandEmpty>
                  {subdivisionsError ? 'Failed to load subdivisions.' : 'No subdivision found.'}
                </CommandEmpty>
                <CommandGroup>
                  {subdivision && (
                    <CommandItem
                      value="__clear_subdivision__"
                      onSelect={() => { setSubdivision(null); setSubdivisionOpen(false) }}
                      className="text-muted-foreground"
                    >
                      Clear selection
                    </CommandItem>
                  )}
                  {subdivisions.map((s) => (
                    <CommandItem
                      key={s.code}
                      value={s.name}
                      onSelect={() => { setSubdivision(s); setSubdivisionOpen(false) }}
                    >
                      <Check className={cn('h-4 w-4', subdivision?.code === s.code ? 'opacity-100' : 'opacity-0')} />
                      {s.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          {country ? 'Optional. Province, state, or region.' : 'Select a country first.'}
        </p>
      </div>
    </div>
  )
}
