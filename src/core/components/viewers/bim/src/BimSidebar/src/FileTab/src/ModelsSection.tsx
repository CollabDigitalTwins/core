'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useUploadFileToBuilding, useDeleteFile } from '../../../../../../../../hooks/files/files'
import { BimContext, BuildingsContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useFileUploadHandler, useFileDeleteHandler, FileItemComponent, useFileActions, useCommonFileUpload, useFileVisibility } from '../../../../../../../ui/FilesManager'
import { BIMManager } from '../../../../BIMManager'
import { CurrentWorld } from '../../../../CurrentWorld'
import { GhostMode } from '../../../../GhostMode'
import { Highlighter } from '../../../../Highlighter'
import { applyModelPlacement } from '../../../../lib/applyModelPlacement'
import { LoadModels } from '../../../../LoadModels'
import { ModelManager } from '../../../../ModelManager'
import { PlacementEditor } from '../../../../Placement/PlacementEditor'
import { useModelTarget } from '../../../../Placement/targets/useModelTarget'
import { usePlacementSession } from '../../../../Placement/usePlacementSession'
import { SpatialStructure } from '../../../../SpatialStructure'

import type { DbFile as DbFile } from '../../../../../../../../types/dbTypes'

const BIM_MODEL_OPTIONS: import('../../../../../../../../types/global').FileAction[] = ['view', 'ghost', 'move', 'info', 'delete']

interface ModelsSectionProps {
  files: DbFile[]
  query?: string
}

