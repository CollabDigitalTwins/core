// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fileTransformPatch, readFileTransform } from '../placement/fileTransform'

import { DEFAULT_PLACEMENT, samePlacement } from './pointCloudPlacement'

import type { PointCloudPlacement } from './pointCloudPlacement'
import type { DbFile } from '../../../../types/dbTypes'
import type { FileTransformColumns } from '../placement/fileTransform'

export { samePlacement }

export function readPlacement(file: FileTransformColumns | undefined): PointCloudPlacement {
  return file ? readFileTransform(file, DEFAULT_PLACEMENT) : { ...DEFAULT_PLACEMENT }
}

export function placementPatch(placement: PointCloudPlacement): Partial<DbFile> {
  return fileTransformPatch(placement)
}
