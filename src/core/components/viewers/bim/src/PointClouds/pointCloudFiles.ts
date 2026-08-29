// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { DbFile } from '../../../../../types/dbTypes'

const POINT_CLOUD_EXTENSIONS = ['las', 'laz']

/** A cloud only counts once PotreeConverter has run — an unconverted file has nothing to stream. */
export function isRenderablePointCloud(file: DbFile): boolean {
  const extension = file.extension?.toLowerCase()
  if (!extension || !POINT_CLOUD_EXTENSIONS.includes(extension)) return false
  return file.pointCloudPotreeConverted === true
}

export function selectPointCloudFiles(files: DbFile[]): DbFile[] {
  return files.filter(isRenderablePointCloud)
}
