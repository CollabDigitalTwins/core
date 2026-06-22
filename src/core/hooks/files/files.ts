"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";
import * as React from "react";

/**
 * Convenience wrapper so components can import hooks directly from src/core/hooks/files
 * Instead of calling useCoreHooks().file first from src/core/hooks/provider.tsx
 */
export const useFiles = () => useCoreHooks().file.useFiles();

export const useFile = (id: number | null) => useCoreHooks().file.useFile(id);

export const useFilesByBuildingId = (buildingId: number, tag?: string) =>
  useCoreHooks().file.useFilesByBuildingId(buildingId, tag);

export const useFilesBySiteId = (siteId: number, tag?: string) =>
  useCoreHooks().file.useFilesBySiteId(siteId, tag);

export const useUploadFileToBuilding = (buildingId: number) =>
  useCoreHooks().file.useUploadFileToBuilding(buildingId);

export const useUploadFileToSite = (siteId: number) =>
  useCoreHooks().file.useUploadFileToSite(siteId);

export const useUploadFileToUser = (userId: number) =>
  useCoreHooks().file.useUploadFileToUser(userId);

export const useDeleteFile = (buildingId?: number, siteId?: number) =>
  useCoreHooks().file.useDeleteFile(buildingId, siteId);

export function useDownloadFile() {
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [downloadError, setDownloadError] = React.useState<Error | null>(null)

  const downloadFile = async (file: any, fileName?: string) => {
    setIsDownloading(true)
    setDownloadError(null)

    try {
      let downloadUrl: string | null = null

      if (file.originalFile?.url) {
        downloadUrl = file.originalFile.url
      }
      // If we have metadata with URL
      else if (file.metadata?.url) {
        downloadUrl = file.metadata.url
      }
      else if (file.url && file.url.startsWith('http')) {
        downloadUrl = file.url
      }

      if (!downloadUrl) {
        throw new Error('No download URL available for this file')
      }

      console.log('Attempting to download from:', downloadUrl)

      // Determine filename
      const finalFileName = fileName
        || file.name
        || file.originalFile?.name
        || file.metadata?.name
        || 'download'

      // For presigned URLs, download as blob
      if (downloadUrl.startsWith('http')) {
        try {
          const response = await fetch(downloadUrl, {
            method: 'GET',
            mode: 'cors',
          })

          if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`)
          }

          const blob = await response.blob()

          if (blob.size === 0) {
            throw new Error('Downloaded file is empty')
          }

          // Create download link and trigger download
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = finalFileName
          link.style.display = 'none'
          document.body.append(link)
          link.click()

          // Cleanup with a small delay
          setTimeout(() => {
            link.remove()
            window.URL.revokeObjectURL(url)
          }, 100)
        }
        catch (fetchError) {
          console.error('Blob download failed, trying direct link:', fetchError)
          window.open(downloadUrl, '_blank')
        }
      }
      else {
        window.open(downloadUrl, '_blank')
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed'
      setDownloadError(new Error(errorMessage))
      console.error('File download error:', error)
    }
    finally {
      setIsDownloading(false)
    }
  }

  return {
    downloadFile,
    isDownloading,
    downloadError,
  }
}