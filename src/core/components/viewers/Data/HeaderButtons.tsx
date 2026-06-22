"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Icons
import * as LR from 'lucide-react'
// Dependencies
import * as React from 'react'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../store'

// Utils
import type { Dataset } from '../../../types/datasetTypes'
import type { Building, Site, User } from '../../../types/dbTypes'

import { DatasetsContext, MapContext, MenusContext } from '../../../store'
import type { CompareItem } from '../../../store'

// Shadcn Components
import { Button } from '../../../components/ui/Button'
import { createSitesDataset } from '../map/src/MapLayers/src/SiteLayer'
import { fitBuildingsBounds, fitSitesBounds } from '../map/utils/fitBuildingsBounds'
import AddBuilding from './buildingDetails/AddBuilding'
// File Adder
import DatatableFileAdder from './files/DatatableFileAdder'
// Custom Components
import AddSite from './siteDetails/AddSite'
import CompareDialog from '../map/src/compare/CompareDialog'
import UserMoreOptions from './userDetails/UserMoreOptions'
import AddUser from './userDetails/AddUser'
import BuildingMoreOptions from './buildingDetails/BuildingsMoreOptions'
import { ViewerNames } from '../../../types/'
import AddInfrastructure from './infrastructureDetails/AddInfrastructure'
import { createBuildingsDataset } from '../map/src/MapLayers/src/BuildingLayers/src/databaseBuildings'

type HeaderButtonsProps = {
  headerTitle: string
  currentViewer: string
  compareItems: CompareItem[]
  setCompareItems?: React.Dispatch<React.SetStateAction<CompareItem[]>>
  comparing: boolean
  setComparing: React.Dispatch<React.SetStateAction<boolean>>
  newItemName: string
  setNewItemName: React.Dispatch<React.SetStateAction<string>>
  filteredData?: Array<Building | Site>
  users?: User[]
}

