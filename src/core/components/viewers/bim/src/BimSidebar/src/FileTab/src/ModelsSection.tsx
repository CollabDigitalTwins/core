'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { useTranslations } from 'next-intl'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import * as LR from 'lucide-react'
import { BimContext, BuildingsContext } from '../../../../../../../../store'
import { ModelManager } from '../../../../ModelManager'
import { BIMManager } from '../../../../BIMManager'
import { GhostMode } from '../../../../GhostMode'
import { GizmoController } from '../../../../../utils/GizmoController'
import { CurrentWorld } from '../../../../CurrentWorld'
import { Highlighter } from '../../../../Highlighter'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useUploadFileToBuilding, useDeleteFile, useFile } from '../../../../../../../../hooks/files/files'
import { useFileUploadHandler, useFileDeleteHandler, FileItemComponent, useFileActions, useCommonFileUpload } from '../../../../../../../ui/FilesManager'
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
      isVisible: modelUIState[file.id]?.isVisible ?? (file as any).isVisible,
      isGhost: modelUIState[file.id]?.isGhost ?? false,
    }))
  )

  // Keep local list in sync with incoming props and store UI state changes
  React.useEffect(() => {
    setLoadedModels(prev => {
      const prevMap = new Map(prev.map(f => [f.id, f as any]))
      return files.map(file => ({
        ...file,
        isVisible: modelUIState[file.id]?.isVisible ?? (file as any).isVisible,
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

  // Gizmo controllers keyed by model's file.name (one gizmo per model at most)
  const gizmoControllersRef = React.useRef<Map<string, GizmoController>>(new Map())

  // Track the file ID currently being repositioned so useFile can provide updateFile
  const [moveFileId, setMoveFileId] = React.useState<number | null>(null)
  const { updateFile } = useFile(moveFileId)
  const updateFileRef = React.useRef(updateFile)
  React.useEffect(() => { updateFileRef.current = updateFile }, [updateFile])

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
  const handleBimView = React.useCallback((file: DbFile, newVisibility: boolean) => {
    bimDispatch({ type: 'SET_MODEL_UI_STATE', payload: { fileId: file.id, isVisible: newVisibility } })

    // Disable highlighting for hidden models; re-enable only when visible and not ghosted
    if (highlighter) {
      const isGhosted = modelUIState[file.id]?.isGhost ?? false
      if (!newVisibility || isGhosted) {
        highlighter.disableModel(file.name)
      } else {
        highlighter.enableModel(file.name)
      }
    }

    // Non-fragment models (gltf/obj/fbx) managed by ModelManager
    if (modelManager) {
      const modelInfo = modelManager.getModel(file.id.toString())
      if (modelInfo) {
        modelInfo.model.visible = newVisibility
        if (fragments) fragments.core.update(true)
        return
      }
    }

    // Fragment (IFC/FRAG) models — look up directly from fragments list by file.name
    if (fragments) {
      const fragModel = fragments.core.models.list.get(file.name)
      if (fragModel) {
        fragModel.object.visible = newVisibility
        fragments.core.update(true)
      } else {
      }
    }
  }, [modelManager, fragments, highlighter, modelUIState])

  const handleBimDelete = React.useCallback((file: DbFile) => {
    // Remove from ModelManager if it exists (gltf/obj/fbx models)
    if (modelManager) {
      const modelIdStr = file.id.toString()
      const model = modelManager.getModel(modelIdStr)
      console.log('Attempting to remove model', model, modelIdStr)
      const success = modelManager.remove(modelIdStr)
      if (success) {
        console.log(`Model ${modelIdStr} removed from BIM scene`)
      }
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
      }
    }
  }, [modelManager, bimComponents, fragments, bimManager])

  const handleBimMove = React.useCallback((file: DbFile) => {
    if (!bimComponents || !fragments) return

    const world = bimComponents.get(CurrentWorld).world
    if (!world) return

    const fragModel = fragments.core.models.list.get(file.name)
    if (!fragModel) {
      console.warn(`[BimMove] Model not found: "${file.name}"`)
      return
    }

    const existing = gizmoControllersRef.current.get(file.name)
    if (existing) {
      // Toggle off: destroy the gizmo
      existing.dispose()
      gizmoControllersRef.current.delete(file.name)
      if (gizmoControllersRef.current.size === 0 && highlighter) highlighter.enabled = true
    } else {
      // Toggle on: create a new gizmo attached to the model's root object
      const gizmo = new GizmoController(world)
      const cleanupGizmo = (savePosition: boolean) => {
        if (savePosition) {
          const { x, y, z } = fragModel.object.position
          const rotation = fragModel.object.rotation.y
          updateFileRef.current({ x, y, z, rotation } as any)
            .catch((err: unknown) => console.error(`[BimMove] Failed to save position for "${file.name}":`, err))
          file.x = x
          file.y = y
          file.z = z
          file.rotation = rotation
        }
        gizmoControllersRef.current.delete(file.name)
        if (gizmoControllersRef.current.size === 0 && highlighter) highlighter.enabled = true
        setMoveFileId(null)
      }
      gizmo.onAccept = () => cleanupGizmo(true)
      gizmo.onCancel = () => cleanupGizmo(false)
      setMoveFileId(file.id)
      if (highlighter) highlighter.enabled = false
      gizmo.attach(fragModel.object)
      gizmoControllersRef.current.set(file.name, gizmo)
    }
  }, [bimComponents, fragments, highlighter])

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
    onDelete: handleBimDelete,
    onMove: handleBimMove,
    onGhost: handleBimGhost
  })

  // Use the common file upload hook
  const { handleAddFile } = useCommonFileUpload({
    buildingId,
    acceptedFileTypes: '.ifc,.frag',
    handleFileUpload,
    onUploadSuccess: () => {
      console.log('Model uploaded successfully')
    },
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
      setLoadedModels(prev => prev.map(f => ({ ...f, isVisible: checked })))
      // Toggle visibility in 3D scene for all models
      for (const file of loadedModels) {
        handleBimView(file, checked)
      }
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
