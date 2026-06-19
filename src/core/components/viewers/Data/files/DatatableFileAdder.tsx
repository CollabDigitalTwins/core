"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { usePermissions } from '../../../../store'

import { Button, LoadingSpinner } from '../../../../components/ui/'
import * as LR from 'lucide-react'
import { useFileUploadWithProgress } from '../../../../components/ui/FilesManager'

import { toast } from 'sonner'

export default function DatatableFileAdder() {

  // Translations
  const t = useTranslations('HeadDatatableFileAddererButtons')

  // Permissions
  const { ability } = usePermissions()

  // Use the reusable upload hook with progress
  const { handleAddFile, uploadState } = useFileUploadWithProgress({
    acceptedFileTypes: '*',
    onUploadSuccess: () => {
      console.log('File successfully uploaded to API')
      toast.success(t('uploadSuccess'))
    },
    onUploadError: (error) => {
      console.error('Error uploading file:', error)
      toast.error(error.message)
    }
  })

  return (
    <div className="inline-block">
      <Button 
        variant="default" 
        onClick={handleAddFile}
        disabled={!ability.can('create', 'File') || uploadState.uploading}
      >
        {uploadState.uploading
          ? (
              <LoadingSpinner />
            )
          : (
              <LR.CirclePlus className="mr-2" />
            )}
        {uploadState.uploading ? `${t('uploading')} ${uploadState.progress}%` : t('addFile')}
      </Button>
    </div>
  )
}
