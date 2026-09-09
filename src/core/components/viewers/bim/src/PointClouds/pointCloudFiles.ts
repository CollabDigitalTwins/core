// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'

export const POINT_CLOUD_EXTENSIONS = ['las', 'laz', 'e57'] as const

/** For a file input's `accept`; the same list the section validates against. */
export const POINT_CLOUD_ACCEPT = POINT_CLOUD_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const POINT_CLOUD_TYPE = 'point-cloud-file'

const EXTENSION_SUFFIX = new RegExp(`\.(${POINT_CLOUD_EXTENSIONS.join('|')})$`, 'i')

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
