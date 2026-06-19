'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as LR from 'lucide-react'
import { BuildingsContext, FilesContext, MenusContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { useTranslations } from 'next-intl'
import { useFileDeleteHandler, FileItemComponent, useFileActions, useFileUploadWithProgress } from '../../../../../../../ui/FilesManager'
import { DbFile as IFile } from '../../../../../../../../types/dbTypes'
import { useDeleteFile } from '../../../../../../../../hooks/files/files'
import { mutate } from 'swr'
import { LoadingSpinner } from '../../../../../../../ui/LoadingSpinner'

// Hoisted out of the JSX so the array reference is stable across renders.
// Inline `options={['view','move','info','delete']}` gets a new array identity
// on every render, defeating React.memo on FileItemComponent.
const FILE_OPTIONS: import('../../../../../../../../types/global').FileAction[] = ['view', 'move', 'info', 'delete']

const shouldExcludeByTag = (tag?: string | null): boolean => {
  if (!tag) return false
  return tag === 'user' || tag === 'bim-file' || tag === 'fragment-file' || tag === 'bimModel'
}

const shouldExcludeByType = (type?: string | null): boolean => {
  if (!type) return false
  return type === 'bim-file'
}

interface FilesSectionProps {
  files: IFile[]
  query?: string
}

export function FilesSection({ files: _filesProp, query = '' }: FilesSectionProps) {
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

  const { handleAddFile, uploadState } = useFileUploadWithProgress({
    acceptedFileTypes: '*',
    onUploadSuccess: () => {
      console.log('File uploaded successfully')
      mutate(`/api/files`)
    },
    onUploadError: (error) => console.error('Error uploading file:', error),
  })

  const nonBimFiles = React.useMemo(() => {
    return files
      .filter(file => file.extension !== 'ifc' && file.extension !== 'frag')
      .filter(file => !shouldExcludeByTag(file.tag))
      .filter(file => !shouldExcludeByType((file as any).type))
      .map(file => ({ ...file, isVisible: mapFileIds.includes(file.id) }))
      .sort((a, b) => {
        const aOnMap = mapFileIds.includes(a.id)
        const bOnMap = mapFileIds.includes(b.id)
        if (aOnMap !== bOnMap) return aOnMap ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [files, mapFileIds])

  const [localFiles, setLocalFiles] = React.useState(nonBimFiles)

  React.useEffect(() => {
    setLocalFiles(nonBimFiles)
  }, [nonBimFiles])

  const handleMoveFile = React.useCallback((file: IFile) => {
    fileDispatch({ type: 'EDIT_FILE', payload: { file } })
  }, [fileDispatch])

  // useCallback so the onView prop identity stays stable across renders.
  // Otherwise useFileActions' internal useCallback dep on onView re-fires every
  // render, producing a new handleAction identity, which defeats React.memo on
  // FileItemComponent.
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
        title={t('filesTitle')}
        icon={LR.FileText}
        className="h-full min-h-0 flex flex-col"
        style={{ height: '100%', minHeight: 0 }}
        itemCount={filteredFiles.length}
        onAddItem={uploadState.uploading ? undefined : handleAddFile}
        addItemTitle={uploadState.uploading ? `${t('uploadingFile')} ${uploadState.progress}%` : t('addFileTitle')}
        switchVariant={handleSwitchVariant()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {uploadState.uploading && (
            <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <LoadingSpinner className="h-4 w-4" />
              <span>{t('uploadingFile')} {uploadState.progress}%</span>
            </div>
          )}
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