export function ModelsSection({ files, query = '' }: ModelsSectionProps) {
  // Translation
  const t = useTranslations('FileItemComponent')

  // Get BIM context
  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimComponents, fragments, modelId, modelUIState } = bimState.bim

  // Get Buildings context for buildingId
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { building } = buildingsState.buildings
  const buildingId = building?.id || 0

  // Upload file hook and session
  const { uploadFile } = useUploadFileToBuilding(buildingId)
  const { deleteFile } = useDeleteFile(buildingId)
  const { setVisibleMany } = useFileVisibility(buildingId)

  // Use the reusable upload handler
  const { handleFileUpload } = useFileUploadHandler({
    buildingId,
    tag: 'bim-file',
    isVisible: true,
    uploadFile,
  })

  // Use the reusable delete handler
  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,

  })

  // Local state for file management with isVisible property
  const [loadedModels, setLoadedModels] = React.useState<(DbFile & { isVisible?: boolean })[]>(
    files.map(file => ({
      ...file,
      isVisible: modelUIState[file.id]?.isVisible ?? (file as any).isVisible ?? false,
      isGhost: modelUIState[file.id]?.isGhost ?? false,
    }))
  )

  // Keep local list in sync with incoming props and store UI state changes
  React.useEffect(() => {
    setLoadedModels(prev => {
      const prevMap = new Map(prev.map(f => [f.id, f as any]))
      return files.map(file => ({
        ...file,
        isVisible: modelUIState[file.id]?.isVisible ?? (file as any).isVisible ?? false,
        isGhost: modelUIState[file.id]?.isGhost ?? prevMap.get(file.id)?.isGhost ?? false,
      }))
    })
  }, [files, modelUIState])

  // Get ModelManager from BIM components
  const modelManager = React.useMemo(() => {
    if (!bimComponents) return null
    try {
      return bimComponents.get(ModelManager)
    }
    catch {
      return null
    }
  }, [bimComponents])

  // Get BIMManager from BIM components
  const bimManager = React.useMemo(() => {
    if (!bimComponents) return null
    try {
      return bimComponents.get(BIMManager)
    }
    catch {
      return null
    }
  }, [bimComponents])

  // Get GhostMode from BIM components
  const ghostMode = React.useMemo(() => {
    if (!bimComponents) return null
    try {
      return bimComponents.get(GhostMode)
    }
    catch {
      return null
    }
  }, [bimComponents])

  const { targetFor, clearMoving } = useModelTarget()

  const placementSession = usePlacementSession()
  React.useEffect(() => { if (!placementSession) clearMoving() }, [placementSession, clearMoving])

  // Get Highlighter from BIM components
  const highlighter = React.useMemo(() => {
    if (!bimComponents) return null
    try {
      return bimComponents.get(Highlighter)
    }
    catch {
      return null
    }
  }, [bimComponents])

  // Custom handlers for BIM-specific actions (view and delete only - download uses default)
  const handleBimView = React.useCallback(async (file: DbFile, newVisibility: boolean) => {
    const isGhosted = modelUIState[file.id]?.isGhost ?? false

    if (highlighter) {
      if (!newVisibility || isGhosted) highlighter.disableModel(file.name)
      else highlighter.enableModel(file.name)
    }

    // Non-fragment models (gltf/obj/fbx) managed by ModelManager
    if (modelManager) {
      const modelInfo = modelManager.getModel(file.id.toString())
      if (modelInfo) {
        modelInfo.model.visible = newVisibility
        bimDispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: file.id, isVisible: newVisibility } })
        if (fragments) void fragments.core.update(true)
        return
      }
    }

    if (!bimComponents || !fragments) return
    const loadModels = bimComponents.get(LoadModels)

    if (!newVisibility) {
      bimDispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: file.id, isVisible: false, isGhost: false } })
      const ghosted = isGhosted ? fragments.core.models.list.get(file.name) : undefined
      if (ghosted) ghostMode?.setModelGhost(ghosted, false)
      bimManager?.remove(file.name)
      try {
        bimComponents.get(SpatialStructure).forgetModel(file.name)
      } catch {
        // The viewer may already be tearing down; nothing to forget then.
      }
      await loadModels.unload(file.name)
      void fragments.core.update(true)
      return
    }

    try {
      // A toggle must not reframe the scene the way a first load does.
      loadModels.sharing = true
      const model = fragments.core.models.list.get(file.name) ?? await loadModels.load(file.url, file.name)
      if (!model) throw new Error('the model could not be loaded')

      applyModelPlacement(model.object, file)
      model.object.visible = true
      void fragments.core.update(true)
      bimDispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: file.id, isVisible: true } })
      if (!isGhosted) highlighter?.enableModel(file.name)
    } catch (error) {
      console.error(`Could not show model "${file.name}":`, error)
      bimDispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: file.id, isVisible: false } })
    }
  }, [bimComponents, modelManager, fragments, highlighter, ghostMode, bimManager, bimDispatch, modelUIState])

  const handleBimDelete = React.useCallback((file: DbFile) => {
    // Remove from ModelManager if it exists (gltf/obj/fbx models)
    if (modelManager) {
      const modelIdStr = file.id.toString()
      modelManager.remove(modelIdStr)
    }

    // Remove fragment model from scene if it exists (ifc/frag models)
    if (fragments) {
      const fragModel = fragments.core.models.list.get(file.name)
      if (fragModel) {
        fragments.core.disposeModel(fragModel.modelId).catch((err: unknown) => {
          console.error(`Failed to dispose fragment model "${file.name}":`, err)
        })
        // Also clean up BIMManager tracking
        bimManager?.remove(file.name)
        // Drop the model's spatial tree too, otherwise the sidebar keeps
        // rendering it and pushing visibility changes at a disposed model.
        try {
          bimComponents?.get(SpatialStructure).clearForModel(file.name)
        } catch {
          // The viewer may already be tearing down; nothing to clean up then.
        }
      }
    }
  }, [modelManager, bimComponents, fragments, bimManager])

  const handleBimMove = React.useCallback((file: DbFile) => {
    if (!bimComponents || !fragments) return

    const editor = bimComponents.get(PlacementEditor)
    if (editor.activeId === String(file.id)) {
      editor.accept()
      return
    }

    if (!fragments.core.models.list.get(file.name)) {
      console.warn(`[BimMove] Model not found: "${file.name}"`)
      return
    }

    void editor.begin(targetFor(file, () => fragments.core.models.list.get(file.name)?.object ?? null))
  }, [bimComponents, fragments, targetFor])

  const handleBimGhost = React.useCallback((file: DbFile, ghostState: boolean) => {
    if (!fragments || !ghostMode) return

    const fragModel = fragments.core.models.list.get(file.name)
    if (!fragModel) {
      console.warn(`[BimGhost] Model not found: "${file.name}"`)
      return
    }

    ghostMode.setModelGhost(fragModel, ghostState)
    bimDispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: file.id, isGhost: ghostState } })

    // Disable highlighting for ghosted models; re-enable only when visible and not ghosted
    if (highlighter) {
      const isVisible = modelUIState[file.id]?.isVisible ?? true
      if (ghostState || !isVisible) {
        highlighter.disableModel(file.name)
      } else {
        highlighter.enableModel(file.name)
      }
    }
  }, [fragments, ghostMode, bimDispatch, highlighter, modelUIState])

  // Use the common file actions hook (no custom download handler - use default for all files)
  const { handleAction, deleteDialog } = useFileActions({
    files: loadedModels,
    setFiles: setLoadedModels,
    buildingId,
    handleDeleteFile,
    onView: handleBimView,
    shouldPersistVisibility: () => true,
    onDelete: handleBimDelete,
    onMove: handleBimMove,
    onGhost: handleBimGhost
  })

  // Use the common file upload hook
  const { handleAddFile } = useCommonFileUpload({
    buildingId,
    acceptedFileTypes: '.ifc,.frag',
    handleFileUpload,
    onUploadError: (error) => {
      console.error('Error uploading model:', error)
    }
  })

  // Filter models based on search query
  const filteredModels = React.useMemo(() => {
    if (!query.trim()) return loadedModels
    return loadedModels.filter(file =>
      file.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [loadedModels, query])

  const areAllHidden = loadedModels.every(f => !f.isVisible)

  const handleSwitchVariant = () => ({
    checked: !areAllHidden,
    onCheckedChange: (checked: boolean) => {
      const changing = loadedModels.filter(file => (file.isVisible ?? false) !== checked)
      if (changing.length === 0) return

      void (async () => {
        for (const file of changing) await handleBimView(file, checked)
        try {
          await setVisibleMany(changing, checked)
        } catch (error) {
          console.error('Could not save model visibility:', error)
        }
      })()
    },
  })

  return (
    <>
      <CollapsibleSection
        title={t('modelsTitles')}
        icon={LR.Box}
        className="max-h-40 overflow-y-auto"
        itemCount={filteredModels.length}
        onAddItem={handleAddFile}
        addItemTitle={t('addBimTitle')}
        switchVariant={handleSwitchVariant()}
      >
        <div className="space-y-1">
          {filteredModels.map((file) => (
            <FileItemComponent
              key={file.id}
              file={file}
              onAction={handleAction}
              options={BIM_MODEL_OPTIONS}
              confirmDelete={false}
            />
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
    </>
  )
}
