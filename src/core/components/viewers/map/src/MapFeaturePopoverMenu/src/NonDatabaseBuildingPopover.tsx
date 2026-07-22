'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useCreateBuilding, useBuildings, useBuilding } from '../../../../../../hooks/buildings/buildings'
import { usePermissions } from '../../../../../../store'

// Shadcn Components
import { MapContext } from '../../../../../../store'
import { useMenusContext } from '../../../../../../store'
import { Button, Label } from '../../../../../ui/'
import { LoadingSpinner } from '../../../../../ui/LoadingSpinner'
import { PopoverContent } from '../../../../../ui/Popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../ui/Select'

// Icons

// Types / Utilities
import { getDetailedAddress } from '../../../utils/geocoder'
import { MarkerManager } from '../../../utils/MarkerManager'

import type { Building } from '../../../../../../types/dbTypes'
import type { MapGeoJSONFeature } from 'maplibre-gl'



// Hooks

interface NonDatabaseBuildingPopoverProps {
  feature: MapGeoJSONFeature
  isOpen: boolean
  onCloseAction: () => void
}

export default function NonDatabaseBuildingPopover({
  feature,
  onCloseAction,
}: NonDatabaseBuildingPopoverProps) {
  // Translation
  const t = useTranslations('NonDatabaseBuildingPopover')
  // Permissions
  const { ability } = usePermissions()

  const { data: session } = useSession()
  const user = session?.user

  const { state: mapState } = React.useContext(MapContext)
  const { currentLocation, map, organizationCountry } = mapState.map

  const { setSelectedItem } = useMenusContext()

  // Use the create building hook
  const { createBuilding, isMutating, createError, createdData } = useCreateBuilding()

  // Get all buildings for searching
  const { buildings } = useBuildings()

  const featureProps = feature?.properties || {}
  const featureid = feature?.id
  const [name, setName] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [matchingBuildings, setMatchingBuildings] = React.useState<Building[]>([])
  const [selectedMatchingBuildingId, setSelectedMatchingBuildingId] = React.useState<string>('')
  const [showExistingBuildings, setShowExistingBuildings] = React.useState(false)
  const [isAttaching, setIsAttaching] = React.useState(false)

  const { updateBuilding, isMutating: isUpdating } = useBuilding(selectedMatchingBuildingId ? Number(selectedMatchingBuildingId) : null)

  const normalizeAddress = React.useCallback((value: string) => {
    return value
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/,/g, ' ')
      .replace(/\bdr\b/g, 'drive')
      .replace(/\brd\b/g, 'road')
      .replace(/\bst\b/g, 'street')
      .replace(/\bave\b/g, 'avenue')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  const clearExistingBuildingMatches = React.useCallback(() => {
    setMatchingBuildings([])
    setSelectedMatchingBuildingId('')
    setShowExistingBuildings(false)

    if (didSetSelectedItemRef.current && setSelectedItem) {
      setSelectedItem(null)
      didSetSelectedItemRef.current = false
    }
  }, [setSelectedItem])

  // Track if we set the selected item in this component
  const didSetSelectedItemRef = React.useRef(false)

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clear selected item if we set it
      if (didSetSelectedItemRef.current && setSelectedItem) {
        setSelectedItem(null)
        didSetSelectedItemRef.current = false
      }
    }
  }, [setSelectedItem])

  // Get address and search for matching buildings
  React.useEffect(() => {
    const getAddress = async (longitude: number, latitude: number) => {
      try {
        // Reverse geocode through the shared provider (Geocode Earth / self-hosted
        // Pelias, falling back to public OSM) so this stays in sync with the geocoder.
        const result = await getDetailedAddress([longitude, latitude], organizationCountry)
        const geocodedAddress = result?.properties?.name as string | undefined

        if (!geocodedAddress) {
          clearExistingBuildingMatches()
          return
        }

        setAddress(geocodedAddress)

        // Search for existing buildings with this address
        if (buildings && buildings.length > 0) {
          const normalizedGeocodedAddress = normalizeAddress(geocodedAddress)

          const matches = buildings.filter((building) => {
            if (!building.buildingAddress) return false

            const normalizedBuildingAddress = normalizeAddress(building.buildingAddress)
            return (
              normalizedBuildingAddress === normalizedGeocodedAddress ||
              normalizedBuildingAddress.includes(normalizedGeocodedAddress) ||
              normalizedGeocodedAddress.includes(normalizedBuildingAddress)
            )
          })

          if (matches.length > 0) {
            setMatchingBuildings(matches)
            setSelectedMatchingBuildingId(matches[0].id.toString())
            setShowExistingBuildings(true)

            // Set the first match as the selected item for the update hook
            if (setSelectedItem) {
              setSelectedItem(matches[0])
              didSetSelectedItemRef.current = true
            }
          } else {
            clearExistingBuildingMatches()
          }
        } else {
          clearExistingBuildingMatches()
        }
      }
      catch (error) {
        console.error('Error fetching municipality and countrySubdivision:', error)
      }
    }

    if (feature.properties?.coordinates) {
      const longitude = feature.properties.coordinates[0]
      const latitude = feature.properties.coordinates[1]
      getAddress(longitude, latitude)
    }
  }, [feature, buildings, setSelectedItem, normalizeAddress, clearExistingBuildingMatches])

  React.useEffect(() => {
    if (!setSelectedItem || !selectedMatchingBuildingId) return

    const selectedBuilding = matchingBuildings.find(
      building => building.id.toString() === selectedMatchingBuildingId,
    )

    if (!selectedBuilding) return

    setSelectedItem(selectedBuilding)
    didSetSelectedItemRef.current = true
  }, [matchingBuildings, selectedMatchingBuildingId, setSelectedItem])

  // Fallbacks from feature or map state
  const buildingCountrySubdivision = featureProps.de_ao_prov || currentLocation.countrySubdivision || null
  const buildingMunicipality = featureProps.de_ao_city || currentLocation.municipality || null
  const buildingPostalCode = featureProps.de_ao_post || currentLocation.postalCode || null
  const site = currentLocation.site || null
  const buildingOsmId = featureid.toString()

  // Create MarkerManager instance
  const markerManagerRef = React.useRef<MarkerManager | null>(null)

  // Initialize MarkerManager
  React.useEffect(() => {
    if (!markerManagerRef.current) {
      markerManagerRef.current = new MarkerManager()
    }

    // Cleanup on unmount
    return () => {
      if (markerManagerRef.current) {
        markerManagerRef.current.destroy()
        markerManagerRef.current = null
      }
    }
  }, [])

  // Get coordinates data from feature
  const [coordinates, setCoordinates] = React.useState(featureProps.coordinates || null)

  // Listen for marker coordinate changes
  React.useEffect(() => {
    if (!markerManagerRef.current) return

    const cleanup = markerManagerRef.current.onMoved((event) => {
      const newCoordinates = event.detail.coordinates
      if (newCoordinates) {
        setCoordinates(newCoordinates)
      }
    })

    return cleanup
  }, [])

  const handleBuildingNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
  }

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value)
  }

  const selectedMatchingBuilding = matchingBuildings.find(
    building => building.id.toString() === selectedMatchingBuildingId,
  )

  const handleAttachExistingBuilding = async (building: Building) => {
    setIsAttaching(true)

    try {
      // Add OSM ID to existing building
      const result = await updateBuilding({
        buildingOsmId,
        // Set default storey number of 2 if building doesn't have one
        ...(building.buildingStoreyNum == null && { buildingStoreyNum: 2 })
      })

      toast.success(t('toastAttachSuccess'))

      // Clear the selected item after successful update
      if (setSelectedItem) {
        setSelectedItem(null)
        didSetSelectedItemRef.current = false
      }

      // Close the popover
      onCloseAction()

    } catch (error) {
      console.error('Error attaching building:', error)

      if (error?.status !== 401) {
        toast.error(t('toastAttachError'))
      }
    } finally {
      setIsAttaching(false)
    }
  }

  const handleCreateNewBuilding = async (event: React.FormEvent) => {
    event.preventDefault()

    // Get final values (prioritize user input, then existing data)
    const buildingName = name.trim() || featureProps._name || ''
    const finalAddress = address.trim() || address || ''

    if (!user?.organizationId) {
      toast.error(t('userNotFound'))
      return
    }

    // Use updated coordinates from marker if available
    const buildingCoordinates = coordinates || [featureProps.longitude, featureProps.latitude]

    const newBuilding: Partial<Building> = {
      buildingName,
      buildingAddress: finalAddress,
      buildingType: ['Other'],
      buildingOsmId,
      buildingLatitude: buildingCoordinates ? buildingCoordinates[1] : null,
      buildingLongitude: buildingCoordinates ? buildingCoordinates[0] : null,
      buildingCountrySubdivision,
      buildingMunicipality,
      buildingPostalCode,
    }

    try {
      const result = await createBuilding({
        buildingData: newBuilding,
        organizationId: user.organizationId.toString(),
      })

      // Remove marker after creating building
      if (markerManagerRef.current) {
        markerManagerRef.current.remove()
      }

      toast.success(t('toastSuccess'))

      // Close the popover on success
      onCloseAction()
    }
    catch (error) {
      console.error('Error creating building:', error)
      toast.error(t('toastError'))
    }
  }

  const handleLocationEdit = () => {
    // Create marker at current coordinates with editing enabled
    if (markerManagerRef.current && coordinates && map) {
      markerManagerRef.current.create(coordinates as [number, number], map, {
        editing: true
      })
    }
    else {
      console.warn('Cannot create marker: missing coordinates or map instance')
    }
  }

  return (
    <PopoverContent className="w-64 -m-1" side="top">
      <form onSubmit={handleCreateNewBuilding}>
        {/* Header row: close button, no overlap with content below */}
        <div className="flex items-center justify-end mb-1">
          <Button
            type="button"
            onClick={onCloseAction}
            variant="ghost"
            size="icon"
            className="shrink-0 p-0 m-0 text-muted-foreground hover:text-foreground"
            aria-label={t('closeAriaLabel')}
          >
            <LR.X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid gap-4">
          {/* Show existing building if match found */}
          {showExistingBuildings && matchingBuildings.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {t('existingBuildingFound')}
              </div>
              <div className="flex flex-col justify-between gap-2 p-2 bg-muted/50 border rounded-lg">
                <div className="grid gap-1">
                  <Label htmlFor="existing-building-select" className="text-xs text-muted-foreground">
                    {t('selectExistingBuildingLabel')}
                  </Label>
                  <Select
                    value={selectedMatchingBuildingId}
                    onValueChange={setSelectedMatchingBuildingId}
                  >
                    <SelectTrigger id="existing-building-select" className="h-9 w-full">
                      <SelectValue placeholder={t('selectExistingBuildingPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingBuildings.map((building) => (
                        <SelectItem key={building.id} value={building.id.toString()}>
                          {building.buildingName || building.buildingAddress || `${t('na')} (${building.id})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className='w-full'
                  onClick={() => selectedMatchingBuilding && handleAttachExistingBuilding(selectedMatchingBuilding)}
                  disabled={isAttaching || isUpdating || !selectedMatchingBuilding}
                >
                  {(isAttaching || isUpdating) ? (
                    <>
                      <LoadingSpinner />
                      <span>{t('attaching')}</span>
                    </>
                  ) : (
                    <>
                      <LR.Link />
                      {t('attachBuilding')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="building-name" className="text-xs text-muted-foreground">
                {t('nameLabel')}
              </Label>
              <input
                id="building-name"
                value={name}
                onChange={handleBuildingNameChange}
                placeholder={name || t('namePlaceholder')}
                className={`font-medium leading-none bg-transparent border-b border-gray-300 focus:outline-none focus:border-primary px-1 py-1 ${name ? 'placeholder:text-foreground' : 'placeholder:text-muted-foreground'}`}
                aria-label={t('nameInputAriaLabel')}
                required
                disabled={!ability.can('create', 'Building')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="building-address" className="text-xs text-muted-foreground">
                {t('addressLabel')}
              </Label>
              <input
                id="building-address"
                value={address}
                onChange={handleAddressChange}
                placeholder={address || t('addressPlaceholder')}
                className={`font-medium leading-none bg-transparent focus:outline-none focus:border-primary px-1 py-1 ${address ? 'placeholder:text-foreground' : 'placeholder:text-muted-foreground'}`}
                aria-label={t('addressAriaLabel')}
                required
                disabled={!ability.can('create', 'Building')}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center mt-4">
          <Button
            type="button"
            variant="outline"
            aria-label="Edit Location"
            title="Edit Location"
            onClick={handleLocationEdit}
            disabled={!ability.can('update', 'Building')}
          >
            <LR.LocationEdit className="w-4 h-4" />
          </Button>

          <Button
            type="submit"
            variant="outline"
            aria-label={t('addBuilding')}
            title={t('addBuilding')}
            disabled={isMutating || !ability.can('create', 'Building')}
          >
            {isMutating
              ? (
                <>``
                  <LoadingSpinner />
                  <span className="text-sm">{t('creating')}</span>
                </>
              )
              : (
                <>
                  <LR.Building2 className="w-4 h-4" />
                  <span className="text-sm">{t('addBuilding')}</span>
                </>
              )}
          </Button>
        </div>
      </form>
    </PopoverContent>
  )
}