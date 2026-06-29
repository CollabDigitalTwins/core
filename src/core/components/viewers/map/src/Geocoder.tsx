'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import { useTranslations } from 'next-intl'

// Context
import { MapContext } from '../../../../store'

// Utility functions
import { fetchSuggestions, parseLocation, handleLocationSelect, buildingToFeature } from '../utils/geocoder'

// Import the shadcn components
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '../../../ui/Command'
import { Button } from '../../../ui/Button'
import { Input } from '../../../ui/Input'
import { Separator } from '../../../ui/Separator'

// Icons
import { Search } from 'lucide-react'

// Building data hook
import { useBuildings } from '../../../../hooks/buildings/buildings'

import { usePathname } from 'next/navigation'
import type { CurrentLocation } from '../../../../types/map'
import { LoadingSpinner } from '../../../ui/LoadingSpinner'
import { useGeocodingRuntimeConfig } from '../../../../hooks/useGeocodingRuntimeConfig'

interface GeocoderProps {
  onSelect?: (addressData: any) => void
  showDatabaseBuildings?: boolean
  alwaysExpanded?: boolean
  geocodeEarthApiKey?: string
  geocoderUrl?: string
}

export default function Geocoder({
  onSelect,
  showDatabaseBuildings = true,
  alwaysExpanded = false,
  geocodeEarthApiKey,
  geocoderUrl,
}: GeocoderProps) {
  useGeocodingRuntimeConfig({ geocodeEarthApiKey, geocoderUrl })

  // Translation
  const t = useTranslations('Geocoder')

  const [address, setAddress] = React.useState<string>('')
  const [query, setQuery] = React.useState('')
  const [suggestions, setSuggestions] = React.useState([])
  const [buildingResults, setBuildingResults] = React.useState([])
  const [focused, setFocused] = React.useState(alwaysExpanded)
  const [selectedAddress, setSelectedAddress] = React.useState(null)
  const [isExpanded, setIsExpanded] = React.useState(alwaysExpanded)
  const [loading, setLoading] = React.useState(false)

  const pathname = usePathname()

  const suggestionsRef = React.useRef(null)
  const inputRef = React.useRef(null)
  const debounceRef = React.useRef(null)

  const { dispatch: mapDispatch, state: mapState } = React.useContext(MapContext)
  const { map, currentLocation, organizationCountry } = mapState.map

  // Fetch buildings data from API only if showDatabaseBuildings is true
  const { buildings, isLoading: isBuildingsLoading } = useBuildings()

  // Filter buildings based on search query
  const filterBuildings = React.useCallback((searchQuery) => {
    if (!showDatabaseBuildings || !buildings || !searchQuery || searchQuery.length < 3) return []

    const lowerQuery = searchQuery.toLowerCase()

    if (Array.isArray(buildings) && buildings.length > 0) {
      return buildings.filter((building) => {
        return (
          (building.buildingName && building.buildingName.toLowerCase().includes(lowerQuery))
          || (building.buildingAddress && building.buildingAddress.toLowerCase().includes(lowerQuery))
          || (building.buildingMunicipality && building.buildingMunicipality.toLowerCase().includes(lowerQuery))
          || (building.buildingCountrySubdivision && building.buildingCountrySubdivision.toLowerCase().includes(lowerQuery))
        )
      }).slice(0, 3) // Limit to 3 results
    }
    return []
  }, [buildings, showDatabaseBuildings])

  // Debounce the API request to avoid rate limiting and excessive requests
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      if (!query || query.length < 3) {
        setSuggestions([])
        setBuildingResults([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Filter buildings from our database only if enabled
        if (showDatabaseBuildings) {
          const filteredBuildings = filterBuildings(query)
          setBuildingResults(filteredBuildings)
        }

        // Fetch geocoding suggestions
        const geocodeResults = await fetchSuggestions(query, organizationCountry)
        
        // Deduplicate geocode results based on name and region
        const deduplicatedResults = geocodeResults.reduce((acc, feature) => {
          const location = parseLocation(feature)
          // Create a unique key based on name and region (case-insensitive)
          const key = `${location.name?.toLowerCase() || ''}_${location.region?.toLowerCase() || ''}`
          
          // Only add if we haven't seen this combination before
          if (!acc.seen.has(key)) {
            acc.seen.add(key)
            acc.features.push(feature)
          }
          
          return acc
        }, { seen: new Set(), features: [] })
        
        setSuggestions(deduplicatedResults.features)
      }
      catch (error) {
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
      }
      finally {
        setLoading(false)
      }
    }, 300) // Increased debounce time for better API rate limiting

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, filterBuildings, showDatabaseBuildings])

  // Handle click outside to close suggestions
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)
        && inputRef.current && !inputRef.current.contains(event.target) // Don't close if alwaysExpanded is true
        && !alwaysExpanded) {
        setFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [alwaysExpanded])

  // Handle suggestion selection
  const handleSelectSuggestion = (feature, type = '') => {
    setQuery('') // Clear the input field
    setSuggestions([])
    setBuildingResults([])
    if (!alwaysExpanded) {
      setFocused(false)
    }

    // handleLocationSelect will automatically remove any existing marker and add a new one
    const addressData = handleLocationSelect(feature, map, type)

    const address = addressData.formatted_address || feature.properties?.label || ''
    setAddress(address)
    setSelectedAddress(addressData)

    if (onSelect) onSelect(addressData)

    if (mapDispatch && currentLocation) {
      const [lng, lat] = addressData.coordinates
      const props = addressData.properties || {}
      const parts = address.split(',').map(p => p.trim())
      // Read structured properties (provider-agnostic) instead of parsing label tokens,
      // which only matched Geocode Earth's "…, ON, Canada" abbreviation format and broke
      // on the Photon/Nominatim fallback.
      const countrySubdivision: string = props.region_a || props.region || ''
      const municipality: string = props.locality || props.neighbourhood || props.county || ''

      const newCurrentLocation: CurrentLocation = { ...currentLocation, municipality, countrySubdivision, longitude: lng, latitude: lat, address: parts[0] }
      mapDispatch({ type: 'UPDATE_LOCATION', payload: { currentLocation: newCurrentLocation } })
      if (municipality || countrySubdivision) {
        const url = new URL(window.location.href)
        // Write each field only when present, so an empty param doesn't shadow the
        // organization fallback MapViewer applies on reload.
        if (municipality) url.searchParams.set('municipality', municipality)
        else url.searchParams.delete('municipality')
        if (countrySubdivision) url.searchParams.set('countrySubdivision', countrySubdivision)
        else url.searchParams.delete('countrySubdivision')
        url.searchParams.set('address', parts[0])
        url.searchParams.set('lng', lng.toString())
        url.searchParams.set('lat', lat.toString())
        url.searchParams.set('zoom', '18')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }

  // Handle expand of menubar to display search input
  const handleExpand = () => {
    if (alwaysExpanded) return // Don't allow toggling if always expanded

    setIsExpanded(!isExpanded)
    if (isExpanded) {
      setFocused(false)
      setQuery('') // clear input and suggestions when collapsed
      setSuggestions([])
      setBuildingResults([])
    }
    else {
      setFocused(true)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // Small delay to ensure the input is rendered
    }
  }

  return (
        <Command>
          {/* Search input + button */}
          <div className={`flex flex-row justify-start items-center w-full h-auto `}>
            {!alwaysExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExpand}
                className="opacity-70 w-6  justify-end hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
              >
                <Search />
              </Button>
            )}
            {alwaysExpanded && (
              <Search className="h-4 w-4 opacity-50" />
            )}
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  inputRef.current?.blur()
                }
              }}
              placeholder={alwaysExpanded ? t('placeholder1') : t('placeholder2')}
              className={`border-none focus-visible:ring-transparent text-sm transition-all ease-in-out duration-200 ${
                alwaysExpanded || isExpanded ? 'w-full' : 'w-0 p-0'
              }`}
            />
          </div>

          {focused && (loading || buildingResults.length > 0 || suggestions.length > 0) && (
            <div ref={suggestionsRef}>
              <Separator />
              <CommandList>
                {!loading && buildingResults.length === 0 && suggestions.length === 0 && query.length >= 3 && (
                  <CommandEmpty>{showDatabaseBuildings ? t('noResults') : t('noAddresses')}</CommandEmpty>
                )}

                {loading && (
                  <CommandEmpty><LoadingSpinner /></CommandEmpty>
                )}

                {/* Database Buildings section - only show if enabled */}
                {showDatabaseBuildings && !loading && buildingResults.length > 0 && (
                  <CommandGroup heading={t('buildingHeader')}>
                    {buildingResults.map((building) => {
                      const buildingFeature = buildingToFeature(building)

                      return (
                        <CommandItem
                          key={`building-${building.id}`}
                          onSelect={() => handleSelectSuggestion(buildingFeature, 'dbBuilding')}
                          className="cursor-pointer"
                        >
                          <div className="font-medium">{building.buildingName}</div>
                          <div className="text-sm text-muted-foreground">
                            {building.buildingAddress}
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}

                {/* Separator between sections if both have results */}
                {showDatabaseBuildings && buildingResults.length > 0 && suggestions.length > 0 && (
                  <CommandSeparator />
                )}

                {/* Geocoder suggestions section */}
                {!loading && suggestions.length > 0 && (
                  <CommandGroup heading={showDatabaseBuildings ? t('suggestionsHeader') : undefined}>
                    {suggestions.map((feature) => {
                      const location = parseLocation(feature)
                      const uniqueKey = feature.properties?.gid
                        || `${feature.properties?.name}-${feature.geometry?.coordinates?.[0]}-${feature.geometry?.coordinates?.[1]}`

                      return (
                        <CommandItem
                          key={uniqueKey}
                          onSelect={() => handleSelectSuggestion(feature)}
                          className="cursor-pointer"
                        >
                          <div className="font-medium">{location.name}</div>
                          <div className="text-sm text-muted-foreground">{location.region}</div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </div>
          )}
        </Command>
  )
}