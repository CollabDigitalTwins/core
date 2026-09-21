'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { mutate } from 'swr'

import { useDeleteFile } from '../../../../../../../../hooks/files/files'
import { BuildingsContext, FilesContext, MenusContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { useFileDeleteHandler, FileItemComponent, useFileActions, useFileUploadWithProgress, UploadProgressBar, useUploadTasks } from '../../../../../../../ui/FilesManager'
import { partitionBySection } from '../../../../../../../ui/FilesManager/src/fileType'


import type { DbFile as IFile } from '../../../../../../../../types/dbTypes'
import type { FileSection } from '../../../../../../../ui/FilesManager/src/fileType'



// Hoisted so the array identity stays stable and React.memo on FileItemComponent still holds.
const FILE_OPTIONS: import('../../../../../../../../types/global').FileAction[] = ['view', 'move', 'info', 'delete']

const shouldExcludeByTag = (tag?: string | null): boolean => {
  if (!tag) return false
  return tag === 'user' || tag === 'bim-file' || tag === 'fragment-file' || tag === 'bimModel'
}

interface FilesSectionProps {
  files: IFile[]
  query?: string
  /** Which of the four sidebar buckets this instance shows. Defaults to the catch-all. */
  section?: FileSection
  title?: string
  icon?: LR.LucideIcon
  acceptedFileTypes?: string
}

export function FilesSection({
  files: _filesProp,
  query = '',
  section = 'files',
  title,
  icon,
  acceptedFileTypes = '*',
}: FilesSectionProps) {
  const t = useTranslations('FileSelection')

  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { state: fileState, dispatch: fileDispatch } = React.useContext(FilesContext)
  const files = fileState.files.files
  const { mapFileIds } = fileState.files
  const { building } = buildingsState.buildings
  const buildingId = building?.id || -1

  const { deleteFile: deleteFileApi } = useDeleteFile(buildingId)

  // Wrap so the store is updated immediately alongside the API call
  const deleteFile = React.useCallback(async (fileId: number) => {
    fileDispatch({ type: 'REMOVE_FILE', payload: { id: fileId } })
    await deleteFileApi(fileId)
  }, [deleteFileApi, fileDispatch])

  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,
    onDeleteSuccess: () => {},
  })

  const tasks = useUploadTasks(section)
  const { handleAddFile, uploadState } = useFileUploadWithProgress({
    acceptedFileTypes,
    existingNames: files.map((file: IFile) => file.name),
    onUploadSuccess: () => {
      void mutate(`/api/files`)
    },
    onUploadError: (error) => console.error('Error uploading file:', error),
  })

  const nonBimFiles = React.useMemo(() => {
    const eligible = files.filter(file => !shouldExcludeByTag(file.tag))
    return partitionBySection(eligible)[section]
      .map(file => ({ ...file, isVisible: mapFileIds.includes(file.id) }))
      .sort((a, b) => {
        const aOnMap = mapFileIds.includes(a.id)
        const bOnMap = mapFileIds.includes(b.id)
        if (aOnMap !== bOnMap) return aOnMap ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [files, mapFileIds, section])

  const [localFiles, setLocalFiles] = React.useState(nonBimFiles)

  React.useEffect(() => {
    setLocalFiles(nonBimFiles)
  }, [nonBimFiles])

  const handleMoveFile = React.useCallback((file: IFile) => {
    fileDispatch({ type: 'EDIT_FILE', payload: { file } })
  }, [fileDispatch])

  // A stable identity here is what keeps React.memo on FileItemComponent effective.
  const handleViewFile = React.useCallback((file: IFile, newVisibility: boolean) => {
    fileDispatch({
      type: newVisibility ? 'ADD_TO_MAP' : 'REMOVE_FROM_MAP',
      payload: { id: file.id },
    })
  }, [fileDispatch])

  const { handleAction, deleteDialog } = useFileActions({
    files: localFiles,
    setFiles: setLocalFiles,
    buildingId,
    handleDeleteFile,
    onView: handleViewFile,
    onMove: handleMoveFile,
  })

  const areAllMapFilesHidden = React.useMemo(
    () => nonBimFiles.every(file => !mapFileIds.includes(file.id)),
    [nonBimFiles, mapFileIds]
  )

  const filteredFiles = React.useMemo(() => {
    if (!query.trim()) return nonBimFiles
    return nonBimFiles.filter(file =>
      file.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [nonBimFiles, query])

  const handleSwitchVariant = () => ({
    checked: !areAllMapFilesHidden,
    onCheckedChange: (checked: boolean) => {
      if (checked) {
        fileDispatch({ type: 'ADD_ALL_TO_MAP', payload: { ids: nonBimFiles.map(f => f.id) } })
      }
      else {
        fileDispatch({ type: 'REMOVE_ALL_FROM_MAP' } as never)
      }
    },
  })

  return (
    <div className="h-full min-h-0">
      <CollapsibleSection
        title={title ?? t('filesTitle')}
        icon={icon ?? LR.FileText}
        className="h-full min-h-0 flex flex-col"
        style={{ height: '100%', minHeight: 0 }}
        itemCount={filteredFiles.length}
        onAddItem={uploadState.uploading ? undefined : handleAddFile}
        addItemTitle={uploadState.uploading ? `${t('uploadingFile')} ${uploadState.progress}%` : t('addFileTitle')}
        switchVariant={handleSwitchVariant()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {tasks.map(task => (
            <div key={task.id} className="px-2 py-1">
              <UploadProgressBar label={task.label} progress={task.progress} />
            </div>
          ))}
          {filteredFiles.map((item) => (
            <FileItemComponent
              key={item.id}
              file={item}
              onAction={handleAction}
              options={FILE_OPTIONS}
              translationKey="FileSelection"
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
    </div>
  )
}
