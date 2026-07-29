'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { MapContext } from '../../../store'
import { cn } from '../../../utils/utils'
import { Button } from '../Button'
import { LoadingSpinner } from '../LoadingSpinner'
import { useSidebar } from '../Sidebar'

import type { Building, Organization } from '../../../types/dbTypes'


interface HeaderProps {
  currentBuilding: Building | null
  loadingBuildingInfo: boolean
  organization?: Organization
}

export function Header({
  currentBuilding,
  loadingBuildingInfo,
  organization,
}: HeaderProps) {
  // Translation
  const t = useTranslations('SidebarHeader')
  const { setOpenInfo } = useSidebar()
  const { state: mapState } = React.useContext(MapContext)
  const countryCode = organization?.country
  const countryName = countryCode
    ? (new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode.toUpperCase()) ?? countryCode)
    : ''

  // Strip country prefix from ISO 3166-2 codes: "CA-ON" → "ON", "CA_ON" → "ON", "CAON" → "ON"
  const formatSubdivision = (code: string | null | undefined): string => {
    if (!code) return ''
    const normalized = code.replace('_', '-')
    const withDash = normalized.includes('-') ? normalized : `${normalized.slice(0, 2)}-${normalized.slice(2)}`
    return withDash.split('-').slice(1).join('-')
  }
  const { currentLocation } = mapState.map

  return (
    <div className="p-4">
      <div className="flex items-center">
        <div className="flex items-center gap-2 w-full justify-between">
          {/* min-w-0 so a long building/municipality name truncates instead of growing the row
              and pushing the close button past the sidebar's overflow-hidden edge. */}
          <div className="space-y-1 flex justify-center min-w-0 flex-1">
            {loadingBuildingInfo
              ? (
                <div className="flex items-center gap-2 min-w-0">
                  <LoadingSpinner />
                  <span className="text-sm font-medium text-muted-foreground truncate">{t('loadingText')}</span>
                </div>
              )
              : (
                <h2 className="text-sm font-semibold text-foreground truncate" title={currentBuilding?.buildingName ?? undefined}>
                  {currentBuilding?.buildingName ||
                    (
                      currentLocation?.municipality
                        ? (currentLocation?.countrySubdivision
                            ? `${currentLocation.municipality}, ${formatSubdivision(currentLocation.countrySubdivision)}`
                            : currentLocation.municipality)
                        : (formatSubdivision(currentLocation?.countrySubdivision) || countryName)
                    )
                  }
                </h2>
              )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'group/sidebar-trigger relative shrink-0 z-10 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent',
              // Widen the tap target on touch viewports (36px button -> 52px hit area).
              'after:absolute after:-inset-2 after:md:hidden',
            )}
            onClick={() => setOpenInfo(false)}
            title={t('closeInfoToggle')}
            aria-label={t('closeInfoToggle')}
          >
            <LR.PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}