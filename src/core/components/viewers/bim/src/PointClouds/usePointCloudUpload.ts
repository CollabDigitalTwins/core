'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'

import { uploadFileWithProgress } from '../../../map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS'
import {
  createPointCloud,
  startConversion,
  watchConversion,
} from '../../../shared/pointcloud/pointCloudConversion'

import {
  isPointCloudExtension,
  stripPointCloudExtension,
  uniquePointCloudName,
} from './pointCloudFiles'

export type UploadPhase = 'idle' | 'uploading' | 'converting'

export interface PointCloudUploadState {
  phase: UploadPhase
  name: string
  progress: number
}

const IDLE: PointCloudUploadState = { phase: 'idle', name: '', progress: 0 }

interface UsePointCloudUploadOptions {
  apiBase: string
  buildingId: number
  existingNames: string[]
}

function extensionOf(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

export function usePointCloudUpload({ apiBase, buildingId, existingNames }: UsePointCloudUploadOptions) {
  const t = useTranslations('PointCloudManagement')

  const [state, setState] = React.useState<PointCloudUploadState>(IDLE)
  const closeWatchRef = React.useRef<(() => void) | null>(null)

  // The names are only read when an upload starts, so a ref keeps `upload` stable.
  const namesRef = React.useRef(existingNames)
  namesRef.current = existingNames

  const refreshFiles = React.useCallback(() => {
    void mutate(['filesByBuilding', buildingId, ''])
  }, [buildingId])

  React.useEffect(() => () => closeWatchRef.current?.(), [])

  const convert = React.useCallback(async (pointCloudId: string | number, name: string) => {
    setState({ phase: 'converting', name, progress: 0 })
    refreshFiles()

    try {
      const { jobId } = await startConversion(apiBase, pointCloudId)
      closeWatchRef.current?.()
      closeWatchRef.current = watchConversion(apiBase, jobId, {
        onProgress: (event) => {
          if (typeof event.progress !== 'number') return
          setState({ phase: 'converting', name, progress: event.progress })
        },
        onFinished: () => {
          setState(IDLE)
          refreshFiles()
          toast.success(t('conversionFinished', { name }))
        },
        onFailed: (reason) => {
          setState(IDLE)
          refreshFiles()
          toast.error(t('conversionFailed', { name, error: reason }))
        },
      })
    }
    catch (error) {
      setState(IDLE)
      refreshFiles()
      toast.error(t('conversionFailed', { name, error: error instanceof Error ? error.message : String(error) }))
    }
  }, [apiBase, refreshFiles, t])

  const upload = React.useCallback(async (file: File) => {
    const extension = extensionOf(file.name)
    if (!isPointCloudExtension(extension)) {
      toast.error(t('unsupportedFormat'))
      return
    }

    const name = uniquePointCloudName(stripPointCloudExtension(file.name), namesRef.current)
    setState({ phase: 'uploading', name, progress: 0 })

    let created
    try {
      created = await createPointCloud(name, extension, buildingId)
      await uploadFileWithProgress(created.upload.uploadUrl, file, (progress) => {
        setState({ phase: 'uploading', name, progress })
      })
    }
    catch (error) {
      setState(IDLE)
      refreshFiles()
      toast.error(t('uploadFailed', { error: error instanceof Error ? error.message : String(error) }))
      return
    }

    await convert(created.pointCloud.id, name)
  }, [buildingId, convert, refreshFiles, t])

  return { state, upload, convert, busy: state.phase !== 'idle' }
}
