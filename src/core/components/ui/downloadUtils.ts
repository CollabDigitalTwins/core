'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { dateName } from '../viewers/map/utils/dateName'

import type { DbFile as DbFile } from '../../types/dbTypes'

export interface DownloadOptions {
  useOriginalName?: boolean
  addTimestamp?: boolean
  customExtension?: string
}

/**
 * Generic file download utility
 */
export function downloadFile(url: string, filename: string, options: DownloadOptions = {}) {
  const { useOriginalName = false, addTimestamp = true, customExtension } = options

  const link = document.createElement('a')
  link.href = url

  let finalFilename = filename
  if (!useOriginalName && addTimestamp) {
    finalFilename = dateName(filename)
  }

  if (customExtension) {
    const nameWithoutExt = finalFilename.replace(/\.[^/.]+$/, '')
    finalFilename = `${nameWithoutExt}.${customExtension}`
  }

  link.download = finalFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Download a database file using its URL
 */
export function downloadDbFile(file: DbFile, options: DownloadOptions = {}) {
  downloadFile(file.url, file.name, options)
}

/**
 * Download from a custom URL (e.g., API endpoint)
 */
export function downloadFromUrl(url: string, filename: string, options: DownloadOptions = {}) {
  downloadFile(url, filename, options)
}

/**
 * Download a blob or file URL (for locally loaded files)
 */
export function downloadBlobUrl(blobUrl: string, filename: string, extension?: string, options: DownloadOptions = {}) {
  const finalOptions = { ...options }
  if (extension) {
    finalOptions.customExtension = extension
  }
  downloadFile(blobUrl, filename, finalOptions)
}
