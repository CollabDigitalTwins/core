'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useDeleteFile, useUploadFileToBuilding } from '../../../../../../../../hooks/files/files'
import { BimContext, BuildingsContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FileItemComponent, useFileActions, useFileDeleteHandler, ACCEPT_FOR_TYPE, EXTENSIONS_FOR_TYPE, UploadProgressBar, useUploadTasks } from '../../../../../../../ui/FilesManager'
import { useBimFileIntake } from '../../../../lib/useBimFileIntake'
import { BimPointClouds } from '../../../../PointClouds'

import { usePlaceableFileRows } from './usePlaceableFileRows'

import type { FileTabSectionChrome } from './sectionChrome'
import type { DbFile } from '../../../../../../../../types/dbTypes'
import type { FileAction } from '../../../../../../../../types/global'

const MODEL_OPTIONS: FileAction[] = ['download', 'view', 'move', 'info', 'delete']

const is3dFile = (extension?: string | null): boolean =>
  EXTENSIONS_FOR_TYPE['3d-file'].includes(extension?.toLowerCase() ?? '')

interface ModelsSectionProps extends FileTabSectionChrome {
  files: DbFile[]
  query?: string
}

export function ModelsSection({ files, query = '', ...chrome }: ModelsSectionProps) {
  const t = useTranslations('FileItemComponent')
  const tFiles = useTranslations('FileSelection')

  const { state: bimState } = React.useContext(BimContext)
  const { bimComponents } = bimState.bim
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const buildingId = buildingsState.buildings.building?.id

  const { uploadFile } = useUploadFileToBuilding(buildingId ?? 0)
  const { deleteFile } = useDeleteFile(buildingId)
  const { handleDeleteFile } = useFileDeleteHandler({ deleteFile })

  const { rows, setRows, toggleVisibility, handleMove, registry } = usePlaceableFileRows({
    files,
    buildingId,
    isPlaceable: is3dFile,
    placeHint: name => tFiles('placeHint', { name }),
  })

  const intake = useBimFileIntake({
    buildingId: buildingId ?? 0,
    apiBase: bimComponents?.get(BimPointClouds).apiBase ?? '',
    existingNames: files.map(file => file.name),
    uploadFile,
  })
  const tasks = useUploadTasks('models')

  const { handleAction, deleteDialog } = useFileActions({
    files: rows,
    setFiles: setRows,
    buildingId: buildingId ?? 0,
    handleDeleteFile,
    onView: toggleVisibility,
    shouldPersistVisibility: () => true,
    onMove: handleMove,
    onDelete: file => { registry?.remove(String(file.id)) },
  })

  const addModel = React.useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ACCEPT_FOR_TYPE['3d-file']
    input.addEventListener('change', () => {
      const picked = input.files?.[0]
      if (picked) void intake.submit(picked)
    })
    input.click()
  }, [intake])

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? rows.filter(file => file.name.toLowerCase().includes(needle)) : rows
  }, [rows, query])

  return (
    <>
      <CollapsibleSection
        title={t('modelsTitles')}
        icon={LR.FileAxis3d}
        className="min-h-0 overflow-y-auto"
        style={{ height: '100%', minHeight: 0 }}
        itemCount={filtered.length}
        onAddItem={addModel}
        addItemTitle={t('addModelTitle')}
        {...chrome}
      >
        {tasks.map(task => (
          <div key={task.id} className="px-2 py-1">
            <UploadProgressBar label={task.label} progress={task.progress} />
          </div>
        ))}
        <div className="space-y-1">
          {filtered.map(file => (
            <FileItemComponent
              key={file.id}
              file={file}
              onAction={handleAction}
              options={MODEL_OPTIONS}
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
