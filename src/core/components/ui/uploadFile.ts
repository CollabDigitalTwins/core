// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { getFileExtension } from '../../utils/utils'
import { getAttachmentFieldName } from '../viewers/Data/details/getAttachmentFileName'
import { uploadFileWithProgress } from '../viewers/map/src/tools/AddTools/AddFile/utils/uploadToPresignedURLS'

interface UploadFileArgs {
  // Support both single and multiple files; prefer `files` when passing many
  file?: File
  files?: File[]
  buildingId: number
  tag?: string
  user: any
  isVisible?: boolean
  uploadFile: (args: { fileData: any, buildingId: number }) => Promise<any>
  position?: { lng?: number, lat?: number, rotation?: number, elevation?: number, isVisible?: boolean }
  x?: number
  y?: number
  z?: number
  onProgress?: (percent: number) => void
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
  onProgress,
}: UploadFileArgs) {
  if ((!file && (!files || files.length === 0)) || !buildingId) return null

  const filesToProcess: File[] = files ?? (file ? [file] : [])

  const uploadResults: any[] = []

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

    const attachmentFieldName = getAttachmentFieldName(tag as string)
    const fileData = {
      name: currentFile.name,
      type: 'system',
      mimeType: currentFile.type,
      extension: getFileExtension(currentFile),
      sizeBytes: currentFile.size,
      tag,
      uploadedAt: new Date().toISOString(),
      url: '',
      assetId: fileId,
      description: '',
      [attachmentFieldName]: buildingId,
      fileOrganizationId: user?.organizationId || null,
      position: JSON.stringify(position) || null,
      x,
      y,
      z,
      isVisible: isVisible ?? false,
    }

    const result = await uploadFile({ fileData, buildingId })
    uploadResults.push(result)
  }

  return uploadResults
}
