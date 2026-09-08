'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { useDeleteFile } from '../../../../../../../../hooks/files/files'
import { BimContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FileItemComponent, useFileActions, useFileDeleteHandler } from '../../../../../../../ui/FilesManager'
import { PlacementEditor } from '../../../../Placement/PlacementEditor'
import { usePointCloudTarget } from '../../../../Placement/targets/usePointCloudTarget'
import { BimPointClouds } from '../../../../PointClouds'
import { selectPointCloudFiles } from '../../../../PointClouds/pointCloudFiles'
import { useBimPointCloudOpacity } from '../../../../PointClouds/useBimPointCloudOpacity'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileAction } from '../../../../../../../../types/global'

/** Same set the BIM models offer. No download — a scan is not handed out to viewers. */
const OPTIONS: FileAction[] = ['view', 'ghost', 'move', 'info', 'delete']

const TOAST_ID = 'bim-pointcloud-placement-toast'

interface PointCloudsSectionProps {
  files: DbFile[]
  query?: string
  buildingId: number
}

export function PointCloudsSection({ files, query = '', buildingId }: PointCloudsSectionProps) {
  const t = useTranslations('PointCloudManagement')
  const tAlign = useTranslations('Placement')

  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, pointCloudIds } = state.bim

  const { isGhosted, setGhosted } = useBimPointCloudOpacity()
  const { deleteFile } = useDeleteFile(buildingId)
  const { handleDeleteFile } = useFileDeleteHandler({ deleteFile })

  const { targetFor, clearMoving } = usePointCloudTarget()

  const clouds = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return selectPointCloudFiles(files)
      .filter((file) => !needle || file.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [files, query])

  const [items, setItems] = React.useState<(DbFile & { isVisible?: boolean })[]>([])
  React.useEffect(() => {
    setItems(clouds.map((file) => ({ ...file, isVisible: pointCloudIds.includes(String(file.id)) })))
  }, [clouds, pointCloudIds])

  // Ghost is read back from the component, so the row and the settings slider cannot drift apart.
  const rows = React.useMemo(
    () => items.map((file) => ({ ...file, isGhost: isGhosted(String(file.id)) })),
    [items, isGhosted],
  )

  const toggle = React.useCallback((file: DbFile) => {
    dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: String(file.id) } })
  }, [dispatch])

  const ghost = React.useCallback((file: DbFile, ghosted: boolean) => {
    setGhosted(String(file.id), ghosted)
  }, [setGhosted])

  // Switching a cloud on is async, so placement waits for it rather than failing silently.
  const editPosition = React.useCallback(async (file: DbFile) => {
    if (!bimComponents) return
    const id = String(file.id)

    const clouds = bimComponents.get(BimPointClouds)
    if (!clouds.get(id)) {
      dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: id } })
    }

    if (!await bimComponents.get(PlacementEditor).begin(targetFor(file, clouds))) return
    toast.info(tAlign('editHint'), { id: TOAST_ID, duration: Infinity })
  }, [bimComponents, dispatch, tAlign, targetFor])

  const forget = React.useCallback((file: DbFile) => {
    const id = String(file.id)
    if (pointCloudIds.includes(id)) {
      dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: id } })
    }
  }, [dispatch, pointCloudIds])

  const { handleAction, deleteDialog } = useFileActions({
    files: items,
    setFiles: setItems,
    buildingId,
    handleDeleteFile,
    onView: toggle,
    shouldPersistVisibility: () => true,
    onGhost: ghost,
    onMove: (file) => { void editPosition(file) },
    onDelete: forget,
  })

  React.useEffect(() => {
    if (!bimComponents) return
    const editor = bimComponents.get(PlacementEditor)
    const dismissWhenDone = (session: unknown) => {
      if (session) return
      toast.dismiss(TOAST_ID)
      clearMoving()
    }

    editor.onChanged.add(dismissWhenDone)
    return () => {
      editor.onChanged.remove(dismissWhenDone)
      toast.dismiss(TOAST_ID)
    }
  }, [bimComponents, clearMoving])

  if (clouds.length === 0) return null

  return (
    <>
      <CollapsibleSection title={t('title')} icon={LR.Grip} itemCount={rows.length}>
        {rows.map((file) => (
          <FileItemComponent
            key={file.id}
            file={file}
            onAction={handleAction}
            options={OPTIONS}
            confirmDelete={false}
          />
        ))}
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
