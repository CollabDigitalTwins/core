// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { uniqueFileName } from '../../utils/uniqueFileName'
import { getFileExtension } from '../../utils/utils'
import { getAttachmentFieldName } from '../viewers/Data/details/getAttachmentFileName'
import { uploadFileWithProgress } from '../viewers/map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS'

import type { SourceUpAxis } from '../../types/dbTypes'

interface UploadFileArgs {
  // Support both single and multiple files; prefer `files` when passing many
  file?: File
  files?: File[]
  /** Omitted for a map file that belongs to no building. */
  buildingId?: number
  tag?: string
  user: any
  isVisible?: boolean
  uploadFile: (args: { fileData: any, buildingId?: number }) => Promise<any>
  position?: { lng?: number, lat?: number, rotation?: number, elevation?: number, isVisible?: boolean }
  x?: number
  y?: number
  z?: number
  lat?: number
  lng?: number
  elevation?: number
  rotation?: number
  scale?: number
  /** The File record's `type`. Defaults to 'system'; a buildingless map file is a 'map-file'. */
  recordType?: string
  onProgress?: (percent: number) => void
  existingNames?: string[]
  sourceUp?: SourceUpAxis
}

export async function uploadFile({
  file,
  files,
  buildingId,
  tag,
  isVisible,
  user,
  uploadFile,
  position,
  x,
  y,
  z,
  lat,
  lng,
  elevation,
  rotation,
  scale,
  recordType,
  onProgress,
  existingNames,
  sourceUp,
}: UploadFileArgs) {
  if (!file && (!files || files.length === 0)) return null

  const filesToProcess: File[] = files ?? (file ? [file] : [])

  const uploadResults: any[] = []
  const taken = new Set(existingNames ?? [])

  for (const currentFile of filesToProcess) {
    const fileId = crypto.randomUUID()
    const presignedResponse = await fetch(`/api/presigned-url-upload?asset=${fileId}`)
    if (!presignedResponse.ok) throw new Error('Failed to fetch presigned URL')
    const { presignedUrl } = await presignedResponse.json()

    if (onProgress) {
      await uploadFileWithProgress(presignedUrl, currentFile, percent => onProgress(percent))
    }
    else {
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: currentFile,
        headers: { 'Content-Type': currentFile.type },
      })
      if (!uploadResponse.ok) throw new Error(`Failed to upload file to storage: ${uploadResponse.status}`)
    }

    const name = uniqueFileName(currentFile.name, [...taken])
    taken.add(name)
    const attachment = buildingId === undefined
      ? {}
      : { [getAttachmentFieldName(tag as string)]: buildingId }
    const fileData = {
      name,
      type: recordType ?? 'system',
      mimeType: currentFile.type,
      extension: getFileExtension(currentFile),
      sizeBytes: currentFile.size,
      tag,
      uploadedAt: new Date().toISOString(),
      url: '',
      assetId: fileId,
      description: '',
      ...attachment,
      fileOrganizationId: user?.organizationId || null,
      position: JSON.stringify(position) || null,
      fileTransformX: x,
      fileTransformY: y,
      fileTransformZ: z,
      lat,
      lng,
      elevation,
      rotation,
      fileScale: scale,
      fileSourceUp: sourceUp,
      isVisible: isVisible ?? false,
    }

    const result = await uploadFile({ fileData, buildingId })
    uploadResults.push(result)
  }

  return uploadResults
}
