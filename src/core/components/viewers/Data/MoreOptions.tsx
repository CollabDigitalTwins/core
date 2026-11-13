"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import {
  MoreHorizontal,
  Map,
  Box,
  Trash2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button, LoadingSpinner } from '../../../components/ui/'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu'
import ExportData from '../../../components/ui/ExportData'
import { useDeleteSite } from '../../../hooks/sites/sites'
import { useUser } from '../../../hooks/users/users'
import { BuildingsContext, MenusContext, useMapSitesContext } from '../../../store'
import { usePermissions } from '../../../store'
import { ViewerNames } from '../../../types/'
import { buildingDisplayName } from '../../../utils/buildingDisplayName'
import { useBuildingFocus } from '../map/src/BuildingFocus/useBuildingFocus'
import { useShowSitesOnMap } from '../map/src/MapLayers/src/SiteLayer/useShowSitesOnMap'

import DeleteBuildingDialog from './buildingDetails/DeleteBuildingDialog'
import FileMoreOptions from './files/FileMoreOptions'

import type { DataTypes} from '../../../types/';
import type { Building, BuildingRemoval, Site, User } from '../../../types/dbTypes'
import type { FileRow } from '../../../types/files'

interface MoreOptionsProps {
  row: Building | Site | FileRow | Partial<User>
  dataType: DataTypes
  variant?: 'ghost' | 'outline' | 'default'
  setView?: React.Dispatch<React.SetStateAction<'table' | 'detail'>>
  hideViewOnMap?: boolean
  onDeleteUser?: () => void
}

export default function MoreOptions({ row, dataType, variant, setView, hideViewOnMap = false, onDeleteUser }: MoreOptionsProps) {
  const t = useTranslations('MoreOptions')
  const { ability } = usePermissions()

  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { dispatch: buildingsDispatch } = React.useContext(BuildingsContext)
  const { dispatch: mapSitesDispatch } = useMapSitesContext()
  const showSitesOnMap = useShowSitesOnMap()
  const { focus: focusBuildings, clear: clearBuildingFocus } = useBuildingFocus()

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false)
  const [isBuildingDialogOpen, setIsBuildingDialogOpen] = React.useState(false)

  const siteId = dataType === 'site' && row && 'id' in row ? row.id : undefined
  const { deleteSite, isMutating: isDeleting } = useDeleteSite(siteId)

  const userId = dataType === 'user' && row && 'id' in row && Number(row.id) > 0 ? String(row.id) : undefined
  const { deleteUser, isDeleting: isDeletingUser } = useUser(userId || '')

  const handleDeleteSite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!siteId) return
    try {
      await deleteSite(siteId)
      // Otherwise the deleted polygon lingers on the map and still opens the context menu.
      mapSitesDispatch({ type: 'HIDE_SITE', payload: { id: Number(siteId) } })
      toast.success("Site deleted successfully")
      setIsConfirmDialogOpen(false)
      setView('table')
    } catch (err) {
      console.error('Site deletion failed:', err)
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

  const handleBuildingRemoved = (result: BuildingRemoval) => {
    clearBuildingFocus()
    buildingsDispatch({ type: 'REMOVE-BUILDING', payload: { buildingId: result.buildingId } })
    setView?.('table')
  }

  const handleViewOnMap = async (row: Building | Site | FileRow | Partial<User>) => {
    if (dataType === 'site' && 'id' in row && row.id) {
      await showSitesOnMap([row as Site])
      return
    }

    if (
      dataType === 'building'
      && 'buildingLatitude' in row
      && 'buildingLongitude' in row
      && typeof row.buildingLatitude === 'number'
      && typeof row.buildingLongitude === 'number'
    ) {
      const building = row as Building
      focusBuildings([building], { name: buildingDisplayName(building) ?? 'Unnamed Building', fly: 'single' })
    }
  }

  const handleViewBIM = (row: Building | Site | FileRow | Partial<User>) => {
    buildingsDispatch({ type: 'SET-CURRENT-BUILDING', payload: { building: row as Building } })
    menusDispatch({ type: 'SET_VIEWER', payload: { currentViewer: ViewerNames.bim } })
  }

  if (dataType === 'file') {
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
              onClick={() => { void handleViewOnMap(row) }}
              disabled={dataType === 'building' && !ability.can('read', 'Building') || dataType === 'site' && !ability.can('read', 'Site')}
            >
              <Map />
              {t('viewMap')}
            </DropdownMenuItem>
          )}
          {dataType === 'building' && (
            <DropdownMenuItem
              onClick={() => handleViewBIM(row)}
              disabled={dataType === 'building' && !ability.can('read', 'Building')}
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
              disabled={dataType === 'site' && !ability.can('update', 'Site') ||isDeleting}
            >
              <Trash2 />
              {t('deleteSite')}
              {isDeleting && <LoadingSpinner />}
            </DropdownMenuItem>
          )}
          {dataType === 'building' && ability.can('delete', 'Building') && (
            <DropdownMenuItem onClick={() => setIsBuildingDialogOpen(true)}>
              <Trash2 />
              {t('deleteBuilding')}
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
      {dataType === 'building' && (
        <DeleteBuildingDialog
          building={row as Building}
          open={isBuildingDialogOpen}
          onOpenChange={setIsBuildingDialogOpen}
          onRemoved={handleBuildingRemoved}
        />
      )}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        isDeleting={dataType === 'site' ? isDeleting : isDeletingUser}
        onOpenChange={setIsConfirmDialogOpen}
        handleConfirm={e => void (dataType === 'site' ? handleDeleteSite(e) : handleDeleteUser(e))}
        itemName={dataType === 'site' ? (row as Site).siteName : dataType === 'user' ? (row as User).name : undefined}
        dataType={dataType === 'site' ? 'site' : dataType === 'user' ? 'user' : undefined}
      />
    </>
  )
}
