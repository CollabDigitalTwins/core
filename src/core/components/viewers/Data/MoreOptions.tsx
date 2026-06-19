"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import { BuildingsContext, DatasetsContext, MapContext, MenusContext } from '../../../store'

import type { Building, Site, User } from '../../../types/dbTypes'
import { usePermissions } from '../../../store'

// Shadcn Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu'
import { Button, LoadingSpinner } from '../../../components/ui/'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

// Icons
import {
  MoreHorizontal,
  Map,
  Box,
  Trash2,
} from 'lucide-react'

// Custom Components
import ExportData from '../../../components/ui/ExportData'
import FileMoreOptions from './files/FileMoreOptions'
import type { FileRow } from '../../../types/files'
import { MarkerManager } from '../map/utils/MarkerManager'
import { createBuildingsDataset } from '../map/src/MapLayers/src/BuildingLayers/src/databaseBuildings'
import type { Dataset } from '../../../types/datasetTypes'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { DataTypes, ViewerNames } from '../../../types/'
import { useDeleteSite } from '../../../hooks/sites/sites'
import { useUser } from '../../../hooks/users/users'
  

interface MoreOptionsProps {
  row: Building | Site | FileRow | Partial<User>
  dataType: DataTypes
  variant?: 'ghost' | 'outline' | 'default'
  setView?: React.Dispatch<React.SetStateAction<'table' | 'detail'>>
  hideViewOnMap?: boolean
  onDeleteUser?: () => void
}

export default function MoreOptions({ row, dataType, variant, setView, hideViewOnMap = false, onDeleteUser }: MoreOptionsProps) {
  // Translations
  const t = useTranslations('MoreOptions')
  // Permissions
  const { ability } = usePermissions()

  const { state: mapState } = React.useContext(MapContext)
  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { dispatch: datasetDispatch } = React.useContext(DatasetsContext)
  const { dispatch: buildingsDispatch } = React.useContext(BuildingsContext)

  // States
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false)

  const { map } = mapState.map

  const siteId = dataType === 'site' && row && 'id' in row ? row.id : undefined
  const { deleteSite, isMutating: isDeleting } = useDeleteSite(siteId)

  const userId = dataType === 'user' && row && 'id' in row && Number(row.id) > 0 ? String(row.id) : undefined
  const { deleteUser, isDeleting: isDeletingUser } = useUser(userId || '')

  const handleDeleteSite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!siteId) return
    try {
      await deleteSite(siteId)
      toast.success("Site deleted successfully")
      setIsConfirmDialogOpen(false)
      setView('table')
    } catch (err) {
      toast.error("Error deleting site")
    }
  }

  const handleDeleteUser = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId) return
    try {
      await deleteUser()
      toast.success(t('userDeleted'))
      setIsConfirmDialogOpen(false)
      setView('table')
      onDeleteUser?.()
    } catch (err) {
      console.error('Error deleting user:', err)
      toast.error(t('userDeleteFailed'))
    }
  }

  const handleViewOnMap = (row: Building | Site | FileRow | Partial<User>) => {
    let coordinates: [number, number]
    if (
      dataType === 'building'
      && 'buildingLatitude' in row
      && 'buildingLongitude' in row
      && typeof row.buildingLatitude === 'number'
      && typeof row.buildingLongitude === 'number'
    ) {
      const building = row as Building
      coordinates = [building.buildingLongitude, building.buildingLatitude]
      const name = building.buildingName || building.buildingAddress || 'Unnamed Building'

      // Create a dataset for the building
      const dataset: Dataset = createBuildingsDataset([building], name)

      // Add buildings as a dataset to the map state
      datasetDispatch({
        type: 'ADD_DATASET_TO_MAP',
        payload: { dataset },
      })
    }
    else if (
      dataType === 'site'
      && 'siteLatitude' in row
      && 'siteLongitude' in row
      && typeof row.siteLatitude === 'number'
      && typeof row.siteLongitude === 'number'
    ) {
      coordinates = [row.siteLongitude, row.siteLatitude]
    }
    else {
      // console.log('No coordinates available for the selected row.')
      return
    }

    // set the current viewer to map
    menusDispatch({
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.map },
    })
    // Fly to location on the map WIP
    const markerManager = new MarkerManager()

    if (coordinates) {
      // markerManager.create(coordinates, map)
      map.flyTo({
        center: coordinates,
        zoom: 18,
        duration: 1000,
      })
    }
    else {
      console.warn('No coordinates available for the selected row.')
    }
  }
  const handleViewBIM = (row: Building | Site | FileRow | Partial<User>) => {
    const building = row as Building
           buildingsDispatch({
        "type": "SET-CURRENT-BUILDING",
        "payload": { building },
      });
    // set the current viewer to map
    menusDispatch({
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.bim },
    })

  }

  if (dataType == 'file') {
    const fileRow = row as FileRow
    return (<FileMoreOptions file={fileRow} />)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant ? variant : 'ghost'}
            className="dropdown-menu-trigger"
            onClick={e => e.stopPropagation()}
            size="icon"
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!hideViewOnMap && (
            <DropdownMenuItem
              onClick={() => handleViewOnMap(row)}
              disabled={dataType == 'building' && !ability.can('read', 'Building') || dataType == 'site' && !ability.can('read', 'Site')}
            >
              <Map />
              {t('viewMap')}
            </DropdownMenuItem>
          )}
          {dataType === 'building' && (
            <DropdownMenuItem
              onClick={() => handleViewBIM(row)}
              disabled={dataType == 'building' && !ability.can('read', 'Building')}
            >
              <Box />
              {t('viewBIM')}
            </DropdownMenuItem>
          )}
          <ExportData
            data={
              dataType === 'building'
                ? [row as Building]
                : (dataType === 'site'
                    ? [row as Site]
                    : [row as FileRow])
            }
            variant="ghost"
            type={dataType}
            className="px-2 py-1.5 font-normal"
          />
          {dataType === 'site' && (
            <DropdownMenuItem
              onClick={() => setIsConfirmDialogOpen(true)}
              disabled={dataType == 'site' && !ability.can('update', 'Site') ||isDeleting}
            >
              <Trash2 />
              {t('deleteSite')}
              {isDeleting && <LoadingSpinner />}
            </DropdownMenuItem>
          )}
          {dataType === 'user' && ability.can('delete', 'User') &&(
            <DropdownMenuItem
              onClick={() => setIsConfirmDialogOpen(true)}
            >
              <Trash2 />
              {t('deleteUser')}
              {isDeletingUser && <LoadingSpinner />}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        isDeleting={dataType === 'site' ? isDeleting : isDeletingUser}
        onOpenChange={setIsConfirmDialogOpen}
        handleConfirm={dataType === 'site' ? handleDeleteSite : handleDeleteUser}
        itemName={dataType === 'site' ? (row as Site).siteName : dataType === 'user' ? (row as User).name : undefined}
        dataType={dataType === 'site' ? 'site' : dataType === 'user' ? 'user' : undefined}
      />
    </>
  )
}
