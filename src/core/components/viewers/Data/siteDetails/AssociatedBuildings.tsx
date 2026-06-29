"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import type { Building } from '../../../../types/dbTypes'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Utils
import { useAssociatedBuildingsColumns } from '../utils/Columns'
import { filterHelper } from '../utils/filterHelper'
import { fetchSuggestions, parseLocation } from '../../map/utils/geocoder'
import { filterPointsInRing, fetchSiteBoundaryRing, type Ring } from '../../map/src/MapLayers/src/SiteLayer/siteGeometry'
import { AssociateBuildingsDialog } from '../../map/src/tools/AddTools/AddSite/AssociateBuildingsDialog'
import { useMapContext } from '../../../../store'

// Shadcn Components
import { DataTable, Input, Button, LoadingSpinner } from '../../../../components/ui/'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../../../../components/ui/DropdownMenu'

// Custom Components
import FiltersDialog from '../advancedFilter/FiltersDialog'

// Icons
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBuildings, useCreateBuilding } from '../../../../hooks/buildings/buildings'
import { useUser } from '../../../../hooks/users/users'


interface AssociatedBuildingsTableProps {
  buildings: Building[]
  onRowClick?: (building: Building) => void
  siteId?: number
  siteName?: string
  onAttachBuilding?: (building: Building) => void
  editing?: boolean
  setEditing?: (editing: boolean) => void
}

