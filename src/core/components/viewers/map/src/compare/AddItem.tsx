"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from "react";

import { Button, Input } from '../../../../../components/ui/'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../../components/ui/DropdownMenu'
import { useBuildings } from '../../../../../hooks/buildings/buildings'
import { useSites } from '../../../../../hooks/sites/sites'
import { usePermissions } from '../../../../../store'

// Data


// Shadcn Components

// Icons

import type { Building, Site } from '../../../../../types/dbTypes';

interface AddItemProps {
  handleAddBuilding: (building: Building) => void
  handleAddSite?: (site: Site) => void
  isComparingSites?: boolean
  icon?: React.ReactNode
  className?: string
  variant?: 'secondary' | 'ghost'
}

export default function AddItem({ handleAddBuilding, handleAddSite, isComparingSites = false, icon, className, variant }: AddItemProps) {
  // Translation
  const t = useTranslations('AddItem')

  // Permissions
  const { ability } = usePermissions()

  const [searchTerm, setSearchTerm] = React.useState('')

  const { buildings, isLoading: buildingsLoading, isError: buildingsError } = useBuildings()
  const { sites, isLoading: sitesLoading, isError: sitesError } = useSites()

  const filteredData = searchTerm.trim() === ''
    ? [] // Return empty array when search is empty
    : (isComparingSites
        ? sites
            .filter((site) => {
            // Check if any of the fields match
              return site.siteName?.toLowerCase().includes(searchTerm.toLowerCase())
                || site.siteAddress?.toLowerCase().includes(searchTerm.toLowerCase())
            })
            .sort((a, b) => {
            // Sort by relevance (name > address)
              const aNameMatch = a.siteName?.toLowerCase().includes(searchTerm.toLowerCase())
              const bNameMatch = b.siteName?.toLowerCase().includes(searchTerm.toLowerCase())

              if (aNameMatch && !bNameMatch) return -1
              if (!aNameMatch && bNameMatch) return 1

              const aAddressMatch = a.siteAddress?.toLowerCase().includes(searchTerm.toLowerCase())
              const bAddressMatch = b.siteAddress?.toLowerCase().includes(searchTerm.toLowerCase())

              if (aAddressMatch && !bAddressMatch) return -1
              if (!aAddressMatch && bAddressMatch) return 1

              return 0
            })
            .slice(0, 3) // Limit to 3 results
        : buildings
            .filter((building) => {
            // Check if any of the fields match
              return building.buildingName?.toLowerCase().includes(searchTerm.toLowerCase())
                || building.buildingAddress?.toLowerCase().includes(searchTerm.toLowerCase())
            })
            .sort((a, b) => {
            // Sort by relevance (name > address > site)
              const aNameMatch = a.buildingName?.toLowerCase().includes(searchTerm.toLowerCase())
              const bNameMatch = b.buildingName?.toLowerCase().includes(searchTerm.toLowerCase())

              if (aNameMatch && !bNameMatch) return -1
              if (!aNameMatch && bNameMatch) return 1

              const aAddressMatch = a.buildingAddress?.toLowerCase().includes(searchTerm.toLowerCase())
              const bAddressMatch = b.buildingAddress?.toLowerCase().includes(searchTerm.toLowerCase())

              if (aAddressMatch && !bAddressMatch) return -1
              if (!aAddressMatch && bAddressMatch) return 1

              return 0
            })
            .slice(0, 3)) // Limit to 3 results

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          className={`dropdown-menu-trigger ${className}`}
          onClick={e => e.stopPropagation()}
          disabled={buildings && !ability.can('read', 'Building') || sites && !ability.can('read', 'Site')}
        >
          {icon || <LR.PlusCircle className="!w-5 !h-5" />}
          {t('add')}
          {' '}
          {isComparingSites ? t('siteCap') : t('buildingCap')}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top">

        {/* Search for building */}
        <div className="relative">
          <LR.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t('searchPlaceholder')} ${isComparingSites ? t('site') : t('building')}`}
            className="pl-8 w-[250px]"
            value={searchTerm}
            autoFocus
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation() // This disables Randix UI's default behavior for dropdown menu navigation
            }}
          />
        </div>

        {/* Search results */}

        {filteredData.length > 0 ? (
          // When we have results, map through them
          filteredData.map((item, index) => (
            <DropdownMenuItem
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                // function to add item to compare
                if (isComparingSites && handleAddSite) {
                  handleAddSite(item as Site)
                }
                else {
                  handleAddBuilding(item as Building)
                }
                setSearchTerm('')
              }}
              tabIndex={0}
            >
              <div className="flex flex-col">
                <span className="flex items-center">
                  {isComparingSites ? (item as Site).siteName : (item as Building).buildingName}
                </span>
                {(isComparingSites ? (item as Site).siteAddress : (item as Building).buildingAddress) && (
                  <span className={`${(isComparingSites ? (item as Site).siteName : (item as Building).buildingName) ? 'text-muted-foreground' : 'text-foreground'} `}>
                    {isComparingSites ? (item as Site).siteAddress : (item as Building).buildingAddress}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          // When no results but user has typed something
          searchTerm.trim() !== '' && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">{t('noneFound')}</span>
            </DropdownMenuItem>
          )
        )}

      </DropdownMenuContent>
    </DropdownMenu>
  )
}