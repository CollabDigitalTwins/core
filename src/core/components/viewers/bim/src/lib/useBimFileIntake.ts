'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSession } from 'next-auth/react'
import * as React from 'react'
import { toast } from 'sonner'

import { typeOfFile } from '../../../../ui/FilesManager/src/fileType'
import { beginTask, endTask, updateTask } from '../../../../ui/FilesManager/src/uploadProgress'
import { useUploadLabels } from '../../../../ui/FilesManager/src/UploadProgressBar'
import { uploadFile as performUploadFile } from '../../../../ui/uploadFile'
import { usePointCloudIntake } from '../PointClouds/usePointCloudIntake'

import type { FileType } from '../../../../ui/FilesManager/src/fileType'
import type * as THREE from 'three'

export interface BimIntakeOptions {
  buildingId: number
  apiBase: string
  existingNames: string[]
  uploadFile: (args: { fileData: unknown, buildingId: number }) => Promise<unknown>
}

export interface IntakeResult {
  id?: number
}

const PLACED_BY_USER: readonly FileType[] = ['3d-file', 'cad-file']

const recordIdOf = (result: unknown): number | undefined => {
  const first = Array.isArray(result) ? result[0] : result
  const envelope = first as { newFile?: { id?: number }, id?: number } | undefined
  return envelope?.newFile?.id ?? envelope?.id
}

export function useBimFileIntake({ buildingId, apiBase, existingNames, uploadFile }: BimIntakeOptions) {
  const { data: session } = useSession()
  const { labelFor } = useUploadLabels()
  const pointClouds = usePointCloudIntake({ apiBase, buildingId, existingNames })

  const needsPlacement = React.useCallback(
    (file: File) => PLACED_BY_USER.includes(typeOfFile(file)),
    [],
  )

  const submit = React.useCallback(async (file: File, at?: THREE.Vector3): Promise<IntakeResult | null> => {
    const fileType = typeOfFile(file)

    if (fileType === 'point-cloud-file') {
      await pointClouds.upload(file)
      return null
    }

    const name = file.name
    const isIfc = fileType === 'bim-file' && /\.ifc$/i.test(file.name)
    const taskId = beginTask({
      name,
      fileType,
      phase: isIfc ? 'converting' : 'uploading',
      label: labelFor(isIfc ? 'converting' : 'uploading', name),
      progress: 0,
    })

    try {
      let toUpload = file
      if (isIfc) {
        const { convertIfcToFragmentsFile } = await import('../../../../ui/FilesManager/src/convertIfcToFragmentsFile')
        toUpload = await convertIfcToFragmentsFile(file, (progress) => {
          updateTask(taskId, { progress: Math.round(progress * 100) })
        })
      }

      updateTask(taskId, { phase: 'uploading', label: labelFor('uploading', name), progress: 0 })
      const result = await performUploadFile({
        file: toUpload,
        buildingId,
        tag: fileType === 'bim-file' ? 'bim-file' : 'file',
        isVisible: true,
        user: session?.user,
        uploadFile,
        x: at?.x,
        y: at?.y,
        z: at?.z,
        onProgress: progress => updateTask(taskId, { progress }),
      })

      return { id: recordIdOf(result) }
    }
    catch (error) {
      toast.error(`Failed to save "${name}"`, {
        description: error instanceof Error ? error.message : String(error),
      })
      return null
    }
    finally {
      endTask(taskId)
    }
  }, [buildingId, labelFor, pointClouds, session, uploadFile])

  return { submit, needsPlacement }
}
