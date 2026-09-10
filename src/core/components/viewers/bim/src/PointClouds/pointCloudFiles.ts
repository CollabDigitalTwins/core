// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'

export const POINT_CLOUD_EXTENSIONS = ['las', 'laz', 'copc', 'e57'] as const

/** For a file input's `accept`. `.copc.laz` is listed because that is the conventional name. */
export const POINT_CLOUD_ACCEPT = '.las,.laz,.copc,.copc.laz,.e57'

const POINT_CLOUD_TYPE = 'point-cloud-file'

const EXTENSION_SUFFIX = /\.(copc\.laz|las|laz|copc|e57)$/i

/** A COPC file is a LAZ 1.4 file, and PotreeConverter is laszip-only. */
export function normalizePointCloudFormat(extension: string): string {
  const lower = extension.toLowerCase()
  return lower === 'copc' ? 'laz' : lower
}

export function isPointCloudExtension(extension: string | null | undefined): boolean {
  if (!extension) return false
  return (POINT_CLOUD_EXTENSIONS as readonly string[]).includes(extension.toLowerCase())
}

/**
 * Decides which sidebar section a file belongs to, converted or not. Either signal is
 * enough: the converter sets the type, while a generic upload only sets an extension.
 */
export function isPointCloudFile(file: DbFile): boolean {
  return file.type?.toLowerCase() === POINT_CLOUD_TYPE || isPointCloudExtension(file.extension)
}

/** A cloud only counts once PotreeConverter has run — an unconverted file has nothing to stream. */
export function isRenderablePointCloud(file: DbFile): boolean {
  return isPointCloudFile(file) && file.pointCloudPotreeConverted === true
}

export function stripPointCloudExtension(fileName: string): string {
  return fileName.replace(EXTENSION_SUFFIX, '')
}

/** The converter writes one object per source name, so a clash would overwrite a sibling. */
export function uniquePointCloudName(baseName: string, existingNames: string[]): string {
  const taken = new Set(existingNames)
  if (!taken.has(baseName)) return baseName

  let counter = 1
  while (taken.has(`${baseName} (${counter})`)) counter++
  return `${baseName} (${counter})`
}
