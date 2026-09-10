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
import { FileItemComponent, useFileActions, useFileDeleteHandler, useFileVisibility, UploadProgressBar, useUploadTasks } from '../../../../../../../ui/FilesManager'
import { BIMManager } from '../../../../BIMManager'
import { GhostMode } from '../../../../GhostMode'
import { Highlighter } from '../../../../Highlighter'
import { applyModelPlacement } from '../../../../lib/applyModelPlacement'
import { useBimFileIntake } from '../../../../lib/useBimFileIntake'
import { LoadModels } from '../../../../LoadModels'
import { ModelManager } from '../../../../ModelManager'
import { PlacementEditor } from '../../../../Placement/PlacementEditor'
import { useModelTarget } from '../../../../Placement/targets/useModelTarget'
import { usePlacementSession } from '../../../../Placement/usePlacementSession'
import { BimPointClouds } from '../../../../PointClouds'
import { SpatialStructure } from '../../../../SpatialStructure'

import type { FileTabSectionChrome } from './sectionChrome'
import type { DbFile as DbFile } from '../../../../../../../../types/dbTypes'

const BIM_MODEL_OPTIONS: import('../../../../../../../../types/global').FileAction[] = ['view', 'ghost', 'move', 'info', 'delete']
const BIM_ACCEPT = '.ifc,.frag'

interface BimSectionProps extends FileTabSectionChrome {
  files: DbFile[]
  query?: string
}

export function BimSection({ files, query = '', ...chrome }: BimSectionProps) {
  const t = useTranslations('BimSection')

  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimComponents, fragments, modelUIState } = bimState.bim

  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { building } = buildingsState.buildings
  const buildingId = building?.id || 0

  const { uploadFile } = useUploadFileToBuilding(buildingId)
  const { deleteFile } = useDeleteFile(buildingId)
  const { setVisibleMany } = useFileVisibility(buildingId)

  const { handleDeleteFile } = useFileDeleteHandler({ deleteFile })

  const [loadedModels, setLoadedModels] = React.useState<(DbFile & { isVisible?: boolean })[]>(
    files.map(file => ({
      ...file,
      isVisible: modelUIState[file.id]?.isVisible ?? (file as any).isVisible ?? false,
      isGhost: modelUIState[file.id]?.isGhost ?? false,
    }))
  )

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

  const modelManager = React.useMemo(() => {
    if (!bimComponents) return null
    try {
      return bimComponents.get(ModelManager)
    }
    catch {
      return null
    }
  }, [bimComponents])

  const bimManager = React.useMemo(() => {
    if (!bimComponents) return null
    try {
      return bimComponents.get(BIMManager)
    }
    catch {
      return null
    }
  }, [bimComponents])

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

  const highlighter = React.useMemo(() => {
    if (!bimComponents) return null
    try {
      return bimComponents.get(Highlighter)
    }
    catch {
      return null
    }
  }, [bimComponents])

  const handleBimView = React.useCallback(async (file: DbFile, newVisibility: boolean) => {
    const isGhosted = modelUIState[file.id]?.isGhost ?? false

    if (highlighter) {
      if (!newVisibility || isGhosted) highlighter.disableModel(file.name)
      else highlighter.enableModel(file.name)
    }

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
    if (modelManager) {
      const modelIdStr = file.id.toString()
      modelManager.remove(modelIdStr)
    }

    if (fragments) {
      const fragModel = fragments.core.models.list.get(file.name)
      if (fragModel) {
        fragments.core.disposeModel(fragModel.modelId).catch((err: unknown) => {
          console.error(`Failed to dispose fragment model "${file.name}":`, err)
        })
        bimManager?.remove(file.name)
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

    if (highlighter) {
      const isVisible = modelUIState[file.id]?.isVisible ?? true
      if (ghostState || !isVisible) {
        highlighter.disableModel(file.name)
      } else {
        highlighter.enableModel(file.name)
      }
    }
  }, [fragments, ghostMode, bimDispatch, highlighter, modelUIState])

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

  const intake = useBimFileIntake({
    buildingId,
    apiBase: bimComponents?.get(BimPointClouds).apiBase ?? '',
    existingNames: files.map(file => file.name),
    uploadFile,
  })
  const tasks = useUploadTasks('bim')

  const addBim = React.useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = BIM_ACCEPT
    input.addEventListener('change', () => {
      const picked = input.files?.[0]
      if (picked) void intake.submit(picked)
    })
    input.click()
  }, [intake])

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
        title={t('title')}
        icon={LR.Box}
        className="min-h-0 overflow-y-auto"
        style={{ height: '100%', minHeight: 0 }}
        itemCount={filteredModels.length}
        onAddItem={addBim}
        addItemTitle={t('addTitle')}
        switchVariant={handleSwitchVariant()}
        {...chrome}
      >
        {tasks.map(task => (
          <div key={task.id} className="px-2 py-1">
            <UploadProgressBar label={task.label} progress={task.progress} />
          </div>
        ))}
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
