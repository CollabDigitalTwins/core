"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '../../../components/ui/Button'
import { MenusContext, usePermissions } from '../../../store'
import { ViewerNames } from '../../../types/'
import { useBuildingFocus } from '../map/src/BuildingFocus/useBuildingFocus'
import CompareDialog from '../map/src/compare/CompareDialog'
import { useShowSitesOnMap } from '../map/src/MapLayers/src/SiteLayer/useShowSitesOnMap'

import type { CompareItem } from '../../../store'
import type { Building, Site } from '../../../types/dbTypes'

type ResultActionsProps = {
  headerTitle: string
  currentViewer: string
  filteredData?: Array<Building | Site>
  compareItems: CompareItem[]
  setCompareItems?: React.Dispatch<React.SetStateAction<CompareItem[]>>
  comparing: boolean
  setComparing: React.Dispatch<React.SetStateAction<boolean>>
}

const COMPARABLE_VIEWERS: string[] = [ViewerNames.buildings, ViewerNames.sites, ViewerNames.infrastructure]
const MAPPABLE_VIEWERS: string[] = [ViewerNames.buildings, ViewerNames.sites]

// Rough North America bounding box.
const isPlottable = ({ buildingLongitude: lon, buildingLatitude: lat }: Building) =>
  lon != null && lat != null
  && Number.isFinite(lat) && Number.isFinite(lon)
  && lat >= 5 && lat <= 85 && lon >= -170 && lon <= -10

/** Actions on the filtered rows of a data table: result count, View All on Map and Compare. */
export default function ResultActions({
  headerTitle,
  currentViewer,
  filteredData,
  compareItems,
  setCompareItems,
  comparing,
  setComparing,
}: ResultActionsProps) {
  const t = useTranslations('HeaderButtons')
  const { ability } = usePermissions()
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const showSitesOnMap = useShowSitesOnMap()
  const { focus: focusBuildings } = useBuildingFocus()

  const cannotRead = currentViewer === ViewerNames.buildings && !ability.can('read', 'Building')
    || currentViewer === ViewerNames.sites && !ability.can('read', 'Site')

  const handleViewAllOnMap = async () => {
    if (!filteredData?.length) return
    menusDispatch({ type: 'SET_VIEWER', payload: { currentViewer: ViewerNames.map } })

    if (currentViewer === ViewerNames.buildings) {
      const plottable = (filteredData as Building[]).filter(isPlottable)
      if (plottable.length > 0) focusBuildings(plottable, { name: 'Database Buildings', fly: 'fit' })
    } else if (currentViewer === ViewerNames.sites) {
      const sites = (filteredData as Site[]).filter(site => !!site?.id)
      if (sites.length > 0) await showSitesOnMap(sites, { switchViewer: false })
    }
  }

  const handleAddBuilding = (building: Building) => {
    setCompareItems?.([...compareItems, { ...building, id: String(building.id) }])
  }

  const exitCompare = () => {
    setComparing(false)
    setCompareItems?.([])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filteredData && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {t('resultCount', { count: filteredData.length })}
        </span>
      )}
      {MAPPABLE_VIEWERS.includes(currentViewer) && filteredData && (
        <Button
          variant="outline"
          onClick={() => void handleViewAllOnMap()}
          disabled={filteredData.length === 0 || cannotRead}
        >
          <LR.Map />
          {t('viewButton')}
        </Button>
      )}
      {comparing
        ? (
            <>
              <Button variant="outline" onClick={exitCompare} disabled={cannotRead}>
                {t('cancelButton')}
              </Button>
              <CompareDialog
                toggleOpen={exitCompare}
                compareItems={compareItems}
                setCompareItems={setCompareItems || (() => {})}
                handleAddBuilding={handleAddBuilding}
              />
            </>
          )
        : COMPARABLE_VIEWERS.includes(currentViewer) && (
          <Button variant="secondary" className="max-sm:hidden" onClick={() => setComparing(true)}>
            <LR.GitCompare />
            {t('compare')}
            {' '}
            {headerTitle}
          </Button>
        )}
    </div>
  )
}
