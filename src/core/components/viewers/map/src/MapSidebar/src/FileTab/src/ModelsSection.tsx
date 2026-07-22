'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { mutate } from 'swr'

import { useDeleteFile } from '../../../../../../../../hooks/files/files'
import { BimContext, BuildingsContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useFileDeleteHandler, FileItemComponent, useFileActions, useFileUploadWithProgress } from '../../../../../../../ui/FilesManager'
import { LoadingSpinner } from '../../../../../../../ui/LoadingSpinner'
import { toggleBimToMap as dispatchToggleBimToMap } from '../../../../../utils/toggleBimToMap'

import type { DbFile as DbFile } from '../../../../../../../../types/dbTypes'


type FileAction = import('../../../../../../../../types/global').FileAction
const OPTIONS_ON_MAP: FileAction[] = ['download', 'view', 'move', 'info', 'delete']
const OPTIONS_OFF_MAP: FileAction[] = ['download', 'view', 'info', 'delete']

interface ModelsSectionProps {
  files: DbFile[]
  query?: string
}

export function ModelsSection({ files, query = '' }: ModelsSectionProps) {
  // Translation
  const t = useTranslations('FileItemComponent')

  // Get Map context for models added to map
  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimModelsAddedToMap } = bimState.bim

  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { buildings, building: currentBuilding } = buildingsState.buildings

  const { deleteFile } = useDeleteFile()

  // Use the reusable delete handler
  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,
  })

  // Use the new upload hook with progress
  const { handleAddFile, uploadState } = useFileUploadWithProgress({
    acceptedFileTypes: '.ifc,.frag',
    onUploadSuccess: () => {
      mutate(`/api/files`)
    },
    onUploadError: (error) => {
      console.error('Error uploading model:', error)
    }
  })

  // Filter and sort models: BIM files only, with models added to map at the top
  const sortedModels = React.useMemo(() => {
    const bimFiles = files.filter(file => file.extension === 'frag')

    return bimFiles
      .map(file => {
        const isAddedToMap = bimModelsAddedToMap.some(model => model.bimFile.id === file.id)
        return { ...file, isAddedToMap, isVisible: isAddedToMap }
      })
      .sort((a, b) => {
        // Models added to map come first
        if (a.isAddedToMap && !b.isAddedToMap) return -1
        if (!a.isAddedToMap && b.isAddedToMap) return 1
        return 0
      })
  }, [files, bimModelsAddedToMap])

  // Local state for file management
  const [loadedModels, setLoadedModels] = React.useState(sortedModels)

  // Keep local list in sync with sorted models
  React.useEffect(() => {
    setLoadedModels(sortedModels)
  }, [sortedModels])

  const handleToggleModelOnMap = React.useCallback((file: DbFile, isVisible: boolean) => {
    if (isVisible) {
      // Add model to map — reuse the same payload shape as the building popover
      const building = buildings.find(b => b.id === file.attachedFilesBuildingId) ?? currentBuilding ?? null
      dispatchToggleBimToMap(bimDispatch, file, building)
    } else {
      // Remove model from map
      bimDispatch({
        type: 'REMOVE_BIM_FROM_MAP',
        payload: { bimModelName: file.name },
      })
    }
  }, [bimDispatch, buildings])

  const handleMoveModel = React.useCallback((file: DbFile) => {
    const isOnMap = bimModelsAddedToMap.some(m => m.bimFile.id === file.id)
    if (!isOnMap) return
    bimDispatch({
      type: 'EDIT_BIM_MODEL_BY_NAME',
      payload: { editingBimModel: file.name },
    })
  }, [bimDispatch, bimModelsAddedToMap])

  const resolveBuildingForFile = React.useCallback(async (file: DbFile) => {
    const attachedBuildingId = file.attachedFilesBuildingId

    if (attachedBuildingId == null) {
      return currentBuilding ?? null
    }

    const cachedBuilding = buildings.find(building => building.id === attachedBuildingId) ?? null
    if (cachedBuilding?.buildingOsmId != null) {
      return cachedBuilding
    }

    try {
      const response = await fetch(`/api/buildings/${attachedBuildingId}`)
      if (!response.ok) {
        return cachedBuilding ?? currentBuilding ?? null
      }

      const data = await response.json() as { building?: typeof cachedBuilding }
      return data.building ?? cachedBuilding ?? currentBuilding ?? null
    }
    catch {
      return cachedBuilding ?? currentBuilding ?? null
    }
  }, [buildings, currentBuilding])

  const handleToggleModelOnMapAsync = React.useCallback(async (file: DbFile, isVisible: boolean) => {
    if (!isVisible) {
      bimDispatch({
        type: 'REMOVE_BIM_FROM_MAP',
        payload: { bimModelName: file.name },
      })
      return
    }

    const building = await resolveBuildingForFile(file)
    dispatchToggleBimToMap(bimDispatch, file, building)
  }, [bimDispatch, resolveBuildingForFile])

  // Use the common file actions hook
  const { handleAction, deleteDialog } = useFileActions({
    files: loadedModels,
    setFiles: setLoadedModels,
    buildingId: null,
    handleDeleteFile,
    onView: handleToggleModelOnMapAsync,
    onMove: handleMoveModel,
  })

  // Filter models based on search query — use sortedModels directly so the
  // sidebar always reflects the current BimContext state without waiting for
  // the loadedModels sync effect (which lags one render behind).
  const filteredModels = React.useMemo(() => {
    if (!query.trim()) return sortedModels
    return sortedModels.filter(file =>
      file.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [sortedModels, query])

  return (
    <div className="h-full min-h-0">
      <CollapsibleSection
        title={t('modelsTitles')}
        icon={LR.Box}
        className="h-full min-h-0 flex flex-col"
        style={{ height: '100%', minHeight: 0 }}
        itemCount={filteredModels.length}
        onAddItem={uploadState.uploading ? undefined : handleAddFile}
        addItemTitle={uploadState.uploading ? `${t('uploadingFile')} ${uploadState.progress}%` : t('addBimTitle')}
      >
        <div className="flex-1 min-h-0 overflow-y-scroll space-y-1">
          {uploadState.uploading && (
            <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <LoadingSpinner className="h-4 w-4" />
              <span>{t('uploadingFile')} {uploadState.progress}%</span>
            </div>
          )}
          {filteredModels.map((file) => (
            <div key={file.id}>
              <FileItemComponent
                file={file}
                onAction={handleAction}
                options={file.isAddedToMap ? OPTIONS_ON_MAP : OPTIONS_OFF_MAP}
                confirmDelete={false}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isDeleting={deleteDialog.isDeleting}
        onOpenChange={deleteDialog.onOpenChange}
        handleConfirm={deleteDialog.onConfirm}
        itemName={deleteDialog.itemName}
      />
    </div>
  )
}