const AssociatedBuildingsTable: React.FC<AssociatedBuildingsTableProps> = ({
  buildings,
  onRowClick,
  siteId,
  siteName,
  onAttachBuilding,
  editing,
  setEditing,
}) => {
  // Translations
  const t = useTranslations('AssociatedBuildings')
  const tf = (key: string, fallback: string, values?: Record<string, string | number>) =>
    (t.has(key) ? t(key, values) : fallback)

  const [searchTerm, setSearchTerm] = React.useState('')
  const [attachSearchTerm, setAttachSearchTerm] = React.useState('')
  const [filters, setFilters] = React.useState([
    {
      id: 1,
      field: '',
      fieldType: null,
      operator: null,
      value: null,
      secondValue: null,
    },
  ])
  const [activeFilters, setActiveFilters] = React.useState([])
  // Track newly attached buildings for preview
  const [previewBuildings, setPreviewBuildings] = React.useState<Building[]>([])
  
  const [isCreatingBuilding, setIsCreatingBuilding] = React.useState(false)
  
  const [geocodedSuggestions, setGeocodedSuggestions] = React.useState([])
  const [isLoadingGeocoded, setIsLoadingGeocoded] = React.useState(false)

  const { state: mapState } = useMapContext()
  const { organizationCountry } = mapState.map

  // Fetch all available buildings
  const { buildings: allBuildings, isLoading } = useBuildings()

  // The site's saved boundary polygon (loaded from minio) used to suggest the
  // buildings that fall inside it when attaching.
  const [boundaryRing, setBoundaryRing] = React.useState<Ring | null>(null)
  const [showSuggestDialog, setShowSuggestDialog] = React.useState(false)

  React.useEffect(() => {
    if (!siteId || siteId < 0) { setBoundaryRing(null); return }
    let cancelled = false
    fetchSiteBoundaryRing(siteId).then(ring => { if (!cancelled) setBoundaryRing(ring) })
    return () => { cancelled = true }
  }, [siteId])

  // Buildings inside the boundary that aren't already attached/previewed.
  const suggestedBuildings = React.useMemo(() => {
    if (!boundaryRing || !allBuildings) return []
    const excluded = new Set([...buildings, ...previewBuildings].map(b => b.id))
    return filterPointsInRing(boundaryRing, allBuildings, b =>
      (typeof b.buildingLongitude === 'number' && typeof b.buildingLatitude === 'number')
        ? [b.buildingLongitude, b.buildingLatitude]
        : null)
      .filter(b => !excluded.has(b.id))
  }, [boundaryRing, allBuildings, buildings, previewBuildings])
  
  const { createBuilding } = useCreateBuilding()
  
  // Session and user data
  const { data: session, status } = useSession()
  const { user, isError, updateUser } = useUser(session?.user?.id || '')

  // Combine original buildings with preview buildings
  const displayBuildings = React.useMemo(() => {
    // Create a unique set of buildings based on ID
    const combinedBuildings = [...buildings]

    // Only add preview buildings that aren't already in the original buildings array
    for (const previewBuilding of previewBuildings) {
      if (!combinedBuildings.some(b => b.id === previewBuilding.id)) {
        combinedBuildings.push({
          ...previewBuilding,
        })
      }
    }

    return combinedBuildings
  }, [buildings, previewBuildings])

  // Apply filters to the buildings data
  const filteredBuildings = React.useMemo(() => {
    // First apply search filter
    let filtered = displayBuildings.filter(building =>
      [
        building.buildingName,
        building.buildingAddress,
        building.buildingCountrySubdivision,
        building.buildingMunicipality,
        building.buildingProjectType,
      ].some(value =>
        String(value || '').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    )

    // Then apply advanced filters
    if (activeFilters && activeFilters.length > 0) {
      filtered = filterHelper(filtered, activeFilters)
    }

    return filtered
  }, [displayBuildings, searchTerm, activeFilters])

  // Filter buildings for attachment dropdown
  const filteredAttachableBuildings = React.useMemo(() => {
    if (!allBuildings) return []

    // Filter out buildings that are already attached to this site
    // or are in the preview list
    const existingBuildingIds = new Set([...buildings, ...previewBuildings].map(b => b.id))
    const availableBuildings = allBuildings.filter(b => !existingBuildingIds.has(b.id))

    // Return empty array when search term is empty
    if (!attachSearchTerm.trim()) return []

    return availableBuildings
      .filter(building =>
        [
          building.buildingName,
          building.buildingAddress,
        ].some(value =>
          String(value || '').toLowerCase().includes(attachSearchTerm.toLowerCase()),
        ),
      )
      .sort((a, b) => {
        // Sort by relevance (name > address)
        const aNameMatch = a.buildingName?.toLowerCase().includes(attachSearchTerm.toLowerCase())
        const bNameMatch = b.buildingName?.toLowerCase().includes(attachSearchTerm.toLowerCase())

        if (aNameMatch && !bNameMatch) return -1
        if (!aNameMatch && bNameMatch) return 1

        return 0
      })
      .slice(0, 3) // Limit to 3 results
  }, [allBuildings, attachSearchTerm, buildings, previewBuildings])

  // Filter geocoded suggestions to exclude addresses that match existing buildings
  const filteredGeocodedSuggestions = React.useMemo(() => {
    if (!geocodedSuggestions.length || !allBuildings) return geocodedSuggestions

    // Get all existing building addresses
    const existingAddresses = new Set(
      allBuildings
        .map(b => b.buildingAddress?.toLowerCase().trim())
        .filter(Boolean)
    )

    // Filter out geocoded results that match existing building addresses
    return geocodedSuggestions.filter((feature) => {
      const geocodedAddress = feature.properties?.label?.toLowerCase().trim()
      return geocodedAddress && !existingAddresses.has(geocodedAddress)
    }).slice(0, 3) // Limit to 3 results
  }, [geocodedSuggestions, allBuildings])

  // Debounced fetch for geocoded addresses
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const fetchGeocoded = async () => {
      if (!attachSearchTerm.trim() || attachSearchTerm.length < 3) {
        setGeocodedSuggestions([])
        setIsLoadingGeocoded(false)
        return
      }

      setIsLoadingGeocoded(true)
      try {
        const results = await fetchSuggestions(attachSearchTerm, organizationCountry)
        setGeocodedSuggestions(results || [])
      } catch (error) {
        console.error('Error fetching geocoded suggestions:', error)
        setGeocodedSuggestions([])
      } finally {
        setIsLoadingGeocoded(false)
      }
    }

    timeoutId = setTimeout(fetchGeocoded, 300)

    return () => clearTimeout(timeoutId)
  }, [attachSearchTerm])

  const handleApplyFilters = (appliedFilters) => {
    setActiveFilters(appliedFilters)
  }

  const handleAttachBuilding = async (building: Building) => {
    // Enable editing mode if setEditing is provided
    if (setEditing) {
      setEditing(true)
    }
    // Add to preview list for immediate feedback
    setPreviewBuildings(prev => [...prev, building])
    // Reset search field
    setAttachSearchTerm('')
    // Call the onAttachBuilding prop to update parent state
    if (onAttachBuilding) {
      onAttachBuilding(building)
    }
  }

  const handleCreateAndAttach = async (feature: any) => {
  if (!user?.organizationId) {
    toast.error('Organization not found')
    return
  }

  setIsCreatingBuilding(true)
  try {
    // Parse the feature data
    const coordinates = feature.geometry?.coordinates || []
    const properties = feature.properties || {}
    
    const buildingData = {
      buildingAddress: properties.label || attachSearchTerm,
      buildingLongitude: coordinates[0],
      buildingLatitude: coordinates[1],
      buildingStreetName: properties.street,
      buildingCountrySubdivision: properties.region_a || properties.region,
      buildingMunicipality: properties.locality || properties.county,
      buildingPostalCode: properties.postalcode,
    }
    
    // Create the building
    const result = await createBuilding({
      buildingData,
      organizationId: user?.organizationId ? String(user.organizationId) : null,
    })
    // Auto-attach the newly created building
    if (result) {
      if (setEditing) {
        setEditing(true)
      }
      setPreviewBuildings(prev => {
        const updated = [...prev, result]
        return updated
      })
      if (onAttachBuilding) {
        onAttachBuilding(result)
      }
      toast.success(t('createAttachToastSuccess'))
    }
    setAttachSearchTerm('')
    setGeocodedSuggestions([])
  } catch (error) {
    toast.error(t('createAttachToastError'))
  } finally {
    setIsCreatingBuilding(false)
  }
} 

  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-between">
        {/* search & filters */}
        <div className="flex flex-row gap-12 sm:gap-2 justify-between sm:justify-start w-full">
          <div className="pb-4">
            <Input
              placeholder={t('searchPlaceholder1')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <FiltersDialog
            data={displayBuildings}
            isBuilding={true}
            filters={filters}
            activeFilters={activeFilters}
            setFilters={setFilters}
            setActiveFilters={setActiveFilters}
            onApplyFilters={handleApplyFilters}
          />
        </div>

        {/* attach building dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">{t('attachTrigger')}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            {suggestedBuildings.length > 0 && (
              <>
                <DropdownMenuItem
                  onClick={() => setShowSuggestDialog(true)}
                  className="font-medium"
                >
                  <LR.MapPin className="h-4 w-4" />
                  {tf('suggestInside', `Review ${suggestedBuildings.length} building(s) inside the boundary`, { count: suggestedBuildings.length })}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <div className="relative">
              <LR.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder2')}
                className="pl-8"
                value={attachSearchTerm}
                autoFocus
                onChange={e => setAttachSearchTerm(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>

            {isLoading || isLoadingGeocoded ? (
              <DropdownMenuItem disabled>
                <LoadingSpinner />
              </DropdownMenuItem>
            ) : attachSearchTerm.trim() === '' ? (
              <DropdownMenuItem disabled>
                Type to search for buildings
              </DropdownMenuItem>
            ) : (
              <>
                {/* Existing Buildings Section */}
                {filteredAttachableBuildings.length > 0 && (
                  <>
                    <DropdownMenuLabel>Existing Buildings</DropdownMenuLabel>
                    {filteredAttachableBuildings.map(building => (
                      <DropdownMenuItem
                        key={building.id}
                        onClick={() => handleAttachBuilding(building)}
                      >
                        <div className="flex flex-col">
                          <span className="flex items-center">
                            {building.buildingName || 'Unnamed Building'}
                          </span>
                          {building.buildingAddress && (
                            <span className="text-muted-foreground text-sm">
                              {building.buildingAddress}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {/* Separator if both sections have content */}
                {filteredAttachableBuildings.length > 0 && filteredGeocodedSuggestions.length > 0 && (
                  <DropdownMenuSeparator />
                )}

                {/* Geocoded Addresses Section */}
                {filteredGeocodedSuggestions.length > 0 && (
                  <>
                    <DropdownMenuLabel>Create New Building</DropdownMenuLabel>
                    {filteredGeocodedSuggestions.map((feature) => {
                      const location = parseLocation(feature)
                      const uniqueKey = feature.properties?.gid
                        || `${feature.properties?.name}-${feature.geometry?.coordinates?.[0]}-${feature.geometry?.coordinates?.[1]}`

                      return (
                        <DropdownMenuItem
                          key={uniqueKey}
                          onClick={() => handleCreateAndAttach(feature)}
                          disabled={isCreatingBuilding}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <LR.Plus className="h-4 w-4 flex-shrink-0" />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium truncate">{location.name}</span>
                              <span className="text-muted-foreground text-sm truncate">
                                {location.region}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                  </>
                )}

                {/* No results at all */}
                {filteredAttachableBuildings.length === 0 && filteredGeocodedSuggestions.length === 0 && (
                  <DropdownMenuItem disabled>
                    No buildings or addresses found
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {previewBuildings.length > 0 && editing && (
        <div className="mb-4 p-3 bg-muted rounded-md border border-border">
          <p className="text-sm text-foreground">
            <strong>{previewBuildings.length}</strong>
            {' '}
            {t('msg1')}
            {previewBuildings.length > 1 ? 's' : ''}
            {' '}
            {t('msg2')}
          </p>
        </div>
      )}

      <div className="py-4">
        <DataTable
          columns={useAssociatedBuildingsColumns()}
          data={filteredBuildings || []}
          onRowClick={onRowClick}
          className=""
          showPagination={true}
        />
      </div>

      {showSuggestDialog && siteId && (
        <AssociateBuildingsDialog
          siteId={siteId}
          siteName={siteName ?? ''}
          buildings={suggestedBuildings}
          onClose={() => setShowSuggestDialog(false)}
          onAssociated={(associated) => {
            // The dialog already persisted the association via updateSite; just
            // reflect it in the visible list (previewBuildings feeds the table).
            setPreviewBuildings(prev => [
              ...prev,
              ...associated.filter(b => !prev.some(p => p.id === b.id)),
            ])
          }}
        />
      )}
    </div>
  )
}

export default AssociatedBuildingsTable