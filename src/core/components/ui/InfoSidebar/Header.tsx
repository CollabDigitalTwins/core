'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import type { Building } from '../../../types/dbTypes'
import { useTranslations } from 'next-intl'
import { LoadingSpinner } from '../LoadingSpinner'
import { useSidebar } from '../Sidebar'
import { MapContext } from '../../../store'
import { useAppConfigContext } from '../../../store/AppConfig/context'
import { Button } from '../Button'
import * as LR from 'lucide-react'

interface HeaderProps {
  currentBuilding: Building | null
  loadingBuildingInfo: boolean
}

export function Header({
  currentBuilding,
  loadingBuildingInfo,

}: HeaderProps) {
  // Translation
  const t = useTranslations('SidebarHeader')
  const { setOpenInfo } = useSidebar()
  const { state: mapState } = React.useContext(MapContext)
  const { state: appConfigState } = useAppConfigContext()
  const countryCode = appConfigState.appConfig.organization?.country
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
          <div className="space-y-1 flex justify-center">
            {loadingBuildingInfo
              ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner />
                  <span className="text-sm font-medium text-muted-foreground">{t('loadingText')}</span>
                </div>
              )
              : (
                <h2 className="text-sm font-semibold text-foreground">
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
            variant="ghost"
            size="icon"
            className="group/sidebar-trigger opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
            onClick={() => setOpenInfo(false)}
            title={t('closeInfoToggle')}
          >
            <LR.PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}