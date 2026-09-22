"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { mutate } from 'swr'

import { useFileIntake } from '../../../viewers/shared/intake/useFileIntake'

import { useUploadTasks } from './uploadProgress'

export interface UseFileUploadWithProgressProps {
  acceptedFileTypes?: string
  onUploadSuccess?: () => void
  onUploadError?: (error: Error) => void
  /** Names already taken, so a clash is stored with a numeric suffix rather than shadowing. */
  existingNames?: string[]
}

export interface UploadState {
  uploading: boolean
  progress: number
}

const IDLE: UploadState = { uploading: false, progress: 0 }

/**
 * The sidebar's add-file button, on the shared intake: one task store drives the toast, the
 * section's progress bar and the marker ring, so no surface tracks progress of its own.
 */
export function useFileUploadWithProgress({
  acceptedFileTypes = '*',
  onUploadSuccess,
  onUploadError,
  existingNames = [],
}: UseFileUploadWithProgressProps = {}) {
  const [pendingName, setPendingName] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const tasks = useUploadTasks()

  const createFile = React.useCallback(async ({ fileData }: { fileData: unknown }) => {
    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData),
    })
    if (!response.ok) throw new Error(`Failed to upload file: ${response.statusText}`)
    return response.json()
  }, [])

  const intake = useFileIntake({ existingNames, uploadFile: createFile })

  const uploadState: UploadState = React.useMemo(() => {
    if (!pendingName) return IDLE
    const task = tasks.find(item => item.name === pendingName)
    return { uploading: true, progress: task?.progress ?? 0 }
  }, [pendingName, tasks])

  const handleFileUpload = React.useCallback(async (file: File) => {
    setPendingName(file.name)
    try {
      const created = await intake.submit(file)
      if (!created) throw new Error(`Failed to upload file: ${file.name}`)
      void mutate(['files'])
      onUploadSuccess?.()
    }
    catch (error) {
      console.error('Error uploading file:', error)
      onUploadError?.(error as Error)
    }
    finally {
      setPendingName(null)
    }
  }, [intake, onUploadSuccess, onUploadError])

  const handleAddFile = React.useCallback(() => {
    if (pendingName) return

    if (!inputRef.current) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = acceptedFileTypes
      input.style.display = 'none'

      input.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        void handleFileUpload(file)
      })

      inputRef.current = input
      document.body.appendChild(input)
    }
    else {
      inputRef.current.accept = acceptedFileTypes
    }

    inputRef.current.click()
  }, [acceptedFileTypes, handleFileUpload, pendingName])

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
    uploadState,
  }
}
