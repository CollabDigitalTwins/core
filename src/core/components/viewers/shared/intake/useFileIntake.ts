"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSession } from 'next-auth/react'
import * as React from 'react'
import { toast } from 'sonner'

import { typeOfFile } from '../../../ui/FilesManager/src/fileType'
import { beginTask, endTask, updateTask } from '../../../ui/FilesManager/src/uploadProgress'
import { useUploadLabels } from '../../../ui/FilesManager/src/UploadProgressBar'
import { uploadFile as performUploadFile } from '../../../ui/uploadFile'
import { placementPatch as splatPlacementPatch } from '../pointcloud/pointCloudPlacementStore'
import { DEFAULT_SPLAT_PLACEMENT } from '../splat/splatUpAxis'

import type { FileType } from '../../../ui/FilesManager/src/fileType'

/** Where a freshly uploaded file lands: scene metres in a 3D viewer, degrees on the map. */
export interface IntakePlacement {
  x?: number
  y?: number
  z?: number
  lat?: number
  lng?: number
  elevation?: number
  rotation?: number
  scale?: number
}

export interface FileIntakeOptions {
  /** Omitted for a map file that belongs to no building. */
  buildingId?: number
  existingNames: string[]
  uploadFile: (args: { fileData: unknown, buildingId?: number }) => Promise<unknown>
  /** The File record's `type`. Defaults to 'system'; a buildingless map file is a 'map-file'. */
  recordType?: string
  /** Point clouds convert through a service, so the viewer that renders them supplies the route. */
  uploadPointCloud?: (file: File) => Promise<void>
}

export interface IntakeResult {
  id?: number
}

const PLACED_BY_USER: readonly FileType[] = ['3d-file', 'cad-file', 'splat-file']

const recordIdOf = (result: unknown): number | undefined => {
  const first = Array.isArray(result) ? result[0] : result
  const envelope = first as { newFile?: { id?: number }, id?: number } | undefined
  return envelope?.newFile?.id ?? envelope?.id
}

/**
 * The one upload path for every viewer: convert if the kind needs it, report every phase through
 * the shared task store, then write the record with whatever columns the caller's placement uses.
 */
export function useFileIntake({
  buildingId,
  existingNames,
  uploadFile,
  recordType,
  uploadPointCloud,
}: FileIntakeOptions) {
  const { data: session } = useSession()
  const { labelFor } = useUploadLabels()

  // The names are only read when an upload starts, so a ref keeps `submit` stable.
  const namesRef = React.useRef(existingNames)
  namesRef.current = existingNames

  const needsPlacement = React.useCallback(
    (file: File) => PLACED_BY_USER.includes(typeOfFile(file)),
    [],
  )

  const submit = React.useCallback(async (file: File, at?: IntakePlacement): Promise<IntakeResult | null> => {
    const fileType = typeOfFile(file)

    if (fileType === 'point-cloud-file') {
      await uploadPointCloud?.(file)
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
        const { convertIfcToFragmentsFile } = await import('../../../ui/FilesManager/src/convertIfcToFragmentsFile')
        toUpload = await convertIfcToFragmentsFile(file, (progress) => {
          updateTask(taskId, { progress: Math.round(progress * 100) })
        })
      }

      updateTask(taskId, { phase: 'uploading', label: labelFor('uploading', name), progress: 0 })
      // A splat placed in scene space carries its transform in a blob; on the map it is geolocated.
      const splatInScene = fileType === 'splat-file' && at?.x !== undefined
      const result = await performUploadFile({
        file: toUpload,
        buildingId,
        tag: fileType === 'bim-file' ? 'bim-file' : 'file',
        recordType,
        isVisible: true,
        user: session?.user,
        uploadFile,
        x: at?.x,
        y: at?.y,
        z: at?.z,
        lat: at?.lat,
        lng: at?.lng,
        elevation: at?.elevation,
        rotation: at?.rotation,
        // A splat carries its scale inside the transform, so `File.scale` stays null for one.
        scale: fileType === 'splat-file' ? undefined : at?.scale,
        pointCloudTransform: splatInScene
          ? splatPlacementPatch({
            ...DEFAULT_SPLAT_PLACEMENT,
            position: [at!.x!, at!.y!, at!.z!],
            scale: at?.scale ?? DEFAULT_SPLAT_PLACEMENT.scale,
          }).pointCloudTransform
          : undefined,
        onProgress: progress => updateTask(taskId, { progress }),
        existingNames: namesRef.current,
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
  }, [buildingId, labelFor, recordType, session, uploadFile, uploadPointCloud])

  return { submit, needsPlacement }
}
