'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'

import { beginTask, endTask, updateTask } from '../../../../ui/FilesManager/src/uploadProgress'
import { useUploadLabels } from '../../../../ui/FilesManager/src/UploadProgressBar'
import { uploadFileWithProgress } from '../../../map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS'
import {
  createPointCloud,
  startConversion,
  watchConversion,
} from '../../../shared/pointcloud/pointCloudConversion'

import {
  isPointCloudExtension,
  normalizePointCloudFormat,
  stripPointCloudExtension,
  uniquePointCloudName,
} from './pointCloudFiles'

interface UsePointCloudIntakeOptions {
  apiBase: string
  buildingId: number
  existingNames: string[]
}

function extensionOf(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.copc.laz')) return 'copc'
  const parts = lower.split('.')
  return parts.length > 1 ? parts.pop()! : ''
}

export function usePointCloudIntake({ apiBase, buildingId, existingNames }: UsePointCloudIntakeOptions) {
  const t = useTranslations('PointCloudManagement')
  const { labelFor } = useUploadLabels()

  const [busy, setBusy] = React.useState(false)
  const taskRef = React.useRef<string | null>(null)
  const closeWatchRef = React.useRef<(() => void) | null>(null)

  // The names are only read when an upload starts, so a ref keeps `upload` stable.
  const namesRef = React.useRef(existingNames)
  namesRef.current = existingNames

  const refreshFiles = React.useCallback(() => {
    void mutate(['filesByBuilding', buildingId, ''])
  }, [buildingId])

  const convert = React.useCallback(async (pointCloudId: string | number, name: string) => {
    const id = taskRef.current
      ?? beginTask({ name, fileType: 'point-cloud-file', phase: 'converting', label: labelFor('converting', name), progress: 0 })
    taskRef.current = id
    updateTask(id, { phase: 'converting', label: labelFor('converting', name), progress: 0 })
    setBusy(true)
    refreshFiles()

    const finish = () => { endTask(id); taskRef.current = null; setBusy(false); refreshFiles() }

    try {
      const { jobId } = await startConversion(apiBase, pointCloudId)
      closeWatchRef.current?.()
      closeWatchRef.current = watchConversion(apiBase, jobId, {
        onProgress: (event) => {
          if (typeof event.progress !== 'number') return
          updateTask(id, { progress: event.progress })
        },
        onFinished: () => { finish(); toast.success(t('conversionFinished', { name })) },
        onFailed: (reason) => { finish(); toast.error(t('conversionFailed', { name, error: reason })) },
      })
    }
    catch (error) {
      finish()
      toast.error(t('conversionFailed', { name, error: error instanceof Error ? error.message : String(error) }))
    }
  }, [apiBase, labelFor, refreshFiles, t])

  const upload = React.useCallback(async (file: File) => {
    const extension = extensionOf(file.name)
    if (!isPointCloudExtension(extension)) {
      toast.error(t('unsupportedFormat'))
      return
    }

    const name = uniquePointCloudName(stripPointCloudExtension(file.name), namesRef.current)
    const id = beginTask({ name, fileType: 'point-cloud-file', phase: 'uploading', label: labelFor('uploading', name), progress: 0 })
    taskRef.current = id
    setBusy(true)

    let created
    try {
      created = await createPointCloud(name, normalizePointCloudFormat(extension), buildingId)
      await uploadFileWithProgress(created.upload.uploadUrl, file, (progress) => {
        updateTask(id, { progress })
      })
    }
    catch (error) {
      endTask(id)
      taskRef.current = null
      setBusy(false)
      refreshFiles()
      toast.error(t('uploadFailed', { error: error instanceof Error ? error.message : String(error) }))
      return
    }

    await convert(created.pointCloud.id, name)
  }, [buildingId, convert, labelFor, refreshFiles, t])

  return { upload, convert, busy }
}