export default function HeaderButtons({
  headerTitle,
  currentViewer,
  compareItems,
  setCompareItems,
  comparing,
  setComparing,
  newItemName,
  setNewItemName,
  filteredData,
  users,
}: HeaderButtonsProps) {
  // Translations
  const t = useTranslations('HeaderButtons')

  // Permissions
  const { ability } = usePermissions()

  const { state: mapState } = React.useContext(MapContext)
  const { dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const [newBuildingFields, setNewBuildingFields] = React.useState({})
  const [newInfrastructureFields, setNewInfrastructureFields] = React.useState({})
  const [addInfrastructureOpen, setAddInfrastructureOpen] = React.useState(false)
  const [addBuildingOpen, setAddBuildingOpen] = React.useState(false)
  const [addUserOpen, setAddUserOpen] = React.useState(false)

  const { map } = mapState.map
  const firstBuilding = compareItems[0]

  const coordinates = firstBuilding
    ? (('buildingLongitude' in firstBuilding && 'buildingLatitude' in firstBuilding)
        ? [firstBuilding.buildingLongitude, firstBuilding.buildingLatitude]
        : ('coordinates' in firstBuilding))
    : undefined

  const handleViewOnMap = () => {
    // set the current viewer to map
    menusDispatch({
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.map },
    })
  }

  const handleViewAllOnMap = async () => {
    if (filteredData.length === 0)
      return

    // Switch to map view
    menusDispatch({
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.map },
    })

    if (currentViewer === 'buildings') {
      // Filter buildings with valid coordinates
      const validBuildings = filteredData.filter(
        (item): item is Building => {
          const b = item as Building
          const lon = b.buildingLongitude
          const lat = b.buildingLatitude
          if (lon == null || lat == null) return false

          // Rough North America bounding box
          const minLat = 5
          const maxLat = 85
          const minLon = -170
          const maxLon = -10

          return Number.isFinite(lat)
        && Number.isFinite(lon)
        && lat >= minLat
        && lat <= maxLat
        && lon >= minLon
        && lon <= maxLon
        }
      )

      if (validBuildings.length === 0)
        return

      const name = 'Database Buildings'

      const dataset: Dataset = createBuildingsDataset(validBuildings, name)

      // Add buildings as a dataset to the map state
      datasetDispatch({
        type: 'ADD_DATASET_TO_MAP',
        payload: { dataset },
      })

      fitBuildingsBounds(validBuildings, map)
    }

    else if (currentViewer === 'sites') {
      // Filter sites with valid coordinates
      const validSites = filteredData.filter(
        (item): item is Site =>
          (item as Site).siteLongitude != null && (item as Site).siteLatitude != null
      )

      if (validSites.length === 0)
        return

      const name = 'Database Sites'

      const dataset: Dataset = createSitesDataset(validSites, name)

      // Add buildings as a dataset to the map state
      datasetDispatch({
        type: 'ADD_DATASET_TO_MAP',
        payload: { dataset },
      })

      fitSitesBounds(validSites, map)
    }

    else if (currentViewer === 'infrastructure') {
        // Filter infrastructure with valid coordinates
    }


  }

  const handleAddBuilding = (building: Building) => {
    if (setCompareItems) {
      const compareItem: CompareItem = {
        ...building,
        id: String(building.id),
      }
      setCompareItems([...compareItems, compareItem])
    }
  }

  const toggleOpen = () => {
    setComparing(false)
    // Clear compareItems when exiting compare mode for proper cleanup
    if (setCompareItems) {
      setCompareItems([])
    }
  }

  return (
    <div className="flex flex-row gap-2.5">
      {comparing
        ? (
            <Button
              variant="outline"
              onClick={() => {
                setComparing(false)
                // Clear compareItems for proper cleanup when canceling
                if (setCompareItems) {
                  setCompareItems([])
                }
              }}
              disabled={currentViewer === 'buildings' && !ability.can('read', 'Building') || currentViewer === 'sites' && !ability.can('read', 'Site')}
            >
              {t('cancelButton')}
            </Button>
          )
        : currentViewer === 'files'
          ? (
              <DatatableFileAdder />
            )
          : currentViewer === 'buildings'
            ? (
                <>
                  <Button
                    variant="default"
                    onClick={() => setAddBuildingOpen(true)}
                    disabled={!ability.can('create', 'Building')}
                  >
                    <LR.CirclePlus />
                    {t('addBuilding')}
                  </Button>
                  <AddBuilding
                    newBuildingFields={newBuildingFields}
                    setNewBuildingFields={setNewBuildingFields}
                    open={addBuildingOpen}
                    onOpenChange={setAddBuildingOpen}
                  />
                  <BuildingMoreOptions buildings={filteredData as Building[]} variant="outline" />
                </>
              )
            : currentViewer === 'sites'
              ? (
                  <AddSite
                    newItemName={newItemName}
                    setNewItemName={setNewItemName}
                  />
                )
              : currentViewer === 'infrastructure'
                ? (
                  <AddInfrastructure
                    newInfrastructureFields={newInfrastructureFields}
                    setNewInfrastructureFields={setNewInfrastructureFields}
                    open={addInfrastructureOpen}
                    onOpenChange={setAddInfrastructureOpen}
                  />
                  )
              : currentViewer === 'users'
                ? (
                    <>
                      <Button
                        variant="default"
                        onClick={() => setAddUserOpen(true)}
                        disabled={!ability.can('create', 'User')}
                      >
                        <LR.CirclePlus />
                        {t('addUser')}
                      </Button>
                      <AddUser open={addUserOpen} onOpenChange={setAddUserOpen} />
                      <UserMoreOptions users={users} variant="outline" />
                    </>
                  )
                : null}

      {/* Compare Button/Dialog */}
      {comparing
        ? (
            <CompareDialog
              toggleOpen={toggleOpen}
              compareItems={compareItems}
              setCompareItems={setCompareItems || (() => {})}
              handleAddBuilding={handleAddBuilding}
            />
          )
        : (
            <Button
              variant="secondary"
              className={`max-sm:hidden ${(currentViewer === ViewerNames.files || currentViewer === ViewerNames.extensions || currentViewer === ViewerNames.users) ? 'hidden' : ''}`}
              onClick={() => setComparing(true)}
            >
              <LR.GitCompare />
              {t('compare')}
              {' '}
              {headerTitle}
            </Button>
          )}
      {(currentViewer === 'buildings' || currentViewer === 'sites') && filteredData && (
        <Button
          variant="outline"
          onClick={handleViewAllOnMap}
          disabled={filteredData.length === 0 || currentViewer === 'buildings' &&!ability.can('read', 'Building') || currentViewer === 'sites' && !ability.can('read', 'Site')}
        >
          <LR.Map className="" />
          {t('viewButton')}
        </Button>
      )}
    </div>
  )
}