"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as React from 'react'
import { FilesContext, MapContext, MenusContext } from '../../../../store'
import { useDeleteFile, useDownloadFile } from '../../../../hooks/files/files'
import { useFileDeleteHandler } from '../../../../components/ui/FilesManager/src/useFileDeleteHandler'
import type { FileRow } from '../../../../types/files'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../store'

// Shadcn Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../components/ui/DropdownMenu'
  import { Button, LoadingSpinner } from '../../../../components/ui/'
import ConfirmDialog from '../../../../components/ConfirmDialog'


// Icons
import * as LR from 'lucide-react'
import { ViewerNames } from '../../../../types/'

interface FileMoreOptionsProps {
  file: FileRow
  buildingId?: number // Add buildingId prop for proper revalidation
}

export default function FileMoreOptions({ file, buildingId }: FileMoreOptionsProps) {
  // Translations
  const t = useTranslations('FileMoreOptions')

  // Permissions
  const { ability } = usePermissions()

  const { dispatch: menusDispatch } = React.useContext(MenusContext)
  const { dispatch: fileDispatch } = React.useContext(FilesContext)
  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)

  // Use the delete hook from your useData file
  const { deleteFile, isMutating: isDeleting, deleteError } = useDeleteFile(buildingId)

  // Use the reusable delete handler
  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,
    onDeleteSuccess: () => setIsDeleteDialogOpen(false),
  })

  const { downloadFile, isDownloading, downloadError } = useDownloadFile()

  const { map } = mapState.map
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  const isMapFile = file?.metadata?.type == 'map-file'

  const handleViewOnMap = async (map: any) => {
    // set the current viewer to map
    // Fly to location on the map
    fileDispatch({ type: 'UNHIDE_FILE_BY_ID', payload: { id: file.metadata.id } })

    // Safely extract lng/lat if position is an object
    const position = file.metadata.position as { lng: number; lat: number } | undefined
    if (position && typeof position.lng === 'number' && typeof position.lat === 'number') {
      map.flyTo({
        center: [position.lng, position.lat],
        zoom: 18,
        speed: 10,
        curve: 1,
        essential: true,
      })
    } else {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    menusDispatch({
      type: 'SET_VIEWER',
      payload: { currentViewer: ViewerNames.map },
    })
  }

  const handleDeleteFileClick = async () => {
    await handleDeleteFile(file)
  }

  const handleDownloadFile = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    await downloadFile(file)

    if (downloadError) {
      toast.error(`${t('toastFailDown')} ${downloadError.message}`)
    }
    else if (!isDownloading) {
      toast.success(`${t('toastSuccessDown')} ${file.name || file.metadata?.name}`)
    }
  }

  if (isDeleting) {
    return (
      <div className="inline-flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg shadow-sm">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="dropdown-menu-trigger"
            onClick={(e) => { e.stopPropagation() }}
            size="icon"
          >
            <LR.MoreHorizontal />
            <span className="sr-only">{t('open')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isMapFile
            && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewOnMap(map)
                }}
              >
                <LR.Map />
                {t('view')}
              </DropdownMenuItem>
            )}

          <DropdownMenuItem
            onClick={handleDownloadFile}
            disabled={isDownloading}
          >
            {isDownloading
              ? (
                  <LoadingSpinner />
                )
              : (
                  <LR.Download />
                )}
            {isDownloading ? <LoadingSpinner /> : t('downloadFile')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDeleteDialogOpen(true)
            }}
            disabled={!ability.can('delete', 'File')}
          >
            <LR.Trash2 />
            {t('deleteFile')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separate AlertDialog outside of DropdownMenu */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        handleConfirm={handleDeleteFileClick}
        itemName={file?.name || file?.metadata?.name}
      />

    </>
  )
}
