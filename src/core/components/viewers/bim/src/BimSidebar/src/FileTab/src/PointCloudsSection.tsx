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
import { Button } from '../../../../../../../ui/Button'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FileItemComponent, useFileActions, useFileDeleteHandler } from '../../../../../../../ui/FilesManager'
import { Progress } from '../../../../../../../ui/Progress'
import { PlacementEditor } from '../../../../Placement/PlacementEditor'
import { usePointCloudTarget } from '../../../../Placement/targets/usePointCloudTarget'
import { BimPointClouds } from '../../../../PointClouds'
import { POINT_CLOUD_ACCEPT, isRenderablePointCloud } from '../../../../PointClouds/pointCloudFiles'
import { useBimPointCloudOpacity } from '../../../../PointClouds/useBimPointCloudOpacity'
import { usePointCloudUpload } from '../../../../PointClouds/usePointCloudUpload'

import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileAction } from '../../../../../../../../types/global'

/** Same set the BIM models offer. No download — a scan is not handed out to viewers. */
const OPTIONS: FileAction[] = ['view', 'ghost', 'move', 'info', 'delete']

/** An unconverted cloud has nothing to stream, so it omits every action that renders it. */
const PENDING_OPTIONS: FileAction[] = ['info', 'delete']

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
    return files
      .filter((file) => !needle || file.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [files, query])

  const existingNames = React.useMemo(() => files.map((file) => file.name), [files])
  const apiBase = bimComponents?.get(BimPointClouds).apiBase ?? ''
  const { state: uploadState, upload, convert, busy } = usePointCloudUpload({
    apiBase,
    buildingId,
    existingNames,
  })

  const inputRef = React.useRef<HTMLInputElement | null>(null)

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

  const pickFile = React.useCallback(() => {
    if (busy) return
    inputRef.current?.click()
  }, [busy])

  const onFilePicked = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Clearing lets the same file be picked again after a failure.
    event.target.value = ''
    if (file) void upload(file)
  }, [upload])

  // An upload that died leaves a row with no object behind it; drop it and re-pick.
  const retryUpload = React.useCallback(async (file: DbFile) => {
    try {
      await handleDeleteFile(file)
    }
    catch (error) {
      toast.error(t('uploadFailed', { error: error instanceof Error ? error.message : String(error) }))
      return
    }
    pickFile()
  }, [handleDeleteFile, pickFile, t])

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

  return (
    <>
      <CollapsibleSection
        title={t('title')}
        icon={LR.Grip}
        itemCount={rows.length}
        onAddItem={pickFile}
        addItemTitle={t('uploadTitle')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={POINT_CLOUD_ACCEPT}
          onChange={onFilePicked}
          className="hidden"
        />

        {uploadState.phase !== 'idle' && (
          <div className="px-2 py-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">
                {uploadState.phase === 'uploading'
                  ? t('uploadingFile', { name: uploadState.name })
                  : t('convertingFile', { name: uploadState.name })}
              </span>
              <span className="tabular-nums">{uploadState.progress}%</span>
            </div>
            <Progress value={uploadState.progress} />
          </div>
        )}

        {rows.length === 0 && uploadState.phase === 'idle' && (
          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
            {t('noPointClouds')}
          </div>
        )}

        {rows.map((file) => (
          <div key={file.id} className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <FileItemComponent
                file={file}
                onAction={handleAction}
                options={isRenderablePointCloud(file) ? OPTIONS : PENDING_OPTIONS}
                confirmDelete={false}
              />
            </div>
            {Boolean(file.pointCloudUploaded) && !isRenderablePointCloud(file) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                disabled={busy}
                onClick={() => void convert(file.id, file.name)}
                title={t('convertTitle')}
              >
                <LR.RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {!file.pointCloudUploaded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                disabled={busy}
                onClick={() => void retryUpload(file)}
                title={t('retryUploadTitle')}
              >
                <LR.UploadCloud className="h-3 w-3" />
              </Button>
            )}
          </div>
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
