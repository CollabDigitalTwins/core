'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useDeleteFile } from '../../../../../../../../hooks/files/files'
import { BimContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { FileItemComponent, useFileActions, useFileDeleteHandler } from '../../../../../../../ui/FilesManager'
import { PlacementEditor } from '../../../../Placement/PlacementEditor'
import { useSplatTarget } from '../../../../Placement/targets/useSplatTarget'
import { useSceneUnload } from '../../../../Placement/useSceneUnload'
import { BimSplats } from '../../../../Splats'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileAction } from '../../../../../../../../types/global'

const SPLAT_OPTIONS: FileAction[] = ['download', 'view', 'ghost', 'move', 'info', 'delete']

const TOAST_ID = 'bim-splat-placement-toast'

interface SplatRowsProps {
  files: DbFile[]
  buildingId: number
}

/** The splat half of the Models section. Store-driven, so the scene and the rows cannot drift. */
export function SplatRows({ files, buildingId }: SplatRowsProps) {
  const tAlign = useTranslations('Placement')

  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, splatIds } = state.bim

  const { deleteFile } = useDeleteFile(buildingId)
  const { handleDeleteFile } = useFileDeleteHandler({ deleteFile })
  const { targetFor } = useSplatTarget()
  const unloadFromScene = useSceneUnload()

  const splats = React.useMemo(
    () => [...files].sort((a, b) => a.name.localeCompare(b.name)),
    [files],
  )

  const [items, setItems] = React.useState<(DbFile & { isVisible?: boolean })[]>([])
  React.useEffect(() => {
    setItems(splats.map((file) => ({ ...file, isVisible: splatIds.includes(String(file.id)) })))
  }, [splats, splatIds])

  // Ghost is read back from the component, so the row and the settings slider cannot drift apart.
  const rows = React.useMemo(() => {
    const component = bimComponents?.get(BimSplats)
    return items.map((file) => ({ ...file, isGhost: component?.isGhosted(String(file.id)) ?? false }))
  }, [items, bimComponents])

  const toggle = React.useCallback((file: DbFile) => {
    dispatch({ type: 'TOGGLE_SPLAT', payload: { splatId: String(file.id) } })
  }, [dispatch])

  const ghost = React.useCallback((file: DbFile, ghosted: boolean) => {
    bimComponents?.get(BimSplats).setGhosted(String(file.id), ghosted)
  }, [bimComponents])

  // Asks the store, not the registry: a splat switched on but still loading is already on.
  const editPosition = React.useCallback(async (file: DbFile) => {
    if (!bimComponents) return
    const id = String(file.id)

    const component = bimComponents.get(BimSplats)
    if (!splatIds.includes(id)) {
      dispatch({ type: 'TOGGLE_SPLAT', payload: { splatId: id } })
    }

    if (!await bimComponents.get(PlacementEditor).begin(targetFor(file, component))) return
    toast.info(tAlign('editHint'), { id: TOAST_ID, duration: Infinity })
  }, [bimComponents, dispatch, splatIds, tAlign, targetFor])

  const { handleAction, deleteDialog } = useFileActions({
    files: items,
    setFiles: setItems,
    buildingId,
    handleDeleteFile,
    onView: toggle,
    shouldPersistVisibility: () => true,
    onGhost: ghost,
    onMove: (file) => { void editPosition(file) },
    onDelete: file => unloadFromScene(file, 'splat'),
  })

  return (
    <>
      {rows.map((file) => (
        <FileItemComponent
          key={file.id}
          file={file}
          onAction={handleAction}
          options={SPLAT_OPTIONS}
          confirmDelete={false}
        />
      ))}

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
