// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DEFAULT_PLACEMENT, parsePlacement, samePlacement } from '../../../shared/pointcloud/pointCloudPlacement'

import type { DbFile } from '../../../../../types/dbTypes'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

export { samePlacement }

export const PLACEMENT_VERSION = 1

/** The only module that reads or writes `File.pointCloudTransform`, so storage can change here alone. */
export function readPlacement(file: Pick<DbFile, 'pointCloudTransform'> | undefined): PointCloudPlacement {
  if (!file) return { ...DEFAULT_PLACEMENT }
  const stored = typeof file.pointCloudTransform === 'string'
    ? safeParse(file.pointCloudTransform)
    : file.pointCloudTransform
  return parsePlacement(stored)
}

export function placementPatch(placement: PointCloudPlacement): Partial<DbFile> {
  return { pointCloudTransform: { version: PLACEMENT_VERSION, ...placement } }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
