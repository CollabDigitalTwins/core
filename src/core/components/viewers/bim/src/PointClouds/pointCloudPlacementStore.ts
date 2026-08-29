// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { DEFAULT_PLACEMENT, parsePlacement } from '../../../shared/pointcloud/pointCloudPlacement'

import type { DbFile } from '../../../../../types/dbTypes'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

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

export function samePlacement(a: PointCloudPlacement, b: PointCloudPlacement): boolean {
  return a.scale === b.scale
    && a.sourceUp === b.sourceUp
    && a.position.every((value, index) => value === b.position[index])
    && a.rotation.every((value, index) => value === b.rotation[index])
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
