'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { mutate } from 'swr'

export interface UseCommonFileUploadProps {
  buildingId: number
  acceptedFileTypes: string
  multiple?: boolean
  handleFileUpload: (file: globalThis.File) => Promise<void>
  onUploadSuccess?: () => void
  onUploadError?: (error: Error) => void
}

export function useCommonFileUpload({
  buildingId,
  acceptedFileTypes,
  multiple = false,
  handleFileUpload,
  onUploadSuccess,
  onUploadError
}: UseCommonFileUploadProps) {
  
  const handleAddFile = React.useCallback(() => {
    // Create file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = acceptedFileTypes
    input.multiple = multiple

    input.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      try {
        // Handle single or multiple files
        if (multiple) {
          for (let i = 0; i < files.length; i++) {
            await handleFileUpload(files[i])
          }
        } else {
          await handleFileUpload(files[0])
        }

        // Revalidate files list so UI updates immediately
        if (buildingId) mutate(`/api/files/building/${buildingId}`)
        
        onUploadSuccess?.()
      } catch (error) {
        console.error('Error uploading file:', error)
        onUploadError?.(error as Error)
      }
    })

    input.click()
  }, [buildingId, acceptedFileTypes, multiple, handleFileUpload, onUploadSuccess, onUploadError])

  return { handleAddFile }
}
