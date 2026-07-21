'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { mutate } from 'swr'

import { uploadFileWithProgress } from '../../../viewers/map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS'

function getFileExtension(file: File): string {
  const parts = file.name.split('.')
  if (parts.length <= 1) return ''
  return parts.pop()!.toLowerCase()
}

export interface UseFileUploadWithProgressProps {
  acceptedFileTypes?: string
  onUploadSuccess?: () => void
  onUploadError?: (error: Error) => void
}

export interface UploadState {
  uploading: boolean
  progress: number
}

export function useFileUploadWithProgress({
  acceptedFileTypes = '*',
  onUploadSuccess,
  onUploadError
}: UseFileUploadWithProgressProps = {}) {

  const [uploadState, setUploadState] = React.useState<UploadState>({
    uploading: false,
    progress: 0
  })

  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const handleFileUpload = React.useCallback(async (file: File) => {
    setUploadState({ uploading: true, progress: 0 })

    try {
      // Generate a unique fileID for minio
      const fileId = crypto.randomUUID()

      // Get presigned upload URL for bucket
      const response = await fetch(`/api/presigned-url-upload?asset=${fileId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch presigned URL')
      }
      const { presignedUrl } = await response.json()

      // Upload file to bucket with progress tracking
      await uploadFileWithProgress(presignedUrl, file,
        (progress: number) => {
          setUploadState({ uploading: true, progress })
        },
      )

      // Create a new file object with the unique id
      const newFile = {
        type: 'system',
        name: file.name,
        url: '',
        mimeType: file.type,
        extension: getFileExtension(file),
        sizeBytes: file.size,
        uploadedAt: new Date(),
        description: '',
        assetId: fileId,
      }

      // Upload metadata to API
      const metadataResponse = await fetch('/api/files/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFile),
      })

      if (!metadataResponse.ok) {
        throw new Error(`Failed to upload file: ${metadataResponse.statusText}`)
      }

      console.log('File successfully uploaded to API')

      // Revalidate files list
      mutate(['files'])

      onUploadSuccess?.()
    } catch (error) {
      console.error('Error uploading file:', error)
      onUploadError?.(error as Error)
    } finally {
      setUploadState({ uploading: false, progress: 0 })
    }
  }, [onUploadSuccess, onUploadError])

  const handleAddFile = React.useCallback(() => {
    if (uploadState.uploading) return

    // Create or use existing file input element
    if (!inputRef.current) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = acceptedFileTypes
      input.style.display = 'none'

      input.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        await handleFileUpload(file)
      })

      inputRef.current = input
      document.body.appendChild(input)
    } else {
      inputRef.current.accept = acceptedFileTypes
    }

    inputRef.current.click()
  }, [acceptedFileTypes, handleFileUpload, uploadState.uploading])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (inputRef.current && document.body.contains(inputRef.current)) {
        document.body.removeChild(inputRef.current)
      }
    }
  }, [])

  return {
    handleAddFile,
    handleFileUpload,
    uploadState
  }
}
