'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'

import { useUpdateFile } from '../../../../../hooks/files/files'
import { BimContext } from '../../../../../store/BIM/context'
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
  const updateFileById = useUpdateFile()
  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)

  const [busy, setBusy] = React.useState(false)
  // Keyed per cloud, or a second conversion adopts the first's task and strands its toast.
  const tasksRef = React.useRef(new Map<string, string>())
  const closeWatchRef = React.useRef(new Map<string, () => void>())

  // Read through a ref so a stale closure in `convert` cannot toggle against an old list.
  const pointCloudIdsRef = React.useRef(bimState.bim.pointCloudIds)
  pointCloudIdsRef.current = bimState.bim.pointCloudIds

  // The names are only read when an upload starts, so a ref keeps `upload` stable.
  const namesRef = React.useRef(existingNames)
  namesRef.current = existingNames

  const refreshFiles = React.useCallback(() => {
    void mutate(['filesByBuilding', buildingId, ''])
  }, [buildingId])

  const convert = React.useCallback(async (pointCloudId: string | number, name: string) => {
    const key = String(pointCloudId)
    const id = tasksRef.current.get(key)
      ?? beginTask({ name, fileType: 'point-cloud-file', phase: 'converting', label: labelFor('converting', name), progress: 0 })
    tasksRef.current.set(key, id)
    updateTask(id, { phase: 'converting', label: labelFor('converting', name), progress: 0 })
    setBusy(true)
    refreshFiles()

    const stop = () => { endTask(id); tasksRef.current.delete(key); setBusy(false) }
    const finish = () => { stop(); refreshFiles() }

    try {
      const { jobId } = await startConversion(apiBase, pointCloudId)
      closeWatchRef.current.get(key)?.()
      closeWatchRef.current.set(key, watchConversion(apiBase, jobId, {
        onProgress: (event) => {
          if (typeof event.progress !== 'number') return
          updateTask(id, { progress: event.progress })
        },
        onFinished: () => {
          stop()
          void updateFileById(Number(pointCloudId), { isVisible: true }).catch(() => undefined).finally(refreshFiles)
          const id = String(pointCloudId)
          if (!pointCloudIdsRef.current.includes(id)) {
            bimDispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: id } })
          }
          toast.success(t('conversionFinished', { name }))
        },
        onFailed: (reason) => { finish(); toast.error(t('conversionFailed', { name, error: reason })) },
      }))
    }
    catch (error) {
      finish()
      toast.error(t('conversionFailed', { name, error: error instanceof Error ? error.message : String(error) }))
    }
  }, [apiBase, labelFor, refreshFiles, t, updateFileById, bimDispatch])

  const upload = React.useCallback(async (file: File) => {
    const extension = extensionOf(file.name)
    if (!isPointCloudExtension(extension)) {
      toast.error(t('unsupportedFormat'))
      return
    }

    const name = uniquePointCloudName(stripPointCloudExtension(file.name), namesRef.current)
    const id = beginTask({ name, fileType: 'point-cloud-file', phase: 'uploading', label: labelFor('uploading', name), progress: 0 })
    setBusy(true)

    let created
    try {
      created = await createPointCloud(name, normalizePointCloudFormat(extension), buildingId)
      tasksRef.current.set(String(created.pointCloud.id), id)
      await uploadFileWithProgress(created.upload.uploadUrl, file, (progress) => {
        updateTask(id, { progress })
      })
    }
    catch (error) {
      endTask(id)
      if (created) tasksRef.current.delete(String(created.pointCloud.id))
      setBusy(false)
      refreshFiles()
      toast.error(t('uploadFailed', { error: error instanceof Error ? error.message : String(error) }))
      return
    }

    await convert(created.pointCloud.id, name)
  }, [buildingId, convert, labelFor, refreshFiles, t])

  return { upload, convert, busy }
}
