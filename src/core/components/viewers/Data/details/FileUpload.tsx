"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Icons
import { Download, FileIcon, FilePlus, Trash2, Upload } from 'lucide-react'
import { useSession } from 'next-auth/react'
// Dependencies
import { useTranslations } from 'next-intl'
import * as React from "react";
import { toast } from 'sonner'
import { mutate } from 'swr'

// Hooks
import { Button, Input, LoadingSpinner } from '../../../../components/ui/'
// Shadcn Components
import { Card, CardContent } from '../../../../components/ui/Card'
// Utils
import { useFileUploadHandler } from '../../../../components/ui/FilesManager/src/useFileUploadHandler'
import { useFilesByBuildingId, useUploadFileToBuilding } from '../../../../hooks/files/files'

type FileUploadProps = {
  value?: any[]
  property?: string
  tag?: string
  onChange?: (property: string, value: any) => void
  editing?: boolean
  buildingId?: number
  onFileUpload?: () => void
  buttonOnly?: boolean
  isFullWidthField?: boolean
}

function FileUpload({ value, property, tag, onChange, editing, buildingId, onFileUpload, buttonOnly = false, isFullWidthField }: FileUploadProps) {
  // Translations
  const t = useTranslations('FileUpload')

  const { data: session } = useSession()
  const user = session?.user

  // Use the upload hook
  const { uploadFile, isMutating: isUploading } = useUploadFileToBuilding(buildingId || 0)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { files: buildingFiles } = useFilesByBuildingId(buildingId || 0, tag)

  // Use the reusable upload handler
  const { handleFileUpload, handleInputFileChange } = useFileUploadHandler({
    buildingId: buildingId || 0,
    tag,
    uploadFile,
    onFileUpload,
  })

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDeleteFile = async (fileToDelete: any, index: number) => {
    if (!buildingId)
      return

    try {
      // If it's a file object with an ID, delete
      if (fileToDelete?.id) {
        const response = await fetch(`/api/files/${fileToDelete.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete file')
        }
      }

      await mutate(`/api/files/building/${buildingId}${tag ? `?tag=${tag}` : ''}`)

      toast.success(t('toastSuccessDelFile'))
    }
    catch (error) {
      console.error('Delete error:', error)
      toast.error(t('toastErrDelFile'))
    }
  }

  const getFileDisplayData = (file: any) => {
    if (typeof file === 'string') {
      return { name: file, canDownload: false }
    }
    if (file && typeof file === 'object') {
      const fileName = file.name || file.fileName || file.originalName || 'Unknown File'

      const downloadUrl = file.url || (file.assetId ? `/api/files/download/${file.assetId}` : null)

      return {
        name: fileName,
        canDownload: !!downloadUrl,
        url: downloadUrl,
      }
    }
    return { name: 'Unknown File', canDownload: false }
  }

  // Force use value prop when available
  const relevantFiles = value && value.length > 0 ? value : []

  if (buttonOnly) {
    return (
      <>
        <Button
          variant="default"
          onClick={triggerFileUpload}
          disabled={isUploading}
        >
          {isUploading ? <LoadingSpinner /> : <FilePlus />}
          {t('add')}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={e => void handleInputFileChange(e)}
          multiple
        />
      </>
    )
  }

  return (
    // TODO: isFullWidthField currently has no effect — both branches of the old
    // ternary were 'w-1/2'. Decide whether the full-width case should be 'w-full'.
    <div className="flex flex-col gap-2 w-1/2">
      <div className="grid grid-cols-1 gap-2">
        {relevantFiles.length > 0 && relevantFiles.map((file, index) => {
          const fileData = getFileDisplayData(file)

          return (
            <Card key={file.id || index} className="p-0">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <FileIcon size={18} />
                  <span title={fileData.name}>{fileData.name}</span>
                </div>
                <div className="flex gap-1">
                  {fileData.canDownload && fileData.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(fileData.url, '_blank')}
                    >
                      <Download size={16} />
                    </Button>
                  )}
                  {editing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => { void handleDeleteFile(file, index) }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* File upload controls */}
      {editing && (
        <>
          {relevantFiles.length > 0
            ? (
                <div className="flex flex-row gap-2">
                  <Button
                    onClick={triggerFileUpload}
                    variant="outline"
                    className="flex gap-2"
                    disabled={isUploading}
                  >
                    {isUploading ? <Upload className="animate-spin" /> : <FilePlus />}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={e => { void handleFileUpload(e.target.files?.[0] || null) }}
                    multiple
                  />
                </div>
              )
            : (
                <div className="flex flex-col gap-2 ">
                  <Input
                    type="file"
                    onChange={e => void handleInputFileChange(e)}
                    multiple
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="text-sm text-muted-foreground">
                      <LoadingSpinner />
                    </div>
                  )}
                </div>
              )}
        </>
      )}
    </div>
  )
}

export default FileUpload