'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as LR from 'lucide-react'
import { BuildingsContext, MenusContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { useTranslations } from 'next-intl'
import { useUploadFileToBuilding, useDeleteFile } from '../../../../../../../../hooks/files/files'
import { useFileUploadHandler, useFileDeleteHandler, FileItemComponent, useFileActions, useCommonFileUpload } from '../../../../../../../ui/FilesManager'
import { DbFile as IFile } from '../../../../../../../../types/dbTypes'

const PC_FILE_OPTIONS: import('../../../../../../../../types/global').FileAction[] = ['download', 'view', 'move', 'info', 'delete']

interface FilesSectionProps {
  files: IFile[]
}

export function FilesSection({ files }: FilesSectionProps) {
  // Translation
  const t = useTranslations('FileSelection')

  // Get Building context
  const { state: buildingsState } = React.useContext(BuildingsContext)
  const { building } = buildingsState.buildings
  const buildingId = building?.id || -1

  const { uploadFile } = useUploadFileToBuilding(buildingId)
  const { deleteFile } = useDeleteFile(buildingId)

  const { handleFileUpload } = useFileUploadHandler({
    buildingId,
    tag: 'point-cloud-file',
    uploadFile,
  })

  const { handleDeleteFile } = useFileDeleteHandler({
    deleteFile,
    onDeleteSuccess: () => {
      console.log('File deleted successfully')
    }
  })

  // Local state for file management with isVisible property
  const [localFiles, setLocalFiles] = React.useState<(IFile & { isVisible?: boolean })[]>(
    files.map(file => ({ ...file, isVisible: (file as any).isVisible ?? false })).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  )

  // Keep local list in sync with incoming props
  React.useEffect(() => {
    setLocalFiles(files.map(file => ({ ...file, isVisible: (file as any).isVisible ?? false })).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))
  }, [files])

  const handleViewFile = React.useCallback((file: IFile, newVisibility: boolean) => {
    console.log(`Point cloud file ${file.name} visibility toggled to ${newVisibility}`)
  }, [])

  // Use the common file actions hook
  const { handleAction, deleteDialog } = useFileActions({
    files: localFiles,
    setFiles: setLocalFiles,
    buildingId,
    handleDeleteFile,
    onView: handleViewFile,
  })

  // Use the common file upload hook
  const { handleAddFile } = useCommonFileUpload({
    buildingId,
    acceptedFileTypes: '*',
    handleFileUpload: async (domFile: globalThis.File) => {
      await handleFileUpload(domFile)
    },
    onUploadSuccess: () => {
      console.log('File uploaded successfully')
    },
    onUploadError: (error) => {
      console.error('Error uploading file:', error)
    }
  })

  return (
    <>
      <CollapsibleSection
        title={t('filesTitle')}
        icon={LR.FileText}
        className="h-1/2 overflow-y-auto"
        itemCount={localFiles.length}
        onAddItem={handleAddFile}
        addItemTitle={t('addFileTitle')}
      >
        <div className="space-y-1">
          {localFiles.map((item) => (
            <FileItemComponent
              key={item.id}
              file={item}
              onAction={handleAction}
              options={PC_FILE_OPTIONS}
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
    </>
  )
}
